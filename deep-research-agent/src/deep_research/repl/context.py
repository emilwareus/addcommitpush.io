"""Context preparation for session continuation."""

from deep_research.agent.state import ResearchSession


def build_continuation_context(session: ResearchSession) -> str:
    """Build compressed context from previous session for continuation.

    Goal: Keep context under 50k tokens
    Strategy: Include insights + report summary, exclude full worker outputs

    Args:
        session: Previous session to build context from

    Returns:
        Compressed context string
    """
    context_parts = []

    # Original query
    context_parts.append(f"PREVIOUS RESEARCH QUERY: {session.query}")

    # Insights (already compressed)
    if session.insights:
        context_parts.append("\nKEY INSIGHTS FROM PREVIOUS RESEARCH:")
        for i, insight in enumerate(session.insights[:10], 1):  # Max 10 insights
            title = insight.get("title", f"Insight {i}")
            finding = insight.get("finding", "")
            context_parts.append(f"{i}. {title}: {finding}")

    # Report summary (first 2000 chars)
    context_parts.append("\nPREVIOUS REPORT SUMMARY:")
    context_parts.append(session.report[:2000])

    # Workers summary
    context_parts.append(f"\n\nRESOURCES: {len(session.workers)} workers executed")
    context_parts.append(f"SOURCES: {len(session.all_sources)} sources consulted")

    return "\n".join(context_parts)


def build_worker_expansion_context(session: ResearchSession, worker_id: str) -> str:
    """Build context for expanding specific worker's research.

    Includes full worker output for deep continuation.

    Args:
        session: Session containing the worker
        worker_id: Worker ID to expand

    Returns:
        Full worker context string

    Raises:
        ValueError: If worker not found
    """
    worker = next((w for w in session.workers if w.worker_id == worker_id), None)

    if not worker:
        raise ValueError(f"Worker {worker_id} not found in session")

    context = f"""PREVIOUS WORKER RESEARCH:

Objective: {worker.objective}
Status: {worker.status}

FULL OUTPUT:
{worker.final_output}

SOURCES:
{chr(10).join(f'- {src}' for src in worker.sources)}
"""

    return context
