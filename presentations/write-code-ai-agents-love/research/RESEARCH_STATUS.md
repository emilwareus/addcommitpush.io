# Research Status

Last updated: 2026-05-22.

## What Exists

- 76 indexed research sources in `references.md`.
- 70+ downloaded PDFs in `papers/`.
- Extracted searchable text in `paper-text/`.
- 50+ downloaded official/practitioner docs, popular articles, and HN snapshots in `articles/`.
- 26 focused insight notes in `insights/`.
- 6 plot-ready CSV datasets in `data/`.
- 9 subagent/research-track memos in `notes/`.

## Strong Coverage

- Repository-level coding benchmarks: SWE-bench, SWE-bench Live, SWE-rebench, Multi-SWE-bench, FEA-Bench, FeatureBench, RepoMod-Bench, SWE-CI.
- Context retrieval and repository maps: RepoBench, ContextBench, RepoGraph, Repository Intelligence Graph, RepoCoder, RepoScope, Sourcegraph/Cody, Aider repo maps.
- Agent instruction files: AGENTS.md impact, Evaluating AGENTS.md, Claude Code config-file analysis, vendor docs from Anthropic, GitHub, Cursor, Windsurf, Aider, Sourcegraph.
- Verification and maintainability: SWE-CI, ABTest, Needle in the Repo, FixedBench/no-op tasks, SetupBench, installation-agent work.
- Latest 2025-2026 direction: long-horizon features, modernization, no-op/abstention, memory/reuse, long-context process metrics.
- Code patterns and techniques: dependency-aware retrieval, naming, type/static surfaces, chunking, modularity counter-evidence, code smells, and agent-generated test caveats.
- Hard-data themes: repository graph ROI, feature-planning failure, structural constraint decay, setup/verification cost, context-file cost, static API affordances, and agentic PR shape.
- Opinionated implementation flavors: custom lint rules as executable architecture, monorepos as agent context infrastructure, and generated SDKs as typed API contracts.
- Local implementation case study: `polint` as repo-owned rule code plus scan infrastructure, and `/Users/emilwareus/Development/plint` as real usage with architecture guardrails, generated SDKs, infra, docs, and monorepo context.
- Popular/practitioner and HN history: Anthropic's May 2026 large-codebase guidance, Builder.io AGENTS.md posts, Boris Tane/Jon Atkinson/LocalCan Claude Code workflows, Coder AI Coder guidance, and HN threads/search snapshots around AGENTS.md, stale context, subagents, and large-codebase navigation.

## Medium Coverage

- Security/sandboxing: vendor guidance is noted but not synthesized into its own insight.
- Human factors: issue quality still needs more evidence, but AIDev and agent-vs-human PR shape are now downloaded and summarized.
- More language-specific evidence would help for TypeScript/React beyond general repository-code-generation papers.

## Gaps for Next Pass

- Add "What Makes a GitHub Issue Ready for Copilot?" if arXiv/PDF access works.
- Add OpenAI SWE-bench Verified audit pages and summarize task/test ambiguity as a separate benchmark-quality insight.
- Add flaky test studies from Mozilla/Microsoft/Tahir et al. if the article needs a deeper testing section.
- Add Devin, Augment, and Gemini CLI official docs as downloaded local articles.
- Add one repo-specific "agent readiness checklist" for this Next.js blog after the talk thesis stabilizes.
- Add STALL+, GraphCoder, RepoHyper, CodexGraph, CodeSearchNet, and UniXcoder if the retrieval section needs an even deeper literature base.
- Convert the CSV data into article/deck figures after selecting the final narrative arc.

## Current Working Thesis

An AI-agent-friendly codebase is a low-entropy codebase: it exposes structure, constraints, examples, and verification in forms that are both human-readable and machine-actionable.

## Candidate Blog/Presentation Sections

1. Agents are stateless maintainers.
2. Context is infrastructure.
3. Instructions are configuration.
4. Names are part of the API.
5. Dependency graphs beat text blobs.
6. Types and static surfaces prevent hallucinated APIs.
7. Modularity is not magic; boundaries are.
8. Tests are the feedback loop.
9. Custom lint rules are executable architecture.
10. The monorepo is the context database.
11. Generated SDKs beat raw API calls.
12. Long context still needs maps.
13. The best agent sometimes does nothing.
14. Hard data: what gets faster, what fails, and where agents waste effort.
15. Build the agent-ready repo checklist.
