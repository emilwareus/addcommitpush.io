"""
ReAct Agent — Think-Act-Observe loop (Yao et al., 2022)
========================================================

This is the foundational pattern behind every modern research agent.
The LLM reasons about what to do (Think), calls a tool (Act), observes the
result (Observe), and repeats until it can produce a final answer.

Graph structure:
    START → agent → [has tool calls?] → tools → agent  (loop)
                    [no tool calls?]  → END

Key concepts demonstrated:
- Chain-of-Thought (CoT) reasoning via system prompt
- Tool binding: attaching tool schemas to the LLM so it can request calls
- The Think→Act→Observe cycle as a while-loop in graph form
- Why this pattern is the foundation for STORM and Diffusion agents
"""

import os
from typing import Annotated

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  LLM CONFIGURATION                                                  ║
# ║                                                                      ║
# ║  We use OpenRouter as a unified gateway to different LLM providers.  ║
# ║  Provider routing sends requests to Groq for fastest inference.      ║
# ╚══════════════════════════════════════════════════════════════════════╝

llm = ChatOpenAI(
    model="openai/gpt-oss-120b",
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    temperature=0,
    extra_body={"provider": {"order": ["Groq"]}},
)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  TOOLS                                                               ║
# ║                                                                      ║
# ║  Tavily is a search API built specifically for AI agents.            ║
# ║  Unlike raw Google search, it returns clean extracted content        ║
# ║  rather than HTML snippets — much better for LLM consumption.       ║
# ╚══════════════════════════════════════════════════════════════════════╝

search_tool = TavilySearch(max_results=3)
tools = [search_tool]

# Bind tools to the LLM. This tells the LLM what tools are available
# and their parameter schemas. The LLM can then output structured
# "tool call" messages requesting specific tool invocations.
llm_with_tools = llm.bind_tools(tools)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  STATE DEFINITION                                                    ║
# ║                                                                      ║
# ║  LangGraph uses typed state that flows between nodes. Each node      ║
# ║  returns a partial state update that gets merged into the full       ║
# ║  state.                                                              ║
# ║                                                                      ║
# ║  The `add_messages` annotation means message lists are APPENDED,     ║
# ║  not overwritten. This preserves the full conversation history.      ║
# ╚══════════════════════════════════════════════════════════════════════╝


class ReActState(TypedDict):
    messages: Annotated[list, add_messages]


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SYSTEM PROMPT                                                       ║
# ║                                                                      ║
# ║  This prompt instructs the LLM to follow the ReAct pattern:         ║
# ║  1. THINK about what information is needed                           ║
# ║  2. ACT by calling a search tool                                     ║
# ║  3. OBSERVE the results and decide next steps                        ║
# ║  4. Repeat until confident, then give a final answer                 ║
# ╚══════════════════════════════════════════════════════════════════════╝

SYSTEM_PROMPT = """You are a research assistant that follows the ReAct pattern:

1. THINK: Reason about what information you need
2. ACT: Use the search tool to find that information
3. OBSERVE: Analyze what you found
4. REPEAT or ANSWER: Either search for more, or give your final answer

Always think step-by-step. When you have enough information, provide a
clear, well-sourced answer. Cite your sources."""


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  GRAPH NODES                                                         ║
# ║                                                                      ║
# ║  A "node" is a Python function that receives state and returns a     ║
# ║  partial state update. Nodes are the building blocks of the graph.   ║
# ╚══════════════════════════════════════════════════════════════════════╝


def agent(state: ReActState) -> dict:
    """
    The 'Think' step. The LLM sees the full conversation history and
    either:
      (a) Generates a tool call → routes to 'tools' node (Act step)
      (b) Generates a text response → routes to END (final answer)

    This is where Chain-of-Thought reasoning happens. The LLM's internal
    reasoning determines whether more information is needed.
    """
    import log

    turn = len([m for m in state["messages"] if hasattr(m, "tool_calls") and m.tool_calls])
    log.step("*", f"THINK  (loop {turn + 1})")
    log.detail("Sending conversation to LLM...")

    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    with log.timed("LLM call"):
        response = llm_with_tools.invoke(messages)

    log.track_cost(response.response_metadata)

    if response.tool_calls:
        for tc in response.tool_calls:
            query = tc.get("args", {}).get("query", str(tc.get("args", "")))
            log.thinking(f"Decided to search: \"{query}\"")
    else:
        log.success("Generated final answer")
        log.detail(f"{len(response.content)} chars")

    return {"messages": [response]}


# The ToolNode is a built-in LangGraph component that:
# 1. Reads tool_calls from the last AI message
# 2. Executes each requested tool
# 3. Returns ToolMessage(s) with the results
# This is the 'Act' step — executing the tool the LLM requested.
tool_node = ToolNode(tools)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  ROUTING LOGIC                                                       ║
# ║                                                                      ║
# ║  The router decides whether to loop back (more research needed)      ║
# ║  or finish (answer is ready). This is the key control flow that      ║
# ║  makes ReAct a loop rather than a single pass.                       ║
# ╚══════════════════════════════════════════════════════════════════════╝


def should_continue(state: ReActState) -> str:
    """
    Check if the LLM wants to call more tools.

    If the last message has tool_calls → route to 'tools' (continue loop)
    If the last message is plain text → route to END (answer is ready)

    This is what makes ReAct iterative: the LLM can do multiple rounds
    of search before committing to a final answer.
    """
    import log

    last_message = state["messages"][-1]
    if last_message.tool_calls:
        log.step(">", "ACT    Executing tool calls...")
        return "tools"
    log.step("=", "ANSWER Ready — routing to END")
    return END


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  GRAPH ASSEMBLY                                                      ║
# ║                                                                      ║
# ║  We wire the nodes together into a directed graph.                   ║
# ║  The conditional edge from 'agent' creates the loop.                 ║
# ║                                                                      ║
# ║  Visual:                                                             ║
# ║    START → agent ──[tool calls]──→ tools ──→ agent (loop back)      ║
# ║                  └─[no calls]───→ END                                ║
# ╚══════════════════════════════════════════════════════════════════════╝

builder = StateGraph(ReActState)

# Add nodes
builder.add_node("agent", agent)
builder.add_node("tools", tool_node)

# Wire the graph
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", should_continue, ["tools", END])
builder.add_edge("tools", "agent")  # After tool execution, go back to agent

# Compile into a runnable graph
graph = builder.compile()


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  ENTRY POINT HELPER                                                  ║
# ║                                                                      ║
# ║  Creates the initial state from a user query.                        ║
# ║  Used by main.py to standardize how all agents are invoked.          ║
# ╚══════════════════════════════════════════════════════════════════════╝


def initial_state(query: str) -> ReActState:
    """Build the starting state for the ReAct agent."""
    from langchain_core.messages import HumanMessage
    return {"messages": [HumanMessage(content=query)]}
