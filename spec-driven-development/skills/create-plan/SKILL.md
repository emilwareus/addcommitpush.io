---
name: create-plan
description: Create a detailed, phased implementation plan from an issue and accepted research through an interactive, skeptical process. The plan uses integer phase headings, phase-local tests, and a canonical Execution Status section. Use when the user invokes /create-plan, $create-plan, or asks to create an implementation plan.
---

# Implementation Plan

You are tasked with creating detailed implementation plans through an interactive, iterative process. You should be skeptical, thorough, and work collaboratively with the user to produce high-quality technical specifications.

Treat text after the skill invocation as arguments.

## Initial Response

When this skill is invoked:

1. **Check if parameters were provided**:

   - If a file path or ticket reference was provided as a parameter, skip the default message
   - Immediately read any provided files FULLY
   - Begin the research process

2. **If no parameters provided**, respond with:

```
I'll help you create a detailed implementation plan. Let me start by understanding what we're building.

Please provide:
1. The task/ticket description (or reference to a ticket file)
2. Any relevant context, constraints, or specific requirements
3. Links to related research or previous implementations

I'll analyze this information and work with you to create a comprehensive plan.
```

Then wait for the user's input.

## Process Steps

### Step 1: Context Gathering & Initial Analysis

1. **Read all mentioned files immediately and FULLY**:

   - Ticket files
   - Research documents (usually in {{RESEARCH_DIR}})
   - Related implementation plans
   - Any JSON/data files mentioned
   - **IMPORTANT**: Read entire files, without limit/offset parameters
   - **CRITICAL**: DO NOT spawn sub-tasks before reading these files yourself in the main context
   - **NEVER** read files partially; if a file is mentioned, read it completely

   Then read the relevant guidance before planning: root {{AGENTS_FILE}}, {{ARCHITECTURE_GUIDE}}, and, for each service or area the work touches, its guides from {{SERVICE_GUIDES}} (agent instructions first; architecture, code-pattern, testing, and security guides when the task touches architecture, implementation patterns, tests, or security-sensitive behavior).

2. **Spawn initial research tasks to gather context**:
   Before asking the user any questions, use specialized agents to research in parallel:

   - Use the **codebase-locator** agent to find all files related to the ticket/task
   - Use the **codebase-analyzer** agent to understand how the current implementation works
   - If relevant, use the **thoughts-locator** agent to find any existing thoughts documents about this feature
   - If a tracked issue is mentioned, apply the **issue-tracker** skill (`{{ISSUE_FETCH_COMMAND}} {{ISSUE_PREFIX}}-123`) to fetch full details

   These agents will:

   - Find relevant source files, configs, and tests
   - Identify the specific directories to focus on
   - Trace data flow and key functions
   - Return detailed explanations with file:line references

3. **Read all files identified by research tasks**:

   - After research tasks complete, read ALL files they identified as relevant
   - Read them FULLY into the main context
   - This ensures you have complete understanding before proceeding

4. **Analyze and verify understanding**:

   - Cross-reference the ticket requirements with actual code
   - Identify any discrepancies or misunderstandings
   - Note assumptions that need verification
   - Determine true scope based on codebase reality
   - Name the existing endpoint, stream, handler, hook, job, command, or storage path that owns the behavior. Plan the smallest extension there; new endpoints, packages, adapters, repo methods, config flags, workers, generated/public API surfaces, or parallel runtime paths require an explicit requirement quote.

5. **Present informed understanding and focused questions**:

   ```
   Based on the ticket and my research of the codebase, I understand we need to [accurate summary].

   I've found that:
   - [Current implementation detail with file:line reference]
   - [Relevant pattern or constraint discovered]
   - [Potential complexity or edge case identified]

   Questions that my research couldn't answer:
   - [Specific technical question that requires human judgment]
   - [Business logic clarification]
   - [Design preference that affects implementation]
   ```

   Only ask questions that you genuinely cannot answer through code investigation. When running under `develop-issue`, write material questions under `## Open Questions` in the draft plan using the question contract instead of asking inline, and return.

### Step 2: Research & Discovery

After getting initial clarifications:

1. **If the user corrects any misunderstanding**:

   - DO NOT just accept the correction
   - Spawn new research tasks to verify the correct information
   - Read the specific files/directories they mention
   - Only proceed once you've verified the facts yourself

2. **Create a research todo list** to track exploration tasks

3. **Spawn parallel sub-tasks for comprehensive research**:

   - Create multiple sub-agents to research different aspects concurrently
   - Use the right agent for each type of research:

   **For deeper investigation:**

   - **codebase-locator**: to find more specific files (for example "find all files that handle [specific component]")
   - **codebase-analyzer**: to understand implementation details (for example "analyze how [system] works")
   - **codebase-pattern-finder**: to find similar features we can model after

   **For historical context:**

   - **thoughts-locator**: to find any research, plans, or decisions about this area
   - **thoughts-analyzer**: to extract key insights from the most relevant documents

   **For related tickets:**

   - **issue-tracker** skill: to find similar issues or past implementations (`{{ISSUE_SEARCH_COMMAND}}` or `{{ISSUE_FETCH_COMMAND}}`)

   Each agent knows how to:

   - Find the right files and code patterns
   - Identify conventions and patterns to follow
   - Look for integration points and dependencies
   - Return specific file:line references
   - Find tests and examples

4. **Wait for ALL sub-tasks to complete** before proceeding

5. **Present findings and design options**:

   ```
   Based on my research, here's what I found:

   **Current State:**
   - [Key discovery about existing code]
   - [Pattern or convention to follow]

   **Design Options:**
   1. [Option A] - [pros/cons]
   2. [Option B] - [pros/cons]

   **Open Questions:**
   - [Technical uncertainty]
   - [Design decision needed]

   Which approach aligns best with your vision?
   ```

### Step 3: Plan Structure Development

Once aligned on approach:

1. **Create initial plan outline**:

   ```
   Here's my proposed plan structure:

   ## Overview
   [1-2 sentence summary]

   ## Implementation Phases:
   1. [Phase name] - [what it accomplishes]
   2. [Phase name] - [what it accomplishes]
   3. [Phase name] - [what it accomplishes]

   Does this phasing make sense? Should I adjust the order or granularity?
   ```

2. **Get feedback on structure** before writing details

### Step 4: Detailed Plan Writing

After structure approval:

1. **Write the plan** to `{{PLANS_DIR}}/YYYY-MM-DD_HH-MM-SS_{descriptive_name}.md`
   - always include the current local datetime prefix in the filename (`bash {{SCRIPTS_DIR}}/spec-metadata.sh` prints it)
   - if a tracked issue is relevant (mentioned in the task, in the branch name, or in referenced tickets), prefix the descriptive name with the issue id: `YYYY-MM-DD_HH-MM-SS_{{ISSUE_PREFIX}}-123_descriptive_name.md`
   - example: `{{PLANS_DIR}}/2026-03-14_09-42-10_{{ISSUE_PREFIX}}-123_frontend-architecture-alignment.md`
   - example without issue: `{{PLANS_DIR}}/2026-03-14_09-42-10_frontend-architecture-alignment.md`
2. **Use this template structure** (also available as `templates/plan.md`):

   > **REQUIRED: `## Execution Status` section (hard contract with `develop-issue` and `validate-plan-structure.sh`):**
   >
   > - The `## Execution Status` section MUST be present and MUST be the LAST section in the plan.
   > - Every executable phase heading in the plan body MUST use the canonical format `## Phase N: Title`, where `N` is a whole integer. `## Phase N - Title` also validates, but prefer the colon form. Do NOT use `### Phase N`, bold-only phase labels, Unicode dashes, decimals, or lettered phases for executable work.
   > - Render ONE triplet (`implement` / `validate` / `commit-pr`) per phase that exists in the plan, using the exact whole-number phase from the plan headings (for example `phase-1`, `phase-2`, `phase-3`). Phases MUST be whole integers; do NOT use decimals (no `phase-2.1`). Split sub-work into a new full phase instead.
   > - The set of `## Phase N: ...` headings and the set of `phase-N` triplets MUST match exactly. If the plan has `## Phase 7: ...`, the Execution Status section MUST include `phase-7: implement`, `phase-7: validate`, and `phase-7: commit-pr`.
   > - Non-executable sections such as `## Cross-Phase Validation`, `## Performance Considerations`, `## Migration Notes`, and `## References` are NOT phases and MUST NOT get `phase-N` rows.
   > - End with the canonical post and finalize keys EXACTLY as shown in the template (8 lines, no rename, no add, no drop): `post: review-and-fix`, `post: review-validate`, `post: review-commit-pr`, `post: security-review`, `post: security-validate`, `post: security-commit-pr`, `finalize: pr-description`, `finalize: issue-update`.
   > - All checkboxes start as `- [ ]`.
   > - Do NOT emit any meta-placeholder text (`[... one triplet per phase ...]`, `<!-- REPEAT ... -->`) into the produced plan; those exist only in this template to instruct you. The output must contain concrete checklist lines only.
   > - **Verify your work**: after writing the plan, run `bash {{SCRIPTS_DIR}}/validate-plan-structure.sh <plan-path>`. It MUST exit 0. If it exits non-zero, fix the section before considering the plan done.
   > - **Why this matters**: the orchestrator reads this section to know what to run and where to resume. If the section is missing or malformed, the validator exits non-zero and the plan cannot advance.

````markdown
# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[A Specification of the desired end state after this plan is complete, and how to verify it]

### Key Discoveries:

- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## Existing Contracts To Protect

- [Existing test, behavior, or interface that must remain green]
- [Another contract the implementation must preserve]

## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]

## Visual evidence (when applicable)

If the work includes **meaningful visual change** (new or changed UX, layout, animations, dashboards, onboarding flows, or other UI that reviewers should *see*), the plan MUST include a **single final phase** after implementation and automated validation are complete:

- **Workflow**: Follow {{DEMO_RECORDING_GUIDE}} to produce **one video** and post the link on the issue and/or PR.
- **Do not commit recording artifacts**: Do not commit recording commands, tour/script files, or generated media.
- **One video only** for the whole plan, not one recording per phase. If several areas need coverage, define a single continuous walkthrough (ordered scenes in one session).
- **Outline in the plan**: That final phase must state **exactly what the recording should show** (entry state, routes, actions, narration intent, what "correct" looks like on screen, and any edge case to demo). Implementers should not improvise what to record.

Skip this final phase when the change is purely non-visual (API-only, backend-only, config-only with no UI impact).

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [Descriptive Name]

### Overview

[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]

**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

```[language]
// Specific code to add/modify (signatures or a small diff, not full bodies)
```

### Tests to Add or Update

- [Test files or suites to add in this phase]
- [What behavior they prove and why this phase is the right place to add them]
- [If no tests are needed in this phase, say why explicitly]
- [Existing tests or contracts from "Existing Contracts To Protect" that must still pass in this phase]

### Success Criteria:

#### Automated Verification:

- [ ] [Small repo-native commands used during implementation for fast feedback]
- [ ] [Tests added in this phase pass]
- [ ] [Full service validation passes when relevant: `{{CHECK_COMMAND}}`]
- [ ] [Run `{{E2E_COMMAND}}` when this phase changes a user-facing flow that should be verified end-to-end]
- [ ] [Do not mark the phase complete without that E2E pass unless a later named phase is strictly required before the flow can be exercised]
- [ ] [When changing logging, sanitization, or error formatting, verify both success-path and error-path behavior with targeted tests before the full service-level check]

#### Manual Verification:

- [ ] Feature works as expected when tested via UI
- [ ] Performance is acceptable under load
- [ ] Edge case handling verified manually
- [ ] No regressions in related features

---

## Phase 2: [Descriptive Name]

[Similar structure with both automated and manual success criteria...]

---

## Cross-Phase Validation

List only validation that genuinely belongs after multiple phases are complete.

- End-to-end scenarios that require several phases to be complete
- Broad regression passes that are more efficient to run near the end
- Deferred tests that could not be added earlier, with an explicit reason

### Manual Testing Steps:

1. [Specific step to verify feature]
2. [Another verification step]
3. [Edge case to test manually]

---

## Phase 3: Record and upload demo video (final, only if visual / UX)

Include this phase **only** when [Desired End State] or [What We're NOT Doing] implies user-visible UI change worth showing reviewers. Omit entirely for backend-only or non-visual work, and renumber so phases stay sequential integers.

### Overview

One video that demonstrates the implemented behavior end-to-end for reviewers. **Single video**: combine all needed coverage into one ordered walkthrough.

### What to record (be specific; the implementer turns this into the recording script)

1. [Start state, for example already-authenticated landing]
2. [Route + action + what the viewer should notice]
3. [Next scene, for example error state, empty state, or happy path completion]
4. [Narration intent: what should be explained while the UI moves]
5. [Stop condition, for example success message visible, record saved]

### Changes Required

- Use temporary recording files or commands only as needed to produce the recording.
- Do not commit recording commands, tour files, or generated media artifacts.
- Execute {{DEMO_RECORDING_GUIDE}} on the review branch to render and upload the video.

### Success Criteria:

#### Automated Verification:

- [ ] Prior phases' `{{CHECK_COMMAND}}` / E2E are green before recording
- [ ] The recording tool's own preflight and dry-run pass
- [ ] The generated video has the expected audio/video streams

#### Manual Verification:

- [ ] One video produced and uploaded; the issue and/or PR comment includes a link with a short description of what the demo shows
- [ ] Demo matches the numbered shot list above

## Performance Considerations

[Any performance implications or optimizations needed]

## Migration Notes

[If applicable, how to handle existing data/systems]

## References

- Original ticket: `{{ISSUE_PREFIX}}-123`
- Related research: `{{RESEARCH_DIR}}/[relevant].md`
- Similar implementation: `[file:line]`

## Execution Status

<!-- machine-managed; updated by the stage skills and the develop-issue orchestrator. Do not hand-edit. -->

- [ ] phase-1: implement
- [ ] phase-1: validate
- [ ] phase-1: commit-pr
- [ ] phase-2: implement
- [ ] phase-2: validate
- [ ] phase-2: commit-pr
<!-- REPEAT the three lines (implement / validate / commit-pr) for EVERY phase in this plan,
     using the whole-number phase from the plan headings (phase-1, phase-2, phase-3, ...).
     Phases MUST be integers; decimals (phase-2.1) are NOT allowed.
     Do NOT emit this comment or the literal text "[...]"; render concrete checklist lines only. -->
- [ ] post: review-and-fix
- [ ] post: review-validate
- [ ] post: review-commit-pr
- [ ] post: security-review
- [ ] post: security-validate
- [ ] post: security-commit-pr
- [ ] finalize: pr-description
- [ ] finalize: issue-update
````

### Step 5: Review

1. **Present the draft plan location**:

   ```
   I've created the initial implementation plan at:
   `{{PLANS_DIR}}/YYYY-MM-DD_HH-MM-SS_[descriptive-name].md`

   Please review it and let me know:

   - Are the phases properly scoped?
   - Are the success criteria specific enough?
   - Any technical details that need adjustment?
   - Missing edge cases or considerations?
   ```

2. **Iterate based on feedback**; be ready to:
   - Add missing phases
   - Adjust technical approach
   - Clarify success criteria (both automated and manual)
   - Add/remove scope items

3. **Continue refining** until the user is satisfied

## Important Guidelines

1. **Be Skeptical**:
   - Question vague requirements
   - Identify potential issues early
   - Ask "why" and "what about"
   - Don't assume; verify with code

2. **Be Interactive**:
   - Don't write the full plan in one shot
   - Get buy-in at each major step
   - Allow course corrections
   - Work collaboratively

3. **Be Thorough**:
   - Read all context files COMPLETELY before planning
   - Research actual code patterns using parallel sub-tasks
   - Include specific file paths and line numbers
   - Write measurable success criteria with clear automated vs manual distinction
   - Put tests in the same phase as the code they validate whenever that is practical
   - Automated steps should use the repository's task runner targets whenever possible (for example `{{LINT_COMMAND}}` instead of a raw linter invocation)

4. **Be Practical**:
   - Focus on incremental, testable changes
   - Make each phase self-validating with its own tests and smallest useful verification loop
   - Consider migration and rollback
   - Think about edge cases
   - Include "what we're NOT doing"

5. **Track Progress**:
   - Use a todo list to track planning tasks
   - Update todos as you complete research
   - Mark planning tasks complete when done

6. **No Open Questions in Final Plan**:
   - If you encounter open questions during planning, STOP
   - Research or ask for clarification immediately (under `develop-issue`, use the question contract and hard return)
   - Do NOT write the final plan with unresolved questions
   - The implementation plan must be complete and actionable
   - Every decision must be made before finalizing the plan

## Success Criteria Guidelines

**Always separate success criteria into two categories:**

1. **Automated Verification** (can be run by execution agents):
   - Prefer service-level checks for final validation: `{{CHECK_COMMAND}}` for the touched service
   - Still list the smaller repo-native commands that should be run during the phase for faster feedback
   - Specific files that should exist
   - Code compilation/type checking
   - Automated test suites

2. **Manual Verification** (requires human testing):
   - UI/UX functionality
   - Performance under real conditions
   - Edge cases that are hard to automate
   - User acceptance criteria

**Also require phase-local test planning:**

- Each phase should list the tests added or updated in that phase when the new behavior should be tested there
- Do not defer unit, adapter, component, or SDK-related verification to a later generic testing phase when it naturally belongs to the current phase
- A phase may have no tests only when there is nothing meaningful to test yet; say that explicitly
- **Static code generation is NOT a phase.** Put `{{CODEGEN_COMMAND}}` in the SAME phase as the source-of-truth change that drives it (DTO/endpoint/schema change), under "Changes Required" with regenerated artifacts in "Success Criteria"
- Prefer the smallest repo-native command that proves the phase is correct
- Use `{{CHECK_COMMAND}}` as the default final validation command for the matching service
- Include `{{E2E_COMMAND}}` when the phase changes a user-facing flow that should be validated end-to-end
- For a user-facing flow, the default plan should put that E2E verification in the same phase that makes the flow exercisable
- Only defer required E2E when a later named phase is strictly necessary to make the flow runnable, and say that explicitly in the phase success criteria
- Keep broad end-to-end validation in a later cross-phase section only when it truly depends on multiple completed phases
- When changing logging, sanitization, or error formatting, explicitly protect both user-facing error output and successful structured logging contracts

**Visual / UX features: record-and-upload final phase:**

- When the ticket changes **user-visible** UI or UX in a way reviewers should see, add a **final** phase per the **Visual evidence** section of this template: **one video only**, with a **numbered shot list** and narration intent in the plan, no committed recording artifacts, and execution via {{DEMO_RECORDING_GUIDE}}. Do not add multiple video phases or multiple deliverable videos for the same plan.

**Execution Status section (for resumability):**

- The `## Execution Status` section MUST be the last section in the plan.
- Phase headings MUST be machine-readable and should use the canonical form `## Phase N: Title`. `## Phase N - Title` also validates, but avoid Unicode dashes, bold-only phase labels, decimals, and lettered phases; those can look correct to humans but fail `validate-plan-structure.sh`.
- Size the phase triplets (`implement`, `validate`, `commit-pr`) to match the actual phase count in the plan.
- Phases MUST be whole integers (`phase-1`, `phase-2`, ...). Decimal phases (`phase-2.1`) are NOT allowed; split sub-work into a new full phase instead.
- Every `## Phase N: ...` heading must have exactly three rows: `phase-N: implement`, `phase-N: validate`, and `phase-N: commit-pr`. Do not mark post/finalize rows as done in the initial plan.
- The post and finalize keys are always the same canonical set shown in the template; do not add, remove, or rename them.
- Always run `bash {{SCRIPTS_DIR}}/validate-plan-structure.sh <plan-path>` after writing or editing the plan. If it fails, fix the headings or status rows before returning the plan.
- The validator also warns (without failing) when a plan exceeds 400 non-blank lines or contains a fenced code block over 40 lines. The plan is the review surface: move rationale to the research doc and reference code by file:line instead of pasting it.

If `## Execution Status` does not exist yet, add it as concrete unchecked rows. For a two-phase plan, it should look like this:

```markdown
## Execution Status

<!-- machine-managed; updated by the stage skills and the develop-issue orchestrator. Do not hand-edit. -->

- [ ] phase-1: implement
- [ ] phase-1: validate
- [ ] phase-1: commit-pr
- [ ] phase-2: implement
- [ ] phase-2: validate
- [ ] phase-2: commit-pr
- [ ] post: review-and-fix
- [ ] post: review-validate
- [ ] post: review-commit-pr
- [ ] post: security-review
- [ ] post: security-validate
- [ ] post: security-commit-pr
- [ ] finalize: pr-description
- [ ] finalize: issue-update
```

**Format example:**

```markdown
### Tests to Add or Update

- add unit tests for new domain rules next to the domain code
- add adapter/component coverage for new repository behavior in the same phase
- regenerate SDKs and add component tests when introducing new API endpoints

### Success Criteria:

#### Automated Verification:
- [ ] Fast iteration commands pass: `{{TEST_COMMAND}}` scoped to the touched packages
- [ ] Final service validation passes: `{{CHECK_COMMAND}}`
- [ ] Generated artifacts are updated: `{{CODEGEN_COMMAND}}`
- [ ] E2E passes when relevant: `{{E2E_COMMAND}}`

#### Manual Verification:
- [ ] New feature appears correctly in the UI
- [ ] Performance is acceptable with 1000+ items
- [ ] Error messages are user-friendly
- [ ] Feature works correctly on mobile devices
```

## Common Patterns

- Plans are execution contracts for autonomous agents in development environments. Unless the user explicitly asks, never make production deployment, live-service inspection, secret population, production smoke tests, or production credentials a plan step or acceptance gate. Verify production-targeted code and infrastructure with repository tests, mocks, local services, or non-production endpoints available to the agent.

### For Database Changes:

- Start with schema/migration
- Add store methods
- Add model or repository tests in the same phase that introduces them
- Update business logic
- Expose via API
- Regenerate SDKs/clients (`{{CODEGEN_COMMAND}}`) and add endpoint/component tests in the SAME phase as the API/DTO/schema change, never as a follow-up phase
- Update clients

### For New Features:

- Research existing patterns first
- Start with data model. When the feature persists a record that overlaps an existing table/model's role (logs, traces, events, audit rows), the plan MUST record an explicit **extend-vs-new-table decision**: name the existing model, state whether you are extending it or adding a new table, and justify a new table if chosen. Default to extending the existing model; a parallel table forces a dual write path plus a legacy read/parse fallback
- When a structured/cross-cutting requirement applies to a concept (redaction, sanitization, bounding, sequence, status derivation), enumerate every write/emit path for that concept in the plan and apply the requirement to each; the same concept is often emitted from more than one path
- Add unit or adapter tests as each backend behavior is introduced
- Build backend logic
- Add public API endpoints only when this project has a named non-test consumer or the user explicitly requested that API. The plan must name the current consumer (UI/component/external flow) for each new public endpoint; generated SDK methods, wrapper hooks, docs, and tests do not count. If no current consumer exists, keep the capability behind internal handlers, direct ports, subscribers, or internal-only routes instead.
- Add API endpoints and their SDK/component coverage together when a public endpoint is justified
- Implement UI last
- Add frontend tests in the relevant phase when practical; add `{{E2E_COMMAND}}` in the phase where the user-facing flow becomes runnable, and defer it only when later phases are still required
- If the feature has **visual or UX impact**, end the plan with the **single** record-and-upload demo video phase (see template)

### For External / Provider Integrations:

- Cite the documented contract for every external API call the plan introduces: the exact provider endpoint, the request/response fields the step reads, and the scopes/permissions the stored credential must hold. If research has not confirmed those against the provider docs, the plan is not ready; do not encode a call (or 404/401/403-style status handling) around a capability that has not been verified to exist.
- The plan's provider-contract findings are a point-in-time snapshot from the research run. Add an explicit first implementation step that re-verifies the live provider contract (and any sibling capabilities merged since research) before encoding field sets, units, and enums. Pin each field's unit/format to one authoritative value (for example `delay` in seconds, not milliseconds) and lock it in a test; mark provider fields that the live endpoint does not actually return as optional and do not require them in response-transformation tests.
- For a new capability (tool, integration action, mode), enumerate **every** registration/wiring surface it must be added to across backend **and** frontend, not just the backend adapter. A surface listed in research but missing from the plan ships a half-wired capability.
- Confirm required inputs are actually persisted and available before depending on them. If a step keys off an ID or field (for example an installed-integration ID), name where it is stored and the prior step that captured it; if the install/auth response never returns it, the plan must not assume it.
- Distinguish provider/system-originated removal or revocation from actor-initiated deletion. When a provider webhook already performed cleanup upstream, the plan must route through the shared lifecycle so it skips duplicate provider cleanup, while a user-initiated delete still runs it. Carry that distinction as an explicit signal through the shared command/DTO rather than inferring it.
- Apply lifecycle changes across every provider that shares the generic path, not just the one in scope. A new field or skip-condition on a shared response / removal DTO / delete command must be set correctly by each provider that emits the signal, or the shared contract is half-wired.

### For Refactoring:

- Document current behavior
- Plan incremental changes
- Keep tests close to each phase so behavior stays validated during the refactor
- Include migration strategy

## Sub-task Spawning Best Practices

When spawning research sub-tasks:

1. **Spawn multiple tasks in parallel** for efficiency
2. **Each task should be focused** on a specific area
3. **Provide detailed instructions** including:
   - Exactly what to search for
   - Which directories to focus on
   - What information to extract
   - Expected output format
4. **Be EXTREMELY specific about directories**:
   - Name the exact service or package directory, not a generic term like "backend" or "UI"
   - Include the full path context in your prompts
5. **Specify read-only tools** to use
6. **Request specific file:line references** in responses
7. **Wait for all tasks to complete** before synthesizing
8. **Verify sub-task results**:
   - If a sub-task returns unexpected results, spawn follow-up tasks
   - Cross-check findings against the actual codebase
   - Don't accept results that seem incorrect
