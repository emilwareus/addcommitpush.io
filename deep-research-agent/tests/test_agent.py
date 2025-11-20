"""Tests for ReAct agent."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from deep_research.agent.react import ReactAgent, ResearchReport
from deep_research.tools.base import ToolResult


@pytest.fixture
def mock_llm():
    """Create a mock LLM for testing."""
    mock = MagicMock()
    mock.bind_tools = MagicMock(return_value=mock)
    return mock


@pytest.fixture
def mock_search_tool():
    """Create a mock search tool."""
    with patch("deep_research.agent.react.SearchTool") as mock:
        instance = mock.return_value
        search_content = (
            "# Search Results\n\n## Result 1\n**Title**: Test\n"
            "**URL**: https://example.com\n**Snippet**: Test content"
        )
        instance.execute = AsyncMock(
            return_value=ToolResult(
                success=True,
                content=search_content,
                metadata={"query": "test", "count": 1, "provider": "brave"},
            )
        )
        yield instance


@pytest.fixture
def mock_fetch_tool():
    """Create a mock fetch tool."""
    with patch("deep_research.agent.react.FetchTool") as mock:
        instance = mock.return_value
        instance.execute = AsyncMock(
            return_value=ToolResult(
                success=True,
                content="Test webpage content with useful information.",
                metadata={"url": "https://example.com", "length": 100},
            )
        )
        yield instance


@pytest.mark.asyncio
async def test_agent_initialization():
    """Test agent initialization with default parameters."""
    with patch("deep_research.agent.react.get_llm"):
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                agent = ReactAgent()

                assert agent.model == "alibaba/tongyi-deepresearch-30b-a3b"
                assert agent.max_iterations == 20
                assert agent.max_tokens == 50_000
                assert agent.iterations == 0
                assert agent.tokens_used == 0
                assert len(agent.tools) == 3  # search, fetch, eda


@pytest.mark.asyncio
async def test_agent_custom_parameters():
    """Test agent initialization with custom parameters."""
    with patch("deep_research.agent.react.get_llm"):
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                agent = ReactAgent(
                    model="alibaba/tongyi-deepresearch-30b-a3b",
                    max_iterations=10,
                    max_tokens=100_000,
                )

                assert agent.model == "alibaba/tongyi-deepresearch-30b-a3b"
                assert agent.max_iterations == 10
                assert agent.max_tokens == 100_000


@pytest.mark.asyncio
async def test_research_simple_answer():
    """Test research with immediate answer."""
    with patch("deep_research.agent.react.get_llm") as mock_get_llm:
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                # Mock LLM to return answer immediately
                mock_llm = MagicMock()
                mock_response = MagicMock()
                mock_response.content = """
                <answer>
                # What is Python?

                Python is a high-level programming language.

                ## Sources
                - [Python.org](https://python.org)
                </answer>
                """
                mock_response.tool_calls = []
                mock_llm.ainvoke = AsyncMock(return_value=mock_response)
                mock_llm.bind_tools = MagicMock(return_value=mock_llm)
                mock_get_llm.return_value = mock_llm

                agent = ReactAgent()
                report = await agent.research("What is Python?")

                assert isinstance(report, ResearchReport)
                assert report.query == "What is Python?"
                assert "Python is a high-level programming language" in report.content
                assert report.metadata["iterations"] == 1
                assert report.metadata["model"] == "alibaba/tongyi-deepresearch-30b-a3b"


@pytest.mark.asyncio
async def test_research_with_tool_calls():
    """Test research with tool execution."""
    with patch("deep_research.agent.react.get_llm") as mock_get_llm:
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                mock_llm = MagicMock()

                # First call: use search tool
                first_response = MagicMock()
                first_response.content = "Let me search for information."
                first_response.tool_calls = [
                    {"id": "call_1", "name": "search", "args": {"query": "test"}}
                ]

                # Second call: provide answer
                second_response = MagicMock()
                second_response.content = """
                <answer>
                # Research Report

                Based on my search, here are the findings.

                ## Sources
                - [Example](https://example.com)
                </answer>
                """
                second_response.tool_calls = []

                mock_llm.ainvoke = AsyncMock(side_effect=[first_response, second_response])
                mock_llm.bind_tools = MagicMock(return_value=mock_llm)
                mock_get_llm.return_value = mock_llm

                # Mock the tool
                mock_tool = AsyncMock()
                mock_tool.name = "search"
                mock_tool.ainvoke = AsyncMock(return_value="Search results here")

                agent = ReactAgent()
                agent.tools = [mock_tool]

                report = await agent.research("test query")

                assert isinstance(report, ResearchReport)
                assert report.metadata["iterations"] == 2
                assert mock_tool.ainvoke.called


@pytest.mark.asyncio
async def test_research_max_iterations():
    """Test research stops at max iterations."""
    with patch("deep_research.agent.react.get_llm") as mock_get_llm:
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                mock_llm = MagicMock()

                # Always return response without answer
                mock_response = MagicMock()
                mock_response.content = "Still thinking..."
                mock_response.tool_calls = []
                mock_llm.ainvoke = AsyncMock(return_value=mock_response)
                mock_llm.bind_tools = MagicMock(return_value=mock_llm)
                mock_get_llm.return_value = mock_llm

                agent = ReactAgent(max_iterations=5)
                report = await agent.research("test query")

                assert report.metadata["iterations"] == 5
                assert "incomplete" in report.content.lower()
                assert report.metadata.get("error") == "max_iterations"


@pytest.mark.asyncio
async def test_research_token_budget_warning():
    """Test research warns when approaching token budget."""
    with patch("deep_research.agent.react.get_llm") as mock_get_llm:
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                with patch("deep_research.agent.react.count_tokens") as mock_count:
                    # Simulate high token usage
                    mock_count.return_value = 46_000  # 92% of 50k budget

                    mock_llm = MagicMock()
                    mock_response = MagicMock()
                    mock_response.content = """
                    <answer>
                    # Report
                    Final answer after token warning.
                    </answer>
                    """
                    mock_response.tool_calls = []
                    mock_llm.ainvoke = AsyncMock(return_value=mock_response)
                    mock_llm.bind_tools = MagicMock(return_value=mock_llm)
                    mock_get_llm.return_value = mock_llm

                    agent = ReactAgent()
                    report = await agent.research("test")

                    # Should complete but have logged warning
                    assert isinstance(report, ResearchReport)
                    assert report.metadata["tokens_used"] > 0


def test_extract_answer():
    """Test answer extraction from content."""
    with patch("deep_research.agent.react.get_llm"):
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                agent = ReactAgent()

                content = """
                Some thinking here.
                <answer>
                # Final Report
                This is the answer.
                </answer>
                """

                answer = agent._extract_answer(content)
                assert "# Final Report" in answer
                assert "This is the answer." in answer
                assert "Some thinking" not in answer


def test_extract_sources():
    """Test URL extraction from messages."""
    with patch("deep_research.agent.react.get_llm"):
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                from langchain_core.messages import AIMessage, ToolMessage

                agent = ReactAgent()

                agent.messages = [
                    AIMessage(content="Check https://example.com for info"),
                    ToolMessage(
                        content="Found at https://docs.example.com",
                        tool_call_id="call_1",
                    ),
                    AIMessage(content="Also see https://example.com again"),
                ]

                sources = agent._extract_sources()

                assert len(sources) == 2  # Duplicates removed
                assert "https://example.com" in sources
                assert "https://docs.example.com" in sources


def test_has_answer():
    """Test answer detection."""
    with patch("deep_research.agent.react.get_llm"):
        with patch("deep_research.agent.react.SearchTool"):
            with patch("deep_research.agent.react.FetchTool"):
                agent = ReactAgent()

                assert agent._has_answer("<answer>test</answer>")
                assert agent._has_answer("Some text <answer>test</answer> more text")
                assert not agent._has_answer("No answer here")
                assert not agent._has_answer("<think>thinking</think>")
