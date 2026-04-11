---
phase: 03-insights-analysis-graph
verified: 2026-04-11T00:53:30Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 3: Insights & Analysis Graph Verification Report

**Phase Goal:** Users can turn sourced evidence into reusable insights and higher-order analysis with explicit lineage.
**Verified:** 2026-04-11T00:53:30Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | User can create insight artifacts with stable IDs. | ✓ VERIFIED | `internal/tools/researcher/core/insights/upsert.ts` allocates `INS-*` from `manifest.next_ids.insight`, preserves IDs on update, and syncs `inventory.insights`; create/update and CLI output are covered in `internal/tools/researcher/__tests__/insight-upsert.spec.ts`. |
| 2 | Each insight visibly links to one or more supporting source records. | ✓ VERIFIED | `internal/tools/researcher/core/artifacts/markdown.ts` rejects `derived_from_sources` and `Evidence` drift, and `internal/tools/researcher/core/insights/backlinks.ts` reconciles `sources.json[*].linked_insights`; covered by `internal/tools/researcher/__tests__/insight-contract.spec.ts` and `internal/tools/researcher/__tests__/insight-lineage.spec.ts`. |
| 3 | User can group multiple insights into higher-order analysis artifacts. | ✓ VERIFIED | `internal/tools/researcher/core/analysis/upsert.ts` allocates `ANL-*`, verifies referenced `INS-*` files exist, writes canonical Markdown under `analysis/`, and syncs `inventory.analysis`; covered by `internal/tools/researcher/__tests__/analysis-upsert.spec.ts`. |
| 4 | Analysis artifacts surface contradictions, caveats, and unresolved questions. | ✓ VERIFIED | `researcher/templates/ANALYSIS.md`, `researcher/schemas/analysis-frontmatter.schema.json`, and `internal/tools/researcher/core/artifacts/markdown.ts` make `Contradictions`, `Caveats`, `Open Questions`, and `Next Moves` required ordered sections; covered by `internal/tools/researcher/__tests__/analysis-contract.spec.ts`. |
| 5 | Insight and analysis artifacts are schema-validated Markdown contracts before later writes reuse them. | ✓ VERIFIED | `researcher/schemas/insight-frontmatter.schema.json`, `researcher/schemas/analysis-frontmatter.schema.json`, `internal/tools/researcher/contracts/insights.ts`, and `internal/tools/researcher/contracts/analysis.ts` freeze the contracts, while `internal/tools/researcher/contracts/validators.ts` compiles both schemas through the shared Ajv boundary. |
| 6 | One shared parser rejects malformed frontmatter, missing sections, section-order drift, and lineage mismatches. | ✓ VERIFIED | `internal/tools/researcher/core/artifacts/markdown.ts` provides the only parse/render path for both artifact kinds and throws on malformed IDs, section-order drift, empty required sections, and source/evidence mismatches; contract tests exercise those failure paths. |
| 7 | Obvious duplicate insights are rejected deterministically before a second file appears or the insight counter advances. | ✓ VERIFIED | `internal/tools/researcher/core/insights/upsert.ts` runs `assertNoDuplicateInsight()` before ID allocation/write/persist, and `internal/tools/researcher/__tests__/insight-lineage.spec.ts` proves duplicate rejection for the implemented normalized title+claim+overlapping-source case. |
| 8 | Insight backlinks and disk-only resume stay correct after Phase 3 analysis artifacts land on disk. | ✓ VERIFIED | `internal/tools/researcher/core/analysis/backlinks.ts` rewrites `linked_analysis` through the shared parser, and `internal/tools/researcher/__tests__/resume.spec.ts` proves `package-report` routing with sources+insights+analysis present and `refresh-sources` routing when stale debt exists. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `researcher/templates/INSIGHT.md` and `researcher/templates/ANALYSIS.md` | Canonical Phase 3 Markdown shapes | ✓ VERIFIED | 37 and 41 lines; both define the required top-level/frontmatter fields and fixed section order used by the parser. |
| `researcher/schemas/insight-frontmatter.schema.json` and `researcher/schemas/analysis-frontmatter.schema.json` | Frozen frontmatter contracts | ✓ VERIFIED | 77 and 72 lines; both enforce ID patterns, status/confidence enums, lineage arrays, timestamps, and `additionalProperties: false`. |
| `internal/tools/researcher/contracts/insights.ts` and `internal/tools/researcher/contracts/analysis.ts` | Typed frontmatter and parsed-document interfaces | ✓ VERIFIED | Export the shared status/confidence vocabularies plus frontmatter/section/parsed-document types used by the parser and upsert flows. |
| `internal/tools/researcher/contracts/validators.ts` | Shared Ajv validation boundary | ✓ VERIFIED | Compiles manifest, sources, insight frontmatter, and analysis frontmatter schemas through one Ajv 2020 instance. |
| `internal/tools/researcher/core/artifacts/markdown.ts` | Shared parse/render boundary for canonical artifacts | ✓ VERIFIED | 457 lines; parses YAML frontmatter with `gray-matter`, validates schemas, enforces exact `##` heading order, and renders deterministic Markdown. |
| `internal/tools/researcher/core/insights/dedupe.ts` | Deterministic fingerprint helpers | ✓ VERIFIED | 32 lines; normalizes title text, claim text, and sorted unique source IDs for conservative duplicate detection. |
| `internal/tools/researcher/core/insights/upsert.ts` and `internal/tools/researcher/core/insights/backlinks.ts` | Deterministic insight create/update plus source backlink sync | ✓ VERIFIED | 386 and 73 lines; reuse the Phase 2 source store, validate source existence, write canonical files, reconcile `linked_insights`, and sync manifest counters. |
| `scripts/research-insight.ts` | Thin JSON-only insight entrypoint | ✓ VERIFIED | 172 lines; argv parsing only, then delegates to `upsertInsight()` and prints `JSON.stringify(result)`. |
| `internal/tools/researcher/core/analysis/upsert.ts` and `internal/tools/researcher/core/analysis/backlinks.ts` | Deterministic analysis create/update plus insight backlink sync | ✓ VERIFIED | 342 and 123 lines; verify `INS-*` existence, write canonical analyses, reconcile `linked_analysis`, and sync manifest counters. |
| `scripts/research-analysis.ts` and `internal/tools/researcher/core/resume.ts` | Thin analysis entrypoint plus resume compatibility | ✓ VERIFIED | 168 and 254 lines; JSON-only CLI wrapper over `upsertAnalysis()`, and resume logic that counts disk artifacts and routes `extract` work to `package-report` or `refresh-sources`. |
| `internal/tools/researcher/__tests__/insight-contract.spec.ts`, `internal/tools/researcher/__tests__/analysis-contract.spec.ts`, `internal/tools/researcher/__tests__/insight-upsert.spec.ts`, `internal/tools/researcher/__tests__/insight-lineage.spec.ts`, `internal/tools/researcher/__tests__/analysis-upsert.spec.ts`, and `internal/tools/researcher/__tests__/resume.spec.ts` | Phase 3 verification evidence in code | ✓ VERIFIED | 1,616 lines of scoped tests cover contract parsing, invalid artifacts, create/update flows, backlink reconciliation, CLI smoke paths, and resume routing. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `internal/tools/researcher/contracts/validators.ts` | `researcher/schemas/insight-frontmatter.schema.json` and `researcher/schemas/analysis-frontmatter.schema.json` | Ajv `compile()` imports | ✓ WIRED | The new artifact schemas are compiled in the same validator module as manifest and sources, not through a second validation path. |
| `internal/tools/researcher/core/artifacts/markdown.ts` | `internal/tools/researcher/contracts/validators.ts` | `validateInsightFrontmatter()` and `validateAnalysisFrontmatter()` | ✓ WIRED | The parser validates metadata before returning parsed documents or rendering canonical output. |
| `internal/tools/researcher/core/insights/upsert.ts` | `internal/tools/researcher/core/sources/store.ts` | `loadSourceStore()` and `persistSourceStore()` | ✓ WIRED | Insight promotion reuses the existing manifest/sources persistence boundary instead of writing separate state files. |
| `internal/tools/researcher/core/insights/upsert.ts` | `internal/tools/researcher/core/insights/backlinks.ts` | `reconcileSourceInsightBacklinks()` | ✓ WIRED | Source backlinks are reconciled in the same write path after the canonical insight document is built. |
| `internal/tools/researcher/core/analysis/upsert.ts` | `internal/tools/researcher/core/analysis/backlinks.ts` | `reconcileInsightAnalysisBacklinks()` | ✓ WIRED | Analysis creation/update reconciles removed and added insight backlinks from forward lineage. |
| `internal/tools/researcher/core/analysis/backlinks.ts` | `internal/tools/researcher/core/artifacts/markdown.ts` | `parseInsightArtifact()` and `renderInsightArtifact()` | ✓ WIRED | Insight backlink updates reuse the shared artifact parser/render path rather than ad hoc frontmatter edits. |
| `scripts/research-insight.ts` and `scripts/research-analysis.ts` | `internal/tools/researcher/core/insights/upsert.ts` and `internal/tools/researcher/core/analysis/upsert.ts` | direct imports + `JSON.stringify(result)` | ✓ WIRED | Both runtime entrypoints remain thin wrappers over shared core logic and emit deterministic machine-readable output only. |
| `internal/tools/researcher/__tests__/resume.spec.ts` | `internal/tools/researcher/core/resume.ts` | real workspace fixtures using `upsertInsight()` and `upsertAnalysis()` | ✓ WIRED | Resume tests route through the actual Phase 3 artifact writers before asserting inventory and next-action behavior. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `internal/tools/researcher/core/insights/upsert.ts` | `nextDocument.frontmatter.derived_from_sources` and `sourceIds` result | CLI/core input -> `normalizeUpsertInsightInput()` -> `loadSourceStore()` -> `renderInsightArtifact()` -> `reconcileSourceInsightBacklinks()` | Yes | ✓ FLOWING |
| `internal/tools/researcher/core/analysis/upsert.ts` | `nextDocument.frontmatter.derived_from_insights` and `insightIds` result | CLI/core input -> `assertReferencedInsightsExist()` parses `insights/*.md` -> `renderAnalysisArtifact()` -> `reconcileInsightAnalysisBacklinks()` | Yes | ✓ FLOWING |
| `internal/tools/researcher/core/analysis/backlinks.ts` | `linked_analysis` on each insight frontmatter | Parsed on-disk insight Markdown -> updated frontmatter -> `renderInsightArtifact()` writeback | Yes | ✓ FLOWING |
| `internal/tools/researcher/core/resume.ts` | `inventory` and `nextRecommendedAction` | `manifest.json` + `sources.json` + recursive disk counts for `insights/`, `analysis/`, and `reports/` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| `research-insight` prints deterministic JSON | `pnpm exec tsx scripts/research-insight.ts ...` | Not executed per request; static smoke coverage in `internal/tools/researcher/__tests__/insight-upsert.spec.ts` asserts `operation`, `insightId`, `path`, and sorted `sourceIds`. | ? SKIP |
| `research-analysis` prints deterministic JSON | `pnpm exec tsx scripts/research-analysis.ts ...` | Not executed per request; static smoke coverage in `internal/tools/researcher/__tests__/analysis-upsert.spec.ts` asserts `operation`, `analysisId`, `path`, and sorted `insightIds`. | ? SKIP |
| Resume routes Phase 3 work correctly | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts` | Not executed per request; code-level evidence shows tests for `package-report` when analysis exists and `refresh-sources` when stale debt exists. | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| INS-01 | `03-01`, `03-02` | User can promote gathered material into reusable insight artifacts with stable IDs. | ✓ SATISFIED | `internal/tools/researcher/core/insights/upsert.ts` allocates stable `INS-*` IDs and preserves them on update; `internal/tools/researcher/__tests__/insight-upsert.spec.ts` covers create/update and CLI output. |
| INS-02 | `03-01`, `03-02` | User can link each insight to one or more supporting source records. | ✓ SATISFIED | `internal/tools/researcher/core/artifacts/markdown.ts` enforces `derived_from_sources` == `Evidence` source IDs, and `internal/tools/researcher/core/insights/backlinks.ts` synchronizes `sources.json[*].linked_insights`. |
| INS-03 | `03-01`, `03-03` | User can group multiple insights into higher-order analysis artifacts. | ✓ SATISFIED | `internal/tools/researcher/core/analysis/upsert.ts` allocates `ANL-*`, requires linked `INS-*` inputs, and writes canonical analyses; `internal/tools/researcher/__tests__/analysis-upsert.spec.ts` covers create/update flows. |
| INS-04 | `03-01`, `03-03` | User can inspect contradictions, caveats, or unresolved questions in analysis artifacts. | ✓ SATISFIED | `researcher/templates/ANALYSIS.md` plus `internal/tools/researcher/core/artifacts/markdown.ts` require explicit `Contradictions`, `Caveats`, and `Open Questions` sections; `internal/tools/researcher/__tests__/analysis-contract.spec.ts` covers the contract. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `internal/tools/researcher/__tests__/insight-lineage.spec.ts` | 134 | Duplicate-coverage scope is narrower than the full plan prose | ℹ️ Info | The test proves deterministic rejection for the implemented normalized title+claim+source-overlap case, but does not separately cover every heuristic variant described in the task action. |

### Gaps Summary

No blocking gaps found in the scoped Phase 03 implementation. The artifact contracts, shared parser, insight promotion flow, source backlink sync, analysis synthesis flow, insight backlink sync, and disk-only resume routing are all present, substantive, and wired through shared tooling.

Behavioral execution was not re-run because the request prioritized file-based evidence. Within that constraint, the code and scoped tests support the Phase 3 goal and all four `INS-*` requirements.

---

_Verified: 2026-04-11T00:53:30Z_
_Verifier: Codex (gsd-verifier)_
