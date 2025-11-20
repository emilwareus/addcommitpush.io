"""Live progress display using Rich."""
import threading
from collections import defaultdict
from datetime import datetime
from typing import Any

from rich.console import Console, Group
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text


class LiveProgress:
    """Rich live progress display for multi-agent research."""

    def __init__(self, query: str, console: Console | None = None) -> None:
        self.query = query
        self.console = console or Console()
        self.workers: dict[str, dict[str, Any]] = {}
        self.worker_status: dict[str, str] = defaultdict(lambda: "")
        self.live: Live | None = None
        self.activity_log: list[str] = []
        self._lock = threading.RLock()  # Use RLock for re-entrant safety

    def __enter__(self) -> LiveProgress:
        """Start live display."""
        self.live = Live(
            self._render(),
            console=self.console,
            refresh_per_second=4,  # Reduced to prevent lag with many workers
            transient=False,
            auto_refresh=True,
        )
        self.live.__enter__()
        return self

    def __exit__(self, *args: Any) -> None:
        """Stop live display."""
        if self.live:
            self.live.__exit__(*args)

    def on_worker_start(self, worker_id: str, objective: str) -> None:
        """Register new worker."""
        with self._lock:
            self.workers[worker_id] = {
                "objective": objective,
                "status": "starting",
                "activity": "",
                "started_at": datetime.now(),
                "tool_count": 0,
            }
            self._log_activity(f"{worker_id} started: {objective[:60]}")
        self._schedule_update()

    def on_worker_tool_use(self, worker_id: str, tool: str, details: str) -> None:
        """Update worker activity."""
        with self._lock:
            if worker_id in self.workers:
                self.workers[worker_id]["status"] = "active"
                self.workers[worker_id]["activity"] = f"{tool}: {details}"
                current_count = self.workers[worker_id].get("tool_count", 0)
                self.workers[worker_id]["tool_count"] = current_count + 1
                self._log_activity(f"{worker_id} → {tool}: {details[:60]}")
        self._schedule_update()

    def on_worker_complete(self, worker_id: str) -> None:
        """Mark worker as complete."""
        with self._lock:
            if worker_id in self.workers:
                self.workers[worker_id]["status"] = "complete"
                tool_count = self.workers[worker_id].get("tool_count", 0)
                self.workers[worker_id]["activity"] = f"✓ Complete ({tool_count} actions)"
                self._log_activity(f"{worker_id} completed ({tool_count} actions)")
        self._schedule_update()

    def on_worker_error(self, worker_id: str, error: str) -> None:
        """Mark worker as failed."""
        with self._lock:
            if worker_id in self.workers:
                self.workers[worker_id]["status"] = "error"
                self.workers[worker_id]["activity"] = f"✗ Failed: {error[:40]}"
                self._log_activity(f"{worker_id} failed: {error[:60]}")
        self._schedule_update()

    def _log_activity(self, message: str) -> None:
        """Log activity for scrolling display."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.activity_log.append(f"[dim]{timestamp}[/dim] {message}")
        # Keep only last 10 activities
        if len(self.activity_log) > 10:
            self.activity_log.pop(0)

    def _render(self) -> Group:
        """Render current state."""
        # Main query header
        header = Text()
        header.append("🔍 Multi-agent research: ", style="bold green")
        header.append(self.query, style="bold white")

        with self._lock:
            # Take snapshot of current state
            workers_snapshot = {k: dict(v) for k, v in self.workers.items()}
            activity_log_snapshot = list(self.activity_log)

        if not workers_snapshot:
            # No workers yet - show planning phase
            planning_text = Text()
            planning_text.append("📋 ", style="cyan")
            planning_text.append(
                "Analyzing query complexity and creating research plan...\n", style="dim"
            )
            planning_text.append(
                "   Workers will appear here once planning is complete", style="dim italic"
            )

            content = Panel(
                planning_text,
                title="[bold cyan]Lead Researcher[/bold cyan]",
                border_style="cyan",
            )
            return Group(header, "", content)

        # Build worker table
        table = Table(show_header=True, header_style="bold cyan", box=None, padding=(0, 1))
        table.add_column("Worker", style="cyan", width=10)
        table.add_column("Objective", style="white", width=35)
        table.add_column("Status", width=60)

        for worker_id, info in sorted(workers_snapshot.items()):
            status = info.get("status", "starting")
            activity = info.get("activity", "")
            objective = info.get("objective", "")

            # Truncate objective if too long
            if len(objective) > 37:
                objective = objective[:37] + "..."

            # Status column with spinner or checkmark
            if status == "complete":
                # Show completion with tool count
                tool_count = info.get("tool_count", 0)
                status_display = Text(f"✓ Complete ({tool_count} actions)", style="green")
            elif status == "error":
                # Show error status
                activity_text = str(activity) if activity else "Failed"
                if len(activity_text) > 57:
                    activity_text = activity_text[:54] + "..."
                status_display = Text(activity_text, style="red")
            elif status == "active":
                # Truncate activity if too long
                activity_text = str(activity) if activity else "Working..."
                if len(activity_text) > 57:
                    activity_text = activity_text[:54] + "..."
                status_display = Text(f"⚡ {activity_text}", style="yellow")
            else:
                # Starting or unknown status
                status_display = Text("⏳ Starting...", style="blue")

            table.add_row(worker_id, objective, status_display)

        # Count status
        total = len(workers_snapshot)
        complete = sum(1 for w in workers_snapshot.values() if w.get("status") == "complete")
        active = sum(1 for w in workers_snapshot.values() if w.get("status") == "active")
        errors = sum(1 for w in workers_snapshot.values() if w.get("status") == "error")

        status_text = Text()
        status_text.append(f"Workers: {total} ", style="dim")
        status_text.append(f"| Active: {active} ", style="yellow")
        status_text.append(f"| Complete: {complete}", style="green")
        if errors > 0:
            status_text.append(f" | Failed: {errors}", style="red")

        # Add activity log if there are activities
        if activity_log_snapshot:
            activity_panel = Panel(
                "\n".join(activity_log_snapshot),
                title="[bold dim]Recent Activity[/bold dim]",
                border_style="dim",
                padding=(0, 1),
            )
            return Group(header, "", status_text, "", table, "", activity_panel)

        return Group(header, "", status_text, "", table)

    def _schedule_update(self) -> None:
        """Schedule a display update (non-blocking)."""
        if self.live:
            # Always update - don't skip updates even if one is pending
            # The lock in _render() ensures thread safety
            try:
                self.live.update(self._render())
            except Exception:
                # Ignore rendering errors to prevent blocking workers
                pass

    def _update(self) -> None:
        """Update live display (legacy method for compatibility)."""
        self._schedule_update()
