# Blog Typography Components Implementation Plan

## Overview

Create custom typography components in `/components/custom/` to enhance blog post rendering with polished, professional styling that maintains the existing synthwave/neon aesthetic. These components will replace bare HTML elements (h1-h6, ul, li, blockquote) with styled, reusable Server Components that integrate seamlessly with the existing Tailwind v4 design system.

**Philosophy**: Code is the content management system. No MDX, no external content files - all blog posts are pure TypeScript/JSX code.

## Current State Analysis

### What Exists Now

**Blog Post Implementation** (`app/(site)/blog/[slug]/page.tsx:105-326`):

- Hardcoded JSX content with plain HTML elements
- Prose classes applied to wrapper div only
- Basic Tailwind prose utilities: `prose-headings:text-primary`, `prose-a:text-secondary`
- No custom typography components
- Single post: "Recruiting engineers as a startup"

**Design System** (`app/globals.css:140-154`):

- OKLCH color palette with semantic tokens
- Custom neon effects: `.neon-glow`, `.neon-border`, `.grid-bg`
- Primary font: Space Grotesk
- Existing component patterns: CVA variants, cn() utility, shadcn/ui structure

**Component Architecture** (`/components/`):

- Two-tier structure: `/ui/` (primitives) and root (features)
- Server Components by default
- TypeScript strict mode
- Existing primitives: button, card, badge, slider

### Key Constraints Discovered

1. **No MDX**: All blog posts are pure code - no markdown processing needed
2. **Server Components**: No client-side JavaScript for typography (performance)
3. **Existing patterns**: Must follow CVA + cn() utility conventions
4. **Design tokens**: Must use semantic color variables (--primary, --secondary, etc.)
5. **Responsive**: Mobile-first responsive typography required

## Desired End State

### What Success Looks Like

After implementation:

1. **6 new reusable components** in `/components/custom/`:
   - BlogHeading (h1-h6 with neon effects)
   - BlogList (styled ul/ol with custom bullets)
   - BlogListItem (items with icon support)
   - Citation (blockquotes with neon border)
   - Callout (info boxes with 4 variants)
   - Figure (image wrapper with captions)

2. **Updated blog post** (`app/(site)/blog/[slug]/page.tsx`):
   - Imports custom components from `@/components/custom`
   - All headings use `<BlogHeading>`
   - All lists use `<BlogList>` and `<BlogListItem>`
   - Enhanced visual hierarchy with neon glows
   - Professional, polished appearance

3. **Barrel export** (`/components/custom/index.ts`):
   - Clean single import: `import { BlogHeading, BlogList, ... } from "@/components/custom"`

### Verification

#### Automated Verification:

- [x] Build succeeds: `pnpm build`
- [ ] No linting errors: `pnpm lint` (eslint not configured - skipped)
- [x] Type checks pass: `pnpm exec tsc --noEmit`
- [x] Dev server runs: `pnpm dev`

#### Manual Verification:

- [ ] Navigate to `http://localhost:3000/blog/recruiting-engineers-as-a-startup`
- [ ] H1 headings display with strong neon glow effect
- [ ] H2 headings have decorative bottom border with glow
- [ ] H3 headings have subtle styling
- [ ] List items show chevron icons in neon pink
- [ ] Ordered lists have cyan numbered markers
- [ ] All typography is responsive (test mobile, tablet, desktop)
- [ ] No visual regressions on home page or blog list
- [ ] Spacing and vertical rhythm look polished

## What We're NOT Doing

**Explicitly out of scope:**

- ❌ MDX integration or markdown processing
- ❌ Syntax-highlighted code blocks (CodeBlock component)
- ❌ Content management system or CMS integration
- ❌ Multiple blog posts (only updating the existing one)
- ❌ RSS/Atom feed generation
- ❌ Sitemap updates
- ❌ AudioPlayer integration (already exists, separate concern)
- ❌ Animations or entrance effects (keep it simple)
- ❌ Dark mode toggle (already handled globally)
- ❌ Search or filtering functionality

## Implementation Approach

### Strategy

Build components in **two phases** based on priority and dependencies:

1. **Phase 1 (Core Typography)**: Immediate visual impact - headings and lists
2. **Phase 2 (Content Enhancement)**: Supporting components - citations, callouts, figures

Each component will:

- Follow established shadcn/ui patterns (CVA variants, props interfaces)
- Use Server Components (no "use client" directive)
- Integrate with existing design tokens
- Include full TypeScript types
- Support className override via cn() utility

### Technical Approach

- **CVA for variants**: Type-safe variant management (e.g., heading levels, list types)
- **Polymorphic components**: Use `React.createElement()` for h1-h6, ul/ol flexibility
- **Design system tokens**: Reference semantic colors (text-primary, bg-card, etc.)
- **Responsive classes**: Mobile-first Tailwind breakpoints (sm:, md:, lg:)
- **Accessibility**: Semantic HTML, ARIA roles, proper heading hierarchy

---

## Phase 1: Core Typography Components

### Overview

Build the foundational typography components that provide immediate visual impact: BlogHeading, BlogList, and BlogListItem. These replace the most common HTML elements in blog posts and establish the enhanced visual hierarchy.

**Estimated effort**: 2-3 hours

### Changes Required

#### 1. Create `/components/custom/` directory

**Action**: Create new directory for custom blog components

```bash
mkdir -p /Users/emilwareus/Development/addcommitpush.io/components/custom
```

---

#### 2. BlogHeading Component

**File**: `/components/custom/blog-heading.tsx` (new file)

**Purpose**: Polymorphic heading component (h1-h6) with neon effects and responsive sizing

**Full Implementation**:

```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const headingVariants = cva('font-bold text-balance scroll-mt-20', {
  variants: {
    level: {
      1: 'text-3xl sm:text-4xl md:text-5xl text-primary neon-glow mt-0 mb-8',
      2: 'text-2xl sm:text-3xl md:text-4xl text-primary neon-glow mt-12 mb-6 pb-3 border-b border-primary/30',
      3: 'text-xl sm:text-2xl md:text-3xl text-primary mt-10 mb-5',
      4: 'text-lg sm:text-xl md:text-2xl text-foreground mt-8 mb-4',
      5: 'text-base sm:text-lg md:text-xl text-foreground mt-6 mb-3',
      6: 'text-sm sm:text-base md:text-lg text-muted-foreground mt-4 mb-2',
    },
  },
  defaultVariants: {
    level: 1,
  },
});

export interface BlogHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export function BlogHeading({ level, className, children, id, ...props }: BlogHeadingProps) {
  const Comp = `h${level}` as const;

  return React.createElement(
    Comp,
    {
      id,
      className: cn(headingVariants({ level }), className),
      ...props,
    },
    children
  );
}
```

**Key features**:

- CVA variants for all 6 heading levels
- Neon glow on h1 and h2 (uses existing `.neon-glow` class)
- H2 has decorative border-bottom with primary/30 opacity
- Responsive sizing: mobile → tablet → desktop
- `scroll-mt-20` for anchor link offset
- `text-balance` for better line wrapping
- Polymorphic: creates actual h1-h6 elements

---

#### 3. BlogList Component

**File**: `/components/custom/blog-list.tsx` (new file)

**Purpose**: Polymorphic list component (ul/ol) with custom styling

**Full Implementation**:

```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const listVariants = cva('my-6 space-y-2', {
  variants: {
    variant: {
      unordered: 'list-none pl-0',
      ordered: 'list-decimal pl-6 marker:text-primary marker:font-bold',
      checklist: 'list-none pl-0',
    },
  },
  defaultVariants: {
    variant: 'unordered',
  },
});

export interface BlogListProps
  extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement>,
    VariantProps<typeof listVariants> {
  variant?: 'unordered' | 'ordered' | 'checklist';
}

export function BlogList({ variant = 'unordered', className, children, ...props }: BlogListProps) {
  const Comp = variant === 'ordered' ? 'ol' : 'ul';

  return React.createElement(
    Comp,
    {
      className: cn(listVariants({ variant }), className),
      ...props,
    },
    children
  );
}
```

**Key features**:

- Polymorphic: creates `<ul>` or `<ol>` based on variant
- Unordered lists: reset default bullets (custom icons via BlogListItem)
- Ordered lists: cyan numbered markers with bold font
- Consistent spacing: `space-y-2` between items
- `my-6` for vertical rhythm with surrounding content

---

#### 4. BlogListItem Component

**File**: `/components/custom/blog-list-item.tsx` (new file)

**Purpose**: List item with optional icon and proper layout

**Full Implementation**:

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

export interface BlogListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  icon?: React.ReactNode
}

export function BlogListItem({
  icon,
  className,
  children,
  ...props
}: BlogListItemProps) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 text-foreground leading-relaxed my-3",
        className
      )}
      {...props}
    >
      <span className="text-secondary mt-1 flex-shrink-0" aria-hidden="true">
        {icon || <ChevronRight className="w-4 h-4" />}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  )
}
```

**Key features**:

- Default chevron icon from lucide-react
- Icon color: secondary (neon pink)
- Flexbox layout: icon + text
- `flex-shrink-0` prevents icon distortion
- `items-start` aligns icon to first line
- `gap-3` for spacing between icon and text
- `leading-relaxed` for readability

---

#### 5. Barrel Export

**File**: `/components/custom/index.ts` (new file)

**Purpose**: Clean single import for all custom components

**Full Implementation**:

```typescript
export { BlogHeading } from './blog-heading';
export { BlogList } from './blog-list';
export { BlogListItem } from './blog-list-item';
```

---

#### 6. Update Blog Post to Use Phase 1 Components

**File**: `app/(site)/blog/[slug]/page.tsx`

**Changes**:

1. Add import at top of file (after existing imports, around line 8)
2. Replace all `<h1>`, `<h2>`, `<h3>` elements with `<BlogHeading>`
3. Replace all `<ul>` with `<BlogList variant="unordered">`
4. Replace all `<li>` with `<BlogListItem>`

**Add import** (line 8):

```typescript
import { BlogHeading, BlogList, BlogListItem } from '@/components/custom';
```

**Example transformations** (lines 114-326):

**Before**:

```tsx
<h1>Intro</h1>
<p>As someone who's worked as a data lead...</p>

<h3>What will you get to read</h3>
<ul>
  <li>Recruitment process</li>
  <li>How I evaluate candidates</li>
  <li>How to find good candidates</li>
</ul>
```

**After**:

```tsx
<BlogHeading level={1}>Intro</BlogHeading>
<p>As someone who's worked as a data lead...</p>

<BlogHeading level={3}>What will you get to read</BlogHeading>
<BlogList variant="unordered">
  <BlogListItem>Recruitment process</BlogListItem>
  <BlogListItem>How I evaluate candidates</BlogListItem>
  <BlogListItem>How to find good candidates</BlogListItem>
</BlogList>
```

**Full replacement guide**:

- Line 114: `<h1>Intro</h1>` → `<BlogHeading level={1}>Intro</BlogHeading>`
- Line 123: `<h3>What will you get to read</h3>` → `<BlogHeading level={3}>What will you get to read</BlogHeading>`
- Lines 125-129: Wrap in `<BlogList>`, convert `<li>` to `<BlogListItem>`
- Line 136: `<h1>The process</h1>` → `<BlogHeading level={1}>The process</BlogHeading>`
- Line 138: `<h2>Interview with you</h2>` → `<BlogHeading level={2}>Interview with you</BlogHeading>`
- Line 178: `<h3>Case</h3>` → `<BlogHeading level={3}>Case</BlogHeading>`
- Line 216: `<h3>Second interview</h3>` → `<BlogHeading level={3}>Second interview</BlogHeading>`
- Line 242: `<h3>Close the candidate</h3>` → `<BlogHeading level={3}>Close the candidate</BlogHeading>`
- Line 250: `<h1>How do I find good candidates</h1>` → `<BlogHeading level={1}>How do I find good candidates</BlogHeading>`
- Line 252: `<h3>Collaboration with my local Uni</h3>` → `<BlogHeading level={3}>Collaboration with my local Uni</BlogHeading>`
- Line 276: `<h3>Friends</h3>` → `<BlogHeading level={3}>Friends</BlogHeading>`
- Line 294: `<h3>Generate a good reputation</h3>` → `<BlogHeading level={3}>Generate a good reputation</BlogHeading>`
- Line 311: `<h1>TL;DR + Conclusion</h1>` → `<BlogHeading level={1}>TL;DR + Conclusion</BlogHeading>`

**All unordered lists** (multiple locations):

- Lines 146-157: List of candidate traits → `<BlogList>` + `<BlogListItem>`
- Other lists throughout document

---

### Phase 1 Success Criteria

#### Automated Verification:

- [ ] Build succeeds: `pnpm build`
- [ ] No linting errors: `pnpm lint`
- [ ] Type checks pass: `pnpm exec tsc --noEmit`
- [ ] Dev server starts: `pnpm dev`
- [ ] No console errors in browser

#### Manual Verification:

- [ ] Navigate to `http://localhost:3000/blog/recruiting-engineers-as-a-startup`
- [ ] All H1 headings ("Intro", "The process", "How do I find good candidates", "TL;DR + Conclusion") display with strong neon glow
- [ ] All H2 headings ("Interview with you") have decorative bottom border with cyan glow
- [ ] All H3 headings have cyan color without glow
- [ ] All unordered lists show neon pink chevron icons to the left of text
- [ ] List items have proper spacing and alignment
- [ ] Headings are responsive: smaller on mobile, larger on desktop
- [ ] Visual hierarchy is clear: h1 > h2 > h3
- [ ] No layout shifts or broken spacing
- [ ] Typography looks polished and professional

---

## Phase 2: Content Enhancement Components

### Overview

Build supporting components for richer content: Citation (blockquotes), Callout (info boxes), and Figure (image captions). These provide additional formatting options for future blog posts and enhance the existing post where appropriate.

**Estimated effort**: 2 hours

### Changes Required

#### 1. Citation Component

**File**: `/components/custom/citation.tsx` (new file)

**Purpose**: Blockquote with neon border and optional author attribution

**Full Implementation**:

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface CitationProps extends React.HTMLAttributes<HTMLElement> {
  author?: string
  source?: string
}

export function Citation({
  author,
  source,
  className,
  children,
  ...props
}: CitationProps) {
  return (
    <figure className={cn("my-8", className)} {...props}>
      <blockquote className="relative pl-6 pr-4 py-4 border-l-4 border-secondary neon-border bg-card/30 rounded-r-lg">
        <p className="text-muted-foreground italic text-lg leading-relaxed">
          {children}
        </p>
      </blockquote>
      {(author || source) && (
        <figcaption className="mt-3 pl-6 text-sm text-accent">
          — {author}
          {source && <cite className="ml-2 text-muted-foreground not-italic">({source})</cite>}
        </figcaption>
      )}
    </figure>
  )
}
```

**Key features**:

- Semantic HTML: `<figure>`, `<blockquote>`, `<cite>`
- Neon border on left (border-secondary + neon-border class)
- Card background with 30% opacity
- Italic quote text in muted foreground
- Optional author/source attribution
- Rounded right corners

---

#### 2. Callout Component

**File**: `/components/custom/callout.tsx` (new file)

**Purpose**: Information boxes with 4 variants and icons

**Full Implementation**:

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Info, AlertTriangle, Lightbulb, FileText } from "lucide-react"

const calloutVariants = cva(
  "my-6 p-5 rounded-lg border-l-4 bg-card/50 backdrop-blur",
  {
    variants: {
      variant: {
        info: "border-primary text-foreground",
        warning: "border-yellow-500 text-foreground",
        tip: "border-green-500 text-foreground",
        note: "border-accent text-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
  note: FileText,
}

export interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  variant?: 'info' | 'warning' | 'tip' | 'note'
  title?: string
  icon?: React.ReactNode
}

export function Callout({
  variant = "info",
  title,
  icon,
  className,
  children,
  ...props
}: CalloutProps) {
  const Icon = icon || iconMap[variant]

  return (
    <div
      className={cn(calloutVariants({ variant }), className)}
      role="note"
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="text-current mt-0.5" aria-hidden="true">
          {typeof Icon === 'function' ? <Icon className="w-5 h-5" /> : Icon}
        </span>
        <div className="flex-1">
          {title && (
            <h4 className="font-bold mb-2 text-foreground">{title}</h4>
          )}
          <div className="text-muted-foreground leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Key features**:

- 4 CVA variants: info (cyan), warning (yellow), tip (green), note (purple)
- Auto-selected icons from lucide-react
- Custom icon override support
- Optional title
- ARIA role="note" for accessibility
- Card background with backdrop blur
- Color-coded left border

---

#### 3. Figure Component

**File**: `/components/custom/figure.tsx` (new file)

**Purpose**: Image wrapper with caption and Next.js Image optimization

**Full Implementation**:

```typescript
import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface FigureProps extends React.HTMLAttributes<HTMLElement> {
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
  priority?: boolean
}

export function Figure({
  src,
  alt,
  caption,
  width = 1200,
  height = 630,
  priority = false,
  className,
  ...props
}: FigureProps) {
  return (
    <figure className={cn("my-12 rounded-lg overflow-hidden", className)} {...props}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto"
        priority={priority}
      />
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-3">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
```

**Key features**:

- Wraps Next.js Image component
- Default 1200x630 dimensions (blog post standard)
- Optional caption with centered text
- Rounded corners with overflow-hidden
- Priority prop for above-fold images
- Semantic HTML: `<figure>`, `<figcaption>`

---

#### 4. Update Barrel Export

**File**: `/components/custom/index.ts`

**Changes**: Add new exports

```typescript
export { BlogHeading } from './blog-heading';
export { BlogList } from './blog-list';
export { BlogListItem } from './blog-list-item';
export { Citation } from './citation';
export { Callout } from './callout';
export { Figure } from './figure';
```

---

#### 5. Update Blog Post to Use Phase 2 Components (Optional)

**File**: `app/(site)/blog/[slug]/page.tsx`

**Changes**:

1. Update import to include Phase 2 components (line 8)
2. Optionally replace existing `<figure>` with `<Figure>` component (lines 90-102)
3. Optionally add `<Callout>` for the note on line 131-134

**Update import** (line 8):

```typescript
import {
  BlogHeading,
  BlogList,
  BlogListItem,
  Citation,
  Callout,
  Figure,
} from '@/components/custom';
```

**Optional: Replace cover image figure** (lines 90-102):

**Before**:

```tsx
<figure className="mb-12 rounded-lg overflow-hidden">
  <Image
    src="/posts/recruiting-engineers-as-a-startup/cover.png"
    alt="Synthwave hacker, engineering recruitment"
    width={1200}
    height={630}
    className="w-full h-auto"
    priority
  />
  <figcaption className="text-sm text-muted-foreground text-center mt-3">
    Great engineer to recruit
  </figcaption>
</figure>
```

**After**:

```tsx
<Figure
  src="/posts/recruiting-engineers-as-a-startup/cover.png"
  alt="Synthwave hacker, engineering recruitment"
  width={1200}
  height={630}
  caption="Great engineer to recruit"
  priority
/>
```

**Optional: Add callout** (after line 134):

```tsx
<Callout variant="note" title="Important">
  This blogpost is written from the perspective of a head/VP of engineering, CTO, or similar at a
  small startup.
</Callout>
```

---

### Phase 2 Success Criteria

#### Automated Verification:

- [x] Build succeeds: `pnpm build`
- [ ] No linting errors: `pnpm lint` (eslint not configured - skipped)
- [x] Type checks pass: `pnpm exec tsc --noEmit`
- [x] Dev server runs: `pnpm dev`
- [ ] No console errors in browser

#### Manual Verification:

- [ ] Citation component displays with neon pink left border
- [ ] Callout variants render with correct colors (info=cyan, warning=yellow, tip=green, note=purple)
- [ ] Callout icons appear and are properly aligned
- [ ] Figure component wraps images with captions correctly
- [ ] Cover image (if updated) still displays properly
- [ ] All Phase 2 components are responsive
- [ ] Typography and spacing remain consistent

---

## Testing Strategy

### Unit Testing

Not required for this implementation - these are presentational Server Components with no logic. Visual verification is sufficient.

### Manual Testing Steps

**Complete walkthrough** (after both phases):

1. **Start dev server**:

   ```bash
   pnpm dev
   ```

2. **Navigate to blog post**:
   - Open `http://localhost:3000/blog/recruiting-engineers-as-a-startup`
   - Verify page loads without errors

3. **Test headings hierarchy**:
   - Scroll through entire post
   - Verify all h1 headings have strong neon glow
   - Verify all h2 headings have border-bottom + glow
   - Verify all h3 headings are cyan without glow
   - Check that spacing above/below headings looks balanced

4. **Test lists**:
   - Verify all bullet lists show chevron icons
   - Check icon alignment with multi-line list items
   - Verify ordered lists (if any) show cyan numbers
   - Check spacing between list items

5. **Test responsive behavior**:
   - Resize browser window: mobile → tablet → desktop
   - Verify heading sizes scale appropriately
   - Verify layout doesn't break at any breakpoint
   - Test on actual mobile device if possible

6. **Test Phase 2 components** (if added):
   - Verify Citation has neon border
   - Test all 4 Callout variants
   - Check Figure captions

7. **Check for regressions**:
   - Navigate to home page `/`
   - Verify blog card still displays correctly
   - Navigate to `/blog`
   - Verify blog list page works

8. **Verify build**:
   ```bash
   pnpm build
   ```

   - Ensure static generation succeeds
   - Check for any build warnings

## Performance Considerations

### Server Components

All custom components are Server Components (no "use client" directive):

- **Zero client JavaScript**: No runtime overhead for typography
- **Static HTML**: All styling rendered at build time
- **Optimal bundle size**: Components don't increase client bundle

### Tailwind CSS

- **Purging**: Unused classes automatically removed in production build
- **No runtime**: All styles compiled to CSS at build time
- **Minimal CSS**: Only used classes included in final bundle

### Image Optimization

Figure component uses Next.js Image:

- Automatic responsive images
- Lazy loading by default
- WebP conversion
- Optimized serving

## Migration Notes

### For Future Blog Posts

When creating new blog posts:

1. **Import components**:

   ```typescript
   import {
     BlogHeading,
     BlogList,
     BlogListItem,
     Citation,
     Callout,
     Figure,
   } from '@/components/custom';
   ```

2. **Use semantic heading levels**:
   - One h1 per post (main title in header)
   - Section headings: h1 (for major sections)
   - Subsections: h2
   - Minor headings: h3

3. **Lists best practices**:
   - Use `<BlogList variant="unordered">` for bullet lists
   - Use `<BlogList variant="ordered">` for numbered lists
   - Each item: `<BlogListItem>content</BlogListItem>`
   - Custom icons: `<BlogListItem icon={<Star />}>content</BlogListItem>`

4. **Callouts for emphasis**:
   - Info: general information
   - Warning: cautions or gotchas
   - Tip: helpful hints
   - Note: side notes or context

5. **Images with captions**:
   - Use `<Figure>` for all images that need captions
   - Use `priority` prop for above-fold images
   - Always include descriptive `alt` text

### No Breaking Changes

This implementation is **purely additive**:

- No existing files deleted
- No breaking changes to existing components
- Blog card, navigation, other pages unaffected
- Existing blog post structure preserved (only JSX elements replaced)

## References

- Original research: `.claude/research/2025-11-07_blog-post-rendering-improvement-plan.md`
- Current blog post: `app/(site)/blog/[slug]/page.tsx:105-326`
- Design system: `app/globals.css:140-154` (neon effects)
- Component patterns: `components/ui/badge.tsx:7-26` (CVA example)
- Existing utilities: `lib/utils.ts:4` (cn function)
- Color tokens: `app/globals.css:6-53` (OKLCH palette)

---

**Status**: Ready for implementation
**Total Estimated Effort**: 4-5 hours (Phase 1: 2-3h, Phase 2: 2h)
**Risk Level**: Low (additive, no breaking changes, Server Components only)
**Dependencies**: None (uses existing design system and patterns)
