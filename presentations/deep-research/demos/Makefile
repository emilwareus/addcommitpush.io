# Deep Research Demo Agents - Makefile
# =====================================
#
# Visualization targets for LangGraph graphs
#
# Usage:
#   make graph-react      # ASCII visualization of ReAct agent
#   make graph-storm      # ASCII visualization of STORM agent
#   make graph-diffusion  # ASCII visualization of Diffusion agent
#   make graph-all        # All three graphs
#
#   make mermaid-react    # Mermaid diagram (for docs/markdown)
#   make mermaid-storm
#   make mermaid-diffusion
#   make mermaid-all
#
#   make png-react        # PNG image (saves to graphs/)
#   make png-storm
#   make png-diffusion
#   make png-all

.PHONY: graph-react graph-storm graph-diffusion graph-all
.PHONY: mermaid-react mermaid-storm mermaid-diffusion mermaid-all
.PHONY: png-react png-storm png-diffusion png-all

# ── ASCII Graph Visualization ──────────────────────────────────────────

graph-react:
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║  ReAct Agent Graph                                          ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from react_agent import graph; graph.get_graph().print_ascii()"

graph-storm:
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║  STORM Agent Graph                                          ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from storm_agent import graph; graph.get_graph().print_ascii()"

graph-diffusion:
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║  Diffusion Agent Graph                                      ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from diffusion_agent import graph; graph.get_graph().print_ascii()"

graph-all: graph-react graph-storm graph-diffusion

# ── Mermaid Diagram Output ─────────────────────────────────────────────

mermaid-react:
	@echo "## ReAct Agent Graph"
	@echo '```mermaid'
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from react_agent import graph; print(graph.get_graph().draw_mermaid())"
	@echo '```'

mermaid-storm:
	@echo "## STORM Agent Graph"
	@echo '```mermaid'
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from storm_agent import graph; print(graph.get_graph().draw_mermaid())"
	@echo '```'

mermaid-diffusion:
	@echo "## Diffusion Agent Graph"
	@echo '```mermaid'
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from diffusion_agent import graph; print(graph.get_graph().draw_mermaid())"
	@echo '```'

mermaid-all: mermaid-react mermaid-storm mermaid-diffusion

# ── PNG Image Output ───────────────────────────────────────────────────

GRAPHS_DIR := graphs

png-react:
	@mkdir -p $(GRAPHS_DIR)
	@echo "Generating $(GRAPHS_DIR)/react-graph.png..."
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from react_agent import graph; open('$(GRAPHS_DIR)/react-graph.png', 'wb').write(graph.get_graph().draw_mermaid_png())"
	@echo "✓ Saved to $(GRAPHS_DIR)/react-graph.png"

png-storm:
	@mkdir -p $(GRAPHS_DIR)
	@echo "Generating $(GRAPHS_DIR)/storm-graph.png..."
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from storm_agent import graph; open('$(GRAPHS_DIR)/storm-graph.png', 'wb').write(graph.get_graph().draw_mermaid_png())"
	@echo "✓ Saved to $(GRAPHS_DIR)/storm-graph.png"

png-diffusion:
	@mkdir -p $(GRAPHS_DIR)
	@echo "Generating $(GRAPHS_DIR)/diffusion-graph.png..."
	@uv run python -c "from dotenv import load_dotenv; load_dotenv(); from diffusion_agent import graph; open('$(GRAPHS_DIR)/diffusion-graph.png', 'wb').write(graph.get_graph().draw_mermaid_png())"
	@echo "✓ Saved to $(GRAPHS_DIR)/diffusion-graph.png"

png-all: png-react png-storm png-diffusion
	@echo "✓ All graphs saved to $(GRAPHS_DIR)/"

# ── Run Agents ─────────────────────────────────────────────────────────

run-react:
	@uv run python main.py --agent=react "$(QUERY)"

run-storm:
	@uv run python main.py --agent=storm "$(QUERY)"

run-diffusion:
	@uv run python main.py --agent=diffusion "$(QUERY)"

# ── Help ───────────────────────────────────────────────────────────────

help:
	@echo "Deep Research Demo Agents"
	@echo "========================="
	@echo ""
	@echo "Graph Visualization (ASCII):"
	@echo "  make graph-react      ASCII visualization of ReAct agent"
	@echo "  make graph-storm      ASCII visualization of STORM agent"
	@echo "  make graph-diffusion  ASCII visualization of Diffusion agent"
	@echo "  make graph-all        All three graphs"
	@echo ""
	@echo "Mermaid Diagrams (for docs):"
	@echo "  make mermaid-react    Mermaid diagram of ReAct agent"
	@echo "  make mermaid-storm    Mermaid diagram of STORM agent"
	@echo "  make mermaid-diffusion Mermaid diagram of Diffusion agent"
	@echo "  make mermaid-all      All three diagrams"
	@echo ""
	@echo "PNG Images (saved to graphs/):"
	@echo "  make png-react        PNG image of ReAct agent"
	@echo "  make png-storm        PNG image of STORM agent"
	@echo "  make png-diffusion    PNG image of Diffusion agent"
	@echo "  make png-all          All three PNGs"
	@echo ""
	@echo "Run Agents:"
	@echo "  make run-react QUERY=\"your question\""
	@echo "  make run-storm QUERY=\"your question\""
	@echo "  make run-diffusion QUERY=\"your question\""
