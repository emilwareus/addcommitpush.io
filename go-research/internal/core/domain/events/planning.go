package events

// PlanCreatedEvent is emitted when a research plan is generated.
type PlanCreatedEvent struct {
	BaseEvent
	Topic        string        `json:"topic"`
	Perspectives []Perspective `json:"perspectives"`
	DAGStructure DAGSnapshot   `json:"dag_structure"`
	Cost         CostBreakdown `json:"cost"`
}
