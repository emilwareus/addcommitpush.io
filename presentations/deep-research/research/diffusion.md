# Diffusion Deep Research Architecture

## Self-Balancing Test-Time Diffusion for Research Agents

---

## Overview

Diffusion Deep Research treats research report generation as an iterative refinement process, analogous to how diffusion models generate images. Instead of a linear pipeline, the system starts with a "noisy" draft and progressively "denoises" it through research iterations.

**Origin:** Google DeepMind (July 2025)
**Paper:** arXiv:2507.16075
**Blog:** https://research.google/blog/deep-researcher-with-test-time-diffusion/

---

## The Core Insight

### Traditional Pipeline Problem

```
Query → Search → Synthesize → Report
```

**Limitations:**
1. **Information Loss:** Late discoveries can't influence early decisions
2. **No Self-Correction:** Errors propagate to final output
3. **Static Search Strategy:** Can't adapt based on findings
4. **Coherence Degradation:** Long reports lose consistency

### Diffusion Solution

```
Query → Brief → Draft → [Research → Refine] × N → Report
```

The iterative nature mirrors how humans actually conduct research—cycles of searching, reasoning, and revision.

---

## Diffusion Analogy

### Classical Diffusion Models (Images)

**Forward Diffusion:** Add noise to data
```
x₀ → x₁ → x₂ → ... → xₜ (pure noise)
```

**Reverse Diffusion:** Learn to denoise
```
xₜ → xₜ₋₁ → ... → x₁ → x₀ (clean data)
```

### Research Diffusion

| Classical Diffusion | Research Diffusion |
|--------------------|--------------------|
| Random noise (xₜ) | Initial draft from model knowledge |
| Denoising step | Research iteration + draft refinement |
| Guidance signal | Retrieved information from web search |
| Clean output (x₀) | Comprehensive, accurate research report |

**Key Insight:** The initial draft generated purely from LLM training data represents the "noisy" starting state. Each iteration of identifying gaps, searching, and incorporating findings acts as a denoising step.

---

## The Four Phases

### Phase 1: Research Brief Generation

Transform user query into detailed research brief with:
- Core research question
- Key sub-questions to explore
- Expected deliverables and scope
- Success criteria

**Purpose:** Ensures all downstream research is grounded in explicit requirements.

### Phase 2: Initial Draft Generation

Generate a draft from the LLM's **internal knowledge only**—no external information retrieval.

**Characteristics:**
- May contain outdated information (training data cutoff)
- Gaps marked with "[NEEDS RESEARCH]" placeholders
- Uncertain claims that need verification
- Incomplete sections that need expansion

**This is intentional—the "noise" that will be "denoised" through research.**

### Phase 3: Diffusion Loop (Supervisor Subgraph)

The core innovation. Each iteration follows four steps:

1. **Generate Research Questions:** Identify gaps in the draft
2. **Conduct Research:** Retrieve external info for "denoising" (parallel sub-agents)
3. **Refine Draft:** Remove "noise" (imprecision, incompleteness)
4. **Assess:** Are findings comprehensive? (NOT draft appearance!)

**Termination Criteria (priority order):**
1. Gap-closed: Diverse queries yield no new findings
2. Iteration cap: Hard stop at 15 supervisor iterations
3. Supervisor override: Allowed only with rationale tied to evidence coverage

### Phase 4: Final Report Generation

Apply quality optimization:
- **Insightfulness Rules:** Granular breakdowns, detailed mapping tables, nuanced discussion
- **Helpfulness Rules:** Proper citations, markdown formatting, clear structure
- Deduplicate findings by URL
- Generate final deliverable

---

## Supervisor-SubAgent Architecture

### Supervisor Agent

The supervisor orchestrates the diffusion loop:
- Analyzes current draft state
- Identifies knowledge gaps
- Delegates research to sub-agents (parallel)
- Integrates findings back into draft
- Decides when research is complete

**Tools available:**
- `conduct_research` - Spawn parallel sub-agents
- `refine_draft` - Update draft with new findings
- `think` - Internal reflection
- `research_complete` - Signal completion

### Sub-Agent Architecture

Each sub-researcher is a complete agent with its own tool loop:

**Context:** Receives only the topic (no visibility into other agents' work)

**Tools available:**
- `search` - Web search via Brave API
- `fetch` - Fetch and summarize a specific URL
- `read_document` - Read PDF, DOCX, XLSX files
- `analyze_csv` - Statistical analysis of CSV data
- `think` - Internal reflection

**Iteration budget:** Max 5 search calls per sub-agent

**Output:** Compressed research findings with citations

---

## Parallel Execution Pattern

When the supervisor receives multiple `conduct_research` calls:

1. Extract topics from tool calls
2. Spawn goroutines (one per topic)
3. Each sub-agent runs independently with isolated context
4. Wait for all to complete (parallel fan-out)
5. Aggregate results into supervisor state

**Maximum concurrent:** 3 sub-agents (configurable)

**Key principle:** Sub-agents cannot see each other's work, preventing cross-contamination and context pollution.

---

## Context Engineering

### The Context Problems

| Problem | Description | Solution |
|---------|-------------|----------|
| Context Poisoning | Hallucinations enter context | Draft as verified state |
| Context Distraction | Too much context | Parallel isolated agents |
| Context Confusion | Superfluous context | Structured compression |
| Context Clash | Disagreeing context | Supervisor resolution |

### Draft as Context Anchor

The draft serves as **persistent, verified context** that:
- **Evolves incrementally:** Each `refine_draft` call is validated
- **Structures information:** Prevents disorganized accumulation
- **Guides research:** Makes gaps explicit
- **Maintains coherence:** Narrative thread across iterations

### Multi-Agent Context Isolation

Sub-researchers operate with **isolated contexts**:
- Cannot see each other's work
- Prevents topic A's findings from biasing topic B
- Keeps context from growing unboundedly
- Avoids confusion from interleaved results

---

## Two-Stage Gap Closing

### Stage 1: Information Gap (Diffusion Loop)

**Focus:** What information exists, not how to present it

**Characteristics:**
- Draft updates are functional, not polished
- Prioritizes breadth of coverage
- Uses global-context OR section-specific queries based on gap analysis
- Completion based on findings, not appearance

### Stage 2: Generation Gap (Final Report)

**Focus:** Presentation, coherence, and user satisfaction

**Characteristics:**
- All information is available
- Applies full Insightfulness + Helpfulness rules
- Generates final deliverable with proper citations
- Polishes for readability

> "There is a trade-off between the two gaps. We cannot optimize the generation gap too early when the system is still optimizing the information gap because the generation gap tends to bring more verbose and stylistic content that can distract from finding missing information."
> — Paichun Lin, ThinkDepth.ai

---

## Implementation Details

### From the Python Reference (ThinkDepth.ai)

**Location:** `/go-research/external_code/Deep_Research/`

**Key files:**
- `multi_agent_supervisor.py` - Supervisor coordination
- `research_agent.py` - Sub-researcher agent
- `prompts.py` - All system prompts
- `state_multi_agent_supervisor.py` - State management

**Supervisor tools:**
```python
supervisor_tools = [ConductResearch, ResearchComplete, think_tool, refine_draft_report]
```

**Iteration limits:**
```python
max_researcher_iterations = 15  # Supervisor iterations
max_concurrent_researchers = 3  # Parallel sub-agents
```

### From the Go Implementation

**Location:** `/go-research/internal/architectures/think_deep/`

**Key components:**
- `loop.go` - Main AgentLoop orchestrating all phases
- `supervisor.go` - Supervisor agent with tool execution
- `sub_researcher.go` - Sub-agent implementation
- `prompts.go` - All system prompts

---

## Key Prompts

### Diffusion Algorithm Prompt (Supervisor)

```
<Diffusion Algorithm>
1. generate the next research questions to address gaps in the draft report
2. **conduct_research**: retrieve external information to provide concrete delta for denoising
3. **refine_draft**: remove "noise" (imprecision, incompleteness) from the draft report
4. **research_complete**: complete research only based on conduct_research tool's findings'
   completeness. it should not be based on the draft report.
</Diffusion Algorithm>
```

### Compression Prompt (Sub-Agent → Supervisor)

```
<Tool Call Filtering>
**IMPORTANT**: Focus only on substantive research content:
- **Include**: All search results and findings from web searches
- **Exclude**: think tool calls and responses - these are internal agent reflections
- **Focus on**: Actual information gathered from external sources
</Tool Call Filtering>

<Guidelines>
1. Output findings should be fully comprehensive and include ALL information verbatim
2. Include inline citations for each source
3. Include a "Sources" section at the end with all sources
Critical: Any information even remotely relevant must be preserved verbatim
</Guidelines>
```

---

## Benchmark Performance

### RACE Framework (Report Quality)

- **Comprehensiveness:** Coverage breadth and depth
- **Insight/Depth:** Quality, originality, logic of analysis
- **Instruction Following:** Adherence to task requirements
- **Readability:** Clarity, fluency, structure

### FACT Framework (Citation Quality)

- **Citation Accuracy:** % correctly supported
- **Effective Citations:** Average verified per task

### Results

**Google TTD-DR Performance:**
- 74.5% win rate vs. OpenAI Deep Research
- Outperforms by 7.7% on one dataset, 1.7% on another

### Why Diffusion Wins

1. **Iterative refinement catches gaps → Higher Comprehensiveness**
2. **Parallel execution is efficient → Better Coverage**
3. **Explicit completion criteria → Validated Comprehensiveness**
4. **Self-balancing adaptivity → Right-Sized Research**
5. **Draft as context anchor → Higher Readability**
6. **Quality rules in final generation → Higher Insight**

---

## Practical Takeaways

1. **Start with a draft** - Reveals gaps faster than blank page
2. **Deduplicate by URL before synthesis** - Keeps signal high
3. **Completion is about evidence coverage, not aesthetics**
4. **Cap iterations and concurrency** - 15 loops, 3 agents max
5. **Separate information gap from generation gap**
6. **Isolate sub-agent contexts** - Complete standalone instructions
7. **Compress findings, preserve everything** - Never summarize

---

## Guardrails

- Require citations for new facts (drop uncited claims)
- Retry failed tool calls once, then mark as gap
- Deduplicate by URL before synthesis
- Completion based on evidence coverage, not draft polish

---

## Sources

- Google Research Blog: https://research.google/blog/deep-researcher-with-test-time-diffusion/
- Paper: https://arxiv.org/html/2507.16075v1
- ThinkDepth.ai Implementation: https://github.com/thinkdepthai/Deep_Research
- Paichun Lin's Analysis: https://paichunlin.substack.com/p/self-balancing-agentic-ai-test-time
- DeepResearch Bench: https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard
- My Blog Post: https://addcommitpush.io/blog/diffusion-deep-research
- Go Implementation: /go-research/internal/architectures/think_deep/
