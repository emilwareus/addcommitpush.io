# Artifact Rules

Apply the rules for the artifact being edited.

## Blog Posts

Audience: senior engineers.

Keep:

- direct claims
- personal experience when it explains the claim
- concrete examples, commands, code, file paths, and source links
- skepticism and trade-offs

Change:

- generic intro paragraphs into a one-paragraph summary
- loose claims into claims with examples or caveats
- cute headings into descriptive headings
- long repeated lists into tables or tighter bullets

Do not over-polish. Emil's blog voice can be conversational, opinionated, and a
little rough. Clean the slop, not the person.

## Presentations

Follow the local assertion-evidence pattern.

Slide canvas:

- one sentence headline that states the claim
- one proof object: diagram, table, code contrast, metric, matrix, or architecture sketch
- fewer than 35 visible words when possible
- no decorative copy
- no fake hooks
- no emoji-based structure unless the existing deck already depends on it

Speaker notes:

- carry nuance, caveats, examples, and spoken transitions
- can sound more conversational
- should not become article paragraphs

## INSIGHTS

Make these scientific and auditable.

Required shape:

```markdown
## INSIGHT-001: Descriptive name

- Claim:
- Mechanism:
- Evidence:
- Confidence:
- Boundary conditions:
- Caveats / counterevidence:
- Implication:
- Follow-up:
```

Confidence language:

- `high`: multiple independent admitted sources, or one primary/benchmark source plus corroboration
- `medium`: one strong source or several weaker consistent sources
- `low`: partial evidence, unresolved contradiction, weak source quality, or inferred mechanism

INSIGHTS must not read like key takeaways. A takeaway summarizes; an insight
connects evidence to a mechanism and an implication.

## Deep Research Reports

Preserve:

- `[S#]` source markers
- source register entries
- claim-verification sections
- evaluator scores
- caveats and rejected evidence

Improve:

- headings
- executive summary density
- repeated bullet shapes
- inflated source claims
- unsupported "state of the art" language

Do not delete trace sections just because they are verbose. They are part of the
research audit trail.

## README / Technical Docs

Prefer:

- exact commands
- expected outputs
- file paths
- failure modes
- short rationale

Avoid:

- "easy", "simple", "seamless" unless the doc proves it
- general praise for the tool
- preambles before commands

## Pitches

Pitches can be more energetic than INSIGHTS, but still need concrete claims.

Keep:

- plain language
- a real audience problem
- a mechanism for how the thing works
- a specific demo or proof object

Cut:

- "powerful", "transform", "unlock", "revolutionary"
- audience flattery
- broad market claims without numbers
