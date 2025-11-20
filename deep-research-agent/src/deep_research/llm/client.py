"""LLM client wrapper."""
import os

import httpx
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from ..models import SupportedModel

# Shared HTTP client with higher connection limits for concurrent workers
_shared_http_client: httpx.AsyncClient | None = None


def _get_shared_http_client() -> httpx.AsyncClient:
    """Get or create shared HTTP client with optimized settings for parallel workers."""
    global _shared_http_client
    if _shared_http_client is None:
        _shared_http_client = httpx.AsyncClient(
            limits=httpx.Limits(
                max_connections=100,  # Total connection pool
                max_keepalive_connections=50,  # Keep alive connections
                keepalive_expiry=30.0,  # Keep connections alive for 30s
            ),
            timeout=httpx.Timeout(
                connect=10.0,  # 10s to establish connection
                read=120.0,  # 2 minutes to read response
                write=10.0,  # 10s to write request
                pool=5.0,  # 5s to get connection from pool
            ),
        )
    return _shared_http_client


def get_llm(model: str | None = None, temperature: float = 0.0) -> ChatOpenAI:
    """Get LLM client configured for OpenRouter with shared HTTP client."""
    model_name: str
    if model:
        model_name = model
    elif os.getenv("DEFAULT_MODEL"):
        model_name = str(os.getenv("DEFAULT_MODEL"))
    else:
        model_name = SupportedModel.default().model_name

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENROUTER_API_KEY is required. "
            "Please set it in your .env file or environment variables."
        )

    return ChatOpenAI(
        model=model_name,
        temperature=temperature,
        base_url="https://openrouter.ai/api/v1",
        api_key=SecretStr(api_key),
        default_headers={
            "HTTP-Referer": "https://github.com/emilwareus/deep-research",
        },
        max_retries=2,  # Retry failed requests
        http_async_client=_get_shared_http_client(),  # Share HTTP client across all LLMs
    )
