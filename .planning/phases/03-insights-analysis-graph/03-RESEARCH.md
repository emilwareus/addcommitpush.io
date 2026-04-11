# Phase 3: Insights & Analysis Graph - Research

**Researched:** 2026-04-11
**Domain:** Markdown-first insight and analysis artifacts, bidirectional lineage, and contradiction-aware synthesis for Researcher [VERIFIED: codebase grep] [VERIFIED: codebase grep]
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Insight identity and granularity
- **D-30:** Insight artifacts are canonical Markdown files under `insights/` with stable `INS-*`
  IDs allocated from `manifest.next_ids.insight`. Filenames should include the ID plus a readable
  slug, but the ID is the authoritative identity. [VERIFIED: codebase grep]
- **D-31:** One insight must represent one atomic reusable claim. If a finding requires multiple
  unrelated claims or a full thesis, that belongs in multiple insights or in an analysis artifact,
  not one oversized insight file. [VERIFIED: codebase grep]

### Insight contract and evidence shape
- **D-32:** Insights should use YAML frontmatter plus fixed Markdown sections. The canonical Phase 3
  body shape is: `Claim`, `Why It Matters`, `Evidence`, `Caveats`, and `Reuse Notes`. [VERIFIED: codebase grep]
- **D-33:** The canonical insight frontmatter should include: `id`, `title`, `status`,
  `confidence`, `derived_from_sources`, `tags`, `linked_analysis`, `linked_reports`,
  `created_at`, and `updated_at`. For Phase 3, the insight status lifecycle is
  `draft -> validated`, with `disputed` and `superseded` available when needed. [VERIFIED: codebase grep]
- **D-34:** Every insight must link to one or more supporting `SRC-*` records in both machine state
  and human-readable content. Evidence support should be expressed in terms of source IDs and short
  support notes, not raw URLs alone. [VERIFIED: codebase grep]

### Lineage and backlink behavior
- **D-35:** Source-to-insight lineage must stay explicit and bidirectional. Creating or updating an
  insight must synchronize `sources.json[*].linked_insights` so the source ledger remains the
  canonical entrypoint for downstream provenance. [VERIFIED: codebase grep]
- **D-36:** Duplicate insight detection should remain deterministic and conservative in Phase 3.
  Use normalized title/claim fingerprints plus overlapping source lineage to catch obvious
  duplicates; do not introduce embedding-based or provider-specific semantic dedupe in this phase. [VERIFIED: codebase grep]

### Analysis artifact shape
- **D-37:** Analysis artifacts are canonical Markdown files under `analysis/` with stable `ANL-*`
  IDs allocated from `manifest.next_ids.analysis`. Optional notebooks or datasets may exist as
  companions later, but the primary Phase 3 analysis contract is Markdown. [VERIFIED: codebase grep]
- **D-38:** Every analysis artifact should start from an explicit analytic question or angle and
  reference insight IDs as its primary inputs. Analyses should synthesize insights, not bypass them
  by speaking directly to raw source URLs except where an explicit note is necessary. [VERIFIED: codebase grep]
- **D-39:** The canonical Phase 3 analysis body shape is: `Question`, `Synthesis`,
  `Contradictions`, `Caveats`, `Open Questions`, and `Next Moves`. Contradictions and unresolved
  questions must be first-class sections, not buried in narrative prose. [VERIFIED: codebase grep]
- **D-40:** Higher-order analysis should require a grouped insight set rather than a single insight.
  The default expectation is that an analysis references at least two insights unless it is clearly
  acting as a transitional scaffold that the planner explicitly justifies. [VERIFIED: codebase grep]

### Phase boundaries and runtime behavior
- **D-41:** Phase 3 should preserve the lineage needed for later stale-impact propagation, but it
  should not implement downstream stale marking of insights, analysis, or reports. That remains
  Phase 5 scope. [VERIFIED: codebase grep]
- **D-42:** All insight and analysis mutation, ID allocation, schema validation, and backlink
  synchronization must go through shared deterministic tooling in `internal/tools/researcher/`,
  with thin runtime entrypoints that parse input and print deterministic machine-readable output. [VERIFIED: codebase grep]

### Claude's Discretion
- Exact helper/module boundaries for insight creation, analysis creation, and backlink syncing [VERIFIED: codebase grep]
- Exact filename slugging rules as long as `INS-*` and `ANL-*` remain the authoritative IDs [VERIFIED: codebase grep]
- Whether some analysis metadata lives in frontmatter vs. fixed body sections, as long as lineage,
  contradictions, caveats, and open questions remain explicit and machine-readable enough for later
  phases [VERIFIED: codebase grep]

### Deferred Ideas (OUT OF SCOPE)
- Report generation, report-specific packaging, and report citation rendering belong to Phase 4. [VERIFIED: codebase grep]
- Downstream stale marking of insights, analysis, or reports belongs to Phase 5. [VERIFIED: codebase grep]
- Embedding-based semantic dedupe, clustering, or auto-taxonomy systems remain future work. [VERIFIED: codebase grep]
- Collaborative multi-user editing of insights and analysis remains future work. [VERIFIED: codebase grep]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INS-01 | User can promote gathered material into reusable insight artifacts with stable IDs. [VERIFIED: codebase grep] | Allocate `INS-*` from `manifest.next_ids.insight`, persist one Markdown artifact per atomic claim under `insights/`, and validate the frontmatter plus fixed body sections before writing. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] |
| INS-02 | User can link each insight to one or more supporting source records. [VERIFIED: codebase grep] | Keep `derived_from_sources` in insight frontmatter, require matching `Evidence` bullets with short support notes, and reconcile those source IDs back into `sources.json[*].linked_insights`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] |
| INS-03 | User can group multiple insights into higher-order analysis artifacts. [VERIFIED: codebase grep] | Allocate `ANL-*` from `manifest.next_ids.analysis`, require `derived_from_insights` plus an explicit analytic question, and store the canonical synthesis in Markdown under `analysis/`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] |
| INS-04 | User can inspect contradictions, caveats, or unresolved questions in analysis artifacts. [VERIFIED: codebase grep] | Make `Contradictions`, `Caveats`, and `Open Questions` required first-class sections in every `ANL-*` artifact and validate their presence during tool-owned writes. [VERIFIED: codebase grep] [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 3 should keep the public machine-state surface small: `sources.json` remains the canonical source ledger, while `INS-*` and `ANL-*` stay canonical as Markdown artifacts in `insights/` and `analysis/`. The clean implementation is not a new graph database or sidecar lineage index. It is a deterministic reconciliation loop across three existing surfaces: `sources.json`, insight frontmatter/body, and analysis frontmatter/body. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]

The main contract decision is to validate Markdown artifacts in two layers. Parse YAML frontmatter with one stable parser, validate that parsed object with schema-backed tooling, then validate the fixed Markdown section contract separately. This matches the repo's existing contract-first pattern without pretending a full Markdown document is best modeled as raw JSON. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: npm registry]

The second planning decision is to treat backlink sync as reconciliation, not as independent writes to multiple registries. On every insight create/update, the core should diff the previous and next `derived_from_sources` sets, then rewrite only the affected `sources.json[*].linked_insights` arrays in sorted unique form. The same pattern should later apply from analysis artifacts back into insight `linked_analysis` arrays. That keeps provenance explicit without inventing a second canonical graph store. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]

**Primary recommendation:** Use schema-validated Markdown artifacts with fixed section headings, implement duplicate detection from normalized title/claim text plus conservative source overlap, and make backlink reconciliation the only supported provenance mutation path. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

## Recommended Plan Split

### `03-01` — Define insight and analysis artifact schemas
- Freeze the Phase 3 artifact contracts in `researcher/templates/INSIGHT.md`, a new `researcher/templates/ANALYSIS.md`, plus frontmatter schemas and TypeScript contract helpers under `internal/tools/researcher/contracts/`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Add one shared Markdown parsing/validation boundary that parses frontmatter, validates metadata, and checks required section order and presence before any writer persists an artifact. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Lock the deterministic duplicate-check inputs here: normalized `title`, normalized `Claim` section text, and sorted `derived_from_sources`. Do not persist a second fingerprint file. [VERIFIED: codebase grep]
- Tests for this plan should cover contract parsing, invalid frontmatter, missing sections, section order, evidence/body mismatch, and duplicate-check normalization. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

### `03-02` — Build lineage linking from sources to insights
- Implement one shared insight upsert core that allocates `INS-*`, writes the Markdown file, updates `manifest.inventory.insights`, and synchronizes `sources.json[*].linked_insights`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Reuse the Phase 2 load/validate/persist boundary instead of opening `sources.json` directly from scripts or prompts. [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Support update reconciliation as a first-class path: if an insight drops `SRC-0004`, that source's `linked_insights` array must lose the insight ID in the same operation. [VERIFIED: codebase grep]
- Tests for this plan should prove create, update, dropped-source unlink, missing-source rejection, conservative duplicate prevention, and resume inventory compatibility. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

### `03-03` — Add contradiction and caveat tracking
- Implement one shared analysis upsert core that allocates `ANL-*`, writes canonical Markdown under `analysis/`, updates `manifest.inventory.analysis`, and synchronizes referenced insight `linked_analysis` arrays. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Make `Contradictions`, `Caveats`, and `Open Questions` required structured sections, not optional prose fragments. [VERIFIED: codebase grep]
- Keep Phase 3 scope tight: no report generation, no stale propagation, and no notebook-first analysis flow in this plan. [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Tests for this plan should prove the minimum insight-set rule, contradiction-section validation, insight backlink sync, and update behavior when an analysis changes its insight set. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

## Project Constraints (from CLAUDE.md)

- TypeScript must stay strict, use descriptive naming, prefer early returns, keep nesting minimal, and avoid `any`. [VERIFIED: codebase grep]
- Do not add fallback code paths or graceful-degradation branches. [VERIFIED: codebase grep]
- Keep dependencies lean and prefer built-in capabilities plus well-supported libraries. [VERIFIED: codebase grep]
- Use `pnpm` for package management and scripts. [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Do not run `pnpm dev`. [VERIFIED: codebase grep]

## Standard Stack

Phase 3 should reuse the Phase 2 validation boundary and add exactly one new Markdown-frontmatter parser. A full Markdown AST stack is unnecessary for this phase because the body contract is fixed and tool-owned, but a hand-rolled YAML frontmatter parser is also the wrong tradeoff. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: npm registry]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `gray-matter` | `4.0.3` latest, modified 2023-07-12 [VERIFIED: npm registry] | Parse YAML frontmatter from `INS-*` and `ANL-*` Markdown artifacts. [VERIFIED: npm registry] | The repo currently has no frontmatter parser, and `gray-matter` is purpose-built for this exact job without bringing in a larger remark/unified stack. [VERIFIED: codebase grep] [VERIFIED: npm registry] |
| `ajv` | Repo installed `8.18.0`; latest `8.18.0`, modified 2026-02-20 [VERIFIED: codebase grep] [VERIFIED: npm registry] | Validate parsed frontmatter objects against schema-backed contracts. [VERIFIED: codebase grep] | Phase 1 and Phase 2 already use Ajv as the shared contract boundary, so Phase 3 should extend that pattern instead of introducing a second schema engine for artifact metadata. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] |
| `ajv-formats` | Repo installed `3.0.1`; latest `3.0.1`, modified 2024-03-30 [VERIFIED: codebase grep] [VERIFIED: npm registry] | Enforce `date-time` and similar format checks on artifact timestamps. [VERIFIED: codebase grep] | The Phase 2 validator already wires `ajv-formats`, so insight and analysis schemas should reuse it for `created_at` and `updated_at` rather than weaken timestamp validation. [VERIFIED: codebase grep] |
| `node:fs/promises` + `node:path` | Local runtime `v20.19.4`; project target `24.x` [VERIFIED: local runtime] [VERIFIED: codebase grep] | Deterministic file IO, directory scans, and root-confined artifact writes. [VERIFIED: codebase grep] | Existing Researcher core code already uses Node built-ins for bounded file operations, and Phase 3 should stay on that same path. [VERIFIED: codebase grep] [VERIFIED: codebase grep] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | Repo installed `4.21.0` [VERIFIED: codebase grep] [VERIFIED: local runtime] | Thin runtime entrypoints for `research-insight` and `research-analysis`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] | Use for CLI wrappers only; keep all parsing, duplicate checks, and backlink sync in `internal/tools/researcher/core/`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] |
| `vitest` | Repo installed `4.1.4` [VERIFIED: codebase grep] [VERIFIED: local runtime] | Temp-workspace regression coverage for contract parsing, insight lineage sync, and analysis contradiction rules. [VERIFIED: codebase grep] [VERIFIED: codebase grep] | Use the existing Node test harness; no new test framework is needed. [VERIFIED: codebase grep] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `gray-matter` for frontmatter parsing | Hand-rolled YAML/frontmatter splitting | Hand-rolled parsing is brittle and duplicates a solved problem; Phase 3 should stay deterministic, not parser-ad-hoc. [VERIFIED: npm registry] |
| Frontmatter schema validation plus a fixed-heading body parser | A full Markdown AST pipeline such as remark/unified [ASSUMED] | A full AST stack buys flexibility the locked contract does not need yet, while the fixed Phase 3 section headings are small enough to validate deterministically after frontmatter parse. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [ASSUMED] |
| `sources.json[*].linked_insights` as the only source-backlink ledger | A second provenance index file under `data/` or `analysis/` | A second ledger would drift from Phase 2's canonical source contract and violate the locked requirement to reuse `linked_insights`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] |

**Installation:**
```bash
pnpm add gray-matter
```

**Version verification:** `gray-matter@4.0.3`, `ajv@8.18.0`, `ajv-formats@3.0.1`, `tsx@4.21.0`, and `vitest@4.1.4` were verified against the npm registry, `package.json`, or the local runtime in this session. [VERIFIED: npm registry] [VERIFIED: codebase grep] [VERIFIED: local runtime]

## Architecture Patterns

### Recommended Project Structure
```text
researcher/
├── schemas/
│   ├── insight-frontmatter.schema.json
│   └── analysis-frontmatter.schema.json
└── templates/
    ├── INSIGHT.md
    └── ANALYSIS.md

internal/tools/researcher/
├── contracts/
│   ├── insights.ts
│   └── analysis.ts
├── core/
│   ├── artifacts/
│   │   ├── markdown.ts
│   │   └── sections.ts
│   ├── insights/
│   │   ├── upsert.ts
│   │   ├── backlinks.ts
│   │   └── dedupe.ts
│   └── analysis/
│       ├── upsert.ts
│       └── backlinks.ts
└── fs/
    └── workspace-paths.ts

scripts/
├── research-insight.ts
└── research-analysis.ts
```

This keeps Phase 3 consistent with the existing thin-core/thin-CLI split and avoids scattering artifact parsing logic across scripts. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [ASSUMED]

### Pattern 1: Insight Contract = Frontmatter Schema + Fixed Sections
**What:** Treat an insight as one Markdown file whose metadata is validated separately from its body sections. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

**When to use:** Plan `03-01` should freeze this contract before any writer or backlink logic is implemented. [VERIFIED: codebase grep]

**Recommended insight frontmatter:** The frontmatter fields below are locked by the Phase 3 context; the confidence vocabulary recommendation reuses the Phase 2 confidence scale for operator consistency. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [ASSUMED]

```yaml
---
id: INS-0001
title: Pricing compression is accelerating in coding-agent products
status: draft
confidence: medium
derived_from_sources:
  - SRC-0004
  - SRC-0011
tags:
  - pricing
  - coding-agents
linked_analysis: []
linked_reports: []
created_at: 2026-04-11T09:00:00.000Z
updated_at: 2026-04-11T09:00:00.000Z
---
```

**Recommended body rules:** The planner should lock these as validation rules, not as optional style suggestions. [VERIFIED: codebase grep]

| Rule | Why |
|------|-----|
| Required `##` headings must appear in this exact order: `Claim`, `Why It Matters`, `Evidence`, `Caveats`, `Reuse Notes`. [VERIFIED: codebase grep] | A fixed order makes parsing deterministic and keeps artifacts legible across runtimes. [VERIFIED: codebase grep] |
| `derived_from_sources` must be unique, sorted, and non-empty. [VERIFIED: codebase grep] | The field is both the forward lineage anchor and the backlink sync input. [VERIFIED: codebase grep] |
| Every `Evidence` bullet should begin with ``- `SRC-####`:`` and include a short support note. [VERIFIED: codebase grep] [VERIFIED: codebase grep] | This keeps human-readable evidence aligned with machine-readable source IDs without adding a second evidence registry. [VERIFIED: codebase grep] |
| The set of `SRC-*` IDs parsed from `Evidence` must equal `derived_from_sources`. [VERIFIED: codebase grep] | This is the cleanest way to prevent frontmatter/body drift. [ASSUMED] |
| `linked_analysis` and `linked_reports` should be tool-managed sorted unique arrays. [VERIFIED: codebase grep] | These are backlinks, so manual edits should be normalized or overwritten by shared tooling. [ASSUMED] |

### Pattern 2: Duplicate Detection = Normalized Text + Conservative Lineage Overlap
**What:** Compute duplicates from the candidate artifact itself instead of storing a second fingerprint ledger. [VERIFIED: codebase grep]

**When to use:** Plan `03-02`, inside the shared insight create/update core. [VERIFIED: codebase grep]

**Recommended duplicate rules:** These rules are conservative by design and stay inside the locked Phase 3 boundary. [VERIFIED: codebase grep]

1. Normalize `title` and `Claim` text by trimming, lowercasing, collapsing whitespace, and removing Markdown punctuation wrappers. [ASSUMED]
2. On update, exclude the current `INS-*` from the comparison set. [ASSUMED]
3. Mark as an obvious duplicate when `claimFingerprint` matches and the source sets overlap by at least one `SRC-*`. [VERIFIED: codebase grep] [ASSUMED]
4. Mark as an obvious duplicate when `titleFingerprint` matches and the sorted source sets are identical. [VERIFIED: codebase grep] [ASSUMED]
5. Do not use embeddings, vector search, provider APIs, or probabilistic matching in Phase 3. [VERIFIED: codebase grep]

### Pattern 3: Backlink Sync = Reconciliation, Not Parallel Provenance State
**What:** Keep one forward link field on the artifact and one backlink field on the referenced record, then reconcile the backlink from the forward link on every write. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

**When to use:** Source-to-insight sync in `03-02`, and insight-to-analysis sync in `03-03`. [VERIFIED: codebase grep]

**Source backlink algorithm:** This is the recommended Phase 3 source-to-insight contract. [VERIFIED: codebase grep] [ASSUMED]

1. Parse the existing insight, if any, to get the prior `derived_from_sources` set. [ASSUMED]
2. Validate the new artifact and compute the next `derived_from_sources` set. [VERIFIED: codebase grep]
3. Require every referenced `SRC-*` to exist in `sources.json`; fail the write if any are missing. [VERIFIED: codebase grep] [ASSUMED]
4. Remove the insight ID from source records no longer referenced. [VERIFIED: codebase grep]
5. Add the insight ID to all newly referenced source records. [VERIFIED: codebase grep]
6. Sort and dedupe every affected `linked_insights` array before persisting. [ASSUMED]

### Pattern 4: Analysis Contract = Insight-First Synthesis With Explicit Tensions
**What:** Treat an analysis as one Markdown artifact grounded in multiple insight IDs and an explicit analytic question. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

**When to use:** Plan `03-03`. [VERIFIED: codebase grep]

**Recommended analysis frontmatter:** The metadata placement is discretionary in the context; the fields below are the tightest fit for later indexing without dragging report behavior into Phase 3. [VERIFIED: codebase grep] [ASSUMED]

```yaml
---
id: ANL-0001
title: Pricing pressure is segment-specific, not uniform
status: draft
question: Where is price compression strongest across coding-agent segments?
derived_from_insights:
  - INS-0002
  - INS-0005
  - INS-0007
tags:
  - pricing
  - segmentation
created_at: 2026-04-11T09:30:00.000Z
updated_at: 2026-04-11T09:30:00.000Z
---
```

**Recommended body rules:** [VERIFIED: codebase grep]

| Rule | Why |
|------|-----|
| Required `##` headings must appear in this exact order: `Question`, `Synthesis`, `Contradictions`, `Caveats`, `Open Questions`, `Next Moves`. [VERIFIED: codebase grep] | Fixed headings keep contradiction and caveat material explicit and parsable. [VERIFIED: codebase grep] |
| `derived_from_insights` must be unique, sorted, and usually contain at least two insight IDs. [VERIFIED: codebase grep] | This enforces the insight-first synthesis gate and avoids one-insight pseudo-analysis. [VERIFIED: codebase grep] |
| `Question` body text must align with the frontmatter `question` field if both are present. [VERIFIED: codebase grep] [ASSUMED] | This prevents frontmatter/body drift on the artifact's core purpose. [ASSUMED] |
| `Contradictions` entries should reference `INS-*` IDs explicitly, not raw URLs. [VERIFIED: codebase grep] | Contradictions are about synthesis tension inside the graph, not a bypass back to source-only reasoning. [VERIFIED: codebase grep] |
| `Caveats` and `Open Questions` must be non-empty whenever uncertainty exists; do not bury them in `Synthesis`. [VERIFIED: codebase grep] | The requirement is to surface uncertainty, not merely mention it. [VERIFIED: codebase grep] |

### Anti-Patterns to Avoid
- **A second provenance index:** Do not create `lineage.json`, `graph.json`, or a hidden cache as the canonical source-to-insight mapping. Reuse `sources.json[*].linked_insights`. [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- **Freeform Markdown contracts:** Do not allow arbitrary heading names or section order if tooling needs deterministic validation and sync. [VERIFIED: codebase grep]
- **Analysis that bypasses insights:** Do not make `ANL-*` artifacts speak directly to raw URLs as their primary evidence surface. [VERIFIED: codebase grep]
- **Embedding-based dedupe:** Do not add semantic dedupe, clustering, or provider-bound scoring in this phase. [VERIFIED: codebase grep]
- **Notebook-first analysis:** Do not make `.ipynb` or dataset artifacts the canonical Phase 3 analysis record. Markdown is canonical in Phase 3. [VERIFIED: codebase grep]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | A custom delimiter splitter and YAML parser [VERIFIED: npm registry] | `gray-matter` [VERIFIED: npm registry] | Frontmatter parsing is solved already, and Phase 3 does not benefit from a bespoke parser. [VERIFIED: npm registry] |
| Canonical provenance state | A new lineage sidecar file [VERIFIED: codebase grep] | `derived_from_sources` + `sources.json[*].linked_insights` [VERIFIED: codebase grep] [VERIFIED: codebase grep] | One forward link plus one synced backlink is enough for the Phase 3 graph. [VERIFIED: codebase grep] |
| Markdown contract validation | A full AST pipeline for fixed headings [ASSUMED] | Frontmatter schema validation plus a fixed-heading section parser [VERIFIED: codebase grep] [VERIFIED: codebase grep] | The canonical section set is fixed, so a deterministic heading parser is smaller and easier to test. [VERIFIED: codebase grep] [ASSUMED] |
| Duplicate detection | Semantic similarity services or provider APIs [VERIFIED: codebase grep] | Normalized title/claim comparison plus source overlap [VERIFIED: codebase grep] | The locked decision explicitly requires conservative deterministic dedupe. [VERIFIED: codebase grep] |

**Key insight:** Hand-roll only the small parts that are truly phase-specific, such as fixed-heading validation and backlink reconciliation. Do not hand-roll the parser, the provenance ledger, or semantic matching layer. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: npm registry]

## Common Pitfalls

### Pitfall 1: Frontmatter/body lineage drift
**What goes wrong:** `derived_from_sources` says `SRC-0004` and `SRC-0011`, but the `Evidence` section only mentions one source or mentions a different ID. [VERIFIED: codebase grep] [VERIFIED: codebase grep]
**Why it happens:** The metadata and the human-readable body are edited independently. [ASSUMED]
**How to avoid:** Parse both surfaces and require exact source-set equality before persisting the artifact. [ASSUMED]
**Warning signs:** Backlink sync changes fewer or more `sources.json[*].linked_insights` entries than the `Evidence` section implies. [ASSUMED]

### Pitfall 2: Backlinks only ever grow
**What goes wrong:** Updating an insight adds new sources but never removes dropped sources from `linked_insights`, so provenance becomes overstated. [VERIFIED: codebase grep]
**Why it happens:** Writers append backlinks instead of reconciling previous vs. next state. [ASSUMED]
**How to avoid:** Load the prior artifact on update, diff old and new reference sets, and rewrite the affected backlink arrays in one transaction. [ASSUMED]
**Warning signs:** Deleted source references remain in `sources.json` after an insight edit. [ASSUMED]

### Pitfall 3: Duplicate prevention becomes too aggressive
**What goes wrong:** Legitimately distinct insights are rejected because they share a generic title such as "Pricing pressure". [ASSUMED]
**Why it happens:** Duplicate logic keys on normalized titles alone. [ASSUMED]
**How to avoid:** Require claim-text agreement or exact source-set agreement in addition to title similarity. [VERIFIED: codebase grep] [ASSUMED]
**Warning signs:** Operators need to game titles to create clearly distinct insights. [ASSUMED]

### Pitfall 4: Contradictions are buried in synthesis prose
**What goes wrong:** An analysis mentions disagreement in a paragraph but leaves no explicit contradiction block for later verification or reporting. [VERIFIED: codebase grep]
**Why it happens:** Freeform memo writing drifts away from the fixed analysis contract. [ASSUMED]
**How to avoid:** Require a dedicated `Contradictions` section with explicit insight IDs and next-check notes. [VERIFIED: codebase grep] [ASSUMED]
**Warning signs:** A contradiction appears in `Synthesis`, but the `Contradictions` section is empty. [ASSUMED]

### Pitfall 5: Analysis bypasses the Phase 3 graph
**What goes wrong:** `ANL-*` files cite raw URLs as their main support and never declare the insight set that produced the synthesis. [VERIFIED: codebase grep]
**Why it happens:** The writer treats analysis as a source-summary memo instead of a graph node above insights. [VERIFIED: codebase grep]
**How to avoid:** Require `derived_from_insights`, validate those IDs, and sync `linked_analysis` backlinks into the contributing insights. [VERIFIED: codebase grep] [ASSUMED]
**Warning signs:** The analysis file contains no `INS-*` references outside incidental prose. [ASSUMED]

## Code Examples

Verified patterns from project sources and current stack:

### Insight Artifact Skeleton
```md
---
id: INS-0001
title: Pricing compression is accelerating in coding-agent products
status: draft
confidence: medium
derived_from_sources:
  - SRC-0004
  - SRC-0011
tags:
  - pricing
linked_analysis: []
linked_reports: []
created_at: 2026-04-11T09:00:00.000Z
updated_at: 2026-04-11T09:00:00.000Z
---

## Claim

Price compression is concentrated in self-serve coding-agent plans rather than enterprise contracts.

## Why It Matters

This is reusable as a market-structure observation across multiple future reports.

## Evidence

- `SRC-0004`: Vendor pricing pages show self-serve seats falling faster than enterprise bundles.
- `SRC-0011`: Comparison coverage confirms discounting pressure in the lower end of the market.

## Caveats

- Enterprise pricing remains partially opaque.

## Reuse Notes

Use this in market maps and pricing-comparison analyses.
```
Source: `researcher/templates/INSIGHT.md` plus the locked Phase 3 body contract. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

### Source Backlink Reconciliation Pattern
```typescript
const previousSourceIds = new Set(previousInsight?.derived_from_sources ?? []);
const nextSourceIds = new Set(nextInsight.derived_from_sources);

for (const source of store.sources.sources) {
  const hadLink = previousSourceIds.has(source.id);
  const needsLink = nextSourceIds.has(source.id);

  if (!hadLink && !needsLink) {
    continue;
  }

  if (needsLink) {
    source.linked_insights = Array.from(new Set([...source.linked_insights, nextInsight.id])).sort();
  } else {
    source.linked_insights = source.linked_insights.filter((id) => id !== nextInsight.id);
  }
}
```
Source: recommended adaptation of the existing shared store/update pattern in `core/sources/add.ts` and `core/sources/store.ts`. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [ASSUMED]

### Analysis Artifact Skeleton
```md
---
id: ANL-0001
title: Pricing pressure is segment-specific, not uniform
status: draft
question: Where is price compression strongest across coding-agent segments?
derived_from_insights:
  - INS-0002
  - INS-0005
  - INS-0007
tags:
  - pricing
created_at: 2026-04-11T09:30:00.000Z
updated_at: 2026-04-11T09:30:00.000Z
---

## Question

Where is price compression strongest across coding-agent segments?

## Synthesis

Compression is strongest in self-serve plans and weakest in enterprise contracts.

## Contradictions

- `INS-0002` vs `INS-0007`: Discounting is rising, but enterprise deal sizes still appear sticky.

## Caveats

- Enterprise pricing data is still incomplete.

## Open Questions

- What portion of pricing pressure is driven by bundling rather than base-seat cuts?

## Next Moves

- Add one more enterprise-focused insight before turning this into a report input.
```
Source: locked Phase 3 analysis contract plus the existing artifact-model rule that analyses synthesize insights. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Freeform research memo with implicit lineage [VERIFIED: codebase grep] | Markdown artifact with stable ID, explicit lineage fields, and fixed sections [VERIFIED: codebase grep] | Locked for Phase 3 on 2026-04-11 [VERIFIED: codebase grep] | Artifacts become reusable and machine-auditable instead of thread-local. [VERIFIED: codebase grep] |
| Source summaries linked directly into higher-order prose [VERIFIED: codebase grep] | Source -> insight -> analysis chain with explicit promotion gates [VERIFIED: codebase grep] | Product docs predate Phase 3; context hardens the contract on 2026-04-11 [VERIFIED: codebase grep] [VERIFIED: codebase grep] | Later reporting can reuse analysis without bypassing provenance. [VERIFIED: codebase grep] |
| Buried caveats and contradictions [VERIFIED: codebase grep] | Required `Contradictions`, `Caveats`, and `Open Questions` sections [VERIFIED: codebase grep] | Locked for Phase 3 on 2026-04-11 [VERIFIED: codebase grep] | Verification debt and reporting can read uncertainty explicitly later. [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- Freeform insight storage without stable `INS-*` identity is outdated for this project. [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- A second canonical provenance surface for source-to-insight linkage is outdated before it is even introduced. [VERIFIED: codebase grep]
- Embedding-based semantic dedupe is explicitly out of Phase 3 scope. [VERIFIED: codebase grep]

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Analysis artifacts should reuse the same high-level lifecycle vocabulary as insights, with at least `draft` and `validated` present. | Architecture Patterns | Low — a rename later is straightforward, but parser/tests would need alignment. |
| A2 | The cleanest body-validation rule is exact equality between `derived_from_sources` and the `SRC-*` IDs parsed from the `Evidence` section. | Architecture Patterns | Low — if relaxed later, the validator can be loosened without changing the lineage model. |
| A3 | Fixed-heading parsing is sufficient for Phase 3 body validation and does not require a full Markdown AST stack. | Standard Stack / Don't Hand-Roll | Medium — if later contracts need nested structures or rich Markdown semantics, the parser boundary would need expansion. |
| A4 | Backlink arrays such as `linked_analysis` should be treated as tool-managed normalized fields rather than freeform manual state. | Architecture Patterns | Low — if manual editing is desired, tooling can still normalize the same fields on write. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Core Phase 3 tooling and tests [VERIFIED: codebase grep] | ✓ [VERIFIED: local runtime] | `v20.19.4` [VERIFIED: local runtime] | — |
| `pnpm` | Dependency install and verification commands [VERIFIED: codebase grep] [VERIFIED: codebase grep] | ✓ [VERIFIED: local runtime] | `10.31.0` [VERIFIED: local runtime] | — |
| `tsx` | Thin runtime entrypoints for Phase 3 CLIs [VERIFIED: codebase grep] [VERIFIED: codebase grep] | ✓ [VERIFIED: local runtime] | `4.21.0` [VERIFIED: local runtime] | — |
| `vitest` | Nyquist-friendly regression coverage [VERIFIED: codebase grep] | ✓ [VERIFIED: local runtime] | `4.1.4` [VERIFIED: local runtime] | — |
| `gray-matter` | Markdown frontmatter parsing for `INS-*` and `ANL-*` [VERIFIED: npm registry] | ✗ [VERIFIED: codebase grep] | — | None — add it in `03-01`. [VERIFIED: npm registry] |

**Missing dependencies with no fallback:**
- `gray-matter` is not installed, and Phase 3 should not hand-roll YAML frontmatter parsing instead. [VERIFIED: codebase grep] [VERIFIED: npm registry]

**Missing dependencies with fallback:**
- None. [VERIFIED: codebase grep] [VERIFIED: local runtime]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest 4.1.4` on Node [VERIFIED: codebase grep] [VERIFIED: local runtime] |
| Config file | `vitest.config.ts` [VERIFIED: codebase grep] |
| Quick run command | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts internal/tools/researcher/__tests__/analysis-upsert.spec.ts` [ASSUMED] |
| Full suite command | `pnpm exec vitest run && pnpm typecheck && pnpm lint` [VERIFIED: codebase grep] [ASSUMED] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INS-01 | Insight creation allocates stable `INS-*` IDs and rejects malformed artifacts. [VERIFIED: codebase grep] | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/insight-upsert.spec.ts -x` [ASSUMED] | ❌ Wave 0 |
| INS-02 | Insight writes reconcile `sources.json[*].linked_insights` exactly with `derived_from_sources`. [VERIFIED: codebase grep] | integration | `pnpm exec vitest run internal/tools/researcher/__tests__/insight-lineage.spec.ts -x` [ASSUMED] | ❌ Wave 0 |
| INS-03 | Analysis creation requires a grouped insight set and writes stable `ANL-*` artifacts. [VERIFIED: codebase grep] | unit/integration | `pnpm exec vitest run internal/tools/researcher/__tests__/analysis-contract.spec.ts internal/tools/researcher/__tests__/analysis-upsert.spec.ts -x` [ASSUMED] | ❌ Wave 0 |
| INS-04 | Analysis artifacts expose contradictions, caveats, and open questions as explicit validated sections. [VERIFIED: codebase grep] | unit | `pnpm exec vitest run internal/tools/researcher/__tests__/analysis-contract.spec.ts -x` [ASSUMED] | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run the narrowest Phase 3 Vitest targets for the plan being changed, then `pnpm typecheck`. [VERIFIED: codebase grep] [ASSUMED]
- **Per wave merge:** Run the full Researcher Vitest suite plus `pnpm typecheck`. [VERIFIED: codebase grep] [ASSUMED]
- **Phase gate:** `pnpm exec vitest run && pnpm typecheck && pnpm lint` must be green before `/gsd-verify-work`. [VERIFIED: codebase grep] [ASSUMED]

### Wave 0 Gaps
- [ ] `internal/tools/researcher/__tests__/insight-contract.spec.ts` — frontmatter parsing, required sections, evidence/source equality, duplicate normalization. [ASSUMED]
- [ ] `internal/tools/researcher/__tests__/insight-upsert.spec.ts` — ID allocation, file write, manifest inventory sync, update path. [ASSUMED]
- [ ] `internal/tools/researcher/__tests__/insight-lineage.spec.ts` — source backlink add/remove reconciliation and missing-source rejection. [ASSUMED]
- [ ] `internal/tools/researcher/__tests__/analysis-contract.spec.ts` — required question/contradiction/caveat/open-question sections and insight-set validation. [ASSUMED]
- [ ] `internal/tools/researcher/__tests__/analysis-upsert.spec.ts` — `ANL-*` ID allocation, insight backlink sync, and update reconciliation. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no [VERIFIED: codebase grep] | Not in scope for file-local artifact mutation. [VERIFIED: codebase grep] |
| V3 Session Management | no [VERIFIED: codebase grep] | Not in scope for this phase. [VERIFIED: codebase grep] |
| V4 Access Control | no [VERIFIED: codebase grep] | Root-confined workspace path guards still matter for file safety. [VERIFIED: codebase grep] |
| V5 Input Validation | yes [VERIFIED: codebase grep] | Ajv frontmatter validation, fixed-heading body validation, ID pattern checks, and bounded path resolution. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [ASSUMED] |
| V6 Cryptography | no [VERIFIED: codebase grep] | No Phase 3 cryptographic boundary is required if duplicate detection stays deterministic and local. [VERIFIED: codebase grep] [ASSUMED] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal or symlink escape during artifact writes [VERIFIED: codebase grep] | Tampering | Reuse the existing root-confined workspace path resolution and symlink checks for any `INS-*` or `ANL-*` writer. [VERIFIED: codebase grep] |
| Malformed frontmatter or section spoofing [VERIFIED: codebase grep] | Tampering | Parse frontmatter once, validate it with schemas, then validate exact section headings and required IDs before persisting. [VERIFIED: codebase grep] [ASSUMED] |
| Provenance drift from partial backlink updates [VERIFIED: codebase grep] | Repudiation | Reconcile backlinks in the same core-owned write path that persists the artifact, and reject unresolved source/insight references. [VERIFIED: codebase grep] [ASSUMED] |
| ID spoofing through freeform file names [VERIFIED: codebase grep] | Spoofing | Treat frontmatter `id` and manifest counters as authoritative, and validate file names against the parsed ID rather than trusting arbitrary names. [VERIFIED: codebase grep] [ASSUMED] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/03-insights-analysis-graph/03-CONTEXT.md` - locked Phase 3 contract, scope, lineage, and plan placeholders. [VERIFIED: codebase grep]
- `.planning/ROADMAP.md` - exact Phase 3 goal, requirements, and 3-plan split target. [VERIFIED: codebase grep]
- `.planning/REQUIREMENTS.md` - requirement IDs `INS-01` through `INS-04`. [VERIFIED: codebase grep]
- `.planning/phases/02-source-registry-evidence-capture/02-VERIFICATION.md` - verified Phase 2 source ledger, backlink placeholder, and refresh/store behavior. [VERIFIED: codebase grep]
- `.planning/phases/02-source-registry-evidence-capture/02-01-SUMMARY.md`, `02-02-SUMMARY.md`, `02-03-SUMMARY.md` - current source contract, shared store pattern, and append-only capture behavior inherited by Phase 3. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- `researcher/ARTIFACT-MODEL.md`, `researcher/DESIGN.md`, `researcher/WORKFLOWS.md`, `researcher/IMPLEMENTATION-ROADMAP.md`, `researcher/REPORTING.md`, `researcher/templates/INSIGHT.md` - product-level intent for artifact promotion, insight/analysis semantics, and future report lineage. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- `internal/tools/researcher/contracts/manifest.ts`, `sources.ts`, `validators.ts`, `workspace.ts`, `fs/workspace-paths.ts`, `core/resume.ts`, `core/sources/store.ts`, `core/sources/add.ts`, `core/sources/refresh.ts` - current contract and deterministic-write patterns to extend. [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- npm registry entries for `gray-matter`, `ajv`, and `ajv-formats` - current package versions and package purpose. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - it mostly reuses the existing validated stack and adds one narrowly-scoped parser dependency with verified registry metadata. [VERIFIED: codebase grep] [VERIFIED: npm registry]
- Architecture: HIGH - the lineage model and artifact shape are heavily constrained by locked Phase 3 context plus existing Phase 2 code. [VERIFIED: codebase grep] [VERIFIED: codebase grep]
- Pitfalls: HIGH - they come directly from the locked contract boundaries and the existing deterministic write patterns. [VERIFIED: codebase grep] [VERIFIED: codebase grep]

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 for the internal architecture guidance; re-check npm versions earlier if package installation is delayed. [VERIFIED: npm registry]

No unresolved Phase 3 blockers remain after applying the locked context and current codebase review; the only non-blocking uncertainties are listed in the assumptions log. [VERIFIED: codebase grep]
