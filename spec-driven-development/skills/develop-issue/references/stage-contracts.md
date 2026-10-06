# Develop Issue Stage Contracts

Use these gates to advance and resume the workflow.

## State ledger

Record the issue or task snapshot, `origin/{{DEFAULT_BRANCH}}` SHA, branch and
head SHA, research and plan paths, current execution-status row, changed-file
scope, existing PR and remote head, validation evidence, review report paths,
open questions, and blockers. Store temporary orchestration state under
{{SCRATCH_DIR}}.

## Gates

| Stage | Required output | Advance gate |
|---|---|---|
| Orient | Exact issue/task, base, branch, worktree ownership, existing artifacts and PR | Scope is known and no unanswered question exists |
| Research | Repository-standard research with current code evidence, acceptance criteria, non-goals, risks, verification design, and `## Open Questions` | Research structure passes and every question has an inline user answer |
| Plan | Repository-standard plan with integer phases and canonical `## Execution Status` | Plan structure passes and no unresolved implementation choice remains |
| Phase implement | Complete phase diff and updated plan evidence | No planned item, known gap, warning, or phase question remains |
| Phase validate | Raw focused and service-owned verification, with branch-caused failures fixed | Required commands pass and the matching validate row is checked |
| Phase publish | Atomic commit, pushed remote head, one draft PR against `{{DEFAULT_BRANCH}}` | Remote contains the phase commit and the matching commit-pr row is checked |
| Ultrareview | Complete report and fixes | One full iteration reports zero actionable findings on the current diff |
| Security | Scope-specific report and fixes | No actionable security finding remains on the current diff |
| Final PR | Final body, issue link, exact-head checks, resolved feedback, and CI state | PR is non-draft, conflict-free, thread-clean, and all required checks have passed |

## Evidence

For each command, record the exact command, affected stage and head/diff, result,
and follow-up. Classify failures as branch-caused, pre-existing,
infrastructure, or unknown. A later passing retry does not erase the first
failure or its diagnosis.

Do not reuse green evidence after a change that can affect it. Do not treat a
successful write response as proof of a GitHub or issue-tracker mutation; read
the remote state again.

## Pull-request readiness

The final PR must target `{{DEFAULT_BRANCH}}`, include the issue identifier when
applicable, and point to the exact reviewed remote head. `mergeable: UNKNOWN`,
pending required checks, a draft flag, unresolved threads, or an unverified
remote head is not ready. A documented absence of configured checks is
acceptable only when all repository-owned local gates for the changed services
pass.

Never merge as part of this skill.
