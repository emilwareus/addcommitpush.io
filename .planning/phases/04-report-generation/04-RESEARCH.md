# Phase 4: Report Generation - Research

**Researched:** 2026-04-11
**Domain:** Canonical Markdown report artifacts, report-request packaging, backlink reconciliation, and lineage rendering for Researcher
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

- Reports are canonical Markdown `RPT-*` artifacts under `reports/`, with one explicit
  audience + angle + thesis per report.
- Reports are packaging artifacts, not a second analysis layer.
- Reports may derive from both `ANL-*` and direct `INS-*` inputs, with analyses as the primary
  packaging inputs when available.
- Major claims should cite `INS-*` IDs in report prose, and every report must render explicit
  `Analysis Inputs`, `Insight References`, and `Source References`.
- Creating or updating a report must reconcile `linked_reports` on both referenced insights and
  analyses.
- `fresh_as_of` should be recorded at generation time, but downstream stale propagation remains
  Phase 5 work.
- All mutation must go through shared deterministic tooling with thin runtime entrypoints.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RPT-01 | User can generate a Markdown report from existing insights and analysis for a chosen angle or audience. | Freeze one canonical report artifact contract, then implement deterministic report upsert from explicit `ANL-*` / `INS-*` inputs. |
| RPT-02 | User can generate more than one report from the same research without duplicating the underlying research work. | Keep `RPT-*` identity separate from insight/analysis state, support create-vs-update semantics, and preserve upstream artifacts unchanged except for `linked_reports` backlinks. |
| RPT-03 | User can trace each report back to the insight and source lineage that supports it. | Render explicit `Analysis Inputs`, `Insight References`, and `Source References` sections from the existing artifact graph instead of adding a second provenance store. |
</phase_requirements>

## Summary

Phase 4 should follow the same pattern Phase 3 established: freeze the report contract first,
then build one deterministic upsert flow, then layer lineage rendering on top of existing
artifact links. The clean implementation is not a freeform “article writer.” It is a report
packager that consumes already-validated `INS-*` and `ANL-*` artifacts, records explicit lineage
in frontmatter and body sections, and updates `linked_reports` as reconciled output.

The strongest plan split is:

### `04-01` — Freeze the report artifact contract
- Add `researcher/schemas/report-frontmatter.schema.json`, typed report contracts, and
  `parseReportArtifact()` / `renderReportArtifact()` in the shared Markdown boundary.
- Make the report body shape fixed and ordered:
  `Summary -> Key Points -> Body -> Limitations -> Analysis Inputs -> Insight References -> Source References`.
- Cover invalid frontmatter, missing sections, and malformed reference bullets in
  `report-contract.spec.ts`.

### `04-02` — Build deterministic report upsert and backlink sync
- Implement `upsertReport()` that allocates `RPT-*`, writes canonical Markdown under `reports/`,
  updates `manifest.inventory.reports`, and reconciles `linked_reports` on both insight and
  analysis artifacts.
- Keep a thin `research-report.ts` CLI wrapper that accepts explicit audience, angle, thesis, and
  selected input IDs, then prints deterministic JSON.
- Cover create, update, multi-report coexistence, and backlink add/remove reconciliation.

### `04-03` — Render lineage and support sections from the artifact graph
- Resolve chosen `ANL-*` and `INS-*` inputs into report-facing `Analysis Inputs`,
  `Insight References`, and `Source References` sections.
- Keep source URLs in the terminal reference section, not scattered through the main prose.
- Extend resume coverage so an extract/package-stage workspace with reports on disk routes to
  `review-existing-reports`.

## Recommended Stack

- Reuse `gray-matter`, Ajv, and the existing shared Markdown parser/render boundary.
- Add no new heavy parsing stack; the report body contract is fixed and tool-owned.
- Reuse the existing insight/analysis upsert and backlink patterns instead of inventing a
  report-only state store.

## Key Planning Takeaways

- The `linked_reports` fields already exist on insight and analysis contracts, so Phase 4 should
  finish that loop instead of designing a new lineage surface.
- `fresh_as_of` belongs in report frontmatter now because report generation is a packaging event,
  but stale propagation must remain explicitly deferred to Phase 5.
- Multi-report support is mainly an identity and update-policy question: new angle/audience means
  a new `RPT-*`; explicit `reportId` means update the targeted report in place.
