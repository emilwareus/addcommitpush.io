"""REPL command implementations."""

from rich.console import Console

from deep_research.agent.orchestrator import LeadResearcher
from deep_research.agent.state import ResearchSession
from deep_research.models import SupportedModel

from .context import build_continuation_context, build_worker_expansion_context
from .cost_estimation import confirm_expensive_operation, estimate_research_cost
from .session_manager import SessionManager


async def cmd_start(
    manager: SessionManager,
    query: str,
    model: str | None,
    console: Console,
) -> None:
    """Start new research session.

    Args:
        manager: Session manager
        query: Research query
        model: Optional model name
        console: Rich console for output
    """
    if manager.has_active_session():
        console.print("Active session exists. Use 'reset' first or 'continue'.")
        active = manager.get_active_session()
        if active:
            console.print(f"Current session: {active.session_id} v{active.version}")
        return

    console.print(f"Starting research: {query}")

    # Cost estimation
    estimated_cost = estimate_research_cost(query)
    if not confirm_expensive_operation("Start research", estimated_cost, console):
        console.print("Cancelled")
        return

    # Convert model string to SupportedModel
    selected_model = SupportedModel.from_string(model) if model else SupportedModel.default()
    if not selected_model:
        console.print(f"Invalid model: {model}")
        return

    # Create orchestrator without live progress (to avoid ANSI codes in REPL)
    console.print("Starting research (this may take a few minutes)...")
    orchestrator = LeadResearcher(model=selected_model.model_name)

    # Execute research
    result = await orchestrator.research(query)

    # Save session to vault
    if orchestrator.session:
        await manager.save_session(orchestrator.session)

        # Set as active session
        manager.set_active_session(orchestrator.session)

        # Display results
        console.print("\n✓ Research complete")
        console.print(
            f"Session: {orchestrator.session.session_id} "
            f"v{orchestrator.session.version}"
        )
        console.print(f"Workers: {len(orchestrator.session.workers)}")
        console.print(f"Cost: ${orchestrator.session.cost:.4f}")

        if orchestrator.session.session_file_path:
            console.print(
                f"\nSession saved to: {orchestrator.session.session_file_path}"
            )

        # Show report summary
        console.print("\nReport Summary:")
        report_preview = (
            result["report"][:500] + "..." if len(result["report"]) > 500 else result["report"]
        )
        console.print(report_preview)


async def cmd_status(manager: SessionManager, console: Console) -> None:
    """Show active session status.

    Args:
        manager: Session manager
        console: Rich console for output
    """
    session = manager.get_active_session()

    if not session:
        console.print("No active session")
        console.print(
            "Use 'start <query>' to begin research or 'switch <id>' "
            "to load existing session"
        )
        return

    # Display session status
    console.print(f"\nActive Session: {session.session_id}")
    console.print("=" * 60)
    console.print(f"  Session ID: {session.session_id}")
    console.print(f"  Version:    {session.version}")
    console.print(f"  Query:      {session.query}")
    console.print(f"  Status:     {session.status}")
    console.print(f"  Workers:    {len(session.workers)}")
    console.print(f"  Cost:       ${session.cost:.4f}")
    console.print(f"  Created:    {session.created_at}")

    if session.parent_session_id:
        console.print(f"  Parent:     {session.parent_session_id}")

    console.print("=" * 60)

    # Show worker summary
    if session.workers:
        console.print("\nWorkers:")
        for i, worker in enumerate(session.workers, 1):
            status_icon = "✓" if worker.status == "completed" else "✗"
            console.print(f"  {status_icon} Worker {i}: {worker.objective}")


async def cmd_reset(manager: SessionManager, console: Console) -> None:
    """Clear active session.

    Args:
        manager: Session manager
        console: Rich console for output
    """
    if not manager.has_active_session():
        console.print("No active session to reset")
        return

    session = manager.get_active_session()
    if session:
        console.print(
            f"Clearing active session: "
            f"{session.session_id} v{session.version}"
        )

    manager.clear_active_session()
    console.print("✓ Session cleared")


async def cmd_continue(
    manager: SessionManager,
    continuation_query: str | None,
    console: Console,
) -> None:
    """Continue active session with new query.

    Args:
        manager: Session manager
        continuation_query: Optional new query (if None, prompt user)
        console: Rich console for output
    """
    session = manager.get_active_session()

    if not session:
        console.print("No active session. Use 'start' or 'switch' first.")
        return

    if not continuation_query:
        continuation_query = input("Enter continuation query: ").strip()
        if not continuation_query:
            console.print("Cancelled")
            return

    console.print(f"Continuing session {session.session_id} v{session.version}")

    # Build continuation context from previous session
    context = build_continuation_context(session)
    full_query = f"{context}\n\nNEW QUERY: {continuation_query}"

    # Create v2 session
    new_session = ResearchSession(
        session_id=session.session_id,  # Same ID
        version=session.version + 1,  # Increment version
        parent_session_id=f"{session.session_id}_v{session.version}",
        query=session.query,  # Keep original query
        complexity_score=session.complexity_score,
    )

    # Execute research with continuation context
    selected_model = SupportedModel.from_string(session.model) if session.model else None
    if not selected_model:
        selected_model = SupportedModel.default()

    console.print("Continuing research (this may take a few minutes)...")
    orchestrator = LeadResearcher(model=selected_model.model_name)
    orchestrator.session = new_session

    await orchestrator.research(full_query)

    # Save v2 session
    await manager.save_session(new_session)

    # Update active session to v2
    manager.set_active_session(new_session)

    # Display results
    console.print("\n✓ Continuation complete")
    console.print(f"Session: {new_session.session_id} v{new_session.version}")
    console.print(f"Parent: v{session.version}")
    console.print(f"Workers: {len(new_session.workers)}")
    console.print(f"Cost: ${new_session.cost:.4f}")


async def cmd_expand(
    manager: SessionManager,
    worker_id: str,
    expansion_query: str,
    console: Console,
) -> None:
    """Expand specific worker's research with additional instructions.

    Args:
        manager: Session manager
        worker_id: Worker ID to expand
        expansion_query: Expansion instructions
        console: Rich console for output
    """
    session = manager.get_active_session()

    if not session:
        console.print("No active session. Use 'start' or 'switch' first.")
        return

    # Find target worker
    target_worker = None
    for w in session.workers:
        if w.worker_id == worker_id or w.task_id == worker_id:
            target_worker = w
            break

    if not target_worker:
        console.print(f"Error: Worker '{worker_id}' not found in session")
        worker_ids = [w.worker_id for w in session.workers]
        console.print(f"Available workers: {', '.join(worker_ids)}")
        return

    console.print(f"✓ Found worker: {target_worker.objective}")

    # Build expansion context
    try:
        context = build_worker_expansion_context(session, worker_id)
    except ValueError as e:
        console.print(f"Error: {e}")
        return

    full_query = f"{context}\n\nNEW INSTRUCTIONS: {expansion_query}"

    # Create new version
    new_session = ResearchSession(
        session_id=session.session_id,
        version=session.version + 1,
        parent_session_id=f"{session.session_id}_v{session.version}",
        query=session.query,
        complexity_score=session.complexity_score,
    )

    # Execute expansion research
    selected_model = SupportedModel.from_string(session.model) if session.model else None
    if not selected_model:
        selected_model = SupportedModel.default()

    console.print("Expanding research (this may take a few minutes)...")
    orchestrator = LeadResearcher(model=selected_model.model_name)
    orchestrator.session = new_session

    await orchestrator.research(full_query)

    # Save expanded session
    await manager.save_session(new_session)

    # Update active session
    manager.set_active_session(new_session)

    # Display results
    console.print("\n✓ Expansion complete")
    console.print(f"Session: {new_session.session_id} v{new_session.version}")
    console.print(f"Parent: v{session.version}")
    console.print(f"Workers: {len(new_session.workers)}")


async def cmd_list_sessions(manager: SessionManager, console: Console) -> None:
    """List all research sessions.

    Args:
        manager: Session manager
        console: Rich console for output
    """
    sessions = manager.list_sessions()

    if not sessions:
        console.print("No sessions found")
        console.print("Use 'start <query>' to create your first session")
        return

    # Display sessions list
    console.print("\nResearch Sessions")
    console.print("=" * 80)

    for session in sessions:
        query = session["query"]
        truncated_query = query[:50] + "..." if len(query) > 50 else query

        console.print(f"\nSession: {session['session_id']} (v{session['version']})")
        console.print(f"  Query:   {truncated_query}")
        console.print(f"  Status:  {session['status']}")
        console.print(f"  Workers: {session['num_workers']}")
        console.print(f"  Cost:    ${session['total_cost']:.4f}")

    console.print("\n" + "=" * 80)
    console.print(f"Total: {len(sessions)} sessions")


async def cmd_list_workers(
    manager: SessionManager,
    session_id: str,
    console: Console,
) -> None:
    """List workers for specific session.

    Args:
        manager: Session manager
        session_id: Session ID to list workers for
        console: Rich console for output
    """
    # Load session
    try:
        session = await manager.load_session(session_id)
    except FileNotFoundError:
        console.print(f"Session not found: {session_id}")
        return

    if not session.workers:
        console.print(f"No workers found in session {session_id}")
        return

    # Display workers list
    console.print(f"\nWorkers for {session_id} v{session.version}")
    console.print("=" * 80)

    for i, worker in enumerate(session.workers, 1):
        status_icon = "✓" if worker.status == "completed" else "✗"
        truncated_objective = (
            worker.objective[:60] + "..." if len(worker.objective) > 60 else worker.objective
        )

        console.print(f"\n{i}. {status_icon} {worker.worker_id}")
        console.print(f"   Objective: {truncated_objective}")
        console.print(f"   Status:    {worker.status}")
        console.print(f"   Sources:   {len(worker.sources)}")

    console.print("\n" + "=" * 80)
    console.print(f"Total: {len(session.workers)} workers")


async def cmd_switch(
    manager: SessionManager,
    session_id: str,
    console: Console,
) -> None:
    """Switch to existing session.

    Args:
        manager: Session manager
        session_id: Session ID to switch to
        console: Rich console for output
    """
    try:
        session = await manager.load_session(session_id)
    except FileNotFoundError:
        console.print(f"Session not found: {session_id}")
        console.print("Use 'list sessions' to see available sessions")
        return

    # Set as active
    manager.set_active_session(session)

    console.print(
        f"✓ Switched to session: {session_id} "
        f"v{session.version}"
    )
    console.print(f"Query: {session.query}")
    console.print(f"Workers: {len(session.workers)}")
    console.print(f"Cost: ${session.cost:.4f}")


async def cmd_export(
    manager: SessionManager,
    export_format: str,
    output_path: str | None,
    console: Console,
) -> None:
    """Export active session to file.

    Args:
        manager: Session manager
        export_format: Export format (markdown, json)
        output_path: Optional output path
        console: Rich console for output
    """
    import json
    from pathlib import Path

    session = manager.get_active_session()

    if not session:
        console.print("No active session to export")
        return

    # Default output path
    if not output_path:
        output_path = f"{session.session_id}_v{session.version}.{export_format}"

    output_file = Path(output_path)

    if export_format == "markdown":
        # Export as markdown
        content = f"""# {session.query}

**Session**: {session.session_id} v{session.version}
**Created**: {session.created_at}
**Status**: {session.status}
**Workers**: {len(session.workers)}
**Cost**: ${session.cost:.4f}

## Report

{session.report}

## Workers

"""
        for i, worker in enumerate(session.workers, 1):
            content += f"""
### Worker {i}: {worker.objective}

**Status**: {worker.status}
**Sources**: {len(worker.sources)}

{worker.final_output}

---
"""

        output_file.write_text(content)
        console.print(f"✓ Exported to: {output_file}")

    elif export_format == "json":
        # Export as JSON
        data = {
            "session_id": session.session_id,
            "version": session.version,
            "query": session.query,
            "status": session.status,
            "created_at": session.created_at,
            "cost": session.cost,
            "report": session.report,
            "workers": [
                {
                    "worker_id": w.worker_id,
                    "objective": w.objective,
                    "status": w.status,
                    "output": w.final_output,
                    "sources": w.sources,
                }
                for w in session.workers
            ],
        }

        output_file.write_text(json.dumps(data, indent=2))
        console.print(f"✓ Exported to: {output_file}")

    else:
        console.print(f"Unsupported format: {export_format}")
        console.print("Supported formats: markdown, json")
