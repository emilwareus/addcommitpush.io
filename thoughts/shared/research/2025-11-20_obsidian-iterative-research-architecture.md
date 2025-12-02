---
date: 2025-11-20T10:31:21+0000
researcher: Emil Wareus
git_commit: c032b77aec5b215d766dad45f6511c629f728e73
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: "Obsidian-Based Iterative Research System Architecture"
tags: [research, deep-research-agent, obsidian, knowledge-graph, multi-agent, langgraph]
status: complete
last_updated: 2025-11-20
last_updated_by: Emil Wareus
---

# Research: Obsidian-Based Iterative Research System Architecture

**Date**: 2025-11-20T10:31:21+0000
**Researcher**: Emil Wareus
**Git Commit**: c032b77aec5b215d766dad45f6511c629f728e73
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Research Question

How can we transform the deep-research multi-agent system into an iterative, knowledge-graph-driven research platform using Obsidian as the persistence layer, enabling:
1. Full traceable session storage with complete worker context
2. Worker-specific research expansion via CLI
3. Report recompilation with custom synthesis instructions
4. Insights graph tracking using wikilinks
5. Versioned research sessions without data deletion

## Summary

Through comprehensive codebase analysis and external research into Obsidian's knowledge management capabilities, we discovered a viable architectural pattern for transforming the existing multi-agent research system into an iterative research platform. The current system loses critical context during worker result compression (orchestrator.py:352), limiting the ability to expand or reanalyze research. By implementing full context capture and Obsidian-based storage, we can enable iterative research workflows while maintaining backwards compatibility.

**Key Findings**:
- Current architecture compresses worker outputs from full context (10-50KB) to 2000 tokens (~8KB), losing 80-90% of research detail
- Obsidian's markdown + YAML frontmatter + wikilinks provide natural structure for research sessions as knowledge graphs
- LangGraph's state machine supports session tracking with minimal modifications
- HTTP connection pooling fixes from previous work enable parallel worker execution (critical for multi-worker sessions)
- CLI patterns in existing codebase (cli.py:74-237) provide template for `expand` and `recompile-report` commands

## Research Methodology

This research was conducted through parallel sub-agent investigation across five dimensions:

1. **codebase-analyzer** - Deep-research agent architecture analysis
   - Target: `orchestrator.py`, `state.py`, `worker.py`
   - Focus: Current data flow and compression points

2. **web-search-researcher** - Obsidian format and features
   - Focus: YAML frontmatter, wikilinks, graph view, Dataview plugin
   - Sources: Obsidian documentation, community guides

3. **codebase-pattern-finder** - Session persistence patterns
   - Target: `store.py`, `models.py`, `cli.py`
   - Focus: Existing storage mechanisms and data structures

4. **codebase-analyzer** - CLI command implementation patterns
   - Target: `cli.py`
   - Focus: Click decorators, async execution, session loading

5. **codebase-locator** - Output and storage locations
   - Focus: Directory structures, file organization patterns

## Detailed Findings

### 1. Current Architecture Limitations

#### Data Loss at Compression Point

**Location**: `deep-research-agent/src/deep_research/agent/orchestrator.py:351-364`

The orchestrator compresses worker findings before storing results:

```python
# Compress findings
summary = await self._compress(result.content, max_tokens=2000)

return {
    "worker_results": [{
        "task_id": task["id"],
        "summary": summary,  # ❌ Original full content is LOST
        "sources": result.sources,
        "metadata": result.metadata,
    }]
}
```

**What's Lost**:
- Full worker reasoning steps (ReAct thought-action-observation loops)
- All individual tool calls and their complete results
- Complete search queries and fetched page contents
- Worker's internal decision-making process
- Intermediate insights before compression

**Impact**: 80-90% of worker research context is discarded, making it impossible to:
- Accurately expand on specific worker findings
- Debug why certain conclusions were reached
- Recompile reports with different analytical angles
- Trace insights back to original evidence

#### Storage Pattern Limitations

**Location**: `deep-research-agent/src/deep_research/utils/store.py:15-22`

Current session storage:

```python
def save_session(self, session_id: str, data: dict[str, Any]) -> None:
    """Save session data."""
    path = self.base_path / f"{session_id}.json"
    data["saved_at"] = datetime.now().isoformat()
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
```

**Limitations Discovered**:
1. Only saves compressed summaries (not full worker context)
2. Single JSON file per session (no versioning)
3. No graph structure (can't link insights across sessions)
4. Session ID based on `hash(query)` - same query overwrites previous session
5. No human-readable exploration (JSON requires parsing)

### 2. Obsidian Knowledge Graph Capabilities

#### YAML Frontmatter for Metadata

Research into Obsidian documentation revealed that YAML frontmatter (also called "Properties" in Obsidian 1.4+) provides structured metadata storage at the file level:

```markdown
---
type: research_session
session_id: session_abc123
version: 1
query: "What are the latest trends in AI research?"
status: completed
created_at: 2025-01-20T14:25:00Z
updated_at: 2025-01-20T14:45:00Z
model: anthropic/claude-3.5-sonnet
complexity: 0.75
num_workers: 5
total_cost: 0.1234
parent_session: null
tags:
  - ai-research
  - machine-learning
---
```

**Benefits**:
- Queryable via Dataview plugin
- Native Obsidian UI display
- Git-friendly version control
- No external database required

#### Wikilinks for Graph Connections

Obsidian's `[[note name]]` syntax creates bidirectional links automatically:

```markdown
**Session**: [[session_abc123_v1]]
**Workers**:
- [[task_1_worker|Worker 1]]: Foundation models research
- [[task_2_worker|Worker 2]]: Multimodal AI systems

**Key Insights**:
- [[insight_20250120_143052|Foundation models reaching 10T parameters]]
```

**Graph View Benefits**:
- Visual exploration of research connections
- Discover non-obvious relationships
- Navigate between session → worker → insight → source
- Identify knowledge clusters

#### Dataview Query Language

The Dataview plugin enables SQL-like queries over markdown:

```dataview
TABLE objective, tool_calls, cost
FROM "workers/session_abc123"
WHERE type = "worker"
SORT created_at ASC
```

**Use Cases**:
- Aggregate worker costs across sessions
- Find all insights related to a topic
- Generate session summaries dynamically

### 3. Proposed Vault Structure

Based on Zettelkasten principles and MOC (Map of Content) patterns, we designed:

```
outputs/obsidian/
├── sessions/                    # Research sessions (MOCs)
│   ├── session_abc123_v1.md
│   ├── session_abc123_v2.md    # Same session, expansion/recompilation
│   └── session_def456_v1.md
├── workers/                     # Individual worker research
│   ├── session_abc123/
│   │   ├── task_1_worker.md
│   │   ├── task_2_worker.md
│   │   └── task_3_worker.md
│   └── session_def456/
│       ├── task_1_worker.md
│       └── task_2_worker.md
├── insights/                    # Atomic insights (Zettelkasten)
│   ├── insight_20250120_143052.md
│   ├── insight_20250120_143145.md
│   └── insight_20250120_144201.md
├── sources/                     # Downloaded web pages
│   ├── url_hash_abc123.md
│   └── url_hash_def456.md
└── reports/                     # Compiled reports
    ├── session_abc123_report_v1.md
    ├── session_abc123_report_v2.md  # Recompiled version
    └── session_def456_report_v1.md
```

**Rationale**:
- **sessions/**: Central MOCs that link to all related entities
- **workers/**: Grouped by session for organizational clarity
- **insights/**: Flat structure enables cross-session linking
- **sources/**: Deduplicated by URL hash
- **reports/**: Versioned outputs tied to sessions

### 4. Data Structures for Full Context Capture

#### Enhanced Worker Context

To preserve full research traces, we need:

```python
@dataclass
class WorkerFullContext:
    """Complete worker execution context (NOTHING compressed)."""
    task_id: str
    worker_id: str
    objective: str
    tools_available: list[str]
    expected_output: str

    # Full execution trace
    react_iterations: list[ReActIteration]  # Every thought-action-observation
    tool_calls: list[ToolCall]              # All tool invocations

    # Results
    final_output: str          # Full uncompressed worker output
    compressed_summary: str    # For backwards compatibility with synthesis
    sources: list[str]

    # Metadata
    status: str
    error: str | None
    started_at: datetime
    completed_at: datetime | None
    duration_seconds: float
    cost: float
    tokens: dict[str, int]
    model: str
```

**Storage Impact**: 500KB - 2MB per worker (vs 50KB compressed)
**Trade-off**: Storage is cheap (~$0.023/GB on S3), context is invaluable

#### Session Versioning

```python
@dataclass
class ResearchSession:
    """Full research session with versioning."""
    session_id: str        # e.g., "session_abc123"
    version: int           # v1, v2, v3...
    parent_session_id: str | None  # For expansions

    query: str
    complexity_score: float
    sub_tasks: list[dict[str, Any]]

    # Workers (FULL CONTEXT)
    workers: list[WorkerFullContext]

    # Reports
    report_versions: list[str]  # Paths to report markdown files

    # Insights
    insights: list[Insight]

    # Sources
    sources: list[dict[str, Any]]  # URLs with full content

    # Metadata
    status: str
    created_at: datetime
    updated_at: datetime
    model: str
    cost: float
    tokens: dict[str, int]

    # Obsidian
    obsidian_vault_path: str
    obsidian_links: dict[str, str]  # Map of entity_id -> file_path
```

**Versioning Pattern**: `session_{hash}_v{N}`
- Same base query → same session ID
- Expansions/recompilations increment version
- Never delete previous versions (audit trail)

### 5. Note Format Examples

#### Session MOC (Map of Content)

**File**: `outputs/obsidian/sessions/session_abc123_v1.md`

```markdown
---
type: research_session
session_id: session_abc123
version: 1
query: "What are the latest trends in AI research?"
status: completed
created_at: 2025-01-20T14:25:00Z
updated_at: 2025-01-20T14:45:00Z
model: anthropic/claude-3.5-sonnet
complexity: 0.75
num_workers: 5
total_cost: 0.1234
parent_session: null
tags:
  - ai-research
  - machine-learning
  - 2025-trends
---

# Research Session: Latest AI Research Trends

## Query
> What are the latest trends in AI research?

## Research Plan

Complexity: 0.75 (5 workers)

### Workers
1. [[task_1_worker|Worker 1]]: Foundation models and scaling laws
2. [[task_2_worker|Worker 2]]: Multimodal AI systems
3. [[task_3_worker|Worker 3]]: AI safety and alignment research
4. [[task_4_worker|Worker 4]]: Edge AI and efficiency
5. [[task_5_worker|Worker 5]]: AI applications in healthcare

## Compiled Reports

- [[session_abc123_report_v1|Report v1]] - Initial synthesis (2025-01-20 14:45)

## Key Insights

- [[insight_20250120_143052|Foundation models reaching 10T parameters]]
- [[insight_20250120_143145|Multimodal embeddings outperform unimodal]]
- [[insight_20250120_144201|Constitutional AI reducing harmful outputs]]

## Sources

Total: 45 sources across all workers

### By Worker
- Worker 1: 12 sources
- Worker 2: 9 sources
- Worker 3: 8 sources
- Worker 4: 7 sources
- Worker 5: 9 sources

## Graph View

```dataview
LIST
FROM [[session_abc123_v1]]
WHERE type = "worker" OR type = "insight"
```
```

**Purpose**: Central navigation hub linking to all session components

#### Worker Note with Full ReAct Trace

**File**: `outputs/obsidian/workers/session_abc123/task_1_worker.md`

```markdown
---
type: worker
session_id: session_abc123
session: "[[session_abc123_v1]]"
task_id: task_1
worker_id: task_1
objective: "Research foundation models and scaling laws in 2024-2025"
status: completed
created_at: 2025-01-20T14:26:00Z
completed_at: 2025-01-20T14:38:00Z
tool_calls: 15
cost: 0.0245
tags:
  - foundation-models
  - scaling-laws
  - transformers
---

# Worker: Foundation Models Research

**Session**: [[session_abc123_v1]]
**Objective**: Research foundation models and scaling laws in 2024-2025

## Research Process (ReAct Loop)

### Iteration 1

**Thought**: I need to find recent papers on scaling laws for large language models
**Action**: search(query="scaling laws foundation models 2024 2025")
**Observation**: Found 10 results including recent ArXiv papers

### Iteration 2

**Thought**: The ArXiv paper on "Scaling Laws Update 2024" looks promising
**Action**: fetch(url="https://arxiv.org/abs/2401.12345")
**Observation**: Retrieved full paper content (8,500 words). Key findings:
- Compute-optimal training now at 20x tokens per parameter
- Scaling efficiency improvements through sparse architectures

[... continues for all 15 tool calls ...]

## Key Findings

1. **[[insight_20250120_143052|Scaling Beyond 10T Parameters]]**
   - New architectures enable 10T+ parameter models
   - Cost-effective through mixture-of-experts

## Compressed Summary

*This is what gets passed to the synthesis step:*

Foundation models in 2024-2025 show continued scaling trends with models reaching 10T parameters through mixture-of-experts architectures...
```

**Critical Feature**: Full ReAct trace preserved for expansion and debugging

#### Insight Note (Zettelkasten)

**File**: `outputs/obsidian/insights/insight_20250120_143052.md`

```markdown
---
type: insight
insight_id: insight_20250120_143052
created_at: 2025-01-20T14:30:52Z
source_session: "[[session_abc123_v1]]"
source_worker: "[[task_1_worker]]"
tags:
  - scaling-laws
  - foundation-models
  - mixture-of-experts
confidence: high
---

# Foundation Models Reaching 10T Parameters

**Context**: [[session_abc123_v1]] → [[task_1_worker]]

## Insight

Foundation models are now reaching 10 trillion parameters through mixture-of-experts (MoE) architectures, while maintaining computational efficiency by activating only sparse subsets during inference.

## Evidence

- **Source**: [[url_hash_abc123|ArXiv Paper: Scaling Laws Update 2024]]
- **Key Quote**: "MoE architectures enable 10T+ parameter models while maintaining inference costs comparable to dense 1T models"
- **Validation**: Confirmed by [[url_hash_def456|Google PaLM 2 Technical Report]]

## Related Insights

- [[insight_20250120_143145|Compute-optimal training ratios]]
- [[insight_20250120_144201|Sparse activation patterns]]

## Follow-up Questions

- What are the training stability challenges for 10T+ models?
- How do MoE models compare to dense models on reasoning tasks?
```

**Purpose**: Atomic, reusable knowledge unit with full provenance

### 6. CLI Command Patterns

#### Expansion Command Architecture

Research into existing CLI patterns (cli.py:74-237) revealed the template for implementing expansion:

```python
@cli.command()
@click.option("--session", required=True, help="Session ID to expand")
@click.option("--worker", required=True, help="Worker ID to expand")
@click.argument("prompt")
@click.option("-m", "--model", type=click.Choice([m.value for m in SupportedModel]))
@click.option("-v", "--verbose", is_flag=True)
def expand(session: str, worker: str, prompt: str, model: str | None, verbose: bool) -> None:
    """Expand a specific worker's research with additional instructions."""
```

**Workflow**:
1. Load session from Obsidian vault
2. Extract target worker's full context
3. Build expansion query incorporating previous findings
4. Execute new research with parent session reference
5. Save as new version (v2, v3, etc.)

**Example Usage**:
```bash
research expand --session=session_abc123 --worker=task_1 "Research GPU costs in detail"
```

#### Recompilation Command Architecture

```python
@cli.command()
@click.option("--session", required=True, help="Session ID to recompile")
@click.argument("instructions", required=False)
@click.option("-m", "--model", type=click.Choice([m.value for m in SupportedModel]))
def recompile_report(session: str, instructions: str | None, model: str | None) -> None:
    """Recompile a research report with new synthesis instructions."""
```

**Workflow**:
1. Load session from Obsidian
2. Extract ALL worker full contexts (not compressed summaries)
3. Generate new synthesis with custom instructions
4. Save new report version
5. Update session MOC to reference new report

**Example Usage**:
```bash
research recompile-report --session=session_abc123 "Focus on cost-benefit analysis"
```

### 7. Implementation Architecture

#### ObsidianWriter Module

**Location**: `src/deep_research/obsidian/writer.py` (new module)

**Core Responsibilities**:
1. Create vault directory structure
2. Write session MOCs with frontmatter and wikilinks
3. Write worker notes with full ReAct traces
4. Write insight notes (if auto-extracted)
5. Write source pages with deduplicated content
6. Write versioned report files
7. Maintain bidirectional link integrity

**Key Methods**:
```python
class ObsidianWriter:
    def write_session(self, session: ResearchSession) -> Path:
        """Write complete session to Obsidian vault."""

    def _write_session_moc(self, session, worker_paths, insight_paths, source_paths) -> Path:
        """Write session MOC (Map of Content)."""

    def _write_workers(self, session: ResearchSession) -> dict[str, Path]:
        """Write all worker notes with full context."""

    def _write_insights(self, session: ResearchSession) -> list[Path]:
        """Write all insights (auto-extracted or manual)."""

    def _write_sources(self, session: ResearchSession) -> dict[str, Path]:
        """Write all source pages (deduplicated by URL hash)."""

    def _write_report(self, session, worker_paths) -> Path:
        """Write compiled report with Dataview queries."""
```

#### Enhanced Orchestrator Integration

**Location**: `src/deep_research/agent/orchestrator.py` (modifications)

**Required Changes**:
1. Add `save_to_obsidian` flag to `__init__()`
2. Initialize `ObsidianWriter` instance
3. Create `ResearchSession` tracking at start of `research()`
4. Capture full worker contexts in `_worker_execution()`
5. Write to Obsidian at end of `research()`
6. Add session ID and version to result metadata

**Critical Modification** (orchestrator.py:320-393):
```python
async def _worker_execution(self, state: dict[str, Any]) -> dict[str, Any]:
    """Execute worker - CAPTURE FULL CONTEXT."""
    # ... existing worker execution ...

    # NEW: Build FULL context
    full_context = WorkerFullContext(
        task_id=task["id"],
        worker_id=worker_id,
        objective=task["objective"],
        tools_available=task["tools"],
        expected_output=task["expected_output"],
        react_iterations=worker.react_iterations,  # Full trace
        tool_calls=worker.tool_calls,              # All tool calls
        final_output=result.content,               # UNCOMPRESSED
        compressed_summary=summary,                # For synthesis
        sources=result.sources,
        # ... metadata ...
    )

    # Add to session
    if self.session:
        self.session.workers.append(full_context)

    # Return compressed for synthesis (backwards compatibility)
    return {"worker_results": [{"summary": summary, ...}]}
```

**Key Insight**: Store full context for Obsidian, return compressed for synthesis (best of both worlds)

### 8. Architectural Decisions and Rationale

#### Why Obsidian Over Database?

**Advantages Discovered**:
- **Human-readable**: Direct markdown editing and reading
- **Built-in graph view**: Visual knowledge exploration (no custom visualization needed)
- **Dataview plugin**: SQL-like queries without database setup
- **Git-friendly**: Markdown files work perfectly with version control
- **No maintenance**: No database server, schema migrations, or backups
- **Community plugins**: Extensible without custom development
- **Offline-first**: Works without network connection

**Trade-offs**:
- File I/O slower than database for large-scale queries (10,000+ notes)
- No ACID guarantees (but single-user research doesn't need them)
- Manual index management (Dataview provides virtual indexes)

**Decision**: Obsidian is optimal for iterative research workflows where human exploration and editing are central. The vault becomes a "research lab" not just storage.

#### Why Store Full Context (Not Compressed)?

**Rationale**:
1. **Expansion accuracy**: LLM needs full context to continue research coherently
2. **Recompilation quality**: Different synthesis angles require access to all evidence
3. **Debugging capability**: Understand exactly what the worker saw and did
4. **Auditability**: Trace every decision back to original sources
5. **Research evolution**: Build knowledge over time, not just final outputs

**Cost Analysis**:
- Compressed: ~50KB per worker
- Full context: ~500KB - 2MB per worker (10-40x larger)
- Storage cost: ~$0.023/GB/month (S3 Standard)
- 100 workers = 50-200MB = ~$0.005/month

**Decision**: Storage is negligible compared to LLM costs ($0.005 storage vs $0.50-5.00 LLM costs per session). Context is invaluable.

#### Versioning Strategy

**Pattern**: `session_{hash}_v{N}`

**How It Works**:
- Initial query "What are AI trends?" → `session_abc123_v1`
- Expansion of worker 1 → `session_abc123_v2` (same base ID)
- Recompilation → `session_abc123_v3`
- Different query "What is Python?" → `session_def456_v1` (new base ID)

**Alternative Considered**: UUID per execution
- **Rejected**: Loses connection between related research sessions
- No way to know v2 expanded v1
- Graph becomes disconnected forest instead of connected graph

**Decision**: Hash-based session IDs with version numbers provide clear lineage and enable graph traversal across research iterations.

## Code References

### Current Architecture (What We Have)

- `deep-research-agent/src/deep_research/agent/orchestrator.py:65-79` - Research execution entry point
- `deep-research-agent/src/deep_research/agent/orchestrator.py:351-364` - **Critical compression point** (data loss)
- `deep-research-agent/src/deep_research/agent/orchestrator.py:438-454` - Compression implementation
- `deep-research-agent/src/deep_research/agent/state.py:1-24` - Current state definitions
- `deep-research-agent/src/deep_research/utils/store.py:15-22` - Current storage pattern
- `deep-research-agent/src/deep_research/cli.py:74-160` - Single-agent CLI command pattern
- `deep-research-agent/src/deep_research/cli.py:162-237` - Multi-agent CLI command pattern

### HTTP Fixes (Previously Implemented)

- `deep-research-agent/src/deep_research/llm/client.py:10-61` - Shared HTTP client with 100 connection limit
- `deep-research-agent/src/deep_research/tools/search.py:14-97` - Shared search HTTP client (50 connections)
- `deep-research-agent/src/deep_research/tools/fetch.py:15-114` - Shared fetch HTTP client (50 connections)
- `deep-research-agent/src/deep_research/utils/live_progress.py:24-201` - Thread-safe progress display

**Note**: These HTTP connection pooling fixes from previous work are **critical** for parallel worker execution. Without them, workers would hang waiting for connections.

## Architecture Insights

### LangGraph State Machine Pattern

The existing orchestrator uses LangGraph's state machine with dynamic parallel fan-out:

```python
workflow.add_conditional_edges("plan", self._spawn_workers, ["worker"])
```

This pattern already supports parallel worker execution, which is **perfect** for capturing full context per worker without blocking. Each worker runs independently and can store its full context to the session object concurrently.

### ReAct Loop Tracing

Workers currently use ReAct (Reason-Act-Observe) loops, but the iteration history is not preserved. To enable full tracing, the `WorkerAgent` class needs a `capture_full_context` flag that stores each iteration:

```python
class ReActIteration:
    iteration: int
    thought: str       # LLM reasoning
    action: ToolCall   # Tool invocation
    observation: str   # Tool result
    timestamp: datetime
```

### Compression Only for Synthesis

The key architectural insight: **Compress for synthesis, never for storage.**

Current flow:
1. Worker generates full output → compress → store compressed → synthesize

Proposed flow:
1. Worker generates full output → store full → compress copy → synthesize

This adds minimal overhead (one extra data structure) but preserves all context.

### Backwards Compatibility

The proposed architecture maintains full backwards compatibility:

- `research research` - Single-agent, no Obsidian (existing behavior)
- `research multi` - Multi-agent, optional Obsidian via `--save-obsidian` flag
- `research expand` - New command, requires Obsidian
- `research recompile-report` - New command, requires Obsidian

Users opt-in via:
```bash
research multi "query" --save-obsidian
```

Or environment variable:
```bash
export DEEP_RESEARCH_OBSIDIAN=true
```

## Historical Context (from thoughts/)

This research builds on previous work documented in:

- `thoughts/shared/plans/deep-research-agent-python-mvp.md` - Original multi-agent architecture
- `thoughts/shared/plans/eda-agent-multi-source-parallel.md` - Parallel worker patterns
- `thoughts/shared/research/2025-11-15_deep-research-agent-architecture.md` - Initial architecture research
- `thoughts/shared/research/2025-11-15_multi-agent-deep-research-architecture-v2.md` - Multi-agent refinements
- `thoughts/shared/research/2025-11-16_alibaba-deepresearch-gap-analysis.md` - Comparison with Alibaba's DeepResearch
- `thoughts/shared/research/2025-11-17_improving-eda-agent-multi-source-parallel.md` - Parallel execution improvements

**Key Historical Insight**: Previous research identified the need for "session expansion" and "iterative refinement" but didn't specify the storage mechanism. This research provides the missing piece: Obsidian as the persistence and exploration layer.

## Related Research

### External Sources Consulted

1. **Obsidian Documentation** - https://help.obsidian.md/
   - YAML frontmatter specification
   - Wikilink syntax and behavior
   - Graph view functionality

2. **Dataview Plugin** - https://blacksmithgu.github.io/obsidian-dataview/
   - Query syntax examples
   - Performance characteristics
   - Use cases for research management

3. **Zettelkasten Method** - https://zettelkasten.de/posts/overview/
   - Atomic note-taking principles
   - Insight extraction patterns
   - Long-term knowledge building

4. **LangGraph Documentation** - https://langchain-ai.github.io/langgraph/
   - State machine patterns
   - Parallel execution with Send API
   - Checkpointing (not used in our implementation)

### Similar Systems

**Comparison with Obsidian Research Plugins**:
- **Research Assistant** plugin - Manual note-taking focused
- **Zotero Integration** plugin - Academic paper management
- **Smart Connections** plugin - Embedding-based search

**Our approach differs**: Automated research sessions with full provenance tracking, not manual note-taking.

## Success Metrics

Based on the research, we identified measurable success criteria:

1. **Complete Traceability**: Every insight must link back to source → worker → session
   - Metric: 100% of insights have valid wikilink chains

2. **Efficient Expansion**: Expansion should leverage prior work
   - Metric: Expansion uses <50% tokens compared to fresh query (measured via metadata)

3. **Report Quality**: Recompiled reports should match or exceed original
   - Metric: Human evaluation of coherence and completeness

4. **Graph Utility**: Obsidian graph view should reveal non-obvious connections
   - Metric: Users discover >3 unexpected connections per 10 sessions

5. **Human Usability**: Non-technical users can navigate the vault
   - Metric: User testing with markdown-familiar but non-engineer users

## Open Questions

### 1. Insight Extraction Strategy

**Question**: Should insights be auto-extracted from worker outputs using LLM, or manually curated?

**Options**:
- **Auto-extraction**: Use LLM to identify key insights from worker output
  - Pro: Automated, consistent, scales
  - Con: May miss nuance, requires prompt engineering, adds cost

- **Manual curation**: Human reviews and creates insight notes
  - Pro: Higher quality, context-aware
  - Con: Doesn't scale, adds friction

**Recommendation**: Hybrid approach - auto-extract during session, allow manual refinement via Obsidian editing

### 2. Graph Scope

**Question**: Should we link insights between sessions (cross-session graph)?

**Options**:
- **Within-session only**: Each session is isolated graph
  - Pro: Simpler, clearer boundaries
  - Con: Misses connections across research topics

- **Cross-session linking**: Insights from different sessions can reference each other
  - Pro: Builds knowledge over time, reveals patterns
  - Con: Graph becomes complex, harder to navigate

**Recommendation**: Start within-session, add cross-session later via manual wikilinks or similarity-based suggestions

### 3. Source Deduplication

**Question**: How to handle same URL fetched by multiple workers?

**Options**:
- **No deduplication**: Store separately per worker
  - Pro: Simple, preserves exact context
  - Con: Wastes storage, fragments references

- **URL hash deduplication**: Single source note, track all accessors
  - Pro: Efficient storage, centralized references
  - Con: Requires accessor tracking

**Recommendation**: Deduplicate by URL hash (md5 first 12 chars), maintain `accessed_by` list with worker IDs

### 4. Plugin Dependencies

**Question**: Should we require Dataview plugin for full functionality?

**Options**:
- **Required**: Vault assumes Dataview installed
  - Pro: Rich queries, better UX
  - Con: Adds setup friction

- **Optional**: Provide plain markdown fallback
  - Pro: Works out-of-box
  - Con: Less powerful queries

**Recommendation**: Make Dataview optional - use static markdown tables as fallback, enhance with Dataview queries if available

## Implementation Roadmap

Based on the research findings, a phased implementation approach is recommended:

### Phase 1: Data Capture (Foundation)
**Duration**: 1 week
**Focus**: Preserve full context without changing synthesis

**Tasks**:
1. Create enhanced data structures (`WorkerFullContext`, `ResearchSession`, `ToolCall`, `ReActIteration`)
2. Modify `WorkerAgent` to track ReAct iterations
3. Modify `LeadResearcher._worker_execution()` to build full context
4. Add session tracking to `LeadResearcher.research()`

**Validation**: Workers complete successfully, full context captured in memory

### Phase 2: Obsidian Writer (Storage)
**Duration**: 1 week
**Focus**: Write sessions to Obsidian vault

**Tasks**:
1. Create `obsidian/` module
2. Implement `ObsidianWriter` class
3. Implement note generation (session MOC, workers, sources, reports)
4. Implement frontmatter and wikilink generation
5. Add to `LeadResearcher` with `--save-obsidian` flag

**Validation**: Session writes to Obsidian, graph view shows connections

### Phase 3: CLI Commands (Iteration)
**Duration**: 1 week
**Focus**: Enable expansion and recompilation

**Tasks**:
1. Implement `research expand` command
2. Implement `research recompile-report` command
3. Add session loading from Obsidian
4. Implement version management
5. Test expansion workflow end-to-end

**Validation**: Can expand worker research, recompile with new instructions

### Phase 4: Testing & Documentation (Polish)
**Duration**: 1 week
**Focus**: Ensure reliability and usability

**Tasks**:
1. Test full workflow with multiple sessions
2. Performance testing with 10+ workers
3. Write user documentation
4. Create example workflows
5. Add integration tests

**Validation**: System ready for production use

## Conclusions

The research demonstrates that transforming the deep-research multi-agent system into an Obsidian-based iterative research platform is architecturally sound and practically feasible. The key insights:

1. **Context Preservation**: Current 80-90% data loss at compression point is solvable by storing full worker contexts alongside compressed summaries

2. **Obsidian as Database**: Markdown + YAML + wikilinks provide sufficient structure for research session storage without database overhead

3. **Backwards Compatibility**: Opt-in design preserves existing workflows while enabling new capabilities

4. **Iterative Research**: Worker expansion and report recompilation enable true iterative research workflows

5. **Implementation Feasibility**: 4-week phased approach leverages existing patterns (CLI, state management, HTTP pooling)

**Critical Success Factors**:
- Full context capture must not break existing synthesis pipeline
- Obsidian vault structure must be intuitive for human exploration
- Version management must clearly show research lineage
- Performance must remain acceptable with parallel worker execution (HTTP fixes are critical)

**Next Steps**: Begin Phase 1 implementation (data capture) as foundation for all subsequent phases.

## References

### Internal Codebase
- `deep-research-agent/src/deep_research/agent/orchestrator.py` - Multi-agent orchestration
- `deep-research-agent/src/deep_research/agent/worker.py` - Worker agent implementation
- `deep-research-agent/src/deep_research/agent/state.py` - LangGraph state definitions
- `deep-research-agent/src/deep_research/utils/store.py` - Current storage implementation
- `deep-research-agent/src/deep_research/cli.py` - CLI command patterns

### External Documentation
- **LangGraph**: https://langchain-ai.github.io/langgraph/ - State machine and parallel execution patterns
- **Obsidian Format**: https://help.obsidian.md/ - Markdown, frontmatter, wikilinks specification
- **Dataview Plugin**: https://blacksmithgu.github.io/obsidian-dataview/ - Query language documentation
- **Zettelkasten Method**: https://zettelkasten.de/posts/overview/ - Knowledge management principles

### Research Papers
- Alibaba DeepResearch (2024) - Multi-agent research system architecture
- LangGraph Documentation - Dynamic parallel execution with Send API
- Obsidian Community Best Practices - MOC patterns and vault organization
