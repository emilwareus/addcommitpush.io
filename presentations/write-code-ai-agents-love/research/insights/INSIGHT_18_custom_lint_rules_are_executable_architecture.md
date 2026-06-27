# INSIGHT 18: Custom Lint Rules Are Executable Architecture

Some architecture rules are too important to leave as prose. If the policy is
mechanically detectable, a lint/static-analysis rule gives the agent a concrete
failure to repair: file, span, rule ID, evidence, and expected direction.

This note is not a claim that every design judgment should become a lint rule.
It is narrower: repo-specific constraints that agents repeatedly violate should
move from "remember this convention" to executable feedback where possible.

Plot-ready data for nearby claims lives in
`presentations/write-code-ai-agents-love/research/data/names_types_apis.csv` and
`presentations/write-code-ai-agents-love/research/data/feature_constraints_planning.csv`.

## Source map

| Ref   | Source                         | Local text                                            | Role in this insight                                                                                   |
| ----- | ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| D13   | ESLint custom rules            | `articles/eslint-custom-rules.html`                   | Mainstream proof that teams can encode project-specific JS/TS policy when stock rules do not cover it. |
| D14   | typescript-eslint custom rules | `articles/typescript-eslint-custom-rules.html`        | Type-aware rule authoring path for richer TypeScript constraints.                                      |
| D15   | Semgrep custom guardrails      | `articles/semgrep-custom-guardrails.html`             | Practitioner pattern: organization-specific rules in IDE, PR, and pre-commit flows.                    |
| D16   | Semgrep rule ideas             | `articles/semgrep-rule-ideas.html`                    | Shows prose guidance can often be turned into authentication, validation, or security rules.           |
| D17   | ast-grep lint rule             | `articles/ast-grep-lint-rule.html`                    | AST-pattern rules with globs, messages, severity, and fixes.                                           |
| D18   | Nx enforce module boundaries   | `articles/nx-enforce-module-boundaries.html`          | Mature architecture-boundary lint pattern in monorepos.                                                |
| D31   | polint README                  | `articles/polint-readme.md`                           | Local option: repo-owned rule code with scan/fact/diagnostic infrastructure.                           |
| D32   | polint Agent Playbook          | `articles/polint-agent-playbook.md`                   | Agent-facing JSON output, focused remediation, baselines, ignores, and loop commands.                  |
| D33   | polint ignore comments         | `articles/polint-ignore-comments.md`                  | Suppression/debt tracking for gradual adoption.                                                        |
| R18   | Evaluating AGENTS.md           | `paper-text/evaluating-agents-md-2602.11988.txt`      | Counterweight: context/prose files can add cost and noise.                                             |
| R59   | Smells of LLM Generated Code   | `paper-text/smells-llm-generated-code-2510.03029.txt` | Static quality signals matter because LLM code can carry more smell risk.                              |
| R60   | Causal Smells                  | `paper-text/causal-smells-llm-code-2511.15817.txt`    | Static smell signals are measurable but need careful interpretation.                                   |
| Local | polint/plint case study        | `notes/polint-plint-case-study.md`                    | Real local example of architecture policy as code.                                                     |

## Why prose is the weak form of architecture

An instruction file can say "UI code must not import persistence modules." That
is useful orientation, but it is weak enforcement. The agent has to remember it,
recognize the relevant modules, notice that an import crosses the boundary, and
then choose the right repair. If the code compiles and tests pass, nothing
forces the architecture issue back into the loop.

A static diagnostic changes the shape of the interaction. The rule can point at
the exact import, name the violated boundary, include the owning package or
layer, and suggest the approved path. This is why lint rules are not just
"quality bureaucracy" in an agentic codebase. They are part of the agent's
computer interface.

That distinction matters because AGENTS.md-style prose has mixed evidence. One
instruction-file study reports efficiency benefits, but `Evaluating AGENTS.md`
finds that context files can increase steps and cost and that generated context
can reduce success. The synthesis is not "prose bad." It is: prose should index
the rule; executable tools should enforce the rule when the rule is mechanical.

## What mainstream tooling already proves

The custom-rule ecosystem matters because it prevents this insight from turning
into a polint pitch. The pattern is broader than any one tool.

| Tool family                  | What it makes executable                                         | Why it matters for agents                                       |
| ---------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| ESLint custom rules          | JavaScript/TypeScript AST patterns and project conventions       | Agents get exact file/span failures in a tool they already run. |
| typescript-eslint            | Type-aware lint rules through TypeScript parser/checker services | Rules can reason about symbols and types, not just syntax.      |
| Semgrep                      | Organization-specific security and correctness guardrails        | Prose security guidance can become IDE/PR/pre-commit feedback.  |
| ast-grep                     | Structural AST search, lint, and rewrite rules                   | Useful when the check is a syntactic pattern plus optional fix. |
| Nx module boundaries         | Dependency constraints between tagged projects/packages          | Architecture layering becomes a dependency graph rule.          |
| dependency-cruiser / similar | Import graph policies                                            | Agents cannot silently cross forbidden package/layer edges.     |

This tooling evidence is not causal agent-performance evidence. It is
feasibility evidence: the industry already accepts executable local policy as a
normal way to keep project conventions alive.

## Where custom lint is actually worth it

The high-value rules are not formatting preferences. They are the conventions
that keep a codebase understandable and safe while agents make fast multi-file
edits.

| Policy family           | Example rule                                                    | Needed facts                                                |
| ----------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Architecture boundaries | `apps/web` cannot import `backend/internal/persistence`         | paths, imports, resolved module graph                       |
| Public API discipline   | packages must import through public exports, not deep internals | imports, package exports, symbol resolution                 |
| Generated code policy   | do not edit generated SDK output by hand                        | paths, generated markers, CI generation check               |
| API integration         | internal HTTP calls must use generated clients                  | imports, call expressions, string literals, type facts      |
| Security middleware     | mutating routes require CSRF/auth middleware                    | route registration syntax, call chains, path metadata       |
| Validation-before-use   | external input must pass schema validation before persistence   | dataflow, call graph, validator facts                       |
| Context propagation     | request context must flow into database/service calls           | function signatures, call graph, dataflow                   |
| Test evidence           | new routes/branches need matching component/unit tests          | routes, symbols, test facts, coverage or naming conventions |

The table also shows why simple YAML pattern matching is sometimes enough and
sometimes not. A forbidden import can be a pattern. Context propagation or test
evidence usually needs computed facts, repo-specific path semantics, and
exceptions.

## The polint/plint case study: useful, but not the whole story

`polint` is a local implementation option for "bring your own rules." It should
be presented as one tool in the executable-architecture toolbox, not as the
universal answer.

The important product shape:

- the consumer repo owns the rule pack;
- the rules are normal Rust code under `.polint/rules`;
- polint supplies scanning infrastructure, typed facts, diagnostics, config,
  cache, JSON/SARIF, baselines, and ignores;
- agents can run focused checks and parse stable machine output.

The real `plint` usage is a strong case study because the rules are not toy
style checks. The local notes list 17 warning-level rules during adoption:

| Rule area            | Examples from plint notes                                        |
| -------------------- | ---------------------------------------------------------------- |
| Layer imports        | `backend-layer-imports`, app/domain/adapter purity checks        |
| Route security       | mutating routes require CSRF; active-school routes require guard |
| Context propagation  | backend context must flow through service/repository calls       |
| Typed errors         | adapter/domain typed error discipline                            |
| UUID boundaries      | UUID usage stays at boundary layers                              |
| Repository placement | repository interfaces in expected locations                      |
| Test evidence        | HTTP route component tests, GORM adapter coverage, domain tests  |

This is the talk-safe phrasing:

> For ordinary lint, use ordinary lint. When the rule is your repo's
> architecture encoded in code, a code-based local rule pack is a useful escape
> hatch.

## Why this connects to the research data

The custom-lint claim is partly backed by direct tooling evidence and partly by
indirect agent research.

CODETASTE uses static rules as part of the benchmark oracle for refactoring
intent. That matters because it separates "tests pass" from "the intended
structural transformation happened." Needle in the Repo shows behaviorally
correct outputs can still be structurally wrong. The LLM-smell papers show that
generated code can carry higher maintainability-risk signals than professional
references.

The static-rule platform is the implementation path for those findings:

- if dependency control is hard, encode dependency rules;
- if generated SDK usage matters, ban raw internal API calls;
- if route security is repeatedly missed, fail the missing middleware;
- if a migration has additive and reductive patterns, encode both;
- if smells are acceptable only under certain local exceptions, put the
  exceptions in tested rule code instead of tribal memory.

## Caveats and non-claims

This does not prove that custom lint rules improve agent performance by a known
percentage. I do not have that direct experiment. The claim is an inference from
three things: agents need repairable feedback, static oracles catch structural
failures, and existing tooling can encode repo-specific rules.

Bad lint rules are worse than stale docs because they block work. Every custom
rule needs valid/invalid tests, an owner, documented precision, known false
positives, a baseline/ignore strategy, and a clear removal/update path.

Do not lint nuanced design judgment. Lint mechanical constraints: imports,
generated-code boundaries, required middleware, banned APIs, validation paths,
test-evidence conventions, migration completeness, and other facts a tool can
reason about.

Do not make the final article sound like "install my tool." The stronger
argument is tool-agnostic:

> Do not ask the agent to remember your architecture. Make the mechanically
> checkable parts of the architecture fail precisely.

## Blog visual candidates

1. Prose instruction vs static diagnostic: same architecture rule, two feedback
   loops.
2. Tooling ladder: stock lint -> custom ESLint/Semgrep/ast-grep -> repo-local
   rule code -> richer fact model.
3. plint rule taxonomy table: boundaries, security, context propagation, typed
   errors, test evidence.
4. "Bad custom lint" caveat box: no owner, no tests, no baseline, vague message.
5. Rule lifecycle: convention -> repeated agent failure -> rule prototype ->
   warning + baseline -> error on new violations.

## References

- D13: ESLint custom rules, `articles/eslint-custom-rules.html`
- D14: typescript-eslint custom rules,
  `articles/typescript-eslint-custom-rules.html`
- D15: Semgrep custom guardrails,
  `articles/semgrep-custom-guardrails.html`
- D16: Semgrep rule ideas, `articles/semgrep-rule-ideas.html`
- D17: ast-grep lint rule, `articles/ast-grep-lint-rule.html`
- D18: Nx enforce module boundaries,
  `articles/nx-enforce-module-boundaries.html`
- D31: polint README, `articles/polint-readme.md`
- D32: polint Agent Playbook, `articles/polint-agent-playbook.md`
- D33: polint Ignore Comments, `articles/polint-ignore-comments.md`
- R18: Evaluating AGENTS.md,
  `paper-text/evaluating-agents-md-2602.11988.txt`
- R59: Smells of LLM Generated Code,
  `paper-text/smells-llm-generated-code-2510.03029.txt`
- R60: Causal smell analysis,
  `paper-text/causal-smells-llm-code-2511.15817.txt`
- Local case study: `notes/polint-plint-case-study.md`
