package events

import "time"

// Event represents a system event
type Event struct {
	Type      EventType
	Timestamp time.Time
	Data      interface{}
}

// EventType identifies the kind of event
type EventType int

const (
	// Orchestrator events
	EventResearchStarted EventType = iota
	EventQueryAnalyzed
	EventPlanCreated
	EventSynthesisStarted
	EventSynthesisComplete
	EventResearchComplete
	EventResearchFailed

	// Worker events
	EventWorkerSpawned
	EventWorkerStarted
	EventWorkerProgress
	EventWorkerComplete
	EventWorkerFailed

	// Agent events
	EventIterationStarted
	EventThought
	EventAction
	EventToolCall
	EventToolResult
	EventAnswerFound
	EventLLMChunk // Streaming LLM output

	// Session events
	EventSessionCreated
	EventSessionLoaded
	EventSessionSaved
	EventSessionExpanded
)

// ResearchStartedData contains data for research start events
type ResearchStartedData struct {
	SessionID string
	Query     string
	Mode      string // "fast" or "deep"
}

// WorkerProgressData contains data for worker progress events
type WorkerProgressData struct {
	WorkerID  string
	WorkerNum int
	Objective string
	Iteration int
	Status    string
	Message   string
}

// ToolCallData contains data for tool call events
type ToolCallData struct {
	WorkerID  string
	WorkerNum int
	Tool      string
	Args      map[string]interface{}
}

// ToolResultData contains data for tool result events
type ToolResultData struct {
	WorkerID string
	Tool     string
	Success  bool
	Preview  string // First 200 chars
}

// LLMChunkData contains data for streaming LLM chunks
type LLMChunkData struct {
	WorkerID  string
	WorkerNum int
	Chunk     string
	Done      bool
}

// PlanCreatedData contains data when a research plan is created
type PlanCreatedData struct {
	WorkerCount int
	Complexity  float64
}
