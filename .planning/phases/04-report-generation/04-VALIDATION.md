---
phase: 04
slug: report-generation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-11
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run internal/tools/researcher/__tests__/report-contract.spec.ts internal/tools/researcher/__tests__/report-upsert.spec.ts internal/tools/researcher/__tests__/report-lineage.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` |
| **Full suite command** | `pnpm exec vitest run` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run internal/tools/researcher/__tests__/report-contract.spec.ts internal/tools/researcher/__tests__/report-upsert.spec.ts internal/tools/researcher/__tests__/report-lineage.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- **After every plan wave:** Run `pnpm exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | RPT-01, RPT-03 | T-04-01 | Report contracts reject invalid IDs, malformed frontmatter, missing fixed sections, and malformed analysis/insight/source reference sections before disk mutation. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/report-contract.spec.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | RPT-01, RPT-03 | T-04-01 | The shared Markdown boundary parses and renders report artifacts through the same deterministic path as insights and analyses, without alternate parsing paths. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/report-contract.spec.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | RPT-01, RPT-02 | T-04-02 | Report upsert allocates stable `RPT-*` IDs, writes canonical Markdown under `reports/`, syncs manifest inventory, and reconciles `linked_reports` on referenced analyses and insights. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/report-upsert.spec.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | RPT-01, RPT-02 | T-04-02 | The `research-report` entrypoint remains a thin JSON-only wrapper and does not bypass report ID allocation, backlink sync, or explicit input-set rules. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/report-upsert.spec.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | RPT-03 | T-04-03 | Report lineage rendering resolves `ANL-*`, `INS-*`, and `SRC-*` into explicit terminal reference sections without adding a parallel provenance index. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/report-lineage.spec.ts` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 3 | RPT-02, RPT-03 | T-04-04 | Resume still counts reports from disk and routes to `review-existing-reports` once reports exist, while stale-source debt remains higher priority. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `internal/tools/researcher/__tests__/report-contract.spec.ts` — report frontmatter parsing, fixed-section validation, and malformed lineage-reference coverage
- [ ] `internal/tools/researcher/__tests__/report-upsert.spec.ts` — report ID allocation, file writes, manifest inventory sync, backlink reconciliation, and CLI behavior
- [ ] `internal/tools/researcher/__tests__/report-lineage.spec.ts` — analysis/insight/source reference rendering and direct-source traceability coverage
- [ ] Extend `internal/tools/researcher/__tests__/resume.spec.ts` — prove resume recognizes report presence and routes to `review-existing-reports`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Report artifacts stay readable as publishable Markdown while still exposing lineage clearly | RPT-01, RPT-03 | This is partly about clarity and writing ergonomics, not only machine validation | Generate a sample report, inspect `reports/RPT-*.md` directly, and confirm the main narrative reads cleanly while the terminal lineage sections remain easy to scan |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 25s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
