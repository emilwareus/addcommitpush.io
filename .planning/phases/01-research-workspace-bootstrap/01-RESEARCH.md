# Phase 1: Research Workspace Bootstrap - Research

**Researched:** 2026-04-10
**Domain:** Durable research workspace bootstrap, manifest contract, and resume flow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Workspace layout
- **D-01:** Each research uses a fixed folder contract rather than user-defined structure.
- **D-02:** The canonical per-research layout includes a brief, machine-readable manifest, source
  ledger, and the four required content folders: `insights/`, `data/`, `analysis/`, and
  `reports/`.
- **D-03:** Shared operating-system docs stay under `/researcher/`, while bounded research state
  lives under `/researcher/researches/<research-slug>/`.
- **D-04:** Resume behavior must restore context from on-disk artifacts, not from prior chat
  history.

### Source ledger shape
- **D-05:** Phase 1 should not hard-code the long-term source ledger as one giant mutable JSON
  object.
- **D-06:** The system should implement an append-friendly structured source-ledger abstraction so
  later phases can support durable provenance and low-conflict updates.
- **D-07:** Structured registry writes belong to deterministic tooling, not ad hoc prompt edits.

### Artifact identity and lineage
- **D-08:** Stable IDs are required across source, insight, analysis, report, and task artifacts.
- **D-09:** The durable dependency chain is `SRC -> INS -> ANL -> RPT`, and Phase 1 should shape
  the workspace so that later phases can enforce that lineage explicitly.
- **D-10:** Human-readable artifacts remain Markdown-first, while authoritative machine state stays
  in structured files validated by tooling.

### Runtime boundary
- **D-11:** Researcher should be built as a runtime-neutral core with thin Codex and Claude Code
  adapters, not two separate product implementations.
- **D-12:** Runtime-specific install surfaces are downstream concerns; this phase should establish
  the shared workspace model they both consume.
- **D-13:** Prompt files should stay thin and declarative; structured mutation logic belongs in the
  shared core.

### the agent's Discretion
- Exact manifest field names, as long as they support status routing, freshness debt, and report
  inventory
- Exact helper / library boundaries for the Phase 1 implementation
- Whether the initial append-friendly source abstraction is represented internally as `sources.jsonl`
  or another equivalent structured format, as long as the public artifact model stays stable

### Deferred Ideas (OUT OF SCOPE)
- Rich runtime packaging such as plugin / marketplace distribution belongs in the runtime
  installation lifecycle phase, not Phase 1.
- Notebook-heavy analysis tooling (`uv`, `marimo`, DuckDB, Parquet) is valuable but belongs after
  the core workspace and registry model is stable.
- Collaboration, hosted sync, and broader multi-runtime expansion are explicitly future concerns.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RSCH-01 | User can initialize a new research with a bounded brief and a fixed folder structure for insights, data, analysis, and reports. | Use a versioned workspace seed that creates `brief.md`, `manifest.json`, `sources.json`, and the four required directories in one deterministic operation. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: researcher/WORKFLOWS.md] |
| RSCH-03 | User can resume an existing research without rebuilding its context from chat history. | Resume should load `brief.md`, `manifest.json`, `sources.json`, and a small inventory scan to reconstruct stage, open questions, freshness debt, and report inventory from disk only. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] |
</phase_requirements>

## Summary

Phase 1 should lock the per-research workspace contract now and keep it boring: `researcher/researches/<slug>/` with `brief.md`, `manifest.json`, `sources.json`, plus `insights/`, `data/`, `analysis/`, and `reports/`. That layout is already repeated across the local spec, the phase context, and the implementation roadmap, so the planner should treat it as the canonical artifact surface instead of reopening the directory design. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/README.md] [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: researcher/IMPLEMENTATION-ROADMAP.md]

The main design choice Phase 1 still needs is not the folder tree, but the boundary around structured state. The clean approach is: keep the public workspace contract at `manifest.json` plus `sources.json` for now, but hide all registry reads and writes behind a runtime-neutral core module so Phase 2 can move the source ledger to an append-friendly backend without breaking the workspace surface or future Codex/Claude adapters. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/CONTRACTS.md] [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/schemas/sources.schema.json]

The planner should split Phase 1 exactly along the roadmap’s three plans: first define and validate the workspace contract, then implement deterministic init, then implement disk-based resume. That split maps directly to the phase success criteria and keeps the risky choices isolated: schema and layout in 01-01, file creation and ID seeding in 01-02, and context restoration logic in 01-03. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: .planning/STATE.md]

**Primary recommendation:** Keep Phase 1 public artifacts as `brief.md`, `manifest.json`, and `sources.json`, but implement them through a shared core contract layer with versioned schemas, deterministic file writers, and a resume loader that reconstructs state from disk only. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/CONTRACTS.md]

## Project Constraints (from CLAUDE.md)

- TypeScript must stay strict, with descriptive naming, early returns, minimal nesting, and no `any`. [VERIFIED: ./CLAUDE.md]
- No fallback code paths should be introduced; if the primary path is wrong, fix it instead of adding backup behavior. [VERIFIED: ./CLAUDE.md]
- Dependencies should stay lean and should prefer built-in capabilities plus well-supported libraries. [VERIFIED: ./CLAUDE.md]
- The repo uses `pnpm` and already runs local automation as TypeScript scripts through `tsx`. [VERIFIED: ./CLAUDE.md] [VERIFIED: package.json]
- `pnpm dev` must not be used by the agent. [VERIFIED: ./CLAUDE.md]

## Standard Stack

The Phase 1 implementation should reuse the repo’s existing script-oriented TypeScript toolchain and only add the missing validation and test pieces. [VERIFIED: package.json] [VERIFIED: tsconfig.json] [VERIFIED: scripts/optimize-images.ts]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs/promises` + `node:path` | Node `v20.19.4` available locally; project research targets Node `24.x` | Create the workspace tree, read/write manifest and ledger files, and scan artifact directories. | The repo already uses TypeScript scripts and Node file APIs; `fs/promises.mkdir({ recursive: true })` is stable and sufficient for deterministic workspace bootstrap. [VERIFIED: package.json] [VERIFIED: tsconfig.json] [VERIFIED: npm registry] [CITED: https://nodejs.org/api/fs.html] |
| `typescript` | `5.9.3` installed, `6.0.2` latest (published 2026-03-23) | Strict typing for workspace contracts, init/resume return shapes, and schema-backed domain types. | The repo is already strict TypeScript, and `pnpm exec tsc --version` confirms the installed compiler. [VERIFIED: tsconfig.json] [VERIFIED: package.json] [VERIFIED: npm registry] |
| `zod` | `4.1.13` installed, `4.3.6` latest (published 2026-01-22) | Runtime validation and inferred types for `manifest.json`, init arguments, and resume payloads. | The repo already depends on Zod and already uses it in app code, so Phase 1 can validate structured inputs without adding a second runtime schema system on day one. [VERIFIED: package.json] [VERIFIED: app/api/user-theme/route.ts] [VERIFIED: npm registry] |
| `tsx` | `4.21.0` installed (published 2025-11-30) | Run TypeScript entrypoints for `research-init` and `research-resume` scripts without a build step. | The repo already uses `tsx` for automation scripts, and `pnpm exec tsx --version` confirms it is available. [VERIFIED: package.json] [VERIFIED: scripts/README.md] [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ajv` | `8.18.0` latest (published 2026-02-14), not yet installed | Validate persisted JSON artifacts against explicit JSON Schema once Phase 1 adds `manifest.schema.json` and formalizes `sources.json`. | Use for file-boundary validation and future compatibility checks between contract versions. [VERIFIED: researcher/schemas/sources.schema.json] [VERIFIED: ./CLAUDE.md] [VERIFIED: npm registry] |
| `gray-matter` | `4.0.3` latest (published 2021-04-24), not yet installed | Parse YAML frontmatter safely for later insight/report flows. | Defer until Phase 3 or Phase 4, because Phase 1 can seed `brief.md` from a template without parsing frontmatter yet. [VERIFIED: researcher/templates/RESEARCH.md] [VERIFIED: researcher/templates/INSIGHT.md] [VERIFIED: researcher/templates/REPORT.md] [VERIFIED: npm registry] |
| `vitest` | `4.1.4` latest (published 2026-04-09), not yet installed | Fast unit and temp-directory integration tests for init/resume logic. | Add in Wave 0 because the repo has no root test runner for CLI-style logic today. [VERIFIED: .planning/config.json] [VERIFIED: package.json] [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `zod` for Phase 1 runtime parsing | Hand-rolled validation | Hand-rolled validation increases drift risk between TypeScript types and on-disk contracts. [VERIFIED: ./CLAUDE.md] [VERIFIED: package.json] |
| Public `sources.json` contract behind a ledger abstraction | Public `sources.jsonl` in Phase 1 | `sources.jsonl` may be the better long-term storage substrate, but local specs, templates, and schema work already assume `sources.json`, so exposing JSONL publicly now adds migration noise before Phase 2 needs it. [VERIFIED: researcher/README.md] [VERIFIED: researcher/CONTRACTS.md] [VERIFIED: researcher/schemas/sources.schema.json] |
| Thin runtime-neutral core | Separate Codex and Claude implementations | The phase context explicitly rejects split implementations and asks for shared semantics first. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |

**Installation:**
```bash
pnpm add ajv
pnpm add -D vitest
```

**Version verification:** `ajv@8.18.0`, `gray-matter@4.0.3`, `zod@4.3.6`, `typescript@6.0.2`, `tsx@4.21.0`, and `vitest@4.1.4` were checked against the npm registry in this session; the repo currently has `zod@4.1.13`, `typescript@5.9.3`, and `tsx@4.21.0` installed. [VERIFIED: package.json] [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```text
researcher/
├── researches/
│   └── <research-slug>/
│       ├── brief.md
│       ├── manifest.json
│       ├── sources.json
│       ├── insights/
│       ├── data/
│       ├── analysis/
│       └── reports/
├── schemas/
│   ├── sources.schema.json
│   └── manifest.schema.json
└── templates/
    └── RESEARCH.md

internal/tools/researcher/
├── contracts/        # Zod/Ajv-backed types and validators for manifest and source-ledger envelopes
├── core/             # Runtime-neutral init/resume/ID/layout logic
├── fs/               # Deterministic file IO helpers
└── adapters/         # Thin runtime bindings; Phase 1 can leave Codex/Claude adapters as stubs

scripts/
├── research-init.ts
└── research-resume.ts
```

The folder contract under `researcher/researches/<slug>/` is fixed by local specs; the `internal/tools/researcher/` split is the cleanest way to keep runtime-neutral logic out of Next routes and behind thin script entrypoints in this repo. [VERIFIED: researcher/README.md] [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: package.json] [ASSUMED]

### Pattern 1: Contract-First Workspace Seed
**What:** Create all required directories and seed files in one deterministic function, then validate the written manifest and source-ledger envelope before returning success. [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: researcher/WORKFLOWS.md] [CITED: https://nodejs.org/api/fs.html]
**When to use:** Plan `01-01` for contract definition and plan `01-02` for init execution. [VERIFIED: .planning/STATE.md]
**Recommended seed contract:** Use `brief.md`, `manifest.json`, and `sources.json` as the only root files in Phase 1, and create `insights/`, `data/`, `analysis/`, and `reports/` every time. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/README.md] [VERIFIED: researcher/ARTIFACT-MODEL.md]

**Recommended `manifest.json` seed shape:** This is prescriptive guidance for the planner, not a legacy contract. The fields below are the minimum that satisfy current success criteria and future status/freshness/report inventory requirements. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/ARTIFACT-MODEL.md]

| Field | Purpose | Why Phase 1 Needs It |
|-------|---------|----------------------|
| `contract_version` | Version the on-disk workspace contract from day one. | Future schema migrations need an explicit compatibility marker. [VERIFIED: researcher/DESIGN.md] [ASSUMED] |
| `research.id`, `research.slug`, `research.title` | Stable identity for the research itself. | Local specs require stable IDs and a research digest. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] |
| `status.state`, `status.stage` | Machine-readable routing state. | Resume and later status flows need to know whether the research is in intake, harvest, analysis, or reporting. [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: researcher/ARTIFACT-MODEL.md] |
| `questions.active` | Current open questions from the brief. | The manifest is supposed to track active questions. [VERIFIED: researcher/ARTIFACT-MODEL.md] |
| `freshness.window_days`, `freshness.last_source_sync_at`, `freshness.debt` | Freshness debt and report impact placeholders. | The phase context explicitly requires support for freshness debt later, and the design docs call for it in the manifest digest. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/WORKFLOWS.md] |
| `inventory.sources`, `inventory.insights`, `inventory.analysis`, `inventory.reports` | Compact artifact counts and report inventory. | The manifest must eventually drive `/research-status`, and later phases need stable counters for IDs and active report routing. [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: researcher/IMPLEMENTATION-ROADMAP.md] |
| `paths.*` | Root-relative artifact paths. | Core/adapters should resolve the same workspace contract without hard-coded string scattering. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [ASSUMED] |

**Example:**
```typescript
// Source: researcher/ARTIFACT-MODEL.md + Node fs docs
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const REQUIRED_DIRS = ['insights', 'data', 'analysis', 'reports'] as const;

export async function seedResearchWorkspace(rootDir: string, brief: string, manifest: string) {
  await mkdir(rootDir, { recursive: true });

  for (const directory of REQUIRED_DIRS) {
    await mkdir(join(rootDir, directory), { recursive: true });
  }

  await writeFile(join(rootDir, 'brief.md'), brief, 'utf8');
  await writeFile(join(rootDir, 'manifest.json'), manifest, 'utf8');
  await writeFile(
    join(rootDir, 'sources.json'),
    JSON.stringify({ research_id: 'RES-YYYYMMDD-slug', updated_at: null, sources: [] }, null, 2),
    'utf8'
  );
}
```

### Pattern 2: Resume From Digest + Disk Inventory
**What:** Resume should validate `manifest.json`, load `brief.md`, inspect `sources.json`, and perform a cheap inventory scan of `insights/`, `analysis/`, and `reports/`; it should not rely on chat or hand-authored continuation notes. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: go-research/external_code/get-shit-done/get-shit-done/workflows/resume-project.md]
**When to use:** Plan `01-03` only. [VERIFIED: .planning/STATE.md]
**Resume contract:** Return a structured object containing research identity, current stage, open questions, freshness debt, report inventory, and a planner-friendly `next_recommended_action` computed from disk state. [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: researcher/ARTIFACT-MODEL.md] [ASSUMED]

**Example:**
```typescript
// Source: researcher/WORKFLOWS.md + GSD resume-project.md
type ResumeContext = {
  researchId: string;
  slug: string;
  stage: 'intake' | 'harvest' | 'extract' | 'synthesize' | 'package' | 'refresh';
  openQuestions: string[];
  reportInventory: Array<{ id: string; path: string; status: string }>;
  nextRecommendedAction: string;
};

export async function loadResearchWorkspace(workspaceDir: string): Promise<ResumeContext> {
  // Validate manifest, brief, and sources ledger before computing the resume payload.
  // Scan reports/ and insights/ to avoid trusting stale counters blindly.
  throw new Error('implementation goes here');
}
```

### Pattern 3: Thin Core, Thin Entrypoints, Future-Thin Adapters
**What:** Keep runtime-neutral logic in a shared core, keep `scripts/*.ts` as thin entrypoints, and keep future Codex/Claude install surfaces as adapters that only translate input/output and file locations. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] [VERIFIED: go-research/external_code/get-shit-done/docs/ARCHITECTURE.md]
**When to use:** Across all three plans, starting in `01-01`. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md]
**Boundary rule:** The core should know nothing about slash-command syntax, skill metadata, prompt contracts, or runtime-specific install paths. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: go-research/external_code/get-shit-done/docs/ARCHITECTURE.md]

**Example:**
```typescript
// Source: Phase 1 context + GSD architecture
export interface ResearchWorkspaceCore {
  init(input: InitResearchInput): Promise<InitResearchResult>;
  resume(input: ResumeResearchInput): Promise<ResumeResearchResult>;
}

export interface RuntimeAdapter<TCommandInput, TCommandOutput> {
  run(input: TCommandInput, core: ResearchWorkspaceCore): Promise<TCommandOutput>;
}
```

### Plan Split Guidance

| Plan | Scope | Must Produce | Must Avoid |
|------|-------|--------------|------------|
| `01-01` Define research folder contract and manifest seed | Freeze folder tree, manifest schema, source-ledger envelope, and ID/counter strategy. | `manifest.schema.json`, typed contract definitions, seeded `sources.json` envelope, and template updates if needed. [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: researcher/schemas/sources.schema.json] | Do not mix in runtime install logic or resume orchestration. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |
| `01-02` Build init flow for new researches | Create deterministic workspace creation command and seed files from the contract. | Script entrypoint, core init service, slug/ID generation, and temp-dir tests for RSCH-01. [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: researcher/templates/RESEARCH.md] | Do not infer state from chat or accept user-defined layouts. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |
| `01-03` Build resume flow for existing researches | Load, validate, and summarize disk state for the current research. | Core resume loader, inventory scan, `next_recommended_action` derivation, and tests for RSCH-03. [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: go-research/external_code/get-shit-done/get-shit-done/workflows/resume-project.md] | Do not add source harvesting, insight generation, or reporting logic yet. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |

### Anti-Patterns to Avoid
- **Prompt-owned JSON writes:** The phase context and local contracts both say deterministic tooling should own structured mutation. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/CONTRACTS.md]
- **Manifest bloat:** `manifest.json` is supposed to stay a compact digest, not a replacement for insight, analysis, or report content. [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/ARTIFACT-MODEL.md]
- **Public ledger format lock-in in Phase 1:** Phase 1 should preserve `sources.json` as the visible contract while keeping the storage abstraction swappable later. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/CONTRACTS.md] [ASSUMED]
- **Resume from chat or ad hoc handoff text:** The requirement is explicit that resume comes from files, not prior conversation. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contract validation | Manual `JSON.parse` checks spread across scripts | Central Zod validators now, plus Ajv schema validation at file boundaries | One contract source prevents drift between init and resume logic. [VERIFIED: package.json] [VERIFIED: researcher/CONTRACTS.md] [VERIFIED: researcher/schemas/sources.schema.json] |
| Structured JSON mutation | String concatenation or freehand prompt edits | Deterministic read-modify-write helpers in the shared core | The context explicitly says structured writes belong to tooling, not prompts. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |
| ID allocation | Re-scan every directory with ad hoc regex rules | Manifest-backed next-ID counters and one allocator module | Stable IDs across `SRC`, `INS`, `ANL`, `RPT`, and `TSK` are a core requirement. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/DESIGN.md] |
| Resume context | Reconstruct from chat history or hidden runtime memory | `manifest.json` + `brief.md` + directory inventory scan | RSCH-03 explicitly forbids chat-history dependency. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: researcher/DESIGN.md] |
| Frontmatter parsing in later phases | Regex parsing of Markdown metadata | `gray-matter` or an equivalent proven parser | Insight and report templates already depend on YAML frontmatter structure. [VERIFIED: researcher/templates/INSIGHT.md] [VERIFIED: researcher/templates/REPORT.md] [VERIFIED: npm registry] |

**Key insight:** The risky part of this domain is not directory creation; it is contract drift between files, validators, and resume logic, so the planner should centralize schemas and IO helpers immediately. [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/CONTRACTS.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Spec Drift Between Seeded Files and the Published Contract
**What goes wrong:** Init creates one shape while docs, templates, or resume loaders expect another. [VERIFIED: researcher/README.md] [VERIFIED: researcher/ARTIFACT-MODEL.md]
**Why it happens:** The repo already has spec files, templates, and a schema prototype, so a Phase 1 implementation can easily change one layer and forget another. [VERIFIED: researcher/templates/RESEARCH.md] [VERIFIED: researcher/schemas/sources.schema.json]
**How to avoid:** Make `01-01` produce the contract definition first, and make both init and resume import the same contract module. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [ASSUMED]
**Warning signs:** Tests pass only for init or only for resume, or `manifest.json` fields appear in scripts but not in the schema file. [VERIFIED: researcher/schemas/sources.schema.json] [ASSUMED]

### Pitfall 2: Concurrent or Partial Writes Corrupt Machine State
**What goes wrong:** `manifest.json` or `sources.json` is written partially or overwritten by overlapping operations. [CITED: https://nodejs.org/api/fs.html]
**Why it happens:** Node’s `fs/promises` APIs warn that concurrent modifications on the same file are not synchronized, and repeated writes without sequencing are unsafe. [CITED: https://nodejs.org/api/fs.html]
**How to avoid:** Keep Phase 1 as a single-writer flow, serialize writes per file, and prefer write-to-temp then rename if a write spans more than one structured file. [CITED: https://nodejs.org/api/fs.html] [ASSUMED]
**Warning signs:** Empty or truncated JSON files, manifest timestamps newer than dependent files with missing counters, or flaky init/resume tests under temp directories. [ASSUMED]

### Pitfall 3: Overstuffing `manifest.json`
**What goes wrong:** The manifest turns into a shadow database for notes, evidence, or report content. [VERIFIED: researcher/DESIGN.md]
**Why it happens:** It is tempting to stuff resume context into one file instead of scanning the workspace contract. [VERIFIED: researcher/ARTIFACT-MODEL.md] [ASSUMED]
**How to avoid:** Keep the manifest to digest fields only: identity, stage, open questions, freshness debt, counters, and report inventory. [VERIFIED: researcher/ARTIFACT-MODEL.md] [VERIFIED: researcher/DESIGN.md]
**Warning signs:** The manifest starts storing report bodies, large source excerpts, or analysis text instead of references and counts. [VERIFIED: researcher/REPORTING.md] [ASSUMED]

### Pitfall 4: Locking the Ledger Backend Too Early
**What goes wrong:** Phase 1 bakes `sources.json` mutation rules so deeply into callers that Phase 2 cannot introduce append-friendly storage without rewiring everything. [VERIFIED: .planning/STATE.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md]
**Why it happens:** The existing local schema prototype is JSON-object based, while the roadmap and phase context explicitly want an append-friendly direction. [VERIFIED: researcher/schemas/sources.schema.json] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md]
**How to avoid:** Expose a `SourceLedgerStore` boundary now and keep `sources.json` as the public file contract until Phase 2 decides the backing store. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [ASSUMED]
**Warning signs:** Init, resume, and future harvest code all reach directly into `sources.sources[...]` with no intermediate abstraction. [VERIFIED: researcher/schemas/sources.schema.json] [ASSUMED]

## Code Examples

Verified patterns from official and project sources:

### Create Required Directories Idempotently
```typescript
// Source: https://nodejs.org/api/fs.html#fspromisesmkdirpath-options
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function ensureResearchDirectories(rootDir: string) {
  for (const directory of ['insights', 'data', 'analysis', 'reports']) {
    await mkdir(join(rootDir, directory), { recursive: true });
  }
}
```

### Seed a Compact Source Ledger Envelope
```typescript
// Source: researcher/CONTRACTS.md + researcher/schemas/sources.schema.json
export type SourceLedgerEnvelope = {
  research_id: string;
  updated_at: string | null;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    type: string;
    credibility: string;
    accessed_at: string;
    status: string;
    linked_insights: string[];
  }>;
};

export function createEmptySourceLedger(researchId: string): SourceLedgerEnvelope {
  return {
    research_id: researchId,
    updated_at: null,
    sources: [],
  };
}
```

### Resume by Reading Files, Not Session Memory
```typescript
// Source: researcher/DESIGN.md + researcher/WORKFLOWS.md + GSD resume-project workflow
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function summarizeWorkspace(workspaceDir: string) {
  const [brief, manifestText, reportFiles] = await Promise.all([
    readFile(join(workspaceDir, 'brief.md'), 'utf8'),
    readFile(join(workspaceDir, 'manifest.json'), 'utf8'),
    readdir(join(workspaceDir, 'reports')),
  ]);

  return {
    brief,
    manifest: JSON.parse(manifestText),
    reportCount: reportFiles.length,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompt files directly mutate machine state | Deterministic tooling owns structured writes | Locked in Phase 1 context on 2026-04-10 | Planner should allocate shared core/helpers before command polish. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |
| Runtime-specific implementations per AI surface | Runtime-neutral core with thin adapters | Locked in Phase 1 context on 2026-04-10 | Phase 1 should avoid Codex/Claude branching inside core modules. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |
| One growing mutable JSON registry as the only design | Append-friendly ledger abstraction behind a stable public contract | Raised in Phase 1 context and project research on 2026-04-10 | Planner should preserve migration flexibility even if Phase 1 still seeds `sources.json`. [VERIFIED: .planning/STATE.md] [VERIFIED: .planning/research/SUMMARY.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] |
| Hidden resume context in session memory | Resume from compact digest plus artifact scan | Established in GSD architecture and carried into Researcher specs | Resume logic must be file-first and composable. [VERIFIED: go-research/external_code/get-shit-done/docs/ARCHITECTURE.md] [VERIFIED: go-research/external_code/get-shit-done/get-shit-done/workflows/resume-project.md] [VERIFIED: researcher/DESIGN.md] |

**Deprecated/outdated:**
- Chat-history-dependent resume is out of bounds for this phase. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md]
- Public Phase 1 runtime-specific command logic inside the core is out of bounds for this phase. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `internal/tools/researcher/` is the best home for runtime-neutral core modules in this repo. | Architecture Patterns | Low — planner can swap to `lib/` or another non-React utilities folder without changing the workspace contract. |
| A2 | `contract_version` should exist in `manifest.json` from Phase 1 even though no manifest schema file exists yet. | Architecture Patterns | Medium — without a version marker, future migrations become more brittle. |
| A3 | `next_recommended_action` should be computed during resume and returned as structured data. | Architecture Patterns | Low — this can move to Phase 5 if the planner wants Phase 1 resume to stop at raw context restoration. |
| A4 | Write-to-temp then rename is worth planning for if any Phase 1 write updates more than one structured file per operation. | Common Pitfalls | Low — Phase 1 can start simpler if writes stay single-file and serialized. |

## Open Questions (RESOLVED)

1. **Should Phase 1 upgrade existing dependencies or stay on installed versions?**
   - Resolution: Stay on the installed `zod`, `typescript`, and `tsx` versions for Phase 1 and add only the missing packages required by the phase (`ajv`, `vitest`). This keeps the early infrastructure phase focused on the workspace contract instead of bundling unrelated dependency churn. [VERIFIED: package.json] [VERIFIED: npm registry]
   - Planning impact: Plan 01-01 may add `ajv`, `vitest`, and the repo-required `typecheck` script, but Phase 1 should not include opportunistic upgrades of already-installed dependencies. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-01-PLAN.md]

2. **Should resume compute `next_recommended_action` now or only return raw state?**
   - Resolution: Phase 1 should return a lightweight `next_recommended_action` derived from manifest stage, open questions, and actual artifact inventory. This stays inside RSCH-03 because it is computed from disk state only and does not add a broader status-dashboard feature. [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/WORKFLOWS.md] [VERIFIED: .planning/REQUIREMENTS.md]
   - Planning impact: The resume plan should explicitly produce this field from validated disk artifacts and the init plan should seed the manifest fields that make the computation deterministic. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-04-PLAN.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-03-PLAN.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript scripts and file-system core | ✓ | `v20.19.4` | Keep Phase 1 implementation compatible with Node 20, or add a separate environment-upgrade task before using Node 24-only features. [VERIFIED: package.json] [VERIFIED: npm registry] |
| pnpm | Running scripts and adding Phase 1 dependencies | ✓ | `10.31.0` | — |
| `tsx` | Running TypeScript script entrypoints | ✓ | `4.21.0` via `pnpm exec tsx` | — |
| TypeScript compiler | Type-checking the Phase 1 contract/core | ✓ | `5.9.3` via `pnpm exec tsc` | — |
| `ajv` | Recommended JSON Schema validation | ✗ | — | Start with existing Zod validation in core modules, but plan `ajv` install before file-boundary schema validation is declared complete. [VERIFIED: package.json] [ASSUMED] |
| `vitest` | Recommended init/resume automated tests | ✗ | — | Add as a Wave 0 dependency; there is no root test runner for this work today. [VERIFIED: package.json] [VERIFIED: npm registry] |

**Missing dependencies with no fallback:**
- None for initial implementation, as long as Phase 1 stays within Node 20-compatible APIs and adds `vitest` before automated validation is expected. [VERIFIED: package.json] [VERIFIED: tsconfig.json] [ASSUMED]

**Missing dependencies with fallback:**
- `ajv` is missing, but Phase 1 can still use the already-installed `zod` for runtime validation until schema-boundary validation is introduced. [VERIFIED: package.json] [VERIFIED: researcher/schemas/sources.schema.json] [ASSUMED]
- `vitest` is missing, but it can be added cleanly in Wave 0. [VERIFIED: package.json] [VERIFIED: npm registry]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None at the repo root for this Phase 1 domain; recommend `vitest@4.1.4`. [VERIFIED: package.json] [VERIFIED: npm registry] |
| Config file | none — add `vitest.config.ts` in Wave 0. [VERIFIED: package.json] [ASSUMED] |
| Quick run command | `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` after Wave 0. [ASSUMED] |
| Full suite command | `pnpm exec vitest run` after Wave 0. [ASSUMED] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RSCH-01 | Init creates `brief.md`, `manifest.json`, `sources.json`, and the four required directories with a valid seeded manifest and empty source-ledger envelope. | temp-dir integration | `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts -t "creates workspace contract"` | ❌ Wave 0 |
| RSCH-03 | Resume reconstructs working context from files and inventory scans with no chat-history dependency. | temp-dir integration | `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts -t "loads workspace from disk"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm exec vitest run internal/tools/researcher/__tests__/init.spec.ts internal/tools/researcher/__tests__/resume.spec.ts` after Wave 0. [ASSUMED]
- **Per wave merge:** `pnpm exec vitest run` after Wave 0. [ASSUMED]
- **Phase gate:** Full Phase 1 tests plus `pnpm exec tsc --noEmit` and `pnpm lint` should pass before `/gsd-verify-work`. [VERIFIED: package.json] [VERIFIED: ./CLAUDE.md] [ASSUMED]

### Wave 0 Gaps
- [ ] `pnpm add -D vitest` — no root unit-test framework exists for the CLI/core code planned here. [VERIFIED: package.json] [VERIFIED: npm registry]
- [ ] `vitest.config.ts` — no root config exists for this test surface. [VERIFIED: package.json] [ASSUMED]
- [ ] `internal/tools/researcher/__tests__/init.spec.ts` — covers RSCH-01. [ASSUMED]
- [ ] `internal/tools/researcher/__tests__/resume.spec.ts` — covers RSCH-03. [ASSUMED]

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not in scope for a local workspace bootstrap phase. [VERIFIED: .planning/REQUIREMENTS.md] |
| V3 Session Management | no | Resume is file-based context restoration, not an authenticated session layer. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: researcher/DESIGN.md] |
| V4 Access Control | no | No multi-user authorization boundary is introduced in Phase 1. [VERIFIED: .planning/REQUIREMENTS.md] |
| V5 Input Validation | yes | Validate research slugs, manifest payloads, and source-ledger envelopes with central schemas and root-confined path resolution. [VERIFIED: ./CLAUDE.md] [VERIFIED: researcher/CONTRACTS.md] [ASSUMED] |
| V6 Cryptography | no | Phase 1 does not require encryption, signing, or secret storage to satisfy RSCH-01 or RSCH-03. [VERIFIED: .planning/REQUIREMENTS.md] |

### Known Threat Patterns for This Stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User-supplied slug escapes the research root via `../` or absolute paths | Tampering | Normalize and validate slugs before joining paths; reject anything that is not a safe research slug. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [ASSUMED] |
| Symlink or root-confusion causes writes outside `researcher/researches/<slug>/` | Tampering | Resolve all workspace paths from one canonical root and keep adapters from passing arbitrary write targets into core functions. [VERIFIED: researcher/README.md] [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [ASSUMED] |
| Partial or overlapping JSON writes corrupt `manifest.json` or `sources.json` | Tampering | Serialize writes per file and avoid unsynchronized concurrent mutations. [CITED: https://nodejs.org/api/fs.html] |
| Malicious or invalid structured content poisons future resume/status flows | Denial of Service | Validate files on read and fail fast on contract violations instead of guessing. [VERIFIED: ./CLAUDE.md] [VERIFIED: researcher/CONTRACTS.md] [ASSUMED] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md` - locked decisions, discretion scope, and canonical references for Phase 1.
- `.planning/REQUIREMENTS.md` - RSCH-01 and RSCH-03 requirement definitions.
- `.planning/STATE.md` - current phase split and existing blocker notes.
- `./CLAUDE.md` - project-level implementation constraints and stack guidance.
- `researcher/README.md` - top-level workspace layout and artifact ladder.
- `researcher/DESIGN.md` - runtime-neutral core, file-based state, and promotion model.
- `researcher/ARTIFACT-MODEL.md` - required folder contract, manifest purpose, and lineage rules.
- `researcher/WORKFLOWS.md` - intended `research-new`, `research-status`, and resumable stage model.
- `researcher/CONTRACTS.md` - machine-state storage choices and source-ledger envelope guidance.
- `researcher/IMPLEMENTATION-ROADMAP.md` - milestone ordering for skeleton, source registry, and resume-related work.
- `researcher/schemas/sources.schema.json` - existing source-ledger schema prototype.
- `researcher/templates/RESEARCH.md`, `researcher/templates/INSIGHT.md`, `researcher/templates/REPORT.md` - seeded Markdown/frontmatter expectations for later phases.
- `go-research/external_code/get-shit-done/docs/ARCHITECTURE.md` - thin orchestrator, file-state, and runtime-abstraction reference model.
- `go-research/external_code/get-shit-done/get-shit-done/workflows/resume-project.md` - file-first resumption pattern from GSD.
- `https://nodejs.org/api/fs.html` - official `fs/promises` behavior, `mkdir({ recursive: true })`, and file-write caveats.
- npm registry (`npm view ...`) - current package versions and publish dates for `ajv`, `gray-matter`, `zod`, `typescript`, `tsx`, `vitest`, and installed-version verification.

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Most recommendations are grounded in the repo’s installed toolchain, the local project stack guidance, and npm registry checks. [VERIFIED: package.json] [VERIFIED: ./CLAUDE.md] [VERIFIED: npm registry]
- Architecture: HIGH - The workspace shape, core/adapters split, and resume requirements are locked by the phase context and repeated across local Researcher specs. [VERIFIED: .planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md] [VERIFIED: researcher/README.md] [VERIFIED: researcher/DESIGN.md] [VERIFIED: researcher/ARTIFACT-MODEL.md]
- Pitfalls: MEDIUM-HIGH - Drift and concurrent-write risks are well-supported, while a few mitigation details depend on implementation choices the planner still controls. [VERIFIED: researcher/CONTRACTS.md] [CITED: https://nodejs.org/api/fs.html] [ASSUMED]

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 for local-spec decisions; re-check npm versions sooner if dependency changes are bundled into the phase. [VERIFIED: npm registry] [ASSUMED]
