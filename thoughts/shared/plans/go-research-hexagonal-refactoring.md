# Ports/Adapters (Hexagonal) Architecture Refactoring Plan

## Overview

Refactor the go-research deep research agent to implement Ports/Adapters (Hexagonal) Architecture, separating:

1. The agent core from the CLI (REPL)
2. The agent core from storage (sessions, reports)
3. Enable swappable frontends (CLI first, web/API later)
4. Enable swappable storage backends (filesystem first, PostgreSQL/S3 later)

## Current State Analysis

### What Exists

| Component     | Location                     | Coupling Level | Issues                                           |
| ------------- | ---------------------------- | -------------- | ------------------------------------------------ |
| Event Bus     | `internal/events/`           | **Low**        | Clean pub/sub, already abstracted                |
| LLM Client    | `internal/llm/client.go`     | **Low**        | Has `ChatClient` interface                       |
| Tool Executor | `internal/tools/registry.go` | **Low**        | Has `ToolExecutor` interface                     |
| CLI/REPL      | `internal/repl/`             | **Medium**     | Direct orchestrator instantiation in handlers    |
| Storage       | `internal/session/store.go`  | **High**       | Session struct is both domain AND storage schema |
| Obsidian      | `internal/obsidian/`         | **Medium**     | VaultWriter interface exists but limited         |

### Key Discoveries

**Strong Points:**

- `llm.ChatClient` interface already exists (`internal/llm/client.go:19-25`)
- `tools.ToolExecutor` interface already exists (`internal/tools/registry.go:16-19`)
- Event bus enables loose coupling for progress updates
- Options pattern used for dependency injection in orchestrators

**Weak Points:**

- `Session` struct conflates domain model and storage schema
- Handlers directly instantiate orchestrators (`handlers/start.go:145`)
- Result→Session transformation logic lives in handlers
- No storage repository interface

## Desired End State

After refactoring:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRIMARY ADAPTERS                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   CLI/REPL      │  │   Web API       │  │   Programmatic SDK          │  │
│  │   Adapter       │  │   (future)      │  │   (direct Go calls)         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
└───────────┼─────────────────────┼────────────────────────┼──────────────────┘
            └──────────────┬──────┴────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRIMARY PORTS (Inbound)                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   ResearchService interface                                           │  │
│  │   - Research(ctx, query, opts) (*ResearchResult, error)               │  │
│  │   - Cancel(sessionID) error                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   SessionService interface                                            │  │
│  │   - List(ctx, filters) ([]SessionSummary, error)                      │  │
│  │   - Load(ctx, id) (*Session, error)                                   │  │
│  │   - Delete(ctx, id) error                                             │  │
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
│  │  ResearchServiceImpl, SessionServiceImpl                              │  │
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
│                                                  └─────────────────────┘   │
│  ┌─────────────────────┐ ┌─────────────────────┐                           │
│  │  ReportWriter       │ │  EventPublisher     │                           │
│  │  - WriteSession()   │ │  - Publish()        │                           │
│  └─────────────────────┘ └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECONDARY ADAPTERS                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │  OpenRouter  │ │  Brave       │ │  Filesystem  │ │  Obsidian        │   │
│  │  LLM Adapter │ │  Search Tool │ │  Session     │ │  Report Writer   │   │
│  └──────────────┘ └──────────────┘ │  Repository  │ └──────────────────┘   │
│                                    └──────────────┘                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  In-Memory Event Bus (infrastructure, not a port)                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Event Bus**: In-process adapter (not a port) - keeps implementation simple
2. **Backward Compatibility**: Clean break - no migration code for existing sessions
3. **Context Manager**: Domain service - part of core research logic, not infrastructure
4. **Future Adapters**: Focus only on current adapters (filesystem, Obsidian, OpenRouter)

### Verification

After implementation:

- `go build ./...` compiles without errors
- `go test ./...` all tests pass
- Existing functionality preserved:
  - `/fast` and `/deep` commands work
  - Sessions save and load correctly
  - Obsidian vault integration works
  - Live visualization displays progress

## What We're NOT Doing

- **Multiple LLM providers** - Keep OpenRouter only for now
- **PostgreSQL/S3 storage** - Plan for it, don't implement yet
- **HTTP API adapter** - Plan for it, don't implement yet
- **Migration code** - Clean break, old sessions won't load
- **Distributed event bus** - Keep in-process channel implementation

---

## Implementation Approach

We'll implement in **5 phases**, each producing working, testable code. Each phase is independently deployable.

---

## Phase 1: Define Port Interfaces

### Overview

Create port interfaces without changing behavior. This is a non-breaking change that establishes the contract for all adapters.

### Changes Required

#### 1. Create Ports Package

**File**: `internal/core/ports/research.go`

```go
package ports

import (
    "context"
    "time"

    "go-research/internal/core/domain"
)

// ResearchService is the primary port for research operations.
// CLI, Web API, and SDK all use this interface.
type ResearchService interface {
    // Research executes a research query and returns results.
    Research(ctx context.Context, query string, opts ResearchOptions) (*domain.ResearchResult, error)

    // Cancel aborts an in-progress research operation.
    Cancel(sessionID string) error
}

type ResearchOptions struct {
    Mode        domain.ResearchMode // Fast or Deep
    MaxWorkers  int
    Timeout     time.Duration
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

**File**: `internal/core/ports/llm.go`

```go
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
    Content      string
    TokensUsed   TokenUsage
    FinishReason string
}

type TokenUsage struct {
    Prompt     int
    Completion int
    Total      int
}
```

**File**: `internal/core/ports/storage.go`

```go
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
}
```

**File**: `internal/core/ports/tools.go`

```go
package ports

import "context"

// ToolExecutor abstracts tool execution.
// Implementations: Brave Search, HTTP Fetch, custom tools
type ToolExecutor interface {
    Execute(ctx context.Context, name string, args map[string]interface{}) (string, error)
    ToolNames() []string
}
```

**File**: `internal/core/ports/events.go`

```go
package ports

import "go-research/internal/core/domain"

// EventPublisher emits events for external observers.
// Note: This is kept simple - implementations are in-process only.
type EventPublisher interface {
    Publish(event domain.Event)
}

// EventSubscriber receives events (for primary adapters like CLI).
type EventSubscriber interface {
    Subscribe(types ...domain.EventType) <-chan domain.Event
    Unsubscribe(ch <-chan domain.Event)
    Close()
}
```

### Success Criteria

#### Automated Verification:

- [ ] Build succeeds: `go build ./internal/core/ports/...`
- [ ] No linting errors: `go vet ./internal/core/ports/...`

#### Manual Verification:

- [ ] All port interfaces are well-documented
- [ ] Interface methods match current implementations' signatures

---

## Phase 2: Extract Domain Models

### Overview

Separate domain models from storage concerns. Create clean domain types without `json` tags.

### Changes Required

#### 1. Create Domain Package

**File**: `internal/core/domain/session.go`

```go
package domain

import "time"

type SessionID string
type WorkerID string

type Session struct {
    ID              SessionID
    ParentID        *SessionID
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
    StatusPending   SessionStatus = "pending"
    StatusRunning   SessionStatus = "running"
    StatusComplete  SessionStatus = "complete"
    StatusFailed    SessionStatus = "failed"
    StatusCancelled SessionStatus = "cancelled"
)

// NewSession creates a new session with generated ID
func NewSession(query string, mode ResearchMode) *Session {
    return &Session{
        ID:        SessionID(generateID()),
        Query:     query,
        Mode:      mode,
        Status:    StatusPending,
        Workers:   []Worker{},
        Sources:   []Source{},
        CreatedAt: time.Now(),
    }
}
```

**File**: `internal/core/domain/worker.go`

```go
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

    // Type-specific data
    ReActData *ReActWorkerData
    DAGData   *DAGWorkerData
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

type ReActIteration struct {
    Thought string
    Action  string
    Result  string
}

type ToolCall struct {
    Tool   string
    Args   map[string]interface{}
    Result string
}

// DAGWorkerData holds DAG-node specific data
type DAGWorkerData struct {
    NodeID       string
    TaskType     string
    Perspective  *Perspective
    Facts        []Fact
    Dependencies []string
}
```

**File**: `internal/core/domain/research.go`

```go
package domain

import "time"

// ResearchResult is the output of a research operation
type ResearchResult struct {
    Session      *Session
    Report       *Report
    Perspectives []Perspective
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
    Content     string
    Source      Source
    Confidence  float64
    ValidatedBy []Source
}
```

**File**: `internal/core/domain/cost.go`

```go
package domain

type CostBreakdown struct {
    InputTokens   int
    OutputTokens  int
    TotalTokens   int
    InputCostUSD  float64
    OutputCostUSD float64
    TotalCostUSD  float64
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

**File**: `internal/core/domain/events.go`

```go
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

    // Cost tracking
    EventCostUpdated EventType = "cost.updated"
)

type Event struct {
    Type      EventType
    Timestamp time.Time
    SessionID SessionID
    Data      interface{}
}

// Event data types
type ResearchStartedData struct {
    Query string
    Mode  ResearchMode
}

type PlanCreatedData struct {
    WorkerCount  int
    Complexity   float64
    Perspectives []string
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

type CostUpdateData struct {
    Scope string // "worker", "session", "total"
    Cost  CostBreakdown
}
```

**File**: `internal/core/domain/id.go`

```go
package domain

import (
    "crypto/rand"
    "encoding/hex"
    "time"
)

func generateID() string {
    timestamp := time.Now().Format("20060102-150405")
    randomBytes := make([]byte, 4)
    rand.Read(randomBytes)
    return timestamp + "-" + hex.EncodeToString(randomBytes)
}
```

### Success Criteria

#### Automated Verification:

- [ ] Build succeeds: `go build ./internal/core/domain/...`
- [ ] Tests pass: `go test ./internal/core/domain/...`
- [ ] No linting errors: `go vet ./internal/core/domain/...`

#### Manual Verification:

- [ ] Domain models have no `json` tags
- [ ] Domain models have no infrastructure dependencies
- [ ] All types are well-documented

---

## Phase 3: Implement Secondary Adapters

### Overview

Move existing implementations to adapter packages and make them implement the port interfaces.

### Changes Required

#### 1. Storage Adapter (Filesystem)

**File**: `internal/adapters/secondary/storage/filesystem/repository.go`

```go
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

// Verify interface compliance at compile time
var _ ports.SessionRepository = (*SessionRepository)(nil)

func (r *SessionRepository) Save(ctx context.Context, session *domain.Session) error {
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

func matchesFilters(session *domain.Session, filters ports.SessionFilters) bool {
    if len(filters.Status) > 0 {
        found := false
        for _, s := range filters.Status {
            if session.Status == s {
                found = true
                break
            }
        }
        if !found {
            return false
        }
    }

    if len(filters.Mode) > 0 {
        found := false
        for _, m := range filters.Mode {
            if session.Mode == m {
                found = true
                break
            }
        }
        if !found {
            return false
        }
    }

    return true
}
```

**File**: `internal/adapters/secondary/storage/filesystem/entities.go`

```go
package filesystem

import (
    "time"

    "go-research/internal/core/domain"
)

// SessionEntity is the storage representation (has json tags)
type SessionEntity struct {
    ID              string          `json:"id"`
    ParentID        *string         `json:"parent_id,omitempty"`
    Query           string          `json:"query"`
    Mode            string          `json:"mode"`
    Status          string          `json:"status"`
    ComplexityScore float64         `json:"complexity_score"`
    Workers         []WorkerEntity  `json:"workers"`
    Report          *ReportEntity   `json:"report,omitempty"`
    Sources         []SourceEntity  `json:"sources"`
    Cost            CostEntity      `json:"cost"`
    CreatedAt       string          `json:"created_at"`
    CompletedAt     *string         `json:"completed_at,omitempty"`
}

type WorkerEntity struct {
    ID          string          `json:"id"`
    WorkerNum   int             `json:"worker_num"`
    Objective   string          `json:"objective"`
    Type        string          `json:"type"`
    Status      string          `json:"status"`
    Output      string          `json:"output"`
    Sources     []SourceEntity  `json:"sources"`
    Cost        CostEntity      `json:"cost"`
    StartedAt   string          `json:"started_at"`
    CompletedAt *string         `json:"completed_at,omitempty"`
    Error       *string         `json:"error,omitempty"`
}

type ReportEntity struct {
    Title       string           `json:"title"`
    Summary     string           `json:"summary"`
    Sections    []SectionEntity  `json:"sections"`
    FullContent string           `json:"full_content"`
    Citations   []CitationEntity `json:"citations"`
}

type SectionEntity struct {
    Heading string         `json:"heading"`
    Content string         `json:"content"`
    Sources []SourceEntity `json:"sources"`
}

type SourceEntity struct {
    URL         string  `json:"url"`
    Title       string  `json:"title"`
    Snippet     string  `json:"snippet"`
    Confidence  float64 `json:"confidence"`
    RetrievedAt string  `json:"retrieved_at"`
}

type CitationEntity struct {
    ID    int    `json:"id"`
    URL   string `json:"url"`
    Title string `json:"title"`
}

type CostEntity struct {
    InputTokens   int     `json:"input_tokens"`
    OutputTokens  int     `json:"output_tokens"`
    TotalTokens   int     `json:"total_tokens"`
    InputCostUSD  float64 `json:"input_cost_usd"`
    OutputCostUSD float64 `json:"output_cost_usd"`
    TotalCostUSD  float64 `json:"total_cost_usd"`
}

// Mapping functions
func toEntity(s *domain.Session) *SessionEntity {
    entity := &SessionEntity{
        ID:              string(s.ID),
        Query:           s.Query,
        Mode:            string(s.Mode),
        Status:          string(s.Status),
        ComplexityScore: s.ComplexityScore,
        CreatedAt:       s.CreatedAt.Format(time.RFC3339),
    }

    if s.ParentID != nil {
        parentID := string(*s.ParentID)
        entity.ParentID = &parentID
    }

    if s.CompletedAt != nil {
        completed := s.CompletedAt.Format(time.RFC3339)
        entity.CompletedAt = &completed
    }

    entity.Workers = make([]WorkerEntity, len(s.Workers))
    for i, w := range s.Workers {
        entity.Workers[i] = workerToEntity(w)
    }

    if s.Report != nil {
        entity.Report = reportToEntity(s.Report)
    }

    entity.Sources = make([]SourceEntity, len(s.Sources))
    for i, src := range s.Sources {
        entity.Sources[i] = sourceToEntity(src)
    }

    entity.Cost = costToEntity(s.Cost)

    return entity
}

func toDomain(e *SessionEntity) *domain.Session {
    session := &domain.Session{
        ID:              domain.SessionID(e.ID),
        Query:           e.Query,
        Mode:            domain.ResearchMode(e.Mode),
        Status:          domain.SessionStatus(e.Status),
        ComplexityScore: e.ComplexityScore,
    }

    session.CreatedAt, _ = time.Parse(time.RFC3339, e.CreatedAt)

    if e.ParentID != nil {
        parentID := domain.SessionID(*e.ParentID)
        session.ParentID = &parentID
    }

    if e.CompletedAt != nil {
        completed, _ := time.Parse(time.RFC3339, *e.CompletedAt)
        session.CompletedAt = &completed
    }

    session.Workers = make([]domain.Worker, len(e.Workers))
    for i, w := range e.Workers {
        session.Workers[i] = workerToDomain(w)
    }

    if e.Report != nil {
        session.Report = reportToDomain(e.Report)
    }

    session.Sources = make([]domain.Source, len(e.Sources))
    for i, src := range e.Sources {
        session.Sources[i] = sourceToDomain(src)
    }

    session.Cost = costToDomain(e.Cost)

    return session
}

// Helper mapping functions (implement fully)
func workerToEntity(w domain.Worker) WorkerEntity { /* ... */ }
func workerToDomain(e WorkerEntity) domain.Worker { /* ... */ }
func reportToEntity(r *domain.Report) *ReportEntity { /* ... */ }
func reportToDomain(e *ReportEntity) *domain.Report { /* ... */ }
func sourceToEntity(s domain.Source) SourceEntity { /* ... */ }
func sourceToDomain(e SourceEntity) domain.Source { /* ... */ }
func costToEntity(c domain.CostBreakdown) CostEntity { /* ... */ }
func costToDomain(e CostEntity) domain.CostBreakdown { /* ... */ }
```

#### 2. LLM Adapter (OpenRouter)

**File**: `internal/adapters/secondary/llm/openrouter.go`

```go
package llm

import (
    "context"

    "go-research/internal/core/ports"
    "go-research/internal/llm" // existing implementation
)

type OpenRouterAdapter struct {
    client *llm.Client
}

func NewOpenRouterAdapter(apiKey, model string) *OpenRouterAdapter {
    return &OpenRouterAdapter{
        client: llm.NewClientWithKey(apiKey, model),
    }
}

// Verify interface compliance
var _ ports.LLMProvider = (*OpenRouterAdapter)(nil)

func (a *OpenRouterAdapter) Chat(ctx context.Context, messages []ports.Message) (*ports.ChatResponse, error) {
    // Convert to internal message format
    internalMsgs := make([]llm.Message, len(messages))
    for i, m := range messages {
        internalMsgs[i] = llm.Message{Role: m.Role, Content: m.Content}
    }

    resp, err := a.client.Chat(ctx, internalMsgs)
    if err != nil {
        return nil, err
    }

    return &ports.ChatResponse{
        Content: resp.Choices[0].Message.Content,
        TokensUsed: ports.TokenUsage{
            Prompt:     resp.Usage.PromptTokens,
            Completion: resp.Usage.CompletionTokens,
            Total:      resp.Usage.TotalTokens,
        },
    }, nil
}

func (a *OpenRouterAdapter) StreamChat(ctx context.Context, messages []ports.Message, handler func(chunk string) error) error {
    internalMsgs := make([]llm.Message, len(messages))
    for i, m := range messages {
        internalMsgs[i] = llm.Message{Role: m.Role, Content: m.Content}
    }

    return a.client.StreamChat(ctx, internalMsgs, handler)
}

func (a *OpenRouterAdapter) Model() string {
    return a.client.GetModel()
}

func (a *OpenRouterAdapter) SetModel(model string) {
    a.client.SetModel(model)
}
```

#### 3. Report Writer Adapter (Obsidian)

**File**: `internal/adapters/secondary/writers/obsidian/writer.go`

```go
package obsidian

import (
    "context"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
    "go-research/internal/obsidian" // existing implementation
)

type ObsidianWriter struct {
    writer *obsidian.Writer
}

func NewObsidianWriter(vaultPath string) *ObsidianWriter {
    return &ObsidianWriter{
        writer: obsidian.NewWriter(vaultPath),
    }
}

// Verify interface compliance
var _ ports.ReportWriter = (*ObsidianWriter)(nil)

func (w *ObsidianWriter) WriteSession(ctx context.Context, session *domain.Session) error {
    // Convert domain session to existing obsidian format
    legacySession := convertToLegacySession(session)
    return w.writer.Write(legacySession)
}

// Convert domain model to existing session format for backward compatibility
func convertToLegacySession(s *domain.Session) *obsidian.SessionData {
    // ... conversion logic
}
```

#### 4. Event Bus Adapter

**File**: `internal/adapters/secondary/events/bus.go`

```go
package events

import (
    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
    "go-research/internal/events" // existing implementation
)

type InMemoryBus struct {
    bus *events.Bus
}

func NewInMemoryBus(bufferSize int) *InMemoryBus {
    return &InMemoryBus{
        bus: events.NewBus(bufferSize),
    }
}

// Verify interfaces
var _ ports.EventPublisher = (*InMemoryBus)(nil)
var _ ports.EventSubscriber = (*InMemoryBus)(nil)

func (b *InMemoryBus) Publish(event domain.Event) {
    // Convert domain event to internal event format
    internalEvent := events.Event{
        Type:      events.EventType(event.Type),
        Timestamp: event.Timestamp,
        Data:      event.Data,
    }
    b.bus.Publish(internalEvent)
}

func (b *InMemoryBus) Subscribe(types ...domain.EventType) <-chan domain.Event {
    // Convert types and subscribe
    internalTypes := make([]events.EventType, len(types))
    for i, t := range types {
        internalTypes[i] = events.EventType(t)
    }

    internalCh := b.bus.Subscribe(internalTypes...)

    // Create adapter channel
    ch := make(chan domain.Event, 100)
    go func() {
        for e := range internalCh {
            ch <- domain.Event{
                Type:      domain.EventType(e.Type),
                Timestamp: e.Timestamp,
                SessionID: domain.SessionID(""), // Extract from data if needed
                Data:      e.Data,
            }
        }
        close(ch)
    }()

    return ch
}

func (b *InMemoryBus) Unsubscribe(ch <-chan domain.Event) {
    // Note: Would need mapping to internal channel
}

func (b *InMemoryBus) Close() {
    b.bus.Close()
}
```

### Success Criteria

#### Automated Verification:

- [ ] Build succeeds: `go build ./internal/adapters/...`
- [ ] Tests pass: `go test ./internal/adapters/...`
- [ ] No linting errors: `go vet ./internal/adapters/...`

#### Manual Verification:

- [ ] All adapters implement their port interfaces (compile-time verification)
- [ ] Existing functionality preserved when adapters wrap current implementations

---

## Phase 4: Implement Application Services

### Overview

Create the service layer that implements primary ports and uses secondary ports. This is where business logic lives.

### Changes Required

#### 1. Research Service Implementation

**File**: `internal/core/service/research.go`

```go
package service

import (
    "context"
    "time"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
    "go-research/internal/agents"
    "go-research/internal/planning"
    ctxmgr "go-research/internal/context"
)

type ResearchServiceImpl struct {
    llm      ports.LLMProvider
    tools    ports.ToolExecutor
    sessions ports.SessionRepository
    reports  ports.ReportWriter
    events   ports.EventPublisher

    // Domain services
    planner        *planning.Planner
    searchAgent    *agents.SearchAgent
    analysisAgent  *agents.AnalysisAgent
    synthesisAgent *agents.SynthesisAgent
    contextMgr     *ctxmgr.Manager
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
        contextMgr:     ctxmgr.New(llm, ctxmgr.DefaultConfig()),
    }
}

// Verify interface compliance
var _ ports.ResearchService = (*ResearchServiceImpl)(nil)

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

func (s *ResearchServiceImpl) Cancel(sessionID string) error {
    // TODO: Implement cancellation via context
    return nil
}

// Helper functions
func perspectiveNames(perspectives []domain.Perspective) []string { /* ... */ }
func collectFacts(results map[string]*agents.SearchResult) []agents.Fact { /* ... */ }
func collectSources(results map[string]*agents.SearchResult) []domain.Source { /* ... */ }
func buildWorkersFromResults(results map[string]*agents.SearchResult) []domain.Worker { /* ... */ }
```

#### 2. Session Service Implementation

**File**: `internal/core/service/session.go`

```go
package service

import (
    "context"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
)

type SessionServiceImpl struct {
    sessions ports.SessionRepository
}

func NewSessionService(sessions ports.SessionRepository) *SessionServiceImpl {
    return &SessionServiceImpl{sessions: sessions}
}

// Verify interface compliance
var _ ports.SessionService = (*SessionServiceImpl)(nil)

func (s *SessionServiceImpl) List(ctx context.Context, filters ports.SessionFilters) ([]domain.SessionSummary, error) {
    return s.sessions.List(ctx, filters)
}

func (s *SessionServiceImpl) Load(ctx context.Context, id string) (*domain.Session, error) {
    return s.sessions.Load(ctx, id)
}

func (s *SessionServiceImpl) LoadLatest(ctx context.Context) (*domain.Session, error) {
    return s.sessions.LoadLatest(ctx)
}

func (s *SessionServiceImpl) Delete(ctx context.Context, id string) error {
    return s.sessions.Delete(ctx, id)
}
```

### Success Criteria

#### Automated Verification:

- [ ] Build succeeds: `go build ./internal/core/service/...`
- [ ] Tests pass: `go test ./internal/core/service/...`
- [ ] No linting errors: `go vet ./internal/core/service/...`

#### Manual Verification:

- [ ] Services implement port interfaces
- [ ] Services only depend on ports, not concrete implementations
- [ ] Business logic is properly encapsulated

---

## Phase 5: Refactor CLI Adapter and Wire Dependencies

### Overview

Update the REPL to use the new service interfaces and wire everything together in main.go.

### Changes Required

#### 1. CLI Adapter Handlers

**File**: `internal/adapters/primary/cli/handlers/research.go`

```go
package handlers

import (
    "context"
    "fmt"
    "strings"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
)

type ResearchHandler struct {
    research ports.ResearchService
    events   ports.EventSubscriber
}

func NewResearchHandler(research ports.ResearchService, events ports.EventSubscriber) *ResearchHandler {
    return &ResearchHandler{
        research: research,
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

**File**: `internal/adapters/primary/cli/handlers/session.go`

```go
package handlers

import (
    "fmt"

    "go-research/internal/core/ports"
)

type SessionHandler struct {
    sessions ports.SessionService
}

func NewSessionHandler(sessions ports.SessionService) *SessionHandler {
    return &SessionHandler{sessions: sessions}
}

func (h *SessionHandler) HandleList(ctx *Context, args []string) error {
    summaries, err := h.sessions.List(ctx.RunContext, ports.SessionFilters{
        Limit: 20,
    })
    if err != nil {
        return err
    }

    ctx.Renderer.RenderSessionList(summaries)
    return nil
}

func (h *SessionHandler) HandleLoad(ctx *Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /load <session-id>")
    }

    session, err := h.sessions.Load(ctx.RunContext, args[0])
    if err != nil {
        return err
    }

    ctx.Session = session
    ctx.Renderer.RenderSession(session)
    return nil
}
```

#### 2. Dependency Injection in main.go

**File**: `cmd/research/main.go`

```go
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

    // Validate required config
    if cfg.OpenRouterAPIKey == "" {
        log.Fatal("OPENROUTER_API_KEY is required")
    }
    if cfg.BraveAPIKey == "" {
        log.Fatal("BRAVE_API_KEY is required")
    }

    // Create secondary adapters (infrastructure)
    llmProvider := llm.NewOpenRouterAdapter(cfg.OpenRouterAPIKey, cfg.Model)
    toolExecutor := tools.NewRegistry(cfg.BraveAPIKey)
    sessionRepo := filesystem.NewSessionRepository(cfg.StateDir)
    reportWriter := obsidian.NewObsidianWriter(cfg.VaultPath)
    eventBus := events.NewInMemoryBus(100)
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

### Success Criteria

#### Automated Verification:

- [ ] Build succeeds: `go build ./...`
- [ ] Tests pass: `go test ./...`
- [ ] No linting errors: `go vet ./...`

#### Manual Verification:

- [ ] `/fast` command executes research correctly
- [ ] `/deep` command executes multi-perspective research
- [ ] `/sessions` lists all sessions
- [ ] `/load <id>` loads a session
- [ ] Sessions persist to filesystem
- [ ] Obsidian vault receives reports
- [ ] Live visualization displays progress

---

## Testing Strategy

### Unit Tests

Each layer should have isolated unit tests:

- `internal/core/domain/*_test.go` - Domain model tests
- `internal/core/service/*_test.go` - Service tests with mocked ports
- `internal/adapters/secondary/storage/filesystem/*_test.go` - Repository tests

### Integration Tests

- `internal/e2e/research_test.go` - Full research flow with real adapters
- `internal/e2e/session_test.go` - Session CRUD operations

### Example Service Test with Mocks

```go
// internal/core/service/research_test.go
package service

import (
    "context"
    "testing"

    "go-research/internal/core/domain"
    "go-research/internal/core/ports"
)

type mockLLM struct{}
func (m *mockLLM) Chat(ctx context.Context, msgs []ports.Message) (*ports.ChatResponse, error) {
    return &ports.ChatResponse{Content: "test response"}, nil
}
// ... implement other methods

type mockSessionRepo struct {
    saved *domain.Session
}
func (m *mockSessionRepo) Save(ctx context.Context, s *domain.Session) error {
    m.saved = s
    return nil
}
// ... implement other methods

func TestResearchService_Research(t *testing.T) {
    mockLLM := &mockLLM{}
    mockRepo := &mockSessionRepo{}
    mockEvents := &mockEventPublisher{}

    svc := NewResearchService(mockLLM, mockTools, mockRepo, mockWriter, mockEvents)

    result, err := svc.Research(context.Background(), "test query", ports.ResearchOptions{
        Mode: domain.ModeFast,
    })

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    if result.Session == nil {
        t.Error("expected session in result")
    }

    if mockRepo.saved == nil {
        t.Error("expected session to be saved")
    }
}
```

---

## Migration Notes

### Breaking Changes

1. **Session format** - New JSON structure, old sessions won't load
2. **Package paths** - Imports change for refactored packages
3. **Handler signatures** - Handlers now receive services via constructor

### Migration Steps

1. Back up existing sessions if needed
2. Clear state directory before first run
3. Update any external code that imports internal packages

---

## Target Directory Layout

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
│   │   │   ├── events.go
│   │   │   └── id.go
│   │   │
│   │   ├── ports/                     # Interface definitions
│   │   │   ├── research.go            # ResearchService, SessionService
│   │   │   ├── storage.go             # SessionRepository, ReportWriter
│   │   │   ├── llm.go                 # LLMProvider
│   │   │   ├── tools.go               # ToolExecutor
│   │   │   └── events.go              # EventPublisher, EventSubscriber
│   │   │
│   │   └── service/                   # Application services
│   │       ├── research.go            # Implements ResearchService
│   │       └── session.go             # Implements SessionService
│   │
│   ├── agents/                        # Domain services (existing)
│   ├── planning/                      # Planning domain (existing)
│   ├── context/                       # Context management domain (existing)
│   │
│   └── adapters/                      # INFRASTRUCTURE
│       │
│       ├── primary/                   # Driving adapters
│       │   └── cli/                   # CLI/REPL adapter
│       │       ├── repl.go
│       │       ├── router.go
│       │       ├── handlers/
│       │       │   ├── research.go
│       │       │   └── session.go
│       │       ├── visualizer.go
│       │       └── renderer.go
│       │
│       └── secondary/                 # Driven adapters
│           ├── llm/
│           │   └── openrouter.go      # Implements LLMProvider
│           │
│           ├── tools/
│           │   └── registry.go        # Implements ToolExecutor
│           │
│           ├── storage/
│           │   └── filesystem/
│           │       ├── repository.go  # Implements SessionRepository
│           │       └── entities.go    # Storage entities with json tags
│           │
│           ├── writers/
│           │   └── obsidian/
│           │       └── writer.go      # Implements ReportWriter
│           │
│           └── events/
│               └── bus.go             # In-memory event bus
│
├── config/
│   └── config.go                      # Configuration loading
│
└── go.mod
```

---

## References

- Research document: `thoughts/shared/research/2025-01-25_ports-adapters-architecture-go-research.md`
- Architecture document: `go-research/deep_research_agent_architecture.md`
- Implementation plan: `thoughts/shared/plans/go-deep-research-agent-sota.md`
- Existing orchestrator: `internal/orchestrator/deep.go`
- Existing session: `internal/session/session.go`
