---
date: 2025-11-07T14:00:00+01:00
researcher: Claude (Sonnet 4.5)
git_commit: 295cac032e277cc99b9ef642fc50b1be13bef55c
branch: main
repository: addcommitpush.io
topic: 'Claude Code Skills and SEO Optimizer Skill Design'
tags: [research, skills, seo, claude-code, blog-optimization]
status: complete
last_updated: 2025-11-07
last_updated_by: Claude (Sonnet 4.5)
---

# Research: Claude Code Skills and SEO Optimizer Skill Design

**Date**: 2025-11-07T14:00:00+01:00
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: `295cac032e277cc99b9ef642fc50b1be13bef55c`
**Branch**: main
**Repository**: addcommitpush.io

## Research Question

How do Claude Code "skills" work, and how should we design an `seo-optimizer` skill for this Next.js blog?

## Summary

**Claude Code Skills** are self-contained instruction folders with a required `SKILL.md` file that extend Claude's capabilities for specialized tasks. They use progressive disclosure (metadata → instructions → resources) and can include executable scripts. Skills are discovered autonomously by Claude based on description keywords.

**Current SEO Status**: This blog has basic metadata (titles, descriptions, OG tags) but is missing ~60% of the SEO infrastructure defined in CLAUDE.md: no sitemap, robots.txt, RSS feeds, OG images, canonical URLs, or JSON-LD.

**Proposed `seo-optimizer` Skill**: A Next.js-specific skill that audits SEO completeness, generates missing infrastructure (sitemap, robots, feeds), validates metadata, and creates OG images. The skill will integrate with the existing `lib/posts.ts` system and Next.js 16 App Router patterns.

## Detailed Findings

### Part 1: Understanding Claude Code Skills

#### What Are Skills?

Skills are **dynamically-loaded instruction folders** that teach Claude specialized capabilities:

- **Structure**: Minimum viable skill = single `SKILL.md` file with YAML frontmatter
- **Discovery**: Claude pre-loads name + description at startup, loads full content only when relevant
- **Portability**: Same format works across Claude.ai, Claude Code, and Claude API
- **Execution**: Can include scripts (Python/JavaScript) for deterministic operations

**Installation Paths**:

- Personal (all projects): `~/.claude/skills/skill-name/SKILL.md`
- Project (team-shared): `.claude/skills/skill-name/SKILL.md`
- Plugin (auto-installed): Bundled with Claude Code plugins

**References**:

- [Claude Skills Blog](https://claude.com/blog/skills)
- [Official Documentation](https://code.claude.com/docs/en/skills)
- [Skills GitHub Repository](https://github.com/anthropics/skills) (15.8k stars)
- [Agent Skills Specification v1.0](https://github.com/anthropics/skills/blob/main/agent_skills_spec.md)

#### File Structure

```
skill-name/
├── SKILL.md              # Required: instructions + frontmatter
├── reference.md          # Optional: detailed docs
├── examples.md           # Optional: usage examples
├── scripts/
│   └── helper.py        # Optional: executable utilities
└── templates/
    └── template.txt     # Optional: boilerplate
```

#### SKILL.md Format

Required YAML frontmatter:

```yaml
---
name: skill-name # Lowercase, hyphens only (max 64 chars)
description: What it does and when # Max 1024 chars, third-person
---
# Instructions below
```

**Optional frontmatter fields**:

- `allowed-tools`: Restrict Claude to specific tools (Claude Code only)
- `version`: Track iterations (e.g., "1.0.0")
- `license`: Brief license designation
- `metadata`: String key-value pairs

**Critical: The Description Field**

From [Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices):

> Write descriptions in **third person** (injected into system prompt). Be **specific and include key terms** for both what the skill does AND triggers/contexts.

**Good example**:
_"Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction."_

**Bad example**:
_"Helps with documents"_ (too vague)

#### Progressive Disclosure Pattern

From [Anthropic Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills):

1. **Level 1 (Metadata)**: Name + description pre-loaded at startup
2. **Level 2 (Core Instructions)**: Full SKILL.md loaded when skill is triggered
3. **Level 3+ (Supplementary)**: Additional files loaded on-demand via filesystem access

This allows skills to reference unbounded context without fitting everything in the initial context window.

#### Best Practices Summary

From [Skill Authoring Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices):

**Content Guidelines**:

- Keep SKILL.md under 500 lines (context window is shared)
- Use gerund naming (e.g., `processing-pdfs`, `analyzing-spreadsheets`)
- Organize references one level deep from SKILL.md
- Include concrete input/output examples
- Provide step-by-step checklists for complex workflows
- Test across Haiku, Sonnet, and Opus models

**Code and Scripts**:

- Handle errors explicitly
- Use forward slashes for all paths (`scripts/helper.py`)
- Make execution intent clear: _"Run analyze.py"_ vs _"See analyze.py"_
- List required packages and verify availability

**Quality Checklist**:

- ✓ Specific description with key terms and triggers
- ✓ SKILL.md < 500 lines with separate reference files
- ✓ One-level-deep file references
- ✓ No time-sensitive information
- ✓ Consistent terminology
- ✓ Concrete examples with validation steps
- ✓ Tested on multiple models
- ✓ Error handling in scripts

#### Example Skills Reference

From the [anthropics/skills repository](https://github.com/anthropics/skills):

**Development & Technical**:

- `artifacts-builder`: Complex HTML artifacts using React/Tailwind/shadcn
- `mcp-builder`: MCP server creation guidance
- `webapp-testing`: Playwright-based web app testing

**Meta Skills**:

- `skill-creator`: Framework for building effective skills with 6-step process:
  1. Gather concrete usage examples
  2. Analyze for reusable resources
  3. Initialize with `init_skill.py`
  4. Edit content (resources first, then SKILL.md)
  5. Package with `package_skill.py`
  6. Iterative testing and refinement

### Part 2: Current SEO Implementation Analysis

#### Entry Points

- **Root Layout**: `app/layout.tsx:10-34` - Global metadata with template
- **Blog List**: `app/(site)/blog/page.tsx:7-11` - Static index metadata
- **Blog Post**: `app/(site)/blog/[slug]/page.tsx:19-41` - Dynamic per-post metadata
- **Post Schema**: `lib/posts.ts:1-11` - Post interface

#### What's Working

**Global Metadata** (`app/layout.tsx`):

```typescript
export const metadata: Metadata = {
  title: {
    default: 'addcommitpush.io - Emil Wåreus',
    template: '%s | addcommitpush.io', // Template for all pages
  },
  description: 'Tech blog by Emil Wåreus...',
  openGraph: {
    title: 'addcommitpush.io - Emil Wåreus',
    description: 'Tech blog...',
    siteName: 'addcommitpush.io',
    type: 'website',
  },
  twitter: {
    /* ... */
  },
};
```

**Per-Post Metadata** (`app/(site)/blog/[slug]/page.tsx:19-41`):

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return {
    title: `${post.title} | addcommitpush.io`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors: ['Emil Wåreus'],
      tags: post.tags,
    },
  };
}
```

**Current Capabilities**:

- ✓ Template-based titles
- ✓ Per-post descriptions
- ✓ OpenGraph article metadata with publish time
- ✓ Authors and tags in OG metadata
- ✓ Twitter card (inherited from root)
- ✓ Dynamic favicon generation

#### What's Missing

**Critical Infrastructure Gaps** (per CLAUDE.md specification):

1. **Sitemap** ❌
   - Expected: `app/sitemap.ts`
   - Status: Not implemented
   - Impact: Search engines cannot discover pages systematically

2. **Robots.txt** ❌
   - Expected: `app/robots.ts`
   - Status: Not implemented
   - Impact: No crawler directives, no sitemap reference

3. **RSS/Atom Feeds** ❌
   - Expected: `public/feed.xml`, `public/feed.atom`
   - Status: No generation scripts
   - Impact: No syndication support

4. **OG Image Generation** ❌
   - Expected: Dynamic per-post OG images
   - Status: No `opengraph-image.tsx` files
   - Impact: Generic social media shares

5. **Canonical URLs** ❌
   - Schema field: Not in `lib/posts.ts:1-11`
   - Usage: Not in metadata functions
   - Impact: Potential duplicate content issues

**Metadata Gaps**:

- No `modifiedTime` in OG despite `updatedAt` field existing in schema
- No JSON-LD structured data
- No keywords meta tags
- No article section/category
- Schema missing `draft`, `canonicalUrl`, `ogImage` fields (mentioned in CLAUDE.md)

**CLAUDE.md Compliance**:

The project playbook explicitly requires (CLAUDE.md lines 52, 90-94, 112):

- ✗ Sitemap and robots.txt
- ✗ Build-time RSS/Atom feeds
- ✗ Full frontmatter schema with `draft`, `canonicalUrl`, `ogImage`
- ✓ `generateMetadata` for per-post SEO (partial)

**Current implementation: ~40% of specified SEO infrastructure**

#### Post Schema Current State

```typescript
// lib/posts.ts:1-11
export interface Post {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  updatedAt?: string; // Not used in metadata
  tags?: string[];
  cover?: string; // Not used in metadata
  readTime: string;
  audioUrl?: string;
}
```

### Part 3: SEO Optimizer Skill Design

#### Skill Overview

**Name**: `seo-optimizer`

**Description**:
_"Audit and optimize SEO for Next.js 16 App Router blogs. Generates sitemaps, robots.txt, RSS/Atom feeds, validates metadata, creates OG images, and ensures schema completeness. Use when the user mentions SEO, search optimization, metadata, feeds, sitemaps, or improving blog discoverability."_

**Target Use Cases**:

1. Complete SEO infrastructure setup for new blogs
2. Audit existing SEO implementation against best practices
3. Generate missing components (sitemap, robots, feeds)
4. Validate post metadata and schema compliance
5. Create dynamic OG images for social sharing
6. Update frontmatter schema to support all SEO fields

#### File Structure

```
.claude/skills/seo-optimizer/
├── SKILL.md                 # Main instructions
├── reference/
│   ├── nextjs-seo.md       # Next.js SEO patterns
│   ├── schema-fields.md    # Complete frontmatter schema
│   └── og-image-patterns.md # OG image generation approaches
├── templates/
│   ├── sitemap.ts.txt
│   ├── robots.ts.txt
│   ├── feed-generator.ts.txt
│   └── og-image.tsx.txt
├── scripts/
│   └── audit_seo.py        # Validation script
└── examples/
    └── seo-audit-output.md
```

#### SKILL.md Structure (Draft)

````markdown
---
name: seo-optimizer
description: Audit and optimize SEO for Next.js 16 App Router blogs. Generates sitemaps, robots.txt, RSS/Atom feeds, validates metadata, creates OG images, and ensures schema completeness. Use when the user mentions SEO, search optimization, metadata, feeds, sitemaps, or improving blog discoverability.
version: 1.0.0
---

# SEO Optimizer for Next.js Blogs

You are an SEO optimization specialist for Next.js 16 App Router blogs with static MDX content.

## Core Capabilities

1. **Infrastructure Generation**
   - Sitemap.xml via `app/sitemap.ts`
   - Robots.txt via `app/robots.ts`
   - RSS/Atom feeds from post frontmatter
   - Dynamic OG images per post

2. **Metadata Validation**
   - Check `generateMetadata()` completeness
   - Validate frontmatter schema
   - Ensure canonical URLs
   - Verify structured data

3. **Schema Enhancement**
   - Extend post schema with SEO fields
   - Add draft/canonical/ogImage support
   - Update type definitions

4. **Audit & Reporting**
   - Generate SEO compliance report
   - Identify missing metadata
   - Check for duplicate content
   - Validate image alt text

## Workflow

When the user requests SEO optimization:

### Step 1: Audit Current State

Run the audit checklist:

- [ ] Check for `app/sitemap.ts`
- [ ] Check for `app/robots.ts`
- [ ] Check for RSS/Atom feed generation
- [ ] Examine `generateMetadata()` in blog routes
- [ ] Review post schema for SEO fields
- [ ] Verify OG image implementation
- [ ] Check canonical URL usage
- [ ] Validate JSON-LD structured data

Use `scripts/audit_seo.py` to generate a compliance report.

### Step 2: Generate Missing Infrastructure

Based on audit findings, create:

**Sitemap** (`app/sitemap.ts`):

```typescript
import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const baseUrl = 'https://addcommitpush.io';

  const blogPosts = posts
    .filter((post) => !post.draft)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...blogPosts,
  ];
}
```
````

**Robots.txt** (`app/robots.ts`):

```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/private/',
    },
    sitemap: 'https://addcommitpush.io/sitemap.xml',
  };
}
```

**RSS Feed** (build-time script):

- Create `scripts/generate-feed.ts`
- Generate XML from `getAllPosts()`
- Output to `public/feed.xml` and `public/feed.atom`
- Add to build pipeline

**OG Images** (dynamic per-post):

- Create `app/(site)/blog/[slug]/opengraph-image.tsx`
- Use `ImageResponse` from `next/og`
- Pull post title, description, tags from frontmatter
- Match blog visual style

### Step 3: Enhance Post Schema

Update `lib/posts.ts` interface:

```typescript
export interface Post {
  // Core fields
  title: string;
  slug: string;
  description: string;

  // Temporal
  publishedAt: string;
  updatedAt?: string;

  // Categorization
  tags?: string[];

  // SEO fields (new)
  canonicalUrl?: string;
  ogImage?: string;
  keywords?: string[];

  // Publishing
  draft?: boolean;

  // Media
  cover?: string;

  // UX
  readTime: string;
  audioUrl?: string;
}
```

### Step 4: Update Metadata Functions

Enhance `app/(site)/blog/[slug]/page.tsx` metadata:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const baseUrl = 'https://addcommitpush.io';

  return {
    title: `${post.title} | addcommitpush.io`,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: post.canonicalUrl || `${baseUrl}/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: new Date(post.publishedAt).toISOString(),
      modifiedTime: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
      authors: ['Emil Wåreus'],
      tags: post.tags,
      images: [
        {
          url: post.ogImage || `${baseUrl}/blog/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.ogImage || `${baseUrl}/blog/${slug}/opengraph-image`],
    },
  };
}
```

### Step 5: Add Structured Data

Create JSON-LD for blog posts:

```typescript
export default async function BlogPost({ params }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  const baseUrl = 'https://addcommitpush.io'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: post.cover || post.ogImage,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : new Date(post.publishedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: 'Emil Wåreus',
      url: baseUrl,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Post content */}
    </>
  )
}
```

## Implementation Checklist

When implementing SEO optimization, follow this order:

1. ✓ Run SEO audit (`scripts/audit_seo.py`)
2. ✓ Update post schema in `lib/posts.ts`
3. ✓ Create `app/sitemap.ts`
4. ✓ Create `app/robots.ts`
5. ✓ Enhance `generateMetadata()` functions
6. ✓ Add JSON-LD structured data
7. ✓ Create feed generation script
8. ✓ Add OG image generation
9. ✓ Update existing posts with new fields
10. ✓ Run build to verify no errors
11. ✓ Test URLs:
    - `/sitemap.xml`
    - `/robots.txt`
    - `/feed.xml`
    - Individual post OG images

## Validation Commands

After implementation, verify:

```bash
# Build succeeds
pnpm build

# Check routes exist
curl http://localhost:3000/sitemap.xml
curl http://localhost:3000/robots.txt
curl http://localhost:3000/feed.xml

# Validate structured data
# Use Google Rich Results Test

# Check OG images
curl -I http://localhost:3000/blog/[slug]/opengraph-image
```

## Common Pitfalls

- **Async Params**: Next.js 16 requires `await params` in page components
- **Base URL**: Always use absolute URLs for canonical/OG images
- **Draft Posts**: Filter from sitemap/feeds but keep accessible for preview
- **Build-time Feeds**: Run generation script in build pipeline, not runtime
- **Image Formats**: OG images should be 1200x630px PNG/JPEG
- **Static Generation**: Ensure `dynamic = "error"` on all blog routes

## References

See bundled documentation:

- `reference/nextjs-seo.md` - Next.js-specific SEO patterns
- `reference/schema-fields.md` - Complete frontmatter reference
- `reference/og-image-patterns.md` - OG image generation approaches

````

#### Supporting Files

**`scripts/audit_seo.py`** - SEO compliance checker:

```python
#!/usr/bin/env python3
"""
SEO Audit Script for Next.js Blogs
Checks for required SEO infrastructure and metadata
"""

import os
import sys
from pathlib import Path

def check_file_exists(path: str, description: str) -> bool:
    """Check if a file exists and report"""
    exists = Path(path).exists()
    status = "✓" if exists else "✗"
    print(f"{status} {description}: {path}")
    return exists

def audit_seo(project_root: str) -> dict:
    """Run comprehensive SEO audit"""
    print("=== SEO Infrastructure Audit ===\n")

    results = {
        "sitemap": check_file_exists(
            f"{project_root}/app/sitemap.ts",
            "Sitemap"
        ),
        "robots": check_file_exists(
            f"{project_root}/app/robots.ts",
            "Robots.txt"
        ),
        "feed_xml": check_file_exists(
            f"{project_root}/public/feed.xml",
            "RSS Feed"
        ),
        "feed_atom": check_file_exists(
            f"{project_root}/public/feed.atom",
            "Atom Feed"
        ),
    }

    # Check for OG image generation
    og_image_patterns = [
        f"{project_root}/app/**/opengraph-image.tsx",
        f"{project_root}/app/**/opengraph-image.ts",
    ]

    print("\n=== Metadata Files ===\n")

    # Check post routes for metadata
    blog_route = f"{project_root}/app/(site)/blog/[slug]/page.tsx"
    if Path(blog_route).exists():
        with open(blog_route, 'r') as f:
            content = f.read()
            has_metadata = "generateMetadata" in content
            has_canonical = "canonical" in content
            has_og_image = "images:" in content or "image:" in content

            print(f"{'✓' if has_metadata else '✗'} generateMetadata() function")
            print(f"{'✓' if has_canonical else '✗'} Canonical URL")
            print(f"{'✓' if has_og_image else '✗'} OG Image metadata")

    # Calculate score
    total_checks = len(results) + 3
    passed_checks = sum(results.values()) + sum([has_metadata, has_canonical, has_og_image])
    score = (passed_checks / total_checks) * 100

    print(f"\n=== Overall Score: {score:.1f}% ===")

    if score < 100:
        print("\nRecommendations:")
        if not results["sitemap"]:
            print("- Create app/sitemap.ts for search engine discovery")
        if not results["robots"]:
            print("- Create app/robots.ts for crawler directives")
        if not results["feed_xml"]:
            print("- Generate RSS feed for syndication")
        if not has_canonical:
            print("- Add canonical URLs to prevent duplicate content")
        if not has_og_image:
            print("- Implement OG image generation for social sharing")

    return results

if __name__ == "__main__":
    project_root = os.getcwd()
    audit_seo(project_root)
````

**`reference/schema-fields.md`** - Complete frontmatter reference:

````markdown
# Blog Post Frontmatter Schema

## Complete Field Reference

### Core Fields (Required)

- `title`: Human-readable post title (string)
- `slug`: URL-safe identifier, kebab-case (string)
- `description`: SEO description, 120-160 characters (string)
- `publishedAt`: Publication date, YYYY-MM-DD or ISO (string)

### Temporal Fields (Optional)

- `updatedAt`: Last modification date, ISO format (string)

### Categorization (Optional)

- `tags`: Array of topic tags (string[])

### SEO Fields (Optional)

- `canonicalUrl`: Canonical URL to prevent duplicates (string)
- `ogImage`: Custom OG image path under /public (string)
- `keywords`: SEO keywords (string[])

### Publishing (Optional)

- `draft`: Hide from production builds/feeds (boolean, default: false)

### Media (Optional)

- `cover`: Cover image path under /public (string)

### UX Fields (Optional)

- `readTime`: Computed reading time (string)
- `audioUrl`: Audio version URL (string)

## Example Frontmatter

```yaml
---
title: 'Building Production-Ready Next.js Apps'
slug: 'production-nextjs'
description: 'Learn how to optimize Next.js applications for production deployment with SSG, ISR, and edge caching strategies.'
publishedAt: '2025-01-15'
updatedAt: '2025-01-20'
tags: [nextjs, performance, deployment]
canonicalUrl: 'https://addcommitpush.io/blog/production-nextjs'
ogImage: '/posts/production-nextjs/og-optimized.webp'
keywords: [next.js, static generation, edge caching, performance]
cover: '/posts/production-nextjs/cover-optimized.webp'
draft: false
---
```
````

## TypeScript Interface

```typescript
export interface Post {
  // Core (required)
  title: string;
  slug: string;
  description: string;
  publishedAt: string;

  // Temporal
  updatedAt?: string;

  // Categorization
  tags?: string[];

  // SEO
  canonicalUrl?: string;
  ogImage?: string;
  keywords?: string[];

  // Publishing
  draft?: boolean;

  // Media
  cover?: string;

  // UX (computed)
  readTime: string;
  audioUrl?: string;
}
```

```

#### Integration with Existing Workflow

The skill will:
1. Read `CLAUDE.md` to understand project-specific requirements
2. Use `lib/posts.ts` as the single source of truth for content
3. Follow Next.js 16 patterns (async params, App Router)
4. Respect static generation constraints (`dynamic = "error"`)
5. Integrate with existing `pnpm build` and `pnpm lint` workflows

#### Skill Triggers

The skill should activate when the user mentions:
- "SEO" or "search optimization"
- "metadata" or "OG tags"
- "sitemap" or "robots.txt"
- "RSS" or "Atom" or "feed"
- "social sharing" or "OG images"
- "improve discoverability"
- "optimize blog" (in SEO context)

## Code References

**Current SEO Implementation**:
- `app/layout.tsx:10-34` - Global metadata
- `app/(site)/blog/page.tsx:7-11` - Blog index metadata
- `app/(site)/blog/[slug]/page.tsx:19-41` - Dynamic post metadata
- `lib/posts.ts:1-11` - Post schema (needs SEO fields)

**Missing Files** (to be created by skill):
- `app/sitemap.ts` - Sitemap generation
- `app/robots.ts` - Robots.txt
- `scripts/generate-feed.ts` - RSS/Atom feed builder
- `app/(site)/blog/[slug]/opengraph-image.tsx` - Dynamic OG images

**Templates** (included in skill):
- `.claude/skills/seo-optimizer/templates/sitemap.ts.txt`
- `.claude/skills/seo-optimizer/templates/robots.ts.txt`
- `.claude/skills/seo-optimizer/templates/feed-generator.ts.txt`
- `.claude/skills/seo-optimizer/templates/og-image.tsx.txt`

## Architecture Insights

### Skills Discovery Mechanism

From research, skills use a **three-level progressive disclosure** pattern:

1. **Startup**: Claude loads all skill names + descriptions into memory
2. **Relevance Check**: On each user request, Claude matches against description keywords
3. **Activation**: If relevant, Claude invokes the skill via tool call, system injects full SKILL.md

This means the `description` field is **critical** for discovery. It must contain:
- What the skill does (capabilities)
- When to use it (triggers/contexts)
- Domain-specific keywords

**For seo-optimizer**:
*"Audit and optimize SEO for Next.js 16 App Router blogs. Generates sitemaps, robots.txt, RSS/Atom feeds, validates metadata, creates OG images, and ensures schema completeness. Use when the user mentions **SEO, search optimization, metadata, feeds, sitemaps**, or improving blog discoverability."*

### Next.js SEO Patterns

**Static Metadata Routes**:
- `app/sitemap.ts` - Returns `MetadataRoute.Sitemap` type
- `app/robots.ts` - Returns `MetadataRoute.Robots` type

**Dynamic Metadata Routes**:
- `app/[...]/opengraph-image.tsx` - Returns `ImageResponse` (1200x630px)
- Supports params for dynamic content

**Build-time Generation**:
- RSS/Atom feeds must be generated during `pnpm build`
- Add to `package.json` scripts: `"prebuild": "pnpm generate-feed"`

### Content Flow

```

MDX frontmatter → lib/posts.ts interface → generateMetadata() → <head> tags
→ sitemap.ts → sitemap.xml
→ generate-feed.ts → feed.xml/atom
→ opengraph-image.tsx → OG image

````

## Historical Context (from .claude/)

From `.claude/research/2025-11-07_11-00-59_image-optimization-command.md`:

The project already has an image optimization workflow:
- Source images in `public/posts/<slug>/`
- Script generates `-optimized.avif`, `-optimized.webp`, `-optimized.<ext>`
- Target: <200KB per image
- Uses Sharp library

**SEO Relevance**: The skill should:
1. Recommend using optimized WebP images for OG tags
2. Validate that referenced OG images exist and are optimized
3. Suggest running `pnpm optimize-images` if OG images are too large

## Related Research

- `.claude/research/2025-11-07_blog-post-rendering-improvement-plan.md` - Blog rendering improvements
- `.claude/research/2025-11-07_11-00-59_image-optimization-command.md` - Image optimization workflow
- `CLAUDE.md:52,90-94,112` - SEO infrastructure requirements

## Implementation Plan

### Phase 1: Skill Creation
1. Create `.claude/skills/seo-optimizer/` directory
2. Write `SKILL.md` with frontmatter and instructions
3. Create reference documentation (`nextjs-seo.md`, `schema-fields.md`, `og-image-patterns.md`)
4. Create templates for sitemap, robots, feed, OG image
5. Write `scripts/audit_seo.py` validation script
6. Test skill discovery by asking "What skills are available?"

### Phase 2: Infrastructure Implementation (Using the Skill)
1. Invoke skill with "Optimize SEO for this blog"
2. Skill runs audit and identifies gaps
3. Generate missing files:
   - `app/sitemap.ts`
   - `app/robots.ts`
   - `scripts/generate-feed.ts`
   - `app/(site)/blog/[slug]/opengraph-image.tsx`
4. Update `lib/posts.ts` schema with SEO fields
5. Enhance `generateMetadata()` functions
6. Add JSON-LD structured data

### Phase 3: Validation
1. Run `pnpm build` to ensure no errors
2. Execute `python scripts/audit_seo.py`
3. Test routes: `/sitemap.xml`, `/robots.txt`, `/feed.xml`
4. Validate OG images render correctly
5. Use Google Rich Results Test for structured data

### Phase 4: Documentation
1. Update `CLAUDE.md` to reflect completed SEO implementation
2. Document feed generation in README
3. Add SEO checklist for new posts

## Open Questions

1. **OG Image Strategy**: Should we generate images dynamically at build-time or request-time?
   - Dynamic (request-time): Simpler, no build step, uses `next/og`
   - Static (build-time): Faster serving, cacheable, requires Sharp

2. **Feed Format**: RSS 2.0, Atom 1.0, or both?
   - Recommendation: Both for maximum compatibility

3. **Canonical URL Pattern**: Should we auto-generate or require in frontmatter?
   - Recommendation: Auto-generate from slug, allow override in frontmatter

4. **Draft Post Handling**: Should drafts be accessible at URLs or 404?
   - Recommendation: Accessible but excluded from sitemap/feeds (preview mode)

5. **JSON-LD Scope**: Article only, or add Person/Organization/WebSite schemas?
   - Recommendation: Start with BlogPosting, expand to Person/WebSite in v2

## Next Steps

To create the `seo-optimizer` skill:

```bash
# 1. Create skill directory
mkdir -p .claude/skills/seo-optimizer/{reference,templates,scripts,examples}

# 2. Copy SKILL.md from this research doc
# 3. Create reference files
# 4. Create templates
# 5. Write audit script

# 6. Test activation
# Ask Claude: "Can you optimize SEO for this blog?"
# Verify skill loads and provides guidance
````

To implement the SEO infrastructure:

```bash
# 1. Invoke the skill
# Ask: "Use the seo-optimizer skill to audit and fix SEO"

# 2. Follow skill's implementation checklist
# 3. Run validation
pnpm build
python scripts/audit_seo.py

# 4. Commit changes
git add .
git commit -m "feat: Complete SEO infrastructure with sitemap, robots, feeds, OG images"
```

---

## Links and References

**Claude Code Skills Documentation**:

- [Claude Skills Blog](https://claude.com/blog/skills)
- [Official Skills Documentation](https://code.claude.com/docs/en/skills)
- [Skills GitHub Repository](https://github.com/anthropics/skills)
- [Agent Skills Specification v1.0](https://github.com/anthropics/skills/blob/main/agent_skills_spec.md)
- [Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Skills API Guide](https://docs.claude.com/en/api/skills-guide)
- [Anthropic Engineering Blog - Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Cookbooks - Skills](https://github.com/anthropics/claude-cookbooks/tree/main/skills)
- [How to Create Custom Skills](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)

**Next.js SEO Resources**:

- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js Sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js Robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js OG Images](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)

**SEO Best Practices**:

- [Google Search Central - Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Schema.org - BlogPosting](https://schema.org/BlogPosting)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
