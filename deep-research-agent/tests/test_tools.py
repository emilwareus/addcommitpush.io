"""Tests for tools."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from deep_research.tools.fetch import FetchTool
from deep_research.tools.search import SearchTool


@pytest.mark.asyncio
async def test_search_tool_brave_success():
    """Test search tool with successful Brave API response."""
    with patch.dict("os.environ", {"BRAVE_API_KEY": "test-key"}):
        tool = SearchTool()

        # Mock httpx response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "web": {
                "results": [
                    {
                        "title": "LangGraph Tutorial",
                        "description": "Learn how to use LangGraph",
                        "url": "https://example.com/tutorial",
                    },
                    {
                        "title": "LangGraph Docs",
                        "description": "Official documentation",
                        "url": "https://example.com/docs",
                    },
                ]
            }
        }
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await tool.execute(query="LangGraph tutorial", max_results=5)

            assert result.success
            assert "LangGraph Tutorial" in result.content
            assert "https://example.com/tutorial" in result.content
            assert result.metadata["query"] == "LangGraph tutorial"
            assert result.metadata["count"] == 2
            assert result.metadata["provider"] == "brave"


@pytest.mark.asyncio
async def test_search_tool_no_api_key():
    """Test search tool raises error without API key."""
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(ValueError, match="BRAVE_API_KEY is required"):
            SearchTool()


@pytest.mark.asyncio
async def test_search_tool_api_error():
    """Test search tool handles API errors gracefully."""
    with patch.dict("os.environ", {"BRAVE_API_KEY": "test-key"}):
        tool = SearchTool()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=Exception("API error")
            )

            result = await tool.execute(query="test", max_results=5)

            assert not result.success
            assert "Search failed" in result.content
            assert "API error" in result.metadata["error"]


@pytest.mark.asyncio
async def test_fetch_tool_simple_success():
    """Test fetch tool with simple HTTP fetch."""
    with patch.dict("os.environ", {}, clear=True):
        tool = FetchTool()

        # Mock httpx response with simple HTML
        mock_response = MagicMock()
        mock_response.text = """
        <html>
            <head><title>Test Page</title></head>
            <body>
                <script>alert('test');</script>
                <style>body { color: red; }</style>
                <h1>Main Content</h1>
                <p>This is test content.</p>
            </body>
        </html>
        """
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await tool.execute(url="https://example.com")

            assert result.success
            assert "Main Content" in result.content
            assert "This is test content" in result.content
            # Scripts and styles should be removed
            assert "alert('test')" not in result.content
            assert "color: red" not in result.content
            assert result.metadata["url"] == "https://example.com"


@pytest.mark.asyncio
async def test_fetch_tool_jina_success():
    """Test fetch tool with Jina Reader API."""
    with patch.dict("os.environ", {"JINA_API_KEY": "test-jina-key"}):
        tool = FetchTool()

        mock_response = MagicMock()
        mock_response.text = "Clean markdown content from Jina"
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await tool.execute(url="https://example.com")

            assert result.success
            assert "Clean markdown content from Jina" in result.content


@pytest.mark.asyncio
async def test_fetch_tool_truncation():
    """Test fetch tool truncates long content."""
    with patch.dict("os.environ", {}, clear=True):
        tool = FetchTool()

        # Create content longer than 10,000 chars
        long_content = "a" * 15000
        mock_response = MagicMock()
        mock_response.text = f"<html><body>{long_content}</body></html>"
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await tool.execute(url="https://example.com")

            assert result.success
            assert len(result.content) <= 10050  # 10000 + truncation message
            assert "[Content truncated...]" in result.content


@pytest.mark.asyncio
async def test_fetch_tool_error_handling():
    """Test fetch tool handles network errors."""
    with patch.dict("os.environ", {}, clear=True):
        tool = FetchTool()

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=Exception("Network error")
            )

            result = await tool.execute(url="https://example.com")

            assert not result.success
            assert "Failed to fetch" in result.content
            assert "Network error" in result.content


def test_tool_properties():
    """Test tool name and description properties."""
    with patch.dict("os.environ", {"BRAVE_API_KEY": "test-key"}):
        search_tool = SearchTool()
        assert search_tool.name == "search"
        assert "Search the web" in search_tool.description

    with patch.dict("os.environ", {}, clear=True):
        fetch_tool = FetchTool()
        assert fetch_tool.name == "fetch"
        assert "Fetch and read webpage" in fetch_tool.description
