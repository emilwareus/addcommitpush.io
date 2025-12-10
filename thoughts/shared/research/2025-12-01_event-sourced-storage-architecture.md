---
date: 2025-12-01T12:00:00+01:00
researcher: Claude
git_commit: 389794cff579752d9f38f5df80b0da22ab1c6e24
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: 'Event-Sourced Adapter-Based Storage Architecture for Interruptible Agents'
tags: [research, architecture, event-sourcing, storage, adapters, interruptible-agents, go-research]
status: complete
last_updated: 2025-12-01
last_updated_by: Claude
---

# Research: Event-Sourced Adapter-Based Storage Architecture

**Date**: 2025-12-01T12:00:00+01:00
**Researcher**: Claude
**Git Commit**: 389794cff579752d9f38f5df80b0da22ab1c6e24
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Research Question

How to move storage to an adapter-based system that:

1. Mirrors state with extra information (metadata, timestamps, audit trail)
2. Keeps "memory" that can be paused and restored from any point (interruptible agent)
3. Allows the agent to pick up work where it left off
4. Uses event-based updates (not direct writes) where `UpdateState(xxx)` updates in-memory state AND fires domain events
5. Storage handlers subscribe to events and persist to pluggable backends (Obsidian, PostgreSQL, etc.)
6. Applies to ALL storage including the report

## Summary

The proposed architecture introduces **Event Sourcing** for agent state management, enabling complete interruptibility and resumability. Instead of mutating state directly, all state changes flow through **state commands** that emit **domain events**. These events:

1. **Update in-memory state** (the aggregate/state machine)
2. **Fire on the event bus** for subscribers
3. **Get persisted to an event store** by storage handlers
4. **Can be replayed** to reconstruct state at any point

The architecture uses a **port/adapter pattern** for pluggable storage backends, with interfaces defining the contract and adapters implementing for Obsidian, PostgreSQL, S3, or any other backend.

---

## Part 1: Current State Analysis

### 1.1 Current Architecture Problems

| Problem                     | Current State                            | Impact                               |
| --------------------------- | ---------------------------------------- | ------------------------------------ |
| **No State Persistence**    | State is local variables in `Research()` | Cannot resume interrupted research   |
| **No Event Log**            | Events are fire-and-forget               | Cannot replay or audit state changes |
| **Direct State Mutation**   | `plan.DAG.SetStatus()` mutates directly  | No history, no undo capability       |
| **Session-Centric Storage** | Only saves complete sessions             | Partial progress lost on failure     |
| **Tight Storage Coupling**  | JSON filesystem hardcoded                | Cannot swap backends easily          |

### 1.2 Key Files to Transform

| File                            | Current Role               | New Role                          |
| ------------------------------- | -------------------------- | --------------------------------- |
| `internal/events/bus.go`        | Fire-and-forget pub/sub    | Event bus + persistence trigger   |
| `internal/events/types.go`      | UI progress events         | Domain events (state changes)     |
| `internal/session/session.go`   | Domain + storage conflated | Pure domain aggregate             |
| `internal/session/store.go`     | Direct JSON persistence    | Event store + projection          |
| `internal/orchestrator/deep.go` | Stateless coordinator      | State machine with event sourcing |

---

## Part 2: Event Sourcing Architecture

### 2.1 Core Concepts for Agent State

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         EVENT SOURCING FOR AGENTS                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  COMMAND                    AGGREGATE                    EVENT                  │
│  (Intent)                   (State Machine)              (Fact)                 │
│                                                                                 │
│  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐          │
│  │ StartResearch│    ──▶   │ ResearchState│    ──▶   │ResearchStarted│         │
│  │ UpdateDAGNode│    ──▶   │  • Query     │    ──▶   │DAGNodeUpdated│          │
│  │ CompleteWorker│   ──▶   │  • DAGState  │    ──▶   │WorkerCompleted│         │
│  │ AddFacts     │    ──▶   │  • Workers   │    ──▶   │FactsAdded    │          │
│  │ SetReport    │    ──▶   │  • Report    │    ──▶   │ReportSet     │          │
│  └──────────────┘          └──────────────┘          └──────────────┘          │
│                                   │                         │                   │
│                                   │                         ▼                   │
│                                   │               ┌──────────────────┐          │
│                                   │               │   EVENT STORE    │          │
│                                   │               │  (Append-only)   │          │
│                                   │               └────────┬─────────┘          │
│                                   │                        │                    │
│                                   │         ┌──────────────┼──────────────┐     │
│                                   │         ▼              ▼              ▼     │
│                                   │   ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│                                   │   │ Obsidian │  │PostgreSQL│  │ S3/File  │ │
│                                   │   │ Adapter  │  │ Adapter  │  │ Adapter  │ │
│                                   │   └──────────┘  └──────────┘  └──────────┘ │
│                                   │                                             │
│         STATE RECONSTRUCTION      │                                             │
│         ┌─────────────────────────┼─────────────────────────────────────────┐  │
│         │                         ▼                                          │  │
│         │   Events[] ──replay──▶ Empty State ──apply──▶ Current State       │  │
│         │   [E1, E2, E3, ...]     { }                  { query, dag, ... }   │  │
│         └───────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 State Change Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           STATE CHANGE FLOW                                   │
│                                                                              │
│  1. COMMAND ISSUED                                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ state.Execute(CompleteWorkerCommand{                                │  │
│     │     WorkerID: "search_0",                                           │  │
│     │     Result:   searchResult,                                         │  │
│     │ })                                                                  │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  2. AGGREGATE VALIDATES & CREATES EVENT                                      │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ func (s *ResearchState) Execute(cmd Command) (Event, error) {       │  │
│     │     // Validate preconditions                                       │  │
│     │     if s.DAG.GetNode(cmd.WorkerID).Status != StatusRunning {        │  │
│     │         return nil, ErrInvalidTransition                            │  │
│     │     }                                                               │  │
│     │     // Create event (immutable fact)                                │  │
│     │     event := WorkerCompletedEvent{                                  │  │
│     │         WorkerID:  cmd.WorkerID,                                    │  │
│     │         Result:    cmd.Result,                                      │  │
│     │         Timestamp: time.Now(),                                      │  │
│     │         Version:   s.Version + 1,                                   │  │
│     │     }                                                               │  │
│     │     // Apply to self                                                │  │
│     │     s.Apply(event)                                                  │  │
│     │     return event, nil                                               │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  3. EVENT APPLIED TO STATE                                                   │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ func (s *ResearchState) Apply(event Event) {                        │  │
│     │     switch e := event.(type) {                                      │  │
│     │     case WorkerCompletedEvent:                                      │  │
│     │         s.DAG.SetStatus(e.WorkerID, StatusComplete)                 │  │
│     │         s.DAG.SetResult(e.WorkerID, e.Result)                       │  │
│     │         s.Workers[e.WorkerID].CompletedAt = &e.Timestamp            │  │
│     │         s.Version = e.Version                                       │  │
│     │     }                                                               │  │
│     │     s.uncommittedEvents = append(s.uncommittedEvents, event)        │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  4. EVENT PUBLISHED TO BUS                                                   │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ eventBus.Publish(event)  // Fires domain event                      │  │
│     │                                                                     │  │
│     │ // Storage handler receives and persists                            │  │
│     │ // UI handler receives and updates display                          │  │
│     │ // Audit handler receives and logs                                  │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Domain Events (State-Changing Events)

### 3.1 Event Taxonomy

The system needs two categories of events:

| Category            | Purpose                | Persistence          | Examples                                                |
| ------------------- | ---------------------- | -------------------- | ------------------------------------------------------- |
| **Domain Events**   | State changes (facts)  | YES - Event Store    | `ResearchStarted`, `WorkerCompleted`, `ReportGenerated` |
| **Progress Events** | UI updates (ephemeral) | NO - Fire-and-forget | `LLMChunk`, `ToolCall`, `Progress`                      |

### 3.2 Domain Event Definitions

```go
// internal/core/domain/events/research.go
package events

import "time"

// Base event with metadata
type BaseEvent struct {
    ID          string    `json:"id"`          // UUID for idempotency
    AggregateID string    `json:"aggregate_id"` // Session/Research ID
    Version     int       `json:"version"`      // Aggregate version
    Timestamp   time.Time `json:"timestamp"`
    Type        string    `json:"type"`         // Event type discriminator
}

// ============================================================================
// RESEARCH LIFECYCLE EVENTS
// ============================================================================

// ResearchStartedEvent - Research session initiated
type ResearchStartedEvent struct {
    BaseEvent
    Query           string            `json:"query"`
    Mode            string            `json:"mode"`   // "fast" or "deep"
    Config          ResearchConfig    `json:"config"` // Max workers, timeout, etc.
}

// ResearchCancelledEvent - Research cancelled by user
type ResearchCancelledEvent struct {
    BaseEvent
    Reason string `json:"reason"`
}

// ResearchCompletedEvent - Research finished successfully
type ResearchCompletedEvent struct {
    BaseEvent
    Duration    time.Duration  `json:"duration"`
    TotalCost   CostBreakdown  `json:"total_cost"`
    SourceCount int            `json:"source_count"`
}

// ResearchFailedEvent - Research failed with error
type ResearchFailedEvent struct {
    BaseEvent
    Error       string `json:"error"`
    FailedPhase string `json:"failed_phase"` // "planning", "search", "analysis", "synthesis"
}

// ============================================================================
// PLANNING EVENTS
// ============================================================================

// PlanCreatedEvent - Research plan generated
type PlanCreatedEvent struct {
    BaseEvent
    Topic        string        `json:"topic"`
    Perspectives []Perspective `json:"perspectives"`
    DAGStructure DAGSnapshot   `json:"dag_structure"`
    Cost         CostBreakdown `json:"cost"`
}

// DAGSnapshot captures the complete DAG state
type DAGSnapshot struct {
    Nodes []DAGNodeSnapshot `json:"nodes"`
    Edges []DAGEdge         `json:"edges"`
}

type DAGNodeSnapshot struct {
    ID           string   `json:"id"`
    TaskType     string   `json:"task_type"`
    Description  string   `json:"description"`
    Dependencies []string `json:"dependencies"`
    Status       string   `json:"status"`
}

type DAGEdge struct {
    From string `json:"from"`
    To   string `json:"to"`
}

// ============================================================================
// WORKER/DAG NODE EVENTS
// ============================================================================

// WorkerStartedEvent - Worker began execution
type WorkerStartedEvent struct {
    BaseEvent
    WorkerID    string `json:"worker_id"`
    WorkerNum   int    `json:"worker_num"`
    Objective   string `json:"objective"`
    Perspective string `json:"perspective,omitempty"`
}

// WorkerProgressEvent - Worker made progress
type WorkerProgressEvent struct {
    BaseEvent
    WorkerID  string  `json:"worker_id"`
    Iteration int     `json:"iteration"`
    Message   string  `json:"message"`
    Progress  float64 `json:"progress"` // 0.0 to 1.0
}

// WorkerCompletedEvent - Worker finished successfully
type WorkerCompletedEvent struct {
    BaseEvent
    WorkerID    string          `json:"worker_id"`
    Output      string          `json:"output"`
    Facts       []Fact          `json:"facts,omitempty"`
    Sources     []Source        `json:"sources"`
    Cost        CostBreakdown   `json:"cost"`
}

// WorkerFailedEvent - Worker failed
type WorkerFailedEvent struct {
    BaseEvent
    WorkerID string `json:"worker_id"`
    Error    string `json:"error"`
    Retried  bool   `json:"retried"`
}

// ============================================================================
// ANALYSIS EVENTS
// ============================================================================

// AnalysisStartedEvent - Analysis phase began
type AnalysisStartedEvent struct {
    BaseEvent
    TotalFacts int `json:"total_facts"`
}

// CrossValidationCompletedEvent - Facts cross-validated
type CrossValidationCompletedEvent struct {
    BaseEvent
    ValidatedFacts []ValidatedFact `json:"validated_facts"`
    Cost           CostBreakdown   `json:"cost"`
}

// ContradictionsFoundEvent - Contradictions detected
type ContradictionsFoundEvent struct {
    BaseEvent
    Contradictions []Contradiction `json:"contradictions"`
    Cost           CostBreakdown   `json:"cost"`
}

// KnowledgeGapsIdentifiedEvent - Gaps found
type KnowledgeGapsIdentifiedEvent struct {
    BaseEvent
    Gaps []KnowledgeGap `json:"gaps"`
    Cost CostBreakdown  `json:"cost"`
}

// AnalysisCompletedEvent - Analysis phase finished
type AnalysisCompletedEvent struct {
    BaseEvent
    TotalValidated    int           `json:"total_validated"`
    ContradictionCount int          `json:"contradiction_count"`
    GapCount          int           `json:"gap_count"`
    Cost              CostBreakdown `json:"cost"`
}

// ============================================================================
// GAP FILLING EVENTS
// ============================================================================

// GapFillingStartedEvent - Gap filling phase began
type GapFillingStartedEvent struct {
    BaseEvent
    TotalGaps       int `json:"total_gaps"`
    HighPriorityGaps int `json:"high_priority_gaps"`
}

// GapFilledEvent - Single gap addressed
type GapFilledEvent struct {
    BaseEvent
    GapIndex    int             `json:"gap_index"`
    Description string          `json:"description"`
    NewFacts    []Fact          `json:"new_facts"`
    NewSources  []Source        `json:"new_sources"`
    Cost        CostBreakdown   `json:"cost"`
}

// GapFillingCompletedEvent - All gaps addressed
type GapFillingCompletedEvent struct {
    BaseEvent
    GapsFilled int           `json:"gaps_filled"`
    GapsSkipped int          `json:"gaps_skipped"`
    Cost       CostBreakdown `json:"cost"`
}

// ============================================================================
// SYNTHESIS EVENTS
// ============================================================================

// SynthesisStartedEvent - Report generation began
type SynthesisStartedEvent struct {
    BaseEvent
}

// OutlineGeneratedEvent - Report outline created
type OutlineGeneratedEvent struct {
    BaseEvent
    Sections []SectionOutline `json:"sections"`
    Cost     CostBreakdown    `json:"cost"`
}

type SectionOutline struct {
    Heading     string `json:"heading"`
    Description string `json:"description"`
}

// SectionWrittenEvent - Report section completed
type SectionWrittenEvent struct {
    BaseEvent
    SectionIndex int    `json:"section_index"`
    Heading      string `json:"heading"`
    Content      string `json:"content"`
    Cost         CostBreakdown `json:"cost"`
}

// ReportGeneratedEvent - Full report assembled
type ReportGeneratedEvent struct {
    BaseEvent
    Title       string     `json:"title"`
    Summary     string     `json:"summary"`
    FullContent string     `json:"full_content"`
    Citations   []Citation `json:"citations"`
    Cost        CostBreakdown `json:"cost"`
}

// ============================================================================
// CONTEXT EVENTS
// ============================================================================

// ContextFoldedEvent - Context folding occurred
type ContextFoldedEvent struct {
    BaseEvent
    FoldType       string `json:"fold_type"` // "granular" or "deep"
    TokensBefore   int    `json:"tokens_before"`
    TokensAfter    int    `json:"tokens_after"`
    CompressionRatio float64 `json:"compression_ratio"`
    Cost           CostBreakdown `json:"cost"`
}

// ============================================================================
// SNAPSHOT EVENT (for performance optimization)
// ============================================================================

// SnapshotTakenEvent - State snapshot for replay optimization
type SnapshotTakenEvent struct {
    BaseEvent
    Snapshot ResearchStateSnapshot `json:"snapshot"`
}

type ResearchStateSnapshot struct {
    Query           string                    `json:"query"`
    Mode            string                    `json:"mode"`
    Status          string                    `json:"status"`
    DAG             DAGSnapshot               `json:"dag"`
    Workers         map[string]WorkerSnapshot `json:"workers"`
    AnalysisResult  *AnalysisSnapshot         `json:"analysis_result,omitempty"`
    Report          *ReportSnapshot           `json:"report,omitempty"`
    Cost            CostBreakdown             `json:"cost"`
}
```

---

## Part 4: Research State Aggregate

### 4.1 State Structure

```go
// internal/core/domain/aggregate/research_state.go
package aggregate

import (
    "sync"
    "time"

    "go-research/internal/core/domain/events"
)

// ResearchState is the aggregate root for research sessions.
// All state changes happen through Apply() from events.
type ResearchState struct {
    mu sync.RWMutex

    // Identity
    ID        string
    Version   int
    CreatedAt time.Time

    // Research configuration
    Query  string
    Mode   string // "fast" or "deep"
    Config ResearchConfig

    // Current status
    Status    string // "planning", "searching", "analyzing", "synthesizing", "complete", "failed", "cancelled"
    Phase     string // More granular phase tracking
    Progress  float64 // Overall progress 0.0-1.0

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
    Cost CostBreakdown

    // Timing
    StartedAt   *time.Time
    CompletedAt *time.Time
    Duration    time.Duration

    // Event tracking
    uncommittedEvents []events.Event
    lastEventID       string
}

type PlanState struct {
    Topic        string
    Perspectives []Perspective
    CreatedAt    time.Time
}

type DAGState struct {
    Nodes map[string]*DAGNode
    Edges map[string][]string // node -> dependencies
}

type DAGNode struct {
    ID           string
    TaskType     string
    Description  string
    Dependencies []string
    Status       string // "pending", "running", "complete", "failed"
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
    Facts       []Fact
    Sources     []Source
    Cost        CostBreakdown
    Iterations  int
    StartedAt   *time.Time
    CompletedAt *time.Time
    Error       *string
}

type AnalysisState struct {
    ValidatedFacts []ValidatedFact
    Contradictions []Contradiction
    KnowledgeGaps  []KnowledgeGap
    SourceQuality  map[string]float64
    Cost           CostBreakdown
    CompletedAt    *time.Time
}

type ReportState struct {
    Title       string
    Summary     string
    Sections    []Section
    FullContent string
    Citations   []Citation
    Cost        CostBreakdown
    GeneratedAt *time.Time
}

// NewResearchState creates a new empty state
func NewResearchState(id string) *ResearchState {
    return &ResearchState{
        ID:        id,
        Version:   0,
        CreatedAt: time.Now(),
        Status:    "pending",
        Workers:   make(map[string]*WorkerState),
        Cost:      CostBreakdown{},
    }
}

// LoadFromEvents reconstructs state by replaying events
func LoadFromEvents(id string, eventStream []events.Event) (*ResearchState, error) {
    state := NewResearchState(id)

    for _, event := range eventStream {
        state.Apply(event)
    }

    // Clear uncommitted since we're loading from store
    state.uncommittedEvents = nil

    return state, nil
}

// LoadFromSnapshot reconstructs from snapshot + subsequent events
func LoadFromSnapshot(snapshot events.ResearchStateSnapshot, subsequentEvents []events.Event) (*ResearchState, error) {
    state := reconstructFromSnapshot(snapshot)

    for _, event := range subsequentEvents {
        state.Apply(event)
    }

    state.uncommittedEvents = nil
    return state, nil
}

// GetUncommittedEvents returns events not yet persisted
func (s *ResearchState) GetUncommittedEvents() []events.Event {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return append([]events.Event{}, s.uncommittedEvents...)
}

// ClearUncommittedEvents marks events as persisted
func (s *ResearchState) ClearUncommittedEvents() {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.uncommittedEvents = nil
}
```

### 4.2 Command Execution

```go
// internal/core/domain/aggregate/commands.go
package aggregate

import (
    "fmt"
    "time"

    "github.com/google/uuid"
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
    Config ResearchConfig
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

// Execute processes a command and returns resulting event
func (s *ResearchState) Execute(cmd Command) (events.Event, error) {
    s.mu.Lock()
    defer s.mu.Unlock()

    if err := cmd.Validate(s); err != nil {
        return nil, err
    }

    var event events.Event

    switch c := cmd.(type) {
    case StartResearchCommand:
        event = events.ResearchStartedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     s.Version + 1,
                Timestamp:   time.Now(),
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
                Version:     s.Version + 1,
                Timestamp:   time.Now(),
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
                Version:     s.Version + 1,
                Timestamp:   time.Now(),
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
                Version:     s.Version + 1,
                Timestamp:   time.Now(),
                Type:        "worker.completed",
            },
            WorkerID: c.WorkerID,
            Output:   c.Output,
            Facts:    c.Facts,
            Sources:  c.Sources,
            Cost:     c.Cost,
        }

    case SetReportCommand:
        event = events.ReportGeneratedEvent{
            BaseEvent: events.BaseEvent{
                ID:          uuid.New().String(),
                AggregateID: s.ID,
                Version:     s.Version + 1,
                Timestamp:   time.Now(),
                Type:        "report.generated",
            },
            Title:       c.Title,
            Summary:     c.Summary,
            FullContent: c.FullContent,
            Citations:   c.Citations,
            Cost:        c.Cost,
        }

    // ... more commands

    default:
        return nil, fmt.Errorf("unknown command type: %T", cmd)
    }

    // Apply the event to update state
    s.applyUnlocked(event)

    return event, nil
}
```

### 4.3 Event Application

```go
// internal/core/domain/aggregate/apply.go
package aggregate

import (
    "go-research/internal/core/domain/events"
)

// Apply updates state from an event (used for replay and live updates)
func (s *ResearchState) Apply(event events.Event) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.applyUnlocked(event)
}

func (s *ResearchState) applyUnlocked(event events.Event) {
    switch e := event.(type) {

    case events.ResearchStartedEvent:
        s.Query = e.Query
        s.Mode = e.Mode
        s.Config = e.Config
        s.Status = "planning"
        now := e.Timestamp
        s.StartedAt = &now

    case events.PlanCreatedEvent:
        s.Plan = &PlanState{
            Topic:        e.Topic,
            Perspectives: e.Perspectives,
            CreatedAt:    e.Timestamp,
        }
        s.DAG = reconstructDAG(e.DAGStructure)
        s.Status = "searching"
        s.initializeWorkers(e.Perspectives, e.DAGStructure)
        s.Cost.Add(e.Cost)

    case events.WorkerStartedEvent:
        if w, ok := s.Workers[e.WorkerID]; ok {
            w.Status = "running"
            now := e.Timestamp
            w.StartedAt = &now
        }
        if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
            node.Status = "running"
        }

    case events.WorkerProgressEvent:
        if w, ok := s.Workers[e.WorkerID]; ok {
            w.Iterations = e.Iteration
        }

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
            node.Result = e
        }
        s.Cost.Add(e.Cost)
        s.updateProgress()

    case events.WorkerFailedEvent:
        if w, ok := s.Workers[e.WorkerID]; ok {
            w.Status = "failed"
            w.Error = &e.Error
        }
        if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
            node.Status = "failed"
            node.Error = &e.Error
        }

    case events.AnalysisStartedEvent:
        s.Status = "analyzing"
        s.Analysis = &AnalysisState{}

    case events.CrossValidationCompletedEvent:
        if s.Analysis != nil {
            s.Analysis.ValidatedFacts = e.ValidatedFacts
            s.Analysis.Cost.Add(e.Cost)
        }
        s.Cost.Add(e.Cost)

    case events.ContradictionsFoundEvent:
        if s.Analysis != nil {
            s.Analysis.Contradictions = e.Contradictions
            s.Analysis.Cost.Add(e.Cost)
        }
        s.Cost.Add(e.Cost)

    case events.KnowledgeGapsIdentifiedEvent:
        if s.Analysis != nil {
            s.Analysis.KnowledgeGaps = e.Gaps
            s.Analysis.Cost.Add(e.Cost)
        }
        s.Cost.Add(e.Cost)

    case events.AnalysisCompletedEvent:
        s.Status = "gap_filling"
        if s.Analysis != nil {
            now := e.Timestamp
            s.Analysis.CompletedAt = &now
        }
        s.Cost.Add(e.Cost)

    case events.GapFilledEvent:
        // Add new facts and sources from gap filling
        for workerID, worker := range s.Workers {
            if workerID == fmt.Sprintf("gap_%d", e.GapIndex) {
                worker.Facts = append(worker.Facts, e.NewFacts...)
                worker.Sources = append(worker.Sources, e.NewSources...)
            }
        }
        s.Cost.Add(e.Cost)

    case events.SynthesisStartedEvent:
        s.Status = "synthesizing"
        s.Report = &ReportState{}

    case events.OutlineGeneratedEvent:
        if s.Report != nil {
            s.Report.Sections = make([]Section, len(e.Sections))
            for i, outline := range e.Sections {
                s.Report.Sections[i] = Section{
                    Heading: outline.Heading,
                }
            }
        }
        s.Cost.Add(e.Cost)

    case events.SectionWrittenEvent:
        if s.Report != nil && e.SectionIndex < len(s.Report.Sections) {
            s.Report.Sections[e.SectionIndex].Content = e.Content
        }
        s.Cost.Add(e.Cost)

    case events.ReportGeneratedEvent:
        if s.Report != nil {
            s.Report.Title = e.Title
            s.Report.Summary = e.Summary
            s.Report.FullContent = e.FullContent
            s.Report.Citations = e.Citations
            s.Report.Cost.Add(e.Cost)
            now := e.Timestamp
            s.Report.GeneratedAt = &now
        }
        s.Cost.Add(e.Cost)

    case events.ResearchCompletedEvent:
        s.Status = "complete"
        now := e.Timestamp
        s.CompletedAt = &now
        s.Duration = e.Duration

    case events.ResearchFailedEvent:
        s.Status = "failed"
        now := e.Timestamp
        s.CompletedAt = &now

    case events.ResearchCancelledEvent:
        s.Status = "cancelled"
        now := e.Timestamp
        s.CompletedAt = &now

    case events.ContextFoldedEvent:
        s.Cost.Add(e.Cost)

    case events.SnapshotTakenEvent:
        // Snapshots don't change state, they record it
    }

    // Update version and track event
    s.Version = getEventVersion(event)
    s.lastEventID = getEventID(event)
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
```

---

## Part 5: Storage Port & Adapters

### 5.1 Event Store Port

```go
// internal/core/ports/storage.go
package ports

import (
    "context"

    "go-research/internal/core/domain/events"
)

// EventStore persists and retrieves domain events
type EventStore interface {
    // AppendEvents adds events to the stream for an aggregate
    AppendEvents(ctx context.Context, aggregateID string, events []events.Event, expectedVersion int) error

    // LoadEvents retrieves all events for an aggregate
    LoadEvents(ctx context.Context, aggregateID string) ([]events.Event, error)

    // LoadEventsFrom retrieves events starting from a version
    LoadEventsFrom(ctx context.Context, aggregateID string, fromVersion int) ([]events.Event, error)

    // LoadSnapshot retrieves the latest snapshot for an aggregate
    LoadSnapshot(ctx context.Context, aggregateID string) (*events.SnapshotTakenEvent, error)

    // SaveSnapshot persists a state snapshot
    SaveSnapshot(ctx context.Context, aggregateID string, snapshot events.SnapshotTakenEvent) error

    // GetAllAggregateIDs returns all aggregate IDs (for listing sessions)
    GetAllAggregateIDs(ctx context.Context) ([]string, error)
}

// ProjectionStore provides read-optimized views
type ProjectionStore interface {
    // UpdateProjection updates a read model from an event
    UpdateProjection(ctx context.Context, event events.Event) error

    // GetSessionSummaries returns list view data
    GetSessionSummaries(ctx context.Context, filters SessionFilters) ([]SessionSummary, error)

    // GetLatestSessionID returns the most recent session
    GetLatestSessionID(ctx context.Context) (string, error)
}

// ReportWriter writes formatted reports to external systems
// (Same as hexagonal architecture - for Obsidian, Notion, etc.)
type ReportWriter interface {
    WriteSession(ctx context.Context, state *aggregate.ResearchState) error
    WriteReport(ctx context.Context, state *aggregate.ResearchState) error
    WriteWorkers(ctx context.Context, state *aggregate.ResearchState) error
}
```

### 5.2 Filesystem Event Store Adapter

```go
// internal/adapters/secondary/storage/filesystem/event_store.go
package filesystem

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sort"
    "strings"

    "go-research/internal/core/domain/events"
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

func (s *EventStore) AppendEvents(ctx context.Context, aggregateID string, newEvents []events.Event, expectedVersion int) error {
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
        currentVersion = getEventVersion(existing[len(existing)-1])
    }

    if expectedVersion > 0 && currentVersion != expectedVersion {
        return fmt.Errorf("version conflict: expected %d, got %d", expectedVersion, currentVersion)
    }

    // Append each event as a separate JSON file
    for _, event := range newEvents {
        version := getEventVersion(event)
        filename := fmt.Sprintf("%06d_%s.json", version, getEventType(event))
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

func (s *EventStore) LoadEvents(ctx context.Context, aggregateID string) ([]events.Event, error) {
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

    var result []events.Event
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

func (s *EventStore) LoadEventsFrom(ctx context.Context, aggregateID string, fromVersion int) ([]events.Event, error) {
    allEvents, err := s.LoadEvents(ctx, aggregateID)
    if err != nil {
        return nil, err
    }

    var result []events.Event
    for _, event := range allEvents {
        if getEventVersion(event) > fromVersion {
            result = append(result, event)
        }
    }

    return result, nil
}

func (s *EventStore) LoadSnapshot(ctx context.Context, aggregateID string) (*events.SnapshotTakenEvent, error) {
    path := s.snapshotPath(aggregateID)

    data, err := os.ReadFile(path)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil
        }
        return nil, err
    }

    var snapshot events.SnapshotTakenEvent
    if err := json.Unmarshal(data, &snapshot); err != nil {
        return nil, err
    }

    return &snapshot, nil
}

func (s *EventStore) SaveSnapshot(ctx context.Context, aggregateID string, snapshot events.SnapshotTakenEvent) error {
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

// Event deserialization with type discrimination
func deserializeEvent(data []byte) (events.Event, error) {
    // First unmarshal to get the type
    var base events.BaseEvent
    if err := json.Unmarshal(data, &base); err != nil {
        return nil, err
    }

    // Then unmarshal to the specific type
    switch base.Type {
    case "research.started":
        var e events.ResearchStartedEvent
        return e, json.Unmarshal(data, &e)
    case "plan.created":
        var e events.PlanCreatedEvent
        return e, json.Unmarshal(data, &e)
    case "worker.started":
        var e events.WorkerStartedEvent
        return e, json.Unmarshal(data, &e)
    case "worker.completed":
        var e events.WorkerCompletedEvent
        return e, json.Unmarshal(data, &e)
    case "worker.failed":
        var e events.WorkerFailedEvent
        return e, json.Unmarshal(data, &e)
    case "analysis.completed":
        var e events.AnalysisCompletedEvent
        return e, json.Unmarshal(data, &e)
    case "report.generated":
        var e events.ReportGeneratedEvent
        return e, json.Unmarshal(data, &e)
    case "research.completed":
        var e events.ResearchCompletedEvent
        return e, json.Unmarshal(data, &e)
    case "research.failed":
        var e events.ResearchFailedEvent
        return e, json.Unmarshal(data, &e)
    case "research.cancelled":
        var e events.ResearchCancelledEvent
        return e, json.Unmarshal(data, &e)
    case "snapshot.taken":
        var e events.SnapshotTakenEvent
        return e, json.Unmarshal(data, &e)
    // ... more event types
    default:
        return nil, fmt.Errorf("unknown event type: %s", base.Type)
    }
}
```

### 5.3 Obsidian Projection Adapter

```go
// internal/adapters/secondary/writers/obsidian/projection.go
package obsidian

import (
    "context"
    "fmt"
    "os"
    "path/filepath"
    "text/template"
    "time"

    "go-research/internal/core/domain/aggregate"
    "go-research/internal/core/domain/events"
    "go-research/internal/core/ports"
)

type ProjectionWriter struct {
    vaultPath string
}

func NewProjectionWriter(vaultPath string) *ProjectionWriter {
    return &ProjectionWriter{vaultPath: vaultPath}
}

var _ ports.ReportWriter = (*ProjectionWriter)(nil)

// WriteSession creates the session directory and MOC file
func (w *ProjectionWriter) WriteSession(ctx context.Context, state *aggregate.ResearchState) error {
    sessionDir := filepath.Join(w.vaultPath, state.ID)

    // Create directory structure
    dirs := []string{
        sessionDir,
        filepath.Join(sessionDir, "workers"),
        filepath.Join(sessionDir, "reports"),
        filepath.Join(sessionDir, "events"), // NEW: Event log for debugging
    }

    for _, dir := range dirs {
        if err := os.MkdirAll(dir, 0755); err != nil {
            return fmt.Errorf("create dir %s: %w", dir, err)
        }
    }

    // Write MOC
    return w.writeMOC(state)
}

// WriteReport creates/updates the report file
func (w *ProjectionWriter) WriteReport(ctx context.Context, state *aggregate.ResearchState) error {
    if state.Report == nil {
        return nil
    }

    sessionDir := filepath.Join(w.vaultPath, state.ID)
    reportPath := filepath.Join(sessionDir, "reports", fmt.Sprintf("report_v%d.md", state.Version))

    content := fmt.Sprintf(`---
version: %d
query: "%s"
generated: %s
source_count: %d
status: %s
cost: %.4f
---

%s
`,
        state.Version,
        state.Query,
        time.Now().Format(time.RFC3339),
        len(collectSources(state)),
        state.Status,
        state.Cost.TotalCostUSD,
        state.Report.FullContent,
    )

    return os.WriteFile(reportPath, []byte(content), 0644)
}

// WriteWorkers creates/updates worker files
func (w *ProjectionWriter) WriteWorkers(ctx context.Context, state *aggregate.ResearchState) error {
    sessionDir := filepath.Join(w.vaultPath, state.ID)
    workersDir := filepath.Join(sessionDir, "workers")

    for _, worker := range state.Workers {
        workerPath := filepath.Join(workersDir, fmt.Sprintf("worker_%d.md", worker.WorkerNum))

        content := fmt.Sprintf(`---
worker_id: "%s"
objective: "%s"
perspective: "%s"
status: %s
sources: %d
cost: %.4f
---

# Worker %d: %s

## Objective
%s

## Output
%s

## Sources
%s
`,
            worker.ID,
            worker.Objective,
            worker.Perspective,
            worker.Status,
            len(worker.Sources),
            worker.Cost.TotalCostUSD,
            worker.WorkerNum,
            worker.Perspective,
            worker.Objective,
            worker.Output,
            formatSources(worker.Sources),
        )

        if err := os.WriteFile(workerPath, []byte(content), 0644); err != nil {
            return fmt.Errorf("write worker %s: %w", worker.ID, err)
        }
    }

    return nil
}

func (w *ProjectionWriter) writeMOC(state *aggregate.ResearchState) error {
    sessionDir := filepath.Join(w.vaultPath, state.ID)
    mocPath := filepath.Join(sessionDir, "session.md")

    tmpl := `---
session_id: "{{.ID}}"
version: {{.Version}}
query: "{{.Query}}"
mode: "{{.Mode}}"
status: "{{.Status}}"
progress: {{printf "%.1f" .Progress}}
created_at: {{.CreatedAt.Format "2006-01-02T15:04:05Z07:00"}}
cost: {{printf "%.4f" .Cost.TotalCostUSD}}
---

# Research: {{.Query}}

**Status**: {{.Status}} ({{printf "%.0f" (mul .Progress 100)}}%)
**Mode**: {{.Mode}}
**Cost**: ${{printf "%.4f" .Cost.TotalCostUSD}}

## Workers
{{range $i, $w := .WorkersList}}
- [[workers/worker_{{inc $i}}.md|Worker {{inc $i}}: {{$w.Perspective}}]] - {{$w.Status}}
{{end}}

## Reports
{{if .Report}}
- [[reports/report_v{{.Version}}.md|Report v{{.Version}}]]
{{else}}
*Report not yet generated*
{{end}}

## Progress Timeline
{{range .Timeline}}
- {{.Timestamp.Format "15:04:05"}} - {{.Description}}
{{end}}
`

    t, err := template.New("moc").Funcs(template.FuncMap{
        "inc": func(i int) int { return i + 1 },
        "mul": func(a, b float64) float64 { return a * b },
    }).Parse(tmpl)
    if err != nil {
        return err
    }

    f, err := os.Create(mocPath)
    if err != nil {
        return err
    }
    defer f.Close()

    data := struct {
        *aggregate.ResearchState
        WorkersList []*aggregate.WorkerState
        Timeline    []TimelineEntry
    }{
        ResearchState: state,
        WorkersList:   workersList(state),
        Timeline:      buildTimeline(state),
    }

    return t.Execute(f, data)
}
```

---

## Part 6: Event Bus Integration

### 6.1 Enhanced Event Bus

```go
// internal/adapters/secondary/events/bus.go
package events

import (
    "sync"

    domainEvents "go-research/internal/core/domain/events"
    "go-research/internal/core/ports"
)

// Bus handles both domain events (persisted) and progress events (ephemeral)
type Bus struct {
    mu          sync.RWMutex
    subscribers map[string][]chan domainEvents.Event
    buffer      int

    // Event handlers for side effects
    handlers    []EventHandler
}

// EventHandler processes events for side effects (storage, projections, etc.)
type EventHandler interface {
    Handle(event domainEvents.Event) error
    EventTypes() []string // Empty means all events
}

func NewBus(bufferSize int) *Bus {
    return &Bus{
        subscribers: make(map[string][]chan domainEvents.Event),
        buffer:      bufferSize,
        handlers:    make([]EventHandler, 0),
    }
}

var _ ports.EventPublisher = (*Bus)(nil)
var _ ports.EventSubscriber = (*Bus)(nil)

// RegisterHandler adds a handler for side effects
func (b *Bus) RegisterHandler(handler EventHandler) {
    b.mu.Lock()
    defer b.mu.Unlock()
    b.handlers = append(b.handlers, handler)
}

// Publish broadcasts an event and invokes handlers
func (b *Bus) Publish(event domainEvents.Event) {
    b.mu.RLock()
    defer b.mu.RUnlock()

    eventType := getEventType(event)

    // Invoke handlers (for storage, projections, etc.)
    for _, handler := range b.handlers {
        types := handler.EventTypes()
        if len(types) == 0 || contains(types, eventType) {
            // Fire-and-forget, don't block publishing
            go func(h EventHandler, e domainEvents.Event) {
                _ = h.Handle(e)
            }(handler, event)
        }
    }

    // Broadcast to subscribers (for UI, etc.)
    for _, ch := range b.subscribers[eventType] {
        select {
        case ch <- event:
        default:
            // Drop if buffer full
        }
    }

    // Also broadcast to wildcard subscribers
    for _, ch := range b.subscribers["*"] {
        select {
        case ch <- event:
        default:
        }
    }
}

func (b *Bus) Subscribe(types ...string) <-chan domainEvents.Event {
    b.mu.Lock()
    defer b.mu.Unlock()

    ch := make(chan domainEvents.Event, b.buffer)

    for _, t := range types {
        b.subscribers[t] = append(b.subscribers[t], ch)
    }

    return ch
}

func (b *Bus) Unsubscribe(ch <-chan domainEvents.Event) {
    b.mu.Lock()
    defer b.mu.Unlock()

    for eventType, channels := range b.subscribers {
        for i, c := range channels {
            if c == ch {
                b.subscribers[eventType] = append(channels[:i], channels[i+1:]...)
                break
            }
        }
    }
}

func (b *Bus) Close() {
    b.mu.Lock()
    defer b.mu.Unlock()

    closed := make(map[chan domainEvents.Event]bool)
    for _, channels := range b.subscribers {
        for _, ch := range channels {
            if !closed[ch] {
                close(ch)
                closed[ch] = true
            }
        }
    }

    b.subscribers = make(map[string][]chan domainEvents.Event)
}
```

### 6.2 Storage Event Handler

```go
// internal/adapters/secondary/events/storage_handler.go
package events

import (
    "context"
    "log"

    domainEvents "go-research/internal/core/domain/events"
    "go-research/internal/core/ports"
)

// StorageHandler persists domain events to the event store
type StorageHandler struct {
    eventStore ports.EventStore
}

func NewStorageHandler(store ports.EventStore) *StorageHandler {
    return &StorageHandler{eventStore: store}
}

func (h *StorageHandler) EventTypes() []string {
    // Handle all domain events (state-changing events)
    return []string{
        "research.started",
        "research.completed",
        "research.failed",
        "research.cancelled",
        "plan.created",
        "worker.started",
        "worker.completed",
        "worker.failed",
        "analysis.started",
        "analysis.completed",
        "cross_validation.completed",
        "contradictions.found",
        "knowledge_gaps.identified",
        "gap_filling.started",
        "gap.filled",
        "gap_filling.completed",
        "synthesis.started",
        "outline.generated",
        "section.written",
        "report.generated",
        "context.folded",
        "snapshot.taken",
    }
}

func (h *StorageHandler) Handle(event domainEvents.Event) error {
    ctx := context.Background()

    aggregateID := getAggregateID(event)
    version := getEventVersion(event)

    // Append to event store
    err := h.eventStore.AppendEvents(ctx, aggregateID, []domainEvents.Event{event}, version-1)
    if err != nil {
        log.Printf("Failed to persist event %s: %v", getEventType(event), err)
        return err
    }

    return nil
}
```

### 6.3 Obsidian Projection Handler

```go
// internal/adapters/secondary/events/obsidian_handler.go
package events

import (
    "context"
    "log"

    domainEvents "go-research/internal/core/domain/events"
    "go-research/internal/core/domain/aggregate"
    "go-research/internal/core/ports"
)

// ObsidianHandler updates Obsidian vault on relevant events
type ObsidianHandler struct {
    writer     ports.ReportWriter
    eventStore ports.EventStore
}

func NewObsidianHandler(writer ports.ReportWriter, store ports.EventStore) *ObsidianHandler {
    return &ObsidianHandler{
        writer:     writer,
        eventStore: store,
    }
}

func (h *ObsidianHandler) EventTypes() []string {
    // Only update Obsidian on key milestones
    return []string{
        "research.started",
        "plan.created",
        "worker.completed",
        "report.generated",
        "research.completed",
    }
}

func (h *ObsidianHandler) Handle(event domainEvents.Event) error {
    ctx := context.Background()
    aggregateID := getAggregateID(event)

    // Reconstruct current state
    events, err := h.eventStore.LoadEvents(ctx, aggregateID)
    if err != nil {
        return err
    }

    state, err := aggregate.LoadFromEvents(aggregateID, events)
    if err != nil {
        return err
    }

    // Update Obsidian based on event type
    switch getEventType(event) {
    case "research.started":
        return h.writer.WriteSession(ctx, state)

    case "plan.created", "worker.completed":
        if err := h.writer.WriteSession(ctx, state); err != nil {
            log.Printf("Failed to update session MOC: %v", err)
        }
        return h.writer.WriteWorkers(ctx, state)

    case "report.generated", "research.completed":
        if err := h.writer.WriteSession(ctx, state); err != nil {
            log.Printf("Failed to update session MOC: %v", err)
        }
        if err := h.writer.WriteWorkers(ctx, state); err != nil {
            log.Printf("Failed to update workers: %v", err)
        }
        return h.writer.WriteReport(ctx, state)
    }

    return nil
}
```

---

## Part 7: Orchestrator Integration

### 7.1 Event-Sourced Deep Orchestrator

```go
// internal/orchestrator/deep_eventsourced.go
package orchestrator

import (
    "context"
    "time"

    "go-research/internal/core/domain/aggregate"
    "go-research/internal/core/domain/events"
    "go-research/internal/core/ports"
)

type DeepOrchestratorES struct {
    eventStore ports.EventStore
    eventBus   ports.EventPublisher
    llm        ports.LLMProvider
    tools      ports.ToolExecutor

    // Domain services
    planner        *planning.Planner
    searchAgent    *agents.SearchAgent
    analysisAgent  *agents.AnalysisAgent
    synthesisAgent *agents.SynthesisAgent
}

func NewDeepOrchestratorES(
    eventStore ports.EventStore,
    eventBus ports.EventPublisher,
    llm ports.LLMProvider,
    tools ports.ToolExecutor,
) *DeepOrchestratorES {
    return &DeepOrchestratorES{
        eventStore:     eventStore,
        eventBus:       eventBus,
        llm:            llm,
        tools:          tools,
        planner:        planning.NewPlanner(llm),
        searchAgent:    agents.NewSearchAgent(llm, tools, eventBus),
        analysisAgent:  agents.NewAnalysisAgent(llm),
        synthesisAgent: agents.NewSynthesisAgent(llm, eventBus),
    }
}

// Research executes a deep research with full event sourcing
func (o *DeepOrchestratorES) Research(ctx context.Context, sessionID string, query string, opts ResearchOptions) (*aggregate.ResearchState, error) {
    // Create or load state
    state, err := o.loadOrCreateState(ctx, sessionID, query, opts)
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

func (o *DeepOrchestratorES) loadOrCreateState(ctx context.Context, sessionID string, query string, opts ResearchOptions) (*aggregate.ResearchState, error) {
    // Try to load existing
    existingEvents, err := o.eventStore.LoadEvents(ctx, sessionID)
    if err != nil {
        return nil, err
    }

    if len(existingEvents) > 0 {
        return aggregate.LoadFromEvents(sessionID, existingEvents)
    }

    // Create new
    state := aggregate.NewResearchState(sessionID)

    // Execute start command
    event, err := state.Execute(aggregate.StartResearchCommand{
        Query:  query,
        Mode:   "deep",
        Config: opts.ToConfig(),
    })
    if err != nil {
        return nil, err
    }

    // Publish event (triggers storage and projections)
    o.eventBus.Publish(event)

    return state, nil
}

func (o *DeepOrchestratorES) loadState(ctx context.Context, sessionID string) (*aggregate.ResearchState, error) {
    // Try snapshot first for performance
    snapshot, err := o.eventStore.LoadSnapshot(ctx, sessionID)
    if err != nil {
        return nil, err
    }

    if snapshot != nil {
        // Load events after snapshot
        subsequentEvents, err := o.eventStore.LoadEventsFrom(ctx, sessionID, snapshot.BaseEvent.Version)
        if err != nil {
            return nil, err
        }
        return aggregate.LoadFromSnapshot(snapshot.Snapshot, subsequentEvents)
    }

    // Full replay
    allEvents, err := o.eventStore.LoadEvents(ctx, sessionID)
    if err != nil {
        return nil, err
    }

    return aggregate.LoadFromEvents(sessionID, allEvents)
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

    case "gap_filling":
        if err := o.executeGapFilling(ctx, state); err != nil {
            return state, err
        }
        fallthrough

    case "synthesizing":
        if err := o.executeSynthesis(ctx, state); err != nil {
            return state, err
        }

    case "complete":
        // Already done
        return state, nil

    case "failed", "cancelled":
        // Cannot continue
        return state, fmt.Errorf("research in terminal state: %s", state.Status)
    }

    // Mark complete
    event, _ := state.Execute(aggregate.CompleteResearchCommand{
        Duration: time.Since(*state.StartedAt),
    })
    o.eventBus.Publish(event)

    // Take snapshot for future loads
    o.saveSnapshot(ctx, state)

    return state, nil
}

func (o *DeepOrchestratorES) executePlanning(ctx context.Context, state *aggregate.ResearchState) error {
    plan, err := o.planner.CreatePlan(ctx, state.Query)
    if err != nil {
        return err
    }

    // Execute command and publish event
    event, err := state.Execute(aggregate.SetPlanCommand{
        Topic:        plan.Topic,
        Perspectives: plan.Perspectives,
        DAGStructure: buildDAGSnapshot(plan.DAG),
        Cost:         plan.Cost,
    })
    if err != nil {
        return err
    }

    o.eventBus.Publish(event)
    return nil
}

func (o *DeepOrchestratorES) executeDAG(ctx context.Context, state *aggregate.ResearchState) error {
    // Find nodes to execute (pending with completed dependencies)
    for {
        readyNodes := getReadyNodes(state.DAG)
        if len(readyNodes) == 0 {
            if allNodesComplete(state.DAG) {
                return nil
            }
            // Wait for running nodes
            time.Sleep(100 * time.Millisecond)
            continue
        }

        // Execute ready nodes in parallel
        var wg sync.WaitGroup
        for _, node := range readyNodes {
            wg.Add(1)
            go func(n *aggregate.DAGNode) {
                defer wg.Done()
                o.executeNode(ctx, state, n)
            }(node)
        }
        wg.Wait()

        // Check for cancellation
        select {
        case <-ctx.Done():
            event, _ := state.Execute(aggregate.CancelResearchCommand{
                Reason: ctx.Err().Error(),
            })
            o.eventBus.Publish(event)
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
        Perspective: getPerspective(state, node.ID),
    })
    o.eventBus.Publish(event)

    // Execute based on task type
    var result *agents.SearchResult
    var err error

    switch node.TaskType {
    case "search":
        perspective := getPerspectiveByNode(state, node.ID)
        result, err = o.searchAgent.Search(ctx, state.Query, perspective)
    }

    if err != nil {
        event, _ := state.Execute(aggregate.FailWorkerCommand{
            WorkerID: node.ID,
            Error:    err.Error(),
        })
        o.eventBus.Publish(event)
        return
    }

    // Emit worker completed
    event, _ = state.Execute(aggregate.CompleteWorkerCommand{
        WorkerID: node.ID,
        Output:   result.Output,
        Facts:    result.Facts,
        Sources:  result.Sources,
        Cost:     result.Cost,
    })
    o.eventBus.Publish(event)
}

func (o *DeepOrchestratorES) saveSnapshot(ctx context.Context, state *aggregate.ResearchState) {
    snapshot := events.SnapshotTakenEvent{
        BaseEvent: events.BaseEvent{
            ID:          uuid.New().String(),
            AggregateID: state.ID,
            Version:     state.Version,
            Timestamp:   time.Now(),
            Type:        "snapshot.taken",
        },
        Snapshot: buildStateSnapshot(state),
    }

    o.eventStore.SaveSnapshot(ctx, state.ID, snapshot)
}
```

---

## Part 8: Resumability in Action

### 8.1 Resume Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           RESUME FLOW                                         │
│                                                                              │
│  1. USER REQUESTS RESUME                                                     │
│     > /resume session-abc123                                                 │
│                                                                              │
│  2. LOAD STATE FROM EVENTS                                                   │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ // Try snapshot first                                               │  │
│     │ snapshot, _ := eventStore.LoadSnapshot(ctx, sessionID)              │  │
│     │                                                                     │  │
│     │ if snapshot != nil {                                                │  │
│     │     // Load only events after snapshot                              │  │
│     │     events := eventStore.LoadEventsFrom(ctx, sessionID, snap.Ver)   │  │
│     │     state := aggregate.LoadFromSnapshot(snapshot, events)           │  │
│     │ } else {                                                            │  │
│     │     // Full replay                                                  │  │
│     │     events := eventStore.LoadEvents(ctx, sessionID)                 │  │
│     │     state := aggregate.LoadFromEvents(sessionID, events)            │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  3. DETERMINE CONTINUATION POINT                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ State after replay:                                                 │  │
│     │   • Status: "searching"                                             │  │
│     │   • DAG nodes: search_0 ✓, search_1 ✓, search_2 ⚡ (running)        │  │
│     │   • Workers: 2 complete, 1 in progress                              │  │
│     │   • Analysis: not started                                           │  │
│     │   • Report: not started                                             │  │
│     │                                                                     │  │
│     │ Resume decision:                                                    │  │
│     │   → Continue from search_2 (skip completed work)                    │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  4. CONTINUE EXECUTION                                                       │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ // State machine picks up from current status                       │  │
│     │ switch state.Status {                                               │  │
│     │ case "searching":                                                   │  │
│     │     // Find pending nodes in DAG                                    │  │
│     │     readyNodes := getReadyNodes(state.DAG) // search_2              │  │
│     │     executeNodes(ctx, state, readyNodes)                            │  │
│     │     fallthrough                                                     │  │
│     │ case "analyzing":                                                   │  │
│     │     executeAnalysis(ctx, state)                                     │  │
│     │     // ... continue through phases                                  │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  5. NEW EVENTS APPENDED                                                      │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ Events added during resume:                                         │  │
│     │   • WorkerCompletedEvent (search_2)                                 │  │
│     │   • AnalysisStartedEvent                                            │  │
│     │   • CrossValidationCompletedEvent                                   │  │
│     │   • ...                                                             │  │
│     │   • ReportGeneratedEvent                                            │  │
│     │   • ResearchCompletedEvent                                          │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 CLI Commands for Resume

```go
// internal/adapters/primary/cli/handlers/resume.go
package handlers

func (h *ResearchHandler) HandleResume(ctx *Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /resume <session_id>")
    }

    sessionID := args[0]

    // Start visualization
    vis := NewVisualizer(ctx.Renderer, h.events)
    vis.Start()
    defer vis.Stop()

    // Resume research via orchestrator
    state, err := h.orchestrator.Resume(ctx.RunContext, sessionID)
    if err != nil {
        return fmt.Errorf("resume failed: %w", err)
    }

    // Update context
    ctx.Session = state

    // Render result
    if state.Report != nil {
        ctx.Renderer.RenderReport(state.Report)
    }

    return nil
}

func (h *ResearchHandler) HandleList(ctx *Context, args []string) error {
    ids, err := h.eventStore.GetAllAggregateIDs(ctx.RunContext)
    if err != nil {
        return err
    }

    ctx.Renderer.Println("\nAvailable sessions:\n")

    for _, id := range ids {
        // Load just enough to show status
        events, _ := h.eventStore.LoadEvents(ctx.RunContext, id)
        state, _ := aggregate.LoadFromEvents(id, events)

        statusIcon := getStatusIcon(state.Status)
        ctx.Renderer.Printf("  %s %s - %s (%s)\n",
            statusIcon,
            id,
            truncate(state.Query, 50),
            state.Status,
        )
    }

    ctx.Renderer.Println("\nUse /resume <session_id> to continue interrupted research")
    return nil
}
```

---

## Part 9: Wiring It All Together

### 9.1 Main Entry Point

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
    cfg := config.Load()

    // Create event store (filesystem-based)
    eventStore := filesystem.NewEventStore(cfg.EventStoreDir)

    // Create event bus
    eventBus := events.NewBus(100)
    defer eventBus.Close()

    // Create secondary adapters
    llmProvider := llm.NewOpenRouterAdapter(cfg.OpenRouterAPIKey, cfg.Model)
    toolExecutor := tools.NewRegistry(cfg.BraveAPIKey)
    obsidianWriter := obsidian.NewProjectionWriter(cfg.VaultPath)

    // Register event handlers for side effects

    // 1. Storage handler - persists all domain events
    storageHandler := events.NewStorageHandler(eventStore)
    eventBus.RegisterHandler(storageHandler)

    // 2. Obsidian handler - updates vault on key events
    obsidianHandler := events.NewObsidianHandler(obsidianWriter, eventStore)
    eventBus.RegisterHandler(obsidianHandler)

    // Create application services
    orchestrator := service.NewDeepOrchestratorES(
        eventStore,
        eventBus,
        llmProvider,
        toolExecutor,
    )

    // Create CLI adapter
    repl := cli.NewREPL(
        orchestrator,
        eventStore,
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

## Part 10: Migration Strategy

### Phase 1: Add Event Infrastructure (Non-Breaking)

1. Create event types in `internal/core/domain/events/`
2. Create aggregate in `internal/core/domain/aggregate/`
3. Create event store port and filesystem adapter
4. Existing code continues to work unchanged

### Phase 2: Add Event Sourcing to Orchestrator

1. Create `DeepOrchestratorES` alongside existing `DeepOrchestrator`
2. Add `/research-es` command to test new path
3. Verify events are persisted correctly
4. Verify resume works

### Phase 3: Add Obsidian Projection Handler

1. Create projection handler that updates Obsidian on events
2. Test that Obsidian updates match existing behavior
3. Remove direct Obsidian writes from orchestrator

### Phase 4: Migrate to Event-Sourced Orchestrator

1. Replace `DeepOrchestrator` with `DeepOrchestratorES`
2. Add `/resume` command
3. Update `/sessions` to list from event store
4. Remove old session storage code

### Phase 5: Add Alternative Storage Adapters

1. Create PostgreSQL event store adapter
2. Create S3 event store adapter
3. Make adapter selection configurable

---

## Architecture Insights

### Key Design Decisions

1. **Events are the source of truth** - State is always derivable from events
2. **Commands validate, events apply** - Separation of concerns
3. **Handlers are fire-and-forget** - Don't block the command path
4. **Projections are derived** - Obsidian is a read model, not the source
5. **Snapshots are optional optimization** - System works without them

### Benefits

| Benefit                  | How It's Achieved                  |
| ------------------------ | ---------------------------------- |
| **Interruptibility**     | State persisted after every event  |
| **Resumability**         | Replay events to reconstruct state |
| **Audit Trail**          | Every change is an immutable event |
| **Pluggable Storage**    | Port/adapter pattern for backends  |
| **Time Travel**          | Replay to any point in history     |
| **Multiple Projections** | Same events → Obsidian, DB, API    |

### Trade-offs

| Trade-off            | Mitigation                            |
| -------------------- | ------------------------------------- |
| Storage overhead     | Snapshots reduce replay cost          |
| Complexity           | Clear command/event separation        |
| Eventual consistency | Inline projections for critical paths |
| Event versioning     | Schema evolution strategy needed      |

---

## Historical Context (from thoughts/)

- `thoughts/shared/research/2025-01-25_ports-adapters-architecture-go-research.md` - Prior research on hexagonal architecture for this codebase
- `thoughts/shared/plans/go-research-hexagonal-refactoring.md` - Related refactoring plan

---

## Open Questions

1. **Event schema versioning** - How to handle event format changes over time?
2. **Snapshot frequency** - When to take snapshots? Every N events? After phases?
3. **Projection consistency** - Should Obsidian updates be synchronous for immediate consistency?
4. **Multi-session handling** - Should event bus be global or per-session?

---

## Sources

### Event Sourcing References

- [Event Sourcing pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Event Sourcing pattern - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing.html)
- [Event Sourcing - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Event Sourcing applied - the Aggregate - Los Techies](https://lostechies.com/gabrielschenker/2015/06/06/event-sourcing-applied-the-aggregate/)
- [Snapshots in Event Sourcing - Kurrent](https://www.kurrent.io/blog/snapshots-in-event-sourcing)

### Domain Events References

- [Domain Events vs. Event Sourcing - INNOQ](https://www.innoq.com/en/blog/2019/01/domain-events-versus-event-sourcing/)
- [Domain Events vs. Integration Events - Cesar de la Torre](https://devblogs.microsoft.com/cesardelatorre/domain-events-vs-integration-events-in-domain-driven-design-and-microservices-architectures/)

### Go Implementation References

- [hallgren/eventsourcing - GitHub](https://github.com/hallgren/eventsourcing)
- [Event Sourcing in Go: From Zero to Production - Serge Skoredin](https://skoredin.pro/blog/golang/event-sourcing-go)
- [Simplifying Event Sourcing in Golang - TheFabric.IO](https://www.thefabric.io/blog/simplifying-event-sourcing-in-golang)
- [Event Sourcing in Go - Victor Martinez](https://victoramartinez.com/posts/event-sourcing-in-go/)
- [Implementing pluggable backends in Go - Justin Azoff](https://justin.azoff.dev/blog/implementing-pluggable-backends-in-go/)

### Patterns and Best Practices

- [CQRS Best Practices - GitHub](https://github.com/slashdotdash/cqrs-best-practices)
- [Guide to Projections and Read Models - Event-Driven.io](https://event-driven.io/en/projections_and_read_models_in_event_driven_architecture/)
- [Saga Pattern in Distributed Transactions - Rost Glukhov](https://www.glukhov.org/post/2025/11/saga-transactions-in-microservices/)
