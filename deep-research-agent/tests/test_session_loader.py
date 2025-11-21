"""Unit tests for SessionLoader."""

import asyncio
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from deep_research.agent.state import (
    ReActIteration,
    ResearchSession,
    ToolCall,
    WorkerFullContext,
)
from deep_research.obsidian.loader import SessionLoader
from deep_research.obsidian.writer import ObsidianWriter


@pytest.fixture
def sample_session() -> ResearchSession:
    """Create sample session for testing."""
    session = ResearchSession(
        session_id="session_test_123",
        version=1,
        parent_session_id=None,
        query="Test query",
        complexity_score=0.5,
        status="completed",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        model="test-model",
        cost=0.1,
    )

    # Add worker
    worker = WorkerFullContext(
        task_id="task_1",
        worker_id="worker_1",
        objective="Test objective",
        tools_available=["search", "fetch"],
        expected_output="Test output",
        final_output="Full worker output content",
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


@pytest.mark.asyncio
async def test_load_session_roundtrip(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test that session can be written and loaded back."""
    # Write session (mock insight extraction to avoid API calls)
    writer = ObsidianWriter(vault_path=str(tmp_path))
    with patch("deep_research.obsidian.writer.extract_insights", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = []
        await writer.write_session(sample_session)

    # Load session
    loader = SessionLoader(vault_path=str(tmp_path))
    loaded = loader.load_session("session_test_123", version=1)

    # Verify
    assert loaded.session_id == sample_session.session_id
    assert loaded.query == sample_session.query
    assert loaded.version == sample_session.version
    assert loaded.status == sample_session.status
    assert loaded.complexity_score == sample_session.complexity_score
    assert len(loaded.workers) == len(sample_session.workers)
    assert loaded.workers[0].objective == sample_session.workers[0].objective
    assert loaded.workers[0].task_id == sample_session.workers[0].task_id
    assert loaded.workers[0].worker_id == sample_session.workers[0].worker_id


def test_list_sessions(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test listing all sessions."""
    # Create session (mock insight extraction)
    writer = ObsidianWriter(vault_path=str(tmp_path))
    with patch("deep_research.obsidian.writer.extract_insights", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = []
        asyncio.run(writer.write_session(sample_session))

    # List
    loader = SessionLoader(vault_path=str(tmp_path))
    sessions = loader.list_sessions()

    assert len(sessions) >= 1
    assert sessions[0]["session_id"] == "session_test_123"
    assert sessions[0]["version"] == 1
    assert sessions[0]["query"] == "Test query"
    assert sessions[0]["status"] == "completed"


def test_load_session_file_not_found(tmp_path: Path) -> None:
    """Test that loading nonexistent session raises FileNotFoundError."""
    loader = SessionLoader(vault_path=str(tmp_path))

    with pytest.raises(FileNotFoundError) as exc_info:
        loader.load_session("nonexistent_session", version=1)

    assert "Session not found" in str(exc_info.value)


def test_parse_frontmatter() -> None:
    """Test YAML frontmatter parsing."""
    loader = SessionLoader()

    content = """---
type: research_session
session_id: test_123
version: 1
query: Test query
---

# Body content
"""

    frontmatter, body = loader._parse_frontmatter(content)

    assert frontmatter["type"] == "research_session"
    assert frontmatter["session_id"] == "test_123"
    assert frontmatter["version"] == 1
    assert frontmatter["query"] == "Test query"
    assert "Body content" in body


def test_parse_frontmatter_no_frontmatter() -> None:
    """Test parsing content without frontmatter."""
    loader = SessionLoader()

    content = "# Just body content"
    frontmatter, body = loader._parse_frontmatter(content)

    assert frontmatter == {}
    assert body == content


def test_split_sections() -> None:
    """Test splitting markdown body into sections."""
    loader = SessionLoader()

    body = """# Main Title

## Section 1
Content for section 1

## Section 2
Content for section 2
More content

## Section 3
Content for section 3
"""

    sections = loader._split_sections(body)

    assert "Section 1" in sections
    assert "Content for section 1" in sections["Section 1"]
    assert "Section 2" in sections
    assert "Content for section 2" in sections["Section 2"]
    assert "Section 3" in sections
    assert "Content for section 3" in sections["Section 3"]


@pytest.mark.asyncio
async def test_load_workers(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test loading workers from markdown files."""
    # Write session (mock insight extraction)
    writer = ObsidianWriter(vault_path=str(tmp_path))
    with patch("deep_research.obsidian.writer.extract_insights", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = []
        await writer.write_session(sample_session)

    # Load workers
    loader = SessionLoader(vault_path=str(tmp_path))
    workers = loader._load_workers("session_test_123")

    assert len(workers) == 1
    assert workers[0].task_id == "task_1"
    assert workers[0].worker_id == "worker_1"
    assert workers[0].objective == "Test objective"
    assert workers[0].status == "completed"


@pytest.mark.asyncio
async def test_load_report(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test loading report content."""
    # Write session (mock insight extraction)
    writer = ObsidianWriter(vault_path=str(tmp_path))
    with patch("deep_research.obsidian.writer.extract_insights", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = []
        await writer.write_session(sample_session)

    # Load report
    loader = SessionLoader(vault_path=str(tmp_path))
    report = loader._load_report("session_test_123", version=1)

    assert report != ""
    assert "Test report content" in report


def test_aggregate_sources() -> None:
    """Test aggregating unique sources from workers."""
    loader = SessionLoader()

    worker1 = WorkerFullContext(
        task_id="task_1",
        worker_id="worker_1",
        objective="Test",
        tools_available=[],
        expected_output="",
        sources=["https://example.com", "https://test.com"],
    )

    worker2 = WorkerFullContext(
        task_id="task_2",
        worker_id="worker_2",
        objective="Test",
        tools_available=[],
        expected_output="",
        sources=["https://test.com", "https://another.com"],
    )

    sources = loader._aggregate_sources([worker1, worker2])

    assert len(sources) == 3
    assert "https://example.com" in sources
    assert "https://test.com" in sources
    assert "https://another.com" in sources
    # Should be sorted
    assert sources == sorted(sources)


@pytest.mark.asyncio
async def test_load_session_with_parent(tmp_path: Path) -> None:
    """Test loading session with parent reference."""
    # Create parent session
    parent = ResearchSession(
        session_id="session_parent_123",
        version=1,
        parent_session_id=None,
        query="Parent query",
        complexity_score=0.5,
        status="completed",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        model="test-model",
        cost=0.1,
    )

    # Create child session (v2)
    child = ResearchSession(
        session_id="session_parent_123",
        version=2,
        parent_session_id="session_parent_123_v1",
        query="Parent query",
        complexity_score=0.5,
        status="completed",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        model="test-model",
        cost=0.15,
    )

    # Write sessions (mock insight extraction)
    writer = ObsidianWriter(vault_path=str(tmp_path))
    with patch("deep_research.obsidian.writer.extract_insights", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = []
        await writer.write_session(parent)
        await writer.write_session(child)

    # Load child
    loader = SessionLoader(vault_path=str(tmp_path))
    loaded = loader.load_session("session_parent_123", version=2)

    assert loaded.version == 2
    assert loaded.parent_session_id == "session_parent_123_v1"
    assert loaded.cost == 0.15


@pytest.mark.asyncio
async def test_parse_react_trace(tmp_path: Path, sample_session: ResearchSession) -> None:
    """Test parsing ReAct iterations from markdown."""
    # Write session (mock insight extraction)
    writer = ObsidianWriter(vault_path=str(tmp_path))
    with patch("deep_research.obsidian.writer.extract_insights", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = []
        await writer.write_session(sample_session)

    # Load worker file
    loader = SessionLoader(vault_path=str(tmp_path))
    worker_file = tmp_path / "workers" / "session_test_123" / "task_1_worker.md"
    content = worker_file.read_text()

    _, body = loader._parse_frontmatter(content)
    iterations = loader._parse_react_trace(body)

    assert len(iterations) == 1
    assert iterations[0].iteration == 1
    assert iterations[0].thought == "Test thought"
    assert len(iterations[0].actions) > 0
