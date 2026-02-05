---
date: 2026-02-02T15:31:59Z
researcher: Claude
git_commit: 021f5410503cdadb8250593764173295994ad0e8
branch: presentation/deep-research
repository: addcommitpush.io
topic: "How to build a React-based presentation system as a sub-page of the blog"
tags: [research, codebase, presentation, nextjs, app-router, keyboard-navigation, slides]
status: complete
last_updated: 2026-02-02
last_updated_by: Claude
---

# Research: React Presentation System Architecture

**Date**: 2026-02-02T15:31:59Z
**Researcher**: Claude
**Git Commit**: 021f5410503cdadb8250593764173295994ad0e8
**Branch**: presentation/deep-research
**Repository**: addcommitpush.io

## Research Question

How to create a React-based presentation for "Deep Research Agents" as a sub-page of the blog, with keyboard navigation (arrow keys), per-slide URLs, intermediate animations, and reusing existing blog components.

## Summary

The presentation should live at `app/presentations/deep-research/[slide]/page.tsx` using Next.js App Router's dynamic routing. Each slide gets its own URL (e.g., `/presentations/deep-research/01-title`), is a statically generated page, and shares a presentation layout with keyboard navigation. The existing 6 diffusion animation components from `components/animations/diffusion/` can be imported directly. A new presentation layout wraps all slides with arrow-key navigation, progress indicator, and slide transitions via Framer Motion. No new dependencies are needed — Framer Motion and Lucide React are already installed.

## Detailed Findings

### 1. Route Architecture

**Recommended structure:**

```
app/presentations/deep-research/
├── layout.tsx                    # Presentation layout (keyboard nav, progress bar, transitions)
├── [slide]/
│   └── page.tsx                  # Dynamic route that resolves slide slug to component
```

**Why this structure:**
- `layout.tsx` persists across slide navigations — keyboard listeners, progress bar, and transition wrappers don't remount
- `[slide]/page.tsx` handles static generation via `generateStaticParams()` returning all slide slugs
- Each slide gets a URL like `/presentations/deep-research/01-title`
- The layout can use `usePathname()` to determine the current slide index for navigation

**Static generation enforcement:**
```typescript
// app/presentations/deep-research/[slide]/page.tsx
export const dynamic = 'error';
export const revalidate = false;
```

**Alternative considered (single page with hash routing):** Would mean a single URL for the whole presentation, losing the per-slide URL requirement. Rejected.

### 2. Slide Registry

Create a slide registry similar to `lib/posts.ts` but for presentation slides:

**File:** `lib/presentations/deep-research.ts`

```typescript
interface Slide {
  slug: string;        // "01-title", "02-group-project", etc.
  title: string;       // Human-readable title
  notes?: string;      // Speaker notes (not rendered, but available)
}

// Ordered array — the index IS the slide order
const slides: Slide[] = [
  { slug: '01-title', title: 'Deep Research Agents' },
  { slug: '02-group-project', title: 'The Group Project Problem' },
  { slug: '03-the-result', title: 'The Result' },
  { slug: '04-the-reveal', title: 'The AI Connection' },
  { slug: '05-about', title: 'Emil Wåreus' },
  { slug: '06-audience-poll', title: 'Quick Poll' },
  { slug: '07-timeline', title: 'Evolution of Research Agents' },
  { slug: '08-storm-intro', title: 'STORM: Multi-Perspective Research' },
  { slug: '09-storm-architecture', title: 'STORM: Four Phases' },
  { slug: '10-storm-demo', title: 'Live Demo: STORM' },
  { slug: '11-limitation', title: 'The Problem with Linear Pipelines' },
  { slug: '12-diffusion-insight', title: 'Research as Diffusion' },
  { slug: '13-diffusion-architecture', title: 'Diffusion Deep Research' },
  { slug: '14-loop-visualized', title: 'The Draft Evolves' },
  { slug: '15-parallel-agents', title: 'Parallel Research, Isolated Contexts' },
  { slug: '16-diffusion-demo', title: 'Live Demo: Diffusion' },
  { slug: '17-benchmarks', title: 'Why Diffusion Wins' },
  { slug: '18-takeaways', title: 'What You Can Apply Today' },
  { slug: '19-resources', title: 'Questions & Resources' },
];

export function getAllSlides() { return slides; }
export function getSlideBySlug(slug: string) { return slides.find(s => s.slug === slug) ?? null; }
export function getAllSlideSlugs() { return slides.map(s => s.slug); }
export function getSlideIndex(slug: string) { return slides.findIndex(s => s.slug === slug); }
export function getAdjacentSlugs(slug: string) {
  const idx = getSlideIndex(slug);
  return {
    prev: idx > 0 ? slides[idx - 1].slug : null,
    next: idx < slides.length - 1 ? slides[idx + 1].slug : null,
  };
}
```

### 3. Presentation Layout (Keyboard Navigation + Transitions)

**File:** `app/presentations/deep-research/layout.tsx`

This is the critical piece — a **Client Component** layout that:

1. Listens for `ArrowRight`/`ArrowLeft` keydown events
2. Uses `useRouter()` and `usePathname()` from `next/navigation` to navigate between slides
3. Renders a minimal progress indicator (dots or bar)
4. Provides slide transition animations via Framer Motion's `AnimatePresence`
5. Hides the main site Navigation component (or overrides it with a minimal presentation nav)

```typescript
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { getAllSlides, getSlideIndex, getAdjacentSlugs } from '@/lib/presentations/deep-research';

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSlug = pathname.split('/').pop() ?? '';
  const slides = getAllSlides();
  const currentIndex = getSlideIndex(currentSlug);
  const { prev, next } = getAdjacentSlugs(currentSlug);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && next) {
      router.push(`/presentations/deep-research/${next}`);
    } else if (e.key === 'ArrowLeft' && prev) {
      router.push(`/presentations/deep-research/${prev}`);
    }
  }, [router, prev, next]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Slide content */}
      <div className="h-full flex items-center justify-center">
        {children}
      </div>

      {/* Slide counter */}
      <div className="fixed bottom-4 right-4 text-sm text-muted-foreground z-50">
        {currentIndex + 1} / {slides.length}
      </div>
    </div>
  );
}
```

**Key decisions:**
- `fixed inset-0` makes the presentation fullscreen within the viewport
- The root layout's `<Navigation />` component will still render — the presentation layout uses `fixed inset-0` to visually cover it
- `overflow-hidden` prevents scrolling between slides; each slide must fit in one viewport
- Transition animations can be added with Framer Motion's `motion.div` + `key={pathname}` for exit/enter animations

### 4. Navigation Considerations

**Problem:** The root `app/layout.tsx` always renders `<Navigation />`. For the presentation, we want either no nav or a minimal one.

**Options:**

A. **CSS override in the presentation layout** — Use `fixed inset-0 z-40` to cover the nav. The nav still renders but is hidden behind the presentation. Simple and requires no changes to root layout.

B. **Conditional rendering in root layout** — Check the pathname and conditionally hide Navigation. Requires making the root layout a Client Component or passing a prop. Not recommended — adds complexity to root layout.

C. **Route group** — Move presentations into a route group `app/(presentation)/presentations/...` with its own layout that doesn't include `<Navigation />`. Clean separation.

**Recommended: Option A** for simplicity (no root layout changes needed), with option to refactor to C later if more presentations are added.

### 5. Slide Components

Each slide is a React component in `components/presentations/deep-research/slides/`:

```
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
```

Each exports a default component:

```tsx
// components/presentations/deep-research/slides/01-title.tsx
export function TitleSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <h1 className="text-6xl md:text-8xl font-bold mb-6">
        Deep Research Agents
      </h1>
      <p className="text-xl md:text-2xl text-muted-foreground mb-4">
        Architecture Walkthrough
      </p>
      <p className="text-lg text-muted-foreground">
        Emil Wåreus · Foo Cafe Malmo · Feb 5, 2026
      </p>
    </div>
  );
}
```

### 6. Intermediate Animations

For step-by-step reveals within a single slide (e.g., bullet points appearing one-by-one), two approaches:

**Approach A: Arrow key triggers animation steps before navigating**

The keyboard handler tracks an internal "step" counter per slide. ArrowRight first advances internal steps; once all steps are revealed, the next ArrowRight navigates to the next slide.

```typescript
// In the presentation layout or a custom hook
const [step, setStep] = useState(0);
const maxSteps = slideStepCounts[currentSlug] ?? 0;

const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (e.key === 'ArrowRight') {
    if (step < maxSteps) {
      setStep(s => s + 1);  // Reveal next animation step
    } else if (next) {
      setStep(0);
      router.push(`/presentations/deep-research/${next}`);
    }
  } else if (e.key === 'ArrowLeft') {
    if (step > 0) {
      setStep(s => s - 1);  // Go back one animation step
    } else if (prev) {
      router.push(`/presentations/deep-research/${prev}`);
    }
  }
}, [step, maxSteps, router, prev, next]);
```

Each slide component receives `step` as a prop and conditionally renders elements:

```tsx
export function ResultSlide({ step }: { step: number }) {
  const items = ['Repetitive', 'Inconsistent', 'Different tones', 'Varying quality', 'Not the grade you wanted'];
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-5xl font-bold mb-12">The result?</h2>
      <div className="space-y-4">
        {items.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: i < step ? 1 : 0, x: i < step ? 0 : -20 }}
            transition={{ duration: 0.3 }}
            className="text-2xl"
          >
            <span className="text-destructive mr-3">✗</span> {item}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

**This is the recommended approach.** It keeps the slide content declarative and the navigation logic centralized. Each slide declares its step count, and the layout manages the step state.

**Approach B: Time-based auto-animations** (already used by existing components like `DiffusionOverview`). These run independently and don't need keyboard triggers. The existing animation components already do this and can be dropped in as-is.

**Combining both:** Some slides use step-based reveals (controlled by arrow keys), while others embed auto-animating components (like `ParallelAgents`). The layout passes `step` to all slides; slides that don't use it simply ignore it.

### 7. Reusable Components from Blog

These components can be imported directly from `@/components/animations/diffusion`:

| Component | Slide | Usage |
|---|---|---|
| `DiffusionOverview` | 13-diffusion-architecture | Show 4-phase pipeline |
| `DraftDenoising` | 14-loop-visualized | Show iterative refinement |
| `ParallelAgents` | 15-parallel-agents | Show sub-agent isolation |
| `TwoStageGap` | (could add as bonus slide) | Information vs Generation gap |
| `RACEMetrics` | 17-benchmarks | Benchmark bar charts |
| `DiffusionLoopStep` | (optional deep dive) | Single iteration walkthrough |

**Sizing concern:** These components are designed for blog-width (max-w-3xl ~672px). In a fullscreen presentation, they may need a container constraint or scaling:

```tsx
<div className="max-w-4xl mx-auto w-full px-8">
  <DiffusionOverview />
</div>
```

### 8. Demo Slides

The outline includes two live demos (STORM and Diffusion). Since the user stated live demos should NOT be specific slides (they'll tab out to a terminal), the "demo" slides should be simple placeholder/instruction cards:

```tsx
export function StormDemoSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <h2 className="text-5xl font-bold mb-8">Live Demo: STORM</h2>
      <p className="text-xl text-muted-foreground mb-4">
        Switch to terminal
      </p>
      <code className="text-lg bg-muted px-4 py-2 rounded">
        /storm "What are the security implications of WebAssembly?"
      </code>
    </div>
  );
}
```

### 9. Slide Transitions

Use Framer Motion `AnimatePresence` with `mode="wait"` for cross-fade or slide transitions. The layout wraps `{children}` with a motion component keyed on the pathname:

```tsx
import { AnimatePresence, motion } from 'framer-motion';

// In the layout:
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="h-full flex items-center justify-center"
  >
    {children}
  </motion.div>
</AnimatePresence>
```

**Note:** `AnimatePresence` works with Next.js App Router but requires the children to have a unique `key` based on the route. Since `layout.tsx` doesn't re-render on route change (that's the point of layouts), the AnimatePresence needs to be in a Client Component that reads `usePathname()`.

**Important caveat:** Next.js App Router layouts DON'T get re-rendered children on navigation — the `children` prop stays the same React tree reference. To get route-based animations, a wrapper component inside the layout needs to use `usePathname()` as a key:

```tsx
function SlideTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname} ...>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### 10. Step State Management

Since the layout persists across navigations but `step` state needs to reset per slide, there are two clean approaches:

**Option A: URL search params** — Store step in `?step=2`. Advantages: shareable, back button works. Disadvantages: URL noise, requires `useSearchParams`.

**Option B: Reset on pathname change** — Use a `useEffect` that resets step to 0 when `pathname` changes. Simple and sufficient for a presentation:

```tsx
const pathname = usePathname();
const [step, setStep] = useState(0);

useEffect(() => {
  setStep(0);
}, [pathname]);
```

**Recommended: Option B.** Cleaner URLs, simpler code.

### 11. Step Count Declaration

Each slide needs to declare how many animation steps it has. Options:

**Option A: In the slide registry** — Add a `steps` field to each `Slide` object in `lib/presentations/deep-research.ts`.

**Option B: Exported from each slide component** — Each slide file exports a `STEPS` constant alongside the component.

**Recommended: Option A** — centralizes all slide metadata in one place, consistent with the blog's `lib/posts.ts` pattern.

```typescript
interface Slide {
  slug: string;
  title: string;
  steps: number;  // 0 = no intermediate animations, N = N arrow-key reveals
}
```

## Code References

- `app/layout.tsx:38-58` — Root layout with `<Navigation />` (will be visually covered by presentation)
- `app/blog/[slug]/page.tsx:10-17` — Pattern for `dynamic = 'error'` + `generateStaticParams()`
- `app/blog/[slug]/page.tsx:56-81` — Dynamic import switch pattern for code-splitting
- `components/animations/diffusion/index.ts:1-6` — Barrel export for all 6 reusable animation components
- `components/animations/diffusion/parallel-agents.tsx:41-93` — RAF-based animation example
- `components/animations/diffusion/diffusion-overview.tsx:48` — `useInView` pattern for viewport-triggered animations
- `app/globals.css:6-60` — CSS custom properties (synthwave theme) that all components inherit
- `lib/posts.ts:1-70` — Blog post registry pattern to model the slide registry after
- `lib/utils.ts:4-6` — `cn()` utility used by all components

## Architecture Insights

### Patterns to Follow
1. **Static generation with dynamic import** — Same pattern as blog: `generateStaticParams()` + switch-based dynamic import for code splitting
2. **Registry pattern** — Centralized slide metadata in `lib/presentations/deep-research.ts`, mirroring `lib/posts.ts`
3. **Client/Server boundary** — Layout is a Client Component (for keyboard events), page component is a Server Component (for static generation), slide components are Client Components (for Framer Motion animations)
4. **Barrel exports** — Slide components barrel-exported from an index file

### Patterns to Diverge From
1. **No Navigation component** — The presentation should cover/hide the site navigation
2. **Full viewport** — Unlike blog pages (scrollable, max-w-3xl), slides are `h-screen` with centered content
3. **Keyboard-driven** — Blog has no keyboard navigation; the presentation adds arrow key handling
4. **Step-based animation** — Blog animations are viewport-triggered; presentation animations are step-triggered (ArrowRight reveals next element)

### Key Technical Decisions
1. **Per-slide URLs with `[slide]` dynamic route** — Not hash-based SPA
2. **Layout-level keyboard handler** — Centralizes navigation logic, persists across slide changes
3. **Step counter with pathname-based reset** — Simple state management without URL search params
4. **CSS overlay for nav hiding** — `fixed inset-0` covers the root navigation without modifying the root layout
5. **Framer Motion for transitions** — Already a dependency, consistent with existing animation components

## Dependencies Already Available

| Package | Version | Used For |
|---|---|---|
| `framer-motion` | ^12.x | Slide transitions, step animations, existing blog animations |
| `lucide-react` | ^0.x | Icons in slides and existing components |
| `next` | 16.x | App Router, dynamic routes, static generation |
| `tailwindcss` | v4 | All styling |

No new dependencies needed.

## File Structure for Implementation

```
app/presentations/
└── deep-research/
    ├── layout.tsx                              # Client: keyboard nav, progress, transitions
    └── [slide]/
        └── page.tsx                            # Server: generateStaticParams, dynamic import

components/presentations/deep-research/
└── slides/
    ├── index.ts                                # Barrel export
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

lib/presentations/
└── deep-research.ts                            # Slide registry + utilities
```

## Open Questions

1. **Should the presentation have its own route group?** — If more presentations are added later, a `(presentation)` route group with its own layout (without `<Navigation />`) would be cleaner than CSS overlay.
2. **Presenter notes display?** — Should there be a "presenter mode" (e.g., `?presenter=true`) that shows speaker notes below the slide? The outline has extensive speaker notes.
3. **Mobile/touch support?** — Should swipe gestures be added for mobile navigation?
4. **Slide overview grid?** — The `website-plan.md` mentions ESC to show overview/grid. Is this needed for v1?
5. **Should step animations be forward-only or bidirectional?** — Currently planned as bidirectional (ArrowLeft decrements step), but forward-only is simpler.
