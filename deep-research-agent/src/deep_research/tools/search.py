"""Web search tool using Brave Search API."""
import os
from typing import Any

import httpx

from ..utils.logger import get_logger
from ..utils.verbose import get_verbose_console
from .base import Tool, ToolResult

logger = get_logger(__name__)
verbose = get_verbose_console()

# Shared HTTP client for search requests
_search_http_client: httpx.AsyncClient | None = None


def _get_search_http_client() -> httpx.AsyncClient:
    """Get or create shared HTTP client for search."""
    global _search_http_client
    if _search_http_client is None:
        _search_http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        )
    return _search_http_client


class SearchTool(Tool):
    """Web search tool."""

    def __init__(self) -> None:
        self.api_key = os.getenv("BRAVE_API_KEY")

        if not self.api_key:
            raise ValueError(
                "BRAVE_API_KEY is required. "
                "Please set it in your .env file or environment variables."
            )

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

        # Verbose console output
        verbose.search_started(query)

        logger.info("search_started", query=query, max_results=max_results, provider="brave")

        try:
            results = await self._search_brave(query, max_results)
            logger.info("search_results_received", query=query, count=len(results))

            # Show each result in verbose mode
            for i, result in enumerate(results, 1):
                verbose.search_result(
                    i,
                    result.get("title", ""),
                    result.get("url", ""),
                )

            verbose.search_complete(len(results))
            content = self._format_results(results)

            return ToolResult(
                success=True,
                content=content,
                metadata={"query": query, "count": len(results), "provider": "brave"},
            )
        except Exception as e:
            logger.error("search_error", query=query, error=str(e))
            verbose.error(f"Search failed: {str(e)}")
            return ToolResult(
                success=False, content=f"Search failed: {str(e)}", metadata={"error": str(e)}
            )

    async def _search_brave(self, query: str, max_results: int) -> list[dict[str, Any]]:
        """Search using Brave API."""
        if not self.api_key:
            raise ValueError("API key is required for search")
        client = _get_search_http_client()
        response = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"X-Subscription-Token": self.api_key},
            params={"q": query, "count": max_results},
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

    def _format_results(self, results: list[dict[str, Any]]) -> str:
        """Format search results for LLM."""
        formatted = "# Search Results\n\n"

        for i, result in enumerate(results, 1):
            formatted += f"## Result {i}\n"
            formatted += f"**Title**: {result['title']}\n"
            formatted += f"**URL**: {result['url']}\n"
            formatted += f"**Snippet**: {result['snippet']}\n\n"

        return formatted
