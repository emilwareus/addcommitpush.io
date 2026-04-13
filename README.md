# addcommitpush.io

This repository contains two things:

- the `addcommitpush.io` Next.js site and blog
- `Researcher`, an installable local-first research system built in this repo

## Blog

The site is built with Next.js App Router, React, TypeScript, and Tailwind.

Useful commands:

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
```

Do not use `pnpm dev` from automation in this repo. Start the dev server manually when needed.

## Researcher

Researcher is a GSD-style operating system for durable research work. It turns:

- sources into tracked evidence
- evidence into reusable insights
- insights into analysis
- analysis into multiple Markdown reports

It ships as a project-local runtime for Codex and Claude Code.

### What it does

Researcher gives you:

- bounded research workspaces under `researcher/researches/<slug>/`
- a central `sources.json` registry
- durable `insights/`, `analysis/`, and `reports/` artifacts
- freshness and verification status via `research-status`
- install, update, and inspect lifecycle tooling for Codex and Claude

### Install into a project

Researcher is installed into another project from this repo.

Codex:

```bash
pnpm exec tsx scripts/research-install.ts \
  --source-project-root /absolute/path/to/addcommitpush.io \
  --target-project-root /absolute/path/to/target-project \
  --runtime codex
```

Claude Code:

```bash
pnpm exec tsx scripts/research-install.ts \
  --source-project-root /absolute/path/to/addcommitpush.io \
  --target-project-root /absolute/path/to/target-project \
  --runtime claude
```

That writes:

- `.researcher-runtime/` with the self-contained runtime payload
- `.codex/skills/research-*/SKILL.md` for Codex projects
- `.claude/commands/research-*.md` and `.claude/settings.local.json` for Claude projects

### Installed command surface

The installed runtime exposes these research commands:

- `research-new`
- `research-harvest`
- `research-refresh`
- `research-insight`
- `research-analyze`
- `research-report`
- `research-status`
- `research-resume`

Lifecycle commands also exist as source-side scripts:

- `scripts/research-install.ts`
- `scripts/research-update.ts`
- `scripts/research-inspect.ts`

### First run

After install, create a research workspace:

```bash
node .researcher-runtime/bin/research-new.js \
  --project-root /absolute/path/to/target-project \
  --slug ai-agents-market-map \
  --title "AI Agents Market Map" \
  --question "Which agent products are differentiated by durable research workflows?" \
  --audience "product and engineering leaders" \
  --tag agents \
  --tag research
```

That creates:

```text
researcher/researches/ai-agents-market-map/
├── manifest.json
├── sources.json
├── brief.md
├── data/
├── insights/
├── analysis/
└── reports/
```

### Core workflow

1. Add sources:

```bash
node .researcher-runtime/bin/research-harvest.js \
  --project-root /absolute/path/to/target-project \
  --slug ai-agents-market-map \
  --kind web \
  --title "Example source" \
  --url "https://example.com"
```

2. Promote insights from evidence:

```bash
node .researcher-runtime/bin/research-insight.js --help
```

3. Build analysis:

```bash
node .researcher-runtime/bin/research-analyze.js --help
```

4. Generate reports:

```bash
node .researcher-runtime/bin/research-report.js --help
```

5. Check status:

```bash
node .researcher-runtime/bin/research-status.js \
  --project-root /absolute/path/to/target-project \
  --slug ai-agents-market-map
```

Note: the current CLI wrappers are JSON-oriented and strict. If you pass the wrong flags, they
fail fast instead of falling back.

### Update an installed runtime

```bash
pnpm exec tsx scripts/research-update.ts \
  --source-project-root /absolute/path/to/addcommitpush.io \
  --target-project-root /absolute/path/to/target-project \
  --runtime codex
```

If a managed file has been locally edited, update returns `blocked` instead of overwriting it.

### Inspect an installed runtime

From this repo:

```bash
pnpm exec tsx scripts/research-inspect.ts \
  --target-project-root /absolute/path/to/target-project
```

Or directly from the installed runtime:

```bash
node .researcher-runtime/bin/research-inspect.js \
  --target-project-root /absolute/path/to/target-project
```

Inspect reports:

- install status
- managed asset inventory
- missing or drifted managed files
- Claude settings merge state when applicable
- next recommended lifecycle action

### Where to look next

- [.planning/PROJECT.md](/Users/emilwareus/Development/addcommitpush.io/.planning/PROJECT.md): current product state
- [.planning/MILESTONES.md](/Users/emilwareus/Development/addcommitpush.io/.planning/MILESTONES.md): shipped milestone history
- [.planning/milestones/v1.0-ROADMAP.md](/Users/emilwareus/Development/addcommitpush.io/.planning/milestones/v1.0-ROADMAP.md): full v1.0 build history

### Current limitation

The install and runtime lifecycle are real and tested, but the end-user authoring docs are still
young. This README is now the canonical starting point.
