# Architecture Research

**Domain:** installable deep-research operating system for Codex and Claude Code
**Researched:** 2026-04-10
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     Runtime Adapters                        │
├─────────────────────────────────────────────────────────────┤
│  Codex adapter   Claude adapter   Install/update surface    │
└──────────────┬───────────────┬──────────────────────────────┘
               │               │
┌──────────────▼───────────────▼──────────────────────────────┐
│                    Workflow Layer                           │
├─────────────────────────────────────────────────────────────┤
│  init  harvest  promote  synthesize  report  status verify  │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                  Core Graph Engine / CLI                    │
├─────────────────────────────────────────────────────────────┤
│  IDs  validation  lineage  freshness  indexing  mutation    │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                    Artifact Store                           │
├─────────────────────────────────────────────────────────────┤
│ brief.md  manifest.json  sources.json  insights/            │
│ data/     analysis/      reports/                           │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Runtime adapters | Translate the shared workflow model into Codex and Claude Code install surfaces | Skills, commands, hooks, settings, and small adapter scripts |
| Workflow layer | Route user intent into bounded steps and worker tasks | Prompt contracts with thin orchestration |
| Core graph engine | Own IDs, validation, backlinks, dependency invalidation, and deterministic mutation | TypeScript CLI/library |
| Artifact store | Hold the durable research state | Markdown + JSON + optional analysis assets |
| Worker layer | Perform harvesting, auditing, extraction, synthesis, and report writing | Specialized subagents with narrow scope |

## Recommended Project Structure

```text
src/
├── core/              # graph engine, IDs, validation, lineage, freshness
├── cli/               # command entrypoints and installer-facing actions
├── adapters/          # codex and claude runtime-specific install logic
├── workflows/         # runtime-neutral workflow contracts and prompt assets
├── templates/         # generated artifact templates
├── schemas/           # JSON schemas and validators
└── installers/        # install, update, uninstall helpers
```

### Structure Rationale

- **`core/`** should remain runtime-neutral so Codex and Claude adapters do not fork the business logic.
- **`adapters/`** isolates runtime-specific install surfaces and config behavior.
- **`workflows/`** keeps prompt assets explicit and versioned.
- **`templates/` and `schemas/`** make artifacts predictable and toolable.

## Architectural Patterns

### Pattern 1: Artifact-First Graph

**What:** Treat the research tree as the durable system of record.
**When to use:** Always; this is the product’s core identity.
**Trade-offs:** Higher upfront structure, much better auditability and reuse.

### Pattern 2: Thin Orchestrator, Deterministic Mutator

**What:** Prompt files decide what should happen; CLI/library code performs structured writes.
**When to use:** Any time JSON registries or lineage graphs are mutated.
**Trade-offs:** More tooling work, less entropy and fewer hidden state bugs.

### Pattern 3: Thin Runtime Adapters

**What:** Keep Codex and Claude Code as shells around a shared core.
**When to use:** For install, update, and command wiring.
**Trade-offs:** Adapter work still exists, but runtime drift is contained.

## Data Flow

### Request Flow

```text
User request
    ↓
Runtime adapter
    ↓
Workflow contract
    ↓
Core CLI / graph engine
    ↓
Artifact mutation
    ↓
Worker tasks and derived outputs
```

### Key Data Flows

1. **Research initialization:** `brief -> manifest -> sources registry -> folder scaffolding`
2. **Evidence promotion:** `source record -> source notes/data -> insight IDs -> analysis -> reports`
3. **Freshness propagation:** `stale source -> stale insight -> stale analysis -> stale report`

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single-user local research | Pure file-based store and local CLI are enough |
| Many active researches | Add indexing and stronger status commands before adding databases |
| Team or remote workflows | Consider optional sync or shared registries later, not in v1 |

### Scaling Priorities

1. **First bottleneck:** Artifact graph hygiene and stale propagation.
2. **Second bottleneck:** Runtime adapter drift across Codex and Claude Code versions.

## Anti-Patterns

### Anti-Pattern 1: Prompt-As-Database

**What people do:** Let agents implicitly remember graph state and lineage.
**Why it's wrong:** Refresh, audit, and reuse collapse when state is not explicit.
**Do this instead:** Keep structured registries and deterministic mutation tools.

### Anti-Pattern 2: Runtime-Specific Core Logic

**What people do:** Encode Codex rules in one path and Claude behavior in another.
**Why it's wrong:** Portability and maintainability disappear quickly.
**Do this instead:** Keep runtime-neutral core logic and thin adapters.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Web search / deep research tools | Optional adapters, not hardwired core dependencies | Keep the core portable |
| MCP / connectors | Runtime-specific integration boundary | Useful for scalable source ingestion |
| Python analysis tools | Optional analysis boundary | Keep isolated under `analysis/` workflows |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `workflows` ↔ `core` | CLI or library calls | Workflows should not hand-edit registries |
| `core` ↔ artifact store | structured file I/O | Validation and lineage must live here |
| `adapters` ↔ `workflows` | install and invocation mapping | Keep behavior stable across runtimes |

## Sources

- Internal project context: `.planning/PROJECT.md`, `researcher/ARTIFACT-MODEL.md`
- GSD architecture reference from `go-research/external_code/get-shit-done/docs/ARCHITECTURE.md`
- OpenAI Codex documentation and product guidance
- Anthropic Claude Code documentation for commands, skills, hooks, and settings

---
*Architecture research for: installable deep-research operating system for Codex and Claude Code*
*Researched: 2026-04-10*

