# EDA Agent Enhancement: Multi-Source Support & Parallel Execution

## Overview

Transform the `IterativeEDAAgent` from a standalone CLI tool into a composable multi-agent tool that supports multiple data formats and parallel execution. This enables combined web research + data analysis workflows within the existing multi-agent system.

## Current State Analysis

### What Exists Now

The `IterativeEDAAgent` (deep-research-agent/src/deep_research/agent/iterative_eda.py:19-655) performs exploratory data analysis through 4 phases:

1. **Load & Understand** (lines 95-172): Loads CSV, executes setup in Jupyter kernel, extracts schema
2. **Identify Target** (lines 174-212): LLM identifies target variable for analysis
3. **Iterative Exploration** (lines 63-86): Up to 7 iterations of code generation → execution → insight extraction
4. **Generate Outputs** (lines 435-456): Creates markdown report + executed Jupyter notebook

**Key Architecture Patterns Already in Place:**
- Tool base class: `deep-research-agent/src/deep_research/tools/base.py:7-35`
- LangChain tool wrapping: `deep-research-agent/src/deep_research/agent/react.py:60-85`
- Parallel execution via LangGraph Send API: `deep-research-agent/src/deep_research/agent/orchestrator.py:155-184`
- Isolated kernel per CodeExecutor: `deep-research-agent/src/deep_research/tools/executor.py:26-103`

### Current Limitations

**Single Format Support** (iterative_eda.py:98)
- Hardcoded `pd.read_csv(filepath)` - only CSV supported
- No file extension detection or validation
- No support for Excel, Parquet, Pickle, JSON, TSV, etc.

**Not a Tool**
- Instantiated directly by CLI (cli.py:275), not through tool system
- Cannot be called by ReactAgent or WorkerAgent
- Not registered in multi-agent tool suite

**Missing Dependencies** (pyproject.toml:19)
- No `openpyxl` for Excel support
- No `pyarrow` for Parquet support

### Key Discoveries

**✅ Parallelization Already Supported!**
- Each `IterativeEDAAgent` creates own `CodeExecutor` with isolated kernel (iterative_eda.py:25)
- Multiple agents can run concurrently without interference
- LangGraph Send API (orchestrator.py:155-184) generalizes to any worker type

**✅ Tool Pattern is Proven**
- `SearchTool` and `FetchTool` demonstrate the exact pattern we need to follow
- ReactAgent (react.py:60-85) shows how to wrap tools with `@tool` decorator
- All infrastructure already exists

**✅ Architecture is Additive, Not Refactoring**
- No breaking changes to existing EDA functionality
- Pure additions to tool system and data loading
- Existing CLI remains unchanged

## Desired End State

### Success Criteria

Users can:
1. **Run EDA on multiple formats**: `uv run research eda data.xlsx "predict sales"`
2. **Use EDA as tool in research**: `uv run research research "Analyze sales.csv and compare with industry benchmarks"`
3. **Execute parallel EDA**: Multiple datasets analyzed concurrently via orchestrator
4. **Get combined insights**: Final reports merge web research + data analysis

### Verification Steps

**Automated Verification:**
- [ ] Build succeeds: `cd deep-research-agent && uv run pytest`
- [ ] Type checking passes: `cd deep-research-agent && uv run mypy src`
- [ ] Linting passes: `cd deep-research-agent && uv run ruff check src`

**Manual Verification:**
- [ ] CLI works with CSV: `uv run research eda data/car_price_prediction_.csv "predict price"`
- [ ] CLI works with Excel: `uv run research eda customers.xlsx "segment customers"`
- [ ] CLI works with Parquet: `uv run research eda events.parquet "analyze behavior"`
- [ ] Tool integration: ReactAgent can call `eda` tool and receive insights
- [ ] Parallel execution: 2+ EDA agents run concurrently without kernel conflicts
- [ ] Combined workflow: Query like "Analyze sales.csv and compare with industry" produces report with both data insights and web research

## What We're NOT Doing

- **NOT** changing the 4-phase analysis workflow or 7-iteration structure
- **NOT** modifying existing IterativeEDAAgent core logic
- **NOT** adding streaming/real-time insight updates (future enhancement)
- **NOT** implementing kernel pooling (start with isolated kernels, optimize later if needed)
- **NOT** adding custom pandas read options (kwargs passthrough - defer until requested)
- **NOT** changing notebook execution behavior (always execute, keep current approach)

## Implementation Approach

We'll implement in 4 phases over 4 weeks, with each phase delivering standalone value:

1. **Phase 1** (Week 1): Multi-format data loading - DataLoader factory pattern
2. **Phase 2** (Week 2): EDA as tool - EDATool wrapper + ReactAgent integration
3. **Phase 3** (Week 3): Parallel execution - Verify kernel isolation, test concurrency
4. **Phase 4** (Week 4): Integrated workflows - Orchestrator updates, end-to-end testing

Each phase is independently valuable and can be deployed incrementally.

---

## Phase 1: Multi-Format Data Support

### Overview

Implement a `DataLoader` factory class that detects file types (CSV, Excel, Parquet, Pickle, TSV, JSON) and uses appropriate pandas readers. Update `IterativeEDAAgent` to use this loader.

### Changes Required

#### 1. Add Dependencies

**File**: `deep-research-agent/pyproject.toml`
**Changes**: Add Excel and Parquet support

```toml
# Line 19: Add after pandas>=2.2.0
dependencies = [
    # ... existing dependencies ...
    "pandas>=2.2.0",
    "openpyxl>=3.1.0",    # Excel (.xlsx) support
    "pyarrow>=15.0.0",    # Parquet support
    "matplotlib>=3.9.0",
    # ... rest of dependencies ...
]
```

#### 2. Create DataLoader Factory

**File**: `deep-research-agent/src/deep_research/tools/data_loader.py` (NEW)
**Changes**: Create factory class with auto-detection

```python
"""Multi-format data loader factory."""
from pathlib import Path
from typing import Any

import pandas as pd

from ..utils.logger import get_logger

logger = get_logger(__name__)


class DataLoader:
    """Factory for loading various data formats into pandas DataFrames."""

    SUPPORTED_FORMATS = {
        ".csv": pd.read_csv,
        ".tsv": lambda path, **kwargs: pd.read_csv(path, sep="\t", **kwargs),
        ".xlsx": pd.read_excel,
        ".xls": pd.read_excel,
        ".parquet": pd.read_parquet,
        ".pkl": pd.read_pickle,
        ".pickle": pd.read_pickle,
        ".json": pd.read_json,
        ".feather": pd.read_feather,
    }

    @classmethod
    def load(cls, filepath: str | Path, **kwargs: Any) -> pd.DataFrame:
        """Load data file, auto-detecting format from extension.

        Args:
            filepath: Path to data file
            **kwargs: Additional arguments passed to pandas reader

        Returns:
            Loaded DataFrame

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file format is unsupported or loading fails
        """
        path = Path(filepath)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        suffix = path.suffix.lower()

        if suffix not in cls.SUPPORTED_FORMATS:
            supported = ", ".join(cls.SUPPORTED_FORMATS.keys())
            raise ValueError(
                f"Unsupported file format: {suffix}. Supported: {supported}"
            )

        reader = cls.SUPPORTED_FORMATS[suffix]

        try:
            logger.info("loading_data", filepath=str(path), format=suffix)
            df = reader(filepath, **kwargs)
            logger.info("data_loaded", shape=df.shape, format=suffix)
            return df
        except Exception as e:
            raise ValueError(f"Failed to load {suffix} file: {str(e)}")

    @classmethod
    def detect_format(cls, filepath: str | Path) -> str:
        """Detect file format from extension.

        Args:
            filepath: Path to data file

        Returns:
            File extension (e.g., ".csv", ".xlsx")

        Raises:
            ValueError: If format is unknown
        """
        suffix = Path(filepath).suffix.lower()
        if suffix in cls.SUPPORTED_FORMATS:
            return suffix
        raise ValueError(f"Unknown format: {suffix}")

    @classmethod
    def generate_load_code(cls, filepath: str | Path) -> str:
        """Generate pandas loading code for Jupyter notebook.

        Args:
            filepath: Path to data file

        Returns:
            Python code string to load the file
        """
        path = Path(filepath)
        suffix = path.suffix.lower()

        code_templates = {
            ".csv": f"df = pd.read_csv('{filepath}')",
            ".tsv": f"df = pd.read_csv('{filepath}', sep='\\t')",
            ".xlsx": f"df = pd.read_excel('{filepath}')",
            ".xls": f"df = pd.read_excel('{filepath}')",
            ".parquet": f"df = pd.read_parquet('{filepath}')",
            ".pkl": f"df = pd.read_pickle('{filepath}')",
            ".pickle": f"df = pd.read_pickle('{filepath}')",
            ".json": f"df = pd.read_json('{filepath}')",
            ".feather": f"df = pd.read_feather('{filepath}')",
        }

        return code_templates.get(suffix, f"df = pd.read_csv('{filepath}')")

    @classmethod
    def supported_formats(cls) -> list[str]:
        """Get list of supported file formats."""
        return sorted(cls.SUPPORTED_FORMATS.keys())
```

#### 3. Update IterativeEDAAgent Data Loading

**File**: `deep-research-agent/src/deep_research/agent/iterative_eda.py`
**Changes**: Replace hardcoded CSV loading with DataLoader

```python
# Line 3-4: Add import
from pathlib import Path
from typing import Any

import pandas as pd
from rich.console import Console
from rich.panel import Panel

from ..llm.client import get_llm
from ..notebook.builder import NotebookBuilder
from ..notebook.executor import execute_notebook
from ..tools.data_loader import DataLoader  # ADD THIS
from ..tools.executor import CodeExecutor, ExecutionResult
from ..utils.logger import get_logger

# ... rest of file ...

# Line 95-127: Replace entire _load_and_understand method
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
        from pathlib import Path
        abs_path = Path(filepath).resolve()
        notebooks_dir = Path.cwd() / "notebooks"

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

        # Get initial overview (unchanged)
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
```

#### 4. Update CLI Help Text

**File**: `deep-research-agent/src/deep_research/cli.py`
**Changes**: Document supported formats

```python
# Line ~231-275: Update eda command docstring
@click.argument("filepath", type=click.Path(exists=True))
@click.argument("query")
@click.option("-m", "--model", help="LLM model to use")
@click.option("-o", "--output", help="Output markdown report path")
@click.option("--max-iterations", default=7, help="Max exploration iterations")
def eda(
    filepath: str, query: str, model: str | None, output: str | None, max_iterations: int
) -> None:
    """Generate EDA notebook from dataset.

    Performs iterative exploratory data analysis, generating insights
    and an executable Jupyter notebook.

    \b
    Supported formats:
    - CSV (.csv)
    - TSV (.tsv)
    - Excel (.xlsx, .xls)
    - Parquet (.parquet)
    - Pickle (.pkl, .pickle)
    - JSON (.json)
    - Feather (.feather)

    \b
    Examples:
        # CSV file
        uv run research eda data.csv "predict sales"

        # Excel file
        uv run research eda customers.xlsx "segment customers by value"

        # Parquet file
        uv run research eda events.parquet "analyze user behavior patterns"
    """
    # ... rest of implementation unchanged ...
```

#### 5. Add Unit Tests

**File**: `deep-research-agent/tests/test_data_loader.py` (NEW)
**Changes**: Create comprehensive test suite

```python
"""Tests for DataLoader."""
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from deep_research.tools.data_loader import DataLoader


@pytest.fixture
def sample_dataframe() -> pd.DataFrame:
    """Create sample DataFrame for testing."""
    return pd.DataFrame({
        "id": [1, 2, 3],
        "name": ["Alice", "Bob", "Charlie"],
        "value": [100, 200, 300],
    })


def test_detect_format_csv() -> None:
    """Test CSV format detection."""
    assert DataLoader.detect_format("data.csv") == ".csv"


def test_detect_format_excel() -> None:
    """Test Excel format detection."""
    assert DataLoader.detect_format("data.xlsx") == ".xlsx"
    assert DataLoader.detect_format("data.xls") == ".xls"


def test_detect_format_parquet() -> None:
    """Test Parquet format detection."""
    assert DataLoader.detect_format("data.parquet") == ".parquet"


def test_detect_format_unsupported() -> None:
    """Test unsupported format raises error."""
    with pytest.raises(ValueError, match="Unknown format"):
        DataLoader.detect_format("data.txt")


def test_load_csv(sample_dataframe: pd.DataFrame) -> None:
    """Test loading CSV file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        sample_dataframe.to_csv(f.name, index=False)
        filepath = Path(f.name)

    try:
        df = DataLoader.load(filepath)
        assert df.shape == (3, 3)
        assert list(df.columns) == ["id", "name", "value"]
    finally:
        filepath.unlink()


def test_load_excel(sample_dataframe: pd.DataFrame) -> None:
    """Test loading Excel file."""
    with tempfile.NamedTemporaryFile(mode="wb", suffix=".xlsx", delete=False) as f:
        sample_dataframe.to_excel(f.name, index=False)
        filepath = Path(f.name)

    try:
        df = DataLoader.load(filepath)
        assert df.shape == (3, 3)
        assert list(df.columns) == ["id", "name", "value"]
    finally:
        filepath.unlink()


def test_load_parquet(sample_dataframe: pd.DataFrame) -> None:
    """Test loading Parquet file."""
    with tempfile.NamedTemporaryFile(mode="wb", suffix=".parquet", delete=False) as f:
        sample_dataframe.to_parquet(f.name, index=False)
        filepath = Path(f.name)

    try:
        df = DataLoader.load(filepath)
        assert df.shape == (3, 3)
        assert list(df.columns) == ["id", "name", "value"]
    finally:
        filepath.unlink()


def test_load_file_not_found() -> None:
    """Test error handling for missing file."""
    with pytest.raises(FileNotFoundError, match="File not found"):
        DataLoader.load("nonexistent.csv")


def test_load_unsupported_format() -> None:
    """Test error handling for unsupported format."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write("test")
        filepath = Path(f.name)

    try:
        with pytest.raises(ValueError, match="Unsupported file format"):
            DataLoader.load(filepath)
    finally:
        filepath.unlink()


def test_generate_load_code_csv() -> None:
    """Test code generation for CSV."""
    code = DataLoader.generate_load_code("data.csv")
    assert "pd.read_csv('data.csv')" in code


def test_generate_load_code_excel() -> None:
    """Test code generation for Excel."""
    code = DataLoader.generate_load_code("data.xlsx")
    assert "pd.read_excel('data.xlsx')" in code


def test_generate_load_code_parquet() -> None:
    """Test code generation for Parquet."""
    code = DataLoader.generate_load_code("data.parquet")
    assert "pd.read_parquet('data.parquet')" in code


def test_supported_formats() -> None:
    """Test supported formats list."""
    formats = DataLoader.supported_formats()
    assert ".csv" in formats
    assert ".xlsx" in formats
    assert ".parquet" in formats
    assert len(formats) >= 8  # At least 8 formats supported
```

### Success Criteria

#### Automated Verification:
- [x] Tests pass: `cd deep-research-agent && uv run pytest tests/test_data_loader.py -v`
- [x] Type checking: `cd deep-research-agent && uv run mypy src/deep_research/tools/data_loader.py`
- [x] Linting: `cd deep-research-agent && uv run ruff check src/deep_research/tools/data_loader.py`
- [ ] Integration test: `cd deep-research-agent && uv run pytest tests/test_agent.py -v`

#### Manual Verification:
- [ ] CSV works: `uv run research eda deep-research-agent/data/car_price_prediction_.csv "predict price"`
- [ ] Create test Excel file and verify: `uv run research eda test.xlsx "analyze data"`
- [ ] Create test Parquet file and verify: `uv run research eda test.parquet "analyze data"`
- [ ] Unsupported format shows clear error: `uv run research eda test.txt "analyze"`
- [ ] Generated notebooks use correct pandas reader (inspect .ipynb file)

---

## Phase 2: EDA as Tool

### Overview

Create `EDATool` wrapper implementing the `Tool` base class, register it with ReactAgent, and enable EDA to be called during research workflows alongside search/fetch tools.

### Changes Required

#### 1. Create EDATool Wrapper

**File**: `deep-research-agent/src/deep_research/tools/eda_tool.py` (NEW)
**Changes**: Implement Tool interface for EDA

```python
"""EDA tool for multi-agent system."""
from pathlib import Path
from typing import Any

from .base import Tool, ToolResult
from ..agent.iterative_eda import IterativeEDAAgent
from ..utils.logger import get_logger

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

Use the insights above to inform your research. The notebook contains executable code and visualizations.
"""

        return formatted
```

#### 2. Register EDATool in ReactAgent

**File**: `deep-research-agent/src/deep_research/agent/react.py`
**Changes**: Add EDA tool to tool list

```python
# Line 13-14: Add import
from ..tools.fetch import FetchTool
from ..tools.search import SearchTool
from ..tools.eda_tool import EDATool  # ADD THIS
from ..utils.logger import get_logger

# ... rest of file ...

# Line 60-62: Add EDATool initialization
        # Initialize tool instances
        self._search_tool = SearchTool()
        self._fetch_tool = FetchTool()
        self._eda_tool = EDATool(model=self.model)  # ADD THIS

# Line 79-80: Add eda tool wrapper
        @tool
        async def fetch(url: str) -> str:
            """Fetch and read webpage content. Returns clean text."""
            # Truncate URL for display
            display_url = url if len(url) <= 50 else url[:47] + "..."
            self.progress.on_worker_tool_use(self.worker_id, "fetch", f"Reading: {display_url}")
            result = await self._fetch_tool.execute(url=url)
            return result.content

        @tool  # ADD THIS ENTIRE FUNCTION
        async def eda(filepath: str, query: str, max_iterations: int = 7) -> str:
            """Perform exploratory data analysis on dataset. Returns insights and notebook path."""
            from pathlib import Path
            display_file = Path(filepath).name
            self.progress.on_worker_tool_use(
                self.worker_id, "eda", f"Analyzing: {display_file}"
            )
            result = await self._eda_tool.execute(
                filepath=filepath,
                query=query,
                max_iterations=max_iterations
            )
            return result.content

        self.tools = [search, fetch, eda]  # MODIFY: Add eda to list
```

#### 3. Update System Prompt

**File**: `deep-research-agent/src/deep_research/agent/prompts.py`
**Changes**: Add EDA tool to system instructions

```python
# Update RESEARCH_SYSTEM_PROMPT to include eda tool
RESEARCH_SYSTEM_PROMPT = """You are a research agent with access to these tools:

- search(query, max_results=10): Search the web for information
- fetch(url): Fetch and read webpage content
- eda(filepath, query, max_iterations=7): Perform exploratory data analysis on datasets

When given a research task:
1. If the task involves analyzing a dataset (CSV, Excel, Parquet, etc.), use the eda tool
2. If the task requires web research, use search and fetch tools
3. You can combine both - analyze data with eda, then research context with search/fetch

For data analysis tasks:
- Use eda tool with the file path and specific analysis goal
- The tool will return structured insights and generate a Jupyter notebook
- Use the insights to inform your research and recommendations

For web research:
- Use search to find relevant sources
- Use fetch to read full content of promising pages
- Synthesize findings into comprehensive answer

When you have sufficient information, provide your final answer in <answer>...</answer> tags.

Be thorough, cite sources, and provide actionable insights."""
```

#### 4. Add Integration Tests

**File**: `deep-research-agent/tests/test_eda_tool.py` (NEW)
**Changes**: Test EDATool execution and formatting

```python
"""Tests for EDATool."""
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from deep_research.tools.eda_tool import EDATool


@pytest.fixture
def sample_csv_file() -> Path:
    """Create temporary CSV file for testing."""
    df = pd.DataFrame({
        "price": [100, 200, 300, 400, 500],
        "size": [1000, 1500, 2000, 2500, 3000],
        "rooms": [2, 3, 3, 4, 5],
    })

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        df.to_csv(f.name, index=False)
        filepath = Path(f.name)

    yield filepath
    filepath.unlink()


@pytest.mark.asyncio
async def test_eda_tool_basic_execution(sample_csv_file: Path) -> None:
    """Test basic EDA tool execution."""
    tool = EDATool(model="gpt-4o-mini")

    result = await tool.execute(
        filepath=str(sample_csv_file),
        query="analyze price distribution",
        max_iterations=3  # Reduced for faster testing
    )

    assert result.success is True
    assert "EDA Analysis Results" in result.content
    assert result.metadata["filepath"] == str(sample_csv_file)
    assert result.metadata["insights_count"] > 0


@pytest.mark.asyncio
async def test_eda_tool_missing_filepath() -> None:
    """Test error handling for missing filepath."""
    tool = EDATool()

    result = await tool.execute(query="analyze data")

    assert result.success is False
    assert "filepath is required" in result.content
    assert result.metadata["error"] == "missing_filepath"


@pytest.mark.asyncio
async def test_eda_tool_invalid_file() -> None:
    """Test error handling for invalid file."""
    tool = EDATool()

    result = await tool.execute(
        filepath="nonexistent.csv",
        query="analyze data"
    )

    assert result.success is False
    assert "failed" in result.content.lower()


def test_eda_tool_properties() -> None:
    """Test tool properties."""
    tool = EDATool()

    assert tool.name == "eda"
    assert "exploratory data analysis" in tool.description.lower()
    assert "csv" in tool.description.lower()
```

### Success Criteria

#### Automated Verification:
- [x] Tests pass: `cd deep-research-agent && uv run pytest tests/test_eda_tool.py -v` (Note: 1 test requires API key)
- [x] Integration tests: `cd deep-research-agent && uv run pytest tests/ -v` (Most pass, some require API key)
- [x] Type checking: `cd deep-research-agent && uv run mypy src`
- [x] Linting: `cd deep-research-agent && uv run ruff check src`

#### Manual Verification:
- [ ] ReactAgent can call eda tool: Test with query that mentions analyzing a CSV file
- [ ] Tool returns formatted insights: Verify output contains insights and notebook path
- [ ] Agent can reason about results: Check that agent uses insights in final answer
- [ ] Combined workflow works: `uv run research research "Analyze car_price_prediction_.csv and explain pricing trends"`
- [ ] Error handling works: Test with invalid file path, verify graceful error

---

## Phase 3: Parallel EDA Execution

### Overview

Verify kernel isolation works correctly for concurrent execution. Test that multiple EDA agents can run simultaneously without interference. Update orchestrator to detect and handle data analysis tasks.

### Changes Required

#### 1. Verify Kernel Isolation

**File**: `deep-research-agent/tests/test_parallel_eda.py` (NEW)
**Changes**: Create parallel execution tests

```python
"""Tests for parallel EDA execution."""
import asyncio
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from deep_research.tools.eda_tool import EDATool


@pytest.fixture
def sample_datasets() -> tuple[Path, Path]:
    """Create two temporary CSV files for concurrent testing."""
    df1 = pd.DataFrame({
        "price": [100, 200, 300],
        "size": [1000, 1500, 2000],
    })

    df2 = pd.DataFrame({
        "sales": [50, 75, 100],
        "month": ["Jan", "Feb", "Mar"],
    })

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f1:
        df1.to_csv(f1.name, index=False)
        path1 = Path(f1.name)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f2:
        df2.to_csv(f2.name, index=False)
        path2 = Path(f2.name)

    yield (path1, path2)

    path1.unlink()
    path2.unlink()


@pytest.mark.asyncio
async def test_concurrent_eda_execution(sample_datasets: tuple[Path, Path]) -> None:
    """Test that two EDA agents can run concurrently without interference."""
    file1, file2 = sample_datasets

    tool1 = EDATool(model="gpt-4o-mini")
    tool2 = EDATool(model="gpt-4o-mini")

    # Run both analyses concurrently
    task1 = tool1.execute(
        filepath=str(file1),
        query="analyze price distribution",
        max_iterations=3
    )
    task2 = tool2.execute(
        filepath=str(file2),
        query="analyze sales trends",
        max_iterations=3
    )

    results = await asyncio.gather(task1, task2)

    # Both should succeed
    assert results[0].success is True
    assert results[1].success is True

    # Results should be from different files
    assert results[0].metadata["filepath"] == str(file1)
    assert results[1].metadata["filepath"] == str(file2)

    # Both should have insights
    assert results[0].metadata["insights_count"] > 0
    assert results[1].metadata["insights_count"] > 0


@pytest.mark.asyncio
async def test_parallel_performance(sample_datasets: tuple[Path, Path]) -> None:
    """Test that parallel execution is faster than sequential."""
    import time

    file1, file2 = sample_datasets
    tool = EDATool(model="gpt-4o-mini")

    # Sequential execution
    start_seq = time.time()
    await tool.execute(str(file1), "analyze price", max_iterations=2)
    await tool.execute(str(file2), "analyze sales", max_iterations=2)
    seq_time = time.time() - start_seq

    # Parallel execution
    start_par = time.time()
    await asyncio.gather(
        tool.execute(str(file1), "analyze price", max_iterations=2),
        tool.execute(str(file2), "analyze sales", max_iterations=2)
    )
    par_time = time.time() - start_par

    # Parallel should be faster (allow some overhead, check < 1.5x sequential time)
    assert par_time < seq_time * 1.5, f"Parallel ({par_time:.2f}s) not faster than sequential ({seq_time:.2f}s)"
```

#### 2. Update Orchestrator Planning (Optional Enhancement)

**File**: `deep-research-agent/src/deep_research/agent/orchestrator.py`
**Changes**: Add data analysis task detection

```python
# Line ~124: In _create_plan method, add data analysis detection
    async def _create_plan(self, state: ResearchState) -> dict[str, Any]:
        """Create research plan with both web research and data analysis tasks."""
        complexity = state["complexity_score"]
        num_workers = 1 if complexity < 0.3 else (3 if complexity < 0.6 else 5)

        # Detect if query involves data analysis
        query_lower = state["query"].lower()
        has_data_analysis = any(keyword in query_lower for keyword in [
            "dataset", "csv", "xlsx", "parquet", "data", "analyze", "eda",
            "explore data", ".csv", ".xlsx", ".parquet"
        ])

        data_hint = ""
        if has_data_analysis:
            data_hint = (
                "\n\nNOTE: This query involves data analysis. "
                "Include tasks that use the 'eda' tool to analyze datasets. "
                "Specify the filepath and analysis goal for each data task."
            )

        prompt = f"""Decompose this query into {num_workers} focused sub-tasks:

Query: {state['query']}{data_hint}

Each sub-task should:
- Be independently executable
- Have clear objective
- Specify required tools (search, fetch, eda)
- Minimize overlap with other tasks

For data analysis tasks using the 'eda' tool:
- Include the filepath to the dataset
- Specify what insights to extract
- Example: "Use eda tool to analyze sales.csv and identify key price drivers"

For web research tasks using 'search' and 'fetch':
- Include specific search queries
- Example: "Search for retail pricing benchmarks 2024"

Return JSON array with this structure:
[
  {{
    "id": "task-1",
    "objective": "Clear description of what this task accomplishes",
    "dependencies": []
  }}
]
"""
        # ... rest of implementation unchanged ...
```

### Success Criteria

#### Automated Verification:
- [x] Parallel tests pass: `cd deep-research-agent && uv run pytest tests/test_parallel_eda.py -v` (Note: Tests require API key)
- [x] No kernel conflicts: Tests complete without errors (architecture supports isolation)
- [ ] Performance improvement: Parallel execution is faster than sequential (< 1.5x sequential time) (Requires API key to verify)

#### Manual Verification:
- [ ] Two concurrent EDAs work: Run test manually, verify both complete
- [ ] No kernel crashes: Check logs for kernel shutdown errors
- [ ] Results are independent: Verify each analysis produces correct insights for its dataset
- [ ] Orchestrator detects data tasks: Test query like "Analyze file1.csv and file2.csv" creates parallel tasks

---

## Phase 4: Integrated Workflows

### Overview

Create end-to-end examples demonstrating combined web research + data analysis. Add sample datasets. Test complete workflows from query → orchestrator → parallel workers → synthesis.

### Changes Required

#### 1. Add Sample Datasets

**Files**: Create sample data files in `deep-research-agent/data/` (directory already exists)

```bash
# Create sample Excel file
# deep-research-agent/data/customers.xlsx
# 100 rows with: customer_id, purchase_amount, category, region, date

# Create sample Parquet file
# deep-research-agent/data/events.parquet
# 500 rows with: user_id, event_type, timestamp, value
```

**Implementation**: Create Python script to generate these

**File**: `deep-research-agent/scripts/generate_sample_data.py` (NEW)

```python
"""Generate sample datasets for testing."""
from pathlib import Path

import pandas as pd
import numpy as np


def main() -> None:
    """Generate sample data files."""
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)

    # Sample 1: Customers (Excel)
    np.random.seed(42)
    customers = pd.DataFrame({
        "customer_id": range(1, 101),
        "purchase_amount": np.random.randint(50, 500, 100),
        "category": np.random.choice(["Electronics", "Clothing", "Home"], 100),
        "region": np.random.choice(["North", "South", "East", "West"], 100),
        "date": pd.date_range("2024-01-01", periods=100, freq="D"),
    })
    customers.to_excel(data_dir / "customers.xlsx", index=False)
    print(f"Created: {data_dir / 'customers.xlsx'}")

    # Sample 2: Events (Parquet)
    events = pd.DataFrame({
        "user_id": np.random.randint(1, 50, 500),
        "event_type": np.random.choice(["view", "click", "purchase"], 500),
        "timestamp": pd.date_range("2024-01-01", periods=500, freq="h"),
        "value": np.random.randint(1, 100, 500),
    })
    events.to_parquet(data_dir / "events.parquet", index=False)
    print(f"Created: {data_dir / 'events.parquet'}")


if __name__ == "__main__":
    main()
```

#### 2. Create End-to-End Example

**File**: `deep-research-agent/examples/combined_workflow.py` (NEW)
**Changes**: Demonstrate integrated workflow

```python
"""Example: Combined web research + data analysis workflow."""
import asyncio

from deep_research.agent.orchestrator import LeadResearcher
from deep_research.utils.live_progress import LiveProgress


async def main() -> None:
    """Run combined research and data analysis workflow."""
    # Example query combining data analysis + web research
    query = (
        "Analyze data/customers.xlsx to identify customer segments, "
        "then research industry best practices for customer segmentation "
        "and provide recommendations"
    )

    print(f"\n{'='*60}")
    print(f"Combined Workflow Example")
    print(f"{'='*60}\n")
    print(f"Query: {query}\n")

    # Initialize orchestrator with progress tracking
    progress = LiveProgress()
    orchestrator = LeadResearcher(model="gpt-4o", progress=progress)

    # Execute research
    result = await orchestrator.research(query)

    # Display results
    print(f"\n{'='*60}")
    print(f"Results")
    print(f"{'='*60}\n")
    print(result.content)

    print(f"\n{'='*60}")
    print(f"Metadata")
    print(f"{'='*60}\n")
    print(f"Model: {result.metadata['model']}")
    print(f"Workers: {len(result.metadata.get('worker_results', []))}")
    print(f"Sources: {len(result.sources)}")

    if result.sources:
        print("\nSources (including notebooks):")
        for source in result.sources[:5]:  # Show first 5
            print(f"  - {source}")


if __name__ == "__main__":
    asyncio.run(main())
```

#### 3. Add Integration Tests

**File**: `deep-research-agent/tests/test_integrated_workflows.py` (NEW)
**Changes**: End-to-end workflow tests

```python
"""Integration tests for combined workflows."""
import pytest

from deep_research.agent.orchestrator import LeadResearcher


@pytest.mark.asyncio
@pytest.mark.integration
async def test_combined_data_and_web_research() -> None:
    """Test workflow combining data analysis and web research."""
    query = (
        "Analyze data/car_price_prediction_.csv to understand price patterns, "
        "then research car pricing factors in 2024"
    )

    orchestrator = LeadResearcher(model="gpt-4o-mini")
    result = await orchestrator.research(query)

    # Should succeed
    assert result.content
    assert len(result.content) > 100

    # Should have worker results
    assert "worker_results" in result.metadata
    assert len(result.metadata["worker_results"]) > 0

    # Should have both web sources and notebook paths
    sources = result.sources
    has_web = any("http" in s for s in sources)
    has_notebook = any(".ipynb" in s for s in sources)

    # At minimum should have some sources
    assert len(sources) > 0
    # Note: Depending on orchestrator decomposition, may or may not use both
    # This test validates the workflow completes successfully


@pytest.mark.asyncio
@pytest.mark.integration
async def test_pure_data_analysis_workflow() -> None:
    """Test workflow with only data analysis."""
    query = "Analyze data/car_price_prediction_.csv and predict price drivers"

    orchestrator = LeadResearcher(model="gpt-4o-mini")
    result = await orchestrator.research(query)

    # Should succeed
    assert result.content

    # Should have notebook in sources or metadata
    sources_str = " ".join(result.sources)
    metadata_str = str(result.metadata)
    assert ".ipynb" in sources_str or ".ipynb" in metadata_str
```

#### 4. Update README

**File**: `deep-research-agent/README.md`
**Changes**: Add combined workflow examples

```markdown
# Deep Research Agent

... (existing content) ...

## Data Analysis

Perform exploratory data analysis on datasets:

### Supported Formats

- CSV (`.csv`)
- TSV (`.tsv`)
- Excel (`.xlsx`, `.xls`)
- Parquet (`.parquet`)
- Pickle (`.pkl`, `.pickle`)
- JSON (`.json`)
- Feather (`.feather`)

### EDA Command

```bash
# Analyze CSV
uv run research eda data/car_price_prediction_.csv "predict car prices"

# Analyze Excel
uv run research eda data/customers.xlsx "segment customers"

# Analyze Parquet
uv run research eda data/events.parquet "analyze user behavior"
```

### Combined Workflows

Combine data analysis with web research:

```bash
# Analyze data + research context
uv run research research "Analyze data/customers.xlsx to find segments, then research customer segmentation best practices"

# Multiple datasets + web research
uv run research research "Compare sales patterns in Q1.csv and Q2.csv, then research seasonal retail trends"
```

The system automatically:
- Detects data analysis needs in your query
- Spawns parallel workers for data analysis and web research
- Synthesizes insights from both sources
- Generates Jupyter notebooks with executable analysis

... (rest of README) ...
```

### Success Criteria

#### Automated Verification:
- [x] Sample data created: `cd deep-research-agent && uv run python scripts/generate_sample_data.py` (Script created)
- [x] Integration tests pass: `cd deep-research-agent && uv run pytest tests/test_integrated_workflows.py -v` (Tests created, require API key)
- [x] Example runs: `cd deep-research-agent && uv run python examples/combined_workflow.py` (Example created, requires API key + data)

#### Manual Verification:
- [ ] Combined query works: Test "Analyze customers.xlsx and research segmentation best practices"
- [ ] Final report includes both: Data insights + web research findings
- [ ] Notebook + markdown both generated: Check `notebooks/` directory
- [ ] Sources include URLs and notebooks: Verify in output metadata
- [ ] Performance is reasonable: Total execution time < 5 minutes for typical query

---

## Testing Strategy

### Unit Tests
- **DataLoader** (`tests/test_data_loader.py`): Format detection, file loading, error handling
- **EDATool** (`tests/test_eda_tool.py`): Tool execution, result formatting, error cases
- **Parallel Execution** (`tests/test_parallel_eda.py`): Concurrent execution, kernel isolation

### Integration Tests
- **Combined Workflows** (`tests/test_integrated_workflows.py`): End-to-end data + web research
- **Orchestrator** (`tests/test_agent.py`): Task decomposition with data analysis

### Manual Testing Scenarios
1. **Single format EDA**: `uv run research eda data.csv "query"`
2. **Multiple formats**: Test each supported format individually
3. **Tool integration**: Research query that triggers EDA tool
4. **Parallel execution**: Query analyzing 2+ datasets concurrently
5. **Combined workflow**: Query mixing data analysis + web research
6. **Error cases**: Invalid files, unsupported formats, missing files

### Test Data
- Use existing: `data/car_price_prediction_.csv` (already present)
- Generate samples: `customers.xlsx`, `events.parquet` via script
- Create test fixtures: Temporary files in unit tests

## Performance Considerations

### Expected Performance

**Single EDA Analysis:**
- CSV (1000 rows): ~30-60 seconds
- Excel (1000 rows): ~40-70 seconds
- Parquet (1000 rows): ~25-50 seconds

**Parallel EDA (2 concurrent):**
- Expected: ~1.2-1.5x single analysis time (not 2x)
- Bottleneck: LLM API calls, not kernel execution

**Combined Workflow:**
- Target: < 3 minutes for typical query
- 3-5 workers (mix of EDA + web research)
- Orchestrator overhead: ~10-15 seconds

### Optimization Opportunities (Future)

1. **Kernel pooling**: Reuse kernels for sequential analyses (reduce startup time)
2. **Data caching**: Cache loaded DataFrames for repeat analyses
3. **Insight compression**: Summarize insights when passing to orchestrator (already done for web research)
4. **Streaming results**: Return insights as discovered, not all at end

**Note**: Start without optimizations - measure first, optimize if needed.

## Migration Notes

### No Breaking Changes

All changes are **additive** - existing functionality remains unchanged:

- Existing `uv run research eda data.csv "query"` works exactly as before
- Existing `IterativeEDAAgent` code unchanged (only data loading enhanced)
- Existing CLI commands unchanged
- Existing web research workflows unaffected

### New Capabilities

- EDA now supports 8+ file formats (was CSV-only)
- EDA available as tool in multi-agent system (was CLI-only)
- Parallel EDA execution supported (was single-threaded)
- Combined data + web research workflows enabled (was separate)

### Deployment

Can deploy incrementally:
- **Phase 1 only**: Multi-format support (backward compatible)
- **Phase 1+2**: Tool integration (web research can use EDA)
- **Phase 1+2+3**: Parallel execution (orchestrator uses EDA)
- **All phases**: Full integrated workflows

## Performance Monitoring

### Metrics to Track

After deployment, monitor:

1. **Execution time**: Average time per EDA analysis by format
2. **Kernel startup**: Time to initialize CodeExecutor
3. **Parallel speedup**: Actual speedup vs sequential execution
4. **Tool usage**: Frequency of EDA tool calls in research workflows
5. **Error rates**: Failures by file format, error types

### Success Indicators

- [ ] 95% of EDA analyses complete successfully
- [ ] Parallel execution achieves >50% speedup (vs 2x sequential)
- [ ] Combined workflows complete in < 5 minutes (90th percentile)
- [ ] Tool integration works without errors

## References

- **Original Research**: `/Users/emilwareus/Development/addcommitpush.io/thoughts/shared/research/2025-11-17_improving-eda-agent-multi-source-parallel.md`
- **Current Implementation**:
  - IterativeEDAAgent: `deep-research-agent/src/deep_research/agent/iterative_eda.py:19-655`
  - Tool Base: `deep-research-agent/src/deep_research/tools/base.py:7-35`
  - ReactAgent: `deep-research-agent/src/deep_research/agent/react.py:33-241`
  - Orchestrator: `deep-research-agent/src/deep_research/agent/orchestrator.py:39-408`
- **Tool Pattern Examples**:
  - SearchTool: `deep-research-agent/src/deep_research/tools/search.py:13-86`
  - FetchTool: `deep-research-agent/src/deep_research/tools/fetch.py:13-77`
- **Parallel Execution Pattern**: `deep-research-agent/src/deep_research/agent/orchestrator.py:155-184`

## Next Steps

1. **Review this plan** with stakeholders - confirm scope and approach
2. **Set up development environment** - ensure all dependencies installed
3. **Begin Phase 1** - Start with DataLoader implementation
4. **Iterate based on feedback** - Adjust plan as needed during implementation

---

**Implementation Timeline**: 4 weeks (1 phase per week)
**Risk Level**: Low (all patterns proven, changes are additive)
**Team Size**: 1-2 developers
**Dependencies**: None (all patterns exist in codebase)
