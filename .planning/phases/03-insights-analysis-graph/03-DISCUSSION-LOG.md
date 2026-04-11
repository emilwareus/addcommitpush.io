# Phase 3: Insights & Analysis Graph - Discussion Log

**Mode:** auto
**Gathered:** 2026-04-11

## Auto-Selected Gray Areas

### 1. Insight artifact contract
- **Auto choice:** Use one canonical Markdown `INS-*` file per atomic reusable claim, with YAML
  frontmatter plus fixed sections for claim, evidence, caveats, and reuse.
- **Why:** This matches the existing product docs and keeps Phase 3 grounded in reusable knowledge
  units rather than ad hoc notes.

### 2. Source-to-insight lineage and backlinks
- **Auto choice:** Keep lineage explicit through `SRC-*` IDs and synchronize
  `sources.json[*].linked_insights` whenever insights are created or updated.
- **Why:** Phase 2 already locked `linked_insights` into the source contract, so Phase 3 should
  complete that loop instead of introducing a second provenance surface.

### 3. Analysis artifact shape
- **Auto choice:** Treat Markdown `ANL-*` files as the canonical Phase 3 analysis artifact, driven
  by explicit insight sets and an analytic question.
- **Why:** This is the strongest fit with the current artifact model and keeps notebooks/data
  companions optional instead of making them mandatory too early.

### 4. Contradictions, caveats, and unresolved questions
- **Auto choice:** Make them first-class analysis sections instead of optional notes or future
  verification-only metadata.
- **Why:** The Phase 3 requirement is specifically about surfacing contradictions and unresolved
  questions, so they need explicit storage in the analysis contract now.

## Result

These decisions were promoted into `03-CONTEXT.md` as locked guidance for the Phase 3 researcher
and planner.

---
*Phase: 03-insights-analysis-graph*
*Discussion gathered: 2026-04-11*
