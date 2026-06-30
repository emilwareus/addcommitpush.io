# Insight Writing Guide

This folder is a knowledge base. It is not a marketing surface, a scratchpad,
or a place for short note-card summaries.

When writing or editing files under `brain/insights/`, treat each insight as an
educational research article about one specific subject. The reader should come
away understanding the concept, current state of research, underlying
innovation, implementation shape, trade-offs, and open questions. Each insight
should feel like a short, approachable scientific paper: rigorous enough to be
trusted, but written in clear language with prerequisites explained inline or in
linked prerequisite insights.

## Length And Depth

The existing short notes are too shallow for the intended use of this folder.
An insight should usually be around two pages of informative, readable content.
Dense or algorithmic subjects can be up to five pages when the extra length is
needed to teach the subject properly.

Do not write one-paragraph summaries with short lists unless the user
explicitly asks for a tiny stub. A good insight should be long enough to
actually educate.

This applies to every subject, not only static analysis. For example:

- If the subject is an algorithm, explain the algorithm completely: input,
  output, data structures, main loop, complexity, correctness intuition,
  trade-offs, limits, and edge cases. Add pseudocode.
- If the subject is a system architecture, explain the components, data flow,
  ownership boundaries, persistence model, operational assumptions, and
  bottlenecks.
- If the subject is an evaluation method, explain the benchmark, metric,
  baseline, threat model, data quality, and how to interpret the result.
- If the subject is a product or workflow pattern, explain the user problem,
  state model, feedback loop, adoption constraints, and edge cases.

## What A Good Insight Contains

A strong insight should include:

- a clear thesis;
- enough background to understand the subject;
- definitions for important terms;
- a real explanation of how the mechanism works;
- examples or small scenarios where useful;
- pseudocode for algorithmic topics;
- graphs, diagrams, or data tables when they clarify the research;
- trade-offs and edge cases;
- practical design implications;
- source-backed claims;
- clear references at the end to articles, papers, docs, standards, or other
  external sources, not just files inside this repository;
- a scoped piece of knowledge the user can attain by reading the insight, not
  merely one isolated claim.

The body should teach, not merely label. A weak insight says "Technique X is a
faster version of Technique Y." A strong insight explains what Y does, what X
changes, why the change affects the result, what it costs, what evidence
supports it, and where its limits are.

## Suggested Structure

Use this structure unless another shape is clearly better:

1. Frontmatter
2. Title
3. One-paragraph thesis
4. Background and definitions
5. Main explanation
6. Algorithm or mechanism, when applicable
7. Pseudocode, when applicable
8. Trade-offs, limits, and edge cases
9. Practical implications
10. Sources

The opening should tell the reader what idea matters. The middle should teach
the mechanism. The ending should explain how the insight affects engineering
judgment.

## Frontmatter

Published insights use this shape:

```yaml
---
type: insight
title: "Precise Human-Readable Title"
slug: precise-human-readable-title
created: YYYY-MM-DD
status: working
publish: true
tags:
  - broad topic tag
feeds_into:
  - "[[parent-note]]"
related:
  - "[[related-note]]"
---
```

Use one broad tag unless the user explicitly asks for more. Tags are broad
navigation, not a full ontology. Folder paths, titles, backlinks, and body text
already carry subtopic detail.

For the current static analysis cluster, the only tag is:

```yaml
tags:
  - static analysis
```

Do not create a tag for every subtopic. Folder paths, titles, backlinks, and
body text already carry subtopic detail.

## Graphs, Diagrams, And Data Tables

The user strongly prefers insights that preserve the shape of the research.
When the underlying research contains useful comparison tables, benchmark
numbers, source registers, evidence tables, taxonomies, timelines, architecture
diagrams, dependency graphs, or process diagrams, copy or adapt that structure
into the insight instead of flattening everything into prose.

Use tables and diagrams generously when they make the note easier to learn:

- Markdown tables for algorithm comparisons, benchmark results, source quality,
  metric definitions, trade-offs, and caveats;
- simple diagrams for pipelines, feedback loops, state machines, dependency
  graphs, architecture relationships, and lifecycle flows;
- pseudocode blocks for algorithms, workflows, and procedures;
- small worked examples when they make the mechanism concrete.

Good table subjects:

- approach versus precision versus cost;
- source versus claim versus limitation;
- metric versus what it measures versus what it misses;
- tool or system versus data model versus integration point;
- limitation versus cause versus mitigation;
- benchmark result versus interpretation caveat.

Do not invent numbers. If a `dr` report or source paper contains useful
quantitative or comparative structure, carry it over with citations. Prefer the
primary source when possible. If the table is a synthesis assembled from
multiple sources, label it as synthesis and make the sources clear.

## Evidence Standard

Prefer strong sources:

- peer-reviewed papers;
- standards;
- official documentation from established tools;
- popular open-source repositories not maintained by the author of the post;
- well-known engineering books or experience reports from credible teams.

Use weak sources only as leads:

- vendor blogs;
- personal blog posts;
- same-author README claims;
- local implementation notes;
- private anecdotes;
- generated research reports.

Generated `dr` reports are useful research scratchpads. Durable insight files
should always cite the primary sources directly, not these research files.

## Tone

Write in a scientific, educational tone. Do not sell a tool. Do not frame a
private implementation as proof. Do not overclaim.

Good phrasing:

- "This algorithm over-approximates because..."
- "This claim depends on the following assumptions..."
- "This is useful when..."
- "This breaks down when..."
- "A production engine should expose..."

Avoid phrasing like:

- "This proves the tool is state of the art."
- "This solves static analysis."
- "This is better than everything else."
- "This is the future."

## Algorithmic Topics

For algorithmic subjects, include pseudocode. Pseudocode should be simple
enough to read but precise enough to reveal the real data dependencies.

Useful pseudocode conventions:

- `worklist` for iterative algorithms;
- `reachable`, `visited`, or `frontier` for graph traversal;
- `state`, `facts`, or `cache` for accumulated knowledge;
- `constraints`, `events`, or `updates` for propagation systems;
- `score`, `threshold`, or `rankedCandidates` for ranking or evaluation;
- `changed` or delta sets for fixed-point iteration.

After pseudocode, explain what each data structure means and what approximation
the algorithm is making.

## Practical Design Lens

Most insights should connect the idea back to practical design:

- What facts, observations, or measurements must the system compute?
- What must be cached or invalidated?
- What provenance should be shown to users?
- What would make diagnostics misleading?
- What benchmarks or fixtures would test this claim?
- What should a future article avoid overclaiming?

The best insight files are useful both as research notes and as design
documents.
