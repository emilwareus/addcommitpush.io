"""Session state manager for REPL."""

from pathlib import Path
from typing import Any

from deep_research.agent.state import ResearchSession
from deep_research.obsidian.loader import SessionLoader
from deep_research.obsidian.writer import ObsidianWriter

from .state_persistence import ReplState


class SessionManager:
    """Manage active research session state."""

    def __init__(self, vault_path: str = "outputs/obsidian") -> None:
        self.vault_path = vault_path
        self.active_session: ResearchSession | None = None
        self.loader = SessionLoader(vault_path)
        self.writer = ObsidianWriter(vault_path)
        self.state = ReplState()

    def has_active_session(self) -> bool:
        """Check if there's an active session."""
        return self.active_session is not None

    def get_active_session(self) -> ResearchSession | None:
        """Get current active session."""
        return self.active_session

    def set_active_session(self, session: ResearchSession) -> None:
        """Set the active session and persist to state file."""
        self.active_session = session
        self.state.save_active_session(session.session_id, session.version)

    def clear_active_session(self) -> None:
        """Clear active session and state file."""
        self.active_session = None
        self.state.clear()

    async def restore_last_session(self) -> ResearchSession | None:
        """Restore last active session from state file.

        Returns:
            Restored session or None if no previous session
        """
        last_session_info = self.state.load_last_session()
        if not last_session_info:
            return None

        session_id, version = last_session_info

        try:
            session = await self.load_session(session_id, version)
            self.active_session = session
            return session
        except FileNotFoundError:
            # Session file not found, clear stale state
            self.state.clear()
            return None

    async def load_session(self, session_id: str, version: int = 1) -> ResearchSession:
        """Load session from vault and optionally set as active.

        Args:
            session_id: Session ID to load
            version: Session version (default 1)

        Returns:
            Loaded session
        """
        session = self.loader.load_session(session_id, version)
        return session

    def list_sessions(self) -> list[dict[str, Any]]:
        """List all sessions in vault."""
        return self.loader.list_sessions()

    async def save_session(self, session: ResearchSession) -> Path:
        """Write session to vault.

        Args:
            session: Session to save

        Returns:
            Path to session file
        """
        return await self.writer.write_session(session)
