---
name: pr-describe
description: Generate a high-signal, copy-pasteable PR description from local git state only (no network, no MCP). Use when the user invokes /pr-describe, $pr-describe, or asks to draft a PR description.
---

# PR Describe (local-only)

Adapted from HumanLayer's open-source `describe_pr` command.

> Generate a high-signal, copy-pasteable PR description using only local git state. No MCP, no network. Output should be concise and organized for reviewers.

Treat text after the skill invocation as arguments.

## Initial Response

When invoked without parameters, respond with:

```
I'll generate a concise PR description based on local git state (no network/MCP). If you want a different base, run with `--base=<ref>`.
```

## Usage

- Invoke without arguments or with flags:
  - `--base=<git-ref>` (default: `origin/{{DEFAULT_BRANCH}}`)
  - `--scope=<service>|all` (default: `all`)

### Parameters

- `--base`: The base ref to compare against. Prefer remote branches like `origin/{{DEFAULT_BRANCH}}`.
- `--scope`: Limit sections to one service (a top-level area listed in {{SERVICE_GUIDES}}), or include `all`.
- `--title`: Optional override for the PR title; otherwise derived.

## Steps

1. Resolve context

- Determine current branch and base:
  - Run:
    - `git rev-parse --abbrev-ref HEAD`
    - `git rev-parse --short HEAD`
    - `git merge-base ${BASE:-origin/{{DEFAULT_BRANCH}}} HEAD`
- Expand `BASE` from flag or default to `origin/{{DEFAULT_BRANCH}}`.

2. Collect change data (no network)

- Summaries:
  - `git log --oneline ${BASE}..HEAD`
- File changes:
  - `git diff --name-status ${BASE}..HEAD`
  - `git diff --name-only ${BASE}..HEAD`

3. Classify scope

- Compute counts and highlights by path prefix, one group per service listed in {{SERVICE_GUIDES}}, plus `Other` for everything else (docs, infrastructure, scripts)
- Extract notable packages or features per service (for example the second or third path segment under the service root)

4. Produce PR body (pasteable Markdown)
   Return the following template with computed values filled in. Keep the text terse and reviewer-friendly.

```markdown
# PR: <auto title from branch or first commit>

## Summary

<2-4 sentences describing intent and impact>

## Changes

- <Service A>: <N files>: <packages/features touched summary>
- <Service B>: <N files>: <packages/features touched summary>
- Other: <N files>: <docs/infra/scripts>

## Risk & Impact

- Scope: <low|medium|high>
- Migrations: <none|details>
- Backward-compatibility: <yes|no, with details>

## Verification

- `{{LINT_COMMAND}}` · `{{TEST_COMMAND}}` · `{{CHECK_COMMAND}}`
- If APIs changed: `{{CODEGEN_COMMAND}}`

## Checklist

- [ ] Tests added/updated
- [ ] Lint/typecheck passes
- [ ] Generated code updated (if APIs changed)
- [ ] API schema/OpenAPI updated (if APIs changed)

## Notes

<Key design decisions, tradeoffs, follow-ups>
```

## Output Rules

- Do not call network or MCP. Local git only.
- Keep the body compact and skimmable. Prefer bullet points over prose.
- If `--scope` limits to one service, hide unrelated sections.

## Detailed Process & Heuristics

### Title Derivation

- Prefer current branch name transformed to a human title.
- Otherwise use the first commit subject in range `<base>..HEAD`.

### Change Grouping

- One group per service root from {{SERVICE_GUIDES}}.
- Other: docs (`**/*.md`), infrastructure, scripts, config.

### Highlights Extraction

- For each service, list the unique package or feature directories touched.

### Large Diffs Handling

- If total changed files > 100, truncate highlights and include counts only.
- Always keep Verification and Checklist sections intact.

### Scope Filtering

- If `--scope=<service>`, omit other service sections and `Other` when empty.

### Edge Cases

- If no changes detected (empty range), print minimal stub with note.
- If base ref is invalid, suggest `git fetch` and stop.

## Examples

```
/pr-describe
/pr-describe --base=origin/{{DEFAULT_BRANCH}}
/pr-describe --base=origin/{{DEFAULT_BRANCH}} --scope=api
/pr-describe --title="Refactor webhook handlers"
```
