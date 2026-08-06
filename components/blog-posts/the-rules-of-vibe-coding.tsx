import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/blog-posts/code-block';

const blogMarkdownPath = path.join(process.cwd(), 'blog/the-rules-of-vibe-coding/blog.md');
const blogMarkdown = fs.readFileSync(blogMarkdownPath, 'utf8');

type MarkdownSection = {
  heading: string;
  markdown: string;
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

  const boundaries = starts[0] === 0 ? starts : [0, ...starts];

  return boundaries.map((start, index) => {
    const end = boundaries[index + 1] ?? markdown.length;
    const sectionMarkdown = markdown.slice(start, end);
    const heading = sectionMarkdown.split('\n', 1)[0] ?? '';
    return { heading, markdown: sectionMarkdown };
  });
}

function BlogFigure({ caption, children }: { caption: ReactNode; children: ReactNode }) {
  return (
    <figure className="not-prose my-10 border border-dashed border-border bg-[var(--hover)] p-4 sm:p-6">
      {children}
      <figcaption className="mt-4 border-t border-dashed border-[var(--hair)] pt-3 font-mono text-xs leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

const ladderSteps = [
  { label: 'files', color: 'var(--success)' },
  { label: 'syntax', color: 'var(--success)' },
  { label: 'metrics', color: 'var(--success)' },
  { label: 'imports', color: 'var(--primary)' },
  { label: 'symbols', color: 'var(--primary)' },
  { label: 'tests', color: 'var(--primary)' },
  { label: 'call graph', color: 'var(--warning)' },
  { label: 'CFG', color: 'var(--warning)' },
  { label: 'data flow', color: 'var(--warning)' },
];

function FactLadderFigure() {
  const baselineY = 360;

  return (
    <BlogFigure
      caption={
        'The ladder of facts. The cheap rungs are exact and fast. The deep rungs answer richer ' +
        'policy verbs ("can reach", "before", "flows to") but every step up trades certainty for ' +
        'approximation and budgets.'
      }
    >
      <svg
        viewBox="0 0 840 430"
        role="img"
        aria-label="Staircase diagram of static-analysis fact layers, from files and syntax at the cheap end up to call graphs, control-flow graphs, and data flow at the deep end"
        className="h-auto w-full"
      >
        {ladderSteps.map((step, index) => {
          const x = 24 + index * 88;
          const height = 36 + index * 34;
          const top = baselineY - height;

          return (
            <g key={step.label}>
              <rect
                x={x}
                y={top}
                width={84}
                height={height}
                fill={step.color}
                fillOpacity={0.12}
                stroke={step.color}
                strokeWidth={1.5}
              />
              <text
                x={x + 42}
                y={top - 10}
                textAnchor="middle"
                className="font-mono"
                fontSize={13}
                fill="var(--foreground)"
              >
                {step.label}
              </text>
            </g>
          );
        })}

        <line
          x1={16}
          y1={baselineY}
          x2={824}
          y2={baselineY}
          stroke="var(--hair)"
          strokeWidth={1}
        />

        <text x={24} y={386} className="font-mono" fontSize={12} fill="var(--success)">
          exact, cheap
        </text>
        <text
          x={420}
          y={386}
          textAnchor="middle"
          className="font-mono"
          fontSize={12}
          fill="var(--primary)"
        >
          needs resolution
        </text>
        <text
          x={816}
          y={386}
          textAnchor="end"
          className="font-mono"
          fontSize={12}
          fill="var(--warning)"
        >
          approximate, budgeted
        </text>
        <text
          x={420}
          y={414}
          textAnchor="middle"
          className="font-mono"
          fontSize={12}
          fill="var(--muted-foreground)"
        >
          policy depth →
        </text>

        <text x={40} y={64} className="font-mono" fontSize={13} fill="var(--muted-foreground)">
          the moment the policy says
        </text>
        <text x={40} y={84} className="font-mono" fontSize={13} fill="var(--muted-foreground)">
          &quot;can reach&quot;, &quot;before&quot;, &quot;flows to&quot;,
        </text>
        <text x={40} y={104} className="font-mono" fontSize={13} fill="var(--muted-foreground)">
          you are up here
        </text>
        <line
          x1={264}
          y1={92}
          x2={572}
          y2={92}
          stroke="var(--muted-foreground)"
          strokeWidth={1}
          strokeDasharray="4 4"
          markerEnd="url(#vibe-arrow-muted)"
        />

        <defs>
          <marker
            id="vibe-arrow-muted"
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-foreground)" />
          </marker>
        </defs>
      </svg>
    </BlogFigure>
  );
}

function FlowNode({
  x,
  y,
  width = 190,
  height = 44,
  label,
  stroke = 'var(--border)',
  dashed = false,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  stroke?: string;
  dashed?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="var(--background)"
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 5}
        textAnchor="middle"
        className="font-mono"
        fontSize={14}
        fill="var(--foreground)"
      >
        {label}
      </text>
    </g>
  );
}

function FlowMarkers() {
  return (
    <defs>
      {(
        [
          ['vibe-arrow-default', 'var(--border)'],
          ['vibe-arrow-danger', 'var(--danger)'],
          ['vibe-arrow-success', 'var(--success)'],
          ['vibe-arrow-unknown', 'var(--muted-foreground)'],
        ] as const
      ).map(([id, fill]) => (
        <marker
          key={id}
          id={id}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={fill} />
        </marker>
      ))}
    </defs>
  );
}

function GuardDominanceFigure() {
  return (
    <BlogFigure
      caption={
        '"Guard before side effect" is a dominance question on the control-flow graph. The dashed ' +
        'path is what an innocent refactor adds: checkAccess() still sits in the file, but it no ' +
        'longer dominates writeRecord().'
      }
    >
      <svg
        viewBox="0 0 780 470"
        role="img"
        aria-label="Control-flow graph of a mutating route where checkAccess dominates writeRecord, plus a dashed bypass edge that skips the guard"
        className="mx-auto h-auto w-full max-w-[640px]"
      >
        <FlowMarkers />

        <FlowNode x={205} y={20} label="entry" />
        <FlowNode x={205} y={100} label="validate(input)" />
        <FlowNode x={205} y={190} label="checkAccess(user)" stroke="var(--success)" />
        <FlowNode x={205} y={280} label="writeRecord()" />
        <FlowNode x={205} y={370} label="return 200" />

        <FlowNode x={560} y={100} label="return 400" />
        <FlowNode x={560} y={190} label="audit(); return 403" />

        {[64, 144, 234, 324].map((y) => (
          <line
            key={y}
            x1={300}
            y1={y}
            x2={300}
            y2={y + 34}
            stroke="var(--border)"
            strokeWidth={1.5}
            markerEnd="url(#vibe-arrow-default)"
          />
        ))}

        <line
          x1={395}
          y1={122}
          x2={558}
          y2={122}
          stroke="var(--border)"
          strokeWidth={1.5}
          markerEnd="url(#vibe-arrow-default)"
        />
        <text
          x={476}
          y={112}
          textAnchor="middle"
          className="font-mono"
          fontSize={12}
          fill="var(--muted-foreground)"
        >
          invalid
        </text>

        <line
          x1={395}
          y1={212}
          x2={558}
          y2={212}
          stroke="var(--border)"
          strokeWidth={1.5}
          markerEnd="url(#vibe-arrow-default)"
        />
        <text
          x={476}
          y={202}
          textAnchor="middle"
          className="font-mono"
          fontSize={12}
          fill="var(--muted-foreground)"
        >
          denied
        </text>

        <text x={315} y={262} className="font-mono" fontSize={12.5} fill="var(--success)">
          every path must pass the guard
        </text>

        <path
          d="M 205 122 C 70 122, 70 302, 203 302"
          fill="none"
          stroke="var(--danger)"
          strokeWidth={1.5}
          strokeDasharray="6 5"
          markerEnd="url(#vibe-arrow-danger)"
        />
        <text
          transform="rotate(-90 52 212)"
          x={52}
          y={212}
          textAnchor="middle"
          className="font-mono"
          fontSize={12.5}
          fill="var(--danger)"
        >
          fast path that skips the guard
        </text>
      </svg>
    </BlogFigure>
  );
}

function TaintFlowFigure() {
  return (
    <BlogFigure
      caption={
        'Taint analysis in one picture: taint enters at a source, moves through calls, and dies at ' +
        'a barrier. A path that skips the barrier is a violation. An edge the engine cannot ' +
        'resolve is reported as unknown, never silently counted as clean.'
      }
    >
      <svg
        viewBox="0 0 780 330"
        role="img"
        aria-label="Data-flow diagram from a request-controlled source through buildCommand to a shell-execution sink, with a validated path through a barrier, an unvalidated dashed path, and an unresolved plugin-callback edge"
        className="h-auto w-full"
      >
        <FlowMarkers />

        <text x={20} y={130} className="font-mono" fontSize={11} fill="var(--danger)">
          SOURCE
        </text>
        <FlowNode x={20} y={140} width={210} label="request.query.command" stroke="var(--danger)" />

        <FlowNode x={300} y={140} width={170} label="buildCommand()" />

        <text x={560} y={130} className="font-mono" fontSize={11} fill="var(--danger)">
          SINK
        </text>
        <FlowNode x={560} y={140} width={200} label="shell.exec(cmd)" stroke="var(--danger)" />

        <text x={300} y={22} className="font-mono" fontSize={11} fill="var(--success)">
          BARRIER
        </text>
        <FlowNode x={300} y={30} width={200} label="validateCommand()" stroke="var(--success)" />

        <line
          x1={230}
          y1={162}
          x2={298}
          y2={162}
          stroke="var(--danger)"
          strokeWidth={1.5}
          markerEnd="url(#vibe-arrow-danger)"
        />

        <path
          d="M 385 140 L 385 72"
          fill="none"
          stroke="var(--success)"
          strokeWidth={1.5}
          markerEnd="url(#vibe-arrow-success)"
        />
        <path
          d="M 500 50 L 660 50 L 660 138"
          fill="none"
          stroke="var(--success)"
          strokeWidth={1.5}
          markerEnd="url(#vibe-arrow-success)"
        />
        <text x={520} y={42} className="font-mono" fontSize={12} fill="var(--success)">
          taint removed
        </text>

        <line
          x1={470}
          y1={172}
          x2={558}
          y2={172}
          stroke="var(--danger)"
          strokeWidth={1.5}
          strokeDasharray="6 5"
          markerEnd="url(#vibe-arrow-danger)"
        />
        <text
          x={514}
          y={198}
          textAnchor="middle"
          className="font-mono"
          fontSize={12}
          fill="var(--danger)"
        >
          no barrier: violation
        </text>

        <text x={300} y={252} className="font-mono" fontSize={11} fill="var(--muted-foreground)">
          UNRESOLVED EDGE
        </text>
        <FlowNode
          x={300}
          y={260}
          width={170}
          height={40}
          label="plugin callback"
          stroke="var(--muted-foreground)"
          dashed
        />
        <path
          d="M 470 280 L 660 280 L 660 188"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="2 4"
          markerEnd="url(#vibe-arrow-unknown)"
        />
        <text x={490} y={272} className="font-mono" fontSize={12} fill="var(--muted-foreground)">
          reported as unknown
        </text>
      </svg>
    </BlogFigure>
  );
}

const figuresByHeading = new Map<string, ReactNode>([
  ['# Static analysis is a ladder', <FactLadderFigure key="fact-ladder" />],
  ['# "Before" needs control flow', <GuardDominanceFigure key="guard-dominance" />],
  ['# "Flows to" needs data flow', <TaintFlowFigure key="taint-flow" />],
]);

const markdownComponents: Components = {
  h1({ children }) {
    return (
      <h2 className="display-heading mt-16 mb-6 border-b border-dashed border-[var(--hair)] pb-3 text-3xl sm:text-4xl">
        {children}
      </h2>
    );
  },
  h2({ children }) {
    return <h3 className="display-heading mt-14 mb-5 text-2xl sm:text-3xl">{children}</h3>;
  },
  h3({ children }) {
    return <h4 className="display-heading mt-12 mb-4 text-xl sm:text-2xl">{children}</h4>;
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
      <blockquote className="not-prose my-8 border border-dashed border-border px-5 py-4 font-serif text-xl font-semibold italic leading-relaxed text-primary sm:text-2xl">
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
      <code className="border border-dashed border-border bg-[var(--code)] px-1.5 py-0.5 font-mono text-[0.85em] text-primary before:content-none after:content-none">
        {children}
      </code>
    );
  },
  table({ children }) {
    return (
      <div className="not-prose my-8 overflow-x-auto border border-dashed border-border">
        <table className="w-full border-collapse text-sm [&_tbody_tr:nth-child(even)]:bg-[var(--hover)]">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-dashed border-border bg-[var(--hover)] p-3 text-left font-semibold text-primary">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-b border-border/70 p-3 align-top">{children}</td>;
  },
};

export function TheRulesOfVibeCodingContent() {
  const sections = splitMarkdownIntoSections(blogMarkdown);

  return (
    <div>
      {sections.map((section) => (
        <div key={section.heading}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {section.markdown}
          </ReactMarkdown>
          {figuresByHeading.get(section.heading) ?? null}
        </div>
      ))}
    </div>
  );
}
