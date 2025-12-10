---
date: 2025-01-25T10:30:00+01:00
researcher: Claude
git_commit: 0e487a7ff2dd4eb9aa690ac395e828f8324014aa
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: 'Ports/Adapters Architecture for go-research Agent'
tags: [research, architecture, hexagonal, ports-adapters, go-research, refactoring]
status: complete
last_updated: 2025-01-25
last_updated_by: Claude
---

# Research: Ports/Adapters (Hexagonal) Architecture for go-research

**Date**: 2025-01-25T10:30:00+01:00
**Researcher**: Claude
**Git Commit**: 0e487a7ff2dd4eb9aa690ac395e828f8324014aa
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Research Question

How to refactor the go-research deep research agent to separate:

1. The agent core from the CLI (REPL)
2. The agent core from storage (sessions, reports, insights)
3. Enable swappable frontends (CLI first, web/API later)
4. Enable swappable storage backends (Obsidian first, PostgreSQL/S3 later)

## Summary

The go-research codebase has **moderate coupling** with clear separation points that make hexagonal architecture feasible. The event bus already provides excellent decoupling for progress communication. The main work involves:

1. **Defining ports** (interfaces) for orchestration, storage, and presentation
2. **Extracting domain models** from storage concerns
3. **Implementing adapters** for CLI (REPL) and storage (Obsidian/filesystem)
4. **Using constructor-based dependency injection** (no framework needed)

The architecture preserves the existing event-driven pattern while enabling complete swapability of external concerns.

---

## Part 1: Current State Analysis

### 1.1 Codebase Structure

```
go-research/
├── cmd/research/main.go           # Entry point, creates all dependencies
├── internal/
│   ├── agents/                    # Search, Analysis, Synthesis agents
│   ├── context/                   # AgentFold-style context management
│   ├── events/                    # Event bus and types
│   ├── llm/                       # LLM client (OpenRouter)
│   ├── orchestrator/              # Research coordination
│   ├── planning/                  # DAG, perspectives, planner
│   ├── repl/                      # CLI interface
│   │   ├── handlers/              # Command handlers
│   │   ├── visualizer.go          # Event-driven UI
│   │   └── panels.go              # Terminal rendering
│   ├── session/                   # Session model + JSON storage
│   ├── obsidian/                  # Obsidian vault writer
│   ├── tools/                     # Search/fetch tools
│   └── config/                    # Configuration
```

### 1.2 Current Coupling Points

| Component     | Coupling Level | Issues                                           |
| ------------- | -------------- | ------------------------------------------------ |
| Event Bus     | **Low**        | Clean pub/sub, already abstracted                |
| LLM Client    | **Low**        | Has `ChatClient` interface                       |
| Tool Executor | **Low**        | Has `ToolExecutor` interface                     |
| CLI/REPL      | **Medium**     | Direct orchestrator instantiation in handlers    |
| Storage       | **High**       | Session struct is both domain AND storage schema |
| Obsidian      | **Medium**     | VaultWriter interface exists but limited         |

### 1.3 Key Discoveries

**Strong Points:**

- `llm.ChatClient` interface already exists (`internal/llm/client.go:19-25`)
- `tools.ToolExecutor` interface already exists (`internal/tools/registry.go:16-19`)
- Event bus enables loose coupling for progress updates
- Options pattern used for dependency injection in orchestrators

**Weak Points:**

- `Session` struct conflates domain model and storage schema
- Handlers directly instantiate orchestrators (`handlers/start.go:57`, `145`)
- Result→Session transformation logic lives in handlers
- No storage repository interface
- WorkerContext is ReAct-specific, doesn't fit DAG-based agents

---

## Part 2: Target Hexagonal Architecture

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRIMARY ADAPTERS                                │
│                        (Driving / User-facing)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   CLI/REPL      │  │   Web API       │  │   Programmatic SDK          │  │
│  │   Adapter       │  │   Adapter       │  │   (direct Go calls)         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
└───────────┼─────────────────────┼────────────────────────┼──────────────────┘
            │                     │                        │
            └──────────────┬──────┴────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRIMARY PORTS (Inbound)                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   ResearchService interface                                           │  │
│  │   - Research(ctx, query, opts) (*ResearchResult, error)               │  │
│  │   - Expand(ctx, sessionID, followUp) (*ResearchResult, error)         │  │
│  │   - Cancel(sessionID) error                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   SessionService interface                                            │  │
│  │   - List(ctx, filters) ([]SessionSummary, error)                      │  │
│  │   - Load(ctx, id) (*Session, error)                                   │  │
│  │   - Delete(ctx, id) error                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   EventSubscriber interface                                           │  │
│  │   - Subscribe(types ...EventType) <-chan Event                        │  │
│  │   - Unsubscribe(ch <-chan Event)                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION CORE                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Domain Models                                 │  │
│  │  Session, Worker, Fact, Source, Report, Perspective, CostBreakdown    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       Application Services                            │  │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐  │  │
│  │  │  ResearchService │ │  SessionService  │ │  EventPublisher      │  │  │
│  │  │  (orchestration) │ │  (session ops)   │ │  (event emission)    │  │  │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Domain Services                               │  │
│  │  Planner, SearchAgent, AnalysisAgent, SynthesisAgent, ContextManager  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECONDARY PORTS (Outbound)                          │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐   │
│  │  LLMProvider        │ │  ToolExecutor       │ │  SessionRepository  │   │
│  │  - Chat()           │ │  - Execute()        │ │  - Save()           │   │
│  │  - StreamChat()     │ │  - ToolNames()      │ │  - Load()           │   │
│  └─────────────────────┘ └─────────────────────┘ │  - List()           │   │
│                                                  │  - Delete()         │   │
│  ┌─────────────────────┐ ┌─────────────────────┐ └─────────────────────┘   │
│  │  ReportWriter       │ │  EventPublisher     │                           │
│  │  - WriteReport()    │ │  - Publish()        │                           │
│  │  - WriteWorkers()   │ │                     │                           │
│  └─────────────────────┘ └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECONDARY ADAPTERS                                │
│                         (Driven / Infrastructure)                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │  OpenRouter  │ │  Brave       │ │  Filesystem  │ │  Obsidian        │   │
│  │  LLM Adapter │ │  Search Tool │ │  Session     │ │  Report Writer   │   │
│  └──────────────┘ └──────────────┘ │  Repository  │ └──────────────────┘   │
│                                    └──────────────┘                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │  Anthropic   │ │  HTTP Fetch  │ │  PostgreSQL  │ │  In-Memory       │   │
│  │  LLM Adapter │ │  Tool        │ │  Session     │ │  Event Bus       │   │
│  └──────────────┘ └──────────────┘ │  Repository  │ └──────────────────┘   │
│                                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependency Flow

```
Outer layers depend on inner layers, never the reverse:

CLI/REPL Adapter
    └─depends on→ ResearchService interface (port)
                      └─depends on→ Domain models
                      └─depends on→ LLMProvider interface (port)
                      └─depends on→ SessionRepository interface (port)

OpenRouter Adapter
    └─implements→ LLMProvider interface (port)

Filesystem Adapter
    └─implements→ SessionRepository interface (port)
```

---

## Part 3: Port Definitions

### 3.1 Primary Ports (Inbound - How the world drives the core)

```go
// internal/core/ports/research.go
package ports

import (
    "context"
    "go-research/internal/core/domain"
)

// ResearchService is the primary port for research operations.
// CLI, Web API, and SDK all use this interface.
type ResearchService interface {
    // Research executes a research query and returns results.
    Research(ctx context.Context, query string, opts ResearchOptions) (*domain.ResearchResult, error)

    // Expand continues research on an existing session.
    Expand(ctx context.Context, sessionID string, followUp string) (*domain.ResearchResult, error)

    // Cancel aborts an in-progress research operation.
    Cancel(sessionID string) error
}

type ResearchOptions struct {
    Mode        domain.ResearchMode // Fast or Deep
    MaxWorkers  int
    Timeout     time.Duration
    Perspectives []string // Optional: pre-defined perspectives
}

// SessionService manages session lifecycle.
type SessionService interface {
    List(ctx context.Context, filters SessionFilters) ([]domain.SessionSummary, error)
    Load(ctx context.Context, id string) (*domain.Session, error)
    LoadLatest(ctx context.Context) (*domain.Session, error)
    Delete(ctx context.Context, id string) error
}

type SessionFilters struct {
    Status    []domain.SessionStatus
    Mode      []domain.ResearchMode
    Limit     int
    Offset    int
}
```

### 3.2 Secondary Ports (Outbound - How the core drives infrastructure)

```go
// internal/core/ports/llm.go
package ports

import "context"

// LLMProvider abstracts LLM interactions.
// Implementations: OpenRouter, Anthropic, OpenAI, local models
type LLMProvider interface {
    Chat(ctx context.Context, messages []Message) (*ChatResponse, error)
    StreamChat(ctx context.Context, messages []Message, handler func(chunk string) error) error
    Model() string
    SetModel(model string)
}

type Message struct {
    Role    string
    Content string
}

type ChatResponse struct {
    Content     string
    TokensUsed  TokenUsage
    FinishReason string
}

type TokenUsage struct {
    Prompt     int
    Completion int
    Total      int
}
```

```go
// internal/core/ports/storage.go
package ports

import (
    "context"
    "go-research/internal/core/domain"
)

// SessionRepository abstracts session persistence.
// Implementations: Filesystem (JSON), PostgreSQL, MongoDB, S3
type SessionRepository interface {
    Save(ctx context.Context, session *domain.Session) error
    Load(ctx context.Context, id string) (*domain.Session, error)
    LoadLatest(ctx context.Context) (*domain.Session, error)
    List(ctx context.Context, filters SessionFilters) ([]domain.SessionSummary, error)
    Delete(ctx context.Context, id string) error
}

// ReportWriter writes formatted reports to external systems.
// Implementations: Obsidian, Notion, local markdown files
type ReportWriter interface {
    WriteSession(ctx context.Context, session *domain.Session) error
    WriteReport(ctx context.Context, sessionID string, report *domain.Report) error
    WriteWorkers(ctx context.Context, sessionID string, workers []domain.Worker) error
}
```

```go
// internal/core/ports/tools.go
package ports

import "context"

// ToolExecutor abstracts tool execution.
// Implementations: Brave Search, HTTP Fetch, custom tools
type ToolExecutor interface {
    Execute(ctx context.Context, name string, args map[string]interface{}) (string, error)
    ToolNames() []string
    ToolSchemas() map[string]ToolSchema
}

type ToolSchema struct {
    Name        string
    Description string
    Parameters  map[string]ParameterSchema
}

type ParameterSchema struct {
    Type        string
    Description string
    Required    bool
}
```

```go
// internal/core/ports/events.go
package ports

import "go-research/internal/core/domain"

// EventPublisher emits events for external observers.
type EventPublisher interface {
    Publish(event domain.Event)
}

// EventSubscriber receives events (for primary adapters).
type EventSubscriber interface {
    Subscribe(types ...domain.EventType) <-chan domain.Event
    Unsubscribe(ch <-chan domain.Event)
    Close()
}
```

---

## Part 4: Domain Models

### 4.1 Core Domain (No infrastructure dependencies)

```go
// internal/core/domain/session.go
package domain

import "time"

type SessionID string
type WorkerID string

type Session struct {
    ID              SessionID
    ParentID        *SessionID // For expand operations
    Query           string
    Mode            ResearchMode
    Status          SessionStatus
    ComplexityScore float64
    Workers         []Worker
    Report          *Report
    Sources         []Source
    Cost            CostBreakdown
    CreatedAt       time.Time
    CompletedAt     *time.Time
}

type SessionSummary struct {
    ID          SessionID
    Query       string
    Mode        ResearchMode
    Status      SessionStatus
    WorkerCount int
    Cost        CostBreakdown
    CreatedAt   time.Time
}

type ResearchMode string

const (
    ModeFast ResearchMode = "fast"
    ModeDeep ResearchMode = "deep"
)

type SessionStatus string

const (
    StatusPending    SessionStatus = "pending"
    StatusRunning    SessionStatus = "running"
    StatusComplete   SessionStatus = "complete"
    StatusFailed     SessionStatus = "failed"
    StatusCancelled  SessionStatus = "cancelled"
)
```

```go
// internal/core/domain/worker.go
package domain

import "time"

// Worker represents any research worker (ReAct, DAG node, etc.)
type Worker struct {
    ID          WorkerID
    WorkerNum   int
    Objective   string
    Type        WorkerType
    Status      WorkerStatus
    Output      string
    Sources     []Source
    Cost        CostBreakdown
    StartedAt   time.Time
    CompletedAt *time.Time
    Error       *string

    // Type-specific data (polymorphic)
    ReActData   *ReActWorkerData   // For fast mode
    DAGData     *DAGWorkerData     // For deep mode
}

type WorkerType string

const (
    WorkerTypeReAct WorkerType = "react"
    WorkerTypeDAG   WorkerType = "dag"
)

type WorkerStatus string

const (
    WorkerStatusPending  WorkerStatus = "pending"
    WorkerStatusRunning  WorkerStatus = "running"
    WorkerStatusComplete WorkerStatus = "complete"
    WorkerStatusFailed   WorkerStatus = "failed"
)

// ReActWorkerData holds ReAct-specific execution trace
type ReActWorkerData struct {
    Iterations []ReActIteration
    ToolCalls  []ToolCall
}

// DAGWorkerData holds DAG-node specific data
type DAGWorkerData struct {
    NodeID       string
    TaskType     string // search, analyze, synthesize
    Perspective  *Perspective
    Facts        []Fact
    Dependencies []string
}
```

```go
// internal/core/domain/research.go
package domain

// ResearchResult is the output of a research operation
type ResearchResult struct {
    Session     *Session
    Report      *Report
    Perspectives []Perspective // For deep mode
}

type Report struct {
    Title       string
    Summary     string
    Sections    []Section
    FullContent string
    Citations   []Citation
}

type Section struct {
    Heading string
    Content string
    Sources []Source
}

type Citation struct {
    ID    int
    URL   string
    Title string
}

type Source struct {
    URL         string
    Title       string
    Snippet     string
    Confidence  float64
    RetrievedAt time.Time
}

type Perspective struct {
    Name      string
    Focus     string
    Questions []string
}

type Fact struct {
    Content    string
    Source     Source
    Confidence float64
    ValidatedBy []Source // Cross-validation sources
}
```

```go
// internal/core/domain/cost.go
package domain

type CostBreakdown struct {
    InputTokens    int
    OutputTokens   int
    TotalTokens    int
    InputCostUSD   float64
    OutputCostUSD  float64
    TotalCostUSD   float64
}

func (c *CostBreakdown) Add(other CostBreakdown) {
    c.InputTokens += other.InputTokens
    c.OutputTokens += other.OutputTokens
    c.TotalTokens += other.TotalTokens
    c.InputCostUSD += other.InputCostUSD
    c.OutputCostUSD += other.OutputCostUSD
    c.TotalCostUSD += other.TotalCostUSD
}
```

```go
// internal/core/domain/events.go
package domain

import "time"

type EventType string

const (
    // Research lifecycle
    EventResearchStarted  EventType = "research.started"
    EventResearchComplete EventType = "research.complete"
    EventResearchFailed   EventType = "research.failed"

    // Planning
    EventPlanCreated EventType = "plan.created"

    // Worker progress
    EventWorkerStarted  EventType = "worker.started"
    EventWorkerProgress EventType = "worker.progress"
    EventWorkerComplete EventType = "worker.complete"
    EventWorkerFailed   EventType = "worker.failed"

    // Agent activity
    EventToolCall   EventType = "agent.tool_call"
    EventToolResult EventType = "agent.tool_result"
    EventLLMChunk   EventType = "agent.llm_chunk"

    // Cost tracking
    EventCostUpdated EventType = "cost.updated"
)

type Event struct {
    Type      EventType
    Timestamp time.Time
    SessionID SessionID
    Data      interface{} // Type-specific payload
}

// Event data types
type ResearchStartedData struct {
    Query string
    Mode  ResearchMode
}

type PlanCreatedData struct {
    WorkerCount   int
    Complexity    float64
    Perspectives  []string
}

type WorkerProgressData struct {
    WorkerID  WorkerID
    WorkerNum int
    Objective string
    Status    WorkerStatus
    Message   string
}

type ToolCallData struct {
    WorkerID  WorkerID
    WorkerNum int
    Tool      string
    Args      map[string]interface{}
}

type LLMChunkData struct {
    WorkerID  WorkerID
    WorkerNum int
    Chunk     string
    Done      bool
}

type CostUpdateData struct {
    Scope string // "worker", "session", "total"
    Cost  CostBreakdown
}
```

---

## Part 5: Package Structure

### 5.1 Target Directory Layout

```
go-research/
├── cmd/
│   └── research/
│       └── main.go                    # Wiring, dependency injection
│
├── internal/
│   ├── core/                          # THE HEXAGON
│   │   ├── domain/                    # Pure domain models
│   │   │   ├── session.go
│   │   │   ├── worker.go
│   │   │   ├── research.go
│   │   │   ├── cost.go
│   │   │   └── events.go
│   │   │
│   │   ├── ports/                     # Interface definitions
│   │   │   ├── research.go            # ResearchService, SessionService
│   │   │   ├── storage.go             # SessionRepository, ReportWriter
│   │   │   ├── llm.go                 # LLMProvider
│   │   │   ├── tools.go               # ToolExecutor
│   │   │   └── events.go              # EventPublisher, EventSubscriber
│   │   │
│   │   └── service/                   # Application services (implement ports)
│   │       ├── research.go            # Implements ResearchService
│   │       ├── session.go             # Implements SessionService
│   │       └── events.go              # Event bus implementation
│   │
│   ├── agents/                        # Domain services (research logic)
│   │   ├── search.go                  # SearchAgent
│   │   ├── analysis.go                # AnalysisAgent
│   │   └── synthesis.go               # SynthesisAgent
│   │
│   ├── planning/                      # Planning domain
│   │   ├── dag.go
│   │   ├── perspectives.go
│   │   └── planner.go
│   │
│   ├── context/                       # Context management domain
│   │   ├── manager.go
│   │   ├── folding.go
│   │   └── builder.go
│   │
│   └── adapters/                      # INFRASTRUCTURE
│       │
│       ├── primary/                   # Driving adapters (user-facing)
│       │   ├── cli/                   # CLI/REPL adapter
│       │   │   ├── repl.go
│       │   │   ├── router.go
│       │   │   ├── handlers/
│       │   │   │   ├── research.go    # fast, deep commands
│       │   │   │   ├── session.go     # sessions, load, new
│       │   │   │   └── settings.go    # verbose, model, help
│       │   │   ├── visualizer.go
│       │   │   ├── panels.go
│       │   │   └── renderer.go
│       │   │
│       │   └── api/                   # Future: HTTP API adapter
│       │       ├── server.go
│       │       └── handlers/
│       │
│       └── secondary/                 # Driven adapters (infrastructure)
│           ├── llm/
│           │   ├── openrouter.go      # Implements LLMProvider
│           │   └── anthropic.go       # Future: direct Anthropic
│           │
│           ├── tools/
│           │   ├── registry.go        # Implements ToolExecutor
│           │   ├── brave_search.go
│           │   └── http_fetch.go
│           │
│           ├── storage/
│           │   ├── filesystem/        # Implements SessionRepository
│           │   │   └── repository.go
│           │   └── postgres/          # Future: PostgreSQL
│           │       └── repository.go
│           │
│           ├── writers/
│           │   ├── obsidian/          # Implements ReportWriter
│           │   │   ├── writer.go
│           │   │   └── loader.go
│           │   └── notion/            # Future: Notion
│           │       └── writer.go
│           │
│           └── events/
│               └── bus.go             # Implements EventPublisher/Subscriber
│
├── config/
│   └── config.go                      # Configuration loading
│
└── go.mod
```

### 5.2 Key Principles

1. **Core has NO imports from adapters** - Only standard library and domain packages
2. **Adapters import core** - They implement port interfaces
3. **cmd/ wires everything** - Dependency injection happens in main.go
4. **agents/, planning/, context/ are domain services** - They use ports, not concrete adapters

---

## Part 6: Implementation Details

### 6.1 Application Service Implementation

```go
// internal/core/service/research.go
package service

import (
    "context"
    "time"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
    "go-research/internal/agents"
    "go-research/internal/planning"
)

type ResearchServiceImpl struct {
    llm            ports.LLMProvider
    tools          ports.ToolExecutor
    sessions       ports.SessionRepository
    reports        ports.ReportWriter
    events         ports.EventPublisher

    // Domain services
    planner        *planning.Planner
    searchAgent    *agents.SearchAgent
    analysisAgent  *agents.AnalysisAgent
    synthesisAgent *agents.SynthesisAgent
}

func NewResearchService(
    llm ports.LLMProvider,
    tools ports.ToolExecutor,
    sessions ports.SessionRepository,
    reports ports.ReportWriter,
    events ports.EventPublisher,
) *ResearchServiceImpl {
    return &ResearchServiceImpl{
        llm:            llm,
        tools:          tools,
        sessions:       sessions,
        reports:        reports,
        events:         events,
        planner:        planning.NewPlanner(llm),
        searchAgent:    agents.NewSearchAgent(llm, tools, events),
        analysisAgent:  agents.NewAnalysisAgent(llm),
        synthesisAgent: agents.NewSynthesisAgent(llm, events),
    }
}

func (s *ResearchServiceImpl) Research(ctx context.Context, query string, opts ports.ResearchOptions) (*domain.ResearchResult, error) {
    // Create session
    session := domain.NewSession(query, opts.Mode)

    // Emit start event
    s.events.Publish(domain.Event{
        Type:      domain.EventResearchStarted,
        Timestamp: time.Now(),
        SessionID: session.ID,
        Data:      domain.ResearchStartedData{Query: query, Mode: opts.Mode},
    })

    var result *domain.ResearchResult
    var err error

    switch opts.Mode {
    case domain.ModeFast:
        result, err = s.researchFast(ctx, session)
    case domain.ModeDeep:
        result, err = s.researchDeep(ctx, session, opts)
    }

    if err != nil {
        session.Status = domain.StatusFailed
        s.sessions.Save(ctx, session)
        return nil, err
    }

    // Save session
    session.Status = domain.StatusComplete
    now := time.Now()
    session.CompletedAt = &now

    if err := s.sessions.Save(ctx, session); err != nil {
        return nil, err
    }

    // Write to report writer (non-blocking)
    go func() {
        _ = s.reports.WriteSession(context.Background(), session)
    }()

    return result, nil
}

func (s *ResearchServiceImpl) researchDeep(ctx context.Context, session *domain.Session, opts ports.ResearchOptions) (*domain.ResearchResult, error) {
    // 1. Create plan with perspectives
    plan, err := s.planner.CreatePlan(ctx, session.Query)
    if err != nil {
        return nil, err
    }

    s.events.Publish(domain.Event{
        Type:      domain.EventPlanCreated,
        Timestamp: time.Now(),
        SessionID: session.ID,
        Data: domain.PlanCreatedData{
            WorkerCount:  len(plan.Perspectives),
            Complexity:   session.ComplexityScore,
            Perspectives: perspectiveNames(plan.Perspectives),
        },
    })

    // 2. Execute DAG
    searchResults, err := s.executeDAG(ctx, session, plan)
    if err != nil {
        return nil, err
    }

    // 3. Analysis
    facts := collectFacts(searchResults)
    analysisResult, err := s.analysisAgent.Analyze(ctx, session.Query, facts, nil)
    if err != nil {
        // Continue without analysis
        analysisResult = &agents.AnalysisResult{}
    }

    // 4. Fill gaps
    if len(analysisResult.KnowledgeGaps) > 0 {
        gapResults := s.fillGaps(ctx, session, analysisResult.KnowledgeGaps)
        for id, result := range gapResults {
            searchResults[id] = result
        }
    }

    // 5. Synthesize
    report, err := s.synthesisAgent.Synthesize(ctx, plan, searchResults, analysisResult)
    if err != nil {
        return nil, err
    }

    // Update session
    session.Workers = buildWorkersFromResults(searchResults)
    session.Report = report
    session.Sources = collectSources(searchResults)

    return &domain.ResearchResult{
        Session:      session,
        Report:       report,
        Perspectives: plan.Perspectives,
    }, nil
}
```

### 6.2 CLI Adapter Implementation

```go
// internal/adapters/primary/cli/handlers/research.go
package handlers

import (
    "context"
    "fmt"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
)

type ResearchHandler struct {
    research ports.ResearchService
    sessions ports.SessionService
    events   ports.EventSubscriber
}

func NewResearchHandler(
    research ports.ResearchService,
    sessions ports.SessionService,
    events ports.EventSubscriber,
) *ResearchHandler {
    return &ResearchHandler{
        research: research,
        sessions: sessions,
        events:   events,
    }
}

func (h *ResearchHandler) HandleFast(ctx *Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /fast <query>")
    }

    query := strings.Join(args, " ")

    // Start visualization
    vis := NewVisualizer(ctx.Renderer, h.events)
    vis.Start()
    defer vis.Stop()

    // Execute research via port
    result, err := h.research.Research(ctx.RunContext, query, ports.ResearchOptions{
        Mode:    domain.ModeFast,
        Timeout: ctx.Config.WorkerTimeout,
    })
    if err != nil {
        return err
    }

    // Update context session
    ctx.Session = result.Session

    // Render result
    ctx.Renderer.RenderReport(result.Report)

    return nil
}

func (h *ResearchHandler) HandleDeep(ctx *Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /deep <query>")
    }

    query := strings.Join(args, " ")

    // Start visualization
    vis := NewVisualizer(ctx.Renderer, h.events)
    vis.Start()
    defer vis.Stop()

    // Execute research via port
    result, err := h.research.Research(ctx.RunContext, query, ports.ResearchOptions{
        Mode:       domain.ModeDeep,
        Timeout:    ctx.Config.WorkerTimeout,
        MaxWorkers: ctx.Config.MaxWorkers,
    })
    if err != nil {
        return err
    }

    // Update context session
    ctx.Session = result.Session

    // Render result
    ctx.Renderer.RenderReport(result.Report)
    ctx.Renderer.RenderPerspectives(result.Perspectives)

    return nil
}
```

### 6.3 Storage Adapter Implementation

```go
// internal/adapters/secondary/storage/filesystem/repository.go
package filesystem

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sort"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
)

type SessionRepository struct {
    stateDir string
}

func NewSessionRepository(stateDir string) *SessionRepository {
    os.MkdirAll(stateDir, 0755)
    return &SessionRepository{stateDir: stateDir}
}

// Verify interface compliance
var _ ports.SessionRepository = (*SessionRepository)(nil)

func (r *SessionRepository) Save(ctx context.Context, session *domain.Session) error {
    // Convert domain to storage model
    entity := toEntity(session)

    data, err := json.MarshalIndent(entity, "", "  ")
    if err != nil {
        return fmt.Errorf("marshal session: %w", err)
    }

    path := filepath.Join(r.stateDir, string(session.ID)+".json")
    if err := os.WriteFile(path, data, 0644); err != nil {
        return fmt.Errorf("write session: %w", err)
    }

    // Update .last pointer
    lastPath := filepath.Join(r.stateDir, ".last")
    _ = os.WriteFile(lastPath, []byte(session.ID), 0644)

    return nil
}

func (r *SessionRepository) Load(ctx context.Context, id string) (*domain.Session, error) {
    path := filepath.Join(r.stateDir, id+".json")

    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read session: %w", err)
    }

    var entity SessionEntity
    if err := json.Unmarshal(data, &entity); err != nil {
        return nil, fmt.Errorf("unmarshal session: %w", err)
    }

    return toDomain(&entity), nil
}

func (r *SessionRepository) LoadLatest(ctx context.Context) (*domain.Session, error) {
    lastPath := filepath.Join(r.stateDir, ".last")

    data, err := os.ReadFile(lastPath)
    if err != nil {
        return nil, nil // No last session
    }

    return r.Load(ctx, string(data))
}

func (r *SessionRepository) List(ctx context.Context, filters ports.SessionFilters) ([]domain.SessionSummary, error) {
    entries, err := os.ReadDir(r.stateDir)
    if err != nil {
        return nil, err
    }

    var summaries []domain.SessionSummary
    for _, entry := range entries {
        if filepath.Ext(entry.Name()) != ".json" {
            continue
        }

        session, err := r.Load(ctx, entry.Name()[:len(entry.Name())-5])
        if err != nil {
            continue
        }

        // Apply filters
        if !matchesFilters(session, filters) {
            continue
        }

        summaries = append(summaries, domain.SessionSummary{
            ID:          session.ID,
            Query:       session.Query,
            Mode:        session.Mode,
            Status:      session.Status,
            WorkerCount: len(session.Workers),
            Cost:        session.Cost,
            CreatedAt:   session.CreatedAt,
        })
    }

    // Sort by created descending
    sort.Slice(summaries, func(i, j int) bool {
        return summaries[i].CreatedAt.After(summaries[j].CreatedAt)
    })

    // Apply limit/offset
    if filters.Offset > 0 && filters.Offset < len(summaries) {
        summaries = summaries[filters.Offset:]
    }
    if filters.Limit > 0 && filters.Limit < len(summaries) {
        summaries = summaries[:filters.Limit]
    }

    return summaries, nil
}

func (r *SessionRepository) Delete(ctx context.Context, id string) error {
    path := filepath.Join(r.stateDir, id+".json")
    return os.Remove(path)
}

// Storage entity (separate from domain)
type SessionEntity struct {
    ID              string                `json:"id"`
    ParentID        *string               `json:"parent_id,omitempty"`
    Query           string                `json:"query"`
    Mode            string                `json:"mode"`
    Status          string                `json:"status"`
    ComplexityScore float64               `json:"complexity_score"`
    Workers         []WorkerEntity        `json:"workers"`
    Report          *ReportEntity         `json:"report,omitempty"`
    Sources         []SourceEntity        `json:"sources"`
    Cost            CostEntity            `json:"cost"`
    CreatedAt       string                `json:"created_at"`
    CompletedAt     *string               `json:"completed_at,omitempty"`
}

// Mapping functions
func toEntity(s *domain.Session) *SessionEntity { /* ... */ }
func toDomain(e *SessionEntity) *domain.Session { /* ... */ }
```

### 6.4 Dependency Injection in main.go

```go
// cmd/research/main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"

    "go-research/config"
    "go-research/internal/core/service"
    "go-research/internal/adapters/primary/cli"
    "go-research/internal/adapters/secondary/llm"
    "go-research/internal/adapters/secondary/tools"
    "go-research/internal/adapters/secondary/storage/filesystem"
    "go-research/internal/adapters/secondary/writers/obsidian"
    "go-research/internal/adapters/secondary/events"
)

func main() {
    // Load configuration
    cfg := config.Load()

    // Create secondary adapters (infrastructure)
    llmProvider := llm.NewOpenRouterAdapter(cfg.OpenRouterAPIKey, cfg.Model)
    toolExecutor := tools.NewRegistry(cfg.BraveAPIKey)
    sessionRepo := filesystem.NewSessionRepository(cfg.StateDir)
    reportWriter := obsidian.NewWriter(cfg.VaultPath)
    eventBus := events.NewBus(100)
    defer eventBus.Close()

    // Create application services (core)
    researchService := service.NewResearchService(
        llmProvider,
        toolExecutor,
        sessionRepo,
        reportWriter,
        eventBus,
    )
    sessionService := service.NewSessionService(sessionRepo)

    // Create primary adapter (CLI)
    repl := cli.NewREPL(
        researchService,
        sessionService,
        eventBus,
        cfg,
    )

    // Run with graceful shutdown
    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
    defer cancel()

    if err := repl.Run(ctx); err != nil {
        log.Fatal(err)
    }
}
```

---

## Part 7: Migration Strategy

### Phase 1: Extract Interfaces (Non-Breaking)

**Goal**: Define ports without changing behavior

1. Create `internal/core/ports/` package with interface definitions
2. Verify existing types satisfy interfaces (add compile-time checks)
3. No functional changes - existing code continues to work

**Files to Create**:

- `internal/core/ports/research.go`
- `internal/core/ports/storage.go`
- `internal/core/ports/llm.go`
- `internal/core/ports/tools.go`
- `internal/core/ports/events.go`

**Verification**:

```go
// Compile-time interface compliance
var _ ports.LLMProvider = (*llm.Client)(nil)
var _ ports.ToolExecutor = (*tools.Registry)(nil)
```

### Phase 2: Extract Domain Models

**Goal**: Separate domain from storage concerns

1. Create `internal/core/domain/` with clean domain types
2. Create mapping functions between domain and storage entities
3. Update storage adapters to use entity types internally

**Key Changes**:

- `Session` (domain) has no `json` tags
- `SessionEntity` (storage) has `json` tags
- Mapping functions `toEntity()` / `toDomain()` in storage adapters

### Phase 3: Implement Application Services

**Goal**: Create service layer that uses ports

1. Create `internal/core/service/research.go` implementing `ResearchService`
2. Create `internal/core/service/session.go` implementing `SessionService`
3. Move orchestration logic from handlers to services

**Key Changes**:

- Handlers become thin adapters calling services
- Services own all business logic
- Services depend only on ports

### Phase 4: Reorganize Adapters

**Goal**: Move adapters to proper locations

1. Move `internal/repl/` → `internal/adapters/primary/cli/`
2. Move `internal/llm/` → `internal/adapters/secondary/llm/`
3. Move `internal/tools/` → `internal/adapters/secondary/tools/`
4. Move `internal/session/` → `internal/adapters/secondary/storage/filesystem/`
5. Move `internal/obsidian/` → `internal/adapters/secondary/writers/obsidian/`

### Phase 5: Update Wiring

**Goal**: Wire dependencies in main.go

1. Update `cmd/research/main.go` to create adapters and inject into services
2. Remove direct dependencies in handlers
3. Handlers receive services via constructor

---

## Part 8: Benefits of This Architecture

### 8.1 Swappable Frontends

```go
// CLI adapter
repl := cli.NewREPL(researchService, sessionService, eventBus, cfg)

// Future: HTTP API adapter
server := api.NewServer(researchService, sessionService, eventBus, cfg)

// Future: SDK (direct usage)
result, _ := researchService.Research(ctx, "query", opts)
```

### 8.2 Swappable Storage

```go
// Filesystem (current)
sessionRepo := filesystem.NewSessionRepository(cfg.StateDir)

// Future: PostgreSQL
sessionRepo := postgres.NewSessionRepository(db)

// Future: S3
sessionRepo := s3.NewSessionRepository(bucket, prefix)
```

### 8.3 Swappable LLM Providers

```go
// OpenRouter (current)
llmProvider := llm.NewOpenRouterAdapter(apiKey, model)

// Future: Direct Anthropic
llmProvider := llm.NewAnthropicAdapter(apiKey, model)

// Future: Local model
llmProvider := llm.NewOllamaAdapter(endpoint, model)
```

### 8.4 Testability

```go
// Unit test with mocks
func TestResearchService(t *testing.T) {
    mockLLM := &MockLLMProvider{}
    mockTools := &MockToolExecutor{}
    mockSessions := &MockSessionRepository{}
    mockReports := &MockReportWriter{}
    mockEvents := &MockEventPublisher{}

    svc := service.NewResearchService(
        mockLLM, mockTools, mockSessions, mockReports, mockEvents,
    )

    result, err := svc.Research(ctx, "test query", opts)
    // Assert...
}
```

---

## Code References

### Current Implementation (to be refactored)

- `internal/orchestrator/deep.go:56-78` - DeepOrchestrator creation
- `internal/orchestrator/deep.go:92-258` - Research method
- `internal/repl/handlers/start.go:57` - Direct orchestrator instantiation
- `internal/repl/handlers/start.go:145` - Deep orchestrator instantiation
- `internal/repl/handlers/start.go:240-286` - Result transformation
- `internal/session/session.go:42-57` - Session struct (domain + storage)
- `internal/session/store.go:38-67` - Save method
- `internal/llm/client.go:19-25` - ChatClient interface
- `internal/tools/registry.go:16-19` - ToolExecutor interface
- `internal/events/bus.go:9-13` - Event bus implementation

### Existing Interfaces (to preserve)

- `internal/llm/client.go:19-25` - `ChatClient` interface
- `internal/tools/registry.go:16-19` - `ToolExecutor` interface
- `internal/session/store.go:14-16` - `VaultWriter` interface

---

## Open Questions

1. **Event bus as port or adapter?** - Currently in-process; if we need distributed events, should become a port
2. **Context manager location** - Domain service or part of agents?
3. **Migration vs rewrite?** - Incremental migration preferred for safety
4. **Backward compatibility** - Should old session JSON files still load?

---

## Related Research

- `thoughts/shared/plans/go-deep-research-agent-sota.md` - Implementation plan for current architecture
- `go-research/deep_research_agent_architecture.md` - SOTA agent architecture details

---

## Sources

- [Three Dots Labs - Clean Architecture in Go](https://threedots.tech/post/introducing-clean-architecture/)
- [DEV Community - Hexagonal Architecture/Ports and Adapters](https://dev.to/buarki/hexagonal-architectureports-and-adapters-clarifying-key-concepts-using-go-14oo)
- [Building RESTful API with Hexagonal Architecture](https://dev.to/bagashiz/building-restful-api-with-hexagonal-architecture-in-go-1mij)
- [Practical DDD in Golang](https://www.ompluscator.com/article/golang/practical-ddd-module/)
- [Go Dependency Injection Approaches](https://leapcell.io/blog/go-dependency-injection-approaches-wire-vs-fx-and-manual-best-practices)
