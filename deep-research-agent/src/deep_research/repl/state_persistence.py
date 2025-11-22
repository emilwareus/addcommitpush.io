"""Persist REPL state across sessions."""

import json
from datetime import datetime
from pathlib import Path


class ReplState:
    """Manage REPL state persistence."""

    def __init__(self, state_file: Path | None = None) -> None:
        if state_file is None:
            state_file = Path.home() / ".deep_research_state"
        self.state_file = state_file

    def save_active_session(self, session_id: str, version: int) -> None:
        """Save active session ID to state file.

        Args:
            session_id: Session ID
            version: Session version
        """
        state = {
            "last_session_id": session_id,
            "last_session_version": version,
            "last_updated": datetime.now().isoformat(),
        }

        self.state_file.write_text(json.dumps(state, indent=2))

    def load_last_session(self) -> tuple[str, int] | None:
        """Load last active session from state file.

        Returns:
            Tuple of (session_id, version) or None if no state
        """
        if not self.state_file.exists():
            return None

        try:
            state = json.loads(self.state_file.read_text())
            session_id = state.get("last_session_id")
            version = state.get("last_session_version", 1)

            if session_id:
                return (session_id, version)
        except (json.JSONDecodeError, KeyError):
            pass

        return None

    def clear(self) -> None:
        """Clear state file."""
        if self.state_file.exists():
            self.state_file.unlink()
