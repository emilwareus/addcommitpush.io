"""LangGraph state definitions."""

from dataclasses import dataclass, field
from operator import add
from typing import Annotated, Any, TypedDict


@dataclass
class ToolCall:
    """Record of a single tool invocation."""
    tool_name: str              # "search" or "fetch"
    arguments: dict[str, Any]   # Tool input parameters
    result: str                 # Full tool output
    success: bool
    duration_seconds: float
    timestamp: str              # ISO format
    iteration: int              # Which ReAct iteration


@dataclass
class ReActIteration:
    """Single ReAct loop iteration with thought-action-observation."""
    iteration: int
    thought: str                # LLM reasoning before tool call
    actions: list[ToolCall]     # Tool calls in this iteration (can be multiple)
    observation: str            # Combined observations from all tool calls
    timestamp: str              # ISO format


@dataclass
class WorkerFullContext:
    """Complete worker execution context (NOTHING compressed)."""
    # Task metadata
    task_id: str
    worker_id: str
    objective: str
    tools_available: list[str]
    expected_output: str

    # Full execution trace
    react_iterations: list[ReActIteration] = field(default_factory=list)
    tool_calls: list[ToolCall] = field(default_factory=list)

    # Results
    final_output: str = ""              # Full uncompressed worker output
    compressed_summary: str = ""        # For backwards compatibility with synthesis
    sources: list[str] = field(default_factory=list)

    # Metadata
    status: str = "pending"             # pending, running, completed, failed
    error: str | None = None
    started_at: str | None = None       # ISO format
    completed_at: str | None = None
    duration_seconds: float = 0.0
    cost: float = 0.0
    tokens: dict[str, int] = field(default_factory=dict)
    model: str = ""


@dataclass
class ResearchSession:
    """Full research session with versioning and full worker contexts."""
    # Session identification
    session_id: str                     # e.g., "session_20250120_142530_abc123"
    version: int                        # 1, 2, 3...
    parent_session_id: str | None       # For expansions

    # Query metadata
    query: str
    complexity_score: float
    sub_tasks: list[dict[str, Any]] = field(default_factory=list)

    # Workers (FULL CONTEXT)
    workers: list[WorkerFullContext] = field(default_factory=list)

    # Results
    report: str = ""
    all_sources: list[str] = field(default_factory=list)

    # Insights (auto-extracted)
    insights: list[dict[str, Any]] = field(default_factory=list)

    # Metadata
    status: str = "pending"             # pending, running, completed, failed
    created_at: str = ""                # ISO format
    updated_at: str = ""
    model: str = ""
    cost: float = 0.0
    tokens: dict[str, int] = field(default_factory=dict)

    # Obsidian paths
    obsidian_vault_path: str = "outputs/obsidian"
    session_file_path: str = ""         # Path to session MOC markdown file


class ResearchState(TypedDict):
    """State for research graph."""

    # User input
    query: str

    # Orchestrator state
    complexity_score: float
    sub_tasks: list[dict[str, Any]]

    # Worker results (reducer appends)
    worker_results: Annotated[list[dict[str, Any]], add]

    # Final output
    report: str
    sources: list[str]
    metadata: dict[str, Any]
