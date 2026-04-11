---
phase: 06
slug: runtime-installation-lifecycle
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-contract.spec.ts` |
| **Full suite command** | `pnpm exec vitest run` |
| **Estimated runtime** | ~20 seconds task-local, ~35 seconds wave-level |

---

## Sampling Rate

- **After every task commit:** Run the task-local spec only:
  - Plan 01 tasks: `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-contract.spec.ts`
  - Plan 02 tasks: `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-adapters.spec.ts`
  - Plan 03 Task 1: `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-install.spec.ts`
  - Plan 03 Task 2: `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-inspect.spec.ts`
- **After every plan wave:** Run `pnpm exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds task-local, ~35 seconds wave-level

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | INST-01, INST-02 | T-06-01 | Runtime install contracts reject unsupported runtimes, malformed asset records, missing ownership metadata, and invalid command-to-wrapper/payload mappings before any files are rendered. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-contract.spec.ts` | ⬜ planned | ⬜ pending |
| 06-01-02 | 01 | 1 | INST-03, INST-04 | T-06-01 | Install manifests persist one deterministic ownership shape used by install, update, and inspect without runtime-specific drift. | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-contract.spec.ts` | ⬜ planned | ⬜ pending |
| 06-02-01 | 02 | 2 | INST-01, INST-02 | T-06-02 | Codex and Claude adapters render the same command inventory from one shared catalog while preserving runtime-native file layouts. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-adapters.spec.ts` | ⬜ planned | ⬜ pending |
| 06-02-02 | 02 | 2 | INST-01, INST-02 | T-06-03 | Claude settings merges remain non-destructive and optional hook writes stay out of the default install path. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-adapters.spec.ts` | ⬜ planned | ⬜ pending |
| 06-03-01 | 03 | 3 | INST-01, INST-03 | T-06-04 | Install and update write the runtime adapters plus the shared managed payload, including bundled runtime entrypoints and runtime-loaded schemas, refresh only those managed assets, and surface drift instead of silently overwriting unmanaged edits. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-install.spec.ts` | ⬜ planned | ⬜ pending |
| 06-03-02 | 03 | 3 | INST-01, INST-02, INST-04 | T-06-05 | Inspect reports the installed asset inventory, payload coverage including bundled runtime entrypoints and schemas, ownership status, and config merge state from the manifest written by install/update. | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-inspect.spec.ts` | ⬜ planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Planned Test Files

- [ ] `internal/tools/researcher/__tests__/runtime-contract.spec.ts` — runtime catalog, command-to-wrapper mapping, install request, and install-manifest validation coverage
- [ ] `internal/tools/researcher/__tests__/runtime-adapters.spec.ts` — Codex and Claude rendered asset parity, deterministic output, and non-destructive settings merge coverage
- [ ] `internal/tools/researcher/__tests__/runtime-install.spec.ts` — install/update managed-asset writes, payload materialization including bundled runtime entrypoints and schemas, manifest persistence, drift/conflict behavior, and clean-fixture smoke execution
- [ ] `internal/tools/researcher/__tests__/runtime-inspect.spec.ts` — inspect inventory summaries and ownership reporting coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Installed Codex and Claude surfaces feel like one coherent product rather than two unrelated wrappers | INST-01, INST-02 | File validity alone does not prove the runtime UX and naming stay conceptually aligned | Install into a disposable fixture project for each runtime, inspect `.codex/skills/` and `.claude/commands/`, and confirm the command names and descriptions map cleanly across runtimes. |
| Installed runtime entries resolve to a working local payload inside a fresh target project | INST-01, INST-02, INST-03 | Generated files can look correct while still pointing at missing scripts, schemas, or templates | After install, open one installed Codex skill and one installed Claude command, run the referenced command path from the target project, and confirm it reaches the installed Researcher payload successfully. |
| Inspect output is operationally useful for humans, not only machine-readable | INST-04 | Readability and operator trust are partly ergonomic | Run `research-inspect` after install and after an update with drift, then confirm the summary makes managed assets, conflicts, and next actions obvious. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s for task-level sampling
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
