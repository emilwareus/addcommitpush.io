import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from '@/components/brain/mermaid-diagram';

interface MarkdownInsightProps {
  markdown: string;
}

const markdownComponents: Components = {
  h1({ children }) {
    return <h1 className="display-heading mb-6 text-[clamp(2.4rem,6vw,4rem)]">{children}</h1>;
  },
  h2({ children }) {
    return (
      <h2 className="display-heading mt-12 mb-5 text-2xl leading-tight text-balance md:text-3xl">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return <h3 className="display-heading mt-10 mb-4 text-xl leading-tight">{children}</h3>;
  },
  p({ children }) {
    return <p className="my-5 text-base leading-8 md:text-lg">{children}</p>;
  },
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
  ul({ children }) {
    return (
      <ul className="my-5 list-disc space-y-2 pl-6 text-base leading-8 md:text-lg">{children}</ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="my-5 list-decimal space-y-2 pl-6 text-base leading-8 md:text-lg">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="pl-1">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-8 border border-dashed border-border px-5 py-4 font-serif text-lg italic leading-relaxed text-primary">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-8 overflow-x-auto border border-dashed border-border">
        <table className="min-w-full border-collapse text-left text-sm leading-relaxed">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-[var(--hover)] text-foreground">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-dashed divide-border">{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="align-top">{children}</tr>;
  },
  th({ children }) {
    return (
      <th className="border-r border-dashed border-border px-4 py-3 font-semibold last:border-r-0">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border-r border-dashed border-border px-4 py-3 last:border-r-0">{children}</td>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children }) {
    const code = String(children).replace(/\n$/, '');
    const language = className?.replace('language-', '');

    if (language === 'mermaid') {
      return <MermaidDiagram chart={code} />;
    }

    if (language) {
      return (
        <div className="my-8 overflow-hidden border border-dashed border-border bg-[var(--hover)]">
          <div className="border-b border-dashed border-border px-4 py-2 font-mono text-xs text-muted-foreground">
            {language}
          </div>
          <pre className="overflow-x-auto p-4">
            <code className="font-mono text-sm leading-7">{code}</code>
          </pre>
        </div>
      );
    }

    return (
      <code className="bg-[var(--code)] px-1.5 py-0.5 font-mono text-sm text-foreground">
        {children}
      </code>
    );
  },
};

export function MarkdownInsight({ markdown }: MarkdownInsightProps) {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
