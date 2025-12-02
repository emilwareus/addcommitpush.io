// Package migration provides utilities for migrating legacy sessions to event-sourced format.
package migration

import (
	"context"
	"fmt"
	"time"

	"go-research/internal/core/domain/events"
	"go-research/internal/core/ports"
	"go-research/internal/session"

	"github.com/google/uuid"
)

// LegacyMigrator converts legacy sessions to event-sourced format.
type LegacyMigrator struct {
	legacyStore *session.Store
	eventStore  ports.EventStore
}

// NewLegacyMigrator creates a new migrator.
func NewLegacyMigrator(legacyStore *session.Store, eventStore ports.EventStore) *LegacyMigrator {
	return &LegacyMigrator{
		legacyStore: legacyStore,
		eventStore:  eventStore,
	}
}

// MigrateSession converts a single legacy session to events.
func (m *LegacyMigrator) MigrateSession(ctx context.Context, sessionID string) error {
	// Load legacy session
	sess, err := m.legacyStore.Load(sessionID)
	if err != nil {
		return fmt.Errorf("load legacy session: %w", err)
	}

	// Check if already migrated
	existingEvents, _ := m.eventStore.LoadEvents(ctx, sessionID)
	if len(existingEvents) > 0 {
		return fmt.Errorf("session %s already has events (already migrated)", sessionID)
	}

	// Convert to events
	eventList, err := m.sessionToEvents(sess)
	if err != nil {
		return fmt.Errorf("convert session to events: %w", err)
	}

	// Store events
	for i, event := range eventList {
		if err := m.eventStore.AppendEvents(ctx, sessionID, []ports.Event{event}, i); err != nil {
			return fmt.Errorf("append event %d: %w", i+1, err)
		}
	}

	return nil
}

// MigrateAll migrates all legacy sessions.
func (m *LegacyMigrator) MigrateAll(ctx context.Context) (int, []error) {
	summaries, err := m.legacyStore.List()
	if err != nil {
		return 0, []error{fmt.Errorf("list legacy sessions: %w", err)}
	}

	var migrated int
	var errors []error

	for _, summary := range summaries {
		if err := m.MigrateSession(ctx, summary.ID); err != nil {
			errors = append(errors, fmt.Errorf("%s: %w", summary.ID, err))
		} else {
			migrated++
		}
	}

	return migrated, errors
}

// sessionToEvents converts a legacy session to a list of domain events.
func (m *LegacyMigrator) sessionToEvents(sess *session.Session) ([]ports.Event, error) {
	var eventList []ports.Event
	version := 0

	// 1. ResearchStarted event
	version++
	eventList = append(eventList, &events.ResearchStartedEvent{
		BaseEvent: events.BaseEvent{
			ID:          m.newEventID(),
			AggregateID: sess.ID,
			Version:     version,
			Timestamp:   sess.CreatedAt,
			Type:        "research.started",
		},
		Query: sess.Query,
		Mode:  string(sess.Mode),
		Config: events.ResearchConfig{
			MaxWorkers: len(sess.Workers),
		},
	})

	// 2. PlanCreated event (if workers exist)
	if len(sess.Workers) > 0 {
		version++
		perspectives := make([]events.Perspective, len(sess.Workers))
		dagNodes := make([]events.DAGNodeSnapshot, len(sess.Workers))

		for i, w := range sess.Workers {
			perspectives[i] = events.Perspective{
				Name:  fmt.Sprintf("Worker %d", w.WorkerNum),
				Focus: w.Objective,
			}
			dagNodes[i] = events.DAGNodeSnapshot{
				ID:       w.ID,
				TaskType: "search",
				Status:   "pending",
			}
		}

		eventList = append(eventList, &events.PlanCreatedEvent{
			BaseEvent: events.BaseEvent{
				ID:          m.newEventID(),
				AggregateID: sess.ID,
				Version:     version,
				Timestamp:   sess.CreatedAt.Add(time.Millisecond),
				Type:        "plan.created",
			},
			Topic:        sess.Query,
			Perspectives: perspectives,
			DAGStructure: events.DAGSnapshot{
				Nodes: dagNodes,
			},
		})
	}

	// 3. Worker events
	for _, w := range sess.Workers {
		// WorkerStarted
		if w.StartedAt.After(time.Time{}) {
			version++
			eventList = append(eventList, &events.WorkerStartedEvent{
				BaseEvent: events.BaseEvent{
					ID:          m.newEventID(),
					AggregateID: sess.ID,
					Version:     version,
					Timestamp:   w.StartedAt,
					Type:        "worker.started",
				},
				WorkerID:  w.ID,
				WorkerNum: w.WorkerNum,
				Objective: w.Objective,
			})
		}

		// WorkerCompleted or WorkerFailed
		if w.Status == session.WorkerComplete {
			version++

			// Convert sources to events.Source
			sources := make([]events.Source, len(w.Sources))
			for i, url := range w.Sources {
				sources[i] = events.Source{URL: url}
			}

			// Extract facts from iterations if available
			var facts []events.Fact
			if w.Summary != "" {
				facts = append(facts, events.Fact{
					Content:    w.Summary,
					Confidence: 0.8,
					SourceURL:  "",
				})
			}

			eventList = append(eventList, &events.WorkerCompletedEvent{
				BaseEvent: events.BaseEvent{
					ID:          m.newEventID(),
					AggregateID: sess.ID,
					Version:     version,
					Timestamp:   safeTime(w.CompletedAt, sess.UpdatedAt),
					Type:        "worker.completed",
				},
				WorkerID: w.ID,
				Output:   w.FinalOutput,
				Facts:    facts,
				Sources:  sources,
				Cost: events.CostBreakdown{
					InputTokens:  w.Cost.InputTokens,
					OutputTokens: w.Cost.OutputTokens,
					TotalCostUSD: w.Cost.TotalCost,
				},
			})
		} else if w.Status == session.WorkerFailed && w.Error != nil {
			version++
			eventList = append(eventList, &events.WorkerFailedEvent{
				BaseEvent: events.BaseEvent{
					ID:          m.newEventID(),
					AggregateID: sess.ID,
					Version:     version,
					Timestamp:   safeTime(w.CompletedAt, sess.UpdatedAt),
					Type:        "worker.failed",
				},
				WorkerID: w.ID,
				Error:    *w.Error,
			})
		}
	}

	// 4. Research completion events
	if sess.Status == session.StatusComplete {
		// ReportGenerated if we have a report
		if sess.Report != "" {
			version++
			eventList = append(eventList, &events.ReportGeneratedEvent{
				BaseEvent: events.BaseEvent{
					ID:          m.newEventID(),
					AggregateID: sess.ID,
					Version:     version,
					Timestamp:   sess.UpdatedAt.Add(-time.Millisecond),
					Type:        "report.generated",
				},
				Title:       sess.Query,
				Summary:     truncate(sess.Report, 500),
				FullContent: sess.Report,
				Cost: events.CostBreakdown{
					TotalCostUSD: 0, // Report cost tracked elsewhere
				},
			})
		}

		// ResearchCompleted
		version++
		eventList = append(eventList, &events.ResearchCompletedEvent{
			BaseEvent: events.BaseEvent{
				ID:          m.newEventID(),
				AggregateID: sess.ID,
				Version:     version,
				Timestamp:   sess.UpdatedAt,
				Type:        "research.completed",
			},
			Duration:    sess.UpdatedAt.Sub(sess.CreatedAt),
			SourceCount: len(sess.Sources),
			TotalCost: events.CostBreakdown{
				InputTokens:  sess.Cost.InputTokens,
				OutputTokens: sess.Cost.OutputTokens,
				TotalCostUSD: sess.Cost.TotalCost,
			},
		})
	} else if sess.Status == session.StatusFailed {
		version++
		eventList = append(eventList, &events.ResearchFailedEvent{
			BaseEvent: events.BaseEvent{
				ID:          m.newEventID(),
				AggregateID: sess.ID,
				Version:     version,
				Timestamp:   sess.UpdatedAt,
				Type:        "research.failed",
			},
			Error:       "Session failed (migrated from legacy)",
			FailedPhase: "unknown",
		})
	}

	return eventList, nil
}

// newEventID generates a unique event ID.
func (m *LegacyMigrator) newEventID() string {
	return fmt.Sprintf("evt-%s", uuid.New().String()[:8])
}

// safeTime returns t if non-nil, otherwise returns fallback.
func safeTime(t *time.Time, fallback time.Time) time.Time {
	if t != nil && !t.IsZero() {
		return *t
	}
	return fallback
}

// truncate shortens a string to n characters.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
