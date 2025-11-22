"""Tab completion for REPL."""

from collections.abc import Callable

from prompt_toolkit.completion import Completer, Completion, NestedCompleter
from prompt_toolkit.document import Document

from .session_manager import SessionManager


def build_completer(manager: SessionManager) -> Completer:
    """Build dynamic completer with session IDs.

    Args:
        manager: Session manager for fetching session IDs

    Returns:
        Configured completer
    """

    def get_session_ids() -> list[str]:
        """Get list of session IDs for completion."""
        try:
            sessions = manager.list_sessions()
            return [s["session_id"] for s in sessions]
        except Exception:
            return []

    # Build nested completer structure
    completer_dict = {
        "start": None,
        "new": None,
        "begin": None,
        "continue": None,
        "resume": None,
        "status": None,
        "list": {
            "sessions": None,
            "workers": {
                "--session": _SessionIDCompleter(get_session_ids),
            },
        },
        "switch": _SessionIDCompleter(get_session_ids),
        "load": _SessionIDCompleter(get_session_ids),
        "expand": {
            "--worker": None,
        },
        "reset": None,
        "clear": None,
        "exit": None,
        "quit": None,
        "q": None,
        "help": None,
    }

    return NestedCompleter.from_nested_dict(completer_dict)


class _SessionIDCompleter(Completer):
    """Custom completer for session IDs."""

    def __init__(self, session_ids_func: Callable[[], list[str]]) -> None:
        self.session_ids_func = session_ids_func

    def get_completions(self, document: Document, complete_event):  # type: ignore[no-untyped-def]
        """Get session ID completions."""
        word = document.get_word_before_cursor()
        session_ids = self.session_ids_func()

        for session_id in session_ids:
            if session_id.startswith(word):
                yield Completion(
                    session_id,
                    start_position=-len(word),
                    display=session_id,
                    display_meta="session",
                )
