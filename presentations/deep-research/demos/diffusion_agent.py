"""
Diffusion Deep Research Agent — Faithful implementation of thinkdepthai/Deep_Research
=====================================================================================

This is a 1-to-1 reimplementation of the diffusion-based deep research system from
https://github.com/thinkdepthai/Deep_Research — consolidated into a single file with
detailed walkthrough comments and demo-friendly logging.

The core idea from the paper: treat research like image diffusion. Start with a "noisy"
draft (written from LLM knowledge only, no search), then iteratively "denoise" it by:
1. Having a supervisor identify what research is needed
2. Dispatching sub-agents that do ReAct-style search loops
3. Compressing their findings
4. Refining the draft with the new evidence
5. Repeating until the supervisor is satisfied

Architecture (matches reference):
    START → write_research_brief → write_draft_report
          → supervisor ↔ supervisor_tools (loop)
            - ConductResearch → research_agent (ReAct sub-agent)
            - refine_draft_report → updates draft
            - think_tool → reflection
            - ResearchComplete → done
          → final_report_generation → END

Key concepts from the reference:
- Supervisor LLM with tool-calling decides WHAT to research and WHEN to stop
- Sub-agents use ReAct pattern (LLM + search tool + think tool in a loop)
- Research is compressed before returning to supervisor (information preservation)
- Draft is refined with each batch of findings (the "denoising" step)
- Final report is a polished version of the refined draft
"""

import operator
import os
from datetime import datetime
from typing import Annotated, Literal, Sequence

from langchain_openai import ChatOpenAI
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
    filter_messages,
)
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.types import Command
from pydantic import BaseModel, Field
from tavily import TavilyClient
from typing_extensions import TypedDict


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  LLM CONFIGURATION                                                  ║
# ║                                                                      ║
# ║  Using OpenRouter to route to Groq for fastest inference.            ║
# ║  The reference uses gpt-5; we use gpt-oss-120b for demo speed.      ║
# ╚══════════════════════════════════════════════════════════════════════╝

llm = ChatOpenAI(
    model="openai/gpt-oss-120b",
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    temperature=0,
    extra_body={"provider": {"order": ["Groq"]}},
)

# Higher temperature for the "noisy" initial draft — more speculative
llm_creative = ChatOpenAI(
    model="openai/gpt-oss-120b",
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    temperature=0.7,
    extra_body={"provider": {"order": ["Groq"]}},
)

# Direct Tavily client for proper URL extraction (not the langchain wrapper)
tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


def get_today_str() -> str:
    return datetime.now().strftime("%a %b %-d, %Y")


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  TOOLS — matching the reference's tool definitions                   ║
# ║                                                                      ║
# ║  Reference has: tavily_search, think_tool, ConductResearch,          ║
# ║  ResearchComplete, refine_draft_report                               ║
# ║                                                                      ║
# ║  tavily_search: used by sub-agents to search the web                 ║
# ║  think_tool: used by both supervisor and sub-agents for reflection   ║
# ║  ConductResearch: supervisor delegates research to sub-agents        ║
# ║  ResearchComplete: supervisor signals research is done               ║
# ║  refine_draft_report: supervisor triggers draft refinement           ║
# ╚══════════════════════════════════════════════════════════════════════╝


@tool(parse_docstring=True)
def tavily_search(query: str) -> str:
    """Search the web for information on a topic.

    Args:
        query: A search query to execute

    Returns:
        Formatted search results with sources and content
    """
    import log

    log.search(query)
    results = tavily_client.search(
        query, max_results=3, include_raw_content=False
    )

    formatted = "Search results:\n\n"
    for i, result in enumerate(results.get("results", []), 1):
        url = result.get("url", "")
        title = result.get("title", "")
        content = result.get("content", "")
        formatted += f"--- SOURCE {i}: {title} ---\n"
        formatted += f"URL: {url}\n\n"
        formatted += f"{content}\n\n"
        formatted += "-" * 40 + "\n"
        log.detail(f"Source {i}: {url}")

    return formatted


@tool(parse_docstring=True)
def think_tool(reflection: str) -> str:
    """Strategic reflection on research progress and decision-making.

    Use after each search to analyze results and plan next steps.

    Args:
        reflection: Your detailed reflection on research progress

    Returns:
        Confirmation that reflection was recorded
    """
    import log
    log.thinking(f"Reflection: {reflection[:120]}...")
    return f"Reflection recorded: {reflection}"


# Supervisor tools — these are Pydantic models used as tool schemas
@tool
class ConductResearch(BaseModel):
    """Delegate a research task to a specialized sub-agent that will search the web."""
    research_topic: str = Field(
        description="The topic to research. Should be described in detail."
    )


@tool
class ResearchComplete(BaseModel):
    """Signal that research is complete and all findings have been gathered."""
    pass


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  STATE DEFINITIONS — matching the reference's state schemas          ║
# ║                                                                      ║
# ║  Reference has:                                                      ║
# ║  - ResearcherState: for sub-agent ReAct loops                        ║
# ║  - SupervisorState: for the supervisor's tool-calling loop           ║
# ║  - AgentState: for the full pipeline                                 ║
# ║                                                                      ║
# ║  We merge these into two: ResearcherState + DiffusionState           ║
# ╚══════════════════════════════════════════════════════════════════════╝


class ResearcherState(TypedDict):
    """State for each sub-agent's ReAct research loop."""
    researcher_messages: Annotated[Sequence[BaseMessage], add_messages]
    research_topic: str
    compressed_research: str
    raw_notes: Annotated[list[str], operator.add]


class DiffusionState(TypedDict):
    """Main pipeline state — combines AgentState + SupervisorState from reference."""
    query: str
    research_brief: str
    draft_report: str
    supervisor_messages: Annotated[Sequence[BaseMessage], add_messages]
    notes: Annotated[list[str], operator.add]
    raw_notes: Annotated[list[str], operator.add]
    research_iterations: int
    final_report: str


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 1: RESEARCH BRIEF                                            ║
# ║                                                                      ║
# ║  Reference: research_agent_scope.py → write_research_brief()         ║
# ║  Converts user query into a detailed, structured research brief.     ║
# ╚══════════════════════════════════════════════════════════════════════╝


RESEARCH_BRIEF_PROMPT = """You will be given a user request. Your job is to translate it into a detailed research brief.

User request: {query}

Today's date is {date}.

Guidelines:
1. Maximize specificity — include all key dimensions to investigate
2. Avoid unwarranted assumptions — note unspecified aspects as open
3. Use first person — phrase from the user's perspective
4. Be specific about what sources to prioritize

Return a single, detailed research brief."""


def write_research_brief(state: DiffusionState) -> dict:
    """Phase 1: Convert user query into structured research brief."""
    import log

    query = state["query"]
    log.phase("Phase 1: Write Research Brief")
    log.step("*", "Converting query into detailed research brief...")

    prompt = RESEARCH_BRIEF_PROMPT.format(query=query, date=get_today_str())
    response = llm.invoke([HumanMessage(content=prompt)])
    log.track_cost(response.response_metadata)

    log.success(f"Brief generated ({len(response.content)} chars)")
    for line in response.content.strip().split("\n")[:4]:
        if line.strip():
            log.detail(line.strip())

    return {"research_brief": response.content}


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 2: NOISY DRAFT                                               ║
# ║                                                                      ║
# ║  Reference: research_agent_scope.py → write_draft_report()           ║
# ║  The "noise" — a draft from LLM knowledge ONLY, no search.          ║
# ║  Higher temperature encourages speculative content that will be      ║
# ║  verified/corrected by real research in subsequent phases.           ║
# ╚══════════════════════════════════════════════════════════════════════╝


DRAFT_REPORT_PROMPT = """Based on your knowledge, create a comprehensive draft report for:

{research_brief}

Today's date is {date}.

Write a detailed draft with proper headings and sections.
This is an initial draft — it will be refined with actual research.
Be thorough but acknowledge where you're uncertain.

Format in clear markdown with ## section headers."""


def write_draft_report(state: DiffusionState) -> dict:
    """Phase 2: Generate noisy draft from LLM knowledge only (no search)."""
    import log

    brief = state["research_brief"]
    log.phase("Phase 2: Write Draft Report (LLM knowledge only)")
    log.step("*", "Generating initial draft — no search, temperature=0.7")

    prompt = DRAFT_REPORT_PROMPT.format(research_brief=brief, date=get_today_str())
    response = llm_creative.invoke([HumanMessage(content=prompt)])
    log.track_cost(response.response_metadata)

    log.success(f"Draft generated ({len(response.content)} chars)")

    # Pass draft + brief to supervisor as initial messages
    return {
        "draft_report": response.content,
        "supervisor_messages": [
            HumanMessage(content=f"Here is the draft report: {response.content}\n\n{brief}")
        ],
    }


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SUB-AGENT: RESEARCH AGENT (ReAct pattern)                          ║
# ║                                                                      ║
# ║  Reference: research_agent.py                                        ║
# ║  Each sub-agent runs a ReAct loop: LLM → tool calls → LLM → ...     ║
# ║  Uses tavily_search for web search and think_tool for reflection.    ║
# ║  Results are compressed before returning to the supervisor.          ║
# ╚══════════════════════════════════════════════════════════════════════╝


RESEARCH_AGENT_PROMPT = """You are a research assistant. Today's date is {date}.

Use the search tool to gather information about the topic. After each search,
use think_tool to reflect on what you found and what's still missing.

Hard limits:
- Use 2-5 search tool calls maximum
- Stop when you have 3+ relevant sources
- Stop if last 2 searches returned similar information

After gathering enough info, provide a comprehensive answer with citations."""

research_tools = [tavily_search, think_tool]
research_tools_by_name = {t.name: t for t in research_tools}
llm_with_research_tools = llm.bind_tools(research_tools)


def research_llm_call(state: ResearcherState) -> dict:
    """Sub-agent Think step: LLM decides to search or answer."""
    import log

    messages = state["researcher_messages"]
    topic = state.get("research_topic", "")

    prompt = RESEARCH_AGENT_PROMPT.format(date=get_today_str())
    response = llm_with_research_tools.invoke(
        [SystemMessage(content=prompt)] + list(messages)
    )
    log.track_cost(response.response_metadata)

    if response.tool_calls:
        for tc in response.tool_calls:
            name = tc.get("name", "")
            args = tc.get("args", {})
            if name == "tavily_search":
                log.step(">", f"Sub-agent searching: {args.get('query', '')[:80]}")
            elif name == "think_tool":
                log.step("?", "Sub-agent reflecting...")
    else:
        log.success(f"Sub-agent done ({len(response.content)} chars)")

    return {"researcher_messages": [response]}


def research_tool_node(state: ResearcherState) -> dict:
    """Sub-agent Act step: execute all tool calls."""
    last_msg = state["researcher_messages"][-1]
    tool_outputs = []
    for tc in last_msg.tool_calls:
        tool_fn = research_tools_by_name[tc["name"]]
        observation = tool_fn.invoke(tc["args"])
        tool_outputs.append(
            ToolMessage(content=observation, name=tc["name"], tool_call_id=tc["id"])
        )
    return {"researcher_messages": tool_outputs}


def compress_research(state: ResearcherState) -> dict:
    """Compress research findings into a concise summary with citations.

    Instead of passing raw conversation messages (which confuse models when
    they contain ToolMessages), we extract the text content from tool and AI
    messages and pass it as a single prompt.
    """
    import log

    messages = state["researcher_messages"]
    topic = state.get("research_topic", "")

    log.step("=", f"Compressing research on: {topic[:60]}")

    # Extract text content from tool messages (search results) and AI messages
    raw_notes = []
    for m in messages:
        if hasattr(m, "content") and m.content:
            if hasattr(m, "name") and m.name == "tavily_search":
                raw_notes.append(m.content)
            elif hasattr(m, "name") and m.name == "think_tool":
                continue  # Skip think_tool reflections
            elif isinstance(m, ToolMessage):
                raw_notes.append(m.content)
            elif isinstance(m, AIMessage) and m.content:
                raw_notes.append(m.content)

    findings_text = "\n\n---\n\n".join(raw_notes)

    prompt = f"""Clean up these research findings. Preserve ALL information and source URLs.

Research topic: {topic}

Raw findings:
{findings_text}

Rules:
- Preserve ALL relevant information verbatim
- Include ALL source URLs as [Source: URL] citations
- Remove duplicates
- Structure: Cleaned findings with inline citations, then a Sources section listing all URLs

Return the cleaned findings."""

    response = llm.invoke([HumanMessage(content=prompt)])
    log.track_cost(response.response_metadata)

    log.success(f"Compressed to {len(response.content)} chars")
    return {
        "compressed_research": str(response.content),
        "raw_notes": ["\n".join(str(n) for n in raw_notes)],
    }


def research_should_continue(state: ResearcherState) -> Literal["research_tool_node", "compress_research"]:
    """Route: if LLM made tool calls → execute them, else → compress."""
    last_msg = state["researcher_messages"][-1]
    if last_msg.tool_calls:
        return "research_tool_node"
    return "compress_research"


# Build and compile the sub-agent graph (ReAct loop)
_research_builder = StateGraph(ResearcherState)
_research_builder.add_node("research_llm_call", research_llm_call)
_research_builder.add_node("research_tool_node", research_tool_node)
_research_builder.add_node("compress_research", compress_research)
_research_builder.add_edge(START, "research_llm_call")
_research_builder.add_conditional_edges(
    "research_llm_call",
    research_should_continue,
    {"research_tool_node": "research_tool_node", "compress_research": "compress_research"},
)
_research_builder.add_edge("research_tool_node", "research_llm_call")
_research_builder.add_edge("compress_research", END)
research_agent = _research_builder.compile()


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SUPERVISOR — the diffusion loop controller                          ║
# ║                                                                      ║
# ║  Reference: multi_agent_supervisor.py                                ║
# ║  The supervisor LLM decides what to research next using tools:       ║
# ║  - ConductResearch: spawn a sub-agent for a specific topic          ║
# ║  - refine_draft_report: update the draft with findings              ║
# ║  - think_tool: reflect on progress                                   ║
# ║  - ResearchComplete: signal we're done                               ║
# ║                                                                      ║
# ║  This loop IS the diffusion denoising — each iteration reduces       ║
# ║  uncertainty in the draft by replacing speculation with evidence.     ║
# ╚══════════════════════════════════════════════════════════════════════╝

MAX_SUPERVISOR_ITERATIONS = 8
MAX_CONCURRENT_RESEARCHERS = 3

SUPERVISOR_PROMPT = """You are a research supervisor. Today's date is {date}.
You follow the diffusion algorithm to iteratively improve a draft report.

Diffusion Algorithm:
1. Identify gaps in the draft report that need research
2. Call ConductResearch to gather evidence for those gaps
3. Call refine_draft_report to update the draft with new findings
4. Repeat until findings are comprehensive
5. Call ResearchComplete when done

Available tools:
- ConductResearch: Delegate research to a sub-agent (max {max_concurrent} parallel)
- refine_draft_report: Refine the draft with collected findings
- think_tool: Reflect on progress and plan next steps
- ResearchComplete: Signal research is complete

IMPORTANT:
- Use think_tool before and after ConductResearch calls
- Always call refine_draft_report after ConductResearch
- Each ConductResearch spawns an independent agent — give it full context
- Stop after gathering comprehensive findings, not when draft "looks good"
- Limit to {max_iterations} total tool-call rounds"""

supervisor_tools = [ConductResearch, ResearchComplete, think_tool]
supervisor_tools_by_name = {"think_tool": think_tool}
llm_with_supervisor_tools = llm.bind_tools(supervisor_tools)


def _get_notes_from_tool_calls(messages: Sequence[BaseMessage]) -> list[str]:
    """Extract compressed research findings from ToolMessage objects."""
    return [
        tm.content
        for tm in filter_messages(messages, include_types="tool")
    ]


def supervisor(state: DiffusionState) -> Command[Literal["supervisor_tools"]]:
    """Supervisor decides next action: research, refine, think, or complete."""
    import log

    supervisor_messages = list(state.get("supervisor_messages", []))
    iteration = state.get("research_iterations", 0) + 1

    log.phase(f"Supervisor (iteration {iteration}/{MAX_SUPERVISOR_ITERATIONS})")

    system_msg = SUPERVISOR_PROMPT.format(
        date=get_today_str(),
        max_concurrent=MAX_CONCURRENT_RESEARCHERS,
        max_iterations=MAX_SUPERVISOR_ITERATIONS,
    )
    messages = [SystemMessage(content=system_msg)] + supervisor_messages
    response = llm_with_supervisor_tools.invoke(messages)
    log.track_cost(response.response_metadata)

    if response.tool_calls:
        for tc in response.tool_calls:
            log.step(">", f"Supervisor calls: {tc['name']}")
            if tc["name"] == "ConductResearch":
                log.detail(f"Topic: {tc['args'].get('research_topic', '')[:80]}")
    else:
        log.step("=", "Supervisor provided text response (no tool calls)")

    return Command(
        goto="supervisor_tools",
        update={
            "supervisor_messages": [response],
            "research_iterations": iteration,
        },
    )


def _refine_draft(state: DiffusionState) -> str:
    """Refine the draft report using collected findings."""
    import log

    notes = _get_notes_from_tool_calls(state.get("supervisor_messages", []))
    findings = "\n".join(notes)
    draft = state.get("draft_report", "")
    brief = state.get("research_brief", "")

    log.step("*", "Refining draft report with new findings...")

    prompt = f"""Refine this draft report using the new research findings.

Research Brief:
{brief}

Current Draft:
{draft}

New Findings:
{findings}

Rules:
- Integrate verified facts from findings into the draft
- Add proper [Source: URL] citations
- Correct any claims contradicted by research
- Keep the overall structure
- Write in markdown with ## section headers

Return the complete updated draft."""

    response = llm.invoke([HumanMessage(content=prompt)])
    log.track_cost(response.response_metadata)
    log.success(f"Draft refined ({len(response.content)} chars)")
    return response.content


def supervisor_tools_node(state: DiffusionState) -> Command[Literal["supervisor", "final_report_generation"]]:
    """Execute supervisor's tool calls — research, refine, think, or complete."""
    import log

    supervisor_messages = list(state.get("supervisor_messages", []))
    iteration = state.get("research_iterations", 0)
    last_msg = supervisor_messages[-1]

    # ── Exit conditions ──
    exceeded = iteration >= MAX_SUPERVISOR_ITERATIONS
    no_tools = not last_msg.tool_calls
    research_complete = any(
        tc["name"] == "ResearchComplete" for tc in (last_msg.tool_calls or [])
    )

    if exceeded or no_tools or research_complete:
        if exceeded:
            log.success(f"Max iterations ({MAX_SUPERVISOR_ITERATIONS}) reached → finalizing")
        elif research_complete:
            log.success("Supervisor called ResearchComplete → finalizing")
        else:
            log.success("No more tool calls → finalizing")

        return Command(
            goto="final_report_generation",
            update={
                "notes": _get_notes_from_tool_calls(supervisor_messages),
                "research_brief": state.get("research_brief", ""),
            },
        )

    # ── Execute tool calls ──
    tool_messages: list[ToolMessage] = []
    all_raw_notes: list[str] = []
    new_draft = ""

    # Separate tool call types
    think_calls = [tc for tc in last_msg.tool_calls if tc["name"] == "think_tool"]
    research_calls = [tc for tc in last_msg.tool_calls if tc["name"] == "ConductResearch"]
    # refine is handled automatically after research

    # Handle think_tool calls
    for tc in think_calls:
        observation = think_tool.invoke(tc["args"])
        tool_messages.append(
            ToolMessage(content=observation, name=tc["name"], tool_call_id=tc["id"])
        )

    # Handle ConductResearch calls — run sub-agents
    if research_calls:
        log.step("*", f"Launching {len(research_calls)} research sub-agent(s)...")

        results = []
        for tc in research_calls:
            topic = tc["args"]["research_topic"]
            log.divider()
            log.step("*", f"Sub-agent: {topic[:70]}")

            result = research_agent.invoke({
                "researcher_messages": [HumanMessage(content=topic)],
                "research_topic": topic,
                "compressed_research": "",
                "raw_notes": [],
            })
            results.append(result)

        # Format results as tool messages (this is how supervisor gets the findings)
        for result, tc in zip(results, research_calls):
            compressed = result.get("compressed_research", "No findings.")
            tool_messages.append(
                ToolMessage(content=compressed, name=tc["name"], tool_call_id=tc["id"])
            )
            all_raw_notes.append("\n".join(result.get("raw_notes", [])))
            log.result("Research", compressed[:150])

        # After research, always refine the draft (matching reference behavior)
        log.divider()
        log.phase("Refine Draft (denoising step)")

        # Temporarily add research tool messages so _refine_draft can access them
        temp_state = dict(state)
        temp_state["supervisor_messages"] = list(supervisor_messages) + tool_messages
        new_draft = _refine_draft(temp_state)

    if new_draft:
        return Command(
            goto="supervisor",
            update={
                "supervisor_messages": tool_messages,
                "raw_notes": all_raw_notes,
                "draft_report": new_draft,
            },
        )
    else:
        return Command(
            goto="supervisor",
            update={
                "supervisor_messages": tool_messages,
                "raw_notes": all_raw_notes,
            },
        )


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 5: FINAL REPORT                                              ║
# ║                                                                      ║
# ║  Reference: research_agent_full.py → final_report_generation()       ║
# ║  Polish the refined draft into a professional final report.          ║
# ╚══════════════════════════════════════════════════════════════════════╝


FINAL_REPORT_PROMPT = """Based on the research conducted and draft report, create a comprehensive final report.

Research Brief:
{research_brief}

Draft Report:
{draft_report}

Research Findings:
{findings}

Today's date is {date}.

Create a detailed report that:
1. Has proper headings (## for sections)
2. Includes specific facts and insights from the research
3. References sources with [Source: URL] citations
4. Provides thorough analysis
5. Ends with a Sources section listing all URLs

Write in paragraph form, not bullet points. Be comprehensive."""


def final_report_generation(state: DiffusionState) -> dict:
    """Phase 5: Polish the refined draft into the final report."""
    import log

    notes = state.get("notes", [])
    findings = "\n".join(notes)
    draft = state.get("draft_report", "")
    brief = state.get("research_brief", "")

    log.phase("Phase 5: Final Report Generation")
    log.step("*", f"Polishing with {len(notes)} research notes...")

    prompt = FINAL_REPORT_PROMPT.format(
        research_brief=brief,
        draft_report=draft,
        findings=findings,
        date=get_today_str(),
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    log.track_cost(response.response_metadata)

    log.success(f"Final report: {len(response.content)} chars")
    return {"final_report": response.content}


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  GRAPH ASSEMBLY                                                      ║
# ║                                                                      ║
# ║  Reference pipeline:                                                 ║
# ║    clarify → brief → draft → supervisor ↔ tools → final report       ║
# ║  We skip clarify (demo doesn't need it, reference skips it too).     ║
# ╚══════════════════════════════════════════════════════════════════════╝

builder = StateGraph(DiffusionState)

builder.add_node("write_research_brief", write_research_brief)
builder.add_node("write_draft_report", write_draft_report)
builder.add_node("supervisor", supervisor)
builder.add_node("supervisor_tools", supervisor_tools_node)
builder.add_node("final_report_generation", final_report_generation)

builder.add_edge(START, "write_research_brief")
builder.add_edge("write_research_brief", "write_draft_report")
builder.add_edge("write_draft_report", "supervisor")
# supervisor ↔ supervisor_tools is handled by Command routing
builder.add_edge("final_report_generation", END)

graph = builder.compile()


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  ENTRY POINT HELPER                                                  ║
# ╚══════════════════════════════════════════════════════════════════════╝


def initial_state(query: str) -> DiffusionState:
    """Build the starting state for the Diffusion agent."""
    return {
        "query": query,
        "research_brief": "",
        "draft_report": "",
        "supervisor_messages": [],
        "notes": [],
        "raw_notes": [],
        "research_iterations": 0,
        "final_report": "",
    }
