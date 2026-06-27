# Deep Research Agents - Architecture Walkthrough

## Slide Deck with Speaker Notes

**Event:** Foo Cafe Malmö | February 5th, 2026
**Speaker:** Emil Wåreus
**Total Duration:** ~60-70 minutes (including demos and Q&A)

---

## SLIDE 1: Title + Hook

**Duration:** 2 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│         [Cover image: /public/posts/diffusion-deep-research/        │
│                       cover-optimized.webp]                         │
│                                                                     │
│                    DEEP RESEARCH AGENTS                             │
│                  Architecture Walkthrough                           │
│                                                                     │
│                        Emil Wåreus                                  │
│                   Foo Cafe Malmö | Feb 5, 2026                      │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│   🎓 Remember group projects where everyone wrote in isolation?     │
│      Then you "glued it together" 3 hours before deadline?          │
│                                                                     │
│      Result: Repetitive, inconsistent, different quality...         │
│                                                                     │
│      This is exactly how most AI research agents work today.        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"Welcome everyone! Quick show of hands:

- Who's used ChatGPT or Claude for research? [most hands]
- Who's noticed it getting repetitive or inconsistent in long outputs? [many hands]

That problem? It's the same as those school group projects where everyone wrote their section alone, then you 'glued it together' at the last minute.

Today I'll show you how we fixed this - and yes, it involves the same math that powers image AI like DALL-E."

---

## SLIDE 2: Timeline - The Evolution

**Duration:** 5 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  The Evolution of Research Agents (2022-2025)                       │
│                                                                     │
│  2022 ════════════════════════════════════════════════════════════  │
│  │ Chain-of-Thought (Google) → "Show your work"                    │
│  │ ReAct (Google) → Reasoning + Acting together                    │
│  │                                                                  │
│  2023 ════════════════════════════════════════════════════════════  │
│  │ GPT Researcher → First popular open-source agent                │
│  │                                                                  │
│  2024 ════════════════════════════════════════════════════════════  │
│  │ STORM (Stanford) ⭐ → Multi-perspective conversations           │
│  │                                                                  │
│  2025 ════════════════════════════════════════════════════════════  │
│  │ OpenAI Deep Research → Commercial benchmark                     │
│  │ Perplexity Deep Research → Test-time compute                    │
│  │ Google TTD-DR ⭐ → Diffusion approach (74.5% win rate!)         │
│  │                                                                  │
│  ══════════════════════════════════════════════════════════════════ │
│                                                                     │
│  Pattern: Single calls → Agents → Multi-agent → Iterative          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"Quick history - this field moves FAST.

2022: Google showed LLMs can 'think' step-by-step (Chain-of-Thought) and combine reasoning with tools (ReAct). Birth of agents.

2023: GPT Researcher made it accessible - open source, anyone could run it.

2024: Stanford's STORM simulated expert conversations from multiple perspectives. We'll demo this.

2025: The commercial wave hit. OpenAI, Perplexity launched products. But Google did something different - they treated research like image generation.

That diffusion approach? 74.5% win rate against OpenAI. We'll demo that too.

The pattern: we went from single LLM calls, to agents, to multi-agent, to iterative refinement. More self-correction = better results."

---

## SLIDE 3: STORM Architecture

**Duration:** 4 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  STORM: Multi-Perspective Research (Stanford, 2024)                 │
│                                                                     │
│  "What if we simulated expert conversations about a topic?"         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  1. DISCOVER → Search related topics → 3 expert personas      │  │
│  │               + 1 default "Basic fact writer"                 │  │
│  │                                                               │  │
│  │  2. INTERVIEW → Parallel: WikiWriter ↔ TopicExpert (×3 turns)│  │
│  │       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│  │       │ Fact Writer  │ │ AI Ethics   │ │ Startup PM  │ (||)   │  │
│  │       │ ↔ Expert     │ │ ↔ Expert    │ │ ↔ Expert    │        │  │
│  │       └─────────────┘ └─────────────┘ └─────────────┘        │  │
│  │       TopicExpert: QuestionToQuery → Search → AnswerQuestion  │  │
│  │       with [1],[2],[3] inline citations                       │  │
│  │                                                               │  │
│  │  3. OUTLINE → Draft (LLM knowledge) → Refine (+ conv data)  │  │
│  │                                                               │  │
│  │  4. WRITE → Per-section article writing with citations        │  │
│  │                                                               │  │
│  │  5. LEAD → Lead section written AFTER body → Assemble         │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Linear pipeline — each phase runs exactly once. No backtracking.  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"STORM's insight: Wikipedia articles are comprehensive because they synthesize MULTIPLE expert viewpoints.

Five phases:

1. DISCOVER - Search for related content, generate expert personas. Always includes a 'Basic fact writer' for broad coverage.
2. INTERVIEW - For each persona, a WikiWriter asks questions and a TopicExpert answers with web-searched citations [1],[2]. The TopicExpert first generates search queries, then searches, then synthesizes. All conversations run in PARALLEL.
3. OUTLINE - Two-stage: draft from LLM knowledge first, then refine with conversation data. Prevents the outline from being biased by whichever expert found the most.
4. WRITE - Each top-level section is written independently with inline citations.
5. LEAD - Lead section written AFTER the body so it reflects actual content. Then assembled with references.

Important: this pipeline runs ONCE. No iteration, no backtracking. We'll come back to that.

Let me show you..."

---

## SLIDE 4: STORM Demo

**Duration:** 6 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                      🖥️ LIVE DEMO: STORM                           │
│                                                                     │
│  Terminal: Python + LangGraph                                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ $ uv run main.py --agent=storm "I am giving a               │  │
│  │   presentation at Foo Café in Malmö about deep research     │  │
│  │   AI agents..."                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Watch for:                                                         │
│  ✓ Perspective generation (1 default + 3 generated)               │
│  ✓ Parallel interviews (WikiWriter ↔ TopicExpert, 3 turns each)  │
│  ✓ TopicExpert: QuestionToQuery → Search → AnswerQuestion [1],[2]│
│  ✓ Two-stage outline (draft → refine with conv data)              │
│  ✓ Per-section article writing with citations                     │
│  ✓ Lead section + assembly → final Wikipedia-style article        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

[Run the demo, narrate as it goes]
Expected: ~75s, ~$0.05, ~48 LLM calls, 60+ sources

"Watch — first it discovers perspectives. 'Basic fact writer' is always there, plus 3 generated experts like 'AI Ethics Scholar' or 'Community Organizer.'

Now the interviews start IN PARALLEL — see multiple WikiWriter/TopicExpert conversations running at once. The TopicExpert generates search queries, searches, then answers with [1],[2] citations.

After 3 turns each, it compiles the interviews, builds a two-stage outline, then writes each section independently.

And finally the lead section, written AFTER the body. Here's the final Wikipedia-style article — diverse coverage, all with citations."

---

## SLIDE 5: The Problem with Linear Pipelines

**Duration:** 2 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  The Problem: Most Agents Are Still Linear                         │
│                                                                     │
│  ┌────────┐    ┌─────────────────────────┐    ┌────────────────┐   │
│  │  PLAN  │───►│    PARALLEL RESEARCH    │───►│  SYNTHESIZE    │   │
│  └────────┘    │   A     B     C         │    └────────────────┘   │
│                └─────────────────────────┘                          │
│                     │     │     │                                   │
│                     ▼     ▼     ▼                                   │
│               Can't see each other!                                 │
│               Can't update the plan!                                │
│               One pass - no self-correction!                        │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  ❌ Late discoveries can't influence early decisions               │
│  ❌ Sub-agents work in isolation (group project problem!)          │
│  ❌ No iteration - you hope it works first try                     │
│                                                                     │
│  What if the report could EVOLVE?                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"STORM is great, but it still has the group project problem.

The sub-agents can't see each other's work. If agent B discovers something that should change the plan, too late.

You run it once and hope for the best. No iteration, no self-correction.

What if the report could EVOLVE? What if we could iterate and refine?"

---

## SLIDE 6: Diffusion Deep Research - The Insight

**Duration:** 3 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Diffusion: Research as Iterative Refinement                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ IMAGE DIFFUSION (DALL-E, Midjourney)                        │   │
│  │                                                              │   │
│  │ [Noise] ──► [Less Noise] ──► [Shape] ──► [Clean Image]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↕ Same idea!                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ RESEARCH DIFFUSION                                          │   │
│  │                                                              │   │
│  │ [Rough Draft] ──► [+Research] ──► [Refine] ──► [Report]     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────┬────────────────────────────────────┐   │
│  │ Image Diffusion        │ Research Diffusion                 │   │
│  ├────────────────────────┼────────────────────────────────────┤   │
│  │ Random noise           │ Initial draft (LLM knowledge)      │   │
│  │ Denoising step         │ Research iteration + refinement    │   │
│  │ Guidance signal        │ Retrieved web information          │   │
│  │ Clean image            │ Comprehensive report               │   │
│  └────────────────────────┴────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"Here's Google's breakthrough.

In image diffusion, you start with random noise and iteratively 'denoise' until you get a clean image.

What if research worked the same way?

Start with a ROUGH DRAFT from the model's internal knowledge - that's your 'noise'. It might have outdated info, gaps, uncertainties.

Then iteratively: find gaps, research, refine. Each iteration 'denoises' the draft.

The key insight: the initial draft IS the noise. We refine it away through iteration."

---

## SLIDE 7: Diffusion Architecture

**Duration:** 4 minutes

### Visual

[Use: diffusion-overview component screenshot]

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Diffusion Deep Research: Four Phases                               │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 1. BRIEF │ Transform query → research brief                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 2. DRAFT │ Generate from LLM knowledge ONLY (the "noise") │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 3. LOOP  │ Supervisor with tool-calling (max 8 iters):     │    │
│  │          │   → ConductResearch: spawn ReAct sub-agents     │    │
│  │   ⭐     │   → Sub-agents search + compress findings       │    │
│  │          │   → Refine draft with evidence (denoising step) │    │
│  │          │   → ResearchComplete when findings sufficient   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 4. FINAL │ Apply quality rules, polish, deduplicate        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ⚠️ CRITICAL: Loop stops when EVIDENCE is complete,                │
│               NOT when the draft looks polished!                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"Four phases:

1. BRIEF - Transform query into detailed research objectives

2. DRAFT - Generate from LLM knowledge ONLY, higher temperature. No searching yet! This is intentionally speculative — our 'noise'.

3. LOOP - This is the magic. A SUPERVISOR LLM with tool-calling decides what to do:
   - Calls ConductResearch to spawn ReAct sub-agents (up to 3 parallel)
   - Each sub-agent runs its own search + think loop, then compresses findings
   - Draft is refined with the evidence after each batch — this IS the denoising step
   - Supervisor calls ResearchComplete when it judges findings are comprehensive
   - Max 8 iterations to cap costs

4. FINAL - Once evidence is gathered, polish into a professional report with citations.

[EMPHASIS] The critical insight: the supervisor checks FINDINGS completeness, not draft appearance. A polished draft can hide missing info. Stop when queries yield no new facts."

---

## SLIDE 8: Parallel Sub-Agents

**Duration:** 2 minutes

### Visual

[Use: parallel-agents component screenshot]

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Parallel Research with Isolated Contexts                          │
│                                                                     │
│                      ┌─────────────────┐                           │
│                      │   SUPERVISOR    │                           │
│                      │ Identifies gaps │                           │
│                      └────────┬────────┘                           │
│                               │                                     │
│              ┌────────────────┼────────────────┐                   │
│              ▼                ▼                ▼                    │
│       ┌───────────┐    ┌───────────┐    ┌───────────┐             │
│       │ Sub-Agent │    │ Sub-Agent │    │ Sub-Agent │             │
│       │  Topic A  │    │  Topic B  │    │  Topic C  │             │
│       │           │    │           │    │           │             │
│       │ 🔒 Isolated│   │ 🔒 Isolated│   │ 🔒 Isolated│            │
│       └─────┬─────┘    └─────┬─────┘    └─────┬─────┘             │
│             └────────────────┼────────────────┘                    │
│                              ▼                                      │
│                      ┌─────────────────┐                           │
│                      │   SUPERVISOR    │                           │
│                      │ Merges findings │                           │
│                      │ Refines draft   │                           │
│                      └─────────────────┘                           │
│                                                                     │
│  Isolation is intentional: prevents cross-contamination            │
│  Each agent needs complete, standalone instructions                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"When the supervisor calls ConductResearch, it spawns up to 3 ReAct sub-agents in parallel.

Each sub-agent runs its own Think-Act-Observe loop — the same ReAct pattern we saw earlier. They search the web, reflect on what they found, search again, until they have enough.

Then the critical step: findings are COMPRESSED before returning to the supervisor. Raw conversation has tool calls, search results, reflections — too noisy for the supervisor. Compression preserves all facts and source URLs but removes the noise.

The isolation is intentional — prevents cross-contamination. Independent perspectives.

After all sub-agents return, the draft is automatically refined with the new evidence. That's the denoising step."

---

## SLIDE 9: Diffusion Demo

**Duration:** 7 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                   🖥️ LIVE DEMO: DIFFUSION                          │
│                                                                     │
│  Terminal: Python + LangGraph                                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ $ uv run main.py --agent=diffusion "I am giving a           │  │
│  │   presentation at Foo Café in Malmö about deep research     │  │
│  │   AI agents..."                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Watch for:                                                         │
│  ✓ Noisy draft (from LLM knowledge only, temp=0.7)               │
│  ✓ Supervisor tool calls (ConductResearch, think_tool)           │
│  ✓ ReAct sub-agents searching + compressing                      │
│  ✓ Draft refinement after each research batch                    │
│  ✓ Supervisor iteration count (max 8)                            │
│  ✓ ResearchComplete → final polished report                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

[Run the demo, narrate as it goes]

"Watch the initial draft - it's rough, has gaps marked... Now it's identifying what's missing... Spawning sub-agents... See the iteration count going up... The draft is getting more detailed with each pass... And here's the final report - compare how much more comprehensive it is than the initial draft."

---

## SLIDE 10: Why Diffusion Wins

**Duration:** 3 minutes

### Visual

[Use: race-metrics component screenshot if available]

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Benchmark Results: DeepResearch Bench                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │        Google Diffusion vs OpenAI Deep Research              │  │
│  │                                                               │  │
│  │                   74.5% WIN RATE                              │  │
│  │                                                               │  │
│  │           +7.7% on Dataset 1, +1.7% on Dataset 2             │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  WHY IT WORKS:                                                      │
│  ┌────────────────────────────┬─────────────────────────────────┐  │
│  │ Iterative refinement       │ Catches gaps single-pass misses │  │
│  │ Evidence-based completion  │ No premature stopping           │  │
│  │ Self-balancing             │ Simple=2 iters, Complex=15      │  │
│  │ Draft as context anchor    │ Coherence across iterations     │  │
│  │ Isolated sub-agents        │ Independent perspectives        │  │
│  └────────────────────────────┴─────────────────────────────────┘  │
│                                                                     │
│  Key: Iteration + Self-Correction > Single Pass                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"The numbers are striking. Google's diffusion beat OpenAI's Deep Research 74.5% of the time.

Why?

1. Iterative refinement catches gaps that single-pass misses
2. Evidence-based completion means no premature stopping
3. Self-balancing: simple queries take 2-3 iterations, complex ones take 10-15
4. The draft anchors context across many iterations
5. Isolated sub-agents bring independent perspectives

The theme: iteration and self-correction beat single-pass every time."

---

## SLIDE 11: Practical Takeaways

**Duration:** 3 minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  7 Things You Can Apply Today                                       │
│                                                                     │
│  1. START WITH A DRAFT                                              │
│     Even rough - reveals gaps faster than blank page                │
│                                                                     │
│  2. COMPLETION = EVIDENCE, NOT AESTHETICS                           │
│     Stop when queries yield no new facts, not when it looks good   │
│                                                                     │
│  3. SEPARATE INFORMATION FROM GENERATION                            │
│     Get facts first → make it pretty second                         │
│     (Otherwise you're polishing hallucinations)                     │
│                                                                     │
│  4. ISOLATE SUB-AGENT CONTEXTS                                      │
│     Each needs complete standalone instructions                     │
│                                                                     │
│  5. DEDUPLICATE BY URL                                              │
│     Same source cited differently = noise                           │
│                                                                     │
│  6. CAP ITERATIONS (8 max) AND CONCURRENCY (3 agents)              │
│     Predictable costs (~$0.06/run), prevents runaway                │
│                                                                     │
│  7. COMPRESS FINDINGS, PRESERVE EVERYTHING                          │
│     Never summarize research - you lose signal                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"Seven takeaways:

1. Start with a draft - even rough, it shows gaps faster than staring at blank page.

2. Completion is about evidence, not aesthetics. Stop when diverse queries find nothing new.

3. Information first, generation second. If you polish while researching, you might be polishing hallucinations.

4. Isolate sub-agent contexts. They can't see each other - give each complete instructions.

5. Deduplicate by URL before synthesis.

6. Set limits - 8 supervisor iterations max, 3 concurrent agents max. Predictable costs (~$0.06/run).

7. When compressing research, never summarize - preserve everything. Just remove duplicates."

---

## SLIDE 12: Resources + Q&A

**Duration:** 15+ minutes

### Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        Questions?                                   │
│                                                                     │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│  Go Deeper:                                                         │
│                                                                     │
│  📝 Blog (full code walkthrough):                                  │
│     addcommitpush.io/blog/diffusion-deep-research                  │
│                                                                     │
│  💻 Reference Implementation:                                      │
│     github.com/thinkdepthai/Deep_Research                           │
│                                                                     │
│  🎓 STORM (Stanford):                                              │
│     github.com/stanford-oval/storm                                 │
│                                                                     │
│  📊 Leaderboard:                                                   │
│     huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard  │
│                                                                     │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│                     Emil Wåreus                                     │
│                  addcommitpush.io | @emilwareus                     │
│                                                                     │
│                        🍕 Pizza time!                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Speaker Notes

"Questions?

[If needed, prompt with:]

- What research tasks would you want to automate?
- Anyone tried the commercial products?
- What concerns do you have about automated research?

[After Q&A:]
The code is all open source - try it yourself. My blog has a deep code walkthrough.

Thanks everyone! There's pizza - let's chat!"

---

# TIMING SUMMARY

| Slide     | Content                  | Duration          |
| --------- | ------------------------ | ----------------- |
| 1         | Title + Hook             | 2 min             |
| 2         | Timeline                 | 5 min             |
| 3         | STORM Architecture       | 4 min             |
| 4         | STORM Demo               | 6 min             |
| 5         | Problem with Linear      | 2 min             |
| 6         | Diffusion Insight        | 3 min             |
| 7         | Diffusion Architecture   | 4 min             |
| 8         | Parallel Sub-Agents      | 2 min             |
| 9         | Diffusion Demo           | 7 min             |
| 10        | Why It Wins + Benchmarks | 3 min             |
| 11        | Practical Takeaways      | 3 min             |
| 12        | Resources + Q&A          | 15+ min           |
| **TOTAL** | **12 slides**            | **~56 min + Q&A** |

---

# VISUAL ASSETS

**From blog components:**

- `diffusion-overview.tsx` - 4-phase pipeline
- `parallel-agents.tsx` - Sub-agent architecture
- `race-metrics.tsx` - Benchmark bars

**Cover image:**

- `/public/posts/diffusion-deep-research/cover-optimized.webp`

**Demo commands:**

- `uv run main.py --agent=react "I am giving a presentation at Foo Café in Malmö..."`
- `uv run main.py --agent=storm "I am giving a presentation at Foo Café in Malmö..."`
- `uv run main.py --agent=diffusion "I am giving a presentation at Foo Café in Malmö..."`
