package events

// AnalysisStartedEvent is emitted when the analysis phase begins.
type AnalysisStartedEvent struct {
	BaseEvent
	TotalFacts int `json:"total_facts"`
}

// AnalysisCompletedEvent is emitted when the analysis phase finishes.
type AnalysisCompletedEvent struct {
	BaseEvent
	ValidatedFacts []ValidatedFact `json:"validated_facts"`
	Contradictions []Contradiction `json:"contradictions"`
	KnowledgeGaps  []KnowledgeGap  `json:"knowledge_gaps"`
	Cost           CostBreakdown   `json:"cost"`
}
