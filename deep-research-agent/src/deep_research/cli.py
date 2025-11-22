"""CLI entry point."""
import asyncio
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import click
from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown

from .agent.react import ReactAgent
from .models import SupportedModel
from .utils.logger import get_logger
from .utils.store import FileStore

load_dotenv()
console = Console()
logger = get_logger(__name__)


def _format_cost_line(metadata: Mapping[str, Any] | None) -> str:
    """Format a dimmed line that summarizes LLM cost + pricing."""
    if not metadata:
        return "[dim]Cost: unavailable[/dim]"

    cost = metadata.get("cost") if isinstance(metadata, Mapping) else None
    if not cost:
        return "[dim]Cost: unavailable[/dim]"

    total_cost = cost.get("total_cost")
    if total_cost is None:
        return "[dim]Cost: unavailable[/dim]"

    pricing_raw = metadata.get("pricing") if isinstance(metadata, Mapping) else {}
    pricing: dict[str, Any] = pricing_raw if isinstance(pricing_raw, dict) else {}
    prompt_tokens = metadata.get("prompt_tokens", metadata.get("tokens_used"))
    completion_tokens = metadata.get("completion_tokens")

    def _format_rate(value: Any) -> str:
        return f"${value:.2f}/M" if isinstance(value, (float, int)) else "n/a"

    details: list[str] = []
    if prompt_tokens is not None and isinstance(pricing, dict):
        rate = _format_rate(pricing.get("input_price_per_million"))
        details.append(f"prompt {prompt_tokens} tok @{rate}")
    if completion_tokens is not None and isinstance(pricing, dict):
        rate = _format_rate(pricing.get("output_price_per_million"))
        details.append(f"completion {completion_tokens} tok @{rate}")
    if pricing and isinstance(pricing, dict) and pricing.get("context_window_tokens"):
        details.append(f"context {pricing['context_window_tokens']:,} tok")

    detail_str = "; ".join(details) if details else "pricing reference available"
    return f"[dim]Cost: ${total_cost:.4f} ({detail_str})[/dim]"


def _total_tokens(metadata: Mapping[str, Any] | None) -> int | None:
    """Compute total tokens from metadata."""
    if not metadata:
        return None
    prompt = metadata.get("prompt_tokens")
    completion = metadata.get("completion_tokens")
    if prompt is not None and completion is not None:
        return int(prompt) + int(completion)
    return metadata.get("tokens_used")


@click.group()
def cli() -> None:
    """Deep research agent CLI."""
    pass


@cli.command()
@click.argument("query")
@click.option(
    "-o",
    "--output",
    type=click.Path(),
    help="Output file path",
)
@click.option(
    "-m",
    "--model",
    type=click.Choice([m.value for m in SupportedModel], case_sensitive=False),
    default=SupportedModel.default().value,
    help="LLM model to use",
)
@click.option("--max-iterations", type=int, default=20, help="Max iterations")
@click.option("-v", "--verbose", is_flag=True, help="Verbose output")
def research(
    query: str,
    output: str | None,
    model: str | None,
    max_iterations: int,
    verbose: bool,
) -> None:
    """Research a topic and generate a report."""
    import os
    import sys

    # Enable logging if verbose
    if verbose:
        os.environ["DEEP_RESEARCH_VERBOSE"] = "true"
        # Verify it's set and working
        env_val = os.getenv("DEEP_RESEARCH_VERBOSE")
        print(f"[Verbose mode: ON - ENV={env_val}]", file=sys.stderr, flush=True)

    async def _research() -> None:
        # Convert model string to SupportedModel enum
        selected_model = SupportedModel.from_string(model) if model else SupportedModel.default()
        if not selected_model:
            raise click.BadParameter(f"Unsupported model: {model}")

        agent = ReactAgent(
            model=selected_model.model_name,
            max_iterations=max_iterations,
        )

        # Skip status wrapper in verbose mode to allow continuous output
        if verbose:
            console.print(f"[bold green]Researching:[/bold green] {query}\n")
            report = await agent.research(query)
        else:
            with console.status(f"[bold green]Researching: {query}"):
                report = await agent.research(query)

        # Display report
        if not output:
            metadata = report.metadata
            console.print("\n")
            console.print(Markdown(report.content))
            console.print(f"\n[dim]Visited: {len(report.sources)} sources[/dim]")
            console.print(f"[dim]Iterations: {metadata['iterations']}[/dim]")
            total_tokens = _total_tokens(metadata)
            if total_tokens is not None:
                console.print(f"[dim]Tokens: {total_tokens}[/dim]")
            console.print(_format_cost_line(metadata))
        else:
            # Save to file
            Path(output).write_text(report.content)
            console.print(f"[green]✓[/green] Report saved to: {output}")

        # Save session
        if verbose:
            store = FileStore()
            session_id = f"session_{hash(query)}"
            store.save_session(
                session_id,
                {
                    "query": query,
                    "report": report.content,
                    "sources": report.sources,
                    "metadata": report.metadata,
                },
            )
            console.print(f"[dim]Session saved: {session_id}[/dim]")

    asyncio.run(_research())


@cli.command()
@click.argument("query")
@click.option(
    "-o",
    "--output",
    type=click.Path(),
    help="Output file",
)
@click.option(
    "-m",
    "--model",
    type=click.Choice([m.value for m in SupportedModel], case_sensitive=False),
    default=SupportedModel.default().value,
    help="LLM model",
)
@click.option("-v", "--verbose", is_flag=True, help="Verbose output")
def multi(
    query: str,
    output: str | None,
    model: str | None,
    verbose: bool,
) -> None:
    """Multi-agent research (Phase 2)."""
    import os

    from .agent.orchestrator import LeadResearcher
    from .utils.live_progress import LiveProgress

    # Enable logging if verbose
    if verbose:
        os.environ["DEEP_RESEARCH_VERBOSE"] = "true"

    async def _research() -> None:
        # Convert model string to SupportedModel enum
        selected_model = SupportedModel.from_string(model) if model else SupportedModel.default()
        if not selected_model:
            raise click.BadParameter(f"Unsupported model: {model}")

        progress = LiveProgress(query, console=console)
        orchestrator = LeadResearcher(model=selected_model.model_name, progress=progress)

        with progress:
            result = await orchestrator.research(query)

        # Display
        if not output:
            metadata = result["metadata"]
            console.print("\n")
            console.print(Markdown(result["report"]))
            console.print(f"\n[dim]Workers: {result['metadata']['workers']}[/dim]")
            console.print(f"[dim]Sources: {len(result['sources'])}[/dim]")
            total_tokens = _total_tokens(metadata)
            if total_tokens is not None:
                console.print(f"[dim]Tokens: {total_tokens}[/dim]")
            console.print(_format_cost_line(metadata))
            if "obsidian_session_path" in metadata:
                obsidian_path = metadata["obsidian_session_path"]
                console.print(f"[green]✓[/green] [dim]Obsidian session: {obsidian_path}[/dim]")
        else:
            Path(output).write_text(result["report"])
            console.print(f"[green]✓[/green] Report saved: {output}")

        # Save session
        if verbose:
            store = FileStore()
            session_id = f"session_{hash(query)}"
            store.save_session(
                session_id,
                {
                    "query": query,
                    "report": result["report"],
                    "sources": result["sources"],
                    "metadata": result["metadata"],
                },
            )
            console.print(f"[dim]Session saved: {session_id}[/dim]")

    asyncio.run(_research())


@cli.command()
@click.option(
    "--session",
    required=True,
    help="Session ID to expand (e.g., session_20250120_142530_abc123)",
)
@click.option(
    "--worker",
    required=True,
    help="Worker ID to expand (e.g., task_1)",
)
@click.argument("prompt")
@click.option(
    "-m",
    "--model",
    type=click.Choice([m.value for m in SupportedModel], case_sensitive=False),
    default=SupportedModel.default().value,
    help="LLM model to use",
)
@click.option("-v", "--verbose", is_flag=True, help="Verbose output")
def expand(
    session: str,
    worker: str,
    prompt: str,
    model: str | None,
    verbose: bool,
) -> None:
    """Expand a specific worker's research with additional instructions.

    Example:
        research expand --session=session_20250120_142530_abc123 --worker=task_1 "Research GPU costs in detail"
    """
    import os

    from .agent.orchestrator import LeadResearcher
    from .agent.state import ResearchSession
    from .obsidian.loader import SessionLoader

    # Enable logging if verbose
    if verbose:
        os.environ["DEEP_RESEARCH_VERBOSE"] = "true"

    async def _expand() -> None:
        # Load session
        loader = SessionLoader()

        with console.status(f"[bold green]Loading session: {session}"):
            try:
                parent_session = loader.load_session(session)
            except FileNotFoundError as e:
                console.print(f"[red]Error:[/red] {e}")
                return

        console.print(f"[green]✓[/green] Loaded session: {parent_session.query}")
        console.print(f"[dim]  Workers: {len(parent_session.workers)}, Version: {parent_session.version}[/dim]")

        # Find target worker
        target_worker = None
        for w in parent_session.workers:
            if w.worker_id == worker or w.task_id == worker:
                target_worker = w
                break

        if not target_worker:
            console.print(f"[red]Error:[/red] Worker '{worker}' not found in session")
            console.print(f"[dim]Available workers: {', '.join([w.worker_id for w in parent_session.workers])}[/dim]")
            return

        console.print(f"[green]✓[/green] Found worker: {target_worker.objective}")

        # Build expansion query
        expansion_query = f"""Continue the research from the previous worker's findings.

**Previous Objective**: {target_worker.objective}

**Previous Findings**:
{target_worker.final_output[:2000]}
[... previous research truncated ...]

**New Instructions**: {prompt}

Focus specifically on the new instructions while building on the previous research context."""

        # Create orchestrator
        selected_model = SupportedModel.from_string(model) if model else SupportedModel.default()
        if not selected_model:
            raise click.BadParameter(f"Unsupported model: {model}")
        orchestrator = LeadResearcher(model=selected_model.model_name)

        # Override session to create v2
        orchestrator.session = ResearchSession(
            session_id=parent_session.session_id,
            version=parent_session.version + 1,
            parent_session_id=f"{parent_session.session_id}_v{parent_session.version}",
            query=parent_session.query,
            complexity_score=parent_session.complexity_score,
        )

        # Execute expansion research
        with console.status(f"[bold green]Expanding research: {prompt[:50]}..."):
            result = await orchestrator.research(expansion_query)

        # Display results
        console.print("\n")
        console.print(Markdown(result["report"]))
        console.print(f"\n[dim]Workers: {result['metadata'].get('workers', 'N/A')}[/dim]")
        console.print(f"[dim]Sources: {len(result['sources'])} sources[/dim]")
        console.print(_format_cost_line(result["metadata"]))

        if "obsidian_session_path" in result["metadata"]:
            obsidian_path = result["metadata"]["obsidian_session_path"]
            console.print(f"[green]✓[/green] [dim]Obsidian session (v{orchestrator.session.version}): {obsidian_path}[/dim]")

    asyncio.run(_expand())


@cli.command()
@click.option(
    "--session",
    required=True,
    help="Session ID to recompile (e.g., session_20250120_142530_abc123)",
)
@click.argument("instructions", required=False)
@click.option(
    "-m",
    "--model",
    type=click.Choice([m.value for m in SupportedModel], case_sensitive=False),
    default=SupportedModel.default().value,
    help="LLM model to use",
)
def recompile_report(
    session: str,
    instructions: str | None,
    model: str | None,
) -> None:
    """Recompile a research report with new synthesis instructions.

    Example:
        research recompile-report --session=session_20250120_142530_abc123 "Focus on cost-benefit analysis"
    """
    from datetime import datetime

    from langchain_core.messages import HumanMessage, SystemMessage

    from .llm.client import get_llm
    from .obsidian.loader import SessionLoader
    from .obsidian.writer import ObsidianWriter

    async def _recompile() -> None:
        # Load session
        loader = SessionLoader()

        with console.status(f"[bold green]Loading session: {session}"):
            try:
                loaded_session = loader.load_session(session)
            except FileNotFoundError as e:
                console.print(f"[red]Error:[/red] {e}")
                return

        console.print(f"[green]✓[/green] Loaded session: {loaded_session.query}")
        console.print(f"[dim]  Workers: {len(loaded_session.workers)}, Version: {loaded_session.version}[/dim]")

        # Build synthesis prompt
        worker_findings = []
        for i, worker in enumerate(loaded_session.workers, 1):
            worker_findings.append(f"""
## Worker {i}: {worker.objective}

{worker.final_output}

Sources: {', '.join(worker.sources[:3])}{'...' if len(worker.sources) > 3 else ''}
""")

        synthesis_instructions = instructions or "Synthesize the findings into a comprehensive report."

        synthesis_prompt = f"""Synthesize the following research findings into a comprehensive report.

**Original Query**: {loaded_session.query}

**Synthesis Instructions**: {synthesis_instructions}

**Worker Findings**:
{''.join(worker_findings)}

Create a well-structured report that addresses the original query while following the synthesis instructions."""

        # Create LLM client
        selected_model = SupportedModel.from_string(model) if model else SupportedModel.default()
        if not selected_model:
            raise click.BadParameter(f"Unsupported model: {model}")
        llm = get_llm(model=selected_model.model_name)

        # Generate report
        with console.status("[bold green]Recompiling report..."):
            messages = [
                SystemMessage(content="You are an expert research synthesizer."),
                HumanMessage(content=synthesis_prompt),
            ]

            response = await llm.ainvoke(messages)
            content = response.content

            # Convert content to string if it's a list (some models return list of content blocks)
            if isinstance(content, list):
                new_report = " ".join(str(item) for item in content)
            else:
                new_report = str(content)

        # Create new report version
        # Update session for new report version
        loaded_session.version += 1
        loaded_session.report = new_report
        loaded_session.updated_at = datetime.now().isoformat()

        # Write new report file
        writer = ObsidianWriter()
        report_path = await writer._write_report(loaded_session, {})

        # Display
        console.print("\n")
        console.print(Markdown(new_report))
        console.print(f"\n[green]✓[/green] [dim]Report v{loaded_session.version} saved: {report_path}[/dim]")

    asyncio.run(_recompile())


@cli.command()
@click.option(
    "--vault-path",
    default="outputs/obsidian",
    help="Path to Obsidian vault",
)
def list_sessions(vault_path: str) -> None:
    """List all research sessions in the Obsidian vault.

    Example:
        research list-sessions
        research list-sessions --vault-path=/custom/path
    """
    from rich.table import Table

    from .obsidian.loader import SessionLoader

    loader = SessionLoader(vault_path=vault_path)
    sessions = loader.list_sessions()

    if not sessions:
        console.print("[yellow]No sessions found in vault[/yellow]")
        console.print(f"[dim]Vault path: {vault_path}[/dim]")
        return

    # Create table
    table = Table(title=f"Research Sessions ({len(sessions)} total)")
    table.add_column("Session ID", style="cyan", no_wrap=True)
    table.add_column("Version", justify="center", style="magenta")
    table.add_column("Query", style="green", max_width=50)
    table.add_column("Status", justify="center")
    table.add_column("Workers", justify="right", style="blue")
    table.add_column("Cost", justify="right", style="yellow")
    table.add_column("Created", style="dim")

    # Add rows
    for session in sessions:
        # Format status with color
        status = session["status"]
        if status == "completed":
            status_display = f"[green]{status}[/green]"
        elif status == "failed":
            status_display = f"[red]{status}[/red]"
        else:
            status_display = f"[yellow]{status}[/yellow]"

        # Truncate query if too long
        query = session["query"]
        if len(query) > 47:
            query = query[:47] + "..."

        # Format date
        created = session["created_at"]
        if "T" in created:
            created = created.split("T")[0]  # Show just the date

        table.add_row(
            session["session_id"],
            f"v{session['version']}",
            query,
            status_display,
            str(session["num_workers"]),
            f"${session['total_cost']:.4f}",
            created,
        )

    console.print(table)
    console.print(f"\n[dim]Vault location: {vault_path}[/dim]")


@cli.command()
@click.argument("session_id")
@click.option(
    "--vault-path",
    default="outputs/obsidian",
    help="Path to Obsidian vault",
)
@click.option(
    "--version",
    "-v",
    default=1,
    type=int,
    help="Session version (default: 1)",
)
def list_workers(session_id: str, vault_path: str, version: int) -> None:
    """List workers for a specific research session.

    Example:
        research list-workers session_20251120_165543_455654
        research list-workers session_20251120_165543_455654 --version=2
    """
    from rich.table import Table

    from .obsidian.loader import SessionLoader

    loader = SessionLoader(vault_path=vault_path)

    # Load session
    with console.status(f"[bold green]Loading session: {session_id} v{version}"):
        try:
            session = loader.load_session(session_id, version=version)
        except FileNotFoundError as e:
            console.print(f"[red]Error:[/red] {e}")
            return

    if not session.workers:
        console.print(f"[yellow]No workers found for session {session_id}[/yellow]")
        return

    # Session summary
    console.print(f"\n[bold]Session:[/bold] {session.query}")
    console.print(
        f"[dim]Version: {session.version} | Status: {session.status} | "
        f"Cost: ${session.cost:.4f}[/dim]\n"
    )

    # Create table
    table = Table(title=f"Workers ({len(session.workers)} total)")
    table.add_column("#", justify="right", style="cyan", width=3)
    table.add_column("Worker ID", style="blue")
    table.add_column("Objective", style="green", max_width=40)
    table.add_column("Status", justify="center")
    table.add_column("Tool Calls", justify="right", style="magenta")
    table.add_column("Sources", justify="right", style="yellow")
    table.add_column("Duration", justify="right")
    table.add_column("Cost", justify="right", style="yellow")

    # Add worker rows
    total_tool_calls = 0
    total_sources = 0
    total_duration = 0.0

    for i, worker in enumerate(session.workers, 1):
        # Format status
        status = worker.status
        if status == "completed":
            status_display = "[green]✓[/green]"
        elif status == "failed":
            status_display = "[red]✗[/red]"
        else:
            status_display = "[yellow]•[/yellow]"

        # Truncate objective
        objective = worker.objective
        if len(objective) > 37:
            objective = objective[:37] + "..."

        # Format duration
        duration = worker.duration_seconds
        if duration >= 60:
            duration_str = f"{duration/60:.1f}m"
        else:
            duration_str = f"{duration:.1f}s"

        # Count stats
        tool_calls = len(worker.tool_calls)
        sources = len(worker.sources)

        total_tool_calls += tool_calls
        total_sources += sources
        total_duration += duration

        table.add_row(
            str(i),
            worker.worker_id,
            objective,
            status_display,
            str(tool_calls),
            str(sources),
            duration_str,
            f"${worker.cost:.4f}",
        )

    console.print(table)

    # Summary stats
    console.print("\n[bold]Totals:[/bold]")
    console.print(f"  Tool calls: {total_tool_calls}")
    console.print(f"  Unique sources: {len(session.all_sources)}")
    console.print(f"  Total duration: {total_duration/60:.1f}m")
    console.print(f"  Total cost: ${session.cost:.4f}")

    console.print(f"\n[dim]Session file: {vault_path}/sessions/{session_id}_v{version}.md[/dim]")


@cli.command()
def interactive() -> None:
    """Start interactive REPL mode.

    Example:
        research interactive
    """
    from .repl.shell import interactive_repl

    asyncio.run(interactive_repl())


def main() -> None:
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
