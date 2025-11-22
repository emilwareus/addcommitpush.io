"""Command parser for interactive REPL."""

import argparse
import shlex
from typing import Any


class CommandParser:
    """Parse REPL commands with argparse."""

    def __init__(self) -> None:
        self.parser = self._build_parser()

    def _build_parser(self) -> argparse.ArgumentParser:
        """Build argparse parser for all REPL commands."""
        parser = argparse.ArgumentParser(
            exit_on_error=False,  # Don't exit REPL on parse error
            prog="",
            add_help=False,  # We'll handle help manually
        )

        subparsers = parser.add_subparsers(dest="command", help="Available commands")

        # start <query> [--model MODEL]
        start = subparsers.add_parser("start", aliases=["new", "begin"])
        start.add_argument("query", nargs="+", help="Research query")
        start.add_argument("--model", "-m", help="LLM model to use")

        # continue [query]
        cont = subparsers.add_parser("continue", aliases=["resume"])
        cont.add_argument("query", nargs="*", help="Additional research query")

        # status
        subparsers.add_parser("status", help="Show active session status")

        # list sessions|workers [--session SESSION_ID]
        list_cmd = subparsers.add_parser("list")
        list_cmd.add_argument("target", choices=["sessions", "workers"])
        list_cmd.add_argument("--session", help="Session ID (required for workers)")

        # switch <session_id> [--version VERSION]
        switch = subparsers.add_parser("switch", aliases=["load"])
        switch.add_argument("session_id", help="Session ID to switch to")
        switch.add_argument("--version", "-v", type=int, default=1)

        # expand --worker <id> <query>
        expand = subparsers.add_parser("expand")
        expand.add_argument("--worker", "-w", required=True)
        expand.add_argument("query", nargs="+", help="Expansion query")

        # export --format <format> [--output PATH]
        export = subparsers.add_parser("export")
        export.add_argument(
            "--format", "-f", required=True, choices=["markdown", "json"], help="Export format"
        )
        export.add_argument("--output", "-o", help="Output file path")

        # reset
        subparsers.add_parser("reset", aliases=["clear"], help="Clear active session")

        # exit
        subparsers.add_parser("exit", aliases=["quit", "q"], help="Exit REPL")

        # help
        subparsers.add_parser("help", help="Show help")

        return parser

    def parse(self, user_input: str) -> tuple[str, dict[str, Any]] | None:
        """Parse user input into (command, args) or None if invalid.

        Args:
            user_input: Raw user input string

        Returns:
            Tuple of (command_name, args_dict) or None on parse error
        """
        try:
            # Tokenize with shell-like parsing
            args = shlex.split(user_input)
            if not args:
                return None

            # Parse command - suppress argparse output
            import io
            import sys

            old_stderr = sys.stderr
            sys.stderr = io.StringIO()  # Suppress argparse error messages
            try:
                parsed = self.parser.parse_args(args)
            finally:
                sys.stderr = old_stderr  # Restore stderr

            # Handle command aliases
            command = parsed.command
            if command in ("new", "begin"):
                command = "start"
            elif command in ("resume",):
                command = "continue"
            elif command in ("load",):
                command = "switch"
            elif command in ("clear",):
                command = "reset"
            elif command in ("q", "quit"):
                command = "exit"

            return (command, vars(parsed))

        except (argparse.ArgumentError, ValueError, SystemExit):
            # Parse error - return None
            return None
