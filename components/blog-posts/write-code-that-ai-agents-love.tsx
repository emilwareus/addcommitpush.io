import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/blog-posts/code-block';
import { BlogSlideFrame } from '@/components/presentations/write-code-ai-agents-love/blog-slide-frame';
import { AgenticLoopSlide } from '@/components/presentations/write-code-ai-agents-love/slides/03-agentic-loop';
import { AgentsMdSlide } from '@/components/presentations/write-code-ai-agents-love/slides/05-agents-md';
import { BoundedContextSlide } from '@/components/presentations/write-code-ai-agents-love/slides/07-bounded-context';
import { CodeQualitySlide } from '@/components/presentations/write-code-ai-agents-love/slides/09-code-quality';
import { CodeQualityEvidenceSlide } from '@/components/presentations/write-code-ai-agents-love/slides/10-code-quality-evidence';
import {
  CodeQualityStructureVisual,
  type TestMode,
} from '@/components/presentations/write-code-ai-agents-love/slides/11-code-quality-structure';
import { GeneratedSdksSlide } from '@/components/presentations/write-code-ai-agents-love/slides/12-generated-sdks';
import { CustomRulesSlide } from '@/components/presentations/write-code-ai-agents-love/slides/13-custom-rules';
import { ImpactEffortSlide } from '@/components/presentations/write-code-ai-agents-love/slides/14-impact-effort';
import { SlideShell } from '@/components/presentations/write-code-ai-agents-love/slides/shared';

const blogMarkdownPath = path.join(
  process.cwd(),
  'blog/write-code-that-ai-loves/blog.md'
);

const blogMarkdown = fs.readFileSync(blogMarkdownPath, 'utf8');

type MarkdownSection = {
  heading: string;
  markdown: string;
};

type ReferenceGroup =
  | {
      title: string;
      kind: 'inline';
      markdown: string;
    }
  | {
      title: string;
      kind: 'list';
      items: string[];
    };

type ReferenceEntry = {
  category: string;
  title: string;
  href: string;
  sections: string[];
};

type InsightEntry = {
  title: string;
  href: string;
  sections: string[];
};

type CollectedReferences = {
  references: ReferenceEntry[];
  insights: InsightEntry[];
};

function splitMarkdownIntoSections(markdown: string): MarkdownSection[] {
  const starts: number[] = [];
  let inFence = false;
  let offset = 0;

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      inFence = !inFence;
    }

    if (!inFence && /^#{1,3} .+$/.test(line)) {
      starts.push(offset);
    }

    offset += line.length + 1;
  }

  return starts.map((start, index) => {
    const end = starts[index + 1] ?? markdown.length;
    const sectionMarkdown = markdown.slice(start, end);
    const heading = sectionMarkdown.split('\n', 1)[0] ?? '';
    return { heading, markdown: sectionMarkdown };
  });
}

function splitBeforeSources(markdown: string) {
  const sourceMatch = markdown.match(/\n(?:\*\*(Insights|Sources):\*\*|Master index:)/);

  if (!sourceMatch?.index) {
    return { body: markdown, sources: '' };
  }

  return {
    body: markdown.slice(0, sourceMatch.index),
    sources: markdown.slice(sourceMatch.index),
  };
}

function MarkdownBlock({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {markdown}
    </ReactMarkdown>
  );
}

function normalizeReferenceMarkdown(markdown: string) {
  return markdown.replace(/`\[([^\]]+)\]\(([^)]+)\)`/g, '[$1]($2)');
}

function parseReferenceBlock(markdown: string): ReferenceGroup[] {
  const lines = markdown.split('\n');
  const groups: ReferenceGroup[] = [];
  let currentList: { title: string; items: string[] } | null = null;

  function flushList() {
    if (!currentList) return;
    groups.push({ title: currentList.title, kind: 'list', items: currentList.items });
    currentList = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    const inlineMatch = trimmed.match(/^\*\*(Insights|Sources):\*\*\s*(.+)$/);
    if (inlineMatch) {
      flushList();
      groups.push({
        title: inlineMatch[1],
        kind: 'inline',
        markdown: inlineMatch[2],
      });
      continue;
    }

    const headingMatch = trimmed.match(/^\*\*(Papers|Practitioner|Official docs)\*\*$/);
    if (headingMatch) {
      flushList();
      currentList = { title: headingMatch[1], items: [] };
      continue;
    }

    if (trimmed.startsWith('Plot data:')) {
      flushList();
      groups.push({
        title: 'Plot data',
        kind: 'inline',
        markdown: trimmed.replace(/^Plot data:\s*/, ''),
      });
      continue;
    }

    if (trimmed.startsWith('Master index:')) {
      flushList();
      continue;
    }

    if (trimmed.startsWith('- ') && currentList) {
      currentList.items.push(trimmed.slice(2));
      continue;
    }

    if (currentList) {
      currentList.items.push(trimmed);
      continue;
    }

    groups.push({
      title: 'Sources',
      kind: 'inline',
      markdown: trimmed,
    });
  }

  flushList();
  return groups;
}

function extractMarkdownLinks(markdown: string) {
  const normalized = normalizeReferenceMarkdown(markdown);

  return [...normalized.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => ({
    label: match[1],
    href: match[2],
  }));
}

function insightTitleFromHref(href: string) {
  const insightPath = path.join(process.cwd(), href.replace(/^\.\.\/\.\.\//, ''));
  const insightMarkdown = fs.readFileSync(insightPath, 'utf8');
  const firstHeading = insightMarkdown.split('\n', 1)[0] ?? '';

  return firstHeading
    .replace(/^#\s*/, '')
    .replace(/^INSIGHT\s+\d+:\s*/, '')
    .trim();
}

function collectReferenceEntries(sections: MarkdownSection[]): CollectedReferences {
  const entryMap = new Map<string, ReferenceEntry>();
  const insightMap = new Map<string, InsightEntry>();

  for (const section of sections) {
    const { sources } = splitBeforeSources(section.markdown);
    const groups = parseReferenceBlock(sources);

    for (const group of groups) {
      const chunks =
        group.kind === 'inline'
          ? extractMarkdownLinks(group.markdown).map((link) => `[${link.label}](${link.href})`)
          : group.items;

      for (const chunk of chunks) {
        const links = extractMarkdownLinks(chunk);
        if (links.length === 0) continue;

        const primary = links[0];
        const key = primary.href;

        if (group.title === 'Insights') {
          const existingInsight = insightMap.get(key);

          if (existingInsight) {
            if (!existingInsight.sections.includes(section.heading)) {
              existingInsight.sections.push(section.heading);
            }

            continue;
          }

          insightMap.set(key, {
            title: insightTitleFromHref(primary.href),
            href: primary.href,
            sections: [section.heading],
          });

          continue;
        }

        const existing = entryMap.get(key);

        if (existing) {
          if (!existing.sections.includes(section.heading)) {
            existing.sections.push(section.heading);
          }

          continue;
        }

        entryMap.set(key, {
          category: group.title,
          title: primary.label,
          href: primary.href,
          sections: [section.heading],
        });
      }
    }
  }

  return {
    references: [...entryMap.values()],
    insights: [...insightMap.values()],
  };
}

function PaperReferences({ references, insights }: CollectedReferences) {
  if (references.length === 0 && insights.length === 0) return null;

  return (
    <section className="not-prose mt-20 border-t border-primary/30 pt-8">
      <h2 className="mb-5 text-2xl font-bold text-primary">References</h2>

      {insights.length > 0 ? (
        <div className="mb-7 rounded-md border border-primary/25 bg-primary/5 p-4">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary/75">
            Insights
          </h3>
          <div className="grid gap-x-6 gap-y-2 text-sm leading-5 sm:grid-cols-2">
            {insights.map((insight) => (
              <a
                key={insight.href}
                href={insight.href}
                className="text-foreground underline decoration-primary/35 underline-offset-2 hover:text-primary hover:decoration-primary"
              >
                {insight.title}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <ol className="space-y-2 text-[13px] leading-5 text-muted-foreground sm:text-sm">
        {references.map((entry, index) => (
          <li key={entry.href} className="grid gap-x-3 md:grid-cols-[46px_1fr]">
            <span className="font-mono text-primary/70">[{index + 1}]</span>
            <span>
              <span>{entry.category}.</span>
              <span> </span>
              <a
                href={entry.href}
                target={entry.href.startsWith('http') ? '_blank' : undefined}
                rel={entry.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-foreground underline decoration-primary/35 underline-offset-2 hover:text-primary hover:decoration-primary"
              >
                {entry.title}
              </a>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SlideFigure({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <BlogSlideFrame compact={compact}>{children}</BlogSlideFrame>;
}

function TestSlideFigure({ mode }: { mode: TestMode }) {
  return (
    <SlideFigure compact>
      <SlideShell>
        <CodeQualityStructureVisual mode={mode} />
      </SlideShell>
    </SlideFigure>
  );
}

const testVisuals: { mode: TestMode; caption: ReactNode }[] = [
  {
    mode: 'system',
    caption: (
      <>
        Start by drawing <strong>one bounded context</strong>: ports, app, domain, adapters, and the
        data it owns. Everything else stays outside. This is the box every test below is scoped
        against.
      </>
    ),
  },
  {
    mode: 'unit',
    caption: (
      <>
        <strong>Unit tests</strong> isolate the rule: domain and application logic only, no network
        and no database. Fast, stable, and the cheapest feedback you can hand an agent for corner
        cases.
      </>
    ),
  },
  {
    mode: 'adapter',
    caption: (
      <>
        <strong>Adapter (integration) tests</strong> check one real dependency at a time, against a
        real database or broker. They prove the SQL, transactions, and queries actually work, not
        just that they compile.
      </>
    ),
  },
  {
    mode: 'component',
    caption: (
      <>
        <strong>Component tests</strong> run the public API through the whole service, with real
        owned infrastructure and only external services mocked. This is the agent sweet spot: easy to
        read, easy to keep stable, and they test user behavior instead of implementation details.
      </>
    ),
  },
  {
    mode: 'e2e',
    caption: (
      <>
        <strong>End-to-end tests</strong> deploy the system together and follow a client path across
        services. They prove the contract holds, but they are slow and flaky, so keep them for the
        critical journeys only.
      </>
    ),
  },
  {
    mode: 'matrix',
    caption: (
      <>
        The boundary decides the test. <strong>Component and E2E</strong> read like acceptance
        criteria for the business case; <strong>unit and adapter</strong> stay diagnostic. Put each
        test where it actually proves something.
      </>
    ),
  },
];

function TestVisuals() {
  return (
    <div className="not-prose space-y-10">
      {testVisuals.map(({ mode, caption }) => (
        <div key={mode}>
          <p className="mb-3 text-base leading-8 text-foreground text-pretty sm:text-lg md:text-xl">
            {caption}
          </p>
          <TestSlideFigure mode={mode} />
        </div>
      ))}
    </div>
  );
}

const visualsByHeading = new Map<string, ReactNode>([
  [
    '# The loop',
    <SlideFigure key="agentic-loop">
      <AgenticLoopSlide />
    </SlideFigure>,
  ],
  [
    '### Agents.md/Claude.md',
    <SlideFigure key="agents-md">
      <AgentsMdSlide />
    </SlideFigure>,
  ],
  [
    '### Bounded Context / Layout',
    <SlideFigure key="bounded-context">
      <BoundedContextSlide />
    </SlideFigure>,
  ],
  [
    '### "Code Quality": "how easy is this code to change?"',
    <div key="code-quality" className="not-prose">
      <SlideFigure>
        <CodeQualitySlide />
      </SlideFigure>
      <SlideFigure>
        <CodeQualityEvidenceSlide />
      </SlideFigure>
    </div>,
  ],
  ['### Tests', <TestVisuals key="tests" />],
  [
    '### Generated SDKs',
    <SlideFigure key="generated-sdks">
      <GeneratedSdksSlide />
    </SlideFigure>,
  ],
  [
    '## The Tools',
    <SlideFigure key="custom-rules">
      <CustomRulesSlide />
    </SlideFigure>,
  ],
  [
    '## Conclusion',
    <SlideFigure key="impact-effort">
      <ImpactEffortSlide />
    </SlideFigure>,
  ],
]);

const markdownComponents: Components = {
  h1({ children }) {
    return (
      <h2 className="mt-16 mb-6 border-b border-primary/30 pb-3 text-3xl font-bold text-primary neon-glow sm:text-4xl">
        {children}
      </h2>
    );
  },
  h2({ children }) {
    return (
      <h3 className="mt-14 mb-5 text-2xl font-bold text-primary neon-glow sm:text-3xl">
        {children}
      </h3>
    );
  },
  h3({ children }) {
    return <h4 className="mt-12 mb-4 text-xl font-bold text-primary sm:text-2xl">{children}</h4>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  p({ children }) {
    return <p className="my-5 leading-8 text-foreground text-pretty">{children}</p>;
  },
  ul({ children }) {
    return <ul className="my-6 list-disc space-y-1.5 pl-6 marker:text-primary">{children}</ul>;
  },
  ol({ children }) {
    return (
      <ol className="my-6 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-primary/70">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="my-2 pl-1 leading-8 text-foreground text-pretty">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="not-prose my-8 rounded-r-lg border-l-4 border-primary bg-primary/5 py-4 pr-6 pl-6 text-xl font-semibold italic leading-relaxed text-primary neon-glow sm:text-2xl">
        {children}
      </blockquote>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className ?? '');

    if (match) {
      return <CodeBlock code={String(children)} language={match[1]} />;
    }

    return (
      <code className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.85em] text-primary before:content-none after:content-none">
        {children}
      </code>
    );
  },
  table({ children }) {
    return (
      <div className="not-prose my-8 overflow-x-auto rounded-lg border border-border bg-card/30">
        <table className="w-full border-collapse text-sm [&_tbody_tr:nth-child(even)]:bg-muted/20">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-border bg-muted/40 p-3 text-left font-semibold text-primary">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-b border-border/70 p-3 align-top">{children}</td>;
  },
};

function RenderSection({ section }: { section: MarkdownSection }) {
  const visual = visualsByHeading.get(section.heading);
  const { body, sources } = splitBeforeSources(section.markdown);

  if (!visual && !sources) {
    return <MarkdownBlock markdown={section.markdown} />;
  }

  return (
    <>
      <MarkdownBlock markdown={body} />
      {visual ?? null}
    </>
  );
}

export function WriteCodeThatAiAgentsLoveContent() {
  const sections = splitMarkdownIntoSections(blogMarkdown);

  return (
    <div
      className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
      prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
      prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
      prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
      prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
      prose-strong:text-accent
      prose-ul:text-foreground prose-ul:my-6
      prose-li:text-foreground prose-li:my-2
      prose-blockquote:border-primary prose-blockquote:text-foreground
      prose-code:text-sm prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono
      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:rounded-lg"
    >
      {sections.map((section) => (
        <RenderSection key={section.heading} section={section} />
      ))}
    </div>
  );
}

export function WriteCodeThatAiAgentsLoveReferences() {
  const sections = splitMarkdownIntoSections(blogMarkdown);
  const references = collectReferenceEntries(sections);

  return <PaperReferences {...references} />;
}
