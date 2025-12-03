# ThinkDeep Architecture

**ThinkDeep** = Self-Balancing Test-Time Diffusion Deep Research

This is how we write comprehensive research reports using iterative "diffusion-style" refinement.

---

## How It Works (30-second version)

```
User Query: "Compare AI safety approaches of OpenAI, Anthropic, and DeepMind"
                                    |
                                    v
+-----------------------------------------------------------------------------+
|  PHASE 1: BRIEF GENERATION                                                  |
|  "Transform query into detailed research brief"                             |
|                                                                             |
|  Input:  "Compare AI safety approaches..."                                  |
|  Output: Detailed research brief with specificity, dimensions, sources      |
+-----------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------+
|  PHASE 2: INITIAL DRAFT                                                     |
|  "Generate draft from model's existing knowledge"                           |
|                                                                             |
|  Creates structured outline - this is the "noisy" initial state             |
|  No web search yet - purely from training data                              |
+-----------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------+
|  PHASE 3: DIFFUSION LOOP  (the core innovation)                             |
|  "Iteratively denoise the draft through web research"                       |
|                                                                             |
|  Supervisor coordinates parallel sub-researchers:                           |
|                                                                             |
|     Iteration 1:                                                            |
|     +-----------+   +-----------+   +-----------+                           |
|     |Sub-Res #1 |   |Sub-Res #2 |   |Sub-Res #3 |  <- Parallel execution    |
|     |"OpenAI    |   |"Anthropic |   |"DeepMind  |                           |
|     | safety"   |   | approach" |   | research" |                           |
|     +-----------+   +-----------+   +-----------+                           | 
|            \             |             /                                    |
|             \            |            /                                     |
|              v           v           v                                      |
|          +----------------------------------+                               |
|          | refine_draft: Incorporate all   |                                |
|          | findings into draft report      |                                |
|          +----------------------------------+                               |
|                          |                                                  |
|                          v                                                  |
|     Iteration 2-N: Repeat until research_complete                           |
+-----------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------+
|  PHASE 4: FINAL REPORT                                                      |
|  "Full optimization with Insightfulness + Helpfulness rules"                |
|                                                                             |
|  - Deduplicate findings by URL                                              |
|  - Apply Insightfulness rules (granular breakdown, detailed tables)         |
|  - Apply Helpfulness rules (user intent, clarity, accuracy)                 |
|  - Generate polished report with proper citations                           |
+-----------------------------------------------------------------------------+
                                    |
                                    v
                            Final Research Report
```

---

## The Core Innovation: Diffusion Algorithm

Instead of a single pass, ThinkDeep treats the initial draft as a **"noisy" state** and iteratively **"denoises"** it through research.

### The Self-Balancing Principle

```
+------------------------------------------------------------------+
|                    INFORMATION GAP vs GENERATION GAP              |
|                                                                   |
|  Stage 1: Information Collection                                  |
|  +------------------------------------------------------------+   |
|  |  Focus: Close information gap (web search)                  |  |
|  |  Secondary: Minor draft refinement                          |  |
|  |                                                             |  |
|  |  conduct_research -> search -> think -> refine_draft        |  |
|  +------------------------------------------------------------+   |
|                              |                                    |
|                              v                                    |
|           "Information gap fully closed?"                         |
|                     |              |                              |
|                    No             Yes                             |
|                     |              |                              |
|                     v              v                              |
|              (loop back)    Stage 2: Final Generation             |
|                            +----------------------------------+   |
|                            |  Focus: Close generation gap     |   |
|                            |  Full optimization for quality   |   |
|                            +----------------------------------+   |
+------------------------------------------------------------------+
```

### One Diffusion Iteration

```
+-----------------------------------------------------------------------------+
|                         SINGLE DIFFUSION ITERATION                          |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  | SUPERVISOR (Lead Researcher)                                          |  |
|  |                                                                       |  |
|  | 1. Analyzes current draft: "What's missing? What gaps exist?"         |  |
|  |                                                                       |  |
|  | 2. Delegates research via conduct_research tool:                      |  |
|  |    <tool name="conduct_research">                                     |  |
|  |      {"research_topic": "OpenAI's constitutional AI approach..."}     |  |
|  |    </tool>                                                            |  |
|  |    <tool name="conduct_research">                                     |  |
|  |      {"research_topic": "Anthropic's interpretability work..."}       |  |
|  |    </tool>                                                            |  |
|  +-----------------------------------------------------------------------+  |
|                                    |                                        |
|                                    v                                        |
|  +-----------------------------------------------------------------------+  |
|  | SUB-RESEARCHERS (execute in parallel, max 3 concurrent)               |  |
|  |                                                                       |  |
|  | Each sub-researcher:                                                  |  |
|  | 1. search: "OpenAI constitutional AI safety"                          |  |
|  | 2. think: "Found info on RLHF, need more on..."                       |  |
|  | 3. search: "OpenAI RLHF training process"                             |  |
|  | 4. think: "Have 3+ sources, can answer comprehensively"               |  |
|  | 5. Return compressed findings with citations                          |  |
|  +-----------------------------------------------------------------------+  |
|                                    |                                        |
|                                    v                                        |
|  +-----------------------------------------------------------------------+  |
|  | SUPERVISOR                                                            |  |
|  |                                                                       |  |
|  | 3. Calls refine_draft to incorporate new findings:                    |  |
|  |    <tool name="refine_draft">{}</tool>                                |  |
|  |                                                                       |  |
|  | 4. Assesses: "Research complete?" -> research_complete or continue    |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+
```

### Completion Criteria

The supervisor calls `research_complete` when:
- Research findings are comprehensive (NOT when the draft "looks good")
- Diverse research questions no longer yield new findings
- Maximum iterations reached (hard limit: 15)

---

## Phase-by-Phase Breakdown

### Phase 1: Brief Generation

**Input:** User query
**Output:** Detailed research brief

```go
// Transforms vague queries into specific research briefs
// "Compare AI safety" becomes detailed multi-paragraph brief with:
// - Specific dimensions to cover
// - Sources to prioritize
// - Constraints acknowledged
```

**Key Guidelines:**
- Maximize specificity without inventing preferences
- Handle unstated dimensions as open considerations
- Distinguish research scope from user preferences

---

### Phase 2: Initial Draft Generation

**Input:** Research brief
**Output:** Structured draft report

```go
// Generated from model's training data only (no search)
// Creates the "noisy" initial state for diffusion
// Structured with headings, sections, citation placeholders
```

This draft serves as the starting point that gets iteratively refined.

---

### Phase 3: Diffusion Loop (Supervisor Coordination)

**Input:** Brief + Initial Draft
**Output:** Refined draft + Accumulated research notes

**Runs up to 15 iterations** with parallel sub-researchers.

```
                    +------------------------------------------+
                    |              SUPERVISOR                  |
                    |                                          |
    +---------------+------------------------------------------+---------------+
    |               |               |                          |               |
    v               v               v                          v               v
+--------+     +--------+     +--------+                  +--------+     +--------+
|conduct |     |conduct |     |conduct |      ...         | think  |     |refine  |
|research|     |research|     |research|                  |        |     |_draft  |
+--------+     +--------+     +--------+                  +--------+     +--------+
    |               |               |                                         |
    v               v               v                                         v
(parallel)     (parallel)     (parallel)                              (sequential)
```

**Scaling Rules:**
- Simple fact-finding: 1 sub-agent
- Comparisons: 1 sub-agent per element (e.g., 3 companies = 3 sub-agents)
- Maximum 3 concurrent sub-researchers

---

### Phase 4: Final Report Generation

**Input:** Brief + All notes + Final draft
**Output:** Polished research report

**Applies quality rules:**

```
+------------------------------------------------------------------+
|                      INSIGHTFULNESS RULES                         |
|                                                                   |
|  - Granular breakdown of topics with specific causes/impacts      |
|  - Detailed mapping tables for comparisons                        |
|  - Nuanced discussion with explicit exploration                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                       HELPFULNESS RULES                           |
|                                                                   |
|  - Satisfying user intent directly                                |
|  - Ease of understanding (fluent, coherent, logical)              |
|  - Accuracy of facts and reasoning                                |
|  - Appropriate professional language                              |
+------------------------------------------------------------------+
```

**Deduplication:** Removes notes with entirely redundant URLs before synthesis.

---

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| **Orchestrator** | `internal/orchestrator/think_deep.go` | 4-phase workflow coordination |
| **Supervisor Agent** | `internal/agents/supervisor.go` | Diffusion loop, parallel research |
| **Sub-Researcher Agent** | `internal/agents/sub_researcher.go` | Focused search with limits |
| **State Definitions** | `internal/think_deep/state.go` | SupervisorState, ResearcherState |
| **Prompts** | `internal/think_deep/prompts.go` | All prompt templates |
| **Tools** | `internal/think_deep/tools.go` | Tool parsing and execution |
| **Content Summarizer** | `internal/tools/summarizer.go` | LLM-based page summarization |
| **Search Tool** | `internal/tools/search.go` | Brave API with summarization |

---

## Available Tools

### Supervisor Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| `conduct_research` | Delegate to sub-researcher | `{"research_topic": "Detailed paragraph..."}` |
| `refine_draft` | Incorporate findings into draft | `{}` |
| `think` | Strategic reflection | `{"reflection": "..."}` |
| `research_complete` | Signal completion | `{}` |

### Sub-Researcher Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| `search` | Web search via Brave API | `{"query": "search terms"}` |
| `think` | Analyze results, plan next | `{"reflection": "..."}` |

---

## Configuration

```go
// Default configuration
ThinkDeepConfig{
    MaxSupervisorIterations: 15,  // Max diffusion iterations
    MaxSubResearcherIter:    5,   // Max searches per sub-researcher
    MaxConcurrentResearch:   3,   // Parallel sub-researchers
}
```

---

## Event Flow

Every step emits events for UI/logging:

```
EventResearchStarted
    |
    v
EventDiffusionStarted
    |
    v
EventAnalysisProgress ("brief")
    |
    v
EventAnalysisProgress ("draft")
    |
    +-> EventDiffusionIterationStart (per iteration)
    |       |
    |       +-> EventResearchDelegated (per sub-researcher)
    |       |       |
    |       |       v
    |       |   EventSubResearcherProgress ("searching", "complete")
    |       |
    |       v
    |   EventDraftRefined
    |
    v
EventDiffusionComplete
    |
    v
EventFinalReportStarted
    |
    v
EventFinalReportComplete
    |
    v
EventCostUpdated (final)
```

---

## Content Summarization

Search results include **full page summaries**, not just snippets:

```
--- SOURCE 1: OpenAI Safety Research ---
URL: https://openai.com/safety

SUMMARY:
OpenAI's approach to AI safety centers on alignment research...
[25-30% of original page, preserving key facts]

Key Excerpts:
- "Constitutional AI provides guardrails through..."
- "RLHF training optimizes for human preferences..."
```

**Top 3 URLs** are fetched and summarized; remaining results use snippets.

---

## Why This Works

1. **Iterative refinement catches gaps** - Each iteration identifies and fills missing information
2. **Parallel execution is efficient** - 3 sub-researchers gather diverse perspectives simultaneously
3. **Explicit completion criteria** - Research ends based on findings completeness, not draft appearance
4. **Self-balancing stages** - Information gathering before generation optimization
5. **Grounded in sources** - Every finding cites web search results
6. **URL deduplication** - Prevents redundant sources in final report

---

## Acknowledgments

This implementation is based on the **Self-Balancing Test-Time Diffusion Deep Research** algorithm from [ThinkDepth.ai](https://thinkdepth.ai).

Special thanks to **Paichun Lin** ([@paichunjimlin](https://www.linkedin.com/in/paichunjimlin), Stanford CS) for developing and open-sourcing this approach. ThinkDepth.ai achieved #1 ranking on [DeepResearch Bench](https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard) when it was released, outperforming Google Gemini 2.5 Pro, OpenAI Deep Research, and Anthropic Claude Deep Research.

For more technical details, see:
- [Self-Balancing Agentic AI Blog Post](https://paichunlin.substack.com/p/self-balancing-agentic-ai-test-time)
- [ThinkDepth.ai GitHub Repository](https://github.com/thinkdepthai/Deep_Research)

---

## References

- **[ThinkDepth.ai](https://thinkdepth.ai)** - Original implementation
- **[ThinkDepth.ai GitHub](https://github.com/thinkdepthai/Deep_Research)** - Reference Python implementation
- **[DeepResearch Bench](https://github.com/Ayanami0730/deep_research_bench)** - Evaluation benchmark
- **[Self-Balancing Agentic AI](https://paichunlin.substack.com/p/self-balancing-agentic-ai-test-time)** - Algorithm deep-dive
