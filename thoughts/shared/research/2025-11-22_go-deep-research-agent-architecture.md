---
date: 2025-11-22T12:16:54Z
researcher: Claude
git_commit: 86dca03ec2e572219e7ffd1612e60a4aae8331ef
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: "Go Deep Research Agent Architecture"
tags: [architecture, golang, deep-research, interactive-cli, multi-agent]
status: complete
last_updated: 2025-11-22
last_updated_by: Claude
---

# Go Deep Research Agent Architecture

**Date**: 2025-11-22T12:16:54Z
**Researcher**: Claude
**Git Commit**: 86dca03ec2e572219e7ffd1612e60a4aae8331ef
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Executive Summary

This document defines the architecture for a Go-based deep research agent that replaces the existing Python implementation. The system is designed around an **interactive-first** philosophy where the REPL is the primary interface. It uses goroutines and channels for concurrent worker orchestration, provides continuous user feedback via streaming, and persists sessions to an Obsidian-compatible vault.

## Design Principles

1. **Interactive-First**: The REPL is the main interface; CLI commands are secondary
2. **Streaming Feedback**: Users see real-time progress, not just final results
3. **Channel-Driven Concurrency**: Goroutines communicate via channels, not shared memory
4. **Session Continuity**: Every interaction builds on previous context
5. **Clean Separation**: Domain logic isolated from I/O and presentation
6. **No Fallbacks**: Fail fast with clear errors rather than silent degradation

## Core Requirements

| Requirement | Description |
|-------------|-------------|
| Fast Research | Single worker, quick turnaround for simple queries |
| Deep Research | Multi-worker parallel execution for complex queries |
| Obsidian Integration | Markdown vault with YAML frontmatter, linked notes |
| Session Management | Persist, load, continue, expand sessions |
| Interactive Mode | REPL with `/commands`, natural follow-ups route to expand |
| Streaming Output | Real-time feedback as workers progress |

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Interface                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        Interactive REPL                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │   │
│  │  │   Parser    │→ │  Router     │→ │  Command Handlers       │   │   │
│  │  │ /cmd + text │  │ cmd vs chat │  │ start/expand/recompile  │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                           Orchestration Layer                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐      ┌─────────────────┐      ┌────────────────┐   │
│  │  Orchestrator   │      │  Worker Pool    │      │  Synthesizer   │   │
│  │  (LeadResearch) │ ←──→ │  (goroutines)   │ ───→ │  (Report Gen)  │   │
│  └────────┬────────┘      └────────┬────────┘      └────────────────┘   │
│           │                        │                                     │
│           ↓                        ↓                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Event Bus (channels)                        │    │
│  │   progress ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ → results                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│                              Core Domain                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │  ReactAgent   │  │    Tools      │  │   LLM Client  │                │
│  │  (ReAct loop) │  │ Search/Fetch  │  │  (OpenRouter) │                │
│  └───────────────┘  └───────────────┘  └───────────────┘                │
├─────────────────────────────────────────────────────────────────────────┤
│                            Persistence Layer                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐      ┌─────────────────────────────────────┐   │
│  │   Session Store     │      │        Obsidian Writer              │   │
│  │  (in-memory + disk) │ ←──→ │  (markdown vault, linked notes)     │   │
│  └─────────────────────┘      └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Package Structure

```
go-research/
├── cmd/
│   └── research/
│       └── main.go                 # Entry point
├── internal/
│   ├── repl/                       # Interactive REPL (primary interface)
│   │   ├── repl.go                 # Main REPL loop
│   │   ├── parser.go               # Command parsing (/cmd vs text)
│   │   ├── router.go               # Route to handlers
│   │   ├── completer.go            # Tab completion
│   │   ├── renderer.go             # Terminal output rendering
│   │   └── handlers/
│   │       ├── start.go            # /start, /fast, /deep commands
│   │       ├── expand.go           # /expand and follow-up routing
│   │       ├── session.go          # /sessions, /load, /save
│   │       ├── worker.go           # /workers, /rerun
│   │       ├── report.go           # /recompile
│   │       └── settings.go         # /model, /verbose, /config
│   ├── orchestrator/               # Research coordination
│   │   ├── orchestrator.go         # Main orchestrator
│   │   ├── planner.go              # Query analysis & task decomposition
│   │   ├── pool.go                 # Worker pool management
│   │   └── synthesizer.go          # Result synthesis
│   ├── agent/                      # Core agent implementation
│   │   ├── react.go                # ReAct agent loop
│   │   ├── worker.go               # Worker agent wrapper
│   │   └── prompts.go              # System prompts
│   ├── llm/                        # LLM client
│   │   ├── client.go               # OpenRouter client
│   │   ├── models.go               # Model configurations
│   │   └── stream.go               # Streaming response handler
│   ├── tools/                      # Research tools
│   │   ├── search.go               # Brave Search API
│   │   ├── fetch.go                # Web content fetching
│   │   └── registry.go             # Tool registry
│   ├── session/                    # Session management
│   │   ├── session.go              # Session data structures
│   │   ├── store.go                # Session persistence
│   │   └── context.go              # Context building for continuation
│   ├── obsidian/                   # Obsidian vault integration
│   │   ├── writer.go               # Write sessions to vault
│   │   ├── loader.go               # Load sessions from vault
│   │   └── templates.go            # Markdown templates
│   ├── events/                     # Event system
│   │   ├── bus.go                  # Channel-based event bus
│   │   └── types.go                # Event type definitions
│   └── config/                     # Configuration
│       └── config.go               # Environment & settings
├── pkg/                            # Public packages (if needed)
│   └── types/
│       └── types.go                # Shared types
├── go.mod
├── go.sum
└── README.md
```

---

## Core Data Structures

### Session & State

```go
// internal/session/session.go

package session

import "time"

// Session represents a complete research session
type Session struct {
    ID              string            `json:"id" yaml:"session_id"`
    Version         int               `json:"version" yaml:"version"`
    ParentID        *string           `json:"parent_id,omitempty" yaml:"parent_session_id,omitempty"`
    Query           string            `json:"query" yaml:"query"`
    ComplexityScore float64           `json:"complexity_score" yaml:"complexity_score"`
    Workers         []WorkerContext   `json:"workers" yaml:"-"`
    Report          string            `json:"report" yaml:"-"`
    Sources         []string          `json:"sources" yaml:"sources"`
    Insights        []Insight         `json:"insights" yaml:"-"`
    Cost            CostBreakdown     `json:"cost" yaml:"cost"`
    CreatedAt       time.Time         `json:"created_at" yaml:"created_at"`
    UpdatedAt       time.Time         `json:"updated_at" yaml:"updated_at"`
    Status          SessionStatus     `json:"status" yaml:"status"`
}

type SessionStatus string

const (
    StatusPending    SessionStatus = "pending"
    StatusRunning    SessionStatus = "running"
    StatusComplete   SessionStatus = "complete"
    StatusFailed     SessionStatus = "failed"
    StatusExpanded   SessionStatus = "expanded"
)

// WorkerContext captures full execution context for a worker
type WorkerContext struct {
    ID              string           `json:"id"`
    WorkerNum       int              `json:"worker_num"`
    Objective       string           `json:"objective"`
    ToolsAvailable  []string         `json:"tools_available"`
    ExpectedOutput  string           `json:"expected_output"`
    Iterations      []ReActIteration `json:"iterations"`
    ToolCalls       []ToolCall       `json:"tool_calls"`
    FinalOutput     string           `json:"final_output"`
    Summary         string           `json:"summary"`
    Sources         []string         `json:"sources"`
    Status          WorkerStatus     `json:"status"`
    Cost            CostBreakdown    `json:"cost"`
    StartedAt       time.Time        `json:"started_at"`
    CompletedAt     *time.Time       `json:"completed_at,omitempty"`
    Error           *string          `json:"error,omitempty"`
}

type WorkerStatus string

const (
    WorkerPending  WorkerStatus = "pending"
    WorkerRunning  WorkerStatus = "running"
    WorkerComplete WorkerStatus = "complete"
    WorkerFailed   WorkerStatus = "failed"
)

// ReActIteration captures one think-act cycle
type ReActIteration struct {
    Number    int       `json:"number"`
    Thought   string    `json:"thought"`
    Action    string    `json:"action"`
    Result    string    `json:"result"`
    Timestamp time.Time `json:"timestamp"`
}

// ToolCall records a tool invocation
type ToolCall struct {
    Tool      string                 `json:"tool"`
    Args      map[string]interface{} `json:"args"`
    Result    string                 `json:"result"`
    Success   bool                   `json:"success"`
    Duration  time.Duration          `json:"duration"`
    Iteration int                    `json:"iteration"`
    Timestamp time.Time              `json:"timestamp"`
}

// Insight represents an extracted research insight
type Insight struct {
    Title       string   `json:"title"`
    Finding     string   `json:"finding"`
    Implication string   `json:"implication"`
    Confidence  float64  `json:"confidence"`
    Sources     []string `json:"sources"`
    WorkerID    string   `json:"worker_id"`
}

// CostBreakdown tracks token usage and costs
type CostBreakdown struct {
    InputTokens  int     `json:"input_tokens"`
    OutputTokens int     `json:"output_tokens"`
    TotalTokens  int     `json:"total_tokens"`
    InputCost    float64 `json:"input_cost"`
    OutputCost   float64 `json:"output_cost"`
    TotalCost    float64 `json:"total_cost"`
}
```

### Events

```go
// internal/events/types.go

package events

import "time"

// Event represents a system event
type Event struct {
    Type      EventType
    Timestamp time.Time
    Data      interface{}
}

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

    // Session events
    EventSessionCreated
    EventSessionLoaded
    EventSessionSaved
    EventSessionExpanded
)

// Specific event data structures
type ResearchStartedData struct {
    SessionID string
    Query     string
    Mode      string // "fast" or "deep"
}

type WorkerProgressData struct {
    WorkerID   string
    WorkerNum  int
    Objective  string
    Iteration  int
    Status     string
    Message    string
}

type ToolCallData struct {
    WorkerID string
    Tool     string
    Args     map[string]interface{}
}

type ToolResultData struct {
    WorkerID string
    Tool     string
    Success  bool
    Preview  string // First 200 chars
}
```

---

## Channel Architecture

The system uses a hub-and-spoke channel pattern for clean goroutine communication:

```go
// internal/events/bus.go

package events

import (
    "context"
    "sync"
)

// Bus is a channel-based event distribution system
type Bus struct {
    mu          sync.RWMutex
    subscribers map[EventType][]chan Event
    buffer      int
}

// NewBus creates a new event bus
func NewBus(bufferSize int) *Bus {
    return &Bus{
        subscribers: make(map[EventType][]chan Event),
        buffer:      bufferSize,
    }
}

// Subscribe creates a channel for receiving events of specific types
func (b *Bus) Subscribe(types ...EventType) <-chan Event {
    ch := make(chan Event, b.buffer)
    b.mu.Lock()
    defer b.mu.Unlock()
    for _, t := range types {
        b.subscribers[t] = append(b.subscribers[t], ch)
    }
    return ch
}

// Publish sends an event to all subscribers
func (b *Bus) Publish(event Event) {
    b.mu.RLock()
    defer b.mu.RUnlock()
    for _, ch := range b.subscribers[event.Type] {
        select {
        case ch <- event:
        default:
            // Drop if buffer full - non-blocking
        }
    }
}

// Close shuts down all subscriber channels
func (b *Bus) Close() {
    b.mu.Lock()
    defer b.mu.Unlock()
    for _, channels := range b.subscribers {
        for _, ch := range channels {
            close(ch)
        }
    }
}
```

### Worker Pool with Channels

```go
// internal/orchestrator/pool.go

package orchestrator

import (
    "context"
    "sync"

    "go-research/internal/agent"
    "go-research/internal/events"
    "go-research/internal/session"
)

// Task represents a research sub-task
type Task struct {
    ID             string
    WorkerNum      int
    Objective      string
    Tools          []string
    ExpectedOutput string
}

// WorkerPool manages concurrent worker execution
type WorkerPool struct {
    bus         *events.Bus
    maxWorkers  int
    agentConfig agent.Config
}

// WorkerResult contains the outcome of a worker's research
type WorkerResult struct {
    Task    Task
    Context session.WorkerContext
    Error   error
}

// Execute runs all tasks concurrently and collects results
func (p *WorkerPool) Execute(ctx context.Context, tasks []Task) []WorkerResult {
    var (
        wg      sync.WaitGroup
        results = make([]WorkerResult, len(tasks))
        taskCh  = make(chan int, len(tasks)) // Task indices
    )

    // Spawn worker goroutines (up to maxWorkers)
    numWorkers := min(p.maxWorkers, len(tasks))
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for idx := range taskCh {
                results[idx] = p.executeTask(ctx, tasks[idx])
            }
        }()
    }

    // Send tasks to workers
    for i := range tasks {
        taskCh <- i
    }
    close(taskCh)

    wg.Wait()
    return results
}

// executeTask runs a single worker agent
func (p *WorkerPool) executeTask(ctx context.Context, task Task) WorkerResult {
    p.bus.Publish(events.Event{
        Type: events.EventWorkerStarted,
        Data: events.WorkerProgressData{
            WorkerID:  task.ID,
            WorkerNum: task.WorkerNum,
            Objective: task.Objective,
            Status:    "starting",
        },
    })

    worker := agent.NewWorker(p.agentConfig, p.bus, task.WorkerNum)
    workerCtx, err := worker.Research(ctx, task.Objective)

    result := WorkerResult{
        Task:    task,
        Context: workerCtx,
        Error:   err,
    }

    if err != nil {
        p.bus.Publish(events.Event{
            Type: events.EventWorkerFailed,
            Data: events.WorkerProgressData{
                WorkerID:  task.ID,
                WorkerNum: task.WorkerNum,
                Status:    "failed",
                Message:   err.Error(),
            },
        })
    } else {
        p.bus.Publish(events.Event{
            Type: events.EventWorkerComplete,
            Data: events.WorkerProgressData{
                WorkerID:  task.ID,
                WorkerNum: task.WorkerNum,
                Status:    "complete",
            },
        })
    }

    return result
}

func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}
```

---

## Interactive REPL Design

### Command Routing

The REPL distinguishes between commands (start with `/`) and natural language (routed to expand/continue):

```go
// internal/repl/router.go

package repl

import (
    "strings"

    "go-research/internal/repl/handlers"
    "go-research/internal/session"
)

// Router routes input to appropriate handlers
type Router struct {
    session  *session.Session
    handlers map[string]Handler
}

// Handler interface for command handlers
type Handler interface {
    Execute(ctx Context, args []string) error
}

// Context provides shared state to handlers
type Context struct {
    Session   *session.Session
    Store     *session.Store
    Bus       *events.Bus
    Renderer  *Renderer
}

// Route determines how to handle user input
func (r *Router) Route(input string) (Handler, []string, error) {
    input = strings.TrimSpace(input)

    // Empty input - do nothing
    if input == "" {
        return nil, nil, nil
    }

    // Commands start with /
    if strings.HasPrefix(input, "/") {
        return r.routeCommand(input)
    }

    // Natural language goes to expand (follow-up)
    return r.handlers["expand"], []string{input}, nil
}

func (r *Router) routeCommand(input string) (Handler, []string, error) {
    parts := strings.Fields(input)
    cmd := strings.TrimPrefix(parts[0], "/")
    args := parts[1:]

    // Aliases
    switch cmd {
    case "q", "quit", "exit":
        cmd = "quit"
    case "f", "fast":
        cmd = "fast"
    case "d", "deep":
        cmd = "deep"
    case "s", "sessions":
        cmd = "sessions"
    case "l", "load":
        cmd = "load"
    case "w", "workers":
        cmd = "workers"
    case "r", "rerun":
        cmd = "rerun"
    case "rc", "recompile":
        cmd = "recompile"
    case "e", "expand":
        cmd = "expand"
    case "h", "help", "?":
        cmd = "help"
    }

    handler, ok := r.handlers[cmd]
    if !ok {
        return r.handlers["help"], nil, nil
    }

    return handler, args, nil
}
```

### REPL Main Loop

```go
// internal/repl/repl.go

package repl

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"

    "github.com/chzyer/readline"
    "go-research/internal/events"
    "go-research/internal/session"
)

// REPL is the interactive research shell
type REPL struct {
    router   *Router
    store    *session.Store
    bus      *events.Bus
    renderer *Renderer
    readline *readline.Instance
    ctx      Context
}

// New creates a new REPL instance
func New(store *session.Store, bus *events.Bus) (*REPL, error) {
    rl, err := readline.NewEx(&readline.Config{
        Prompt:          "\033[36mresearch>\033[0m ",
        HistoryFile:     os.ExpandEnv("$HOME/.research_history"),
        AutoComplete:    newCompleter(),
        InterruptPrompt: "^C",
        EOFPrompt:       "exit",
    })
    if err != nil {
        return nil, fmt.Errorf("readline init: %w", err)
    }

    r := &REPL{
        store:    store,
        bus:      bus,
        renderer: NewRenderer(os.Stdout),
        readline: rl,
    }

    r.ctx = Context{
        Store:    store,
        Bus:      bus,
        Renderer: r.renderer,
    }

    r.router = NewRouter(r.ctx)

    return r, nil
}

// Run starts the interactive REPL
func (r *REPL) Run(ctx context.Context) error {
    // Handle signals
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    // Try to restore last session
    if sess, err := r.store.LoadLast(); err == nil && sess != nil {
        r.ctx.Session = sess
        r.renderer.SessionRestored(sess)
    } else {
        r.renderer.Welcome()
    }

    // Subscribe to events for rendering
    eventCh := r.bus.Subscribe(
        events.EventWorkerStarted,
        events.EventWorkerProgress,
        events.EventWorkerComplete,
        events.EventWorkerFailed,
        events.EventToolCall,
        events.EventToolResult,
        events.EventSynthesisStarted,
        events.EventResearchComplete,
    )

    // Event rendering goroutine
    go func() {
        for event := range eventCh {
            r.renderer.RenderEvent(event)
        }
    }()

    // Main REPL loop
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case sig := <-sigCh:
            r.renderer.Info(fmt.Sprintf("Received %v, saving session...", sig))
            r.saveCurrentSession()
            return nil
        default:
            line, err := r.readline.Readline()
            if err != nil {
                if err == readline.ErrInterrupt {
                    continue
                }
                return err
            }

            handler, args, err := r.router.Route(line)
            if err != nil {
                r.renderer.Error(err)
                continue
            }

            if handler == nil {
                continue
            }

            if err := handler.Execute(r.ctx, args); err != nil {
                r.renderer.Error(err)
            }
        }
    }
}

func (r *REPL) saveCurrentSession() {
    if r.ctx.Session != nil {
        r.store.Save(r.ctx.Session)
    }
}
```

### Command Handlers

#### Fast Research (`/fast <query>`)

```go
// internal/repl/handlers/start.go

package handlers

import (
    "context"
    "fmt"
    "strings"
    "time"

    "go-research/internal/agent"
    "go-research/internal/events"
    "go-research/internal/repl"
    "go-research/internal/session"
)

// FastHandler handles /fast command (single worker)
type FastHandler struct{}

func (h *FastHandler) Execute(ctx repl.Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /fast <query>")
    }

    query := strings.Join(args, " ")

    // Create new session
    sess := session.New(query, session.ModeFast)
    ctx.Session = sess
    ctx.Renderer.ResearchStarting(sess, "fast")

    // Publish start event
    ctx.Bus.Publish(events.Event{
        Type: events.EventResearchStarted,
        Data: events.ResearchStartedData{
            SessionID: sess.ID,
            Query:     query,
            Mode:      "fast",
        },
    })

    // Run single agent
    agentCfg := agent.DefaultConfig()
    agentCfg.MaxIterations = 15

    reactAgent := agent.NewReact(agentCfg, ctx.Bus)

    runCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
    defer cancel()

    workerCtx, err := reactAgent.Research(runCtx, query)
    if err != nil {
        sess.Status = session.StatusFailed
        return fmt.Errorf("research failed: %w", err)
    }

    sess.Workers = []session.WorkerContext{workerCtx}
    sess.Report = workerCtx.FinalOutput
    sess.Sources = workerCtx.Sources
    sess.Cost = workerCtx.Cost
    sess.Status = session.StatusComplete

    // Save to store
    ctx.Store.Save(sess)

    ctx.Bus.Publish(events.Event{
        Type: events.EventResearchComplete,
        Data: sess,
    })

    ctx.Renderer.ResearchComplete(sess)

    return nil
}
```

#### Deep Research (`/deep <query>`)

```go
// internal/repl/handlers/start.go (continued)

// DeepHandler handles /deep command (multi-worker)
type DeepHandler struct{}

func (h *DeepHandler) Execute(ctx repl.Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /deep <query>")
    }

    query := strings.Join(args, " ")

    // Create new session
    sess := session.New(query, session.ModeDeep)
    ctx.Session = sess
    ctx.Renderer.ResearchStarting(sess, "deep")

    // Run orchestrator
    orch := orchestrator.New(ctx.Bus, orchestrator.DefaultConfig())

    runCtx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
    defer cancel()

    result, err := orch.Research(runCtx, query)
    if err != nil {
        sess.Status = session.StatusFailed
        return fmt.Errorf("research failed: %w", err)
    }

    // Populate session from result
    sess.ComplexityScore = result.ComplexityScore
    sess.Workers = result.Workers
    sess.Report = result.Report
    sess.Sources = result.Sources
    sess.Insights = result.Insights
    sess.Cost = result.Cost
    sess.Status = session.StatusComplete

    // Save and write to Obsidian
    ctx.Store.Save(sess)

    ctx.Bus.Publish(events.Event{
        Type: events.EventResearchComplete,
        Data: sess,
    })

    ctx.Renderer.ResearchComplete(sess)

    return nil
}
```

#### Expand (`/expand <query>` or natural follow-up)

```go
// internal/repl/handlers/expand.go

package handlers

import (
    "context"
    "fmt"
    "strings"
    "time"

    "go-research/internal/orchestrator"
    "go-research/internal/repl"
    "go-research/internal/session"
)

// ExpandHandler handles /expand and natural language follow-ups
type ExpandHandler struct{}

func (h *ExpandHandler) Execute(ctx repl.Context, args []string) error {
    if ctx.Session == nil {
        return fmt.Errorf("no active session. Start research with /fast or /deep first")
    }

    if len(args) == 0 {
        return fmt.Errorf("usage: /expand <follow-up query>")
    }

    followUp := strings.Join(args, " ")

    // Build continuation context from previous session
    continuationCtx := session.BuildContinuationContext(ctx.Session)

    // Create expansion query
    expandedQuery := fmt.Sprintf(`Based on previous research about "%s":

%s

Follow-up question: %s`, ctx.Session.Query, continuationCtx, followUp)

    // Create new version of session
    newSess := ctx.Session.NewVersion()
    newSess.Query = followUp
    ctx.Session = newSess

    ctx.Renderer.ExpandStarting(newSess, followUp)

    // Run based on original mode
    var err error
    if ctx.Session.Mode == session.ModeFast {
        err = h.runFast(ctx, expandedQuery)
    } else {
        err = h.runDeep(ctx, expandedQuery)
    }

    if err != nil {
        return err
    }

    ctx.Store.Save(newSess)
    ctx.Renderer.ExpandComplete(newSess)

    return nil
}

func (h *ExpandHandler) runFast(ctx repl.Context, query string) error {
    // Similar to FastHandler but uses expanded query
    // ... implementation
}

func (h *ExpandHandler) runDeep(ctx repl.Context, query string) error {
    // Similar to DeepHandler but uses expanded query
    // ... implementation
}
```

#### Rerun Worker (`/rerun <worker_id>`)

```go
// internal/repl/handlers/worker.go

package handlers

import (
    "context"
    "fmt"
    "strconv"
    "time"

    "go-research/internal/agent"
    "go-research/internal/repl"
)

// RerunHandler handles /rerun command
type RerunHandler struct{}

func (h *RerunHandler) Execute(ctx repl.Context, args []string) error {
    if ctx.Session == nil {
        return fmt.Errorf("no active session")
    }

    if len(args) == 0 {
        return fmt.Errorf("usage: /rerun <worker_number>")
    }

    workerNum, err := strconv.Atoi(args[0])
    if err != nil || workerNum < 1 || workerNum > len(ctx.Session.Workers) {
        return fmt.Errorf("invalid worker number: %s", args[0])
    }

    worker := ctx.Session.Workers[workerNum-1]
    ctx.Renderer.RerunStarting(workerNum, worker.Objective)

    // Re-run the worker with same objective
    agentCfg := agent.DefaultConfig()
    reactAgent := agent.NewReact(agentCfg, ctx.Bus)

    runCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
    defer cancel()

    newWorkerCtx, err := reactAgent.Research(runCtx, worker.Objective)
    if err != nil {
        return fmt.Errorf("rerun failed: %w", err)
    }

    // Update session
    ctx.Session.Workers[workerNum-1] = newWorkerCtx
    ctx.Session.Version++

    ctx.Store.Save(ctx.Session)
    ctx.Renderer.RerunComplete(workerNum)

    return nil
}
```

#### Recompile Report (`/recompile [instructions]`)

```go
// internal/repl/handlers/report.go

package handlers

import (
    "context"
    "fmt"
    "strings"

    "go-research/internal/orchestrator"
    "go-research/internal/repl"
)

// RecompileHandler handles /recompile command
type RecompileHandler struct{}

func (h *RecompileHandler) Execute(ctx repl.Context, args []string) error {
    if ctx.Session == nil {
        return fmt.Errorf("no active session")
    }

    if len(ctx.Session.Workers) == 0 {
        return fmt.Errorf("no worker results to synthesize")
    }

    instructions := ""
    if len(args) > 0 {
        instructions = strings.Join(args, " ")
    }

    ctx.Renderer.RecompileStarting()

    synth := orchestrator.NewSynthesizer(ctx.Bus)

    report, err := synth.Synthesize(
        context.Background(),
        ctx.Session.Query,
        ctx.Session.Workers,
        instructions,
    )
    if err != nil {
        return fmt.Errorf("recompile failed: %w", err)
    }

    ctx.Session.Report = report
    ctx.Session.Version++

    ctx.Store.Save(ctx.Session)
    ctx.Renderer.RecompileComplete(ctx.Session)

    return nil
}
```

---

## Orchestrator

```go
// internal/orchestrator/orchestrator.go

package orchestrator

import (
    "context"
    "fmt"
    "time"

    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/session"
)

// Config for orchestrator
type Config struct {
    MaxWorkers        int
    WorkerTimeout     time.Duration
    MaxIterations     int
    ComplexityLow     float64 // Below this = 1 worker
    ComplexityMed     float64 // Below this = 3 workers
}

func DefaultConfig() Config {
    return Config{
        MaxWorkers:    5,
        WorkerTimeout: 30 * time.Minute,
        MaxIterations: 20,
        ComplexityLow: 0.3,
        ComplexityMed: 0.6,
    }
}

// Orchestrator coordinates multi-agent research
type Orchestrator struct {
    bus     *events.Bus
    config  Config
    client  *llm.Client
    pool    *WorkerPool
    planner *Planner
    synth   *Synthesizer
}

// New creates a new Orchestrator
func New(bus *events.Bus, config Config) *Orchestrator {
    client := llm.NewClient()

    return &Orchestrator{
        bus:     bus,
        config:  config,
        client:  client,
        pool:    NewPool(bus, config.MaxWorkers),
        planner: NewPlanner(client),
        synth:   NewSynthesizer(bus),
    }
}

// Result from orchestrated research
type Result struct {
    ComplexityScore float64
    Workers         []session.WorkerContext
    Report          string
    Sources         []string
    Insights        []session.Insight
    Cost            session.CostBreakdown
}

// Research executes a multi-agent research workflow
func (o *Orchestrator) Research(ctx context.Context, query string) (*Result, error) {
    // 1. Analyze query complexity
    o.bus.Publish(events.Event{Type: events.EventQueryAnalyzed})

    complexity, err := o.planner.AnalyzeComplexity(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("complexity analysis: %w", err)
    }

    // 2. Create research plan
    o.bus.Publish(events.Event{Type: events.EventPlanCreated})

    numWorkers := o.workersForComplexity(complexity)
    tasks, err := o.planner.CreatePlan(ctx, query, numWorkers)
    if err != nil {
        return nil, fmt.Errorf("plan creation: %w", err)
    }

    // 3. Execute workers in parallel
    results := o.pool.Execute(ctx, tasks)

    // 4. Collect successful results
    var workers []session.WorkerContext
    var allSources []string
    var totalCost session.CostBreakdown

    for _, r := range results {
        if r.Error != nil {
            continue
        }
        workers = append(workers, r.Context)
        allSources = append(allSources, r.Context.Sources...)
        totalCost.Add(r.Context.Cost)
    }

    if len(workers) == 0 {
        return nil, fmt.Errorf("all workers failed")
    }

    // 5. Synthesize results
    o.bus.Publish(events.Event{Type: events.EventSynthesisStarted})

    report, err := o.synth.Synthesize(ctx, query, workers, "")
    if err != nil {
        return nil, fmt.Errorf("synthesis: %w", err)
    }

    o.bus.Publish(events.Event{Type: events.EventSynthesisComplete})

    return &Result{
        ComplexityScore: complexity,
        Workers:         workers,
        Report:          report,
        Sources:         dedupe(allSources),
        Cost:            totalCost,
    }, nil
}

func (o *Orchestrator) workersForComplexity(score float64) int {
    switch {
    case score < o.config.ComplexityLow:
        return 1
    case score < o.config.ComplexityMed:
        return 3
    default:
        return 5
    }
}
```

---

## LLM Client

```go
// internal/llm/client.go

package llm

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "time"
)

const (
    openRouterURL = "https://openrouter.ai/api/v1/chat/completions"
    modelID       = "alibaba/tongyi-deepresearch-30b-a3b"
)

// Client handles LLM API calls
type Client struct {
    apiKey     string
    httpClient *http.Client
    model      string
}

// NewClient creates a new LLM client
func NewClient() *Client {
    return &Client{
        apiKey:     os.Getenv("OPENROUTER_API_KEY"),
        httpClient: &http.Client{Timeout: 5 * time.Minute},
        model:      modelID,
    }
}

// Message represents a chat message
type Message struct {
    Role    string `json:"role"`
    Content string `json:"content"`
}

// ChatRequest is the API request
type ChatRequest struct {
    Model       string    `json:"model"`
    Messages    []Message `json:"messages"`
    Temperature float64   `json:"temperature,omitempty"`
    MaxTokens   int       `json:"max_tokens,omitempty"`
    Stream      bool      `json:"stream,omitempty"`
}

// ChatResponse is the API response
type ChatResponse struct {
    Choices []struct {
        Message Message `json:"message"`
    } `json:"choices"`
    Usage struct {
        PromptTokens     int `json:"prompt_tokens"`
        CompletionTokens int `json:"completion_tokens"`
        TotalTokens      int `json:"total_tokens"`
    } `json:"usage"`
}

// Chat sends a chat completion request
func (c *Client) Chat(ctx context.Context, messages []Message) (*ChatResponse, error) {
    req := ChatRequest{
        Model:       c.model,
        Messages:    messages,
        Temperature: 0.7,
        MaxTokens:   8192,
    }

    body, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }

    httpReq, err := http.NewRequestWithContext(ctx, "POST", openRouterURL, bytes.NewReader(body))
    if err != nil {
        return nil, err
    }

    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
    httpReq.Header.Set("HTTP-Referer", "https://github.com/emilwareus/go-research")

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
    }

    var chatResp ChatResponse
    if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
        return nil, err
    }

    return &chatResp, nil
}

// StreamChat sends a streaming chat request (for real-time output)
func (c *Client) StreamChat(ctx context.Context, messages []Message, handler func(chunk string) error) error {
    req := ChatRequest{
        Model:       c.model,
        Messages:    messages,
        Temperature: 0.7,
        MaxTokens:   8192,
        Stream:      true,
    }

    body, err := json.Marshal(req)
    if err != nil {
        return err
    }

    httpReq, err := http.NewRequestWithContext(ctx, "POST", openRouterURL, bytes.NewReader(body))
    if err != nil {
        return err
    }

    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
    httpReq.Header.Set("HTTP-Referer", "https://github.com/emilwareus/go-research")

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    // Parse SSE stream
    decoder := json.NewDecoder(resp.Body)
    for {
        var event struct {
            Choices []struct {
                Delta struct {
                    Content string `json:"content"`
                } `json:"delta"`
            } `json:"choices"`
        }
        if err := decoder.Decode(&event); err != nil {
            if err == io.EOF {
                break
            }
            return err
        }

        if len(event.Choices) > 0 && event.Choices[0].Delta.Content != "" {
            if err := handler(event.Choices[0].Delta.Content); err != nil {
                return err
            }
        }
    }

    return nil
}
```

---

## ReAct Agent

```go
// internal/agent/react.go

package agent

import (
    "context"
    "fmt"
    "regexp"
    "time"

    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/session"
    "go-research/internal/tools"
)

// Config for ReAct agent
type Config struct {
    MaxIterations int
    MaxTokens     int
    Verbose       bool
}

func DefaultConfig() Config {
    return Config{
        MaxIterations: 20,
        MaxTokens:     50000,
        Verbose:       false,
    }
}

// React implements the ReAct (Reason + Act) agent pattern
type React struct {
    config   Config
    bus      *events.Bus
    client   *llm.Client
    tools    *tools.Registry
    messages []llm.Message
    tokens   int
}

// NewReact creates a new ReAct agent
func NewReact(config Config, bus *events.Bus) *React {
    return &React{
        config: config,
        bus:    bus,
        client: llm.NewClient(),
        tools:  tools.NewRegistry(),
    }
}

// Research executes the ReAct loop for a query
func (r *React) Research(ctx context.Context, query string) (session.WorkerContext, error) {
    workerCtx := session.WorkerContext{
        StartedAt: time.Now(),
        Status:    session.WorkerRunning,
    }

    // Initialize messages
    r.messages = []llm.Message{
        {Role: "system", Content: systemPrompt},
        {Role: "user", Content: fmt.Sprintf("Research this topic: %s", query)},
    }

    for i := 0; i < r.config.MaxIterations; i++ {
        r.bus.Publish(events.Event{
            Type: events.EventIterationStarted,
            Data: map[string]int{"iteration": i + 1},
        })

        // Get LLM response
        resp, err := r.client.Chat(ctx, r.messages)
        if err != nil {
            return workerCtx, fmt.Errorf("LLM call failed: %w", err)
        }

        content := resp.Choices[0].Message.Content
        r.tokens += resp.Usage.TotalTokens
        workerCtx.Cost.TotalTokens += resp.Usage.TotalTokens

        // Record iteration
        iter := session.ReActIteration{
            Number:    i + 1,
            Timestamp: time.Now(),
        }

        // Check for final answer
        if r.hasAnswer(content) {
            answer := r.extractAnswer(content)
            workerCtx.FinalOutput = answer
            workerCtx.Status = session.WorkerComplete
            now := time.Now()
            workerCtx.CompletedAt = &now

            r.bus.Publish(events.Event{
                Type: events.EventAnswerFound,
                Data: map[string]string{"answer_preview": truncate(answer, 200)},
            })

            return workerCtx, nil
        }

        // Parse and execute tool calls
        toolCalls := r.parseToolCalls(content)
        if len(toolCalls) > 0 {
            for _, tc := range toolCalls {
                r.bus.Publish(events.Event{
                    Type: events.EventToolCall,
                    Data: events.ToolCallData{
                        Tool: tc.Tool,
                        Args: tc.Args,
                    },
                })

                result, err := r.tools.Execute(ctx, tc.Tool, tc.Args)
                success := err == nil

                toolResult := session.ToolCall{
                    Tool:      tc.Tool,
                    Args:      tc.Args,
                    Result:    result,
                    Success:   success,
                    Iteration: i + 1,
                    Timestamp: time.Now(),
                }
                workerCtx.ToolCalls = append(workerCtx.ToolCalls, toolResult)

                // Add result to messages
                r.messages = append(r.messages, llm.Message{
                    Role:    "assistant",
                    Content: content,
                })
                r.messages = append(r.messages, llm.Message{
                    Role:    "user",
                    Content: fmt.Sprintf("Tool result for %s:\n%s", tc.Tool, result),
                })

                r.bus.Publish(events.Event{
                    Type: events.EventToolResult,
                    Data: events.ToolResultData{
                        Tool:    tc.Tool,
                        Success: success,
                        Preview: truncate(result, 200),
                    },
                })

                // Collect sources from search results
                if tc.Tool == "search" {
                    workerCtx.Sources = append(workerCtx.Sources, extractURLs(result)...)
                }
            }
        } else {
            // No tool calls, add to messages and continue
            r.messages = append(r.messages, llm.Message{
                Role:    "assistant",
                Content: content,
            })
        }

        iter.Thought = extractThought(content)
        iter.Action = extractAction(content)
        workerCtx.Iterations = append(workerCtx.Iterations, iter)

        // Check token budget
        if r.tokens > int(float64(r.config.MaxTokens)*0.9) {
            r.messages = append(r.messages, llm.Message{
                Role:    "system",
                Content: "Token budget nearly exhausted. Please provide your final answer now using <answer></answer> tags.",
            })
        }
    }

    // Max iterations reached
    workerCtx.Status = session.WorkerComplete
    workerCtx.FinalOutput = "Research concluded after maximum iterations."
    now := time.Now()
    workerCtx.CompletedAt = &now

    return workerCtx, nil
}

var answerRegex = regexp.MustCompile(`(?s)<answer>(.*?)</answer>`)

func (r *React) hasAnswer(content string) bool {
    return answerRegex.MatchString(content)
}

func (r *React) extractAnswer(content string) string {
    match := answerRegex.FindStringSubmatch(content)
    if len(match) > 1 {
        return match[1]
    }
    return content
}

// ToolCall parsed from LLM response
type ToolCallParsed struct {
    Tool string
    Args map[string]interface{}
}

func (r *React) parseToolCalls(content string) []ToolCallParsed {
    // Parse <tool>...</tool> blocks or JSON tool calls
    // Implementation details...
    return nil
}

func truncate(s string, n int) string {
    if len(s) <= n {
        return s
    }
    return s[:n] + "..."
}
```

---

## Obsidian Integration

```go
// internal/obsidian/writer.go

package obsidian

import (
    "fmt"
    "os"
    "path/filepath"
    "text/template"
    "time"

    "go-research/internal/session"
    "gopkg.in/yaml.v3"
)

// Writer handles writing sessions to Obsidian vault
type Writer struct {
    vaultPath string
}

// NewWriter creates a new Obsidian writer
func NewWriter(vaultPath string) *Writer {
    return &Writer{vaultPath: vaultPath}
}

// Write persists a session to the Obsidian vault
func (w *Writer) Write(sess *session.Session) error {
    // Create session directory structure
    sessionDir := filepath.Join(w.vaultPath, sess.ID)
    dirs := []string{
        sessionDir,
        filepath.Join(sessionDir, "workers"),
        filepath.Join(sessionDir, "insights"),
        filepath.Join(sessionDir, "sources"),
        filepath.Join(sessionDir, "reports"),
    }

    for _, dir := range dirs {
        if err := os.MkdirAll(dir, 0755); err != nil {
            return fmt.Errorf("create dir %s: %w", dir, err)
        }
    }

    // Write worker files
    for i, worker := range sess.Workers {
        if err := w.writeWorker(sessionDir, i+1, worker); err != nil {
            return err
        }
    }

    // Write report
    if err := w.writeReport(sessionDir, sess); err != nil {
        return err
    }

    // Write session MOC (Map of Content)
    if err := w.writeSessionMOC(sessionDir, sess); err != nil {
        return err
    }

    return nil
}

func (w *Writer) writeWorker(dir string, num int, worker session.WorkerContext) error {
    filename := filepath.Join(dir, "workers", fmt.Sprintf("worker_%d.md", num))

    frontmatter := map[string]interface{}{
        "worker_id": worker.ID,
        "objective": worker.Objective,
        "status":    worker.Status,
        "started":   worker.StartedAt.Format(time.RFC3339),
        "sources":   len(worker.Sources),
    }

    fm, _ := yaml.Marshal(frontmatter)

    content := fmt.Sprintf(`---
%s---

# Worker %d: %s

## Output

%s

## Sources

`, string(fm), num, worker.Objective, worker.FinalOutput)

    for _, src := range worker.Sources {
        content += fmt.Sprintf("- %s\n", src)
    }

    return os.WriteFile(filename, []byte(content), 0644)
}

func (w *Writer) writeReport(dir string, sess *session.Session) error {
    filename := filepath.Join(dir, "reports", fmt.Sprintf("report_v%d.md", sess.Version))

    content := fmt.Sprintf(`---
version: %d
query: "%s"
generated: %s
---

# Research Report

%s
`, sess.Version, sess.Query, time.Now().Format(time.RFC3339), sess.Report)

    return os.WriteFile(filename, []byte(content), 0644)
}

func (w *Writer) writeSessionMOC(dir string, sess *session.Session) error {
    filename := filepath.Join(dir, "session.md")

    frontmatter := map[string]interface{}{
        "session_id":       sess.ID,
        "version":          sess.Version,
        "query":            sess.Query,
        "complexity_score": sess.ComplexityScore,
        "status":           sess.Status,
        "created_at":       sess.CreatedAt.Format(time.RFC3339),
        "updated_at":       sess.UpdatedAt.Format(time.RFC3339),
        "cost":             sess.Cost.TotalCost,
    }

    fm, _ := yaml.Marshal(frontmatter)

    tmpl := `---
{{.Frontmatter}}---

# Research Session: {{.Query}}

## Workers

{{range $i, $w := .Workers}}
- [[workers/worker_{{inc $i}}.md|Worker {{inc $i}}]]: {{$w.Objective}}
{{end}}

## Reports

- [[reports/report_v{{.Version}}.md|Report v{{.Version}}]]

## Stats

- **Complexity**: {{printf "%.2f" .ComplexityScore}}
- **Workers**: {{len .Workers}}
- **Sources**: {{len .Sources}}
- **Cost**: ${{printf "%.4f" .Cost.TotalCost}}
`

    t := template.Must(template.New("moc").Funcs(template.FuncMap{
        "inc": func(i int) int { return i + 1 },
    }).Parse(tmpl))

    f, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer f.Close()

    return t.Execute(f, struct {
        Frontmatter string
        *session.Session
    }{string(fm), sess})
}
```

---

## Terminal Renderer

```go
// internal/repl/renderer.go

package repl

import (
    "fmt"
    "io"
    "strings"
    "time"

    "github.com/fatih/color"
    "go-research/internal/events"
    "go-research/internal/session"
)

// Renderer handles terminal output formatting
type Renderer struct {
    w io.Writer
}

// NewRenderer creates a new renderer
func NewRenderer(w io.Writer) *Renderer {
    return &Renderer{w: w}
}

// Colors
var (
    cyan    = color.New(color.FgCyan)
    green   = color.New(color.FgGreen)
    yellow  = color.New(color.FgYellow)
    red     = color.New(color.FgRed)
    bold    = color.New(color.Bold)
    dim     = color.New(color.Faint)
)

// Welcome shows the welcome message
func (r *Renderer) Welcome() {
    cyan.Fprintln(r.w, `
╔═══════════════════════════════════════════════════════════╗
║                    Go Research Agent                       ║
║                                                           ║
║  Commands:                                                ║
║    /fast <query>    - Quick single-worker research        ║
║    /deep <query>    - Multi-worker deep research          ║
║    /expand <text>   - Expand on current research          ║
║    /sessions        - List all sessions                   ║
║    /load <id>       - Load a session                      ║
║    /workers         - Show workers in current session     ║
║    /rerun <n>       - Re-run worker n                     ║
║    /recompile       - Recompile report                    ║
║    /help            - Show all commands                   ║
║                                                           ║
║  Or just type to ask follow-up questions!                 ║
╚═══════════════════════════════════════════════════════════╝
`)
}

// SessionRestored shows restored session info
func (r *Renderer) SessionRestored(sess *session.Session) {
    r.Welcome()
    green.Fprintf(r.w, "\n✓ Restored session: %s\n", sess.ID)
    dim.Fprintf(r.w, "  Query: %s\n", truncate(sess.Query, 60))
    dim.Fprintf(r.w, "  Workers: %d | Sources: %d | Cost: $%.4f\n\n",
        len(sess.Workers), len(sess.Sources), sess.Cost.TotalCost)
}

// ResearchStarting shows research is beginning
func (r *Renderer) ResearchStarting(sess *session.Session, mode string) {
    fmt.Fprintln(r.w)
    cyan.Fprintf(r.w, "🔍 Starting %s research...\n", mode)
    dim.Fprintf(r.w, "   Session: %s\n", sess.ID)
    fmt.Fprintln(r.w)
}

// RenderEvent renders an event to the terminal
func (r *Renderer) RenderEvent(event events.Event) {
    switch event.Type {
    case events.EventWorkerStarted:
        data := event.Data.(events.WorkerProgressData)
        yellow.Fprintf(r.w, "  ⚡ Worker %d starting: %s\n",
            data.WorkerNum, truncate(data.Objective, 50))

    case events.EventWorkerProgress:
        data := event.Data.(events.WorkerProgressData)
        dim.Fprintf(r.w, "  │ Worker %d [iter %d]: %s\n",
            data.WorkerNum, data.Iteration, data.Message)

    case events.EventWorkerComplete:
        data := event.Data.(events.WorkerProgressData)
        green.Fprintf(r.w, "  ✓ Worker %d complete\n", data.WorkerNum)

    case events.EventWorkerFailed:
        data := event.Data.(events.WorkerProgressData)
        red.Fprintf(r.w, "  ✗ Worker %d failed: %s\n", data.WorkerNum, data.Message)

    case events.EventToolCall:
        data := event.Data.(events.ToolCallData)
        dim.Fprintf(r.w, "    → %s\n", data.Tool)

    case events.EventSynthesisStarted:
        cyan.Fprintln(r.w, "\n  📝 Synthesizing results...")

    case events.EventResearchComplete:
        fmt.Fprintln(r.w)
        green.Fprintln(r.w, "═══════════════════════════════════════════════════════════")
        green.Fprintln(r.w, "                    Research Complete                       ")
        green.Fprintln(r.w, "═══════════════════════════════════════════════════════════")
    }
}

// ResearchComplete shows the final report
func (r *Renderer) ResearchComplete(sess *session.Session) {
    fmt.Fprintln(r.w)
    bold.Fprintln(r.w, "Report:")
    fmt.Fprintln(r.w, strings.Repeat("─", 60))
    fmt.Fprintln(r.w, sess.Report)
    fmt.Fprintln(r.w, strings.Repeat("─", 60))
    fmt.Fprintln(r.w)

    dim.Fprintf(r.w, "Workers: %d | Sources: %d | Cost: $%.4f\n",
        len(sess.Workers), len(sess.Sources), sess.Cost.TotalCost)
    dim.Fprintf(r.w, "Session saved: %s\n\n", sess.ID)
}

// Error displays an error
func (r *Renderer) Error(err error) {
    red.Fprintf(r.w, "Error: %v\n", err)
}

// Info displays an info message
func (r *Renderer) Info(msg string) {
    cyan.Fprintf(r.w, "%s\n", msg)
}
```

---

## Configuration

```go
// internal/config/config.go

package config

import (
    "os"
    "path/filepath"
    "time"
)

// Config holds all configuration
type Config struct {
    // API Keys
    OpenRouterAPIKey string
    BraveAPIKey      string

    // Paths
    VaultPath    string
    HistoryFile  string
    StateFile    string

    // Timeouts
    WorkerTimeout  time.Duration
    RequestTimeout time.Duration

    // Agent settings
    MaxIterations int
    MaxTokens     int
    MaxWorkers    int

    // Verbose mode
    Verbose bool
}

// Load reads configuration from environment and defaults
func Load() *Config {
    home, _ := os.UserHomeDir()

    return &Config{
        OpenRouterAPIKey: os.Getenv("OPENROUTER_API_KEY"),
        BraveAPIKey:      os.Getenv("BRAVE_API_KEY"),

        VaultPath:   getEnvOrDefault("RESEARCH_VAULT", filepath.Join(home, "research-vault")),
        HistoryFile: filepath.Join(home, ".research_history"),
        StateFile:   filepath.Join(home, ".research_state"),

        WorkerTimeout:  30 * time.Minute,
        RequestTimeout: 5 * time.Minute,

        MaxIterations: 20,
        MaxTokens:     50000,
        MaxWorkers:    5,

        Verbose: os.Getenv("RESEARCH_VERBOSE") == "true",
    }
}

func getEnvOrDefault(key, def string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return def
}
```

---

## Command Reference

| Command | Alias | Description |
|---------|-------|-------------|
| `/fast <query>` | `/f` | Single-worker quick research |
| `/deep <query>` | `/d` | Multi-worker deep research |
| `/expand <text>` | `/e` | Expand on current session |
| `/sessions` | `/s` | List all saved sessions |
| `/load <id>` | `/l` | Load a specific session |
| `/workers` | `/w` | Show workers in current session |
| `/rerun <n>` | `/r` | Re-run worker n |
| `/recompile [text]` | `/rc` | Recompile report with optional instructions |
| `/model` | | Show/change current model |
| `/verbose` | `/v` | Toggle verbose output |
| `/help` | `/h`, `/?` | Show help |
| `/quit` | `/q` | Exit REPL |
| `<text>` | | Follow-up question (routes to expand) |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Input                                  │
│                         "/deep How does X work?"                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              REPL Parser                                 │
│                    Parse command and arguments                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Router                                      │
│                    Route to DeepHandler                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Orchestrator                                   │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ 1. AnalyzeComplexity(query) → 0.65                              │   │
│   │ 2. CreatePlan(query, 5) → [Task1, Task2, Task3, Task4, Task5]   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Worker 1     │     │    Worker 2     │     │   Worker 3-5    │
│   (goroutine)   │     │   (goroutine)   │     │  (goroutines)   │
│                 │     │                 │     │                 │
│  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │
│  │ ReactAgent│  │     │  │ ReactAgent│  │     │  │ ReactAgent│  │
│  │   Loop    │  │     │  │   Loop    │  │     │  │   Loop    │  │
│  └─────┬─────┘  │     │  └─────┬─────┘  │     │  └─────┬─────┘  │
│        │        │     │        │        │     │        │        │
│        ▼        │     │        ▼        │     │        ▼        │
│  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │
│  │   Tools   │  │     │  │   Tools   │  │     │  │   Tools   │  │
│  │Search/Fetch│ │     │  │Search/Fetch│ │     │  │Search/Fetch│ │
│  └───────────┘  │     │  └───────────┘  │     │  └───────────┘  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    ┌──────────────────┼───────────────────┐   │
         │    │                  │                   │   │
         │    │           Event Bus                  │   │
         │    │   (progress events via channels)     │   │
         │    │                  │                   │   │
         │    └──────────────────┼───────────────────┘   │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Result Channel                                │
│              Collect WorkerContext from all workers                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Synthesizer                                   │
│          Combine worker summaries → Generate final report               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   Session Store     │  │ Obsidian Writer │  │    Renderer         │
│  (in-memory + JSON) │  │  (markdown vault)│  │ (terminal output)   │
└─────────────────────┘  └─────────────────┘  └─────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Project structure and go.mod
- [ ] Configuration loading
- [ ] LLM client (OpenRouter + Alibaba model)
- [ ] Event bus with channels
- [ ] Basic terminal renderer

### Phase 2: Agent & Tools
- [ ] Search tool (Brave API)
- [ ] Fetch tool (web scraping)
- [ ] Tool registry
- [ ] ReAct agent loop
- [ ] Answer detection and extraction

### Phase 3: Orchestration
- [ ] Query complexity analysis
- [ ] Task decomposition planner
- [ ] Worker pool with goroutines
- [ ] Result synthesizer
- [ ] Cost tracking

### Phase 4: Session Management
- [ ] Session data structures
- [ ] In-memory store
- [ ] JSON persistence
- [ ] Session versioning
- [ ] Context building for continuation

### Phase 5: Obsidian Integration
- [ ] Vault directory structure
- [ ] Worker markdown files
- [ ] Report files with versions
- [ ] Session MOC (Map of Content)
- [ ] YAML frontmatter

### Phase 6: Interactive REPL
- [ ] Readline integration
- [ ] Command parser
- [ ] Router (command vs text)
- [ ] All command handlers
- [ ] Tab completion
- [ ] Session restore on startup

### Phase 7: Polish
- [ ] Streaming output
- [ ] Progress indicators
- [ ] Error handling
- [ ] Graceful shutdown
- [ ] Documentation

---

## Dependencies

```go
// go.mod

module go-research

go 1.22

require (
    github.com/chzyer/readline v1.5.1   // REPL readline
    github.com/fatih/color v1.16.0      // Terminal colors
    gopkg.in/yaml.v3 v3.0.1             // YAML parsing
)
```

Minimal dependencies - no heavy frameworks. The LLM client uses stdlib `net/http`.

---

## Open Questions

1. **Streaming vs Batched**: Should final synthesis stream to terminal or batch?
 - Streaming. Try to use streaming APIs when interacting with LLMs, I want it to feel responsive to users. 
2. **Insight Extraction**: Keep separate LLM call (Python uses Claude) or same model?
 - No, same model for everything. but centralize the configuration of what model I use for what parts. so it is easy to change. but same model (alibaba/tongyi-deepresearch-30b-a3b) for everything now for simplicity.
3. **Search Provider**: Brave only, or add fallback to DuckDuckGo?
 - Brave only
4. **State File Format**: JSON sufficient, or use SQLite for complex queries?
 - JSON to begin with. 


ALSO, no fallback logic whatsoever. fallback logic is strictly forbidding. IMPORTANT! NO FALLBACK LOGIC EVER!
---

## References

- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)
- [OpenRouter API](https://openrouter.ai/docs)
- [Brave Search API](https://brave.com/search/api/)
- [Obsidian Markdown](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown)
