---
date: 2025-11-17T14:30:00+01:00
researcher: Claude (Sonnet 4.5)
git_commit: f02b5c6740b7d3c156f172c0e49106b37563d25a
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: "Improving EDA Agent: Multi-Data Source Support & Parallel Execution as Sub-Agent"
tags: [research, deep-research, eda, multi-agent, data-analysis, parallel-execution, tool-system]
status: complete
last_updated: 2025-11-17
last_updated_by: Claude
---

# Research: Improving EDA Agent - Multi-Data Source Support & Parallel Execution as Sub-Agent

**Date**: 2025-11-17T14:30:00+01:00
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: f02b5c6740b7d3c156f172c0e49106b37563d25a
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Research Question

How can the IterativeEDAAgent be transformed into a sub-agent tool that:
1. Can be used by the multi-agent system as a tool
2. Supports running multiple EDA agents concurrently (parallel execution)
3. Handles multiple data source types (pickle, csv, excel, parquet, etc.)
4. Enables insights derived from both data analysis and web search

## Summary

The current IterativeEDAAgent is a standalone agent that performs exploratory data analysis on CSV files. To meet the requirements, we need to:

1. **Convert to Tool Pattern**: Wrap IterativeEDAAgent as a LangChain tool following the existing tool architecture (base.py pattern)
2. **Add Multi-Format Support**: Implement a data loader factory that detects file types and uses appropriate pandas readers
3. **Enable Parallelization**: Leverage LangGraph's Send API pattern (already used for WorkerAgents) to spawn multiple EDA agents concurrently
4. **Integrate with Multi-Agent System**: Make EDA tool available to ReactAgent and orchestrator, enabling combined web research + data analysis workflows

This research provides a comprehensive implementation plan with code references, architectural patterns, and concrete examples from the existing codebase.

## Detailed Findings

### 1. Current EDA Agent Architecture

#### Implementation Location
- **Primary**: `deep-research-agent/src/deep_research/agent/iterative_eda.py:19-655`
- **Alternative**: `deep-research-agent/src/deep_research/agent/data_agent.py:16-419` (simpler, older version)

#### Current Workflow (4 Phases)

**Phase 1: Load & Understand** (`iterative_eda.py:49-50`, `iterative_eda.py:95-172`)
- Loads CSV into pandas: `df = pd.read_csv(filepath)` (line 98)
- Executes setup code in Jupyter kernel via CodeExecutor
- Extracts schema: shape, columns, dtypes, missing values, head samples

**Phase 2: Identify Target** (`iterative_eda.py:53-55`, `iterative_eda.py:174-212`)
- LLM analyzes query + schema to identify target variable
- Uses heuristic fallbacks: "price", "cost", "value" patterns
- Returns target column for analysis focus

**Phase 3: Iterative Exploration** (`iterative_eda.py:58-86`)
- Loop up to `max_iterations` (default: 7):
  1. **Goal Check** (after 3+ iterations): LLM evaluates if sufficient insights gathered → early stop
  2. **Plan**: LLM generates Python exploration code based on insights so far
  3. **Execute**: CodeExecutor runs code in kernel, captures output/plots
  4. **Interpret**: LLM extracts structured insight (question, finding, implication) from execution results
  5. **Store**: Append insight to list, continue loop

**Phase 4: Generate Outputs** (`iterative_eda.py:89-90`, `iterative_eda.py:435-456`)
- Generate markdown report summarizing insights
- Build executed Jupyter notebook with:
  - Executive summary (LLM-generated from all insights)
  - Code cells with narrative structure
  - Conclusion synthesizing recommendations
- Execute notebook to populate outputs → validates it works end-to-end

#### Current Limitations

**Single File Format** (`iterative_eda.py:98`, `data_agent.py:34`)
- Hardcoded `pd.read_csv(filepath)` calls
- No file extension detection or format validation
- Only CSV support (no Excel, Parquet, Pickle, etc.)

**Not a Tool**
- EDA agent is directly instantiated by CLI (`cli.py:275`)
- Not registered in tool system
- Cannot be called by other agents (ReactAgent, WorkerAgent)

**No Parallel Support**
- Single synchronous execution
- No mechanism to run multiple EDA analyses concurrently
- CodeExecutor creates single kernel instance (blocks concurrent use)

---

### 2. Existing Tool System Architecture

#### Tool Base Interface (`tools/base.py:7-35`)

```python
@dataclass
class ToolResult:
    """Result from tool execution."""
    success: bool
    content: str
    metadata: dict[str, Any]

class Tool(ABC):
    """Base tool interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Tool name."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Tool description."""
        pass

    @abstractmethod
    async def execute(self, **kwargs: Any) -> ToolResult:
        """Execute tool with arguments."""
        pass
```

**Key Pattern**: Tools return `ToolResult` with:
- `success`: Boolean execution status
- `content`: String output (formatted for LLM consumption)
- `metadata`: Dict with diagnostic info (query, URL, tokens, etc.)

#### Example Tool Implementation (SearchTool at `tools/search.py:13-86`)

```python
class SearchTool(Tool):
    """Web search tool."""

    def __init__(self) -> None:
        self.api_key = os.getenv("BRAVE_API_KEY")
        if not self.api_key:
            raise ValueError("BRAVE_API_KEY is required...")

    @property
    def name(self) -> str:
        return "search"

    @property
    def description(self) -> str:
        return "Search the web for information. Returns title, snippet, URL for results."

    async def execute(self, **kwargs: Any) -> ToolResult:
        """Execute web search."""
        query: str = kwargs.get("query", "")
        max_results: int = kwargs.get("max_results", 10)

        try:
            results = await self._search_brave(query, max_results)
            content = self._format_results(results)

            return ToolResult(
                success=True,
                content=content,
                metadata={"query": query, "count": len(results), "provider": "brave"},
            )
        except Exception as e:
            logger.error("search_error", error=str(e))
            return ToolResult(
                success=False,
                content=f"Search failed: {str(e)}",
                metadata={"error": str(e)}
            )
```

**Key Aspects**:
- Environment-based configuration (API keys)
- Error handling with try/except → returns failure ToolResult
- Helper methods for API calls and formatting
- Metadata tracking for observability

#### LangChain Tool Wrapping Pattern (`agent/react.py:60-85`)

ReactAgent wraps custom tools as LangChain tools using `@tool` decorator:

```python
class ReactAgent:
    def __init__(self, ...):
        # Instantiate custom tool instances
        self._search_tool = SearchTool()
        self._fetch_tool = FetchTool()

        # Create LangChain tools using @tool decorator
        @tool
        async def search(query: str, max_results: int = 10) -> str:
            """Search the web for information. Returns title, snippet, URL for results."""
            self.progress.on_worker_tool_use(self.worker_id, "search", f"Searching: {query}")
            result = await self._search_tool.execute(query=query, max_results=max_results)
            return result.content

        @tool
        async def fetch(url: str) -> str:
            """Fetch and read webpage content. Returns clean text."""
            result = await self._fetch_tool.execute(url=url)
            return result.content

        self.tools = [search, fetch]

        # Bind tools to LLM
        base_llm: ChatOpenAI = get_llm(model, temperature=0.0)
        self.llm: Runnable[Any, AIMessage] = base_llm.bind_tools(self.tools)
```

**Key Pattern**:
1. Custom tool implements `Tool` base class (domain logic)
2. `@tool` decorated function wraps custom tool (LangChain integration)
3. Decorated function returns string (LangChain requirement)
4. Tools bound to LLM via `.bind_tools()` for automatic tool calling

---

### 3. Multi-Agent Orchestration Pattern

#### LangGraph Send API for Parallel Execution (`agent/orchestrator.py:155-184`)

The LeadResearcher orchestrator demonstrates how to spawn multiple agents in parallel:

```python
def _spawn_workers(self, state: ResearchState) -> list[Send]:
    """Spawn worker agents in parallel."""
    return [Send("worker", {"task": task}) for task in state["sub_tasks"]]

async def _worker_execution(self, state: dict[str, Any]) -> dict[str, Any]:
    """Execute worker (runs in parallel)."""
    task = state["task"]
    worker_id = task["id"]

    self.progress.on_worker_start(worker_id, task["objective"])

    # Each worker gets own agent instance
    worker = WorkerAgent(model=self.model, progress=self.progress, worker_id=worker_id)
    result = await worker.execute(task["objective"])

    # Compress findings for memory efficiency
    summary = await self._compress(result.content, max_tokens=2000)

    self.progress.on_worker_complete(worker_id)

    return {
        "worker_results": [{
            "task_id": task["id"],
            "summary": summary,
            "sources": result.sources,
            "metadata": result.metadata,
        }]
    }
```

**Key Mechanism**:
1. **Dynamic Fan-Out**: `Send` objects created for each task → LangGraph parallelizes execution
2. **State Reducer**: `worker_results: Annotated[list[dict], add]` automatically merges parallel outputs
3. **Isolated Instances**: Each worker gets own agent instance (no shared state)
4. **Result Compression**: Summaries compressed to prevent state bloat

**Graph Structure** (`orchestrator.py:80-101`):
```
START → analyze → plan → [workers in parallel] → synthesize → END
                           ↑
                           └─ Send API spawns N workers dynamically
```

#### Worker Agent Pattern (`agent/worker.py:21-62`)

Workers wrap ReactAgent with error handling and limited iteration budget:

```python
class WorkerAgent:
    def __init__(self, model: str | None = None, progress: ProgressCallback | None = None, worker_id: str = "worker"):
        self.agent = ReactAgent(
            model=model_str,
            max_iterations=15,  # Shorter than Lead's budget (20)
            max_tokens=50_000,
            progress=self.progress,
            worker_id=self.worker_id,
        )

    async def execute(self, objective: str) -> WorkerResult:
        try:
            report = await self.agent.research(objective)
            return WorkerResult(
                objective=objective,
                content=report.content,
                sources=report.sources,
                metadata=report.metadata,
            )
        except Exception as e:
            # Graceful degradation - partial result allows other workers to continue
            return WorkerResult(
                objective=objective,
                content=f"Research failed due to error: {str(e)}",
                sources=[],
                metadata={"error": str(e), "worker_id": self.worker_id},
            )
```

**Key Pattern**: Composition over inheritance - worker wraps ReactAgent rather than extending it

---

### 4. Code Execution Architecture

#### CodeExecutor Implementation (`tools/executor.py:26-103`)

Current executor creates single kernel instance:

```python
class CodeExecutor:
    """Safe Jupyter kernel executor."""

    def __init__(self) -> None:
        self.km = KernelManager()
        self.km.start_kernel()
        self.kc = self.km.client()
        self.kc.start_channels()
        self.kc.wait_for_ready(timeout=60)

    def is_safe(self, code: str) -> tuple[bool, str]:
        """AST-based safety check."""
        try:
            tree = ast.parse(code)

            # Check for dangerous operations
            dangerous = ["eval", "exec", "compile", "__import__"]
            for node in ast.walk(tree):
                if isinstance(node, ast.Name) and node.id in dangerous:
                    return False, f"Unsafe operation: {node.id}"

            return True, "OK"
        except SyntaxError as e:
            return False, f"Syntax error: {e}"

    def execute(self, code: str, timeout: int = 30) -> ExecutionResult:
        """Execute code in kernel."""
        safe, error_msg = self.is_safe(code)
        if not safe:
            return ExecutionResult(
                success=False,
                stdout="",
                stderr=error_msg,
                display_data=[],
                error={"ename": "SafetyError", "evalue": error_msg, "traceback": []},
            )

        self.kc.execute(code)
        # ... collect outputs from kernel messages ...

        return ExecutionResult(
            success=outputs["error"] is None,
            stdout="".join(outputs["stdout"]),
            stderr="".join(outputs["stderr"]),
            display_data=outputs["display_data"],
            error=outputs["error"]
        )

    def shutdown(self) -> None:
        """Shutdown kernel."""
        self.kc.stop_channels()
        self.km.shutdown_kernel()
```

**Limitation for Parallel Execution**:
- Single kernel instance per CodeExecutor
- `execute()` is synchronous (blocks)
- No kernel pooling or management

**Needed for Parallel EDA**:
- Kernel pool or factory pattern
- Async execution support
- Kernel lifecycle management (auto-cleanup)

---

### 5. Data Loading - Current State

#### File Format Support Analysis

**Current Implementation** (`iterative_eda.py:98`, `data_agent.py:34`):
```python
# Only CSV loading implemented
df = pd.read_csv(filepath)
```

**CLI Validation** (`cli.py:231`):
```python
@click.argument("filepath", type=click.Path(exists=True))
```
- Only validates file existence, not format
- No extension checking

**Available Dependencies** (`pyproject.toml:19`):
- `pandas>=2.2.0` - supports all formats via different readers

**Missing Formats**:
- Excel (.xlsx, .xls) - no `read_excel` calls
- Parquet (.parquet) - no `read_parquet` calls
- Pickle (.pkl) - no `read_pickle` calls
- JSON (.json) - no `read_json` calls
- Other: TSV, HDF5, Feather, etc.

**Required Dependencies** (need to add to pyproject.toml):
```toml
dependencies = [
    # ... existing ...
    "openpyxl>=3.1.0",    # For Excel (.xlsx)
    "pyarrow>=15.0.0",    # For Parquet
    # xlrd for legacy .xls (optional)
]
```

#### Recommendation: Data Loader Factory Pattern

Create a `DataLoader` class that detects file type and uses appropriate reader:

```python
# New file: src/deep_research/tools/data_loader.py

from pathlib import Path
from typing import Any
import pandas as pd

class DataLoader:
    """Factory for loading various data formats."""

    SUPPORTED_FORMATS = {
        '.csv': pd.read_csv,
        '.tsv': lambda path: pd.read_csv(path, sep='\t'),
        '.xlsx': pd.read_excel,
        '.xls': pd.read_excel,
        '.parquet': pd.read_parquet,
        '.pkl': pd.read_pickle,
        '.pickle': pd.read_pickle,
        '.json': pd.read_json,
        '.feather': pd.read_feather,
        '.h5': pd.read_hdf,
    }

    @classmethod
    def load(cls, filepath: str | Path, **kwargs: Any) -> pd.DataFrame:
        """Load data file, auto-detecting format."""
        path = Path(filepath)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        suffix = path.suffix.lower()

        if suffix not in cls.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported file format: {suffix}. "
                f"Supported: {', '.join(cls.SUPPORTED_FORMATS.keys())}"
            )

        reader = cls.SUPPORTED_FORMATS[suffix]

        try:
            df = reader(filepath, **kwargs)
            return df
        except Exception as e:
            raise ValueError(f"Failed to load {suffix} file: {str(e)}")

    @classmethod
    def detect_format(cls, filepath: str | Path) -> str:
        """Detect file format from extension."""
        suffix = Path(filepath).suffix.lower()
        if suffix in cls.SUPPORTED_FORMATS:
            return suffix
        raise ValueError(f"Unknown format: {suffix}")

    @classmethod
    def generate_load_code(cls, filepath: str | Path) -> str:
        """Generate pandas loading code for notebook."""
        path = Path(filepath)
        suffix = path.suffix.lower()

        code_templates = {
            '.csv': f"df = pd.read_csv('{filepath}')",
            '.tsv': f"df = pd.read_csv('{filepath}', sep='\\t')",
            '.xlsx': f"df = pd.read_excel('{filepath}')",
            '.xls': f"df = pd.read_excel('{filepath}')",
            '.parquet': f"df = pd.read_parquet('{filepath}')",
            '.pkl': f"df = pd.read_pickle('{filepath}')",
            '.json': f"df = pd.read_json('{filepath}')",
        }

        return code_templates.get(suffix, f"df = pd.read_csv('{filepath}')")
```

**Usage in IterativeEDAAgent**:
```python
# Replace line 98 in iterative_eda.py
from ..tools.data_loader import DataLoader

# Old: df = pd.read_csv(filepath)
# New:
df = DataLoader.load(filepath)
load_code = DataLoader.generate_load_code(filepath)
```

---

## Architecture Recommendations

### 1. Convert EDA Agent to Tool

#### Step 1: Create EDATool Wrapper

**New File**: `src/deep_research/tools/eda_tool.py`

```python
"""EDA tool for multi-agent system."""
from pathlib import Path
from typing import Any

from .base import Tool, ToolResult
from ..agent.iterative_eda import IterativeEDAAgent
from ..utils.logger import get_logger

logger = get_logger(__name__)


class EDATool(Tool):
    """Exploratory Data Analysis tool."""

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.model = model

    @property
    def name(self) -> str:
        return "eda"

    @property
    def description(self) -> str:
        return (
            "Perform exploratory data analysis on datasets. "
            "Accepts file path and analysis goal. "
            "Returns insights and generates Jupyter notebook. "
            "Supports CSV, Excel, Parquet, Pickle formats."
        )

    async def execute(self, **kwargs: Any) -> ToolResult:
        """Execute EDA analysis."""
        filepath: str = kwargs.get("filepath", "")
        query: str = kwargs.get("query", "analyze this dataset")
        max_iterations: int = kwargs.get("max_iterations", 7)

        if not filepath:
            return ToolResult(
                success=False,
                content="Error: filepath is required",
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
            content = self._format_results(result)

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

    def _format_results(self, result: dict[str, Any]) -> str:
        """Format EDA results for LLM."""
        insights = result.get("insights", [])

        formatted = f"""# EDA Analysis Results

**Dataset**: {result.get("filepath", "unknown")}
**Insights Discovered**: {len(insights)}
**Notebook**: {result.get("notebook_path", "unknown")}

## Key Insights

"""
        for i, insight in enumerate(insights, 1):
            formatted += f"""### {i}. {insight.get('question', 'Unknown question')}

**Finding**: {insight.get('finding', 'No finding')}

**Implication**: {insight.get('implication', 'No implication')}

"""

        formatted += f"""
## Summary

{result.get('report', 'Analysis complete. See notebook for details.')}

**Notebook saved to**: {result.get('notebook_path')}
"""

        return formatted
```

#### Step 2: Register in ReactAgent

Update `agent/react.py` to include EDA tool:

```python
# In ReactAgent.__init__() after lines 60-62
self._search_tool = SearchTool()
self._fetch_tool = FetchTool()
self._eda_tool = EDATool(model=model)  # Add this

# After line 79, add new @tool wrapper
@tool
async def eda(filepath: str, query: str, max_iterations: int = 7) -> str:
    """Perform exploratory data analysis on dataset. Returns insights and notebook path."""
    self.progress.on_worker_tool_use(
        self.worker_id, "eda", f"Analyzing: {Path(filepath).name}"
    )
    result = await self._eda_tool.execute(
        filepath=filepath,
        query=query,
        max_iterations=max_iterations
    )
    return result.content

# Update line 81
self.tools = [search, fetch, eda]  # Add eda to list
```

**Result**: ReactAgent can now perform EDA during research workflows!

Example usage:
```bash
uv run research research "Analyze customer_churn.csv and identify key churn drivers"

# Agent will:
# 1. Recognize it needs to analyze data
# 2. Call eda tool with filepath and query
# 3. Receive insights back
# 4. Continue research with data-driven findings
# 5. Synthesize final report combining web research + data insights
```

---

### 2. Enable Parallel EDA Execution

#### Problem: Single Kernel Limitation

Current CodeExecutor creates one kernel per agent instance:
- `IterativeEDAAgent.__init__()` → `self.executor = CodeExecutor()` → starts single kernel
- Multiple agents → multiple kernels (OK for parallelization!)

**Good News**: Architecture already supports parallelization via isolated kernel instances!

#### Step 1: Verify Kernel Isolation

Each EDA agent gets own executor:
```python
# In EDATool.execute()
agent = IterativeEDAAgent(model=self.model)  # Line 46
# This creates new CodeExecutor instance with isolated kernel
```

**Test**: Spawn 2 EDA agents with same dataset:
```python
# Both run concurrently without interference
task1 = eda_tool.execute(filepath="data.csv", query="analyze sales trends")
task2 = eda_tool.execute(filepath="data.csv", query="identify outliers")

results = await asyncio.gather(task1, task2)
```

#### Step 2: Add Parallel EDA to Multi-Agent System

Modify LeadResearcher to support data analysis tasks:

**Update** `agent/orchestrator.py`:

```python
# In _create_plan method (line 124), update task creation to include EDA tasks

async def _create_plan(self, state: ResearchState) -> dict[str, Any]:
    """Create research plan with both web research and data analysis tasks."""
    complexity = state["complexity_score"]
    num_workers = 1 if complexity < 0.3 else (3 if complexity < 0.6 else 5)

    # Detect if query involves data analysis
    query_lower = state["query"].lower()
    needs_eda = any(keyword in query_lower for keyword in [
        "dataset", "csv", "data", "analyze", "eda", "explore data"
    ])

    prompt = f"""Decompose this query into {num_workers} focused sub-tasks:

Query: {state['query']}

{"NOTE: This query involves data analysis. Include data exploration tasks." if needs_eda else ""}

Each sub-task should:
- Be independently executable
- Have clear objective
- Specify required tools (search, fetch, eda)
- Minimize overlap

For data analysis tasks, specify:
- filepath: Path to data file
- analysis_goal: What to discover

Return JSON array of tasks.
"""

    # ... rest of implementation
```

**Result**: Orchestrator can now spawn parallel mix of:
- Web research workers (using search/fetch tools)
- Data analysis workers (using eda tool)

---

### 3. Multi-Data Source Support

#### Implementation Plan

**Step 1**: Add DataLoader to project
- Create `src/deep_research/tools/data_loader.py` (code shown above in section 5)
- Add dependencies to `pyproject.toml`:
  ```toml
  dependencies = [
      # ... existing ...
      "openpyxl>=3.1.0",
      "pyarrow>=15.0.0",
  ]
  ```

**Step 2**: Update IterativeEDAAgent to use DataLoader

Replace in `iterative_eda.py`:

```python
# Line 1-2: Add import
from ..tools.data_loader import DataLoader

# Line 98: Replace CSV-only loading
# Old: df = pd.read_csv(filepath)
# New:
df = DataLoader.load(filepath)

# Line 115-125: Update load code generation
# Old: hardcoded pd.read_csv
# New:
load_code = f"""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Set style
sns.set_style('whitegrid')
plt.rcParams['figure.figsize'] = (12, 6)

# Load data
{DataLoader.generate_load_code(filepath)}
print(f"Loaded dataset: {{df.shape[0]}} rows, {{df.shape[1]}} columns")
"""
```

**Step 3**: Update CLI Help Text

```python
# In cli.py:231
@click.argument("filepath", type=click.Path(exists=True))
@click.argument("query")
@click.option("-m", "--model", help="LLM model to use")
@click.option("-o", "--output", help="Output markdown report path")
@click.option("--max-iterations", default=7, help="Max exploration iterations")
def eda(filepath: str, query: str, model: str | None, output: str | None, max_iterations: int) -> None:
    """Generate EDA notebook from dataset.

    Supported formats: CSV, TSV, Excel (.xlsx, .xls), Parquet, Pickle, JSON

    Examples:

        uv run research eda data.csv "predict sales"

        uv run research eda customers.xlsx "segment customers"

        uv run research eda events.parquet "analyze user behavior"
    """
    # ... implementation
```

**Step 4**: Add Format Validation

```python
# In EDATool.execute() before creating agent
try:
    format_type = DataLoader.detect_format(filepath)
    logger.info("eda_format_detected", filepath=filepath, format=format_type)
except ValueError as e:
    return ToolResult(
        success=False,
        content=f"Unsupported file format: {str(e)}",
        metadata={"error": "unsupported_format", "filepath": filepath}
    )
```

---

### 4. Combined Web Research + Data Analysis Workflow

#### Example Use Case

User query: "Analyze sales.csv and compare our trends with industry benchmarks"

**Orchestrator Workflow**:

1. **Analyze Query** → Complexity: 0.7 (high), needs both web + data
2. **Plan** → Generate 5 sub-tasks:
   - Task 1 (EDA): "Analyze sales.csv to identify key trends and patterns"
   - Task 2 (Web): "Research retail industry sales benchmarks 2024"
   - Task 3 (Web): "Find seasonal trends in retail sales"
   - Task 4 (EDA): "Calculate growth rates and anomalies in sales.csv"
   - Task 5 (Web): "Research competitor performance metrics"

3. **Spawn Workers** (parallel execution via Send API):
   - Worker 1: Uses eda tool → analyzes sales.csv → returns insights + notebook
   - Worker 2-5: Use search/fetch tools → web research → return findings

4. **Synthesize** → LLM merges:
   - Data insights from sales.csv analysis
   - Industry benchmark data from web
   - Combined narrative comparing actual vs. benchmarks
   - Recommendations based on both sources

**Implementation** (already works with current architecture!):

```python
# Worker execution node already handles any tool
async def _worker_execution(self, state: dict[str, Any]) -> dict[str, Any]:
    task = state["task"]

    # WorkerAgent has access to all tools (search, fetch, eda)
    worker = WorkerAgent(model=self.model, progress=self.progress, worker_id=task["id"])
    result = await worker.execute(task["objective"])

    # Returns result regardless of which tools were used
    return {
        "worker_results": [{
            "task_id": task["id"],
            "summary": summary,
            "sources": result.sources,  # Web URLs or notebook paths
            "metadata": result.metadata,
        }]
    }
```

**Key Insight**: Once EDA is registered as a tool in ReactAgent (Step 1 above), workers automatically have access to it alongside search/fetch!

---

## Implementation Checklist

### Phase 1: Multi-Format Data Support (Week 1)

- [ ] Create `src/deep_research/tools/data_loader.py` with DataLoader class
- [ ] Add dependencies: `openpyxl>=3.1.0`, `pyarrow>=15.0.0` to pyproject.toml
- [ ] Update `IterativeEDAAgent._load_and_understand()` to use DataLoader
- [ ] Update notebook generation to use format-specific load code
- [ ] Add tests: `tests/test_data_loader.py`
  - Test CSV, Excel, Parquet, Pickle loading
  - Test error handling for unsupported formats
  - Test format detection logic
- [ ] Update CLI help text to document supported formats
- [ ] Update README.md with examples for each format

**Success Criteria**:
- [ ] `uv run research eda data.csv "query"` works
- [ ] `uv run research eda data.xlsx "query"` works
- [ ] `uv run research eda data.parquet "query"` works
- [ ] Error message shown for unsupported formats
- [ ] Generated notebooks use correct pandas reader

### Phase 2: EDA as Tool (Week 2)

- [ ] Create `src/deep_research/tools/eda_tool.py` with EDATool class
- [ ] Implement result formatting for LLM consumption
- [ ] Add EDATool to ReactAgent tool list
- [ ] Create `@tool` wrapper for eda in ReactAgent
- [ ] Add tests: `tests/test_eda_tool.py`
  - Test tool execution with various file formats
  - Test error handling
  - Test result formatting
- [ ] Update system prompts to include EDA tool description
- [ ] Test integration with ReactAgent

**Success Criteria**:
- [ ] ReactAgent can call eda tool during research
- [ ] Tool returns formatted insights to agent
- [ ] Agent can reason about data analysis results
- [ ] Example: "Analyze data.csv and explain trends" completes successfully

### Phase 3: Parallel EDA Execution (Week 3)

- [ ] Verify kernel isolation (each IterativeEDAAgent has own kernel)
- [ ] Test concurrent EDA execution: `asyncio.gather(eda1, eda2)`
- [ ] Add kernel pool if needed (if isolation test fails)
- [ ] Update LeadResearcher planning to detect data analysis needs
- [ ] Add EDA task type to orchestrator
- [ ] Add tests: `tests/test_parallel_eda.py`
  - Test 2+ EDA agents running concurrently
  - Test mixed web + EDA worker execution
  - Test result merging

**Success Criteria**:
- [ ] Multiple EDA analyses can run concurrently without conflicts
- [ ] No kernel crashes or interference
- [ ] Results from parallel executions are correctly merged
- [ ] Performance: 2 parallel EDAs complete in ~1.2x time of 1 EDA (not 2x)

### Phase 4: Integrated Workflows (Week 4)

- [ ] Update orchestrator to create mixed task plans (web + data)
- [ ] Implement synthesis logic for combined insights
- [ ] Add examples: `examples/combined_research_eda.py`
- [ ] Create sample datasets: `deep-research-agent/data/`
  - sales.csv
  - customers.xlsx
  - events.parquet
- [ ] Add end-to-end tests: `tests/test_integrated_workflows.py`
- [ ] Update documentation with combined workflow examples
- [ ] Performance optimization: cache data loading, kernel reuse

**Success Criteria**:
- [ ] Query like "Analyze sales.csv and compare with industry" completes
- [ ] Final report includes both data insights and web research
- [ ] Notebook + markdown report both generated
- [ ] Sources include URLs and notebook paths
- [ ] Total execution time < 3 minutes for typical query

### Phase 5: Polish & Documentation (Week 5)

- [ ] Add comprehensive examples to README
- [ ] Create tutorial: "Building Data-Driven Research Agents"
- [ ] Add CLI examples for each workflow type
- [ ] Performance benchmarks: single vs parallel execution
- [ ] Error handling improvements (better messages)
- [ ] Add progress indicators for long-running EDA
- [ ] Code cleanup and refactoring
- [ ] Security review: ensure AST checks cover all formats

**Success Criteria**:
- [ ] Documentation has clear examples for all use cases
- [ ] New users can run examples without errors
- [ ] Performance meets targets (<3 min for combined queries)
- [ ] No security vulnerabilities in code execution
- [ ] All tests passing with >80% coverage

---

## Code References

### Current Implementation

- **IterativeEDAAgent**: `deep-research-agent/src/deep_research/agent/iterative_eda.py:19-655`
- **DataAgent (simpler version)**: `deep-research-agent/src/deep_research/agent/data_agent.py:16-419`
- **CodeExecutor**: `deep-research-agent/src/deep_research/tools/executor.py:26-103`
- **Tool Base**: `deep-research-agent/src/deep_research/tools/base.py:7-35`
- **SearchTool Example**: `deep-research-agent/src/deep_research/tools/search.py:13-86`
- **ReactAgent**: `deep-research-agent/src/deep_research/agent/react.py:33-241`
- **WorkerAgent**: `deep-research-agent/src/deep_research/agent/worker.py:21-62`
- **LeadResearcher Orchestrator**: `deep-research-agent/src/deep_research/agent/orchestrator.py:39-408`
- **CLI**: `deep-research-agent/src/deep_research/cli.py:68-298`

### Patterns to Follow

**Tool Pattern**: `tools/search.py:13-86`, `tools/fetch.py:13-77`
**LangChain Wrapper**: `agent/react.py:60-85`
**Parallel Execution**: `agent/orchestrator.py:155-184`
**Worker Wrapper**: `agent/worker.py:21-62`
**State Management**: `agent/state.py:7-23`

---

## Historical Context (from thoughts/)

### Relevant Planning Documents

**Deep Research Agent MVP Plan** (`thoughts/shared/plans/deep-research-agent-python-mvp.md`)
- Phase 3 (Week 3) details EDA implementation with notebook generation
- 7-act narrative structure for notebooks
- Jupyter kernel integration patterns
- Code executor safety checks

**Architecture Research** (`thoughts/shared/research/2025-11-15_deep-research-agent-architecture.md`)
- ReAct framework implementation
- LangGraph state management patterns
- Tool suite design
- Notebook generation architecture
- 5-phase implementation plan

### Design Decisions

**Why Not External Sandboxing** (from architecture doc):
- Local Jupyter kernel for privacy
- No API costs (E2B/Modal avoided)
- Full control over execution environment
- Sufficient for MVP with AST safety checks

**Why LangGraph Over Custom Orchestration**:
- Built-in state management and checkpointing
- Send API for dynamic parallelization
- Conditional routing without complex control flow
- State reducers handle result merging automatically

**Why Tool Base Pattern**:
- Consistent interface across all tools
- Easy to test in isolation
- Metadata tracking for observability
- Error handling standardization

---

## Open Questions

### 1. Kernel Resource Management

**Question**: Should we implement kernel pooling for better resource efficiency?

**Current**: Each EDA agent creates new kernel (isolated but resource-heavy)

**Options**:
- **A. Keep current approach**: Simple, isolated, but uses more memory
- **B. Kernel pool**: Reuse kernels across analyses, add cleanup between uses
- **C. Hybrid**: Pool for sequential, isolated for parallel

**Recommendation**: Start with **A** (current), migrate to **B** if memory/startup time becomes bottleneck

### 2. Data Loading Configuration

**Question**: Should we allow custom pandas read options (e.g., CSV delimiter, Excel sheet name)?

**Current**: Uses default pandas options

**Options**:
- **A. Hardcoded defaults**: Simple, works for 90% of cases
- **B. Kwargs passthrough**: `DataLoader.load(path, **pandas_kwargs)`
- **C. Config file**: `.edaconfig.json` with per-file settings

**Recommendation**: Start with **A**, add **B** if users request it

### 3. Notebook Execution Timing

**Question**: When should notebooks be executed - during analysis or on demand?

**Current**: Executed at end of IterativeEDAAgent.analyze()

**Options**:
- **A. Always execute**: Validates code works, adds outputs
- **B. Optional flag**: `--execute/--no-execute`
- **C. Lazy execution**: Generate notebook, let user execute

**Recommendation**: Keep **A** (current), add **B** flag for faster iteration during development

### 4. Result Compression

**Question**: Should EDA results be compressed when used in multi-agent system?

**Current**: WorkerAgent compresses to 2000 tokens

**Options**:
- **A. Compress EDA insights**: Summary only (loses detail)
- **B. Full insights**: Better context, uses more tokens
- **C. Hybrid**: Full insights + notebook path reference

**Recommendation**: Use **C** - include full insight list (usually <5 items) + notebook path for deep dives

### 5. Error Recovery in Parallel Execution

**Question**: What happens if one EDA agent fails during parallel execution?

**Current**: WorkerAgent returns partial result with error in metadata

**Behavior**: Other workers continue, synthesis includes error notice

**Recommendation**: Keep current graceful degradation - better to have partial results than full failure

---

## Related Research

- **Multi-Agent Deep Research Architecture** (`thoughts/shared/research/2025-11-15_multi-agent-deep-research-architecture-v2.md`)
- **Alibaba DeepResearch Gap Analysis** (`thoughts/shared/research/2025-11-16_alibaba-deepresearch-gap-analysis.md`)
- **Deep Research Agent Python MVP** (`thoughts/shared/plans/deep-research-agent-python-mvp.md`)

---

## Next Steps

1. **Immediate** (This Week):
   - Implement DataLoader class
   - Add multi-format support to IterativeEDAAgent
   - Test with CSV, Excel, Parquet files
   - Update CLI help text

2. **Short-term** (Next 2 Weeks):
   - Create EDATool wrapper
   - Register in ReactAgent
   - Test EDA as tool in research workflows
   - Verify parallel execution works

3. **Medium-term** (Next Month):
   - Update orchestrator for mixed workflows
   - Add comprehensive examples
   - Performance optimization
   - Documentation updates

4. **Future Enhancements**:
   - Streaming EDA results (live insights as discovered)
   - Custom EDA templates (beyond 7-act structure)
   - Integration with vector stores (cache insights)
   - Advanced visualizations (interactive plots)

---

## Conclusion

The IterativeEDAAgent can be successfully transformed into a multi-agent tool with:

1. **Minimal architectural changes** - existing patterns (Tool base class, LangGraph Send API) already support the requirements
2. **Clear implementation path** - 5-phase plan with concrete code examples from existing codebase
3. **Strong foundation** - current kernel isolation already enables parallelization
4. **Incremental delivery** - each phase adds standalone value

**Key Insights**:
- **Parallelization already works** - each agent gets isolated kernel
- **Tool pattern is proven** - SearchTool and FetchTool demonstrate the pattern
- **Orchestrator is ready** - Send API generalizes to any worker type (web or data)
- **Multi-format is straightforward** - DataLoader factory pattern handles all pandas formats

**Biggest Wins**:
- **Combined insights**: Web research + data analysis in single query
- **Parallel execution**: 3-5x faster with multiple concurrent analyses
- **Format flexibility**: CSV, Excel, Parquet, Pickle all supported
- **Tool composability**: EDA available to all agents, not just CLI

The architecture is well-designed for these enhancements - implementation is primarily additive rather than refactoring.
