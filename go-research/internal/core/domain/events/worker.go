package events

// WorkerStartedEvent is emitted when a worker begins execution.
type WorkerStartedEvent struct {
	BaseEvent
	WorkerID    string `json:"worker_id"`
	WorkerNum   int    `json:"worker_num"`
	Objective   string `json:"objective"`
	Perspective string `json:"perspective,omitempty"`
}

// WorkerCompletedEvent is emitted when a worker finishes successfully.
type WorkerCompletedEvent struct {
	BaseEvent
	WorkerID string        `json:"worker_id"`
	Output   string        `json:"output"`
	Facts    []Fact        `json:"facts,omitempty"`
	Sources  []Source      `json:"sources"`
	Cost     CostBreakdown `json:"cost"`
}

// WorkerFailedEvent is emitted when a worker fails.
type WorkerFailedEvent struct {
	BaseEvent
	WorkerID string `json:"worker_id"`
	Error    string `json:"error"`
}
