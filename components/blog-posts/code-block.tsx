'use client';

import { Highlight, type Language, themes } from 'prism-react-renderer';
import { ArticleCodePanel } from '@/components/blog-posts/article-code-panel';

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
      <Highlight theme={themes.vsDark} code={trimmed} language={highlightLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed`}
            style={{ ...style, background: 'transparent', color: 'var(--foreground)' }}
          >
            {tokens.map((line, lineIndex) => {
              const lineProps = getLineProps({ line });
              return (
                <div key={lineIndex} {...lineProps}>
                  {line.map((token, tokenIndex) => {
                    const tokenProps = getTokenProps({ token });
                    return (
                      <span
                        key={tokenIndex}
                        {...tokenProps}
                        style={{ ...tokenProps.style, color: 'inherit' }}
                      />
                    );
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
