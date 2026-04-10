## Codex Playbook — addcommitpush.io (Next.js 16 + TypeScript)

You are a senior TypeScript + Next.js engineer and an expert technical blog writer. This repository is a personal blog built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and strict TypeScript. Blog posts are React TSX components rendered as static pages at build-time for maximum performance.

Follow this playbook precisely. Be bold: prefer single, clean solutions. Remove legacy paths rather than maintaining dual systems.

---

### Non‑negotiables

- Use App Router only. Do not introduce Pages Router APIs (no `getStaticProps`, `getStaticPaths`).
- Render posts as fully static. Prefer SSG. Enforce with `export const dynamic = "error"` and `export const revalidate = false` on blog routes.
- Default to Server Components. Mark Client Components explicitly with `"use client"` only when necessary.
- TypeScript strictly typed. No `any`. Clear, descriptive names; early returns; minimal nesting; no unnecessary try/catch.
- **No fallback code paths. Ever.** No graceful degradation, no try/except recovery wrappers, no "fallback to X if Y fails." If the primary code path doesn't work, fix it — don't add a backup. Fallback code means the original code is broken and doesn't deserve to exist.
- Keep dependencies lean. Prefer built-in Next features and well-supported libs only.

---

### Tech snapshot

- Next.js: 16.x (App Router)
- React: 19.x
- TypeScript: 5.x (strict)
- Styling: Tailwind CSS v4
- Package manager: pnpm

Key scripts:

```bash
pnpm dev              # start dev server (ONLY run by humans - Codex should NEVER run this)
pnpm build            # production build (SSG)
pnpm start            # start production server
pnpm lint             # run eslint
pnpm optimize-images  # optimize images for web (generates AVIF, WebP, optimized originals)
```

**IMPORTANT**: Codex is **NOT ALLOWED** to run `pnpm dev`. Only humans start the dev server. If you need the dev server running for verification, ask the user: "Please start the dev server."

---

### Blog architecture

- Content source: `components/blog-posts/**/*.tsx` (React components)
- Post metadata: `lib/posts.ts` (TypeScript data structure)
- Routes:
  - Index/list: `app/(site)/blog/page.tsx`
  - Detail: `app/(site)/blog/[slug]/page.tsx`
  - Optional tag index: `app/(site)/tags/[tag]/page.tsx`
- Assets for posts: `public/posts/<slug>/*` (cover images, diagrams, etc.)
- Enforce static generation for all blog pages:
  - `export const dynamic = "error"`
  - `export const revalidate = false`
  - `export async function generateStaticParams()` reads all slugs from `lib/posts.ts`

SEO & discoverability:

- `app/sitemap.ts` and `app/robots.ts`
- `generateMetadata` in route files for per-post OG/SEO
- Build-time RSS/Atom feed at `/feed.xml` and `/feed.atom` from post metadata

---

### Post schema

Blog posts are defined as TypeScript objects in `lib/posts.ts` with the following structure:

```typescript
interface BlogPost {
  title: string; // Human-readable title (required)
  slug: string; // kebab-case-slug (required, unique)
  description: string; // 120-160 chars for SEO (required)
  publishedAt: string; // YYYY-MM-DD or ISO date (required)
  updatedAt?: string; // ISO date (optional)
  tags?: string[]; // e.g., ["nextjs", "typescript", "performance"]
  cover?: string; // Path under public/, e.g., "/posts/<slug>/cover.jpg"
  draft?: boolean; // Default false
  canonicalUrl?: string; // Optional
  ogImage?: string; // Path under public/, e.g., "/posts/<slug>/og.png"
  component: React.ComponentType; // The TSX component from components/blog-posts/
}
```

Constraints:

- `slug` must match the component filename (e.g., `components/blog-posts/<slug>.tsx`)
- Draft posts are excluded from production builds and feeds
- Reading time is computed; do not store it

---

### Writing guidelines (expert technical blogging)

- Audience: senior/principal engineers. Prioritize clarity, correctness, and depth.
- Structure each post:
  1. One-paragraph summary (what/why, who should care)
  2. Key takeaways (3–5 bullets)
  3. Body with runnable examples and trade-offs
  4. Pitfalls and edge cases
  5. Conclusion with next steps or references
- Style:
  - Prefer active voice, short paragraphs, and precise terminology.
  - Show the minimal viable example first; iterate into variations.
  - Cite sources and standards where relevant (RFCs, docs). Use descriptive link text.
  - Use proper JSX/React syntax for code blocks, keep lines < 100 chars.
  - Add alt text for every image. Use vector/SVG when possible; fall back to optimized PNG/JPEG.

Example post component structure:

```tsx
// components/blog-posts/static-rendering-next-16.tsx
export function StaticRenderingNext16Content() {
  return (
    <div className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none">
      <p>TL;DR: Use App Router + static params + React components. Avoid Pages Router APIs.</p>

      <h2>Key takeaways</h2>
      <ul>
        <li>Fully static posts are fast, cacheable, and easy to deploy</li>
        <li>generateStaticParams drives SSG for dynamic routes</li>
        <li>Pure React components keep the stack simple</li>
      </ul>

      <h2>Example</h2>
      <pre>
        <code>{`// app/(site)/blog/[slug]/page.tsx
export const dynamic = "error";
export const revalidate = false;

export async function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }));
}

export default async function PostPage({ params }) {
  const post = getPostBySlug(params.slug);
  return <post.component />;
}`}</code>
      </pre>

      <h2>Pitfalls</h2>
      <ul>
        <li>Do not use Pages Router APIs in App Router</li>
        <li>Avoid client components unless necessary</li>
      </ul>

      <h2>References</h2>
      <ul>
        <li>
          <a href="https://nextjs.org/docs">Next.js App Router docs</a>
        </li>
      </ul>
    </div>
  );
}
```

---

### Implementation checklist (single, clean approach)

1. Post components

- Create React TSX components in `components/blog-posts/<slug>.tsx`
- Each component exports a function that returns the post content as JSX

2. Content registry

- Maintain `lib/posts.ts` with:
  - TypeScript array of post metadata objects
  - Import all post components
  - Map slugs to components
  - Expose `getAllPosts()` and `getPostBySlug(slug)` returning typed data

3. Routes

- `app/(site)/blog/page.tsx`: list posts (exclude drafts), sorted by `publishedAt`
- `app/(site)/blog/[slug]/page.tsx`: render the post component for a single post
- Use `generateStaticParams` and `generateMetadata`
- Set `dynamic = "error"` and `revalidate = false`

4. SEO & feeds

- `app/sitemap.ts` and `app/robots.ts`
- Build-time RSS/Atom generation under `public/`

5. Assets & images

- Store per-post media under `public/posts/<slug>/`
- Use `next/image` for responsive, optimized images with explicit `alt`
- Run `pnpm optimize-images` to generate modern formats (AVIF, WebP) from source images
- Reference optimized images in frontmatter: `cover: "/posts/<slug>/cover-optimized.webp"`

6. Quality gates

- `pnpm lint` must pass
- Add a `typecheck` script (tsc --noEmit) and keep it green

---

### Conventions & constraints

- Project structure (high-level):
  - `app/` — App Router pages/components
  - `components/blog-posts/` — Blog post React components
  - `lib/` — shared utilities (no React code here, includes post metadata registry)
  - `public/` — static assets
  - `scripts/` — build-time automation scripts (TypeScript, executed via tsx)
- Code style:
  - Server Components by default; colocate minimal Client Components
  - Descriptive naming, short functions, early exits
  - No dead code; remove unused exports; keep modules focused

#### Image optimization workflow

- Source images: Place originals in `public/posts/<slug>/` (e.g., `cover.png`)
- Run: `pnpm optimize-images` to generate optimized variants
- Outputs: `<name>-optimized.avif`, `<name>-optimized.webp`, `<name>-optimized.<ext>`
- Use WebP in post metadata for best balance: `cover: "/posts/<slug>/cover-optimized.webp"`
- Target: <200KB per image (WebP typically achieves 85-95% size reduction)
- The script uses Sharp for optimization and skips files already containing "-optimized"

#### Audio file workflow

- Source audio: Place MP3 files in `public/posts/<slug>/audio.mp3`
- Format: MP3 at 128-192 kbps for spoken word (podcast/narration style)
- Target size: <20 MB per file (10-minute audio at 192 kbps ≈ 14.4 MB)
- Optimization: Use ffmpeg to optimize before committing:
  ```bash
  # Optimize audio for web (spoken word)
  ffmpeg -i input.wav -codec:a libmp3lame -b:a 192k -ar 44100 output.mp3
  ```
- Post metadata: Add `audioUrl: "/posts/<slug>/audio.mp3"` to post object in `lib/posts.ts`
- Integration: Import and render `<AudioPlayer>` component in post content:

  ```tsx
  import { AudioPlayer } from '@/components/audio-player';

  <AudioPlayer audioUrl="/posts/<slug>/audio.mp3" title="Post Title - Audio Version" />;
  ```

- Features: Automatic playback controls (play/pause, seek, volume, speed: 1x/1.25x/1.5x/2x)
- Indicator: Blog listing automatically shows Headphones icon for posts with audio
- Preload: Audio uses `preload="metadata"` to load duration without full download
- Serving: Files automatically served via Next.js static serving with CDN caching on Vercel

---

### How Codex should operate here

- When asked to add a post:
  - Propose a `slug`, create `components/blog-posts/<slug>.tsx` as a React component
  - Add post metadata entry to `lib/posts.ts` with all required fields
  - Create a `public/posts/<slug>/` folder for media and reference them with absolute `/posts/<slug>/…` paths
  - If images are added, run `pnpm optimize-images` to generate optimized variants
  - Use optimized image paths in metadata (e.g., `cover: "/posts/<slug>/cover-optimized.webp"`)
  - Ensure the new post is picked up by the static params generator
- When asked to add features:
  - Implement the single chosen approach end-to-end; do not keep legacy pathways
  - Update types, metadata, and feeds accordingly
- Keep PRs focused and small. Include a brief rationale and before/after notes.

---

### References and best practices

- Next.js App Router docs (metadata, SSG) — see the official Next.js documentation
- React component best practices — keep components focused and reusable
- Guidance on concise `AGENTS.md` files — see community write-ups like the Apidog "AGENTS.md" overview for keeping this file focused and high-signal

Keep this document up to date as the source of truth for how this blog is structured and extended.

# Thoughts:

All thoughs (even in sub-projects) should be in thoughts/shared/ (root), not in the sub projects.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Researcher**

Researcher is an installable deep-research operating system for AI runtimes like Codex and
Claude Code. It is modeled directly on GSD's strengths: commands, skills, scripts, workflows,
hooks, and file-based state, but aimed at web research, evidence capture, insight synthesis,
and multi-angle report generation instead of code delivery alone.

The product should let a user install Researcher into a project and work through durable,
structured research flows that turn sources into reusable insights, analysis, and many Markdown
reports from one research base.

**Core Value:** Turn research from one-off chat output into durable, source-backed knowledge that can be reused,
extended, and repackaged into multiple high-quality reports.

### Constraints

- **Runtime Compatibility**: Must be installable into Codex and Claude Code first — these are the
  primary target runtimes.
- **Local-First State**: Core state must live in files, not require a database or hosted backend.
- **Artifact Discipline**: Reports must be Markdown, and the source registry must be structured and
  machine-readable.
- **GSD Alignment**: The product should feel structurally similar to GSD so users can transfer the
  same mental model.
- **Extensibility**: One research must remain open to additional sources, insights, analysis, and
  reports over time.
- **Source Provenance**: Every report-worthy claim must be traceable back through insights to
  concrete sources.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.x LTS | Primary runtime for CLI, installer, hooks, and asset generation | Stable LTS baseline for an installable workflow product, while keeping modern runtime features |
| TypeScript | 5.x | Implementation language for CLI, adapters, schemas, and build tooling | Strong typing matters because the system manipulates structured artifacts and multiple runtime adapters |
| Markdown + YAML frontmatter | N/A | Human-readable source format for briefs, insights, analysis, and reports | Git-friendly, inspectable, and natural for agent-authored artifacts |
| JSON / JSONL + JSON Schema | Draft 2020-12 | Canonical machine-readable state for manifests, source registries, and validation | Needed for deterministic mutation, validation, lineage tracking, and freshness propagation |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ajv` | 8.x | Validate `sources.json`, manifests, and contract payloads | Required for all structured registry writes |
| `zod` | 3.x or 4.x | Author runtime-safe schema definitions that can align with JSON Schema validation | Use when the core graph engine needs stronger typed validation in code |
| `gray-matter` or minimal frontmatter parser | 4.x | Parse Markdown frontmatter safely | Use when reading/writing insight, analysis, and report metadata |
| `fast-glob` | 3.x | Scan research trees and install assets | Use for indexing, refresh checks, and installer copy logic |
| `tsx` | 4.x | Run TypeScript scripts without heavy bundling overhead | Use for dev scripts and local automation |
| `vitest` | 4.x | Test the graph engine, installer, and validators | Use for CLI and artifact-graph correctness |
| Python + `uv` + `marimo` + DuckDB | 3.12+ | Optional analysis/notebook runtime | Use only for richer analysis tasks, local analytical queries, and `.py`-backed notebooks under `analysis/` |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package and publish the installer | Best fit for a workspace-oriented Node/TypeScript toolchain |
| `esbuild` | Bundle small helper scripts when useful | Keep runtime lean and installation fast |
| JSON Schema validation in CI | Prevent registry drift | Run on example artifacts and fixtures |
| Markdown linting or repo conventions | Keep prompt and artifact files consistent | Useful once the prompt surface grows |
## Installation
# Core
# Dev dependencies
# Optional analysis runtime
# Python 3.12+ with uv, marimo, and DuckDB for richer analysis tooling
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Node.js + TypeScript CLI core | Python-first core | Use Python-first only if notebooks and data pipelines become the dominant product surface |
| JSON registries + Markdown artifacts | SQLite-first state | Use a database later only if cross-research scale and concurrent mutation outgrow file-based state |
| Thin runtime adapters | Separate codebases per runtime | Avoid unless runtime behavior diverges more than expected |
| `sources.jsonl` or append-friendly source records | single monolithic `sources.json` | Use a single JSON file only while the source registry remains small and low-concurrency |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Database-first primary state | Hides the artifact graph and weakens inspectability | File-based manifests and registries with validation |
| Runtime-specific business logic in prompt files | Leads to Codex/Claude drift and prompt sprawl | Runtime-neutral core library plus thin adapters |
| Hidden citation state in agent memory | Breaks refresh, lineage, and reuse | Explicit source IDs, insight IDs, and analysis/report lineage |
| A giant append-heavy `sources.json` as the only long-term registry shape | Likely merge-conflict and update hotspot as research grows | `sources.jsonl` or another append-friendly structured source ledger |
## Stack Patterns by Variant
- Keep Node.js + TypeScript as the main implementation layer
- Keep prompts declarative and push mutations into deterministic tooling
- Add stronger Python support under `analysis/`
- Keep Python optional and isolated from the install/runtime core
- Move the source ledger from single-file JSON to append-friendly JSONL
- Keep report, insight, and manifest semantics unchanged
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js 24.x LTS | modern TypeScript toolchains | Preferred stable baseline as of 2026-04-10 |
| JSON Schema Draft 2020-12 | AJV 8.x | Good fit for registry validation |
| Codex + Claude Code adapters | local file-based artifact graph | The shared core should stay runtime-neutral |
## Sources
- Internal project context: `.planning/PROJECT.md`, `researcher/DESIGN.md`, `researcher/ARTIFACT-MODEL.md`
- OpenAI Codex docs for customization, config, AGENTS, skills, subagents, plugins, and MCP
- Anthropic Claude Code docs for skills, subagents, hooks, settings, and MCP
- Node.js release schedule and pnpm documentation
- Optional analysis/data tooling docs for `uv`, `marimo`, DuckDB, and Parquet
- Exa and Firecrawl MCP docs for search and extraction integration boundaries
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| playwright-cli | Automates browser interactions for web testing, form filling, screenshots, and data extraction. Use when the user needs to navigate websites, interact with web pages, fill forms, take screenshots, test web applications, or extract information from web pages. | `.claude/skills/playwright-cli/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
