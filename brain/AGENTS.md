# Brain Writing Guide

This vault is the working memory behind future posts, talks, projects, and decisions. Obsidian is
the main editor. The website is a renderer for selected notes.

## Folder Roles

- `inbox/` is for raw captures: deep-research outputs, pasted notes, rough ideas, transcripts, and
  scratch synthesis.
- `insights/` is for durable notes worth linking, revisiting, and publishing on the site.
- `sources/` is for summaries of papers, docs, articles, repos, talks, benchmark reports, and
  standards.
- `post-seeds/` is for clusters of notes that may become polished blog posts.
- `assets/` is for images, diagrams, screenshots, PDFs, audio, and other note attachments.

## Good Notes

A good note preserves useful thinking with enough context that future-you can reuse it. It may be a
deep-research output, article summary, comparison table, Mermaid graph, argument sketch, source
trail, or a cluster of observations.

Start with the clearest version of the thought. Add structure when it helps the material: headings,
tables, diagrams, source lists, examples, and links. Link related notes with `[[note-slug]]`.

For deep-research outputs, preserve the useful detail: source trails, claims, measurements,
examples, and open threads. If a note is long, add a short orientation at the top.

## Deep Research Reports

`dr` research reports belong in `brain/inbox/dr/`, not only in `.context/`.
The inbox copy is the durable copy the user can read later.

When creating `dr` reports:

1. Write or copy every generated Markdown report into `brain/inbox/dr/<date-or-topic>/`.
2. Preserve the full report content, including source registers, evidence notes, claim checks,
   final evaluations, gaps, and recommended follow-up research.
3. Commit those reports with the work that used them. Do not leave the only copy in `.context/`.
4. Never delete historical `brain/inbox/dr/**` reports. If a report is weak, outdated, superseded,
   or wrong, keep it and add a newer report or correction note.
5. When promoting research into `insights/`, keep the original `dr` reports in the inbox so the
   user can audit the path from sources to insight.

`.context/dr/` may still be used as temporary scratch space during a run, but it is not archival.
Before finishing research work, make sure the readable archival copy exists under `brain/inbox/dr/`
and is committed.

## Publishing

Only notes with `publish: true` are rendered on the site. Published notes need this minimal
frontmatter:

```md
---
type: insight
title: "Agents Need Maps, Not Dumps"
slug: agents-need-maps-not-dumps
created: 2026-06-28
status: raw
publish: true
tags:
  - ai-agents
---
```

Use `post-seeds/` when several notes start forming a publishable article. Use `sources/` when the
main value is preserving what a source says and why it matters.
