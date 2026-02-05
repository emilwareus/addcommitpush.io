# Deep Research Agents - Architecture Walkthrough
## Presentation Plan for Foo Cafe Malmö - February 5th, 2026

---

## Project Status

### Completed
- [x] Research Foo Cafe Malmö - audience, style, vibe
- [x] Research deep research agent history and timeline
- [x] Analyze codebase (STORM, Deep_Research Python implementation)
- [x] Read Diffusion Deep Research blog post content
- [x] Create folder structure
- [x] Create research folder with all references
- [x] Create comprehensive presentation outline (outline.txt)
- [x] Create research files (timeline.md, storm.md, diffusion.md, benchmarks.md, foo-cafe.md, references.md)
- [x] Create slides.md with 33 slides, speaker notes, and timing estimates

### Ready for Use
All materials are complete and ready for presentation development!

### Files Created
- `plan.md` - Master plan and status tracking
- `outline.txt` - Full presentation script/outline
- `slides.md` - **33 slides with speaker notes and timing (~73 min)**
- `research/timeline.md` - Complete history of deep research agents
- `research/storm.md` - STORM architecture deep dive
- `research/diffusion.md` - Diffusion architecture deep dive
- `research/benchmarks.md` - Performance metrics and evaluation
- `research/foo-cafe.md` - Venue research
- `research/references.md` - Complete bibliography

---

## Venue Context: Foo Cafe Malmö

### Audience Profile
- Software developers and engineers (strong Node.js community)
- Tech entrepreneurs and startup founders
- Data scientists and AI/ML professionals
- Inclusive community - "everybody is invited"

### Presentation Style That Works
- Casual yet professional approach
- Technical talks with practical demos
- Interactive Q&A sessions
- Knowledge sharing focus with growth orientation
- Previous Emil talks: "The State of AI", "Inside Debricked: Lessons from a Startup's Tech Journey"

### Venue Vibe
- Community-driven, foundation-based
- Complementary pizza and drinks
- Relaxed networking atmosphere
- Daily programming with events year-round

---

## Presentation Structure

### 1. HOOK (2-3 minutes)
**The Group Project Problem**
- Remember school group projects where everyone wrote their section in isolation?
- The result: repetitive, inconsistent, different tones, varying quality
- REVEAL: This is exactly how most AI research agents work today!
- Tease: "Today I'll show you how we fixed this with diffusion"

### 2. INTRO - Emil Wåreus (1-2 minutes)
- Co-founder and Head of Data Science at Debricked
- Passionate about AI research agents and automation
- Previous talks at Foo Cafe: "The State of AI", semantic code search
- Blog: addcommitpush.io

### 3. AUDIENCE INTERACTION (3-5 minutes)
**Questions to ask:**
1. "Who has used ChatGPT or Claude for research tasks?" (hands up)
2. "Who has noticed AI giving inconsistent or repetitive information in long outputs?" (hands up)
3. "Who has built or experimented with AI agents?" (hands up)
4. "What's the longest research task you've trusted to an AI?" (open answers)

**Why this works:** Creates engagement, gauges audience level, sets up the problem

### 4. TIMELINE OF DEEP RESEARCH AGENTS (10-15 minutes)

#### Visual Timeline (key milestones):

| Date | System | Organization | Key Innovation |
|------|--------|--------------|----------------|
| Jan 2022 | Chain-of-Thought | Google | Step-by-step reasoning |
| Oct 2022 | ReAct | Google Research | Reasoning + Acting interleaved |
| Jul 2023 | ToolLLM | Alibaba/Stanford | 16,000+ API mastery |
| 2023 | GPT Researcher | Open Source | Planner + Executor pattern |
| Feb 2024 | **STORM** | Stanford | Multi-perspective conversations |
| Feb 2025 | OpenAI Deep Research | OpenAI | Commercial research agent |
| 2025 | Perplexity Deep Research | Perplexity AI | Test-time compute expansion |
| Jul 2025 | **Diffusion Deep Research** | Google DeepMind | Diffusion-based iterative refinement |
| 2025 | Skywork DeepResearchAgent | Skywork AI | Hierarchical multi-agent |

### 5. ARCHITECTURE WALKTHROUGHS (30-40 minutes)

#### 5.1 STORM Architecture (10 min + demo)
**Core Concept:** Multi-perspective conversation simulation

**Phases:**
1. DISCOVER - Survey topics, generate 3-6 expert perspectives
2. CONVERSE - Parallel WikiWriter↔TopicExpert dialogues
3. ANALYZE - Extract facts, detect contradictions, fill gaps
4. SYNTHESIZE - Two-phase outline → final report

**Key Innovation:** Perspective-based research ensures diverse viewpoints

**DEMO:** Run `/storm` query in go-research REPL

#### 5.2 Plan-Research-Report Pattern (5 min)
**Core Concept:** Standard emerging pattern across implementations

**Flow:**
1. Planning Phase - Break objective into sub-questions
2. Research Phase - Source Finder with web search
3. Processing Phase - Summarization + gap detection
4. Report Phase - Professional synthesis

**Used by:** OpenAI DR, Perplexity DR, GPT Researcher

#### 5.3 Diffusion Deep Research (15 min + demo)
**Core Concept:** Research as iterative denoising

**The Insight:**
- Initial draft from LLM knowledge = "noisy" state
- Each research iteration = "denoising step"
- Retrieved information = "guidance signal"
- Final report = "clean output"

**Four Phases:**
1. Brief Generation - Transform query to research brief
2. Initial Draft - Generate from internal knowledge only (the "noise")
3. Diffusion Loop (Supervisor Subgraph):
   - Generate research questions for gaps
   - Conduct parallel research
   - Refine draft (denoise)
   - Assess completeness
4. Final Report - Apply quality rules

**Key Innovations:**
- Self-balancing test-time compute
- Parallel sub-agents with isolated contexts
- Completion based on findings, not draft appearance
- Draft as persistent context anchor

**DEMO:** Run `/think_deep` query in go-research REPL

### 6. WHAT DRIVES PERFORMANCE (10 minutes)

#### Benchmark: DeepResearch Bench
- 100 PhD-level research tasks
- RACE Framework (Report Quality): Comprehensiveness, Insight, Instruction Following, Readability
- FACT Framework (Citation Quality): Accuracy, Effective Citations

#### Why Diffusion Wins:
1. Iterative refinement catches gaps → Higher Comprehensiveness
2. Parallel execution → Better Coverage
3. Explicit completion criteria → Validated Comprehensiveness
4. Self-balancing adaptivity → Right-Sized Research
5. Draft as context anchor → Higher Readability
6. Quality rules in final generation → Higher Insight

#### Context Engineering Considerations:
| Problem | Description | Diffusion Solution |
|---------|-------------|-------------------|
| Context Poisoning | Hallucinations enter context | Draft as verified state |
| Context Distraction | Too much context | Parallel isolated agents |
| Context Confusion | Superfluous context | Structured compression |
| Context Clash | Disagreeing context | Supervisor resolution |

### 7. PRACTICAL TAKEAWAYS (5 minutes)
1. Start with a draft - reveals gaps faster
2. Deduplicate by URL before synthesis
3. Completion is about evidence coverage, not aesthetics
4. Cap iterations and concurrency (15 loops, 3 agents)
5. Separate information gap from generation gap
6. Isolate sub-agent contexts
7. Compress findings, preserve everything

### 8. Q&A and DISCUSSION (10-15 minutes)

---

## Demo Preparation

### Required Setup:
```bash
cd go-research
cp .env.example .env
# Add API keys: OPENROUTER_API_KEY, BRAVE_API_KEY
go build -o research ./cmd/research
./research
```

### Demo Queries (prepare 2-3):
1. `/storm "What are the security implications of WebAssembly for sandboxed execution?"`
2. `/think_deep "Compare the architectural patterns of STORM vs Diffusion research agents"`
3. `/fast "What is the ReAct agent pattern?"`

### Backup Plan:
- Pre-recorded demos if API issues
- Screenshots of key visualizations
- Code walkthrough of key functions

---

## Visual Assets Needed

### Infographics (from blog post):
1. DiffusionOverview - Self-balancing test-time diffusion
2. DraftDenoising - How draft evolves through iterations
3. ParallelAgents - Parallel fan-out visualization
4. TwoStageGap - Information vs Generation gap
5. RACEMetrics - Benchmark performance
6. DiffusionLoopStep - Single iteration visualization

### Timeline Graphic:
- Create horizontal timeline with key systems
- Color-code by organization
- Show key innovations as annotations

### Architecture Diagrams:
1. STORM 4-phase flow
2. Diffusion supervisor/sub-agent pattern
3. Plan-Research-Report pattern

---

## Research References to Include

### Papers:
1. STORM (arXiv:2402.14207) - Stanford, Feb 2024
2. Chain-of-Thought (arXiv:2201.11903) - Google, Jan 2022
3. ReAct (arXiv:2210.03629) - Google, Oct 2022
4. Deep Researcher TTD-DR (arXiv:2507.16075) - Google, Jul 2025
5. Deep Research Survey (arXiv:2508.12752) - Aug 2025
6. Deep Research Agents Roadmap (arXiv:2506.18096) - Jun 2025

### Key Resources:
- STORM GitHub: github.com/stanford-oval/storm
- GPT Researcher Docs: docs.gptr.dev
- DeepResearch Bench: huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard
- ThinkDepth.ai Reference Implementation: github.com/thinkdepthai/Deep_Research
- My Go Implementation: github.com/emilwareus/addcommitpush.io/tree/main/go-research

### Blog Posts:
- Google Research: Deep Researcher with Test-Time Diffusion
- Paichun Lin: Self-Balancing Agentic AI
- My blog: addcommitpush.io/blog/diffusion-deep-research

---

## Timing Breakdown (60 minutes total)

| Section | Duration | Cumulative |
|---------|----------|------------|
| Hook | 2-3 min | 3 min |
| Intro | 1-2 min | 5 min |
| Audience Interaction | 3-5 min | 10 min |
| Timeline | 10-15 min | 25 min |
| STORM Walkthrough + Demo | 10 min | 35 min |
| Plan-Research-Report | 5 min | 40 min |
| Diffusion Walkthrough + Demo | 15 min | 55 min |
| Performance Drivers | 10 min | 65 min |
| Practical Takeaways | 5 min | 70 min |
| Q&A | 10-15 min | 85 min |

**Total: ~75-85 minutes** (adjust based on Foo Cafe slot)

---

## Notes for Presentation Day

1. Arrive early to test projector/screen
2. Have demos pre-loaded and tested
3. Bring backup on USB drive
4. Check API keys are funded
5. Have offline fallback ready
6. Prepare water for speaking
7. Engage with audience during networking after

---

## File Structure

```
presentations/deep-research/
├── plan.md                 # This file
├── outline.txt             # Detailed presentation outline
└── research/
    ├── timeline.md         # Full timeline with all systems
    ├── storm.md            # STORM architecture notes
    ├── diffusion.md        # Diffusion architecture notes
    ├── benchmarks.md       # Performance benchmarks
    ├── foo-cafe.md         # Venue research
    └── references.md       # All paper/URL references
```
