"""Worker agent for focused research."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from ..models import SupportedModel
from ..utils.progress import NoOpProgress, ProgressCallback
from .react import ReactAgent
from .state import WorkerFullContext


@dataclass
class WorkerResult:
    """Worker execution result."""

    objective: str
    content: str
    sources: list[str]
    metadata: dict[str, Any]


class WorkerAgent:
    """Specialized worker for focused research."""

    def __init__(
        self,
        model: str | None = None,
        progress: ProgressCallback | None = None,
        worker_id: str = "worker",
    ) -> None:
        self.progress = progress or NoOpProgress()
        self.worker_id = worker_id
        self.full_context: WorkerFullContext | None = None
        self.capture_context = True  # Always capture for Obsidian
        # Resolve model to string, defaulting if not provided
        model_str = model
        if not model_str:
            model_str = SupportedModel.default().model_name
        self.agent = ReactAgent(
            model=model_str,
            max_iterations=15,  # Shorter budget than Lead
            max_tokens=50_000,
            progress=self.progress,
            worker_id=self.worker_id,
        )

    async def execute(self, objective: str, task_metadata: dict[str, Any] | None = None) -> WorkerResult:
        """Execute focused research."""
        metadata = task_metadata or {}

        # Initialize full context
        self.full_context = WorkerFullContext(
            task_id=metadata.get("id", "unknown"),
            worker_id=self.worker_id,
            objective=objective,
            tools_available=metadata.get("tools", []),
            expected_output=metadata.get("expected_output", ""),
            status="running",
            started_at=datetime.now().isoformat(),
            model=self.agent.model,
        )

        try:
            report = await self.agent.research(objective)

            # Capture final state
            self.full_context.final_output = report.content
            self.full_context.sources = report.sources
            self.full_context.status = "completed"
            self.full_context.completed_at = datetime.now().isoformat()
            self.full_context.cost = report.metadata.get("cost", {}).get("total_cost", 0.0)
            self.full_context.tokens = {
                "prompt": report.metadata.get("prompt_tokens", 0),
                "completion": report.metadata.get("completion_tokens", 0),
                "total": report.metadata.get("tokens_used", 0),
            }

            # Calculate duration
            if self.full_context.started_at:
                start = datetime.fromisoformat(self.full_context.started_at)
                end = datetime.fromisoformat(self.full_context.completed_at)
                self.full_context.duration_seconds = (end - start).total_seconds()

            return WorkerResult(
                objective=objective,
                content=report.content,
                sources=report.sources,
                metadata=report.metadata,
            )
        except Exception as e:
            self.full_context.status = "failed"
            self.full_context.error = str(e)
            self.full_context.completed_at = datetime.now().isoformat()

            # Return partial result on error to allow other workers to continue
            return WorkerResult(
                objective=objective,
                content=f"Research failed due to error: {str(e)}",
                sources=[],
                metadata={"error": str(e), "worker_id": self.worker_id},
            )
