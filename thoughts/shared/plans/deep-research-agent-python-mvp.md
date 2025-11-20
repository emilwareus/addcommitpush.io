# Deep Research Agent - Python MVP Implementation Plan

## Overview

Build a production-ready deep research agent in **pure Python** over **3 incremental phases** (3 weeks total). The system will be completely separate from the TypeScript blog, living in its own directory with Python-based CLI, multi-agent orchestration, and EDA capabilities.

**Primary Use Case**: Research technical topics, generate reports, and perform data analysis - outputs can feed into blog content creation.

## Current State Analysis

**Repository**: `addcommitpush.io` - A Next.js 16 TypeScript blog
**Existing Assets**:
- `/deep-research-agent/` directory (empty skeleton, will be rebuilt in Python)
- Research documents at `/thoughts/shared/research/` (comprehensive architecture references)
- No Python dependencies in main blog project

**Technology Constraints**:
- **Language**: Pure Python 3.14+ (no TypeScript mixing)
- **Package Manager**: uv (modern, fast Python package manager)
- **State**: File-based initially, PostgreSQL optional for production
- **LLM**: OpenRouter (multi-model support) or direct OpenAI/Anthropic
- **CLI**: Click or Typer (Python CLI frameworks)

## Desired End State

After completing all 3 phases, you'll have:

1. **Python CLI**: `uv run research <topic>` generates markdown reports
2. **Multi-Agent System**: LeadResearcher + parallel Workers via LangGraph
3. **EDA Capability**: `uv run research --eda <dataset.csv>` generates Jupyter notebooks
4. **Standalone Project**: Completely independent from TypeScript blog
5. **Production-Ready**: Observability, error handling, cost tracking

### Verification

**Automated**:
- `uv sync` installs all dependencies successfully
- `ruff check .` passes (no linting errors)
- `mypy src/` passes (strict type checking)
- `pytest tests/` passes (all tests green)
- CLI runs: `uv run research "test query"`

**Manual**:
- Research reports are coherent and well-sourced
- Multi-agent execution is 3-5× faster than single-agent
- EDA notebooks execute without errors in Jupyter
- Cost per research task is <$0.15
- Context window stays <50% full during execution

## What We're NOT Doing

To keep scope manageable for MVP:

- ❌ Heavy Mode / test-time scaling (save for v2)
- ❌ Complex validation agents (basic citation checking only)
- ❌ Multi-tenant isolation (single-user initially)
- ❌ Advanced memory graphs (simple vector store is enough)
- ❌ Docker containerization (virtual env is fine)
- ❌ Web UI (CLI only for MVP)
- ❌ Real-time streaming (batch processing is fine)

## Implementation Approach

**Strategy**: Build vertically - each phase delivers end-to-end value.

**Tech Stack**:
- **Language**: Python 3.11+
- **Package Manager**: uv
- **Framework**: LangGraph (multi-agent orchestration)
- **LLM**: LangChain + OpenRouter/OpenAI/Anthropic
- **CLI**: Click
- **Data**: Pandas + DuckDB (for EDA)
- **Notebooks**: Jupyter + nbformat
- **Search**: Brave Search API or Serper
- **Web Fetch**: Jina Reader API or httpx + readability-lxml
- **State**: JSON files initially, PostgreSQL optional
- **Testing**: pytest
- **Linting**: ruff + mypy (strict)

---

## Phase 1: Core ReAct Research Agent (Week 1)

### Overview

Build a working single-agent system using the ReAct pattern (Reasoning + Acting). The agent researches topics via web search and page fetching, generating markdown reports.

**Goal**: Ship a functional CLI tool in ~1 week.

### Changes Required

#### 1. Project Setup

**Directory**: `deep-research-agent/` (complete rebuild)

**Structure**:
```
deep-research-agent/
├── pyproject.toml           # uv project config
├── uv.lock                  # Lock file
├── .env.example
├── .gitignore
├── README.md
├── src/
│   └── deep_research/
│       ├── __init__.py
│       ├── cli.py           # Click CLI
│       ├── agent/
│       │   ├── __init__.py
│       │   ├── react.py     # ReAct loop
│       │   └── prompts.py   # System prompts
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── base.py      # Tool interface
│       │   ├── search.py    # Web search
│       │   └── fetch.py     # Web page fetching
│       ├── llm/
│       │   ├── __init__.py
│       │   └── client.py    # LLM wrapper (OpenRouter/OpenAI)
│       └── utils/
│           ├── __init__.py
│           ├── logger.py    # Structured logging
│           ├── store.py     # File-based state
│           └── tokens.py    # Token counting
├── tests/
│   ├── __init__.py
│   ├── test_agent.py
│   ├── test_tools.py
│   └── fixtures/
└── outputs/                 # Research reports saved here
    └── sessions/            # Session logs
```

**File**: `deep-research-agent/pyproject.toml`
```toml
[project]
name = "deep-research"
version = "0.1.0"
description = "Multi-agent deep research system"
requires-python = ">=3.14"
dependencies = [
    "click>=8.1.0",
    "langchain>=0.3.0",
    "langchain-openai>=0.2.0",
    "langgraph>=0.2.0",
    "python-dotenv>=1.0.0",
    "pydantic>=2.0.0",
    "httpx>=0.27.0",
    "rich>=13.0.0",
    "structlog>=24.0.0",
    "tiktoken>=0.8.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=6.0.0",
    "ruff>=0.8.0",
    "mypy>=1.13.0",
]

[project.scripts]
research = "deep_research.cli:main"

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "ruff>=0.8.0",
    "mypy>=1.13.0",
]

[tool.ruff]
line-length = 100
target-version = "py314"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]

[tool.mypy]
python_version = "3.14"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

**File**: `deep-research-agent/.env.example`
```bash
# LLM Provider (choose one)
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENROUTER_API_KEY=sk-or-...

# Search Provider
BRAVE_API_KEY=...
# or
SERPER_API_KEY=...

# Optional
JINA_API_KEY=...

# Agent Config
MAX_ITERATIONS=20
MAX_TOKENS_PER_AGENT=50000
DEFAULT_MODEL=gpt-4o-mini
TEMPERATURE=0.0
```

**File**: `deep-research-agent/README.md`
```markdown
# Deep Research Agent

Multi-agent deep research system built with LangGraph.

## Setup

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

## Usage

```bash
# Basic research
uv run research "How does LangGraph work?"

# Save to file
uv run research "What is context engineering?" -o context.md

# Verbose mode
uv run research "Explain ReAct agents" --verbose
```

## Development

```bash
# Run tests
uv run pytest

# Lint
uv run ruff check .

# Type check
uv run mypy src/
```
```

#### 2. Core Agent Implementation

**File**: `src/deep_research/agent/react.py`

```python
"""ReAct agent implementation."""
from typing import Any
from dataclasses import dataclass
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI

from ..tools.base import Tool, ToolResult
from ..tools.search import SearchTool
from ..tools.fetch import FetchTool
from .prompts import RESEARCH_SYSTEM_PROMPT
from ..utils.logger import get_logger
from ..utils.tokens import count_tokens

logger = get_logger(__name__)


@dataclass
class ResearchReport:
    """Research report output."""
    query: str
    content: str
    sources: list[str]
    metadata: dict[str, Any]


class ReactAgent:
    """Single-agent ReAct research system."""

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        max_iterations: int = 20,
        max_tokens: int = 50_000,
    ) -> None:
        self.model = model
        self.max_iterations = max_iterations
        self.max_tokens = max_tokens

        self.llm = ChatOpenAI(model=model, temperature=0.0)
        self.tools: dict[str, Tool] = {
            "search": SearchTool(),
            "fetch": FetchTool(),
        }

        self.messages: list[Any] = []
        self.iterations = 0
        self.tokens_used = 0

    async def research(self, query: str) -> ResearchReport:
        """Execute research on query."""
        logger.info("research_started", query=query, model=self.model)

        # Initialize messages
        self.messages = [
            SystemMessage(content=RESEARCH_SYSTEM_PROMPT),
            HumanMessage(content=f"Research this topic: {query}")
        ]

        # ReAct loop
        while self.iterations < self.max_iterations:
            response = await self._step()

            # Check for completion
            if self._has_answer(response):
                answer = self._extract_answer(response)
                sources = self._extract_sources()

                logger.info(
                    "research_completed",
                    iterations=self.iterations,
                    tokens=self.tokens_used,
                )

                return ResearchReport(
                    query=query,
                    content=answer,
                    sources=sources,
                    metadata={
                        "model": self.model,
                        "iterations": self.iterations,
                        "tokens_used": self.tokens_used,
                    }
                )

            # Check budget
            if self.tokens_used > self.max_tokens * 0.9:
                logger.warning("approaching_token_budget", tokens=self.tokens_used)
                self.messages.append(
                    SystemMessage(content="Token budget nearly exhausted. Provide answer now.")
                )

        # Max iterations reached
        logger.warning("max_iterations_reached", iterations=self.iterations)
        return ResearchReport(
            query=query,
            content="Research incomplete due to iteration limit.",
            sources=[],
            metadata={"error": "max_iterations"}
        )

    async def _step(self) -> str:
        """Execute one ReAct step."""
        self.iterations += 1
        logger.debug("step_started", iteration=self.iterations)

        # Get LLM response
        response = await self.llm.ainvoke(self.messages)
        content = response.content
        self.tokens_used += count_tokens(content)

        self.messages.append(AIMessage(content=content))

        # Parse and execute tool calls
        actions = self._parse_actions(content)
        for action in actions:
            result = await self._execute_tool(action)
            self.messages.append(
                ToolMessage(content=result.content, tool_call_id=action["id"])
            )
            self.tokens_used += count_tokens(result.content)

        return content

    def _parse_actions(self, content: str) -> list[dict[str, Any]]:
        """Parse tool calls from LLM response."""
        import json
        import re

        actions = []
        pattern = r'<tool_call>(.*?)</tool_call>'
        matches = re.findall(pattern, content, re.DOTALL)

        for i, match in enumerate(matches):
            try:
                action = json.loads(match.strip())
                action["id"] = f"call_{self.iterations}_{i}"
                actions.append(action)
            except json.JSONDecodeError:
                logger.warning("invalid_tool_call", content=match)

        return actions

    async def _execute_tool(self, action: dict[str, Any]) -> ToolResult:
        """Execute a tool action."""
        tool_name = action.get("tool")
        args = action.get("args", {})

        if tool_name not in self.tools:
            return ToolResult(
                success=False,
                content=f"Unknown tool: {tool_name}",
                metadata={}
            )

        logger.debug("tool_executing", tool=tool_name, args=args)

        try:
            result = await self.tools[tool_name].execute(**args)
            logger.debug("tool_success", tool=tool_name)
            return result
        except Exception as e:
            logger.error("tool_error", tool=tool_name, error=str(e))
            return ToolResult(
                success=False,
                content=f"Tool error: {str(e)}",
                metadata={"error": str(e)}
            )

    def _has_answer(self, content: str) -> bool:
        """Check if response contains final answer."""
        return "<answer>" in content

    def _extract_answer(self, content: str) -> str:
        """Extract answer from response."""
        import re
        match = re.search(r'<answer>(.*?)</answer>', content, re.DOTALL)
        return match.group(1).strip() if match else content

    def _extract_sources(self) -> list[str]:
        """Extract all URLs from conversation."""
        import re
        sources = set()

        for msg in self.messages:
            if isinstance(msg, (AIMessage, ToolMessage)):
                urls = re.findall(r'https?://[^\s<>"{}|\\^`\[\]]+', str(msg.content))
                sources.update(urls)

        return sorted(sources)
```

**File**: `src/deep_research/agent/prompts.py`

```python
"""System prompts for agents."""

RESEARCH_SYSTEM_PROMPT = """You are a deep research agent that conducts thorough investigations.

PROCESS:
1. Think about what information you need
2. Use tools to gather information
3. Synthesize findings progressively
4. Continue until comprehensive understanding

AVAILABLE TOOLS:
- search(query): Search web for information. Returns title, snippet, URL for top results.
- fetch(url): Fetch and read webpage content. Returns clean text.

FORMAT:
- Wrap reasoning in <think> tags
- Wrap tool calls in <tool_call> tags with JSON:
  <tool_call>{"tool": "search", "args": {"query": "LangGraph tutorial"}}</tool_call>
- Wrap final answer in <answer> tags with markdown report

CONSTRAINTS:
- Be thorough but concise
- Cite sources: [Title](URL)
- Stop when sufficient information gathered
- Maximum 20 iterations

EXAMPLE:
<think>I need to understand what LangGraph is. Let me search for it.</think>
<tool_call>{"tool": "search", "args": {"query": "What is LangGraph?"}}</tool_call>

[After search results]
<think>Good results. Let me fetch the official docs.</think>
<tool_call>{"tool": "fetch", "args": {"url": "https://langchain.com/langgraph"}}</tool_call>

[After fetching]
<answer>
# Research Report: What is LangGraph?

LangGraph is a library for building stateful, multi-actor applications with LLMs...

## Key Features
- State management
- Multi-agent coordination
- Cycle support

## Sources
- [Official Docs](https://langchain.com/langgraph)
</answer>
"""
```

#### 3. Tool Implementation

**File**: `src/deep_research/tools/base.py`

```python
"""Base tool interface."""
from abc import ABC, abstractmethod
from typing import Any
from dataclasses import dataclass


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

**File**: `src/deep_research/tools/search.py`

```python
"""Web search tool using Brave or Serper API."""
import os
import httpx
from typing import Any

from .base import Tool, ToolResult
from ..utils.logger import get_logger

logger = get_logger(__name__)


class SearchTool(Tool):
    """Web search tool."""

    def __init__(self) -> None:
        self.api_key = os.getenv("BRAVE_API_KEY") or os.getenv("SERPER_API_KEY")
        self.provider = "brave" if os.getenv("BRAVE_API_KEY") else "serper"

        if not self.api_key:
            raise ValueError("No search API key found in environment")

    @property
    def name(self) -> str:
        return "search"

    @property
    def description(self) -> str:
        return "Search the web for information. Returns title, snippet, URL for results."

    async def execute(self, query: str, max_results: int = 10) -> ToolResult:
        """Execute web search."""
        logger.info("search_executing", query=query, provider=self.provider)

        try:
            if self.provider == "brave":
                results = await self._search_brave(query, max_results)
            else:
                results = await self._search_serper(query, max_results)

            content = self._format_results(results)

            return ToolResult(
                success=True,
                content=content,
                metadata={"query": query, "count": len(results), "provider": self.provider}
            )
        except Exception as e:
            logger.error("search_error", error=str(e))
            return ToolResult(
                success=False,
                content=f"Search failed: {str(e)}",
                metadata={"error": str(e)}
            )

    async def _search_brave(self, query: str, max_results: int) -> list[dict[str, Any]]:
        """Search using Brave API."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"X-Subscription-Token": self.api_key},
                params={"q": query, "count": max_results}
            )
            response.raise_for_status()
            data = response.json()

            return [
                {
                    "title": result.get("title", ""),
                    "snippet": result.get("description", ""),
                    "url": result.get("url", ""),
                }
                for result in data.get("web", {}).get("results", [])
            ]

    async def _search_serper(self, query: str, max_results: int) -> list[dict[str, Any]]:
        """Search using Serper API."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": self.api_key},
                json={"q": query, "num": max_results}
            )
            response.raise_for_status()
            data = response.json()

            return [
                {
                    "title": result.get("title", ""),
                    "snippet": result.get("snippet", ""),
                    "url": result.get("link", ""),
                }
                for result in data.get("organic", [])
            ]

    def _format_results(self, results: list[dict[str, Any]]) -> str:
        """Format search results for LLM."""
        formatted = "# Search Results\n\n"

        for i, result in enumerate(results, 1):
            formatted += f"## Result {i}\n"
            formatted += f"**Title**: {result['title']}\n"
            formatted += f"**URL**: {result['url']}\n"
            formatted += f"**Snippet**: {result['snippet']}\n\n"

        return formatted
```

**File**: `src/deep_research/tools/fetch.py`

```python
"""Web page fetching tool."""
import os
import httpx
from typing import Any

from .base import Tool, ToolResult
from ..utils.logger import get_logger

logger = get_logger(__name__)


class FetchTool(Tool):
    """Web page fetching tool."""

    def __init__(self) -> None:
        self.jina_key = os.getenv("JINA_API_KEY")

    @property
    def name(self) -> str:
        return "fetch"

    @property
    def description(self) -> str:
        return "Fetch and read webpage content. Returns clean text."

    async def execute(self, url: str) -> ToolResult:
        """Fetch webpage."""
        logger.info("fetch_executing", url=url)

        try:
            if self.jina_key:
                content = await self._fetch_jina(url)
            else:
                content = await self._fetch_simple(url)

            # Truncate to reasonable size
            max_chars = 10_000
            if len(content) > max_chars:
                content = content[:max_chars] + "\n\n[Content truncated...]"

            return ToolResult(
                success=True,
                content=content,
                metadata={"url": url, "length": len(content)}
            )
        except Exception as e:
            logger.error("fetch_error", url=url, error=str(e))
            return ToolResult(
                success=False,
                content=f"Failed to fetch {url}: {str(e)}",
                metadata={"error": str(e)}
            )

    async def _fetch_jina(self, url: str) -> str:
        """Fetch using Jina Reader API."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://r.jina.ai/{url}",
                headers={"Authorization": f"Bearer {self.jina_key}"}
            )
            response.raise_for_status()
            return response.text

    async def _fetch_simple(self, url: str) -> str:
        """Simple HTTP fetch with basic cleaning."""
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Basic HTML cleaning (real version should use readability-lxml)
            import re
            text = response.text
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', '', text)
            text = re.sub(r'\s+', ' ', text)

            return text.strip()
```

#### 4. LLM Client

**File**: `src/deep_research/llm/client.py`

```python
"""LLM client wrapper."""
import os
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic


def get_llm(model: str | None = None, temperature: float = 0.0) -> ChatOpenAI | ChatAnthropic:
    """Get LLM client based on environment."""
    model = model or os.getenv("DEFAULT_MODEL", "gpt-4o-mini")

    # Determine provider
    if os.getenv("OPENROUTER_API_KEY"):
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            default_headers={
                "HTTP-Referer": "https://github.com/yourusername/deep-research",
            }
        )
    elif os.getenv("ANTHROPIC_API_KEY"):
        return ChatAnthropic(
            model=model,
            temperature=temperature,
        )
    else:
        return ChatOpenAI(
            model=model,
            temperature=temperature,
        )
```

#### 5. Utilities

**File**: `src/deep_research/utils/logger.py`

```python
"""Structured logging."""
import structlog


def get_logger(name: str) -> structlog.BoundLogger:
    """Get structured logger."""
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer()
        ],
    )
    return structlog.get_logger(name)
```

**File**: `src/deep_research/utils/tokens.py`

```python
"""Token counting utilities."""
import tiktoken


def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Count tokens in text."""
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")

    return len(encoding.encode(text))
```

**File**: `src/deep_research/utils/store.py`

```python
"""File-based state storage."""
import json
from pathlib import Path
from typing import Any
from datetime import datetime


class FileStore:
    """Simple JSON file store."""

    def __init__(self, base_path: str = "outputs/sessions") -> None:
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save_session(self, session_id: str, data: dict[str, Any]) -> None:
        """Save session data."""
        path = self.base_path / f"{session_id}.json"

        data["saved_at"] = datetime.now().isoformat()

        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def load_session(self, session_id: str) -> dict[str, Any]:
        """Load session data."""
        path = self.base_path / f"{session_id}.json"

        with open(path, "r") as f:
            return json.load(f)

    def list_sessions(self) -> list[str]:
        """List all session IDs."""
        return [p.stem for p in self.base_path.glob("*.json")]
```

#### 6. CLI Implementation

**File**: `src/deep_research/cli.py`

```python
"""CLI entry point."""
import asyncio
from pathlib import Path
import click
from rich.console import Console
from rich.markdown import Markdown
from dotenv import load_dotenv

from .agent.react import ReactAgent
from .utils.store import FileStore
from .utils.logger import get_logger

load_dotenv()
console = Console()
logger = get_logger(__name__)


@click.group()
def cli() -> None:
    """Deep research agent CLI."""
    pass


@cli.command()
@click.argument("query")
@click.option("-o", "--output", type=click.Path(), help="Output file path")
@click.option("-m", "--model", help="LLM model to use")
@click.option("--max-iterations", type=int, default=20, help="Max iterations")
@click.option("--verbose", is_flag=True, help="Verbose output")
def research(
    query: str,
    output: str | None,
    model: str | None,
    max_iterations: int,
    verbose: bool,
) -> None:
    """Research a topic and generate a report."""

    async def _research() -> None:
        agent = ReactAgent(
            model=model or "gpt-4o-mini",
            max_iterations=max_iterations,
        )

        with console.status(f"[bold green]Researching: {query}"):
            report = await agent.research(query)

        # Display report
        if not output:
            console.print("\n")
            console.print(Markdown(report.content))
            console.print(f"\n[dim]Sources: {len(report.sources)}[/dim]")
            console.print(f"[dim]Iterations: {report.metadata['iterations']}[/dim]")
            console.print(f"[dim]Tokens: {report.metadata['tokens_used']}[/dim]")
        else:
            # Save to file
            Path(output).write_text(report.content)
            console.print(f"[green]✓[/green] Report saved to: {output}")

        # Save session
        if verbose:
            store = FileStore()
            session_id = f"session_{hash(query)}"
            store.save_session(session_id, {
                "query": query,
                "report": report.content,
                "sources": report.sources,
                "metadata": report.metadata,
            })
            console.print(f"[dim]Session saved: {session_id}[/dim]")

    asyncio.run(_research())


def main() -> None:
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
```

### Success Criteria

#### Automated Verification:
- [x] Dependencies install: `uv sync`
- [x] Linting passes: `uv run ruff check .`
- [x] Type checking passes: `uv run mypy src/`
- [x] Tests pass: `uv run pytest tests/`
- [ ] CLI runs: `uv run research "test query"` (requires API keys)
- [ ] Output file created: `uv run research "test" -o test.md && test -f test.md` (requires API keys)

#### Manual Verification:
- [ ] Research report is coherent and structured
- [ ] Sources are cited with working URLs
- [ ] Facts are accurate (spot-check 3-5 key points)
- [ ] Agent terminates gracefully (doesn't hit iteration limit on simple queries)
- [ ] Web searches return relevant results
- [ ] Fetched pages contain useful content (not just navigation/ads)
- [ ] Cost per query is <$0.05

### Deliverables

1. Working Python CLI: `uv run research <query>`
2. Markdown research reports with citations
3. Session logs saved to `outputs/sessions/`
4. Basic error handling and structured logging
5. README with setup instructions
6. Type-checked and linted codebase

### Example Usage

```bash
cd deep-research-agent

# Setup
uv sync
cp .env.example .env
# Edit .env with API keys

# Run research
uv run research "How does LangGraph work?"

# Save to file
uv run research "What is context engineering in AI agents?" -o context.md

# Use specific model
uv run research "Explain ReAct pattern" -m gpt-4o

# Verbose mode (saves session)
uv run research "Multi-agent systems" --verbose
```

---

## Phase 2: Multi-Agent Orchestration (Week 2)

### Overview

Upgrade to multi-agent architecture using LangGraph. A LeadResearcher orchestrates 3-5 parallel WorkerAgents, each exploring a focused sub-topic. Results are compressed and synthesized.

**Goal**: 3-5× faster research with better coverage.

### Changes Required

#### 1. Add LangGraph Dependencies

**File**: `pyproject.toml` (update dependencies)
```toml
dependencies = [
    # ... existing ...
    "langgraph>=0.2.0",
    "langchain-core>=0.3.0",
    "faiss-cpu>=1.9.0",  # For vector store (optional)
]
```

#### 2. LangGraph State Definition

**New File**: `src/deep_research/agent/state.py`

```python
"""LangGraph state definitions."""
from typing import Annotated, TypedDict
from operator import add


class ResearchState(TypedDict):
    """State for research graph."""
    # User input
    query: str

    # Orchestrator state
    complexity_score: float
    sub_tasks: list[dict]

    # Worker results (reducer appends)
    worker_results: Annotated[list[dict], add]

    # Final output
    report: str
    sources: list[str]
    metadata: dict
```

#### 3. LeadResearcher Orchestrator

**New File**: `src/deep_research/agent/orchestrator.py`

```python
"""LeadResearcher orchestrator using LangGraph."""
from typing import Any
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from pydantic import BaseModel

from .state import ResearchState
from .worker import WorkerAgent
from ..llm.client import get_llm
from ..utils.logger import get_logger

logger = get_logger(__name__)


class QueryAnalysis(BaseModel):
    """Query complexity analysis."""
    complexity: float  # 0.0-1.0
    specificity: float  # 0.0-1.0
    domains: list[str]
    multi_step: bool


class SubTask(BaseModel):
    """Sub-task for worker."""
    id: str
    objective: str
    tools: list[str]
    expected_output: str


class LeadResearcher:
    """Multi-agent orchestrator."""

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.model = model
        self.llm = get_llm(model)
        self.graph = self._build_graph()

    async def research(self, query: str) -> dict[str, Any]:
        """Execute multi-agent research."""
        initial_state: ResearchState = {
            "query": query,
            "complexity_score": 0.0,
            "sub_tasks": [],
            "worker_results": [],
            "report": "",
            "sources": [],
            "metadata": {}
        }

        result = await self.graph.ainvoke(initial_state)
        return result

    def _build_graph(self) -> StateGraph:
        """Build LangGraph workflow."""
        workflow = StateGraph(ResearchState)

        # Nodes
        workflow.add_node("analyze", self._analyze_query)
        workflow.add_node("plan", self._create_plan)
        workflow.add_node("worker", self._worker_execution)  # Parallel instances
        workflow.add_node("synthesize", self._synthesize_results)

        # Edges
        workflow.add_edge(START, "analyze")
        workflow.add_edge("analyze", "plan")

        # Dynamic fan-out to workers
        workflow.add_conditional_edges(
            "plan",
            self._spawn_workers,
            ["worker"]
        )

        workflow.add_edge("worker", "synthesize")
        workflow.add_edge("synthesize", END)

        return workflow.compile()

    async def _analyze_query(self, state: ResearchState) -> dict[str, Any]:
        """Analyze query complexity."""
        prompt = f"""Analyze this research query:

Query: {state['query']}

Return JSON:
{{
  "complexity": 0.0-1.0,
  "specificity": 0.0-1.0,
  "domains": ["domain1", "domain2"],
  "multi_step": true/false
}}
"""

        response = await self.llm.with_structured_output(QueryAnalysis).ainvoke(prompt)

        return {"complexity_score": response.complexity}

    async def _create_plan(self, state: ResearchState) -> dict[str, Any]:
        """Create research plan and sub-tasks."""
        # Determine number of workers
        complexity = state["complexity_score"]
        num_workers = 1 if complexity < 0.3 else (3 if complexity < 0.6 else 5)

        # Create sub-tasks
        prompt = f"""Decompose this query into {num_workers} focused sub-tasks:

Query: {state['query']}

Each sub-task should:
- Be independently researchable
- Have clear objective
- Minimize overlap

Return JSON array of:
{{
  "id": "task_1",
  "objective": "Clear research question",
  "tools": ["search", "fetch"],
  "expected_output": "What this delivers"
}}
"""

        sub_tasks = await self.llm.with_structured_output(list[SubTask]).ainvoke(prompt)

        return {"sub_tasks": [task.model_dump() for task in sub_tasks]}

    def _spawn_workers(self, state: ResearchState) -> list[Send]:
        """Spawn worker agents in parallel."""
        return [
            Send("worker", {"task": task})
            for task in state["sub_tasks"]
        ]

    async def _worker_execution(self, state: dict[str, Any]) -> dict[str, Any]:
        """Execute worker (runs in parallel)."""
        task = state["task"]

        worker = WorkerAgent(model=self.model)
        result = await worker.execute(task["objective"])

        # Compress findings
        summary = await self._compress(result.content, max_tokens=2000)

        return {
            "worker_results": [{
                "task_id": task["id"],
                "summary": summary,
                "sources": result.sources,
                "metadata": result.metadata
            }]
        }

    async def _synthesize_results(self, state: ResearchState) -> dict[str, Any]:
        """Synthesize worker findings."""
        summaries = [r["summary"] for r in state["worker_results"]]
        all_sources = []
        for r in state["worker_results"]:
            all_sources.extend(r["sources"])

        prompt = f"""Synthesize these research findings:

Query: {state['query']}

Findings from {len(summaries)} workers:
{"=" * 50}
{"\n\n".join(summaries)}

Create comprehensive markdown report with:
1. Summary
2. Key findings
3. Sources (cite all)
4. Conclusion
"""

        report = await self.llm.ainvoke(prompt)

        return {
            "report": report.content,
            "sources": list(set(all_sources)),
            "metadata": {
                "workers": len(summaries),
                "model": self.model,
            }
        }

    async def _compress(self, content: str, max_tokens: int) -> str:
        """Compress content to max tokens."""
        prompt = f"""Compress to {max_tokens} tokens, preserving key insights:

{content}
"""

        response = await self.llm.ainvoke(prompt, max_tokens=max_tokens)
        return response.content
```

#### 4. Worker Agent

**New File**: `src/deep_research/agent/worker.py`

```python
"""Worker agent for focused research."""
from dataclasses import dataclass
from typing import Any

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

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.agent = ReactAgent(
            model=model,
            max_iterations=15,  # Shorter budget than Lead
            max_tokens=50_000,
        )

    async def execute(self, objective: str) -> WorkerResult:
        """Execute focused research."""
        report = await self.agent.research(objective)

        return WorkerResult(
            objective=objective,
            content=report.content,
            sources=report.sources,
            metadata=report.metadata
        )
```

#### 5. Update CLI for Multi-Agent

**File**: `src/deep_research/cli.py` (add command)

```python
@cli.command()
@click.argument("query")
@click.option("-o", "--output", type=click.Path(), help="Output file")
@click.option("-m", "--model", help="LLM model")
@click.option("--verbose", is_flag=True, help="Verbose output")
def multi(
    query: str,
    output: str | None,
    model: str | None,
    verbose: bool,
) -> None:
    """Multi-agent research (Phase 2)."""
    from .agent.orchestrator import LeadResearcher

    async def _research() -> None:
        orchestrator = LeadResearcher(model=model or "gpt-4o-mini")

        with console.status(f"[bold green]Multi-agent research: {query}"):
            result = await orchestrator.research(query)

        # Display
        if not output:
            console.print("\n")
            console.print(Markdown(result["report"]))
            console.print(f"\n[dim]Workers: {result['metadata']['workers']}[/dim]")
            console.print(f"[dim]Sources: {len(result['sources'])}[/dim]")
        else:
            Path(output).write_text(result["report"])
            console.print(f"[green]✓[/green] Report saved: {output}")

    asyncio.run(_research())
```

### Success Criteria

#### Automated Verification:
- [x] Dependencies install: `uv sync`
- [x] Type check passes: `uv run mypy src/`
- [ ] Multi-agent runs: `uv run research multi "Complex topic"` (requires API keys)
- [ ] Parallel execution happens (check logs for concurrent workers)

#### Manual Verification:
- [ ] Multi-agent completes 2-3× faster than single-agent
- [ ] Reports are more comprehensive
- [ ] Worker summaries are distinct (not redundant)
- [ ] Synthesis is coherent
- [ ] All worker sources appear in final report
- [ ] Scaling adapts to query complexity (1-5 workers)

### Deliverables

1. LangGraph-based orchestration
2. LeadResearcher with query analysis
3. WorkerAgent with compression
4. Parallel execution with Send API
5. CLI command: `uv run research multi <query>`
6. Performance comparison metrics

---

## Phase 3: EDA & Notebook Generation (Week 3)

### Overview

Add data analysis capabilities. Agent takes CSV/Parquet files, performs EDA, and generates executable Jupyter notebooks with narrative structure.

**Goal**: `uv run research eda <dataset.csv>` produces Kaggle-quality notebooks.

### Changes Required

#### 1. Add Data Dependencies

**File**: `pyproject.toml` (update)
```toml
dependencies = [
    # ... existing ...
    "pandas>=2.2.0",
    "matplotlib>=3.9.0",
    "seaborn>=0.13.0",
    "duckdb>=1.1.0",
    "nbformat>=5.10.0",
    "jupyter-client>=8.6.0",
]
```

#### 2. Code Executor

**New File**: `src/deep_research/tools/executor.py`

```python
"""Safe code execution in Jupyter kernel."""
import ast
import queue
from typing import Any
from jupyter_client import KernelManager
from dataclasses import dataclass

from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ExecutionResult:
    """Code execution result."""
    success: bool
    stdout: str
    stderr: str
    display_data: list[Any]
    error: dict[str, Any] | None


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
        safe, msg = self.is_safe(code)
        if not safe:
            return ExecutionResult(
                success=False,
                stdout="",
                stderr=msg,
                display_data=[],
                error={"ename": "SafetyError", "evalue": msg, "traceback": []}
            )

        msg_id = self.kc.execute(code)
        outputs: dict[str, Any] = {
            "stdout": [],
            "stderr": [],
            "display_data": [],
            "error": None
        }

        # Collect outputs
        while True:
            try:
                msg = self.kc.get_iopub_msg(timeout=timeout)
                msg_type = msg["msg_type"]
                content = msg["content"]

                if msg_type == "stream":
                    outputs[content["name"]].append(content["text"])
                elif msg_type in ("display_data", "execute_result"):
                    outputs["display_data"].append(content["data"])
                elif msg_type == "error":
                    outputs["error"] = {
                        "ename": content["ename"],
                        "evalue": content["evalue"],
                        "traceback": content["traceback"]
                    }
                elif msg_type == "status" and content["execution_state"] == "idle":
                    break
            except queue.Empty:
                break

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

#### 3. Notebook Builder

**New File**: `src/deep_research/notebook/builder.py`

```python
"""Notebook generation."""
import nbformat
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell
from pathlib import Path


class NotebookBuilder:
    """Build narrative EDA notebooks."""

    ACTS = {
        "I": "Set the Scene",
        "II": "Meet the Data",
        "III": "Data Quality",
        "IV": "Target Analysis",
        "V": "Feature Exploration",
        "VI": "Sanity Baseline",
        "VII": "Insights & Next Steps",
    }

    def __init__(self, title: str) -> None:
        self.nb = new_notebook()
        self.title = title
        self.cells: list[Any] = []

    def add_act(self, act: str, markdown: str | None = None) -> None:
        """Add act header."""
        header = f"# Act {act}: {self.ACTS[act]}"
        self.cells.append(new_markdown_cell(header))

        if markdown:
            self.cells.append(new_markdown_cell(markdown))

    def add_code(self, code: str) -> None:
        """Add code cell."""
        self.cells.append(new_code_cell(code))

    def add_markdown(self, text: str) -> None:
        """Add markdown cell."""
        self.cells.append(new_markdown_cell(text))

    def save(self, path: str) -> None:
        """Save notebook."""
        self.nb.cells = self.cells

        with open(path, "w") as f:
            nbformat.write(self.nb, f)
```

#### 4. Data Agent

**New File**: `src/deep_research/agent/data_agent.py`

```python
"""Data analysis agent."""
import pandas as pd
from pathlib import Path

from ..tools.executor import CodeExecutor
from ..notebook.builder import NotebookBuilder
from ..llm.client import get_llm
from ..utils.logger import get_logger

logger = get_logger(__name__)


class DataAgent:
    """EDA and notebook generation agent."""

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.llm = get_llm(model)
        self.executor = CodeExecutor()

    async def analyze(self, filepath: str, goal: str | None = None) -> Path:
        """Perform EDA and generate notebook."""
        logger.info("eda_started", filepath=filepath)

        # Load data for schema
        df = pd.read_csv(filepath)
        schema = self._get_schema(df)

        # Create notebook
        nb_path = f"{filepath}.ipynb"
        nb = NotebookBuilder(f"EDA: {Path(filepath).name}")

        # Act I: Context
        context = await self._generate_context(filepath, schema, goal)
        nb.add_act("I", context)

        # Act II: Load data
        load_code = self._generate_load_code(filepath)
        nb.add_act("II", "Loading and inspecting the dataset.")
        nb.add_code(load_code)

        # Execute to get data in kernel
        self.executor.execute(load_code)

        # Act III: Data quality
        quality_code = self._generate_quality_code()
        nb.add_act("III", "Checking data quality and cleanliness.")
        nb.add_code(quality_code)

        quality_result = self.executor.execute(quality_code)
        interpretation = await self._interpret(quality_result.stdout, "data quality")
        nb.add_markdown(interpretation)

        # Act V: Feature exploration
        explore_code = self._generate_explore_code(schema)
        nb.add_act("V", "Exploring key features and relationships.")
        nb.add_code(explore_code)

        # Act VII: Insights
        insights = await self._generate_insights(schema, goal)
        nb.add_act("VII", insights)

        # Save
        nb.save(nb_path)
        logger.info("eda_completed", notebook=nb_path)

        # Cleanup
        self.executor.shutdown()

        return Path(nb_path)

    def _get_schema(self, df: pd.DataFrame) -> dict:
        """Extract schema information."""
        return {
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing": df.isnull().sum().to_dict(),
        }

    def _generate_load_code(self, filepath: str) -> str:
        """Generate data loading code."""
        return f"""import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)

# Load data
df = pd.read_csv('{filepath}')

# First look
print(f"Shape: {{df.shape}}")
df.head()
"""

    def _generate_quality_code(self) -> str:
        """Generate data quality check code."""
        return """# Missing values
missing = df.isnull().sum()
missing_pct = (missing / len(df)) * 100
print("Missing values:")
print(missing_pct[missing_pct > 0].sort_values(ascending=False))

# Duplicates
duplicates = df.duplicated().sum()
print(f"\\nDuplicates: {duplicates}")

# Data types
print("\\nData types:")
print(df.dtypes)
"""

    def _generate_explore_code(self, schema: dict) -> str:
        """Generate feature exploration code."""
        # Simple version - real version would be smarter
        numeric_cols = [
            col for col, dtype in schema["dtypes"].items()
            if dtype in ("int64", "float64")
        ][:3]

        code = "# Distributions\n"
        for col in numeric_cols:
            code += f"df['{col}'].hist(bins=30)\n"
            code += f"plt.title('{col} Distribution')\n"
            code += "plt.show()\n\n"

        return code

    async def _generate_context(
        self,
        filepath: str,
        schema: dict,
        goal: str | None
    ) -> str:
        """Generate Act I context."""
        prompt = f"""Create context for EDA notebook:

Dataset: {filepath}
Shape: {schema['shape']}
Goal: {goal or 'Exploratory analysis'}

Write 2-3 paragraphs covering:
- Audience
- Analysis goal
- Key hypotheses
"""

        response = await self.llm.ainvoke(prompt)
        return response.content

    async def _interpret(self, output: str, context: str) -> str:
        """Interpret code output."""
        prompt = f"""Interpret these {context} results:

{output}

Provide 2-3 sentence interpretation with actionable insights.
"""

        response = await self.llm.ainvoke(prompt)
        return response.content

    async def _generate_insights(self, schema: dict, goal: str | None) -> str:
        """Generate final insights."""
        prompt = f"""Generate final insights for EDA:

Schema: {schema}
Goal: {goal or 'General exploration'}

Provide:
1. 3 key insights
2. 1 recommendation
3. Next steps
"""

        response = await self.llm.ainvoke(prompt)
        return response.content
```

#### 5. CLI Enhancement

**File**: `src/deep_research/cli.py` (add command)

```python
@cli.command()
@click.argument("filepath", type=click.Path(exists=True))
@click.option("-g", "--goal", help="Analysis goal")
@click.option("-m", "--model", help="LLM model")
def eda(filepath: str, goal: str | None, model: str | None) -> None:
    """Generate EDA notebook from dataset."""
    from .agent.data_agent import DataAgent

    async def _analyze() -> None:
        agent = DataAgent(model=model or "gpt-4o-mini")

        with console.status(f"[bold green]Analyzing: {filepath}"):
            nb_path = await agent.analyze(filepath, goal)

        console.print(f"[green]✓[/green] Notebook saved: {nb_path}")
        console.print(f"[dim]Open with: jupyter lab {nb_path}[/dim]")

    asyncio.run(_analyze())
```

### Success Criteria

#### Automated Verification:
- [x] Dependencies install: `uv sync`
- [x] CLI command exists: `uv run research eda --help`
- [x] Tests pass: `uv run pytest tests/test_notebook.py tests/test_executor.py`
- [x] Type checking passes: `uv run mypy src/`
- [x] Linting passes: `uv run ruff check .`
- [ ] Notebook generated: `uv run research eda data/car_price_prediction_.csv` (requires API keys)

#### Manual Verification:
- [ ] Notebook opens in Jupyter
- [ ] "Run All Cells" executes without errors
- [ ] Narrative follows 7-act structure (all 7 acts present)
- [ ] Charts are embedded and meaningful
- [ ] Interpretations make sense
- [ ] Code is clean and documented

### Deliverables

1. Code executor with safety checks
2. Notebook builder with 7-act template
3. DataAgent orchestrating EDA
4. CLI command: `uv run research eda <file>`
5. Example notebooks

---

## Testing Strategy

### Unit Tests

**File**: `tests/test_tools.py`
```python
import pytest
from deep_research.tools.search import SearchTool
from deep_research.tools.fetch import FetchTool


@pytest.mark.asyncio
async def test_search_tool():
    """Test search tool."""
    tool = SearchTool()
    result = await tool.execute("LangGraph tutorial", max_results=5)

    assert result.success
    assert len(result.metadata["results"]) > 0


@pytest.mark.asyncio
async def test_fetch_tool():
    """Test fetch tool."""
    tool = FetchTool()
    result = await tool.execute("https://example.com")

    assert result.success
    assert len(result.content) > 0
```

### Integration Tests

**File**: `tests/test_agent.py`
```python
@pytest.mark.asyncio
async def test_react_agent():
    """Test end-to-end research."""
    agent = ReactAgent(model="gpt-4o-mini", max_iterations=10)
    report = await agent.research("What is Next.js?")

    assert report.content
    assert len(report.sources) > 0
    assert report.metadata["iterations"] < 10
```

### Manual Testing

1. **Phase 1**: Simple factual query: "What is Python?"
2. **Phase 2**: Complex query with multi-agent
3. **Phase 3**: Small CSV EDA

---

## Performance Considerations

- **Token Efficiency**: Use GPT-4o-mini for most tasks, GPT-4 for complex synthesis
- **Speed**: <2 min single-agent, <1 min multi-agent
- **Cost**: <$0.15 per task average

---

## References

- Research doc: `thoughts/shared/research/2025-11-15_multi-agent-deep-research-architecture-v2.md`
- LangGraph: https://langchain-ai.github.io/langgraph/
- uv: https://docs.astral.sh/uv/

---

## Document Metadata

**Version**: 1.0 (Pure Python MVP)
**Created**: 2025-11-15
**Scope**: 3-week implementation, Python-only
**Status**: Ready for implementation
