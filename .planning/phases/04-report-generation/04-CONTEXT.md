# Phase 4: Report Generation - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 packages the completed `sources -> insights -> analysis` knowledge base into reusable
Markdown `RPT-*` artifacts. It must let one research generate multiple audience/angle-specific
reports with explicit lineage back through `INS-*` and ultimately to `SRC-*`, while keeping
reports as derived outputs rather than the place where all reasoning lives.

This phase is not freshness propagation, report staleness automation, or status routing. It should
write canonical reports and capture their lineage so later phases can reason about freshness and
verification debt without reopening the report contract.

</domain>

<decisions>
## Implementation Decisions

### Report identity and contract
- **D-43:** Report artifacts are canonical Markdown files under `reports/` with stable `RPT-*`
  IDs allocated from `manifest.next_ids.report`. Filenames should include the ID plus a readable
  slug, but the ID remains the authoritative identity.
- **D-44:** One report should package one explicit audience + angle + thesis combination. If the
  same research needs a different framing, that becomes another `RPT-*` artifact instead of
  overwriting the original report’s intent.
- **D-45:** The canonical Phase 4 report frontmatter should include: `id`, `title`, `audience`,
  `angle`, `thesis`, `status`, `derived_from_analysis`, `derived_from_insights`, `fresh_as_of`,
  `created_at`, and `updated_at`.

### Report body shape and packaging rules
- **D-46:** Reports should stay Markdown-first with a fixed Phase 4 body shape:
  `Summary`, `Key Points`, `Body`, `Limitations`, `Analysis Inputs`, `Insight References`, and
  `Source References`.
- **D-47:** Reports are packaging artifacts, not a second analysis layer. The main body may
  synthesize and narrate, but higher-order reasoning should still live upstream in `ANL-*`
  artifacts and reusable claims should still live upstream in `INS-*`.
- **D-48:** A report may derive from both `ANL-*` and direct `INS-*` inputs. Analyses should be
  the primary packaging inputs when they exist; direct insights are the supplement for angles that
  need more specific evidence than the available analyses provide.

### Traceability and citation rendering
- **D-49:** The primary in-text support model should be insight-first. Major claims in report prose
  should cite `INS-*` IDs inline or parenthetically instead of dumping raw source URLs into the
  narrative.
- **D-50:** Every report must resolve its support chain at the end: `Analysis Inputs` lists the
  `ANL-*` inputs, `Insight References` maps `INS-*` IDs to their short claim and supporting
  `SRC-*` IDs, and `Source References` lists the referenced source IDs with title plus canonical
  URL.
- **D-51:** Phase 4 should render traceability from the already-linked artifacts on disk. It
  should not create a second report-only provenance index or bypass insights by re-deriving the
  report directly from raw sources.

### Backlinks, freshness stamp, and runtime behavior
- **D-52:** Creating or updating a report must reconcile `linked_reports` on every referenced
  insight and analysis artifact so downstream status and refresh logic can discover report usage
  from the existing artifact graph.
- **D-53:** `fresh_as_of` should be stored on the report frontmatter at generation time as the
  packaging freshness stamp, derived from the currently included upstream artifacts and sources.
  Phase 4 records this stamp but does not implement downstream stale propagation or stale marking.
- **D-54:** All report request parsing, ID allocation, Markdown rendering, lineage resolution, and
  backlink synchronization must go through shared deterministic tooling in `internal/tools/researcher/`,
  with a thin runtime entrypoint that parses input and prints deterministic machine-readable output.

### Request contract and generation mode
- **D-55:** Report generation should start from one explicit request contract containing audience,
  angle, thesis, and the selected `ANL-*` / `INS-*` inputs. XML-style request blocks are the right
  orchestration surface for subagents and future workflow commands, but the durable report itself
  remains Markdown.
- **D-56:** Phase 4 should generate report drafts as inspectable Markdown artifacts, not ephemeral
  chat-only output. Regeneration should update a chosen `RPT-*` when explicitly targeted, or
  create a new `RPT-*` when packaging a genuinely different audience/angle.

### the agent's Discretion
- Exact helper/module boundaries for report upsert, lineage resolution, and backlink synchronization
- Exact Markdown formatting details inside the `Body` section as long as the canonical section
  order and traceability sections remain intact
- Exact freshness-stamp derivation helper shape as long as `fresh_as_of` remains deterministic and
  grounded in the included upstream artifacts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 delivered foundation
- `.planning/phases/03-insights-analysis-graph/03-CONTEXT.md` — Locked insight/analysis identity,
  lineage, and backlink decisions inherited by Phase 4
- `.planning/phases/03-insights-analysis-graph/03-RESEARCH.md` — Architecture guidance on shared
  Markdown contracts, forward-lineage reconciliation, and thin runtime boundaries
- `.planning/phases/03-insights-analysis-graph/03-VERIFICATION.md` — Verified evidence that the
  insight and analysis graph exists and resume already routes to `package-report`
- `.planning/phases/03-insights-analysis-graph/03-01-SUMMARY.md` — Summary of artifact schemas and
  shared Markdown parsing
- `.planning/phases/03-insights-analysis-graph/03-02-SUMMARY.md` — Summary of canonical insight
  upsert and source backlink synchronization
- `.planning/phases/03-insights-analysis-graph/03-03-SUMMARY.md` — Summary of analysis upsert,
  insight backlink reconciliation, and resume routing

### Researcher product design
- `researcher/README.md` — Product shape and the “many reports from one research” principle
- `researcher/REPORTING.md` — Report packaging rules, two-layer citation model, and refresh model
- `researcher/ARTIFACT-MODEL.md` — Report semantics, provenance chain, and promotion gates
- `researcher/WORKFLOWS.md` — Intended `/research-report` behavior and report gate
- `researcher/CONTRACTS.md` — XML-style `report_request` contract guidance and ID reference
  strategy
- `researcher/templates/REPORT.md` — Existing report template direction
- `researcher/examples/report-request.xml` — Example report request input contract

### Existing code and schemas
- `internal/tools/researcher/contracts/manifest.ts` — Existing `RPT-*` counter slot in
  `manifest.next_ids`
- `internal/tools/researcher/contracts/insights.ts` — Existing `linked_reports` field on insights
- `internal/tools/researcher/contracts/analysis.ts` — Existing `linked_reports` field on analyses
- `internal/tools/researcher/contracts/validators.ts` — Shared Ajv validation entrypoints to extend
- `internal/tools/researcher/core/artifacts/markdown.ts` — Existing shared parse/render boundary
  for canonical Markdown artifacts
- `internal/tools/researcher/core/insights/upsert.ts` — Proven deterministic artifact upsert and
  backlink-sync pattern
- `internal/tools/researcher/core/analysis/upsert.ts` — Proven higher-order artifact upsert and
  backlink-sync pattern
- `internal/tools/researcher/core/resume.ts` — Current disk-only consumer already counting
  `reports/` and routing to `package-report`
- `internal/tools/researcher/contracts/workspace.ts` — Fixed `reports/` workspace boundary

### Project planning context
- `.planning/PROJECT.md` — Current validated project state and constraints
- `.planning/REQUIREMENTS.md` — User-facing requirement traceability for `RPT-*`
- `.planning/ROADMAP.md` — Phase boundary, goal, requirements, and build order

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `internal/tools/researcher/contracts/manifest.ts`: Already has the `report` counter available
  for Phase 4
- `internal/tools/researcher/core/artifacts/markdown.ts`: Already proves the repo-standard pattern
  for schema-backed Markdown parsing and deterministic rendering
- `internal/tools/researcher/core/insights/upsert.ts`: Already demonstrates stable ID allocation,
  file write ownership, and upstream backlink reconciliation for artifact promotion
- `internal/tools/researcher/core/analysis/upsert.ts`: Already demonstrates higher-order artifact
  writes plus downstream backlink sync into existing Markdown artifacts
- `internal/tools/researcher/core/resume.ts`: Already counts `reports/` from disk and routes
  `extract`/`package` stages through `package-report`
- `researcher/templates/REPORT.md`: Already provides the strongest starting point for a report
  artifact contract

### Established Patterns
- File-based state remains authoritative: JSON for registries and Markdown for durable human-facing
  artifacts
- Deterministic core-owned writes: structured files are mutated through shared tooling, not by
  prompt-authored edits
- Runtime-neutral CLI pattern: thin `scripts/*.ts` wrappers call shared
  `internal/tools/researcher/core/*`
- Forward lineage drives backlinks: upstream artifacts declare what they use, and tooling
  reconciles backlinks from that source of truth

### Integration Points
- Phase 4 must update `manifest.inventory.reports` and `manifest.next_ids.report` through the same
  deterministic mutation boundary already used by earlier artifact layers
- Report generation should parse `INS-*` and `ANL-*` from disk through the shared Markdown
  contracts rather than using ad hoc string reads
- Backlink sync should update `linked_reports` on both insights and analyses without introducing
  any source-layer report backlink structure in Phase 4

</code_context>

<specifics>
## Specific Ideas

- Reports should support multiple packaging styles from one research base, including executive
  briefs, technical blog drafts, contrarian memos, and source-review digests.
- Markdown-only output is the v1 contract; report generation should produce inspectable files, not
  chat-only responses.
- The report should feel like packaging from durable artifacts, not like rerunning the entire
  research process inside one long writing prompt.

</specifics>

<deferred>
## Deferred Ideas

- Downstream stale marking of reports and automatic impacted-report propagation belong to Phase 5.
- Status views, verification debt summaries, and next-action routing beyond the existing
  `package-report` recommendation belong to Phase 5.
- Runtime installation surfaces for Codex and Claude Code belong to Phase 6.
- Audio/slideshow/other derivative output formats remain out of scope for this phase.

</deferred>

---
*Phase: 04-report-generation*
*Context gathered: 2026-04-11*
