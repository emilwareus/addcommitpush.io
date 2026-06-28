# dr

`dr` is a Rust deep-research CLI intended for agents such as Claude Code and Codex. It is designed to be called as a specialist subagent: the parent agent asks `dr` to research a topic, and `dr` writes a cited Markdown report that can be read back into the parent agent's context.

```bash
cargo run -- research "compare current deep research agent architectures" --env-file ../go-research/.env
```

## Install

From the repository root:

```bash
make build-dr
make install-dr
dr --help
```

`make install-dr` runs `cargo install --path dr --locked --force` and installs the
`dr` command into Cargo's bin directory, usually `~/.cargo/bin`. Make sure that
directory is on `PATH` for Claude Code, Codex, and other agents that should call
the CLI.

The binary name is `dr`, so after installing:

```bash
dr research "what should an agent know before migrating a Next.js app to v16?" --env-file ../go-research/.env
```

## Configuration

Required environment variables:

- `OPENROUTER_API_KEY`
- `BRAVE_API_KEY`

Use `--env-file` to point at an existing file such as `../go-research/.env`. Reports are written under `research-reports/` unless `--output` is supplied.

Brave free plans are rate-limited, so `dr` defaults to `--search-concurrency 1` and `--search-delay-ms 1100`. Paid plans or internal search gateways can raise concurrency and set the delay to `0`.

`dr` uses a 300-second per-request timeout by default because deep-research model
calls can spend several minutes planning, writing, or verifying. Override it with
`--timeout-seconds` when needed.

## Progress Output

Research progress is written to stderr as compact stage updates:

```text
dr: [01/11] planning research brief
dr: [02/11] searching Brave (12 queries, 7 results/query)
dr:        search 3/12: Joern code property graph data flow analysis static analysis engine
dr: [05/11] extracting evidence from 17 admitted sources
dr: [11/11] done
```

The final report path is still printed to stdout, so agents can call `dr` and
capture stdout without mixing it with progress logs.

For agent orchestration patterns, including structured domain research with many
parallel or staged reports and a separate INSIGHTS synthesis pass, see
`.agents/skills/dr-deep-research/SKILL.md` from the repository root.

## Defaults

- Planner model: `z-ai/glm-5.2`
- Evidence worker model: `deepseek/deepseek-v4-flash`
- Writer model: `z-ai/glm-5.2`
- Strategy: `deep-agent-v1`
- Effort: `standard`

Effort levels tune fan-out, reading depth, source-admission strictness, recursive evidence passes, claim audit size, and final evaluation budget:

- `light`: quick research with a small source set
- `standard`: default breadth for agent workflows, including one follow-up gap pass
- `deep`: broader search, more page text, and more recursive gap filling
- `max`: largest built-in source, reading, iteration, and verification budget

## Mid-2026 Design Position

`dr` is intentionally not a single-pass RAG wrapper, a legacy ReAct loop, or a "search once, summarize once" script. Those patterns are too brittle for modern deep-research tasks because they under-plan, under-explore, and often blend retrieved evidence with model prior knowledge. The final report target is a scientific short paper: abstract, research question, method, conceptual background, findings, design implications, limitations, open questions, next experiments, compact evidence tables, and source-auditable claims.

For this project, "state-of-the-art-ish for mid-2026" means: explicit research brief generation, perspective query fan-out, full-page source reading, source admission, source-grounded intermediate evidence, iterative gap analysis, citation-backed synthesis, citation-association verification, verifier-driven refinement, final rubric scoring, report traceability, configurable model/search providers, and a path toward hierarchical/context-isolated strategies. It does not mean cloning every frontier lab feature into v1.

The current design follows the mid-2026 deep-research consensus: build a research brief, develop subquestions/searches/perspectives, explore the web with enough fan-out, read source pages, admit or reject sources, extract source-grounded evidence, evaluate whether gaps remain, iterate when useful, then synthesize, verify, refine, and score a citation-backed report. That maps directly to the four-stage pipeline described in the autonomous deep-research survey: planning, question development, web exploration, and report generation, with newer benchmark pressure on recall, analysis, presentation, citation accuracy, citation association, and traceability.

This is still deliberately small: no browser controller, no recursive subagent swarm, no private-document connectors, no code sandbox, and no ensemble yet. The point is to implement one strong public-web research loop well, with a verifier-driven refiner and clean seams for later strategies.

## Strategy: `deep-agent-v1`

`deep-agent-v1` is the default strategy. It is a compact version of the planner/researcher/evaluator/writer pattern used by stronger open systems, constrained to Brave Search plus the two OpenRouter models named above.

1. Create a research brief with assumptions, subquestions, perspectives, source requirements, success criteria, and search queries.
2. Add dedicated coverage queries for explicitly named comparison targets when the planner compresses multiple targets into one query. For static-analysis/data-flow topics, add targeted tool, benchmark, and ML queries such as CodeQL, FlowDroid, Semgrep, DFA-GNN, and DroidBench/Juliet-style benchmark coverage.
3. Search Brave for each query with extra snippets; searches are scheduled to respect rate limits and can run concurrently when configured.
4. Dedupe and cap sources, reserving part of the source budget for evidence-gap follow-up searches instead of spending everything in the first sweep.
5. Fetch each source page and extract readable text; fetches run concurrently.
6. Ask the worker model to score source relevance, authority, freshness, and independence; unreadable or weak sources are rejected before synthesis.
7. Chunk admitted source pages and ask the worker model for source-grounded evidence notes.
8. Ask the planner/evaluator model whether the evidence has gaps.
9. Search follow-up queries and repeat source admission/evidence extraction until the effort budget is exhausted or the evaluator marks the evidence sufficient.
10. Ask the writer model to synthesize a cited report.
11. Validate that every report citation uses a known admitted `[S#]` source marker.
12. Extract material report claims and ask the worker model to verify both claim support and citation-source association, using evidence notes plus compact source excerpts.
13. If verification rejects a claim or citation association, ask the writer model to refine the report and verify the revised report again. If unsupported claims remain after the refinement budget, run a final claim-pruning edit that deletes unsupported declarative claims rather than saving weak prose.
14. Repair malformed model JSON once for structured planning/evidence/verification/evaluation stages, then validate the repaired object strictly.
15. Ask the worker model to score the final report on coverage, citation quality, factuality, analysis depth, presentation, and overall quality.
16. Save the final Markdown report with source register, source-quality trace, evidence notes, claim audit, and final evaluation.

`recursive-gap-v1` remains available as a compatible recursive strategy name. `source-mesh-v1` is still available for smaller one-pass runs. It uses the same page reading, source admission, evidence extraction, report writing, citation validation, claim verification, and final evaluation, but skips the recursive gap loop.

The strategy interface is intentionally separate from the OpenRouter and Brave clients, so future strategies can reuse the same integrations.

## Design Decisions

### 1. Use a staged research pipeline, not old single-pass RAG

**Decision:** `dr` separates research brief generation, search, page reading, source admission, evidence extraction, gap analysis, report writing, citation validation, claim/citation verification, refinement, and final rubric scoring.

**Why:** Recent deep-research literature distinguishes deep research from plain RAG. RAG retrieves documents and conditions one generation on them; deep research actively plans, asks/develops questions, explores, evaluates coverage, and synthesizes grounded reports. The survey literature explicitly frames deep research as planning + question development + web exploration + report generation, while current open systems such as NVIDIA AI-Q and Open Deep Research use planner/researcher/orchestrator or graph-style workflows rather than one prompt over search results.

**References:**

- Deep Research survey: <https://arxiv.org/html/2508.12752v1>
- Deep Research Agents roadmap: <https://arxiv.org/abs/2506.18096>
- NVIDIA AI-Q Blueprint: <https://github.com/NVIDIA-AI-Blueprints/aiq>
- Open Deep Research: <https://github.com/langchain-ai/open_deep_research>

### 2. Use high fan-out source discovery before writing

**Decision:** Effort levels (`light`, `standard`, `deep`, `max`) tune search breadth, result count, source cap, readable text per source, recursive gap passes, claim audit size, and token budgets.

**Why:** Modern benchmarks and definitions treat deep research as a high-search-intensity and reasoning-intensive task, not merely a long-form answer. Fan-out is therefore a first-class knob. Small agent calls can use `light`; serious research can use `deep` or `max`.

**References:**

- LiveDRBench / deep research task characterization: <https://arxiv.org/html/2508.04183v1>
- Deep Research Bench: <https://futuresearch.ai/deep-research-bench/>
- DeepResearch Bench II: <https://agentresearchlab.com/benchmarks/deepresearch-bench-ii/>
- LiveResearchBench: <https://openreview.net/forum?id=ghwbZ3uhEd>

### 3. Admit sources, then extract evidence before synthesis

**Decision:** `dr` fetches readable page text for Brave hits, asks the worker model to score source quality, admits only useful sources, chunks the admitted source set, and asks the worker model to produce structured evidence notes before the writer model sees the source register.

**Why:** Search-o1 argues for a separate document-reasoning step so verbose retrieved material is analyzed before it is injected into the reasoning chain. Snippets are useful for discovery but are not enough for a serious report, and low-quality sources are actively harmful. `dr` therefore uses Brave for discovery, fetches page text for grounding, rejects weak sources, extracts source-grounded notes, then synthesizes. This reduces the chance that the final writer invents unsupported claims from model memory or SEO summaries.

**References:**

- Search-o1: <https://arxiv.org/abs/2501.05366>
- OpenRouter structured outputs: <https://openrouter.ai/docs/guides/features/structured-outputs>

### 4. Validate citations and verify claims

**Decision:** A report is rejected if it does not cite known admitted `[S#]` source IDs. After writing, `dr` extracts material claims and asks a worker-model verifier to check that each claim is supported by the evidence trace and that each citation points to a source that actually supports that claim. Unsupported claims or bad citation associations trigger verifier-driven refinement; unresolved declarative claims are pruned before final validation rather than being saved.

**Why:** Current deep-research evaluation focuses heavily on citation accuracy, citation association, traceability, factuality, coverage, analysis, and presentation. Mechanical citation validation catches unknown sources deterministically; the claim verifier adds a second-pass factuality and citation-association check, and the refiner turns verification failures into report repair instead of blindly saving weak claims.

**References:**

- DRBench factuality/report-quality axes: <https://arxiv.org/html/2510.00172v2>
- LiveResearchBench citation-grounded report evaluation: <https://openreview.net/forum?id=ghwbZ3uhEd>
- DeepResearch Bench II rubric dimensions: <https://agentresearchlab.com/benchmarks/deepresearch-bench-ii/>

### 5. Use Brave Search as the explicit retrieval layer

**Decision:** `dr` uses Brave Web Search directly instead of relying on a model provider's hidden web-search mode.

**Why:** Parent agents need reproducible artifacts. A visible search layer gives `dr` explicit query strings, result counts, source URLs, snippets, deduping, and trace output. Brave's `extra_snippets` help ranking and early grounding, and the document reader then fetches the page text used for evidence extraction.

**References:**

- Brave Web Search API: <https://api-dashboard.search.brave.com/api-reference/web/search/get>

### 6. Split model roles by cost and capability

**Decision:** Defaults are:

- Planner: `z-ai/glm-5.2`
- Evidence worker: `deepseek/deepseek-v4-flash`
- Writer: `z-ai/glm-5.2`

**Why:** Planning and final synthesis benefit from a long-context reasoning model suited to long-horizon agent workflows. Evidence extraction is repetitive, structured, and cost-sensitive, so it uses a cheaper high-throughput model with a 1M-token context window. This keeps the design capable without making every step pay for the strongest model.

**References:**

- GLM 5.2 on OpenRouter: <https://openrouter.ai/z-ai/glm-5.2>
- DeepSeek V4 Flash on OpenRouter: <https://openrouter.ai/deepseek/deepseek-v4-flash>
- OpenRouter chat completions: <https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request>

### 7. Keep strategy pluggability, but make deep-agent orchestration the default

**Decision:** `ResearchStrategy` is a trait. The default is `deep-agent-v1`; `recursive-gap-v1` remains as a compatible recursive strategy name and `source-mesh-v1` remains as a smaller one-pass strategy.

**Why:** Mid-2026 systems increasingly use configurable model/search/tool backends and, in larger systems, hierarchical or context-isolated subagents. The current default uses the same controller pattern inside one process because fixed one-pass research is no longer enough. The trait boundary keeps room for future multi-agent perspective research, browser exploration, MCP/local-document connectors, code sandboxes, ensembles, or STORM-like interview loops without changing the CLI contract.

**References:**

- Open Deep Research configurability across model providers, search tools, and MCP servers: <https://github.com/langchain-ai/open_deep_research>
- LangChain deep agents: planning, focused subagents, result assessment, cited synthesis: <https://docs.langchain.com/oss/python/deepagents/deep-research>
- NVIDIA AI-Q multi-agent blueprint and benchmark harnesses: <https://github.com/NVIDIA-AI-Blueprints/aiq>
- DeerFlow super-agent harness: <https://github.com/bytedance/deer-flow>
- Skywork DeepResearchAgent hierarchical planning: <https://github.com/SkyworkAI/DeepResearchAgent>

### 8. Preserve an audit trail in Markdown

**Decision:** Every output includes frontmatter, the final report, a source register, subquestions, perspectives, search queries, source quality scores, evidence notes, claim-verification verdicts, and final evaluation scores.

**Why:** `dr` is built for other agents. A parent agent needs more than prose; it needs enough trace to decide whether to trust, extend, or rerun the research. The Markdown file is also durable, diffable, and easy to feed back into Claude Code, Codex, Obsidian, or a repository.

**References:**

- STORM's separation of pre-writing research/outline work from final writing: <https://storm-project.stanford.edu/research/storm/>
- DRBench report quality and grounded insight evaluation: <https://arxiv.org/html/2510.00172v2>

## Deliberate Non-Goals For v1

- No hidden fallback model or search provider. If Brave or OpenRouter fails, fix the integration or configuration.
- No browser automation yet. API retrieval is faster, cheaper, and easier to trace for the first strategy; browser exploration can become a later strategy.
- No heavyweight multi-agent swarm yet. `deep-agent-v1` is one orchestrated pipeline, not an ensemble of isolated subagents.
- No code sandbox yet. AI-Q and DeerFlow show why sandboxes matter, but this crate is currently a public-web research CLI.
- No private-document research yet. Enterprise/local data connectors are a clear future direction, but not part of this Brave-only first implementation.

## Research Basis

The architecture is grounded in current deep-research work and provider docs:

- STORM separates pre-writing research and outline construction from final article writing: <https://storm-project.stanford.edu/research/storm/>
- Search-o1 uses agentic retrieval plus a separate document reasoning module before injecting evidence into reasoning: <https://arxiv.org/abs/2501.05366>
- Deep research surveys describe the planning, question development, web exploration, and report generation pipeline: <https://arxiv.org/html/2508.12752v1>
- LiveDRBench frames deep research around high fan-out source exploration and claim synthesis, not merely long reports: <https://arxiv.org/html/2508.04183v1>
- DRBench evaluates realistic multi-step research on insight recall, factuality, and report quality: <https://arxiv.org/html/2510.00172v2>
- LiveResearchBench emphasizes dynamic, real-time web search and citation-grounded report evaluation: <https://openreview.net/forum?id=ghwbZ3uhEd>
- DeepResearch Bench II evaluates information recall, analysis, and presentation with fine-grained rubrics: <https://agentresearchlab.com/benchmarks/deepresearch-bench-ii/>
- FutureSearch Deep Research Bench tracks web-research agents on stable web snapshots and curated answers: <https://futuresearch.ai/deep-research-bench/>
- NVIDIA AI-Q is the strongest open blueprint reference found in this pass: it uses planner/researcher/orchestrator architecture, optional ensembles/refiners, and benchmark harnesses: <https://github.com/NVIDIA-AI-Blueprints/aiq>
- NVIDIA's AI-Q benchmark write-up reports first place on DeepResearch Bench and DeepResearch Bench II as of March 12, 2026: <https://huggingface.co/blog/nvidia/how-nvidia-won-deepresearch-bench>
- Open Deep Research demonstrates current open-source direction: configurable models, search tools, and MCP servers, with public Deep Research Bench positioning: <https://github.com/langchain-ai/open_deep_research>
- LangChain deep agents document the current plan/delegate/assess/synthesize pattern: <https://docs.langchain.com/oss/python/deepagents/deep-research>
- DeerFlow is a broader open super-agent harness using subagents, tools, skills, memory, and sandboxes: <https://github.com/bytedance/deer-flow>

Provider docs:

- Brave Search API: <https://api-dashboard.search.brave.com/api-reference/web/search/get>
- OpenRouter chat completions: <https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request>
- OpenRouter structured outputs: <https://openrouter.ai/docs/guides/features/structured-outputs>
- GLM 5.2 model page: <https://openrouter.ai/z-ai/glm-5.2>
- DeepSeek V4 Flash model page: <https://openrouter.ai/deepseek/deepseek-v4-flash>

## Development

```bash
cargo fmt
cargo test
cargo clippy --all-targets --all-features --locked -- -D warnings
```
