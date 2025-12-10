# ThinkDeep Architecture Implementation Plan

**Created**: 2025-12-03
**Status**: Ready for Implementation
**Research Document**: `.claude/research/2025-12-03_09-45-00_thinkdepth-architecture.md`

## Overview

Implement the ThinkDepth.ai "Self-Balancing Test-Time Diffusion Deep Research" architecture in Go, following the patterns established in the existing go-research codebase.

### Key Concepts

1. **Diffusion Algorithm**: Treat draft report as "noisy" initial state, iteratively "denoise" via web research
2. **Two-Stage Optimization**: Information collection (minimal generation) → Final report (full helpfulness + insightfulness)
3. **Supervisor → Sub-Researcher**: Multi-agent coordination with parallel research
4. **Context Compression**: Preserve ALL search results verbatim, filter out think_tool calls

### Model Mapping

| Original       | Implementation                                         |
| -------------- | ------------------------------------------------------ |
| `openai:gpt-5` | `alibaba/tongyi-deepresearch-30b-a3b` (via OpenRouter) |
| Tavily Search  | Brave Search (existing)                                |

---

## Phase 1: Event Types

**Files to modify**: `internal/events/types.go`

### New Event Types

Add these constants to the `EventType` const block:

```go
// ThinkDeep Diffusion Events
EventDiffusionStarted        EventType = "diffusion_started"
EventDiffusionIterationStart EventType = "diffusion_iteration_start"
EventDraftRefined            EventType = "draft_refined"
EventResearchDelegated       EventType = "research_delegated"
EventSubResearcherStarted    EventType = "sub_researcher_started"
EventSubResearcherProgress   EventType = "sub_researcher_progress"
EventSubResearcherComplete   EventType = "sub_researcher_complete"
EventDiffusionComplete       EventType = "diffusion_complete"
EventFinalReportStarted      EventType = "final_report_started"
EventFinalReportComplete     EventType = "final_report_complete"
```

### New Event Data Structures

Add after existing data structures:

```go
// DiffusionStartedData is emitted when ThinkDeep diffusion begins
type DiffusionStartedData struct {
    Topic         string
    MaxIterations int
}

// DiffusionIterationData captures diffusion loop progress
type DiffusionIterationData struct {
    Iteration     int
    MaxIterations int
    NotesCount    int
    DraftProgress float64 // 0.0-1.0
    Phase         string  // "research", "refine", "thinking"
    Message       string
}

// SubResearcherData captures sub-researcher activity
type SubResearcherData struct {
    Topic         string
    ResearcherNum int
    Iteration     int
    MaxIterations int
    Status        string // "searching", "thinking", "compressing", "complete"
    SourcesFound  int
}

// DraftRefinedData captures draft refinement events
type DraftRefinedData struct {
    Iteration       int
    SectionsUpdated int
    NewSources      int
    Progress        float64
}
```

### Success Criteria

- [x] `go build ./...` passes
- [x] Event types are exported and accessible

---

## Phase 2: Prompts

**Files to create**: `internal/architectures/think_deep/prompts.go`

### Implementation

Create the prompts package with all necessary prompt templates. Reference implementation in research document section "3. Prompts (`prompts.go`)".

Key prompts:

1. `LeadResearcherPrompt` - Supervisor with diffusion algorithm instructions
2. `ResearchAgentPrompt` - Sub-researcher with hard limits (2-5 searches)
3. `CompressResearchPrompt` - Context compression preserving all info
4. `FinalReportPrompt` - Full optimization with Insightfulness + Helpfulness rules
5. `RefineDraftPrompt` - Iterative draft refinement
6. `InitialDraftPrompt` - Generate initial draft from research brief
7. `TransformToResearchBriefPrompt` - Convert user query to detailed brief

### Success Criteria

- [x] All prompts defined as functions with proper formatting
- [x] `go build ./...` passes

---

## Phase 3: State Definitions

**Files to create**: `internal/architectures/think_deep/state.go`

### Implementation

```go
package think_deep

import "go-research/internal/llm"

// SupervisorState manages the lead researcher's coordination
type SupervisorState struct {
    Messages      []llm.Message
    ResearchBrief string
    Notes         []string  // Compressed research from sub-researchers
    RawNotes      []string  // Raw search results for reference
    DraftReport   string
    Iterations    int
}

// ResearcherState manages individual sub-researcher state
type ResearcherState struct {
    Messages           []llm.Message
    ResearchTopic      string
    CompressedResearch string
    RawNotes           []string
    Iteration          int
}
```

### Success Criteria

- [x] State types are properly exported
- [x] `go build ./...` passes

---

## Phase 4: Tools

**Files to create**: `internal/architectures/think_deep/tools.go`

### Tool Implementations

1. **ThinkTool** - Strategic reflection (no-op, just returns acknowledgment)
2. **ConductResearchTool** - Delegates to sub-researcher (requires orchestrator reference)
3. **RefineDraftTool** - Calls LLM to refine draft with findings
4. **ResearchCompleteTool** - Signals completion

### Key Pattern: Tool Call Parsing

From `internal/agent/react.go:314-340`, use this pattern:

```go
var toolRegex = regexp.MustCompile(`(?s)<tool\s+name="([^"]+)">\s*(\{.*?\})\s*</tool>`)

type ToolCallParsed struct {
    Tool string
    Args map[string]interface{}
}

func parseToolCalls(content string) []ToolCallParsed {
    matches := toolRegex.FindAllStringSubmatch(content, -1)
    var calls []ToolCallParsed
    for _, match := range matches {
        if len(match) < 3 { continue }
        var args map[string]interface{}
        if err := json.Unmarshal([]byte(match[2]), &args); err != nil { continue }
        calls = append(calls, ToolCallParsed{Tool: match[1], Args: args})
    }
    return calls
}
```

### Success Criteria

- [x] All tools implement the `tools.Tool` interface
- [x] Tool call parsing works with XML-style tags
- [x] `go build ./...` passes

---

## Phase 5: Sub-Researcher Agent

**Files to create**: `internal/agents/sub_researcher.go`, `internal/agents/sub_researcher_test.go`

### Implementation

The sub-researcher:

1. Receives a research topic from supervisor
2. Executes search loop (2-5 iterations)
3. Uses think_tool for reflection after each search
4. Compresses all findings (preserving verbatim)
5. Returns compressed research

### Key Behaviors

- **Hard limits**: 2-3 searches for simple queries, up to 5 for complex
- **Stop conditions**:
  - Can answer comprehensively
  - Have 3+ relevant sources
  - Last 2 searches returned similar info
- **Compression**: Filter out think_tool calls, preserve all search results verbatim

### Success Criteria

- [x] SubResearcherAgent struct with Research() method
- [x] Integration with existing tools.Registry for search
- [x] Compression function that filters think_tool calls
- [x] Unit tests with mocked LLM client
- [x] `go test ./internal/agents/...` passes

---

## Phase 6: Supervisor Agent

**Files to create**: `internal/agents/supervisor.go`, `internal/agents/supervisor_test.go`

### Implementation

The supervisor:

1. Receives research brief and initial draft
2. Executes diffusion loop:
   - Generate research questions for gaps
   - Delegate via conduct_research (parallel if independent)
   - Refine draft with findings
   - Check completion (based on findings, NOT draft appearance)
3. Returns accumulated notes and final draft

### Key Behaviors

- **Max iterations**: 15 (configurable)
- **Max concurrent sub-researchers**: 3
- **Completion criterion**: Findings are comprehensive, not draft looks good
- **think_tool**: Used before/after conduct_research for planning

### Success Criteria

- [x] SupervisorAgent struct with Coordinate() method
- [x] Takes sub-researcher callback for delegation
- [x] Parallel execution support for conduct_research
- [x] Unit tests with mocked components
- [x] `go test ./internal/agents/...` passes

---

## Phase 7: Orchestrator

**Files to create**: `internal/orchestrator/think_deep.go`, `internal/orchestrator/think_deep_test.go`

### Implementation

The orchestrator manages the full workflow:

1. **Phase 1: Brief Generation** - Transform query to detailed research brief
2. **Phase 2: Initial Draft** - Generate draft from model's knowledge
3. **Phase 3: Diffusion Loop** - Supervisor coordination with sub-researchers
4. **Phase 4: Final Report** - Full optimization with Insightfulness + Helpfulness rules

### Functional Options Pattern

Following `internal/orchestrator/deep_storm.go`:

```go
type ThinkDeepOption func(*ThinkDeepOrchestrator)

func WithThinkDeepClient(client llm.ChatClient) ThinkDeepOption {
    return func(o *ThinkDeepOrchestrator) {
        o.client = client
        // Recreate agents with injected client
    }
}

func WithThinkDeepTools(tools tools.ToolExecutor) ThinkDeepOption {
    return func(o *ThinkDeepOrchestrator) {
        o.tools = tools
    }
}
```

### Event Emission

Emit events at each phase transition:

- `EventDiffusionStarted` at start
- `EventDiffusionIterationStart` for each iteration
- `EventResearchDelegated` when delegating to sub-researcher
- `EventSubResearcherProgress` during sub-research
- `EventDraftRefined` after draft refinement
- `EventDiffusionComplete` when diffusion ends
- `EventFinalReportStarted/Complete` for final phase

### Success Criteria

- [x] ThinkDeepOrchestrator with Research() method
- [x] Functional options for dependency injection
- [x] Full event emission for visualization
- [x] Cost tracking via session.CostBreakdown
- [x] Unit tests with mocked dependencies
- [x] `go test ./internal/orchestrator/...` passes

---

## Phase 8: Architecture Registration

**Files to create**: `internal/architectures/think_deep/think_deep.go`, `internal/architectures/think_deep/think_deep_test.go`

### Implementation

Following `internal/architectures/storm/storm.go` pattern:

```go
func init() {
    catalog.Register(catalog.Definition{
        Name:           "think_deep",
        Description:    "ThinkDepth: Self-Balancing Test-Time Diffusion Deep Research",
        SupportsResume: false,
        Build: func(deps catalog.Dependencies) (architectures.Architecture, error) {
            if deps.Config == nil {
                return nil, fmt.Errorf("config required for think_deep")
            }
            return New(Config{
                AppConfig: deps.Config,
                Bus:       deps.Bus,
            }), nil
        },
    })
}
```

### Architecture Methods

- `Name() string` - Returns "think_deep"
- `Description() string` - Returns full description with original model note
- `SupportsResume() bool` - Returns false
- `Research(ctx, sessionID, query)` - Executes full research workflow
- `Resume(ctx, sessionID)` - Returns error (not supported)

### Import Registration

Add import to `internal/architectures/catalog/catalog.go`:

```go
import (
    // ... existing imports
    _ "go-research/internal/architectures/think_deep"
)
```

### Success Criteria

- [x] Architecture implements `architectures.Architecture` interface
- [x] Self-registers via init()
- [x] Accessible via `catalog.Get("think_deep")`
- [x] Full integration test
- [x] `go test ./internal/architectures/...` passes

### Implementation Notes

The import registration is added to `internal/repl/handlers/handlers.go` instead of `catalog.go` to match the existing pattern for STORM.

Due to import cycle constraints, the shared prompts/state/tools are in `internal/think_deep/` (not `internal/architectures/think_deep/`) to allow both the orchestrator and agents to import them without creating a cycle with the architecture registration.

---

## Phase 9: CLI Visualization

**Files to create**: `internal/repl/diffusion_display.go`
**Files to modify**: `internal/repl/visualizer.go`

### DiffusionDisplay Component

Create a display component that:

1. Renders initial diffusion plan (4-phase flow diagram)
2. Shows iteration progress with progress bars
3. Displays sub-researcher activity with icons
4. Shows draft refinement progress

### Visualizer Integration

Add to `Visualizer`:

1. New `diffusionDisplay *DiffusionDisplay` field
2. Subscribe to ThinkDeep event types
3. Route events to diffusionDisplay.HandleEvent()

### Success Criteria

- [x] DiffusionDisplay renders plan visualization
- [x] Iteration progress displays correctly
- [x] Sub-researcher status updates in real-time
- [x] Draft refinement shows progress bar
- [x] Colors match scheme (Magenta for diffusion, Cyan for refinement)
- [x] `go build ./...` passes

---

## Phase 10: Integration Testing

**Files to create**: `internal/architectures/think_deep/integration_test.go`

### Test Scenarios

1. **Basic Research Flow**
   - Mock LLM returns valid tool calls
   - Verify all phases execute
   - Check event emission order

2. **Parallel Sub-Researchers**
   - Supervisor issues multiple conduct_research
   - Verify concurrent execution
   - Check result aggregation

3. **Early Completion**
   - Research completes before max iterations
   - Verify completion based on findings

4. **Max Iterations**
   - Research continues to max iterations
   - Verify graceful completion

### Success Criteria

- [x] All integration tests pass
- [x] Event emission verified
- [x] Cost tracking accurate
- [x] `go test -v ./internal/architectures/think_deep/...` passes

---

## Implementation Order

Execute phases sequentially, verifying each passes before continuing:

1. **Phase 1: Event Types** (30 lines)
2. **Phase 2: Prompts** (200 lines)
3. **Phase 3: State Definitions** (30 lines)
4. **Phase 4: Tools** (100 lines)
5. **Phase 5: Sub-Researcher Agent** (150 lines + tests)
6. **Phase 6: Supervisor Agent** (200 lines + tests)
7. **Phase 7: Orchestrator** (250 lines + tests)
8. **Phase 8: Architecture Registration** (100 lines + tests)
9. **Phase 9: CLI Visualization** (300 lines)
10. **Phase 10: Integration Testing** (200 lines)

**Total estimated**: ~1,500 lines of new code

---

## Verification Commands

After each phase:

```bash
# Build check
go build ./...

# Lint check
go vet ./...

# Test affected package
go test ./internal/events/...           # Phase 1
go test ./internal/architectures/...    # Phases 2-4, 8, 10
go test ./internal/agents/...           # Phases 5-6
go test ./internal/orchestrator/...     # Phase 7
go build ./internal/repl/...            # Phase 9
```

Final verification:

```bash
# Full test suite
go test ./...

# Run with ThinkDeep architecture
go run ./cmd/research -arch think_deep "What are the implications of quantum computing?"
```

---

## Open Questions (To Resolve During Implementation)

1. **Tool Response Format**: How should tools return results to be parsed by the LLM?
   - Current: Plain text
   - Consider: Structured JSON for better parsing

2. **Parallel Execution**: Should parallel sub-researchers use goroutines or sequential execution?
   - Recommend: Start sequential, add goroutines in Phase 7

3. **Draft Progress Calculation**: How to estimate draft completeness?
   - Recommend: Simple heuristic based on sections filled + sources incorporated

4. **Max Context Length**: Original uses 250000 tokens - do we need to handle truncation?
   - Recommend: Let model handle, add warning event if response truncated
