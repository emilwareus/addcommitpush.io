# Deep Research Demo Agents

Three self-contained LangGraph agent implementations for live demo purposes.
Each demonstrates a different approach to AI-powered research.

## Setup

```bash
cd presentations/deep-research/demos

# Install dependencies
uv sync

# Add your API keys to .env
cp .env.example .env
# Edit .env with your keys
```

### Required environment variables

| Variable | Source |
|----------|--------|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `TAVILY_API_KEY` | [app.tavily.com](https://app.tavily.com/) |

## Usage

```bash
uv run main.py --agent=<react|storm|diffusion> "your query"
```

### ReAct — Think-Act-Observe loop

The foundational agent pattern (Yao et al., 2022). The LLM reasons about what to do,
calls a search tool, observes the result, and repeats until it has an answer.

```bash
uv run main.py --agent=react "Who is the president of the United States?"
uv run main.py --agent=react "What is the latest version of Python?"
```

**Speed:** Fast (~10s). Best for simple factual queries.

**Graph:**
```
START -> agent -> [tool calls?] -> tools -> agent (loop)
                  [no calls]   -> END
```

### STORM — Multi-perspective research

Stanford's 4-phase pipeline (2024). Generates multiple expert perspectives,
runs parallel interviews with web search, creates an outline, and writes a report.

```bash
uv run main.py --agent=storm "The impact of large language models on software engineering"
uv run main.py --agent=storm "Comparison of React, Vue, and Svelte in 2026"
```

**Speed:** Medium (~60-90s). Runs 3 parallel expert interviews.

**Graph:**
```
START -> discover_perspectives -> conduct_interview (x3 parallel)
      -> generate_outline -> write_report -> END
```

### Diffusion — Iterative draft refinement

Google's iterative approach (2025). Starts with a "noisy" draft from LLM knowledge,
then repeatedly identifies gaps, researches them in parallel, and refines the draft.

```bash
uv run main.py --agent=diffusion "How do modern CPUs handle branch prediction?"
uv run main.py --agent=diffusion "The state of quantum computing in 2026"
```

**Speed:** Slower (~2-3 min). Runs up to 3 refinement iterations.

**Graph:**
```
START -> generate_brief -> generate_noisy_draft -> identify_gaps
      -> research_sub_agent (xN parallel) -> refine_draft
      -> [comprehensive?] -> identify_gaps (loop)
      -> [done]           -> generate_report -> END
```

## Architecture overview

| Agent | Paper | Key idea | LangGraph features used |
|-------|-------|----------|------------------------|
| ReAct | Yao et al. 2022 | Think-Act-Observe loop | Conditional edges, ToolNode |
| STORM | Stanford 2024 | Multi-perspective interviews | `Send()` fan-out, subgraphs, structured output |
| Diffusion | Google 2025 | Iterative noise-to-signal refinement | `Send()` fan-out, `operator.add` reducers, loop control |

## Model

All agents use `google/gemini-3-flash-preview` via OpenRouter. To change the model,
edit the `ChatOpenAI(model=...)` line in each agent file.

## File structure

```
demos/
  .env              # API keys (git-ignored)
  pyproject.toml    # uv project config
  main.py           # CLI entry point
  react_agent.py    # ReAct implementation
  storm_agent.py    # STORM implementation
  diffusion_agent.py # Diffusion implementation
```

Each agent file is self-contained with heavy comments explaining the architecture.
