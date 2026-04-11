---
phase: 02-source-registry-evidence-capture
verified: 2026-04-11T00:03:45Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 2: Source Registry & Evidence Capture Verification Report

**Phase Goal:** Build the Phase 2 source registry and evidence-capture layer so a research can add external sources to a central structured registry, persist durable captured evidence under `data/`, and refresh sources later while detecting stale evidence.
**Verified:** 2026-04-11T00:03:45Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | User can add external sources into one central structured registry and receive one stable `SRC-*` identity. | ✓ VERIFIED | `addSource()` loads validated workspace state, allocates `SRC-*` from `manifest.next_ids.source`, appends one record, and persists both machine-state files ([`internal/tools/researcher/core/sources/add.ts`](../../../../internal/tools/researcher/core/sources/add.ts), lines 44-109; [`internal/tools/researcher/core/sources/store.ts`](../../../../internal/tools/researcher/core/sources/store.ts), lines 26-72). `source-add.spec.ts` proves create behavior and counter sync (lines 43-102). Live CLI spot-check returned `{"operation":"created","sourceId":"SRC-0001"}` and wrote one source record. |
| 2 | Adding the same canonical locator twice updates one existing record instead of creating duplicate source IDs. | ✓ VERIFIED | Canonical dedupe is driven by `normalizeCanonicalUrl()` and `existingSource` lookup before allocation ([`internal/tools/researcher/core/sources/normalize.ts`](../../../../internal/tools/researcher/core/sources/normalize.ts), lines 1-20; [`internal/tools/researcher/core/sources/add.ts`](../../../../internal/tools/researcher/core/sources/add.ts), lines 45-77, 130-176). `source-add.spec.ts` proves duplicate add returns `updated`, preserves `SRC-0001`, and leaves `manifest.next_ids.source` unchanged at `2` (lines 104-170). |
| 3 | User can record source metadata including origin, access time, type, status, and confidence. | ✓ VERIFIED | The Phase 2 schema requires `origin`, `type`, `confidence`, `status`, `accessed_at`, and related timestamps on each source record ([`researcher/schemas/sources.schema.json`](../../../../researcher/schemas/sources.schema.json), lines 19-151). The typed contract mirrors that shape ([`internal/tools/researcher/contracts/sources.ts`](../../../../internal/tools/researcher/contracts/sources.ts), lines 37-74). `addSource()` writes those fields deterministically ([`internal/tools/researcher/core/sources/add.ts`](../../../../internal/tools/researcher/core/sources/add.ts), lines 79-99, 156-173), and the live temp-workspace run persisted them into `sources.json`. |
| 4 | `sources.json` remains the single structured registry artifact while Phase 2 records gain canonical locators, side states, capture history, and linkage placeholders. | ✓ VERIFIED | The top-level schema is still one `{ research_id, updated_at, sources }` envelope while each `SourceRecord` now carries `canonical_url`, `side_states`, `latest_capture_path`, `captures`, `linked_insights`, `tags`, and `notes` ([`researcher/schemas/sources.schema.json`](../../../../researcher/schemas/sources.schema.json), lines 6-157; [`internal/tools/researcher/contracts/sources.ts`](../../../../internal/tools/researcher/contracts/sources.ts), lines 48-74). No alternate registry file was introduced. |
| 5 | Malformed URLs, malformed timestamps, and invalid non-`data/` capture refs are rejected before Phase 2 writers trust disk. | ✓ VERIFIED | Ajv 2020 plus `ajv-formats` compile the source schema and enforce URI/date-time formats at the shared validator boundary ([`internal/tools/researcher/contracts/validators.ts`](../../../../internal/tools/researcher/contracts/validators.ts), lines 10-36). `normalizeDataCaptureRef()` rejects absolute, traversal, and non-`data/` refs ([`internal/tools/researcher/fs/workspace-paths.ts`](../../../../internal/tools/researcher/fs/workspace-paths.ts), lines 67-107). `contracts.spec.ts` proves invalid URLs, timestamps, and capture refs fail (lines 88-206). |
| 6 | Captured evidence is stored durably under `data/` and linked back to the source through root-relative refs, not inline evidence blobs. | ✓ VERIFIED | `writeSourceCapture()` builds `data/<bucket>/<SRC-ID>/<timestamp>/...`, normalizes the ref under `data/`, resolves the bounded destination, copies the file, and returns a `SourceCapture` object with a root-relative `path` ([`internal/tools/researcher/core/sources/captures.ts`](../../../../internal/tools/researcher/core/sources/captures.ts), lines 24-49, 62-140; [`internal/tools/researcher/contracts/workspace.ts`](../../../../internal/tools/researcher/contracts/workspace.ts), lines 8-11, 33-52). `source-refresh.spec.ts` proves files land under `data/snapshots/...` and prior captures remain readable on disk (lines 57-115). Live CLI spot-check created `data/snapshots/SRC-0001/20260411T020000Z/source.html` and stored that exact ref in `sources.json`. |
| 7 | Refreshing a source appends new capture history without overwriting prior evidence or changing the stable `SRC-*` ID. | ✓ VERIFIED | `refreshSource()` locates an existing record by `sourceId` or canonical URL, optionally appends a new capture, updates `latest_capture_path`, and persists the same source record without reallocating IDs ([`internal/tools/researcher/core/sources/refresh.ts`](../../../../internal/tools/researcher/core/sources/refresh.ts), lines 47-88, 168-216). `source-refresh.spec.ts` proves two snapshot refreshes coexist with preserved prior files and one stable `SRC-0001` identity (lines 57-115). |
| 8 | User can refresh sources later and detect stale, rejected, or superseded evidence from source-layer metadata. | ✓ VERIFIED | Refresh derives `stale` from `manifest.freshness.window_days`, layers manual `rejected`/`superseded` overrides on top, and recomputes manifest freshness debt from stale-source count ([`internal/tools/researcher/core/sources/refresh.ts`](../../../../internal/tools/researcher/core/sources/refresh.ts), lines 66-80, 218-289; [`internal/tools/researcher/core/sources/store.ts`](../../../../internal/tools/researcher/core/sources/store.ts), lines 64-72). `source-refresh.spec.ts` proves stale derivation and manual side-state updates (lines 117-191). |
| 9 | Disk-only resume remains compatible with the richer Phase 2 source contract and refresh metadata. | ✓ VERIFIED | `resumeResearchWorkspace()` still validates and reads `sources.json` directly from disk, counts `sources.sources.length`, and derives the next action from persisted state ([`internal/tools/researcher/core/resume.ts`](../../../../internal/tools/researcher/core/resume.ts), lines 41-105, 159-210). `resume.spec.ts` proves a Phase 2 workspace with refreshed source metadata still resumes correctly and recommends `refresh-sources` when freshness debt is present (lines 219-255). |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `researcher/schemas/sources.schema.json` | Enriched Phase 2 source-record schema on the existing `sources.json` envelope | ✓ VERIFIED | Requires canonical URL, origin, confidence, status, side states, timestamps, capture refs, capture history, linked insights, tags, and notes; capture paths are constrained to `data/...` (lines 6-157). |
| `internal/tools/researcher/contracts/sources.ts` | Typed Phase 2 source status/origin/confidence/capture interfaces | ✓ VERIFIED | Exports source enums plus `SourceOrigin`, `SourceCapture`, `SourceRecord`, and `SourcesEnvelope` (lines 3-90). |
| `internal/tools/researcher/contracts/validators.ts` | Shared schema validator with URI/date-time enforcement | ✓ VERIFIED | Uses Ajv 2020, wires `ajv-formats`, and compiles the Phase 2 source schema (lines 1-36). |
| `internal/tools/researcher/contracts/workspace.ts` | Shared `data/` bucket constants and source-capture path builder | ✓ VERIFIED | Defines `data/snapshots`, `data/exports`, `data/transcripts`, `data/datasets`, plus `buildSourceCaptureDirectory()` (lines 1-67). |
| `internal/tools/researcher/fs/workspace-paths.ts` | Root-confined capture-ref and workspace-path validation | ✓ VERIFIED | Rejects absolute paths, traversal, non-`data/` capture refs, and symlink traversal (lines 50-160). |
| `internal/tools/researcher/core/sources/store.ts` | Shared validated persistence boundary for `manifest.json` + `sources.json` | ✓ VERIFIED | Loads both documents, asserts shared identity, validates before write, and syncs freshness debt from stale source state (lines 26-90). |
| `internal/tools/researcher/core/sources/normalize.ts` | Canonical locator normalization for dedupe | ✓ VERIFIED | Trims input, lower-cases protocol/host, drops fragments, and strips trailing slash except `/` (lines 1-20). |
| `internal/tools/researcher/core/sources/add.ts` | Shared add/upsert core over the Phase 2 contract | ✓ VERIFIED | Implements create-vs-update behavior, default side-state/capture placeholders, and manifest sync (lines 44-225). |
| `internal/tools/researcher/core/sources/captures.ts` | Append-only capture writer under `data/<bucket>/<SRC-ID>/<timestamp>/` | ✓ VERIFIED | Copies external files into bounded `data/` locations and returns machine-readable capture refs (lines 24-140). |
| `internal/tools/researcher/core/sources/refresh.ts` | Refresh core for capture appends, stale derivation, and side-state management | ✓ VERIFIED | Updates freshness metadata, appends captures, preserves source identity, and applies stale/rejected/superseded rules (lines 47-333). |
| `scripts/research-source-add.ts` | Thin JSON-only add CLI | ✓ VERIFIED | Parses argv, delegates to shared core, and prints deterministic JSON (lines 21-185). |
| `scripts/research-source-refresh.ts` | Thin JSON-only refresh CLI | ✓ VERIFIED | Parses argv, delegates to shared core, and prints deterministic JSON (lines 25-187). |
| `internal/tools/researcher/__tests__/contracts.spec.ts`, `source-add.spec.ts`, `source-refresh.spec.ts`, `resume.spec.ts` | Active regression coverage for the Phase 2 contract and flows | ✓ VERIFIED | Focused Vitest run passed `4` files / `17` tests. Tests are substantive and exercise contract validation, add/upsert, refresh/capture, and resume compatibility. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `contracts/sources.ts` | `contracts/validators.ts` | `validateSourcesEnvelope()` delegation | ✓ WIRED | `validateSourcesEnvelope()` returns `validateSourcesDocument(input)` ([`internal/tools/researcher/contracts/sources.ts`](../../../../internal/tools/researcher/contracts/sources.ts), lines 88-89). |
| `contracts/validators.ts` | `researcher/schemas/sources.schema.json` | Ajv compile + `addFormats()` | ✓ WIRED | The shared validator compiles the Phase 2 schema and enables URI/date-time format enforcement ([`internal/tools/researcher/contracts/validators.ts`](../../../../internal/tools/researcher/contracts/validators.ts), lines 10-24). |
| `contracts/workspace.ts` | `core/sources/captures.ts` | `buildSourceCaptureDirectory()` | ✓ WIRED | Capture writes reuse the shared `data/` bucket contract rather than hardcoding paths ([`internal/tools/researcher/contracts/workspace.ts`](../../../../internal/tools/researcher/contracts/workspace.ts), lines 33-52; [`internal/tools/researcher/core/sources/captures.ts`](../../../../internal/tools/researcher/core/sources/captures.ts), lines 27-35). |
| `fs/workspace-paths.ts` | `core/sources/captures.ts` | `normalizeDataCaptureRef()` + `resolveWorkspacePath()` | ✓ WIRED | Capture refs are normalized under `data/` and resolved through the bounded path guard before copy ([`internal/tools/researcher/core/sources/captures.ts`](../../../../internal/tools/researcher/core/sources/captures.ts), lines 33-43). |
| `core/sources/store.ts` | `core/sources/add.ts` | validated load/persist + manifest sync | ✓ WIRED | Add flow reuses the shared store helpers for load, ID allocation, persistence, and freshness sync ([`internal/tools/researcher/core/sources/add.ts`](../../../../internal/tools/researcher/core/sources/add.ts), lines 12-18, 44-109). |
| `core/sources/normalize.ts` | `core/sources/add.ts`, `core/sources/refresh.ts` | canonical URL normalization | ✓ WIRED | Add and refresh both use the same canonicalization path for lookup/dedupe ([`internal/tools/researcher/core/sources/add.ts`](../../../../internal/tools/researcher/core/sources/add.ts), line 18 and lines 153-154; [`internal/tools/researcher/core/sources/refresh.ts`](../../../../internal/tools/researcher/core/sources/refresh.ts), lines 16 and 147-152). |
| `core/sources/captures.ts` | `core/sources/refresh.ts` | optional capture append during refresh | ✓ WIRED | Refresh writes captures through `writeSourceCapture()` and appends the returned `SourceCapture` to the existing record ([`internal/tools/researcher/core/sources/refresh.ts`](../../../../internal/tools/researcher/core/sources/refresh.ts), lines 51-64, 208-215). |
| `scripts/research-source-add.ts` | `core/sources/add.ts` | thin CLI delegation | ✓ WIRED | CLI parses flags and directly calls `addSource()` before printing JSON (lines 21-43). |
| `scripts/research-source-refresh.ts` | `core/sources/refresh.ts` | thin CLI delegation | ✓ WIRED | CLI parses flags and directly calls `refreshSource()` before printing JSON (lines 25-47). |
| `core/resume.ts` | richer Phase 2 source contract | validated disk-only read | ✓ WIRED | Resume still validates `sources.json` through `validateSourcesEnvelope()` and derives inventory/next action from actual disk state ([`internal/tools/researcher/core/resume.ts`](../../../../internal/tools/researcher/core/resume.ts), lines 68-105, 159-165). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `core/sources/add.ts` | `store.sources.sources[]`, `manifest.inventory.sources`, `manifest.next_ids.source` | CLI/core input normalized by `normalizeCanonicalUrl()`, loaded via `loadSourceStore()`, then persisted through `persistSourceStore()` | Yes — live temp-workspace run created `SRC-0001`, updated `manifest.next_ids.source` to `2`, and stored one record in `sources.json` | ✓ FLOWING |
| `core/sources/captures.ts` | `relativeCapturePath`, copied file bytes | External capture file + bucket contract + workspace path guard | Yes — live temp-workspace run copied `source.html` into `data/snapshots/SRC-0001/20260411T020000Z/source.html` and the file contents matched | ✓ FLOWING |
| `core/sources/refresh.ts` | `source.captures`, `source.latest_capture_path`, `source.side_states`, `manifest.freshness.debt` | Existing source record + optional capture + freshness window from `manifest.json` | Yes — `source-refresh.spec.ts` and live CLI spot-check showed appended captures, `rejected` state, and synced freshness metadata | ✓ FLOWING |
| `core/resume.ts` | `inventory`, `freshnessDebt`, `nextRecommendedAction` | Validated `manifest.json`, validated `sources.json`, and recursive disk scans | Yes — `resume.spec.ts` proved inventory is read from disk and freshness debt drives `refresh-sources` recommendations | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 2 regression suite | `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/source-add.spec.ts internal/tools/researcher/__tests__/source-refresh.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` | `4` files passed, `17` tests passed | ✓ PASS |
| Repo type safety | `pnpm typecheck` | Exit `0` | ✓ PASS |
| Repo lint gate | `pnpm lint` | Exit `0`; `2` unrelated warnings outside Researcher | ✓ PASS |
| Add source into central registry | `pnpm exec tsx scripts/research-source-add.ts ...` in a temp workspace | Returned `{"operation":"created","sourceId":"SRC-0001","canonicalUrl":"https://ajv.js.org/guide/formats.html"}` | ✓ PASS |
| Refresh source with durable evidence capture | `pnpm exec tsx scripts/research-source-refresh.ts ... --source-id SRC-0001 --capture-kind snapshot --capture-file <tmp>` in a temp workspace | Returned `latestCapturePath: "data/snapshots/SRC-0001/20260411T020000Z/source.html"`; capture file existed on disk with copied content | ✓ PASS |
| Resume after add + refresh | `pnpm exec tsx scripts/research-resume.ts ...` in the same temp workspace | Returned `inventory.sources: 1`, `freshnessDebt: "clear"`, `nextRecommendedAction: "extract-insights"` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `SRC-01` | `02-01-PLAN.md`, `02-02-PLAN.md` | User can add external sources to a central structured source registry for a research. | ✓ SATISFIED | Schema and typed contract freeze the central `sources.json` ledger ([`researcher/schemas/sources.schema.json`](../../../../researcher/schemas/sources.schema.json), lines 6-157; [`internal/tools/researcher/contracts/sources.ts`](../../../../internal/tools/researcher/contracts/sources.ts), lines 48-74). `addSource()` and `research-source-add.ts` add records through shared validated core logic ([`internal/tools/researcher/core/sources/add.ts`](../../../../internal/tools/researcher/core/sources/add.ts), lines 44-109; [`scripts/research-source-add.ts`](../../../../scripts/research-source-add.ts), lines 21-185). `source-add.spec.ts` and the live CLI run prove one source can be added and deduped (lines 43-245). |
| `SRC-02` | `02-01-PLAN.md`, `02-02-PLAN.md` | User can record source metadata including origin, access time, type, status, and confidence. | ✓ SATISFIED | The source schema requires those metadata fields and validates them at write/read time ([`researcher/schemas/sources.schema.json`](../../../../researcher/schemas/sources.schema.json), lines 56-119; [`internal/tools/researcher/contracts/validators.ts`](../../../../internal/tools/researcher/contracts/validators.ts), lines 10-36). `addSource()` populates `origin`, `type`, `confidence`, `status`, `accessed_at`, and `last_checked_at` ([`internal/tools/researcher/core/sources/add.ts`](../../../../internal/tools/researcher/core/sources/add.ts), lines 79-99, 156-173). |
| `SRC-03` | `02-03-PLAN.md` | User can store captured evidence or extracted material alongside the research in a durable local structure. | ✓ SATISFIED | `writeSourceCapture()` copies files into timestamped `data/<bucket>/<SRC-ID>/...` paths and returns root-relative refs ([`internal/tools/researcher/core/sources/captures.ts`](../../../../internal/tools/researcher/core/sources/captures.ts), lines 24-49). `source-refresh.spec.ts` proves append-only on-disk capture storage and preserved prior evidence (lines 57-115). Live temp-workspace run confirmed the copied file exists at the recorded path. |
| `SRC-04` | `02-03-PLAN.md` | User can refresh sources later and detect when evidence may have gone stale. | ✓ SATISFIED | `refreshSource()` derives `stale` from `manifest.freshness.window_days`, updates side states, and syncs freshness debt ([`internal/tools/researcher/core/sources/refresh.ts`](../../../../internal/tools/researcher/core/sources/refresh.ts), lines 66-80, 218-275). `source-refresh.spec.ts` proves stale detection and stale clearing after a fresh capture (lines 117-154). `resume.spec.ts` proves stale Phase 2 state still drives `refresh-sources` in disk-only resume (lines 219-255). |

No orphaned Phase 2 requirement IDs were found in `REQUIREMENTS.md`: all required IDs (`SRC-01`, `SRC-02`, `SRC-03`, `SRC-04`) appear in Phase 2 plan frontmatter and each is satisfied by verified implementation evidence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `internal/tools/researcher/__tests__/source-refresh.spec.ts` | 57 | Happy-path focused refresh coverage | ℹ️ Info | The phase goal is met, but invalid capture-kind / missing-capture-file paths are enforced in code rather than covered by dedicated refresh regression tests. Residual risk is confined to error-path regressions, not the shipped Phase 2 behavior. |

### Human Verification Required

None.

### Gaps Summary

No blocking gaps were found. The Phase 2 goal is achieved in code: a research can add external sources into one central `sources.json` registry, persist durable capture files under `data/`, refresh sources without changing stable `SRC-*` IDs, and detect stale evidence through source-layer metadata plus manifest freshness debt.

Disconfirmation pass notes:
- Partial requirement check: `source-refresh.spec.ts` exercises append, stale-derivation, and manual side-state happy paths, but invalid-capture error paths rely on implementation guards in [`internal/tools/researcher/core/sources/refresh.ts`](../../../../internal/tools/researcher/core/sources/refresh.ts) and [`internal/tools/researcher/core/sources/captures.ts`](../../../../internal/tools/researcher/core/sources/captures.ts) rather than direct regression tests.
- Misleading-test check: the refresh CLI smoke test proves add/update output shape and side-state mutation, but it does not independently cover the `--clear-*` flags.
- Untested error-path check: `persistSourceStore()` validates both documents and uses atomic single-file writes, but there is no fault-injection test for a manifest write failure after `sources.json` succeeds.

---

_Verified: 2026-04-11T00:03:45Z_
_Verifier: Claude (gsd-verifier)_
