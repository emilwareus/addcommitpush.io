"""Web page fetching tool."""
import os
import re
from typing import Any

import httpx

from ..utils.logger import get_logger
from ..utils.verbose import get_verbose_console
from .base import Tool, ToolResult

logger = get_logger(__name__)
verbose = get_verbose_console()

# Shared HTTP client for fetch requests
_fetch_http_client: httpx.AsyncClient | None = None


def _get_fetch_http_client() -> httpx.AsyncClient:
    """Get or create shared HTTP client for fetching."""
    global _fetch_http_client
    if _fetch_http_client is None:
        _fetch_http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0),  # Longer timeout for page loads
            follow_redirects=True,
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        )
    return _fetch_http_client


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

    async def execute(self, **kwargs: Any) -> ToolResult:
        """Fetch webpage."""
        url: str = kwargs.get("url", "")
        method = "jina" if self.jina_key else "simple"

        # Verbose console output
        verbose.fetch_started(url)

        logger.info("fetch_started", url=url, method=method)

        try:
            if self.jina_key:
                content = await self._fetch_jina(url)
            else:
                content = await self._fetch_simple(url)

            # Truncate to reasonable size
            max_chars = 10_000
            original_length = len(content)
            was_truncated = False

            if len(content) > max_chars:
                content = content[:max_chars] + "\n\n[Content truncated...]"
                was_truncated = True

            logger.info(
                "fetch_completed",
                url=url,
                length=original_length,
                truncated=was_truncated,
            )

            # Verbose console output
            verbose.fetch_complete(url, original_length, was_truncated)

            return ToolResult(
                success=True, content=content, metadata={"url": url, "length": len(content)}
            )
        except Exception as e:
            logger.error("fetch_error", url=url, error=str(e))
            verbose.error(f"Failed to fetch: {str(e)}")
            return ToolResult(
                success=False,
                content=f"Failed to fetch {url}: {str(e)}",
                metadata={"error": str(e)},
            )

    async def _fetch_jina(self, url: str) -> str:
        """Fetch using Jina Reader API."""
        client = _get_fetch_http_client()
        response = await client.get(
            f"https://r.jina.ai/{url}", headers={"Authorization": f"Bearer {self.jina_key}"}
        )
        response.raise_for_status()
        return response.text

    async def _fetch_simple(self, url: str) -> str:
        """Simple HTTP fetch with basic cleaning."""
        client = _get_fetch_http_client()
        response = await client.get(url)
        response.raise_for_status()

        # Basic HTML cleaning (real version should use readability-lxml)
        text = response.text
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\s+", " ", text)

        return text.strip()
