package filesystem

import (
	"encoding/json"
	"fmt"

	"go-research/internal/core/domain/events"
	"go-research/internal/core/ports"
)

// deserializeEvent deserializes a JSON-encoded event into the appropriate type.
func deserializeEvent(data []byte) (ports.Event, error) {
	// First unmarshal to get the type
	var base events.BaseEvent
	if err := json.Unmarshal(data, &base); err != nil {
		return nil, err
	}

	// Then unmarshal to the specific type
	switch base.Type {
	case "research.started":
		var e events.ResearchStartedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "plan.created":
		var e events.PlanCreatedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "worker.started":
		var e events.WorkerStartedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "worker.completed":
		var e events.WorkerCompletedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "worker.failed":
		var e events.WorkerFailedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "analysis.started":
		var e events.AnalysisStartedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "analysis.completed":
		var e events.AnalysisCompletedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "synthesis.started":
		var e events.SynthesisStartedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "report.generated":
		var e events.ReportGeneratedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "research.completed":
		var e events.ResearchCompletedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "research.failed":
		var e events.ResearchFailedEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "research.cancelled":
		var e events.ResearchCancelledEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	case "snapshot.taken":
		var e events.SnapshotTakenEvent
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, err
		}
		return &e, nil

	default:
		return nil, fmt.Errorf("unknown event type: %s", base.Type)
	}
}
