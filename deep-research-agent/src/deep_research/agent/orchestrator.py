"""LeadResearcher orchestrator using LangGraph."""

import json
from typing import Any

import httpx
from langgraph.constants import Send
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ValidationError

from ..llm.client import get_llm
from ..models import SupportedModel
from ..utils.logger import get_logger
from ..utils.progress import NoOpProgress, ProgressCallback
from ..utils.tokens import count_tokens
from .state import ResearchState
from .worker import WorkerAgent

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

    def __init__(
        self,
        model: str | None = None,
        progress: ProgressCallback | None = None,
    ) -> None:
        # Resolve model to SupportedModel enum, defaulting if not provided
        if model:
            selected_model = SupportedModel.from_string(model)
            if not selected_model:
                raise ValueError(f"Unsupported model: {model}")
            self.model = selected_model.model_name
            self.pricing = selected_model.pricing
        else:
            selected_model = SupportedModel.default()
            self.model = selected_model.model_name
            self.pricing = selected_model.pricing

        self.llm = get_llm(self.model)
        self.progress = progress or NoOpProgress()
        self.graph = self._build_graph()
        self._reset_usage_tracking()

    async def research(self, query: str) -> dict[str, Any]:
        """Execute multi-agent research."""
        self._reset_usage_tracking()
        initial_state: ResearchState = {
            "query": query,
            "complexity_score": 0.0,
            "sub_tasks": [],
            "worker_results": [],
            "report": "",
            "sources": [],
            "metadata": {},
        }

        result = await self.graph.ainvoke(initial_state)
        return self._attach_cost_metadata(result)

    def _build_graph(self) -> Any:
        """Build LangGraph workflow."""
        workflow = StateGraph(ResearchState)

        # Nodes
        workflow.add_node("analyze", self._analyze_query)
        workflow.add_node("plan", self._create_plan)
        # Worker receives custom state via Send API, not full ResearchState
        workflow.add_node("worker", self._worker_execution)  # type: ignore[type-var]
        workflow.add_node("synthesize", self._synthesize_results)

        # Edges
        workflow.add_edge(START, "analyze")
        workflow.add_edge("analyze", "plan")

        # Dynamic fan-out to workers
        workflow.add_conditional_edges("plan", self._spawn_workers, ["worker"])

        workflow.add_edge("worker", "synthesize")
        workflow.add_edge("synthesize", END)

        # Compile with checkpointer disabled for full parallelism
        return workflow.compile(debug=False)

    async def _analyze_query(self, state: ResearchState) -> dict[str, float]:
        """Analyze query complexity."""
        logger.info("analyzing_query", query=state["query"])
        prompt = f"""Analyze this research query and return ONLY valid JSON.

Query: {state['query']}

IMPORTANT: Return ONLY a JSON object with exactly these fields.
No markdown, no explanation, nothing else.

Example format:
{{
  "complexity": 0.5,
  "specificity": 0.7,
  "domains": ["technology", "software"],
  "multi_step": false
}}

Your response must be a JSON object with:
- complexity: float between 0.0 and 1.0 (0.0 = very simple, 1.0 = very complex)
- specificity: float between 0.0 and 1.0 (0.0 = very vague, 1.0 = very specific)
- domains: array of domain names (e.g., ["technology", "business", "science"])
- multi_step: boolean (true if requires multiple research steps, false if single step)
"""

        response = await self.llm.ainvoke(prompt)
        self._record_lead_usage(response)

        # Check for empty response
        if not response.content or not str(response.content).strip():
            logger.error("empty_llm_response_analyze", prompt_preview=prompt[:200])
            raise ValueError(
                "LLM returned empty response during analysis. This may indicate API issues. "
                "Please check your OPENROUTER_API_KEY and network connection."
            )

        analysis = self._parse_query_analysis(response.content)
        logger.info(
            "query_analysis_complete",
            complexity=analysis.complexity,
            specificity=analysis.specificity,
            domains=analysis.domains,
            multi_step=analysis.multi_step,
        )
        return {"complexity_score": analysis.complexity}

    async def _create_plan(self, state: ResearchState) -> dict[str, list[dict[str, Any]]]:
        """Create research plan and sub-tasks."""
        # Determine number of workers
        complexity = state["complexity_score"]
        num_workers = 1 if complexity < 0.3 else (3 if complexity < 0.6 else 5)
        logger.info("creating_research_plan", workers=num_workers, complexity=complexity)

        # Create sub-tasks
        prompt = f"""Decompose this query into {num_workers} focused sub-tasks:

Query: {state['query']}

Each sub-task should:
- Be independently researchable
- Have clear objective
- Specify required tools (search, fetch)
- Minimize overlap

IMPORTANT: Return ONLY a valid JSON array, nothing else. No markdown, no explanation.
Each task must have these exact fields:
- id: string (task_1, task_2, etc.)
- objective: string (max 200 chars)
- tools: array of strings (e.g., ["search", "fetch"])
- expected_output: string (max 100 chars)

Example format:
[
  {{
    "id": "task_1",
    "objective": "Research housing price trends in Sweden for 2024",
    "tools": ["search", "fetch"],
    "expected_output": "Overview of Swedish housing market trends"
  }},
  {{
    "id": "task_2",
    "objective": "Compare Malmö housing prices to other Swedish cities",
    "tools": ["search", "fetch"],
    "expected_output": "Comparative analysis of Malmö vs other cities"
  }}
]
"""

        # Invoke LLM to generate sub-tasks with retry logic
        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                response = await self.llm.ainvoke(prompt)
                self._record_lead_usage(response)

                # Check for empty response
                if not response.content or not str(response.content).strip():
                    logger.error("empty_llm_response", prompt_preview=prompt[:200], attempt=attempt)
                    raise ValueError(
                        "LLM returned empty response. This may indicate API issues. "
                        "Please check your OPENROUTER_API_KEY and network connection."
                    )

                # Log raw response for debugging
                raw_content = self._stringify_content(response.content)
                logger.debug(
                    "llm_response_received",
                    attempt=attempt,
                    content_length=len(raw_content),
                    content_preview=raw_content[:500],
                )

                sub_tasks = self._parse_sub_tasks(response.content)
                logger.info("research_plan_created", num_tasks=len(sub_tasks))
                for i, task in enumerate(sub_tasks, 1):
                    obj_preview = task.objective[:100]
                    logger.debug("task_planned", index=i, id=task.id, objective=obj_preview)
                return {"sub_tasks": [task.model_dump() for task in sub_tasks]}

            except (httpx.HTTPStatusError, httpx.HTTPError) as exc:
                # HTTP-level errors from the API
                last_error = exc
                status_code = (
                    getattr(exc.response, "status_code", None)
                    if hasattr(exc, "response")
                    else None
                )
                logger.error(
                    "http_error_in_plan",
                    attempt=attempt,
                    error=str(exc),
                    status_code=status_code,
                )

                if attempt < max_retries - 1:
                    logger.info("retrying_plan_creation_http", attempt=attempt + 1)
                    continue

            except json.JSONDecodeError as exc:
                last_error = exc
                # JSON decode errors often indicate the API returned HTML or malformed response
                logger.error(
                    "json_decode_error_in_plan",
                    attempt=attempt,
                    error=str(exc),
                    error_details=f"line {exc.lineno}, col {exc.colno}, pos {exc.pos}",
                )

                # Try to log what we actually received
                try:
                    if hasattr(exc, "doc"):
                        logger.error(
                            "malformed_response_content",
                            doc_preview=exc.doc[:1000] if exc.doc else "None",
                        )
                except Exception:
                    pass

                if attempt < max_retries - 1:
                    logger.info("retrying_plan_creation", attempt=attempt + 1)
                    continue

            except ValueError as exc:
                last_error = exc
                logger.error(
                    "plan_creation_error",
                    attempt=attempt,
                    error=str(exc),
                    error_type=type(exc).__name__,
                )

                if attempt < max_retries - 1:
                    logger.info("retrying_plan_creation", attempt=attempt + 1)
                    continue

            except Exception as exc:
                # Catch all other exceptions including HTTP errors
                last_error = exc
                logger.error(
                    "unexpected_error_in_plan",
                    attempt=attempt,
                    error=str(exc),
                    error_type=type(exc).__name__,
                )

                if attempt < max_retries - 1:
                    logger.info("retrying_plan_creation", attempt=attempt + 1)
                    continue

        # If all retries failed, raise the last error with helpful context
        logger.error("plan_creation_failed_all_retries", max_retries=max_retries)

        error_msg = f"Failed to create plan after {max_retries} attempts. "
        if isinstance(last_error, json.JSONDecodeError):
            error_msg += (
                "The API returned malformed JSON. This usually means:\n"
                "1. Invalid or expired OPENROUTER_API_KEY\n"
                "2. Unsupported model name\n"
                "3. OpenRouter API is returning an error page (HTML instead of JSON)\n"
                f"Error: {last_error}"
            )
        else:
            error_msg += f"Last error: {last_error}"

        raise ValueError(error_msg) from last_error

    def _spawn_workers(self, state: ResearchState) -> list[Send]:
        """Spawn worker agents in parallel."""
        logger.info("spawning_workers", num_workers=len(state["sub_tasks"]))
        sends = [Send("worker", {"task": task}) for task in state["sub_tasks"]]
        logger.debug("workers_spawned", worker_ids=[t["id"] for t in state["sub_tasks"]])
        return sends

    async def _worker_execution(self, state: dict[str, Any]) -> dict[str, Any]:
        """Execute worker (runs in parallel)."""
        import asyncio

        # LangGraph Send API passes custom state with the task
        task = state["task"]
        worker_id = task["id"]

        logger.info("worker_execution_started", worker_id=worker_id)
        self.progress.on_worker_start(worker_id, task["objective"])

        # Yield to event loop to ensure progress update is sent
        await asyncio.sleep(0)

        try:
            logger.debug("creating_worker_agent", worker_id=worker_id)
            # Update status to show worker is initializing
            self.progress.on_worker_tool_use(worker_id, "init", "Initializing worker...")

            worker = WorkerAgent(model=self.model, progress=self.progress, worker_id=worker_id)

            logger.debug("executing_worker", worker_id=worker_id)
            self.progress.on_worker_tool_use(worker_id, "init", "Starting research...")

            # Add timeout to prevent workers from hanging indefinitely (30 minutes)
            result = await asyncio.wait_for(
                worker.execute(task["objective"]),
                timeout=1800.0
            )
            logger.debug("worker_execution_complete", worker_id=worker_id)

            # Compress findings
            summary = await self._compress(result.content, max_tokens=2000)

            self.progress.on_worker_complete(worker_id)

            return {
                "worker_results": [
                    {
                        "task_id": task["id"],
                        "summary": summary,
                        "sources": result.sources,
                        "metadata": result.metadata,
                    }
                ]
            }
        except TimeoutError:
            logger.error("worker_timeout", worker_id=worker_id, timeout_seconds=1800)
            self.progress.on_worker_error(worker_id, "timeout (30 min)")
            return {
                "worker_results": [
                    {
                        "task_id": task["id"],
                        "summary": f"Worker timed out after 30 minutes. Task: {task['objective']}",
                        "sources": [],
                        "metadata": {"error": "timeout", "worker_id": worker_id},
                    }
                ]
            }
        except Exception as e:
            logger.error("worker_execution_failed", worker_id=worker_id, error=str(e))
            error_msg = str(e)[:100]  # Truncate long errors
            self.progress.on_worker_error(worker_id, error_msg)
            return {
                "worker_results": [
                    {
                        "task_id": task["id"],
                        "summary": f"Worker failed: {str(e)}. Task: {task['objective']}",
                        "sources": [],
                        "metadata": {"error": str(e), "worker_id": worker_id},
                    }
                ]
            }

    async def _synthesize_results(
        self, state: ResearchState
    ) -> dict[str, str | list[str] | dict[str, Any]]:
        """Synthesize worker findings."""
        logger.info("synthesizing_results", num_workers=len(state["worker_results"]))
        summaries = [r["summary"] for r in state["worker_results"]]
        all_sources: list[str] = []
        for r in state["worker_results"]:
            all_sources.extend(r["sources"])

        prompt = f"""Synthesize these research findings:

Query: {state['query']}

Findings from {len(summaries)} workers:
{'=' * 50}
{chr(10).join(summaries)}

Create comprehensive markdown report with:
1. Summary
2. Key findings
3. Sources (cite all)
4. Conclusion
"""

        report = await self.llm.ainvoke(prompt)
        self._record_lead_usage(report)
        report_text = self._stringify_content(report.content)

        logger.info(
            "synthesis_complete",
            report_length=len(report_text),
            total_sources=len(set(all_sources)),
        )

        return {
            "report": report_text,
            "sources": list(set(all_sources)),
            "metadata": {
                "workers": len(summaries),
                "model": self.model,
            },
        }

    async def _compress(self, content: str, max_tokens: int) -> str:
        """Compress content to max tokens."""
        logger.debug(
            "compressing_worker_output",
            original_length=len(content),
            target_tokens=max_tokens
        )
        prompt = f"""Compress to {max_tokens} tokens, preserving key insights:

{content}
"""

        response = await self.llm.ainvoke(prompt, max_tokens=max_tokens)
        self._record_lead_usage(response)
        compressed = self._stringify_content(response.content)
        logger.debug("compression_complete", compressed_length=len(compressed))
        return compressed

    def _record_lead_usage(self, response: Any) -> None:
        """Track token usage for orchestrator prompts."""
        usage = getattr(response, "usage_metadata", None)
        if usage:
            self.lead_prompt_tokens += int(usage.get("input_tokens") or 0)
            self.lead_completion_tokens += int(usage.get("output_tokens") or 0)
        else:
            self.lead_completion_tokens += count_tokens(self._stringify_content(response.content))

    def _reset_usage_tracking(self) -> None:
        """Reset counters before each run."""
        self.lead_prompt_tokens = 0
        self.lead_completion_tokens = 0

    def _attach_cost_metadata(self, result: dict[str, Any]) -> dict[str, Any]:
        """Enrich final result with pricing + cost info."""
        worker_prompt_tokens = 0
        worker_completion_tokens = 0
        worker_input_cost = 0.0
        worker_output_cost = 0.0

        worker_results = result.get("worker_results") or []
        for worker in worker_results:
            metadata = worker.get("metadata") or {}
            worker_prompt_tokens += int(metadata.get("prompt_tokens") or 0)
            worker_completion_tokens += int(metadata.get("completion_tokens") or 0)

            cost = metadata.get("cost") or {}
            worker_input_cost += float(cost.get("input_cost") or 0.0)
            worker_output_cost += float(cost.get("output_cost") or 0.0)

        if self.pricing:
            lead_breakdown = self.pricing.estimate_cost(
                self.lead_prompt_tokens, self.lead_completion_tokens
            ).as_dict()
        else:
            lead_breakdown = None

        metadata = result.get("metadata") or {}
        total_prompt = self.lead_prompt_tokens + worker_prompt_tokens
        total_completion = self.lead_completion_tokens + worker_completion_tokens

        metadata.update(
            {
                "model": self.model,
                "prompt_tokens": total_prompt,
                "completion_tokens": total_completion,
            }
        )

        if self.pricing:
            metadata["pricing"] = self.pricing.as_dict()

        worker_total_cost_value = worker_input_cost + worker_output_cost
        worker_total_cost: float | None = (
            worker_total_cost_value if worker_total_cost_value > 0 else None
        )
        lead_total_cost = lead_breakdown["total_cost"] if lead_breakdown else None
        total_cost = None
        if lead_total_cost is not None or worker_total_cost is not None:
            total_cost = (lead_total_cost or 0.0) + (worker_total_cost or 0.0)

        metadata["cost"] = {
            "lead": lead_breakdown,
            "workers": {
                "prompt_tokens": worker_prompt_tokens,
                "completion_tokens": worker_completion_tokens,
                "input_cost": worker_input_cost or None,
                "output_cost": worker_output_cost or None,
                "total_cost": worker_total_cost,
            },
            "total_cost": total_cost,
        }

        result["metadata"] = metadata
        return result

    def _strip_markdown_json(self, raw: str) -> str:
        """Remove markdown code block formatting and trailing text from JSON strings."""
        raw = raw.strip()

        # Strip markdown code blocks
        if raw.startswith("```"):
            first_newline = raw.find("\n")
            if first_newline != -1:
                raw = raw[first_newline + 1:]
            if raw.endswith("```"):
                raw = raw[:-3].strip()

        # Find the complete JSON object/array using bracket matching
        json_start = -1
        for i, char in enumerate(raw):
            if char in "{[":
                json_start = i
                break

        if json_start == -1:
            return raw

        # Track nesting depth to find matching closing bracket
        depth = 0
        in_string = False
        escape_next = False

        for i in range(json_start, len(raw)):
            char = raw[i]

            if escape_next:
                escape_next = False
                continue

            if char == "\\":
                escape_next = True
                continue

            if char == '"' and not in_string:
                in_string = True
                continue
            if char == '"' and in_string:
                in_string = False
                continue

            if not in_string:
                if char in "{[":
                    depth += 1
                elif char in "}]":
                    depth -= 1
                    if depth == 0:
                        return raw[json_start : i + 1]

        return raw

    def _parse_query_analysis(self, content: Any) -> QueryAnalysis:
        """Parse content into QueryAnalysis."""
        raw = self._stringify_content(content)
        raw = self._strip_markdown_json(raw)

        try:
            return QueryAnalysis.model_validate_json(raw)
        except ValidationError as exc:
            raise ValueError(f"Invalid query analysis JSON: {raw}") from exc

    def _parse_sub_tasks(self, content: Any) -> list[SubTask]:
        """Parse content into a list of SubTask entries."""
        raw = self._stringify_content(content)
        raw = self._strip_markdown_json(raw)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.error(
                "json_parse_error",
                error=str(exc),
                raw_length=len(raw),
                raw_preview=raw[:500],
            )
            msg = f"Invalid sub-task JSON (length={len(raw)}): {raw[:500]}..."
            raise ValueError(msg) from exc

        if not isinstance(data, list):
            raise ValueError(f"Expected JSON array, got {type(data).__name__}: {data}")

        tasks: list[SubTask] = []
        for item in data:
            try:
                tasks.append(SubTask.model_validate(item))
            except ValidationError as exc:
                logger.error("task_validation_error", error=str(exc), item=item)
                raise ValueError(f"Invalid sub-task entry: {item}") from exc

        return tasks

    def _stringify_content(self, content: Any) -> str:
        """Coerce ChatOpenAI content into a usable string."""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for chunk in content:
                if isinstance(chunk, dict) and "text" in chunk:
                    parts.append(chunk.get("text") or "")
                else:
                    parts.append(str(chunk))
            return " ".join(parts)
        return str(content)
