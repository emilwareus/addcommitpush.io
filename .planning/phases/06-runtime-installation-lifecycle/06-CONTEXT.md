# Phase 6: Runtime Installation & Lifecycle - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 turns the existing Researcher core into something users can install, update, and inspect
inside real Codex and Claude Code projects.

The phase covers the runtime-facing asset layer only: commands, skills, scripts, templates,
settings merges, ownership metadata, and lifecycle commands needed to install and maintain
Researcher. It does not redesign the research artifact graph, the status model, or the existing
source/insight/analysis/report contracts already validated in Phases 1 through 5.

</domain>

<decisions>
## Implementation Decisions

### Install scope and target mode
- **D-70:** Phase 6 should treat **project-local installation as the primary v1 path** for both
  Codex and Claude Code. Install into repo-local runtime directories (`./.codex/`, `./.claude/`)
  first, because the requirement is "install into a project" and this keeps Researcher local-first,
  inspectable, and git-friendly.
- **D-71:** Global installation compatibility may be preserved in the architecture, but it is not
  the primary success path for this phase. Planning should optimize for reliable local installs
  first and treat broader global parity as secondary unless it falls out cheaply from the same
  installer structure.

### Runtime surface mapping
- **D-72:** Researcher should expose **one runtime-neutral command set** across Codex and Claude
  Code. The verb layer stays conceptually the same (`research-new`, `research-harvest`,
  `research-report`, `research-status`, etc.), while each runtime gets its native entry surface:
  Codex via skills and Claude Code via slash-command markdown files.
- **D-73:** Claude Code should use project-local `.claude/commands/` entries and only the minimum
  additional runtime files needed for Researcher behavior. Codex should use project-local
  `.codex/skills/research-*/SKILL.md` entries rather than inventing a second Codex-specific command
  model.

### Managed asset ownership
- **D-74:** Phase 6 should keep **one shared source-of-truth payload** for Researcher logic and
  templates, then generate or sync thin runtime adapters from that payload. Do not hand-maintain
  separate Claude and Codex copies of the same workflow logic.
- **D-75:** Installed runtime-facing files should be treated as **installer-managed artifacts**.
  The installer must write ownership markers or an install manifest so update, inspect, and
  uninstall flows can act deterministically instead of guessing which files belong to Researcher.
- **D-76:** User customization should not require editing generated runtime files in place.
  Planning should preserve a clean boundary between managed files and user-authored extensions so
  updates stay safe and predictable.

### Settings and hooks policy
- **D-77:** Hooks and runtime settings must be **non-destructive and opt-in where behavior changes
  are material**. This repo already has project-local Claude configuration, so Phase 6 must merge
  settings carefully instead of overwriting runtime config wholesale.
- **D-78:** The default install should focus on the minimum assets required to make Researcher
  usable. Optional hooks, statusline integrations, or aggressive runtime guards should not be
  required for a successful base installation.

### Update and inspect lifecycle
- **D-79:** Phase 6 must provide explicit **install**, **update**, and **inspect** flows. Reinstall
  by hand is not an acceptable substitute for update, and "look at the filesystem manually" is not
  an acceptable substitute for inspect.
- **D-80:** Inspect should report installed runtime assets, target locations, ownership status, and
  version or source identity in one deterministic summary so operators can see what Researcher put
  into the project and whether it drifted.
- **D-81:** Update should be ownership-aware. The installer should detect managed files, refresh
  them deterministically, and surface drift or conflicts explicitly rather than silently clobbering
  local edits.

### the agent's Discretion
- Exact manifest file shape for installed-asset ownership metadata
- Exact naming of the install/update/inspect entrypoints as long as the lifecycle remains explicit
- Exact split between copied runtime adapters and shared in-project core payload files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and phase requirements
- `.planning/PROJECT.md` — Project constraints, local-first requirement, and the Phase 6 goal
- `.planning/REQUIREMENTS.md` — `INST-01` through `INST-04` acceptance targets
- `.planning/ROADMAP.md` — Phase boundary, dependencies, and success criteria for runtime
  installation and lifecycle
- `.planning/STATE.md` — Current project position and next-phase focus

### Prior phase decisions that constrain Phase 6
- `.planning/phases/05-status-freshness-verification/05-CONTEXT.md` — Locked thin-runtime-wrapper
  rule and deterministic status/output constraints
- `.planning/phases/04-report-generation/04-CONTEXT.md` — Locked `RPT-*` artifact and runtime CLI
  patterns that Phase 6 must install rather than redesign
- `.planning/phases/03-insights-analysis-graph/03-CONTEXT.md` — Locked `INS-*` / `ANL-*` artifact
  and thin-CLI rules
- `.planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md` — Locked source refresh and
  evidence-capture command boundaries
- `.planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md` — Locked local-first workspace
  root and thin entrypoint pattern

### Researcher product design
- `researcher/README.md` — Runtime layout, command map, and GSD-derived positioning
- `researcher/DESIGN.md` — Thin orchestrators, shared tooling layer, and installable system thesis
- `researcher/WORKFLOWS.md` — Intended command surface and operator interaction model
- `researcher/IMPLEMENTATION-ROADMAP.md` — Milestone direction for interaction/runtime work
- `researcher/CONTRACTS.md` — Structured orchestration contract model that runtime adapters must
  expose cleanly

### Existing runtime-facing code in this repo
- `scripts/research-init.ts` — Existing thin CLI entrypoint pattern to install around
- `scripts/research-resume.ts` — Existing runtime wrapper pattern
- `scripts/research-source-add.ts` — Existing command wrapper pattern for source operations
- `scripts/research-source-refresh.ts` — Existing command wrapper pattern for refresh operations
- `scripts/research-insight.ts` — Existing command wrapper pattern for insight promotion
- `scripts/research-analysis.ts` — Existing command wrapper pattern for analysis promotion
- `scripts/research-report.ts` — Existing command wrapper pattern for report generation
- `scripts/research-status.ts` — Existing command wrapper pattern for progress routing
- `internal/tools/researcher/` — Shared deterministic core that runtime installs must expose

### Existing runtime conventions and GSD install references
- `.claude/commands/create_plan.md` — Existing project-local Claude command convention in this repo
- `.claude/settings.local.json` — Existing project-local Claude settings surface that Phase 6 must
  merge with carefully
- `go-research/external_code/get-shit-done/bin/install.js` — Concrete GSD installer design,
  runtime-directory mapping, ownership markers, and local/global mode handling
- `go-research/external_code/get-shit-done/README.ko-KR.md` — Concrete GSD runtime install paths
  for Claude and Codex plus troubleshooting expectations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/research-*.ts`: There is already a consistent thin-wrapper CLI pattern for every major
  Researcher operation.
- `internal/tools/researcher/`: The shared core is already runtime-neutral, which makes it a good
  source-of-truth payload for both Codex and Claude adapters.
- `.claude/commands/`: This repo already demonstrates a project-local Claude command layout.

### Established Patterns
- Shared logic lives under `internal/tools/researcher/`; scripts only parse args and print
  deterministic JSON.
- Researcher is already file-based and local-first, so install flows should preserve repo-local
  visibility instead of hiding core state in opaque global runtime state.
- Prior phases repeatedly chose thin adapters over duplicated runtime logic.

### Integration Points
- Codex installation will need to bridge the shared script/core layer into `.codex/skills/`.
- Claude Code installation will need to bridge the shared script/core layer into
  `.claude/commands/` and any minimal supporting settings/hooks.
- Update and inspect flows need one ownership source of truth that can reason across
  `researcher/`, `scripts/`, `.claude/`, and `.codex/`.

</code_context>

<specifics>
## Specific Ideas

- The product should be installable by real users, not just "implemented in this repo."
- The installed experience should feel structurally like GSD: commands, skills, scripts, and
  supporting runtime assets rather than a loose prompt collection.
- Codex and Claude Code should share the same mental model even if their runtime entry surfaces are
  different.

</specifics>

<deferred>
## Deferred Ideas

- Global-first install optimization remains secondary to project-local installation.
- Plugin or marketplace packaging beyond the base installer/update/inspect lifecycle belongs in a
  later milestone.
- Rich optional hooks, statusline integrations, or community runtime extras should stay out of the
  required v1 install path unless they fall out cheaply from the same ownership model.

</deferred>

---
*Phase: 06-runtime-installation-lifecycle*
*Context gathered: 2026-04-11*
