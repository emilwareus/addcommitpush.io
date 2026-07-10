'use client';

import { Highlight, type Language, type PrismTheme } from 'prism-react-renderer';
import { ArticleCodePanel } from '@/components/blog-posts/article-code-panel';

const articleCodeTheme: PrismTheme = {
  plain: {
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: 'var(--muted-foreground)', fontStyle: 'italic' },
    },
    {
      types: ['punctuation', 'operator'],
      style: { color: 'var(--foreground)' },
    },
    {
      types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol', 'deleted'],
      style: { color: 'var(--primary)' },
    },
    {
      types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: { color: 'var(--success)' },
    },
    {
      types: ['atrule', 'attr-value', 'keyword'],
      style: { color: 'var(--warning)' },
    },
    {
      types: ['function', 'class-name'],
      style: { color: 'var(--info)' },
    },
    {
      types: ['regex', 'important', 'variable'],
      style: { color: 'var(--danger)' },
    },
  ],
};

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const trimmed = code.replace(/\n$/, '');
  const highlightLanguage = (
    language === 'text' || language === 'txt' ? 'plain' : language
  ) as Language;

  if (highlightLanguage === 'plain') {
    return (
      <ArticleCodePanel label={language}>
        <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground">
          {trimmed}
        </pre>
      </ArticleCodePanel>
    );
  }

  return (
    <ArticleCodePanel label={language}>
      <Highlight theme={articleCodeTheme} code={trimmed} language={highlightLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed`}
            style={style}
          >
            {tokens.map((line, lineIndex) => {
              const lineProps = getLineProps({ line });
              return (
                <div key={lineIndex} {...lineProps}>
                  {line.map((token, tokenIndex) => {
                    const tokenProps = getTokenProps({ token });
                    return <span key={tokenIndex} {...tokenProps} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </ArticleCodePanel>
  );
}
