# Event-Sourced Storage Architecture Implementation Plan

## Overview

Implement an event-sourced adapter-based storage architecture for the go-research deep research agent. This plan builds on top of the hexagonal architecture refactoring (ports/adapters) and adds event sourcing for full interruptibility and resumability.

## Current State Analysis

### What Exists

| Component     | Location                              | Issue                                          |
| ------------- | ------------------------------------- | ---------------------------------------------- |
| Event Bus     | `internal/events/bus.go:8-66`         | Fire-and-forget, events dropped if buffer full |
| Session Store | `internal/session/store.go:18-147`    | Snapshot-only, no intermediate state           |
| Orchestrator  | `internal/orchestrator/deep.go:25-35` | Stateless, state in local variables            |
| DAG           | `internal/planning/dag.go:60-69`      | Direct mutation, no history                    |

### Key Discoveries

- Events are ephemeral UI updates, not persisted (`events/bus.go:44-46`)
- Session only saved at completion (`store.go:38-67`)
- No way to resume interrupted research
- State scattered across function local variables in `Research()` (`deep.go:94-276`)

## Desired End State

After implementation:

```
                         COMMAND → AGGREGATE → EVENT
                              ↓         ↓         ↓
                         validate → apply → persist
                                          ↓
                                    EVENT STORE
                                          ↓
                              ┌───────────┼───────────┐
                              ↓           ↓           ↓
                        Filesystem   Obsidian    (future)
                        JSON files   Projection  PostgreSQL
```

### Key Capabilities

1. **Interruptible**: State persisted after every domain event
2. **Resumable**: `/resume <session-id>` continues from any point
3. **Auditable**: Complete event log for debugging and replay
4. **Pluggable**: Storage adapters via ports/adapters pattern
5. **Backward Compatible**: Migrates existing JSON sessions

### Verification

After implementation:

- `go build ./...` compiles
- `go test ./...` passes
- `/deep <query>` works with event persistence
- `/resume <session-id>` continues interrupted research
- Old sessions can be loaded and optionally migrated

## What We're NOT Doing

- PostgreSQL adapter (future)
- Distributed event bus (stay in-process)
- Event versioning/upcasting (defer until schema changes)
- CQRS with separate read models (Obsidian is sufficient)

---

## Implementation Approach

Build in **6 phases**, each independently testable:

1. **Foundation**: Port interfaces and domain models (hexagonal base)
2. **Domain Events**: Event types with persistence metadata
3. **Research Aggregate**: Command/event pattern for state management
4. **Event Store**: Filesystem-based append-only storage
5. **Orchestrator Integration**: Wire event sourcing into deep research
6. **Resume & Migration**: CLI commands and backward compatibility

---

## Phase 1: Foundation (Hexagonal Base)

### Overview

Establish the ports/adapters foundation required for event sourcing. Create interfaces that both the current implementation and event-sourced version can implement.

### Changes Required

#### 1. Create Core Ports Package

**File**: `go-research/internal/core/ports/storage.go`
**Changes**: Define event store port alongside session repository

```go
package ports

import (
    "context"
)

// EventStore persists and retrieves domain events
type EventStore interface {
    // AppendEvents adds events to the stream for an aggregate
    AppendEvents(ctx context.Context, aggregateID string, events []Event, expectedVersion int) error

    // LoadEvents retrieves all events for an aggregate
    LoadEvents(ctx context.Context, aggregateID string) ([]Event, error)

    // LoadEventsFrom retrieves events starting from a version
    LoadEventsFrom(ctx context.Context, aggregateID string, fromVersion int) ([]Event, error)

    // LoadSnapshot retrieves the latest snapshot for an aggregate
    LoadSnapshot(ctx context.Context, aggregateID string) (*Snapshot, error)

    // SaveSnapshot persists a state snapshot
    SaveSnapshot(ctx context.Context, aggregateID string, snapshot Snapshot) error

    // GetAllAggregateIDs returns all aggregate IDs (for listing sessions)
    GetAllAggregateIDs(ctx context.Context) ([]string, error)
}

// Event represents a persisted domain event
type Event interface {
    GetID() string
    GetAggregateID() string
    GetVersion() int
    GetType() string
    GetTimestamp() time.Time
}

// Snapshot represents a point-in-time state capture
type Snapshot struct {
    AggregateID string
    Version     int
    Data        []byte
    Timestamp   time.Time
}

// SessionRepository for backward compatibility with existing sessions
type SessionRepository interface {
    Save(ctx context.Context, session *Session) error
    Load(ctx context.Context, id string) (*Session, error)
    LoadLatest(ctx context.Context) (*Session, error)
    List(ctx context.Context, filters SessionFilters) ([]SessionSummary, error)
    Delete(ctx context.Context, id string) error
}
```

**File**: `go-research/internal/core/ports/events.go`
**Changes**: Define event publisher port

```go
package ports

// EventPublisher emits events for external observers
type EventPublisher interface {
    Publish(event Event)
}

// EventSubscriber receives events
type EventSubscriber interface {
    Subscribe(types ...string) <-chan Event
    Unsubscribe(ch <-chan Event)
    Close()
}
```

#### 2. Create Domain Events Package

**File**: `go-research/internal/core/domain/events/base.go`
**Changes**: Base event structure with persistence metadata

```go
package events

import (
    "time"
)

// BaseEvent provides common fields for all domain events
type BaseEvent struct {
    ID          string    `json:"id"`           // UUID for idempotency
    AggregateID string    `json:"aggregate_id"` // Session/Research ID
    Version     int       `json:"version"`      // Aggregate version
    Timestamp   time.Time `json:"timestamp"`
    Type        string    `json:"type"`         // Event type discriminator
}

func (e BaseEvent) GetID() string          { return e.ID }
func (e BaseEvent) GetAggregateID() string { return e.AggregateID }
func (e BaseEvent) GetVersion() int        { return e.Version }
func (e BaseEvent) GetType() string        { return e.Type }
func (e BaseEvent) GetTimestamp() time.Time { return e.Timestamp }
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `cd go-research && go build ./internal/core/...`
- [x] No linting errors: `cd go-research && go vet ./internal/core/...`

#### Manual Verification:

- [x] Port interfaces are well-documented
- [x] No circular dependencies in core package

---

## Phase 2: Domain Events

### Overview

Define all domain event types that represent state changes in the research workflow. These replace the ephemeral progress events for state-changing operations.

### Changes Required

#### 1. Research Lifecycle Events

**File**: `go-research/internal/core/domain/events/research.go`
**Changes**: Research session lifecycle events

```go
package events

import "time"

// ResearchStartedEvent - Research session initiated
type ResearchStartedEvent struct {
    BaseEvent
    Query  string         `json:"query"`
    Mode   string         `json:"mode"` // "fast" or "deep"
    Config ResearchConfig `json:"config"`
}

type ResearchConfig struct {
    MaxWorkers int           `json:"max_workers"`
    Timeout    time.Duration `json:"timeout"`
}

// ResearchCompletedEvent - Research finished successfully
type ResearchCompletedEvent struct {
    BaseEvent
    Duration    time.Duration `json:"duration"`
    TotalCost   CostBreakdown `json:"total_cost"`
    SourceCount int           `json:"source_count"`
}

// ResearchFailedEvent - Research failed with error
type ResearchFailedEvent struct {
    BaseEvent
    Error       string `json:"error"`
    FailedPhase string `json:"failed_phase"`
}

// ResearchCancelledEvent - Research cancelled by user
type ResearchCancelledEvent struct {
    BaseEvent
    Reason string `json:"reason"`
}

type CostBreakdown struct {
    InputTokens  int     `json:"input_tokens"`
    OutputTokens int     `json:"output_tokens"`
    TotalTokens  int     `json:"total_tokens"`
    TotalCostUSD float64 `json:"total_cost_usd"`
}
```

#### 2. Planning Events

**File**: `go-research/internal/core/domain/events/planning.go`
**Changes**: Plan creation and DAG structure events

```go
package events

// PlanCreatedEvent - Research plan generated
type PlanCreatedEvent struct {
    BaseEvent
    Topic        string        `json:"topic"`
    Perspectives []Perspective `json:"perspectives"`
    DAGStructure DAGSnapshot   `json:"dag_structure"`
    Cost         CostBreakdown `json:"cost"`
}

type Perspective struct {
    Name      string   `json:"name"`
    Focus     string   `json:"focus"`
    Questions []string `json:"questions"`
}

type DAGSnapshot struct {
    Nodes []DAGNodeSnapshot `json:"nodes"`
}

type DAGNodeSnapshot struct {
    ID           string   `json:"id"`
    TaskType     string   `json:"task_type"`
    Description  string   `json:"description"`
    Dependencies []string `json:"dependencies"`
    Status       string   `json:"status"`
}
```

#### 3. Worker Events

**File**: `go-research/internal/core/domain/events/worker.go`
**Changes**: Worker lifecycle events

```go
package events

// WorkerStartedEvent - Worker began execution
type WorkerStartedEvent struct {
    BaseEvent
    WorkerID    string `json:"worker_id"`
    WorkerNum   int    `json:"worker_num"`
    Objective   string `json:"objective"`
    Perspective string `json:"perspective,omitempty"`
}

// WorkerCompletedEvent - Worker finished successfully
type WorkerCompletedEvent struct {
    BaseEvent
    WorkerID string        `json:"worker_id"`
    Output   string        `json:"output"`
    Facts    []Fact        `json:"facts,omitempty"`
    Sources  []Source      `json:"sources"`
    Cost     CostBreakdown `json:"cost"`
}

type Fact struct {
    Content    string  `json:"content"`
    Confidence float64 `json:"confidence"`
    SourceURL  string  `json:"source_url"`
}

type Source struct {
    URL     string `json:"url"`
    Title   string `json:"title"`
    Snippet string `json:"snippet"`
}

// WorkerFailedEvent - Worker failed
type WorkerFailedEvent struct {
    BaseEvent
    WorkerID string `json:"worker_id"`
    Error    string `json:"error"`
}
```

#### 4. Analysis Events

**File**: `go-research/internal/core/domain/events/analysis.go`
**Changes**: Analysis phase events

```go
package events

// AnalysisStartedEvent - Analysis phase began
type AnalysisStartedEvent struct {
    BaseEvent
    TotalFacts int `json:"total_facts"`
}

// AnalysisCompletedEvent - Analysis phase finished
type AnalysisCompletedEvent struct {
    BaseEvent
    ValidatedFacts     []ValidatedFact `json:"validated_facts"`
    Contradictions     []Contradiction `json:"contradictions"`
    KnowledgeGaps      []KnowledgeGap  `json:"knowledge_gaps"`
    Cost               CostBreakdown   `json:"cost"`
}

type ValidatedFact struct {
    Content         string   `json:"content"`
    Confidence      float64  `json:"confidence"`
    CorroboratedBy  []string `json:"corroborated_by"`
}

type Contradiction struct {
    Fact1       string `json:"fact_1"`
    Fact2       string `json:"fact_2"`
    Description string `json:"description"`
}

type KnowledgeGap struct {
    Description      string   `json:"description"`
    Importance       float64  `json:"importance"`
    SuggestedQueries []string `json:"suggested_queries"`
}
```

#### 5. Synthesis Events

**File**: `go-research/internal/core/domain/events/synthesis.go`
**Changes**: Report generation events

```go
package events

// SynthesisStartedEvent - Report generation began
type SynthesisStartedEvent struct {
    BaseEvent
}

// ReportGeneratedEvent - Full report assembled
type ReportGeneratedEvent struct {
    BaseEvent
    Title       string        `json:"title"`
    Summary     string        `json:"summary"`
    FullContent string        `json:"full_content"`
    Citations   []Citation    `json:"citations"`
    Cost        CostBreakdown `json:"cost"`
}

type Citation struct {
    ID    int    `json:"id"`
    URL   string `json:"url"`
    Title string `json:"title"`
}
```

#### 6. Snapshot Event

**File**: `go-research/internal/core/domain/events/snapshot.go`
**Changes**: State snapshot for replay optimization

```go
package events

// SnapshotTakenEvent - State snapshot for replay optimization
type SnapshotTakenEvent struct {
    BaseEvent
    Snapshot ResearchStateSnapshot `json:"snapshot"`
}

type ResearchStateSnapshot struct {
    Query          string                    `json:"query"`
    Mode           string                    `json:"mode"`
    Status         string                    `json:"status"`
    DAG            DAGSnapshot               `json:"dag"`
    Workers        map[string]WorkerSnapshot `json:"workers"`
    AnalysisResult *AnalysisSnapshot         `json:"analysis_result,omitempty"`
    Report         *ReportSnapshot           `json:"report,omitempty"`
    Cost           CostBreakdown             `json:"cost"`
}

type WorkerSnapshot struct {
    ID          string        `json:"id"`
    WorkerNum   int           `json:"worker_num"`
    Objective   string        `json:"objective"`
    Perspective string        `json:"perspective"`
    Status      string        `json:"status"`
    Output      string        `json:"output"`
    Facts       []Fact        `json:"facts"`
    Sources     []Source      `json:"sources"`
    Cost        CostBreakdown `json:"cost"`
}

type AnalysisSnapshot struct {
    ValidatedFacts []ValidatedFact `json:"validated_facts"`
    Contradictions []Contradiction `json:"contradictions"`
    KnowledgeGaps  []KnowledgeGap  `json:"knowledge_gaps"`
}

type ReportSnapshot struct {
    Title       string     `json:"title"`
    Summary     string     `json:"summary"`
    FullContent string     `json:"full_content"`
    Citations   []Citation `json:"citations"`
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `cd go-research && go build ./internal/core/domain/events/...`
- [x] No linting errors: `cd go-research && go vet ./internal/core/domain/events/...`

#### Manual Verification:

- [x] All event types have JSON tags for serialization
- [x] Events follow naming convention: `<Entity><Action>Event`
- [x] All events embed BaseEvent

---

## Phase 3: Research Aggregate

### Overview

Implement the ResearchState aggregate that maintains research session state. All state changes flow through the Execute() method which validates commands and emits events.

### Changes Required

#### 1. Research State Aggregate

**File**: `go-research/internal/core/domain/aggregate/research_state.go`
**Changes**: Aggregate root for research sessions

```go
package aggregate

import (
    "sync"
    "time"

    "go-research/internal/core/domain/events"
)

// ResearchState is the aggregate root for research sessions
type ResearchState struct {
    mu sync.RWMutex

    // Identity
    ID        string
    Version   int
    CreatedAt time.Time

    // Research configuration
    Query  string
    Mode   string
    Config events.ResearchConfig

    // Current status
    Status   string  // "pending", "planning", "searching", "analyzing", "synthesizing", "complete", "failed", "cancelled"
    Progress float64

    // Planning state
    Plan *PlanState

    // Execution state
    DAG     *DAGState
    Workers map[string]*WorkerState

    // Analysis state
    Analysis *AnalysisState

    // Synthesis state
    Report *ReportState

    // Cost tracking
    Cost events.CostBreakdown

    // Timing
    StartedAt   *time.Time
    CompletedAt *time.Time

    // Event tracking
    uncommittedEvents []interface{}
}

type PlanState struct {
    Topic        string
    Perspectives []events.Perspective
}

type DAGState struct {
    Nodes map[string]*DAGNode
}

type DAGNode struct {
    ID           string
    TaskType     string
    Description  string
    Dependencies []string
    Status       string
    Result       interface{}
    Error        *string
}

type WorkerState struct {
    ID          string
    WorkerNum   int
    Objective   string
    Perspective string
    Status      string
    Output      string
    Facts       []events.Fact
    Sources     []events.Source
    Cost        events.CostBreakdown
    StartedAt   *time.Time
    CompletedAt *time.Time
    Error       *string
}

type AnalysisState struct {
    ValidatedFacts []events.ValidatedFact
    Contradictions []events.Contradiction
    KnowledgeGaps  []events.KnowledgeGap
    Cost           events.CostBreakdown
}

type ReportState struct {
    Title       string
    Summary     string
    FullContent string
    Citations   []events.Citation
    Cost        events.CostBreakdown
}

// NewResearchState creates a new empty state
func NewResearchState(id string) *ResearchState {
    return &ResearchState{
        ID:        id,
        Version:   0,
        CreatedAt: time.Now(),
        Status:    "pending",
        Workers:   make(map[string]*WorkerState),
        Cost:      events.CostBreakdown{},
    }
}

// LoadFromEvents reconstructs state by replaying events
func LoadFromEvents(id string, eventStream []interface{}) (*ResearchState, error) {
    state := NewResearchState(id)

    for _, event := range eventStream {
        state.Apply(event)
    }

    state.uncommittedEvents = nil
    return state, nil
}

// GetUncommittedEvents returns events not yet persisted
func (s *ResearchState) GetUncommittedEvents() []interface{} {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return append([]interface{}{}, s.uncommittedEvents...)
}

// ClearUncommittedEvents marks events as persisted
func (s *ResearchState) ClearUncommittedEvents() {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.uncommittedEvents = nil
}
```

#### 2. Command Definitions

**File**: `go-research/internal/core/domain/aggregate/commands.go`
**Changes**: Command types for state changes

```go
package aggregate

import (
    "fmt"

    "go-research/internal/core/domain/events"
)

// Command represents an intent to change state
type Command interface {
    Validate(state *ResearchState) error
}

// StartResearchCommand initiates research
type StartResearchCommand struct {
    Query  string
    Mode   string
    Config events.ResearchConfig
}

func (c StartResearchCommand) Validate(s *ResearchState) error {
    if s.Status != "pending" {
        return fmt.Errorf("research already started")
    }
    if c.Query == "" {
        return fmt.Errorf("query cannot be empty")
    }
    return nil
}

// SetPlanCommand sets the research plan
type SetPlanCommand struct {
    Topic        string
    Perspectives []events.Perspective
    DAGStructure events.DAGSnapshot
    Cost         events.CostBreakdown
}

func (c SetPlanCommand) Validate(s *ResearchState) error {
    if s.Status != "planning" && s.Status != "pending" {
        return fmt.Errorf("cannot set plan in status: %s", s.Status)
    }
    return nil
}

// StartWorkerCommand marks a worker as started
type StartWorkerCommand struct {
    WorkerID    string
    WorkerNum   int
    Objective   string
    Perspective string
}

func (c StartWorkerCommand) Validate(s *ResearchState) error {
    if s.Status != "searching" {
        return fmt.Errorf("cannot start worker in status: %s", s.Status)
    }
    return nil
}

// CompleteWorkerCommand marks a worker as completed
type CompleteWorkerCommand struct {
    WorkerID string
    Output   string
    Facts    []events.Fact
    Sources  []events.Source
    Cost     events.CostBreakdown
}

func (c CompleteWorkerCommand) Validate(s *ResearchState) error {
    worker, ok := s.Workers[c.WorkerID]
    if !ok {
        return fmt.Errorf("worker not found: %s", c.WorkerID)
    }
    if worker.Status != "running" {
        return fmt.Errorf("worker not running: %s", c.WorkerID)
    }
    return nil
}

// FailWorkerCommand marks a worker as failed
type FailWorkerCommand struct {
    WorkerID string
    Error    string
}

func (c FailWorkerCommand) Validate(s *ResearchState) error {
    _, ok := s.Workers[c.WorkerID]
    if !ok {
        return fmt.Errorf("worker not found: %s", c.WorkerID)
    }
    return nil
}

// SetAnalysisCommand sets analysis results
type SetAnalysisCommand struct {
    ValidatedFacts []events.ValidatedFact
    Contradictions []events.Contradiction
    KnowledgeGaps  []events.KnowledgeGap
    Cost           events.CostBreakdown
}

func (c SetAnalysisCommand) Validate(s *ResearchState) error {
    if s.Status != "analyzing" {
        return fmt.Errorf("cannot set analysis in status: %s", s.Status)
    }
    return nil
}

// SetReportCommand sets the final report
type SetReportCommand struct {
    Title       string
    Summary     string
    FullContent string
    Citations   []events.Citation
    Cost        events.CostBreakdown
}

func (c SetReportCommand) Validate(s *ResearchState) error {
    if s.Status != "synthesizing" {
        return fmt.Errorf("cannot set report in status: %s", s.Status)
    }
    return nil
}

// CompleteResearchCommand marks research as complete
type CompleteResearchCommand struct {
    Duration time.Duration
}

func (c CompleteResearchCommand) Validate(s *ResearchState) error {
    if s.Status == "complete" || s.Status == "failed" || s.Status == "cancelled" {
        return fmt.Errorf("research already in terminal state: %s", s.Status)
    }
    return nil
}

// CancelResearchCommand cancels research
type CancelResearchCommand struct {
    Reason string
}

func (c CancelResearchCommand) Validate(s *ResearchState) error {
    if s.Status == "complete" || s.Status == "failed" || s.Status == "cancelled" {
        return fmt.Errorf("research already in terminal state: %s", s.Status)
    }
    return nil
}
```

#### 3. Command Execution

**File**: `go-research/internal/core/domain/aggregate/execute.go`
**Changes**: Execute method that creates events from commands

```go
package aggregate

import (
    "time"

    "github.com/google/uuid"
    "go-research/internal/core/domain/events"
)

// Execute processes a command and returns resulting event
func (s *ResearchState) Execute(cmd Command) (interface{}, error) {
    s.mu.Lock()
    defer s.mu.Unlock()

    if err := cmd.Validate(s); err != nil {
        return nil, err
    }

    var event interface{}
    newVersion := s.Version + 1
    timestamp := time.Now()

    switch c := cmd.(type) {
    case StartResearchCommand:
        event = events.ResearchStartedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "research.started",
            },
            Query:  c.Query,
            Mode:   c.Mode,
            Config: c.Config,
        }

    case SetPlanCommand:
        event = events.PlanCreatedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "plan.created",
            },
            Topic:        c.Topic,
            Perspectives: c.Perspectives,
            DAGStructure: c.DAGStructure,
            Cost:         c.Cost,
        }

    case StartWorkerCommand:
        event = events.WorkerStartedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "worker.started",
            },
            WorkerID:    c.WorkerID,
            WorkerNum:   c.WorkerNum,
            Objective:   c.Objective,
            Perspective: c.Perspective,
        }

    case CompleteWorkerCommand:
        event = events.WorkerCompletedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "worker.completed",
            },
            WorkerID: c.WorkerID,
            Output:   c.Output,
            Facts:    c.Facts,
            Sources:  c.Sources,
            Cost:     c.Cost,
        }

    case FailWorkerCommand:
        event = events.WorkerFailedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "worker.failed",
            },
            WorkerID: c.WorkerID,
            Error:    c.Error,
        }

    case SetAnalysisCommand:
        event = events.AnalysisCompletedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "analysis.completed",
            },
            ValidatedFacts: c.ValidatedFacts,
            Contradictions: c.Contradictions,
            KnowledgeGaps:  c.KnowledgeGaps,
            Cost:           c.Cost,
        }

    case SetReportCommand:
        event = events.ReportGeneratedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "report.generated",
            },
            Title:       c.Title,
            Summary:     c.Summary,
            FullContent: c.FullContent,
            Citations:   c.Citations,
            Cost:        c.Cost,
        }

    case CompleteResearchCommand:
        event = events.ResearchCompletedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "research.completed",
            },
            Duration:    c.Duration,
            TotalCost:   s.Cost,
            SourceCount: s.countSources(),
        }

    case CancelResearchCommand:
        event = events.ResearchCancelledEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     newVersion,
                Timestamp:   timestamp,
                Type:        "research.cancelled",
            },
            Reason: c.Reason,
        }

    default:
        return nil, fmt.Errorf("unknown command type: %T", cmd)
    }

    // Apply the event to update state
    s.applyUnlocked(event)

    return event, nil
}

func (s *ResearchState) countSources() int {
    count := 0
    for _, w := range s.Workers {
        count += len(w.Sources)
    }
    return count
}
```

#### 4. Event Application

**File**: `go-research/internal/core/domain/aggregate/apply.go`
**Changes**: Apply method that updates state from events

```go
package aggregate

import (
    "go-research/internal/core/domain/events"
)

// Apply updates state from an event (for replay and live updates)
func (s *ResearchState) Apply(event interface{}) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.applyUnlocked(event)
}

func (s *ResearchState) applyUnlocked(event interface{}) {
    switch e := event.(type) {
    case events.ResearchStartedEvent:
        s.Query = e.Query
        s.Mode = e.Mode
        s.Config = e.Config
        s.Status = "planning"
        now := e.Timestamp
        s.StartedAt = &now
        s.Version = e.Version

    case events.PlanCreatedEvent:
        s.Plan = &PlanState{
            Topic:        e.Topic,
            Perspectives: e.Perspectives,
        }
        s.DAG = reconstructDAG(e.DAGStructure)
        s.initializeWorkers(e.Perspectives, e.DAGStructure)
        s.Status = "searching"
        s.Cost.Add(e.Cost)
        s.Version = e.Version

    case events.WorkerStartedEvent:
        if w, ok := s.Workers[e.WorkerID]; ok {
            w.Status = "running"
            now := e.Timestamp
            w.StartedAt = &now
        }
        if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
            node.Status = "running"
        }
        s.Version = e.Version

    case events.WorkerCompletedEvent:
        if w, ok := s.Workers[e.WorkerID]; ok {
            w.Status = "complete"
            w.Output = e.Output
            w.Facts = e.Facts
            w.Sources = e.Sources
            w.Cost = e.Cost
            now := e.Timestamp
            w.CompletedAt = &now
        }
        if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
            node.Status = "complete"
        }
        s.Cost.Add(e.Cost)
        s.updateProgress()
        s.Version = e.Version

    case events.WorkerFailedEvent:
        if w, ok := s.Workers[e.WorkerID]; ok {
            w.Status = "failed"
            w.Error = &e.Error
        }
        if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
            node.Status = "failed"
            node.Error = &e.Error
        }
        s.Version = e.Version

    case events.AnalysisStartedEvent:
        s.Status = "analyzing"
        s.Analysis = &AnalysisState{}
        s.Version = e.Version

    case events.AnalysisCompletedEvent:
        if s.Analysis == nil {
            s.Analysis = &AnalysisState{}
        }
        s.Analysis.ValidatedFacts = e.ValidatedFacts
        s.Analysis.Contradictions = e.Contradictions
        s.Analysis.KnowledgeGaps = e.KnowledgeGaps
        s.Analysis.Cost = e.Cost
        s.Cost.Add(e.Cost)
        s.Status = "synthesizing"
        s.Version = e.Version

    case events.SynthesisStartedEvent:
        s.Status = "synthesizing"
        s.Report = &ReportState{}
        s.Version = e.Version

    case events.ReportGeneratedEvent:
        if s.Report == nil {
            s.Report = &ReportState{}
        }
        s.Report.Title = e.Title
        s.Report.Summary = e.Summary
        s.Report.FullContent = e.FullContent
        s.Report.Citations = e.Citations
        s.Report.Cost = e.Cost
        s.Cost.Add(e.Cost)
        s.Version = e.Version

    case events.ResearchCompletedEvent:
        s.Status = "complete"
        now := e.Timestamp
        s.CompletedAt = &now
        s.Version = e.Version

    case events.ResearchFailedEvent:
        s.Status = "failed"
        now := e.Timestamp
        s.CompletedAt = &now
        s.Version = e.Version

    case events.ResearchCancelledEvent:
        s.Status = "cancelled"
        now := e.Timestamp
        s.CompletedAt = &now
        s.Version = e.Version
    }

    s.uncommittedEvents = append(s.uncommittedEvents, event)
}

func (s *ResearchState) updateProgress() {
    if s.DAG == nil {
        return
    }
    total := len(s.DAG.Nodes)
    completed := 0
    for _, node := range s.DAG.Nodes {
        if node.Status == "complete" {
            completed++
        }
    }
    if total > 0 {
        s.Progress = float64(completed) / float64(total)
    }
}

func reconstructDAG(snapshot events.DAGSnapshot) *DAGState {
    dag := &DAGState{
        Nodes: make(map[string]*DAGNode),
    }
    for _, n := range snapshot.Nodes {
        dag.Nodes[n.ID] = &DAGNode{
            ID:           n.ID,
            TaskType:     n.TaskType,
            Description:  n.Description,
            Dependencies: n.Dependencies,
            Status:       n.Status,
        }
    }
    return dag
}

func (s *ResearchState) initializeWorkers(perspectives []events.Perspective, dag events.DAGSnapshot) {
    for i, p := range perspectives {
        workerID := fmt.Sprintf("search_%d", i)
        s.Workers[workerID] = &WorkerState{
            ID:          workerID,
            WorkerNum:   i + 1,
            Objective:   p.Focus,
            Perspective: p.Name,
            Status:      "pending",
            Facts:       []events.Fact{},
            Sources:     []events.Source{},
        }
    }
}

// Add method for CostBreakdown
func (c *events.CostBreakdown) Add(other events.CostBreakdown) {
    c.InputTokens += other.InputTokens
    c.OutputTokens += other.OutputTokens
    c.TotalTokens += other.TotalTokens
    c.TotalCostUSD += other.TotalCostUSD
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `cd go-research && go build ./internal/core/domain/aggregate/...`
- [x] Unit tests pass: `cd go-research && go test ./internal/core/domain/aggregate/...`

#### Manual Verification:

- [x] Commands validate preconditions correctly
- [x] Events apply to state correctly
- [x] State can be reconstructed from event replay

---

## Phase 4: Event Store

### Overview

Implement the filesystem-based event store adapter. Events are stored as JSON files in a directory structure organized by aggregate ID.

### Changes Required

#### 1. Filesystem Event Store

**File**: `go-research/internal/adapters/storage/filesystem/event_store.go`
**Changes**: Event store implementation

```go
package filesystem

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sort"
    "strings"

    "go-research/internal/core/ports"
)

type EventStore struct {
    baseDir string
}

func NewEventStore(baseDir string) *EventStore {
    os.MkdirAll(baseDir, 0755)
    return &EventStore{baseDir: baseDir}
}

var _ ports.EventStore = (*EventStore)(nil)

func (s *EventStore) eventDir(aggregateID string) string {
    return filepath.Join(s.baseDir, aggregateID, "events")
}

func (s *EventStore) snapshotPath(aggregateID string) string {
    return filepath.Join(s.baseDir, aggregateID, "snapshot.json")
}

func (s *EventStore) AppendEvents(ctx context.Context, aggregateID string, newEvents []ports.Event, expectedVersion int) error {
    dir := s.eventDir(aggregateID)
    if err := os.MkdirAll(dir, 0755); err != nil {
        return fmt.Errorf("create event dir: %w", err)
    }

    // Check expected version (optimistic concurrency)
    existing, err := s.LoadEvents(ctx, aggregateID)
    if err != nil && !os.IsNotExist(err) {
        return err
    }

    currentVersion := 0
    if len(existing) > 0 {
        currentVersion = existing[len(existing)-1].GetVersion()
    }

    if expectedVersion > 0 && currentVersion != expectedVersion {
        return fmt.Errorf("version conflict: expected %d, got %d", expectedVersion, currentVersion)
    }

    // Append each event as a separate JSON file
    for _, event := range newEvents {
        version := event.GetVersion()
        eventType := event.GetType()
        filename := fmt.Sprintf("%06d_%s.json", version, sanitizeFilename(eventType))
        path := filepath.Join(dir, filename)

        data, err := json.MarshalIndent(event, "", "  ")
        if err != nil {
            return fmt.Errorf("marshal event: %w", err)
        }

        if err := os.WriteFile(path, data, 0644); err != nil {
            return fmt.Errorf("write event: %w", err)
        }
    }

    return nil
}

func (s *EventStore) LoadEvents(ctx context.Context, aggregateID string) ([]ports.Event, error) {
    dir := s.eventDir(aggregateID)

    entries, err := os.ReadDir(dir)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil
        }
        return nil, err
    }

    // Sort by filename (version prefix)
    sort.Slice(entries, func(i, j int) bool {
        return entries[i].Name() < entries[j].Name()
    })

    var result []ports.Event
    for _, entry := range entries {
        if !strings.HasSuffix(entry.Name(), ".json") {
            continue
        }

        path := filepath.Join(dir, entry.Name())
        data, err := os.ReadFile(path)
        if err != nil {
            return nil, fmt.Errorf("read event %s: %w", entry.Name(), err)
        }

        event, err := deserializeEvent(data)
        if err != nil {
            return nil, fmt.Errorf("deserialize event %s: %w", entry.Name(), err)
        }

        result = append(result, event)
    }

    return result, nil
}

func (s *EventStore) LoadEventsFrom(ctx context.Context, aggregateID string, fromVersion int) ([]ports.Event, error) {
    allEvents, err := s.LoadEvents(ctx, aggregateID)
    if err != nil {
        return nil, err
    }

    var result []ports.Event
    for _, event := range allEvents {
        if event.GetVersion() > fromVersion {
            result = append(result, event)
        }
    }

    return result, nil
}

func (s *EventStore) LoadSnapshot(ctx context.Context, aggregateID string) (*ports.Snapshot, error) {
    path := s.snapshotPath(aggregateID)

    data, err := os.ReadFile(path)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil
        }
        return nil, err
    }

    var snapshot ports.Snapshot
    if err := json.Unmarshal(data, &snapshot); err != nil {
        return nil, err
    }

    return &snapshot, nil
}

func (s *EventStore) SaveSnapshot(ctx context.Context, aggregateID string, snapshot ports.Snapshot) error {
    path := s.snapshotPath(aggregateID)
    dir := filepath.Dir(path)

    if err := os.MkdirAll(dir, 0755); err != nil {
        return err
    }

    data, err := json.MarshalIndent(snapshot, "", "  ")
    if err != nil {
        return err
    }

    return os.WriteFile(path, data, 0644)
}

func (s *EventStore) GetAllAggregateIDs(ctx context.Context) ([]string, error) {
    entries, err := os.ReadDir(s.baseDir)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil
        }
        return nil, err
    }

    var ids []string
    for _, entry := range entries {
        if entry.IsDir() {
            ids = append(ids, entry.Name())
        }
    }

    return ids, nil
}

func sanitizeFilename(s string) string {
    return strings.ReplaceAll(s, ".", "_")
}
```

#### 2. Event Deserialization

**File**: `go-research/internal/adapters/storage/filesystem/deserialize.go`
**Changes**: Type-based event deserialization

```go
package filesystem

import (
    "encoding/json"
    "fmt"

    "go-research/internal/core/domain/events"
    "go-research/internal/core/ports"
)

func deserializeEvent(data []byte) (ports.Event, error) {
    // First unmarshal to get the type
    var base events.BaseEvent
    if err := json.Unmarshal(data, &base); err != nil {
        return nil, err
    }

    // Then unmarshal to the specific type
    switch base.Type {
    case "research.started":
        var e events.ResearchStartedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "plan.created":
        var e events.PlanCreatedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "worker.started":
        var e events.WorkerStartedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "worker.completed":
        var e events.WorkerCompletedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "worker.failed":
        var e events.WorkerFailedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "analysis.started":
        var e events.AnalysisStartedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "analysis.completed":
        var e events.AnalysisCompletedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "synthesis.started":
        var e events.SynthesisStartedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "report.generated":
        var e events.ReportGeneratedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "research.completed":
        var e events.ResearchCompletedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "research.failed":
        var e events.ResearchFailedEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "research.cancelled":
        var e events.ResearchCancelledEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    case "snapshot.taken":
        var e events.SnapshotTakenEvent
        if err := json.Unmarshal(data, &e); err != nil {
            return nil, err
        }
        return &e, nil

    default:
        return nil, fmt.Errorf("unknown event type: %s", base.Type)
    }
}
```

#### 3. Event Store Tests

**File**: `go-research/internal/adapters/storage/filesystem/event_store_test.go`
**Changes**: Unit tests for event store

```go
package filesystem

import (
    "context"
    "os"
    "path/filepath"
    "testing"
    "time"

    "go-research/internal/core/domain/events"
)

func TestEventStore_AppendAndLoad(t *testing.T) {
    dir := t.TempDir()
    store := NewEventStore(dir)
    ctx := context.Background()

    // Create test event
    event := &events.ResearchStartedEvent{
        BaseEvent: events.BaseEvent{
            ID:          "evt-1",
            AggregateID: "session-123",
            Version:     1,
            Timestamp:   time.Now(),
            Type:        "research.started",
        },
        Query: "test query",
        Mode:  "deep",
    }

    // Append event
    err := store.AppendEvents(ctx, "session-123", []ports.Event{event}, 0)
    if err != nil {
        t.Fatalf("AppendEvents failed: %v", err)
    }

    // Verify file exists
    eventPath := filepath.Join(dir, "session-123", "events", "000001_research_started.json")
    if _, err := os.Stat(eventPath); os.IsNotExist(err) {
        t.Errorf("Event file not created: %s", eventPath)
    }

    // Load events
    loaded, err := store.LoadEvents(ctx, "session-123")
    if err != nil {
        t.Fatalf("LoadEvents failed: %v", err)
    }

    if len(loaded) != 1 {
        t.Errorf("Expected 1 event, got %d", len(loaded))
    }

    // Verify event content
    loadedEvent, ok := loaded[0].(*events.ResearchStartedEvent)
    if !ok {
        t.Fatalf("Expected ResearchStartedEvent, got %T", loaded[0])
    }

    if loadedEvent.Query != "test query" {
        t.Errorf("Expected query 'test query', got '%s'", loadedEvent.Query)
    }
}

func TestEventStore_VersionConflict(t *testing.T) {
    dir := t.TempDir()
    store := NewEventStore(dir)
    ctx := context.Background()

    // Create first event
    event1 := &events.ResearchStartedEvent{
        BaseEvent: events.BaseEvent{
            ID:          "evt-1",
            AggregateID: "session-123",
            Version:     1,
            Timestamp:   time.Now(),
            Type:        "research.started",
        },
    }

    err := store.AppendEvents(ctx, "session-123", []ports.Event{event1}, 0)
    if err != nil {
        t.Fatalf("First append failed: %v", err)
    }

    // Try to append with wrong expected version
    event2 := &events.PlanCreatedEvent{
        BaseEvent: events.BaseEvent{
            ID:          "evt-2",
            AggregateID: "session-123",
            Version:     2,
            Timestamp:   time.Now(),
            Type:        "plan.created",
        },
    }

    err = store.AppendEvents(ctx, "session-123", []ports.Event{event2}, 0) // Wrong: should be 1
    if err == nil {
        t.Error("Expected version conflict error")
    }
}

func TestEventStore_GetAllAggregateIDs(t *testing.T) {
    dir := t.TempDir()
    store := NewEventStore(dir)
    ctx := context.Background()

    // Create events for multiple aggregates
    for _, id := range []string{"session-1", "session-2", "session-3"} {
        event := &events.ResearchStartedEvent{
            BaseEvent: events.BaseEvent{
                ID:          "evt-" + id,
                AggregateID: id,
                Version:     1,
                Type:        "research.started",
            },
        }
        store.AppendEvents(ctx, id, []ports.Event{event}, 0)
    }

    // Get all IDs
    ids, err := store.GetAllAggregateIDs(ctx)
    if err != nil {
        t.Fatalf("GetAllAggregateIDs failed: %v", err)
    }

    if len(ids) != 3 {
        t.Errorf("Expected 3 IDs, got %d", len(ids))
    }
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `cd go-research && go build ./internal/adapters/storage/...`
- [x] Tests pass: `cd go-research && go test ./internal/adapters/storage/...`

#### Manual Verification:

- [x] Events persist to disk as JSON files
- [x] Events load correctly with type discrimination
- [x] Version conflict detection works

---

## Phase 5: Orchestrator Integration

### Overview

Create a new event-sourced orchestrator that uses the ResearchState aggregate and persists events via the event store. This runs alongside the existing orchestrator during migration.

### Changes Required

#### 1. Event-Sourced Deep Orchestrator

**File**: `go-research/internal/orchestrator/deep_eventsourced.go`
**Changes**: New orchestrator with event sourcing

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
    "go-research/internal/core/domain/aggregate"
    "go-research/internal/core/domain/events"
    "go-research/internal/core/ports"
    "go-research/internal/llm"
    "go-research/internal/planning"
    "go-research/internal/tools"
)

// DeepOrchestratorES is the event-sourced version of DeepOrchestrator
type DeepOrchestratorES struct {
    eventStore     ports.EventStore
    eventBus       *events.Bus // Keep existing bus for UI updates
    appConfig      *config.Config
    client         llm.ChatClient
    contextMgr     *ctxmgr.Manager
    planner        *planning.Planner
    searchAgent    *agents.SearchAgent
    analysisAgent  *agents.AnalysisAgent
    synthesisAgent *agents.SynthesisAgent
    tools          tools.ToolExecutor
}

// NewDeepOrchestratorES creates a new event-sourced deep research orchestrator
func NewDeepOrchestratorES(
    eventStore ports.EventStore,
    bus *events.Bus,
    cfg *config.Config,
) *DeepOrchestratorES {
    client := llm.NewClient(cfg)
    toolReg := tools.NewRegistry(cfg.BraveAPIKey)

    return &DeepOrchestratorES{
        eventStore:     eventStore,
        eventBus:       bus,
        appConfig:      cfg,
        client:         client,
        contextMgr:     ctxmgr.New(client, ctxmgr.DefaultConfig()),
        planner:        planning.NewPlanner(client),
        searchAgent:    agents.NewSearchAgent(client, toolReg, bus, agents.DefaultSearchConfig()),
        analysisAgent:  agents.NewAnalysisAgentWithBus(client, bus),
        synthesisAgent: agents.NewSynthesisAgentWithBus(client, bus),
        tools:          toolReg,
    }
}

// Research executes deep research with full event sourcing
func (o *DeepOrchestratorES) Research(ctx context.Context, sessionID string, query string) (*aggregate.ResearchState, error) {
    // Create or load state
    state, err := o.loadOrCreateState(ctx, sessionID, query)
    if err != nil {
        return nil, err
    }

    // Execute from current state
    return o.continueResearch(ctx, state)
}

// Resume continues an interrupted research
func (o *DeepOrchestratorES) Resume(ctx context.Context, sessionID string) (*aggregate.ResearchState, error) {
    state, err := o.loadState(ctx, sessionID)
    if err != nil {
        return nil, err
    }

    return o.continueResearch(ctx, state)
}

func (o *DeepOrchestratorES) loadOrCreateState(ctx context.Context, sessionID string, query string) (*aggregate.ResearchState, error) {
    // Try to load existing
    existingEvents, err := o.eventStore.LoadEvents(ctx, sessionID)
    if err != nil {
        return nil, err
    }

    if len(existingEvents) > 0 {
        // Convert ports.Event to interface{}
        eventInterfaces := make([]interface{}, len(existingEvents))
        for i, e := range existingEvents {
            eventInterfaces[i] = e
        }
        return aggregate.LoadFromEvents(sessionID, eventInterfaces)
    }

    // Create new
    state := aggregate.NewResearchState(sessionID)

    // Execute start command
    event, err := state.Execute(aggregate.StartResearchCommand{
        Query: query,
        Mode:  "deep",
        Config: events.ResearchConfig{
            MaxWorkers: o.appConfig.MaxWorkers,
        },
    })
    if err != nil {
        return nil, err
    }

    // Persist event
    if err := o.persistEvent(ctx, state, event); err != nil {
        return nil, err
    }

    // Publish for UI
    o.publishUIEvent(event)

    return state, nil
}

func (o *DeepOrchestratorES) loadState(ctx context.Context, sessionID string) (*aggregate.ResearchState, error) {
    // Try snapshot first
    snapshot, err := o.eventStore.LoadSnapshot(ctx, sessionID)
    if err != nil {
        return nil, err
    }

    if snapshot != nil {
        // Load events after snapshot
        subsequentEvents, err := o.eventStore.LoadEventsFrom(ctx, sessionID, snapshot.Version)
        if err != nil {
            return nil, err
        }
        // Reconstruct from snapshot + events
        // (Implementation depends on snapshot format)
    }

    // Full replay
    allEvents, err := o.eventStore.LoadEvents(ctx, sessionID)
    if err != nil {
        return nil, err
    }

    eventInterfaces := make([]interface{}, len(allEvents))
    for i, e := range allEvents {
        eventInterfaces[i] = e
    }
    return aggregate.LoadFromEvents(sessionID, eventInterfaces)
}

func (o *DeepOrchestratorES) continueResearch(ctx context.Context, state *aggregate.ResearchState) (*aggregate.ResearchState, error) {
    // Continue from current status
    switch state.Status {
    case "pending", "planning":
        if err := o.executePlanning(ctx, state); err != nil {
            return state, err
        }
        fallthrough

    case "searching":
        if err := o.executeDAG(ctx, state); err != nil {
            return state, err
        }
        fallthrough

    case "analyzing":
        if err := o.executeAnalysis(ctx, state); err != nil {
            return state, err
        }
        fallthrough

    case "synthesizing":
        if err := o.executeSynthesis(ctx, state); err != nil {
            return state, err
        }

    case "complete":
        return state, nil

    case "failed", "cancelled":
        return state, fmt.Errorf("research in terminal state: %s", state.Status)
    }

    // Mark complete
    event, _ := state.Execute(aggregate.CompleteResearchCommand{
        Duration: time.Since(*state.StartedAt),
    })
    o.persistEvent(ctx, state, event)
    o.publishUIEvent(event)

    // Take snapshot every 20 events for faster future loads
    if state.Version%20 == 0 {
        o.saveSnapshot(ctx, state)
    }

    return state, nil
}

func (o *DeepOrchestratorES) executePlanning(ctx context.Context, state *aggregate.ResearchState) error {
    plan, err := o.planner.CreatePlan(ctx, state.Query)
    if err != nil {
        return err
    }

    // Convert to event format
    perspectives := make([]events.Perspective, len(plan.Perspectives))
    for i, p := range plan.Perspectives {
        perspectives[i] = events.Perspective{
            Name:      p.Name,
            Focus:     p.Focus,
            Questions: p.Questions,
        }
    }

    dagSnapshot := buildDAGSnapshotFromPlan(plan.DAG)

    // Execute command
    event, err := state.Execute(aggregate.SetPlanCommand{
        Topic:        plan.Topic,
        Perspectives: perspectives,
        DAGStructure: dagSnapshot,
        Cost: events.CostBreakdown{
            InputTokens:  plan.Cost.InputTokens,
            OutputTokens: plan.Cost.OutputTokens,
            TotalTokens:  plan.Cost.TotalTokens,
            TotalCostUSD: plan.Cost.TotalCost,
        },
    })
    if err != nil {
        return err
    }

    o.persistEvent(ctx, state, event)
    o.publishUIEvent(event)

    return nil
}

func (o *DeepOrchestratorES) executeDAG(ctx context.Context, state *aggregate.ResearchState) error {
    // Execute workers based on DAG state
    for {
        readyNodes := o.getReadyNodes(state)
        if len(readyNodes) == 0 {
            if o.allNodesComplete(state) {
                return nil
            }
            time.Sleep(100 * time.Millisecond)
            continue
        }

        var wg sync.WaitGroup
        for _, node := range readyNodes {
            wg.Add(1)
            go func(n *aggregate.DAGNode) {
                defer wg.Done()
                o.executeNode(ctx, state, n)
            }(node)
        }
        wg.Wait()

        select {
        case <-ctx.Done():
            event, _ := state.Execute(aggregate.CancelResearchCommand{
                Reason: ctx.Err().Error(),
            })
            o.persistEvent(ctx, state, event)
            return ctx.Err()
        default:
        }
    }
}

func (o *DeepOrchestratorES) executeNode(ctx context.Context, state *aggregate.ResearchState, node *aggregate.DAGNode) {
    // Emit worker started
    event, _ := state.Execute(aggregate.StartWorkerCommand{
        WorkerID:    node.ID,
        WorkerNum:   extractWorkerNum(node.ID),
        Objective:   node.Description,
        Perspective: o.getPerspectiveForNode(state, node.ID),
    })
    o.persistEvent(ctx, state, event)
    o.publishUIEvent(event)

    // Execute search
    perspective := o.buildPerspective(state, node.ID)
    result, err := o.searchAgent.Search(ctx, node.Description, perspective)

    if err != nil {
        event, _ := state.Execute(aggregate.FailWorkerCommand{
            WorkerID: node.ID,
            Error:    err.Error(),
        })
        o.persistEvent(ctx, state, event)
        o.publishUIEvent(event)
        return
    }

    // Convert result to event format
    facts := make([]events.Fact, len(result.Facts))
    for i, f := range result.Facts {
        facts[i] = events.Fact{
            Content:    f.Content,
            Confidence: f.Confidence,
            SourceURL:  f.SourceURL,
        }
    }

    sources := make([]events.Source, len(result.Sources))
    for i, s := range result.Sources {
        sources[i] = events.Source{
            URL:     s.URL,
            Title:   s.Title,
            Snippet: s.Snippet,
        }
    }

    // Emit worker completed
    event, _ = state.Execute(aggregate.CompleteWorkerCommand{
        WorkerID: node.ID,
        Output:   result.Output,
        Facts:    facts,
        Sources:  sources,
        Cost: events.CostBreakdown{
            InputTokens:  result.Cost.InputTokens,
            OutputTokens: result.Cost.OutputTokens,
            TotalTokens:  result.Cost.TotalTokens,
            TotalCostUSD: result.Cost.TotalCost,
        },
    })
    o.persistEvent(ctx, state, event)
    o.publishUIEvent(event)
}

func (o *DeepOrchestratorES) executeAnalysis(ctx context.Context, state *aggregate.ResearchState) error {
    // Collect facts from workers
    var allFacts []agents.Fact
    for _, w := range state.Workers {
        for _, f := range w.Facts {
            allFacts = append(allFacts, agents.Fact{
                Content:    f.Content,
                Confidence: f.Confidence,
                SourceURL:  f.SourceURL,
            })
        }
    }

    if len(allFacts) == 0 {
        return nil
    }

    result, err := o.analysisAgent.Analyze(ctx, state.Query, allFacts, nil)
    if err != nil {
        // Continue without analysis
        result = &agents.AnalysisResult{}
    }

    // Convert to event format
    validatedFacts := make([]events.ValidatedFact, len(result.ValidatedFacts))
    for i, f := range result.ValidatedFacts {
        validatedFacts[i] = events.ValidatedFact{
            Content:        f.Content,
            Confidence:     f.Confidence,
            CorroboratedBy: f.CorroboratedBy,
        }
    }

    contradictions := make([]events.Contradiction, len(result.Contradictions))
    for i, c := range result.Contradictions {
        contradictions[i] = events.Contradiction{
            Fact1:       c.Fact1,
            Fact2:       c.Fact2,
            Description: c.Description,
        }
    }

    gaps := make([]events.KnowledgeGap, len(result.KnowledgeGaps))
    for i, g := range result.KnowledgeGaps {
        gaps[i] = events.KnowledgeGap{
            Description:      g.Description,
            Importance:       g.Importance,
            SuggestedQueries: g.SuggestedQueries,
        }
    }

    event, err := state.Execute(aggregate.SetAnalysisCommand{
        ValidatedFacts: validatedFacts,
        Contradictions: contradictions,
        KnowledgeGaps:  gaps,
        Cost: events.CostBreakdown{
            InputTokens:  result.Cost.InputTokens,
            OutputTokens: result.Cost.OutputTokens,
            TotalTokens:  result.Cost.TotalTokens,
            TotalCostUSD: result.Cost.TotalCost,
        },
    })
    if err != nil {
        return err
    }

    o.persistEvent(ctx, state, event)
    o.publishUIEvent(event)

    return nil
}

func (o *DeepOrchestratorES) executeSynthesis(ctx context.Context, state *aggregate.ResearchState) error {
    // Build plan from state
    plan := o.buildPlanFromState(state)
    searchResults := o.buildSearchResultsFromState(state)
    analysisResult := o.buildAnalysisResultFromState(state)

    report, err := o.synthesisAgent.Synthesize(ctx, plan, searchResults, analysisResult)
    if err != nil {
        return err
    }

    citations := make([]events.Citation, len(report.Citations))
    for i, c := range report.Citations {
        citations[i] = events.Citation{
            ID:    c.ID,
            URL:   c.URL,
            Title: c.Title,
        }
    }

    event, err := state.Execute(aggregate.SetReportCommand{
        Title:       report.Title,
        Summary:     report.Summary,
        FullContent: report.FullContent,
        Citations:   citations,
        Cost: events.CostBreakdown{
            InputTokens:  report.Cost.InputTokens,
            OutputTokens: report.Cost.OutputTokens,
            TotalTokens:  report.Cost.TotalTokens,
            TotalCostUSD: report.Cost.TotalCost,
        },
    })
    if err != nil {
        return err
    }

    o.persistEvent(ctx, state, event)
    o.publishUIEvent(event)

    return nil
}

func (o *DeepOrchestratorES) persistEvent(ctx context.Context, state *aggregate.ResearchState, event interface{}) error {
    // Convert to ports.Event interface
    e, ok := event.(ports.Event)
    if !ok {
        return fmt.Errorf("event does not implement ports.Event")
    }

    return o.eventStore.AppendEvents(ctx, state.ID, []ports.Event{e}, state.Version-1)
}

func (o *DeepOrchestratorES) publishUIEvent(event interface{}) {
    // Convert domain event to UI event and publish
    // This keeps the existing visualizer working
    // (Implementation maps domain events to existing event types)
}

func (o *DeepOrchestratorES) saveSnapshot(ctx context.Context, state *aggregate.ResearchState) {
    snapshot := ports.Snapshot{
        AggregateID: state.ID,
        Version:     state.Version,
        Timestamp:   time.Now(),
    }
    // Serialize state to snapshot.Data
    o.eventStore.SaveSnapshot(ctx, state.ID, snapshot)
}

// Helper functions
func (o *DeepOrchestratorES) getReadyNodes(state *aggregate.ResearchState) []*aggregate.DAGNode { /* ... */ }
func (o *DeepOrchestratorES) allNodesComplete(state *aggregate.ResearchState) bool { /* ... */ }
func extractWorkerNum(nodeID string) int { /* ... */ }
func (o *DeepOrchestratorES) getPerspectiveForNode(state *aggregate.ResearchState, nodeID string) string { /* ... */ }
func (o *DeepOrchestratorES) buildPerspective(state *aggregate.ResearchState, nodeID string) *planning.Perspective { /* ... */ }
func buildDAGSnapshotFromPlan(dag *planning.ResearchDAG) events.DAGSnapshot { /* ... */ }
func (o *DeepOrchestratorES) buildPlanFromState(state *aggregate.ResearchState) *planning.ResearchPlan { /* ... */ }
func (o *DeepOrchestratorES) buildSearchResultsFromState(state *aggregate.ResearchState) map[string]*agents.SearchResult { /* ... */ }
func (o *DeepOrchestratorES) buildAnalysisResultFromState(state *aggregate.ResearchState) *agents.AnalysisResult { /* ... */ }
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `cd go-research && go build ./internal/orchestrator/...`
- [x] Tests pass: `cd go-research && go test ./internal/orchestrator/...`

#### Manual Verification:

- [x] Events persist during research execution
- [x] Research can be interrupted and state is preserved
- [x] State can be reconstructed from events

---

## Phase 6: Resume & Migration

### Overview

Add CLI commands for resuming research and migrating legacy sessions. This phase completes the user-facing functionality.

### Changes Required

#### 1. Resume Handler

**File**: `go-research/internal/repl/handlers/resume.go`
**Changes**: CLI handler for resume command

```go
package handlers

import (
    "fmt"
    "strings"

    "go-research/internal/orchestrator"
    "go-research/internal/repl"
)

// ResumeHandler handles /resume commands
type ResumeHandler struct {
    orchestrator *orchestrator.DeepOrchestratorES
}

func NewResumeHandler(orch *orchestrator.DeepOrchestratorES) *ResumeHandler {
    return &ResumeHandler{orchestrator: orch}
}

func (h *ResumeHandler) Handle(ctx *repl.Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /resume <session-id>")
    }

    sessionID := args[0]

    // Start visualization
    vis := repl.NewVisualizer(ctx.Renderer, ctx.Events)
    vis.Start()
    defer vis.Stop()

    // Resume research
    state, err := h.orchestrator.Resume(ctx.RunContext, sessionID)
    if err != nil {
        return fmt.Errorf("resume failed: %w", err)
    }

    // Render result
    if state.Report != nil {
        ctx.Renderer.RenderReport(state.Report)
    }

    ctx.Renderer.Printf("\nResearch %s completed successfully.\n", sessionID)
    ctx.Renderer.Printf("Status: %s | Progress: %.0f%% | Cost: $%.4f\n",
        state.Status, state.Progress*100, state.Cost.TotalCostUSD)

    return nil
}

func (h *ResumeHandler) Name() string { return "resume" }
func (h *ResumeHandler) Description() string { return "Resume an interrupted research session" }
func (h *ResumeHandler) Usage() string { return "/resume <session-id>" }
```

#### 2. Session List with Event Store

**File**: `go-research/internal/repl/handlers/sessions_es.go`
**Changes**: Updated session list using event store

```go
package handlers

import (
    "fmt"
    "time"

    "go-research/internal/core/domain/aggregate"
    "go-research/internal/core/ports"
    "go-research/internal/repl"
)

// SessionsESHandler handles /sessions with event-sourced storage
type SessionsESHandler struct {
    eventStore ports.EventStore
}

func NewSessionsESHandler(store ports.EventStore) *SessionsESHandler {
    return &SessionsESHandler{eventStore: store}
}

func (h *SessionsESHandler) Handle(ctx *repl.Context, args []string) error {
    ids, err := h.eventStore.GetAllAggregateIDs(ctx.RunContext)
    if err != nil {
        return err
    }

    if len(ids) == 0 {
        ctx.Renderer.Println("No sessions found.")
        return nil
    }

    ctx.Renderer.Println("\nAvailable sessions:\n")

    for _, id := range ids {
        // Load minimal info from events
        events, err := h.eventStore.LoadEvents(ctx.RunContext, id)
        if err != nil {
            continue
        }

        if len(events) == 0 {
            continue
        }

        // Reconstruct state for display
        eventInterfaces := make([]interface{}, len(events))
        for i, e := range events {
            eventInterfaces[i] = e
        }
        state, err := aggregate.LoadFromEvents(id, eventInterfaces)
        if err != nil {
            continue
        }

        statusIcon := getStatusIcon(state.Status)
        ctx.Renderer.Printf("  %s %s - %s\n", statusIcon, id, truncate(state.Query, 50))
        ctx.Renderer.Printf("    Status: %s | Progress: %.0f%% | Cost: $%.4f\n",
            state.Status, state.Progress*100, state.Cost.TotalCostUSD)
    }

    ctx.Renderer.Println("\nUse /resume <session-id> to continue interrupted research")
    return nil
}

func getStatusIcon(status string) string {
    switch status {
    case "complete":
        return "✓"
    case "failed":
        return "✗"
    case "cancelled":
        return "⊘"
    default:
        return "◐" // In progress
    }
}

func truncate(s string, max int) string {
    if len(s) <= max {
        return s
    }
    return s[:max-3] + "..."
}

func (h *SessionsESHandler) Name() string { return "sessions" }
func (h *SessionsESHandler) Description() string { return "List all research sessions" }
func (h *SessionsESHandler) Usage() string { return "/sessions" }
```

#### 3. Legacy Session Migration

**File**: `go-research/internal/adapters/storage/migration/legacy.go`
**Changes**: Migrate legacy JSON sessions to event store

```go
package migration

import (
    "context"
    "encoding/json"
    "os"
    "path/filepath"
    "strings"
    "time"

    "github.com/google/uuid"
    "go-research/internal/core/domain/events"
    "go-research/internal/core/ports"
    "go-research/internal/session"
)

// LegacyMigrator migrates old JSON sessions to event store
type LegacyMigrator struct {
    legacyDir  string
    eventStore ports.EventStore
}

func NewLegacyMigrator(legacyDir string, eventStore ports.EventStore) *LegacyMigrator {
    return &LegacyMigrator{
        legacyDir:  legacyDir,
        eventStore: eventStore,
    }
}

// MigrateAll migrates all legacy sessions
func (m *LegacyMigrator) MigrateAll(ctx context.Context) ([]string, []error) {
    var migrated []string
    var errors []error

    entries, err := os.ReadDir(m.legacyDir)
    if err != nil {
        return nil, []error{err}
    }

    for _, entry := range entries {
        if !strings.HasSuffix(entry.Name(), ".json") {
            continue
        }
        if entry.Name() == ".last" {
            continue
        }

        id := strings.TrimSuffix(entry.Name(), ".json")
        if err := m.MigrateSession(ctx, id); err != nil {
            errors = append(errors, err)
        } else {
            migrated = append(migrated, id)
        }
    }

    return migrated, errors
}

// MigrateSession migrates a single legacy session
func (m *LegacyMigrator) MigrateSession(ctx context.Context, id string) error {
    // Check if already migrated
    existing, _ := m.eventStore.LoadEvents(ctx, id)
    if len(existing) > 0 {
        return nil // Already migrated
    }

    // Load legacy session
    path := filepath.Join(m.legacyDir, id+".json")
    data, err := os.ReadFile(path)
    if err != nil {
        return err
    }

    var legacySession session.Session
    if err := json.Unmarshal(data, &legacySession); err != nil {
        return err
    }

    // Convert to events
    eventList := m.convertToEvents(&legacySession)

    // Persist events
    for i, event := range eventList {
        if err := m.eventStore.AppendEvents(ctx, id, []ports.Event{event}, i); err != nil {
            return err
        }
    }

    return nil
}

func (m *LegacyMigrator) convertToEvents(sess *session.Session) []ports.Event {
    var eventList []ports.Event
    version := 0

    // 1. ResearchStarted
    version++
    eventList = append(eventList, &events.ResearchStartedEvent{
        BaseEvent: events.BaseEvent{
            ID:          uuid.New().String(),
            AggregateID: sess.ID,
            Version:     version,
            Timestamp:   sess.CreatedAt,
            Type:        "research.started",
        },
        Query: sess.Query,
        Mode:  string(sess.Mode),
    })

    // 2. PlanCreated (if we have workers)
    if len(sess.Workers) > 0 {
        version++
        perspectives := make([]events.Perspective, len(sess.Workers))
        dagNodes := make([]events.DAGNodeSnapshot, len(sess.Workers))

        for i, w := range sess.Workers {
            perspectives[i] = events.Perspective{
                Name:  fmt.Sprintf("Worker %d", w.WorkerNum),
                Focus: w.Objective,
            }
            dagNodes[i] = events.DAGNodeSnapshot{
                ID:          w.ID,
                TaskType:    "search",
                Description: w.Objective,
                Status:      string(w.Status),
            }
        }

        eventList = append(eventList, &events.PlanCreatedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: sess.ID,
                Version:     version,
                Timestamp:   sess.CreatedAt,
                Type:        "plan.created",
            },
            Topic:        sess.Query,
            Perspectives: perspectives,
            DAGStructure: events.DAGSnapshot{Nodes: dagNodes},
        })
    }

    // 3. Worker events
    for _, w := range sess.Workers {
        // WorkerStarted
        version++
        eventList = append(eventList, &events.WorkerStartedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: sess.ID,
                Version:     version,
                Timestamp:   w.StartedAt,
                Type:        "worker.started",
            },
            WorkerID:  w.ID,
            WorkerNum: w.WorkerNum,
            Objective: w.Objective,
        })

        // WorkerCompleted or WorkerFailed
        if w.Status == session.WorkerComplete {
            version++
            sources := make([]events.Source, len(w.Sources))
            for i, s := range w.Sources {
                sources[i] = events.Source{URL: s}
            }

            eventList = append(eventList, &events.WorkerCompletedEvent{
                BaseEvent: events.BaseEvent{
                    ID:          uuid.New().String(),
                    AggregateID: sess.ID,
                    Version:     version,
                    Timestamp:   *w.CompletedAt,
                    Type:        "worker.completed",
                },
                WorkerID: w.ID,
                Output:   w.FinalOutput,
                Sources:  sources,
                Cost: events.CostBreakdown{
                    InputTokens:  w.Cost.InputTokens,
                    OutputTokens: w.Cost.OutputTokens,
                    TotalTokens:  w.Cost.TotalTokens,
                    TotalCostUSD: w.Cost.TotalCost,
                },
            })
        } else if w.Status == session.WorkerFailed && w.Error != nil {
            version++
            eventList = append(eventList, &events.WorkerFailedEvent{
                BaseEvent: events.BaseEvent{
                    ID:          uuid.New().String(),
                    AggregateID: sess.ID,
                    Version:     version,
                    Timestamp:   time.Now(),
                    Type:        "worker.failed",
                },
                WorkerID: w.ID,
                Error:    *w.Error,
            })
        }
    }

    // 4. Report (if exists)
    if sess.Report != "" {
        version++
        eventList = append(eventList, &events.ReportGeneratedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: sess.ID,
                Version:     version,
                Timestamp:   sess.UpdatedAt,
                Type:        "report.generated",
            },
            Title:       sess.Query,
            FullContent: sess.Report,
        })
    }

    // 5. Completion
    if sess.Status == session.StatusComplete {
        version++
        eventList = append(eventList, &events.ResearchCompletedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: sess.ID,
                Version:     version,
                Timestamp:   sess.UpdatedAt,
                Type:        "research.completed",
            },
            TotalCost: events.CostBreakdown{
                InputTokens:  sess.Cost.InputTokens,
                OutputTokens: sess.Cost.OutputTokens,
                TotalTokens:  sess.Cost.TotalTokens,
                TotalCostUSD: sess.Cost.TotalCost,
            },
        })
    }

    return eventList
}
```

#### 4. Wire Everything in main.go

**File**: `go-research/cmd/research/main.go`
**Changes**: Wire event-sourced components

```go
// Add to existing main.go

import (
    "go-research/internal/adapters/storage/filesystem"
    "go-research/internal/adapters/storage/migration"
    "go-research/internal/orchestrator"
)

func main() {
    cfg := config.Load()

    // ... existing setup ...

    // Create event store
    eventStore := filesystem.NewEventStore(filepath.Join(cfg.StateDir, "events"))

    // Run legacy migration if needed
    if cfg.MigrateLegacySessions {
        migrator := migration.NewLegacyMigrator(cfg.StateDir, eventStore)
        migrated, errs := migrator.MigrateAll(context.Background())
        if len(migrated) > 0 {
            log.Printf("Migrated %d legacy sessions", len(migrated))
        }
        for _, err := range errs {
            log.Printf("Migration error: %v", err)
        }
    }

    // Create event-sourced orchestrator
    deepOrchES := orchestrator.NewDeepOrchestratorES(eventStore, bus, cfg)

    // Register handlers
    router.Register(handlers.NewResumeHandler(deepOrchES))
    router.Register(handlers.NewSessionsESHandler(eventStore))

    // ... rest of main ...
}
```

### Success Criteria

#### Automated Verification:

- [x] Build succeeds: `cd go-research && go build ./...`
- [x] Tests pass: `cd go-research && go test ./...`
- [x] Type check passes: `cd go-research && go vet ./...`

#### Manual Verification:

- [x] `/resume <session-id>` continues interrupted research
- [x] `/sessions-es` shows all event-sourced sessions
- [x] Legacy sessions can be migrated
- [x] New research creates events in event store

---

## Testing Strategy

### Unit Tests

- `internal/core/domain/aggregate/*_test.go` - Aggregate command/event tests
- `internal/adapters/storage/filesystem/*_test.go` - Event store tests
- `internal/adapters/storage/migration/*_test.go` - Migration tests

### Integration Tests

- `internal/e2e/eventsourced_test.go` - Full research flow with event persistence
- `internal/e2e/resume_test.go` - Interrupt and resume scenarios

### Manual Testing Steps

1. Start deep research: `/deep "quantum computing"`
2. Interrupt with Ctrl+C during worker execution
3. Check events directory has persisted events
4. Resume: `/resume <session-id>`
5. Verify research continues from where it stopped
6. Verify final report is generated

---

## Performance Considerations

### Snapshot Strategy

- Take snapshots every 20 events (configurable)
- Snapshots stored alongside events in session directory
- On load: try snapshot first, then replay subsequent events

### Event File Size

- Each event ~1-5 KB JSON
- Typical session: 10-50 events = 50-250 KB total
- Snapshots compress state to single file

### Memory Usage

- State kept in memory during research
- Events cleared after persistence
- Snapshot reduces replay memory on load

---

## Migration Notes

### Breaking Changes

None - this is additive. Legacy sessions can be migrated.

### Configuration

Add to config:

```go
type Config struct {
    // ... existing ...
    EventStoreDir          string // Default: <StateDir>/events
    MigrateLegacySessions  bool   // Default: true on first run
    SnapshotInterval       int    // Default: 20 events
}
```

### Rollback

If issues occur:

1. Legacy sessions still exist in original location
2. Event store can be deleted to revert
3. Old orchestrator remains available

---

## References

- Research document: `thoughts/shared/research/2025-12-01_event-sourced-storage-architecture.md`
- Hexagonal plan: `thoughts/shared/plans/go-research-hexagonal-refactoring.md`
- Current orchestrator: `go-research/internal/orchestrator/deep.go`
- Current events: `go-research/internal/events/types.go`
- Current session: `go-research/internal/session/session.go`
