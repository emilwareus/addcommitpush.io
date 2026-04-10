---
phase: 01
slug: research-workspace-bootstrap
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` |
| **Full suite command** | `pnpm exec vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- **After every plan wave:** Run `pnpm exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | RSCH-01 | T-01-01 | Manifest and source envelope writes stay inside the research root and validate against the contract. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | RSCH-01 | T-01-02 | Init creates only the fixed workspace contract under `researcher/researches/<slug>/`. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts -t "creates workspace contract"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 3 | RSCH-03 | T-01-03 | Resume reconstructs context from disk-only artifacts and rejects invalid workspace state. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts -t "loads workspace from disk"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pnpm add -D vitest` — install the root test runner for Researcher core and scripts
- [ ] `vitest.config.ts` — add root test configuration for the new internal tool surface
- [ ] `internal/tools/researcher/__tests__/contracts.spec.ts` — validate manifest and source-ledger contract helpers
- [ ] `internal/tools/researcher/__tests__/init.spec.ts` — cover RSCH-01 init behavior
- [ ] `internal/tools/researcher/__tests__/resume.spec.ts` — cover RSCH-03 resume behavior

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Resume summary reads clearly enough to guide the next workflow step | RSCH-03 | `next_recommended_action` quality is partly product-facing wording, not just structure | Initialize a sample research, add one report file, run the resume command, and inspect that the returned summary names the current stage and next step without referencing prior chat state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
