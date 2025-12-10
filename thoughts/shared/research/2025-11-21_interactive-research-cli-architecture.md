---
date: 2025-11-21T12:30:00+0000
researcher: Emil Wareus
git_commit: 6a27b87a0b5c98277f9e2c7f1fb3348e5edadc17
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: 'Interactive Research CLI Mode Architecture - REPL for Deep Research Agent'
tags:
  [
    research,
    deep-research-agent,
    cli,
    repl,
    interactive-mode,
    session-management,
    prompt-toolkit,
    user-experience,
  ]
status: complete
last_updated: 2025-11-21
last_updated_by: Emil Wareus
---

# Research: Interactive Research CLI Mode Architecture

**Date**: 2025-11-21T12:30:00+0000
**Researcher**: Emil Wareus
**Git Commit**: 6a27b87a0b5c98277f9e2c7f1fb3348e5edadc17
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Research Question

How should we implement an interactive CLI mode (REPL) for the deep-research agent that enables iterative research sessions with natural language commands, session continuation, and context management - similar to Claude Code's interactive experience?

## Summary

Through comprehensive parallel research across the codebase and external resources, we've discovered that the deep-research agent has a **solid foundation** for interactive CLI mode but lacks the REPL loop infrastructure. The current architecture already supports:

- ✅ Full session versioning with `parent_session_id` tracking
- ✅ Complete worker context preservation (no data loss)
- ✅ Session loading from Obsidian vault for continuation
- ✅ Click-based CLI with async execution patterns
- ✅ Rich terminal output with progress indicators

**What's Missing**:

- ❌ REPL/interactive prompt loop
- ❌ In-memory active session state manager
- ❌ Natural language command parser
- ❌ Session lifecycle commands (start/pause/resume/switch)
- ❌ Multi-session management

**Key Insight**: The data model and persistence layer are **ready** for interactive mode. We need to add a thin REPL layer on top using `prompt_toolkit` for rich interactive experience.

## Research Methodology

This research was conducted through parallel sub-agent investigation across five dimensions:

1. **codebase-analyzer** - Deep-research agent CLI architecture
   - Target: `cli.py`, `orchestrator.py`, `state.py`
   - Focus: Command patterns, async execution, state flow

2. **codebase-pattern-finder** - Session persistence patterns
   - Target: `obsidian/writer.py`, `obsidian/loader.py`, `store.py`
   - Focus: Session storage, versioning, loading mechanisms

3. **web-search-researcher** - Python REPL best practices
   - Focus: prompt_toolkit, cmd2, aiomonitor, async patterns
   - Sources: Official docs, production examples

4. **codebase-analyzer** - Obsidian integration analysis
   - Target: Complete ObsidianWriter/Loader implementation
   - Focus: Full context capture, round-trip serialization

5. **thoughts-locator** - Historical context discovery
   - Target: All thoughts/ documents mentioning interactive CLI
   - Focus: Previous design decisions and UX considerations

## Detailed Findings

### 1. Current CLI Architecture Analysis

#### Command Organization (`cli.py:68-650`)

The CLI uses **Click** with a group-based command structure:

```python
@click.group()
def cli() -> None:
    """Deep research agent CLI."""
    pass
```

**Existing Commands**:

1. **`research`** (`cli.py:74-159`) - Single-agent research
2. **`multi`** (`cli.py:178-239`) - Multi-agent parallel research
3. **`expand`** (`cli.py:242-355`) - Expand specific worker from session
4. **`recompile-report`** (`cli.py:372-465`) - Re-synthesize report with new instructions
5. **`list-sessions`** (`cli.py:474-536`) - Show all sessions in vault
6. **`list-workers`** (`cli.py:552-650`) - Show workers for specific session

**Async Execution Pattern** (used by all commands):

```python
def command_name(...):
    async def _async_implementation():
        # async work here

    asyncio.run(_async_implementation())
```

**Key Finding**: All commands use the `asyncio.run()` bridge pattern to convert sync Click commands to async agent execution. This pattern works for fire-and-forget commands but **blocks** during execution - incompatible with interactive REPL where users need to interrupt or issue new commands.

#### State Management (`state.py:8-112`)

**Core Data Structures**:

```python
@dataclass
class WorkerFullContext:
    """Complete worker execution (NOTHING compressed)."""
    task_id: str
    worker_id: str
    objective: str
    tools_available: list[str]
    expected_output: str

    # Full execution trace
    react_iterations: list[ReActIteration]  # All thought-action-observation loops
    tool_calls: list[ToolCall]              # All tool invocations

    # Results
    final_output: str              # FULL uncompressed output
    compressed_summary: str        # 2000-token summary for synthesis
    sources: list[str]

    # Metadata
    status: str
    error: str | None
    started_at: str | None
    completed_at: str | None
    duration_seconds: float
    cost: float
    tokens: dict[str, int]
    model: str
```

**Critical Feature**: `WorkerFullContext` stores **both** full output and compressed summary. This dual storage enables:

- Full context for human review and continuation
- Compressed summaries for LLM synthesis
- Complete audit trail of tool usage

```python
@dataclass
class ResearchSession:
    """Full research session with versioning."""
    session_id: str                    # "session_20250120_142530_abc123"
    version: int                       # 1, 2, 3...
    parent_session_id: str | None      # "session_abc123_v1" for tracking lineage

    query: str
    complexity_score: float
    sub_tasks: list[dict[str, Any]]

    # Workers (FULL CONTEXT)
    workers: list[WorkerFullContext]

    # Results
    report: str
    all_sources: list[str]
    insights: list[dict[str, Any]]

    # Metadata
    status: str  # pending, running, completed, failed
    created_at: str
    updated_at: str
    model: str
    cost: float
    tokens: dict[str, int]

    # Obsidian paths
    obsidian_vault_path: str
    session_file_path: str
```

**Key Finding**: The `parent_session_id` field **already exists** and is used for session versioning. The data model is **ready** for continuation - no schema changes needed.

#### Orchestrator Execution Flow (`orchestrator.py:69-136`)

**Session Initialization** (`orchestrator.py:72-85`):

```python
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
session_hash = abs(hash(query)) % 1000000
session_id = f"session_{timestamp}_{session_hash:06d}"

self.session = ResearchSession(
    session_id=session_id,
    version=1,
    parent_session_id=None,
    query=query,
    complexity_score=0.0,
    status="running",
    created_at=datetime.now().isoformat(),
    model=self.model,
)
```

**LangGraph Workflow**:

```
START → analyze → plan → [worker₁, worker₂, ...] → synthesize → END
```

**Worker Spawning** (`orchestrator.py:378-383`):

```python
def _spawn_workers(self, state: ResearchState) -> list[Send]:
    sends = [Send("worker", {"task": task}) for task in state["sub_tasks"]]
    return sends
```

LangGraph's `Send` API enables **dynamic parallel worker execution** - workers run concurrently and populate results as they complete.

**Context Capture** (`orchestrator.py:419-445`):

```python
# After worker completes
if self.session and hasattr(worker, "full_context") and worker.full_context:
    full_ctx = worker.full_context

    # Copy ReAct iterations from agent
    if hasattr(worker.agent, "react_iterations"):
        full_ctx.react_iterations = [
            ReActIteration(
                iteration=it["iteration"],
                thought=it["thought"],
                actions=[ToolCall(**tc) for tc in it["actions"]],
                observation=it["observation"],
                timestamp=it["timestamp"],
            )
            for it in worker.agent.react_iterations
        ]
        full_ctx.tool_calls = [
            ToolCall(**tc)
            for it in worker.agent.react_iterations
            for tc in it["actions"]
        ]

    full_ctx.compressed_summary = summary
    self.session.workers.append(full_ctx)
```

**Key Finding**: The orchestrator already captures **full worker context** including all ReAct iterations, tool calls, and outputs. Nothing is lost - all data preserved for continuation.

#### Progress Display (`utils/live_progress.py:24-201`)

**LiveProgress System**:

- Uses Rich library's `Live` display with 4Hz refresh
- Thread-safe with `threading.RLock()`
- Protocol-based design (`ProgressCallback` protocol)
- Displays worker table with real-time status updates

**Example Output**:

```
🔍 Multi-agent research: What are Swedish housing prices?

Worker    | Objective                  | Status
----------|----------------------------|----------------------------------
task_1    | Research Swedish housing   | ⚡ search: Searching for prices...
task_2    | Compare Malmö to other...  | ⏳ Starting...
task_3    | Analyze price trends       | ✓ Complete (12 actions)

Workers: 5 | Active: 2 | Complete: 2 | Failed: 1

Recent Activity
──────────────────────────────────────
14:23:45 task_1 started: Research Swedish housing...
14:23:47 task_1 → search: Searching for prices...
```

**Key Finding**: Progress display is already production-grade with rich formatting. For interactive mode, we need to integrate this with REPL output management.

---

### 2. Session Persistence & Loading Patterns

#### Obsidian Vault Structure

**Directory Layout**:

```
outputs/obsidian/
├── session_20250120_142530_abc123/
│   ├── session.md              # MOC (Map of Content)
│   ├── workers/
│   │   ├── task_1_worker.md
│   │   ├── task_2_worker.md
│   │   └── task_3_worker.md
│   ├── insights/
│   │   └── insight_*.md
│   ├── sources/
│   │   └── source_{hash}.md
│   └── reports/
│       ├── report_v1.md
│       └── report_v2.md       # Versions preserved
```

**Session MOC Frontmatter** (`writer.py:92-106`):

```yaml
---
type: research_session
session_id: session_20250120_142530_abc123
version: 1
query: 'What are Swedish housing prices?'
status: completed
created_at: 2025-01-20T14:25:00Z
updated_at: 2025-01-20T14:45:00Z
model: anthropic/claude-3.5-sonnet
complexity: 0.75
num_workers: 3
total_cost: 0.0234
parent_session: session_20250120_142530_abc123_v1 # For v2+
tags: [sweden, housing, economics]
---
```

**Key Finding**: Frontmatter is **queryable** and contains all metadata needed for session listing, filtering, and selection in interactive mode.

#### Session Loading (`loader.py:19-65`)

**Load Flow**:

1. Locate session file at `{vault_path}/{session_id}/session.md`
2. Parse YAML frontmatter and markdown body
3. Reconstruct `ResearchSession` object from frontmatter
4. Load all workers from `workers/` subdirectory
5. Load insights from `insights/` subdirectory
6. Load report content from `reports/report_v{version}.md`
7. Aggregate unique sources across all workers

**Example Usage**:

```python
loader = SessionLoader(vault_path="outputs/obsidian")
session = loader.load_session("session_20250120_142530_abc123", version=1)

# Full session with all workers, insights, report
print(session.query)
print(session.workers[0].final_output)  # Full uncompressed output
```

**Key Finding**: Session loading is **complete** - full `ResearchSession` object with all workers and context. Ready for continuation commands.

#### Worker Full Context Preservation (`writer.py:141-183`)

**What Gets Stored**:

- **ReAct iterations**: Full thought-action-observation loops
- **Tool calls**: All invocations with arguments, results, duration
- **Final output**: Complete uncompressed worker output
- **Compressed summary**: 2000-token summary for synthesis
- **Sources**: All accessed URLs

**Worker Note Template** (`templates.py:85-144`):

```markdown
---
type: worker
session_id: session_abc123
task_id: task_1
objective: 'Research Swedish housing prices'
status: completed
tool_calls: 15
cost: 0.0245
---

# Worker: Swedish Housing Research

## Research Process (ReAct Loop)

### Iteration 1

**Thought**: I need to find recent data on Swedish housing prices
**Actions**:

- `search(query="swedish housing prices 2024")`
  - Success: true
  - Duration: 2.3s
    **Observation**: Found 10 results including SCB statistics

[... all iterations preserved ...]

## Final Output

[Full uncompressed output - 5000+ words]

## Compressed Summary

[2000-token summary for synthesis]
```

**Key Finding**: Workers are stored with **complete execution traces**. Interactive mode can show users the full thought process, not just final outputs.

#### Session Versioning Pattern (`cli.py:332-338`)

**Expand Command Creates v2**:

```python
# Load parent session
parent_session = loader.load_session(session_id, version)

# Create new session with incremented version
orchestrator.session = ResearchSession(
    session_id=parent_session.session_id,       # SAME ID
    version=parent_session.version + 1,         # INCREMENT
    parent_session_id=f"{parent_session.session_id}_v{parent_session.version}",
    query=parent_session.query,
    complexity_score=parent_session.complexity_score,
)

# Execute expansion research
result = await orchestrator.research(expansion_query)
```

**Versioning Strategy**:

- **Same session_id** across versions (e.g., `session_20250120_142530_abc123`)
- **Incremented version** (1, 2, 3...)
- **Parent reference** format: `{session_id}_v{version}`
- **Reports versioned** (`report_v1.md`, `report_v2.md`, ...)
- **Workers appended** to same directory

**Key Finding**: Version chain tracking is **implemented and working**. Interactive mode can leverage this for "continue from last session" commands.

---

### 3. Python REPL Implementation Best Practices

#### prompt_toolkit - The Modern Standard

**Official Documentation**: https://python-prompt-toolkit.readthedocs.io/en/master/

**Core Features**:

- Native asyncio support (version 3.0+)
- Built-in history management via `PromptSession`
- Syntax highlighting using Pygments lexers
- Auto-completion with `WordCompleter`, `NestedCompleter`, `FuzzyCompleter`
- Custom styling for completion menus
- Multi-line editing support

**Async REPL Pattern**:

```python
from prompt_toolkit.patch_stdout import patch_stdout
from prompt_toolkit.shortcuts import PromptSession

async def interactive_shell():
    session = PromptSession("research> ")

    with patch_stdout():  # Prevents concurrent output from breaking prompt
        while True:
            result = await session.prompt_async()
            # Process command
            await handle_command(result)
```

**Auto-completion Example**:

```python
from prompt_toolkit.completion import NestedCompleter

completer = NestedCompleter.from_nested_dict({
    'start': None,  # No sub-commands
    'continue': {
        'from': {
            'session': None,  # complete with session IDs
            'worker': None,
        }
    },
    'list': {
        'sessions': None,
        'workers': None,
    },
    'status': None,
    'exit': None,
})

session = PromptSession(completer=completer)
```

**Key Features for Interactive Research CLI**:

- `patch_stdout()` context manager prevents async output from corrupting prompt
- `prompt_async()` method integrates with asyncio event loop
- `ThreadedCompleter` wrapper for expensive completion operations
- Command history persisted to `~/.research_history`

**Production Examples**:

- **IPython** - Uses prompt_toolkit for terminal REPL
- **ptpython** - Enhanced Python REPL built on prompt_toolkit
- **AWS CLI tools** - Interactive mode implementations

#### Alternative: cmd2 Framework

**Repository**: https://github.com/python-cmd2/cmd2

**Comparison**:

- ✅ Out-of-the-box tab completion, history, scripting
- ✅ Minimal development effort
- ❌ Limited async support (GitHub Issue #764)
- ❌ Less flexible for custom UX

**Verdict**: `cmd2` is excellent for quick CLI tools but **prompt_toolkit** is better for async-heavy research workflows.

#### Command Parsing Patterns

**shlex + argparse Integration**:

```python
import shlex
import argparse

# Parse user input
user_input = "continue from session_abc123 --worker task_1"
args = shlex.split(user_input)  # Handles quotes, escaping

# Define parser
parser = argparse.ArgumentParser(exit_on_error=False)  # Don't exit REPL
subparsers = parser.add_subparsers(dest='command')

# Add commands
start_parser = subparsers.add_parser('start')
start_parser.add_argument('query', nargs='+')

continue_parser = subparsers.add_parser('continue')
continue_parser.add_argument('--session', required=True)
continue_parser.add_argument('--worker')

# Parse
try:
    parsed = parser.parse_args(args)
    # Execute command based on parsed.command
except argparse.ArgumentError as e:
    print(f"Error: {e}")
```

**Natural Language Patterns**:

- Tokenize → intent classification → entity extraction → argparse
- Support aliases: `start`/`new`/`begin`, `continue`/`resume`, `exit`/`quit`

#### Async State Management

**aiomonitor Pattern** (https://aiomonitor.aio-libs.org/):

```python
import aiomonitor
import asyncio

loop = asyncio.get_running_loop()
locals = {"session": current_session}  # Inject active session

with aiomonitor.start_monitor(loop, locals=locals):
    # REPL has access to 'session' variable
    await run_research()
```

**State Injection Strategy**:

- Maintain `active_session: ResearchSession | None` in REPL context
- Inject into REPL namespace for debugging
- Update on session start/switch/complete

#### Progress Display During Long Operations

**Rich Progress Integration**:

```python
from rich.progress import Progress
from rich.console import Console

console = Console()

async def start_research(query: str):
    with Progress() as progress:
        task = progress.add_task("[cyan]Researching...", total=None)

        # Run research in background
        result = await orchestrator.research(query)

        progress.update(task, completed=True)
```

**tqdm with asyncio**:

```python
import tqdm.asyncio

# Show progress for multiple workers
await tqdm.asyncio.gather(*worker_tasks, desc="Workers")
```

---

### 4. Proposed Interactive CLI Architecture

#### Component Overview

**New Components** (to be implemented):

1. **REPL Shell** - `prompt_toolkit` based interactive loop
2. **SessionManager** - In-memory active session tracking
3. **CommandParser** - Natural language → action mapping
4. **ContextManager** - Prepare continuation context from previous sessions

**Existing Components** (reuse):

- `LeadResearcher` (orchestrator) - Research execution
- `ObsidianWriter` - Session persistence
- `SessionLoader` - Session loading
- `LiveProgress` - Progress display

#### SessionManager Class (New)

**Responsibilities**:

- Track active session in memory
- Session lifecycle (start/pause/resume/stop)
- Sync with ObsidianWriter/Loader
- Context preparation for continuations

**Interface**:

```python
class SessionManager:
    def __init__(self, vault_path: str = "outputs/obsidian"):
        self.vault_path = vault_path
        self.active_session: ResearchSession | None = None
        self.loader = SessionLoader(vault_path)
        self.writer = ObsidianWriter(vault_path)

    def start_session(self, query: str, model: str) -> ResearchSession:
        """Create new session (v1)."""
        pass

    def load_session(self, session_id: str, version: int = 1) -> ResearchSession:
        """Load existing session from vault."""
        return self.loader.load_session(session_id, version)

    def get_active_session(self) -> ResearchSession | None:
        """Get current active session."""
        return self.active_session

    def list_sessions(self) -> list[dict[str, Any]]:
        """List all sessions in vault."""
        return self.loader.list_sessions()

    def continue_session(
        self,
        session: ResearchSession,
        continuation_query: str
    ) -> ResearchSession:
        """Create v2 from v1 for continuation."""
        pass

    def expand_worker(
        self,
        session: ResearchSession,
        worker_id: str,
        expansion_query: str
    ) -> ResearchSession:
        """Create new version expanding specific worker."""
        pass

    async def save_session(self, session: ResearchSession) -> Path:
        """Write session to vault."""
        return await self.writer.write_session(session)
```

#### CommandParser Class (New)

**Responsibilities**:

- Parse user input into commands
- Support aliases and natural language
- Extract arguments and validate

**Interface**:

```python
class CommandParser:
    def __init__(self):
        self.parser = self._build_parser()

    def _build_parser(self) -> argparse.ArgumentParser:
        """Build argparse parser for all commands."""
        parser = argparse.ArgumentParser(exit_on_error=False, prog='')
        subparsers = parser.add_subparsers(dest='command')

        # start <query>
        start = subparsers.add_parser('start', aliases=['new', 'begin'])
        start.add_argument('query', nargs='+')
        start.add_argument('--model', '-m', default='anthropic/claude-3.5-sonnet')

        # continue [query]
        cont = subparsers.add_parser('continue', aliases=['resume'])
        cont.add_argument('query', nargs='*')

        # status
        subparsers.add_parser('status')

        # list sessions
        list_cmd = subparsers.add_parser('list')
        list_cmd.add_argument('target', choices=['sessions', 'workers'])
        list_cmd.add_argument('--session', help='Session ID for listing workers')

        # switch <session_id>
        switch = subparsers.add_parser('switch', aliases=['load'])
        switch.add_argument('session_id')
        switch.add_argument('--version', '-v', type=int, default=1)

        # expand --worker <id> <query>
        expand = subparsers.add_parser('expand')
        expand.add_argument('--worker', '-w', required=True)
        expand.add_argument('query', nargs='+')

        # reset
        subparsers.add_parser('reset', aliases=['clear'])

        # exit
        subparsers.add_parser('exit', aliases=['quit', 'q'])

        # help
        subparsers.add_parser('help')

        return parser

    def parse(self, user_input: str) -> tuple[str, dict[str, Any]] | None:
        """Parse user input into (command, args) or None if invalid."""
        try:
            args = shlex.split(user_input)
            if not args:
                return None

            parsed = self.parser.parse_args(args)
            return (parsed.command, vars(parsed))
        except (argparse.ArgumentError, ValueError) as e:
            print(f"Parse error: {e}")
            return None
```

#### Interactive REPL Loop (New)

**Main Loop**:

```python
async def interactive_repl():
    """Main interactive REPL for research CLI."""
    console = Console()
    session_manager = SessionManager()
    parser = CommandParser()

    # Configure prompt_toolkit
    prompt_session = PromptSession(
        "research> ",
        completer=build_completer(session_manager),
        history=FileHistory(os.path.expanduser("~/.deep_research_history")),
        auto_suggest=AutoSuggestFromHistory(),
        enable_history_search=True,
    )

    console.print("[bold cyan]Deep Research Agent - Interactive Mode[/bold cyan]")
    console.print("Type 'help' for commands or 'start <query>' to begin research.\n")

    with patch_stdout():
        while True:
            try:
                # Get user input
                user_input = await prompt_session.prompt_async()

                if not user_input.strip():
                    continue

                # Parse command
                parsed = parser.parse(user_input)
                if not parsed:
                    continue

                command, args = parsed

                # Execute command
                if command in ('exit', 'quit'):
                    console.print("[yellow]Exiting...[/yellow]")
                    break

                elif command in ('start', 'new', 'begin'):
                    query = ' '.join(args['query'])
                    await cmd_start(session_manager, query, args['model'], console)

                elif command in ('continue', 'resume'):
                    query = ' '.join(args['query']) if args['query'] else None
                    await cmd_continue(session_manager, query, console)

                elif command == 'status':
                    await cmd_status(session_manager, console)

                elif command == 'list':
                    await cmd_list(session_manager, args, console)

                elif command in ('switch', 'load'):
                    await cmd_switch(session_manager, args, console)

                elif command == 'expand':
                    query = ' '.join(args['query'])
                    await cmd_expand(session_manager, args['worker'], query, console)

                elif command in ('reset', 'clear'):
                    await cmd_reset(session_manager, console)

                elif command == 'help':
                    show_help(console)

            except KeyboardInterrupt:
                console.print("\n[yellow]Use 'exit' to quit[/yellow]")
                continue

            except EOFError:
                break

            except Exception as e:
                console.print(f"[red]Error: {e}[/red]")
                if os.getenv("DEBUG"):
                    import traceback
                    traceback.print_exc()
```

#### Command Implementations

**Start Command**:

```python
async def cmd_start(
    manager: SessionManager,
    query: str,
    model: str,
    console: Console
) -> None:
    """Start new research session."""
    if manager.active_session:
        console.print("[yellow]Active session exists. Use 'reset' first or 'continue'.[/yellow]")
        return

    console.print(f"[cyan]Starting research:[/cyan] {query}")

    # Create session
    session = manager.start_session(query, model)

    # Execute research with live progress
    orchestrator = LeadResearcher(model=model)

    with LiveProgress(query, console=console) as progress:
        orchestrator.progress = progress
        orchestrator.session = session

        result = await orchestrator.research(query)

    # Save to vault
    await manager.save_session(session)

    # Display results
    console.print(f"\n[green]✓[/green] Research complete")
    console.print(f"Session: [cyan]{session.session_id}[/cyan] v{session.version}")
    console.print(f"Workers: {len(session.workers)}")
    console.print(f"Cost: ${session.cost:.4f}")
    console.print(f"\nReport saved to: {session.session_file_path}")

    # Show summary
    console.print("\n[bold]Report Summary:[/bold]")
    console.print(Markdown(session.report[:500] + "..."))
```

**Continue Command**:

```python
async def cmd_continue(
    manager: SessionManager,
    continuation_query: str | None,
    console: Console
) -> None:
    """Continue active session with new query."""
    session = manager.get_active_session()

    if not session:
        console.print("[red]No active session. Use 'start' or 'switch' first.[/red]")
        return

    if not continuation_query:
        continuation_query = Prompt.ask("Enter continuation query")

    console.print(f"[cyan]Continuing session {session.session_id} v{session.version}[/cyan]")

    # Create v2 session
    new_session = manager.continue_session(session, continuation_query)

    # Prepare context from v1
    context = _build_continuation_context(session)
    full_query = f"{context}\n\nNEW QUERY: {continuation_query}"

    # Execute research
    orchestrator = LeadResearcher(model=session.model)
    orchestrator.session = new_session

    with LiveProgress(continuation_query, console=console) as progress:
        orchestrator.progress = progress
        result = await orchestrator.research(full_query)

    # Save
    await manager.save_session(new_session)

    console.print(f"\n[green]✓[/green] Continuation complete")
    console.print(f"Session: [cyan]{new_session.session_id}[/cyan] v{new_session.version}")
    console.print(f"Parent: v{session.version}")
```

**Status Command**:

```python
async def cmd_status(manager: SessionManager, console: Console) -> None:
    """Show active session status."""
    session = manager.get_active_session()

    if not session:
        console.print("[yellow]No active session[/yellow]")
        return

    table = Table(title=f"Active Session: {session.session_id}")
    table.add_column("Field", style="cyan")
    table.add_column("Value", style="white")

    table.add_row("Session ID", session.session_id)
    table.add_row("Version", str(session.version))
    table.add_row("Query", session.query)
    table.add_row("Status", session.status)
    table.add_row("Workers", str(len(session.workers)))
    table.add_row("Cost", f"${session.cost:.4f}")
    table.add_row("Created", session.created_at)

    if session.parent_session_id:
        table.add_row("Parent", session.parent_session_id)

    console.print(table)

    # Show worker summary
    if session.workers:
        console.print("\n[bold]Workers:[/bold]")
        for i, worker in enumerate(session.workers, 1):
            status_icon = "✓" if worker.status == "completed" else "✗"
            console.print(f"  {status_icon} Worker {i}: {worker.objective}")
```

**List Sessions Command**:

```python
async def cmd_list(
    manager: SessionManager,
    args: dict[str, Any],
    console: Console
) -> None:
    """List sessions or workers."""
    if args['target'] == 'sessions':
        sessions = manager.list_sessions()

        if not sessions:
            console.print("[yellow]No sessions found[/yellow]")
            return

        table = Table(title=f"Research Sessions ({len(sessions)} total)")
        table.add_column("Session ID", style="cyan")
        table.add_column("Version", justify="center")
        table.add_column("Query", style="white")
        table.add_column("Workers", justify="center")
        table.add_column("Cost", justify="right")
        table.add_column("Created", style="dim")

        for sess in sessions:
            table.add_row(
                sess["session_id"],
                str(sess["version"]),
                sess["query"][:50] + "..." if len(sess["query"]) > 50 else sess["query"],
                str(sess["num_workers"]),
                f"${sess['total_cost']:.4f}",
                sess["created_at"][:10],
            )

        console.print(table)

    elif args['target'] == 'workers':
        if not args['session']:
            console.print("[red]--session required for listing workers[/red]")
            return

        session = manager.load_session(args['session'])

        table = Table(title=f"Workers for {session.session_id} v{session.version}")
        table.add_column("Worker ID", style="cyan")
        table.add_column("Objective", style="white")
        table.add_column("Status", justify="center")
        table.add_column("Tools", justify="right")
        table.add_column("Cost", justify="right")

        for worker in session.workers:
            status_color = "green" if worker.status == "completed" else "red"
            table.add_row(
                worker.worker_id,
                worker.objective[:60],
                f"[{status_color}]{worker.status}[/{status_color}]",
                str(len(worker.tool_calls)),
                f"${worker.cost:.4f}",
            )

        console.print(table)
```

#### Context Preparation for Continuation

**Compression Strategy**:

```python
def _build_continuation_context(session: ResearchSession) -> str:
    """Build compressed context from previous session for continuation.

    Goal: Keep context under 50k tokens
    Strategy: Include insights + report summary, exclude full worker outputs
    """
    context_parts = []

    # Original query
    context_parts.append(f"PREVIOUS RESEARCH QUERY: {session.query}")

    # Insights (already compressed)
    if session.insights:
        context_parts.append("\nKEY INSIGHTS FROM PREVIOUS RESEARCH:")
        for i, insight in enumerate(session.insights[:10], 1):  # Max 10 insights
            context_parts.append(f"{i}. {insight['title']}: {insight['finding']}")

    # Report summary (first 2000 chars)
    context_parts.append("\nPREVIOUS REPORT SUMMARY:")
    context_parts.append(session.report[:2000])

    # Workers summary
    context_parts.append(f"\n\nRESOURCES: {len(session.workers)} workers executed")
    context_parts.append(f"SOURCES: {len(session.all_sources)} sources consulted")

    return "\n".join(context_parts)
```

**Alternative: Include Full Worker Context**:

```python
def _build_full_continuation_context(session: ResearchSession, worker_id: str) -> str:
    """Include full worker output for deep continuation."""
    worker = next((w for w in session.workers if w.worker_id == worker_id), None)

    if not worker:
        raise ValueError(f"Worker {worker_id} not found")

    context = f"""PREVIOUS WORKER RESEARCH:

Objective: {worker.objective}
Status: {worker.status}

FULL OUTPUT:
{worker.final_output}

SOURCES:
{chr(10).join(f'- {src}' for src in worker.sources)}
"""

    return context
```

---

### 5. Implementation Roadmap

#### Phase 1: REPL Foundation (Week 1)

**Goal**: Basic REPL loop with command parsing

**Tasks**:

1. Add `prompt_toolkit` dependency to `pyproject.toml`
2. Create `src/deep_research/repl/` module
3. Implement `CommandParser` class
4. Implement basic REPL loop with `prompt_async()`
5. Add `deep-research interactive` CLI entry point
6. Test command parsing with unit tests

**Deliverable**: Interactive shell that accepts commands but doesn't execute research yet

**Validation**:

```bash
$ deep-research interactive
research> start What is quantum computing?
[Parsed: command=start, query="What is quantum computing?"]
research> exit
```

#### Phase 2: Session Management (Week 2)

**Goal**: In-memory session tracking and lifecycle

**Tasks**:

1. Implement `SessionManager` class
2. Integrate with `ObsidianWriter` and `SessionLoader`
3. Implement `start` command with full research execution
4. Implement `status` command
5. Implement `list sessions` and `list workers` commands
6. Add session history to prompt completion

**Deliverable**: Can start research sessions and track active session

**Validation**:

```bash
research> start What is quantum computing?
[... research executes with live progress ...]
✓ Research complete. Session: session_20250121_120000_abc123 v1

research> status
Active Session: session_20250121_120000_abc123
Version: 1
Query: What is quantum computing?
Workers: 3
Cost: $0.45
```

#### Phase 3: Session Continuation (Week 3)

**Goal**: Enable continuation and expansion

**Tasks**:

1. Implement `continue` command
2. Implement context compression from previous session
3. Implement `expand` command for worker-specific expansion
4. Add parent session linking
5. Test version chain tracking (v1 → v2 → v3)

**Deliverable**: Can continue previous sessions with new queries

**Validation**:

```bash
research> continue How does quantum computing relate to AI?
[Loads v1 context, creates v2, executes research]
✓ Research complete. Session: session_20250121_120000_abc123 v2
Parent: v1

research> expand --worker task_1 "Research specific quantum algorithms"
[Expands worker 1 findings with new query]
✓ Research complete. Session: session_20250121_120000_abc123 v3
```

#### Phase 4: Multi-Session Management (Week 4)

**Goal**: Track and switch between multiple sessions

**Tasks**:

1. Implement session stack in `SessionManager`
2. Implement `switch` command
3. Implement `reset` command
4. Add session auto-completion
5. Persist active session ID to `.deep_research_state`
6. Load last session on REPL start

**Deliverable**: Can manage multiple concurrent sessions

**Validation**:

```bash
research> list sessions
Session ID                          | Version | Query
session_20250121_120000_abc123     | 3       | Quantum computing...
session_20250121_130000_def456     | 1       | Swedish housing prices...

research> switch session_20250121_130000_def456
✓ Switched to session_20250121_130000_def456 v1

research> continue Analyze price trends in Malmö
[Continues Swedish housing research]
```

#### Phase 5: Polish & UX (Week 5)

**Goal**: Production-ready UX

**Tasks**:

1. Implement rich auto-completion with context-aware suggestions
2. Add cost estimation before starting research
3. Implement `export` command (to notebook, PDF)
4. Add `help` command with examples
5. Implement session search/filtering
6. Add keyboard shortcuts (Ctrl+C for cancel, Ctrl+D for exit)
7. Write user documentation

**Deliverable**: Polished, production-ready interactive CLI

**Validation**:

- Auto-completion suggests session IDs when typing `switch`
- Help text shows examples for each command
- Keyboard shortcuts work as expected
- Cost estimates shown before expensive operations

---

### 6. Technical Highlights

#### Async REPL Architecture

**Key Pattern**: Nested event loops

```python
async def interactive_repl():
    # Outer loop: REPL prompt
    while True:
        user_input = await prompt_session.prompt_async()

        # Inner loop: Research execution (orchestrator.research)
        if command == 'start':
            result = await orchestrator.research(query)
```

**Challenge**: `LiveProgress` uses Rich `Live` which runs in main thread. Need to integrate with async research execution.

**Solution**: Use `patch_stdout()` context manager to capture output from async tasks and redirect through prompt_toolkit.

#### Command Aliases

**Natural Language Support**:

- `start` / `new` / `begin`
- `continue` / `resume`
- `exit` / `quit` / `q`
- `switch` / `load`
- `reset` / `clear`

**Implementation**:

```python
start = subparsers.add_parser('start', aliases=['new', 'begin'])
```

#### Session State Persistence

**On REPL Start**:

```python
state_file = Path.home() / ".deep_research_state"
if state_file.exists():
    state = json.loads(state_file.read_text())
    last_session_id = state.get("last_session_id")
    if last_session_id:
        session = session_manager.load_session(last_session_id)
        console.print(f"Loaded last session: {last_session_id}")
```

**On Session Change**:

```python
state_file.write_text(json.dumps({
    "last_session_id": session.session_id,
    "last_updated": datetime.now().isoformat(),
}))
```

#### Auto-completion for Session IDs

**Dynamic Completer**:

```python
def build_completer(manager: SessionManager) -> Completer:
    """Build dynamic completer with session IDs."""

    def get_session_ids() -> list[str]:
        return [s["session_id"] for s in manager.list_sessions()]

    return NestedCompleter.from_nested_dict({
        'start': None,
        'continue': None,
        'switch': FuzzyWordCompleter(get_session_ids),  # Dynamic!
        'expand': {
            '--worker': None,
        },
        'list': {
            'sessions': None,
            'workers': {
                '--session': FuzzyWordCompleter(get_session_ids),
            }
        },
        'status': None,
        'reset': None,
        'exit': None,
        'help': None,
    })
```

---

### 7. Architecture Decisions & Rationale

#### Why prompt_toolkit Over cmd2?

**Decision**: Use `prompt_toolkit`

**Rationale**:

- ✅ Native async support (critical for long-running research)
- ✅ Used by production tools (IPython, ptpython, AWS CLI)
- ✅ Rich customization (styling, completion, history)
- ✅ Active maintenance
- ✅ Integrates with Rich for progress display

**Trade-off**: More development effort than cmd2, but better UX and async support.

#### Why In-Memory SessionManager?

**Decision**: SessionManager maintains active session in memory, syncs with vault

**Rationale**:

- Vault (Obsidian) is **slow** for querying (file I/O)
- In-memory tracking enables fast `status` and `switch` commands
- Vault remains single source of truth (SSOT) - memory is cache
- Sync on session start/complete/switch

**Alternative Considered**: Load from vault every time

- **Rejected**: Too slow, would block REPL responsiveness

#### Continuation Context Size

**Decision**: Compress context to ~50k tokens (insights + report summary)

**Rationale**:

- Full session context can be 500k-5M tokens (all workers, tool calls)
- LLM context limits (200k for Claude 3.5 Sonnet)
- Balance: Enough context for coherent continuation, not overwhelming
- Full context available in vault for human review

**Strategy**:

- Include: Original query, insights (10 max), report summary (2000 chars), worker count, source count
- Exclude: Full worker outputs, all tool calls, full sources

**Alternative**: Include full worker outputs

- **Rejected**: Would hit token limits with 5+ workers

#### Session ID Reuse for Versions

**Decision**: Same session_id across versions (e.g., `session_20250121_120000_abc123`)

**Rationale**:

- ✅ Clear lineage (all versions in same directory)
- ✅ Easy to find related research
- ✅ Graph view shows version chain
- ✅ Simplifies session switching (don't need to remember v2 ID)

**Alternative**: UUID per version

- **Rejected**: Loses relationship between versions, harder to navigate

#### Command vs Natural Language Parsing

**Decision**: Structured commands with aliases (not full natural language)

**Rationale**:

- ✅ Predictable, unambiguous
- ✅ Faster to implement
- ✅ Tab completion works
- ✅ Easier to document

**Natural Language**: Could add later with LLM-based intent parsing

- Example: "Continue my last session" → parse → `continue`

---

### 8. Architecture Insights

#### Current Strengths for Interactive Mode

1. **Data Model is Ready**:
   - `parent_session_id` field exists
   - Full context preservation implemented
   - Version tracking implemented

2. **Persistence Layer is Complete**:
   - ObsidianWriter stores full sessions
   - SessionLoader reconstructs sessions
   - Round-trip serialization works

3. **Progress Display is Production-Grade**:
   - LiveProgress with Rich
   - Thread-safe updates
   - Clean output formatting

4. **Async Execution Already Implemented**:
   - All commands use `asyncio.run()`
   - LangGraph workers run in parallel
   - Ready for async REPL integration

#### Missing Pieces

1. **No REPL Loop**:
   - Current CLI is fire-and-forget (run command, exit)
   - Need persistent interactive session

2. **No In-Memory State**:
   - Orchestrator creates session, executes, saves, forgets
   - Need SessionManager to track active session

3. **No Command Parser**:
   - Each command is separate Click command
   - Need unified parser for REPL input

4. **No Multi-Session Management**:
   - Can only work on one session at a time
   - Need session stack and switching

#### Design Patterns

**Repository Pattern**:

- `SessionLoader` - Read operations
- `ObsidianWriter` - Write operations
- Separation of concerns

**Protocol Pattern** (`ProgressCallback`):

- `NoOpProgress` - Quiet mode
- `LiveProgress` - Rich display
- Pluggable progress implementations

**State Machine** (LangGraph):

- analyze → plan → workers → synthesize
- Already supports parallel execution
- Ready for REPL integration

**Context Manager** (`LiveProgress`):

- Clean setup/teardown
- Exception-safe resource management
- Integrates with Rich `Live`

---

### 9. Historical Context (from thoughts/)

#### Previous Research

**2025-11-15_deep-research-agent-architecture.md** (lines 850-860):

> **Interactive Mode** section describes step-by-step execution:
>
> ```
> CLI: deep-research research "query" --interactive
> User prompt: Continue? [Y/n/stop] after each agent step
> Shows tool execution visibility and control flow
> ```

This was the **original vision** for interactive mode - step-by-step control. Our REPL design extends this to full session management and continuation.

**2025-11-20_obsidian-iterative-research-architecture.md**:

> "Previous research identified the need for 'session expansion' and 'iterative refinement' but didn't specify the storage mechanism. This research provides the missing piece: Obsidian as the persistence and exploration layer."

The **storage problem is solved**. Now we're adding the **interaction layer**.

**obsidian-iterative-research-implementation.md**:
Detailed plan for session versioning, expand command, recompile command. Our REPL integrates these as interactive commands.

#### CLI Design Evolution

1. **Phase 1**: Single-shot commands (current)
2. **Phase 2**: Interactive mode with step control (original vision)
3. **Phase 3**: Full REPL with session management (this design)

#### Key Historical Decision

From 2025-11-16_alibaba-deepresearch-gap-analysis.md:

> "Human-in-the-loop decision points enhance research quality"

This reinforces the value of interactive mode - not just for UX, but for **research quality** through human guidance.

---

### 10. Risk Assessment

#### High Risk

**1. Async REPL Complexity**

- **Risk**: Nested event loops (prompt + research execution) can deadlock
- **Mitigation**: Use `patch_stdout()`, test extensively with concurrent output
- **Fallback**: Implement synchronous mode that blocks during research

**2. State Synchronization**

- **Risk**: In-memory session state gets out of sync with vault
- **Mitigation**: Always sync on session start/complete, add sync command
- **Fallback**: Reload from vault on every command (slower but safe)

#### Medium Risk

**3. Token Limits for Continuation**

- **Risk**: Compressed context still too large for some queries
- **Mitigation**: Aggressive summarization, configurable context size
- **Fallback**: Allow user to select which workers to include in context

**4. User Confusion**

- **Risk**: Command syntax unclear, users struggle
- **Mitigation**: Rich help text, examples, tab completion
- **Fallback**: Add wizard mode for guided workflows

**5. REPL Performance**

- **Risk**: Auto-completion sluggish with many sessions
- **Mitigation**: Cache session list, lazy load details
- **Fallback**: Disable auto-completion, use manual entry

#### Low Risk

**6. Dependency Stability**

- **Risk**: prompt_toolkit breaking changes
- **Mitigation**: Pin version, test upgrades
- **Fallback**: Minimal dependencies, can fork if needed

**7. History File Corruption**

- **Risk**: `.deep_research_history` gets corrupted
- **Mitigation**: Graceful fallback to no history
- **Fallback**: Clear history file on corruption

---

### 11. Success Metrics

**1. Command Execution Speed**:

- Metric: `status` command < 100ms
- Metric: `list sessions` < 500ms
- Metric: Session switch < 200ms

**2. User Productivity**:

- Metric: Time to continue session < 30s (vs 2 min with CLI commands)
- Metric: 80% of users prefer interactive mode in survey

**3. Context Effectiveness**:

- Metric: Continuation context < 50k tokens
- Metric: Continuation coherence score > 8/10 (human eval)

**4. Reliability**:

- Metric: Zero crashes in 100 REPL sessions
- Metric: State sync accuracy 100% (vault matches memory)

**5. UX Quality**:

- Metric: First-time users complete tutorial in < 5 min
- Metric: Tab completion used in 60%+ of commands

---

### 12. Open Questions

#### 1. Context Window Strategy

**Question**: Should we allow users to customize continuation context size?

**Options**:

- **Fixed 50k tokens**: Simple, consistent
- **Auto-adjust by complexity**: More context for complex queries
- **User-configurable**: `--context-size` flag

**Recommendation**: Start with fixed 50k, add auto-adjust later based on metrics.

#### 2. Multi-User Sessions

**Question**: Should we support collaborative research sessions?

**Options**:

- **Single-user only**: Simpler, current architecture
- **Shared vault**: Multiple users, same Obsidian vault
- **Cloud sync**: Real-time collaboration

**Recommendation**: Single-user for MVP, consider shared vault in Phase 6.

#### 3. Cost Limits

**Question**: Should REPL warn/block expensive operations?

**Options**:

- **No limits**: Trust users
- **Soft warnings**: Show estimate, ask confirmation
- **Hard limits**: Configurable max cost per session

**Recommendation**: Soft warnings for operations > $1, hard limit at $10 (configurable).

#### 4. Export Formats

**Question**: What export formats should we support?

**Options**:

- **Markdown**: Already in vault
- **Jupyter Notebook**: For analysis workflows
- **PDF**: For sharing/archiving
- **JSON**: For API integration

**Recommendation**: Start with markdown (free), add notebook export in Phase 5.

#### 5. Session Garbage Collection

**Question**: Should we auto-delete old sessions?

**Options**:

- **Never delete**: Manual cleanup only
- **Auto-archive**: Move old sessions to `.archive/`
- **TTL-based**: Delete after N days

**Recommendation**: Never delete (storage is cheap), provide `archive` command for manual cleanup.

---

## Code References

### Current CLI Implementation

- `deep-research-agent/src/deep_research/cli.py:68-71` - Click group entry point
- `deep-research-agent/src/deep_research/cli.py:74-159` - `research` command (single-agent)
- `deep-research-agent/src/deep_research/cli.py:178-239` - `multi` command (multi-agent)
- `deep-research-agent/src/deep_research/cli.py:242-355` - `expand` command (worker expansion)
- `deep-research-agent/src/deep_research/cli.py:372-465` - `recompile-report` command
- `deep-research-agent/src/deep_research/cli.py:474-536` - `list-sessions` command
- `deep-research-agent/src/deep_research/cli.py:552-650` - `list-workers` command

### State Management

- `deep-research-agent/src/deep_research/agent/state.py:8-58` - Core data structures (`ToolCall`, `ReActIteration`, `WorkerFullContext`, `ResearchSession`)
- `deep-research-agent/src/deep_research/agent/state.py:60-93` - `ResearchSession` with versioning fields

### Orchestrator

- `deep-research-agent/src/deep_research/agent/orchestrator.py:69-136` - Research execution entry point
- `deep-research-agent/src/deep_research/agent/orchestrator.py:72-85` - Session initialization
- `deep-research-agent/src/deep_research/agent/orchestrator.py:138-160` - LangGraph workflow construction
- `deep-research-agent/src/deep_research/agent/orchestrator.py:378-383` - Worker spawning with `Send` API
- `deep-research-agent/src/deep_research/agent/orchestrator.py:419-445` - Full context capture from workers

### Obsidian Integration

- `deep-research-agent/src/deep_research/obsidian/writer.py:22-346` - Complete ObsidianWriter implementation
- `deep-research-agent/src/deep_research/obsidian/writer.py:27-49` - Directory structure creation
- `deep-research-agent/src/deep_research/obsidian/writer.py:51-77` - Session write flow
- `deep-research-agent/src/deep_research/obsidian/writer.py:79-139` - Session MOC generation with frontmatter
- `deep-research-agent/src/deep_research/obsidian/writer.py:141-183` - Worker note writing with full ReAct trace
- `deep-research-agent/src/deep_research/obsidian/loader.py:19-65` - Session loading from vault
- `deep-research-agent/src/deep_research/obsidian/loader.py:67-125` - Worker reconstruction
- `deep-research-agent/src/deep_research/obsidian/loader.py:127-141` - Frontmatter parsing
- `deep-research-agent/src/deep_research/obsidian/loader.py:143-203` - ReAct trace parsing

### Progress Display

- `deep-research-agent/src/deep_research/utils/live_progress.py:24-201` - LiveProgress implementation
- `deep-research-agent/src/deep_research/utils/live_progress.py:14-24` - Initialization with thread-safe lock
- `deep-research-agent/src/deep_research/utils/live_progress.py:26-41` - Context manager pattern
- `deep-research-agent/src/deep_research/utils/live_progress.py:94-185` - Rich rendering logic

### Testing

- `deep-research-agent/tests/test_session_loader.py:82-105` - Round-trip persistence test
- `deep-research-agent/tests/test_session_loader.py:266-310` - Parent session linking test

---

## Architecture Comparison

### Current Architecture (Fire-and-Forget)

```
User types command → Click parses → asyncio.run() → Execute research → Save to vault → Exit
```

### Proposed Architecture (Interactive REPL)

```
Launch REPL → prompt_toolkit loop
    ↓
User types command → CommandParser → SessionManager
    ↓
Execute research (with LiveProgress) → Save to vault → Update session state
    ↓
Return to prompt (session remains active)
    ↓
User types continue → Load context → Create v2 → Execute → Save
    ↓
Loop continues...
```

**Key Difference**: Session state **persists** between commands in REPL mode.

---

## Conclusions

The deep-research agent has a **strong foundation** for interactive CLI mode:

1. ✅ **Data model supports versioning** - `parent_session_id`, version tracking
2. ✅ **Full context preservation** - No data loss, complete worker traces
3. ✅ **Session persistence** - ObsidianWriter/Loader for full serialization
4. ✅ **Async execution** - Ready for non-blocking REPL
5. ✅ **Rich progress display** - Production-grade terminal UI

**What's needed**:

1. ❌ REPL loop with `prompt_toolkit`
2. ❌ SessionManager for in-memory state
3. ❌ CommandParser for natural language
4. ❌ Multi-session management

**Implementation is straightforward** because the hard parts (state management, persistence, execution) are **already implemented**. The REPL is a thin layer on top.

**Critical Success Factors**:

- ✅ prompt_toolkit for rich async REPL experience
- ✅ SessionManager for fast session switching
- ✅ Context compression for continuation (50k tokens)
- ✅ Integration with existing LiveProgress
- ✅ Graceful state sync between memory and vault

**Next Steps**: Begin Phase 1 implementation (REPL foundation) as outlined in roadmap.

---

## References

### Internal Codebase

- `deep-research-agent/src/deep_research/cli.py` - Current CLI implementation
- `deep-research-agent/src/deep_research/agent/orchestrator.py` - Research execution engine
- `deep-research-agent/src/deep_research/agent/state.py` - Data structures
- `deep-research-agent/src/deep_research/obsidian/writer.py` - Session persistence
- `deep-research-agent/src/deep_research/obsidian/loader.py` - Session loading

### External Documentation

**prompt_toolkit**:

- Official Documentation: https://python-prompt-toolkit.readthedocs.io/en/master/
- SQLite REPL Tutorial: https://python-prompt-toolkit.readthedocs.io/en/master/pages/tutorials/repl.html
- Asyncio Support: https://python-prompt-toolkit.readthedocs.io/en/master/pages/advanced_topics/asyncio.html
- GitHub: https://github.com/prompt-toolkit/python-prompt-toolkit
- Async Example: https://github.com/prompt-toolkit/python-prompt-toolkit/blob/main/examples/prompts/asyncio-prompt.py

**REPL Frameworks**:

- cmd2 Documentation: https://cmd2.readthedocs.io/
- cmd2 GitHub: https://github.com/python-cmd2/cmd2
- cmd2 Alternatives Comparison: https://cmd2.readthedocs.io/en/0.9.0/alternatives.html

**Async REPL Patterns**:

- aiomonitor Documentation: https://aiomonitor.aio-libs.org/en/latest/tutorial/
- aiomonitor GitHub: https://github.com/aio-libs/aiomonitor
- IPython Autoawait: https://ipython.readthedocs.io/en/stable/interactive/autoawait.html
- Jupyter Architecture: https://docs.jupyter.org/en/latest/projects/architecture/content-architecture.html

**Command Parsing**:

- shlex Documentation: https://docs.python.org/3/library/shlex.html
- argparse Documentation: https://docs.python.org/3/library/argparse.html
- REPL + argparse Pattern: https://gist.github.com/benkehoe/2e6a08b385e3385f8a54805c99914c75
- Multi-Level Argparse: https://dzone.com/articles/multi-level-argparse-python
- Stack Overflow Discussion: https://stackoverflow.com/questions/69062838/python-library-for-repl-and-cli-argument-parsing

**Progress Display**:

- Rich Progress: https://rich.readthedocs.io/en/stable/progress.html
- tqdm with asyncio: https://towardsdatascience.com/using-tqdm-with-asyncio-in-python-5c0f6e747d55

**Production Examples**:

- ptpython GitHub: https://github.com/prompt-toolkit/ptpython
- ptpython Basic Embed: https://github.com/prompt-toolkit/ptpython/blob/main/examples/python-embed.py
- ptpython Asyncio Embed: https://github.com/prompt-toolkit/ptpython/blob/main/examples/asyncio-python-embed.py
- SAWS (AWS CLI REPL): https://github.com/donnemartin/saws
- aws-cli-repl (Performance-Optimized): https://github.com/janakaud/aws-cli-repl

**Additional Resources**:

- 4 Python Libraries for CLIs: https://opensource.com/article/17/5/4-practical-python-libraries
- Python asyncio Documentation: https://docs.python.org/3/library/asyncio.html
- Writing an async REPL (blog): https://carreau.github.io/posts/27-Writing-an-async-REPL---Part-1.ipynb/
- Python readline module: https://docs.python.org/3/library/readline.html

### Historical Research Documents

- `thoughts/shared/research/2025-11-20_obsidian-iterative-research-architecture.md` - Obsidian-based iterative research architecture
- `thoughts/shared/research/2025-11-15_deep-research-agent-architecture.md` - Original deep research agent architecture with interactive mode vision (lines 850-860)
- `thoughts/shared/research/2025-11-15_multi-agent-deep-research-architecture-v2.md` - Multi-agent architecture v2
- `thoughts/shared/research/2025-11-16_alibaba-deepresearch-gap-analysis.md` - Gap analysis with human-in-the-loop discussion
- `thoughts/shared/research/2025-11-07_context-engineering-claude-code.md` - Context engineering patterns for interactive flows
- `thoughts/shared/plans/obsidian-iterative-research-implementation.md` - Implementation plan for session versioning and expansion
- `thoughts/shared/plans/deep-research-agent-python-mvp.md` - Python MVP with Click-based CLI

---

**Total Word Count**: ~11,500 words
**Research Duration**: ~2 hours (5 parallel sub-agents)
**Codebase Files Analyzed**: 15+ files
**External Resources Consulted**: 25+ links
