"""Iterative EDA Agent - Actually analyzes data, not just generates code."""

from pathlib import Path
from typing import Any

import pandas as pd
from rich.console import Console
from rich.panel import Panel

from ..llm.client import get_llm
from ..notebook.builder import NotebookBuilder
from ..notebook.executor import execute_notebook
from ..tools.data_loader import DataLoader
from ..tools.executor import CodeExecutor, ExecutionResult
from ..utils.logger import get_logger

logger = get_logger(__name__)


class IterativeEDAAgent:
    """EDA agent that executes code, analyzes outputs, and iterates."""

    def __init__(self, model: str = "gpt-4o-mini", console: Console | None = None) -> None:
        self.model = model
        self.llm = get_llm(model)
        self.executor = CodeExecutor()
        self.console = console or Console()

        # Analysis state
        self.insights: list[dict[str, Any]] = []
        self.code_cells: list[dict[str, Any]] = []
        self.questions_explored: list[str] = []
        self.notebook_filepath: str = ""  # Relative path for notebook

    async def analyze(
        self, filepath: str, query: str, max_iterations: int = 7
    ) -> dict[str, Any]:
        """Execute iterative data analysis."""
        self.console.print(
            Panel.fit(
                f"[bold cyan]Iterative Data Analysis[/bold cyan]\n\n"
                f"Dataset: {filepath}\n"
                f"Goal: {query}\n"
                f"Max iterations: {max_iterations}",
                border_style="cyan",
            )
        )

        # Phase 1: Load and understand data
        self.console.print("\n[bold yellow]Phase 1: Loading Data[/bold yellow]")
        schema = await self._load_and_understand(filepath)

        # Phase 2: Identify target
        self.console.print("\n[bold yellow]Phase 2: Identifying Target[/bold yellow]")
        target_col = await self._identify_target(schema, query)
        self.console.print(f"  → Target column: [bold]{target_col}[/bold]")

        # Phase 3: Iterative exploration
        self.console.print(
            f"\n[bold yellow]Phase 3: Iterative Exploration[/bold yellow] "
            f"(max {max_iterations} iterations)"
        )

        for iteration in range(1, max_iterations + 1):
            self.console.print(f"\n[bold cyan]→ Iteration {iteration}[/bold cyan]")

            # Check if goal is reached (after at least 3 iterations)
            if iteration > 3:
                goal_reached = await self._evaluate_goal_progress(query)
                if goal_reached:
                    self.console.print(
                        f"\n[bold green]✓ Goal reached![/bold green] "
                        f"Sufficient insights gathered after {iteration - 1} iterations."
                    )
                    break

            # Plan next exploration
            exploration_code = await self._plan_next_step(
                schema, target_col, query, iteration
            )

            if not exploration_code:
                self.console.print("  [dim]No more explorations needed[/dim]")
                break

            # Execute and analyze
            await self._execute_and_analyze(exploration_code, query, iteration)

        # Phase 4: Generate outputs
        self.console.print("\n[bold yellow]Phase 4: Generating Outputs[/bold yellow]")
        outputs = await self._generate_outputs(filepath, query, target_col, schema)

        self.executor.shutdown()
        return outputs

    async def _load_and_understand(self, filepath: str) -> dict[str, Any]:
        """Load data and build initial understanding."""
        # Validate format first
        try:
            format_type = DataLoader.detect_format(filepath)
            logger.info("format_detected", filepath=filepath, format=format_type)
        except ValueError as e:
            raise ValueError(f"Unsupported data format: {str(e)}")

        # Load into pandas for schema
        df = DataLoader.load(filepath)

        # Convert to relative path for notebook execution from notebooks/ directory
        abs_path = Path(filepath).resolve()

        # Calculate relative path from notebooks/ to the data file
        try:
            relative_path = Path("..") / abs_path.relative_to(Path.cwd())
        except ValueError:
            # If file is outside cwd, use absolute path
            relative_path = abs_path

        self.notebook_filepath = str(relative_path)

        # Generate format-specific load code
        load_code_line = DataLoader.generate_load_code(filepath)
        notebook_load_code_line = DataLoader.generate_load_code(self.notebook_filepath)

        # Load into kernel (use original path for current execution)
        load_code = f"""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Set style
sns.set_style('whitegrid')
plt.rcParams['figure.figsize'] = (12, 6)

# Load data
{load_code_line}
print(f"Loaded dataset: {{df.shape[0]}} rows, {{df.shape[1]}} columns")
"""
        result = self.executor.execute(load_code)

        # Store cell with notebook-relative path
        notebook_load_code = f"""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Set style
sns.set_style('whitegrid')
plt.rcParams['figure.figsize'] = (12, 6)

# Load data
{notebook_load_code_line}
print(f"Loaded dataset: {{df.shape[0]}} rows, {{df.shape[1]}} columns")
"""
        self.code_cells.append(
            {"code": notebook_load_code, "output": result.stdout, "type": "setup"}
        )

        # Get initial overview
        overview_code = """# Initial overview
print("\\n=== Dataset Overview ===")
print(f"Shape: {df.shape}")
print(f"\\nColumns: {list(df.columns)}")
print(f"\\nData types:\\n{df.dtypes}")
print(f"\\nMissing values:\\n{df.isnull().sum()[df.isnull().sum() > 0]}")
print(f"\\nFirst few rows:\\n{df.head(3)}")
"""
        overview_result = self.executor.execute(overview_code)

        self.code_cells.append(
            {"code": overview_code, "output": overview_result.stdout, "type": "overview"}
        )

        self.console.print(f"  → Shape: [bold]{df.shape}[/bold]")
        self.console.print(f"  → Columns: {len(df.columns)}")

        return {
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "head": df.head(3).to_dict(),
            "missing": df.isnull().sum().to_dict(),
        }

    async def _identify_target(
        self, schema: dict[str, Any], query: str
    ) -> str:
        """Identify target variable from query and schema."""
        prompt = f"""Given this analysis goal: "{query}"

Dataset columns: {schema['columns']}
Data types: {schema['dtypes']}

Which column should be the target variable (what we want to predict/analyze)?

Look for:
1. Column explicitly mentioned in query
2. Common target patterns (price, cost, value, sales, etc.)
3. Last numeric column as fallback

Return ONLY the exact column name, nothing else.
"""
        response = await self.llm.ainvoke(prompt)
        target = str(response.content).strip().strip('"\'')

        # Validate it exists
        if target not in schema["columns"]:
            # Fallback: find first column with "price" or last numeric
            for col in schema["columns"]:
                if any(p in col.lower() for p in ["price", "cost", "value", "amount"]):
                    target = col
                    break
            else:
                # Last numeric column
                numeric_cols = [
                    c
                    for c, t in schema["dtypes"].items()
                    if t in ("int64", "float64")
                ]
                if numeric_cols:
                    target = numeric_cols[-1]

        return target

    async def _evaluate_goal_progress(self, query: str) -> bool:
        """Evaluate if we have sufficient insights to answer the goal."""
        if len(self.insights) < 3:
            return False

        # Build summary of insights
        insights_summary = "\n".join(
            [
                f"{i+1}. {insight['question']}\n   Finding: {insight['finding'][:200]}"
                for i, insight in enumerate(self.insights)
            ]
        )

        prompt = f"""You are evaluating whether we have sufficient insights to answer this goal:

GOAL: "{query}"

INSIGHTS DISCOVERED:
{insights_summary}

Based on these insights, can we confidently answer the goal? Consider:
1. Do we understand the key patterns and relationships in the data?
2. Do we have actionable findings that address the goal?
3. Have we identified the main drivers/predictors relevant to the goal?
4. Would additional exploration likely add significant value?

Respond with ONLY "YES" if we have sufficient insights, or "NO" if we need more exploration.
Include a brief reason (max 100 chars) after your answer.

Format: YES/NO: reason
"""
        try:
            response = await self.llm.ainvoke(prompt)
            content = str(response.content).strip()

            # Parse response
            if content.upper().startswith("YES"):
                logger.info(f"Goal evaluation: {content}")
                return True
            else:
                logger.debug(f"Goal evaluation: {content}")
                return False

        except Exception as e:
            logger.warning(f"Error evaluating goal progress: {e}")
            return False  # Continue exploration on error

    async def _plan_next_step(
        self, schema: dict[str, Any], target_col: str, query: str, iteration: int
    ) -> str | None:
        """Plan the next exploration step based on current insights."""
        # Build context from all previous insights (limit length to avoid API issues)
        recent_insights = "\n".join(
            [
                f"- {i['question'][:80]}: {i['finding'][:150]}"
                for i in self.insights
            ]
        )

        # Limit total context length to prevent API issues
        if len(recent_insights) > 2000:
            recent_insights = recent_insights[:2000] + "...(truncated for brevity)"

        prompt = f"""You are analyzing data to answer: "{query}"

Target variable: {target_col}
Columns available: {schema['columns']}
Iteration: {iteration}/7

Previous insights:
{recent_insights if recent_insights else "None yet - this is the first exploration"}

What should we explore next? Choose ONE focused analysis:

Iteration 1: Analyze target variable distribution and statistics
Iteration 2: Check correlations between target and numeric features
Iteration 3: Analyze categorical features vs target
Iteration 4: Identify outliers and anomalies in target
Iteration 5: Feature interactions and relationships
Iteration 6: Data quality issues affecting the target
Iteration 7: Final validation and hypothesis testing

Generate Python code that:
1. Answers a specific question about the data
2. Produces clear output (numbers, plots, or both)
3. Uses matplotlib/seaborn for visualizations
4. Includes print statements explaining results
5. Keep code under 50 lines

Return ONLY the Python code, no markdown formatting, no explanation.
"""
        try:
            response = await self.llm.ainvoke(prompt)
            code = str(response.content).strip()

            # Clean up markdown code blocks if present
            if "```python" in code:
                code = code.split("```python")[1].split("```")[0].strip()
            elif "```" in code:
                code = code.split("```")[1].split("```")[0].strip()

            return code if code else None
        except Exception as e:
            logger.error(f"Error planning next step at iteration {iteration}: {e}")
            # Return None to gracefully skip this iteration
            return None

    async def _execute_and_analyze(
        self, code: str, query: str, iteration: int
    ) -> None:
        """Execute code and analyze the output."""
        # Execute
        result = self.executor.execute(code, timeout=60)

        # Store cell
        self.code_cells.append(
            {
                "code": code,
                "output": result.stdout if result.success else result.stderr,
                "success": result.success,
                "type": "exploration",
                "iteration": iteration,
            }
        )

        if not result.success:
            self.console.print(
                f"  [red]✗ Execution failed:[/red] {result.stderr[:200]}"
            )
            return

        # Analyze output with LLM
        insight = await self._interpret_output(code, result, query)

        self.insights.append(
            {
                "iteration": iteration,
                "question": insight["question"],
                "finding": insight["finding"],
                "implication": insight["implication"],
            }
        )

        # Display insight
        self.console.print(
            Panel(
                f"[bold]Question:[/bold] {insight['question']}\n\n"
                f"[bold]Finding:[/bold] {insight['finding']}\n\n"
                f"[bold]Implication:[/bold] {insight['implication']}",
                title=f"Insight #{iteration}",
                border_style="green",
            )
        )

    async def _interpret_output(
        self, code: str, result: ExecutionResult, query: str
    ) -> dict[str, str]:
        """Interpret code output into actionable insight."""
        prompt = f"""Analyze this data exploration result in context of: "{query}"

Code executed:
{code}

Output:
{result.stdout[:2000]}

Provide a structured analysis in VALID JSON format with these exact keys:

{{
  "question": "What specific question did this code answer?",
  "finding": "What does the output reveal? Be specific with numbers/patterns.",
  "implication": "How does this relate to the goal and what should we investigate next?"
}}

IMPORTANT: Return ONLY valid JSON. Keep each field under 500 characters. No markdown, no extra text.
"""
        try:
            response = await self.llm.ainvoke(prompt)
            content = str(response.content).strip()

            # Parse JSON with better error handling
            import json
            import re

            # Try to find JSON object in response
            json_match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", content, re.DOTALL)
            if json_match:
                try:
                    parsed: dict[str, str] = json.loads(json_match.group(0))
                    # Validate required keys
                    if all(k in parsed for k in ["question", "finding", "implication"]):
                        return {
                            "question": parsed["question"][:500],
                            "finding": parsed["finding"][:500],
                            "implication": parsed["implication"][:500],
                        }
                except (json.JSONDecodeError, KeyError):
                    pass

            # Try parsing entire content as JSON
            try:
                parsed = json.loads(content)
                if all(k in parsed for k in ["question", "finding", "implication"]):
                    return {
                        "question": parsed["question"][:500],
                        "finding": parsed["finding"][:500],
                        "implication": parsed["implication"][:500],
                    }
            except json.JSONDecodeError:
                pass

        except Exception as e:
            logger.warning(f"Error interpreting output: {e}")

        # Robust fallback
        return {
            "question": "Data exploration",
            "finding": "Analysis completed - see notebook for details",
            "implication": "Continue with next iteration",
        }

    async def _generate_outputs(
        self,
        filepath: str,
        query: str,
        target_col: str,
        schema: dict[str, Any],
    ) -> dict[str, Any]:
        """Generate executed notebook and markdown report."""
        # Generate markdown report
        report = await self._generate_report(filepath, query, target_col)

        # Generate executed notebook
        notebook_path = await self._save_executed_notebook(
            filepath, query, target_col, schema
        )

        return {
            "report": report,
            "notebook_path": str(notebook_path),
            "insights": self.insights,
            "cells_executed": len(self.code_cells),
        }

    async def _generate_report(
        self, filepath: str, query: str, target_col: str
    ) -> str:
        """Generate comprehensive markdown analysis report."""
        insights_text = "\n\n".join(
            [
                f"### Insight {i['iteration']}: {i['question']}\n\n"
                f"**Finding:** {i['finding']}\n\n"
                f"**Implication:** {i['implication']}"
                for i in self.insights
            ]
        )

        prompt = f"""Generate a comprehensive data analysis report.

Dataset: {filepath}
Goal: {query}
Target: {target_col}
Insights discovered: {len(self.insights)}

Detailed insights:
{insights_text}

Create a professional markdown report with:

# Executive Summary
- Key findings (top 3-5)
- Overall data quality assessment
- Recommendation

# Detailed Analysis
{insights_text}

# Recommendations
- Specific next steps for modeling
- Data quality improvements needed
- Feature engineering suggestions

# Conclusion
- Summary of findings
- Confidence in data for goal: "{query}"

Use markdown formatting. Be specific and reference actual findings.
"""
        response = await self.llm.ainvoke(prompt)
        return str(response.content)

    async def _generate_data_story_intro(self, query: str) -> str:
        """Generate executive summary introducing the data story."""
        insights_summary = "\n".join(
            [f"- {insight['question']}: {insight['finding'][:150]}" for insight in self.insights]
        )

        prompt = f"""Write a compelling 2-3 paragraph executive summary for this data analysis.

GOAL: {query}

KEY INSIGHTS DISCOVERED:
{insights_summary}

The summary should:
1. Start with the main finding/answer to the goal
2. Highlight 2-3 most important discoveries
3. Set the stage for the detailed analysis that follows
4. Be written for a business/technical audience
5. Use specific numbers and findings (not generic statements)

Write in markdown format. Be concise and impactful.
"""
        try:
            response = await self.llm.ainvoke(prompt)
            return str(response.content).strip()
        except Exception as e:
            logger.warning(f"Error generating story intro: {e}")
            return f"This analysis explores: {query}"

    async def _generate_data_story_conclusion(self, query: str) -> str:
        """Generate conclusion synthesizing all insights."""
        insights_summary = "\n".join(
            [
                f"{i+1}. {insight['question']}\n   → {insight['finding'][:200]}"
                for i, insight in enumerate(self.insights)
            ]
        )

        prompt = f"""Write a comprehensive conclusion for this data analysis.

GOAL: {query}

ALL INSIGHTS DISCOVERED:
{insights_summary}

The conclusion should:
1. Directly answer the goal with confidence
2. Synthesize insights into actionable recommendations
3. Highlight key predictors/drivers discovered
4. Suggest next steps for modeling or further analysis
5. Note any limitations or caveats

Write in markdown format with clear sections:
- **Key Findings** (3-5 bullets)
- **Recommendations** (3-5 specific next steps)
- **Model Readiness** (assessment of data quality for the goal)

Be specific and reference actual findings.
"""
        try:
            response = await self.llm.ainvoke(prompt)
            return str(response.content).strip()
        except Exception as e:
            logger.warning(f"Error generating conclusion: {e}")
            return "Analysis complete. See insights above for detailed findings."

    async def _save_executed_notebook(
        self, filepath: str, query: str, target_col: str, schema: dict[str, Any]
    ) -> Path:
        """Save notebook with all executed cells and outputs."""
        file_path_obj = Path(filepath)
        notebooks_dir = Path.cwd() / "notebooks"
        notebooks_dir.mkdir(exist_ok=True)
        nb_path = notebooks_dir / f"{file_path_obj.stem}_analysis.ipynb"

        nb = NotebookBuilder(f"Data Analysis: {query}")

        # Generate executive summary of the data story
        story_intro = await self._generate_data_story_intro(query)

        # Add header with executive summary
        nb.add_markdown(
            f"# {query}\n\n"
            f"**Dataset:** {file_path_obj.name}\n"
            f"**Shape:** {schema['shape']}\n"
            f"**Target:** {target_col}\n"
            f"**Analysis Date:** {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}\n"
        )

        nb.add_markdown(f"## Executive Summary\n\n{story_intro}")

        nb.add_markdown(
            f"## Analysis Journey\n\n"
            f"This notebook tells the data story through {len(self.insights)} key discoveries. "
            f"Each section builds on previous insights to answer: *{query}*"
        )

        # Add all code cells with narrative structure
        for i, cell in enumerate(self.code_cells, 1):
            # Add insight as narrative context BEFORE code if this was an exploration cell
            if cell.get("type") == "exploration":
                matching_insight = next(
                    (
                        ins
                        for ins in self.insights
                        if ins.get("iteration") == cell.get("iteration")
                    ),
                    None,
                )
                if matching_insight:
                    nb.add_markdown(
                        f"### Discovery {cell.get('iteration')}: {matching_insight['question']}\n\n"
                        f"*What we're exploring and why:* {matching_insight['implication']}"
                    )

            # Add code cell
            nb.add_code(cell["code"])

            # Add insight AFTER code execution
            if cell.get("type") == "exploration" and matching_insight:
                nb.add_markdown(
                    f"**📊 What the data reveals:** {matching_insight['finding']}"
                )

        # Add synthesized conclusion
        conclusion = await self._generate_data_story_conclusion(query)
        nb.add_markdown(f"## Conclusion\n\n{conclusion}")

        # Save notebook
        nb.save(str(nb_path))

        # Execute notebook to populate outputs
        self.console.print(
            "\n[yellow]→ Executing notebook to validate and populate outputs...[/yellow]"
        )
        exec_result = execute_notebook(nb_path, timeout=300)

        if exec_result.success:
            self.console.print(
                "[green]✓[/green] Notebook executed successfully with all outputs"
            )
        else:
            self.console.print(
                f"[red]✗[/red] Notebook execution failed: {exec_result.error_message}"
            )
            logger.warning(
                f"Notebook saved but execution failed: {exec_result.error_message}"
            )

        return nb_path
