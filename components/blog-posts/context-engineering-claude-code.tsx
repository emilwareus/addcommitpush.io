import { BlogHeading, BlogList, BlogListItem } from "@/components/custom"
import Link from "next/link"

export function ContextEngineeringClaudeCodeContent() {
  return (
    <div
      className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
        prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
        prose-a:text-secondary prose-a:no-underline hover:prose-a:underline"
    >
      <BlogHeading level={1}>Advanced Context Engineering with Claude Code</BlogHeading>

      <p>
        Context engineering is the deliberate structuring and compacting of information so agents can think clearly,
        act decisively, and remain reproducible. In practice, that means moving away from cramming everything into a
        single prompt and toward a system where workflows are orchestrated, analysis is specialized, and computation is
        offloaded. This post distills a working architecture built around three layers: Commands (orchestration), Agents
        (focused analysis), and Scripts (heavy lifting outside the context window).
      </p>

      <BlogHeading level={2}>The Three-Phase Pipeline</BlogHeading>

      <p>
        The heartbeat of this approach is a repeatable pipeline that keeps cognitive load low while producing durable
        artifacts at every step. You move fast, with traceability:
      </p>

      <BlogList variant="unordered">
        <BlogListItem>
          Research → Plan → Implement → Validate: four phases that mirror how real work actually happens.
        </BlogListItem>
        <BlogListItem>
          Each phase produces an artifact (research doc, plan, implementation changes, validation report) you can track
          in git.
        </BlogListItem>
        <BlogListItem>
          Clear separation of automated vs manual verification makes it easy to run checks continuously while preserving
          the human judgment moments that matter.
        </BlogListItem>
      </BlogList>

      <p>
        Concretely, a research command spawns focused sub-agents in parallel, compacts their findings, and writes a
        timestamped document with file:line references. The planning command consumes only that synthesized document
        (not the entire codebase), proposes options, and captures the final plan. Implementation follows the plan while
        adapting to reality, and validation confirms the result with both automated checks and a short human review.
      </p>

      <BlogHeading level={2}>Specialized Agents</BlogHeading>

      <p>
        Agents are narrow professionals with minimal tools and crisp responsibilities. Instead of one agent doing
        everything, use small experts that return high-signal, low-volume context:
      </p>

      <BlogList variant="unordered">
        <BlogListItem>
          Locator: finds where code lives using search tools; returns structured file locations without reading content.
        </BlogListItem>
        <BlogListItem>
          Analyzer: reads relevant files end-to-end, traces data flow, and cites exact file:line references.
        </BlogListItem>
        <BlogListItem>
          Pattern Finder: surfaces working examples from the codebase, including test patterns and variations.
        </BlogListItem>
      </BlogList>

      <p>
        The key is constraint: each agent does one job well and returns only what the next phase needs. That keeps the
        main orchestration context clean and prevents “context explosion.”
      </p>

      <BlogHeading level={2}>Context Compaction Techniques</BlogHeading>

      <p>
        Compaction preserves clarity and speed. Three techniques consistently pay off:
      </p>

      <BlogList variant="unordered">
        <BlogListItem>
          Hierarchical agent spawning: the orchestrator spawns multiple specialized agents in parallel, then
          synthesizes.
        </BlogListItem>
        <BlogListItem>
          Metadata-first: store essential metadata in YAML frontmatter so tools can triage without loading full docs.
        </BlogListItem>
        <BlogListItem>
          Read fully before spawning: when a file is explicitly mentioned, read it end-to-end before delegating.
        </BlogListItem>
      </BlogList>

      <p>
        In effect, you’re designing a data pipeline for context itself: selective inputs, parallel transforms, compact
        summaries, and cached artifacts.
      </p>

      <BlogHeading level={2}>Scripts vs MCP Tools</BlogHeading>

      <p>
        Heavy computation (image optimization, JSX text extraction, media generation) belongs in scripts that run
        outside the context window. Scripts are version-controlled, human-runnable, and composable. Use MCP tools when
        you need external API access, auth, or real-time services. A hybrid approach keeps the system simple: most
        automation lives in scripts; the agent layer uses MCP selectively for integration.
      </p>

      <BlogHeading level={2}>Command Patterns & Workflows</BlogHeading>

      <p>
        Commands encapsulate repeatable workflows. A few patterns are broadly useful:
      </p>

      <BlogList variant="unordered">
        <BlogListItem>
          Research: orchestrates parallel sub-agents, compacts results, and emits a timestamped research doc.
        </BlogListItem>
        <BlogListItem>
          Create Plan: reads research fully, proposes options, captures the finalized plan with success criteria.
        </BlogListItem>
        <BlogListItem>
          Implement Plan: executes approved steps, adapts when reality differs, and updates checkboxes as work
          completes.
        </BlogListItem>
        <BlogListItem>
          Validate Plan: verifies the implementation with automated checks and a concise human review report.
        </BlogListItem>
        <BlogListItem>
          Refine Text: adapts existing text for audio narration with strict constraints to preserve author voice.
        </BlogListItem>
      </BlogList>

      <p>
        The critical idea is separation of automated vs manual verification. Automated checks (build, lint, type
        check, simple curls) run continuously; manual checks remain for the small number of UX/semantics decisions that
        require human judgment.
      </p>

      <BlogHeading level={2}>Permissions and Pre‑Approval</BlogHeading>

      <p>
        Pre-approve routine operations (build, lint, type-check, image optimization, text extraction) to reduce
        friction. Keep the allow-list tight and evolve it incrementally. This creates a safe, low-latency automation
        path for everyday tasks without opening broad permissions.
      </p>

      <BlogHeading level={2}>Architecture Insights</BlogHeading>

      <p>
        A few principles shape the overall system:
      </p>

      <BlogList variant="unordered">
        <BlogListItem>
          Separation of concerns: orchestration (commands), analysis (agents), computation (scripts) — no overlap.
        </BlogListItem>
        <BlogListItem>
          Context as a scarce resource: always summarize before passing context forward; avoid raw bulk reads.
        </BlogListItem>
        <BlogListItem>
          Traceability: every research/plan artifact has metadata (commit, timestamp, status) for reproducibility.
        </BlogListItem>
        <BlogListItem>
          Progressive enhancement: start simple, then extract agents and scripts only when patterns repeat.
        </BlogListItem>
      </BlogList>

      <BlogHeading level={2}>Workflow Example: Adding Audio to Blog Posts</BlogHeading>

      <p>
        A concrete example: adding audio narration to blog posts. Research locates where posts live, how content is
        rendered, and whether an audio player exists. Planning proposes integration approaches and success criteria.
        Implementation wires the component and assets, and validation runs automated checks and a brief manual test in
        the UI. Each step returns a small artifact with just enough detail for the next.
      </p>

      <BlogHeading level={2}>Adapting to Your Codebase</BlogHeading>

      <p>
        Start by documenting conventions in a living <code>CLAUDE.md</code>. Identify the handful of workflows you run
        often: research a feature area, plan a change, implement, validate. Turn those into commands. When a command
        repeatedly spawns the same type of search, extract a specialized agent. When operations are heavy or costly,
        write a script and call it from the command.
      </p>

      <p>
        Keep velocity high by working in phases and producing artifacts. Because artifacts cite exact files and lines,
        new contributors can on-board quickly without re-reading the entire codebase. Because heavy work happens in
        scripts, your context stays small and predictable.
      </p>

      <BlogHeading level={2}>Key Takeaways</BlogHeading>

      <BlogList variant="unordered">
        <BlogListItem>
          Don’t cram context. Orchestrate: research → plan → implement → validate, and keep artifacts.
        </BlogListItem>
        <BlogListItem>
          Use specialized agents. Constrain tools, return minimal, high-signal outputs with file:line citations.
        </BlogListItem>
        <BlogListItem>
          Offload heavy computation to scripts. Prefer MCP tools only for external integrations and auth.
        </BlogListItem>
        <BlogListItem>
          Pre-approve routine commands to eliminate friction without compromising safety.
        </BlogListItem>
        <BlogListItem>
          Evolve gradually: document → command → agent → script → permissions.
        </BlogListItem>
      </BlogList>

      <BlogHeading level={1}>Conclusion</BlogHeading>

      <p>
        Advanced context engineering is about systems, not hero prompts. Commands orchestrate workflows and capture
        decisions. Agents produce sharp, referenced insights. Scripts perform the heavy lifting away from your context
        budget. Together, they deliver a fast, reproducible, and maintainable way to build software with AI — one that
        scales with your codebase and your team.
      </p>

      <p>
        If you want to dig deeper into link best practices for external references, MDN’s guidance on link text and
        attributes is a good companion reference:
        {" "}
        <Link href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/Creating_hyperlinks" target="_blank" rel="noopener noreferrer">
          MDN: Creating Hyperlinks
        </Link>
        .
      </p>
    </div>
  )
}


