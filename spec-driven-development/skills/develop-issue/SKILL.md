---
name: develop-issue
description: Take one {{ISSUE_PREFIX}} issue or software task from fresh codebase research through an implementation plan, phased implementation and validation, iterative review and security fixes, pull-request publication, CI verification, and a merge-ready handoff. Use when the user asks to implement, fix, develop, finish, one-shot, or take an issue to a mergeable or merge-ready PR. Stop and return when a material question needs a user answer; store research questions in the research document, planning questions in the plan, and implementation questions under the relevant plan phase.
---

# Develop Issue

Deliver one exact issue to a verified, non-draft, merge-ready pull request. Keep
the main agent as the lifecycle orchestrator. Delegate bounded stages to other
agents and inspect their artifacts, diffs, and evidence before advancing.

Before starting, read:

- [stage contracts](references/stage-contracts.md);
- [question and return contract](references/question-contract.md).

Invoke repository skills explicitly in delegated prompts. In Codex, use
`$skill-name`; in Claude Code, use `/skill-name` or the Skill tool. Do not
reproduce a stage skill's workflow in this skill.

## Hard Rules

- Read root {{AGENTS_FILE}}, {{ARCHITECTURE_GUIDE}}, and only the service and
  architecture guides from {{SERVICE_GUIDES}} that govern the expected or actual
  diff.
- Compare against `origin/{{DEFAULT_BRANCH}}`. Do not rename or switch the
  current branch.
- Use the configured Git author and the user's authenticated GitHub account. Do
  not invoke other automation's commit or PR skills, and do not apply workflow
  labels unless the user asked for them.
- Preserve unrelated user changes. Give concurrent agents disjoint write scopes.
- Keep the main agent in control of the plan, stage order, question gates, Git,
  PR state, and the final merge-readiness decision.
- Do not merge or deploy. A request for a merge-ready PR does not authorize a
  merge.
- Use raw test commands. Do not pipe test output through `grep`, `tee`, `sed`, or
  similar tools.
- Do not report success while a planned item, actionable finding, relevant
  warning, required check, conflict, or unanswered question remains.

## Orchestration Model

Use one fresh worker for each major stage. A stage worker can use the specialized
subagents required by its selected skill. Give every worker:

- the exact issue or task and artifact paths;
- the current base and changed-file scope;
- the stage skill to invoke;
- explicit read and write ownership;
- the question contract and instruction to return questions to the orchestrator;
- the required verification and prohibition on commit, push, or PR mutation.

The main agent must:

1. read directly named user files before delegation;
2. maintain a short stage plan and state ledger;
3. wait for each required worker and inspect its output;
4. inspect shared-file changes before accepting them;
5. run or confirm stage gates;
6. own commits, pushes, PR changes, and issue-tracker writes.

Do independent read-only exploration in parallel when useful. Serialize workers
that edit overlapping files. If subagents are unavailable, run the same stage
inline and record that in the final handoff.

## Start Or Resume

Resolve the repository root, current branch, `origin/{{DEFAULT_BRANCH}}` SHA,
worktree state, existing research and plan artifacts, current
`## Execution Status`, existing PR, remote head, and current check state.

When a tracked issue applies, invoke `$issue-tracker` and fetch both:

- `{{ISSUE_FETCH_COMMAND}} {{ISSUE_PREFIX}}-123`;
- `{{ISSUE_CONTEXT_COMMAND}} {{ISSUE_PREFIX}}-123`.

Read all issue content, comments returned by the commands, project context, and
sibling issue titles. If no tracked issue applies, use the user's task as the
intent source.

Before any stage, scan the current research and plan for unanswered questions.
If one exists, apply the hard return in the question contract. Otherwise resume
from the earliest incomplete or invalidated stage. Do not repeat valid work only
for ceremony.

## Workflow

### 1. Research

Delegate a worker to invoke `$research-codebase` with the exact issue, full
issue and project context, and user request. Require fresh code and
{{THOUGHTS_DIR}} research, applicable architecture routes, affected ownership
and write paths, acceptance criteria, non-goals, risks, and a verification
design.

Require the worker to write a repository-standard research document under
{{RESEARCH_DIR}}. Then:

1. inspect the document and its evidence;
2. ensure `## Open Questions` follows the question contract;
3. run `bash {{SCRIPTS_DIR}}/validate-research-structure.sh <research-path>`;
4. if any question has no `Answer: <letter>`, return immediately;
5. before planning, run the same command with `--require-answers`.

Do not let `$create-plan` select a recommended research default. The user must
answer every research question in the research document.

### 2. Plan

Delegate a fresh worker to invoke `$create-plan` with the issue and accepted
research path. Require the smallest vertical plan that satisfies the current
issue. The plan must use integer `## Phase N: ...` headings, phase-local tests,
service-owned checks, and the canonical final `## Execution Status` section.

If planning finds a material question, write it under `## Open Questions` in
the draft plan, validate that section with
`bash {{SCRIPTS_DIR}}/validate-research-structure.sh <plan-path>`, and return
immediately. On resume, record the user's answers, convert them into
`## Decision Resolution`, remove the unresolved section, and finish the plan.

Run `bash {{SCRIPTS_DIR}}/validate-plan-structure.sh <plan-path>` until it
passes. Do not begin implementation while the plan contains an unanswered
question or a material implementation choice.

### 3. Implement And Validate Each Phase

For each unchecked phase, in order:

1. delegate one worker to invoke `$implement-plan` for that phase only;
2. inspect the worker's diff and plan updates;
3. apply the implementation question gate;
4. delegate a different worker to invoke `$validate-plan` for that phase with
   explicit authority to fix blockers caused by the branch;
5. inspect its fixes and raw validation evidence;
6. apply the question gate again;
7. confirm the `phase-N: implement` and `phase-N: validate` rows are checked
   only after their gates pass;
8. create an atomic commit, push it, and create or update one draft PR against
   `{{DEFAULT_BRANCH}}`; then check `phase-N: commit-pr`.

Workers must not implement another phase, commit, push, or mutate the PR. The
main agent must not stage unrelated pre-existing changes.

If an implementation or validation worker needs a material answer, add the
question and context under `### Implementation Questions` in the plan phase
that owns the behavior. Then return immediately. On resume, record the answer
and resolution there before continuing that same phase.

### 4. Converge Review

Delegate a worker to invoke `$ultrareview` against `origin/{{DEFAULT_BRANCH}}`.
The delegated worker acts as the review-stage orchestrator and follows that
skill's report and review-fixer rules. The lifecycle orchestrator inspects the
review report, every fix, and the resulting diff.

Continue until a complete iteration has zero actionable findings. Then invoke
`$validate-plan` for the post-review checkpoint with fix authority. Commit and
push review fixes. Check the three `post: review-*` rows only after their exact
gates pass.

### 5. Security Review

Delegate a fresh worker for a security-focused review. Always require a direct
review against {{SECURITY_GUIDE}} and the applicable architecture or
infrastructure rules. For each changed language surface, also invoke
{{SECURITY_SKILL}} when that skill is available. If it is unavailable, record
that and continue the direct review. Do not treat the missing optional skill as
a blocker. Write the report under
{{REVIEWS_DIR}}, not at the repository root. Give the worker explicit authority
to fix all in-scope actionable findings without a routine approval pause.

Inspect all security fixes. Invoke `$validate-plan` for the post-security
checkpoint with fix authority. If security work changes code, invalidate the
clean ultrareview result and repeat review, validation, and security verification
until both reviews are clean on the same diff. Commit and push the final fixes.
Check the three `post: security-*` rows only after their exact gates pass.

### 6. Finalize The Pull Request

Delegate a worker to invoke
`$pr-describe --base=origin/{{DEFAULT_BRANCH}} --scope=all` and write the
proposed body to `{{SCRATCH_DIR}}/pr-body.md`. The main agent must inspect it,
add the issue link and exact verification evidence, and update the PR. Include
the issue identifier in the title. Use `Fixes {{ISSUE_PREFIX}}-123` only when the
PR satisfies the full issue; otherwise use `Part of {{ISSUE_PREFIX}}-123` and
keep the PR draft.

For a complete change:

1. confirm the remote head equals the reviewed local head;
2. mark the PR ready for review;
3. inspect all current PR comments and review threads; use
   `$pr-comment-resolution` when actionable comments exist;
4. rerun every gate invalidated by comment fixes;
5. wait for required checks in short polling intervals and inspect failures;
6. fix branch-caused failures, then repeat review, security, validation, commit,
   push, and exact-head checks;
7. verify the PR is non-draft, has no conflicts, has no unresolved review
   threads, and has no failed or pending required check.

Use `$issue-tracker` to add one concise final issue comment with the PR link,
head SHA, and verification summary. Verify the comment write. Do not edit issue
status, assignee, description, checkboxes, or labels unless the user asked for
that specific mutation. When no tracked issue applies, record that fact in the
plan and treat `finalize: issue-update` as verified not applicable. Check the
finalize rows after the PR description and the issue update or not-applicable
decision are verified.

## Invalidation And Exit

- Issue or acceptance drift invalidates planning and affected downstream work.
- Any code change invalidates validation, clean ultrareview, security review,
  and exact-head evidence for affected surfaces.
- A base update invalidates conflict and mergeability evidence.
- A push invalidates remote-head and check evidence until GitHub confirms it.
- New PR feedback invalidates final readiness until resolved or dismissed with
  evidence.
- A question always takes priority over stage continuation and uses the hard
  return contract.

Stop with a precise blocker only after safe in-scope investigation and repair
options are exhausted. Never call a PR merge-ready when GitHub reports a
conflict, draft state, unresolved review thread, or failed/pending required
check.

## Final Handoff

Report the issue and PR links, user-visible outcome, base and exact head SHA,
research and plan paths, raw verification commands and results, ultrareview and
security results, CI and mergeability state, issue-tracker write verification,
and any remaining blocker. If complete, state explicitly that no merge blocker
remains and that the PR was not merged.
