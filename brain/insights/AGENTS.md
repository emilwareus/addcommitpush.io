# Insight Writing Guide

This folder is a knowledge base. It is not a marketing surface, a scratchpad,
or a place for short note-card summaries.

When writing or editing files under `brain/insights/`, treat each insight as an
educational research article about one specific subject. The reader should come
away understanding the concept, the mechanism, the trade-offs, the failure
modes, and the evidence behind it.

## Length And Depth

The existing short notes are too shallow for the intended use of this folder.
An insight should usually be around two pages of informative, readable content.
Dense or algorithmic subjects can be up to five pages when the extra length is
needed to teach the subject properly.

Do not write one-paragraph summaries unless the user explicitly asks for a tiny
stub. A good insight should be long enough to actually educate.

For example:

- If the subject is call graph algorithms, explain the algorithms completely:
  CHA, RTA, VTA, points-to-based construction, their data structures, their
  fixed-point loops, their precision trade-offs, and their failure modes. Add
  pseudocode.
- If the subject is data flow, explain the representation first: CFG nodes,
  facts, transfer functions, joins, summaries, sources, sinks, barriers, path
  reconstruction, and then the solver.
- If the subject is abstract interpretation, explain abstract domains,
  ordering, transfer functions, joins, widening, fixpoints, and soundness
  assumptions.
- If the subject is diagnostics, explain what makes a diagnostic actionable:
  location, rule id, path, provenance, confidence, suggested fix, suppression
  model, and known limitations.

## What A Good Insight Contains

A strong insight should include:

- a clear thesis;
- enough background to understand the subject;
- definitions for important terms;
- a real explanation of how the mechanism works;
- examples or small scenarios where useful;
- pseudocode for algorithmic topics;
- trade-offs and edge cases;
- practical design implications;
- source-backed claims;
- explicit caveats where the evidence is incomplete.

The body should teach, not merely label. Avoid writing "RTA narrows CHA by
instantiated types" and stopping there. Explain what CHA does, why it
over-approximates, how RTA tracks allocated types, why RTA needs a fixed point,
where RTA still over-approximates, and how VTA or points-to analysis changes the
available facts.

## Suggested Structure

Use this structure unless another shape is clearly better:

1. Frontmatter
2. Title
3. One-paragraph thesis
4. Claim
5. Background and definitions
6. Main explanation
7. Algorithm or mechanism, when applicable
8. Pseudocode, when applicable
9. Trade-offs and failure modes
10. Practical implications
11. Sources

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
  - static analysis
feeds_into:
  - "[[parent-note]]"
related:
  - "[[related-note]]"
---
```

Use one broad tag unless the user explicitly asks for more. For the static
analysis cluster, the only tag is:

```yaml
tags:
  - static analysis
```

Do not create a tag for every subtopic. Folder paths, titles, backlinks, and
body text already carry subtopic detail.

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
should cite the primary sources directly when possible.

## Tone

Write in a scientific, educational tone. Do not sell a tool. Do not frame a
private implementation as proof. Do not overclaim.

Good phrasing:

- "This algorithm over-approximates because..."
- "This claim depends on the following assumptions..."
- "This is useful when..."
- "This fails when..."
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

- `worklist` for iterative graph or data-flow algorithms;
- `reachable` for discovered procedures;
- `allocatedTypes` for RTA-style allocation filtering;
- `pointsTo[var]` for variable-to-object facts;
- `targets(callSite)` for dispatch resolution;
- `changed` or delta sets for fixed-point iteration.

After pseudocode, explain what each data structure means and what approximation
the algorithm is making.

## Practical Design Lens

Most insights should connect the idea back to engine or tool design:

- What facts must the engine compute?
- What must be cached or invalidated?
- What provenance should be shown to users?
- What would make diagnostics misleading?
- What benchmarks or fixtures would test this claim?
- What should a future article avoid overclaiming?

The best insight files are useful both as research notes and as design
documents.

