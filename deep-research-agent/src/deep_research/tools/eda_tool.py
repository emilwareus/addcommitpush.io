"""EDA tool for multi-agent system."""
from pathlib import Path
from typing import Any

from ..agent.iterative_eda import IterativeEDAAgent
from ..utils.logger import get_logger
from .base import Tool, ToolResult

logger = get_logger(__name__)


class EDATool(Tool):
    """Exploratory Data Analysis tool for multi-agent workflows."""

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        """Initialize EDA tool.

        Args:
            model: LLM model to use for analysis
        """
        self.model = model

    @property
    def name(self) -> str:
        """Tool name."""
        return "eda"

    @property
    def description(self) -> str:
        """Tool description."""
        return (
            "Perform exploratory data analysis on datasets. "
            "Accepts file path and analysis goal. "
            "Returns insights and generates Jupyter notebook. "
            "Supports CSV, Excel, Parquet, Pickle, JSON formats."
        )

    async def execute(self, **kwargs: Any) -> ToolResult:
        """Execute EDA analysis.

        Args:
            filepath: Path to data file (required)
            query: Analysis goal/question (required)
            max_iterations: Maximum exploration iterations (default: 7)

        Returns:
            ToolResult with formatted insights and metadata
        """
        filepath: str = kwargs.get("filepath", "")
        query: str = kwargs.get("query", "analyze this dataset")
        max_iterations: int = kwargs.get("max_iterations", 7)

        if not filepath:
            return ToolResult(
                success=False,
                content="Error: filepath is required for EDA analysis",
                metadata={"error": "missing_filepath"}
            )

        logger.info("eda_tool_executing", filepath=filepath, query=query)

        try:
            # Create agent instance (isolated kernel per execution)
            agent = IterativeEDAAgent(model=self.model)

            # Execute analysis
            result = await agent.analyze(
                filepath=filepath,
                query=query,
                max_iterations=max_iterations
            )

            # Format results for LLM consumption
            content = self._format_results(result, filepath)

            return ToolResult(
                success=True,
                content=content,
                metadata={
                    "filepath": filepath,
                    "query": query,
                    "notebook_path": result.get("notebook_path"),
                    "insights_count": len(result.get("insights", [])),
                    "cells_executed": result.get("cells_executed", 0),
                }
            )
        except Exception as e:
            logger.error("eda_tool_error", error=str(e), filepath=filepath)
            return ToolResult(
                success=False,
                content=f"EDA analysis failed: {str(e)}",
                metadata={"error": str(e), "filepath": filepath}
            )

    def _format_results(self, result: dict[str, Any], filepath: str) -> str:
        """Format EDA results for LLM consumption.

        Args:
            result: Analysis result from IterativeEDAAgent
            filepath: Path to analyzed file

        Returns:
            Formatted markdown string
        """
        insights = result.get("insights", [])
        notebook_path = result.get("notebook_path", "unknown")

        formatted = f"""# EDA Analysis Results

**Dataset**: {Path(filepath).name}
**Insights Discovered**: {len(insights)}
**Notebook**: {notebook_path}

## Key Insights

"""
        for i, insight in enumerate(insights, 1):
            formatted += f"""### {i}. {insight.get('question', 'Unknown question')}

**Finding**: {insight.get('finding', 'No finding')}

**Implication**: {insight.get('implication', 'No implication')}

"""

        formatted += f"""
## Summary

{result.get('report', 'Analysis complete. See notebook for full details.')}

**Full Analysis Notebook**: `{notebook_path}`

Use the insights above to inform your research. The notebook contains executable code
and visualizations.
"""

        return formatted
