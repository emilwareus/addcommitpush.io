"""Interactive REPL shell for deep research."""

import os
from pathlib import Path

from prompt_toolkit import PromptSession
from prompt_toolkit.auto_suggest import AutoSuggestFromHistory
from prompt_toolkit.history import FileHistory
from prompt_toolkit.patch_stdout import patch_stdout
from rich.console import Console

from .commands import (
    cmd_continue,
    cmd_expand,
    cmd_export,
    cmd_list_sessions,
    cmd_list_workers,
    cmd_reset,
    cmd_start,
    cmd_status,
    cmd_switch,
)
from .completer import build_completer
from .parser import CommandParser
from .session_manager import SessionManager


async def interactive_repl() -> None:
    """Main interactive REPL for research CLI."""
    # Disable markup for terminals that don't support ANSI codes
    console = Console(markup=False, highlight=False)
    parser = CommandParser()
    manager = SessionManager()

    # Configure prompt_toolkit session with completion
    history_file = Path.home() / ".deep_research_history"
    completer = build_completer(manager)

    prompt_session: PromptSession[str] = PromptSession(
        "research> ",
        history=FileHistory(str(history_file)),
        completer=completer,
        auto_suggest=AutoSuggestFromHistory(),
        enable_history_search=True,
    )

    # Welcome message
    console.print("Deep Research Agent - Interactive Mode")
    console.print("Type 'help' for commands or 'start <query>' to begin research.\n")

    # Restore last session if exists
    restored = await manager.restore_last_session()
    if restored:
        console.print(f"✓ Restored session: {restored.session_id} v{restored.version}")
        console.print("  Use 'status' to view details or 'reset' to start fresh\n")

    # Main REPL loop
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
                    console.print("Invalid command.")
                    # Helpful hint if it looks like a query without the start command
                    if len(user_input.split()) > 3 and not any(
                        user_input.startswith(cmd)
                        for cmd in [
                            "start",
                            "continue",
                            "status",
                            "list",
                            "switch",
                            "expand",
                            "export",
                            "reset",
                            "help",
                            "exit",
                        ]
                    ):
                        console.print("💡 Hint: Did you mean to use 'start' before your query?")
                        if len(user_input) > 50:
                            console.print(f"  Try: start {user_input[:50]}...")
                        else:
                            console.print(f"  Try: start {user_input}")
                    else:
                        console.print("  Type 'help' for available commands.")
                    continue

                command, args = parsed

                # Execute command
                if command == "exit":
                    console.print("Exiting...")
                    break

                elif command == "help":
                    show_help(console)

                elif command == "start":
                    query = " ".join(args["query"])
                    model = args.get("model")
                    await cmd_start(manager, query, model, console)

                elif command == "status":
                    await cmd_status(manager, console)

                elif command == "reset":
                    await cmd_reset(manager, console)

                elif command == "continue":
                    cont_query: str | None = " ".join(args["query"]) if args["query"] else None
                    await cmd_continue(manager, cont_query, console)

                elif command == "expand":
                    worker_id = args["worker"]
                    exp_query = " ".join(args["query"])
                    await cmd_expand(manager, worker_id, exp_query, console)

                elif command == "list":
                    list_type = args.get("type")
                    if list_type == "sessions":
                        await cmd_list_sessions(manager, console)
                    elif list_type == "workers":
                        session_id = args.get("session")
                        if session_id:
                            await cmd_list_workers(manager, session_id, console)
                        else:
                            console.print("Error: --session required for 'list workers'")
                    else:
                        console.print("Invalid list type. Use 'list sessions' or 'list workers'")

                elif command == "switch":
                    session_id = args["session_id"]
                    await cmd_switch(manager, session_id, console)

                elif command == "export":
                    export_format = args["format"]
                    output_path = args.get("output")
                    await cmd_export(manager, export_format, output_path, console)

                else:
                    console.print(f"Command '{command}' not yet implemented")

            except KeyboardInterrupt:
                console.print("\nUse 'exit' to quit")
                continue

            except EOFError:
                break

            except Exception as e:
                console.print(f"Error: {e}")
                if os.getenv("DEBUG"):
                    import traceback

                    traceback.print_exc()


def show_help(console: Console) -> None:
    """Display help message with examples."""
    help_text = """
Available Commands:

  start <query>                    Start new research session
    Aliases: new, begin
    Example: start What are the latest advances in quantum computing?

  continue [query]                 Continue active session with optional new query
    Aliases: resume
    Example: continue How does this relate to AI?

  status                           Show active session status

  list sessions                    List all research sessions
  list workers --session ID        List workers for specific session

  switch <session_id>              Switch to existing session
    Aliases: load
    Example: switch session_20251121_120000_abc123

  expand --worker ID <query>       Expand specific worker's research
    Example: expand --worker task_1 Research GPU costs in detail

  export --format <fmt> [--output PATH]
    Export active session to file
    Formats: markdown, json
    Example: export --format markdown --output report.md

  reset                            Clear active session
    Aliases: clear

  exit                             Exit interactive mode
    Aliases: quit, q

  help                             Show this help message

Features:
  - Tab completion for commands and session IDs
  - Auto-suggest from command history (Ctrl+R to search)
  - Cost estimation before expensive operations
  - Automatic session persistence and restoration
  - Export sessions to markdown or JSON

Keyboard Shortcuts:
  - Tab: Auto-complete commands and session IDs
  - Up/Down: Navigate command history
  - Ctrl+R: Search command history
  - Ctrl+C: Interrupt current input (doesn't exit)
  - Ctrl+D: Exit REPL
"""
    console.print(help_text)
