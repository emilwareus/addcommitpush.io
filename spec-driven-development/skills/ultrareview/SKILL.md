---
name: ultrareview
description: "Run the full-codebase review loop for current changes: orchestrate one generic review-fix subagent shell, fix substantive issues, and maintain an iterative review report until a complete iteration finds nothing actionable."
---

# Ultrareview

Review the current changes end to end. The main agent is the orchestrator: it owns
scope, architecture context, subagent prompts, subagent result inspection,
validation, report completeness, and the final done/not-done decision.

Use one generic review-fix subagent shell. The orchestrator tells that subagent
what to review and how for each pass. The subagent first reviews its assigned
scope fully, then writes its own entry in the review report, then fixes the
issues it found in that same subagent context, then updates the same report entry
with what it fixed and how. Do not create separate subagents for architecture,
intent, detailed review, or fixing.

## Hard Rules

- Do not commit or push.
- Review the current branch against `origin/{{DEFAULT_BRANCH}}`, including
  uncommitted and untracked files.
- Work across the full codebase. Do not hard-code per-service routing.
- Run at most 10 review turns. In this skill, one turn means one full review
  iteration: dispatch review-fix subagents, inspect their work, validate, and
  report.
- Stop as `done` only when the orchestrator finds no remaining substantive issues.
- If subagent tooling is unavailable, run the same loop inline and record that
  in the report.
- Never hand findings from a reviewer subagent to a separate fixer subagent.
  Every spawned `ultrareview-review-fixer` instance is responsible for its own
  report entry and fixes.
- Never revert changes you did not make. Work with concurrent edits.
- Keep validation as raw commands. Do not pipe test output through `grep`, `tee`,
  `sed`, or similar tools.
- A completed report certifies only the reviewed snapshot recorded immediately
  before handoff. If implementation content or changed scope differs from the
  last inspected and validated state before handoff, run another iteration.
  Later changes are outside that report and require a new review.

## Required Architecture Context

Before the first iteration, the orchestrator must read the system architecture
entrypoints from the repo root ({{ARCHITECTURE_GUIDE}}) and route to the
smallest relevant topic docs for the actual changed paths.

Also read path-local guides for changed areas when present, such as
{{AGENTS_FILE}} files, feature README files, package docs, service architecture
docs from {{SERVICE_GUIDES}}, and the relevant architecture topic documents. Do
not make any one service guide mandatory unless the diff or user intent makes
that area relevant.

## Start The Report First

Create the review report before spawning review-fix subagent instances, then append
to it throughout the loop.

1. Gather metadata with `bash {{SCRIPTS_DIR}}/spec-metadata.sh`.
2. Determine an issue label from the branch name, plan/research artifact, issue
   reference, or user request. Use `no-issue` if none is discoverable.
3. Slug the branch name.
4. Create `{{REVIEWS_DIR}}/<timestamp>_<issue>_<branch-slug>_ultrareview.md`.
5. Write the report header and `## Context` before iteration 1.

Use this rough structure:

```markdown
---
date: <ISO datetime>
reviewer: ultrareview
branch: <branch>
base: origin/{{DEFAULT_BRANCH}}
issue: <issue-or-no-issue>
status: in-progress
---

# Ultrareview: <issue-or-branch>

## Context

- Branch: <branch>
- Base: origin/{{DEFAULT_BRANCH}}
- Issue / intent source: <source>
- Architecture references:
  - <architecture entrypoints from {{ARCHITECTURE_GUIDE}}>
  - <path-local guides selected from the changed areas>
- Changed packages / bounded contexts: <orchestrator summary>

## Iteration 1

### Scope

### Review-Fix Subagent

### Findings

### Fixes Applied

### Validation

### Decision

## Final Comment
```

When the review finishes, update `status` to `complete` only if the loop is done.
Use `status: stopped` if max iterations are reached with remaining issues.

## Review Scope Setup

Build the scope from local git state:

- `git diff --stat origin/{{DEFAULT_BRANCH}}...HEAD`
- `git diff --name-status origin/{{DEFAULT_BRANCH}}...HEAD`
- `git diff --name-status`
- `git ls-files --others --exclude-standard`

Identify changed packages, bounded contexts, generated artifacts, docs, tests,
and cross-service contracts from that evidence. This is for orchestrator scoping
only; it must not become hard-coded service routing.

Also identify the underlying intent:

- current user request if available
- implementation plan or research artifact if obvious
- branch name or issue reference
- PR description or local task files when present

The review must judge both code quality and whether the change actually solves
the underlying issue in the best way available in this codebase.

Treat plans, tickets, and acceptance criteria as intent evidence, not an
exhaustive inventory of surrounding runtime contracts. Independently inspect
enclosing callers, sibling paths, architecture rules, and existing behavior for
obligations those artifacts do not name.

## Required Contract And Dependency Impact Audit

When a change alters a public or shared internal interface; an API, schema, DTO,
event, message, protocol, or SDK contract; dependency wiring; an integration,
tool, or LLM invocation path; or agent behavior, record a compact impact map or
equivalent evidence. Use repository search beyond the diff and plan to find and
classify, with evidence, the authoritative owner; producers, builders, and
callers; implementers, adapters, and registries; direct and indirect consumers;
generated projections; hand-owned wrappers or examples; and applicable test
doubles and fixtures.

For the discovered impact, identify affected surfaces and non-obvious
exclusions. Check persistence, backward compatibility, versioning, migration,
and deployment when applicable. For an external integration, tool, or LLM call,
inspect the actual request/response or tool schema, routing,
authentication/scopes/permissions, error/timeout/retry/streaming behavior, and
usage and cost when relevant. When behavior depends on an external contract,
verify it against the current authoritative source; do not require external
research for changes that do not cross or depend on that boundary. For agent
behavior, trace prompts and context; tool exposure, schemas, and results; model
selection; memory and state; iteration and termination; authorization; and
behavior/eval coverage. Route each affected surface to its owning architecture
or path-local guide instead of copying its rules into the review.

Validate affected seams from authority through implementation and consumption.
Run the owning generation, drift/check, integration/component, and eval commands
when relevant, and inspect generated output plus hand-owned projections for
semantic agreement. Record evidence for affected surfaces and any non-obvious
exclusions; an unsupported omission of a plausible consumer or policy owner
blocks completion. Do not require rote unaffected statements for categories
plainly outside the blast radius. An isolated local implementation detail with no
contract, dependency, invocation, or agent-policy effect may be marked not
applicable with a short reason. Use this audit together with the runtime
exit-path review when both trigger.

## Required Runtime Exit-Path Review

When a change adds or alters runtime control flow, record a compact exit-path
matrix or equivalent evidence in the report. Cover success, ordinary error,
cancellation, deadline, and partial-work exits, marking genuinely unreachable or
inapplicable cases explicitly. Trace each changed lower-level return through its
enclosing callers until the result reaches the layer that owns externally or
operationally visible behavior.

For every materially affected exit, verify every applicable part of the outcome:
returned value and error identity/classification; state, status, and transaction
effects; events/messages; logs, traces, and metrics; downstream calls or
non-calls; and cleanup. Compare sibling exits that represent the same outcome and
justify any intentional difference. This review is required even when the
lower-level return and error are already correct.

For each introduced or translated failure, verify the intended error identity,
classification, and public/customer-visible sanitization. When a failure is
unexpected or otherwise opaque at its owning boundary, also require actionable
underlying-cause context and stable relevant identifiers on an approved internal
observability surface. Expected failures follow the owning reporting and
suppression policy; do not add raw causes or duplicate telemetry by default. A
type or slug alone is not proof that an opaque failure is diagnosable.

Tests must assert the applicable operational contract at the layer that owns it,
not only the helper return or expected calls. For each materially distinct matrix
row, select semantic assertions that prove the relevant behavior and prohibited
side effects. Assert status, event, or diagnostic details when they are part of
the contract or needed to distinguish the path; do not couple tests to every
incidental telemetry detail or exact wording.

## Review-Fix Subagent

Use only `ultrareview-review-fixer` for delegated review-fix work when the harness
supports named subagents. Install matching definitions for each agent tool you
use (for example `.claude/agents/` for Claude Code, `.codex/agents/` for Codex,
`.cursor/agents/` for Cursor). The subagent is intentionally lightweight: the
orchestrator supplies the report path, iteration number, changed files, intent,
architecture docs, scope, review focus, write boundaries, and validation
constraints.

Do not create different subagent types for different review steps. The orchestrator
guides the same subagent shell through each pass. These are prompt focuses, not
subagent types:

- broad architecture compliance
- issue/intent fit
- detailed package, feature, bounded-context, code-health, comments, docs, and
  tests review
- final verification after prior fixes

Each `ultrareview-review-fixer` instance must do this sequence in its own context:

1. Review the assigned scope fully before editing.
2. Append its findings to the shared review report.
3. Fix the substantive issues it found, inside its assigned write scope.
4. Append what it changed, how it fixed each issue, validation run, and remaining
   risk to that same report entry.
5. Return a concise summary to the orchestrator.

Each subagent report entry should include:

- scope reviewed
- issues found
- fixes applied
- files changed
- validation run or reason not run
- remaining risk

## Iteration Loop

For `Iteration 1` through `Iteration 10`:

1. Append the iteration heading and current scope to the report before dispatch.
2. Dispatch only `ultrareview-review-fixer` instances. The orchestrator prompt
   tells each instance which pass it is running and how to review it.
3. The first pass must focus on broad architecture compliance and include the
   required architecture links plus any relevant topic docs.
4. Later passes should cover intent fit, changed packages, changed features,
   bounded contexts, code health, comments, docs, tests, and optional final
   verification. Give parallel instances disjoint write scopes.
5. Each subagent instance reviews, writes its report entry, fixes its own findings,
   then updates its report entry with fix details. There is no reviewer-to-fixer
   handoff.
6. The orchestrator inspects every subagent's report entry and diff. Do not trust
   a subagent result blindly.
7. Run the narrowest relevant validation commands the repo guidance calls for.
8. Before a `done` decision, record the precise implementation snapshot being
   certified, covering `HEAD`, tracked working-tree content, untracked content,
   and the changed-file scope. Re-derive the scope and content state immediately
   before handoff, excluding only the report's own append-only bookkeeping. If it
   differs from the last inspected and validated state, run another iteration.
   The report certifies only the recorded snapshot; it neither detects nor covers
   later changes, which require a new review.
9. Append orchestrator validation results and the iteration decision.

Continue to the next iteration when fixes changed behavior or when validation or
the orchestrator still sees substantive risk. Stop early only when no unresolved
substantive issues remain, subagent report entries are complete, and validation
has no relevant blocker.

## Done Criteria

`done` means all of the following are true:

- no unresolved substantive issues remain
- architecture compliance was explicitly checked
- intent fit was explicitly checked
- changed packages/bounded contexts received detailed review
- applicable contract, dependency, invocation, and agent-behavior changes have a
  proportional impact map, evidence for affected surfaces and non-obvious
  exclusions, and owning seam/projection validation
- applicable runtime changes have complete exit-path evidence, sibling-path
  comparison, safe actionable diagnostics, and operational-behavior tests
- review-fix subagent changes were inspected by the orchestrator
- each subagent's report entry includes findings, fixes, validation, and remaining
  risk
- relevant validation was run or a concrete reason was recorded
- the final implementation snapshot and re-derived scope match the last inspected
  and validated state
- the report has a final comment summarizing the outcome

If iteration 10 finishes with remaining issues, stop and write a final comment
that names the unresolved blockers. Do not call the review done.
