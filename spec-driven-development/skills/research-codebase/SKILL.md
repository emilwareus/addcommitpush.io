---
name: research-codebase
description: Research the codebase for an issue or question by spawning parallel sub-agents and writing a repository-standard research document with evidence, ownership notes, and structured open questions. Use when the user invokes /research-codebase, $research-codebase, or asks to research the codebase.
---

# Research Codebase

You are tasked with conducting comprehensive research across the codebase to answer user questions by spawning parallel sub-agents and synthesizing their findings.

Treat text after the skill invocation as the research query.

## Initial Setup:

When this skill is invoked without a query, respond with:

```
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

Then wait for the user's research query.

## Steps to follow after receiving the research query:

1. **Read any directly mentioned files first:**

   - If the user mentions specific files (tickets, docs, JSON), read them FULLY first
   - **IMPORTANT**: Read entire files, without limit/offset parameters
   - **CRITICAL**: Read these files yourself in the main context before spawning any sub-tasks
   - This ensures you have full context before decomposing the research
   - Read root {{AGENTS_FILE}} and {{ARCHITECTURE_GUIDE}}. For each service or area the work touches, read its guides from {{SERVICE_GUIDES}} (agent instructions first; architecture, code-pattern, and testing guides when architecture, implementation patterns, or tests are relevant)
   - For non-obvious architecture, treat the service architecture and code-pattern guides as mandatory inputs before spawning sub-agents
   - When a tracked issue is mentioned or inferred from the branch, fetch the issue and project scope context before spawning sub-agents (see the `issue-tracker` skill):
     - `{{ISSUE_FETCH_COMMAND}} {{ISSUE_PREFIX}}-123`
     - `{{ISSUE_CONTEXT_COMMAND}} {{ISSUE_PREFIX}}-123`
   - If the issue has no project, record that explicitly. If it has a project, read the full project description/content plus every sibling issue title. Treat sibling issues as scope boundaries unless the current issue explicitly says to implement that sibling behavior here.

2. **Analyze and decompose the research question:**

   - Break down the user's query into composable research areas
   - Take time to think hard about the underlying patterns, connections, and architectural implications the user might be seeking
   - Identify specific components, patterns, or concepts to investigate
   - Create a research plan using a todo list to track all subtasks
   - Consider which directories, files, or architectural patterns are relevant
   - Verify proposed shapes against the existing architectural patterns documented in {{ARCHITECTURE_GUIDE}} (layering, command/query split, domain events, repository ownership, or whatever the repo uses) before recommending new packages or shared contracts

3. **Spawn parallel sub-agent tasks for comprehensive research:**

   - Create multiple sub-agents to research different aspects concurrently
   - We have specialized agents that know how to do specific research tasks:

   **For codebase research:**

   - Use the **codebase-locator** agent to find WHERE files and components live
   - Use the **codebase-analyzer** agent to understand HOW specific code works
   - Use the **codebase-pattern-finder** agent if you need examples of similar implementations

   **For the thoughts directory ({{THOUGHTS_DIR}}):**

   - Use the **thoughts-locator** agent to discover what documents exist about the topic
   - Use the **thoughts-analyzer** agent to extract key insights from specific documents (only the most relevant ones)

   **For web research (when the user asks, or when the task depends on a third-party/provider API contract; see the verify-provider-API-contracts synthesis rule below):**

   - Use the **web-search-researcher** agent for external documentation and resources
   - IF you use web-research agents, instruct them to return LINKS with their findings, and INCLUDE those links in your final report

   The key is to use these agents intelligently:

   - Start with locator agents to find what exists
   - Then use analyzer agents on the most promising findings
   - Run multiple agents in parallel when they're searching for different things
   - Each agent knows its job; just tell it what you're looking for
   - Don't write detailed prompts about HOW to search; the agents already know

4. **Wait for all sub-agents to complete and synthesize findings:**

   - IMPORTANT: Wait for ALL sub-agent tasks to complete before proceeding
   - Compile all sub-agent results (both codebase and thoughts findings)
   - Prioritize live codebase findings as primary source of truth
   - Use thoughts findings as supplementary historical context
   - Connect findings across different components
   - Include specific file paths and line numbers for reference
   - Verify all thoughts paths are correct (for example a personal directory versus the shared one)
   - Highlight patterns, connections, and architectural decisions
   - Answer the user's specific questions with concrete evidence
   - When a task adds or changes a fact, policy, capability, status, constraint, or contract, identify the source of truth, consuming/projection surfaces, enforcement points, and at least one similar existing fact before recommending implementation shape
   - Reuse-first for helpers: before recommending any new util, hook, or helper, search for an existing one that already derives the same value and recommend extending it instead of writing a parallel implementation. Name the existing helper in `## Ownership Notes`; if none exists, say so explicitly
   - Reuse-first for data models too: when the task adds a new persisted record type that overlaps an existing table/model's role (logs, traces, events, audit rows), evaluate **extending the existing model** with the new structured columns before recommending a new parallel table. Profile the existing table (row count, max payload size, orphan/dedup columns) and state explicitly why a new table is justified, if it is. A new parallel table almost always forces a dual write path plus a legacy read/parse fallback to reconcile old vs new rows. Phrasing like "add a structured X alongside Y" in the issue is a prompt to evaluate promoting Y, not an instruction to build a second table
   - Enumerate **every** write/emit path for the concept being changed, not just the obvious one. A single concept is frequently emitted from more than one place (for example an HTTP callback **and** an in-process executor). Cross-cutting requirements (redaction, sanitization, bounding, sequence assignment, status derivation) must be applied at every path. List all paths in the research so the plan covers each; a requirement satisfied on one path and missed on another is a silent acceptance-criteria failure
   - Verify third-party/provider API contracts before designing on them: when the task builds on an external API (a provider endpoint, OAuth/install flow, or webhook), confirm against the official provider docs that (1) the exact endpoint exists for this integration class, (2) the request/response actually returns the fields the design depends on, and (3) the stored credential holds the required scopes/permissions. If the issue or a sibling step assumes a capability the documented API does not support (an ID the install response never returns, or a delete endpoint requiring scopes the install token lacks), record the contradiction as an open question or scope risk instead of designing around the assumption. Use the **web-search-researcher** agent for the provider docs here even when the user did not explicitly ask; an external-API dependency is itself the trigger. When the rendered docs and the machine-readable contract (OpenAPI) disagree about whether a field exists, or when one field is documented with conflicting units/formats/enums, do **not** silently pick one source: mark presence as optional/unconfirmed, resolve the unit/format to a single authoritative value, or record it as an open question. Never leave a field's documented unit or presence for the implementer to guess. Treat every provider-contract finding as a point-in-time snapshot: state in the research that implementation must re-verify the live contract, and any sibling capabilities merged since research, before encoding field sets
   - Map shared command/lifecycle re-entry: when provider-specific work routes through a generic command or pub/sub lifecycle (for example integration removal through a shared delete command into a provider deprovision step), trace what that shared path already does on each entry. Distinguish provider/system-originated triggers (a webhook where the provider already cleaned up) from actor-initiated ones (a user deleting in the UI), and state whether they need different behavior so the plan does not apply a duplicate or already-invalid side effect
   - Guard against overengineering during research: identify the current endpoint, stream, handler, hook, job, command, or storage path that already owns the requested behavior, then recommend the smallest extension to that surface. New endpoints, packages, adapters, repo methods, config flags, workers, generated/public API surfaces, or parallel runtime paths are wrong unless the issue explicitly requires them; quote that requirement before recommending one. Use and extend existing code first. Apply a maintain-or-delete policy: do not add new endpoints that do "almost the same thing" as existing ones while deprecating the old ones. Extend and maintain the existing logic instead.
   - Legacy removal default: when research finds a deprecated, legacy, internal-only, feature-flagged, or compatibility surface, do not assume it should be preserved, migrated, converted, or supported. Prefer removing or ignoring legacy paths to keep the codebase healthy and reduce liability. If the current issue might require legacy behavior, record an `## Open Questions` entry with removal as the recommended/default option unless research proves active production usage or the issue explicitly requires compatibility. The question must name the legacy surface, who still uses it, what breaks if it is removed, and the cost of carrying it forward.
   - Prefer the minimal implementation that satisfies the current issue's user-visible acceptance criteria. Architecture consistency is not enough reason to build adjacent capability. If something feels too complex, you probably have not found the best fit yet; explore patterns and other parts of the codebase to find the correct ones. If {{ARCHITECTURE_GUIDE}} names a reference implementation, compare against it.
   - If the issue lacks clear acceptance criteria or a `What NOT to do`/non-goals section, flag an `Issue Scope Risk` in the research and keep the recommended scope narrow. Do not fill the gap by expanding into adjacent project goals.

5. **Gather metadata for the research document:**

   - Run `bash {{SCRIPTS_DIR}}/spec-metadata.sh` to generate all relevant metadata
   - Filename: `{{RESEARCH_DIR}}/YYYY-MM-DD_HH-MM-SS_topic.md`
   - If a tracked issue is relevant (mentioned in the task, in the branch name, or in referenced tickets), prefix the topic with the issue id: `YYYY-MM-DD_HH-MM-SS_{{ISSUE_PREFIX}}-123_topic.md`

6. **Generate research document:**

   - Use the metadata gathered in step 5
   - Structure the document with YAML frontmatter followed by content (see also `templates/research.md`):

     ```markdown
     ---
     date: [Current date and time with timezone in ISO format]
     researcher: [Researcher name]
     git_commit: [Current commit hash]
     branch: [Current branch name]
     repository: [Repository name]
     topic: "[User's Question/Topic]"
     tags: [research, codebase, relevant-component-names]
     status: complete
     last_updated: [Current date in YYYY-MM-DD format]
     last_updated_by: [Researcher name]
     ---

     # Research: [User's Question/Topic]

     **Date**: [Current date and time with timezone from step 5]
     **Researcher**: [Researcher name]
     **Git Commit**: [Current commit hash from step 5]
     **Branch**: [Current branch name from step 5]
     **Repository**: [Repository name]

     ## Research Question

     [Original user query]

     ## Summary

     [High-level findings answering the user's question]

     ## Issue Tracker Context

     If a tracked issue applies, include:

     - Issue: `{{ISSUE_PREFIX}}-123 - Title`
     - Project: `Project name`, or `None.`
     - Project description/content summary, or `None.`
     - Completed issues:
       - `{{ISSUE_PREFIX}}-120 - Title`
     - Other issues in project:
       - `{{ISSUE_PREFIX}}-124 - Title`: likely separate scope unless explicitly named by the current issue

     If no tracked issue applies, write `None.`

     ## Issue Scope Risk

     State whether the issue has clear user-facing acceptance criteria and explicit non-goals. If either is missing, say what ambiguity exists and how research kept the scope narrow instead of expanding it.

     ## Relevant Architecture Docs

     - `[architecture doc path]` - [why this doc applies to this change, or what boundary/source-of-truth it defines]
     - If no architecture docs apply, write `None.`

     ## Ownership Notes

     For each new or changed fact, policy, capability, status, constraint, or contract, name the source of truth and the consuming surfaces.

     - **[Fact name]**
       - Source of truth: `[file/symbol]`
       - Consumers/projections: `[files/symbols]`
       - Enforcement/validation: `[files/symbols, or None]`
       - Similar existing fact: `[file/symbol]`
       - Duplicate-owner risk: `[None, or explain what must not re-decide this fact]`
       - Scope justification: `[why this ownership surface is required by the current issue's acceptance criteria, or mark as out of scope]`

     If the change does not introduce or alter any fact, policy, capability, status, constraint, or contract, write `None.`

     ## Detailed Findings

     ### [Component/Area 1]

     - Finding with reference ([file.ext:line](link))
     - Connection to other components
     - Implementation details

     ### [Component/Area 2]

     ...

     ## Code References

     - `path/to/file.py:123` - Description of what's there
     - `another/file.ts:45-67` - Description of the code block

     ## Architecture Insights

     [Patterns, conventions, and design decisions discovered. For non-obvious architecture, state how the findings align with the layering and ownership rules in {{ARCHITECTURE_GUIDE}}.]

     ## Historical Context (from {{THOUGHTS_DIR}})

     [Relevant insights from the thoughts directory with references]

     - `{{THOUGHTS_DIR}}/shared/something.md` - Historical decision about X
     - `{{THOUGHTS_DIR}}/local/notes.md` - Past exploration of Y

     ## Related Research

     [Links to other research documents in {{RESEARCH_DIR}}]

     ## Open Questions

     [Questions that need a user answer, in the question-contract format
     (`Q1.`, `Context:`, `Research checked:`, `Why this requires user input:`,
     `Default if unanswered:`, `Options:` with exactly one `[Recommended]`), or
     `None.`]
     ```

   - Run `bash {{SCRIPTS_DIR}}/validate-research-structure.sh <research-path>` and fix the document until it exits 0.

7. **Present findings:**

   - Present a concise summary of findings to the user
   - Include key file references for easy navigation
   - Ask if they have follow-up questions or need clarification

8. **Handle follow-up questions:**
   - If the user has follow-up questions, append to the same research document
   - Update the frontmatter fields `last_updated` and `last_updated_by` to reflect the update
   - Add `last_updated_note: "Added follow-up research for [brief description]"` to frontmatter
   - Add a new section: `## Follow-up Research [timestamp]`
   - Spawn new sub-agents as needed for additional investigation
   - Continue updating the document

## Important notes:

- Always use parallel sub-agents to maximize efficiency and minimize context usage
- Always run fresh codebase research; never rely solely on existing research documents
- The thoughts directory provides historical context to supplement live findings
- Focus on finding concrete file paths and line numbers for developer reference
- Research documents should be self-contained with all necessary context
- Each sub-agent prompt should be specific and focused on read-only operations
- Consider cross-component connections and architectural patterns
- Include temporal context (when the research was conducted)
- Keep the main agent focused on synthesis, not deep file reading
- Encourage sub-agents to find examples and usage patterns, not just definitions
- Explore all of the thoughts directory, not just the research subdirectory
- For non-obvious architecture, state each concern's owning layer and cite matching existing patterns; do not stop at where code currently lives
- **File reading**: Always read mentioned files FULLY (no limit/offset) before spawning sub-tasks
- **Critical ordering**: Follow the numbered steps exactly
  - ALWAYS read mentioned files first before spawning sub-tasks (step 1)
  - ALWAYS wait for all sub-agents to complete before synthesizing (step 4)
  - ALWAYS gather metadata before writing the document (step 5 before step 6)
  - NEVER write the research document with placeholder values
- **Frontmatter consistency**:
  - Always include frontmatter at the beginning of research documents
  - Keep frontmatter fields consistent across all research documents
  - Update frontmatter when adding follow-up research
  - Use snake_case for multi-word field names (for example `last_updated`, `git_commit`)
  - Tags should be relevant to the research topic and components studied
