'use client';

import { Highlight, type Language, themes } from 'prism-react-renderer';

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const trimmed = code.replace(/\n$/, '');
  const highlightLanguage = (
    language === 'text' || language === 'txt' ? 'plain' : language
  ) as Language;

  return (
    <div className="not-prose my-7 overflow-hidden rounded-lg border border-border bg-zinc-950 shadow-lg shadow-black/20">
      <Highlight theme={themes.vsDark} code={trimmed} language={highlightLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} overflow-x-auto p-5 font-mono text-[13px] leading-relaxed sm:text-sm`}
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
    </div>
  );
}
