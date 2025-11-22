"""Tests for REPL command parser."""

from deep_research.repl.parser import CommandParser


def test_parse_start_command() -> None:
    """Test parsing start command."""
    parser = CommandParser()

    result = parser.parse("start What is quantum computing?")

    assert result is not None
    command, args = result
    assert command == "start"
    assert args["query"] == ["What", "is", "quantum", "computing?"]


def test_parse_with_alias() -> None:
    """Test command aliases work."""
    parser = CommandParser()

    result = parser.parse("new Test query")

    assert result is not None
    command, args = result
    assert command == "start"  # Alias normalized to 'start'


def test_parse_invalid_command() -> None:
    """Test invalid command returns None."""
    parser = CommandParser()

    result = parser.parse("invalid command")

    assert result is None


def test_parse_empty_input() -> None:
    """Test empty input returns None."""
    parser = CommandParser()

    result = parser.parse("")

    assert result is None


def test_parse_continue_command() -> None:
    """Test parsing continue command with query."""
    parser = CommandParser()

    result = parser.parse("continue How does this relate to AI?")

    assert result is not None
    command, args = result
    assert command == "continue"
    assert args["query"] == ["How", "does", "this", "relate", "to", "AI?"]


def test_parse_continue_without_query() -> None:
    """Test parsing continue command without query."""
    parser = CommandParser()

    result = parser.parse("continue")

    assert result is not None
    command, args = result
    assert command == "continue"
    assert args["query"] == []


def test_parse_status_command() -> None:
    """Test parsing status command."""
    parser = CommandParser()

    result = parser.parse("status")

    assert result is not None
    command, args = result
    assert command == "status"


def test_parse_list_sessions() -> None:
    """Test parsing list sessions command."""
    parser = CommandParser()

    result = parser.parse("list sessions")

    assert result is not None
    command, args = result
    assert command == "list"
    assert args["target"] == "sessions"


def test_parse_list_workers() -> None:
    """Test parsing list workers command."""
    parser = CommandParser()

    result = parser.parse("list workers --session session_123")

    assert result is not None
    command, args = result
    assert command == "list"
    assert args["target"] == "workers"
    assert args["session"] == "session_123"


def test_parse_switch_command() -> None:
    """Test parsing switch command."""
    parser = CommandParser()

    result = parser.parse("switch session_20251121_120000_abc123")

    assert result is not None
    command, args = result
    assert command == "switch"
    assert args["session_id"] == "session_20251121_120000_abc123"
    assert args["version"] == 1  # Default


def test_parse_switch_with_version() -> None:
    """Test parsing switch command with version."""
    parser = CommandParser()

    result = parser.parse("switch session_123 --version 2")

    assert result is not None
    command, args = result
    assert command == "switch"
    assert args["session_id"] == "session_123"
    assert args["version"] == 2


def test_parse_expand_command() -> None:
    """Test parsing expand command."""
    parser = CommandParser()

    result = parser.parse("expand --worker task_1 Research GPU costs")

    assert result is not None
    command, args = result
    assert command == "expand"
    assert args["worker"] == "task_1"
    assert args["query"] == ["Research", "GPU", "costs"]


def test_parse_reset_command() -> None:
    """Test parsing reset command."""
    parser = CommandParser()

    result = parser.parse("reset")

    assert result is not None
    command, args = result
    assert command == "reset"


def test_parse_exit_command() -> None:
    """Test parsing exit command."""
    parser = CommandParser()

    result = parser.parse("exit")

    assert result is not None
    command, args = result
    assert command == "exit"


def test_parse_quit_alias() -> None:
    """Test quit alias works."""
    parser = CommandParser()

    result = parser.parse("quit")

    assert result is not None
    command, args = result
    assert command == "exit"


def test_parse_help_command() -> None:
    """Test parsing help command."""
    parser = CommandParser()

    result = parser.parse("help")

    assert result is not None
    command, args = result
    assert command == "help"
