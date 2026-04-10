---
phase: 01-research-workspace-bootstrap
plan: 03
subsystem: infra
tags: [researcher, filesystem, vitest, tsx, cli]
requires:
  - phase: 01-01
    provides: Vitest harness and repo-level typecheck verification
  - phase: 01-02
    provides: Manifest and sources validators plus root-confined workspace path guards
provides:
  - Deterministic new-research initialization under researcher/researches/<slug>
  - Atomic manifest.json and sources.json seeding through shared contracts
  - Thin runtime-neutral research-init CLI outputting machine-readable JSON
affects: [01-04, source-registry, runtime-adapters]
tech-stack:
  added: []
  patterns: [atomic JSON writes, runtime-neutral init core, template-seeded research briefs]
key-files:
  created:
    - internal/tools/researcher/core/id.ts
    - internal/tools/researcher/core/init.ts
    - internal/tools/researcher/core/workspace-seed.ts
    - internal/tools/researcher/fs/write-json-atomically.ts
    - scripts/research-init.ts
  modified:
    - internal/tools/researcher/__tests__/init.spec.ts
    - internal/tools/researcher/fs/workspace-paths.ts
key-decisions:
  - "Keep initialization in one shared core service and expose runtime entrypoints as thin argv parsers only."
  - "Validate the seeded manifest and empty sources envelope before any write so new workspaces start schema-valid."
  - "Extend the existing path helper with absolute workspace paths instead of rebuilding filesystem layout logic inside init."
patterns-established:
  - "Seed-then-validate contract flow: build manifest and sources through shared helpers, validate, then write atomically."
  - "Bounded workspace bootstrap: every research root is derived from researcher/researches/<slug> and hard-fails on unsafe or existing targets."
requirements-completed: [RSCH-01]
duration: 3 min
completed: 2026-04-10
---

# Phase 01 Plan 03: Deterministic Init Summary

**Deterministic research workspace initialization with atomic JSON seeding, stable research IDs, and a thin CLI for bounded `researcher/researches/<slug>` creation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-10T14:40:52Z
- **Completed:** 2026-04-10T14:43:35Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Replaced the Wave 0 init placeholder spec with active temp-dir integration coverage for layout creation, manifest seeds, empty `sources.json`, and hard-fail overwrite/traversal cases.
- Added the shared init core, ID helper, workspace seeder, and atomic JSON writer needed to create one schema-valid research workspace in a single deterministic operation.
- Added `scripts/research-init.ts` as a runtime-neutral CLI that delegates directly to the core and prints the created research ID and workspace path as JSON.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement atomic workspace seeding and the core init flow against the existing init spec** - `f19bcee` (test)
2. **Task 1: Implement atomic workspace seeding and the core init flow against the existing init spec** - `eb8f78e` (feat)
3. **Task 2: Add the thin `research-init` CLI entrypoint** - `ced4320` (feat)

## Files Created/Modified

- `internal/tools/researcher/__tests__/init.spec.ts` - Integration spec covering the fixed layout, seeded manifest fields, empty source envelope, and write-prevention on unsafe input.
- `internal/tools/researcher/core/id.ts` - Deterministic wrapper for research ID generation.
- `internal/tools/researcher/core/init.ts` - Shared init service that validates input, renders the brief template, and seeds the workspace.
- `internal/tools/researcher/core/workspace-seed.ts` - Initial manifest/source builders and fixed-layout workspace seeding logic.
- `internal/tools/researcher/fs/write-json-atomically.ts` - Temp-file-and-rename helper for `manifest.json` and `sources.json`.
- `internal/tools/researcher/fs/workspace-paths.ts` - Absolute workspace path resolver used by the init core.
- `scripts/research-init.ts` - Thin CLI entrypoint that parses flags and prints machine-readable results.

## Decisions Made

- The init service remains runtime-neutral: no slash-command glue, no prompt coupling, and no Next.js-specific behavior.
- `brief.md` is rendered from the shared `researcher/templates/RESEARCH.md` template while keeping manifest and sources as the authoritative machine-state boundary.
- The CLI returns only `{ "researchId": ..., "workspacePath": ... }` so downstream runtimes can consume it deterministically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the missing absolute workspace-path resolver expected by the plan**
- **Found during:** Task 1 (Implement atomic workspace seeding and the core init flow against the existing init spec)
- **Issue:** Plan 01-03 expected `resolveResearchWorkspacePaths(projectRoot, slug)`, but the existing filesystem helper only exposed relative-root resolution plus safe path lookups for existing workspaces.
- **Fix:** Extended `internal/tools/researcher/fs/workspace-paths.ts` with a shared `resolveResearchWorkspacePaths(...)` export and reused it from the init core instead of duplicating path assembly logic.
- **Files modified:** `internal/tools/researcher/fs/workspace-paths.ts`, `internal/tools/researcher/core/init.ts`
- **Verification:** `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts`, `pnpm typecheck`
- **Committed in:** `eb8f78e`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation was necessary to satisfy the plan’s required shared interface without forking path logic. No scope creep.

## Issues Encountered

- `pnpm lint` reported two pre-existing warnings in unrelated presentation files. They were logged to `.planning/phases/01-research-workspace-bootstrap/deferred-items.md` and left untouched.
- One `git add` attempt briefly hit a transient `.git/index.lock` error; the lock was gone on the next check and the task commit proceeded without repository changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 01-04 can now resume from real init-created workspaces with stable IDs, manifest counters, and a schema-valid empty `sources.json` envelope.
- Later source and report flows can rely on atomic JSON writes and the shared absolute workspace-path helper instead of inventing new filesystem logic.
- Unrelated untracked `researcher/` docs, templates, and examples were intentionally left untouched.

## Self-Check: PASSED

- Found `.planning/phases/01-research-workspace-bootstrap/01-03-SUMMARY.md`
- Found commit `f19bcee`
- Found commit `eb8f78e`
- Found commit `ced4320`

---
*Phase: 01-research-workspace-bootstrap*
*Completed: 2026-04-10*
