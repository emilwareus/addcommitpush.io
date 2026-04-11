---
phase: 03-insights-analysis-graph
plan: 01
subsystem: insight-analysis-contracts
tags: [researcher, insights, analysis, markdown, schemas]
requires: []
provides:
  - canonical `INS-*` and `ANL-*` frontmatter schemas
  - shared Markdown parse/render boundary
  - deterministic insight duplicate-fingerprint primitives
affects: [03-02, 03-03, researcher]
tech-stack:
  added: [gray-matter]
  patterns:
    - schema-first artifact validation
    - one shared Markdown parser for both artifact kinds
    - deterministic render paths for tool-owned documents
key-files:
  created:
    - researcher/templates/ANALYSIS.md
    - researcher/schemas/insight-frontmatter.schema.json
    - researcher/schemas/analysis-frontmatter.schema.json
    - internal/tools/researcher/contracts/insights.ts
    - internal/tools/researcher/contracts/analysis.ts
    - internal/tools/researcher/core/artifacts/markdown.ts
    - internal/tools/researcher/core/insights/dedupe.ts
    - internal/tools/researcher/__tests__/insight-contract.spec.ts
    - internal/tools/researcher/__tests__/analysis-contract.spec.ts
    - .planning/phases/03-insights-analysis-graph/03-01-SUMMARY.md
  modified:
    - package.json
    - pnpm-lock.yaml
    - researcher/templates/INSIGHT.md
    - internal/tools/researcher/contracts/validators.ts
key-decisions:
  - "Use `gray-matter` only for frontmatter parsing, then enforce the artifact contract with Ajv plus a fixed-heading parser rather than a full Markdown AST stack."
  - "Keep insight evidence and frontmatter lineage equal by contract: `derived_from_sources` must match the `Evidence` section source IDs."
  - "Allow single-insight analysis only through explicit `transitional_scaffold: true`; otherwise require at least two linked insights."
patterns-established:
  - "Canonical artifact files are Markdown-first, schema-validated, and rendered deterministically by shared core code."
  - "Duplicate insight detection starts from normalized title, claim, and source lineage instead of provider-specific semantic matching."
requirements-completed: [INS-01, INS-02, INS-03, INS-04]
duration: 14min
completed: 2026-04-11
---

# Phase 03 Plan 01: Insight and Analysis Contract Summary

**Locked the canonical `INS-*` and `ANL-*` Markdown contracts, added one shared parse/render boundary, and froze deterministic duplicate-detection inputs for later upsert flows.**

## Performance

- **Duration:** 14 min
- **Completed:** 2026-04-11T09:43:30Z
- **Files modified:** 13

## Accomplishments

- Added frontmatter schemas and typed contracts for both insight and analysis artifacts, including stable IDs, shared status/confidence vocabularies, and explicit lineage fields.
- Added `internal/tools/researcher/core/artifacts/markdown.ts` to parse YAML frontmatter, validate metadata through Ajv, enforce exact heading order, and render canonical Markdown back to disk.
- Added deterministic duplicate-fingerprint helpers for insight title, claim, and source lineage normalization.
- Added focused contract tests covering valid artifacts, malformed IDs/timestamps, missing sections, section-order drift, evidence/frontmatter mismatch, and the D-40 scaffold exception.

## Verification

- `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts`
- `pnpm typecheck`
- `pnpm lint`

## Notes

- `pnpm lint` completed with the same two pre-existing warnings outside the Researcher surface:
  - `components/presentations/deep-research/slides/02-group-project.tsx`
  - `components/presentations/voice-agents/jarvis/jarvis-sidebar.tsx`

## Next Readiness

- Plan `03-02` can now promote `SRC-*` evidence into canonical insights without inventing its own parser or lineage rules.
- Plan `03-03` can reuse the same artifact boundary to keep contradiction-aware analysis and insight backlinks deterministic.
