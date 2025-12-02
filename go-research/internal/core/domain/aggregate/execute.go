package aggregate

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"go-research/internal/core/domain/events"
)

// Execute processes a command and returns the resulting event.
// This is the main entry point for state changes.
func (s *ResearchState) Execute(cmd Command) (interface{}, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := cmd.Validate(s); err != nil {
		return nil, err
	}

	var event interface{}
	newVersion := s.Version + 1
	timestamp := time.Now()

	switch c := cmd.(type) {
	case StartResearchCommand:
		event = events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "research.started",
			},
			Query:  c.Query,
			Mode:   c.Mode,
			Config: c.Config,
		}

	case SetPlanCommand:
		event = events.PlanCreatedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "plan.created",
			},
			Topic:        c.Topic,
			Perspectives: c.Perspectives,
			DAGStructure: c.DAGStructure,
			Cost:         c.Cost,
		}

	case StartWorkerCommand:
		event = events.WorkerStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "worker.started",
			},
			WorkerID:    c.WorkerID,
			WorkerNum:   c.WorkerNum,
			Objective:   c.Objective,
			Perspective: c.Perspective,
		}

	case CompleteWorkerCommand:
		event = events.WorkerCompletedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "worker.completed",
			},
			WorkerID: c.WorkerID,
			Output:   c.Output,
			Facts:    c.Facts,
			Sources:  c.Sources,
			Cost:     c.Cost,
		}

	case FailWorkerCommand:
		event = events.WorkerFailedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "worker.failed",
			},
			WorkerID: c.WorkerID,
			Error:    c.Error,
		}

	case StartAnalysisCommand:
		event = events.AnalysisStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "analysis.started",
			},
			TotalFacts: c.TotalFacts,
		}

	case SetAnalysisCommand:
		event = events.AnalysisCompletedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "analysis.completed",
			},
			ValidatedFacts: c.ValidatedFacts,
			Contradictions: c.Contradictions,
			KnowledgeGaps:  c.KnowledgeGaps,
			Cost:           c.Cost,
		}

	case StartSynthesisCommand:
		event = events.SynthesisStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "synthesis.started",
			},
		}

	case SetReportCommand:
		event = events.ReportGeneratedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "report.generated",
			},
			Title:       c.Title,
			Summary:     c.Summary,
			FullContent: c.FullContent,
			Citations:   c.Citations,
			Cost:        c.Cost,
		}

	case CompleteResearchCommand:
		event = events.ResearchCompletedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "research.completed",
			},
			Duration:    c.Duration,
			TotalCost:   s.Cost,
			SourceCount: s.countSources(),
		}

	case FailResearchCommand:
		event = events.ResearchFailedEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "research.failed",
			},
			Error:       c.Error,
			FailedPhase: c.FailedPhase,
		}

	case CancelResearchCommand:
		event = events.ResearchCancelledEvent{
			BaseEvent: events.BaseEvent{
				ID:          uuid.New().String(),
				AggregateID: s.ID,
				Version:     newVersion,
				Timestamp:   timestamp,
				Type:        "research.cancelled",
			},
			Reason: c.Reason,
		}

	default:
		return nil, fmt.Errorf("unknown command type: %T", cmd)
	}

	// Apply the event to update state
	s.applyUnlocked(event)

	return event, nil
}
