"""
Unit tests for Deep Research demo agents.

Tests graph structure, state handling, and routing logic WITHOUT making
real LLM/search API calls. Each agent's compiled graph is tested for:
- Correct node wiring (edges)
- State initialization
- Routing/conditional edge logic
"""

import operator
from typing import Annotated
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from typing_extensions import TypedDict


# ── Helpers ──────────────────────────────────────────────────────────────

# Set dummy env vars before importing agents (they create LLM at import time)
import os

os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("TAVILY_API_KEY", "test-key")


# ═══════════════════════════════════════════════════════════════════════════
#  ReAct Agent Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestReActAgent:
    """Tests for the ReAct (Think-Act-Observe) agent."""

    def test_graph_has_expected_nodes(self):
        from react_agent import graph

        node_names = set(graph.nodes.keys())
        # LangGraph adds __start__ and __end__ pseudo-nodes
        assert "agent" in node_names
        assert "tools" in node_names

    def test_initial_state_has_human_message(self):
        from react_agent import initial_state

        state = initial_state("test query")
        assert len(state["messages"]) == 1
        assert isinstance(state["messages"][0], HumanMessage)
        assert state["messages"][0].content == "test query"

    def test_should_continue_routes_to_tools_on_tool_calls(self):
        from react_agent import should_continue

        # Create a mock AI message WITH tool calls
        msg = AIMessage(content="", tool_calls=[{"id": "1", "name": "search", "args": {"query": "test"}}])
        state = {"messages": [msg]}

        result = should_continue(state)
        assert result == "tools"

    def test_should_continue_routes_to_end_on_no_tool_calls(self):
        from react_agent import should_continue

        # Create a mock AI message WITHOUT tool calls
        msg = AIMessage(content="Here is the answer.")
        state = {"messages": [msg]}

        result = should_continue(state)
        assert result == "__end__"

    def test_graph_compiles(self):
        """The graph should compile without errors."""
        from react_agent import graph

        assert graph is not None
        # Should be invocable (has invoke method)
        assert hasattr(graph, "invoke")
        assert hasattr(graph, "stream")


# ═══════════════════════════════════════════════════════════════════════════
#  STORM Agent Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestSTORMAgent:
    """Tests for the STORM (Multi-Perspective Research) agent."""

    def test_graph_has_expected_nodes(self):
        from storm_agent import graph

        node_names = set(graph.nodes.keys())
        assert "discover_perspectives" in node_names
        assert "conduct_interview" in node_names
        assert "generate_outline" in node_names
        assert "write_report" in node_names

    def test_initial_state_structure(self):
        from storm_agent import initial_state

        state = initial_state("test topic")
        assert state["topic"] == "test topic"
        assert state["analysts"] == []
        assert state["interview_results"] == []
        assert state["outline"] == ""
        assert state["final_report"] == ""

    def test_interview_subgraph_has_expected_nodes(self):
        from storm_agent import interview_graph

        node_names = set(interview_graph.nodes.keys())
        assert "ask_question" in node_names
        assert "answer_question" in node_names
        assert "compile_interview" in node_names

    def test_should_continue_interview_respects_max_turns(self):
        from storm_agent import should_continue_interview

        # 3 turns = 6 messages (Q&A pairs)
        messages = [
            HumanMessage(content="q1", name="WikiWriter"),
            AIMessage(content="a1", name="TopicExpert"),
            HumanMessage(content="q2", name="WikiWriter"),
            AIMessage(content="a2", name="TopicExpert"),
            HumanMessage(content="q3", name="WikiWriter"),
            AIMessage(content="a3", name="TopicExpert"),
        ]
        state = {"messages": messages, "max_turns": 3}

        result = should_continue_interview(state)
        assert result == "compile_interview"

    def test_should_continue_interview_continues_when_turns_remain(self):
        from storm_agent import should_continue_interview

        messages = [
            HumanMessage(content="q1", name="WikiWriter"),
            AIMessage(content="a1", name="TopicExpert"),
        ]
        state = {"messages": messages, "max_turns": 3}

        result = should_continue_interview(state)
        assert result == "answer_question"

    def test_should_continue_interview_stops_on_complete_signal(self):
        from storm_agent import should_continue_interview

        messages = [
            HumanMessage(content="INTERVIEW_COMPLETE", name="WikiWriter"),
        ]
        state = {"messages": messages, "max_turns": 5}

        result = should_continue_interview(state)
        assert result == "compile_interview"

    def test_initiate_interviews_creates_sends(self):
        from storm_agent import initiate_interviews
        from langgraph.types import Send

        state = {
            "topic": "AI safety",
            "analysts": [
                {"name": "Alice", "role": "Engineer", "focus": "technical", "description": "..."},
                {"name": "Bob", "role": "Ethicist", "focus": "ethics", "description": "..."},
            ],
            "interview_results": [],
            "outline": "",
            "final_report": "",
        }

        sends = initiate_interviews(state)
        assert len(sends) == 2
        assert all(isinstance(s, Send) for s in sends)

    def test_analyst_pydantic_model(self):
        from storm_agent import Analyst

        analyst = Analyst(
            name="Test",
            role="Engineer",
            focus="technical details",
            description="A test analyst",
        )
        assert analyst.name == "Test"
        dumped = analyst.model_dump()
        assert "name" in dumped
        assert "role" in dumped

    def test_graph_compiles(self):
        from storm_agent import graph

        assert graph is not None
        assert hasattr(graph, "invoke")
        assert hasattr(graph, "stream")


# ═══════════════════════════════════════════════════════════════════════════
#  Diffusion Agent Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestDiffusionAgent:
    """Tests for the Diffusion (Iterative Refinement) agent."""

    def test_graph_has_expected_nodes(self):
        from diffusion_agent import graph

        node_names = set(graph.nodes.keys())
        assert "generate_brief" in node_names
        assert "generate_noisy_draft" in node_names
        assert "identify_gaps" in node_names
        assert "research_sub_agent" in node_names
        assert "refine_draft" in node_names
        assert "generate_report" in node_names

    def test_initial_state_structure(self):
        from diffusion_agent import initial_state

        state = initial_state("test query")
        assert state["query"] == "test query"
        assert state["research_brief"] == ""
        assert state["current_draft"] == ""
        assert state["iteration"] == 0
        assert state["max_iterations"] == 3
        assert state["research_findings"] == []
        assert state["sources"] == []
        assert state["research_questions"] == []
        assert state["final_report"] == ""

    def test_should_continue_stops_at_max_iterations(self):
        from diffusion_agent import should_continue

        state = {
            "query": "test",
            "current_draft": "Some draft content.",
            "iteration": 3,
            "max_iterations": 3,
        }

        result = should_continue(state)
        assert result == "generate_report"

    def test_dispatch_research_creates_sends(self):
        from diffusion_agent import dispatch_research
        from langgraph.types import Send

        state = {
            "query": "AI safety",
            "research_questions": ["What is alignment?", "What are risks?"],
            "research_brief": "",
            "current_draft": "",
            "iteration": 0,
            "max_iterations": 3,
            "research_findings": [],
            "sources": [],
            "final_report": "",
        }

        sends = dispatch_research(state)
        assert len(sends) == 2
        assert all(isinstance(s, Send) for s in sends)

    def test_state_iteration_uses_operator_add(self):
        """Verify that iteration field uses operator.add annotation."""
        from diffusion_agent import DiffusionState

        annotations = DiffusionState.__annotations__
        # Check that iteration is Annotated with operator.add
        import typing
        hint = typing.get_type_hints(DiffusionState, include_extras=True)
        iter_hint = hint["iteration"]
        # Annotated types have __metadata__
        assert hasattr(iter_hint, "__metadata__")
        assert operator.add in iter_hint.__metadata__

    def test_state_research_findings_uses_operator_add(self):
        """Verify that research_findings uses operator.add for safe parallel merging."""
        from diffusion_agent import DiffusionState

        import typing
        hint = typing.get_type_hints(DiffusionState, include_extras=True)
        findings_hint = hint["research_findings"]
        assert hasattr(findings_hint, "__metadata__")
        assert operator.add in findings_hint.__metadata__

    def test_graph_compiles(self):
        from diffusion_agent import graph

        assert graph is not None
        assert hasattr(graph, "invoke")
        assert hasattr(graph, "stream")


# ═══════════════════════════════════════════════════════════════════════════
#  Log Module Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestLogModule:
    """Tests for the shared logging helpers."""

    def test_cost_tracking_accumulates(self):
        import log

        log.reset_cost()

        log.track_cost({"token_usage": {"prompt_tokens": 100, "completion_tokens": 50, "cost": 0.001}})
        log.track_cost({"token_usage": {"prompt_tokens": 200, "completion_tokens": 100, "cost": 0.002}})

        total_cost, total_calls = log.get_total_cost()
        assert total_calls == 2
        assert abs(total_cost - 0.003) < 1e-9

    def test_cost_tracking_reset(self):
        import log

        log.track_cost({"token_usage": {"cost": 0.005}})
        log.reset_cost()

        total_cost, total_calls = log.get_total_cost()
        assert total_cost == 0.0
        assert total_calls == 0

    def test_cost_tracking_handles_missing_fields(self):
        import log

        log.reset_cost()
        # Empty metadata should not crash
        log.track_cost({})
        log.track_cost({"token_usage": {}})
        log.track_cost({"token_usage": None})

        total_cost, total_calls = log.get_total_cost()
        assert total_calls == 3
        assert total_cost == 0.0


# ═══════════════════════════════════════════════════════════════════════════
#  Integration Tests (require real API keys)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.skipif(
    os.environ.get("OPENROUTER_API_KEY", "test-key") == "test-key",
    reason="Requires real OPENROUTER_API_KEY",
)
class TestCostTrackingIntegration:
    """Integration tests that make real LLM calls to verify cost tracking."""

    def test_response_metadata_structure(self):
        """Dump response_metadata to discover where OpenRouter puts cost info."""
        import json

        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage

        llm = ChatOpenAI(
            model="openai/gpt-oss-120b",
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
            temperature=0,
            extra_body={"provider": {"order": ["Groq"]}},
        )

        response = llm.invoke([HumanMessage(content="Say hi in one word.")])

        metadata = response.response_metadata
        print("\n=== Full response_metadata ===")
        print(json.dumps(metadata, indent=2, default=str))

        if hasattr(response, "usage_metadata") and response.usage_metadata:
            print("\n=== usage_metadata ===")
            um = response.usage_metadata
            print(json.dumps(
                um if isinstance(um, dict) else (vars(um) if hasattr(um, "__dict__") else str(um)),
                indent=2,
                default=str,
            ))

        # This test always passes — it's for inspection
        assert response.content  # got a response

    def test_react_agent_tracks_cost(self):
        """Run a real ReAct call and verify cost > 0."""
        import log

        log.reset_cost()

        from react_agent import graph, initial_state

        state = initial_state("What is 2+2? Answer in one word.")
        config = {"recursion_limit": 10}

        final_state = state
        for update in graph.stream(state, config=config, stream_mode="values"):
            final_state = update

        total_cost, total_calls = log.get_total_cost()
        print(f"\nTotal cost: ${total_cost:.6f}, calls: {total_calls}")
        assert total_calls > 0, "Expected at least one LLM call"
        assert total_cost > 0.0, f"Expected cost > 0, got ${total_cost:.6f}"
