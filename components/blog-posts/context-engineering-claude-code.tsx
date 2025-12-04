import {
  BlogHeading,
  BlogList,
  BlogListItem,
  BlogLink,
  Figure,
  Terminal,
} from '@/components/custom';
import { AudioPlayer } from '@/components/audio-player';

export function ContextEngineeringClaudeCodeContent() {
  return (
    <>
      <Figure
        src="/posts/context-engineering-claude-code/cover-optimized.webp"
        alt="Advanced context engineering for coding agents"
        caption="Advanced context engineering"
        priority
        className="mb-12"
      />

      <AudioPlayer
        audioUrl="/posts/context-engineering-claude-code/audio.mp3"
        title="Context Engineering for Claude Code - Audio Version"
      />

      <br />

      <br />
      <div
        className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
        prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
        prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-accent
        prose-ul:text-foreground prose-ul:my-6
        prose-li:text-foreground prose-li:my-2
        prose-code:text-sm prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono
        prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:rounded-lg"
      >
        <p>
          Context engineering is the deliberate structuring and compacting of information so agents
          can think clearly, act decisively, and remain reproducible.
        </p>

        <p>
          In practice, that means moving away from cramming everything into a single prompt and
          toward a system where workflows are orchestrated, analysis is specialized, and
          context-bloating tasks are offloaded. This note distills a working architecture built
          around two layers:
        </p>

        <BlogList variant="unordered">
          <BlogListItem>Commands: reproducible and more deterministic workflows</BlogListItem>
          <BlogListItem>Sub-agents: context compression</BlogListItem>
        </BlogList>

        <BlogHeading level={2}>Who is this article for? </BlogHeading>

        <p>
          You have already spent more on AI coding tools the last 6 months than any other tools in
          your 10-year coding career. You have done a few passes on the CLAUDE.md file, used a few
          MCP tools, but realized this didn&apos;t speed you up as much as you wished.
        </p>

        <br />

        <p>
          But first, these are not my ideas! I stole with pride! This approach was pioneered by{' '}
          <BlogLink href="https://github.com/ai-that-works/ai-that-works/tree/main/2025-08-05-advanced-context-engineering-for-coding-agents">
            Dex and Vaibhav from AI That Works
          </BlogLink>
          , who shared their original commands and agents. You can watch{' '}
          <BlogLink href="https://www.youtube.com/watch?v=42AzKZRNhsk">
            their podcast episode
          </BlogLink>{' '}
          where they dive deep into advanced context engineering for coding agents. Massive thanks
          to them for sharing this framework!
        </p>

        <BlogHeading level={2}>The Four-Phase Pipeline</BlogHeading>

        <p>
          The main part of this approach is a repeatable pipeline that keeps cognitive load low
          while producing durable artifacts at every step. You move fast, with traceability:
        </p>

        <BlogList variant="unordered">
          <BlogListItem>
            Research → Plan → Implement → Validate: four phases that mirror how real work actually
            happens.
          </BlogListItem>
          <BlogListItem>
            Each phase produces an artifact (research doc, plan, implementation changes, validation
            report).
          </BlogListItem>
        </BlogList>

        <p>
          Concretely, a research command spawns focused sub-agents in parallel, compacts their
          findings, and writes a document with file:line references, search results, architecture
          insights, etc. The planning command consumes only that synthesized document (not the
          entire codebase, but can also explore a bit if needed), proposes options, and captures the
          final plan. Implementation follows the plan while adapting to reality, and validation
          confirms the result with both automated checks and a short human review. Implement and
          validate incrementally, one phase at a time.
        </p>

        <BlogHeading level={2}>Commands: Workflow Orchestration</BlogHeading>

        <p>
          Commands encapsulate repeatable workflows. Each orchestrates a complete workflow, spawning
          specialized agents and producing git-tracked artifacts. Core commands:
        </p>

        <div className="not-prose my-10 overflow-x-auto rounded-lg border border-border p-2">
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
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/research_codebase.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    research_codebase
                  </a>
                </td>
                <td className="p-3 text-muted-foreground">
                  Spawns parallel agents (locator, analyzer, pattern-finder, web-search-researcher)
                  to explore codebase and web. Reads mentioned files fully before delegating.
                </td>
                <td className="p-3 font-mono text-xs">
                  thoughts/shared/research/ YYYY-MM-DD_topic.md
                </td>
              </tr>
              <tr>
                <td className="p-3">
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/create_plan.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    create_plan
                  </a>
                </td>
                <td className="p-3 text-muted-foreground">
                  Reads research + tickets, asks clarifying questions, proposes design options,
                  iterates with the user, writes spec with success criteria.
                </td>
                <td className="p-3 font-mono text-xs">thoughts/shared/plans/ feature-name.md</td>
              </tr>
              <tr>
                <td className="p-3">
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/implement_plan.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    implement_plan
                  </a>
                </td>
                <td className="p-3 text-muted-foreground">
                  Executes approved plan phases sequentially, updates checkboxes, adapts when
                  reality differs from spec, runs build/lint/typecheck per phase.
                </td>
                <td className="p-3 font-mono text-xs">Code changes + updated plan checkboxes</td>
              </tr>
              <tr>
                <td className="p-3">
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/validate_plan.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    validate_plan
                  </a>
                </td>
                <td className="p-3 text-muted-foreground">
                  Verifies all automated checks (build, lint, types), lists manual test steps,
                  analyzes git diff, identifies deviations from the plan.
                </td>
                <td className="p-3 font-mono text-xs">
                  Validation report with pass/fail + next steps
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>I urge you to click the links, and read through these commands.</p>

        <BlogHeading level={2}>Specialized Agents</BlogHeading>

        <p>
          Agents are narrow professionals with minimal tools and clear responsibilities, and most
          importantly <strong>its own context window</strong>. Instead of one agent doing
          everything, use small experts that return high-signal, low-volume context:
        </p>

        <BlogList variant="unordered">
          <BlogListItem>
            Locator: finds where code lives using search tools; returns structured file locations
            without reading content.
          </BlogListItem>
          <BlogListItem>
            Analyzer: reads relevant files end-to-end, traces data flow, and cites exact file:line
            references.
          </BlogListItem>
          <BlogListItem>
            Pattern Finder: surfaces working examples from the codebase, including test patterns and
            variations.
          </BlogListItem>
          <BlogListItem>
            Web Search Researcher: finds relevant information from web sources using strategic
            searches; returns synthesized findings with citations and links.
          </BlogListItem>
          <BlogListItem>
            Additional sub-agents for tools: Instead of MCP servers that clog the main context,
            write targeted bash scripts and a sub-agent that can use them. Follow-up post coming on
            this!
          </BlogListItem>
        </BlogList>

        <p>
          The key is constraint: each agent does one job well and returns only what the next phase
          needs. The sub-agent can fail, hit 404 pages, forget which directory it is in, etc., and
          all that noise will not pollute the main context. It just outputs clean, summarized
          findings to the main agent that doesn&apos;t need to know about all the failed file reads.
        </p>

        <div className="not-prose my-10 overflow-x-auto rounded-lg border border-border p-2">
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
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/codebase-locator.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    codebase-locator
                  </a>
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">Grep, Glob, LS</td>
                <td className="p-3 text-muted-foreground">
                  WHERE code lives: file paths grouped by purpose (impl, tests, config, types). No
                  content analysis.
                </td>
              </tr>
              <tr>
                <td className="p-3">
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/codebase-analyzer.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    codebase-analyzer
                  </a>
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
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/codebase-pattern-finder.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    codebase-pattern-finder
                  </a>
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
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/thoughts-locator.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    thoughts-locator
                  </a>
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">Grep, Glob, LS</td>
                <td className="p-3 text-muted-foreground">
                  Discovers docs in thoughts/ directory: past research, decisions, plans.
                </td>
              </tr>
              <tr>
                <td className="p-3">
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/thoughts-analyzer.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    thoughts-analyzer
                  </a>
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
                  <a
                    href="https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/web-search-researcher.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline font-mono text-xs"
                  >
                    web-search-researcher
                  </a>
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">WebSearch, WebFetch</td>
                <td className="p-3 text-muted-foreground">
                  External docs and resources (only when explicitly asked). Returns links.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <BlogHeading level={2}>The Workflow</BlogHeading>

        <p>
          This workflow works best for well-scoped features that require a moderate amount of
          code—typically 1-3K lines in a Go/TypeScript codebase, or 5-30 non-test file changes. For
          smaller tasks, use Cursor directly. For larger features, break them into smaller pieces
          first.
        </p>

        <BlogHeading level={3}>Step 1: Research</BlogHeading>

        <p>Start by running the research command:</p>

        <Terminal>{`/research_codebase`}</Terminal>

        <p>
          The command will prompt you with &quot;what would you like to research?&quot; Provide a detailed
          prompt like:
        </p>

        <Terminal>
          {`Your goal is to research how to implement a reset password feature, both frontend and backend.
This should go in the @backend/internal/user/ service, with handler, HTTP port, domain logic, and interacting with the database adapter.
Make sure to add unit tests in the domain layer, and component tests for the port.
Follow the patterns in @backend/ARCHITECTURE.md.

For the frontend, research an architecture and implementation that is in line with @frontend/src/features/login/.
Follow @frontend/ARCHITECTURE.md guidelines and patterns.`}
        </Terminal>

        <p>
          This generates a research document with file references, target architecture, and
          critically—a &quot;What not to do&quot; section that helps guide Claude in the right direction
          without detours.
        </p>

        <p>
          <strong>Important:</strong> Review the research document closely. Check if it found all
          relevant files, if the target architecture looks reasonable, and if you agree with the
          &quot;what not to do&quot; section. In about 50% of cases, I edit these sections manually using
          Cursor with a powerful model or by editing the file directly.
        </p>

        <p>
          For an example of a well-structured research document, see{' '}
          <BlogLink href="https://github.com/emilwareus/addcommitpush.io/blob/main/thoughts/shared/research/2025-11-07_11-00-59_image-optimization-command.md">
            this research document on image optimization
          </BlogLink>
          .
        </p>

        <BlogHeading level={3}>Step 2: Planning</BlogHeading>

        <p>Once you&apos;re happy with the research, create a plan:</p>

        <Terminal>
          {`/create_plan create a plan for @PATH_TO_RESEARCH. ADDITIONAL_INSTRUCTIONS`}
        </Terminal>

        <p>
          Additional instructions might include: &quot;make it 4 phases&quot;, &quot;make sure to add e2e tests in
          the frontend to the plan&quot;, etc. You can also add &quot;think deeply&quot; for higher accuracy (but
          avoid &quot;ultrathink&quot;—it&apos;s a token burner that uses the main context to explore).
        </p>

        <p>
          Review the plan document as well. Do the phases make sense? Go over the targeted changes.
          Sometimes I create multiple plans from one research document, or combine multiple research
          documents into one plan.
        </p>

        <p>
          For an example of a well-structured plan document, see{' '}
          <BlogLink href="https://github.com/emilwareus/addcommitpush.io/blob/main/thoughts/shared/plans/audio-blog-posts-implementation.md">
            this plan document on audio blog posts implementation
          </BlogLink>
          .
        </p>

        <BlogHeading level={3}>Step 3: Implement & Validate Loop</BlogHeading>

        <p>Now the fun part—implement and validate incrementally, phase by phase:</p>

        <p>
          <strong>Implement phase 1:</strong>
        </p>

        <Terminal>
          {`/implement_plan implement phase 1 of plan @PATH_TO_PLAN based on research @PATH_TO_RESEARCH.`}
        </Terminal>

        <p>
          <strong>Then validate before reviewing code:</strong>
        </p>

        <Terminal>
          {`/validate_plan validate phase 1 of plan @PATH_TO_PLAN. Remember to check things off in the plan and add comments about deviations from the plan to the document.`}
        </Terminal>

        <p>
          Repeat this loop for each phase until all phases are complete, then run a final validation
          on the full plan. I typically review the code between iterations to ensure it makes sense
          and guide the AI if needed. Aim for &quot;working software&quot; in each phase—tests should pass and
          there should be no lint errors. The validation step will catch missing interface
          implementations and run your linters.
        </p>

        <BlogHeading level={3}>Git Management</BlogHeading>

        <p>Two approaches work well:</p>

        <BlogList variant="unordered">
          <BlogListItem>Commit each iteration</BlogListItem>
          <BlogListItem>Work with staged changes to easily see diffs</BlogListItem>
        </BlogList>

        <p>Choose whatever feels best for you.</p>

        <BlogHeading level={3}>Results & Future</BlogHeading>

        <p>
          In my experience, this flow completely 1-shots (after research/plan refinements) 2-5 such
          features per day. I run up to 3 in parallel—one &quot;big hairy&quot; problem and two simpler, more
          straightforward ones.
        </p>

        <p>
          In the future, I want to make this a &quot;linear workflow&quot; where humans gather information
          into Linear issues (the initial research prompts), and moving issues into different phases
          would auto-trigger different steps, creating PRs with research docs, etc.
        </p>

        <BlogHeading level={2}>Codebase Requirements</BlogHeading>

        <p>
          I don&apos;t think this will work well in all settings and codebases. The right type of
          &quot;mid/mid+&quot; size problems is the right fit. The better your codebase is, the better code AI
          will write. Just like in boomer-coding, quality compounds into velocity over time, and
          tech debt snowballs to a turd, but with AI the effects of this have increased. Prioritize
          solving your tech debt!
        </p>

        <br />

        <p>
          Also, in my experience, language matters... in TS/JS you can loop in 20+ different ways or
          chain useEffects in magical ways to create foot-cannons... if Cloudflare can&apos;t properly
          use useEffect... are you sure our PhD-level next token predictors can? I actually like a
          lot of things about TS, but too many variations confuse the AI. In my &quot;big&quot; codebase I&apos;m
          working on our backend is built in Go, and Claude/Cursor are simply fantastic there!
          Simplicity = clarity = less hallucination = higher velocity. This is at least the state
          late 2025, in a year or so... who knows.
        </p>

        <BlogHeading level={2}>TL;DR</BlogHeading>

        <p>
          IMO, SpecDD is the new way of developing software! Claude Code is excellent at this with
          proper commands and guidance. Starting with a research and planning phase to create .md
          files that clearly set HIGH-value context is a great way to get more accurate results from
          Claude Code. Running multiple SpecDD flows at the same time... like spinning plates, is
          the new name of the game in some codebases. This maybe takes out a bit of the old &quot;fun&quot;
          about developing, but I&apos;m mostly excited about user value and winning in the market, which
          is more fun than polishing a stone.
        </p>
      </div>
    </>
  );
}
