---
phase: 03
slug: insights-analysis-graph
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-11
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/insight-upsert.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts internal/tools/researcher/__tests__/analysis-upsert.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` |
| **Full suite command** | `pnpm exec vitest run` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/insight-upsert.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts internal/tools/researcher/__tests__/analysis-upsert.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- **After every plan wave:** Run `pnpm exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | INS-01, INS-02 | T-03-01 | Insight and analysis contracts reject invalid IDs, malformed frontmatter metadata, missing fixed sections, and evidence/body lineage drift before disk mutation. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | INS-01, INS-02 | T-03-01 | One shared Markdown parser validates both artifact kinds, enforces exact heading order, and produces deterministic duplicate-fingerprint inputs without alternate parsing paths. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | INS-01, INS-02 | T-03-02 | Insight promotion allocates stable `INS-*` IDs, links one or more supporting `SRC-*` records, and reconciles `sources.json[*].linked_insights` through shared core tooling. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-upsert.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | INS-01, INS-02 | T-03-02 | The `research-insight` runtime entrypoint remains a thin JSON-only wrapper over shared core logic, rejects invalid lineage inputs, and does not bypass duplicate or backlink guards. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-upsert.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | INS-03, INS-04 | T-03-03 | Analysis creation allocates stable `ANL-*` IDs, groups insight IDs, persists contradictions/caveats/open questions as first-class artifact content, and syncs insight backlinks. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/analysis-upsert.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | INS-03, INS-04 | T-03-04 | Resume still reports correct source, insight, and analysis inventory plus next-action routing after Phase 3 artifact contracts land. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `internal/tools/researcher/__tests__/insight-contract.spec.ts` — frontmatter parsing, fixed-section validation, evidence/source equality, and duplicate-normalization coverage
- [ ] `internal/tools/researcher/__tests__/insight-upsert.spec.ts` — insight ID allocation, file writes, manifest inventory sync, and update behavior
- [ ] `internal/tools/researcher/__tests__/insight-lineage.spec.ts` — source backlink add/remove reconciliation and missing-source rejection
- [ ] `internal/tools/researcher/__tests__/analysis-contract.spec.ts` — required question/contradiction/caveat/open-question sections and insight-set validation
- [ ] `internal/tools/researcher/__tests__/analysis-upsert.spec.ts` — `ANL-*` ID allocation, insight backlink sync, and update reconciliation
- [ ] Extend `internal/tools/researcher/__tests__/resume.spec.ts` — prove resume still works after Phase 3 insight and analysis artifacts land

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Insight and analysis Markdown artifacts stay readable and auditable for a human operator | INS-01, INS-03, INS-04 | This is partly about structure and legibility, not only machine validation | Create a sample insight and analysis, inspect the Markdown files directly, and confirm the source lineage, contradictions, caveats, and open questions are easy to scan without special tooling |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 25s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
