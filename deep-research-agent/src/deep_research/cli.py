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


def main() -> None:
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
