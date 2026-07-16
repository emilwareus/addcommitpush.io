'use client';

import { Highlight, type Language, themes } from 'prism-react-renderer';
import { ArticleCodePanel } from '@/components/blog-posts/article-code-panel';
import { useEffect, useState } from 'react';

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const trimmed = code.replace(/\n$/, '');
  const highlightLanguage = (
    language === 'text' || language === 'txt' ? 'plain' : language
  ) as Language;

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (highlightLanguage === 'plain') {
    return (
      <ArticleCodePanel label={language}>
        <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground">
          {trimmed}
        </pre>
      </ArticleCodePanel>
    );
  }

  const theme = isDark ? themes.vsDark : themes.vsLight;

  return (
    <ArticleCodePanel label={language}>
      <Highlight theme={theme} code={trimmed} language={highlightLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed`}
            style={{ ...style, background: 'transparent' }}
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
