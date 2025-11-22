"""Tests for context compression."""

import pytest

from deep_research.agent.state import ResearchSession, WorkerFullContext
from deep_research.repl.context import build_continuation_context, build_worker_expansion_context


def test_build_continuation_context() -> None:
    """Test building continuation context from session."""
    session = ResearchSession(
        session_id="test_session",
        version=1,
        parent_session_id=None,
        query="What is quantum computing?",
        complexity_score=0.7,
        report="This is a comprehensive report about quantum computing." * 100,  # Long report
        insights=[
            {"title": "Insight 1", "finding": "Key finding about qubits"},
            {"title": "Insight 2", "finding": "Important discovery"},
        ],
        all_sources=["http://example.com/1", "http://example.com/2"],
    )

    session.workers = [
        WorkerFullContext(
            task_id="task_1",
            worker_id="worker_1",
            objective="Research quantum algorithms",
            tools_available=[],
            expected_output="",
        )
    ]

    context = build_continuation_context(session)

    # Verify structure
    assert "PREVIOUS RESEARCH QUERY: What is quantum computing?" in context
    assert "KEY INSIGHTS FROM PREVIOUS RESEARCH:" in context
    assert "Insight 1" in context
    assert "PREVIOUS REPORT SUMMARY:" in context
    assert "RESOURCES: 1 workers executed" in context
    assert "SOURCES: 2 sources consulted" in context

    # Verify compression (report should be truncated to 2000 chars)
    assert len(context) < 10000  # Much less than full report


def test_build_worker_expansion_context() -> None:
    """Test building worker expansion context."""
    worker = WorkerFullContext(
        task_id="task_1",
        worker_id="worker_1",
        objective="Research GPU costs",
        tools_available=[],
        expected_output="",
        final_output="GPU costs analysis: detailed findings...",
        sources=["http://example.com/gpu"],
        status="completed",
    )

    session = ResearchSession(
        session_id="test_session",
        version=1,
        parent_session_id=None,
        query="What are AI hardware costs?",
        complexity_score=0.5,
    )
    session.workers = [worker]

    context = build_worker_expansion_context(session, "worker_1")

    assert "PREVIOUS WORKER RESEARCH:" in context
    assert "Objective: Research GPU costs" in context
    assert "FULL OUTPUT:" in context
    assert "GPU costs analysis" in context
    assert "SOURCES:" in context
    assert "http://example.com/gpu" in context


def test_build_worker_expansion_context_not_found() -> None:
    """Test error when worker not found."""
    session = ResearchSession(
        session_id="test_session",
        version=1,
        parent_session_id=None,
        query="Test query",
        complexity_score=0.5,
    )

    with pytest.raises(ValueError, match="Worker nonexistent not found"):
        build_worker_expansion_context(session, "nonexistent")
