// Package handlers provides REPL command handlers.
package handlers

import (
	"context"
	"fmt"
	"time"

	"go-research/internal/core/domain/aggregate"
	"go-research/internal/core/ports"
)

// SessionSummaryES represents an event-sourced session summary.
type SessionSummaryES struct {
	ID        string
	Query     string
	Status    string
	Progress  float64
	Cost      float64
	CreatedAt time.Time
	UpdatedAt time.Time
}

// SessionsESHandler handles /sessions command using event store.
type SessionsESHandler struct {
	eventStore ports.EventStore
}

// NewSessionsESHandler creates a new handler for listing event-sourced sessions.
func NewSessionsESHandler(eventStore ports.EventStore) *SessionsESHandler {
	return &SessionsESHandler{eventStore: eventStore}
}

// ListSessions returns summaries of all event-sourced sessions.
func (h *SessionsESHandler) ListSessions(ctx context.Context) ([]SessionSummaryES, error) {
	ids, err := h.eventStore.GetAllAggregateIDs(ctx)
	if err != nil {
		return nil, fmt.Errorf("get aggregate IDs: %w", err)
	}

	var summaries []SessionSummaryES
	for _, id := range ids {
		summary, err := h.getSessionSummary(ctx, id)
		if err != nil {
			// Skip invalid sessions
			continue
		}
		summaries = append(summaries, summary)
	}

	return summaries, nil
}

// getSessionSummary builds a summary from the first and last events.
func (h *SessionsESHandler) getSessionSummary(ctx context.Context, sessionID string) (SessionSummaryES, error) {
	eventList, err := h.eventStore.LoadEvents(ctx, sessionID)
	if err != nil {
		return SessionSummaryES{}, err
	}

	if len(eventList) == 0 {
		return SessionSummaryES{}, fmt.Errorf("no events for session %s", sessionID)
	}

	// Build state from events to get accurate summary
	genericEvents := make([]interface{}, len(eventList))
	for i, e := range eventList {
		genericEvents[i] = e
	}

	state, err := aggregate.LoadFromEvents(sessionID, genericEvents)
	if err != nil {
		return SessionSummaryES{}, err
	}

	// Get created/updated timestamps from first and last events
	firstEvent := eventList[0]
	lastEvent := eventList[len(eventList)-1]

	return SessionSummaryES{
		ID:        sessionID,
		Query:     state.Query,
		Status:    state.Status,
		Progress:  state.Progress,
		Cost:      state.Cost.TotalCostUSD,
		CreatedAt: firstEvent.GetTimestamp(),
		UpdatedAt: lastEvent.GetTimestamp(),
	}, nil
}

// LoadSessionHandler handles /load command using event store.
type LoadSessionESHandler struct {
	eventStore ports.EventStore
}

// NewLoadSessionESHandler creates a new handler for loading event-sourced sessions.
func NewLoadSessionESHandler(eventStore ports.EventStore) *LoadSessionESHandler {
	return &LoadSessionESHandler{eventStore: eventStore}
}

// LoadSession reconstructs a session from events.
func (h *LoadSessionESHandler) LoadSession(ctx context.Context, sessionID string) (*aggregate.ResearchState, error) {
	eventList, err := h.eventStore.LoadEvents(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("load events: %w", err)
	}

	if len(eventList) == 0 {
		return nil, fmt.Errorf("session %s not found", sessionID)
	}

	// Convert to generic events for aggregate
	genericEvents := make([]interface{}, len(eventList))
	for i, e := range eventList {
		genericEvents[i] = e
	}

	state, err := aggregate.LoadFromEvents(sessionID, genericEvents)
	if err != nil {
		return nil, fmt.Errorf("load state: %w", err)
	}

	return state, nil
}

// GetResumableStates returns states that can be resumed (not complete or failed).
func (h *SessionsESHandler) GetResumableStates(ctx context.Context) ([]SessionSummaryES, error) {
	allSessions, err := h.ListSessions(ctx)
	if err != nil {
		return nil, err
	}

	var resumable []SessionSummaryES
	for _, s := range allSessions {
		if s.Status != "complete" && s.Status != "failed" {
			resumable = append(resumable, s)
		}
	}

	return resumable, nil
}
