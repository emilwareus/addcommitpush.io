## STORM Architecture

The **STORM** architecture ("Synthesis of Topic Outlines through Retrieval and Multi-perspective Questioning") powers the `/storm` command. It implements multi-perspective research with **event sourcing** so research can be paused, resumed, and audited.

> **Core idea:** Multi-perspective ReAct loops where every step is recorded as an event. Crash? Resume exactly where you left off.

---

## The Agentic Loop

### Same Loop, Different Persistence

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STORM ORCHESTRATOR                          │
│                                                                     │
│  ┌──────────┐    ┌──────────────────────────────────┐               │
│  │ PLANNER  │───▶│  PERSPECTIVE WORKERS (parallel)  │               │
│  │          │    │  ┌────────┐ ┌────────┐ ┌────────┐│               │
│  │ "What    │    │  │Worker 0│ │Worker 1│ │Worker 2││               │
│  │  angles  │    │  │ ReAct  │ │ ReAct  │ │ ReAct  ││               │
│  │  should  │    │  │  Loop  │ │  Loop  │ │  Loop  ││               │
│  │  we      │    │  └───┬────┘ └───┬────┘ └───┬────┘│               │
│  │  cover?" │    │      │          │          │     │               │
│  └──────────┘    │      ▼          ▼          ▼     │               │
│                  │   ╔═══════════════════════════╗  │               │
│                  │   ║  EVENTS RECORDED TO DISK  ║  │               │
│                  │   ╚═══════════════════════════╝  │               │
│                  └──────────────────────────────────┘               │
│                         │          │          │                     │
│                         ▼          ▼          ▼                     │
│                  ┌─────────────────────────────────┐                │
│                  │        ANALYSIS AGENT           │                │
│                  │  Cross-validate + find gaps     │                │
│                  └───────────────┬─────────────────┘                │
│                                  │                                  │
│                                  ▼                                  │
│                  ┌─────────────────────────────────┐                │
│                  │         GAP FILLER              │                │
│                  └───────────────┬─────────────────┘                │
│                                  │                                  │
│                                  ▼                                  │
│                  ┌─────────────────────────────────┐                │
│                  │       SYNTHESIS AGENT           │                │
│                  └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

---

### The ReAct Loop

Each perspective worker runs the same **think → act → observe → evaluate** loop:

```
          ┌─────────────────────────────────────────┐
          │           ReAct LOOP (max 3 iters)      │
          │                                         │
          │   ┌─────────────┐                       │
          │   │   THINK     │  "What do I need?"    │
          │   │  (LLM call) │                       │
          │   └──────┬──────┘                       │
          │          │                              │
          │          ▼                              │
          │   ┌─────────────┐                       │
          │   │    ACT      │  Execute web search   │
          │   │ (tool call) │  via Brave API        │
          │   └──────┬──────┘                       │
          │          │                              │
          │          ▼                              │
          │   ┌─────────────┐                       │
          │   │  OBSERVE    │  Extract facts from   │
          │   │  (LLM call) │  search results       │
          │   └──────┬──────┘                       │
          │          │                              │
          │          ▼                              │
          │   ┌─────────────┐                       │
          │   │  EVALUATE   │  "Do I have enough?"  │
          │   │  (LLM call) │                       │
          │   └──────┬──────┘                       │
          │          │                              │
          │          ▼                              │
          │     ╔═════════╗                         │
          │     ║  DONE?  ║──Yes──▶ Return facts    │
          │     ╚════╤════╝                         │
          │          │ No                           │
          │          │                              │
          │          └──────────▶ Loop back         │
          │                       to THINK          │
          └─────────────────────────────────────────┘
```

The only difference: **every step emits an event** that gets persisted to disk.

---

### Event Sourcing Benefits

STORM persists every action to an event store, enabling:

- **Resumability** – Crash? Resume from the last event
- **Auditability** – Full history of every worker step, tool call, and decision
- **Debugging** – Replay events to understand what happened
- **State reconstruction** – Aggregate state is rebuilt from events, not stored directly

**Resume flow:**

```
  /resume session-123
        │
        ▼
  ┌─────────────────┐
  │ Load event log  │
  │ from disk       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Replay events   │
  │ to rebuild      │
  │ aggregate state │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Continue from   │
  │ where we        │
  │ left off        │
  └─────────────────┘
```

---

## Key Files

| Component | File |
|-----------|------|
| Event-sourced orchestrator | `internal/orchestrator/deep_eventsourced.go` |
| Architecture adapter | `internal/architectures/storm/storm.go` |
| Domain aggregates | `internal/core/domain/aggregate` |
| Event store | `internal/adapters/storage/filesystem` |

---

## References

- **[Stanford STORM](https://github.com/stanford-oval/storm)** – The original multi-perspective research agent. Our architecture is named after and directly inspired by this work.
- **[STORM Paper (arXiv)](https://arxiv.org/abs/2402.14207)** – "Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models"
- **[ReAct: Synergizing Reasoning and Acting](https://arxiv.org/abs/2210.03629)** – The think-act-observe loop pattern used by each perspective worker.
- **[Event Sourcing (Martin Fowler)](https://martinfowler.com/eaaDev/EventSourcing.html)** – The persistence pattern that enables resume and audit capabilities.

