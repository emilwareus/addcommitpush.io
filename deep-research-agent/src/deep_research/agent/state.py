"""LangGraph state definitions."""

from operator import add
from typing import Annotated, Any, TypedDict


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
