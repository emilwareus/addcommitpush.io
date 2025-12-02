package events

// SynthesisStartedEvent is emitted when report generation begins.
type SynthesisStartedEvent struct {
	BaseEvent
}

// ReportGeneratedEvent is emitted when the full report is assembled.
type ReportGeneratedEvent struct {
	BaseEvent
	Title       string        `json:"title"`
	Summary     string        `json:"summary"`
	FullContent string        `json:"full_content"`
	Citations   []Citation    `json:"citations"`
	Cost        CostBreakdown `json:"cost"`
}
