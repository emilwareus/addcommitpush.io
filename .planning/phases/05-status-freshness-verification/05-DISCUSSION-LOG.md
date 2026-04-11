# Phase 5: Status, Freshness & Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 05-status-freshness-verification
**Areas discussed:** Status surface, Freshness propagation, Artifact health contract, Verification debt, Routing priority

---

## Status surface

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `/research-status` summary | Keep `manifest.json` compact, derive rich status in shared tooling, expose one thin runtime command | ✓ |
| Manifest-only status | Put most status detail directly into `manifest.json` and read it raw | |
| Separate status files | Create extra per-research status documents outside the manifest/artifact graph | |

**User's choice:** Auto mode selected the recommended default: dedicated `/research-status` summary.
**Notes:** `[auto] Status surface → Dedicated /research-status summary (recommended default)` because it matches the existing thin-core CLI pattern and avoids turning `manifest.json` into a second verbose ledger.

---

## Freshness propagation

| Option | Description | Selected |
|--------|-------------|----------|
| Mark stale insights and reports, surface impacted analyses | Write explicit stale state where operators act directly, compute analysis impact from lineage at read time | ✓ |
| Mark every downstream artifact stale | Propagate a stale flag into insights, analyses, and reports indiscriminately | |
| Source-only stale tracking | Keep stale state only on sources and force operators to infer downstream impact manually | |

**User's choice:** Auto mode selected the recommended default: mark stale insights and reports, surface impacted analyses.
**Notes:** `[auto] Freshness propagation → Mark stale insights and reports, surface impacted analyses (recommended default)` because this follows the existing refresh model in the spec while avoiding unnecessary write amplification on intermediary analyses.

---

## Artifact health contract

| Option | Description | Selected |
|--------|-------------|----------|
| Add `side_states` to insights and reports only | Preserve editorial `status`, add explicit health flags where freshness/unsupported risk must persist | ✓ |
| Add `side_states` to every artifact type | Mirror source-style flags on insights, analyses, and reports | |
| Keep all health data computed-only | Never persist downstream health flags, compute everything on read | |

**User's choice:** Auto mode selected the recommended default: add `side_states` to insights and reports only.
**Notes:** `[auto] Artifact health contract → Add side_states to insights and reports only (recommended default)` because reports and insights are the operator-facing reusable units, while analyses already surface contradictions and should remain computed-impact rather than heavily stateful.

---

## Verification debt

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic debt rules + compact manifest counts | Use file-based heuristics, aggregate counts in manifest, derive detailed impacted IDs at status time | ✓ |
| Per-artifact detailed debt ledger | Persist every debt item and impacted edge directly into durable state | |
| Semantic review model | Use model-judged support scoring or freeform agent review as the main verifier | |

**User's choice:** Auto mode selected the recommended default: deterministic debt rules with compact manifest counts.
**Notes:** `[auto] Verification debt → Deterministic debt rules + compact manifest counts (recommended default)` because it stays inspectable, reproducible, and aligned with the current manifest design.

---

## Routing priority

| Option | Description | Selected |
|--------|-------------|----------|
| Debt-first single primary action | Prioritize stale-source refresh and blocking debt before normal stage progression | ✓ |
| Stage-first routing | Continue the stage ladder even when stale/unsupported debt exists | |
| Multi-action dashboard | Present several unranked next actions and let the operator choose manually | |

**User's choice:** Auto mode selected the recommended default: debt-first single primary action.
**Notes:** `[auto] Routing priority → Debt-first single primary action (recommended default)` because it preserves the GSD-style progress-router behavior already established in `resume.ts`.

---

## the agent's Discretion

- Exact helper/module splits for propagation, debt aggregation, and CLI formatting
- Exact naming of debt categories inside the status payload

## Deferred Ideas

- Recurring refresh automation and scheduled status runs
- Cross-research health dashboards
- Semantic/LLM-judged claim verification
