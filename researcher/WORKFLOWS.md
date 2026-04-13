# Workflows

## Command Set

The system should feel like GSD: a small command surface that routes into a strong workflow
layer.

Suggested commands:

### `/research-new <topic>`

Creates a new research folder and `brief.md`.

Outputs:

- `brief.md`
- `manifest.json`
- `sources.json`
- required subfolders

### `/research-explore <topic>`

GSD-style Socratic intake for shaping a vague topic into:

- a research question
- a scope boundary
- an evidence plan
- a first report target

This should ask one question at a time, not dump a questionnaire.

Recommended modes:

- normal discussion mode
- assumptions mode: read current sources and drafts first, then ask only corrective questions
- text mode: numbered choices for remote or low-interaction sessions

### `/research-harvest <research> [query]`

Searches the web, proposes sources, and updates `sources.json`.

Outputs:

- new `SRC-*` entries
- optional raw captures in `data/`

### `/research-insight <research>`

Promotes harvested material into atomic insight files.

Outputs:

- one or more `INS-*.md` files

### `/research-analyze <research> [angle]`

Builds higher-order analysis from a chosen insight subset.

Outputs:

- `ANL-*.md`
- notebooks or data products when useful

### `/research-report <research> [angle]`

Compiles a report from insights and analysis already present.

Outputs:

- one `RPT-*.md` report

### `/research-refresh <research>`

Re-checks selected sources and marks affected insights/reports as stale or refreshed.

### `/research-status <research>`

Shows:

- unanswered questions
- stale sources
- uncovered angles
- reports already produced
- verification debt

This should behave like a progress router, not a static dashboard.

## Workflow Stages

### 1. Intake

Goal:

- decide what the research is actually about
- define boundaries
- define what success looks like

Artifacts:

- `brief.md`
- initial `manifest.json`

### 2. Harvest

Goal:

- gather sources broadly enough to avoid thesis lock-in
- classify and deduplicate them

Artifacts:

- updated `sources.json`
- raw evidence in `data/`

### 3. Extract

Goal:

- turn sources into reusable claims

Artifacts:

- `INS-*.md`

### 4. Synthesize

Goal:

- group insights into arguments, timelines, maps, and comparisons

Artifacts:

- `ANL-*.md`
- notebooks

### 5. Package

Goal:

- produce one specific report for one audience and angle

Artifacts:

- `RPT-*.md`

### 6. Refresh

Goal:

- keep a long-lived research alive without rebuilding from scratch

Artifacts:

- updated source metadata
- stale flags on dependent insights/reports

## Interaction Model

### Ask one question at a time

Copy GSD's exploration discipline. Intake should feel conversational and focused.

### Use checkpoints, not giant confirmations

Useful checkpoints:

- source set approved
- insight promotion approved
- analysis direction approved
- report angle approved
- contradiction review approved

### Prefer bounded subagents

Examples:

- one scout per query cluster
- one source auditor per source batch
- one analysis agent per angle
- one report writer per audience

When resuming after a checkpoint, prefer a fresh continuation worker instead of resuming a
bloated old thread.

### Keep orchestrators lean

The orchestrator should not summarize twenty articles inline. It should route paths and IDs.

## Quality Gates

### Source Gate

- source type recorded
- accessed date recorded
- credibility assessed
- duplicate check complete

### Insight Gate

- at least one linked source
- confidence assigned
- caveats stated
- duplicate claim check complete

### Analysis Gate

- linked insight set declared
- contradictions surfaced
- unanswered questions listed

### Report Gate

- thesis explicit
- evidence chain explicit
- insight IDs listed
- freshness date declared

## Verification Debt

Like GSD's execution and verification debt, Researcher should track unresolved quality issues:

- stale sources
- unreviewed insights
- contradictory analysis
- reports generated from stale inputs

Debt should be visible in `manifest.json` and surfaced by `/research-status`.

## Continuous Research

Research should remain open to extension.

A mature workflow should support:

- adding sources weeks later
- adding a notebook without changing reports
- generating a new report angle from the same insight base
- refreshing one stale insight without rerunning the whole research
