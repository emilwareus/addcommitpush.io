# Style and TSX Notes

This note captures how the current blog works and how the Markdown draft should become a React post later.

## Existing article style

The stronger posts are not written like papers. They usually:

- open with a personal hook or concrete analogy
- state the problem in plain language before introducing the framework
- use first person when it clarifies taste or experience
- move from story -> model -> practical steps
- include caveats instead of pretending the idea is universal
- use short paragraphs and direct headings
- include tables when comparing tools/workflows
- use code blocks sparingly but concretely
- cite sources through contextual links rather than academic footnotes everywhere

Voice traits to preserve:

- pragmatic and opinionated
- comfortable saying "I stole with pride" or "this is my experiment"
- no corporate polish
- precise but not sterile
- senior-engineer framing: tradeoffs, failure modes, caveats

## Current TSX pattern

Post components live in `components/blog-posts/<slug>.tsx`.

Typical imports:

```tsx
import {
  BlogHeading,
  BlogList,
  BlogListItem,
  BlogLink,
  Figure,
  Callout,
  Terminal,
} from '@/components/custom';
```

Common layout:

```tsx
export function WriteCodeAiAgentsLoveContent() {
  return (
    <>
      <Figure
        src="/posts/write-code-ai-agents-love/cover-optimized.webp"
        alt="..."
        caption="..."
        priority
        className="mb-12"
      />

      <div
        className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
        prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
        prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-accent
        prose-ul:text-foreground prose-ul:my-6
        prose-li:text-foreground prose-li:my-2"
      >
        ...
      </div>
    </>
  );
}
```

Use:

- `BlogHeading level={2}` for major sections.
- `BlogHeading level={3}` for subsections.
- `BlogList` and `BlogListItem` instead of raw `ul`/`li`.
- `BlogLink` for external links.
- `Callout` for punchlines or caveats.
- `Terminal` for command examples and compact file tree snippets.
- A custom table wrapper for comparisons, following `context-engineering-claude-code.tsx`.

## Likely metadata

Potential slug:

```text
write-code-ai-agents-love
```

Potential metadata:

```ts
{
  title: 'Write Code AI Agents Love',
  slug: 'write-code-ai-agents-love',
  description:
    'How to structure codebases so AI coding agents can navigate, edit, and verify changes with less guesswork.',
  publishedAt: '2026-05-13',
  tags: ['ai', 'agents', 'software', 'architecture'],
  cover: '/posts/write-code-ai-agents-love/cover-optimized.webp',
  readTime: '14 min read',
}
```

## Visual ideas

Good cover concept:

- repo as a machine-readable city/map
- code graph, tests, generated SDK, lint gate, monorepo context
- avoid generic robot typing at laptop

Potential diagrams:

1. "Prompt vs executable repo" stack:
   - prose instructions
   - docs/ADRs
   - generated SDKs
   - lint/typecheck/tests
   - CI
2. "Agent-readable context graph":
   - names
   - imports
   - types
   - docs
   - examples
   - tests
   - generated clients
3. "Three flavors":
   - custom lint rules
   - monorepo context
   - generated SDKs

## Citation approach

Do not overload the article with references. Main text should cite a few anchor sources:

- SWE-bench for real repo issue difficulty
- GraphCodeAgent / RepoGraph / chunking study for dependency-aware context
- CodeT5 / naming studies for identifiers
- Evaluating AGENTS.md for noisy context caveat
- Revisiting Modularity for the modularity caveat
- polint/plint as personal implementation example

Keep the full bibliography in research, not in the article body.
