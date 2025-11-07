## Claude Code Playbook — addcommitpush.io (Next.js 16 + TypeScript)

You are a senior TypeScript + Next.js engineer and an expert technical blog writer. This repository is a personal blog built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and strict TypeScript. Content lives as MDX files compiled at build-time into static pages for maximum performance.

Follow this playbook precisely. Be bold: prefer single, clean solutions. Remove legacy paths rather than maintaining dual systems.

---

### Non‑negotiables
- Use App Router only. Do not introduce Pages Router APIs (no `getStaticProps`, `getStaticPaths`).
- Render posts as fully static. Prefer SSG. Enforce with `export const dynamic = "error"` and `export const revalidate = false` on blog routes.
- Default to Server Components. Mark Client Components explicitly with `"use client"` only when necessary.
- TypeScript strictly typed. No `any`. Clear, descriptive names; early returns; minimal nesting; no unnecessary try/catch.
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
pnpm dev      # start dev server
pnpm build    # production build (SSG)
pnpm start    # start production server
pnpm lint     # run eslint
```

---

### Blog architecture

- Content source: `content/posts/**/*.mdx`
- Routes:
  - Index/list: `app/(site)/blog/page.tsx`
  - Detail: `app/(site)/blog/[slug]/page.tsx`
  - Optional tag index: `app/(site)/tags/[tag]/page.tsx`
- Assets for posts: `public/posts/<slug>/*` (cover images, diagrams, etc.)
- Enforce static generation for all blog pages:
  - `export const dynamic = "error"`
  - `export const revalidate = false`
  - `export async function generateStaticParams()` reads all slugs from `content/posts`

MDX processing options (opinionated):
- Use `@next/mdx` for MDX support in Next 16 App Router.
- Recommended plugins:
  - `remark-gfm` (tables, strikethrough)
  - `remark-smartypants`
  - `rehype-slug` and `rehype-autolink-headings` (a11y-friendly anchored headings)
  - `rehype-pretty-code` (code syntax highlighting)

SEO & discoverability:
- `app/sitemap.ts` and `app/robots.ts`
- `generateMetadata` in route files for per-post OG/SEO
- Build-time RSS/Atom feed at `/feed.xml` and `/feed.atom` from post frontmatter

---

### Post schema (frontmatter)

Every MDX file under `content/posts/` must start with YAML frontmatter that conforms to this shape (types shown for clarity):

```yaml
---
title: "<Human-readable title>"            # string (required)
slug: "<kebab-case-slug>"                  # string (required, unique)
description: "<120–160 chars>"             # string (required, for SEO)
publishedAt: "2025-01-15"                  # YYYY-MM-DD or ISO date (required)
updatedAt: "2025-01-20"                    # optional, ISO date
tags: [nextjs, typescript, performance]     # string[] (optional)
cover: "/posts/<slug>/cover.jpg"          # optional path under public/
draft: false                                # boolean (default false)
canonicalUrl: "https://..."                # optional
ogImage: "/posts/<slug>/og.png"           # optional path under public/
---
```

Constraints:
- `slug` must match filename (e.g. `content/posts/<slug>.mdx`).
- Draft posts are excluded from production builds and feeds.
- Reading time is computed; do not store it.

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
  - Use MDX fenced code blocks with language tags, keep lines < 100 chars.
  - Add alt text for every image. Use vector/SVG when possible; fall back to optimized PNG/JPEG.

Example post skeleton (MDX):

```mdx
---
title: "SSR-free static MDX with Next 16"
slug: "static-mdx-next-16"
description: "How to render MDX posts as fully static pages in Next.js 16."
publishedAt: "2025-01-15"
tags: [nextjs, mdx, performance]
cover: "/posts/static-mdx-next-16/cover.png"
---

> TL;DR: Use App Router + `@next/mdx` + static params. Avoid Pages Router APIs.

## Key takeaways
- Fully static posts are fast, cacheable, and easy to deploy
- `generateStaticParams` drives SSG for dynamic routes
- Keep MDX plugins minimal and audited

## Example

```tsx
// app/(site)/blog/[slug]/page.tsx
export const dynamic = "error";
export const revalidate = false;

export async function generateStaticParams() {
  // read slugs from content/posts
}

export default async function PostPage({ params }) {
  // load and render MDX for params.slug
}
```

## Pitfalls
- Do not use Pages Router APIs in App Router
- Avoid client components unless necessary

## References
- Next.js App Router MDX docs
```

---

### Implementation checklist (single, clean approach)

1) MDX pipeline
- Add `@next/mdx` to `next.config.ts` with recommended remark/rehype plugins
- Support `.mdx` imports from `content/posts`

2) Content loader
- Implement a small library `lib/posts.ts` to:
  - read `content/posts` from the filesystem at build time
  - parse frontmatter, validate schema, and compute derived fields
  - expose `getAllPosts()` and `getPostBySlug(slug)` returning typed data

3) Routes
- `app/(site)/blog/page.tsx`: list posts (exclude drafts), sorted by `publishedAt`
- `app/(site)/blog/[slug]/page.tsx`: render MDX for a single post
- Use `generateStaticParams` and `generateMetadata`
- Set `dynamic = "error"` and `revalidate = false`

4) SEO & feeds
- `app/sitemap.ts` and `app/robots.ts`
- Build-time RSS/Atom generation under `public/`

5) Assets & images
- Store per-post media under `public/posts/<slug>/`
- Use `next/image` for responsive, optimized images with explicit `alt`

6) Quality gates
- `pnpm lint` must pass
- Add a `typecheck` script (tsc --noEmit) and keep it green

---

### Conventions & constraints

- Project structure (high-level):
  - `app/` — App Router pages/components
  - `content/posts/` — MDX sources
  - `lib/` — shared utilities (no React code here)
  - `public/` — static assets
- Code style:
  - Server Components by default; colocate minimal Client Components
  - Descriptive naming, short functions, early exits
  - No dead code; remove unused exports; keep modules focused

---

### How Claude should operate here

- When asked to add a post:
  - Propose a `slug`, create `content/posts/<slug>.mdx` with required frontmatter
  - Create a `public/posts/<slug>/` folder for media and reference them with absolute `/posts/<slug>/…` paths
  - Ensure the new post is picked up by the static params generator
- When asked to add features:
  - Implement the single chosen approach end-to-end; do not keep legacy pathways
  - Update types, metadata, and feeds accordingly
- Keep PRs focused and small. Include a brief rationale and before/after notes.

---

### References and best practices

- Next.js App Router docs (MDX, metadata, SSG) — see the official Next.js documentation
- MDX in Next — prefer `@next/mdx` with minimal, audited plugins
- Guidance on concise `CLAUDE.md` files — see community write-ups like the Apidog "Claude.md" overview for keeping this file focused and high-signal

Keep this document up to date as the source of truth for how this blog is structured and extended.


