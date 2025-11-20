"""Progress tracking for multi-agent research."""
from typing import Protocol


class ProgressCallback(Protocol):
    """Protocol for progress callbacks."""

    def on_worker_start(self, worker_id: str, objective: str) -> None:
        """Called when a worker starts."""
        ...

    def on_worker_tool_use(self, worker_id: str, tool: str, details: str) -> None:
        """Called when a worker uses a tool."""
        ...

    def on_worker_complete(self, worker_id: str) -> None:
        """Called when a worker completes."""
        ...

    def on_worker_error(self, worker_id: str, error: str) -> None:
        """Called when a worker encounters an error."""
        ...


class NoOpProgress:
    """No-op progress callback."""

    def on_worker_start(self, worker_id: str, objective: str) -> None:
        pass

    def on_worker_tool_use(self, worker_id: str, tool: str, details: str) -> None:
        pass

    def on_worker_complete(self, worker_id: str) -> None:
        pass

    def on_worker_error(self, worker_id: str, error: str) -> None:
        pass
