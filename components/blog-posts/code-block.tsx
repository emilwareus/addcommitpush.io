'use client';

import { Highlight, type Language, themes } from 'prism-react-renderer';

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const trimmed = code.replace(/\n$/, '');
  const highlightLanguage = (
    language === 'text' || language === 'txt' ? 'plain' : language
  ) as Language;

  return (
    <div className="not-prose my-7 overflow-hidden border border-dashed border-border bg-transparent">
      <Highlight theme={themes.vsDark} code={trimmed} language={highlightLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed`}
            style={{ ...style, background: 'transparent', color: 'var(--foreground)' }}
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
    </div>
  );
}
