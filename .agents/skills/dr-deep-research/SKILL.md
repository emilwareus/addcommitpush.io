---
name: dr-deep-research
description: Use when an agent should use the local dr deep research CLI to research one topic, orchestrate many reports over a broad subject, compare report sets, or derive structured INSIGHTS from dr Markdown outputs.
---

# dr Deep Research

Use this skill when research needs more than a quick web lookup. The coding
agent is the orchestrator: it decomposes the subject, schedules `dr` report jobs,
tracks gaps, reads the outputs, and promotes only well-supported findings into
structured INSIGHTS.

## Preflight

1. From the repository root, verify the command exists:

   ```bash
   dr --help
   ```

2. If `dr` is not installed, install it:

   ```bash
   make install-dr
   ```

3. Use the repo-local key file unless the environment already has the required
   keys:

   ```bash
   --env-file go-research/.env
   ```

4. Put generated Markdown reports under `brain/inbox/dr/` so they are readable
   and committed. `.context/dr/` may be used as temporary scratch space, but it
   is not the archival location.
5. Never delete historical `brain/inbox/dr/**` reports. If a report is weak,
   outdated, superseded, or wrong, keep it and add a newer report or correction
   note.

## Single Report

Use one focused report when the question is narrow enough to answer directly.

```bash
mkdir -p brain/inbox/dr/nextjs-16-migration
dr research "What should an agent know before migrating a Next.js app to v16?" \
  --env-file go-research/.env \
  --effort standard \
  --output brain/inbox/dr/nextjs-16-migration/report.md
```

Use `--effort deep` or `--effort max` when the answer must be more exhaustive.
Use `--strategy deep-agent-v1` explicitly only when clarity matters; it is the
default strategy.

## Structural Subject Research

For a broad subject, do not ask for one giant report first. Orchestrate a
research program.

1. Define the subject boundary and success criteria.
2. Build a subject map with 6-12 lanes:
   - definitions and taxonomy
   - current state of the art
   - leading open-source projects
   - benchmarks and evaluation methods
   - architecture patterns
   - implementation constraints
   - limits, risks, and caveats
   - economics, latency, and operational constraints
   - adoption signals and production examples
   - contradictions or disputed claims
3. Turn each lane into 1-5 specific research questions.
4. Run `dr` once per question. A serious subject can produce tens of reports.
5. Read the report set, identify gaps, and launch follow-up reports.
6. Only then write the synthesis and INSIGHTS.

The orchestrator owns this loop. `dr` is the deep-research worker; the calling
agent decides what to research next based on the evidence already gathered.

## Parallel Report Runs

Brave free plans are rate-limited. Default to one concurrent report unless the
user confirms their Brave plan can handle more. Use `DR_PARALLELISM=2` or `3`
only for paid plans or when the task is worth the API pressure.

```bash
mkdir -p brain/inbox/dr/research-program

topics=(
  "Deep research agent benchmarks in 2026"
  "Open source deep research systems and architecture patterns"
  "Citation verification methods for autonomous research reports"
  "Best practices for deriving structured insights from evidence reports"
)

parallelism="${DR_PARALLELISM:-1}"

for index in "${!topics[@]}"; do
  while [ "$(jobs -pr | wc -l | tr -d ' ')" -ge "$parallelism" ]; do
    sleep 1
  done

  slug="$(printf '%s' "${topics[$index]}" \
    | tr '[:upper:]' '[:lower:]' \
    | tr -cs '[:alnum:]' '-' \
    | sed 's/^-//; s/-$//')"

  dr research "${topics[$index]}" \
    --env-file go-research/.env \
    --effort deep \
    --output "brain/inbox/dr/research-program/${index}-${slug}.md" &
done

wait
```

For a paid Brave plan, keep report-level parallelism modest and tune search
inside each report deliberately:

```bash
DR_PARALLELISM=3
dr research "..." \
  --env-file go-research/.env \
  --effort deep \
  --search-concurrency 2 \
  --search-delay-ms 0 \
  --output brain/inbox/dr/topic/report.md
```

## Gap Loop

After the first wave, inspect each report's:

- `## Source Register`
- `### Source Quality`
- `### Evidence Notes`
- `### Claim Verification`
- `### Final Evaluation`

Treat reports with `overall <= 2/5` or `coverage <= 2/5` as leads, not
authority. Write a short gap list, then launch targeted follow-up reports for
missing primary sources, contradictory findings, weak benchmarks, or uncited
claims.

## Deriving INSIGHTS

An INSIGHT is not a summary. It is a decision-useful conclusion that connects
evidence to an implication, action, or design constraint.

Promote a finding only when it satisfies all of these:

- It is supported by admitted sources in one or more `dr` reports.
- The relevant report has acceptable final evaluation scores.
- The claim verification section does not reject the claim or its citations.
- The implication is explicit: why this changes what the user should believe,
  build, choose, avoid, or investigate next.

Use this output structure:

```markdown
# INSIGHTS

## Executive Synthesis

One to three paragraphs summarizing the evidence-backed picture.

## Insight Index

| ID          | Insight | Confidence | Evidence                         | Implication | Action |
| ----------- | ------- | ---------- | -------------------------------- | ----------- | ------ |
| INSIGHT-001 | ...     | High       | report.md [S3], report-2.md [S1] | ...         | ...    |

## INSIGHT-001: Short Name

- Statement:
- Why it matters:
- Evidence:
- Confidence: high | medium | low
- Caveats / contradictions:
- Implication:
- Recommended action:
- Follow-up research:
```

Confidence rules:

- `high`: multiple admitted primary or benchmark sources, or one strong primary
  source plus independent corroboration, from reports with overall score `4/5`
  or better.
- `medium`: one strong admitted source or multiple weaker but consistent
  sources, from reports with overall score `3/5` or better.
- `low`: partial evidence, unresolved contradictions, weak sources, or reports
  with overall score `2/5` or lower.

## Cross-Report Synthesis

Before writing INSIGHTS for a broad subject, build a synthesis matrix:

```markdown
| Report                          | Lane       | Strongest verified claims | Source quality | Gaps | Follow-up |
| ------------------------------- | ---------- | ------------------------- | -------------- | ---- | --------- |
| brain/inbox/dr/00-benchmarks.md | Benchmarks | ...                       | ...            | ...  | ...       |
```

Then cluster:

- repeated claims across reports
- contradictions between reports
- benchmark-backed claims
- primary-source-backed claims
- design decisions implied by the evidence
- unresolved questions that need another `dr` run

Keep citations as report path plus source IDs, for example
`brain/inbox/dr/00-benchmarks.md [S4]`. Do not cite a source ID if the report
did not admit it.

## Final Orchestrator Checklist

- The subject map covers the user question's major dimensions.
- There are enough reports to support the breadth of the final synthesis.
- Weak reports have been followed by narrower gap reports.
- INSIGHTS distinguish evidence, confidence, caveats, implications, and actions.
- The reports are saved in `brain/inbox/dr/` and included in the commit.
- The final answer tells the user where the reports and INSIGHTS file are saved.
