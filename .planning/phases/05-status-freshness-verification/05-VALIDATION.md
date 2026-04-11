---
phase: 05
slug: status-freshness-verification
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-11
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run internal/tools/researcher/__tests__/status-contract.spec.ts internal/tools/researcher/__tests__/status-summary.spec.ts internal/tools/researcher/__tests__/freshness-propagation.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` |
| **Full suite command** | `pnpm exec vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run internal/tools/researcher/__tests__/status-contract.spec.ts internal/tools/researcher/__tests__/status-summary.spec.ts internal/tools/researcher/__tests__/freshness-propagation.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- **After every plan wave:** Run `pnpm exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | RSCH-02, STAT-02 | T-05-01 | Manifest, insight, and report health contracts reject malformed verification/debt metadata before any status or propagation logic consumes it. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/status-contract.spec.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | RSCH-02, STAT-01 | T-05-01 | One typed status-summary contract exists and remains the only public read shape for `/research-status`. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/status-contract.spec.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | STAT-01, STAT-02 | T-05-02 | Status summary derives one primary next action plus explicit freshness/verification debt from canonical files only. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/status-summary.spec.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | RSCH-02, STAT-01 | T-05-02 | `research-status` remains a thin JSON-only wrapper and does not bypass deterministic debt aggregation or routing logic. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/status-summary.spec.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 3 | STAT-03, STAT-02 | T-05-03 | Source refresh propagates stale/fresh changes into dependent insights and reports while impacted analyses remain derived, not silently dropped. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/freshness-propagation.spec.ts` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 3 | STAT-01, STAT-03 | T-05-04 | Resume/status routing keeps stale debt higher priority than downstream review/regeneration actions. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `internal/tools/researcher/__tests__/status-contract.spec.ts` — manifest/insight/report health contract parsing and validation coverage
- [ ] `internal/tools/researcher/__tests__/status-summary.spec.ts` — debt aggregation, impacted-ID summaries, next-action routing, and CLI output coverage
- [ ] `internal/tools/researcher/__tests__/freshness-propagation.spec.ts` — stale/fresh propagation through insights/reports and impacted-analysis surfacing
- [ ] Extend `internal/tools/researcher/__tests__/resume.spec.ts` — prove stale debt priority still wins once downstream impact surfaces grow richer

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Status output reads like a decisive progress router rather than a raw JSON dump | STAT-01 | Prioritization clarity is partly ergonomic, not only structural | Generate a sample workspace with stale and healthy artifacts, run `/research-status`, and confirm the top summary makes one next step obvious while still surfacing impacted IDs. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
