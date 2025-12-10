'use client';

import { cn } from '@/lib/utils';
import { Terminal } from '@/components/custom';

interface DiffusionLoopStepProps {
  className?: string;
}

export function DiffusionLoopStep({ className }: DiffusionLoopStepProps) {
  return (
    <div
      className={cn(
        'prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none',
        'prose-headings:text-primary prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3',
        'prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4 prose-ul:text-foreground prose-li:my-1',
        className
      )}
    >
      <p className="text-xs uppercase tracking-widest text-secondary">Diffusion Loop</p>
      <h3>One iteration (practical walkthrough)</h3>

      <h4>Step 1: Generate research questions</h4>
      <p>
        Tool: <code>think</code>. Identify draft gaps and propose diverse research questions tied to
        those gaps.
      </p>
      <Terminal className="my-4">
        {`think:
  reflection: |
    Uptime claims are vague; need Cloudflare outage history and SLA terms (2023–2025).
    Compare public incident reports vs. status page claims.`}
      </Terminal>
      <p>Expected: 3–5 targeted questions, each mapped to a draft gap with scope/priority notes.</p>

      <h4>Step 2: ConductResearch (parallel)</h4>
      <p>
        Tool: <code>ConductResearch</code>. Delegate distinct questions to sub-agents with explicit
        instructions and expected returns.
      </p>
      <Terminal className="my-4">
        {`ConductResearch:
  research_topic: |
    Collect primary sources on Cloudflare outages and SLA/uptime guarantees (2023–2025).
    Return: URLs, outage timelines, SLA terms, and any compensations offered.`}
      </Terminal>
      <p>Expected: cited findings (URLs + quotes) per sub-agent, deduped URLs, short summaries.</p>

      <h4>Step 3: refine_draft_report</h4>
      <p>
        Tool: <code>refine_draft_report</code>. Fold new findings into the draft; keep structure
        concise to conserve context.
      </p>
      <Terminal className="my-4">
        {`refine_draft_report:
  research_brief: "<brief>"
  findings: "<citations + quotes>"
  draft_report: "<current draft>"`}
      </Terminal>
      <p>
        Expected: draft updated with citations/quotes; bullets or short paragraphs retained for
        clarity and context efficiency.
      </p>

      <h4>Step 4: Assess completeness</h4>
      <p>Heuristic: diverse new searches should stop yielding new facts. If not, loop again.</p>
      <Terminal className="my-4">
        {`Checklist:
- New queries tried? (global + section-specific)
- Any new sources or facts? If yes, continue loop
- If no, call ResearchComplete`}
      </Terminal>
      <p>
        Expected: a clear decision to continue or call <code>ResearchComplete</code>, with rationale
        noted.
      </p>
    </div>
  );
}
