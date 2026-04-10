# Phase 1: Research Workspace Bootstrap - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 01-Research Workspace Bootstrap
**Areas discussed:** Workspace layout, Source ledger shape, Artifact identity and lineage, Runtime boundary

---

## Workspace layout

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed research folder contract | Brief, manifest, source ledger, `insights/`, `data/`, `analysis/`, `reports/` | ✓ |
| Looser user-defined structure | Let users decide the research folder contents themselves | |
| Minimal flat folder | Keep only a few files and defer structure until later | |

**User's choice:** Fixed research folder contract
**Notes:** `[auto] Workspace layout -> fixed folder contract (recommended default).` Existing `researcher/README.md` and `researcher/ARTIFACT-MODEL.md` already establish this as the intended product shape.

---

## Source ledger shape

| Option | Description | Selected |
|--------|-------------|----------|
| Append-friendly structured source ledger | Preserve durable provenance without one giant mutable object | ✓ |
| Single monolithic `sources.json` | Keep all source state in one mutable JSON document | |
| Markdown-only source index | Make the source list purely human-readable | |

**User's choice:** Append-friendly structured source ledger
**Notes:** `[auto] Source ledger shape -> append-friendly structured ledger (recommended default).` This keeps the long-term design open to `sources.jsonl` or an equivalent structured representation while preserving file-first local state.

---

## Artifact identity and lineage

| Option | Description | Selected |
|--------|-------------|----------|
| Stable IDs and explicit lineage | Use `SRC -> INS -> ANL -> RPT` with deterministic links | ✓ |
| Path-based references only | Use file paths without stable IDs | |
| Implicit prose references | Let reports and notes refer to evidence informally | |

**User's choice:** Stable IDs and explicit lineage
**Notes:** `[auto] Artifact identity -> stable IDs and explicit lineage (recommended default).` This decision is required to support refresh, verification debt, and multi-report reuse.

---

## Runtime boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime-neutral core with thin adapters | Shared workspace and logic, thin Codex/Claude install surfaces | ✓ |
| Codex-first implementation | Optimize for Codex first and backfill Claude behavior later | |
| Claude-first implementation | Optimize for Claude Code first and backfill Codex behavior later | |

**User's choice:** Runtime-neutral core with thin adapters
**Notes:** `[auto] Runtime boundary -> runtime-neutral core with thin adapters (recommended default).` This keeps Researcher aligned with the cross-runtime requirement in `PROJECT.md`.

---

## the agent's Discretion

- Internal manifest field names
- Helper and module boundaries for Phase 1 implementation
- Exact append-friendly source-ledger representation behind the public artifact model

## Deferred Ideas

- Runtime plugin / marketplace packaging
- Optional notebook-heavy analysis lane
- Collaboration and hosted sync
