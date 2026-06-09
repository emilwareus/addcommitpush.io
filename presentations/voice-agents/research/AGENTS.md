# Voice Agent Insight Writing Rules

These files are research notes, not blog posts and not slide scripts. They are meant to
preserve the reasoning trail behind a future article or presentation on real-time voice
agents.

## Purpose

Each insight should make it possible to answer:

- Which papers, docs, code, and vendor claims support the point?
- What did the sources actually measure?
- Which numbers can be copied into a chart?
- Which numbers should not be compared directly?
- What is the engineering inference for building a voice agent?
- What would need to be re-checked before publishing?

## Required Shape

Use this structure unless the note has a better source-driven shape:

1. Opening thesis in plain language.
2. Source map table with reference IDs, source titles, local paths, and role.
3. Long-form discussion across multiple sources.
4. Copied numeric tables with units and benchmark context.
5. Mermaid chart sketches or system diagrams where useful.
6. Explicit inference section for engineering decisions.
7. Explicit non-claims section.
8. Visual candidates for the blog or deck.
9. References with local paths.

## Data Rules

- Copy numbers from local extracted paper text, local archived docs, or local deck files.
- Include units: ms, seconds, percent, WER, CER, RTF, RTFx, parameter count, Hz, kbps.
- Do not combine unrelated benchmark scores into one universal leaderboard.
- Prefer within-paper comparisons over cross-paper comparisons.
- Mark vendor benchmark claims as vendor claims.
- Mark practitioner/blog claims as practitioner signal.
- Link plot-ready CSVs under `research/data/` when a table is chartable.

## Citation Rules

- Use reference IDs from `../references.md`.
- Include local file paths, such as `paper-text/moonshine-v2-2602.12241.txt`.
- Direct quotes should be short and rare. Prefer paraphrase with exact source trace.
- If a claim is an inference, say it is an inference.

## Tone

Write like a research notebook for a technical author:

- detailed;
- skeptical;
- precise;
- source-backed;
- willing to say "this does not prove X";
- useful for later compression into a blog post or talk.

Do not optimize these notes for polished readability. Optimize them for correctness,
depth, and traceability.
