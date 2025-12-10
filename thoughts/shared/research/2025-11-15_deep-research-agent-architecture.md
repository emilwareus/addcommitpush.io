---
date: 2025-11-15T14:30:00+01:00
researcher: Claude (Sonnet 4.5)
git_commit: 22dbf8d52dc8c995afcf147c11fad7f347571464
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: 'Custom Deep Research Agent - Architecture & Implementation Plan'
tags: [research, deep-research, agent, langgraph, react, eda, python, uv]
status: complete
last_updated: 2025-11-15
last_updated_by: Claude
---

# Research: Custom Deep Research Agent - Architecture & Implementation Plan

**Date**: 2025-11-15T14:30:00+01:00
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: 22dbf8d52dc8c995afcf147c11fad7f347571464
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Research Question

How to design and implement a uv/Python-based custom deep research agent that enables CLI-based iterative research, web search, exploratory data analysis (EDA), and outputs markdown research documents or Jupyter notebooks with data storytelling?

## Executive Summary

This document presents a comprehensive architecture for building a production-ready deep research agent inspired by Alibaba's DeepResearch but optimized for local development and data analysis workflows. The system combines:

1. **ReAct Framework** - Thought-Action-Observation loop for autonomous reasoning
2. **LangGraph State Management** - Modern state machines with checkpointing and memory
3. **Comprehensive Tool Suite** - Web search, code execution, file operations, and notebook generation
4. **EDA Capabilities** - Jupyter kernel integration with pandas, matplotlib, seaborn
5. **Modern Python Tooling** - uv package manager, ruff linting, mypy type checking, pytest

The agent will operate as a CLI tool that takes natural language research questions or data analysis requests, autonomously plans and executes multi-step workflows, and produces either markdown research reports or executable Jupyter notebooks with visualizations and insights.

## Goals

### Primary Goals

1. **Autonomous Research Capability**
   - Accept natural language research questions
   - Decompose complex questions into sub-tasks
   - Execute multi-step reasoning with tool usage
   - Synthesize findings into coherent reports

2. **Data Analysis & EDA**
   - Load and analyze local data files (CSV, Parquet, Excel)
   - Generate exploratory data analysis notebooks
   - Create visualizations with matplotlib/seaborn
   - Apply statistical analysis with pandas

3. **Iterative Workflow**
   - Support conversational interaction for refinement
   - Maintain context across multiple queries
   - Allow human-in-the-loop for critical decisions
   - Save and resume analysis sessions

4. **Output Generation**
   - Markdown research documents with citations
   - Executable Jupyter notebooks (.ipynb)
   - Data storytelling with narrative structure
   - Reproducible analysis pipelines

### Secondary Goals

1. **Modern Development Experience**
   - Fast dependency management with uv
   - Type-safe code with mypy
   - Consistent formatting with ruff
   - Comprehensive testing with pytest

2. **Extensibility**
   - Plugin architecture for custom tools
   - Configurable LLM backends (OpenAI, Anthropic, local)
   - Template system for different output formats
   - Easy integration with existing workflows

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Interface                            │
│  (Click-based command-line with rich terminal output)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ReAct Agent Core                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Thought    │→ │   Action     │→ │ Observation  │           │
│  │  (Planning)  │  │ (Tool Call)  │  │  (Results)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
│  Powered by LangGraph State Machine                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Tool Suite  │  │    Memory    │  │   Output     │
│              │  │              │  │  Generator   │
│ • Search     │  │ • Checkpoints│  │              │
│ • Code Exec  │  │ • History    │  │ • Markdown   │
│ • File Ops   │  │ • Vector DB  │  │ • Notebooks  │
│ • Web Fetch  │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### System Components

#### 1. Agent Core (`agent/`)

**ReAct Loop Implementation**

- Iterative thought-action-observation cycle
- XML-tagged structured outputs (`<think>`, `<tool_call>`, `<answer>`)
- Context window management (110K token threshold)
- Graceful degradation on token limits

**LangGraph State Machine**

- `StateGraph` with typed state (Pydantic models)
- Conditional routing based on tool calls
- Checkpointing with PostgreSQL/SQLite
- Human-in-the-loop interrupt points

**State Definition**:

```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    query: str
    current_step: str
    retry_count: int
    max_retries: int
    analysis_plan: dict
    generated_code: str
    execution_results: dict
    validation_errors: list[str]
    notebook_cells: Annotated[list[dict], add]
    final_report: str
```

#### 2. Tool Suite (`tools/`)

**Search Tool** (`search.py`)

- Web search via configurable provider (Serper, Brave, DuckDuckGo)
- Batch query support
- Markdown-formatted results with citations
- Language detection for locale customization

**Code Executor** (`code_executor.py`)

- Jupyter kernel management via `jupyter-client`
- Sandboxed Python execution
- Rich output capture (stdout, stderr, display data)
- State persistence across cells
- Timeout and resource limits

**Web Fetch Tool** (`web_fetch.py`)

- URL content retrieval and summarization
- Jina AI Reader integration
- Progressive content truncation (95K tokens)
- Goal-based extraction with LLM

**File Operations** (`file_ops.py`)

- Read/write local files
- CSV/Excel/Parquet loading
- Schema extraction
- Data profiling

#### 3. Notebook Generation (`notebook/`)

**Builder** (`builder.py`)

- Programmatic notebook creation with `nbformat`
- Cell management (markdown, code)
- Execution result capture
- Output serialization

**Templates** (`templates.py`)

- EDA narrative structure (7-act storyline)
- Act I: Set the Scene
- Act II: Meet the Data
- Act III: Obstacles & Cleanups
- Act IV: Target Analysis
- Act V: Feature Exploration
- Act VI: Baseline Model (optional)
- Act VII: Insights & Recommendations

**Validator** (`validator.py`)

- AST-based code validation
- Dangerous operation detection
- Pandas pattern checking
- Safety scoring

#### 4. CLI Interface (`cli.py`)

**Commands**:

- `deep-research research <question>` - General research
- `deep-research eda <file>` - Exploratory data analysis
- `deep-research resume <thread-id>` - Continue session
- `deep-research export <thread-id>` - Export results

**Features**:

- Rich terminal output with progress bars
- Streaming token display
- Interactive mode for refinement
- Configuration management

## Technology Stack

### Core Dependencies

```toml
[project]
dependencies = [
    "click>=8.1.0",           # CLI framework
    "httpx>=0.27.0",          # HTTP client
    "langgraph>=0.2.0",       # State machine framework
    "langchain>=0.3.0",       # LLM orchestration
    "langchain-openai>=0.2.0", # OpenAI integration
    "langchain-anthropic>=0.2.0", # Anthropic integration
    "python-dotenv>=1.0.0",   # Environment variables
    "pydantic>=2.0.0",        # Data validation
    "rich>=13.0.0",           # Terminal formatting
    "nbformat>=5.10.0",       # Notebook format
    "jupyter-client>=8.6.0",  # Kernel management
    "pandas>=2.2.0",          # Data manipulation
    "matplotlib>=3.9.0",      # Plotting
    "seaborn>=0.13.0",        # Statistical visualization
]
```

### Development Dependencies

```toml
[dependency-groups]
dev = [
    "pytest>=8.0.0",          # Testing framework
    "pytest-cov>=4.1.0",      # Coverage reporting
    "pytest-asyncio>=0.23.0", # Async test support
    "ruff>=0.8.0",            # Linting & formatting
    "mypy>=1.10.0",           # Type checking
]
```

### Why These Choices?

**uv Package Manager**:

- 10-100x faster than pip/poetry
- Automatic Python version management
- Universal lock file (cross-platform)
- Single binary for entire toolchain

**LangGraph over LangChain LCEL**:

- Explicit state management vs. implicit
- Better debugging with state inspection
- Checkpointing and time-travel
- Clearer control flow with conditional edges

**Click over Typer**:

- More mature and stable
- Better documentation
- Wider community adoption
- Simpler for this use case

**jupyter-client over E2B**:

- No external dependencies
- Local execution for privacy
- Free (no API costs)
- Full control over environment

**Pydantic v2**:

- Native validation performance
- JSON schema generation
- Type safety for LLM outputs
- Structured output with LangChain

## Project Structure

```
deep-research-agent/
├── .python-version              # Python 3.11
├── pyproject.toml               # uv project configuration
├── uv.lock                      # Dependency lock file
├── .env.example                 # Environment template
├── README.md                    # Documentation
├── ARCHITECTURE.md              # This document
│
├── src/
│   └── deep_research/
│       ├── __init__.py
│       ├── cli.py               # CLI entry point
│       │
│       ├── agent/
│       │   ├── __init__.py
│       │   ├── react_agent.py   # Core ReAct loop implementation
│       │   ├── state.py         # LangGraph state definitions
│       │   ├── graph.py         # LangGraph workflow construction
│       │   └── prompts.py       # System prompts and templates
│       │
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── base.py          # Base tool interface
│       │   ├── search.py        # Web search tool
│       │   ├── code_executor.py # Jupyter kernel execution
│       │   ├── web_fetch.py     # Web page reading
│       │   ├── file_ops.py      # File operations
│       │   └── registry.py      # Tool registration
│       │
│       ├── notebook/
│       │   ├── __init__.py
│       │   ├── builder.py       # Notebook generation
│       │   ├── templates.py     # EDA templates
│       │   └── validator.py     # Code validation
│       │
│       └── utils/
│           ├── __init__.py
│           ├── logging.py       # Logging configuration
│           ├── config.py        # Configuration management
│           └── token_counter.py # Token counting utilities
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Pytest fixtures
│   ├── test_agent.py            # Agent tests
│   ├── test_tools.py            # Tool tests
│   └── test_notebook.py         # Notebook tests
│
├── examples/
│   ├── research_example.py      # Research workflow example
│   ├── eda_example.py           # EDA workflow example
│   └── custom_tool.py           # Custom tool example
│
└── outputs/                     # Generated outputs (gitignored)
    ├── research/                # Markdown research reports
    ├── notebooks/               # Generated Jupyter notebooks
    └── sessions/                # Saved session state
```

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Establish project structure and basic CLI

**Tasks**:

1. Initialize uv project with dependencies
2. Set up development tooling (ruff, mypy, pytest)
3. Implement basic CLI with Click
4. Create configuration management system
5. Set up logging with rich

**Deliverables**:

- Working CLI that accepts commands
- Configuration file loading (.env)
- Basic logging to console
- Test suite foundation

### Phase 2: Tool Suite (Week 2)

**Goal**: Implement core tools for research

**Tasks**:

1. Implement base tool interface
2. Build search tool with multiple providers
3. Create web fetch tool with summarization
4. Implement file operations tool
5. Build Jupyter kernel executor
6. Create tool registry

**Deliverables**:

- All tools independently testable
- Tool registry with dynamic loading
- Comprehensive test coverage (>80%)
- Documentation for each tool

### Phase 3: ReAct Agent (Week 3)

**Goal**: Build core ReAct loop with LangGraph

**Tasks**:

1. Define LangGraph state schema
2. Implement ReAct loop logic
3. Build conditional routing
4. Add context window management
5. Implement checkpointing
6. Create system prompts

**Deliverables**:

- Working ReAct agent
- State persistence to SQLite
- Token counting and limits
- Graceful error handling

### Phase 4: Notebook Generation (Week 4)

**Goal**: Build EDA and notebook capabilities

**Tasks**:

1. Implement notebook builder
2. Create EDA templates (7-act structure)
3. Build code validator
4. Add visualization helpers
5. Implement execution and capture

**Deliverables**:

- Programmatic notebook generation
- EDA template with narrative
- Safe code execution
- Rich output capture (plots, tables)

### Phase 5: Integration & Polish (Week 5)

**Goal**: End-to-end workflows and UX

**Tasks**:

1. Integrate all components
2. Implement CLI workflows
3. Add streaming output
4. Create examples and documentation
5. Performance optimization

**Deliverables**:

- Complete research workflow
- Complete EDA workflow
- User documentation
- Example notebooks
- Performance benchmarks

## Detailed Component Specifications

### 1. ReAct Agent Core

**File**: `src/deep_research/agent/react_agent.py`

**Responsibilities**:

- Orchestrate thought-action-observation loop
- Manage LLM API calls with retry logic
- Parse structured outputs (XML tags)
- Execute tools via registry
- Accumulate context and results

**Key Methods**:

```python
class ReActAgent:
    def __init__(
        self,
        llm: BaseChatModel,
        tools: list[BaseTool],
        max_iterations: int = 100,
        max_tokens: int = 110_000,
    ): ...

    def run(self, query: str) -> AgentResult: ...

    def _think(self, state: AgentState) -> dict: ...

    def _act(self, state: AgentState) -> dict: ...

    def _observe(self, tool_result: ToolResult) -> dict: ...

    def _should_continue(self, state: AgentState) -> bool: ...
```

**Termination Conditions**:

1. Answer tag found (`<answer>...</answer>`)
2. Max iterations reached (100)
3. Token limit approached (110K)
4. Explicit user termination

**Error Handling**:

- Exponential backoff for API errors (1-30s)
- Max 10 retries per API call
- Graceful degradation on tool failures
- Validation error recovery with re-prompting

### 2. LangGraph State Machine

**File**: `src/deep_research/agent/graph.py`

**Workflow**:

```python
def build_research_graph() -> CompiledGraph:
    workflow = StateGraph(AgentState)

    # Nodes
    workflow.add_node("initialize", initialize_node)
    workflow.add_node("plan", planning_node)
    workflow.add_node("execute_tool", tool_execution_node)
    workflow.add_node("validate", validation_node)
    workflow.add_node("synthesize", synthesis_node)
    workflow.add_node("error_handler", error_handling_node)

    # Edges
    workflow.add_edge(START, "initialize")
    workflow.add_edge("initialize", "plan")

    # Conditional routing
    workflow.add_conditional_edges(
        "plan",
        route_plan,
        {
            "execute": "execute_tool",
            "synthesize": "synthesize",
            "error": "error_handler",
        }
    )

    workflow.add_conditional_edges(
        "validate",
        route_validation,
        {
            "retry": "plan",
            "continue": "execute_tool",
            "end": END,
        }
    )

    # Compile with checkpointing
    return workflow.compile(
        checkpointer=SqliteSaver.from_conn_string(":memory:"),
        interrupt_before=["error_handler"],
    )
```

**State Updates**:

- Use reducers for accumulation (`add_messages`, custom reducers)
- Atomic updates per node
- Immutable history via checkpointing

### 3. Tool Implementation Pattern

**File**: `src/deep_research/tools/base.py`

**Base Interface**:

```python
from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel

class ToolInput(BaseModel):
    """Base class for tool inputs"""
    pass

class ToolResult(BaseModel):
    """Tool execution result"""
    success: bool
    output: str | dict
    error: str | None = None
    metadata: dict[str, Any] = {}

class BaseTool(ABC):
    """Base class for all tools"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Tool name for LLM"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Tool description for LLM"""
        pass

    @property
    @abstractmethod
    def input_schema(self) -> type[ToolInput]:
        """Pydantic schema for inputs"""
        pass

    @abstractmethod
    def execute(self, input_data: ToolInput) -> ToolResult:
        """Execute the tool"""
        pass
```

**Example: Search Tool**:

```python
class SearchInput(ToolInput):
    query: list[str]
    max_results: int = 10

class SearchTool(BaseTool):
    name = "search"
    description = "Perform web searches. Accepts multiple queries."
    input_schema = SearchInput

    def __init__(self, api_key: str, provider: str = "serper"):
        self.api_key = api_key
        self.provider = provider

    def execute(self, input_data: SearchInput) -> ToolResult:
        results = []
        for query in input_data.query:
            response = self._search(query, input_data.max_results)
            results.append(self._format_results(response))

        return ToolResult(
            success=True,
            output="\n\n".join(results),
            metadata={"query_count": len(input_data.query)}
        )
```

### 4. Jupyter Kernel Executor

**File**: `src/deep_research/tools/code_executor.py`

**Implementation**:

```python
from jupyter_client import KernelManager
from queue import Empty
import uuid

class CodeExecutor:
    def __init__(self):
        self.km = KernelManager()
        self.km.start_kernel()
        self.kc = self.km.client()
        self.kc.start_channels()
        self.kc.wait_for_ready(timeout=60)

    def execute(self, code: str, timeout: int = 30) -> dict:
        msg_id = self.kc.execute(code)

        outputs = {
            "stdout": [],
            "stderr": [],
            "display_data": [],
            "error": None,
        }

        while True:
            try:
                msg = self.kc.get_iopub_msg(timeout=timeout)
                msg_type = msg["msg_type"]
                content = msg["content"]

                if msg_type == "stream":
                    if content["name"] == "stdout":
                        outputs["stdout"].append(content["text"])
                    elif content["name"] == "stderr":
                        outputs["stderr"].append(content["text"])

                elif msg_type == "display_data":
                    outputs["display_data"].append(content["data"])

                elif msg_type == "error":
                    outputs["error"] = {
                        "ename": content["ename"],
                        "evalue": content["evalue"],
                        "traceback": content["traceback"],
                    }

                elif msg_type == "status" and content["execution_state"] == "idle":
                    break

            except Empty:
                break

        return outputs

    def shutdown(self):
        self.kc.stop_channels()
        self.km.shutdown_kernel()
```

### 5. Notebook Builder

**File**: `src/deep_research/notebook/builder.py`

**Implementation**:

```python
import nbformat as nbf
from nbformat.v4 import new_notebook, new_code_cell, new_markdown_cell

class NotebookBuilder:
    def __init__(self):
        self.nb = new_notebook()
        self.cells = []

    def add_markdown(self, content: str):
        self.cells.append(new_markdown_cell(content))

    def add_code(self, code: str, outputs: list | None = None):
        cell = new_code_cell(code)
        if outputs:
            cell.outputs = outputs
        self.cells.append(cell)

    def build(self) -> nbf.NotebookNode:
        self.nb.cells = self.cells
        return self.nb

    def save(self, path: str):
        with open(path, "w") as f:
            nbf.write(self.nb, f)
```

**EDA Template**:

```python
class EDATemplate:
    @staticmethod
    def generate_structure(dataset_path: str, goal: str) -> list[dict]:
        return [
            {
                "type": "markdown",
                "content": f"# Exploratory Data Analysis\n\n**Goal**: {goal}",
            },
            {
                "type": "code",
                "content": f"import pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\ndf = pd.read_csv('{dataset_path}')",
            },
            {
                "type": "markdown",
                "content": "## Act I: Set the Scene\n\nUnderstanding the dataset context and objectives.",
            },
            # ... more acts
        ]
```

## Configuration Management

**File**: `.env.example`

```bash
# LLM Configuration
LLM_PROVIDER=anthropic  # anthropic, openai, or local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
LLM_MODEL=claude-sonnet-4-5  # or gpt-4-turbo

# Search Provider
SEARCH_PROVIDER=serper  # serper, brave, or duckduckgo
SERPER_API_KEY=...
BRAVE_API_KEY=...

# Web Fetch
JINA_API_KEY=...  # Optional for enhanced web reading

# Agent Settings
MAX_ITERATIONS=100
MAX_TOKENS=110000
TIMEOUT_SECONDS=150

# Output Settings
OUTPUT_DIR=./outputs
CHECKPOINT_DIR=./outputs/sessions

# Jupyter Settings
KERNEL_TIMEOUT=30
MAX_EXECUTION_TIME=60

# Logging
LOG_LEVEL=INFO
LOG_FILE=./outputs/agent.log
```

**File**: `src/deep_research/utils/config.py`

```python
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # LLM
    llm_provider: Literal["anthropic", "openai", "local"] = "anthropic"
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    llm_model: str = "claude-sonnet-4-5"

    # Search
    search_provider: Literal["serper", "brave", "duckduckgo"] = "serper"
    serper_api_key: str | None = None
    brave_api_key: str | None = None

    # Agent
    max_iterations: int = 100
    max_tokens: int = 110_000
    timeout_seconds: int = 150

    # Output
    output_dir: str = "./outputs"
    checkpoint_dir: str = "./outputs/sessions"

    # Jupyter
    kernel_timeout: int = 30
    max_execution_time: int = 60

    # Logging
    log_level: str = "INFO"
    log_file: str = "./outputs/agent.log"

    class Config:
        env_file = ".env"

settings = Settings()
```

## CLI Interface Design

### Commands

**1. Research Command**

```bash
deep-research research "What are the latest advances in LLM agent architectures?"

Options:
  --output, -o PATH       Output file path
  --format, -f FORMAT     Output format (markdown, json)
  --max-steps INT         Maximum research steps
  --interactive, -i       Enable interactive mode
  --verbose, -v           Verbose output
```

**2. EDA Command**

```bash
deep-research eda data.csv --goal "Identify key drivers of customer churn"

Options:
  --output, -o PATH       Output notebook path
  --execute, -e           Execute notebook cells
  --template TEMPLATE     EDA template (default, custom)
  --features LIST         Specific features to analyze
```

**3. Resume Command**

```bash
deep-research resume <thread-id>

Options:
  --continue, -c          Continue from last checkpoint
  --view, -v              View session history
  --export, -e PATH       Export session results
```

**4. Export Command**

```bash
deep-research export <thread-id> --format notebook --output analysis.ipynb
```

### Interactive Mode

```
$ deep-research research "Python async best practices" --interactive

[Agent] Starting research on: Python async best practices
[Agent] Step 1: Searching for recent articles...
[Tool: search] Found 10 results

Continue? [Y/n/stop] y

[Agent] Step 2: Analyzing asyncio documentation...
[Tool: web_fetch] Retrieved documentation summary

[User] Focus on async/await patterns, not asyncio.run

[Agent] Adjusting focus to async/await patterns...
[Agent] Step 3: Searching for async/await examples...

...

[Agent] Research complete! Generating report...
[Output] Saved to: outputs/research/python-async-best-practices-20251115.md

View report? [Y/n] y
```

## What NOT to Do

### Anti-Patterns to Avoid

1. **DO NOT implement custom LLM API clients**
   - Use LangChain abstractions for all LLM interactions
   - Leverage existing integrations for OpenAI/Anthropic/etc.
   - Avoid reinventing retry logic and error handling

2. **DO NOT use external sandboxing services initially**
   - Start with local Jupyter kernel execution
   - Avoid dependencies on E2B, Modal, or similar
   - Keep execution local for privacy and cost

3. **DO NOT create custom state management**
   - Use LangGraph's built-in state management
   - Leverage checkpointing instead of custom persistence
   - Avoid reimplementing message accumulation

4. **DO NOT implement custom token counting**
   - Use tiktoken for OpenAI models
   - Use Anthropic's token counting for Claude
   - Trust library implementations over custom logic

5. **DO NOT build complex prompt engineering**
   - Start with simple, clear prompts
   - Use few-shot examples sparingly
   - Avoid mega-prompts and complex instructions

6. **DO NOT create custom logging frameworks**
   - Use Python's standard logging module
   - Leverage rich for terminal output
   - Keep logging simple and configurable

7. **DO NOT implement authentication systems**
   - Use environment variables for API keys
   - Keep credentials in .env (gitignored)
   - No user authentication in v1

8. **DO NOT build web UI initially**
   - Focus on CLI excellence first
   - Terminal is sufficient for initial users
   - Web UI can come in v2

9. **DO NOT create custom vectorstores**
   - Use LangChain's built-in vector stores if needed
   - Start without RAG/embeddings
   - Add only if truly necessary

10. **DO NOT over-engineer abstractions**
    - Keep code simple and readable
    - Avoid excessive inheritance hierarchies
    - Prefer composition over complex class structures

11. **DO NOT implement multi-agent systems initially**
    - Single-agent ReAct loop is sufficient
    - Avoid orchestrator-worker patterns in v1
    - Keep architecture simple

12. **DO NOT create custom evaluation frameworks**
    - Manual testing is fine initially
    - Add evals only after core functionality works
    - Focus on user feedback over metrics

### Technical Constraints

1. **Python Version**
   - Target Python 3.11+ only
   - Use modern type hints (PEP 604 union syntax)
   - Leverage structural pattern matching where useful

2. **Dependencies**
   - Minimize external dependencies
   - Prefer pure Python over native extensions
   - Avoid unstable or alpha packages

3. **Performance**
   - No premature optimization
   - Profile before optimizing
   - Simplicity > speed initially

4. **Testing**
   - Write tests for core logic only
   - Skip tests for simple utilities initially
   - Focus on integration tests over unit tests

## Success Criteria

### Minimum Viable Product (MVP)

The MVP is complete when the system can:

1. **Research Workflow**
   - Accept a natural language question
   - Perform multi-step web searches
   - Synthesize findings into markdown report
   - Include citations and sources

2. **EDA Workflow**
   - Load CSV/Excel data file
   - Generate exploratory analysis notebook
   - Execute code cells and capture output
   - Include visualizations and insights

3. **Core Capabilities**
   - ReAct loop with 3+ tool calls
   - Context management (track token usage)
   - Error recovery (retry on failures)
   - Session persistence (resume later)

4. **User Experience**
   - CLI with clear help text
   - Progress indicators during execution
   - Readable output formatting
   - Error messages that guide user

### Quality Metrics

- **Code Coverage**: >70% for core modules
- **Type Coverage**: 100% (strict mypy)
- **Linting**: Zero ruff errors
- **Performance**: <2min for typical research query
- **Reliability**: <5% failure rate on valid inputs

## Future Enhancements (Post-MVP)

### Short-term (v2)

1. **Enhanced Tools**
   - Google Scholar integration
   - File parser (PDF, DOCX)
   - Image search and analysis
   - SQL database querying

2. **Better Memory**
   - Vector store for long-term memory
   - Semantic search over past research
   - Cross-session knowledge retention

3. **Output Formats**
   - HTML reports with styling
   - LaTeX for academic papers
   - PowerPoint presentations

### Medium-term (v3)

1. **Multi-Agent Collaboration**
   - Specialized agents (web expert, data analyst)
   - Parallel research paths
   - Synthesis agent for integration

2. **Advanced EDA**
   - Statistical testing
   - Automated feature engineering
   - Model recommendations

3. **Web Interface**
   - Streamlit or Gradio UI
   - Real-time streaming output
   - Interactive refinement

### Long-term (v4+)

1. **Training Pipeline**
   - Synthetic data generation
   - Fine-tuning on domain data
   - Reinforcement learning from feedback

2. **Enterprise Features**
   - Team collaboration
   - Custom tool plugins
   - Audit logging and compliance

3. **Domain Specialization**
   - Finance/quant analysis
   - Scientific research
   - Legal research

## Getting Started (For Implementation)

### Step 1: Initialize Project

```bash
# Create project
uv init deep-research-agent --package --python 3.11
cd deep-research-agent

# Add dependencies
uv add click httpx langgraph langchain langchain-openai langchain-anthropic
uv add python-dotenv pydantic rich nbformat jupyter-client
uv add pandas matplotlib seaborn

# Add dev dependencies
uv add --dev pytest pytest-cov pytest-asyncio ruff mypy

# Sync environment
uv sync
```

### Step 2: Create Structure

```bash
# Create directories
mkdir -p src/deep_research/{agent,tools,notebook,utils}
mkdir -p tests examples outputs

# Create __init__.py files
touch src/deep_research/__init__.py
touch src/deep_research/agent/__init__.py
touch src/deep_research/tools/__init__.py
touch src/deep_research/notebook/__init__.py
touch src/deep_research/utils/__init__.py
```

### Step 3: Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit with your keys
$EDITOR .env
```

### Step 4: Implement Core (Phase by Phase)

Follow the Implementation Phases section above, starting with Phase 1.

## Code References

### Inspiration Sources

- **Alibaba DeepResearch**: [github.com/Alibaba-NLP/DeepResearch](https://github.com/Alibaba-NLP/DeepResearch)
  - `inference/react_agent.py` - ReAct loop implementation
  - `inference/tool_*.py` - Tool implementations
  - `inference/prompt.py` - System prompts

- **LangGraph Examples**: [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
  - `examples/agent_executor.ipynb` - Agent patterns
  - `examples/persistence.ipynb` - Checkpointing
  - `examples/human_in_the_loop.ipynb` - Interactive agents

- **AWS Multi-Agent**: [github.com/aws-samples/langgraph-multi-agent](https://github.com/aws-samples/langgraph-multi-agent)
  - Two-tier orchestration pattern
  - Vector store integration
  - Production patterns

## Historical Context (from thoughts/)

This research builds upon previous explorations in this repository:

- **Context Engineering with Claude Code** (`thoughts/shared/research/2025-11-07_context-engineering-claude-code.md`) - Patterns for effective prompt engineering and context management
- **Image Optimization Command** (`thoughts/shared/research/2025-11-07_11-00-59_image-optimization-command.md`) - Script development patterns with TypeScript/tsx
- **Blog Post Audio Integration** (`thoughts/shared/research/2025-11-07_audio-files-blog-posts.md`) - API integration and chunking patterns

## Related Research

- `DEEP_RESEARCH.md` (root folder) - Source material on Tongyi DeepResearch and data analysis agents
- Future: Deep Research Agent v2 - Multi-agent collaboration
- Future: Deep Research Agent - Fine-tuning guide

## Open Questions

1. **Tool Execution Safety**: How to sandbox Python execution securely without external services?
   - Consideration: Resource limits, network restrictions, file system access

2. **Context Window Strategy**: When to summarize vs. truncate vs. use retrieval?
   - Initial approach: Truncation with warnings

3. **LLM Provider Choice**: Which model for which task?
   - Research: Claude for reasoning, GPT-4 for code generation?
   - Or single model for simplicity?

4. **Notebook Execution**: Execute cells immediately or defer to user?
   - Trade-off: Automation vs. control

5. **Error Recovery**: How many retries before giving up?
   - Current plan: 3 retries with exponential backoff

6. **Output Storage**: Local files vs. database?
   - Initial: Local files, migrate to DB if needed

## Conclusion

This architecture provides a solid foundation for building a production-ready deep research agent. By leveraging proven patterns from Alibaba's DeepResearch and modern Python tooling, we can create a system that is:

- **Powerful**: Multi-step reasoning with diverse tools
- **Flexible**: Configurable for various research tasks
- **Maintainable**: Clean code with strong types
- **Extensible**: Plugin architecture for custom tools
- **User-friendly**: CLI-first with rich output

The phased implementation approach ensures we deliver value early while maintaining a clear path to advanced capabilities. Starting with a focused MVP allows us to validate the core architecture before adding complexity.

The key to success will be maintaining simplicity, avoiding over-engineering, and iterating based on real usage patterns. This document serves as the blueprint, but the implementation should remain pragmatic and adaptable.

---

**Next Steps**: Begin Phase 1 implementation by initializing the uv project and setting up the development environment.
