"""Verbose console output for research agents."""
import os
from datetime import datetime
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.text import Text


class VerboseConsole:
    """Real-time verbose console output using Rich."""

    def __init__(self) -> None:
        self.console = Console(stderr=True)

    @property
    def enabled(self) -> bool:
        """Check if verbose mode is enabled (lazy evaluation)."""
        return os.getenv("DEEP_RESEARCH_VERBOSE", "false").lower() == "true"

    def print(self, message: str, style: str = "cyan") -> None:
        """Print a message if verbose is enabled."""
        if not self.enabled:
            return
        self.console.print(f"[{style}]•[/{style}] {message}")

    def search_started(self, query: str) -> None:
        """Show search starting."""
        if not self.enabled:
            return
        text = Text()
        text.append("Searching: ", style="bold cyan")
        text.append(query, style="white")
        self.console.print(text)

    def search_result(self, index: int, title: str, url: str) -> None:
        """Show individual search result."""
        if not self.enabled:
            return
        text = Text()
        text.append(f"  [{index}] ", style="dim")
        text.append(title[:80], style="white")
        text.append(f"\n      {url[:80]}", style="dim cyan")
        self.console.print(text)

    def search_complete(self, count: int) -> None:
        """Show search completion."""
        if not self.enabled:
            return
        self.console.print(f"[green]Found {count} results[/green]\n")

    def fetch_started(self, url: str) -> None:
        """Show fetch starting."""
        if not self.enabled:
            return
        text = Text()
        text.append("Reading: ", style="bold blue")
        text.append(url[:100], style="white")
        self.console.print(text)

    def fetch_complete(self, url: str, length: int, truncated: bool) -> None:
        """Show fetch completion."""
        if not self.enabled:
            return
        status = "truncated" if truncated else "complete"
        self.console.print(
            f"[green]Retrieved {length:,} chars ({status})[/green]\n",
        )

    def iteration(self, current: int, max_iterations: int) -> None:
        """Show reasoning iteration."""
        if not self.enabled:
            return
        self.console.print(
            f"\n[bold yellow]Reasoning[/bold yellow] [dim](step {current}/{max_iterations})[/dim]"
        )

    def tool_call(self, tool: str, description: str) -> None:
        """Show tool being called."""
        if not self.enabled:
            return
        text = Text()
        text.append(f"  {tool}: ", style="bold yellow")
        text.append(description, style="white")
        self.console.print(text)

    def thinking(self, message: str) -> None:
        """Show agent thinking/reasoning."""
        if not self.enabled:
            return
        # Wrap long text
        from textwrap import fill
        wrapped = fill(message, width=100, initial_indent="  ", subsequent_indent="  ")
        self.console.print(f"[cyan]{wrapped}[/cyan]")

    def final_answer(self, iteration: int) -> None:
        """Show final answer being generated."""
        if not self.enabled:
            return
        self.console.print(
            f"\n[bold green]Generating final answer[/bold green] [dim](after {iteration} steps)[/dim]\n"
        )

    def error(self, message: str) -> None:
        """Show error."""
        if not self.enabled:
            return
        self.console.print(f"[red]Error: {message}[/red]")

    def panel(self, title: str, content: str, style: str = "cyan") -> None:
        """Show content in a panel."""
        if not self.enabled:
            return
        self.console.print(Panel(content, title=title, border_style=style))


# Global instance
_verbose_console: VerboseConsole | None = None


def get_verbose_console() -> VerboseConsole:
    """Get or create the global verbose console instance."""
    global _verbose_console
    if _verbose_console is None:
        _verbose_console = VerboseConsole()
    return _verbose_console
