---
date: 2026-01-01T09:00:00+00:00
researcher: [Researcher name]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
topic: "[User's Question/Topic]"
tags: [research, codebase]
status: complete
last_updated: 2026-01-01
last_updated_by: [Researcher name]
---

# Research: [User's Question/Topic]

**Date**: [Current date and time with timezone]
**Researcher**: [Researcher name]
**Git Commit**: [Current commit hash]
**Branch**: [Current branch name]
**Repository**: [Repository name]

## Research Question

[Original user query or issue {{ISSUE_PREFIX}}-123]

## Summary

[High-level findings answering the question]

## Issue Tracker Context

- Issue: `{{ISSUE_PREFIX}}-123 - Title`
- Project: `Project name`, or `None.`
- Project description/content summary, or `None.`
- Completed issues:
  - `{{ISSUE_PREFIX}}-120 - Title`
- Other issues in project:
  - `{{ISSUE_PREFIX}}-124 - Title`: likely separate scope unless explicitly named by the current issue

## Issue Scope Risk

[Does the issue have clear user-facing acceptance criteria and explicit non-goals? If not, what ambiguity exists and how research kept the scope narrow.]

## Relevant Architecture Docs

- `[architecture doc path]` - [why it applies, or the boundary/source of truth it defines]

## Ownership Notes

- **[Fact name]**
  - Source of truth: `[file/symbol]`
  - Consumers/projections: `[files/symbols]`
  - Enforcement/validation: `[files/symbols, or None]`
  - Similar existing fact: `[file/symbol]`
  - Duplicate-owner risk: `[None, or what must not re-decide this fact]`
  - Scope justification: `[why the current issue requires this surface]`

## Detailed Findings

### [Component/Area 1]

- Finding with reference (`path/to/file.ext:123`)
- Connection to other components
- Implementation details

## Code References

- `path/to/file.ext:123` - Description of what's there

## Architecture Insights

[Patterns, conventions, and design decisions discovered, mapped to the layering and ownership rules in {{ARCHITECTURE_GUIDE}}.]

## Historical Context (from {{THOUGHTS_DIR}})

- `{{THOUGHTS_DIR}}/shared/something.md` - Historical decision about X

## Related Research

- `{{RESEARCH_DIR}}/[related].md`

## Open Questions

Q1. Should the legacy export endpoint be removed instead of migrated?
Context: The new flow replaces the export path; keeping both means two write paths for the same record.
Research checked: `path/to/export_handler.ext:40`, `{{ISSUE_PREFIX}}-123` comments, access logs query in research notes.
Why this requires user input: Removal changes public compatibility and evidence cannot show whether external clients still call it.
Default if unanswered: a
Options:
a. [Recommended] Remove the legacy endpoint and its tests in the same PR.
b. Keep the legacy endpoint and route it through the new flow.
