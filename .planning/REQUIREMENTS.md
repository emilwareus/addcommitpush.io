# Requirements: Researcher

**Defined:** 2026-04-10
**Core Value:** Turn research from one-off chat output into durable, source-backed knowledge that can be reused, extended, and repackaged into multiple high-quality reports.

## v1 Requirements

### Installation & Runtime

- [ ] **INST-01**: User can install Researcher into a Codex project with the required commands,
  skills, templates, and supporting runtime assets.
- [ ] **INST-02**: User can install Researcher into a Claude Code project with the required
  commands, skills, templates, and supporting runtime assets.
- [ ] **INST-03**: User can update an existing Researcher installation without manually copying
  files.
- [ ] **INST-04**: User can inspect which runtime assets were installed and where they live.

### Research Workspace

- [x] **RSCH-01**: User can initialize a new research with a bounded brief and a fixed folder
  structure for insights, data, analysis, and reports.
- [ ] **RSCH-02**: User can inspect a research manifest that shows status, freshness debt, and
  active report inventory.
- [x] **RSCH-03**: User can resume an existing research without rebuilding its context from chat
  history.

### Source Provenance

- [ ] **SRC-01**: User can add external sources to a central structured source registry for a
  research.
- [ ] **SRC-02**: User can record source metadata including origin, access time, type, status, and
  confidence.
- [ ] **SRC-03**: User can store captured evidence or extracted material alongside the research in
  a durable local structure.
- [ ] **SRC-04**: User can refresh sources later and detect when evidence may have gone stale.

### Insights & Analysis

- [ ] **INS-01**: User can promote gathered material into reusable insight artifacts with stable
  IDs.
- [ ] **INS-02**: User can link each insight to one or more supporting source records.
- [ ] **INS-03**: User can group multiple insights into higher-order analysis artifacts.
- [ ] **INS-04**: User can inspect contradictions, caveats, or unresolved questions in analysis
  artifacts.

### Reporting

- [ ] **RPT-01**: User can generate a Markdown report from existing insights and analysis for a
  chosen angle or audience.
- [ ] **RPT-02**: User can generate more than one report from the same research without duplicating
  the underlying research work.
- [ ] **RPT-03**: User can trace each report back to the insight and source lineage that supports
  it.

### Verification & Status

- [ ] **STAT-01**: User can run a status flow that shows the next recommended action for a
  research.
- [ ] **STAT-02**: User can detect stale evidence, unsupported claims, and verification debt before
  shipping a report.
- [ ] **STAT-03**: User can see when downstream insights, analysis, or reports are affected by
  changed source freshness.

## v2 Requirements

### Advanced Runtime Support

- **RT-01**: User can package stable releases as a richer runtime/plugin distribution where useful.
- **RT-02**: User can manage richer runtime parity tests across more than two AI runtimes.

### Advanced Analysis

- **ANL-01**: User can run optional notebook-backed and dataset-backed analysis workflows from the
  same research base.
- **ANL-02**: User can maintain append-friendly large source ledgers and derived datasets without
  degrading the core workflow.

### Collaboration

- **COLL-01**: Multiple users can collaborate on one research with conflict-safe source and insight
  operations.
- **COLL-02**: Teams can share reusable research assets across projects or repositories.

## Out of Scope

| Feature | Reason |
|---------|--------|
| SaaS-first hosted state | v1 should be local-first and inspectable |
| Generic IDE replacement | Researcher should extend Codex and Claude Code, not compete with them |
| Audio / slideshow / flashy derivative outputs | Not core to proving the evidence pipeline |
| Automatic objective trust scoring | Too easy to make misleading and not auditable enough for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INST-01 | Phase 6 | Pending |
| INST-02 | Phase 6 | Pending |
| INST-03 | Phase 6 | Pending |
| INST-04 | Phase 6 | Pending |
| RSCH-01 | Phase 1 | Complete |
| RSCH-02 | Phase 5 | Pending |
| RSCH-03 | Phase 1 | Complete |
| SRC-01 | Phase 2 | Pending |
| SRC-02 | Phase 2 | Pending |
| SRC-03 | Phase 2 | Pending |
| SRC-04 | Phase 2 | Pending |
| INS-01 | Phase 3 | Pending |
| INS-02 | Phase 3 | Pending |
| INS-03 | Phase 3 | Pending |
| INS-04 | Phase 3 | Pending |
| RPT-01 | Phase 4 | Pending |
| RPT-02 | Phase 4 | Pending |
| RPT-03 | Phase 4 | Pending |
| STAT-01 | Phase 5 | Pending |
| STAT-02 | Phase 5 | Pending |
| STAT-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after initialization*
