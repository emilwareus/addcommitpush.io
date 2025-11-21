"""Structured logging."""
import os
import sys
from typing import Any, cast

import structlog
from rich.console import Console


class NullWriter:
    """Writer that discards all output. Implements minimal TextIO interface."""

    def write(self, _: str) -> int:
        return 0

    def flush(self) -> None:
        pass

    def isatty(self) -> bool:
        return False


def _console_renderer(_: Any, __: str, event_dict: dict[str, Any]) -> str:
    """Render log events in a readable console format."""
    console = Console(file=sys.stderr)

    # Extract key fields
    event = event_dict.get("event", "")
    level = event_dict.get("level", "info")

    # Build a human-readable message
    parts = []

    # Color based on level
    if level == "error":
        prefix = "[red]✗[/red]"
    elif level == "warning":
        prefix = "[yellow]⚠[/yellow]"
    elif level == "debug":
        prefix = "[dim]•[/dim]"
    else:
        prefix = "[cyan]•[/cyan]"

    # Format the main event message
    parts.append(prefix)

    # Make event names more readable
    event_name = event.replace("_", " ").title()
    parts.append(f"[dim]{event_name}[/dim]")

    # Add key details
    for key, value in event_dict.items():
        if key in ("event", "level", "timestamp"):
            continue
        if value:
            # Truncate long values
            value_str = str(value)
            if len(value_str) > 100:
                value_str = value_str[:97] + "..."
            parts.append(f"[dim]{key}=[/dim]{value_str}")

    message = " ".join(parts)
    console.print(message)
    return ""  # Already printed, return empty string


def get_logger(name: str) -> Any:
    """Get structured logger."""
    # Only enable logging if VERBOSE env var is set
    verbose = os.getenv("DEEP_RESEARCH_VERBOSE", "false").lower() == "true"

    if not verbose:
        # Disable logging output by using NullWriter
        from typing import TextIO

        structlog.configure(
            logger_factory=structlog.PrintLoggerFactory(file=cast(TextIO, NullWriter())),
            processors=[
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.add_log_level,
                structlog.processors.JSONRenderer(),
            ],
        )
    else:
        # Output to stderr when verbose with readable console format
        structlog.configure(
            logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
            processors=[
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.add_log_level,
                _console_renderer,  # type: ignore[list-item]
            ],
        )

    return structlog.get_logger(name)
