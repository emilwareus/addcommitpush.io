# Summary: Write Code AI Agents Love

## Thesis

AI coding agents do not fail only because the model is weak. They often fail because the repository hides the information a competent maintainer would already know: architecture, build commands, test targets, invariants, local conventions, and what counts as a correct change. The winning codebase is not the one with the most prose. It is the one with the clearest executable structure, searchable boundaries, deterministic verification, and short agent-facing instructions.

## Main Insights

### 1. Agents need maps, not dumps

Repository-scale benchmarks show that real tasks require cross-file context. ContextBench goes further: agents often inspect relevant code but fail to consolidate or use it. The implication is practical: expose a concise map of modules, ownership, tests, and dependency edges instead of relying on the agent to reverse-engineer the repository every time.

References: R03, R10, R12, R13, R14, R16.

### 2. Short, specific repo instructions help; noisy instructions can hurt

The AGENTS.md literature is not one-sided. Lulla et al. found AGENTS.md associated with lower median runtime and output token use. Gloaguen et al. found context files can reduce success and increase cost when they cause extra exploration and reasoning without better outcomes. The synthesis: treat agent instructions as operational configuration, not a manifesto.

References: R17, R18, R19, D05, D06, D07.

### 3. Build and test reproducibility is agent performance infrastructure

Agents cannot make reliable progress if setup is implicit, flaky, or machine-specific. SetupBench and installation-agent work show environment bootstrap is itself a hard task. Repos that want agents to succeed should have a one-command setup, pinned toolchain, deterministic test commands, and documented required services.

References: R27, R28, D03, D05, D06.

### 4. Verification must be behavior-oriented

SWE-bench made tests central, but later critiques and CI-style benchmarks show that one-shot passing tests do not prove maintainability. SWE-CI argues that maintainability becomes visible only through future changes and regression behavior. Good agent-friendly tests specify behavior, avoid hidden requirements, and make regression signals cheap to run.

References: R01, R06, R07, R09, R22.

### 5. Module boundaries and typed contracts reduce search entropy

Agents are strongest when the repo expresses intent through names, types, public interfaces, and predictable layout. ContextBench and Repository Intelligence Graph both point to the same bottleneck: agents waste tokens reconstructing relationships that the repo could expose directly.

References: R10, R13, R15, R16, R19.

### 6. Simpler workflows often beat elaborate agent scaffolds

Agentless and ContextBench both warn against assuming that more complex agent frameworks solve repository understanding. A clear localize -> repair -> validate workflow, with good repo structure and tests, can be more reliable than elaborate multi-agent choreography.

References: R10, R23, R24, R25.

### 7. Context must be layered

One root instruction file should contain durable facts: commands, constraints, architecture summary, gotchas. Deeper docs should be linked and scoped by area. Long workflows belong in skills, scripts, or focused docs that the agent can pull when needed.

References: R15, R17, R18, R19, D05, D06, D07, D08, D09.

### 8. The codebase should be executable documentation

The best instructions are backed by code: scripts, tests, examples, fixtures, type checks, formatters, and lint rules. This lets the agent verify instead of infer. Repositories should make the intended path the shortest path.

References: R02, R09, R13, R17, R27, R28, D05, D06.

### 9. Long context is not a substitute for structured retrieval

The newer long-context papers are a reality check. Larger windows help, but relevant information can still be missed, ignored, or drowned in noise. Agents need filesystem navigation, search, generated maps, examples, and progressive disclosure.

References: R32, R36, R37, R40, D09, D10, D11.

### 10. Good agents must know when not to edit

No-op and maintainability benchmarks make abstention part of codebase quality. A repo that exposes current behavior, ownership, tests, and issue state gives agents a better chance of deciding that the correct patch is no patch.

References: R41, R46, R09, R22.

### 11. Feature work is the hard mode

Bug fixing is no longer the only target. FeatureBench, FEA-Bench, RepoMod-Bench, and SWE-CI point to a harder frontier: multi-file feature development, modernization, and long-term evolution. Codebases should make extension points, examples, and architectural constraints explicit.

References: R08, R09, R44, R45, R46.

### 12. Dependency-aware structure beats text blobs

The strongest code-pattern evidence is not "make functions smaller." It is "make the dependency structure recoverable." GraphCodeAgent, SLICE, InlineCoder, CodeGRAG, RepoGraph, and Repository Intelligence Graph all point in the same direction: agents need task-relevant symbols, callers, callees, imports, types, data/control flow, tests, and build edges. Repositories that hide behavior behind dynamic registration, reflection, implicit globals, or scattered side effects are harder to retrieve and reason about.

References: R12, R13, R30, R53, R54, R55, R56.

### 13. Names are semantic infrastructure

Identifier-aware models and naming-specific studies show that names are not cosmetic. Descriptive identifiers preserve intent; nonsense, misleading, or obfuscated names degrade model performance on code-analysis, summarization, and sometimes execution-oriented tasks. Agents read code through both structure and language.

References: R50, R65, R66.

### 14. Static surfaces reduce hallucinated APIs

ToolGen, CatCoder, Type-Constrained Code Generation, and A3-CodGen all support the same practical rule: make available APIs visible. Explicit imports, exports, types, class members, schemas, generated clients, and language-server-compatible structure reduce undefined-variable, no-member, and wrong-library failures.

References: R43, R51, R63, R64.

### 15. Modularity is not magic; useful boundaries are

CodeChain supports modular decomposition when submodules are verified and reused. But Revisiting Modularity finds no clear positive correlation between modularity score and generation performance, and the chunking study finds function-only chunks underperformed richer strategies. The talk should argue for meaningful boundaries: responsibility, ownership, contracts, tests, and dependency direction.

References: R47, R48, R49, R61.

### 16. More context can hurt

A3-CodGen found too much global context could underperform selective context. Evaluating AGENTS.md found context files can raise cost and reduce success when they add unnecessary requirements. Long-context work shows relevant facts can still be missed. Agent-friendly repos should provide layered, scoped, high-signal context instead of maximal context.

References: R18, R32, R49, R64.

### 17. Quality gates must cover smells

LLM-generated code can pass narrow behavior checks while introducing incompleteness, inconsistent naming, redundancy, unused symbols, broad exceptions, and other smells. Static gates, lint, typecheck, dead-code checks, and review checklists are not bureaucracy; they are the external nervous system that keeps agents from shipping plausible but low-quality code.

References: R09, R46, R59, R60, R67.

### 18. Custom lint rules are executable architecture

Agent instructions are useful, but lint failures are better. ESLint, typescript-eslint, Semgrep, ast-grep, and Nx module-boundary rules all support the same pattern: turn project-specific conventions into executable constraints. This is especially strong for import boundaries, raw API call bans, schema-validation requirements, generated-code rules, forbidden modules, and architectural layering.

`polint` is a local implementation option for the "bring your own rules" version of this idea. It keeps repo-owned rule packs as code and supplies the scan/fact/diagnostic/cache/JSON/SARIF/CI infrastructure. The local `plint` repo uses it for backend architecture guardrails such as layer imports, route security, context propagation, typed errors, UUID boundaries, and test evidence. This should be framed as "one option I use," not a tool pitch.

References: D13, D14, D15, D16, D17, D18, D31, D32, D33.

### 19. Monorepos are agent context infrastructure

The user-flavored argument is strong: put everything relevant in the monorepo, including app code, docs, infra, schemas, generated clients, examples, migrations, tests, fixtures, and CI scripts. Google and monorepo practitioners frame the value as common source of truth, atomic cross-project commits, a universal hierarchy, and a single searchable view. For agents, that means one commit can contain the whole truth. The caveat is tooling: without boundaries, ownership, affected builds, and CI investment, the monorepo becomes a larger ambiguity pile.

References: D19, D20, D21, D22, D23, D24.

### 20. Generated SDKs turn API contracts into code

Raw API calls are stringly typed integration debt. OpenAPI Generator, Kiota, Orval, Speakeasy, Stainless, and FastAPI all support generating clients/SDKs from API descriptions. For agents, this turns URLs, params, auth, request bodies, response shapes, pagination, and errors into typed symbols and local examples. The contract must be accurate, but once it is, agents should use generated clients rather than hand-writing fragile `fetch` calls.

References: D25, D26, D27, D28, D29, D30, R42, R43, R51, R52.

### 21. Popular/practitioner writing converges on "context as operations"

The latest practitioner material and HN discussions are converging on a practical version of the research thesis. Anthropic's May 2026 large-codebase guidance says the harness matters as much as the model: layered context files, hooks, skills, plugins, LSP, MCP, and subagents determine whether Claude Code can navigate large systems. Builder.io, Boris Tane, Jon Atkinson, LocalCan, and Coder all emphasize research-first workflows, written plans, scoped context, reproducible commands, critique loops, and keeping persistent instructions lean.

HN history shows AGENTS.md became a major community topic in 2025-2026, with debate shifting from "should this file exist?" to "how do we keep it short, current, scoped, and evaluated?" The useful narrative is not "everyone agrees AGENTS.md solves it." It is: the zeitgeist has moved from prompt tricks to operational context management. Stale context, overgrown instruction files, overbuilt subagent orchestration, and unclear ownership are now recognized failure modes.

References: D34-D53.

### 22. Repository graphs have measurable ROI, but only as selective slices

The strongest evidence for codebase structure is now quantitative. Repository Intelligence Graph improved mean accuracy by 12.2%, reduced completion time by 53.9%, and reduced seconds per correct answer by 57.8%. The gains are larger on high-complexity repositories and multilingual repositories. GraphCodeAgent shows the same shape from another angle: dual graph retrieval improved DevEval GPT-4o Pass@1 by 43.81% relative, and cross-file dependency tasks improved 94.30% relative over the best baseline.

The caveat matters: RepoGraph's 2-hop flat context used 10,505.3 tokens and resolved only 26.00%, while 1-hop flat used 2,310.7 tokens and resolved 29.67%. The article should say "selective graph slices," not "more graph."

References: R10, R11, R12, R13, R53. Data: `data/repository_graph_context.csv`.

### 23. Feature work fails at the step/constraint layer

RACE-bench shows the core feature-work gap: patches can apply while plans remain wrong. On 528 feature-addition tasks, patch apply rates were high for AutoCodeRover and mini-SWE-Agent (96.21% and 95.83%), but resolved rates were 28.79% and 70.08%. mini-SWE-Agent's reasoning recall falls from files (0.890) to tasks (0.751) to steps (0.445).

Constraint Decay strengthens the claim. When structural constraints accumulate from L0 to L3, capable configurations lose 30 percentage points of assertion pass rate, roughly 40% of baseline performance. PostgreSQL alone has a -19.3 pp marginal effect. CODETASTE adds the refactoring version: GPT-5.2 gets 69.6% alignment when the refactor is specified, but only 7.7% in open direct mode when it must infer the human architectural choice.

References: R44, R68, R71, R72. Data: `data/feature_constraints_planning.csv`.

### 24. Setup is not preamble; it is the first benchmark

SetupBench, Installamatic, GitTaskBench, and Long Code Arena all say the same thing: repository setup is itself agent work. SetupBench's best OpenHands variant reaches 62.4% overall, with local DB setup as low as 20.0%. Installamatic installs 21/40 repos at least once, with a 28.8% average installation rate and 501 seconds per attempt. GitTaskBench's best evaluated setting reaches 48.15% task pass rate, while error analysis calls out setup and dependency resolution as major causes.

For the blog, this makes setup commands part of the codebase interface: clean-shell setup verification, one smoke command, one local test slice, and exact dev/test dependencies.

References: R27, R28, R75. Data: `data/setup_verification.csv`.

### 25. Context files are useful config with measurable carrying cost

The instruction-file evidence is mixed because the object is mixed. One AGENTS.md study reports median runtime dropping from 98.57s to 70.34s and mean output tokens dropping from 5,744.81 to 4,591.46. Evaluating AGENTS.md reports LLM-generated context reducing resolution by 0.5 pp to 2 pp while increasing cost by 20-23%. Developer-provided files improve performance about 4% on average but add 3.34 steps.

Agent READMEs shows the ecosystem scale: 2,303 context files from 1,925 repos. Testing, implementation details, architecture, and build/run dominate; security and performance are only 14.5% each. SWE-Skills-Bench adds the sharper warning: 39/49 public SWE skills produced zero pass-rate improvement, aggregate pass rate rose only 1.2 pp, and token consumption rose 10.5%.

References: R17, R18, R19, R21, R73, R74. Data: `data/context_instruction_cost.csv`.

### 26. Agentic PRs have a distinct change shape

AIDev makes agentic development measurable at ecosystem scale: 932,791 Agentic-PRs across 116,211 repositories and 72,189 developers. "How AI Coding Agents Modify Code" compares 24,014 merged Agentic PRs with 5,081 human PRs and reports practical differences in commits, files touched, deletions, and line changes. The article should not treat agent patches as normal human patches with different authorship; they have different review needs.

The readability paper adds a quality caution. Readability-related commits are only about 0.3% of agent commits. Among analyzed readability commits, agents focus on logic complexity (42.4%) and documentation (24.2%), yet Maintainability Index deteriorates in 56.1%, LOC increases in 71.5%, and Cyclomatic Complexity increases in 42.7%.

References: R69, R70, R76. Data: `data/agentic_pr_change_shape.csv`.

### 27. Static surfaces are agent affordances

Names, types, generated SDKs, and visible API surfaces now have enough hard data to support a strong claim. CrossCodeEval improves StarCoder Python exact match from 8.82 to 15.72 with retrieved context and 21.01 with reference-assisted retrieval. Naming perturbation drops Java GraphCodeBERT MRR from 70.36 to 17.03 and Python from 68.17 to 23.73. Type constraints reduce compile errors by 74.8% on HumanEval synthesis and 56.0% on MBPP synthesis. ToolGen improves dependency coverage by 31.4-39.1% and static validity by 44.9-57.7%.

This supports the "generated SDKs beat raw API calls" flavor. The point is not that SDKs are magic. The point is that they turn hidden remote contracts into local typed names that agents can search, import, autocomplete, and repair against.

References: R43, R49, R51, R62, R63, R64, R65, R66. Data: `data/names_types_apis.csv`.

## Candidate Talk Frame

1. Agents are new maintainers with no memory.
2. They pay for every hidden convention in tokens, time, and wrong edits.
3. Make the repo self-orienting: map, contracts, commands, examples.
4. Make correctness executable: tests, typecheck, lint, CI, fixtures.
5. Keep context lean: short root instructions, scoped docs, no stale lore.
6. Measure agent friction: time to locate files, setup success, test determinism, regression rate.

## Recommended Codebase Checklist

- Root `AGENTS.md` or equivalent under 100-200 high-signal lines.
- Exact install, lint, typecheck, unit, integration, and build commands.
- Clear "do not do" constraints and repository invariants.
- Architecture map with module boundaries and canonical example files.
- Stable package structure and descriptive file names.
- Explicit imports, exports, and dependency directions.
- Descriptive identifiers with consistent domain vocabulary.
- Typed public interfaces and minimal hidden dynamic behavior.
- API docs paired with compiling examples.
- Generated API clients/SDKs from OpenAPI, JSON Schema, TypeSpec, or protobuf contracts.
- Custom lint/static-analysis rules for architecture boundaries and house patterns.
- Monorepo layout that includes docs, schemas, infra, migrations, runbooks, and tooling when they change with the app.
- One-command reproducible bootstrap.
- Fast targeted tests plus broader CI gates.
- Behavior-focused tests that avoid implementation lock-in.
- Static gates for lint, typecheck, format, unused code, and complexity.
- Generated or maintained repository map for large/multi-language repos.
- Scoped instructions in subdirectories only when conventions differ.
- Living notes for known pitfalls, migrations, and irreversible operations.

## Open Questions

- How long should root instructions be before they become context pollution?
- Which repository maps help most: human-written architecture notes, generated code graphs, build graphs, or hybrid maps?
- Do typed languages give agents measurable advantages after controlling for ecosystem and test quality?
- Can CI history predict where agents will introduce regressions?
- What is the smallest useful "agent readiness" benchmark for a private codebase?
- Can an agent-readiness score be computed from setup reproducibility, context map freshness, test determinism, and instruction-file size/specificity?
