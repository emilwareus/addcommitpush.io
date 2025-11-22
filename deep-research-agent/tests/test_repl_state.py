"""Tests for REPL state persistence."""

import json
from pathlib import Path

import pytest

from deep_research.repl.state_persistence import ReplState


@pytest.fixture
def temp_state_file(tmp_path: Path) -> Path:
    """Create temporary state file."""
    return tmp_path / ".test_deep_research_state"


def test_save_and_load_active_session(temp_state_file: Path) -> None:
    """Test saving and loading active session."""
    state = ReplState(state_file=temp_state_file)

    # Save session
    state.save_active_session("session_123", 1)

    # Verify file exists
    assert temp_state_file.exists()

    # Load session
    loaded = state.load_last_session()
    assert loaded is not None
    assert loaded == ("session_123", 1)


def test_save_versioned_session(temp_state_file: Path) -> None:
    """Test saving session with version."""
    state = ReplState(state_file=temp_state_file)

    # Save v2 session
    state.save_active_session("session_abc", 2)

    # Load session
    loaded = state.load_last_session()
    assert loaded is not None
    assert loaded == ("session_abc", 2)


def test_load_no_state_file() -> None:
    """Test loading when no state file exists."""
    state = ReplState(state_file=Path("/tmp/nonexistent_state_file_xyz"))

    loaded = state.load_last_session()
    assert loaded is None


def test_load_corrupted_state_file(temp_state_file: Path) -> None:
    """Test loading corrupted state file."""
    state = ReplState(state_file=temp_state_file)

    # Write corrupted JSON
    temp_state_file.write_text("not valid json")

    # Should return None for corrupted file
    loaded = state.load_last_session()
    assert loaded is None


def test_load_incomplete_state_file(temp_state_file: Path) -> None:
    """Test loading state file with missing fields."""
    state = ReplState(state_file=temp_state_file)

    # Write state with missing session_id
    temp_state_file.write_text(json.dumps({"last_session_version": 1}))

    # Should return None for incomplete state
    loaded = state.load_last_session()
    assert loaded is None


def test_clear_state_file(temp_state_file: Path) -> None:
    """Test clearing state file."""
    state = ReplState(state_file=temp_state_file)

    # Save session
    state.save_active_session("session_123", 1)
    assert temp_state_file.exists()

    # Clear state
    state.clear()
    assert not temp_state_file.exists()


def test_clear_nonexistent_state_file() -> None:
    """Test clearing when state file doesn't exist."""
    state = ReplState(state_file=Path("/tmp/nonexistent_state_file_xyz"))

    # Should not raise error
    state.clear()


def test_state_file_format(temp_state_file: Path) -> None:
    """Test state file format includes all expected fields."""
    state = ReplState(state_file=temp_state_file)

    # Save session
    state.save_active_session("session_123", 1)

    # Read and verify JSON structure
    saved_data = json.loads(temp_state_file.read_text())

    assert "last_session_id" in saved_data
    assert "last_session_version" in saved_data
    assert "last_updated" in saved_data

    assert saved_data["last_session_id"] == "session_123"
    assert saved_data["last_session_version"] == 1


def test_default_version_when_missing(temp_state_file: Path) -> None:
    """Test default version is 1 when not specified in state file."""
    state = ReplState(state_file=temp_state_file)

    # Write state without version field
    temp_state_file.write_text(json.dumps({"last_session_id": "session_123"}))

    # Should default to version 1
    loaded = state.load_last_session()
    assert loaded is not None
    assert loaded == ("session_123", 1)
