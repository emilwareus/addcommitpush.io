# Pitfalls Research

**Domain:** installable deep-research operating system for Codex and Claude Code
**Researched:** 2026-04-10
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Prompt-System Accretion

**What goes wrong:**
Prompt files, skills, hooks, and adapter docs sprawl until no one knows which instruction surface is authoritative.

**Why it happens:**
It feels cheap to keep adding instructions instead of moving behavior into deterministic tooling.

**How to avoid:**
Keep prompts thin. Move IDs, validation, lineage, and freshness logic into the shared core.

**Warning signs:**
The orchestrator "knows" facts that are not written into artifacts or registries.

**Phase to address:**
Phase 1 and Phase 2

---

### Pitfall 2: Provenance Collapse

**What goes wrong:**
Insights, analysis, or reports exist without stable source IDs and dates, making refresh and audit impossible.

**Why it happens:**
Teams optimize for fast report generation before building the evidence graph.

**How to avoid:**
Require source IDs, timestamps, and downstream linkage before promotion into reusable artifacts.

**Warning signs:**
A report sentence cannot be traced to one concrete source unit.

**Phase to address:**
Phase 2 and Phase 3

---

### Pitfall 3: Runtime Fragmentation

**What goes wrong:**
Codex and Claude Code implementations drift apart until one runtime becomes first-class and the other becomes brittle.

**Why it happens:**
Runtime installation surfaces differ, so teams start encoding core behavior inside adapters.

**How to avoid:**
Build one shared core and keep adapters thin, explicit, and testable.

**Warning signs:**
A workflow works in one runtime but breaks or behaves differently in the other.

**Phase to address:**
Phase 1, Phase 5, and Phase 6

---

### Pitfall 4: Stale-Evidence Leakage

**What goes wrong:**
Old evidence continues to support current reports because downstream artifacts are never marked stale.

**Why it happens:**
Freshness metadata exists at the source level but is not propagated through insights and reports.

**How to avoid:**
Model the dependency chain explicitly: `SRC -> INS -> ANL -> RPT`.

**Warning signs:**
Refresh updates sources but no report or analysis status changes.

**Phase to address:**
Phase 3 and Phase 4

---

### Pitfall 5: Report Optimism

**What goes wrong:**
The system produces polished reports before contradiction review, citation checks, or freshness gates complete.

**Why it happens:**
Report output feels like the product, so teams prioritize shine over defensibility.

**How to avoid:**
Gate report generation on evidence completeness, contradiction review, freshness, and unresolved-question disclosure.

**Warning signs:**
Reports look persuasive but cite only high-level summaries or internal notes.

**Phase to address:**
Phase 4 and Phase 6

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Let agents hand-edit registries | Fast initial iteration | Broken lineage and invalid state | Never for canonical JSON |
| Encode logic in runtime-specific prompts | Faster first adapter | Runtime drift and unclear precedence | Only for thin adapter instructions |
| Skip stale propagation | Simpler refresh implementation | Silent evidence rot | Never if refresh is a promised feature |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Codex adapter | Treat `AGENTS.md` as the whole system | Keep AGENTS thin and point to the shared core assets |
| Claude Code adapter | Spread behavior across commands, hooks, and settings without precedence | Document adapter boundaries clearly and keep core logic shared |
| Search / deep research tools | Couple the core to one search vendor | Make search integrations optional and pluggable |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Giant orchestration prompts | Context bloat and poor handoffs | Keep prompts as maps, not encyclopedias | Early, once workflows grow |
| Over-parallel synthesis | Duplicate or conflicting insights | Bound worker roles and add graph-level dedupe | As research volume grows |
| Full-tree rescans for every command | Slow status and refresh operations | Add indexes and manifest-driven lookups | Multi-research scale |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting hooks as the only guardrail | Unsafe or inconsistent enforcement | Treat hooks as advisory and validate in the core too |
| Weak source metadata | Citation and audit failures | Require structured source provenance |
| Unscoped external browsing | Low-trust evidence and token waste | Use bounded source policies and explicit harvest tasks |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Too many artifact types too early | Feels bureaucratic and brittle | Start with the minimal graph that preserves reuse |
| Hidden state transitions | Users cannot tell what is stale or what to do next | Surface status, freshness debt, and next action explicitly |
| Runtime-specific commands with no shared mental model | Cognitive overhead and mistrust | Keep the same conceptual workflow across runtimes |

## "Looks Done But Isn't" Checklist

- [ ] **Source registry:** Every reusable claim still needs stable source IDs and dates
- [ ] **Insights:** Each insight still needs evidence, caveats, and lineage
- [ ] **Reports:** Each report still needs freshness state and explicit derivation
- [ ] **Adapters:** Each runtime still needs verified parity on the same core workflow

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Provenance collapse | HIGH | Rebuild lineage from sources upward, then invalidate affected analysis and reports |
| Runtime fragmentation | HIGH | Extract shared core behavior, shrink adapters, and document precedence |
| Prompt-system sprawl | MEDIUM | Consolidate instruction surfaces and move behavior into tooling |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Prompt-system accretion | Phase 1 | Core logic lives in tooling, not in giant prompts |
| Provenance collapse | Phase 2 | All promoted insights have valid source lineage |
| Runtime fragmentation | Phase 5 | Codex and Claude adapters pass the same workflow scenarios |
| Stale-evidence leakage | Phase 3 | Stale propagation marks downstream artifacts correctly |
| Report optimism | Phase 4 | Report generation blocks on verification gates |

## Sources

- Internal project context: `.planning/PROJECT.md`, `researcher/WORKFLOWS.md`
- OpenAI Codex customization, AGENTS, hooks, skills, subagents, sandboxing, and deep research docs
- Anthropic Claude Code settings, slash commands, subagents, hooks, and MCP docs

---
*Pitfalls research for: installable deep-research operating system for Codex and Claude Code*
*Researched: 2026-04-10*

