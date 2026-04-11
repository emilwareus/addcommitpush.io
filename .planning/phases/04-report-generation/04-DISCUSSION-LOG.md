# Phase 4: Report Generation - Discussion Log

**Mode:** auto
**Gathered:** 2026-04-11

## Auto-Selected Gray Areas

### 1. Report artifact contract
- **Auto choice:** Use one canonical Markdown `RPT-*` file per audience + angle + thesis
  package, with stable IDs, explicit lineage frontmatter, and a fixed body shape.
- **Why:** The product docs already frame reports as derived durable artifacts, and Phase 4 needs a
  reusable packaging unit rather than one-off article output.

### 2. Input selection and multi-report reuse
- **Auto choice:** Let reports derive from explicit `ANL-*` and `INS-*` inputs, with analyses as
  the primary packaging inputs and direct insights as supplements.
- **Why:** Phase 3 already delivered the insight/analysis graph, so Phase 4 should package that
  graph instead of bypassing it.

### 3. Citation and lineage rendering
- **Auto choice:** Keep in-text support insight-first, then render `Analysis Inputs`,
  `Insight References`, and `Source References` sections at the end of each report.
- **Why:** This satisfies traceability without turning the main narrative into a raw URL dump.

### 4. Backlinks and freshness stamp
- **Auto choice:** Reconcile `linked_reports` on referenced insights and analyses, record a
  deterministic `fresh_as_of` stamp, but defer stale propagation to Phase 5.
- **Why:** The graph already has `linked_reports` placeholders and the roadmap explicitly keeps
  freshness-impact behavior for the next phase.

## Result

These decisions were promoted into `04-CONTEXT.md` as locked guidance for the Phase 4 researcher
and planner.

---
*Phase: 04-report-generation*
*Discussion gathered: 2026-04-11*
