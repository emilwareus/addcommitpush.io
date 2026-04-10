---
phase: 02-source-registry-evidence-capture
plan: 01
subsystem: source-contract
tags: [researcher, sources, schema, ajv, validation]
requires: []
provides:
  - enriched Phase 2 `sources.json` contract
  - enforced URI/date-time validation with `ajv-formats`
  - shared `data/` capture-ref guardrails and bucket constants
affects: [02-02, 02-03, researcher]
tech-stack:
  added: [ajv-formats]
  patterns:
    - schema-first source registry evolution
    - shared root-relative capture-ref normalization
    - append-ready capture metadata contract
key-files:
  created:
    - .planning/phases/02-source-registry-evidence-capture/02-01-SUMMARY.md
  modified:
    - package.json
    - pnpm-lock.yaml
    - researcher/CONTRACTS.md
    - researcher/schemas/sources.schema.json
    - internal/tools/researcher/contracts/sources.ts
    - internal/tools/researcher/contracts/validators.ts
    - internal/tools/researcher/contracts/workspace.ts
    - internal/tools/researcher/fs/workspace-paths.ts
    - internal/tools/researcher/__tests__/contracts.spec.ts
    - internal/tools/researcher/__tests__/resume.spec.ts
key-decisions:
  - "Split source workflow state (`status`) from freshness and review side states (`side_states`)."
  - "Keep `sources.json` as the single public registry while storing evidence as root-relative `data/...` refs."
  - "Enforce URI/date-time formats at the validator boundary instead of treating schema `format` as documentation."
patterns-established:
  - "Phase 2 source records carry canonical locators, origin metadata, append-only capture history, and downstream linkage placeholders."
  - "Capture refs are normalized through one shared helper before any later add or refresh writer trusts them."
requirements-completed: [SRC-01, SRC-02]
duration: 15min
completed: 2026-04-11
---

# Phase 02 Plan 01: Source Registry Contract Summary

**Locked the enriched Phase 2 `sources.json` contract, enforced schema formats, and froze `data/` capture path guardrails for later add and refresh flows.**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-04-11T08:53:00Z
- **Files modified:** 10

## Accomplishments

- Replaced the minimal Phase 1 source record with a Phase 2 contract that includes `canonical_url`, `origin`, `confidence`, workflow `status`, `side_states`, lifecycle timestamps, `latest_capture_path`, and append-only `captures`.
- Added `ajv-formats` so `uri` and `date-time` schema fields now fail invalid payloads at the shared validator boundary.
- Added explicit `DATA_SNAPSHOTS`, `DATA_EXPORTS`, `DATA_TRANSCRIPTS`, and `DATA_DATASETS` constants plus a shared `normalizeDataCaptureRef()` helper to keep future evidence paths inside `data/`.
- Updated the contract tests and resume fixture to prove the richer schema round-trips through existing Phase 1 init/resume flows.

## Verification

- `pnpm install`
- `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/resume.spec.ts internal/tools/researcher/__tests__/init.spec.ts`
- `pnpm typecheck`
- `pnpm lint`

## Notes

- `pnpm lint` completed with two pre-existing warnings outside the Researcher surface:
  - `components/presentations/deep-research/slides/02-group-project.tsx`
  - `components/presentations/voice-agents/jarvis/jarvis-sidebar.tsx`

## Next Readiness

- Plan `02-02` can now build source add/upsert on top of a stable typed registry and real validator boundary.
- Plan `02-03` can reuse the frozen bucket constants and capture-ref guard instead of inventing path logic locally.
