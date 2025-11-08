import { BlogHeading, BlogList, BlogListItem } from "@/components/custom"
import Link from "next/link"

export function ContextEngineeringClaudeCodeContent() {
  const repoUrl = "https://github.com/emilwareus/addcommitpush.io"

  return (
    <div
      className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
        prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
        prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
        prose-code:text-sm prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded
        prose-pre:bg-muted prose-pre:border prose-pre:border-border"
    >
      <p className="text-xl text-muted-foreground italic">
        Context engineering is the deliberate structuring and compacting of information
        so agents can think clearly, act decisively, and remain reproducible.
      </p>
      
      <br />
      <p>
        In practice, that means moving away from cramming everything into a single prompt
        and toward a system where workflows are orchestrated, analysis is specialized, and
        context bloating tasks are offloaded. This post distills a working architecture built around
        three layers:
      </p>
      <BlogList variant="unordered">
        <BlogListItem>Commands; Reproducable and more deterministic workflows</BlogListItem>
        <BlogListItem>Sub-Agents; Context compression</BlogListItem>
      </BlogList>

      <BlogHeading level={2}>The Four-Phase Pipeline</BlogHeading>

      <p>
        The heartbeat of this approach is a repeatable pipeline that keeps cognitive load
        low while producing durable artifacts at every step. You move fast, with traceability:
      </p>

      <BlogList variant="unordered">
        <BlogListItem>
          Research → Plan → Implement → Validate: four phases that mirror how real work actually happens.
        </BlogListItem>
        <BlogListItem>
          Each phase produces an artifact (research doc, plan, implementation changes, validation report).
        </BlogListItem>
      </BlogList>

      <div className="not-prose my-8 p-6 bg-muted border border-border rounded-lg">
        <svg viewBox="0 0 800 200" className="w-full h-auto">
          {/* Research Phase */}
          <rect x="20" y="60" width="160" height="80" rx="8" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="2"/>
          <text x="100" y="95" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold">Research</text>
          <text x="100" y="115" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">explore codebase</text>
          <text x="100" y="130" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">search web</text>

          {/* Arrow */}
          <path d="M 180 100 L 210 100" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead)"/>

          {/* Plan Phase */}
          <rect x="210" y="60" width="160" height="80" rx="8" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="2"/>
          <text x="290" y="95" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold">Plan</text>
          <text x="290" y="115" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">propose options</text>
          <text x="290" y="130" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">capture decisions</text>

          {/* Arrow */}
          <path d="M 370 100 L 400 100" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowhead)"/>

          {/* Implement Phase */}
          <rect x="400" y="60" width="160" height="80" rx="8" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="2"/>
          <text x="480" y="95" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold">Implement</text>
          <text x="480" y="115" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">execute plan</text>
          <text x="480" y="130" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">adapt to reality</text>

          {/* Forward Arrow: Implement → Validate */}
          <path d="M 560 80 L 590 80" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowhead)"/>

          {/* Validate Phase */}
          <rect x="590" y="60" width="160" height="80" rx="8" fill="#8b5cf6" fillOpacity="0.2" stroke="#8b5cf6" strokeWidth="2"/>
          <text x="670" y="95" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold">Validate</text>
          <text x="670" y="115" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">automated +</text>
          <text x="670" y="130" textAnchor="middle" fill="currentColor" fontSize="12" opacity="0.8">manual checks</text>

          {/* Backward Arrow: Validate → Implement (iterative loop) */}
          <path d="M 590 120 L 560 120" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrowhead)"/>

          {/* Arrow marker definition */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
            </marker>
          </defs>
        </svg>
      </div>

      <p>
        Concretely, a research command spawns focused sub-agents in parallel, compacts their
        findings, and writes a document with file:line references, search results, architecture insights, etc. 
        The planning command consumes only that synthesized document (not the entire codebase, but can also explore a bit if needed), 
        proposes options, and captures the final plan. Implementation follows the plan while adapting
        to reality, and validation confirms the result with both automated checks and a short
        human review. I recommend implementing and validating incrementally, one phase at a time.
      </p>

      <BlogHeading level={2}>Commands: Workflow Orchestration</BlogHeading>

      <p>
        Commands encapsulate repeatable workflows. Each orchestrates a complete workflow,
        spawning specialized agents and producing git-tracked artifacts. Here are the five
        core commands:
      </p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-semibold">Command</th>
              <th className="text-left p-3 font-semibold">Purpose</th>
              <th className="text-left p-3 font-semibold">Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/commands/research_codebase.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  research_codebase
                </Link>
              </td>
              <td className="p-3 text-muted-foreground">
                Spawns parallel agents (locator, analyzer, pattern-finder, web-search-researcher) to explore codebase and web.
                Reads mentioned files fully before delegating.
              </td>
              <td className="p-3 font-mono text-xs">
                thoughts/shared/research/
                <br />YYYY-MM-DD_topic.md
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/commands/create_plan.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  create_plan
                </Link>
              </td>
              <td className="p-3 text-muted-foreground">
                Reads research + tickets, asks clarifying questions, proposes design options,
                iterates with user, writes spec with success criteria.
              </td>
              <td className="p-3 font-mono text-xs">
                thoughts/shared/plans/
                <br />feature-name.md
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/commands/implement_plan.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  implement_plan
                </Link>
              </td>
              <td className="p-3 text-muted-foreground">
                Executes approved plan phases sequentially, updates checkboxes, adapts when
                reality differs from spec, runs build/lint/typecheck per phase.
              </td>
              <td className="p-3 font-mono text-xs">
                Code changes +
                <br />updated plan checkboxes
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/commands/validate_plan.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  validate_plan
                </Link>
              </td>
              <td className="p-3 text-muted-foreground">
                Verifies all automated checks (build, lint, types), lists manual test steps,
                analyzes git diff, identifies deviations from plan.
              </td>
              <td className="p-3 font-mono text-xs">
                Validation report with
                <br />pass/fail + next steps
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BlogHeading level={2}>Specialized Agents</BlogHeading>

      <p>
        Agents are narrow professionals with minimal tools and crisp responsibilities. Instead
        of one agent doing everything, use small experts that return high-signal, low-volume context:
      </p>

      <BlogList variant="unordered">
        <BlogListItem>
          <strong>Locator</strong>: finds where code lives using search tools; returns structured
          file locations without reading content.
        </BlogListItem>
        <BlogListItem>
          <strong>Analyzer</strong>: reads relevant files end-to-end, traces data flow, and cites
          exact file:line references.
        </BlogListItem>
        <BlogListItem>
          <strong>Pattern Finder</strong>: surfaces working examples from the codebase, including
          test patterns and variations.
        </BlogListItem>
        <BlogListItem>
          <strong>Web Search Researcher</strong>: finds relevant information from web sources
          using strategic searches; returns synthesized findings with citations and links.
        </BlogListItem>
      </BlogList>

      <p>
        The key is constraint: each agent does one job well and returns only what the next phase
        needs. The subagent can fail, hit 404 pages, forget which directory it is in, etc.. and all that AI schinanigans will not polute the main context.
        It just outputs the clean and summarized findings to the main agent that doesn't need to know about all the failed file reads.
      </p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-semibold">Agent</th>
              <th className="text-left p-3 font-semibold">Tools</th>
              <th className="text-left p-3 font-semibold">Returns</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/agents/codebase-locator.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  codebase-locator
                </Link>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground">
                Grep, Glob, LS
              </td>
              <td className="p-3 text-muted-foreground">
                WHERE code lives: file paths grouped by purpose (impl, tests, config, types).
                No content analysis.
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/agents/codebase-analyzer.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  codebase-analyzer
                </Link>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground">
                Read, Grep, Glob, LS
              </td>
              <td className="p-3 text-muted-foreground">
                HOW code works: traces data flow, explains logic, cites exact file:line,
                identifies patterns.
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/agents/codebase-pattern-finder.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  codebase-pattern-finder
                </Link>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground">
                Read, Grep, Glob, LS
              </td>
              <td className="p-3 text-muted-foreground">
                Examples to model after: finds similar implementations, extracts code snippets,
                shows test patterns.
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/agents/thoughts-locator.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  thoughts-locator
                </Link>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground">
                Grep, Glob, LS
              </td>
              <td className="p-3 text-muted-foreground">
                Discovers docs in thoughts/ directory: past research, decisions, plans.
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/agents/thoughts-analyzer.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  thoughts-analyzer
                </Link>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground">
                Read, Grep, Glob, LS
              </td>
              <td className="p-3 text-muted-foreground">
                Extracts key insights from specific thoughts documents (historical context).
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <Link
                  href={`${repoUrl}/blob/main/thoughts/shared/agents/web-search-researcher.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline font-mono text-xs"
                >
                  web-search-researcher
                </Link>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground">
                WebSearch, WebFetch
              </td>
              <td className="p-3 text-muted-foreground">
                External docs and resources (only when user explicitly asks). Returns links.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      </div>
  )
}
