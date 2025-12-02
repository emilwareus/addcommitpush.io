package events

import "time"

// ResearchStartedEvent is emitted when a research session is initiated.
type ResearchStartedEvent struct {
	BaseEvent
	Query  string         `json:"query"`
	Mode   string         `json:"mode"` // "fast" or "storm"
	Config ResearchConfig `json:"config"`
}

// ResearchCompletedEvent is emitted when research finishes successfully.
type ResearchCompletedEvent struct {
	BaseEvent
	Duration    time.Duration `json:"duration"`
	TotalCost   CostBreakdown `json:"total_cost"`
	SourceCount int           `json:"source_count"`
}

// ResearchFailedEvent is emitted when research fails with an error.
type ResearchFailedEvent struct {
	BaseEvent
	Error       string `json:"error"`
	FailedPhase string `json:"failed_phase"` // "planning", "search", "analysis", "synthesis"
}

// ResearchCancelledEvent is emitted when research is cancelled by user.
type ResearchCancelledEvent struct {
	BaseEvent
	Reason string `json:"reason"`
}
