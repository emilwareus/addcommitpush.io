# Roadmap: Researcher

## Overview

Researcher will be built as a local-first deep-research operating system that borrows GSD's
workflow discipline while replacing code-delivery artifacts with research artifacts. The build
order follows the dependency chain: establish the research workspace, make evidence durable,
promote evidence into reusable knowledge, package that knowledge into reports, verify its health,
and only then finalize the install surfaces for Codex and Claude Code.

## Phases

- [x] **Phase 1: Research Workspace Bootstrap** - Create the bounded research folder contract,
  manifest seed, and resumeable workspace flows.
- [x] **Phase 2: Source Registry & Evidence Capture** - Build the source ledger and durable local (completed 2026-04-11)
  evidence capture model.
- [ ] **Phase 3: Insights & Analysis Graph** - Turn sourced evidence into reusable insights and
  higher-order analysis with explicit lineage.
- [ ] **Phase 4: Report Generation** - Compile many Markdown reports from one research base with
  traceable support.
- [ ] **Phase 5: Status, Freshness & Verification** - Surface research health, freshness debt, and
  downstream impact before shipping outputs.
- [ ] **Phase 6: Runtime Installation & Lifecycle** - Install, update, and inspect Researcher in
  Codex and Claude Code projects.

## Phase Details

### Phase 1: Research Workspace Bootstrap
**Goal**: Users can start and resume a bounded research from durable on-disk state.
**Depends on**: Nothing (first phase)
**Requirements**: [RSCH-01, RSCH-03]
**Success Criteria** (what must be TRUE):
  1. User can initialize a new research with a brief and the required folder structure.
  2. User can reopen an existing research and recover its working context from files, not chat history.
  3. A newly created research has a consistent manifest and artifact layout that later flows can rely on.
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Establish the Wave 0 harness, typecheck script, and Phase 1 spec scaffolds
- [x] 01-02-PLAN.md — Freeze the workspace contract, validators, and path guards
- [x] 01-03-PLAN.md — Implement deterministic new-research initialization and seeding
- [x] 01-04-PLAN.md — Implement disk-only resume and next-action summary

### Phase 2: Source Registry & Evidence Capture
**Goal**: Users can maintain a central, refreshable source registry with durable evidence capture.
**Depends on**: Phase 1
**Requirements**: [SRC-01, SRC-02, SRC-03, SRC-04]
**Success Criteria** (what must be TRUE):
  1. User can add external sources into one central structured registry.
  2. User can record source metadata including origin, access time, type, status, and confidence.
  3. User can store captured evidence or extracts alongside the research in a durable local structure.
  4. User can refresh sources later and see when evidence has gone stale.
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Freeze the enriched source registry contract, validation, and `data/` path guardrails
- [x] 02-02-PLAN.md — Build canonical source add/upsert and thin metadata-update CLI flows
- [x] 02-03-PLAN.md — Add append-only evidence capture storage and source refresh handling

### Phase 3: Insights & Analysis Graph
**Goal**: Users can turn sourced evidence into reusable insights and higher-order analysis with explicit lineage.
**Depends on**: Phase 2
**Requirements**: [INS-01, INS-02, INS-03, INS-04]
**Success Criteria** (what must be TRUE):
  1. User can create insight artifacts with stable IDs.
  2. Each insight visibly links to one or more supporting source records.
  3. User can group multiple insights into higher-order analysis artifacts.
  4. Analysis artifacts surface contradictions, caveats, and unresolved questions.
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Define insight and analysis artifact schemas
- [ ] 03-02-PLAN.md — Build lineage linking from sources to insights
- [ ] 03-03-PLAN.md — Add contradiction and caveat tracking

### Phase 4: Report Generation
**Goal**: Users can compile multiple Markdown reports from one research base with traceable support.
**Depends on**: Phase 3
**Requirements**: [RPT-01, RPT-02, RPT-03]
**Success Criteria** (what must be TRUE):
  1. User can generate a Markdown report for a chosen angle or audience from existing insights and analysis.
  2. User can generate more than one report from the same research without duplicating the underlying research work.
  3. Each report shows traceable lineage back to supporting insights and sources.
  4. Reports are stored as reusable Markdown artifacts inside the research.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Define report templates and prompt contracts
- [ ] 04-02: Build report compilation from insight and analysis inputs
- [ ] 04-03: Add citation and lineage rendering in reports

### Phase 5: Status, Freshness & Verification
**Goal**: Users can inspect research health, freshness debt, and downstream impact before shipping.
**Depends on**: Phase 4
**Requirements**: [RSCH-02, STAT-01, STAT-02, STAT-03]
**Success Criteria** (what must be TRUE):
  1. User can inspect a manifest or status view that shows research status, freshness debt, and active report inventory.
  2. User can run a status flow that recommends the next action for the research.
  3. User can detect stale evidence, unsupported claims, and verification debt before shipping a report.
  4. User can see which insights, analysis artifacts, and reports are affected when source freshness changes.
**Plans**: 3 plans

Plans:
- [ ] 05-01: Build manifest and status summary flow
- [ ] 05-02: Add verification debt and unsupported-claim checks
- [ ] 05-03: Propagate freshness impact through the artifact graph

### Phase 6: Runtime Installation & Lifecycle
**Goal**: Users can install, update, and inspect Researcher in Codex and Claude Code projects.
**Depends on**: Phase 5
**Requirements**: [INST-01, INST-02, INST-03, INST-04]
**Success Criteria** (what must be TRUE):
  1. User can install the required commands, skills, templates, and runtime assets into a Codex project.
  2. User can install the same supported surface into a Claude Code project.
  3. User can update an existing Researcher installation without manually copying files.
  4. User can inspect what was installed and where those assets live.
**Plans**: 3 plans

Plans:
- [ ] 06-01: Define runtime-neutral workflow contracts
- [ ] 06-02: Build Codex and Claude Code adapters
- [ ] 06-03: Implement installer, update, and inspect flows

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Research Workspace Bootstrap | 4/4 | Complete | 2026-04-10 |
| 2. Source Registry & Evidence Capture | 3/3 | Complete    | 2026-04-11 |
| 3. Insights & Analysis Graph | 0/3 | Not started | - |
| 4. Report Generation | 0/3 | Not started | - |
| 5. Status, Freshness & Verification | 0/3 | Not started | - |
| 6. Runtime Installation & Lifecycle | 0/3 | Not started | - |
