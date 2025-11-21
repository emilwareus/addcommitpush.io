"""ReAct agent implementation."""
from datetime import datetime
import re
from dataclasses import dataclass
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import Runnable
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

from ..llm.client import get_llm
from ..models import SupportedModel
from ..tools.fetch import FetchTool
from ..tools.search import SearchTool
from ..utils.logger import get_logger
from ..utils.progress import NoOpProgress, ProgressCallback
from ..utils.tokens import count_tokens
from ..utils.verbose import get_verbose_console
from .prompts import RESEARCH_SYSTEM_PROMPT

logger = get_logger(__name__)
verbose = get_verbose_console()


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
        model: str | None = None,
        max_iterations: int = 20,
        max_tokens: int = 50_000,
        progress: ProgressCallback | None = None,
        worker_id: str = "",
    ) -> None:
        # Resolve model to SupportedModel enum, defaulting if not provided
        if model:
            selected_model = SupportedModel.from_string(model)
            if not selected_model:
                raise ValueError(f"Unsupported model: {model}")
            self.model = selected_model.model_name
        else:
            selected_model = SupportedModel.default()
            self.model = selected_model.model_name

        self.max_iterations = max_iterations
        self.max_tokens = max_tokens
        self.pricing = selected_model.pricing
        self.progress = progress or NoOpProgress()
        self.worker_id = worker_id

        # Initialize tool instances
        self._search_tool = SearchTool()
        self._fetch_tool = FetchTool()

        # Create LangChain tools
        @tool
        async def search(query: str | list[str], max_results: int = 10) -> str:
            """Search the web for information.

            Args:
                query: A single search query string (e.g., "Python programming language")
                max_results: Maximum number of results to return (default: 10)

            Returns:
                Search results with title, snippet, and URL for each result
            """
            # Coerce list to string if model passes a list
            if isinstance(query, list):
                original_query = query
                query = " ".join(str(q) for q in query if q)
                verbose.print(f"Coerced list {original_query} to string: '{query[:100]}'", style="yellow")
                logger.warning("search_arg_coerced", original_type="list", coerced_value=query[:100])

            self.progress.on_worker_tool_use(self.worker_id, "search", f"Searching: {query}")
            result = await self._search_tool.execute(query=query, max_results=max_results)
            return result.content

        @tool
        async def fetch(url: str | list[str]) -> str:
            """Fetch and read webpage content.

            Args:
                url: A single URL string to fetch (e.g., "https://example.com")

            Returns:
                Clean text content from the webpage
            """
            # Coerce list to string if model passes a list (take first URL)
            if isinstance(url, list):
                original_url = url
                url = str(url[0]) if url else ""
                verbose.print(f"Coerced list {original_url} to single URL: '{url}'", style="yellow")
                logger.warning("fetch_arg_coerced", original_type="list", coerced_value=url)

            # Truncate URL for display
            display_url = url if len(url) <= 50 else url[:47] + "..."
            self.progress.on_worker_tool_use(self.worker_id, "fetch", f"Reading: {display_url}")
            result = await self._fetch_tool.execute(url=url)
            # Track visited URLs
            if result.success:
                self.visited_urls.add(url)
            return result.content

        self.tools = [search, fetch]

        # Bind tools to LLM
        base_llm: ChatOpenAI = get_llm(model, temperature=0.0)
        self.llm: Runnable[Any, AIMessage] = base_llm.bind_tools(self.tools)

        self.messages: list[Any] = []
        self.iterations = 0
        self.tokens_used = 0
        self.prompt_tokens = 0
        self.completion_tokens = 0
        self.visited_urls: set[str] = set()  # Track actually fetched URLs
        self.react_iterations: list[dict[str, Any]] = []  # Track for export

    async def research(self, query: str) -> ResearchReport:
        """Execute research on query."""
        logger.info("research_started", query=query, model=self.model)
        self.iterations = 0
        self.tokens_used = 0
        self.prompt_tokens = 0
        self.completion_tokens = 0
        self.visited_urls = set()  # Reset visited URLs
        self.react_iterations = []  # Reset iterations

        # Initialize messages
        self.messages = [
            SystemMessage(content=RESEARCH_SYSTEM_PROMPT),
            HumanMessage(content=f"Research this topic: {query}"),
        ]

        # ReAct loop
        while self.iterations < self.max_iterations:
            response = await self._step()

            # Check for completion
            if self._has_answer(response):
                answer = self._extract_answer(response)
                visited_sources = sorted(list(self.visited_urls))

                logger.info(
                    "research_completed",
                    iterations=self.iterations,
                    tokens=self.tokens_used,
                    visited=len(visited_sources),
                )

                return ResearchReport(
                    query=query,
                    content=answer,
                    sources=visited_sources,
                    metadata={
                        "model": self.model,
                        "iterations": self.iterations,
                        "tokens_used": self.tokens_used,
                        "prompt_tokens": self.prompt_tokens,
                        "completion_tokens": self.completion_tokens,
                        "visited_sources": len(visited_sources),
                        "react_iterations": self.react_iterations,
                        **self._build_cost_metadata(),
                    },
                )

            # Check budget
            if self.tokens_used > self.max_tokens * 0.9:
                logger.warning("approaching_token_budget", tokens=self.tokens_used)
                self.messages.append(
                    SystemMessage(content="Token budget nearly exhausted. Provide answer now.")
                )

        # Max iterations reached
        logger.warning("max_iterations_reached", iterations=self.iterations)
        visited_sources = sorted(list(self.visited_urls))
        return ResearchReport(
            query=query,
            content="Research incomplete due to iteration limit.",
            sources=visited_sources,
            metadata={
                "error": "max_iterations",
                "model": self.model,
                "iterations": self.iterations,
                "tokens_used": self.tokens_used,
                "prompt_tokens": self.prompt_tokens,
                "completion_tokens": self.completion_tokens,
                "visited_sources": len(visited_sources),
                **self._build_cost_metadata(),
            },
        )

    async def _step(self) -> str:
        """Execute one ReAct step with full trace capture."""
        self.iterations += 1
        verbose.iteration(self.iterations, self.max_iterations)
        logger.info("reasoning_step", iteration=self.iterations, max_iterations=self.max_iterations)

        # Truncate message history if too long (keep system message + last N messages)
        max_messages = 20  # Keep system message + last 19 messages
        if len(self.messages) > max_messages:
            system_msg = self.messages[0]  # Keep system message
            recent_messages = self.messages[-(max_messages - 1) :]  # Keep recent messages
            self.messages = [system_msg] + recent_messages
            logger.debug("messages_truncated", kept=len(self.messages))

        # Get LLM response with error handling
        try:
            response = await self.llm.ainvoke(self.messages)
            content = response.content
            self._record_llm_usage(response)
        except Exception as e:
            logger.error("llm_error", error=str(e), iteration=self.iterations)
            # Return a fallback response to continue gracefully
            raise RuntimeError(f"LLM invocation failed: {str(e)}")

        # Extract thought (content before tool calls)
        thought_text = ""
        if isinstance(content, str):
            thought_text = content
        elif isinstance(content, list):
            # Content might be a list of blocks
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    thought_text += block.get("text", "")
                elif isinstance(block, str):
                    thought_text += block

        # Clean up and extract meaningful thoughts
        display_thought = thought_text
        if display_thought:
            # Remove answer tags if present
            if "<answer>" in display_thought:
                display_thought = display_thought.split("<answer>")[0].strip()

            # Remove tool_calls tags if present (some models wrap them)
            if "<tool_calls>" in display_thought:
                display_thought = display_thought.split("<tool_calls>")[0].strip()

            # Show the thought if it's substantial
            display_thought = display_thought.strip()
            if len(display_thought) > 20:  # At least 20 chars to be meaningful
                # Limit to 800 chars for readability
                preview_text = display_thought[:800]
                if len(display_thought) > 800:
                    preview_text += "..."
                verbose.thinking(preview_text)

        # Track tool calls for this iteration
        iteration_tool_calls: list[dict[str, Any]] = []
        combined_observation = ""

        # Add AI message to history
        self.messages.append(response)

        # Check for answer
        if self._has_answer(str(content)):
            # Capture final iteration (thought only, no actions)
            self.react_iterations.append({
                "iteration": self.iterations,
                "thought": thought_text,
                "actions": [],
                "observation": "",
                "timestamp": datetime.now().isoformat(),
            })
            return str(content)

        # Execute tool calls
        if hasattr(response, "tool_calls") and response.tool_calls:
            # Show tool decisions as reasoning when there's no text content
            if not display_thought or len(display_thought) < 20:
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]

                    # Format the reasoning based on tool
                    if tool_name == "search":
                        query = args.get("query", "")
                        verbose.thinking(
                            f"I need to search for: '{query}'\n"
                            f"This will help me find relevant information about the topic."
                        )
                    elif tool_name == "fetch":
                        url = args.get("url", "")[:80]
                        verbose.thinking(
                            f"I should read this source: {url}\n"
                            f"This will provide detailed information."
                        )

            logger.info("agent_taking_action", num_tools=len(response.tool_calls))
            for tool_call in response.tool_calls:
                # Capture tool call metadata
                tool_start = datetime.now()
                tool_success = True
                tool_result = ""

                # Log the tool execution with args
                args_str = str(tool_call["args"])
                if len(args_str) > 100:
                    args_str = args_str[:97] + "..."
                logger.debug("tool_executing", tool=tool_call["name"], args=args_str)

                # Find and execute the tool
                for tool_instance in self.tools:
                    if tool_instance.name == tool_call["name"]:
                        try:
                            verbose.print(f"Executing {tool_call['name']} with args: {tool_call['args']}", style="dim")
                            result_val = await tool_instance.ainvoke(tool_call["args"])
                            tool_result = str(result_val)
                            verbose.print(f"Tool {tool_call['name']} returned {len(tool_result)} chars", style="dim")
                            logger.debug("tool_success", tool=tool_call["name"])
                            
                            combined_observation += f"Tool {tool_call['name']} output:\n{tool_result[:500]}...\n\n"
                        except Exception as e:
                            logger.error("tool_error", tool=tool_call["name"], error=str(e))
                            verbose.error(f"Tool {tool_call['name']} failed: {str(e)}")
                            tool_result = f"Tool error: {str(e)}"
                            tool_success = False
                            combined_observation += f"Tool {tool_call['name']} error: {str(e)}\n\n"
                        break

                # Record tool call
                tool_end = datetime.now()
                tool_duration = (tool_end - tool_start).total_seconds()
                
                iteration_tool_calls.append({
                    "tool_name": tool_call["name"],
                    "arguments": tool_call["args"],
                    "result": tool_result,
                    "success": tool_success,
                    "duration_seconds": tool_duration,
                    "timestamp": tool_start.isoformat(),
                    "iteration": self.iterations,
                })

                # Add tool result to messages
                self.messages.append(
                    ToolMessage(content=tool_result, tool_call_id=tool_call["id"])
                )

        # Capture complete iteration
        self.react_iterations.append({
            "iteration": self.iterations,
            "thought": thought_text,
            "actions": iteration_tool_calls,
            "observation": combined_observation,
            "timestamp": datetime.now().isoformat(),
        })

        return str(content)

    def _has_answer(self, content: str) -> bool:
        """Check if response contains final answer."""
        has_answer = "<answer>" in content
        if has_answer:
            verbose.final_answer(self.iterations)
            logger.info("final_answer_ready", iteration=self.iterations)
        return has_answer

    def _extract_answer(self, content: str) -> str:
        """Extract answer from response."""
        match = re.search(r"<answer>(.*?)</answer>", content, re.DOTALL)
        return match.group(1).strip() if match else content

    def _extract_sources(self) -> list[str]:
        """Extract visited URLs (fetched sources only)."""
        return sorted(list(self.visited_urls))

    def _record_llm_usage(self, response: Any) -> None:
        """Track prompt/completion tokens using usage metadata when available."""
        usage = getattr(response, "usage_metadata", None)

        if usage:
            self.prompt_tokens += int(usage.get("input_tokens") or 0)
            self.completion_tokens += int(usage.get("output_tokens") or 0)
        else:
            # Fallback: approximate completion tokens by counting response text.
            self.completion_tokens += count_tokens(str(response.content))

        self.tokens_used = self.prompt_tokens + self.completion_tokens

    def _build_cost_metadata(self) -> dict[str, Any]:
        """Return pricing metadata if available."""
        if not self.pricing:
            return {}

        breakdown = self.pricing.estimate_cost(
            self.prompt_tokens, self.completion_tokens
        )
        return {
            "pricing": self.pricing.as_dict(),
            "cost": breakdown.as_dict(),
        }
