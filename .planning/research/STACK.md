# Stack Research

**Domain:** installable deep-research operating system for Codex and Claude Code
**Researched:** 2026-04-10
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.x LTS | Primary runtime for CLI, installer, hooks, and asset generation | Stable LTS baseline for an installable workflow product, while keeping modern runtime features |
| TypeScript | 5.x | Implementation language for CLI, adapters, schemas, and build tooling | Strong typing matters because the system manipulates structured artifacts and multiple runtime adapters |
| Markdown + YAML frontmatter | N/A | Human-readable source format for briefs, insights, analysis, and reports | Git-friendly, inspectable, and natural for agent-authored artifacts |
| JSON / JSONL + JSON Schema | Draft 2020-12 | Canonical machine-readable state for manifests, source registries, and validation | Needed for deterministic mutation, validation, lineage tracking, and freshness propagation |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ajv` | 8.x | Validate `sources.json`, manifests, and contract payloads | Required for all structured registry writes |
| `zod` | 3.x or 4.x | Author runtime-safe schema definitions that can align with JSON Schema validation | Use when the core graph engine needs stronger typed validation in code |
| `gray-matter` or minimal frontmatter parser | 4.x | Parse Markdown frontmatter safely | Use when reading/writing insight, analysis, and report metadata |
| `fast-glob` | 3.x | Scan research trees and install assets | Use for indexing, refresh checks, and installer copy logic |
| `tsx` | 4.x | Run TypeScript scripts without heavy bundling overhead | Use for dev scripts and local automation |
| `vitest` | 4.x | Test the graph engine, installer, and validators | Use for CLI and artifact-graph correctness |
| Python + `uv` + `marimo` + DuckDB | 3.12+ | Optional analysis/notebook runtime | Use only for richer analysis tasks, local analytical queries, and `.py`-backed notebooks under `analysis/` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package and publish the installer | Best fit for a workspace-oriented Node/TypeScript toolchain |
| `esbuild` | Bundle small helper scripts when useful | Keep runtime lean and installation fast |
| JSON Schema validation in CI | Prevent registry drift | Run on example artifacts and fixtures |
| Markdown linting or repo conventions | Keep prompt and artifact files consistent | Useful once the prompt surface grows |

## Installation

```bash
# Core
pnpm add ajv zod gray-matter fast-glob

# Dev dependencies
pnpm add -D typescript tsx vitest esbuild

# Optional analysis runtime
# Python 3.12+ with uv, marimo, and DuckDB for richer analysis tooling
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Node.js + TypeScript CLI core | Python-first core | Use Python-first only if notebooks and data pipelines become the dominant product surface |
| JSON registries + Markdown artifacts | SQLite-first state | Use a database later only if cross-research scale and concurrent mutation outgrow file-based state |
| Thin runtime adapters | Separate codebases per runtime | Avoid unless runtime behavior diverges more than expected |
| `sources.jsonl` or append-friendly source records | single monolithic `sources.json` | Use a single JSON file only while the source registry remains small and low-concurrency |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Database-first primary state | Hides the artifact graph and weakens inspectability | File-based manifests and registries with validation |
| Runtime-specific business logic in prompt files | Leads to Codex/Claude drift and prompt sprawl | Runtime-neutral core library plus thin adapters |
| Hidden citation state in agent memory | Breaks refresh, lineage, and reuse | Explicit source IDs, insight IDs, and analysis/report lineage |
| A giant append-heavy `sources.json` as the only long-term registry shape | Likely merge-conflict and update hotspot as research grows | `sources.jsonl` or another append-friendly structured source ledger |

## Stack Patterns by Variant

**If the core remains local-first and installable:**
- Keep Node.js + TypeScript as the main implementation layer
- Keep prompts declarative and push mutations into deterministic tooling

**If analysis-heavy workflows become dominant later:**
- Add stronger Python support under `analysis/`
- Keep Python optional and isolated from the install/runtime core

**If registry scale grows quickly:**
- Move the source ledger from single-file JSON to append-friendly JSONL
- Keep report, insight, and manifest semantics unchanged

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js 24.x LTS | modern TypeScript toolchains | Preferred stable baseline as of 2026-04-10 |
| JSON Schema Draft 2020-12 | AJV 8.x | Good fit for registry validation |
| Codex + Claude Code adapters | local file-based artifact graph | The shared core should stay runtime-neutral |

## Sources

- Internal project context: `.planning/PROJECT.md`, `researcher/DESIGN.md`, `researcher/ARTIFACT-MODEL.md`
- OpenAI Codex docs for customization, config, AGENTS, skills, subagents, plugins, and MCP
- Anthropic Claude Code docs for skills, subagents, hooks, settings, and MCP
- Node.js release schedule and pnpm documentation
- Optional analysis/data tooling docs for `uv`, `marimo`, DuckDB, and Parquet
- Exa and Firecrawl MCP docs for search and extraction integration boundaries

---
*Stack research for: installable deep-research operating system for Codex and Claude Code*
*Researched: 2026-04-10*
