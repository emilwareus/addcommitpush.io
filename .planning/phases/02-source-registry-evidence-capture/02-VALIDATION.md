---
phase: 02
slug: source-registry-evidence-capture
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-11
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/source-add.spec.ts internal/tools/researcher/__tests__/source-refresh.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` |
| **Full suite command** | `pnpm exec vitest run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/source-add.spec.ts internal/tools/researcher/__tests__/source-refresh.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- **After every plan wave:** Run `pnpm exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SRC-01, SRC-02 | T-02-01 | Source registry schema rejects invalid IDs, bad timestamps, and malformed URLs before disk mutation. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts` | ✅ existing | ⬜ pending |
| 02-02-01 | 02 | 2 | SRC-01, SRC-02 | T-02-02 | Add/update flow dedupes by canonical locator and persists schema-valid source metadata through the shared contract. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/source-add.spec.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | SRC-03, SRC-04 | T-02-03 | Refresh appends new captures, keeps source identity stable, and derives stale evidence from `manifest.freshness.window_days` through source-level metadata only. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/source-refresh.spec.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 3 | SRC-04 | T-02-04 | Resume still reports correct source inventory and next-action routing after the richer source contract lands. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extend `internal/tools/researcher/__tests__/contracts.spec.ts` — schema and type coverage for the Phase 2 source record contract
- [ ] `internal/tools/researcher/__tests__/source-add.spec.ts` — add/update/dedupe and manifest/source synchronization
- [ ] `internal/tools/researcher/__tests__/source-refresh.spec.ts` — capture layout, append-only refresh, derived stale-source behavior, and manual side-state overrides
- [ ] Extend `internal/tools/researcher/__tests__/resume.spec.ts` — prove resume still works after Phase 2 schema expansion

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Captured evidence remains legible and attributable when inspected directly on disk | SRC-03 | Capture usefulness is partly about operator readability and folder hygiene, not just schema validity | Add a sample source, record at least one capture, inspect the `data/` layout, and confirm one stable `SRC-*` record points to root-relative evidence paths that a human can audit quickly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
