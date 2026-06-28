---
name: emil-deslop
description: Use when editing repo prose to remove AI slop, make text sound like Emil, tighten technical blog posts, clean presentation copy, or make INSIGHTS more scientific and evidence-grounded.
---

# Emil Deslop

Use this skill for prose, not code formatting. The goal is not to "humanize" text
with quirks. The goal is to remove generic AI texture while preserving claims,
evidence, citations, and useful personality.

## Core Workflow

1. Identify the artifact type: blog post, presentation, pitch, `dr` report,
   INSIGHTS file, README, or speaker notes.
2. Preserve source-backed meaning. Do not invent evidence, soften caveats, or
   delete citations to make text smoother.
3. Run the slop scan in [patterns.md](references/patterns.md).
4. Apply the artifact-specific rules in [artifact-rules.md](references/artifact-rules.md).
5. Return the edited text and, when useful, a short note about what changed.

## Emil Voice

Default tone: direct, technical, skeptical, and practical.

Use:

- concrete mechanisms over abstract importance
- specific numbers, source names, dates, APIs, files, or examples when available
- first person when the claim is experiential: "I learned", "I would", "IMO"
- short paragraphs with one job each
- active voice and plain verbs
- trade-offs, caveats, and failure modes

Avoid:

- corporate gloss
- generic confidence
- motivational endings
- fake neutrality when the evidence supports a position
- fake authority when the evidence is weak
- polished sameness that removes the author's edge

Good local voice examples:

- "More context is not automatically better. The agent needs the right slice."
- "The end goal is autonomy: agents research, plan, implement, and review; humans decide what should ship."
- "If the repo has no map, no clear boundaries, and no obvious product language, the agent starts navigating by vibes."

## Rewrite Moves

Prefer these changes:

- cut stage directions: "In this article..." becomes the actual claim
- replace intensifiers with evidence: "significant" becomes a number or mechanism
- turn vague nouns into concrete objects: "context" becomes "AGENTS.md, architecture docs, source files, test output"
- split compound AI sentences into two direct sentences
- make headings descriptive, not dramatic
- vary repeated section shapes
- keep useful roughness when it carries voice

## INSIGHTS Mode

INSIGHTS should be more scientific than blog prose. Do not make them punchy,
sales-like, or motivational.

Each insight must state:

- claim
- mechanism
- evidence
- confidence
- boundary conditions
- caveats or counterevidence
- implication
- next test or follow-up research

Use scientific language:

- "The evidence supports..."
- "This appears bounded to..."
- "A competing explanation is..."
- "The report set does not establish..."
- "Confidence is medium because..."

Do not use:

- "This unlocks..."
- "This is a game changer..."
- "The key takeaway is obvious..."
- "Clearly..."
- "This proves..." unless the evidence really proves causality

## Self-Check

Before returning edited text:

- no em dashes
- no AI citation artifacts such as `turn0search0`, `oaicite`, or `contentReference`
- no unsupported numbers
- no dramatic headings
- no repeated "It is not X, it is Y" rhythm unless the contrast earns its keep
- every claim either has evidence, a caveat, or is framed as opinion
- INSIGHTS separate claim, evidence, confidence, caveat, and implication
