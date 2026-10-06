---
name: pr-comment-resolution
description: "Resolve GitHub PR review comments end-to-end: discover PR from URL or current branch, fetch all comment sources, analyze each comment against code, implement fixes, validate with tests/lints, and update a checked-off markdown report. Use when users ask to fetch PR comments, analyze review feedback, fix findings, or make the process repeatable."
---

# PR Comment Resolution Workflow

Run this workflow when asked to process PR comments and turn them into implemented, validated fixes.

## Inputs

Support both:
- **Direct PR URL** (user provides it)
- **Current branch auto-detection** (no URL provided)

Resolve the GitHub repository at runtime. Never hard-code an owner or repository
name.

## Phase 0: Resolve Target PR

1. If the user provided a URL, resolve it with:
   - `gh pr view "<url>" --json number,url,title,headRefName,baseRefName`
2. Otherwise, detect from the current branch:
   - `git rev-parse --abbrev-ref HEAD`
   - Try current-branch PR:
     `gh pr view --json number,url,title,headRefName,baseRefName`
3. If that fails, search open PRs by head branch:
   - `gh pr list --state open --head "<branch>" --json number,url,title,headRefName,baseRefName --limit 10`
4. If multiple PRs match, ask the user which one to use.
5. Derive the repository from the resolved PR URL:
   - Remove the `https://github.com/` prefix.
   - Keep the `<owner>/<repository>` part before `/pull/<number>`.
6. Store:
   - repository as `<owner>/<repository>`
   - PR number
   - PR URL

## Phase 1: Fetch All Review Surfaces

Fetch all three data sources (do not skip):

1. **Review line comments**
   - `gh api "repos/<repository>/pulls/<pr>/comments"`
2. **Review summaries**
   - `gh api "repos/<repository>/pulls/<pr>/reviews"`
3. **Issue/PR conversation comments**
   - `gh api "repos/<repository>/issues/<pr>/comments"`

Why: important review signals often appear in summaries or issue comments, not only inline code comments.

## Phase 2: Create Report File First

Create:
- `{{REVIEWS_DIR}}/<date>_pr-<pr-number>-comments-analysis.md`

Use this structure per comment:

```markdown
## <index>) <comment or review id> (<author>)
- Comment link
- Location/path (clickable repo link, if available)
- Comment text

### Analysis
<Is it valid? what code path is affected?>

### Recommendation
<specific actionable fix or "no action required">
```

Rules:
- Include every relevant comment/review item.
- If a comment is ambiguous (emoji/shorthand), ask the user for meaning or infer from team convention and state the assumption.
- Distinguish informational comments from actionable issues.
- Keep the document high-signal only. Exclude praise/encouragement-only comments.
- Write in clear, simple language (short sentences, minimal jargon).
- Always reference files with clickable GitHub links, not plain text paths.

### File Reference Format (Required)

When citing code locations in the markdown report, use clickable links:

- File link:
  - `https://github.com/<repository>/blob/<commit_or_branch>/<path/to/file>`
- Line-range link:
  - `https://github.com/<repository>/blob/<commit_or_branch>/<path/to/file>#L<start>-L<end>`

Examples:
- `src/agent/loop/tool.go`
  -> `https://github.com/<repository>/blob/<commit_or_branch>/src/agent/loop/tool.go`
- `agent.go` lines 280-305
  -> `https://github.com/<repository>/blob/<commit_or_branch>/src/domain/agent/agent.go#L280-L305`

## Review Guidance (High Signal Only)

Apply these interpretation rules consistently:

- Team shorthand markers (for example a reaction or tag your team uses to mean
  **error swallowing**) are actionable unless code proves otherwise.
  - Specifically inspect patterns like discarded errors (`_ = ...`, `err, _ := ...`) in critical/reporting paths.

- Give strong weight to automated/code-review tools:
  - AI code-review bots and agent outputs
  - Other structured reviewer bots
  - These often point to subtle correctness/observability issues; verify carefully before dismissing.

- Remove noise from the report:
  - Do not include pure encouragement comments like "looks good", "nice", emoji-only approval, or similar non-actionable praise.
  - If a comment has no required action, omit it from the final document instead of adding "no action required" noise.

## Phase 3: Verify Against Code Before Editing

For each actionable comment:
1. Locate exact code path(s).
2. Confirm whether issue is real in current code.
3. Expand impact scope (other files using same pattern).
4. Record final recommendation in the markdown report.

## Phase 4: Implement Fixes

Execute all approved/actionable fixes, not just analysis.

Implementation principles:
- Prefer one clean path over dual/legacy paths.
- Remove duplicated helpers/utilities when shared versions exist.
- Extract shared helper only when duplication is real and ongoing.
- Do not silently swallow internal errors: if non-fatal, log them.

## Phase 5: Validate Fixes

Run targeted tests for touched packages first, then broader checks if needed.

Examples:
- `{{TEST_COMMAND}}` scoped to the touched package
- `{{CHECK_COMMAND}}` for the touched service

Then run lints for changed files (`{{LINT_COMMAND}}`).

If tests fail:
1. Fix root cause.
2. Re-run tests.
3. Repeat until green.

## Phase 6: Check Off in Report

Replace plan list with completion checklist:

```markdown
## Execution checklist (completed)
- [x] <item 1>
- [x] <item 2>
...

## Validation run
- [x] <test command 1>
- [x] <test command 2>
- [x] Lints clean
```

The report must show what was fixed and how it was validated.

## Quick Command Template

```bash
# Resolve branch and PR
git rev-parse --abbrev-ref HEAD
gh pr view --json number,url,title,headRefName,baseRefName

# Search by branch when the current-branch lookup fails
gh pr list --state open --head "<branch>" --json number,url,title,headRefName,baseRefName --limit 10

# Derive <repository> from the resolved PR URL as <owner>/<repository>

# Fetch review data
gh api "repos/<repository>/pulls/<pr>/comments"
gh api "repos/<repository>/pulls/<pr>/reviews"
gh api "repos/<repository>/issues/<pr>/comments"
```

## Completion Criteria

Only declare done when all are true:
- Every relevant PR comment source was fetched.
- Each actionable comment has analysis + recommendation in markdown.
- All actionable findings are implemented in code.
- Tests/lints for touched areas pass.
- Markdown checklist is checked off with validation evidence.
- Final report is noise-free (no praise-only items).
