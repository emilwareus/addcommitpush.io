'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'dark',
      themeVariables: {
        background: 'transparent',
        primaryColor: '#164e63',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#22d3ee',
        lineColor: '#a78bfa',
        secondaryColor: '#3b0764',
        secondaryTextColor: '#f8fafc',
        tertiaryColor: '#111827',
        tertiaryTextColor: '#f8fafc',
        noteBkgColor: '#312e81',
        noteTextColor: '#f8fafc',
      },
    });

    if (!containerRef.current) {
      throw new Error('Missing Mermaid diagram container');
    }

    containerRef.current.textContent = chart;
    containerRef.current.removeAttribute('data-processed');
    void mermaid.run({ nodes: [containerRef.current] });
  }, [chart]);

  return (
    <div className="my-8 overflow-x-auto rounded-md border border-border bg-muted/30 p-4">
      <div ref={containerRef} className="mermaid min-w-[640px] text-center">
        {chart}
      </div>
    </div>
  );
}
