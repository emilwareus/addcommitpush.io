# Writing Voice-Agent Insights

These files are research notes, not blog posts. An insight is the long-form evidence
trace behind a later article, talk section, or slide. Optimize for correctness,
traceability, and depth. Do not optimize for a polished reader journey.

The reader should be able to reopen one `INSIGHT_XX_*.md` file and understand exactly how
we got from sources to conclusion.

## What An Insight Must Do

Every insight should answer:

- What question are we trying to resolve?
- Which papers, docs, articles, and local notes were checked?
- What did each source actually measure or claim?
- Which numbers were copied, with units and benchmark context?
- Which conclusions are directly supported by the source?
- Which conclusions are inference?
- What does the evidence not prove?
- What tables, diagrams, or plots should later become blog or presentation visuals?

Do not write a short summary. Write the research trail.

## Research Process

1. Start with the problem, not the desired conclusion.
   Example: "How should a voice agent decide when the user is done speaking?" is better
   than "semantic VAD is better."

2. Gather primary sources first.
   Prefer papers, official docs, model cards, standards, and benchmark reports. Use
   practitioner posts and vendor launch posts as signals, not as final proof.

3. Save or reference local copies.
   Use the existing folders:
   - `../paper-text/` for extracted paper text.
   - `../articles/` for downloaded docs and web pages.
   - `../data/` for CSV tables used by plots or comparisons.
   - `../references.md` for the source index.

4. Read the methods before copying the numbers.
   Benchmark numbers without setup are dangerous. Capture hardware, dataset, batch size,
   model variant, inference mode, streaming mode, and whether the source is measuring
   latency, throughput, quality, or a proxy.

5. Copy the smallest useful data table.
   Preserve exact values and units. If a table is too large, copy the rows needed for the
   argument and say it is a subset.

6. Separate source facts from inference.
   Use phrases like "The paper reports...", "The docs define...", and "Inference: ..."
   Do not blur measured facts with your interpretation.

7. Validate the final claim against every source.
   Before finishing, reopen the original local source files and check that all numbers,
   units, and labels still match.

## Source Hierarchy

Use this trust order:

1. Primary research papers with methods and tables.
2. Official documentation, model cards, standards, and API references.
3. Reproducible benchmark reports with clear hardware and dataset setup.
4. Local experiments or local implementation notes with reproducible commands.
5. Practitioner articles and engineering blogs.
6. Vendor marketing, launch posts, and undocumented claims.

Lower-trust sources are still useful. Label them correctly:

- `paper evidence`
- `official-doc evidence`
- `benchmark evidence`
- `local measurement`
- `practitioner signal`
- `vendor claim`

Never make a vendor claim sound like an independent benchmark.

## Source Map

Every insight should include a source map near the top.

```md
## Source Map

| Ref      | Source                        | Local path                                       | Role                               |
| -------- | ----------------------------- | ------------------------------------------------ | ---------------------------------- |
| R-VA-003 | Moonshine v2                  | `../paper-text/moonshine-v2-2602.12241.txt`      | Live ASR response-latency numbers. |
| R-VA-007 | OpenAI Realtime API reference | `../articles/openai-realtime-api-reference.html` | Turn-detection knobs and defaults. |
```

Rules:

- Use stable reference IDs from `../references.md` when they exist.
- Add missing sources to `../references.md` before relying on them heavily.
- Include local path and external URL when possible.
- Include the source role so later readers know why the source matters.

## Validation Rules

Before an insight is considered good:

- Reopen every source that contributes a number.
- Check the exact model name, version, dataset, and hardware.
- Check whether the number is a mean, median, p90, p95, p99, max, RTF, RTFx, TTFA,
  TTFT, WER, CER, MOS, UTMOS, accuracy, ROC-AUC, or another metric.
- Check directionality. For example, lower WER is better, higher RTFx is faster, lower
  RTF is faster, lower latency is faster.
- Do not compare two numbers unless the measurement context is compatible.
- If contexts differ, say so in the table or paragraph.
- Keep a "Non-Claims" section for tempting conclusions the evidence does not support.

Common validation failures:

- Mixing throughput and latency.
- Mixing batch ASR benchmarks with streaming turn-taking behavior.
- Mixing local laptop measurements with H200/A100 serving numbers.
- Treating LibriSpeech clean WER as a noisy production-call metric.
- Treating VAD frame accuracy as end-of-turn quality.
- Copying a vendor p95 claim without labeling it as a vendor claim.

## Data And Tables

Tables are not decoration. They are the evidence.

Table rules:

- Include units in the column header or cell.
- Include benchmark context in the surrounding paragraph.
- Prefer within-paper comparisons over cross-paper leaderboards.
- If cross-paper comparison is necessary, add a caveat column.
- Do not normalize or transform data unless you show the formula.
- Keep copied source values separate from inferred values.

Good table columns:

- `Model`
- `Dataset`
- `Metric`
- `Value`
- `Unit`
- `Hardware`
- `Source`
- `Caveat`

If the table feeds a future plot, also update or create a CSV under `../data/`.

## Graphs And Diagrams

Use Mermaid diagrams and chart sketches when they clarify the reasoning.

Good graph uses:

- Architecture waterfalls.
- Latency budgets.
- Turn-taking state machines.
- Benchmark tradeoff surfaces.
- Data-flow between VAD, STT, LLM, TTS, transport, and playback.

Rules:

- Every graph should have an evidence table nearby.
- Do not use a graph to hide weak sourcing.
- If a chart is inferred from copied data, list the copied data first.
- If the graph is conceptual, label it as conceptual.

## Attribution

Attribution must be specific enough that a future writer can verify the claim quickly.

Use:

- Reference ID.
- Source title.
- Local file path.
- External URL.
- Table, section, or quoted setting name when available.

Example:

```md
The Moonshine v2 paper defines response latency as the time between VAD detecting the end
of speech and transcript return. Table 2 reports `50 ms`, `148 ms`, and `258 ms` for
Moonshine v2 Tiny, Small, and Medium on an Apple MacBook M3. Source: R-VA-003,
`../paper-text/moonshine-v2-2602.12241.txt`.
```

Direct quotes:

- Use direct quotes rarely.
- Keep quotes short.
- Prefer paraphrase plus exact source location.
- Do not quote long passages from articles or papers.

## Required Structure

Use this shape unless the topic clearly needs another one:

1. `# Insight Title`
2. Opening thesis and scope.
3. `## Source Map`
4. Research discussion by source or sub-question.
5. Copied tables with units and caveats.
6. Mermaid diagrams or chart sketches where useful.
7. Explicit inference section.
8. Implementation implications.
9. `## Non-Claims`
10. `## Blog/Presentation Visual Candidates`
11. `## References`

The "Non-Claims" section is required. It is how we prevent over-selling the evidence.

## Tone

Write like a serious research notebook:

- skeptical;
- precise;
- long-form when needed;
- clear about uncertainty;
- rich in tables and data;
- explicit about source quality;
- useful for later compression into a blog post.

Do not write marketing copy. Do not force a clean narrative if the evidence is messy.

## Done Checklist

Before stopping:

- The source map is complete.
- Every hard number has a source.
- Every table has units.
- Every vendor claim is labeled.
- Every inference is marked as inference.
- Non-claims are listed.
- External URLs and local paths are present.
- Plot-ready data is in `../data/` when a graph is likely.
- The insight is long enough to teach the subject, not just name the conclusion.
