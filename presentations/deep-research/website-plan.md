# Deep Research Agents - Interactive Web Presentation

## Concept

A storytelling-driven web presentation that flows like a narrative. Each "page" is a full-screen section you navigate through. The story arc:

**Setup** → **Problem** → **Solution 1 (STORM)** → **Demo** → **Limitation** → **Solution 2 (Diffusion)** → **Demo** → **Why it works** → **Takeaways** → **Resources**

---

## Technical Approach

- Single page app with scroll/keyboard navigation
- Each section is viewport height (100vh)
- Smooth transitions between sections
- Embedded terminal for live demos
- Reuse animation components from blog (`/components/animations/diffusion/`)
- Progress indicator showing current position

---

## Page-by-Page Plan

---

### PAGE 1: Title / Landing

**Purpose:** Set the stage, create intrigue

**Story beat:** "You're about to learn something that changes how AI does research"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                         DEEP RESEARCH AGENTS                                │
│                       ─────────────────────────                             │
│                        Architecture Walkthrough                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                              Emil Wåreus                                    │
│                         Foo Cafe Malmö • 2026                               │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                             ↓ scroll or press space                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Large typography, minimal design
- Subtle animated background (maybe flowing particles or gradient)
- Cover image faded in background
- Keyboard hint at bottom

---

### PAGE 2: The Hook - The Group Project

**Purpose:** Create recognition, establish the problem emotionally

**Story beat:** "Remember this pain? AI has the same problem."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     Remember group projects?                                                │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                  │    │
│     │      👤 Anna        👤 Bob         👤 Carol       👤 Dan        │    │
│     │     ┌──────┐      ┌──────┐       ┌──────┐      ┌──────┐        │    │
│     │     │Intro │      │History│       │Theory│      │Concl.│        │    │
│     │     └──┬───┘      └──┬───┘       └──┬───┘      └──┬───┘        │    │
│     │        │             │              │             │             │    │
│     │        └─────────────┴──────────────┴─────────────┘             │    │
│     │                            │                                    │    │
│     │                            ▼                                    │    │
│     │                    ┌──────────────┐                             │    │
│     │                    │  "The Report" │                            │    │
│     │                    │  3hrs before  │                            │    │
│     │                    │   deadline    │                            │    │
│     │                    └──────────────┘                             │    │
│     │                                                                  │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│     Everyone writes alone. Then you "glue it together."                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Animated diagram showing isolated work → merge
- Relatable, slightly humorous tone
- Pause before revealing the connection

---

### PAGE 3: The Result

**Purpose:** Name the pain explicitly

**Story beat:** "The result was always bad. Here's why."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                           The result?                                       │
│                                                                             │
│                                                                             │
│                                                                             │
│                     ╭─────────────────────────────╮                         │
│                     │                             │                         │
│                     │    ✗  Repetitive            │                         │
│                     │                             │                         │
│                     │    ✗  Inconsistent          │  ← appears              │
│                     │                             │     one by one          │
│                     │    ✗  Different tones       │                         │
│                     │                             │                         │
│                     │    ✗  Varying quality       │                         │
│                     │                             │                         │
│                     │    ✗  Not the grade         │                         │
│                     │       you wanted            │                         │
│                     │                             │                         │
│                     ╰─────────────────────────────╯                         │
│                                                                             │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Items fade in sequentially (staggered animation)
- Clean, stark presentation
- Let it sink in before next page

---

### PAGE 4: The Reveal

**Purpose:** Connect to AI, pivot to the technical content

**Story beat:** "This is exactly how AI research agents work today."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│          This is exactly how most AI research agents work.                  │
│                                                                             │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                  │    │
│     │     ┌────────┐        ┌─────────────────┐       ┌──────────┐   │    │
│     │     │        │        │                 │       │          │   │    │
│     │     │  PLAN  │───────▶│ PARALLEL SEARCH │──────▶│  MERGE   │   │    │
│     │     │        │        │                 │       │          │   │    │
│     │     └────────┘        └─────────────────┘       └──────────┘   │    │
│     │                         │   │   │                              │    │
│     │                         ▼   ▼   ▼                              │    │
│     │                       Can't see each other                     │    │
│     │                       Can't update the plan                    │    │
│     │                       One shot - hope it works                 │    │
│     │                                                                  │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                                                                             │
│                    Today: How we fixed this.                                │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Animated pipeline diagram
- Problems appear below with red/warning styling
- "Today: How we fixed this" appears last as hook

---

### PAGE 5: Timeline

**Purpose:** Historical context, show evolution

**Story beat:** "This field evolved fast. Here's the journey."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     The Evolution of Research Agents                                        │
│                                                                             │
│     ════════════════════════════════════════════════════════════════════   │
│     2022              2023              2024              2025              │
│     ════════════════════════════════════════════════════════════════════   │
│        │                 │                 │                 │              │
│        │                 │                 │                 │              │
│        ▼                 ▼                 ▼                 ▼              │
│     ┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐           │
│     │Chain │         │ GPT  │         │STORM │         │Diffu-│           │
│     │ of   │         │Resea-│         │      │         │ sion │           │
│     │Thought│        │rcher │         │ ⭐   │         │ ⭐   │           │
│     └──────┘         └──────┘         └──────┘         └──────┘           │
│     │                 │                 │                 │                │
│     │                 │                 │                 │                │
│     "Show            "Open             "Multiple        "Iterative        │
│      your             source            perspectives"    refinement"       │
│      work"            agents"                                              │
│                                                                             │
│     ────────────────────────────────────────────────────────────────────   │
│     Single calls → Agents → Multi-agent → Iterative                        │
│     ────────────────────────────────────────────────────────────────────   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Interactive timeline (click/hover for details)
- Two stars indicate what we'll demo
- Bottom shows the evolution pattern
- Timeline animates left-to-right on entry

---

### PAGE 6: STORM Introduction

**Purpose:** Introduce first architecture

**Story beat:** "STORM's insight: simulate expert conversations"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│     STORM                                                     Stanford 2024 │
│     ══════                                                                  │
│                                                                             │
│     "What if we simulated conversations between experts?"                   │
│                                                                             │
│                                                                             │
│          ┌─────────────────────────────────────────────────────┐           │
│          │                                                      │           │
│          │    🔬 Security      👩‍💻 DevOps      📊 Platform      │           │
│          │      Architect       Engineer        Specialist      │           │
│          │                                                      │           │
│          │    "What about     "How does      "What's the       │           │
│          │     isolation?"     deployment     GCP story?"       │           │
│          │                     work?"                           │           │
│          │                                                      │           │
│          │         Different experts ask different questions    │           │
│          │                  → comprehensive coverage            │           │
│          │                                                      │           │
│          └─────────────────────────────────────────────────────┘           │
│                                                                             │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Expert personas with icons
- Speech bubbles showing different questions
- Clean, educational layout
- Stanford attribution in corner

---

### PAGE 7: STORM Architecture

**Purpose:** Show the four phases

**Story beat:** "Four phases: Discover, Converse, Analyze, Synthesize"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     STORM: Four Phases                                                      │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │  ┌─────────────┐                                                  │  │
│     │  │ 1. DISCOVER │  Survey topic → Generate 3-6 expert perspectives │  │
│     │  └──────┬──────┘                                                  │  │
│     │         │                                                          │  │
│     │         ▼                                                          │  │
│     │  ┌─────────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │
│     │  │ 2. CONVERSE │  │Expert A │ │Expert B │ │Expert C │  parallel  │  │
│     │  └──────┬──────┘  └────┬────┘ └────┬────┘ └────┬────┘            │  │
│     │         │              └───────────┴───────────┘                  │  │
│     │         ▼                                                          │  │
│     │  ┌─────────────┐                                                  │  │
│     │  │ 3. ANALYZE  │  Extract facts, find contradictions, fill gaps  │  │
│     │  └──────┬──────┘                                                  │  │
│     │         │                                                          │  │
│     │         ▼                                                          │  │
│     │  ┌─────────────┐                                                  │  │
│     │  │4. SYNTHESIZE│  Draft outline → Refine → Final article         │  │
│     │  └─────────────┘                                                  │  │
│     │                                                                    │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Animated flow diagram (phases highlight sequentially)
- Parallel conversations visually branch out
- Clean, technical but accessible

---

### PAGE 8: STORM Demo

**Purpose:** Show it working

**Story beat:** "Let me show you this in action."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     Live Demo: STORM                                                        │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│     │ $ ./research                                                       │  │
│     │ research> /storm "What are the security implications of           │  │
│     │                   WebAssembly for sandboxed execution?"           │  │
│     │                                                                    │  │
│     │ ▌                                                                  │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│     Watch: Perspectives → Parallel conversations → Final synthesis         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Full-width terminal embed
- Dark terminal theme
- Instruction below for what to watch
- Could be embedded xterm.js or video if live isn't possible

---

### PAGE 9: The Limitation

**Purpose:** Create tension, set up diffusion

**Story beat:** "But STORM still has a problem..."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                                                                             │
│                    But there's still a problem...                           │
│                                                                             │
│                                                                             │
│                                                                             │
│          ┌─────────────────────────────────────────────────────┐           │
│          │                                                      │           │
│          │         ┌───────┐   ┌───────┐   ┌───────┐          │           │
│          │         │Agent A│   │Agent B│   │Agent C│          │           │
│          │         └───┬───┘   └───┬───┘   └───┬───┘          │           │
│          │             │           │           │               │           │
│          │             ▼           ▼           ▼               │           │
│          │         ╔═══════════════════════════════╗          │           │
│          │         ║   Still can't see each other  ║          │           │
│          │         ║   Still one pass              ║          │           │
│          │         ║   Still no self-correction    ║          │           │
│          │         ╚═══════════════════════════════╝          │           │
│          │                                                      │           │
│          └─────────────────────────────────────────────────────┘           │
│                                                                             │
│                                                                             │
│                    What if the report could evolve?                         │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Dramatic pause/transition
- Problems highlighted in warning box
- Final question creates anticipation

---

### PAGE 10: The Diffusion Insight

**Purpose:** Introduce the breakthrough concept

**Story beat:** "What if research worked like image generation?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     What if research worked like image generation?                          │
│                                                                             │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  IMAGE DIFFUSION                                                 │    │
│     │                                                                  │    │
│     │  ▓▓▓▓▓▓▓    ░▓▓░▓░▓    ░░▓░░░░    ┌──────┐                     │    │
│     │  ▓▓▓▓▓▓▓ →  ▓░▓▓▓░▓ →  ░░▓▓▓░░ →  │ 🖼️  │                     │    │
│     │  ▓▓▓▓▓▓▓    ░▓░▓▓░░    ░░░░▓░░    └──────┘                     │    │
│     │   noise      less noise   shape     clean                        │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                              ↕  same idea                                   │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  RESEARCH DIFFUSION                                              │    │
│     │                                                                  │    │
│     │  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐                  │    │
│     │  │Rough │ →  │ +Gap │ →  │Refine│ →  │Final │                  │    │
│     │  │Draft │    │ Fill │    │      │    │Report│                  │    │
│     │  └──────┘    └──────┘    └──────┘    └──────┘                  │    │
│     │   "noise"     research    denoise     clean                      │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                The initial draft IS the noise we refine away.              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Side-by-side animated comparison
- Visual noise → clean transformation
- Analogy made explicit
- Key insight highlighted at bottom

---

### PAGE 11: Diffusion Architecture

**Purpose:** Show the four phases + the critical insight

**Story beat:** "Four phases, but the loop is where magic happens"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     Diffusion Deep Research                                    Google 2025  │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │  ┌────────────────────────────────────────────────────────────┐   │  │
│     │  │ 1. BRIEF    │  Transform query → research objectives       │   │  │
│     │  └─────────────────────────────────────────────────────────────┘   │  │
│     │                              │                                     │  │
│     │                              ▼                                     │  │
│     │  ┌─────────────────────────────────────────────────────────────┐   │  │
│     │  │ 2. DRAFT    │  Generate from LLM knowledge ONLY (the noise)│   │  │
│     │  └─────────────────────────────────────────────────────────────┘   │  │
│     │                              │                                     │  │
│     │                              ▼                                     │  │
│     │  ╔═════════════════════════════════════════════════════════════╗   │  │
│     │  ║ 3. LOOP  ⭐  │  Repeat:                                     ║   │  │
│     │  ║              │    → Find gaps                               ║   │  │
│     │  ║              │    → Parallel research                       ║   │  │
│     │  ║              │    → Refine draft                            ║   │  │
│     │  ║              │    → Check: FINDINGS complete?               ║   │  │
│     │  ╚═════════════════════════════════════════════════════════════╝   │  │
│     │                              │                                     │  │
│     │                              ▼                                     │  │
│     │  ┌─────────────────────────────────────────────────────────────┐   │  │
│     │  │ 4. FINAL    │  Apply quality rules, polish                 │   │  │
│     │  └─────────────────────────────────────────────────────────────┘   │  │
│     │                                                                    │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│     ⚠️  Loop stops when EVIDENCE is complete, not when draft looks good   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Loop phase highlighted/boxed differently
- Warning callout at bottom (critical insight)
- Reuse `diffusion-overview` component with modifications

---

### PAGE 12: The Loop Visualized

**Purpose:** Show the iterative refinement

**Story beat:** "Watch the draft evolve through iterations"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     The Draft Evolves                                                       │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                  │    │
│     │  Iteration 1                          Iteration 5               │    │
│     │  ────────────                         ────────────              │    │
│     │                                                                  │    │
│     │  • Topic overview [GAP]               WebAssembly provides      │    │
│     │  • Security unclear                   sandboxing via linear     │    │
│     │  • Need to research                   memory model. Key         │    │
│     │    isolation mechanisms               mechanisms include: [1]   │    │
│     │  • Performance vs security            - Memory bounds checking  │    │
│     │    tradeoffs [MISSING]                - Capability-based model  │    │
│     │                                       Performance overhead:     │    │
│     │                                       5-10% vs native [2][3]    │    │
│     │                                                                  │    │
│     │                      ─────────────▶                             │    │
│     │                       iterations                                 │    │
│     │                       2, 3, 4...                                 │    │
│     │                                                                  │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│     [INTERACTIVE: Slider to scrub through iterations 1-10]                 │
│     ════════════════════●══════════════════════════════════                │
│                         5                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Reuse `draft-denoising` component
- Interactive slider to show progression
- Clear before/after comparison
- GAPs get filled with citations

---

### PAGE 13: Parallel Sub-Agents

**Purpose:** Explain the isolation pattern

**Story beat:** "Sub-agents work in parallel but isolated - that's a feature"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     Parallel Research, Isolated Contexts                                    │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │                    ┌──────────────────┐                           │  │
│     │                    │    SUPERVISOR    │                           │  │
│     │                    │  "Research X, Y" │                           │  │
│     │                    └────────┬─────────┘                           │  │
│     │                             │                                      │  │
│     │            ┌────────────────┼────────────────┐                    │  │
│     │            │                │                │                     │  │
│     │            ▼                ▼                ▼                     │  │
│     │     ┌────────────┐  ┌────────────┐  ┌────────────┐               │  │
│     │     │ Sub-Agent  │  │ Sub-Agent  │  │ Sub-Agent  │               │  │
│     │     │   🔒       │  │   🔒       │  │   🔒       │               │  │
│     │     │  Topic A   │  │  Topic B   │  │  Topic C   │               │  │
│     │     │            │  │            │  │            │               │  │
│     │     │ Can't see  │  │ Can't see  │  │ Can't see  │               │  │
│     │     │ B or C     │  │ A or C     │  │ A or B     │               │  │
│     │     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘               │  │
│     │           │               │               │                       │  │
│     │           └───────────────┼───────────────┘                       │  │
│     │                           ▼                                        │  │
│     │                    ┌──────────────────┐                           │  │
│     │                    │    SUPERVISOR    │                           │  │
│     │                    │  Merges, Refines │                           │  │
│     │                    └──────────────────┘                           │  │
│     │                                                                    │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│     Why isolated? Independent perspectives. No cross-contamination.        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Reuse `parallel-agents` component
- Lock icons to emphasize isolation
- Clear supervisor → agents → supervisor flow
- Explanation at bottom

---

### PAGE 14: Diffusion Demo

**Purpose:** Show it working, compare to STORM

**Story beat:** "Watch the iteration count. See the draft evolve."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     Live Demo: Diffusion                                                    │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│     │ research> /think_deep "Compare STORM and Diffusion research      │  │
│     │                        architectures"                             │  │
│     │                                                                    │  │
│     │ ▌                                                                  │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │                                                                    │  │
│     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│     Watch: Initial draft → Gap detection → Iterations → Final report       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Same terminal style as STORM demo
- Different command (/think_deep)
- Instruction emphasizes what's different to watch

---

### PAGE 15: Why It Wins

**Purpose:** Show the evidence

**Story beat:** "74.5% win rate. Here's why."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     The Results                                                             │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │            Google Diffusion vs OpenAI Deep Research               │  │
│     │                                                                    │  │
│     │                    ╔═══════════════════════╗                      │  │
│     │                    ║                       ║                      │  │
│     │                    ║    74.5% WIN RATE     ║                      │  │
│     │                    ║                       ║                      │  │
│     │                    ╚═══════════════════════╝                      │  │
│     │                                                                    │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│     Why?                                                                    │
│     ┌────────────────────────────┬────────────────────────────────────┐    │
│     │ Iterative refinement       │ Catches gaps single-pass misses    │    │
│     │ Evidence-based completion  │ Stops when facts found, not polish │    │
│     │ Self-balancing             │ 2 iters for simple, 15 for complex │    │
│     │ Draft as anchor            │ Coherence across iterations        │    │
│     │ Isolated sub-agents        │ Independent perspectives           │    │
│     └────────────────────────────┴────────────────────────────────────┘    │
│                                                                             │
│     Iteration + Self-correction > Single pass                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Big win rate number (animated count-up)
- Clean table of reasons
- Reuse `race-metrics` component if showing full benchmarks
- Key insight at bottom

---

### PAGE 16: Takeaways

**Purpose:** Actionable lessons

**Story beat:** "Seven things you can apply today."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     What You Can Apply Today                                                │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │  1   Start with a draft                                           │  │
│     │      Even rough - reveals gaps faster than blank page             │  │
│     │                                                                    │  │
│     │  2   Completion = evidence, not aesthetics                        │  │
│     │      Stop when queries yield no new facts                         │  │
│     │                                                                    │  │
│     │  3   Information first, generation second                         │  │
│     │      Don't polish hallucinations                                  │  │
│     │                                                                    │  │
│     │  4   Isolate sub-agent contexts                                   │  │
│     │      Each needs complete standalone instructions                  │  │
│     │                                                                    │  │
│     │  5   Deduplicate by URL                                           │  │
│     │                                                                    │  │
│     │  6   Cap iterations (15) and concurrency (3)                      │  │
│     │                                                                    │  │
│     │  7   Compress findings, preserve everything                       │  │
│     │                                                                    │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Clean numbered list
- Each item fades in sequentially
- Most important items (1-3) have descriptions
- Rest are concise

---

### PAGE 17: Resources + Questions

**Purpose:** Close, provide next steps, open Q&A

**Story beat:** "Go deeper. Let's discuss."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                            Questions?                                       │
│                                                                             │
│                                                                             │
│     ─────────────────────────────────────────────────────────────────────  │
│                                                                             │
│                             Go Deeper                                       │
│                                                                             │
│     📝  Blog post (code walkthrough)                                       │
│         addcommitpush.io/blog/diffusion-deep-research                      │
│                                                                             │
│     💻  My Go implementation                                               │
│         github.com/emilwareus/addcommitpush.io/go-research                 │
│                                                                             │
│     🎓  STORM (Stanford)                                                   │
│         github.com/stanford-oval/storm                                     │
│                                                                             │
│     📊  Leaderboard                                                        │
│         huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard      │
│                                                                             │
│     ─────────────────────────────────────────────────────────────────────  │
│                                                                             │
│                              Emil Wåreus                                    │
│                           addcommitpush.io                                  │
│                                                                             │
│                              🍕 Pizza!                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- Clean, minimal
- Links are clickable
- QR codes could be added for mobile
- Pizza emoji for Foo Cafe tradition

---

## Navigation & UX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Navigation Bar (fixed, semi-transparent)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Deep Research Agents          ● ● ● ● ○ ○ ○ ○ ○ ○ ○ ○    5/17     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Controls:                                                                  │
│  - Arrow keys / Space: Navigate                                            │
│  - Scroll: Navigate                                                         │
│  - Click dots: Jump to page                                                │
│  - ESC: Show overview/grid                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Components Needed

1. **PageContainer** - Full viewport section with transitions
2. **NavigationBar** - Progress dots, keyboard hints
3. **Terminal** - For live demos (xterm.js or video fallback)
4. **AnimatedDiagram** - Reusable animated flow diagrams
5. **Timeline** - Interactive timeline component
6. **ComparisonSlider** - For iteration scrubbing

**Reuse from blog:**

- `DiffusionOverview`
- `DraftDenoising`
- `ParallelAgents`
- `TwoStageGap`
- `RACEMetrics`

---

## Page Summary

| #   | Page                   | Purpose        | Duration |
| --- | ---------------------- | -------------- | -------- |
| 1   | Title                  | Set the stage  | 30s      |
| 2   | Group Project          | Emotional hook | 1m       |
| 3   | The Result             | Name the pain  | 30s      |
| 4   | The Reveal             | Connect to AI  | 1m       |
| 5   | Timeline               | Context        | 3m       |
| 6   | STORM Intro            | First solution | 2m       |
| 7   | STORM Architecture     | How it works   | 2m       |
| 8   | STORM Demo             | See it work    | 5m       |
| 9   | The Limitation         | Create tension | 1m       |
| 10  | Diffusion Insight      | Breakthrough   | 2m       |
| 11  | Diffusion Architecture | How it works   | 2m       |
| 12  | Loop Visualized        | Show evolution | 2m       |
| 13  | Parallel Agents        | Key pattern    | 1m       |
| 14  | Diffusion Demo         | See it work    | 6m       |
| 15  | Why It Wins            | Evidence       | 2m       |
| 16  | Takeaways              | Actionable     | 2m       |
| 17  | Resources + Q&A        | Close          | 15m+     |

**Total: 17 pages, ~48 min content + Q&A**

---

## File Structure for Implementation

```
app/presentations/deep-research/
├── page.tsx                    # Main presentation page
├── components/
│   ├── PageContainer.tsx       # Full-screen section wrapper
│   ├── NavigationBar.tsx       # Progress indicator
│   ├── Terminal.tsx            # Demo terminal
│   ├── pages/
│   │   ├── TitlePage.tsx
│   │   ├── GroupProjectPage.tsx
│   │   ├── ResultPage.tsx
│   │   ├── RevealPage.tsx
│   │   ├── TimelinePage.tsx
│   │   ├── StormIntroPage.tsx
│   │   ├── StormArchPage.tsx
│   │   ├── StormDemoPage.tsx
│   │   ├── LimitationPage.tsx
│   │   ├── DiffusionInsightPage.tsx
│   │   ├── DiffusionArchPage.tsx
│   │   ├── LoopPage.tsx
│   │   ├── ParallelAgentsPage.tsx
│   │   ├── DiffusionDemoPage.tsx
│   │   ├── WhyItWinsPage.tsx
│   │   ├── TakeawaysPage.tsx
│   │   └── ResourcesPage.tsx
│   └── index.ts
└── styles/
    └── presentation.css
```
