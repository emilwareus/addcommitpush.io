---
phase: 02-source-registry-evidence-capture
plan: 02
subsystem: source-add
tags: [researcher, sources, cli, dedupe, manifest]
requires: [02-01]
provides:
  - canonical source add/upsert core
  - manifest/source synchronization helpers
  - thin `research-source-add` CLI
affects: [02-03, researcher]
tech-stack:
  added: []
  patterns:
    - canonical URL dedupe before ID allocation
    - shared manifest/source persistence boundary
    - deterministic JSON-only CLI results
key-files:
  created:
    - internal/tools/researcher/core/sources/store.ts
    - internal/tools/researcher/core/sources/normalize.ts
    - internal/tools/researcher/core/sources/add.ts
    - internal/tools/researcher/__tests__/source-add.spec.ts
    - scripts/research-source-add.ts
    - .planning/phases/02-source-registry-evidence-capture/02-02-SUMMARY.md
key-decisions:
  - "Normalize one canonical locator per add request and dedupe on `canonical_url` before touching `manifest.next_ids.source`."
  - "Keep both `manifest.json` and `sources.json` behind one shared load/validate/persist boundary instead of mutating them directly from scripts."
  - "Treat source add and duplicate update as the same core operation with different return metadata."
patterns-established:
  - "Thin runtime entrypoints parse argv, call the shared core, and print deterministic JSON only."
  - "Manifest freshness sync and stale debt recomputation happen whenever source registry state changes."
requirements-completed: [SRC-01, SRC-02]
duration: 12min
completed: 2026-04-11
---

# Phase 02 Plan 02: Source Add Flow Summary

**Implemented the canonical source add/upsert path, synchronized manifest counters and freshness metadata, and exposed a thin JSON-only `research-source-add` CLI.**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-04-11T08:56:30Z
- **Files modified:** 6

## Accomplishments

- Added a shared source store that loads, validates, and persists `manifest.json` plus `sources.json` together, including workspace identity checks.
- Implemented conservative canonical URL normalization and duplicate-safe source add/upsert behavior on top of the Phase 2 contract.
- Added `research-source-add.ts` with repo-standard flag parsing and deterministic JSON output.
- Added `source-add.spec.ts` covering create, duplicate update, invalid URL failure, identity mismatch failure, and CLI smoke behavior.

## Verification

- `pnpm exec vitest run internal/tools/researcher/__tests__/source-add.spec.ts`
- `pnpm typecheck`
- `pnpm lint`

## Notes

- `pnpm lint` completed with the same two pre-existing warnings outside the Researcher surface:
  - `components/presentations/deep-research/slides/02-group-project.tsx`
  - `components/presentations/voice-agents/jarvis/jarvis-sidebar.tsx`

## Next Readiness

- Plan `02-03` can now build capture storage and refresh logic on top of the new shared source store instead of opening files directly.
- Refresh can reuse canonical URL lookup, manifest freshness sync, and the deterministic CLI pattern already established here.
