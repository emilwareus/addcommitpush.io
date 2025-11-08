---
date: 2025-11-07T00:00:00Z
researcher: Claude (Sonnet 4.5)
git_commit: afda235e1db82d83e810c77dd8a3baaf6c5a8787
branch: main
repository: addcommitpush.io
topic: 'Improving blog post rendering/layout with custom reusable components'
tags: [research, blog, components, typography, design-system, tailwind-v4]
status: complete
last_updated: 2025-11-07
last_updated_by: Claude (Sonnet 4.5)
---

# Research: Improving Blog Post Rendering/Layout with Custom Components

**Date**: 2025-11-07T00:00:00Z
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: afda235e1db82d83e810c77dd8a3baaf6c5a8787
**Branch**: main
**Repository**: addcommitpush.io

## Research Question

How can we improve the blog post rendering and layout at `http://localhost:3000/blog/recruiting-engineers-as-a-startup` by creating reusable custom components in `/components/custom/` that make headers, bullets, citations, and other content elements look polished and professional while maintaining the existing synthwave/neon aesthetic using Tailwind v4 styling?

## Summary

The current blog post implementation at `app/(site)/blog/[slug]/page.tsx` uses basic prose classes with minimal styling customization, resulting in a bare-bones appearance. The research reveals:

1. **Current State**: Blog posts use Tailwind prose utilities with simple class overrides but lack custom typography components
2. **Existing Design System**: Strong foundation with OKLCH color space, neon effects, semantic tokens, and shadcn/ui patterns
3. **Component Architecture**: Two-tier structure (`/components/ui/` for primitives, root for features) ready for extension
4. **Gap**: No custom MDX/blog-specific typography components exist; all content rendered as plain HTML with prose classes

**Recommendation**: Create a `/components/custom/` directory with reusable typography components (BlogHeading, BlogList, Citation, Callout, etc.) that integrate with the existing design system and can be used both in hardcoded JSX (current) and future MDX implementation.

## Detailed Findings

### 1. Current Blog Post Implementation

**Location**: `app/(site)/blog/[slug]/page.tsx:105-112`

Current prose styling approach:

```tsx
<div className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
  prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
  prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
  prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
  prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
  prose-strong:text-accent
  prose-ul:text-foreground prose-ul:my-6
  prose-li:text-foreground prose-li:my-2"
>
```

**Issues identified**:

- Generic prose classes lack visual hierarchy and polish
- No decorative elements or neon effects on headings
- Bullets are plain text, not styled
- No support for citations, callouts, or special content blocks
- Headings have color but no visual weight or effects
- Lists have basic spacing but no custom styling

### 2. Existing Design System Analysis

**Strengths** (from `app/globals.css` and component analysis):

**Color Palette (OKLCH)**:

- `--primary: oklch(0.7 0.14 195)` - Neon cyan
- `--secondary: oklch(0.68 0.18 340)` - Neon pink
- `--accent: oklch(0.62 0.16 300)` - Neon purple
- `--background: oklch(0.15 0.015 265)` - Dark purple-blue
- `--foreground: oklch(0.92 0.005 280)` - Near-white

**Custom Effects** (`app/globals.css:140-154`):

```css
.neon-glow {
  text-shadow:
    0 0 8px currentColor,
    0 0 15px currentColor;
}

.neon-border {
  box-shadow:
    0 0 8px currentColor,
    inset 0 0 8px currentColor;
}

.grid-bg {
  background-image:
    linear-gradient(to right, oklch(0.32 0.03 270 / 0.2) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(0.32 0.03 270 / 0.2) 1px, transparent 1px);
  background-size: 50px 50px;
}
```

**Typography**:

- Primary font: Space Grotesk (geometric sans-serif)
- Responsive scaling: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl`
- Semantic color tokens for consistent theming

### 3. Component Architecture Patterns

**Existing Structure** (from component analysis):

```
/components/
├── ui/                    # Primitives (shadcn/ui style)
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   └── slider.tsx
├── blog-card.tsx          # Feature components
├── navigation.tsx
└── audio-player.tsx
```

**Patterns identified**:

1. **CVA for variants**: Components use `class-variance-authority` for type-safe variants
2. **Server Components by default**: Only use `"use client"` when interactive
3. **Props interfaces**: Explicit TypeScript interfaces for all props
4. **cn() utility**: `twMerge` + `clsx` for class composition
5. **Semantic tokens**: All colors reference design system variables

**Example pattern** (from `components/ui/badge.tsx`):

```tsx
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5...',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        // ...
      },
    },
  }
);
```

### 4. Blog Content Rendering

**Current approach** (`app/(site)/blog/[slug]/page.tsx:114-326`):

- All content hardcoded as JSX
- Plain HTML elements: `<h1>`, `<h2>`, `<h3>`, `<p>`, `<ul>`, `<li>`
- No component composition
- Prose classes applied to wrapper div only

**Future MDX approach** (not yet implemented):

- Will need custom MDX components for rich rendering
- Components must be Server Components (no client interactivity needed)
- Should integrate seamlessly with design system

## Proposed Component Architecture

### Directory Structure

```
/components/custom/
├── blog-heading.tsx       # H1-H6 with neon effects and hierarchy
├── blog-list.tsx          # Styled UL/OL with custom bullets
├── blog-list-item.tsx     # Individual list items with icons
├── citation.tsx           # Blockquote with neon border
├── callout.tsx            # Info/warning/tip boxes
├── code-block.tsx         # Syntax-highlighted code (future)
├── figure.tsx             # Image with caption
└── index.ts               # Barrel export
```

### Component Specifications

#### 1. BlogHeading Component

**Purpose**: Replace plain headings with styled versions featuring neon effects and visual hierarchy

**Variants**:

- `h1`: Hero heading with strong glow, large size
- `h2`: Section heading with medium glow, divider line
- `h3`: Subsection with subtle glow
- `h4`-`h6`: Utility headings with minimal effects

**Props**:

```typescript
interface BlogHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
  id?: string; // For anchor links
}
```

**Design features**:

- Neon glow on h1/h2
- Decorative accent line for h2
- Responsive sizing
- Semantic color (primary cyan)
- Proper spacing (mt-12, mb-6)

**Example usage**:

```tsx
<BlogHeading level={1}>Intro</BlogHeading>
<BlogHeading level={2}>The process</BlogHeading>
```

#### 2. BlogList Component

**Purpose**: Styled unordered/ordered lists with custom bullets and spacing

**Variants**:

- `unordered`: Custom bullet style (neon dot or icon)
- `ordered`: Numbered with accent color
- `checklist`: Todo-style list with checkboxes

**Props**:

```typescript
interface BlogListProps {
  variant?: 'unordered' | 'ordered' | 'checklist';
  children: React.ReactNode;
  className?: string;
}
```

**Design features**:

- Custom bullets with primary/secondary colors
- Enhanced spacing between items
- Nested list support
- Responsive padding

#### 3. BlogListItem Component

**Purpose**: Individual list items with optional icons and custom styling

**Props**:

```typescript
interface BlogListItemProps {
  icon?: React.ReactNode; // Optional lucide-react icon
  children: React.ReactNode;
  className?: string;
}
```

**Design features**:

- Optional icon with accent color
- Text with proper line-height
- Hover state for interactive feel

#### 4. Citation Component

**Purpose**: Blockquotes and citations with neon border effect

**Variants**:

- `default`: Standard quote
- `author`: Quote with attribution

**Props**:

```typescript
interface CitationProps {
  children: React.ReactNode;
  author?: string;
  source?: string;
  className?: string;
}
```

**Design features**:

- Neon border on left side (using `neon-border` utility)
- Italic text with muted foreground
- Optional author attribution with accent color
- Card-like background

#### 5. Callout Component

**Purpose**: Highlighted information boxes (info, warning, tip, note)

**Variants**:

- `info`: Blue/cyan, informational
- `warning`: Orange/yellow, caution
- `tip`: Green, helpful hint
- `note`: Purple, side note

**Props**:

```typescript
interface CalloutProps {
  variant?: 'info' | 'warning' | 'tip' | 'note';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}
```

**Design features**:

- Color-coded based on variant
- Optional icon (lucide-react)
- Neon border with matching color
- Card background with subtle glow

#### 6. Figure Component

**Purpose**: Image wrapper with caption and optional border

**Props**:

```typescript
interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  className?: string;
}
```

**Design features**:

- Next.js Image optimization
- Caption with muted text
- Rounded corners
- Optional neon border
- Responsive sizing

## Implementation Plan

### Phase 1: Core Typography Components (Priority: High)

**Components to build**:

1. `blog-heading.tsx` - Immediate visual impact
2. `blog-list.tsx` - Improve bullet styling
3. `blog-list-item.tsx` - Custom list items

**Estimated effort**: 2-3 hours

**Steps**:

1. Create `/components/custom/` directory
2. Build BlogHeading with CVA variants for all levels
3. Build BlogList with unordered/ordered variants
4. Build BlogListItem with optional icon support
5. Create barrel export in `index.ts`
6. Replace hardcoded elements in `app/(site)/blog/[slug]/page.tsx`

### Phase 2: Content Enhancement Components (Priority: Medium)

**Components to build**:

1. `citation.tsx` - Blockquotes and quotes
2. `callout.tsx` - Info boxes
3. `figure.tsx` - Image captions

**Estimated effort**: 2 hours

**Steps**:

1. Build Citation with author attribution
2. Build Callout with 4 variants
3. Build Figure wrapping next/image
4. Add to barrel export
5. Update blog post content to use new components

### Phase 3: Future MDX Integration (Priority: Low)

**Components to build**:

1. `code-block.tsx` - Syntax highlighting with rehype-pretty-code
2. MDX components mapping object

**Estimated effort**: 3-4 hours

**Steps**:

1. Install MDX dependencies (@next/mdx, remark-gfm, rehype-slug, etc.)
2. Create `content/posts/` directory
3. Update `lib/posts.ts` to read filesystem
4. Create MDX components map
5. Update `next.config.ts` with MDX plugin
6. Refactor `[slug]/page.tsx` to render MDX

## Code Examples

### BlogHeading Component (Proposed)

**File**: `/components/custom/blog-heading.tsx`

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

- CVA variants for all heading levels
- Responsive sizing with mobile-first approach
- Neon glow effect on h1/h2 using existing `.neon-glow` class
- Border bottom on h2 for visual separation
- `scroll-mt-20` for anchor link offset
- `text-balance` for better typography

### BlogList Component (Proposed)

**File**: `/components/custom/blog-list.tsx`

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

- Polymorphic (ul/ol) based on variant
- Custom marker colors for ordered lists
- Reset default list styles for custom rendering
- Consistent spacing with `space-y-2`

### BlogListItem Component (Proposed)

**File**: `/components/custom/blog-list-item.tsx`

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

- Default chevron icon (customizable)
- Icon in secondary color (neon pink)
- Flexbox layout for proper alignment
- `flex-shrink-0` prevents icon distortion
- `leading-relaxed` for readability

### Citation Component (Proposed)

**File**: `/components/custom/citation.tsx`

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

- Semantic HTML (`<figure>`, `<blockquote>`, `<cite>`)
- Neon border on left using secondary color
- Card background for depth
- Optional author attribution with accent color
- Italic quote text with muted foreground

### Callout Component (Proposed)

**File**: `/components/custom/callout.tsx`

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
          <div className="text-muted-foreground leading-relaxed prose-sm prose-invert">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Key features**:

- 4 variants with distinct colors
- Auto-selected icons based on variant
- Custom icon override support
- Optional title
- Accessible (`role="note"`)
- Card background with backdrop blur

## Usage in Blog Post

### Before (Current Implementation)

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

### After (With Custom Components)

```tsx
import { BlogHeading, BlogList, BlogListItem, Citation, Callout } from "@/components/custom"

<BlogHeading level={1}>Intro</BlogHeading>
<p>As someone who's worked as a data lead...</p>

<BlogHeading level={3}>What will you get to read</BlogHeading>
<BlogList variant="unordered">
  <BlogListItem>Recruitment process</BlogListItem>
  <BlogListItem>How I evaluate candidates</BlogListItem>
  <BlogListItem>How to find good candidates</BlogListItem>
</BlogList>

<Callout variant="note" title="Important">
  This blogpost is written from the perspective of a head/VP of engineering, CTO, or similar at a small startup.
</Callout>
```

## Design System Integration

All components will use:

- **Semantic color tokens**: `text-primary`, `text-secondary`, `text-accent`, `bg-card`
- **Spacing scale**: `my-6`, `my-8`, `my-12` for vertical rhythm
- **Responsive typography**: Mobile-first with `sm:`, `md:`, `lg:` breakpoints
- **Custom effects**: `.neon-glow`, `.neon-border` from `globals.css`
- **cn() utility**: For class composition and overrides
- **CVA variants**: Type-safe component variants
- **Server Components**: All components remain Server Components (no client-side JS)

## Migration Path

### Immediate (Week 1):

1. Create `/components/custom/` directory
2. Build BlogHeading, BlogList, BlogListItem
3. Update `app/(site)/blog/[slug]/page.tsx` to use new components
4. Test visual improvements on `/blog/recruiting-engineers-as-a-startup`

### Short-term (Week 2-3):

1. Build Citation and Callout components
2. Add to existing blog post where appropriate
3. Create documentation in CLAUDE.md

### Long-term (Month 1):

1. Install MDX dependencies
2. Create `content/posts/` directory
3. Convert hardcoded content to MDX files
4. Create MDX components map
5. Update post rendering to use MDX

## Technical Considerations

### TypeScript Patterns

- Explicit props interfaces extending `React.HTMLAttributes<T>`
- CVA `VariantProps` type for variant safety
- Polymorphic components using `React.createElement`

### Accessibility

- Semantic HTML elements (`<figure>`, `<blockquote>`, `<cite>`)
- ARIA roles where appropriate (`role="note"`)
- Proper heading hierarchy (h1 → h2 → h3)
- Alt text for icons (`aria-hidden="true"`)

### Performance

- Server Components (no client bundle size impact)
- No runtime JavaScript for styling
- Tailwind CSS purges unused classes
- Next.js Image optimization for figures

### Maintainability

- Barrel export in `index.ts` for clean imports
- Consistent naming convention (`blog-*`)
- CVA for variant management (type-safe, scalable)
- Design token usage (easy theme updates)

## Open Questions

1. **Icon library**: Should all components use lucide-react icons, or support custom icons?
   - **Recommendation**: Default to lucide-react, allow custom override

2. **Code blocks**: Should syntax highlighting be in Phase 1 or Phase 3?
   - **Recommendation**: Phase 3 (requires rehype-pretty-code setup)

3. **MDX vs JSX**: Should we migrate to MDX immediately or incrementally?
   - **Recommendation**: Incremental (build components first, MDX later)

4. **Component variants**: Should we add more variants (e.g., `CalloutProps.size`)?
   - **Recommendation**: Start minimal, extend based on usage

5. **Animation**: Should headings/callouts have entrance animations?
   - **Recommendation**: Defer to future enhancement (avoid overuse)

## Code References

- `app/(site)/blog/[slug]/page.tsx:105-112` - Current prose styling
- `app/globals.css:140-154` - Neon effect utilities
- `components/ui/badge.tsx:7-26` - CVA variant pattern example
- `components/ui/button.tsx:7-37` - Polymorphic component pattern
- `components/blog-card.tsx:14-22` - Server Component with hover effects
- `lib/utils.ts:4` - cn() utility for class merging
- `lib/posts.ts:1-11` - Post type definition

## Related Research

- No prior research documents found in repository
- This is the first comprehensive blog architecture research

## Next Steps

1. **Immediate**: Present findings to user, get approval on component list
2. **Action**: Create components in order of priority (BlogHeading first)
3. **Testing**: Visual verification at `http://localhost:3000/blog/recruiting-engineers-as-a-startup`
4. **Documentation**: Update CLAUDE.md with custom components section
5. **Future**: Plan MDX migration timeline

---

**Status**: Ready for implementation
**Estimated Total Effort**: 7-9 hours (across 3 phases)
**Risk Level**: Low (additive changes, no breaking changes)
**Dependencies**: None (uses existing design system)
