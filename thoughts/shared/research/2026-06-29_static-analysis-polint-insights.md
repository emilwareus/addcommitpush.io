# Static Analysis And polint: Research Insights

Date: 2026-06-29

Purpose: build article-grade knowledge for a future post on why I built
`polint`: a language-agnostic, repo-local linter framework with no bundled
policy rules, designed to help AI coding agents and humans follow codebase
specific conventions.

This is not the article. It is a synthesis of research findings, implementation
observations, article angles, and open questions.

## Research Artifacts

`dr` reports generated for this pass:

| Report                                                                        | Score | Use                                                                            |
| ----------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------ |
| `.context/dr/polint-static-analysis/00-state-of-static-analysis.md`           |   1/5 | Lead only. Source coverage was too narrow.                                     |
| `.context/dr/polint-static-analysis/01-call-graph-construction-algorithms.md` |   2/5 | Lead only. Useful for CHA/RTA/VTA sources, incomplete for points-to and JS/TS. |
| `.context/dr/polint-static-analysis/02-data-flow-engine-design.md`            |   3/5 | Medium-confidence support for IFDS/IDE and sparse value-flow.                  |

Local `polint` research packages used heavily:

- `.context/polint/research/call-graphs/FINAL-REPORT.md`
- `.context/polint/research/data-flow/FINAL-REPORT.md`
- `.context/polint/research/agent-rule-authoring/FINAL-REPORT.md`
- `.context/polint/research/incremental-query-engine/FINAL-REPORT.md`
- `.context/polint/docs/facts/policy-queries.md`
- `.context/polint/docs/API-VISIBILITY-PLAN.md`

Primary/current external sources used:

- [CodeQL data flow analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [CodeQL path queries](https://codeql.github.com/docs/writing-codeql-queries/creating-path-queries/)
- [Semgrep taint mode overview](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)
- [Joern custom data-flow semantics](https://docs.joern.io/dataflow-semantics/)
- [SootUp call graph construction](https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/)
- [Joern code property graph docs](https://docs.joern.io/code-property-graph/)
- [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules)
- [typescript-eslint custom rules](https://typescript-eslint.io/developers/custom-rules/)
- [ArchUnit user guide](https://www.archunit.org/userguide/html/000_Index.html)
- [dependency-cruiser rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [Go RTA package docs](https://pkg.go.dev/golang.org/x/tools/go/callgraph/rta)
- [ast-grep](https://ast-grep.github.io/)
- [Tree-sitter introduction](https://tree-sitter.github.io/tree-sitter/)
- [Software Engineering at Google, static analysis chapter](https://abseil.io/resources/swe-book/html/ch20.html)
- [Tricorder: Building a Program Analysis Ecosystem](https://research.google.com/pubs/archive/43322.pdf)
- [AGENTS.md](https://agents.md/)
- [Evaluating AGENTS.md, arXiv 2602.11988](https://arxiv.org/abs/2602.11988)
- [Static Analysis as a Feedback Loop, arXiv 2508.14419](https://arxiv.org/html/2508.14419v1)
- [FeedbackEval, arXiv 2504.06939](https://arxiv.org/abs/2504.06939)
- [Security Degradation in Iterative AI Code Generation, arXiv 2506.11022](https://arxiv.org/abs/2506.11022)
- [Helping LLMs improve code generation using feedback from testing and static analysis](https://link.springer.com/article/10.1007/s44163-026-01009-5)

## Executive Synthesis

The useful framing is not "static analysis is back." It never left. The shift is
that AI coding agents make local engineering taste and architecture rules a
runtime dependency of software delivery. A human reviewer can remember that a
repo forbids raw API calls, requires a generated SDK, or treats some write path
as security sensitive. Agents often need that policy encoded where they operate:
in the repo, in CI, in review, in concise diagnostics, and in a form they can
repair against.

`polint` is best understood as executable repository memory. The README states
that rules live in the user's repository, with file discovery, parsers, typed
facts, diagnostics, caching, CI output, and an SDK supplied by the tool while the
repo brings its own policy. It explicitly positions itself as the layer for
checks generic linters cannot know: internal API usage, security guardrails,
migration review rules, design-token rules, and test-quality expectations
(`.context/polint/README.md:5-15`). It also ships no built-in policy rules
(`.context/polint/README.md:35-37`).

The strongest article thesis:

> Static analysis for the AI-agent era is not about replacing ESLint, Semgrep,
> CodeQL, or typecheckers. It is about turning the local instructions we keep
> repeating in prompts and review comments into small, testable, repo-local
> programs that produce precise feedback at the point of repair.

## Insight Index

| ID          | Insight                                                                                                          | Confidence | Implication                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| INSIGHT-001 | The state of static analysis is a layered ecosystem, not one tool class.                                         | High       | Position `polint` as a missing repo-local policy layer, not as a replacement.                                         |
| INSIGHT-002 | Developer adoption depends on effective false positives, not theoretical soundness.                              | High       | Diagnostics must be actionable, scoped, and suppressible with debt visibility.                                        |
| INSIGHT-003 | Agent context files are useful but not sufficient; executable checks are the stronger memory format.             | Medium     | `polint` should be framed as "AGENTS.md for statically checkable rules."                                              |
| INSIGHT-004 | Custom-rule ecosystems prove demand, but most are language- or engine-bound.                                     | High       | `polint`'s differentiator is typed, multi-language facts plus repo-owned Rust rules.                                  |
| INSIGHT-005 | Call graphs are approximation families with algorithm labels, not a binary feature.                              | High       | Store algorithm, precision, provenance, status, and unresolved reasons per edge.                                      |
| INSIGHT-006 | Dynamic dispatch, frameworks, and callbacks make unresolved facts first-class product data.                      | High       | Unknowns should be visible and queryable, not silently dropped.                                                       |
| INSIGHT-007 | A data-flow engine should be representation-first, not IFDS-first.                                               | High       | Build MIR, places, CFG, calls, summaries, then query-scoped flow.                                                     |
| INSIGHT-008 | Useful data-flow APIs are source/sink/barrier query APIs with path evidence and budgets.                         | High       | Public SDK should expose bounded policy queries, not raw graph traversal.                                             |
| INSIGHT-009 | The `#[polint::rule]` function signature is the key API design move.                                             | High       | Typed rule parameters become capability declarations and agent-inspectable manifests.                                 |
| INSIGHT-010 | Agent-extensible analysis means agents author artifacts, models, and fixtures, not just prose.                   | Medium     | The product loop should be inspect, scaffold, test, diff, accept.                                                     |
| INSIGHT-011 | Incrementality and provenance are correctness properties for agent-written analysis.                             | Medium     | Cache keys must include source, config, rule, model, extension, schema, and provider inputs.                          |
| INSIGHT-012 | The article should be honest about the current `polint` boundary: some deep graph features are preview/internal. | High       | Avoid overselling. The research path is part of the story.                                                            |
| INSIGHT-013 | AI feedback loops need deterministic tools, not just more model self-critique.                                   | High       | Frame `polint` as external executable feedback whose truth does not depend on the model that wrote the patch.         |
| INSIGHT-014 | Feedback loops need iteration budgets.                                                                           | High       | Cap repair loops and expose budget-exceeded as incomplete analysis, not success.                                      |
| INSIGHT-015 | Models need diagnostics, not self-diagnosis.                                                                     | Medium     | Optimize diagnostic shape: span, rule ID, evidence, repair direction.                                                 |
| INSIGHT-016 | Repo-local policy needs an agent repair benchmark.                                                               | High       | Measure the exact `polint` thesis rather than relying only on adjacent SAST/repair papers.                            |
| INSIGHT-017 | Effective false positives are the adoption bar.                                                                  | High       | Measure whether warnings cause the right patch, not just whether they are technically true.                           |
| INSIGHT-018 | Repo-local policy prior art is fragmented.                                                                       | High       | Respect ESLint, Semgrep, CodeQL, Joern, ArchUnit, and dependency-cruiser while explaining the missing `polint` layer. |
| INSIGHT-019 | Data-flow solver choice is a product boundary.                                                                   | High       | Expose policy queries and evidence, not a premature public commitment to one solver.                                  |
| INSIGHT-020 | Production data-flow claims need tool doc crosschecks.                                                           | High       | Separate algorithm papers from current production tool behavior.                                                      |
| INSIGHT-021 | Call graph claims need algorithm provenance.                                                                     | High       | Store and expose edge algorithm, precision, status, provenance, and unresolved reasons.                               |

## INSIGHT-001: Static Analysis Is A Layered Ecosystem

Statement: The modern static-analysis landscape is not one axis from "linter" to
"advanced analyzer." It is a stack: formatters, typecheckers, AST linters,
semantic linters, SAST, path/data-flow engines, model checkers, graph query
engines, policy-as-code systems, and review/CI integrations.

Why it matters: `polint` should not be explained as "a better linter." That
invites the wrong comparison. It is a repo-local policy engine that sits beside
ESLint, Ruff, Biome, Semgrep, CodeQL, typecheckers, and formatters.

Evidence:

- `polint` README says it is not a replacement for ESLint, Biome, Ruff,
  golangci-lint, or formatters; it is the layer for rules that belong to the
  codebase (`.context/polint/README.md:14-15`).
- ESLint officially supports custom rules when core rules do not cover the use
  case, showing that local policy rule authoring is a mainstream need in the JS
  ecosystem.
- ast-grep describes itself as syntax-aware structural search/rewrite over ASTs
  in many files.
- CodeQL models semantic data-flow graphs and distinguishes local from global
  data flow, with global flow being more expensive.
- Joern's CPG docs describe a single intermediate program representation across
  supported languages and graph overlays for syntax, control flow, and data flow.

Confidence: high.

Caveats: The `dr` state-of-static-analysis report scored 1/5, so this insight is
grounded mainly in primary docs and local code, not in that generated report.

Implication for the article: Start by saying the problem is not lack of static
analysis. The problem is that generic tools cannot know every team's local
architecture and workflow rules.

Recommended action: Use a taxonomy table in the article:

| Layer                 | Examples             | What it knows                          | What it usually cannot know              |
| --------------------- | -------------------- | -------------------------------------- | ---------------------------------------- |
| Formatter/typechecker | Prettier, tsc, mypy  | syntax, types, style                   | local architecture policy                |
| AST linter            | ESLint, Ruff, Clippy | language-specific patterns             | cross-language repo contracts            |
| Pattern/static SAST   | Semgrep, ast-grep    | configurable syntax/data-flow patterns | exact internal framework semantics       |
| Semantic graph/query  | CodeQL, Joern        | call/data/control-flow models          | repo-specific conventions unless modeled |
| Repo-local policy     | `polint`             | team-owned executable conventions      | anything not statically observable       |

## INSIGHT-002: Effective False Positives Are The Real Adoption Metric

Statement: Production static analysis succeeds or fails on "effective false
positives": reports developers do not act on, including technically correct
warnings that are confusing, irrelevant, or too low-value.

Why it matters: `polint` should optimize for warnings that agents and humans can
act on immediately. The key is not maximal theoretical coverage; it is local,
high-signal checks with clear repair instructions.

Evidence:

- The Google static-analysis chapter defines effective false positives as issues
  developers do not take positive action on, and says perceived false positives
  matter because users react the same way to confusing or irrelevant warnings.
- The same source reports Tricorder integrated into code review across more than
  30 languages, with more than 100 analyzers and an overall effective
  false-positive rate just below 5%.
- `polint`'s README example emphasizes that a diagnostic should tell the AI
  agent exactly how to fix the raw-color violation, injecting missing project
  context at the repair moment (`.context/polint/README.md:41-47`).
- `polint` supports comment ignores and ignore statistics, which matters because
  real teams need explicit exceptions and debt visibility
  (`.context/polint/README.md:200-218`).

Confidence: high.

Caveats: Google's numbers are from Google's internal Tricorder context. The
general principle travels better than the exact rate.

Implication for the article: Avoid academic purity. Say that a repo-local rule
with 95% actionability can beat a theoretically richer analyzer that produces
warnings nobody trusts.

Recommended action: In `polint` messaging, emphasize:

- exact rule IDs;
- small diagnostics;
- evidence fields;
- `--fail-on none` / adoption modes;
- baselines for existing debt;
- review-mode checks for changed lines;
- ignores with stats, not hidden suppression.

## INSIGHT-003: Executable Checks Beat Bloated Agent Context

Statement: Agent instruction files are a useful place for human-readable repo
guidance, but executable checks are the better medium for statically checkable
requirements.

Why it matters: The article can connect `AGENTS.md` to `polint` without
attacking context files. The claim should be: prose is for orientation;
deterministic checks are for enforceable local policy.

Evidence:

- AGENTS.md describes itself as a predictable place to provide context and
  instructions to coding agents, used by over 60k open-source projects.
- The 2026 arXiv paper "Evaluating AGENTS.md" reports that context files do not
  generally improve task success and increase inference cost by over 20% on
  average in their studied settings.
- `polint` README explicitly says agents do not reliably remember local
  conventions from `AGENTS.md`, prompts, or review comments, and turns
  statically checkable parts into executable feedback
  (`.context/polint/README.md:25-30`).
- The 2025 "Static Analysis as a Feedback Loop" paper reports large reductions
  in LLM-generated code issues when GPT-4o is iteratively guided by Bandit and
  Pylint feedback.

Confidence: medium.

Caveats: The AGENTS.md paper evaluates specific agents, tasks, and repositories.
It should be used as evidence of risk and tradeoff, not as a universal claim
that agent context is bad.

Implication for the article: The story should not be "AGENTS.md failed." Better:
"Some rules are too important to leave as instructions in a text file. If a
machine can check them, make the machine check them."

Recommended action: Use a contrast table:

| Policy type                         | Good medium               |
| ----------------------------------- | ------------------------- |
| How to run tests                    | AGENTS.md                 |
| Code ownership or release rituals   | AGENTS.md and docs        |
| "Never call raw API from UI"        | `polint` rule             |
| "New GORM model needs index review" | `polint review` rule      |
| "Request data must not reach shell" | `polint` data-flow policy |

## INSIGHT-004: Custom Rules Are Proven, But Usually Language-Bound

Statement: ESLint, Semgrep, CodeQL, Joern, ast-grep, OPA/Rego, and Sonar-style
custom rules all prove the demand for user-authored policy. The gap `polint`
targets is repo-owned, multi-language, typed fact views with native rule code and
agent-friendly inspection.

Why it matters: The article can acknowledge prior art instead of pretending
`polint` invented custom rules.

Evidence:

- ESLint custom rules expose metadata and a `create(context)` visitor API.
- Semgrep taint mode exposes source, sink, sanitizer, and propagator vocabulary
  in YAML, with optional interprocedural and interfile analysis tiers.
- CodeQL path queries require source/sink configuration and path graph imports
  for path explanations.
- Joern uses code property graphs and a DSL over graph traversals.
- `polint` rules are plain Rust functions over typed fact views
  (`.context/polint/README.md:114-126`).
- The macro maps typed fact-view parameters to capabilities, including
  `Imports`, `ResolvedImports`, `Symbols`, `References`, `Events`, `Calls`,
  `ControlFlow`, `DataFlow`, metrics, literals, JSX attributes, and
  `ChangedFiles` (`.context/polint/crates/polint-macros/src/lib.rs:354-378`).

Confidence: high.

Caveats: `polint` currently supports Go and TypeScript/JavaScript surfaces, not
every language. "Language agnostic" should mean architecture and SDK contract,
not equal capability for every language today.

Implication for the article: Phrase the differentiator as:

> I did not want another YAML pattern language. I wanted repo-local Rust policy
> code over stable, typed, multi-language facts.

Recommended action: Include a prior-art section:

- ESLint: great local JS/TS AST visitor rules.
- Semgrep: great pattern/taint authoring velocity.
- CodeQL: great semantic query and path model.
- Joern: powerful graph substrate.
- `polint`: repo-local typed policy code plus agent-oriented inspect/test/explain
  loop.

## INSIGHT-005: Call Graphs Are Approximation Families

Statement: "Build a call graph" is underspecified. A call graph is an
approximation parameterized by language, roots, dependency scope, dispatch model,
type/heap abstraction, context sensitivity, framework models, and unsupported
features.

Why it matters: `polint` should not expose "the call graph" as a raw, singular
truth. It should expose call facts with algorithm labels, precision, provenance,
status, and unresolved reasons.

Evidence:

- SootUp's docs present CHA, RTA, and VTA as separate call-graph construction
  algorithms; RTA refines CHA by considering instantiated implementers, while VTA
  refines further by considering assigned instantiations and points-to
  relationships.
- The local `polint` call graph research says a call graph is an approximation
  family parameterized by language semantics, entrypoints, dependency scope,
  dispatch model, heap/type abstraction, context sensitivity, and feature models
  (`.context/polint/research/call-graphs/FINAL-REPORT.md`).
- `polint` call facts encode `CallSiteFact`, `CallTargetFact`, and
  `UnresolvedCallFact`, with call target status, algorithm, provenance,
  precision, and unresolved reasons (`.context/polint/crates/polint/src/analysis/calls/facts.rs:7-58`).
- `CallAlgorithm` includes syntax, direct reference, import binding, Go static,
  Go CHA/RTA/VTA, function-token flow, type hierarchy, points-to,
  framework-model, repo-model, and unsupported tiers
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:122-148`).

Confidence: high.

Caveats: Some `polint` call graph tiers are internal, preview, or future-facing.
The current product story should separate shipped preview behavior from the
architecture direction.

Implication for the article: Use "call graph construction algorithms" as a
technical interlude, but keep the reader focused on why algorithm provenance is
a product feature.

Recommended action: Explain the ladder:

1. Syntactic call sites: find calls, not targets.
2. Direct/import binding: high precision for named/static calls.
3. CHA/RTA/VTA: type-driven approximations with different precision/cost.
4. Function-token/value-flow: needed for JS/TS and Python callbacks.
5. Points-to/context-sensitive analysis: richer, more expensive.
6. Framework/repo models: necessary for routers, registries, DI, generated code.
7. Unresolved facts: honest representation of what the engine cannot know.

## INSIGHT-006: Unresolved Calls Are Product Data

Statement: Dropping unresolved calls hides false-negative risk. A static
analysis engine for repo-local policy should expose unresolved and unsupported
facts so rule authors and agents can decide what to do next.

Why it matters: This is one of `polint`'s strongest design angles. It treats
unknowns as actionable outputs, not internal embarrassment.

Evidence:

- `UnresolvedCallReason` includes function values, dynamic properties,
  interface dispatch, eval, call/apply/bind, framework dispatch, reflection,
  goroutine boundaries, dynamic imports, proxies/accessors, missing references,
  missing import resolution, setup missing, unsupported syntax, budget exceeded,
  and unknown callees (`.context/polint/crates/polint/src/analysis/calls/facts.rs:161-175`).
- `CallTargetStatus` explicitly includes `Resolved`, `Ambiguous`,
  `Unresolved`, `Unsupported`, `SetupMissing`, `BudgetExceeded`, and `Rejected`
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:150-158`).
- Analysis-plan support treats raw `cfg`, `call_graph`, and `coverage_facts` as
  reserved unsupported capabilities while policy-level `events`, `calls`,
  `control_flow`, and `dataflow` are supported preview surfaces
  (`.context/polint/crates/polint/src/analysis_plan.rs:700-729`).

Confidence: high.

Caveats: User-facing UX for unknowns has to stay concise. Unknown surfaces can
become noise if not scoped by capability, rule, or file.

Implication for the article: Make a point that "unknown" is not failure. It is
the honest static-analysis result when the code uses dynamic features or missing
setup.

Recommended action: Show a hypothetical diagnostic:

```text
local/no-raw-admin-reachable could not prove reachability through 3 dynamic
framework dispatch sites. Add a repo model for fastify routes or lower the rule
to direct calls only.
```

## INSIGHT-007: Data Flow Should Be Representation-First

Statement: A strong data-flow engine is not "IFDS plus a parser." The correct
order is normalized semantic representation, stable places, CFG/MIR, call facts,
local flow, summaries, bounded access paths, models, then query-scoped path
search. IFDS/IDE are useful solver families for the right finite distributive
subproblems, not the whole product.

Why it matters: This prevents overengineering and overclaiming. It also explains
why `polint` has many internal fact families before exposing full public graph
APIs.

Evidence:

- The `dr` data-flow report scored 3/5 and supports IFDS/IDE and sparse
  value-flow as medium-confidence background. It cites IFDS/IDE finite
  distributive domains and SVF's sparse memory-SSA approach.
- CodeQL docs say data-flow graphs model semantic runtime value flow rather than
  syntactic AST structure, and distinguish local data flow from more expensive
  global data flow.
- CodeQL also lists practical challenges: unavailable standard-library source,
  runtime behavior, aliasing, and large/slow data-flow graphs.
- `polint` data-flow facts encode nodes, edges, models, budgets, edge kind,
  algorithm, status, precision, validation, confidence, provenance, evidence,
  and input stable keys (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:10-77`).
- Edge kinds include local value edges, call-boundary edges, summaries,
  unknown/havoc, budget truncation, sources, sinks, sanitizers, barriers, and
  models (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:95-121`).

Confidence: high.

Caveats: The local research includes future-facing results from papers and
architecture notes. The article should not imply every listed capability is
fully stable public API today.

Implication for the article: Present the build path as a set of layers:

```text
parse -> facts -> symbols -> calls -> CFG/MIR/places -> local flow
     -> summaries -> models -> bounded queries -> diagnostics
```

Recommended action: In the article, separate:

- theory: lattices, transfer functions, fixed points, IFDS/IDE;
- engineering: facts, stores, cache keys, statuses, evidence;
- product: rule API and diagnostics.

## INSIGHT-008: Data-Flow APIs Need Path Evidence And Budgets

Statement: For repo-local policy, a data-flow finding without path evidence is
hard to trust, and a data-flow engine without budgets is hard to run in CI.

Why it matters: AI agents need concrete repair handles: source, sink, path,
barrier status, precision, and why the engine stopped. Humans need the same
thing, only shorter.

Evidence:

- CodeQL path queries are explicitly for visualizing information flow through a
  codebase, requiring source, sink, and data-flow steps.
- Semgrep taint findings include a taint trace and deduplicate to one trace even
  when multiple paths may exist.
- `polint` data-flow status includes `BudgetExceeded`, precision includes
  `Exact`, `SetupAware`, `Syntax`, `Conservative`, `Heuristic`, and `Unknown`,
  and provenance includes native, summary, extension, model, and query
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:132-175`).
- `policy_queries.rs` treats found, unknown, and budget-exceeded data-flow paths
  as possible policy results, rather than only reporting found paths
  (`.context/polint/crates/polint/src/policy_queries.rs:46-132`).

Confidence: high.

Caveats: Too much path evidence can overwhelm both humans and agents. The API
needs caps, stable keys, compact output, and `ai-friendly` formats.

Implication for the article: Use one narrative example:

```text
request query param -> String(...) -> build command -> exec(...)
```

Then show how a barrier model such as `validate_command` changes the result.

Recommended action: Emphasize "bounded proof, not omniscience." The analyzer
should say:

- found path;
- no path under current model;
- unknown because setup/model/call target missing;
- budget exceeded.

## INSIGHT-009: Typed Rule Signatures Are The Product API

Statement: `polint`'s main API innovation is that the Rust rule signature
declares the analysis dependency. A rule asks for typed fact views, and the macro
turns those view types into capability requirements and a rule manifest.

Why it matters: This is more agent-friendly than hand-maintained capability
configuration. Agents can inspect the rule, know which facts it needs, run
`polint explain`, and receive setup diagnostics if the capability is unsupported
or missing.

Evidence:

- README documents that typed fact-view parameters are the facts a rule can read
  and that `polint` derives analysis capabilities from the function signature
  (`.context/polint/README.md:114-119`).
- The macro collects view parameters and maps them to capability methods
  (`.context/polint/crates/polint-macros/src/lib.rs:56-70`).
- It generates rule metadata, capability declarations, fact-view requirements,
  and view bindings around the original function
  (`.context/polint/crates/polint-macros/src/lib.rs:76-124`).
- The capability mapping is explicit and centralized
  (`.context/polint/crates/polint-macros/src/lib.rs:354-378`).
- The analysis plan adds dependencies for calls/control-flow/dataflow on
  resolved imports, module graph, symbols, and references
  (`.context/polint/crates/polint/src/analysis_plan.rs:674-678`).

Confidence: high.

Caveats: Rust rule authoring is more powerful but less accessible than YAML.
The product needs scaffolds, templates, tests, and examples to make this usable
for agents and teams.

Implication for the article: Use this as a code-focused section:

```rust
pub(crate) fn no_raw_colors(
    ctx: &mut RuleCtx<'_>,
    literals: StringLiterals<'_>,
) -> RuleResult
```

Then explain: that `StringLiterals<'_>` parameter is not just a parameter. It is
the capability contract.

Recommended action: Article angle:

> The rule signature is the build plan.

## INSIGHT-010: Agent-Extensible Analysis Needs Artifacts, Not Just Rules

Statement: The most important agent loop is not "generate a rule." It is
"inspect facts and unknowns, classify the gap, choose the right artifact, create
fixtures, run, diff, and accept only if the evidence improves."

Why it matters: Agents can easily write huge rules that rediscover framework
semantics in ad hoc code. `polint` should guide them toward the right artifact:
rule, model, summary, provider extension, or fixture.

Evidence:

- Local agent rule-authoring research recommends typed Rust rules, declarative
  model packs, process-isolated provider extensions, summary domains, fixture
  harnesses, and inspect/explain/diff tools
  (`.context/polint/research/agent-rule-authoring/FINAL-REPORT.md`).
- `polint` README exposes agent-oriented JSON surfaces:
  `polint inspect rule`, `polint facts list`, `polint unknowns`, and
  `polint explain` (`.context/polint/README.md:97-100`).
- `DataFlowModelFact` has model kind, provider ID, optional model ID, status,
  precision, validation, confidence, provenance, evidence, and stable key
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:51-67`).
- Call facts include `FrameworkModel` and `RepoModel` algorithms
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:142-147`).

Confidence: medium.

Caveats: Some model-pack/provider-extension concepts are preview or internal.
This should be presented as design direction unless the article is versioned
against a release that has these surfaces stable.

Implication for the article: Add a section titled "The rule is sometimes the
wrong artifact."

Recommended artifact matrix:

| Need                                          | Artifact           |
| --------------------------------------------- | ------------------ |
| Emit diagnostics from existing facts          | Rule               |
| Teach sources/sinks/sanitizers/framework APIs | Model              |
| Reuse API semantics across rules              | Summary            |
| Add new repo-local extraction logic           | Provider extension |
| Prove behavior and prevent regressions        | Fixture/eval       |

## INSIGHT-011: Incrementality Is A Trust Feature

Statement: In an agent-extensible analyzer, caching and incrementality are not
mere speed work. They are correctness and trust work. If rule code, models,
extensions, config, sources, or toolchain inputs change, stale facts can produce
wrong guidance.

Why it matters: AI-agent workflows involve frequent small edits. If every edit
forces full recomputation, the tool is too slow. If stale facts leak through, the
tool is untrustworthy.

Evidence:

- `polint` README says analysis cache keys include source path and content,
  rule/options digest, loaded config, requested capability plan, cache format,
  and `polint` version (`.context/polint/README.md:175-180`).
- Semantic MIR output digests include provider ID/version/schema, config digest,
  topology and symbol graph digests, language lifecycle inputs, model inputs,
  extension inputs, tool inputs, upstream syntax digests, and normalized output
  facts (`.context/polint/crates/polint/src/analysis/provider.rs`).
- The local incremental-query research argues that incrementality must be a
  semantic contract, not just a key-value cache
  (`.context/polint/research/incremental-query-engine/FINAL-REPORT.md`).

Confidence: medium.

Caveats: The current implementation is not necessarily a full incremental
daemon. The insight is architectural and article-worthy, but should be phrased
as "what the engine has to do" and "what `polint` has started doing."

Implication for the article: Include one concrete cache-key example:

> A data-flow result is invalid if the source file is unchanged but the
> repo-local model that marks `ctx.user.email` as PII changed.

Recommended action: Make "cache correctness" an article sidebar, not the main
plot.

## INSIGHT-012: Be Precise About Current vs Future polint

Statement: The article should distinguish shipped stable facts, preview policy
queries, internal graph substrates, and future research. Overselling deep static
analysis will weaken the piece.

Why it matters: The most credible article is one that says: here is the real
problem, here is what `polint` already does, here is why the architecture is
designed for deeper analysis, and here is where the hard research lives.

Evidence:

- API visibility docs mark `ResolvedImports`, `ModuleGraphFacts`, `Symbols`,
  `References`, and metric views as stable; `Events`, `Calls`, `ControlFlow`,
  and `DataFlow` as preview policy views; raw `Cfg` and `CallGraph` as deferred;
  raw graph/solver/provider/parser/`AnalysisDb` internals as internal
  (`.context/polint/docs/API-VISIBILITY-PLAN.md`).
- `analysis_plan.rs` supports policy capabilities while reserving raw `cfg` and
  `call_graph` (`.context/polint/crates/polint/src/analysis_plan.rs:700-729`).
- `docs/facts/policy-queries.md` states the public style is typed views plus one
  query object and one view method, with no string query language, fluent builder
  DSL, closure filter DSL, or public graph traversal API.

Confidence: high.

Caveats: The cloned repo may be ahead of the latest published crate. When
writing the public article, verify the release version and public docs for the
exact state.

Implication for the article: Use clear labels:

- "Today";
- "Preview";
- "Internal substrate";
- "Research direction."

Recommended action: Add a note before the deep graph section:

> The public API intentionally does not expose raw call graphs or raw data-flow
> graphs. That is not an omission; it is the boundary that keeps repo-local rules
> small and stable.

## Second-Wave Research Findings

Follow-up `dr` reports:

| Report                                                                                 | Score | Use                                                                                                       |
| -------------------------------------------------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------- |
| `.context/dr/polint-static-analysis-followup/00-ai-feedback-loop-evidence-register.md` |   5/5 | Strong support for feedback-loop claims, with measured improvements and counterevidence.                  |
| `.context/dr/polint-static-analysis-followup/02-call-graph-evidence-register.md`       |   3/5 | Good support for CHA/RTA/VTA provenance; explicit gaps on Steensgaard, sensitivity, JS/TS, and Go limits. |
| `.context/dr/polint-static-analysis-followup/03-data-flow-evidence-register.md`        |   3/5 | Good support for IFDS/IDE and SVF; explicit gaps on CodeQL/Semgrep/Pysa/Joern production behavior.        |

High-confidence additions:

- Feedback source matters. Static-analysis feedback from deterministic tools
  should not be conflated with LLM-only self-critique.
- Iteration budgets matter. FeedbackEval reports diminishing returns after two
  or three rounds; the security-degradation paper reports increased critical
  vulnerabilities after five AI refinement iterations.
- Diagnostics are the agent interface. The evidence suggests models often repair
  better from concrete external feedback than from self-diagnosis.
- The strongest missing validation is a repo-local agent repair benchmark for
  `polint`-style policies.
- Call graph edges need algorithm provenance. CHA, RTA, VTA, RTA-for-Go,
  framework models, and heuristics are different claims.
- Data-flow APIs should expose bounded policy queries and evidence, not raw
  solver identity.

Source-backed measurements to use carefully:

- Static-analysis feedback with Bandit/Pylint reduced GPT-4o PythonSecurityEval
  security issues from more than 40% to 13%, readability violations from more
  than 80% to 11%, and reliability warnings from more than 50% to 11% within ten
  iterations.
- FeedbackEval reports structured feedback and feedback type materially affect
  repair success, with iterative gains diminishing after two or three rounds.
- Security Degradation in Iterative AI Code Generation reports a 37.6% increase
  in critical vulnerabilities after five AI refinement iterations.
- The AGENTS.md evaluation reports context files do not generally improve task
  success in the studied settings and increase inference cost by more than 20%
  on average.

Gaps to keep visible:

- No admitted report source directly compares `polint` diagnostics against
  `AGENTS.md` or review comments on repo-local policy tasks.
- No admitted report source measures false-positive cascades in coding-agent
  repair loops.
- No admitted call-graph report source covers Steensgaard, context sensitivity,
  object sensitivity, JavaScript/TypeScript dynamic limitations, or quantitative
  precision/recall.
- No admitted data-flow report source covers production behavior for CodeQL,
  Semgrep, Pysa, or Joern; those claims require direct official-doc citations.

New insight notes created from this wave:

- [[static-analysis-feedback-loops-need-deterministic-tools]]
- [[feedback-loops-need-iteration-budgets]]
- [[models-need-diagnostics-not-self-diagnosis]]
- [[repo-local-policy-needs-an-agent-repair-benchmark]]
- [[effective-false-positives-are-the-adoption-bar]]
- [[repo-local-policy-prior-art-is-fragmented]]
- [[data-flow-solver-choice-is-a-product-boundary]]
- [[production-data-flow-claims-need-tool-doc-crosschecks]]
- [[call-graph-claims-need-algorithm-provenance]]

## Technical Primer: Call Graph Construction Algorithms

Use this section as background notes, not as the article's main body.

### Direct/Syntactic Calls

Find all call expressions. This is cheap and language-parser dependent. It gives
excellent call-site recall, but it does not solve target resolution for dynamic
dispatch, callbacks, interfaces, dependency injection, generated code, or
framework routing.

### CHA

Class Hierarchy Analysis resolves virtual/interface calls by considering the
class/type hierarchy. It is scalable and often a baseline, but over-approximates
heavily when many subtypes exist.

### RTA

Rapid Type Analysis refines CHA by considering reachable instantiated types.
This improves precision, but is sensitive to entrypoints, roots, dynamic loading,
reflection, framework lifecycle, and partial-program analysis.

### VTA

Variable Type Analysis refines further by tracking assigned instantiations or
type flow. SootUp frames VTA as refining RTA using assignments and points-to
relationships. Go's `x/tools` VTA docs in the `dr` report describe Go-specific
handling for function literals and nested pointers to interfaces, with
reflection/unsafe caveats.

### Points-To

Points-to analysis estimates what heap objects or functions a value may refer
to. Andersen-style inclusion constraints are more precise and more expensive;
Steensgaard-style unification is cheaper and coarser. Object/context sensitivity
can improve precision but often creates state explosion.

### JS/TS And Python

Class hierarchy thinking is not enough. Functions are values, properties can be
dynamic, imports can be conditional, callbacks dominate, frameworks hide
entrypoints, decorators/registries create synthetic edges, and `eval`/reflection
style features break assumptions. The useful ladder is:

1. syntax;
2. lexical/import binding;
3. function-token/name-flow;
4. framework/repo models;
5. unresolved facts.

### Go

Go is a good first semantic target because its build/module lifecycle is more
controllable than JS/Python, but interface dispatch, function values,
goroutines, build tags, tests, reflection, and unsafe still matter.

## Technical Primer: Building A Data-Flow Engine

### Minimal Engine

1. Parse source and assign stable file/function IDs.
2. Lower to a small internal representation: MIR/operations/places.
3. Build a CFG for function-local control.
4. Emit local def-use/value-flow edges.
5. Add call-site and direct target facts.
6. Build simple function summaries: argument-to-return, receiver-to-return,
   parameter-to-sink, return-to-use.
7. Add source/sink/sanitizer/barrier model facts.
8. Run bounded source-to-sink path search for a query.
9. Emit diagnostics with path, precision, confidence, and budget status.

### Why Not Start With IFDS

IFDS is powerful for finite distributive subset problems and gives precise
valid-call/return matching, but it assumes:

- finite facts;
- distributive transfer functions;
- a good interprocedural CFG/call graph;
- manageable fact domain size;
- encoded heap/access-path abstractions.

So IFDS should be an internal solver for selected clients after the semantic
substrate exists. It should not be the first public representation.

### Source/Sink/Barrier Vocabulary

Borrow the convergent vocabulary from Semgrep, CodeQL, Pysa, and similar tools:

- sources;
- sinks;
- sanitizers;
- barriers/guards;
- propagators/additional steps;
- summaries/TITO;
- access paths;
- labels/confidence/precision;
- path evidence.

### Budget Semantics

Never silently treat budget exhaustion as "no issue." Return:

- `found`;
- `not_found`;
- `unknown`;
- `budget_exceeded`.

`polint` already models `BudgetExceeded` and budget facts in data-flow internals
(`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:69-77` and
`:132-140`).

## Article Spine

Possible article title:

> I Built A Linter With No Rules

Possible subtitle:

> The missing layer between AGENTS.md and code review is repo-local static
> analysis.

Suggested outline:

1. The repeated-review-comment problem.
2. Why AI coding agents made it worse.
3. Why AGENTS.md and prompts are necessary but insufficient.
4. What static analysis already gives us.
5. Why generic static analyzers cannot know your repo.
6. `polint`: a rule runner with no policy opinions.
7. Typed fact views and capability-derived rules.
8. Review rules and diff-gated policies.
9. From AST facts to semantic facts: calls, control flow, data flow.
10. Unknowns, budgets, and evidence as first-class outputs.
11. What I learned building it.
12. What is still hard.

Opening paragraph seed:

> I kept writing the same review comments to coding agents: use the generated
> SDK, do not call the raw endpoint, do not put raw colors in TSX, do not edit a
> GORM model without checking indexes, do not log secrets. These were not style
> preferences that belonged in ESLint, and they were not security rules generic
> enough for a SAST vendor. They were local knowledge. So I built a linter with
> no rules.

## Claims To Avoid

- Do not claim `polint` replaces CodeQL, Semgrep, ESLint, Ruff, or typecheckers.
- Do not claim language-agnostic means equal semantic precision in every
  language today.
- Do not claim AI agents cannot use context files. The better claim is that
  executable checks are better for statically checkable requirements.
- Do not imply raw call graph and raw data-flow graph APIs are public stable
  surfaces if they remain preview/internal.
- Do not say "sound" without stating the scope, model, unsupported constructs,
  and precision tier.

## Follow-Up Research Needed

1. Run `polint` on a real repo with one AI-agent-specific rule and measure:
   diagnostics, repair success, false positives, and agent iteration count.
2. Compare three policy encodings:
   AGENTS.md only, review comment only, `polint` rule.
3. Build a small benchmark for repo-local rules:
   raw API calls, design tokens, security guard, GORM model index review,
   request-to-shell flow.
4. Verify published crate surface against cloned repo state before writing the
   public post.
5. Create one diagram of the layered engine:
   source files -> facts -> capability plan -> rules -> diagnostics.
6. Create one diagram of data-flow:
   source -> local edge -> call edge -> summary -> barrier -> sink.

## Bottom Line

The strongest idea is simple:

> Prompt files tell agents what to remember. `polint` turns the parts that can
> be checked into executable feedback.

The deeper technical story is that this requires a real static-analysis
substrate: typed facts, capability planning, provenance, precision labels,
unknowns, budgets, path evidence, review diff facts, caching, and eventually
agent-authored models that bind back to native facts.
