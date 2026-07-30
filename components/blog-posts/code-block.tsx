'use client';

import { Highlight, type Language } from 'prism-react-renderer';
import { ArticleCodePanel } from '@/components/blog-posts/article-code-panel';
import { blogDark, blogLight } from '@/lib/prism-theme';
import { useDarkMode } from '@/lib/use-dark-mode';

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const trimmed = code.replace(/\n$/, '');
  const highlightLanguage = (
    language === 'text' || language === 'txt' ? 'plain' : language
  ) as Language;
  const isDark = useDarkMode();

  if (highlightLanguage === 'plain') {
    return (
      <ArticleCodePanel label={language}>
        <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground">
          {trimmed}
        </pre>
      </ArticleCodePanel>
    );
  }

  const theme = isDark ? blogDark : blogLight;

  return (
    <ArticleCodePanel label={language}>
      <Highlight theme={theme} code={trimmed} language={highlightLanguage}>
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
