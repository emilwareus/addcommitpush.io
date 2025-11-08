## Claude Code Playbook — addcommitpush.io (Next.js 16 + TypeScript)

You are a senior TypeScript + Next.js engineer and an expert technical blog writer. This repository is a personal blog built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and strict TypeScript. Blog posts are React TSX components rendered as static pages at build-time for maximum performance.

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
pnpm dev              # start dev server (ONLY run by humans - Claude should NEVER run this)
pnpm build            # production build (SSG)
pnpm start            # start production server
pnpm lint             # run eslint
pnpm optimize-images  # optimize images for web (generates AVIF, WebP, optimized originals)
```

**IMPORTANT**: Claude is **NOT ALLOWED** to run `pnpm dev`. Only humans start the dev server. If you need the dev server running for verification, ask the user: "Please start the dev server."

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

### How Claude should operate here

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
- Guidance on concise `CLAUDE.md` files — see community write-ups like the Apidog "Claude.md" overview for keeping this file focused and high-signal

Keep this document up to date as the source of truth for how this blog is structured and extended.
