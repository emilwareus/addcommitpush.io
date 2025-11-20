"""Worker agent for focused research."""

from dataclasses import dataclass
from typing import Any

from ..models import SupportedModel
from ..utils.progress import NoOpProgress, ProgressCallback
from .react import ReactAgent


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

    async def execute(self, objective: str) -> WorkerResult:
        """Execute focused research."""
        try:
            report = await self.agent.research(objective)

            return WorkerResult(
                objective=objective,
                content=report.content,
                sources=report.sources,
                metadata=report.metadata,
            )
        except Exception as e:
            # Return partial result on error to allow other workers to continue
            return WorkerResult(
                objective=objective,
                content=f"Research failed due to error: {str(e)}",
                sources=[],
                metadata={"error": str(e), "worker_id": self.worker_id},
            )
