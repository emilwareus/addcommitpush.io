"""
CLI entry point for Deep Research demo agents.

Usage:
    uv run main.py --agent=react "Who is the president of the United States?"
    uv run main.py --agent=storm "Who is the president of the United States?"
    uv run main.py --agent=diffusion "Who is the president of the United States?"

Each agent demonstrates a different approach to AI-powered research:
- react:     Classic Think-Act-Observe loop (ReAct, Yao et al. 2022)
- storm:     Multi-perspective research pipeline (STORM, Stanford 2024)
- diffusion: Iterative draft refinement (Diffusion Deep Research, Google 2025)
"""

import argparse
import re
import time
from pathlib import Path

from dotenv import load_dotenv

AGENT_LABELS = {
    "react": "ReAct Agent (Think-Act-Observe)",
    "storm": "STORM Agent (Multi-Perspective Research)",
    "diffusion": "Diffusion Agent (Iterative Refinement)",
}


def main() -> None:
    # Load .env from the demos directory (next to this file)
    load_dotenv(Path(__file__).parent / ".env")

    import log

    parser = argparse.ArgumentParser(
        description="Run Deep Research demo agents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--agent",
        choices=["react", "storm", "diffusion"],
        required=True,
        help="Which agent architecture to run",
    )
    parser.add_argument(
        "query",
        type=str,
        help="The research query to investigate",
    )
    args = parser.parse_args()

    # ── Import the selected agent's compiled graph ──────────────────────
    # Each module exposes a `graph` object (compiled LangGraph StateGraph)
    # and an `initial_state(query)` function to build the starting state.

    if args.agent == "react":
        from react_agent import graph, initial_state
    elif args.agent == "storm":
        from storm_agent import graph, initial_state
    else:
        from diffusion_agent import graph, initial_state

    # ── Stream execution ────────────────────────────────────────────────

    log.header(AGENT_LABELS[args.agent], args.query)

    state = initial_state(args.query)
    config = {"recursion_limit": 100}

    start = time.time()

    # stream_mode="values" yields the full state after each node completes.
    # The last yielded value IS the final state.
    final_state = state
    for update in graph.stream(state, config=config, stream_mode="values"):
        final_state = update

    elapsed = time.time() - start

    # ── Print the final result ──────────────────────────────────────────

    log.final_report_header()

    if args.agent == "react":
        last_msg = final_state["messages"][-1]
        print(last_msg.content)
    else:
        print(final_state.get("final_report", "No report generated."))

    # ── Extract source count per agent type ───────────────────────────
    sources: set[str] = set()

    if args.agent == "react":
        # Extract URLs from ToolMessage content (search results)
        from langchain_core.messages import ToolMessage
        for msg in final_state.get("messages", []):
            if isinstance(msg, ToolMessage):
                sources.update(re.findall(r'https?://[^\s"\'\]>]+', msg.content))

    elif args.agent == "storm":
        # STORM tracks collected_urls explicitly
        for url in final_state.get("collected_urls", []):
            sources.add(url)

    elif args.agent == "diffusion":
        # Extract [Source: URL] citations from notes and final report
        for note in final_state.get("notes", []):
            sources.update(re.findall(r'https?://[^\s"\'\]>]+', note))
        report = final_state.get("final_report", "")
        sources.update(re.findall(r'https?://[^\s"\'\]>]+', report))

    total_cost, total_calls = log.get_total_cost()
    print(
        f"\n{log.DIM}Completed in {elapsed:.1f}s | Total LLM cost: ${total_cost:.4f}"
        f" | LLM calls: {total_calls} | Sources: {len(sources)}{log.RESET}\n"
    )


if __name__ == "__main__":
    main()
