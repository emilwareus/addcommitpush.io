import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-foreground prose-headings:font-serif prose-a:text-primary prose-pre:border prose-pre:border-dashed prose-pre:border-border prose-pre:bg-code">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a
              href={href}
              rel="noreferrer noopener"
              target={href?.startsWith('http') ? '_blank' : undefined}
            >
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
