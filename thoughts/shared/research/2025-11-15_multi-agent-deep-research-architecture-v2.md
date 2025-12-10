---
date: 2025-11-15T14:31:00+01:00
researcher: GPT-5.1 Codex (Tongyi DeepResearch 30B A3B)
git_commit: 22dbf8d52dc8c995afcf147c11fad7f347571464
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: 'Multi-Agent Deep Research Architecture - Production-Ready Design (v2)'
tags:
  [research, deep-research, multi-agent, langgraph, context-engineering, production, architecture]
status: complete
last_updated: 2025-11-15
last_updated_by: GPT-5.1 Codex
supersedes: 2025-11-15_deep-research-agent-architecture.md
---

# Multi-Agent Deep Research Architecture - Production-Ready Design (v2)

**Date**: 2025-11-15T14:31:00+01:00
**Researcher**: GPT-5.1 Codex (Tongyi DeepResearch 30B A3B)
**Git Commit**: 22dbf8d52dc8c995afcf147c11fad7f347571464
**Branch**: feat/custom-research
**Repository**: addcommitpush.io

## Research Question

How to design and implement a production-ready multi-agent deep research system that solves context overload through intelligent orchestration, parallel execution, and advanced context engineering patterns while enabling CLI-based iterative research, web exploration, and EDA with notebook generation?

## Executive Summary

This document presents a **state-of-the-art multi-agent architecture** for deep research that addresses the fundamental limitation identified in the initial design: **context overload**. Based on comprehensive research of production systems from Anthropic, Alibaba, Microsoft, and academic breakthroughs in 2024-2025, this architecture employs:

1. **Hierarchical Orchestration** - LeadResearcher + Specialized Sub-Agents pattern achieving 90.2% improvement over single-agent systems
2. **Markovian State Reconstruction** - IterResearch-inspired approach enabling 2048+ interaction workflows with O(1) context complexity
3. **Context Engineering** - Four-strategy framework (Write/Select/Compress/Isolate) reducing token usage 60-94%
4. **Parallel Execution** - Map-reduce patterns with LangGraph Send API cutting research time by up to 90%
5. **Advanced Memory Architecture** - Multi-tier memory system with shared state management and semantic retrieval

The system is designed for **production deployment** with comprehensive observability, cost optimization, error recovery, and proven patterns from real-world multi-agent systems processing thousands of queries daily.

### Configurable Defaults

All concrete values in this document—models, token budgets, agent counts, and tool selections—are **profiles defined in `config/research_profiles.yaml`**. Teams can override any default per environment (dev/staging/prod) without touching the core graph. The baseline profile described here (`tongyi_deepresearch_baseline`) standardizes on Alibaba's **Tongyi DeepResearch 30B A3B** model served through OpenRouter, ensuring consistent behavior while still allowing future swaps through configuration rather than code edits. [\[link\]](https://openrouter.ai/alibaba/tongyi-deepresearch-30b-a3b)

### Key Performance Targets

- **Research Speed**: 90% reduction in completion time vs. single-agent (3-5 parallel researchers)
- **Token Efficiency**: 60-70% reduction through context engineering
- **Success Rate**: >85% on complex multi-step research queries
- **Cost**: <$0.10 per research task through Tongyi baseline efficiency + optimization
- **Scalability**: Support for 10+ concurrent research sessions

## Goals

### Primary Goals

1. **Solve Context Overload**
   - **Problem**: Single-agent systems accumulate all tool outputs, exhausting context windows
   - **Solution**: Distributed cognition across specialized agents with compressed handoffs
   - **Metric**: Maintain <50% context window usage per agent throughout workflow

2. **Maximize Parallel Efficiency**
   - Execute 3-5 independent research paths simultaneously
   - Achieve near-linear scaling (4× agents = 3-3.5× speed improvement)
   - Dynamic task decomposition based on query complexity

3. **Intelligent Context Management**
   - Implement Markovian workspace with O(1) bounded state
   - Compressed memory transmission (2K token summaries from 50K exploration)
   - Semantic retrieval from long-term memory store

4. **Production-Grade Reliability**
   - Checkpointed execution with resume capability
   - Graceful degradation on sub-agent failures
   - Comprehensive error recovery patterns
   - Cost guardrails and budget enforcement

### Secondary Goals

1. **Advanced EDA Capabilities**
   - Parallel data profiling agents
   - Statistical validation agent
   - Automated insight extraction
   - Multi-format output (notebooks, reports, dashboards)

2. **Extensibility & Composition**
   - Plugin architecture for custom agent types
   - Tool registry for dynamic capability expansion
   - Agent marketplace for domain-specific specialists

3. **Enterprise Features**
   - Multi-tenant isolation
   - Audit logging and compliance
   - Cost attribution and chargeback
   - Human-in-the-loop approval workflows

## Architecture Overview

### High-Level Multi-Agent System

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CLI / API Gateway                                    │
│                   (Request Routing & Session Management)                     │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        LeadResearcher Agent                                   │
│        (Orchestrator - Tongyi DeepResearch 30B A3B via OpenRouter)          │
│                                                                               │
│  Responsibilities:                                                            │
│  • Query analysis & complexity assessment                                   │
│  • Scaling decision (1-10 sub-agents based on complexity)                   │
│  • Sub-agent spawning with focused prompts                                  │
│  • Result synthesis & validation                                            │
│  • Memory persistence & retrieval                                           │
│  • Final report generation                                                  │
│                                                                               │
│  Context Management:                                                         │
│  • Initial context: User query + conversation history                       │
│  • Receives: 1-2K token summaries from each sub-agent                       │
│  • Maintains: Evolving research report (Markovian workspace)                │
│  • Stores: Full sub-agent outputs to external memory                        │
└────────────────────┬───────────────────────────┬──────────────────────────────┘
                     │                           │
        ┌────────────┼────────────┬──────────────┼─────────┬───────────────┐
        │            │            │              │         │               │
        ▼            ▼            ▼              ▼         ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Research    │ │  Research    │ │  Research    │ │   Citation   │ │  Validation  │
│  Agent #1    │ │  Agent #2    │ │  Agent #N    │ │    Agent     │ │    Agent     │
│              │ │              │ │              │ │              │ │              │
│ (Tongyi 30B) │ │ (Tongyi 30B) │ │ (Tongyi 30B) │ │ (Tongyi 30B) │ │ (Tongyi 30B) │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │                │
       │ Parallel Execution (Map-Reduce Pattern)          │                │
       │                │                │                │                │
       └────────────────┴────────────────┴────────────────┴────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        │                         │
                        ▼                         ▼
              ┌─────────────────────┐   ┌─────────────────────┐
              │   Tool Suite        │   │  Memory System       │
              │                     │   │                      │
              │ • Search (Parallel) │   │ • Short-term         │
              │ • Web Fetch         │   │   (Thread State)     │
              │ • Code Executor     │   │ • Long-term          │
              │ • File Ops          │   │   (Vector Store)     │
              │ • Scholar           │   │ • Working Memory     │
              │ • Data Profiler     │   │   (Scratchpad)       │
              └─────────────────────┘   └─────────────────────┘
```

### Context Flow Architecture

```
User Query
    ↓
LeadResearcher (Initial Planning)
    │
    ├─→ External Memory: Persist research plan
    │
    ├─→ Spawn 3-5 Sub-Agents with focused sub-queries
    │
    ↓
Sub-Agents (Parallel Execution)
    │
    ├─→ Each explores with 10-50K tokens
    ├─→ Tools: search, fetch, code_exec
    ├─→ Internal reasoning: Extended thinking mode
    │
    ├─→ Compress findings to 1-2K summary
    ├─→ Store full context to External Memory
    │
    ↓
LeadResearcher (Synthesis)
    │
    ├─→ Receives: Condensed summaries only
    ├─→ Maintains: Evolving report (Markovian workspace)
    ├─→ Clean context window throughout
    │
    ├─→ Validation: Citation agent verifies claims
    │
    ↓
Final Output
    • Markdown research report
    • Jupyter notebook (if EDA)
    • Citations & sources
    • Execution metadata
```

## System Components

### 1. LeadResearcher Agent (Orchestrator)

**Model**: Tongyi DeepResearch 30B A3B via OpenRouter (reasoning-optimized)
**Role**: Strategic coordination and synthesis

> **Model Policy**: The MVP exclusively uses Tongyi DeepResearch 30B A3B for every agent type to avoid fragmented reasoning behaviors; Anthropic models are intentionally excluded in this phase. [\[link\]](https://openrouter.ai/alibaba/tongyi-deepresearch-30b-a3b)

**Responsibilities**:

1. **Query Analysis**: Assess complexity, identify sub-tasks, estimate required agents
2. **Scaling Decision**: Simple (1-2 agents, 3-10 calls) vs. Complex (3-10 agents, 20+ calls)
3. **Sub-Agent Spawning**: Generate focused prompts with clear objectives and output schemas
4. **Result Synthesis**: Combine findings from parallel agents into coherent narrative
5. **Validation Coordination**: Trigger citation and fact-checking agents
6. **Memory Management**: Persist strategies, retrieve past learnings, manage evolving report

**Context Engineering**:

- **Input**: User query (200-1K tokens) + Summary from previous round (if iterative)
- **Receives from sub-agents**: Compressed 1-2K summaries (not full 50K exploration)
- **Maintains**: Evolving research report using Markovian workspace pattern
- **Output**: Final report or decision to spawn next research round

**Scaling Rules** (industry benchmarks from Alibaba IterResearch + Anthropic studies):

```python
def determine_scaling(query_complexity: float, query_specificity: float) -> ScalingStrategy:
    if complexity < 0.3 and specificity > 0.7:
        return ScalingStrategy(agents=1, calls_per_agent=3-10)
    elif complexity < 0.6:
        return ScalingStrategy(agents=2-3, calls_per_agent=10-20)
    else:  # Complex, multi-faceted
        return ScalingStrategy(agents=5-10, calls_per_agent=20-50)
```

**Prompt Template**:

```
You are a LeadResearcher coordinating specialized research agents.

USER QUERY: {query}

CURRENT RESEARCH STATE:
{evolving_report}

TASK: Analyze this query and determine:
1. Sub-tasks requiring independent exploration
2. Number and type of research agents needed
3. Focused prompts for each sub-agent

CONSTRAINTS:
- Each sub-agent should explore ONE focused aspect
- Avoid overlap between sub-agent assignments
- Design for parallel execution (independent sub-tasks)

Return JSON:
{
  "sub_agents": [
    {
      "id": "agent_1",
      "objective": "Clear, focused research question",
      "tools": ["search", "web_fetch"],
      "expected_output": "Description of deliverable"
    }
  ],
  "synthesis_strategy": "How to combine results"
}
```

### 2. Research Sub-Agents (Workers)

**Model**: Tongyi DeepResearch 30B A3B (shared baseline profile)
**Configuration**: Workers read `model_name` from the same profile map as the orchestrator, so moving to alternative models later is a config-only change rather than a code fork.
**Pattern**: Spawned dynamically based on Lead Agent decision

**Agent Types**:

1. **Search Agent**: Web search specialist
   - Tools: search (parallel batch queries), web_fetch
   - Objective: Find authoritative sources on specific sub-topic
   - Output: Condensed summary with top sources and key findings

2. **Deep Analysis Agent**: Content extraction and synthesis
   - Tools: web_fetch (with summarization), file_ops
   - Objective: Extract insights from specific documents/pages
   - Output: Structured analysis with citations

3. **Data Agent**: Code execution and data analysis
   - Tools: code_executor, data_profiler, file_ops
   - Objective: Analyze datasets, generate statistics, create visualizations
   - Output: Summary statistics, insights, notebook cells

4. **Citation Agent**: Source attribution and verification
   - Tools: search, web_fetch, scholar
   - Objective: Verify claims, attribute sources, check consistency
   - Output: Citation map with confidence scores

5. **Validation Agent**: Fact-checking and quality assurance
   - Tools: search, web_fetch
   - Objective: Verify factual accuracy, identify contradictions
   - Output: Validation report with flagged issues

**Worker Lifecycle**:

1. **Spawn**: LeadResearcher creates with focused prompt
2. **Execute**: Independent exploration with full tool access
3. **Compress**: Condense findings using LLM (50K → 2K)
4. **Store**: Save full exploration to external memory
5. **Return**: Hand compressed summary to LeadResearcher
6. **Terminate**: Worker agent lifecycle ends

**Context Isolation Pattern**:

```python
class WorkerAgent:
    def execute(self, objective: str, tools: list[str]) -> WorkerResult:
        # Worker operates in ISOLATED context
        # Does NOT see other workers' outputs
        # Does NOT see full conversation history

        context = {
            "objective": objective,  # Focused sub-task
            "tools": tools,
            "budget": {
                "max_tokens": 50_000,
                "max_tool_calls": 20
            }
        }

        # Full exploration with extended thinking
        exploration = self.deep_research(context)

        # Compress for handoff
        summary = self.compress_findings(exploration, max_tokens=2000)

        # Store full context externally
        self.store_to_memory(exploration)

        # Return ONLY summary (prevent context explosion in orchestrator)
        return WorkerResult(
            summary=summary,
            memory_id=memory_id,
            metadata={
                "tokens_used": count_tokens(exploration),
                "sources": extract_sources(exploration)
            }
        )
```

### 3. Tool Suite (Shared Across Agents)

All tools support **parallel execution** where applicable.

#### Search Tool

**Implementation**: Batch queries with provider abstraction

```python
class SearchTool(BaseTool):
    name = "search"
    description = "Perform parallel web searches across multiple queries"

    async def execute(self, queries: list[str], max_results: int = 10) -> list[SearchResult]:
        # Parallel execution
        tasks = [self._search_single(q, max_results) for q in queries]
        results = await asyncio.gather(*tasks)

        # Semantic deduplication
        unique_results = self._deduplicate_results(results)

        return unique_results

    def _search_single(self, query: str, max_results: int) -> SearchResult:
        # Provider abstraction (Serper, Brave, DuckDuckGo)
        response = self.provider.search(query, limit=max_results)

        return SearchResult(
            query=query,
            results=self._format_results(response),
            metadata={"provider": self.provider.name, "timestamp": now()}
        )
```

**Features**:

- Batch processing (3-5 queries in single call)
- Provider fallback (Serper → Brave → DuckDuckGo)
- Result caching with semantic similarity check
- Cost tracking per query

#### Web Fetch Tool

**Implementation**: Content extraction with LLM summarization

```python
class WebFetchTool(BaseTool):
    name = "web_fetch"
    description = "Fetch and summarize web page content with goal-directed extraction"

    async def execute(self, urls: list[str], goal: str) -> list[WebContent]:
        tasks = [self._fetch_and_extract(url, goal) for url in urls]
        return await asyncio.gather(*tasks)

    async def _fetch_and_extract(self, url: str, goal: str) -> WebContent:
        # Fetch raw content (via Jina Reader or direct HTTP)
        raw_content = await self.fetcher.get(url)

        # Pre-truncate to 95K tokens
        truncated = self._truncate_to_tokens(raw_content, max_tokens=95_000)

        # LLM extraction with retry and progressive truncation
        for attempt in range(3):
            try:
                extracted = await self.llm.extract(
                    content=truncated,
                    goal=goal,
                    schema=ExtractionSchema
                )
                return WebContent(url=url, extracted=extracted)
            except Exception:
                # Progressive reduction on failure
                truncated = truncated[:int(len(truncated) * 0.7)]

        return WebContent(url=url, error="Extraction failed after retries")
```

**Context Optimization**:

- Pre-truncation before LLM processing (95K token limit)
- Goal-directed extraction (only relevant sections)
- Progressive truncation on failure (70% reduction per retry)
- Caching of extracted content

#### Code Executor Tool

**Implementation**: Jupyter kernel with sandboxing

```python
class CodeExecutorTool(BaseTool):
    name = "code_executor"
    description = "Execute Python code in isolated Jupyter kernel with data analysis libraries"

    def __init__(self):
        self.kernel_manager = KernelManager()
        self.kernel_manager.start_kernel()
        self.kernel_client = self.kernel_manager.client()
        self.kernel_client.start_channels()
        self.kernel_client.wait_for_ready(timeout=60)

    def execute(self, code: str, timeout: int = 30) -> ExecutionResult:
        # Validate code before execution
        if not self._is_safe(code):
            return ExecutionResult(
                success=False,
                error="Code validation failed: unsafe operations detected"
            )

        msg_id = self.kernel_client.execute(code)

        outputs = {
            "stdout": [],
            "stderr": [],
            "display_data": [],
            "error": None
        }

        # Collect all outputs
        while True:
            try:
                msg = self.kernel_client.get_iopub_msg(timeout=timeout)
                msg_type = msg["msg_type"]
                content = msg["content"]

                if msg_type == "stream":
                    outputs[content["name"]].append(content["text"])
                elif msg_type == "display_data" or msg_type == "execute_result":
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

    def _is_safe(self, code: str) -> bool:
        # AST-based validation
        try:
            tree = ast.parse(code)

            # Check for dangerous operations
            dangerous_nodes = [ast.Exec, ast.Eval, ast.Import]
            for node in ast.walk(tree):
                if any(isinstance(node, d) for d in dangerous_nodes):
                    return False

            # Additional safety checks
            # - File system access restrictions
            # - Network restrictions
            # - Resource limits

            return True
        except SyntaxError:
            return False

    def shutdown(self):
        self.kernel_client.stop_channels()
        self.kernel_manager.shutdown_kernel()
```

**Safety Features**:

- AST-based code validation
- Resource limits (CPU, memory, time)
- Network isolation (optional)
- File system restrictions
- Containerization (optional Docker integration)

### 4. Memory Architecture

**Three-Tier System**:

#### Short-Term Memory (Working Context)

**Implementation**: LangGraph State with checkpointing

```python
from langgraph.checkpoint.postgres import PostgresSaver

class ShortTermMemory:
    def __init__(self, thread_id: str):
        self.checkpointer = PostgresSaver.from_conn_string(
            os.environ["POSTGRES_CONN_STRING"]
        )
        self.thread_id = thread_id

    def save_state(self, state: AgentState):
        config = {"configurable": {"thread_id": self.thread_id}}
        self.checkpointer.put(config, state)

    def load_state(self) -> AgentState:
        config = {"configurable": {"thread_id": self.thread_id}}
        return self.checkpointer.get(config)

    def get_history(self, limit: int = 10) -> list[AgentState]:
        config = {"configurable": {"thread_id": self.thread_id}}
        return list(self.checkpointer.list(config, limit=limit))
```

**Stores**:

- Current conversation state
- Active research round progress
- In-flight tool calls
- Temporary agent outputs

**Retention**: Session duration + 24 hours

#### Long-Term Memory (Persistent Knowledge)

**Implementation**: Vector store + SQL for structured data

```python
class LongTermMemory:
    def __init__(self):
        self.vector_store = FAISS(embedding_function=OpenAIEmbeddings())
        self.sql_store = PostgresDB()

    def store_research_result(self, result: ResearchResult):
        # Vector store for semantic search
        self.vector_store.add_documents([
            Document(
                page_content=result.summary,
                metadata={
                    "research_id": result.id,
                    "query": result.query,
                    "timestamp": result.timestamp,
                    "success": result.success
                }
            )
        ])

        # SQL for structured queries
        self.sql_store.insert(
            "research_results",
            {
                "id": result.id,
                "query": result.query,
                "summary": result.summary,
                "full_report": result.full_report,
                "sources": json.dumps(result.sources),
                "metadata": json.dumps(result.metadata)
            }
        )

    def retrieve_similar(self, query: str, k: int = 5) -> list[ResearchResult]:
        # Semantic retrieval
        docs = self.vector_store.similarity_search(query, k=k)

        # Fetch full results from SQL
        ids = [doc.metadata["research_id"] for doc in docs]
        results = self.sql_store.query(
            "SELECT * FROM research_results WHERE id IN (%s)",
            (ids,)
        )

        return [ResearchResult.from_db(r) for r in results]
```

**Stores**:

- Past research results
- Sub-agent exploration outputs (full context)
- Learned patterns and strategies
- User preferences and context

**Retention**: Indefinite with periodic archival

#### Markovian Workspace (Evolving Report)

**Implementation**: Bounded-size compressed memory inspired by IterResearch

```python
class MarkovianWorkspace:
    """
    O(1) context complexity through strategic forgetting.
    Maintains: Question + Evolving Report + Last Action/Result
    """

    def __init__(self, query: str):
        self.query = query  # Constant
        self.evolving_report = ""  # Bounded size
        self.last_action = None
        self.last_result = None
        self.round = 0

    def update(self, new_findings: str, action: str, result: str):
        """
        Compress new findings into evolving report.
        Discard historical trajectory (Markovian property).
        """
        # Synthesize new findings into report
        synthesis_prompt = f"""
        CURRENT REPORT:
        {self.evolving_report}

        NEW FINDINGS:
        {new_findings}

        Synthesize these new findings into the evolving report.
        Filter noise, integrate key insights, maintain coherence.
        Maximum {self.max_report_size} tokens.
        """

        updated_report = self.llm.synthesize(synthesis_prompt)

        # Update state (discard history except latest)
        self.evolving_report = updated_report
        self.last_action = action
        self.last_result = result
        self.round += 1

    def get_workspace(self) -> dict:
        """
        Return O(1) bounded workspace for next iteration.
        """
        return {
            "query": self.query,
            "evolving_report": self.evolving_report,
            "last_action": self.last_action,
            "last_result": self.last_result,
            "round": self.round
        }

    @property
    def context_size(self) -> int:
        """
        Always O(1) - bounded by max_report_size + constants.
        """
        return (
            count_tokens(self.query) +
            count_tokens(self.evolving_report) +  # Bounded!
            count_tokens(self.last_action) +
            count_tokens(self.last_result)
        )
```

**Key Properties**:

- **Markovian**: Only depends on current state, not full history
- **Bounded**: Evolving report has maximum size (e.g., 8K tokens)
- **Compressed**: Lossy compression filters noise while preserving signal
- **Scalable**: Enables unbounded interactions (2048+ steps demonstrated in research)

### 5. LangGraph Workflow Implementation

**Core Graph Structure**:

```python
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from typing import TypedDict, Annotated, Literal
import operator

class ResearchState(TypedDict):
    # User context
    query: str
    thread_id: str

    # Orchestrator state
    complexity_score: float
    scaling_strategy: dict
    evolving_report: str
    current_round: int

    # Worker coordination
    sub_agent_tasks: list[dict]
    sub_agent_results: Annotated[list[dict], operator.add]  # Reducer!

    # Output
    final_report: str
    sources: list[str]
    metadata: dict

# Build graph
workflow = StateGraph(ResearchState)

# Nodes
workflow.add_node("analyze_query", analyze_query_complexity)
workflow.add_node("plan_research", create_research_plan)
workflow.add_node("spawn_workers", spawn_worker_agents)  # Map function
workflow.add_node("worker", worker_execution)  # Parallel instances
workflow.add_node("synthesize", synthesize_results)
workflow.add_node("validate", citation_validation)
workflow.add_node("finalize", generate_final_report)

# Edges
workflow.add_edge(START, "analyze_query")
workflow.add_edge("analyze_query", "plan_research")

# Dynamic parallel spawning with Send API
workflow.add_conditional_edges(
    "plan_research",
    spawn_workers,  # Returns list[Send("worker", {...})]
    ["worker"]
)

workflow.add_edge("worker", "synthesize")
workflow.add_conditional_edges(
    "synthesize",
    should_continue_research,
    {
        "continue": "plan_research",  # Iterative rounds
        "validate": "validate",
        "end": "finalize"
    }
)

workflow.add_edge("validate", "finalize")
workflow.add_edge("finalize", END)

# Compile with PostgreSQL checkpointing
checkpointer = PostgresSaver.from_conn_string(os.environ["POSTGRES_CONN_STRING"])
app = workflow.compile(checkpointer=checkpointer)
```

**Map-Reduce Pattern with Send API**:

```python
from langgraph.constants import Send

def spawn_workers(state: ResearchState) -> list[Send]:
    """
    Map function: Dynamically spawn N workers based on sub_agent_tasks.
    Each worker gets isolated state with focused objective.
    """
    return [
        Send(
            "worker",
            {
                "task_id": task["id"],
                "objective": task["objective"],
                "tools": task["tools"],
                "expected_output": task["expected_output"]
            }
        )
        for task in state["sub_agent_tasks"]
    ]

def worker_execution(state: dict) -> dict:
    """
    Worker function: Executes in parallel with isolated context.
    Each instance receives only its specific task, not full ResearchState.
    """
    worker = WorkerAgent(
        model="alibaba/tongyi-deepresearch-30b-a3b",
        tools=state["tools"]
    )

    result = worker.execute(
        objective=state["objective"],
        max_tokens=50_000,
        max_tool_calls=20
    )

    # Compress and return
    summary = worker.compress_findings(result, max_tokens=2000)

    return {
        "sub_agent_results": [{  # Reducer appends to list
            "task_id": state["task_id"],
            "summary": summary,
            "metadata": result.metadata
        }]
    }
```

**Context Management in Synthesis**:

```python
def synthesize_results(state: ResearchState) -> dict:
    """
    Reduce function: Synthesize findings from parallel workers.
    Operates ONLY on compressed summaries, not full explorations.
    """
    # Extract summaries from sub_agent_results
    summaries = [r["summary"] for r in state["sub_agent_results"]]

    # Update Markovian workspace
    workspace = MarkovianWorkspace(state["query"])
    workspace.load_from_state(state["evolving_report"], state["current_round"])

    # Synthesize new findings
    synthesis_prompt = f"""
    QUERY: {state["query"]}

    CURRENT RESEARCH REPORT:
    {workspace.evolving_report}

    NEW FINDINGS FROM SUB-AGENTS:
    {'\n\n---\n\n'.join(summaries)}

    Synthesize these findings into the evolving report.
    Filter redundancy, integrate insights, identify gaps.
    """

    updated_report = llm.synthesize(synthesis_prompt)

    workspace.update(
        new_findings=updated_report,
        action="parallel_research",
        result=f"{len(summaries)} sub-agents completed"
    )

    return {
        "evolving_report": workspace.evolving_report,
        "current_round": workspace.round
    }
```

## Context Engineering Strategies

### Four-Strategy Framework

Based on [LangChain Context Engineering Guide](https://blog.langchain.com/context-engineering-for-agents/):

#### 1. Write Context (Persist Outside Window)

**Scratchpad Pattern**:

```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    scratchpad: str  # Persistent working notes
    research_plan: dict  # Strategic planning state

def research_node(state: AgentState) -> dict:
    # Agent writes to scratchpad
    thought = llm.invoke([
        SystemMessage("Use scratchpad for working notes"),
        HumanMessage(state["query"])
    ])

    return {
        "scratchpad": state["scratchpad"] + "\n" + thought.content,
        "messages": [AIMessage(content=thought.content)]
    }
```

**Memory Blocks Pattern**:

```python
# Letta/MemGPT-inspired memory blocks
memory_blocks = {
    "research_strategy": {
        "label": "strategy",
        "value": "Current research approach and progress",
        "size_limit": 2000
    },
    "key_findings": {
        "label": "findings",
        "value": "Accumulated insights across rounds",
        "size_limit": 5000
    },
    "user_context": {
        "label": "user",
        "value": "User preferences and history",
        "size_limit": 1000
    }
}
```

**External Memory Store**:

```python
# Store full sub-agent outputs
long_term_memory.store({
    "research_id": research_id,
    "sub_agent_id": agent_id,
    "full_exploration": exploration,  # 50K tokens
    "summary": summary,  # 2K tokens
    "timestamp": now()
})

# Later retrieval if needed
if need_details:
    full_context = long_term_memory.retrieve(research_id, sub_agent_id)
```

#### 2. Select Context (Pull Relevant Information)

**Semantic Memory Retrieval**:

```python
def select_relevant_memories(query: str, k: int = 5) -> list[Memory]:
    # Embedding-based retrieval
    similar_research = vector_store.similarity_search(query, k=k)

    # Re-ranking by relevance and recency
    ranked = rerank(
        similar_research,
        query=query,
        weights={"relevance": 0.7, "recency": 0.3}
    )

    return ranked[:k]
```

**Tool Selection**:

```python
def select_tools_for_task(objective: str, available_tools: list[Tool]) -> list[Tool]:
    # RAG on tool descriptions
    tool_descriptions = [f"{t.name}: {t.description}" for t in available_tools]

    # Embed and retrieve relevant tools
    relevant = embedding_similarity(objective, tool_descriptions, k=5)

    return [available_tools[i] for i in relevant]
```

#### 3. Compress Context (Retain Essential Tokens)

**Summarization Pattern**:

```python
def compress_findings(full_exploration: str, max_tokens: int = 2000) -> str:
    compression_prompt = f"""
    Condense the following research findings into a {max_tokens}-token summary.
    Preserve key insights, sources, and conclusions.
    Remove redundancy and tangential information.

    FULL EXPLORATION:
    {full_exploration}

    COMPRESSED SUMMARY:
    """

    return llm.invoke(compression_prompt, max_tokens=max_tokens)
```

**LazyLLM-Inspired Token Pruning** (if implementing):

```python
def prune_low_relevance_tokens(context: str, attention_scores: np.ndarray, k: float = 0.3):
    # Calculate k-th percentile threshold
    threshold = np.quantile(attention_scores, k)

    # Keep tokens above threshold
    tokens = tokenize(context)
    keep_mask = attention_scores >= threshold

    pruned_context = detokenize([t for t, keep in zip(tokens, keep_mask) if keep])
    return pruned_context
```

**Auto-Compact at Context Limits**:

```python
def check_context_limit(state: AgentState, threshold: float = 0.95):
    total_tokens = sum(count_tokens(m.content) for m in state["messages"])
    max_tokens = 200_000  # Tongyi DeepResearch 30B A3B (OpenRouter assumption)

    if total_tokens > max_tokens * threshold:
        # Trigger summarization
        summary = summarize_conversation(state["messages"][:-10])
        state["messages"] = [
            SystemMessage(content=f"Previous conversation summary: {summary}"),
            *state["messages"][-10:]  # Keep last 10 messages
        ]

    return state
```

#### 4. Isolate Context (Split Across Agents)

**Multi-Agent Isolation**:

```python
# Each worker operates in isolated context
# Does NOT see:
# - Other workers' outputs
# - Full conversation history
# - Orchestrator's planning
#
# ONLY sees:
# - Its focused objective
# - Tools for that objective
# - Token budget

def create_isolated_worker(objective: str, tools: list[str]) -> WorkerAgent:
    return WorkerAgent(
        system_prompt=f"You are a research specialist. Focus on: {objective}",
        tools=tools,
        context_budget=50_000  # Isolated budget
    )
```

**Environment Isolation**:

```python
# Token-heavy objects stored as environment variables
class JupyterExecutionEnvironment:
    def __init__(self):
        self.dataframes = {}  # Not in LLM context
        self.plots = {}  # Not in LLM context

    def execute_code(self, code: str):
        # LLM generates code (small tokens)
        # Execution environment handles large data
        exec(code, {"env": self})

    def get_summary(self) -> str:
        # Return ONLY summary, not full data
        return {
            "dataframes": list(self.dataframes.keys()),
            "shapes": {k: v.shape for k, v in self.dataframes.items()},
            "plots": list(self.plots.keys())
        }
```

## Implementation Phases

### Phase 1: Core Multi-Agent Framework (Week 1-2)

**Goal**: Establish orchestrator-worker pattern with basic tools

**Tasks**:

1. **Project Setup**
   - Initialize uv project with dependencies
   - Configure LangGraph with PostgreSQL checkpointing
   - Set up development tooling (ruff, mypy, pytest)
   - Create basic CLI with Click

2. **LeadResearcher Agent**
   - Implement query complexity analysis
   - Build scaling decision logic
   - Create sub-agent spawning mechanism
   - Implement basic synthesis

3. **Worker Agent Template**
   - Generic worker with tool execution
   - Context isolation pattern
   - Compression mechanism
   - Result handoff

4. **Basic Tools**
   - Search tool (single provider)
   - Web fetch tool (basic extraction)
   - File operations

5. **LangGraph Workflow**
   - State definition with reducers
   - Map-reduce pattern with Send API
   - Basic error handling

**Deliverables**:

- Working multi-agent system with 1 orchestrator + N workers
- Basic research workflow end-to-end
- Unit tests for core components
- CLI accepting queries and returning results

**Success Criteria**:

- Spawn 3 parallel workers successfully
- Workers operate in isolated contexts
- Results aggregate correctly
- No context overflow in orchestrator

### Phase 2: Advanced Context Engineering (Week 3)

**Goal**: Implement Markovian workspace and memory architecture

**Tasks**:

1. **Markovian Workspace**
   - Implement IterResearch-inspired state management
   - Bounded-size evolving report
   - Strategic forgetting mechanism
   - Round-based iteration

2. **Memory System**
   - Short-term: LangGraph checkpointing
   - Long-term: Vector store integration (FAISS/Pinecone)
   - Semantic retrieval
   - Memory block architecture

3. **Compression Pipeline**
   - Sub-agent output compression
   - Summarization strategies
   - Token counting and budgeting
   - Progressive truncation

4. **Context Monitoring**
   - Token tracking per agent
   - Context window utilization metrics
   - Auto-compact triggers

**Deliverables**:

- Markovian workspace with O(1) context complexity
- Multi-tier memory system
- Compression achieving 60%+ token reduction
- Monitoring dashboard for context usage

**Success Criteria**:

- Orchestrator maintains <50% context usage across 10+ rounds
- Successfully complete 50+ interaction workflow without overflow
- Workers compress 50K exploration to 2K summary
- Semantic retrieval finds relevant past research

### Phase 3: Production Tools & Reliability (Week 4)

**Goal**: Build comprehensive tool suite and error recovery

**Tasks**:

1. **Enhanced Tools**
   - Parallel search with batch queries
   - Goal-directed web fetch with retry
   - Jupyter kernel with sandboxing
   - Scholar integration
   - Data profiler

2. **Tool Optimization**
   - Result caching
   - Provider fallbacks
   - Rate limiting
   - Cost tracking

3. **Error Recovery**
   - Retry mechanisms with exponential backoff
   - Graceful degradation on tool failures
   - Sub-agent failure isolation
   - Human-in-the-loop escalation

4. **Validation Pipeline**
   - Citation agent implementation
   - Fact-checking agent
   - Consistency validation
   - Source attribution

**Deliverables**:

- Complete tool suite (8+ tools)
- Robust error handling
- Validation agents
- Tool usage analytics

**Success Criteria**:

- <5% tool failure rate with retries
- Successful recovery from sub-agent failures
- Citation accuracy >90%
- Tools handle rate limits gracefully

### Phase 4: EDA & Notebook Generation (Week 5)

**Goal**: Specialized data analysis capabilities

**Tasks**:

1. **Data Agent Type**
   - Specialized worker for data analysis
   - Pandas/Polars integration
   - Statistical testing
   - Automated profiling

2. **Notebook Builder**
   - Programmatic notebook creation
   - Cell management
   - Execution result capture
   - 7-act EDA template

3. **Visualization Pipeline**
   - Matplotlib/Seaborn integration
   - Chart generation from code
   - Embedding in notebooks
   - Interactive plots (optional)

4. **Multi-Agent EDA Workflow**
   - Parallel data profiling
   - Statistical validation
   - Insight extraction
   - Report synthesis

**Deliverables**:

- Data analysis agent type
- Notebook generation pipeline
- EDA template library
- Multi-agent EDA orchestration

**Success Criteria**:

- Generate executable notebooks from data files
- 7-act narrative structure
- Visualizations embedded correctly
- Statistical insights extracted automatically

### Phase 5: Production Readiness (Week 6)

**Goal**: Observability, optimization, and deployment

**Tasks**:

1. **Observability**
   - Structured logging
   - LangSmith integration
   - Metrics dashboard
   - Cost attribution

2. **Optimization**
   - Model governance (single Tongyi baseline + config-driven overrides)
   - Prompt caching
   - Token budget enforcement
   - Dynamic scaling

3. **CLI Enhancements**
   - Interactive mode
   - Session management
   - Resume capability
   - Export formats

4. **Documentation**
   - API documentation
   - Usage examples
   - Architecture diagrams
   - Deployment guide

**Deliverables**:

- Production-ready system
- Comprehensive observability
- Optimized for cost and performance
- Complete documentation

**Success Criteria**:

- Average cost <$0.10 per research task
- 90% reduction in research time vs. single-agent
- Observability covering all critical paths
- Documentation enables onboarding in <1 hour

## Detailed Component Specifications

### LeadResearcher Orchestrator Logic

```python
from langchain_openai import ChatOpenAI

class LeadResearcher:
    def __init__(self, model: str = "alibaba/tongyi-deepresearch-30b-a3b"):
        self.model = ChatOpenAI(
            model=model,
            base_url="https://openrouter.ai/api/v1",
            temperature=0,
            default_headers={
                "HTTP-Referer": "https://addcommitpush.io",
                "X-Title": "DeepResearch Orchestrator"
            }
        )
        self.workspace = None

    def analyze_query(self, query: str) -> QueryAnalysis:
        """
        Assess query complexity and determine scaling strategy.
        """
        analysis_prompt = f"""
        Analyze this research query and determine:

        QUERY: {query}

        Return JSON:
        {{
          "complexity": 0.0-1.0,  // Simple to complex
          "specificity": 0.0-1.0,  // Broad to narrow
          "domains": ["domain1", "domain2"],  // Knowledge domains
          "estimated_sources": int,  // Expected source count
          "multi_step": bool  // Requires multi-step reasoning
        }}
        """

        response = self.model.with_structured_output(QueryAnalysis).invoke(analysis_prompt)
        return response

    def determine_scaling(self, analysis: QueryAnalysis) -> ScalingStrategy:
        """
        Decide number of agents and calls based on complexity.
        """
        if analysis.complexity < 0.3 and analysis.specificity > 0.7:
            return ScalingStrategy(
                num_agents=1,
                calls_per_agent=5,
                parallel=False
            )
        elif analysis.complexity < 0.6:
            return ScalingStrategy(
                num_agents=3,
                calls_per_agent=15,
                parallel=True
            )
        else:
            return ScalingStrategy(
                num_agents=5,
                calls_per_agent=25,
                parallel=True
            )

    def create_sub_tasks(self, query: str, analysis: QueryAnalysis) -> list[SubTask]:
        """
        Decompose query into focused sub-tasks for workers.
        """
        decomposition_prompt = f"""
        QUERY: {query}

        ANALYSIS:
        - Complexity: {analysis.complexity}
        - Domains: {analysis.domains}
        - Multi-step: {analysis.multi_step}

        Decompose into {self.scaling.num_agents} focused sub-tasks.
        Each should:
        - Be independently researchable
        - Have clear objective and deliverable
        - Minimize overlap with other sub-tasks

        Return JSON array of:
        {{
          "id": "unique_id",
          "objective": "Clear research question",
          "tools": ["search", "web_fetch"],
          "expected_output": "What this subtask should deliver",
          "success_criteria": "How to validate completion"
        }}
        """

        response = self.model.with_structured_output(list[SubTask]).invoke(decomposition_prompt)
        return response

    def synthesize_results(self, sub_agent_results: list[dict], workspace: MarkovianWorkspace) -> str:
        """
        Combine findings from parallel workers into evolving report.
        """
        summaries = [r["summary"] for r in sub_agent_results]

        synthesis_prompt = f"""
        RESEARCH QUERY: {workspace.query}

        CURRENT REPORT (Round {workspace.round}):
        {workspace.evolving_report}

        NEW FINDINGS FROM {len(summaries)} SUB-AGENTS:
        {self._format_summaries(summaries)}

        Synthesize these findings:
        1. Integrate new insights into current report
        2. Identify patterns and connections
        3. Flag contradictions or gaps
        4. Maintain coherent narrative
        5. Keep under {workspace.max_report_size} tokens

        Return updated report.
        """

        updated_report = self.model.invoke(synthesis_prompt).content

        workspace.update(
            new_findings=updated_report,
            action="parallel_research",
            result=f"{len(summaries)} sub-agents"
        )

        return workspace.evolving_report

    def should_continue(self, workspace: MarkovianWorkspace) -> Literal["continue", "validate", "finalize"]:
        """
        Decide whether to spawn another research round or finalize.
        """
        decision_prompt = f"""
        QUERY: {workspace.query}

        CURRENT REPORT (Round {workspace.round}):
        {workspace.evolving_report}

        Evaluate:
        - Is the query fully answered?
        - Are there significant knowledge gaps?
        - Would another research round add value?

        Return one of:
        - "continue": Spawn another round with focused sub-tasks
        - "validate": Proceed to citation/fact-checking
        - "finalize": Generate final report
        """

        response = self.model.invoke(decision_prompt).content.strip().lower()

        # Safety: Max rounds to prevent infinite loops
        if workspace.round >= 5:
            return "validate"

        return response
```

### Worker Agent Execution Pattern

```python
class WorkerAgent:
    def __init__(self, model: str = "alibaba/tongyi-deepresearch-30b-a3b", tools: list[BaseTool]):
        self.model = ChatOpenAI(
            model=model,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.3,
            default_headers={
                "HTTP-Referer": "https://addcommitpush.io",
                "X-Title": "DeepResearch Worker"
            }
        )
        self.tools = {t.name: t for t in tools}
        self.token_budget = 50_000
        self.max_tool_calls = 20

    def execute(self, objective: str, expected_output: str) -> WorkerResult:
        """
        Execute focused research task with full exploration.
        """
        context = {
            "objective": objective,
            "expected_output": expected_output,
            "tools_available": list(self.tools.keys()),
            "budget": {
                "max_tokens": self.token_budget,
                "max_tool_calls": self.max_tool_calls
            }
        }

        # Initialize exploration
        messages = [
            SystemMessage(content=self._create_worker_prompt(context)),
            HumanMessage(content=objective)
        ]

        tokens_used = 0
        tool_calls_made = 0
        exploration_log = []

        # Exploration loop
        while tool_calls_made < self.max_tool_calls:
            # Generate response
            response = self.model.invoke(messages)
            tokens_used += count_tokens(response.content)

            # Check for answer
            if self._has_answer_tag(response.content):
                break

            # Extract tool calls
            tool_calls = self._extract_tool_calls(response.content)

            if not tool_calls:
                break

            # Execute tools
            for tool_call in tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["arguments"]

                result = self.tools[tool_name].execute(**tool_args)

                messages.append(
                    ToolMessage(
                        content=f"<tool_response>\n{result}\n</tool_response>",
                        tool_call_id=tool_call["id"]
                    )
                )

                exploration_log.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": result
                })

                tool_calls_made += 1

            # Budget check
            if tokens_used > self.token_budget * 0.9:
                messages.append(
                    SystemMessage(content="Approaching token budget. Provide final answer.")
                )

        # Extract final exploration
        full_exploration = self._extract_full_context(messages)

        # Compress for handoff
        summary = self._compress_findings(full_exploration, max_tokens=2000)

        # Store full context to long-term memory
        memory_id = self._store_to_memory(full_exploration, exploration_log)

        return WorkerResult(
            summary=summary,
            memory_id=memory_id,
            metadata={
                "tokens_used": tokens_used,
                "tool_calls": tool_calls_made,
                "sources": self._extract_sources(exploration_log)
            }
        )

    def _compress_findings(self, full_exploration: str, max_tokens: int) -> str:
        """
        Condense exploration into compact summary for orchestrator.
        """
        compression_prompt = f"""
        You explored a research objective extensively.
        Compress your findings into a {max_tokens}-token summary.

        FULL EXPLORATION:
        {full_exploration}

        Focus on:
        - Key insights and conclusions
        - Important sources and evidence
        - Answers to the objective
        - Critical gaps or limitations

        Omit:
        - Redundant information
        - Exploratory reasoning (keep conclusions)
        - Tool call details (keep results)

        COMPRESSED SUMMARY:
        """

        response = self.model.invoke(
            compression_prompt,
            max_tokens=max_tokens
        )

        return response.content

    def _create_worker_prompt(self, context: dict) -> str:
        return f"""
        You are a specialized research agent.

        OBJECTIVE: {context["objective"]}
        EXPECTED OUTPUT: {context["expected_output"]}

        AVAILABLE TOOLS:
        {self._format_tools(context["tools_available"])}

        BUDGET:
        - Maximum {context["budget"]["max_tokens"]} tokens
        - Maximum {context["budget"]["max_tool_calls"]} tool calls

        PROCESS:
        1. Plan your research approach
        2. Use tools to gather information
        3. Synthesize findings progressively
        4. Provide comprehensive answer

        Use <think> tags for reasoning.
        Use <tool_call> tags for tool invocations.
        Use <answer> tags for final deliverable.
        """
```

## Production Deployment Patterns

### Cost Optimization

**Single-Model Baseline (Tongyi DeepResearch 30B A3B)**:

```python
DEFAULT_MODEL = "alibaba/tongyi-deepresearch-30b-a3b"

def build_llm(profile: ResearchProfile, temperature: float = 0):
    model_name = profile.model_name or DEFAULT_MODEL

    return ChatOpenAI(
        model=model_name,
        base_url="https://openrouter.ai/api/v1",
        temperature=temperature,
        default_headers={
            "HTTP-Referer": "https://addcommitpush.io",
            "X-Title": f"DeepResearch::{profile.name}"
        },
        extra_body={
            "reasoning": {"effort": profile.reasoning_effort}
        }
    )
```

Using a single reasoning-optimized model keeps behavior consistent, simplifies evaluation, and honors the "no Anthropic models" requirement while still allowing future swaps by editing `profile.model_name` rather than touching code. [\[link\]](https://openrouter.ai/alibaba/tongyi-deepresearch-30b-a3b)

**Token Budget Enforcement**:

```python
class TokenBudgetManager:
    def __init__(self, monthly_budget: float):
        self.monthly_budget = monthly_budget
        self.spent = 0.0

    def check_budget(self, estimated_tokens: int) -> bool:
        estimated_cost = self._estimate_cost(estimated_tokens)

        if self.spent + estimated_cost > self.monthly_budget:
            raise BudgetExceededError(
                f"Would exceed monthly budget: ${self.monthly_budget}"
            )

        return True

    def record_usage(self, tokens: int, model: str):
        cost = self._calculate_cost(tokens, model)
        self.spent += cost

    def _estimate_cost(self, tokens: int) -> float:
        # Use conservative estimate (assume Tongyi DeepResearch baseline)
        return tokens * PRICING["alibaba/tongyi-deepresearch-30b-a3b"]["input"] / 1_000_000
```

**Reasoning Traces & Prompt Reuse (OpenRouter)**:

```python
def build_openrouter_payload(system_prompt: str, user_query: str, profile: ResearchProfile):
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_query)
    ]

    return {
        "messages": messages,
        "extra_body": {
            "reasoning": {
                "effort": profile.reasoning_effort,
                "include_reasoning": profile.capture_reasoning
            }
        }
    }
```

OpenRouter exposes a native `reasoning` parameter and returns `reasoning_details`; we persist those details inside the Markovian workspace for free "prompt caching" without depending on proprietary Anthropic cache controls. [\[link\]](https://openrouter.ai/alibaba/tongyi-deepresearch-30b-a3b)

### Observability

**Structured Logging**:

```python
import structlog

logger = structlog.get_logger()

class ObservableAgent:
    def execute(self, query: str):
        with logger.contextualize(
            research_id=research_id,
            query=query,
            agent_type="lead_researcher"
        ):
            logger.info("research.started")

            try:
                result = self._execute_internal(query)
                logger.info(
                    "research.completed",
                    tokens_used=result.tokens,
                    cost=result.cost,
                    duration_seconds=result.duration
                )
                return result
            except Exception as e:
                logger.error(
                    "research.failed",
                    error=str(e),
                    traceback=traceback.format_exc()
                )
                raise
```

**LangSmith Integration**:

```python
from langsmith import trace

@trace(name="multi_agent_research")
def execute_research(query: str):
    # All LLM calls automatically traced
    # View in LangSmith dashboard
    result = research_agent.execute(query)
    return result
```

**Metrics Dashboard**:

```python
from prometheus_client import Counter, Histogram

research_requests = Counter(
    "research_requests_total",
    "Total research requests",
    ["status", "agent_type"]
)

research_duration = Histogram(
    "research_duration_seconds",
    "Research request duration",
    ["complexity"]
)

research_cost = Histogram(
    "research_cost_dollars",
    "Research request cost",
    ["model"]
)

def execute_with_metrics(query: str):
    start = time.time()

    try:
        result = execute_research(query)

        research_requests.labels(status="success", agent_type="multi_agent").inc()
        research_duration.labels(complexity=result.complexity).observe(time.time() - start)
        research_cost.labels(model=result.model).observe(result.cost)

        return result
    except Exception:
        research_requests.labels(status="error", agent_type="multi_agent").inc()
        raise
```

### Error Recovery

**Retry with Exponential Backoff**:

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class ResilientAgent:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True
    )
    def invoke_llm(self, prompt: str):
        return self.model.invoke(prompt)
```

**Graceful Degradation**:

```python
def execute_research_with_degradation(query: str):
    try:
        # Attempt full multi-agent research
        return multi_agent_research(query)
    except BudgetExceededError:
        # Degrade to single-agent
        logger.warn("Degrading to single-agent due to budget")
        return single_agent_research(query)
    except ServiceUnavailableError:
        # Degrade to cached results
        logger.warn("Service unavailable, using cached results")
        return get_cached_similar_research(query)
```

**Sub-Agent Failure Isolation**:

```python
def synthesize_with_partial_results(sub_agent_results: list[dict]) -> str:
    # Filter successful results
    successful = [r for r in sub_agent_results if r.get("success")]

    if len(successful) == 0:
        raise AllAgentsFailedError("All sub-agents failed")

    if len(successful) < len(sub_agent_results):
        logger.warn(
            "Partial sub-agent failure",
            failed_count=len(sub_agent_results) - len(successful)
        )

    # Synthesize from successful results only
    return synthesize_results(successful)
```

## What NOT to Do

### Critical Anti-Patterns

1. **DO NOT accumulate all sub-agent outputs in orchestrator context**
   - **Problem**: Context explosion, token waste, performance degradation
   - **Solution**: Compress to 2K summaries, store full outputs externally

2. **DO NOT use single-agent for complex queries**
   - **Problem**: Context overload, inefficiency, poor scaling
   - **Solution**: Employ multi-agent for complexity >0.5

3. **DO NOT spawn unlimited agents**
   - **Problem**: Cost explosion, coordination overhead, diminishing returns
   - **Solution**: Cap at 10 agents, use scaling heuristics

4. **DO NOT ignore token budgets**
   - **Problem**: Runaway costs, unpredictable expenses
   - **Solution**: Enforce per-request and monthly budgets

5. **DO NOT mix multiple LLM families in MVP**
   - **Problem**: Divergent reasoning styles and duplicated prompt engineering
   - **Solution**: Keep every agent on `alibaba/tongyi-deepresearch-30b-a3b` until a new profile is rolled out

6. **DO NOT skip validation**
   - **Problem**: Hallucinations, factual errors, low trust
   - **Solution**: Citation agent, fact-checking, consistency validation

7. **DO NOT implement without observability**
   - **Problem**: Debugging nightmares, cost surprises, performance issues
   - **Solution**: Structured logging, LangSmith, metrics from day 1

8. **DO NOT use shared context across workers**
   - **Problem**: Context pollution, coordination overhead
   - **Solution**: Isolated contexts per worker

9. **DO NOT retry indefinitely**
   - **Problem**: Infinite loops, cost spirals
   - **Solution**: Max 3 retries with exponential backoff

10. **DO NOT deploy without error recovery**
    - **Problem**: Brittle system, poor UX
    - **Solution**: Graceful degradation, partial results, fallbacks

11. **DO NOT optimize prematurely**
    - **Problem**: Complex code, hard to maintain
    - **Solution**: Start simple, measure, optimize bottlenecks

12. **DO NOT ignore memory leaks**
    - **Problem**: Long-running sessions crash
    - **Solution**: Periodic cleanup, memory limits, monitoring
13. **DO NOT reintroduce Anthropic models in this document's baseline**
    - **Problem**: Violates deployment policy and complicates evaluation
    - **Solution**: Enforce profile-level guards so only Tongyi DeepResearch 30B A3B is instantiated until requirements change

## Success Criteria

### MVP (Minimum Viable Product)

The system is production-ready when:

1. **Multi-Agent Orchestration**
   - ✓ LeadResearcher spawns 3-5 workers dynamically
   - ✓ Workers execute in parallel with isolated contexts
   - ✓ Results synthesize correctly into coherent report
   - ✓ Scaling adapts to query complexity

2. **Context Management**
   - ✓ Orchestrator maintains <50% context usage
   - ✓ Workers compress 50K → 2K successfully
   - ✓ Markovian workspace enables 20+ iteration rounds
   - ✓ No context overflow errors

3. **Tool Suite**
   - ✓ Search, web fetch, code executor operational
   - ✓ Tools handle errors gracefully (retries, fallbacks)
   - ✓ Parallel tool execution works
   - ✓ Cost tracking per tool implemented

4. **Quality**
   - ✓ Research success rate >80% on test queries
   - ✓ Citation accuracy >85%
   - ✓ Output coherence scored >4/5 by evaluators
   - ✓ No factual hallucinations in validation

5. **Performance**
   - ✓ 3× speedup vs. single-agent on complex queries
   - ✓ Average cost <$0.15 per research task
   - ✓ Response latency <3 minutes for medium complexity
   - ✓ Token reduction >60% through compression

6. **Reliability**
   - ✓ Checkpointing enables resume from failures
   - ✓ Sub-agent failures don't crash orchestrator
   - ✓ Error recovery patterns tested
   - ✓ Observability covers critical paths

### Quality Metrics

- **Code Coverage**: >75% for agent core, >60% overall
- **Type Coverage**: 100% (strict mypy, no `Any` escapes)
- **Linting**: Zero ruff errors, zero mypy errors
- **Performance**: P95 latency <5 minutes for complex queries
- **Cost**: Average <$0.10 per research task with optimization
- **Reliability**: <3% complete failure rate on valid inputs
- **Context Efficiency**: >60% token reduction vs. naive accumulation

## Future Enhancements (Post-MVP)

### Short-Term (v2)

1. **Enhanced Agent Types**
   - Code analysis specialist (AST parsing, dependency analysis)
   - Academic paper specialist (arXiv, PubMed, Google Scholar)
   - Visual analysis specialist (image understanding, chart extraction)
   - SQL specialist (database querying, schema analysis)

2. **Advanced Memory**
   - Graph-based memory (knowledge graphs, entity relationships)
   - Episodic learning (improving from past research)
   - User preference modeling
   - Cross-session knowledge retention

3. **Agentic RAG**
   - Dynamic retrieval strategy selection
   - Multi-hop reasoning over documents
   - Self-reflection and query refinement
   - Hybrid search (semantic + keyword + graph)

### Medium-Term (v3)

1. **Test-Time Scaling**
   - IterResearch Heavy Mode (3-5 parallel orchestrators)
   - Synthesis agent combining multiple research perspectives
   - Confidence-weighted result aggregation
   - Budget-based scaling (spend more compute for higher quality)

2. **Advanced EDA**
   - Automated feature engineering
   - Statistical hypothesis testing
   - Causal inference
   - Model recommendation
   - AutoML integration

3. **Collaborative Features**
   - Multi-user research sessions
   - Shared knowledge bases
   - Team collaboration workflows
   - Expert-in-the-loop patterns

### Long-Term (v4+)

1. **Training Pipeline**
   - Synthetic trajectory generation
   - Fine-tuning on domain data
   - RLHF from user feedback
   - Continual learning

2. **Enterprise Scale**
   - Multi-tenant isolation
   - SSO and RBAC
   - Audit logging and compliance
   - SLA monitoring
   - Horizontal scaling (100+ concurrent sessions)

3. **Domain Specialization**
   - Healthcare/biomedical research
   - Legal research and precedent analysis
   - Financial/quant analysis
   - Scientific research (physics, chemistry, etc.)

## Getting Started (Implementation Roadmap)

### Step 1: Initialize Project

```bash
# Create project directory
mkdir deep-research-agent
cd deep-research-agent

# Initialize uv project
uv init --package --name deep-research --python 3.11

# Add core dependencies
uv add click httpx langgraph langchain langchain-openai
uv add python-dotenv pydantic rich nbformat jupyter-client
uv add pandas matplotlib seaborn
uv add faiss-cpu  # or faiss-gpu
uv add psycopg2-binary  # for PostgreSQL checkpointing

# Add dev dependencies
uv add --dev pytest pytest-cov pytest-asyncio ruff mypy

# Sync environment
uv sync
```

### Step 2: Configure Environment

```bash
# Create .env file
cat > .env <<EOF
# LLM Configuration
OPENROUTER_API_KEY=sk-or-...

# Search Provider
SERPER_API_KEY=...

# Database (for checkpointing)
POSTGRES_CONN_STRING=postgresql://user:pass@localhost/deepresearch

# Agent Settings
MAX_ITERATIONS=100
MAX_TOKENS_PER_AGENT=50000
MONTHLY_BUDGET=100.00

# Observability
LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=deep-research-agent
EOF

# Create directory structure
mkdir -p src/deep_research/{agent,tools,notebook,utils,memory}
mkdir -p tests examples outputs/{research,notebooks,sessions}
```

### Step 3: Implement Core (Follow Phases)

Begin with **Phase 1** as detailed in Implementation Phases section.

### Step 4: Iterate and Improve

- Deploy MVP to staging
- Collect user feedback
- Monitor costs and performance
- Iterate based on real usage patterns

## Code References

### Primary Inspirations

1. **Anthropic Multi-Agent Research System**
   - [Anthropic Engineering Blog](https://www.anthropic.com/engineering/multi-agent-research-system)
   - Orchestrator-worker pattern
   - 90.2% improvement metrics
   - 8 prompting principles

2. **Alibaba IterResearch (DeepResearch)**
   - [GitHub Repository](https://github.com/Alibaba-NLP/DeepResearch)
   - [arXiv Paper](https://arxiv.org/abs/2511.07327)
   - Markovian workspace pattern
   - IterResearch Heavy Mode
   - O(1) context complexity

3. **LangGraph Hierarchical Teams**
   - [Official Tutorial](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/hierarchical_agent_teams/)
   - [Send API Guide](https://dev.to/sreeni5018/leveraging-langgraphs-send-api-for-dynamic-and-parallel-workflow-execution-4pgd)
   - Map-reduce pattern
   - Dynamic parallel execution

4. **Context Engineering Guide**
   - [LangChain Blog](https://blog.langchain.com/context-engineering-for-agents/)
   - [Anthropic Guide](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
   - Write/Select/Compress/Isolate framework
   - Memory architectures

### Academic References

- [IterResearch Paper](https://arxiv.org/abs/2511.07327) - Markovian state reconstruction
- [LazyLLM Paper](https://arxiv.org/abs/2407.14057) - Dynamic token pruning
- [TALE Framework](https://arxiv.org/abs/2412.18547) - Token-budget-aware reasoning
- [Agentic RAG Survey](https://arxiv.org/abs/2501.09136) - Autonomous retrieval patterns
- [Multi-Agent Failure Analysis](https://arxiv.org/abs/2503.13657) - Failure taxonomy
- [Hierarchical Multi-Agent Systems](https://arxiv.org/abs/2508.12683) - Architecture patterns

## Conclusion

This architecture represents a **production-ready evolution** of the initial single-agent design, addressing the fundamental challenge of **context overload** through:

1. **Hierarchical orchestration** with specialized sub-agents
2. **Intelligent context engineering** reducing token usage 60-94%
3. **Markovian workspace** enabling unbounded interactions with O(1) complexity
4. **Parallel execution** achieving 90% speed improvements
5. **Comprehensive observability** for production deployment

The system is built on proven patterns from **Anthropic's 90.2% improvement**, **Alibaba's 2048-interaction workflows**, and **production systems processing thousands of daily queries**.

By implementing this architecture in **6 phased weeks**, you'll have a robust multi-agent research system that:

- **Solves real problems**: Context overflow, token waste, slow research
- **Scales intelligently**: 1-10 agents based on complexity
- **Costs efficiently**: <$0.10 per task through optimization
- **Operates reliably**: Checkpointing, error recovery, graceful degradation
- **Extends easily**: Plugin architecture, new agent types, custom tools

The key differentiators from the initial design:

| Aspect                 | Initial Design         | Improved Design                              |
| ---------------------- | ---------------------- | -------------------------------------------- |
| **Context Management** | Accumulate all outputs | Compress to 2K summaries                     |
| **Orchestration**      | Single ReAct loop      | Hierarchical orchestrator + workers          |
| **Execution**          | Sequential             | Parallel map-reduce                          |
| **Memory**             | Simple checkpointing   | Three-tier with Markovian workspace          |
| **Scaling**            | Fixed architecture     | Dynamic 1-10 agents                          |
| **Cost**               | Unoptimized            | Tongyi baseline efficiency, budgets, caching |
| **Observability**      | Basic logging          | LangSmith, metrics, dashboards               |

**Next Steps**: Begin Phase 1 implementation, focusing on the orchestrator-worker pattern and basic parallel execution. Iterate based on real usage, and progressively add advanced features.

---

**Related Research**:

- [2025-11-15_deep-research-agent-architecture.md](./2025-11-15_deep-research-agent-architecture.md) - Initial single-agent design (superseded)
- Future: Deep Research Agent v3 - Test-time scaling with Heavy Mode
- Future: Deep Research Agent - Production Deployment Guide

**Document Version**: 2.0
**Status**: Complete
**Last Updated**: 2025-11-15
