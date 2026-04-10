# Research Summary

**Project:** Researcher
**Domain:** installable deep-research operating system for Codex and Claude Code
**Researched:** 2026-04-10
**Confidence:** MEDIUM-HIGH

## Executive Summary

Researcher should be built as a local-first, artifact-first operating system for research work,
not as a one-shot report generator. The core architecture should mirror GSD's strongest traits:
thin orchestrators, fresh-context specialists, file-based state, and deterministic tooling for
structured mutation.

The clearest product opportunity is not "do more web search." It is to make research durable:
bounded workspaces, a canonical source registry, reusable insight and analysis artifacts, explicit
lineage, freshness propagation, and many Markdown reports generated from one evidence base.

## Stack

- Node.js 24.x LTS, pnpm, and TypeScript 5.x for the installer, CLI, adapters, and graph engine
- Markdown + YAML frontmatter for human-readable artifacts
- JSON Schema-backed structured registries, with a likely move toward append-friendly source records
- Optional Python 3.12+ tooling only for richer `analysis/` notebook workflows

## Table Stakes

- Codex and Claude Code install surfaces
- bounded research workspaces
- central source registry
- reusable insights and analysis
- citation-backed reports
- resumable status and refresh flows

## Differentiators

- explicit artifact lineage from sources to reports
- verification debt and freshness gates
- cross-runtime portability with thin adapters
- multi-report compilation from one research base

## Watch Out For

- prompt-system sprawl
- provenance collapse
- stale-evidence leakage
- runtime fragmentation between Codex and Claude Code
- polished reports without defensible evidence chains

## Recommended Build Order

1. Core artifact schema and per-research folder contract
2. Graph engine / CLI for IDs, validation, linkage, and status
3. Runtime-neutral workflow contracts
4. Codex and Claude Code adapters
5. Installer / update / uninstall flows
6. Richer verification, refresh, and report packaging loops

## Why This Should Work

The market now expects stronger research structure than "search and summarize," but current
products still leave reuse, provenance, and runtime-embedded workflows underdeveloped. Researcher
can differentiate by combining GSD-style installability and orchestration with a durable evidence
graph built for long-lived research.

---
*Research summary for Researcher*
*Researched: 2026-04-10*
