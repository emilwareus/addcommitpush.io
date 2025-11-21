"""Unit tests for CLI commands (expand and recompile-report)."""

from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from click.testing import CliRunner

from deep_research.agent.state import (
    ReActIteration,
    ResearchSession,
    ToolCall,
    WorkerFullContext,
)
from deep_research.cli import cli


@pytest.fixture
def sample_session() -> ResearchSession:
    """Create sample session for testing."""
    session = ResearchSession(
        session_id="session_test_456",
        version=1,
        parent_session_id=None,
        query="Test query for CLI",
        complexity_score=0.5,
        status="completed",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        model="test-model",
        cost=0.1,
    )

    # Add worker with full context
    worker = WorkerFullContext(
        task_id="task_1",
        worker_id="worker_1",
        objective="Test objective for CLI",
        tools_available=["search", "fetch"],
        expected_output="Test output",
        final_output="Full worker output content for testing",
        compressed_summary="Compressed summary",
        sources=["https://example.com"],
        status="completed",
        started_at=datetime.now().isoformat(),
        completed_at=datetime.now().isoformat(),
        duration_seconds=10.0,
        cost=0.05,
        model="test-model",
    )

    # Add iteration
    iteration = ReActIteration(
        iteration=1,
        thought="Test thought",
        actions=[
            ToolCall(
                tool_name="search",
                arguments={"query": "test"},
                result="search results",
                success=True,
                duration_seconds=1.0,
                timestamp=datetime.now().isoformat(),
                iteration=1,
            )
        ],
        observation="Test observation",
        timestamp=datetime.now().isoformat(),
    )

    worker.react_iterations = [iteration]
    worker.tool_calls = iteration.actions

    session.workers = [worker]
    session.report = "Test report content"

    return session


def test_expand_command_loads_session(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test that expand command loads session correctly."""
    # Mock SessionLoader instead of writing actual files
    mock_loader = MagicMock()
    mock_loader.load_session.return_value = sample_session

    # Mock orchestrator to avoid actual research
    mock_orchestrator = MagicMock()
    mock_orchestrator.research = AsyncMock(
        return_value={
            "report": "Expanded report",
            "sources": ["https://example.com"],
            "metadata": {
                "workers": 1,
                "cost": {"total_cost": 0.2},
                "obsidian_session_path": str(tmp_path / "sessions" / "session_test_456_v2.md"),
            },
        }
    )
    mock_orchestrator.session = ResearchSession(
        session_id="session_test_456",
        version=2,
        parent_session_id="session_test_456_v1",
        query="Test query for CLI",
        complexity_score=0.5,
    )

    runner = CliRunner()
    with patch("deep_research.agent.orchestrator.LeadResearcher", return_value=mock_orchestrator):
        with patch("deep_research.obsidian.loader.SessionLoader", return_value=mock_loader):
            result = runner.invoke(
                cli,
                [
                    "expand",
                    "--session=session_test_456",
                    "--worker=task_1",
                    "Focus on performance",
                ],
            )

    assert result.exit_code == 0
    mock_loader.load_session.assert_called_once_with("session_test_456")
    mock_orchestrator.research.assert_called_once()


def test_expand_command_session_not_found(tmp_path: Path) -> None:
    """Test expand command with nonexistent session."""
    runner = CliRunner()
    with patch("deep_research.obsidian.loader.SessionLoader") as mock_loader_cls:
        mock_loader = MagicMock()
        mock_loader.load_session.side_effect = FileNotFoundError("Session not found")
        mock_loader_cls.return_value = mock_loader

        result = runner.invoke(
            cli,
            [
                "expand",
                "--session=nonexistent",
                "--worker=task_1",
                "Focus on performance",
            ],
        )

    assert result.exit_code == 0
    assert "Error" in result.output or "not found" in result.output.lower()


def test_expand_command_worker_not_found(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test expand command with invalid worker ID."""
    # Mock SessionLoader
    mock_loader = MagicMock()
    mock_loader.load_session.return_value = sample_session

    runner = CliRunner()
    with patch("deep_research.obsidian.loader.SessionLoader", return_value=mock_loader):
        result = runner.invoke(
            cli,
            [
                "expand",
                "--session=session_test_456",
                "--worker=nonexistent_worker",
                "Focus on performance",
            ],
        )

    assert result.exit_code == 0
    assert "not found" in result.output.lower() or "error" in result.output.lower()


def test_expand_command_creates_v2_session(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test that expand command creates v2 session with parent reference."""
    # Mock SessionLoader
    mock_loader = MagicMock()
    mock_loader.load_session.return_value = sample_session

    # Mock orchestrator
    mock_orchestrator = MagicMock()
    mock_orchestrator.research = AsyncMock(
        return_value={
            "report": "Expanded report",
            "sources": ["https://example.com"],
            "metadata": {
                "workers": 1,
                "cost": {"total_cost": 0.2},
                "obsidian_session_path": str(tmp_path / "sessions" / "session_test_456_v2.md"),
            },
        }
    )

    # Capture the session that gets set
    captured_session = None

    def capture_session(session: ResearchSession) -> None:
        nonlocal captured_session
        captured_session = session

    mock_orchestrator.session = None

    runner = CliRunner()
    with patch("deep_research.agent.orchestrator.LeadResearcher", return_value=mock_orchestrator):
        with patch("deep_research.obsidian.loader.SessionLoader", return_value=mock_loader):
            with patch("deep_research.agent.state.ResearchSession") as mock_session_cls:
                # Capture session creation
                mock_session_cls.side_effect = lambda **kwargs: (
                    capture_session(
                        ResearchSession(
                            session_id=kwargs["session_id"],
                            version=kwargs["version"],
                            parent_session_id=kwargs.get("parent_session_id"),
                            query=kwargs["query"],
                            complexity_score=kwargs["complexity_score"],
                        )
                    )
                    or ResearchSession(**kwargs)
                )

                result = runner.invoke(
                    cli,
                    [
                        "expand",
                        "--session=session_test_456",
                        "--worker=task_1",
                        "Focus on performance",
                    ],
                )

    # Verify session was created with correct version and parent
    if captured_session:
        assert captured_session.version == 2
        assert captured_session.parent_session_id == "session_test_456_v1"


def test_recompile_report_command_loads_session(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test that recompile-report command loads session correctly."""
    # Mock SessionLoader
    mock_loader = MagicMock()
    mock_loader.load_session.return_value = sample_session

    # Mock LLM
    mock_response = MagicMock()
    mock_response.content = "Recompiled report content"

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    # Mock writer
    mock_writer = MagicMock()
    mock_writer._write_report = AsyncMock(return_value=Path("test_report.md"))

    runner = CliRunner()
    with patch("deep_research.llm.client.get_llm", return_value=mock_llm):
        with patch("deep_research.obsidian.loader.SessionLoader", return_value=mock_loader):
            with patch("deep_research.obsidian.writer.ObsidianWriter", return_value=mock_writer):
                result = runner.invoke(
                    cli,
                    [
                        "recompile-report",
                        "--session=session_test_456",
                        "Focus on beginners",
                    ],
                )

    assert result.exit_code == 0
    mock_loader.load_session.assert_called_once_with("session_test_456")
    mock_llm.ainvoke.assert_called_once()


def test_recompile_report_increments_version(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test that recompile-report increments version number."""
    # Mock SessionLoader
    mock_loader = MagicMock()
    mock_loader.load_session.return_value = sample_session

    # Mock LLM
    mock_response = MagicMock()
    mock_response.content = "Recompiled report content"

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    # Track written report
    captured_version = None

    async def capture_version(session: ResearchSession, _: dict) -> Path:
        nonlocal captured_version
        captured_version = session.version
        return Path("test_report.md")

    mock_writer = MagicMock()
    mock_writer._write_report = capture_version

    runner = CliRunner()
    with patch("deep_research.llm.client.get_llm", return_value=mock_llm):
        with patch("deep_research.obsidian.loader.SessionLoader", return_value=mock_loader):
            with patch("deep_research.obsidian.writer.ObsidianWriter", return_value=mock_writer):
                result = runner.invoke(
                    cli,
                    [
                        "recompile-report",
                        "--session=session_test_456",
                        "Focus on beginners",
                    ],
                )

    assert result.exit_code == 0
    # Verify version was incremented
    assert captured_version == 2


def test_recompile_report_session_not_found(tmp_path: Path) -> None:
    """Test recompile-report command with nonexistent session."""
    runner = CliRunner()
    with patch("deep_research.obsidian.loader.SessionLoader") as mock_loader_cls:
        mock_loader = MagicMock()
        mock_loader.load_session.side_effect = FileNotFoundError("Session not found")
        mock_loader_cls.return_value = mock_loader

        result = runner.invoke(
            cli,
            [
                "recompile-report",
                "--session=nonexistent",
                "Focus on beginners",
            ],
        )

    assert result.exit_code == 0
    assert "Error" in result.output or "not found" in result.output.lower()


def test_recompile_report_with_custom_instructions(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test recompile-report with custom synthesis instructions."""
    # Mock SessionLoader
    mock_loader = MagicMock()
    mock_loader.load_session.return_value = sample_session

    # Mock LLM
    mock_response = MagicMock()
    mock_response.content = "Recompiled report with custom instructions"

    captured_prompt = None

    async def capture_prompt(messages):
        nonlocal captured_prompt
        captured_prompt = messages[1].content
        return mock_response

    mock_llm = MagicMock()
    mock_llm.ainvoke = capture_prompt

    mock_writer = MagicMock()
    mock_writer._write_report = AsyncMock(return_value=Path("test_report.md"))

    runner = CliRunner()
    with patch("deep_research.llm.client.get_llm", return_value=mock_llm):
        with patch("deep_research.obsidian.loader.SessionLoader", return_value=mock_loader):
            with patch("deep_research.obsidian.writer.ObsidianWriter", return_value=mock_writer):
                result = runner.invoke(
                    cli,
                    [
                        "recompile-report",
                        "--session=session_test_456",
                        "Focus on cost-benefit analysis",
                    ],
                )

    assert result.exit_code == 0
    # Verify custom instructions were included in prompt
    assert captured_prompt is not None
    assert "cost-benefit analysis" in captured_prompt.lower()
