# Deep Research Presentation — Implementation Plan

## Overview

Build a React-based presentation for the "Deep Research Agents — Architecture Walkthrough" talk (Foo Cafe, Feb 5 2026). The presentation lives at `/presentations/deep-research/[slide]` as a sub-page of the blog. Each slide is a separate URL, navigation is via arrow keys with intermediate step-based animations, and existing blog animation components are reused.

## Current State Analysis

- No presentation routes exist under `app/`
- No keyboard navigation exists anywhere in the codebase
- 6 animation components exist at `components/animations/diffusion/` (DiffusionOverview, DraftDenoising, ParallelAgents, TwoStageGap, RACEMetrics, DiffusionLoopStep) — all accept `className?: string`, all are Client Components using Framer Motion
- Blog uses the pattern: `lib/posts.ts` registry + `app/blog/[slug]/page.tsx` with `generateStaticParams()` + dynamic imports
- Root layout at `app/layout.tsx` always renders `<Navigation />` — presentation will cover it with `fixed inset-0`
- No new dependencies needed (framer-motion, lucide-react, tailwindcss v4 all installed)

### Key Discoveries:

- `app/blog/[slug]/page.tsx:10` — `export const dynamic = 'error'` pattern for SSG enforcement
- `app/blog/[slug]/page.tsx:56-81` — Dynamic import switch pattern for code splitting
- `components/animations/diffusion/index.ts:1-6` — Barrel export for all 6 animation components
- `app/layout.tsx:50-52` — `<Navigation />` renders in a `div.min-h-screen.grid-bg`
- `app/globals.css:156-174` — `.neon-glow`, `.neon-border`, `.grid-bg` utility classes available
- `lib/utils.ts:4-6` — `cn()` utility (clsx + tailwind-merge)

## Desired End State

- Visiting `/presentations/deep-research/01-title` renders the title slide fullscreen
- Arrow keys navigate between slides (and animation steps within slides)
- Each of the 19 slides has a unique URL with number-prefixed slug
- Progress bar at top shows current position
- Slide counter at bottom-right
- Blog navigation is completely hidden
- Existing animation components from the diffusion blog post render correctly on their respective slides
- `pnpm build` succeeds with all 19 slides statically generated

### Verification:

- `pnpm build` passes (all 19 routes generated)
- `pnpm lint` passes
- Navigation works: ArrowRight advances steps then slides, ArrowLeft reverses
- All 19 URLs resolve correctly
- Existing animation components (DiffusionOverview, DraftDenoising, ParallelAgents, RACEMetrics) render and animate

## What We're NOT Doing

- No presenter notes / speaker mode
- No slide overview grid (ESC)
- No mobile touch/swipe support
- No embedded terminal for live demos (user tabs out)
- No scroll-based navigation
- No custom theme — reuse the blog's synthwave dark theme
- No new dependencies
- No modifications to existing animation components
- No changes to the root layout

## Implementation Approach

Three phases: (1) infrastructure (registry, layout, route), (2) all 19 slide components, (3) build verification. The infrastructure must be solid before slides are written, since every slide depends on the layout's `step` prop passing.

---

## Phase 1: Infrastructure

### Overview

Create the slide registry, presentation layout with keyboard navigation, and dynamic route handler. After this phase, a single placeholder slide should be navigable.

### Changes Required:

#### 1. Slide Registry

**File**: `lib/presentations/deep-research.ts` (new)

```typescript
export interface Slide {
  slug: string;
  title: string;
  steps: number; // 0 = no intermediate animations
}

const slides: Slide[] = [
  { slug: '01-title', title: 'Deep Research Agents', steps: 0 },
  { slug: '02-group-project', title: 'The Group Project Problem', steps: 2 },
  { slug: '03-the-result', title: 'The Result', steps: 5 },
  { slug: '04-the-reveal', title: 'The AI Connection', steps: 3 },
  { slug: '05-about', title: 'Emil Wåreus', steps: 0 },
  { slug: '06-audience-poll', title: 'Quick Poll', steps: 4 },
  { slug: '07-timeline', title: 'Evolution of Research Agents', steps: 6 },
  { slug: '08-storm-intro', title: 'STORM: Multi-Perspective Research', steps: 3 },
  { slug: '09-storm-architecture', title: 'STORM: Four Phases', steps: 4 },
  { slug: '10-storm-demo', title: 'Live Demo: STORM', steps: 0 },
  { slug: '11-limitation', title: 'The Problem with Linear Pipelines', steps: 3 },
  { slug: '12-diffusion-insight', title: 'Research as Diffusion', steps: 2 },
  { slug: '13-diffusion-architecture', title: 'Diffusion Deep Research', steps: 0 },
  { slug: '14-loop-visualized', title: 'The Draft Evolves', steps: 0 },
  { slug: '15-parallel-agents', title: 'Parallel Research, Isolated Contexts', steps: 0 },
  { slug: '16-diffusion-demo', title: 'Live Demo: Diffusion', steps: 0 },
  { slug: '17-benchmarks', title: 'Why Diffusion Wins', steps: 5 },
  { slug: '18-takeaways', title: 'What You Can Apply Today', steps: 7 },
  { slug: '19-resources', title: 'Questions & Resources', steps: 0 },
];

export function getAllSlides(): Slide[] {
  return slides;
}

export function getSlideBySlug(slug: string): Slide | null {
  return slides.find((s) => s.slug === slug) ?? null;
}

export function getAllSlideSlugs(): string[] {
  return slides.map((s) => s.slug);
}

export function getSlideIndex(slug: string): number {
  return slides.findIndex((s) => s.slug === slug);
}

export function getAdjacentSlugs(slug: string): { prev: string | null; next: string | null } {
  const idx = getSlideIndex(slug);
  return {
    prev: idx > 0 ? slides[idx - 1].slug : null,
    next: idx < slides.length - 1 ? slides[idx + 1].slug : null,
  };
}

export function getSlideSteps(slug: string): number {
  return slides.find((s) => s.slug === slug)?.steps ?? 0;
}
```

#### 2. Presentation Layout

**File**: `app/presentations/deep-research/layout.tsx` (new)

Client Component that handles:
- Keyboard navigation (ArrowRight/ArrowLeft)
- Step counter per slide (resets on pathname change)
- Progress bar (top)
- Slide counter (bottom-right)
- Fullscreen overlay (`fixed inset-0 z-50`) hiding blog nav
- Fade transition between slides
- Passes `step` to children via a React context

```typescript
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllSlides,
  getSlideIndex,
  getAdjacentSlugs,
  getSlideSteps,
} from '@/lib/presentations/deep-research';

// Context so slide components can read the current step
export const SlideStepContext = createContext<number>(0);
export function useSlideStep() {
  return useContext(SlideStepContext);
}

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSlug = pathname.split('/').pop() ?? '';
  const slides = getAllSlides();
  const currentIndex = getSlideIndex(currentSlug);
  const { prev, next } = getAdjacentSlugs(currentSlug);
  const maxSteps = getSlideSteps(currentSlug);
  const [step, setStep] = useState(0);

  // Reset step when slide changes
  useEffect(() => {
    setStep(0);
  }, [pathname]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (step < maxSteps) {
          setStep((s) => s + 1);
        } else if (next) {
          router.push(`/presentations/deep-research/${next}`);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (step > 0) {
          setStep((s) => s - 1);
        } else if (prev) {
          router.push(`/presentations/deep-research/${prev}`);
        }
      }
    },
    [step, maxSteps, router, prev, next],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Slide content with fade transition */}
      <SlideStepContext.Provider value={step}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full flex items-center justify-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </SlideStepContext.Provider>

      {/* Slide counter */}
      <div className="fixed bottom-4 right-6 text-sm text-muted-foreground/60 z-50 font-mono">
        {currentIndex + 1} / {slides.length}
      </div>
    </div>
  );
}
```

**Key design decisions:**
- `SlideStepContext` passes `step` to slide components without prop drilling through the page component
- Space bar also advances (common presentation convention)
- `z-50` ensures the presentation covers the blog `<Navigation />` from the root layout
- `AnimatePresence` with `key={pathname}` triggers fade on route change
- `e.preventDefault()` on space/arrow prevents page scroll

#### 3. Dynamic Route Handler

**File**: `app/presentations/deep-research/[slide]/page.tsx` (new)

Server Component that statically generates all 19 slide pages and dynamically imports the correct slide component.

```typescript
import { getAllSlideSlugs, getSlideBySlug } from '@/lib/presentations/deep-research';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'error';
export const revalidate = false;

export async function generateStaticParams() {
  return getAllSlideSlugs().map((slide) => ({ slide }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slide: string }>;
}): Promise<Metadata> {
  const { slide } = await params;
  const slideData = getSlideBySlug(slide);
  if (!slideData) return { title: 'Slide Not Found' };

  return {
    title: `${slideData.title} — Deep Research Agents`,
    description: 'Deep Research Agents: Architecture Walkthrough — Foo Cafe Malmö, Feb 2026',
  };
}

export default async function SlidePage({
  params,
}: {
  params: Promise<{ slide: string }>;
}) {
  const { slide } = await params;
  const slideData = getSlideBySlug(slide);
  if (!slideData) notFound();

  const slideContent = await (async () => {
    switch (slide) {
      case '01-title': {
        const { TitleSlide } = await import('@/components/presentations/deep-research/slides/01-title');
        return <TitleSlide />;
      }
      case '02-group-project': {
        const { GroupProjectSlide } = await import('@/components/presentations/deep-research/slides/02-group-project');
        return <GroupProjectSlide />;
      }
      case '03-the-result': {
        const { TheResultSlide } = await import('@/components/presentations/deep-research/slides/03-the-result');
        return <TheResultSlide />;
      }
      case '04-the-reveal': {
        const { TheRevealSlide } = await import('@/components/presentations/deep-research/slides/04-the-reveal');
        return <TheRevealSlide />;
      }
      case '05-about': {
        const { AboutSlide } = await import('@/components/presentations/deep-research/slides/05-about');
        return <AboutSlide />;
      }
      case '06-audience-poll': {
        const { AudiencePollSlide } = await import('@/components/presentations/deep-research/slides/06-audience-poll');
        return <AudiencePollSlide />;
      }
      case '07-timeline': {
        const { TimelineSlide } = await import('@/components/presentations/deep-research/slides/07-timeline');
        return <TimelineSlide />;
      }
      case '08-storm-intro': {
        const { StormIntroSlide } = await import('@/components/presentations/deep-research/slides/08-storm-intro');
        return <StormIntroSlide />;
      }
      case '09-storm-architecture': {
        const { StormArchitectureSlide } = await import('@/components/presentations/deep-research/slides/09-storm-architecture');
        return <StormArchitectureSlide />;
      }
      case '10-storm-demo': {
        const { StormDemoSlide } = await import('@/components/presentations/deep-research/slides/10-storm-demo');
        return <StormDemoSlide />;
      }
      case '11-limitation': {
        const { LimitationSlide } = await import('@/components/presentations/deep-research/slides/11-limitation');
        return <LimitationSlide />;
      }
      case '12-diffusion-insight': {
        const { DiffusionInsightSlide } = await import('@/components/presentations/deep-research/slides/12-diffusion-insight');
        return <DiffusionInsightSlide />;
      }
      case '13-diffusion-architecture': {
        const { DiffusionArchitectureSlide } = await import('@/components/presentations/deep-research/slides/13-diffusion-architecture');
        return <DiffusionArchitectureSlide />;
      }
      case '14-loop-visualized': {
        const { LoopVisualizedSlide } = await import('@/components/presentations/deep-research/slides/14-loop-visualized');
        return <LoopVisualizedSlide />;
      }
      case '15-parallel-agents': {
        const { ParallelAgentsSlide } = await import('@/components/presentations/deep-research/slides/15-parallel-agents');
        return <ParallelAgentsSlide />;
      }
      case '16-diffusion-demo': {
        const { DiffusionDemoSlide } = await import('@/components/presentations/deep-research/slides/16-diffusion-demo');
        return <DiffusionDemoSlide />;
      }
      case '17-benchmarks': {
        const { BenchmarksSlide } = await import('@/components/presentations/deep-research/slides/17-benchmarks');
        return <BenchmarksSlide />;
      }
      case '18-takeaways': {
        const { TakeawaysSlide } = await import('@/components/presentations/deep-research/slides/18-takeaways');
        return <TakeawaysSlide />;
      }
      case '19-resources': {
        const { ResourcesSlide } = await import('@/components/presentations/deep-research/slides/19-resources');
        return <ResourcesSlide />;
      }
      default:
        notFound();
    }
  })();

  return slideContent;
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` succeeds (generates 19 static slide pages)
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Navigating to `/presentations/deep-research/01-title` renders a slide fullscreen
- [ ] Arrow keys navigate between slides
- [ ] Progress bar updates
- [ ] Blog navigation is hidden

---

## Phase 2: Slide Components

### Overview

Create all 19 slide components. Slides with `steps > 0` use the `useSlideStep()` hook from the layout context. Slides embedding existing animation components (DiffusionOverview, DraftDenoising, ParallelAgents, RACEMetrics) just render them in a width-constrained container.

### Changes Required:

#### All slide files: `components/presentations/deep-research/slides/`

Each slide is a `'use client'` component (needed for `useSlideStep` context and Framer Motion). Below are the 19 slides with their content mapped from the outline:

**01-title.tsx** — `steps: 0`
- Large centered title: "DEEP RESEARCH AGENTS"
- Subtitle: "Architecture Walkthrough"
- Author + venue: "Emil Wåreus | Foo Cafe Malmo | Feb 5, 2026"
- Keyboard hint at bottom: "Press arrow keys to navigate"

**02-group-project.tsx** — `steps: 2`
- Step 0: Heading "Remember group projects?"
- Step 1: Animated diagram showing 4 people (Anna, Bob, Carol, Dan) each writing their section in isolation, then merging into "The Report"
- Step 2: Caption "Everyone writes alone. Then you glue it together 3 hours before the deadline."

**03-the-result.tsx** — `steps: 5`
- Heading "The result?"
- Steps 1-5 reveal bullet points one by one with Framer Motion fade-in:
  - Repetitive
  - Inconsistent
  - Different tones
  - Varying quality
  - Not the grade you wanted

**04-the-reveal.tsx** — `steps: 3`
- Step 0: "This is exactly how most AI research agents work."
- Step 1: Animated pipeline diagram: PLAN → PARALLEL SEARCH → MERGE
- Step 2: Problems appear: "Can't see each other", "Can't update the plan", "One shot — hope it works"
- Step 3: "Today: How we fixed this."

**05-about.tsx** — `steps: 0`
- Emil Wåreus intro card
- "General hacker, Founder of oaiz"
- "ex-co-founder Debricked, exit 2022"
- "Blog: addcommitpush.io"

**06-audience-poll.tsx** — `steps: 4`
- "Quick Poll" heading
- Steps 1-4 reveal questions one by one:
  1. "Who has used ChatGPT or Claude for research?"
  2. "Who has noticed AI giving inconsistent or repetitive info?"
  3. "Who has built or experimented with AI agents?"
  4. "Who trusts AI research reports?"

**07-timeline.tsx** — `steps: 6`
- "The Evolution of Research Agents" heading
- Horizontal timeline with entries appearing via steps:
  - Step 1: 2022 — Chain-of-Thought, ReAct
  - Step 2: 2023 — GPT Researcher
  - Step 3: 2024 — STORM (starred)
  - Step 4: 2025 — OpenAI DR, Perplexity DR
  - Step 5: 2025 — Diffusion DR (starred)
  - Step 6: Bottom insight line: "Single calls → Agents → Multi-agent → Iterative"

**08-storm-intro.tsx** — `steps: 3`
- "STORM" heading with "Stanford 2024" attribution
- Step 1: "What if we simulated conversations between experts?"
- Step 2: 3 expert cards appear (Security Architect, DevOps Engineer, Platform Specialist) with speech bubbles
- Step 3: "Different experts ask different questions → comprehensive coverage"

**09-storm-architecture.tsx** — `steps: 4`
- "STORM: Four Phases"
- Steps 1-4 reveal phases one by one:
  1. DISCOVER — Survey topic, generate expert perspectives
  2. CONVERSE — Parallel WikiWriter ↔ TopicExpert dialogues
  3. ANALYZE — Extract facts, find contradictions, fill gaps
  4. SYNTHESIZE — Draft outline → Refine → Final article

**10-storm-demo.tsx** — `steps: 0`
- Simple centered card: "Live Demo: STORM"
- "Switch to terminal"
- Code block: `/storm "What are the security implications of WebAssembly?"`
- Hint: "Watch: Perspectives → Parallel conversations → Final synthesis"

**11-limitation.tsx** — `steps: 3`
- Step 0: "But there's still a problem..."
- Step 1: 3 agent boxes (Agent A, B, C) with arrows down
- Step 2: Warning box: "Still can't see each other / Still one pass / Still no self-correction"
- Step 3: "What if the report could evolve?"

**12-diffusion-insight.tsx** — `steps: 2`
- "What if research worked like image generation?"
- Step 1: Image diffusion row: noise → less noise → shape → clean image
- Step 2: Research diffusion row: rough draft → +gap fill → refine → final report
- Comparison table + key insight: "The initial draft IS the noise we refine away"

**13-diffusion-architecture.tsx** — `steps: 0`
- Embed the existing `<DiffusionOverview />` component from `@/components/animations/diffusion`
- Wrap in `max-w-5xl mx-auto w-full px-8`
- Title: "Diffusion Deep Research" with "Google 2025"
- Callout at bottom: "Loop stops when EVIDENCE is complete, not when draft looks good"

**14-loop-visualized.tsx** — `steps: 0`
- Title: "The Draft Evolves"
- Embed the existing `<DraftDenoising />` component
- Wrap in `max-w-5xl mx-auto w-full px-8`

**15-parallel-agents.tsx** — `steps: 0`
- Title: "Parallel Research, Isolated Contexts"
- Embed the existing `<ParallelAgents />` component
- Wrap in `max-w-5xl mx-auto w-full px-8`
- Caption: "Why isolated? Independent perspectives. No cross-contamination."

**16-diffusion-demo.tsx** — `steps: 0`
- Simple centered card: "Live Demo: Diffusion"
- "Switch to terminal"
- Code block: `/think_deep "Compare STORM and Diffusion architectures"`
- Hint: "Watch: Initial draft → Gap detection → Iterations → Final report"

**17-benchmarks.tsx** — `steps: 5`
- "The Results" heading
- Step 1: Big animated number "74.5% WIN RATE" (Google Diffusion vs OpenAI)
- Steps 2-5 reveal "Why?" table rows:
  - Iterative refinement → catches gaps
  - Evidence-based completion → no premature stopping
  - Self-balancing → right-sized research
  - Isolated sub-agents → independent perspectives
- Alternative: could also embed `<RACEMetrics />` at step 5

**18-takeaways.tsx** — `steps: 7`
- "What You Can Apply Today"
- Steps 1-7 reveal each takeaway:
  1. Start with a draft
  2. Completion = evidence, not aesthetics
  3. Information first, generation second
  4. Isolate sub-agent contexts
  5. Deduplicate by URL
  6. Cap iterations (15) and concurrency (3)
  7. Compress findings, preserve everything

**19-resources.tsx** — `steps: 0`
- "Questions?" large heading
- Divider
- "Go Deeper" section with 4 resource links:
  - Blog post: addcommitpush.io/blog/diffusion-deep-research
  - Go implementation: github.com
  - STORM: github.com/stanford-oval/storm
  - Leaderboard: huggingface
- Divider
- "Emil Wåreus | addcommitpush.io"

### Slide Component Pattern:

Every slide follows the same structure:

```tsx
'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

export function ExampleSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl font-bold mb-12">Heading</h2>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 10 }}
        transition={{ duration: 0.3 }}
      >
        First reveal item
      </motion.div>
    </div>
  );
}
```

Slides that embed auto-animating blog components don't need `useSlideStep`:

```tsx
'use client';

import { DiffusionOverview } from '@/components/animations/diffusion';

export function DiffusionArchitectureSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <DiffusionOverview className="w-full" />
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` succeeds (all 19 routes generated)
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Each of the 19 slides renders correct content
- [ ] Step-based slides (03, 04, 06, 07, 08, 09, 11, 12, 17, 18) reveal items on ArrowRight
- [ ] ArrowLeft within a stepped slide goes back a step
- [ ] Slides with embedded blog components (13, 14, 15) render and animate
- [ ] Fade transitions work between all slides
- [ ] Progress bar is accurate
- [ ] Full presentation can be navigated start to finish

---

## Phase 3: Polish & Verification

### Overview

Final verification, build test, and any styling adjustments.

### Changes Required:

#### 1. Redirect from base path

**File**: `app/presentations/deep-research/page.tsx` (new)

Redirect `/presentations/deep-research` to `/presentations/deep-research/01-title`:

```typescript
import { redirect } from 'next/navigation';

export const dynamic = 'error';

export default function PresentationIndex() {
  redirect('/presentations/deep-research/01-title');
}
```

#### 2. Build verification

Run `pnpm build` and confirm:
- All 19 slide routes are statically generated
- No TypeScript errors
- No lint errors
- Bundle size is reasonable

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` succeeds with 19 slide routes + redirect route
- [x] `pnpm lint` passes
- [x] No TypeScript errors

#### Manual Verification:
- [ ] `/presentations/deep-research` redirects to `/presentations/deep-research/01-title`
- [ ] Complete run-through of all 19 slides with keyboard navigation
- [ ] No visual regressions on the blog (root layout unmodified)

---

## Testing Strategy

### Automated:
- `pnpm build` — validates all static params generate correctly
- `pnpm lint` — code quality
- TypeScript compilation via the build step

### Manual Testing Steps:
1. Navigate to `/presentations/deep-research/01-title`
2. Press ArrowRight through all 19 slides, verifying content and step animations
3. Press ArrowLeft back to slide 1
4. Verify slides 13, 14, 15 show the blog's animation components running
5. Verify progress bar updates correctly
6. Verify slide counter shows correct numbers
7. Navigate to `/presentations/deep-research` and confirm redirect
8. Navigate to `/` and confirm blog is unaffected
9. Check that Space bar also advances slides

## Performance Considerations

- Dynamic imports ensure each slide's JS is code-split — only the current slide's bundle loads
- Existing animation components use `useInView` which may need viewport intersection — since presentation slides are fullscreen and visible, this should work automatically
- Framer Motion `AnimatePresence` with `mode="wait"` ensures clean transitions without DOM thrashing
- 19 static pages are tiny — no performance concern for build time

## File Structure Summary

```
NEW FILES:

lib/presentations/
└── deep-research.ts                    # Slide registry

app/presentations/deep-research/
├── layout.tsx                          # Client: keyboard nav, steps, progress
├── page.tsx                            # Redirect to 01-title
└── [slide]/
    └── page.tsx                        # Server: generateStaticParams, dynamic imports

components/presentations/deep-research/slides/
├── 01-title.tsx
├── 02-group-project.tsx
├── 03-the-result.tsx
├── 04-the-reveal.tsx
├── 05-about.tsx
├── 06-audience-poll.tsx
├── 07-timeline.tsx
├── 08-storm-intro.tsx
├── 09-storm-architecture.tsx
├── 10-storm-demo.tsx
├── 11-limitation.tsx
├── 12-diffusion-insight.tsx
├── 13-diffusion-architecture.tsx
├── 14-loop-visualized.tsx
├── 15-parallel-agents.tsx
├── 16-diffusion-demo.tsx
├── 17-benchmarks.tsx
├── 18-takeaways.tsx
└── 19-resources.tsx

MODIFIED FILES: None.
```

## References

- Research document: `thoughts/shared/research/2026-02-02_15-31-59_presentation-architecture.md`
- Presentation outline: `presentations/deep-research/outline.txt`
- Website plan: `presentations/deep-research/website-plan.md`
- Blog route pattern: `app/blog/[slug]/page.tsx`
- Slide registry pattern: `lib/posts.ts`
- Reusable animations: `components/animations/diffusion/index.ts`
