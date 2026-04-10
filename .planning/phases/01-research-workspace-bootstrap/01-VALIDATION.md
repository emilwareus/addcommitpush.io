---
phase: 01
slug: research-workspace-bootstrap
status: draft
nyquist_compliant: true
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
| **Quick run command** | `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/init.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm exec vitest run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/init.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | RSCH-01, RSCH-03 | T-01-02 | Root verification uses repo-standard `lint`, `typecheck`, and focused Vitest commands. | harness | `pnpm lint && pnpm typecheck && pnpm exec vitest run --config vitest.config.ts --passWithNoTests` | ✅ 01-01 | ⬜ pending |
| 01-01-02 | 01 | 1 | RSCH-01, RSCH-03 | T-01-01 | Contract, init, and resume spec files exist before implementation plans activate them. | scaffold | `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/init.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` | ✅ 01-01 | ⬜ pending |
| 01-02-02 | 02 | 2 | RSCH-01 | T-01-04 | Manifest and source-envelope validation plus path guards reject invalid workspace inputs. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts` | ✅ 01-01 | ⬜ pending |
| 01-03-01 | 03 | 3 | RSCH-01 | T-01-07 | Init creates only the fixed workspace contract under `researcher/researches/<slug>/`. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts` | ✅ 01-01 | ⬜ pending |
| 01-04-01 | 04 | 4 | RSCH-03 | T-01-11 | Resume reconstructs context from disk-only artifacts and rejects invalid workspace state. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts` | ✅ 01-01 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pnpm add ajv vitest` and add the repo-required `typecheck` script to `package.json`
- [ ] `vitest.config.ts` — add root test configuration for the new internal tool surface
- [ ] `internal/tools/researcher/__tests__/test-helpers.ts` — add temp-workspace helpers for filesystem specs
- [ ] `internal/tools/researcher/__tests__/contracts.spec.ts` — create the contract spec scaffold in Wave 0, then activate it in Plan 01-02
- [ ] `internal/tools/researcher/__tests__/init.spec.ts` — create the init spec scaffold in Wave 0, then activate it in Plan 01-03
- [ ] `internal/tools/researcher/__tests__/resume.spec.ts` — create the resume spec scaffold in Wave 0, then activate it in Plan 01-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Resume summary reads clearly enough to guide the next workflow step | RSCH-03 | `nextRecommendedAction` quality is partly product-facing wording, not just structure | Initialize a sample research, add one report file, run the resume command, and inspect that the returned summary names the current stage and next step without referencing prior chat state |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all previously missing references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
