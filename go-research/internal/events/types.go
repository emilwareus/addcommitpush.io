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
	EventAnalysisStarted
	EventAnalysisProgress
	EventAnalysisComplete
	EventSynthesisStarted
	EventSynthesisProgress
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
	EventCostUpdated

	// Cross-validation & gap-filling progress events
	EventCrossValidationStarted  // Starting cross-validation phase
	EventCrossValidationProgress // Per-fact or batch progress
	EventCrossValidationComplete // Cross-validation done
	EventGapFillingStarted       // Starting gap-filling phase
	EventGapFillingProgress      // Per-gap progress
	EventGapFillingComplete      // Gap-filling done

	// STORM conversation events
	EventConversationStarted   // Starting a conversation for a perspective
	EventConversationProgress  // Turn completed in a conversation
	EventConversationCompleted // Conversation finished for a perspective

	// Session events
	EventSessionCreated
	EventSessionLoaded
	EventSessionSaved
	EventSessionExpanded

	// ThinkDeep Diffusion Events
	EventDiffusionStarted        // Starting ThinkDeep diffusion research
	EventDiffusionIterationStart // New iteration of diffusion loop
	EventDraftRefined            // Draft report was refined
	EventResearchDelegated       // Supervisor delegated to sub-researcher
	EventSubResearcherStarted    // Sub-researcher began work
	EventSubResearcherProgress   // Sub-researcher search/think progress
	EventSubResearcherComplete   // Sub-researcher finished
	EventDiffusionComplete       // Diffusion phase complete
	EventFinalReportStarted      // Full optimization phase started
	EventFinalReportComplete     // Final report generated
)

// ResearchStartedData contains data for research start events
type ResearchStartedData struct {
	SessionID string
	Query     string
	Mode      string // "fast" or "storm"
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
	WorkerCount  int
	Complexity   float64
	Topic        string
	Perspectives []PerspectiveData
	DAGNodes     []DAGNodeData
}

// PerspectiveData contains information about a research perspective
type PerspectiveData struct {
	Name      string
	Focus     string
	Questions []string
}

// DAGNodeData contains information about a DAG node for visualization
type DAGNodeData struct {
	ID           string
	TaskType     string // "search", "analyze", "synthesize", "validate"
	Description  string
	Dependencies []string
	Status       string // "pending", "running", "complete", "failed"
}

// CostUpdateData captures cost information emitted during research.
type CostUpdateData struct {
	Scope        string
	InputTokens  int
	OutputTokens int
	TotalTokens  int
	InputCost    float64
	OutputCost   float64
	TotalCost    float64
}

// CrossValidationProgressData contains progress info for fact validation
type CrossValidationProgressData struct {
	Phase       string  // "cross-validate", "detect-contradictions", "identify-gaps"
	Current     int     // Current item being processed
	Total       int     // Total items to process
	CurrentFact string  // Description of current fact being validated
	Message     string  // Status message
	Progress    float64 // 0.0 to 1.0 progress
}

// GapFillingProgressData contains progress info for knowledge gap filling
type GapFillingProgressData struct {
	GapIndex    int     // Current gap index (0-based)
	TotalGaps   int     // Total gaps to fill
	GapDesc     string  // Description of current gap
	Status      string  // "searching", "processing", "complete", "skipped"
	Progress    float64 // 0.0 to 1.0 progress
}

// ConversationStartedData contains data when a conversation begins
type ConversationStartedData struct {
	Perspective      string // Perspective name
	Focus            string // Perspective focus area
	TotalPerspectives int   // Total perspectives being processed
	Index            int    // 0-based index of current perspective
}

// ConversationProgressData contains progress info for a conversation turn
type ConversationProgressData struct {
	Perspective string // Perspective name
	Turn        int    // Current turn number (1-based)
	MaxTurns    int    // Maximum turns configured
	Question    string // Question asked in this turn
	Sources     int    // Number of sources found
}

// ConversationCompletedData contains data when a conversation finishes
type ConversationCompletedData struct {
	Perspective string // Perspective name
	TotalTurns  int    // Number of turns completed
	FactsFound  int    // Number of facts extracted
	Sources     int    // Number of unique sources
}

// DiffusionStartedData is emitted when ThinkDeep diffusion begins
type DiffusionStartedData struct {
	Topic         string
	MaxIterations int
}

// DiffusionIterationData captures diffusion loop progress
type DiffusionIterationData struct {
	Iteration     int     // Current iteration (1-based)
	MaxIterations int     // Max iterations configured
	NotesCount    int     // Total compressed notes collected
	DraftProgress float64 // 0.0-1.0 estimated draft completeness
	Phase         string  // "research", "refine", "thinking"
	Message       string  // Status message
}

// SubResearcherData captures sub-researcher activity
type SubResearcherData struct {
	Topic         string // Research topic
	ResearcherNum int    // Sub-researcher number (for parallel)
	Iteration     int    // Search iteration within sub-researcher
	MaxIterations int    // Max searches
	Status        string // "searching", "thinking", "compressing", "complete"
	SourcesFound  int    // Number of sources found so far
}

// DraftRefinedData captures draft refinement events
type DraftRefinedData struct {
	Iteration       int     // Diffusion iteration
	SectionsUpdated int     // Number of sections modified
	NewSources      int     // New sources incorporated
	Progress        float64 // Estimated progress (0.0-1.0)
}
