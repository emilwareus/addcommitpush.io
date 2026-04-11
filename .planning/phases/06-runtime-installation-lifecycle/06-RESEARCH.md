# Phase 6: Runtime Installation & Lifecycle - Research

**Researched:** 2026-04-11
**Domain:** Runtime-neutral installation contracts, Codex and Claude Code adapter generation, and ownership-aware install/update/inspect flows for Researcher
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

- Phase 6 must make Researcher installable inside real Codex and Claude Code projects, not only usable from this repo.
- Project-local installation is the primary v1 path; global compatibility is secondary.
- Codex and Claude Code must share one runtime-neutral command set, exposed through native wrappers.
- Installed files must be installer-managed and ownership-aware so update and inspect stay deterministic.
- Runtime settings merges must be non-destructive, and hooks must remain opt-in where behavior changes are material.
- Install, update, and inspect must be explicit lifecycle flows rather than implicit reinstall behavior.
- Shared logic should remain centralized; runtime files should stay thin adapters over one source-of-truth payload.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INST-01 | User can install Researcher into a Codex project with required commands, skills, templates, and runtime assets. | Define a runtime asset catalog and a Codex adapter that renders managed `.codex/skills/research-*` entries from one shared command definition set. |
| INST-02 | User can install Researcher into a Claude Code project with required commands, skills, templates, and runtime assets. | Define the same command catalog once, then render Claude-native `.claude/commands/` assets plus minimal supporting settings and optional hooks. |
| INST-03 | User can update an existing Researcher installation without manually copying files. | Persist install ownership in a manifest, hash or version managed assets, and route updates through a deterministic diff-and-refresh flow. |
| INST-04 | User can inspect which runtime assets were installed and where they live. | Add a machine-readable install manifest and an inspect surface that reports runtime, asset paths, ownership, config merge state, and drift. |
</phase_requirements>

## Summary

Phase 6 should treat installation as a packaging layer over the already-complete Researcher core,
not as a new product architecture. The clean implementation is:

1. Freeze one runtime-neutral install contract and asset catalog first.
2. Build deterministic Codex and Claude adapters from that shared catalog.
3. Add ownership-aware install, update, and inspect flows over the generated assets.

The key design recommendation is to keep runtime assets generated from one shared definition
surface:

- Define one canonical command/asset catalog in shared TypeScript.
- Define one shared payload catalog that maps each installed runtime command to the concrete
  wrapper script, required core modules, required JSON schema assets, and template files it
  depends on.
- Build the installed payload as self-contained runtime artifacts so a clean target project does
  not need this repo's `tsx` or dependency graph.
- Render Codex skills and Claude commands from that catalog through thin adapter functions.
- Persist one install manifest per target project so update and inspect reason over managed assets
  instead of scanning heuristically.
- Merge existing Claude settings surgically and keep any hook mutation explicitly opt-in.

### `06-01` — Freeze runtime-neutral contracts, asset catalog, and ownership manifest
- Add one typed runtime-install contract that defines supported runtimes, shared command IDs,
  managed asset metadata, command-to-wrapper mapping, payload file inventory, optional settings
  merges, and install manifest shape.
- Encode ownership as durable file records with runtime, relative path, kind, digest/version, and
  generation source so update and inspect never guess.
- Keep the catalog independent from concrete `.codex/` and `.claude/` layouts so future runtimes
  can reuse it.

### `06-02` — Build Codex and Claude Code adapter renderers from the shared catalog
- Render Codex `.codex/skills/research-*/SKILL.md` trees from the shared command catalog instead
  of hand-authoring one file per runtime.
- Render Claude `.claude/commands/*.md` entries and any minimal companion assets from the same
  source catalog.
- Add adapter fixture tests that prove both runtimes expose the same conceptual command surface and
  preserve deterministic output.

### `06-03` — Implement install, update, and inspect lifecycle flows
- Build a self-contained installed runtime boundary before writing files into target projects.
- Implement install/update/inspect services in shared core code, then expose thin
  `scripts/research-install.ts`, `scripts/research-update.ts`, and `scripts/research-inspect.ts`
  wrappers.
- Install writes the runtime adapters plus the shared Researcher payload they depend on, including
  bundled runtime entrypoints, runtime-loaded schema files, templates, and any managed
  package-boundary metadata needed to keep execution deterministic; update refreshes only managed
  files and surfaces drift/conflicts; inspect returns a deterministic inventory summary.
- Merge Claude settings non-destructively and keep hook writes behind explicit flags.

## Recommended Stack

- Reuse the current TypeScript + thin-wrapper pattern already established in `scripts/research-*.ts`
  and `internal/tools/researcher/core/*`.
- Add a dedicated runtime core under `internal/tools/researcher/runtime/` for asset catalog,
  adapter rendering, manifest I/O, settings merge helpers, and lifecycle services.
- Build self-contained installed runtime entrypoints ahead of install instead of expecting the
  target project to provide `tsx` or this repo's package graph.
- Store install ownership as JSON under a Researcher-managed location inside the target project
  rather than in comments alone.
- Use string-template renderers and deterministic path helpers; do not add a templating engine or a
  second runtime-specific logic tree.

## Key Planning Takeaways

- `internal/tools/researcher/` is already the stable product core; Phase 6 should package it, not
  refactor its artifact model.
- The cloned GSD installer proves the right shape: runtime-specific directories, thin generated
  surfaces, and explicit ownership markers for managed config sections and hook state.
- Codex and Claude parity should be measured at the command-catalog level, not by hand-comparing
  two independently maintained runtime trees.
- The command catalog must freeze explicit mapping from conceptual runtime verbs to today's actual
  wrapper scripts (`research-init`, `research-source-add`, `research-source-refresh`,
  `research-insight`, `research-analysis`, `research-report`, `research-status`, `research-resume`)
  so installed runtime entries resolve to real executable payloads.
- Inspect and update should read the same install manifest that install writes; no fallback
  filesystem inference path should exist.
- This phase should stop at deterministic local installation. Marketplace packaging and richer
  runtime ecosystems remain follow-on work.
