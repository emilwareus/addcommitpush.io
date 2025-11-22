"""Tests for REPL session manager."""

from pathlib import Path

import pytest

from deep_research.agent.state import ResearchSession
from deep_research.repl.session_manager import SessionManager


@pytest.fixture
def manager(tmp_path: Path) -> SessionManager:
    """Create session manager with temp vault."""
    vault_path = tmp_path / "obsidian"
    return SessionManager(vault_path=str(vault_path))


def test_no_active_session_initially(manager: SessionManager) -> None:
    """Test manager starts with no active session."""
    assert not manager.has_active_session()
    assert manager.get_active_session() is None


def test_set_and_clear_active_session(manager: SessionManager) -> None:
    """Test setting and clearing active session."""
    session = ResearchSession(
        session_id="test_session",
        version=1,
        parent_session_id=None,
        query="Test query",
        complexity_score=0.5,
    )

    manager.set_active_session(session)
    assert manager.has_active_session()
    assert manager.get_active_session() == session

    manager.clear_active_session()
    assert not manager.has_active_session()


def test_get_active_session_returns_same_object(manager: SessionManager) -> None:
    """Test that get_active_session returns the same object that was set."""
    session = ResearchSession(
        session_id="test_session",
        version=1,
        parent_session_id=None,
        query="Test query",
        complexity_score=0.5,
    )

    manager.set_active_session(session)
    retrieved = manager.get_active_session()

    assert retrieved is session
    assert retrieved.session_id == "test_session"
    assert retrieved.version == 1
