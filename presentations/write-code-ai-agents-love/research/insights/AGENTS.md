# Insight Writing Rules

These files are research notes, not blog posts and not summaries. The reader is trying to
understand the underlying research well enough to form a defensible conclusion.

## Purpose

Each `INSIGHT_XX_*.md` file should preserve the trace from evidence to inference. The note should
make it possible to answer:

- What did the underlying papers actually measure?
- What data was copied from those papers?
- What can we infer from that data?
- What can we not infer?
- Which chart/table/graph should become a blog or presentation visual?
- Which source files should be reopened before publishing the claim?

## Required Shape

Use this structure unless there is a strong reason not to:

1. Opening thesis in plain language.
2. Source map table with reference IDs, titles, local text files, and each source's role.
3. Paper-by-paper discussion of methods, benchmark shape, and limitations.
4. Copied numeric tables from the papers, with units.
5. Mermaid chart sketches where a figure would help.
6. Explicit inference section: what this means for codebase structure.
7. Explicit non-claims section: what the evidence does not prove.
8. Blog visual candidates.
9. References with local file paths.

## Data Rules

- Copy the actual numbers from local extracted paper text or local articles.
- Include units: percent, percentage points, fraction, seconds, tokens, dollars, files, LOC, tests.
- Prefer within-paper deltas over cross-paper comparisons.
- Do not combine unrelated benchmark scores into one leaderboard.
- When directionality is subtle, say so and note that the original table must be reopened before
  publishing.
- Link to the plot-ready CSV if one exists under `research/data/`.

## Graph and Table Rules

- Use markdown tables for copied values and interpretation.
- Use Mermaid sketches for conceptual graphs or rough chart specs.
- A chart sketch should explain the intended visual argument, not just reproduce numbers.
- Tables should be readable without the blog narrative.

## Citation Rules

- Use reference IDs from `../references.md` plus local paths such as
  `paper-text/contextbench-2602.05892.txt`.
- Direct quotes must be short and rare. Prefer paraphrase plus exact local source trace.
- If a claim is an inference, label it as inference.
- If a claim comes from a practitioner article rather than a paper, mark it as practitioner signal.

## Tone

Write like a research notebook for a serious technical author:

- detailed;
- skeptical;
- precise;
- source-backed;
- willing to say "this does not prove X";
- useful for later compression into a blog post or talk slide.

Do not optimize these notes for polished readability. Optimize them for correctness, depth, and
traceability.
