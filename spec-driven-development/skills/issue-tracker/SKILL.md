---
name: issue-tracker
description: Read issues and project context from the team's issue tracker and post one final comment. Use when an issue id such as {{ISSUE_PREFIX}}-123 is mentioned, when research or planning needs full issue context, or when develop-issue finalizes a PR.
---

# Issue Tracker

This skill is the only place the spec-driven workflow touches the issue tracker.
It is tracker-agnostic: wire the template tags below to a CLI, script, or API
call for your tracker (Linear, Jira, GitHub Issues, GitLab, and so on). Prefer
small repo-local scripts over an MCP server so the commands are reproducible and
their output can be read in full.

## What the workflow needs

The workflow needs exactly four operations. Nothing else in the toolkit mutates
the tracker.

| Operation | Command | Used by | Must return |
|---|---|---|---|
| Fetch issue | `{{ISSUE_FETCH_COMMAND}} {{ISSUE_PREFIX}}-123` | develop-issue, research-codebase, create-plan | Title, description, acceptance criteria, non-goals, state, labels, and **all comments** |
| Fetch project context | `{{ISSUE_CONTEXT_COMMAND}} {{ISSUE_PREFIX}}-123` | develop-issue, research-codebase | Parent project or epic (name, description/content), sibling issue ids and titles, and which siblings are completed. Return an explicit "no project" result when there is none |
| Search issues | `{{ISSUE_SEARCH_COMMAND}} "<query>"` | create-plan | Matching issue ids and titles, to find related or past implementations |
| Comment on issue | `{{ISSUE_COMMENT_COMMAND}} {{ISSUE_PREFIX}}-123 "<markdown body>"` | develop-issue (final handoff) | The created comment id or URL, so the write can be verified |

Use human-readable issue identifiers (`{{ISSUE_PREFIX}}-123`), not internal
UUIDs. Credentials come from the environment; never print or commit them.

## Reading an issue

1. Run the fetch command and read the full output, including every comment.
2. Run the project-context command. If the issue has a project, read the full
   project description plus every sibling issue title. Treat sibling issues as
   scope boundaries unless the current issue explicitly says to implement that
   sibling behavior here.
3. If the output references images or attachments, download and view them
   when your tracker tooling supports it, and reference them when relevant.

## Writing to the tracker

- `develop-issue` posts **one** concise final comment with the PR link, head
  SHA, and verification summary.
- After writing, read the issue again and confirm the comment exists. A
  successful write response is not proof of the mutation.
- Do not edit issue status, assignee, description, checkboxes, or labels unless
  the user asked for that specific mutation.
- Do not write to the tracker while a question hard return is in effect.
