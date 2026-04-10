# Phase 2: Source Registry & Evidence Capture - Research

**Researched:** 2026-04-11
**Domain:** Source registry schema, durable evidence capture, and refresh semantics for Researcher
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Source identity and deduplication
- **D-14:** `sources.json` remains the public, canonical source registry for each research in Phase 2. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-15:** Every external source receives one stable `SRC-*` ID and one durable registry record,
  even if that source is refreshed many times later. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-16:** Duplicate prevention should key off a normalized canonical source locator
  (`canonical_url` or equivalent), so refresh updates an existing source record instead of creating
  a second `SRC-*` entry for the same source. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-17:** Source status should model the operator workflow rather than just freshness. The Phase 2
  lifecycle is `queued -> read -> quoted`, with `rejected`, `stale`, and `superseded` as explicit
  side states when applicable. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

### Source record contract
- **D-18:** Phase 2 must expand the source contract beyond the Phase 1 empty envelope to include the
  metadata promised in requirements: origin, access time, source type, status, and confidence. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-19:** Source records should store machine-readable capture references as root-relative paths,
  not inline blobs of article text or binary data. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-20:** Source records should keep linkage placeholders for downstream reuse (`linked_insights`
  now, later lineage extensions), so later phases extend one contract instead of inventing a second
  provenance path. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

### Evidence capture layout
- **D-21:** Raw source captures belong under the existing `data/` tree, not inside `sources.json`
  or `manifest.json`. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-22:** Web snapshots and fetched documents should live under `data/snapshots/`, while other
  evidence forms continue to use purpose-specific folders already implied by the artifact model
  (`data/exports/`, `data/transcripts/`, `data/datasets/`). [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-23:** Capture files should be named or nested in a way that keeps them attributable to one
  stable `SRC-*` record and allows multiple refresh snapshots to coexist. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

### Refresh and staleness semantics
- **D-24:** Refresh should append new durable captures and update registry metadata; it should not
  silently overwrite prior evidence in place. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-25:** Refresh must update per-source freshness metadata (`accessed_at`, latest capture
  pointer, status) while preserving the stable source ID. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-26:** Phase 2 only needs to record staleness at the source layer and surface that affected
  evidence may be stale. Downstream impact propagation into insights, analysis, and reports belongs
  to Phase 5. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

### Mutation boundary and runtime behavior
- **D-27:** All source add, update, capture, and refresh writes must go through shared deterministic
  tooling in `internal/tools/researcher/`, not prompt-authored JSON edits. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-28:** Runtime entrypoints for source work should stay thin, like Phase 1 init/resume: parse
  operator input, call the shared core, and print deterministic machine-readable output. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **D-29:** Search/provider choice is an implementation detail for planner/researcher agents. This
  phase locks the durable artifact behavior, not one specific search backend. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

### Claude's Discretion
- Exact helper/module boundaries for source add vs refresh vs capture internals [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- Exact field names for canonical URL normalization and capture pointers, as long as the contract
  preserves dedupe, refreshability, and root-relative evidence references [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- Whether refresh metadata uses explicit timestamps like `last_checked_at` in addition to
  `accessed_at`, as long as staleness remains machine-readable and deterministic [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
- Full downstream impact propagation from stale sources into insights, analysis, and reports belongs
  to Phase 5. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- Rich search-provider selection, ranking strategies, and hosted crawling integrations are not the
  locked decision surface for this phase. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- Collaborative source merges and conflict-safe multi-user registry updates remain future work. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRC-01 | User can add external sources to a central structured source registry for a research. | Keep `sources.json` as the public registry, allocate stable `SRC-*` IDs from `manifest.next_ids.source`, and dedupe new adds against a normalized canonical locator before any write. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: internal/tools/researcher/contracts/manifest.ts] |
| SRC-02 | User can record source metadata including origin, access time, type, status, and confidence. | Expand each source record in `sources.json` to include origin metadata, nullable access/check timestamps, workflow status plus freshness side states, and confidence. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |
| SRC-03 | User can store captured evidence or extracted material alongside the research in a durable local structure. | Write captures under `data/snapshots/`, `data/exports/`, `data/transcripts/`, and `data/datasets/` using root-relative paths stored in the registry instead of inline content. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |
| SRC-04 | User can refresh sources later and detect when evidence may have gone stale. | Treat refresh as append-only capture history on one stable source record, update per-source freshness metadata, and surface stale evidence at the source layer only in Phase 2. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |
</phase_requirements>

## Summary

Phase 2 should extend the existing Phase 1 `sources.json` envelope in place rather than replace it. The public contract is already locked to `sources.json`, the validator boundary already exists, and resume already treats the registry as the source count of truth, so the clean move is to deepen one registry contract instead of introducing a second public ledger. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: internal/tools/researcher/contracts/sources.ts] [VERIFIED: internal/tools/researcher/contracts/validators.ts] [VERIFIED: internal/tools/researcher/core/resume.ts]

The most important planning decision is to separate workflow state from freshness state inside each source record. The current schema has one `status` enum that mixes `queued`, `read`, `quoted`, `stale`, and `superseded`, but the phase context explicitly says the operator workflow is `queued -> read -> quoted` and that `stale` is a side state, which means one field is no longer expressive enough for the locked behavior. [VERIFIED: researcher/schemas/sources.schema.json] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]

The second planning decision is to make capture history append-only. The current singular `snapshot_path` shape cannot represent multiple refreshes without overwriting history, while the phase context requires multiple durable captures per source and root-relative evidence references under `data/`. The planner should therefore model capture history as a small array of root-relative refs plus a fast `latest_capture_path` pointer, and keep all byte-writing and registry mutation inside shared core services under `internal/tools/researcher/`. [VERIFIED: internal/tools/researcher/contracts/sources.ts] [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]

**Primary recommendation:** Keep `sources.json` as one schema-validated public registry, dedupe on one normalized canonical locator, split source workflow state from freshness side states, and store append-only capture history under `data/<bucket>/<SRC-ID>/<timestamp>/` with thin add/refresh CLIs over shared deterministic core code. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: internal/tools/researcher/fs/workspace-paths.ts] [ASSUMED]

## Project Constraints (from CLAUDE.md)

- TypeScript must stay strict, use descriptive naming, prefer early returns, keep nesting minimal, and avoid `any`. [VERIFIED: CLAUDE.md]
- Do not add fallback code paths or graceful-degradation branches; fix the primary path instead. [VERIFIED: CLAUDE.md]
- Keep dependencies lean and prefer built-in capabilities plus well-supported libraries. [VERIFIED: CLAUDE.md]
- Use `pnpm` for repo scripts and package management. [VERIFIED: CLAUDE.md] [VERIFIED: package.json]
- Do not run `pnpm dev`. [VERIFIED: CLAUDE.md]
- If this phase happens to touch app routes later, use App Router only and do not introduce Pages Router APIs. [VERIFIED: CLAUDE.md]

## Standard Stack

Phase 2 should reuse the existing Researcher stack and add only the one missing validation helper needed to make the current schema keywords actually enforce URI and date-time formats. [VERIFIED: internal/tools/researcher/contracts/validators.ts] [CITED: https://ajv.js.org/guide/formats.html]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs/promises` + `node:path` + `node:url` | Local runtime `v20.19.4`; project target `24.x` [VERIFIED: package.json] [VERIFIED: local runtime] | Root-confined file IO, atomic writes, and canonical URL parsing for dedupe keys. [VERIFIED: internal/tools/researcher/fs/workspace-paths.ts] [VERIFIED: internal/tools/researcher/fs/write-json-atomically.ts] [CITED: https://nodejs.org/api/url.html] | The current Phase 1 code already uses Node built-ins for path safety and JSON writes, so Phase 2 does not need a crawling or storage framework to mutate the registry safely. [VERIFIED: internal/tools/researcher/fs/workspace-paths.ts] [VERIFIED: internal/tools/researcher/fs/write-json-atomically.ts] |
| `ajv` | `8.18.0` latest, published 2026-02-14 [VERIFIED: npm registry] | File-boundary validation for the expanded `sources.json` contract and any updated manifest digest fields. [VERIFIED: internal/tools/researcher/contracts/validators.ts] | Ajv is already installed and already owns manifest/source schema validation in Phase 1, so Phase 2 should deepen that contract instead of introducing a second validator stack. [VERIFIED: package.json] [VERIFIED: internal/tools/researcher/contracts/validators.ts] |
| `ajv-formats` | `3.0.1` latest, published 2024-03-30 [VERIFIED: npm registry] | Enforce `uri` and `date-time` schema formats if Phase 2 keeps those keywords in `sources.schema.json`. [CITED: https://ajv.js.org/guide/formats.html] | The current validator config sets `validateFormats: false`, and Ajv documents standard formats through the plugin, so without this add-on the existing `format` keywords are documentation only. [VERIFIED: internal/tools/researcher/contracts/validators.ts] [CITED: https://ajv.js.org/guide/formats.html] |
| `typescript` | Repo installed `5.9.3`; latest `6.0.2`, published 2026-03-23 [VERIFIED: package.json] [VERIFIED: local runtime] [VERIFIED: npm registry] | Strict typing for source records, capture refs, and deterministic core result payloads. [VERIFIED: CLAUDE.md] | The repo is already strict TypeScript and the current Researcher code is TS-first, so Phase 2 should extend the existing contract types rather than introduce codegen or a new runtime schema layer. [VERIFIED: package.json] [VERIFIED: internal/tools/researcher/contracts/sources.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | Repo installed `4.21.0`; latest `4.21.0`, published 2025-11-30 [VERIFIED: package.json] [VERIFIED: local runtime] [VERIFIED: npm registry] | Thin runtime-neutral entrypoints for `research-source-add` and `research-source-refresh`. [VERIFIED: scripts/research-init.ts] [VERIFIED: scripts/research-resume.ts] | Use for CLI wrappers only; keep all registry mutation logic inside `internal/tools/researcher/core/`. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] |
| `vitest` | Repo installed `4.1.4`; latest `4.1.4`, published 2026-04-09 [VERIFIED: package.json] [VERIFIED: local runtime] [VERIFIED: npm registry] | Temp-workspace tests for source add, dedupe, capture append, and refresh/stale behavior. [VERIFIED: vitest.config.ts] [VERIFIED: internal/tools/researcher/__tests__/test-helpers.ts] | Use the existing focused Node test harness; no new test framework is needed. [VERIFIED: vitest.config.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Public `sources.json` as the canonical registry | Public `sources.jsonl` or SQLite | Phase 1 and the Phase 2 context both lock `sources.json` as the public artifact today, so changing the public surface now adds migration work without solving a current scale problem. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-RESEARCH.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |
| `ajv` + `ajv-formats` for file-boundary validation | Hand-rolled regex and date parsing | Hand-rolled format validation duplicates schema intent and is harder to keep aligned with the persisted contract. [CITED: https://ajv.js.org/guide/formats.html] [VERIFIED: internal/tools/researcher/contracts/validators.ts] |
| Provider-neutral add/refresh core | Provider-specific web-fetch code in the core | The phase context explicitly locks provider choice out of Phase 2, so network-specific code in core would create drift and harder tests. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |

**Installation:**
```bash
pnpm add ajv-formats
```

**Version verification:** `ajv@8.18.0` (2026-02-14), `ajv-formats@3.0.1` (2024-03-30), `tsx@4.21.0` (2025-11-30), `vitest@4.1.4` (2026-04-09), and `typescript@6.0.2` latest / `5.9.3` installed were verified against the npm registry or local runtime in this session. [VERIFIED: npm registry] [VERIFIED: local runtime] [VERIFIED: package.json]

## Architecture Patterns

### Recommended Project Structure
```text
internal/tools/researcher/
├── contracts/
│   ├── manifest.ts
│   ├── sources.ts
│   └── validators.ts
├── core/
│   ├── sources/
│   │   ├── add.ts
│   │   ├── refresh.ts
│   │   ├── normalize.ts
│   │   └── captures.ts
│   ├── init.ts
│   └── resume.ts
└── fs/
    ├── workspace-paths.ts
    └── write-json-atomically.ts

scripts/
├── research-source-add.ts
└── research-source-refresh.ts

researcher/researches/<slug>/
└── data/
    ├── snapshots/<SRC-ID>/<timestamp>/
    ├── exports/<SRC-ID>/<timestamp>/
    ├── transcripts/<SRC-ID>/<timestamp>/
    └── datasets/<SRC-ID>/<timestamp>/
```

The exact submodule names under `core/sources/` are discretionary, but the separation above matches the existing thin-core/thin-CLI pattern and keeps all file mutation under one shared boundary. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: scripts/research-init.ts] [VERIFIED: scripts/research-resume.ts] [ASSUMED]

### Pattern 1: Expand `sources.json` In Place
**What:** Keep the existing top-level envelope shape and deepen each source record instead of introducing a new public registry artifact. [VERIFIED: internal/tools/researcher/contracts/sources.ts] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

**When to use:** Plan `02-01` should define the contract and validator updates before any add/refresh logic is implemented. [VERIFIED: .planning/ROADMAP.md]

**Recommended public `sources.json` shape:** The field names below are the recommended planner contract for Phase 2; the need for dedupe keys, capture refs, confidence, origin metadata, and freshness timestamps is verified, while the exact field names remain discretionary. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: researcher/CONTRACTS.md] [ASSUMED]

```json
{
  "research_id": "RES-20260410-deep-research-os",
  "updated_at": "2026-04-11T02:30:00.000Z",
  "sources": [
    {
      "id": "SRC-0001",
      "title": "Ajv format validation",
      "url": "https://ajv.js.org/guide/formats.html",
      "canonical_url": "https://ajv.js.org/guide/formats.html",
      "origin": {
        "type": "manual",
        "value": "phase-2-research"
      },
      "type": "webpage",
      "confidence": "high",
      "status": "quoted",
      "side_states": [],
      "published_at": null,
      "created_at": "2026-04-11T02:00:00.000Z",
      "updated_at": "2026-04-11T02:30:00.000Z",
      "accessed_at": "2026-04-11T02:30:00.000Z",
      "last_checked_at": "2026-04-11T02:30:00.000Z",
      "latest_capture_path": "data/snapshots/SRC-0001/20260411T023000Z/source.html",
      "captures": [
        {
          "kind": "snapshot",
          "path": "data/snapshots/SRC-0001/20260411T023000Z/source.html",
          "captured_at": "2026-04-11T02:30:00.000Z"
        }
      ],
      "linked_insights": [],
      "tags": ["ajv", "json-schema"],
      "notes": null
    }
  ]
}
```

**Why this shape is the cleanest fit:**

| Field | Why Phase 2 Needs It |
|-------|----------------------|
| `canonical_url` | One explicit dedupe key is required by D-16, and keeping it on the record makes duplicate decisions inspectable. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |
| `origin` | Requirements explicitly ask for origin metadata, and future harvest flows need to remember whether a source came from manual input, search, or import. [VERIFIED: .planning/REQUIREMENTS.md] [ASSUMED] |
| `confidence` | Requirements ask for confidence, and the current `credibility` field in the schema does not match that locked requirement language. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: researcher/schemas/sources.schema.json] [ASSUMED] |
| `status` + `side_states` | D-17 defines a primary workflow lifecycle plus side states, so one enum is not expressive enough for `quoted` and `stale` to coexist. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |
| `accessed_at` + `last_checked_at` | Refresh semantics need to distinguish the last successful access from the last refresh attempt. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |
| `captures` + `latest_capture_path` | The current singular `snapshot_path` cannot represent append-only refresh history. [VERIFIED: internal/tools/researcher/contracts/sources.ts] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |

### Pattern 2: Provider-Neutral Source Add Core
**What:** Add one shared source-upsert core that normalizes input, dedupes by canonical locator, allocates an ID only on create, updates `sources.json`, and synchronizes the manifest digest. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: internal/tools/researcher/contracts/manifest.ts] [VERIFIED: internal/tools/researcher/fs/write-json-atomically.ts] [ASSUMED]

**When to use:** Plan `02-02`. [VERIFIED: .planning/ROADMAP.md]

**Rules:**
- New source: allocate the next `SRC-*` ID from `manifest.next_ids.source`, append the new record, increment the counter, and bump `manifest.inventory.sources` plus `manifest.freshness.last_source_sync_at`. [VERIFIED: internal/tools/researcher/contracts/manifest.ts] [VERIFIED: internal/tools/researcher/core/resume.ts] [ASSUMED]
- Duplicate source: reuse the existing `SRC-*` record and update metadata in place without incrementing the counter or count. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]
- CLI behavior: parse arguments, call the core, and print deterministic JSON only. [VERIFIED: scripts/research-init.ts] [VERIFIED: scripts/research-resume.ts] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

**Example:**
```typescript
// Source: internal/tools/researcher/contracts/manifest.ts + Phase 2 context
import { formatArtifactId } from "../contracts/manifest";

function allocateSourceId(nextCounter: number) {
  return formatArtifactId("source", nextCounter);
}
```

### Pattern 3: Append-Only Capture History
**What:** Every capture write lands in a source-specific timestamped directory under `data/`, and every refresh appends a new capture ref instead of replacing a prior file in place. [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]

**When to use:** Plan `02-03`. [VERIFIED: .planning/ROADMAP.md]

**Recommended layout:**
```text
data/
├── snapshots/SRC-0001/20260411T023000Z/source.html
├── exports/SRC-0001/20260411T023000Z/extract.json
├── transcripts/SRC-0007/20260411T090000Z/transcript.md
└── datasets/SRC-0013/20260411T101500Z/dataset.csv
```

**Why this layout works:** The bucket names are already locked by the local artifact model and phase context, the `SRC-*` folder preserves attribution, and the timestamp segment lets refresh snapshots coexist without hidden overwrites. [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]

**Example:**
```typescript
// Source: internal/tools/researcher/fs/workspace-paths.ts + Phase 2 layout recommendation
const relativePath =
  `data/snapshots/${sourceId}/${captureStamp}/source.html`;
const absolutePath = await resolveWorkspacePath(projectRoot, slug, relativePath);
```

### Pattern 4: Refresh Updates Metadata, Not Identity
**What:** Refresh keeps the same `SRC-*` ID, appends capture refs, updates freshness timestamps, and adds `stale` to side states only when the source is now outside the freshness window or a refresh detects changed evidence. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: researcher/WORKFLOWS.md] [ASSUMED]

**When to use:** Plan `02-03`. [VERIFIED: .planning/ROADMAP.md]

**Recommended refresh rules:**
- Never create a second source record for the same canonical locator. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- Never overwrite the prior capture file in place. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- Keep stale handling at the source layer only in Phase 2; do not try to mark insights or reports yet. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

### Plan Split Guidance

| Plan | Scope | Must Produce | Must Avoid |
|------|-------|--------------|------------|
| `02-01` Define source registry schema and IDs | Expand `sources.schema.json`, TS source contracts, capture-ref types, and source ID/dedupe helpers. [VERIFIED: .planning/ROADMAP.md] | Updated schema and types, validator changes, conservative canonical locator normalization, and tests for contract validity plus duplicate matching. [VERIFIED: internal/tools/researcher/contracts/sources.ts] [VERIFIED: researcher/schemas/sources.schema.json] [ASSUMED] | Do not add CLI or provider-specific fetch logic yet. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |
| `02-02` Build source add and metadata update flows | Implement shared add/upsert core plus thin add CLI, and keep manifest/source writes synchronized. [VERIFIED: .planning/ROADMAP.md] | Deterministic add/update flow, machine-readable result payload, and tests for create vs duplicate vs metadata update. [VERIFIED: scripts/research-init.ts] [VERIFIED: scripts/research-resume.ts] [ASSUMED] | Do not write evidence bytes or refresh history yet. [VERIFIED: .planning/ROADMAP.md] |
| `02-03` Add evidence capture storage and refresh handling | Implement capture path builders, append-only capture registration, refresh metadata updates, and the thin refresh CLI. [VERIFIED: .planning/ROADMAP.md] | Durable `data/` layout, capture history on source records, stale-source signaling, and tests for coexistence of multiple refresh snapshots. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] | Do not implement downstream stale propagation into insights, analysis, or reports. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |

### Anti-Patterns to Avoid
- **One enum for both workflow and freshness:** The local context already invalidates that model. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **Inline evidence blobs in `sources.json`:** The phase explicitly requires root-relative capture refs under `data/`. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
- **Provider logic in core:** Add/refresh core should not need API keys or fetch clients to pass unit tests. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: researcher/DESIGN.md]
- **In-place snapshot overwrite:** That destroys evidence lineage and makes refresh impossible to audit. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Source ID formatting | Ad hoc string concatenation for `SRC-*` IDs | `formatArtifactId("source", counter)` from the existing manifest contract | Phase 1 already froze the ID strategy and next counters. [VERIFIED: internal/tools/researcher/contracts/manifest.ts] |
| URL parsing and normalization | Regex-based URL cleanup | WHATWG `URL` via `node:url`, then a conservative canonical locator helper | Built-in URL parsing is stable and avoids brittle manual parsing. [CITED: https://nodejs.org/api/url.html] [ASSUMED] |
| Registry file mutation | Direct `JSON.parse` / mutate / `writeFile` scattered across scripts | One shared read/validate/write layer plus `writeJsonAtomically()` | Phase 1 already centralized atomic JSON writes and validator boundaries. [VERIFIED: internal/tools/researcher/fs/write-json-atomically.ts] [VERIFIED: internal/tools/researcher/contracts/validators.ts] |
| URI/date-time format checking | Homegrown regexes or relying on comments | Ajv schema validation plus `ajv-formats` | Ajv documents standard formats through the plugin, and the current validator config does not enforce formats. [CITED: https://ajv.js.org/guide/formats.html] [VERIFIED: internal/tools/researcher/contracts/validators.ts] |
| Temp-workspace filesystem tests | One-off shell scripts for each case | Existing Vitest harness plus `createTemporaryWorkspace()` helper | The repo already has the right test scaffolding for deterministic filesystem flows. [VERIFIED: internal/tools/researcher/__tests__/test-helpers.ts] [VERIFIED: vitest.config.ts] |

**Key insight:** The hard part of Phase 2 is not file writing. It is keeping one inspectable source identity stable across dedupe, metadata updates, capture history, and refresh without letting provider behavior leak into the core. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: researcher/DESIGN.md]

## Common Pitfalls

### Pitfall 1: Assuming `format` Keywords Already Enforce URI and Date-Time Values
**What goes wrong:** Invalid URLs or timestamps can still pass schema validation because the current validator is configured with `validateFormats: false`. [VERIFIED: internal/tools/researcher/contracts/validators.ts]
**Why it happens:** The schema already declares `format: "uri"` and `format: "date-time"`, so it looks stricter than it is. [VERIFIED: researcher/schemas/sources.schema.json]
**How to avoid:** Add `ajv-formats` or replace those schema keywords with explicit core validation before trusting file-boundary validation for canonical locators and timestamps. [CITED: https://ajv.js.org/guide/formats.html] [ASSUMED]
**Warning signs:** Bad timestamps such as `"not-a-date"` or malformed URLs continue to round-trip through tests without validator failures. [VERIFIED: internal/tools/researcher/contracts/validators.ts] [ASSUMED]

### Pitfall 2: Dedupe on Raw URL Strings
**What goes wrong:** The same source gets multiple `SRC-*` IDs because one add uses a tracked URL and another uses a cleaner canonical form. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]
**Why it happens:** The current schema has only `url`; it has no explicit canonical dedupe key yet. [VERIFIED: researcher/schemas/sources.schema.json]
**How to avoid:** Normalize one canonical locator before lookup and persist it on the record so create vs update decisions are inspectable. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]
**Warning signs:** `manifest.next_ids.source` grows faster than the unique source set, and repeated titles show up with near-identical URLs. [VERIFIED: internal/tools/researcher/contracts/manifest.ts] [ASSUMED]

### Pitfall 3: Singular Snapshot Fields
**What goes wrong:** Refresh ends up replacing the previous capture path, so there is no durable evidence history to compare or audit. [VERIFIED: internal/tools/researcher/contracts/sources.ts] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
**Why it happens:** The current `snapshot_path` field models only one capture. [VERIFIED: internal/tools/researcher/contracts/sources.ts]
**How to avoid:** Replace the singular field with append-only capture refs and a separate `latest_capture_path` convenience pointer. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]
**Warning signs:** A second refresh changes one path string but leaves no trace of the prior capture on disk or in the registry. [ASSUMED]

### Pitfall 4: Letting Network or Search Logic Leak Into Core
**What goes wrong:** Source add/refresh tests require live HTTP calls, API keys, or provider mocks, and the durable contract becomes coupled to one runtime backend. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED]
**Why it happens:** It is tempting to mix fetch, normalization, and registry mutation into one helper. [VERIFIED: researcher/DESIGN.md] [ASSUMED]
**How to avoid:** Keep core APIs focused on validated inputs and file mutations; let future runtime agents or providers gather bytes before calling the core. [VERIFIED: researcher/DESIGN.md] [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md]
**Warning signs:** Core tests start mocking HTTP clients, or CLI flags begin requiring provider config instead of just source/capture metadata. [ASSUMED]

## Code Examples

Verified patterns from official and local sources:

### Allocate Stable `SRC-*` IDs From The Existing Counter
```typescript
// Source: internal/tools/researcher/contracts/manifest.ts
import { formatArtifactId } from "../contracts/manifest";

export function allocateSourceId(nextCounter: number): string {
  return formatArtifactId("source", nextCounter);
}
```

### Keep CLI Entry Points Thin
```typescript
// Source: scripts/research-init.ts / scripts/research-resume.ts
async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await core(argumentsResult);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
```

### Use Root-Confined Paths For Capture Writes
```typescript
// Source: internal/tools/researcher/fs/workspace-paths.ts + Phase 2 layout recommendation
const relativePath =
  `data/snapshots/${sourceId}/${captureStamp}/source.html`;
const absolutePath = await resolveWorkspacePath(projectRoot, slug, relativePath);
```

### Add Standard Schema Formats Explicitly
```typescript
// Source: https://ajv.js.org/guide/formats.html
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treat `format` as an automatically enforced schema rule | Draft 2020-12 separates format vocabularies, and Ajv uses explicit format support rather than silently validating everything by default | JSON Schema Draft 2020-12 and current Ajv guidance [CITED: https://json-schema.org/draft/2020-12/json-schema-validation] [CITED: https://ajv.js.org/guide/formats.html] | Planner must explicitly add format enforcement or equivalent core validation. [CITED: https://ajv.js.org/guide/formats.html] |
| Single `snapshot_path` per source | Append-only capture history plus latest-pointer metadata | Locked by Phase 2 context on 2026-04-11 [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] | Refresh can preserve lineage instead of replacing evidence in place. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |
| One status enum mixing workflow and freshness | Workflow status plus explicit freshness side state | Locked by Phase 2 context on 2026-04-11 [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] | `quoted` and `stale` can coexist without semantic hacks. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |

**Deprecated/outdated:**
- Relying on `validateFormats: false` while expecting `format: "uri"` and `format: "date-time"` to reject bad values is outdated for this phase. [VERIFIED: internal/tools/researcher/contracts/validators.ts] [VERIFIED: researcher/schemas/sources.schema.json] [CITED: https://ajv.js.org/guide/formats.html]
- Keeping `credibility` as the only trust field is outdated relative to the locked Phase 2 requirement language that asks for `confidence`. [VERIFIED: researcher/schemas/sources.schema.json] [VERIFIED: .planning/REQUIREMENTS.md] [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The explicit dedupe field should be named `canonical_url`. | Architecture Patterns | Low: rename-only churn across schema, tests, and CLI flags. |
| A2 | `status` should hold the primary lifecycle and `side_states` should hold `rejected`, `stale`, and `superseded`. | Summary; Architecture Patterns | Medium: if planner keeps one enum, refresh semantics become awkward and may require a later contract rewrite. |
| A3 | Source metadata should include `last_checked_at`, `created_at`, and `updated_at` in addition to `accessed_at`. | Architecture Patterns | Low: these can be trimmed before implementation if the planner wants a smaller contract. |
| A4 | Capture history should use `captures[]` plus `latest_capture_path`, replacing the singular `snapshot_path`. | Summary; Architecture Patterns | Medium: if planner keeps one path, refresh lineage will be underspecified. |
| A5 | `add-source` should remain provider-neutral and allow metadata-only source creation with `accessed_at: null` until a capture is recorded. | Architecture Patterns; Open Questions | Medium: if add must always fetch, Phase 2 scope expands into provider integration. |
| A6 | Adding `ajv-formats` is the cleanest fix for the current format-validation gap. | Standard Stack; Common Pitfalls | Low: equivalent explicit core validation is possible, but planner must choose one path. |

## Open Questions (RESOLVED)

1. **Should `research-source-refresh` write capture bytes itself, or only register already-written files?**
   - Resolution: Phase 2 should include a small provider-neutral capture writer for text or file payloads so the core can durably store evidence under `data/` without depending on any specific web-fetch backend. Outbound HTTP fetching and provider integrations still remain outside the shared core boundary. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [VERIFIED: researcher/DESIGN.md]
   - Planning impact: `02-03` should own append-only capture writes plus registry updates, while keeping provider/search logic outside `internal/tools/researcher/core`.

2. **Should Phase 2 rename `credibility` to `confidence` in one edit, or carry both for compatibility?**
   - Resolution: Rename the trust field to `confidence` in `02-01` and update the local schema, tests, and docs in the same plan. There is no in-repo consumer that justifies carrying both names in parallel. [VERIFIED: researcher/schemas/sources.schema.json] [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: rg search in `internal/tools/researcher`, `scripts`, and `researcher/` on 2026-04-11]
   - Planning impact: `02-01` should make one contract edit and treat `confidence` as the canonical Phase 2 field everywhere downstream.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Core scripts, tests, and file mutation | ✓ | `20.19.4` | Avoid Node-24-only APIs unless runtime is upgraded. [VERIFIED: local runtime] |
| pnpm | Repo-standard install and verification commands | ✓ | `10.31.0` | None; repo workflow is pnpm-first. [VERIFIED: local runtime] [VERIFIED: package.json] |
| npm | Registry version verification during planning/research | ✓ | `10.8.2` | None needed during implementation. [VERIFIED: local runtime] |
| ffmpeg | Not required for Phase 2 | ✓ | `8.0` | Not applicable. [VERIFIED: local runtime] |

**Missing dependencies with no fallback:**
- None. [VERIFIED: local runtime]

**Missing dependencies with fallback:**
- Local Node is below the project’s recommended `24.x` target, but the existing Phase 1 code and tests run on `20.19.4`; planner should avoid a Node-baseline upgrade as part of Phase 2 unless new APIs demand it. [VERIFIED: AGENTS.md] [VERIFIED: local runtime] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-VERIFICATION.md]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest 4.1.4` [VERIFIED: local runtime] |
| Config file | `vitest.config.ts` [VERIFIED: vitest.config.ts] |
| Quick run command | `pnpm exec vitest run internal/tools/researcher/__tests__/sources-contract.spec.ts internal/tools/researcher/__tests__/source-add.spec.ts internal/tools/researcher/__tests__/source-refresh.spec.ts` [ASSUMED] |
| Full suite command | `pnpm exec vitest run` [VERIFIED: vitest.config.ts] |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRC-01 | Add a source once, dedupe the second add, keep one stable `SRC-*` record | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/source-add.spec.ts -x` | ❌ Wave 0 |
| SRC-02 | Persist origin, type, confidence, status, and timestamp metadata in a schema-valid record | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/sources-contract.spec.ts -x` | ❌ Wave 0 |
| SRC-03 | Write captures under `data/` and store root-relative refs in the registry | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/source-refresh.spec.ts -x` | ❌ Wave 0 |
| SRC-04 | Refresh appends history, marks stale source state, and preserves source identity | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/source-refresh.spec.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm exec vitest run internal/tools/researcher/__tests__/sources-contract.spec.ts internal/tools/researcher/__tests__/source-add.spec.ts internal/tools/researcher/__tests__/source-refresh.spec.ts`
- **Per wave merge:** `pnpm exec vitest run`
- **Phase gate:** `pnpm typecheck && pnpm exec vitest run`

### Wave 0 Gaps
- [ ] `internal/tools/researcher/__tests__/sources-contract.spec.ts` - schema and type coverage for the Phase 2 source record contract
- [ ] `internal/tools/researcher/__tests__/source-add.spec.ts` - add/update/dedupe and manifest counter synchronization
- [ ] `internal/tools/researcher/__tests__/source-refresh.spec.ts` - capture path layout, append-only refresh, and stale-state behavior
- [ ] Extend `internal/tools/researcher/__tests__/resume.spec.ts` - verify resume still reports correct source inventory and next action after Phase 2 schema expansion

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not in scope for file-local source registry mutation. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |
| V3 Session Management | no | Not in scope for file-local source registry mutation. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] |
| V4 Access Control | no | Workspace confinement is path-based, not user/role based, in this phase. [VERIFIED: internal/tools/researcher/fs/workspace-paths.ts] |
| V5 Input Validation | yes | Ajv schema validation, conservative URL normalization, and root-confined path resolution. [VERIFIED: internal/tools/researcher/contracts/validators.ts] [VERIFIED: internal/tools/researcher/fs/workspace-paths.ts] [ASSUMED] |
| V6 Cryptography | no | No phase requirement currently needs cryptographic storage or transport controls. [VERIFIED: .planning/REQUIREMENTS.md] |

### Known Threat Patterns for This Stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal or symlink escape through capture paths | Tampering | Reuse `resolveWorkspacePath()` and existing symlink rejection for every capture write. [VERIFIED: internal/tools/researcher/fs/workspace-paths.ts] |
| Malformed or hostile registry JSON | Tampering | Validate every persisted document through the shared Ajv boundary before accepting it. [VERIFIED: internal/tools/researcher/contracts/validators.ts] |
| Duplicate-source poisoning via slightly different locators | Tampering | Normalize one canonical locator and compare against it before allocating a new ID. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |
| Evidence lineage loss from overwrite-in-place refresh | Repudiation | Append capture history and keep prior capture files on disk. [VERIFIED: .planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md] [ASSUMED] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md` - locked decisions, scope, and planner discretion for Phase 2
- `.planning/REQUIREMENTS.md` - `SRC-01` through `SRC-04`
- `.planning/ROADMAP.md` - required three-plan split and phase success criteria
- `.planning/phases/01-research-workspace-bootstrap/01-RESEARCH.md` - inherited public-registry and thin-core decisions
- `.planning/phases/01-research-workspace-bootstrap/01-VERIFICATION.md` - verified current Phase 1 implementation status
- `researcher/README.md` - product layout and fidelity ladder
- `researcher/CONTRACTS.md` - current source-registry contract guidance
- `researcher/ARTIFACT-MODEL.md` - `data/` layout and lineage model
- `researcher/WORKFLOWS.md` - harvest/refresh/status intent
- `researcher/DESIGN.md` - thin core / thin adapter guidance
- `researcher/schemas/sources.schema.json` - current public registry schema
- `internal/tools/researcher/contracts/sources.ts` - current Phase 1 source envelope
- `internal/tools/researcher/contracts/validators.ts` - current Ajv validator boundary
- `internal/tools/researcher/contracts/manifest.ts` - current `SRC-*` counter and ID helpers
- `internal/tools/researcher/fs/workspace-paths.ts` - path confinement and symlink protection
- `internal/tools/researcher/fs/write-json-atomically.ts` - atomic JSON writes
- `internal/tools/researcher/core/init.ts` - current thin-core initialization pattern
- `internal/tools/researcher/core/resume.ts` - current disk-only consumer of `sources.json`
- `scripts/research-init.ts` and `scripts/research-resume.ts` - current thin CLI pattern
- `vitest.config.ts` and `internal/tools/researcher/__tests__/test-helpers.ts` - current test harness
- https://ajv.js.org/guide/formats.html - Ajv format validation guidance
- https://json-schema.org/draft/2020-12/json-schema-validation - JSON Schema 2020-12 validation vocabularies
- https://nodejs.org/api/url.html - WHATWG URL parsing in Node.js
- npm registry metadata for `ajv`, `ajv-formats`, `vitest`, `tsx`, and `typescript`

### Secondary (MEDIUM confidence)
- None. All non-local external claims were verified against official documentation or the npm registry.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - The recommended libraries are either already installed and in active use or verified against official docs and the npm registry.
- Architecture: MEDIUM - The need for dedupe keys, append-only capture refs, and thin add/refresh cores is strongly verified, but some exact field names and submodule boundaries are discretionary.
- Pitfalls: HIGH - The main pitfalls are directly visible in the current Phase 1 code or explicitly called out by the Phase 2 context.

**Research date:** 2026-04-11
**Valid until:** 2026-05-11
