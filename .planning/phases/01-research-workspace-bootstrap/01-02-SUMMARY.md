---
phase: 01-research-workspace-bootstrap
plan: 02
subsystem: infra
tags: [researcher, ajv, json-schema, filesystem, vitest]
requires:
  - phase: 01-01
    provides: Wave 0 Vitest harness, typecheck command, and contract spec scaffold
provides:
  - Versioned manifest contract for bounded research workspaces
  - Shared Ajv validation for manifest.json and sources.json
  - Root-confined workspace path resolution with traversal and symlink rejection
affects: [01-03, 01-04, source-registry, resume-flow]
tech-stack:
  added: []
  patterns: [contract-first schemas, manifest-backed counters, root-confined filesystem guards]
key-files:
  created:
    - researcher/schemas/manifest.schema.json
    - internal/tools/researcher/contracts/manifest.ts
    - internal/tools/researcher/contracts/validators.ts
    - internal/tools/researcher/fs/workspace-paths.ts
  modified:
    - researcher/schemas/sources.schema.json
    - internal/tools/researcher/contracts/sources.ts
    - internal/tools/researcher/contracts/workspace.ts
    - internal/tools/researcher/__tests__/contracts.spec.ts
key-decisions:
  - "Freeze the Phase 1 manifest at contract version 1.0 with compact inventory counts and manifest-backed next-ID counters."
  - "Keep sources.json as the public ledger envelope, but route validation through one shared Ajv module so init and resume do not fork the contract."
  - "Resolve every research path from researcher/researches/<slug> and reject absolute, traversal, and symlink escape attempts before use."
patterns-established:
  - "Contract-first validation: shared schema files plus typed validator entrypoints own machine-state acceptance."
  - "Filesystem confinement: path helpers derive all research paths from one fixed public root and fail fast on unsafe input."
requirements-completed: [RSCH-01]
duration: 3 min
completed: 2026-04-10
---

# Phase 01 Plan 02: Workspace Contract Summary

**Phase 1 workspace contract frozen with a versioned manifest schema, shared Ajv validators, and root-confined path guards for `researcher/researches/<slug>`**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-10T14:31:29Z
- **Completed:** 2026-04-10T14:34:32Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Locked the public Phase 1 workspace surface to `researcher/researches/<slug>/` with explicit path constants and manifest path helpers.
- Added a versioned `manifest.schema.json` plus typed manifest/source contracts that freeze the shared Phase 1 ID and next-counter strategy.
- Replaced the Wave 0 placeholder contract spec with active assertions for schema validation, shared source-envelope validation, and traversal rejection.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the Phase 1 manifest schema and fixed workspace contract** - `23e61ac` (feat)
2. **Task 2: Implement shared validators, path guards, and active contract tests** - `0b69375` (test)
3. **Task 2: Implement shared validators, path guards, and active contract tests** - `9c57235` (feat)

## Files Created/Modified

- `researcher/schemas/manifest.schema.json` - Machine-readable Phase 1 manifest contract with fixed root-relative paths and `next_ids`.
- `researcher/schemas/sources.schema.json` - Public `sources.json` schema aligned to allow the Phase 1 empty envelope with `updated_at: null`.
- `internal/tools/researcher/contracts/manifest.ts` - Typed manifest surface, ID prefixes, and stable next-counter helpers.
- `internal/tools/researcher/contracts/sources.ts` - Public source-envelope seed helper and shared validation entrypoint.
- `internal/tools/researcher/contracts/workspace.ts` - Fixed workspace root constants and root-relative contract paths.
- `internal/tools/researcher/contracts/validators.ts` - Shared Ajv validation for `manifest.json` and `sources.json`.
- `internal/tools/researcher/fs/workspace-paths.ts` - Safe path resolution that rejects absolute paths, traversal, and symlink escapes.
- `internal/tools/researcher/__tests__/contracts.spec.ts` - Active contract tests for validation, ID freezing, and root confinement.

## Decisions Made

- Manifest state stays compact in Phase 1: identity, status routing, freshness, inventory counts, fixed paths, and next counters only.
- `validateSourcesEnvelope()` remains the public source-envelope boundary, but its implementation now delegates to shared schema tooling instead of ad hoc checks.
- Workspace path resolution is runtime-neutral and detached from Next.js concerns so later init and resume flows can share the same core utilities.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aligned `sources.schema.json` with the frozen empty envelope**
- **Found during:** Task 1 (Define the Phase 1 manifest schema and fixed workspace contract)
- **Issue:** The existing public `sources.json` schema required a non-null `updated_at`, but the Phase 1 contract explicitly freezes `createEmptySourcesEnvelope()` as `updated_at: null`.
- **Fix:** Updated `researcher/schemas/sources.schema.json` to allow `updated_at` to be either an ISO string or `null`.
- **Files modified:** `researcher/schemas/sources.schema.json`
- **Verification:** `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts`
- **Committed in:** `23e61ac`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required for the shared validator boundary to match the frozen Phase 1 source-envelope contract. No scope creep.

## Issues Encountered

- `pnpm lint` reported two pre-existing warnings in presentation files outside this plan’s scope. No errors blocked completion.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 01-03 can seed workspaces against one manifest contract, one `sources.json` envelope, and one bounded root resolver.
- Phase 01-04 can resume from disk using the same shared validators instead of re-defining manifest or source parsing logic.
- Unrelated untracked `researcher/` docs, templates, and examples were intentionally left untouched.

## Self-Check: PASSED

- Found `.planning/phases/01-research-workspace-bootstrap/01-02-SUMMARY.md`
- Found commit `23e61ac`
- Found commit `0b69375`
- Found commit `9c57235`

---
*Phase: 01-research-workspace-bootstrap*
*Completed: 2026-04-10*
