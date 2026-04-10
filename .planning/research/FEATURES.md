# Feature Research

**Domain:** installable deep-research operating system for Codex and Claude Code
**Researched:** 2026-04-10
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Installable runtime surface | Serious users expect project-scoped commands, skills, and adapter setup | MEDIUM | Must work in both Codex and Claude Code |
| Bounded research workspace | Users need one research brief, manifest, and fixed artifact folders | LOW | This is the anchor for all downstream flows |
| Central source registry | Source tracking with URLs, timestamps, and status is required for trust | MEDIUM | `sources.json` should be canonical |
| Reusable insights | Users expect more than a final report; they want reusable claims and notes | MEDIUM | Atomic insight files are core product value |
| Citation-backed reports | Research outputs must be traceable to evidence | MEDIUM | Reports should reference insight IDs and source lineage |
| Progress and resume support | Long-running research must survive interruptions | MEDIUM | Needs status routing, checkpoints, and manifest state |
| Refresh workflow | Users expect to add sources later without restarting from scratch | MEDIUM | Requires freshness metadata and stale propagation |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Artifact lineage graph | Every report claim can trace back through insight IDs to source IDs | HIGH | Strongest differentiator and core trust primitive |
| Verification debt and freshness gates | Surface weak sourcing, stale evidence, and unresolved contradictions early | HIGH | Makes the system feel rigorous rather than merely productive |
| Cross-runtime portability | Same conceptual workflow in Codex and Claude Code | HIGH | Requires thin adapters and runtime-neutral core logic |
| Multi-report compiler | Generate multiple report angles from one evidence base | HIGH | Must treat reports as packaging, not system of record |
| Specialist research workers | Separate harvest, audit, extract, synthesize, and report roles | MEDIUM | Preserves context quality and aligns with GSD’s orchestration model |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| One-shot report generation | Feels fast and magical | Destroys reuse, lineage, and refreshability | Artifact-first pipeline with reusable insights |
| SaaS-first opaque state | Seems easier to centralize | Breaks local-first durability and inspectability | File-based manifests and registries |
| Unbounded web crawling by default | Feels comprehensive | Produces noisy, low-trust evidence and token waste | Scoped source policies and bounded harvest tasks |
| Fancy output modes first | Audio, slides, and gimmicks look impressive | Distracts from core evidence pipeline | Ship durable source/insight/report flows first |
| Generic IDE replacement | Feels ambitious | Splits focus and competes with the runtimes it should extend | Stay an installable operating layer on top of Codex and Claude Code |

## Feature Dependencies

```text
Install Surface
    └──requires──> Runtime Adapters
                           └──requires──> Core CLI / Graph Engine

Source Registry
    └──requires──> Research Workspace Initialization

Insights
    └──requires──> Source Registry
                           └──enhances──> Analysis
                                               └──requires──> Reports

Freshness / Verification
    └──requires──> Source Registry + Insight / Analysis lineage
```

### Dependency Notes

- **Runtime adapters require a shared core:** install behavior should differ, but artifact semantics should not.
- **Insights require the source registry:** claims without stable source IDs are not reusable.
- **Reports require analysis and insights:** the report layer should package existing knowledge, not invent it.
- **Freshness depends on lineage:** stale propagation only works if dependencies are explicit.

## MVP Definition

### Launch With (v1)

- [ ] Installable Codex adapter
- [ ] Installable Claude Code adapter
- [ ] Research initialization with brief, manifest, and source registry
- [ ] Source ingestion and tracking
- [ ] Insight creation and linkage
- [ ] Markdown report generation from existing insights/analysis
- [ ] Status / refresh / verification debt visibility

### Add After Validation (v1.x)

- [ ] Richer contradiction review flows
- [ ] Optional notebook helpers and data export conveniences
- [ ] Better source snapshotting and local evidence capture tools
- [ ] Cross-runtime parity polish and update/install tooling

### Future Consideration (v2+)

- [ ] Team collaboration features across shared research bases
- [ ] Hosted synchronization or remote evidence stores
- [ ] Rich visual dashboards for research graphs
- [ ] Non-Markdown derivative output modes

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Runtime install surface | HIGH | MEDIUM | P1 |
| Source registry | HIGH | MEDIUM | P1 |
| Insight lineage | HIGH | HIGH | P1 |
| Report compiler | HIGH | HIGH | P1 |
| Refresh / status debt | HIGH | MEDIUM | P1 |
| Specialist subagents | MEDIUM | MEDIUM | P2 |
| Notebook helpers | MEDIUM | MEDIUM | P2 |
| Rich dashboards | LOW | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Existing research products | Runtime OS tools | Our Approach |
|---------|----------------------------|------------------|--------------|
| Final report generation | Common | Not core | Support, but make it derived output only |
| Reusable insight graph | Weak or inconsistent | Rare | Make it first-class |
| Installable runtime workflows | Weak | Strong in GSD-style tooling | Copy that strength directly |
| Provenance and freshness debt | Often partial | Usually absent | Make it explicit and enforced |

## Sources

- Internal project context: `.planning/PROJECT.md`, `researcher/README.md`
- OpenAI Deep Research documentation and product guidance
- OpenAI Codex product and customization documentation
- Anthropic Claude Code docs for commands, subagents, hooks, MCP, and settings
- NotebookLM documentation for evidence-backed note and notebook expectations

---
*Feature research for: installable deep-research operating system for Codex and Claude Code*
*Researched: 2026-04-10*

