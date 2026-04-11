# Phase 6: Runtime Installation & Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 06-runtime-installation-lifecycle
**Areas discussed:** Install scope, Runtime surface mapping, Managed asset ownership, Settings and hooks policy, Update and inspect lifecycle

---

## Install scope

| Option | Description | Selected |
|--------|-------------|----------|
| Local project install first | Optimize for `./.claude/` and `./.codex/` installs inside a project; global parity is secondary | ✓ |
| Local and global equally now | Build both paths as first-class success targets in the first pass | |
| Global-first install | Treat home-directory installs as the primary v1 workflow | |

**User's choice:** Auto mode selected the recommended default: local project install first.
**Notes:** `[auto] Install scope → Local project install first (recommended default)` because the phase requirement is "install into a project" and the product is explicitly local-first and inspectable.

---

## Runtime surface mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Same research command set, native wrappers per runtime | Keep one Researcher verb layer while exposing it through Codex skills and Claude slash commands | ✓ |
| Claude-first, Codex later | Fully finish Claude runtime UX first, then add Codex in a follow-up pass | |
| Divergent runtime command sets | Let Claude and Codex expose different verbs and structures | |

**User's choice:** Auto mode selected the recommended default: same research command set with native wrappers per runtime.
**Notes:** `[auto] Runtime surface mapping → Same research command set, native wrappers per runtime (recommended default)` because the user wants Researcher to feel like one system across both runtimes, not two products.

---

## Managed asset ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Shared payload + installer-managed adapters | Keep one source-of-truth payload and generate/sync thin runtime files with ownership metadata | ✓ |
| Runtime trees maintained independently | Keep separate Claude and Codex copies of the same workflow/runtime files | |
| User-edited runtime files in place | Treat installed runtime files as hand-maintained after first install | |

**User's choice:** Auto mode selected the recommended default: shared payload with installer-managed adapters.
**Notes:** `[auto] Managed asset ownership → Shared payload + installer-managed adapters (recommended default)` because it preserves thin adapters and makes update/inspect deterministic instead of drift-prone.

---

## Settings and hooks policy

| Option | Description | Selected |
|--------|-------------|----------|
| Non-destructive merge, hooks opt-in | Install only required assets by default and merge runtime settings carefully | ✓ |
| Install hooks and settings by default | Treat hooks and runtime guards as part of the base install | |
| No settings/hook integration | Avoid touching runtime config surfaces at all | |

**User's choice:** Auto mode selected the recommended default: non-destructive merge with hooks opt-in.
**Notes:** `[auto] Settings and hooks policy → Non-destructive merge, hooks opt-in (recommended default)` because this repo already has project-local Claude config and the installer must not clobber existing runtime behavior.

---

## Update and inspect lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit install, update, and inspect commands | Lifecycle is first-class and ownership-aware, with deterministic reporting of installed assets and drift | ✓ |
| Reinstall-only lifecycle | Users update by re-running install and inspecting files manually | |
| Silent in-place overwrite | Updates replace files without an inspectable ownership model | |

**User's choice:** Auto mode selected the recommended default: explicit install, update, and inspect commands.
**Notes:** `[auto] Update and inspect lifecycle → Explicit install, update, and inspect commands (recommended default)` because `INST-03` and `INST-04` require lifecycle behavior, not just file copying.

---

## the agent's Discretion

- Exact install manifest schema and marker placement
- Exact naming of lifecycle commands and wrapper files
- Exact split between copied adapters and shared payload files

## Deferred Ideas

- Global-first polish
- Marketplace or plugin packaging
- Optional rich hook/statusline extras beyond the base install
