---
name: iterate-plan
description: Analyze an existing implementation plan read-only, summarize status and risks, and propose a minimal, pasteable next-sprint patch. Never edits files. Use when the user invokes /iterate-plan, $iterate-plan, or asks to iterate on a plan.
---

# Iterate Plan

Adapted from HumanLayer's open-source `iterate_plan` command.

Treat text after the skill invocation as arguments.

## Initial Response

When invoked without parameters, respond with:

```
I'll analyze the selected plan (read-only), summarize status and risks, then propose a minimal, pasteable patch for the next sprint. Provide `--path=` to target a specific plan.
```

> Analyze a plan in `{{PLANS_DIR}}/*.md`, report current status, and propose a minimal next-sprint delta. Never edits files; returns a pasteable snippet.

## Usage

- Flags:
  - `--path={{PLANS_DIR}}/<file>.md` (optional)
  - `--mode=analyze|propose` (default: `propose`)

## Steps

1) Locate plan
- If `--path` provided, use it; else list candidates under {{PLANS_DIR}} and pick the most recent by mtime.
- Read the plan file fully.

2) Parse structure
- Extract sections: Overview, Phases, Success Criteria, Checklist items (`- [ ]` / `- [x]`).
- Identify unchecked items and their context (phase names).

3) Cross-check high-level reality (read-only)
- Verify presence of referenced files/dirs using LS/Grep/Glob where applicable.
- Do not modify any files.

4) Output
- If `--mode=analyze`:
  - Return: Current status summary, open items by phase, risks.
- If `--mode=propose` (default):
  - Return the above plus a pasteable Markdown patch snippet to apply minimal next steps.

## Output Template

````markdown
## Plan Iteration Summary
- Plan: `<filename>`
- Open items: <N> across phases: <phase list>
- Risks: <short bullets>

## Proposed Next Delta
- Scope: <tight, 1-sprint>
- Changes:
  - [ ] <change 1>
  - [ ] <change 2>

## Patch Snippet (paste into plan)
```diff
@@ Phase <name> @@
- [ ] <existing item>
+ [ ] <next concrete step>
```
````

## Rules

- Do not write to disk. Return content to copy/paste.
- Keep proposals minimal and actionable. Avoid scope creep.
- Any proposed patch must keep the plan valid for `bash {{SCRIPTS_DIR}}/validate-plan-structure.sh` (integer `## Phase N:` headings, matching `phase-N` triplets, canonical post/finalize rows).

## Parsing Rules (Detail)

- Sections are identified by H2/H3 headers (##, ###).
- Checkboxes follow `- [ ]` and `- [x]` patterns exactly.
- Phase blocks start with `## Phase N:`; preserve their titles.

## Risk Assessment Guide

- Flag missing tests, unclear success criteria, or cross-service impacts.
- Note migrations or API changes that need code generation (`{{CODEGEN_COMMAND}}`).

## Proposal Rules

- Tight, single-sprint scope; avoid multi-phase rewrites.
- Include verification hints using the repository's task runner targets (`{{CHECK_COMMAND}}`, `{{TEST_COMMAND}}`) where applicable.

## Patch Snippet Format

- Use unified diff style inside a fenced `diff` block.
- Only include minimal context necessary for the edit.

## Examples

```
/iterate-plan --path={{PLANS_DIR}}/new_ingest_pipeline.md --mode=analyze
/iterate-plan --mode=propose
```
