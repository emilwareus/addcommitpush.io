# State-of-the-Art Deep Research Agent Implementation Plan

## Overview

Transform the existing Go research agent from a basic ReAct implementation into a state-of-the-art deep research system incorporating:

- **Context Folding** (AgentFold-style proactive context management)
- **Multi-Perspective Research** (STORM-style expert conversations)
- **DAG-Based Planning** (parallel task execution with dependencies)
- **Iterative Search with Gap Analysis** (Search-R1 style)
- **Specialized Sub-Agents** (search, analysis, synthesis)

This plan uses the **existing LLM client** (OpenRouter via `internal/llm/client.go`) without introducing multiple model configurations.

---

## Current State Analysis

### What Exists

| Component    | Location                                | Current State                                            |
| ------------ | --------------------------------------- | -------------------------------------------------------- |
| Orchestrator | `internal/orchestrator/orchestrator.go` | Basic coordination, complexity-based worker allocation   |
| Planner      | `internal/orchestrator/planner.go`      | Flat task decomposition (no DAG, no dependencies)        |
| Worker Pool  | `internal/orchestrator/pool.go`         | Parallel execution with goroutines                       |
| ReAct Agent  | `internal/agent/react.go`               | Single-agent ReAct loop with `<thought>/<tool>/<answer>` |
| Synthesizer  | `internal/orchestrator/synthesizer.go`  | Simple concatenation synthesis                           |
| Tools        | `internal/tools/`                       | `search` (Brave API), `fetch` (HTML scraping)            |
| LLM Client   | `internal/llm/client.go`                | OpenRouter client with streaming support                 |
| Session      | `internal/session/session.go`           | Session state, worker context tracking                   |
| Events       | `internal/events/`                      | Event bus for UI updates                                 |

### Key Discoveries

1. **No Context Management**: `react.go:107-110` initializes messages fresh each time, appends indefinitely without compression
2. **No DAG Planning**: `planner.go:76-131` creates flat `[]Task` with no dependencies
3. **No Perspectives**: Single-viewpoint research with generic decomposition
4. **No Gap Analysis**: Workers complete after max iterations or finding answer, no gap identification
5. **No Specialized Agents**: All workers use identical `React` agent configuration
6. **Token Tracking Limited**: `react.go:164-166` estimates tokens but doesn't manage budget proactively

---

## Desired End State

After implementation:

1. **Context Manager** actively compresses history using multi-scale summaries
2. **Planning Agent** discovers perspectives and creates DAG-structured research plans
3. **Search Agent** performs iterative search with follow-up query generation
4. **Analysis Agent** cross-validates facts and identifies knowledge gaps
5. **Synthesis Agent** generates structured reports with proper citations
6. **Orchestrator** coordinates all agents with dynamic replanning

### Verification

- Run `go build ./...` - compiles without errors
- Run `go test ./...` - all tests pass
- Execute research query and observe:
  - Perspectives discovered before research
  - Parallel DAG task execution
  - Context folding events in verbose mode
  - Gap identification and follow-up searches
  - Final report with structured sections and citations

---

## What We're NOT Doing

- **Multiple LLM providers/models** - Use single existing OpenRouter client
- **Browser automation** - Stick with current `fetch` tool (no chromedp)
- **Code execution tool** - Out of scope for this iteration
- **Reinforcement learning training** - Pure prompt-engineering approach
- **MCP server integration** - Not adding extensibility layer
- **External vector databases** - Keep everything in-memory

---

## Implementation Approach

We'll implement in **6 phases**, each building on the previous. Each phase produces working, testable code.

**Architecture after completion:**

```
┌──────────────────────────────────────────────────────────────────┐
│                    DeepResearchOrchestrator                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Context Manager                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │  │
│  │  │ Summaries[] │ │ WorkingMem  │ │ ToolMemory          │   │  │
│  │  │ (L0..Ln)    │ │ (last K)    │ │ (consolidated)      │   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │                    Planning Agent                           │  │
│  │  • Perspective Discovery  • DAG Creation  • Replanning     │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              │                                    │
│    ┌─────────────────────────┼─────────────────────────┐         │
│    │                         │                         │         │
│    ▼                         ▼                         ▼         │
│ ┌──────────┐          ┌──────────────┐          ┌────────────┐   │
│ │ Search   │          │ Analysis     │          │ Synthesis  │   │
│ │ Agent    │          │ Agent        │          │ Agent      │   │
│ └──────────┘          └──────────────┘          └────────────┘   │
│                              │                                    │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │                    Tool Layer (existing)                    │  │
│  │           search (Brave)    │    fetch (HTTP)              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Context Manager Foundation

### Overview

Implement the Context Manager with multi-scale state summaries and token budget management. This is the most critical component for long-horizon research tasks.

### Changes Required

#### 1. Create Context Package

**File**: `internal/context/manager.go`

```go
package context

import (
    "go-research/internal/llm"
    "sync"
    "time"
)

// Manager handles proactive context management with multi-scale folding
type Manager struct {
    mu              sync.RWMutex
    client          llm.ChatClient

    // Multi-scale summaries (L0=finest, Ln=coarsest)
    summaries       []Summary
    numLevels       int

    // Working memory (recent uncompressed interactions)
    workingMemory   []Interaction
    workingMemSize  int

    // Tool memory (consolidated tool call history)
    toolMemory      map[string]ToolSummary

    // Token budget
    maxTokens       int
    currentTokens   int
    foldThreshold   float64  // e.g., 0.8 = fold at 80% capacity
}

type Summary struct {
    Level        int
    Content      string
    TokenCount   int
    CoveredTurns []int
    Timestamp    time.Time
}

type Interaction struct {
    Role      string
    Content   string
    Tokens    int
    TurnNum   int
    Timestamp time.Time
}

type ToolSummary struct {
    Tool        string
    CallCount   int
    LastResult  string
    KeyFindings []string
}

type Config struct {
    MaxTokens      int
    FoldThreshold  float64
    NumLevels      int
    WorkingMemSize int
}

func DefaultConfig() Config {
    return Config{
        MaxTokens:      40000,
        FoldThreshold:  0.75,
        NumLevels:      3,
        WorkingMemSize: 5,
    }
}

func New(client llm.ChatClient, cfg Config) *Manager {
    return &Manager{
        client:         client,
        summaries:      make([]Summary, cfg.NumLevels),
        numLevels:      cfg.NumLevels,
        workingMemory:  make([]Interaction, 0, cfg.WorkingMemSize),
        workingMemSize: cfg.WorkingMemSize,
        toolMemory:     make(map[string]ToolSummary),
        maxTokens:      cfg.MaxTokens,
        foldThreshold:  cfg.FoldThreshold,
    }
}
```

**File**: `internal/context/folding.go`

```go
package context

import (
    "context"
    "fmt"
    "go-research/internal/llm"
)

type FoldType int

const (
    FoldNone FoldType = iota
    FoldGranular     // Compress latest into L0 summary
    FoldDeep         // Consolidate L0..Ln into Ln+1
)

type FoldDirective struct {
    Type        FoldType
    TargetLevel int
    Rationale   string
}

// ShouldFold checks if context needs compression
func (m *Manager) ShouldFold() bool {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return float64(m.currentTokens)/float64(m.maxTokens) >= m.foldThreshold
}

// DecideFolding uses LLM to determine optimal folding strategy
func (m *Manager) DecideFolding(ctx context.Context) (FoldDirective, error) {
    m.mu.RLock()
    prompt := m.buildFoldingPrompt()
    m.mu.RUnlock()

    resp, err := m.client.Chat(ctx, []llm.Message{
        {Role: "system", Content: foldingSystemPrompt},
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return FoldDirective{Type: FoldGranular}, nil // Default to granular
    }

    return m.parseFoldingResponse(resp.Choices[0].Message.Content)
}

// Fold applies the folding directive
func (m *Manager) Fold(ctx context.Context, directive FoldDirective) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    switch directive.Type {
    case FoldGranular:
        return m.foldGranular(ctx)
    case FoldDeep:
        return m.foldDeep(ctx, directive.TargetLevel)
    }
    return nil
}

func (m *Manager) foldGranular(ctx context.Context) error {
    if len(m.workingMemory) == 0 {
        return nil
    }

    // Summarize working memory into L0
    content := m.formatWorkingMemory()
    summary, err := m.summarize(ctx, content, "condense")
    if err != nil {
        return err
    }

    m.summaries[0].Content += "\n" + summary
    m.summaries[0].TokenCount = estimateTokens(m.summaries[0].Content)
    m.workingMemory = m.workingMemory[:0]
    m.recalculateTokens()
    return nil
}

func (m *Manager) foldDeep(ctx context.Context, targetLevel int) error {
    // Consolidate summaries up to targetLevel into next level
    var toConsolidate []string
    for i := 0; i <= targetLevel && i < len(m.summaries); i++ {
        if m.summaries[i].Content != "" {
            toConsolidate = append(toConsolidate, m.summaries[i].Content)
        }
    }

    if len(toConsolidate) == 0 {
        return nil
    }

    consolidated, err := m.summarize(ctx,
        fmt.Sprintf("Consolidate these summaries:\n%s", toConsolidate),
        "consolidate")
    if err != nil {
        return err
    }

    // Clear lower levels, add to target+1
    for i := 0; i <= targetLevel; i++ {
        m.summaries[i] = Summary{}
    }
    nextLevel := targetLevel + 1
    if nextLevel < len(m.summaries) {
        m.summaries[nextLevel].Content += "\n" + consolidated
        m.summaries[nextLevel].TokenCount = estimateTokens(m.summaries[nextLevel].Content)
    }

    m.recalculateTokens()
    return nil
}

const foldingSystemPrompt = `You are a context management assistant. Analyze the current context state and decide the optimal folding strategy.

Options:
- NONE: Keep working memory as-is
- GRANULAR: Compress recent interactions into fine-grained summary (use when working memory is full but summaries have room)
- DEEP: Consolidate multiple summary levels into coarser abstraction (use when completing a subtask or changing research direction)

Respond with JSON: {"type": "NONE|GRANULAR|DEEP", "target_level": 0-2, "rationale": "brief reason"}`
```

**File**: `internal/context/builder.go`

```go
package context

import (
    "fmt"
    "strings"
    "go-research/internal/llm"
)

// BuildMessages constructs the message array for LLM calls
func (m *Manager) BuildMessages(systemPrompt, userQuery string) []llm.Message {
    m.mu.RLock()
    defer m.mu.RUnlock()

    messages := []llm.Message{
        {Role: "system", Content: systemPrompt},
    }

    // Add summaries from coarsest to finest
    for i := len(m.summaries) - 1; i >= 0; i-- {
        if m.summaries[i].Content != "" {
            messages = append(messages, llm.Message{
                Role:    "system",
                Content: fmt.Sprintf("[Research Context L%d]\n%s", i, m.summaries[i].Content),
            })
        }
    }

    // Add working memory
    for _, interaction := range m.workingMemory {
        messages = append(messages, llm.Message{
            Role:    interaction.Role,
            Content: interaction.Content,
        })
    }

    // Add current query
    if userQuery != "" {
        messages = append(messages, llm.Message{
            Role:    "user",
            Content: userQuery,
        })
    }

    return messages
}

// AddInteraction records a new interaction
func (m *Manager) AddInteraction(role, content string) {
    m.mu.Lock()
    defer m.mu.Unlock()

    tokens := estimateTokens(content)
    m.workingMemory = append(m.workingMemory, Interaction{
        Role:    role,
        Content: content,
        Tokens:  tokens,
    })
    m.currentTokens += tokens

    // Trim working memory if over size
    for len(m.workingMemory) > m.workingMemSize {
        m.currentTokens -= m.workingMemory[0].Tokens
        m.workingMemory = m.workingMemory[1:]
    }
}

// AddToolResult records a tool execution
func (m *Manager) AddToolResult(tool, result string, findings []string) {
    m.mu.Lock()
    defer m.mu.Unlock()

    summary := m.toolMemory[tool]
    summary.Tool = tool
    summary.CallCount++
    summary.LastResult = truncate(result, 500)
    summary.KeyFindings = append(summary.KeyFindings, findings...)
    m.toolMemory[tool] = summary
}

func estimateTokens(s string) int {
    return len(s) / 4
}

func truncate(s string, n int) string {
    if len(s) <= n {
        return s
    }
    return s[:n] + "..."
}
```

#### 2. Add Context Manager Tests

**File**: `internal/context/manager_test.go`

```go
package context

import (
    "context"
    "testing"
)

func TestManagerTokenTracking(t *testing.T) {
    mgr := New(nil, DefaultConfig())

    mgr.AddInteraction("user", "test query")
    if mgr.currentTokens == 0 {
        t.Error("expected tokens to be tracked")
    }
}

func TestShouldFold(t *testing.T) {
    cfg := DefaultConfig()
    cfg.MaxTokens = 100
    cfg.FoldThreshold = 0.5
    mgr := New(nil, cfg)

    if mgr.ShouldFold() {
        t.Error("should not fold with empty context")
    }

    // Add enough tokens to trigger fold
    mgr.currentTokens = 60
    if !mgr.ShouldFold() {
        t.Error("should fold at 60% with 50% threshold")
    }
}

func TestBuildMessages(t *testing.T) {
    mgr := New(nil, DefaultConfig())
    mgr.AddInteraction("assistant", "I found something")
    mgr.AddInteraction("user", "Tell me more")

    msgs := mgr.BuildMessages("system prompt", "current query")

    if len(msgs) < 3 {
        t.Errorf("expected at least 3 messages, got %d", len(msgs))
    }
    if msgs[0].Role != "system" {
        t.Error("first message should be system prompt")
    }
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `go build ./internal/context/...`
- [x] Tests pass: `go test ./internal/context/...`
- [x] No linting errors: `go vet ./internal/context/...`

#### Manual Verification:

- [x] Context manager initializes without panic
- [x] Token counting produces reasonable estimates
- [x] ShouldFold triggers at correct threshold

---

## Phase 2: DAG-Based Planning System

### Overview

Replace flat task lists with a directed acyclic graph structure supporting parallel execution with dependencies.

### Changes Required

#### 1. Create Planning Package

**File**: `internal/planning/dag.go`

```go
package planning

import (
    "fmt"
    "sync"
)

type NodeStatus int

const (
    StatusPending NodeStatus = iota
    StatusRunning
    StatusComplete
    StatusFailed
)

type TaskType int

const (
    TaskSearch TaskType = iota
    TaskAnalyze
    TaskSynthesize
    TaskValidate
)

type DAGNode struct {
    ID           string
    TaskType     TaskType
    Description  string
    Dependencies []string
    Status       NodeStatus
    Result       interface{}
    Error        error
}

type ResearchDAG struct {
    mu    sync.RWMutex
    nodes map[string]*DAGNode
    edges map[string][]string // node -> its dependencies
}

func NewDAG() *ResearchDAG {
    return &ResearchDAG{
        nodes: make(map[string]*DAGNode),
        edges: make(map[string][]string),
    }
}

func (d *ResearchDAG) AddNode(id string, taskType TaskType, description string) *DAGNode {
    d.mu.Lock()
    defer d.mu.Unlock()

    node := &DAGNode{
        ID:          id,
        TaskType:    taskType,
        Description: description,
        Status:      StatusPending,
    }
    d.nodes[id] = node
    d.edges[id] = []string{}
    return node
}

func (d *ResearchDAG) AddDependency(nodeID, dependsOn string) {
    d.mu.Lock()
    defer d.mu.Unlock()
    d.edges[nodeID] = append(d.edges[nodeID], dependsOn)
}

// GetReadyTasks returns nodes where all dependencies are complete
func (d *ResearchDAG) GetReadyTasks() []*DAGNode {
    d.mu.RLock()
    defer d.mu.RUnlock()

    var ready []*DAGNode
    for id, node := range d.nodes {
        if node.Status != StatusPending {
            continue
        }

        allDepsComplete := true
        for _, depID := range d.edges[id] {
            dep, exists := d.nodes[depID]
            if !exists || dep.Status != StatusComplete {
                allDepsComplete = false
                break
            }
        }

        if allDepsComplete {
            ready = append(ready, node)
        }
    }
    return ready
}

// SetStatus updates a node's status
func (d *ResearchDAG) SetStatus(nodeID string, status NodeStatus) {
    d.mu.Lock()
    defer d.mu.Unlock()
    if node, exists := d.nodes[nodeID]; exists {
        node.Status = status
    }
}

// SetResult stores the result for a completed node
func (d *ResearchDAG) SetResult(nodeID string, result interface{}) {
    d.mu.Lock()
    defer d.mu.Unlock()
    if node, exists := d.nodes[nodeID]; exists {
        node.Result = result
        node.Status = StatusComplete
    }
}

// AllComplete checks if all nodes are done
func (d *ResearchDAG) AllComplete() bool {
    d.mu.RLock()
    defer d.mu.RUnlock()
    for _, node := range d.nodes {
        if node.Status != StatusComplete && node.Status != StatusFailed {
            return false
        }
    }
    return true
}

// TopologicalOrder returns nodes in execution order
func (d *ResearchDAG) TopologicalOrder() []*DAGNode {
    d.mu.RLock()
    defer d.mu.RUnlock()

    visited := make(map[string]bool)
    var order []*DAGNode

    var visit func(string)
    visit = func(id string) {
        if visited[id] {
            return
        }
        visited[id] = true
        for _, depID := range d.edges[id] {
            visit(depID)
        }
        order = append(order, d.nodes[id])
    }

    for id := range d.nodes {
        visit(id)
    }

    // Reverse to get proper order
    for i, j := 0, len(order)-1; i < j; i, j = i+1, j-1 {
        order[i], order[j] = order[j], order[i]
    }
    return order
}
```

**File**: `internal/planning/perspectives.go`

```go
package planning

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"

    "go-research/internal/llm"
)

type Perspective struct {
    Name      string   `json:"name"`
    Focus     string   `json:"focus"`
    Questions []string `json:"questions"`
}

type PerspectiveDiscoverer struct {
    client llm.ChatClient
}

func NewPerspectiveDiscoverer(client llm.ChatClient) *PerspectiveDiscoverer {
    return &PerspectiveDiscoverer{client: client}
}

func (p *PerspectiveDiscoverer) Discover(ctx context.Context, topic string) ([]Perspective, error) {
    prompt := fmt.Sprintf(`For the research topic: "%s"

Identify 3-5 distinct expert perspectives that would provide comprehensive coverage.

For each perspective:
1. Name (e.g., "Technical Expert", "Industry Analyst", "End User Advocate")
2. Focus area (what they prioritize)
3. 3-4 key questions they would ask

Return JSON array:
[
  {
    "name": "Perspective Name",
    "focus": "What this perspective prioritizes",
    "questions": ["Question 1", "Question 2", "Question 3"]
  }
]`, topic)

    resp, err := p.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return nil, fmt.Errorf("perspective discovery: %w", err)
    }

    if len(resp.Choices) == 0 {
        return nil, fmt.Errorf("empty response")
    }

    content := resp.Choices[0].Message.Content
    return p.parseResponse(content)
}

func (p *PerspectiveDiscoverer) parseResponse(content string) ([]Perspective, error) {
    start := strings.Index(content, "[")
    end := strings.LastIndex(content, "]") + 1
    if start < 0 || end <= start {
        return nil, fmt.Errorf("no JSON array found")
    }

    var perspectives []Perspective
    if err := json.Unmarshal([]byte(content[start:end]), &perspectives); err != nil {
        return nil, fmt.Errorf("parse perspectives: %w", err)
    }
    return perspectives, nil
}
```

**File**: `internal/planning/planner.go`

```go
package planning

import (
    "context"
    "fmt"

    "go-research/internal/llm"
)

type Planner struct {
    client     llm.ChatClient
    discoverer *PerspectiveDiscoverer
}

func NewPlanner(client llm.ChatClient) *Planner {
    return &Planner{
        client:     client,
        discoverer: NewPerspectiveDiscoverer(client),
    }
}

type ResearchPlan struct {
    Topic        string
    Perspectives []Perspective
    DAG          *ResearchDAG
}

// CreatePlan generates a full research plan with perspectives and DAG
func (p *Planner) CreatePlan(ctx context.Context, topic string) (*ResearchPlan, error) {
    // 1. Discover perspectives
    perspectives, err := p.discoverer.Discover(ctx, topic)
    if err != nil {
        // Use default perspectives if discovery fails
        perspectives = defaultPerspectives(topic)
    }

    // 2. Build DAG
    dag := p.buildDAG(topic, perspectives)

    return &ResearchPlan{
        Topic:        topic,
        Perspectives: perspectives,
        DAG:          dag,
    }, nil
}

func (p *Planner) buildDAG(topic string, perspectives []Perspective) *ResearchDAG {
    dag := NewDAG()

    // Root: Initial topic understanding
    rootNode := dag.AddNode("root", TaskAnalyze, fmt.Sprintf("Initial analysis of: %s", topic))

    // Create search nodes for each perspective (can run in parallel after root)
    searchNodes := make([]string, 0, len(perspectives))
    for i, perspective := range perspectives {
        nodeID := fmt.Sprintf("search_%d", i)
        dag.AddNode(nodeID, TaskSearch, fmt.Sprintf("Research from %s perspective: %s", perspective.Name, perspective.Focus))
        dag.AddDependency(nodeID, rootNode.ID)
        searchNodes = append(searchNodes, nodeID)
    }

    // Analysis node (depends on all searches)
    analysisNode := dag.AddNode("cross_validate", TaskAnalyze, "Cross-validate and identify gaps")
    for _, searchID := range searchNodes {
        dag.AddDependency(analysisNode.ID, searchID)
    }

    // Gap-fill node (depends on analysis)
    gapNode := dag.AddNode("fill_gaps", TaskSearch, "Fill identified knowledge gaps")
    dag.AddDependency(gapNode.ID, analysisNode.ID)

    // Synthesis node (depends on gap-fill)
    synthesisNode := dag.AddNode("synthesize", TaskSynthesize, "Generate final report")
    dag.AddDependency(synthesisNode.ID, gapNode.ID)

    return dag
}

func defaultPerspectives(topic string) []Perspective {
    return []Perspective{
        {Name: "Technical Expert", Focus: "Implementation details and technical feasibility", Questions: []string{fmt.Sprintf("What are the technical components of %s?", topic)}},
        {Name: "Practical User", Focus: "Real-world applications and usability", Questions: []string{fmt.Sprintf("How is %s used in practice?", topic)}},
        {Name: "Critic", Focus: "Limitations and challenges", Questions: []string{fmt.Sprintf("What are the limitations of %s?", topic)}},
    }
}
```

#### 2. Add Planning Tests

**File**: `internal/planning/dag_test.go`

```go
package planning

import "testing"

func TestDAGReadyTasks(t *testing.T) {
    dag := NewDAG()

    root := dag.AddNode("root", TaskAnalyze, "root task")
    child := dag.AddNode("child", TaskSearch, "child task")
    dag.AddDependency(child.ID, root.ID)

    // Initially only root is ready
    ready := dag.GetReadyTasks()
    if len(ready) != 1 || ready[0].ID != "root" {
        t.Errorf("expected only root to be ready, got %v", ready)
    }

    // Complete root
    dag.SetResult("root", "done")

    // Now child should be ready
    ready = dag.GetReadyTasks()
    if len(ready) != 1 || ready[0].ID != "child" {
        t.Errorf("expected child to be ready after root complete, got %v", ready)
    }
}

func TestDAGTopologicalOrder(t *testing.T) {
    dag := NewDAG()

    dag.AddNode("a", TaskAnalyze, "a")
    dag.AddNode("b", TaskSearch, "b")
    dag.AddNode("c", TaskSynthesize, "c")
    dag.AddDependency("b", "a")
    dag.AddDependency("c", "b")

    order := dag.TopologicalOrder()

    // a should come before b, b before c
    aIdx, bIdx, cIdx := -1, -1, -1
    for i, node := range order {
        switch node.ID {
        case "a":
            aIdx = i
        case "b":
            bIdx = i
        case "c":
            cIdx = i
        }
    }

    if aIdx >= bIdx || bIdx >= cIdx {
        t.Errorf("invalid topological order: a=%d, b=%d, c=%d", aIdx, bIdx, cIdx)
    }
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `go build ./internal/planning/...`
- [x] Tests pass: `go test ./internal/planning/...`
- [x] No linting errors: `go vet ./internal/planning/...`

#### Manual Verification:

- [x] DAG correctly tracks dependencies
- [x] Ready tasks are computed correctly as dependencies complete
- [x] Perspective discovery returns reasonable expert viewpoints

---

## Phase 3: Specialized Search Agent

### Overview

Create an iterative search agent that generates follow-up queries based on knowledge gaps.

### Changes Required

#### 1. Create Search Agent

**File**: `internal/agents/search.go`

```go
package agents

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"

    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/planning"
    "go-research/internal/tools"
)

type SearchAgent struct {
    client        llm.ChatClient
    tools         tools.ToolExecutor
    bus           *events.Bus
    maxIterations int
}

type SearchConfig struct {
    MaxIterations int
}

func NewSearchAgent(client llm.ChatClient, toolExec tools.ToolExecutor, bus *events.Bus, cfg SearchConfig) *SearchAgent {
    return &SearchAgent{
        client:        client,
        tools:         toolExec,
        bus:           bus,
        maxIterations: cfg.MaxIterations,
    }
}

type SearchState struct {
    Goal         string
    Perspective  *planning.Perspective
    Queries      []string
    Facts        []Fact
    Gaps         []string
    Sources      []string
    Iteration    int
}

type Fact struct {
    Content    string   `json:"content"`
    Source     string   `json:"source"`
    Confidence float64  `json:"confidence"`
}

type SearchResult struct {
    Facts   []Fact
    Sources []string
    Gaps    []string
}

func (s *SearchAgent) Search(ctx context.Context, goal string, perspective *planning.Perspective) (*SearchResult, error) {
    state := &SearchState{
        Goal:        goal,
        Perspective: perspective,
        Facts:       []Fact{},
        Sources:     []string{},
    }

    // Generate initial queries from perspective
    state.Queries = s.generateQueries(ctx, state)

    for state.Iteration < s.maxIterations {
        state.Iteration++

        // Execute searches in parallel
        results := s.executeSearches(ctx, state.Queries)

        // Extract facts from results
        facts, sources := s.extractFacts(ctx, results)
        state.Facts = append(state.Facts, facts...)
        state.Sources = append(state.Sources, sources...)

        // Identify knowledge gaps
        gaps := s.identifyGaps(ctx, state)
        state.Gaps = gaps

        // Check if sufficient coverage
        if len(gaps) == 0 || s.sufficientCoverage(state) {
            break
        }

        // Generate follow-up queries for gaps
        state.Queries = s.generateGapQueries(ctx, gaps)
    }

    return &SearchResult{
        Facts:   state.Facts,
        Sources: dedupe(state.Sources),
        Gaps:    state.Gaps,
    }, nil
}

func (s *SearchAgent) generateQueries(ctx context.Context, state *SearchState) []string {
    var questions string
    if state.Perspective != nil {
        questions = strings.Join(state.Perspective.Questions, "\n- ")
    }

    prompt := fmt.Sprintf(`Generate 3-5 search queries to research: %s

Perspective: %s
Focus: %s
Key questions:
- %s

Return JSON array of search queries: ["query1", "query2", ...]`,
        state.Goal,
        state.Perspective.Name,
        state.Perspective.Focus,
        questions)

    resp, err := s.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return []string{state.Goal} // Fallback to goal as query
    }

    return parseStringArray(resp.Choices[0].Message.Content)
}

func (s *SearchAgent) executeSearches(ctx context.Context, queries []string) []string {
    var results []string
    for _, query := range queries {
        result, err := s.tools.Execute(ctx, "search", map[string]interface{}{
            "query": query,
            "count": 5,
        })
        if err != nil {
            continue
        }
        results = append(results, result)
    }
    return results
}

func (s *SearchAgent) extractFacts(ctx context.Context, searchResults []string) ([]Fact, []string) {
    combined := strings.Join(searchResults, "\n---\n")

    prompt := fmt.Sprintf(`Extract factual claims from these search results:

%s

Return JSON array:
[
  {"content": "factual claim", "source": "URL if available", "confidence": 0.0-1.0}
]

Only include verifiable facts, not opinions.`, combined)

    resp, err := s.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return nil, nil
    }

    facts := parseFactsArray(resp.Choices[0].Message.Content)

    // Extract sources from results
    sources := tools.ExtractURLs(combined)

    return facts, sources
}

func (s *SearchAgent) identifyGaps(ctx context.Context, state *SearchState) []string {
    var factsSummary strings.Builder
    for _, f := range state.Facts {
        factsSummary.WriteString(fmt.Sprintf("- %s\n", f.Content))
    }

    var questions string
    if state.Perspective != nil {
        questions = strings.Join(state.Perspective.Questions, "\n- ")
    }

    prompt := fmt.Sprintf(`Research goal: %s

Questions to answer:
- %s

Facts gathered:
%s

Identify knowledge gaps - what important questions remain unanswered?
Return JSON array of gap descriptions: ["gap1", "gap2"]
Return empty array [] if no significant gaps.`, state.Goal, questions, factsSummary.String())

    resp, err := s.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return nil
    }

    return parseStringArray(resp.Choices[0].Message.Content)
}

func (s *SearchAgent) generateGapQueries(ctx context.Context, gaps []string) []string {
    prompt := fmt.Sprintf(`Generate search queries to fill these knowledge gaps:

Gaps:
%s

Return JSON array of search queries: ["query1", "query2"]`, strings.Join(gaps, "\n- "))

    resp, err := s.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return gaps // Use gaps as queries directly
    }

    return parseStringArray(resp.Choices[0].Message.Content)
}

func (s *SearchAgent) sufficientCoverage(state *SearchState) bool {
    // Sufficient if we have at least 5 facts and less than 2 gaps
    return len(state.Facts) >= 5 && len(state.Gaps) < 2
}

func parseStringArray(content string) []string {
    start := strings.Index(content, "[")
    end := strings.LastIndex(content, "]") + 1
    if start < 0 || end <= start {
        return nil
    }

    var arr []string
    json.Unmarshal([]byte(content[start:end]), &arr)
    return arr
}

func parseFactsArray(content string) []Fact {
    start := strings.Index(content, "[")
    end := strings.LastIndex(content, "]") + 1
    if start < 0 || end <= start {
        return nil
    }

    var facts []Fact
    json.Unmarshal([]byte(content[start:end]), &facts)
    return facts
}

func dedupe(items []string) []string {
    seen := make(map[string]bool)
    result := make([]string, 0, len(items))
    for _, item := range items {
        if !seen[item] {
            seen[item] = true
            result = append(result, item)
        }
    }
    return result
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `go build ./internal/agents/...`
- [x] Tests pass: `go test ./internal/agents/...`

#### Manual Verification:

- [x] Search agent generates queries from perspectives
- [x] Facts are extracted with sources
- [x] Gaps are identified correctly
- [x] Follow-up queries address gaps

---

## Phase 4: Analysis Agent

### Overview

Create an agent that cross-validates facts and identifies contradictions.

### Changes Required

#### 1. Create Analysis Agent

**File**: `internal/agents/analysis.go`

```go
package agents

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"

    "go-research/internal/llm"
)

type AnalysisAgent struct {
    client llm.ChatClient
}

func NewAnalysisAgent(client llm.ChatClient) *AnalysisAgent {
    return &AnalysisAgent{client: client}
}

type AnalysisResult struct {
    ValidatedFacts  []ValidatedFact
    Contradictions  []Contradiction
    KnowledgeGaps   []KnowledgeGap
    SourceQuality   map[string]float64
}

type ValidatedFact struct {
    Fact
    ValidationScore float64  `json:"validation_score"`
    CorroboratedBy  []string `json:"corroborated_by"`
}

type Contradiction struct {
    Claim1  string `json:"claim1"`
    Source1 string `json:"source1"`
    Claim2  string `json:"claim2"`
    Source2 string `json:"source2"`
    Nature  string `json:"nature"` // direct, nuanced, scope
}

type KnowledgeGap struct {
    Description      string   `json:"description"`
    Importance       float64  `json:"importance"`
    SuggestedQueries []string `json:"suggested_queries"`
}

func (a *AnalysisAgent) Analyze(ctx context.Context, topic string, facts []Fact, expectedCoverage []string) (*AnalysisResult, error) {
    result := &AnalysisResult{
        SourceQuality: make(map[string]float64),
    }

    // 1. Cross-validate facts
    validatedFacts, err := a.crossValidate(ctx, facts)
    if err != nil {
        return nil, fmt.Errorf("cross-validation: %w", err)
    }
    result.ValidatedFacts = validatedFacts

    // 2. Detect contradictions
    contradictions, err := a.detectContradictions(ctx, facts)
    if err != nil {
        return nil, fmt.Errorf("contradiction detection: %w", err)
    }
    result.Contradictions = contradictions

    // 3. Identify knowledge gaps
    gaps, err := a.identifyGaps(ctx, topic, facts, expectedCoverage)
    if err != nil {
        return nil, fmt.Errorf("gap identification: %w", err)
    }
    result.KnowledgeGaps = gaps

    // 4. Assess source quality
    result.SourceQuality = a.assessSourceQuality(facts)

    return result, nil
}

func (a *AnalysisAgent) crossValidate(ctx context.Context, facts []Fact) ([]ValidatedFact, error) {
    if len(facts) == 0 {
        return nil, nil
    }

    var factsText strings.Builder
    for i, f := range facts {
        factsText.WriteString(fmt.Sprintf("%d. [%s] %s\n", i+1, f.Source, f.Content))
    }

    prompt := fmt.Sprintf(`Cross-validate these facts. For each fact, determine:
1. Validation score (0-1): How well-supported is this claim?
2. Corroborating facts: Which other facts support this one?

Facts:
%s

Return JSON array:
[
  {
    "content": "original fact",
    "validation_score": 0.8,
    "corroborated_by": ["source1", "source2"]
  }
]`, factsText.String())

    resp, err := a.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return nil, err
    }

    return parseValidatedFacts(resp.Choices[0].Message.Content), nil
}

func (a *AnalysisAgent) detectContradictions(ctx context.Context, facts []Fact) ([]Contradiction, error) {
    if len(facts) < 2 {
        return nil, nil
    }

    var factsText strings.Builder
    for i, f := range facts {
        factsText.WriteString(fmt.Sprintf("%d. [%s] %s\n", i+1, f.Source, f.Content))
    }

    prompt := fmt.Sprintf(`Identify any contradictions between these facts:

%s

Look for:
- Direct contradictions (opposite claims)
- Nuanced contradictions (different implications)
- Scope contradictions (claims that don't match in scope)

Return JSON array (empty if none found):
[
  {
    "claim1": "first claim",
    "source1": "source of first",
    "claim2": "contradicting claim",
    "source2": "source of second",
    "nature": "direct|nuanced|scope"
  }
]`, factsText.String())

    resp, err := a.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return nil, err
    }

    return parseContradictions(resp.Choices[0].Message.Content), nil
}

func (a *AnalysisAgent) identifyGaps(ctx context.Context, topic string, facts []Fact, expectedCoverage []string) ([]KnowledgeGap, error) {
    var factsText strings.Builder
    for _, f := range facts {
        factsText.WriteString(fmt.Sprintf("- %s\n", f.Content))
    }

    prompt := fmt.Sprintf(`Topic: %s

Expected coverage areas:
%s

Facts gathered:
%s

Identify knowledge gaps - important areas not yet covered.

Return JSON array:
[
  {
    "description": "what's missing",
    "importance": 0.8,
    "suggested_queries": ["search query 1", "search query 2"]
  }
]
Return empty array if coverage is sufficient.`, topic, strings.Join(expectedCoverage, "\n- "), factsText.String())

    resp, err := a.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return nil, err
    }

    return parseKnowledgeGaps(resp.Choices[0].Message.Content), nil
}

func (a *AnalysisAgent) assessSourceQuality(facts []Fact) map[string]float64 {
    quality := make(map[string]float64)
    sourceCounts := make(map[string]int)

    for _, f := range facts {
        sourceCounts[f.Source]++
        // Base quality on confidence and citation frequency
        current := quality[f.Source]
        quality[f.Source] = (current*float64(sourceCounts[f.Source]-1) + f.Confidence) / float64(sourceCounts[f.Source])
    }

    return quality
}

func parseValidatedFacts(content string) []ValidatedFact {
    start := strings.Index(content, "[")
    end := strings.LastIndex(content, "]") + 1
    if start < 0 || end <= start {
        return nil
    }
    var facts []ValidatedFact
    json.Unmarshal([]byte(content[start:end]), &facts)
    return facts
}

func parseContradictions(content string) []Contradiction {
    start := strings.Index(content, "[")
    end := strings.LastIndex(content, "]") + 1
    if start < 0 || end <= start {
        return nil
    }
    var contradictions []Contradiction
    json.Unmarshal([]byte(content[start:end]), &contradictions)
    return contradictions
}

func parseKnowledgeGaps(content string) []KnowledgeGap {
    start := strings.Index(content, "[")
    end := strings.LastIndex(content, "]") + 1
    if start < 0 || end <= start {
        return nil
    }
    var gaps []KnowledgeGap
    json.Unmarshal([]byte(content[start:end]), &gaps)
    return gaps
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `go build ./internal/agents/...`
- [x] Tests pass: `go test ./internal/agents/...` (15 analysis tests)
- [x] No linting errors: `go vet ./internal/agents/...`

#### Manual Verification:

- [x] Facts are cross-validated with scores
- [x] Contradictions are detected
- [x] Knowledge gaps are identified with suggested queries

---

## Phase 5: Synthesis Agent

### Overview

Create an agent that generates structured reports with proper citations.

### Changes Required

#### 1. Create Synthesis Agent

**File**: `internal/agents/synthesis.go`

```go
package agents

import (
    "context"
    "fmt"
    "strings"

    "go-research/internal/llm"
    "go-research/internal/planning"
)

type SynthesisAgent struct {
    client llm.ChatClient
}

func NewSynthesisAgent(client llm.ChatClient) *SynthesisAgent {
    return &SynthesisAgent{client: client}
}

type Report struct {
    Title       string
    Summary     string
    Outline     []Section
    FullContent string
    Citations   []Citation
}

type Section struct {
    Heading string
    Content string
    Sources []string
}

type Citation struct {
    ID     int
    URL    string
    Title  string
    Used   []string // Where this citation is used
}

func (s *SynthesisAgent) Synthesize(ctx context.Context, plan *planning.ResearchPlan, searchResults map[string]*SearchResult, analysisResult *AnalysisResult) (*Report, error) {
    // 1. Generate outline based on perspectives
    outline, err := s.generateOutline(ctx, plan, searchResults)
    if err != nil {
        return nil, fmt.Errorf("outline generation: %w", err)
    }

    // 2. Write each section
    sections, err := s.writeSections(ctx, plan.Topic, outline, searchResults, analysisResult)
    if err != nil {
        return nil, fmt.Errorf("section writing: %w", err)
    }

    // 3. Add citations
    citations := s.extractCitations(sections, searchResults)

    // 4. Compile final report
    report := s.compileReport(plan.Topic, sections, citations, analysisResult)

    return report, nil
}

func (s *SynthesisAgent) generateOutline(ctx context.Context, plan *planning.ResearchPlan, searchResults map[string]*SearchResult) ([]string, error) {
    var perspectiveInfo strings.Builder
    for _, p := range plan.Perspectives {
        perspectiveInfo.WriteString(fmt.Sprintf("- %s: %s\n", p.Name, p.Focus))
    }

    // Summarize available facts
    var factCount int
    for _, sr := range searchResults {
        factCount += len(sr.Facts)
    }

    prompt := fmt.Sprintf(`Create an outline for a comprehensive research report on: %s

Perspectives covered:
%s

Total facts gathered: %d

Generate a logical outline with 4-6 main sections.
Return JSON array of section headings:
["Introduction", "Section 2", "Section 3", ...]`, plan.Topic, perspectiveInfo.String(), factCount)

    resp, err := s.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return defaultOutline(), nil
    }

    return parseStringArray(resp.Choices[0].Message.Content), nil
}

func (s *SynthesisAgent) writeSections(ctx context.Context, topic string, outline []string, searchResults map[string]*SearchResult, analysisResult *AnalysisResult) ([]Section, error) {
    // Gather all validated facts
    var allFacts []ValidatedFact
    if analysisResult != nil {
        allFacts = analysisResult.ValidatedFacts
    }

    // Also gather raw facts if validation is empty
    if len(allFacts) == 0 {
        for _, sr := range searchResults {
            for _, f := range sr.Facts {
                allFacts = append(allFacts, ValidatedFact{Fact: f, ValidationScore: 0.5})
            }
        }
    }

    sections := make([]Section, len(outline))
    for i, heading := range outline {
        var factsText strings.Builder
        for _, f := range allFacts {
            factsText.WriteString(fmt.Sprintf("- %s [source: %s, confidence: %.1f]\n", f.Content, f.Source, f.ValidationScore))
        }

        prompt := fmt.Sprintf(`Write the "%s" section of a research report on "%s".

Available facts:
%s

Write 2-4 paragraphs. Reference sources inline using [source URL].
Focus on validated, high-confidence facts.`, heading, topic, factsText.String())

        resp, err := s.client.Chat(ctx, []llm.Message{
            {Role: "user", Content: prompt},
        })
        if err != nil {
            sections[i] = Section{Heading: heading, Content: "Content could not be generated."}
            continue
        }

        sections[i] = Section{
            Heading: heading,
            Content: resp.Choices[0].Message.Content,
        }
    }

    return sections, nil
}

func (s *SynthesisAgent) extractCitations(sections []Section, searchResults map[string]*SearchResult) []Citation {
    urlSet := make(map[string]bool)
    for _, sr := range searchResults {
        for _, source := range sr.Sources {
            urlSet[source] = true
        }
    }

    citations := make([]Citation, 0, len(urlSet))
    id := 1
    for url := range urlSet {
        citations = append(citations, Citation{
            ID:  id,
            URL: url,
        })
        id++
    }
    return citations
}

func (s *SynthesisAgent) compileReport(topic string, sections []Section, citations []Citation, analysisResult *AnalysisResult) *Report {
    var fullContent strings.Builder

    // Title
    fullContent.WriteString(fmt.Sprintf("# %s\n\n", topic))

    // Summary section
    fullContent.WriteString("## Executive Summary\n\n")
    if len(sections) > 0 {
        // Use first section intro as summary
        intro := sections[0].Content
        if len(intro) > 500 {
            intro = intro[:500] + "..."
        }
        fullContent.WriteString(intro + "\n\n")
    }

    // Main sections
    for _, section := range sections {
        fullContent.WriteString(fmt.Sprintf("## %s\n\n%s\n\n", section.Heading, section.Content))
    }

    // Contradictions/caveats if any
    if analysisResult != nil && len(analysisResult.Contradictions) > 0 {
        fullContent.WriteString("## Notes on Conflicting Information\n\n")
        for _, c := range analysisResult.Contradictions {
            fullContent.WriteString(fmt.Sprintf("- **%s**: \"%s\" vs \"%s\"\n", c.Nature, c.Claim1, c.Claim2))
        }
        fullContent.WriteString("\n")
    }

    // References
    fullContent.WriteString("## Sources\n\n")
    for _, c := range citations {
        fullContent.WriteString(fmt.Sprintf("%d. %s\n", c.ID, c.URL))
    }

    return &Report{
        Title:       topic,
        Outline:     sections,
        FullContent: fullContent.String(),
        Citations:   citations,
    }
}

func defaultOutline() []string {
    return []string{
        "Introduction",
        "Key Findings",
        "Analysis",
        "Implications",
        "Conclusion",
    }
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `go build ./internal/agents/...`
- [x] Tests pass: `go test ./internal/agents/...`

#### Manual Verification:

- [x] Outline is generated based on perspectives
- [x] Sections reference sources
- [x] Final report is well-structured with citations

---

## Phase 6: Deep Research Orchestrator Integration

### Overview

Replace the existing orchestrator with the new deep research orchestrator that coordinates all components.

### Changes Required

#### 1. Create Deep Orchestrator

**File**: `internal/orchestrator/deep.go`

```go
package orchestrator

import (
    "context"
    "fmt"
    "sync"
    "time"

    "go-research/internal/agents"
    "go-research/internal/config"
    ctxmgr "go-research/internal/context"
    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/planning"
    "go-research/internal/session"
    "go-research/internal/tools"
)

type DeepOrchestrator struct {
    bus            *events.Bus
    config         *config.Config
    client         llm.ChatClient
    contextMgr     *ctxmgr.Manager
    planner        *planning.Planner
    searchAgent    *agents.SearchAgent
    analysisAgent  *agents.AnalysisAgent
    synthesisAgent *agents.SynthesisAgent
    tools          tools.ToolExecutor
}

func NewDeepOrchestrator(bus *events.Bus, cfg *config.Config) *DeepOrchestrator {
    client := llm.NewClient(cfg)
    toolReg := tools.NewRegistry(cfg.BraveAPIKey)

    return &DeepOrchestrator{
        bus:            bus,
        config:         cfg,
        client:         client,
        contextMgr:     ctxmgr.New(client, ctxmgr.DefaultConfig()),
        planner:        planning.NewPlanner(client),
        searchAgent:    agents.NewSearchAgent(client, toolReg, bus, agents.SearchConfig{MaxIterations: 3}),
        analysisAgent:  agents.NewAnalysisAgent(client),
        synthesisAgent: agents.NewSynthesisAgent(client),
        tools:          toolReg,
    }
}

type DeepResult struct {
    Plan           *planning.ResearchPlan
    SearchResults  map[string]*agents.SearchResult
    AnalysisResult *agents.AnalysisResult
    Report         *agents.Report
    Cost           session.CostBreakdown
    Duration       time.Duration
}

func (o *DeepOrchestrator) Research(ctx context.Context, query string) (*DeepResult, error) {
    startTime := time.Now()

    // Emit start event
    o.bus.Publish(events.Event{
        Type:      events.EventResearchStarted,
        Timestamp: time.Now(),
        Data:      events.ResearchStartedData{Query: query, Mode: "deep"},
    })

    // 1. Create research plan with perspectives
    o.bus.Publish(events.Event{Type: events.EventQueryAnalyzed, Timestamp: time.Now()})

    plan, err := o.planner.CreatePlan(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("planning: %w", err)
    }

    o.bus.Publish(events.Event{
        Type:      events.EventPlanCreated,
        Timestamp: time.Now(),
        Data: events.PlanCreatedData{
            WorkerCount: len(plan.Perspectives),
            Complexity:  0.7, // Deep research is always high complexity
        },
    })

    // 2. Execute DAG
    searchResults, err := o.executeDAG(ctx, plan)
    if err != nil {
        return nil, fmt.Errorf("dag execution: %w", err)
    }

    // 3. Run analysis
    allFacts := collectFacts(searchResults)
    expectedCoverage := collectQuestions(plan.Perspectives)

    analysisResult, err := o.analysisAgent.Analyze(ctx, query, allFacts, expectedCoverage)
    if err != nil {
        // Continue without analysis if it fails
        analysisResult = &agents.AnalysisResult{}
    }

    // 4. Handle gaps with additional search if needed
    if len(analysisResult.KnowledgeGaps) > 0 {
        gapResults := o.fillGaps(ctx, analysisResult.KnowledgeGaps)
        for id, result := range gapResults {
            searchResults[id] = result
        }
    }

    // 5. Synthesize report
    o.bus.Publish(events.Event{Type: events.EventSynthesisStarted, Timestamp: time.Now()})

    report, err := o.synthesisAgent.Synthesize(ctx, plan, searchResults, analysisResult)
    if err != nil {
        return nil, fmt.Errorf("synthesis: %w", err)
    }

    o.bus.Publish(events.Event{Type: events.EventSynthesisComplete, Timestamp: time.Now()})

    return &DeepResult{
        Plan:           plan,
        SearchResults:  searchResults,
        AnalysisResult: analysisResult,
        Report:         report,
        Duration:       time.Since(startTime),
    }, nil
}

func (o *DeepOrchestrator) executeDAG(ctx context.Context, plan *planning.ResearchPlan) (map[string]*agents.SearchResult, error) {
    results := make(map[string]*agents.SearchResult)
    var mu sync.Mutex

    for !plan.DAG.AllComplete() {
        // Context folding check
        if o.contextMgr.ShouldFold() {
            directive, _ := o.contextMgr.DecideFolding(ctx)
            o.contextMgr.Fold(ctx, directive)
        }

        // Get ready tasks
        readyTasks := plan.DAG.GetReadyTasks()
        if len(readyTasks) == 0 {
            break
        }

        // Execute ready tasks in parallel
        var wg sync.WaitGroup
        for _, task := range readyTasks {
            wg.Add(1)
            go func(t *planning.DAGNode) {
                defer wg.Done()

                plan.DAG.SetStatus(t.ID, planning.StatusRunning)

                // Emit worker started event
                o.bus.Publish(events.Event{
                    Type: events.EventWorkerStarted,
                    Data: events.WorkerProgressData{
                        WorkerID:  t.ID,
                        Objective: t.Description,
                        Status:    "running",
                    },
                })

                result, err := o.executeTask(ctx, plan, t)
                if err != nil {
                    t.Error = err
                    plan.DAG.SetStatus(t.ID, planning.StatusFailed)
                    o.bus.Publish(events.Event{
                        Type: events.EventWorkerFailed,
                        Data: events.WorkerProgressData{WorkerID: t.ID, Status: "failed"},
                    })
                    return
                }

                mu.Lock()
                if result != nil {
                    results[t.ID] = result
                }
                mu.Unlock()

                plan.DAG.SetResult(t.ID, result)
                o.bus.Publish(events.Event{
                    Type: events.EventWorkerComplete,
                    Data: events.WorkerProgressData{WorkerID: t.ID, Status: "complete"},
                })
            }(task)
        }
        wg.Wait()
    }

    return results, nil
}

func (o *DeepOrchestrator) executeTask(ctx context.Context, plan *planning.ResearchPlan, task *planning.DAGNode) (*agents.SearchResult, error) {
    switch task.TaskType {
    case planning.TaskSearch:
        // Find corresponding perspective
        var perspective *planning.Perspective
        for i := range plan.Perspectives {
            if fmt.Sprintf("search_%d", i) == task.ID {
                perspective = &plan.Perspectives[i]
                break
            }
        }
        return o.searchAgent.Search(ctx, task.Description, perspective)

    case planning.TaskAnalyze:
        // Analysis tasks return nil (they update state in place)
        return nil, nil

    case planning.TaskSynthesize:
        // Synthesis is handled separately
        return nil, nil

    default:
        return nil, fmt.Errorf("unknown task type: %v", task.TaskType)
    }
}

func (o *DeepOrchestrator) fillGaps(ctx context.Context, gaps []agents.KnowledgeGap) map[string]*agents.SearchResult {
    results := make(map[string]*agents.SearchResult)

    for i, gap := range gaps {
        if gap.Importance < 0.5 {
            continue // Skip low-importance gaps
        }

        // Create a synthetic perspective for this gap
        gapPerspective := &planning.Perspective{
            Name:      fmt.Sprintf("Gap Filler %d", i+1),
            Focus:     gap.Description,
            Questions: gap.SuggestedQueries,
        }

        result, err := o.searchAgent.Search(ctx, gap.Description, gapPerspective)
        if err != nil {
            continue
        }

        results[fmt.Sprintf("gap_%d", i)] = result
    }

    return results
}

func collectFacts(searchResults map[string]*agents.SearchResult) []agents.Fact {
    var facts []agents.Fact
    for _, sr := range searchResults {
        facts = append(facts, sr.Facts...)
    }
    return facts
}

func collectQuestions(perspectives []planning.Perspective) []string {
    var questions []string
    for _, p := range perspectives {
        questions = append(questions, p.Questions...)
    }
    return questions
}
```

#### 2. Update Main Entry Point to Use Deep Orchestrator

**File**: Modify `internal/orchestrator/orchestrator.go` to add deep mode support

Add a new method that routes to the deep orchestrator:

```go
// DeepResearch executes state-of-the-art deep research
func (o *Orchestrator) DeepResearch(ctx context.Context, query string) (*DeepResult, error) {
    deep := NewDeepOrchestrator(o.bus, o.appConfig)
    return deep.Research(ctx, query)
}
```

#### 3. Update REPL to Use Deep Research

**File**: Modify `internal/repl/handlers/start.go` to use deep orchestrator for deep mode

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `go build ./...`
- [x] Tests pass: `go test ./...` (Phase 6 related packages pass; unrelated panel test has pre-existing failure)
- [x] No linting errors: `go vet ./...`

#### Manual Verification:

- [ ] Running deep research discovers perspectives
- [ ] DAG tasks execute in correct order
- [ ] Context folding occurs during long research
- [ ] Final report includes all perspectives and citations
- [ ] Gaps are identified and filled

---

## Testing Strategy

### Unit Tests

- `internal/context/manager_test.go` - Token tracking, folding decisions
- `internal/planning/dag_test.go` - DAG operations, topological order
- `internal/planning/perspectives_test.go` - Perspective parsing
- `internal/agents/search_test.go` - Query generation, fact extraction
- `internal/agents/analysis_test.go` - Cross-validation, gap detection
- `internal/agents/synthesis_test.go` - Report generation

### Integration Tests

- End-to-end deep research flow
- Multi-agent coordination
- Context folding under load

### Manual Testing Steps

1. Run: `go run cmd/research/main.go`
2. Enter: `research What is the state of autonomous vehicles in 2025?`
3. Verify:
   - Perspectives are discovered (3-5 different viewpoints)
   - Search queries are generated for each perspective
   - Facts are extracted with sources
   - Gaps are identified and follow-up searches occur
   - Final report has structured sections with citations

---

## Performance Considerations

1. **Parallel Execution**: DAG allows independent tasks to run concurrently
2. **Token Budget**: Context folding prevents runaway token usage
3. **Rate Limiting**: Tool layer should respect API rate limits
4. **Caching**: Consider caching search results during session

---

## Migration Notes

- Existing `Orchestrator.Research()` method remains unchanged for backward compatibility
- New `DeepOrchestrator` is opt-in via `DeepResearch()` method
- Session format remains compatible - `WorkerContext` structure unchanged
- Event types extended but existing events preserved

---

## References

- Architecture document: `go-research/deep_research_agent_architecture.md`
- Existing orchestrator: `internal/orchestrator/orchestrator.go`
- LLM client: `internal/llm/client.go`
- Similar implementation: `thoughts/shared/plans/go-deep-research-agent-v1.md`
