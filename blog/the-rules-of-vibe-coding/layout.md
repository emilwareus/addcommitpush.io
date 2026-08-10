# The Rules of Vibe Coding: Working Layout

This is the working layout for the next rewrite. It is not the finished article.
The job of this document is to keep the article honest: start with the thing we
want, climb through the rule types, teach static analysis only when the rule
needs it, and arrive at `polint` as a consequence.

## Core Thesis

We are not trying to stop vibe coding. We are trying to release the vibes without
letting the codebase lose its shape.

The useful move is to turn recurring local engineering taste into executable
rules. Some rules are tiny: "do not use raw color literals here." Some are
architectural: "this layer must not import that layer." Some are security
policies: "request-controlled data must not reach this sink unless it passed
through this validator." Static analysis is the machinery that lets those rules
run before review, before merge, and inside agent repair loops.

The article should make this feel practical rather than magical.

## Reader Promise

By the end, the reader should understand:

- what kinds of codebase rules are worth writing;
- why different rules need different facts;
- why cheap static analysis is still valuable;
- why call graphs, CFGs, and data flow are hard;
- why a repo-local engine exists at all;
- how this lets agents move faster without turning architecture into memory and
  prompts.

Do not teach "how `polint` works" first. Teach the pressure. Teach the ladder.
Then `polint` becomes the obvious tool I built to make the ladder usable in a
local repo.

## Article Shape

### 1. Open With The Desired State

Start with the goal:

> I want to be able to code with agents quickly, try ideas, move files, ask for
> refactors, and let the model take swings. But I also want the repo to keep its
> boundaries, security invariants, and style without forcing me to remember every
> rule in every prompt.

This is "release the vibes." The codebase should be permissive to creation and
strict about shape.

Avoid starting with a definition of static analysis. That comes later.

### 2. What Rules Do We Actually Want?

Introduce categories of rules in plain engineering language:

- UI code uses design tokens, not raw colors.
- Feature code uses stable E2E selectors, not brittle text selectors.
- Client code goes through the API layer, not direct network calls from random
  components.
- Layers import inward or through contracts, not sideways through internal
  files.
- Persistence code does not read request state or transport concepts.
- Mutating routes have protection checks before the side effect.
- Personal or secret data does not reach logs, analytics, public responses, or
  audit metadata unless explicitly classified and allowed.
- Background work, event handlers, and adapters go through the standard runtime
  path instead of bypassing the registry.
- Tests prove the important branches, not just that a function was called once.

The article should say: these are not universal language rules. They are local
shape rules. Generic tools cannot know them in advance.

### 3. The Static-Analysis Ladder

Now introduce static analysis as a ladder of facts, not a single tool category.

| Rung         | What The Engine Knows                          | Rule Example                                       |
| ------------ | ---------------------------------------------- | -------------------------------------------------- |
| Files        | paths, globs, generated status, changed files  | generated code is not edited                       |
| Syntax       | imports, literals, attributes, declarations    | no raw colors, no forbidden selectors              |
| Metrics      | function size, branch count, complexity        | review functions over the local budget             |
| Imports      | unresolved and resolved import edges           | UI cannot import persistence                       |
| Module graph | transitive package relationships               | feature modules cannot reach across ownership      |
| Symbols      | definitions, exports, references               | deprecated API has no remaining references         |
| Tests        | test names, subtests, assertion/evidence terms | handlers have happy, error, and access tests       |
| Call graph   | which function can reach which function        | public route cannot reach dangerous internal API   |
| CFG          | branch order, guards, exits, cleanup           | validate/check before mutation or deletion         |
| Data flow    | how values move through assignments and calls  | request data cannot reach a sink without a barrier |

The transition line:

> The mistake is asking every rule to be a deep rule. Most useful checks are
> boring. But the moment the policy says "can reach," "before," or "flows to,"
> we leave grep behind.

### 4. Rule Class A: Tiny Syntax Rules

Use a simple, concrete rule first:

```text
In product UI, raw colors are not allowed. Use design tokens.
```

Facts needed:

- string literals;
- JSX attributes;
- source spans;
- path filtering.

Teach:

- a parser turns code into syntax;
- the rule walks literal facts;
- the diagnostic points to the exact span;
- no types, call graph, or data flow are needed.

This is a good early example because it proves the tone: the article is not
trying to make every problem deep.

Insight link:

- [Static Analysis Engines Are Fact Pipelines](../../brain/insights/static-analysis/engine-design/static-analysis-engines-are-fact-pipelines.md)

### 5. Rule Class B: Import And Module Boundaries

Move to architecture:

```text
UI and feature code must not import persistence internals.
Domain/application code must not import transport or provider infrastructure.
Private contracts must be consumed only through allowed composition points.
```

Facts needed:

- import specifiers;
- resolver config;
- real target paths;
- package/module ownership labels;
- module graph for transitive reachability.

Teach:

- import strings are not enough because aliases and package exports hide the real
  target;
- resolved imports are already semantic facts;
- a module graph lets a rule ask "can this package reach that package?"

This section is where the article should first make the "engine makes the rule
small" point. Once imports are stable facts, the local rule is just a boundary
predicate.

Insight links:

- [Static Analysis Engines Are Fact Pipelines](../../brain/insights/static-analysis/engine-design/static-analysis-engines-are-fact-pipelines.md)
- [Polint Is A Repo-Local Policy Engine](../../brain/insights/static-analysis/custom-rules/polint-is-a-repo-local-policy-engine.md)

### 6. Rule Class C: Test Evidence Rules

Introduce rules that are not security-scanner glamorous but are valuable in real
repos:

```text
Every route/handler has a component test.
Access-sensitive handlers show allowed and denied cases.
Persistence adapters show success, error, and isolation evidence.
Tests use subtests and assertions that describe the branch being proved.
```

Facts needed:

- source files;
- function names;
- route/handler discovery;
- test functions;
- subtest names;
- assertion/evidence terms.

Teach:

- this is static analysis over the test suite, not runtime coverage;
- it is approximate but useful;
- evidence naming can be a policy surface;
- a rule can ask for "proof-shaped tests" without running the system.

This helps keep the article grounded in maintainability, not only security.

### 7. Rule Class D: Metrics And Shape Budgets

Use rules like:

```text
Functions over the local complexity budget require review.
Files in the application layer stay small and mostly orchestrate.
Ports stay narrow instead of growing into god interfaces.
```

Facts needed:

- function spans;
- line counts;
- branch counts;
- cyclomatic complexity;
- file-level metrics;
- maybe symbol grouping later.

Teach:

- metrics are not truth;
- budgets are tripwires;
- the best diagnostic says what changed and why it needs attention.

This section should be short. It is not the conceptual center, but it gives
another capability rung.

### 8. Rule Class E: Symbol And Contract Rules

Move from files/imports to named program entities:

```text
Deprecated public APIs have zero references.
Repository interfaces live in the contract layer.
Public DTOs use explicit serialized field names.
Registries expose commands or handlers, not storage internals.
```

Facts needed:

- declarations;
- definitions;
- exports;
- references;
- maybe type facts.

Teach:

- names in text are not symbols;
- references can be aliases, reexports, generated code, or method expressions;
- symbol facts let rules talk about program objects, not strings.

This is a bridge to deeper analysis without jumping straight to call graphs.

### 9. Rule Class F: Changed-File Review Obligations

Use the "policy is local process" idea:

```text
Changing persistence query shape requires an index/performance review note.
Changing lifecycle code requires retention/deletion test evidence.
Changing generated API boundaries requires updating the public contract tests.
```

Facts needed:

- changed files;
- path ownership;
- syntax facts inside changed regions;
- local review obligation config.

Teach:

- not every rule has to be a pure semantic theorem;
- some rules are executable review workflow;
- changed-file rules are useful when the cost of checking everything is high.

This is a good place to say local policy includes architecture, security, and
process.

### 10. Rule Class G: Call Graph Rules

Now go deep:

```text
Public routes must not reach dangerous internal APIs.
Background jobs must enter through the standard handler registry.
UI-triggered command paths must not call persistence adapters directly.
Removed runtime paths must not be reachable from production entry points.
```

Facts needed:

- entry points;
- function declarations;
- direct calls;
- interface/dynamic dispatch model;
- framework summaries;
- call graph reachability.

Teach call graphs properly:

- a call graph is caller -> callee edges;
- direct calls are cheap;
- interfaces, callbacks, function values, dependency injection, route tables,
  reflection, and dynamic imports create uncertainty;
- CHA over-approximates possible methods from type hierarchies;
- RTA filters that set to instantiated types;
- VTA adds variable/value type flow and can improve precision;
- every result needs an analysis contract: algorithm, depth, unresolved edges,
  and precision.

This is where the article should slow down and educate.

Insight link:

- [Call Graphs Are Precision Budgets](../../brain/insights/static-analysis/call-graphs/call-graphs-are-precision-budgets.md)

### 11. Rule Class H: CFG And Branch-Order Rules

Move from "can reach" to "what happens before what":

```text
Mutating routes check protection before the mutation.
Deletion/purge paths check retention/legal-hold state before deletion.
Config loading fails closed instead of silently continuing with weak defaults.
Denied access paths record a durable audit event before returning.
```

Facts needed:

- control-flow graph;
- branches;
- returns/errors/throws;
- side-effect calls;
- guard calls;
- dominance/post-dominance style relationships.

Teach:

- syntax cannot prove ordering across early returns and nested branches;
- a CFG turns a function into basic blocks and edges;
- a "guard before side effect" rule needs ordering, not just two calls in the
  same function;
- path sensitivity matters but costs precision and runtime.

Insight link:

- [Static Analysis Is Repair Infrastructure](../../brain/insights/static-analysis/state-of-static-analysis/static-analysis-is-repair-infrastructure.md)

### 12. Rule Class I: Data-Flow And Taint Rules

Use fictive/future examples clearly. They should be security/architecture
examples that the article can explain without claiming they are all current.

```text
Request-controlled data cannot reach shell execution without validation.
Personal data cannot reach logs, analytics, or audit metadata unless explicitly allowed.
Secrets cannot reach client responses or persistent plaintext.
Actor/request state cannot be read inside persistence adapters.
A transaction handle must flow into the event appender used by a mutating operation.
```

Facts needed:

- sources;
- sinks;
- propagators;
- sanitizers/barriers;
- aliases;
- call summaries;
- field/container modeling;
- budgets and unknowns.

Teach:

- data flow is a fixed-point problem over a graph;
- taint analysis is not magic, it is a model of sources, sinks, barriers, and
  propagators;
- the hard part is not the word "taint," it is choosing the model;
- every sink has a different definition of "safe";
- unknown must be a first-class result, not a silent clean pass.

Insight links:

- [Data Flow Engines Are Fixed-Point Machines](../../brain/insights/static-analysis/data-flow/data-flow-engines-are-fixed-point-machines.md)
- [Taint Analysis Is Modeling, Not Magic](../../brain/insights/static-analysis/data-flow/taint-analysis-is-modeling-not-magic.md)

### 13. The Engine Consequence

After the examples, summarize why a powerful engine is needed:

- file discovery and parser adapters;
- typed fact views;
- resolver setup;
- fact cache;
- capability planning from rule signatures;
- JSON/SARIF diagnostics;
- baselines and suppressions;
- explicit unknown/unsupported/budget-exceeded states;
- policy APIs that hide raw graph machinery.

The key line:

> Local rules should ask policy questions. The engine should own the graph
> machinery.

Insight links:

- [Policy APIs Should Hide Raw Graphs](../../brain/insights/static-analysis/engine-design/policy-apis-should-hide-raw-graphs.md)
- [Static Diagnostics Are Agent Interfaces](../../brain/insights/write-code-ai-agents-love/static-analysis-and-policy/static-diagnostics-are-agent-interfaces.md)

### 14. Why I Built `polint`

Only now explain `polint`.

Framing:

- generic tools are good at generic facts;
- repo-local policy belongs in the repo;
- rules should be code, reviewed with fixtures;
- the engine should provide facts, diagnostics, cache, CI output, and agent-usable
  JSON;
- `polint` is the local-policy layer, not a replacement for language linters,
  typecheckers, Semgrep, CodeQL, or tests.

Keep this section educational. Do not say "unlock." Do not write a product
pitch. The article can say "this is why I built it" without selling it.

### 15. Pitfalls

Close the technical argument with failure modes:

- regex pretending to be semantics;
- clean reports that hide unsupported analysis;
- noisy rules without precision/evidence;
- unbounded graph traversal;
- policy rules that become unreadable analyzers;
- rules that encode taste once and then punish necessary refactors forever;
- agents optimizing vague warnings instead of fixing evidence-backed
  diagnostics.

### 16. Ending

End on the codebase shape:

> Vibe coding works best when the repo can talk back. Tests say whether behavior
> still works. Types say whether the program still fits. Repo-local static rules
> say whether the edit preserved the shape we care about.

No grand claim. No product CTA. Just the engineering rule:

> Release the vibes, but make the codebase executable enough to defend itself.

## Rules To Showcase In The Article

Use this smaller set in the final article so it does not become a catalog:

1. **Raw UI values**: syntax/literal facts. Shows cheap static analysis.
2. **Layer import boundary**: resolved imports/module graph. Shows architecture as
   executable policy.
3. **Handler test evidence**: test facts. Shows maintainability and proof-shaped
   tests.
4. **Changed persistence/query review**: changed-file obligations. Shows local
   process as code.
5. **Public route cannot reach dangerous internal API**: call graph. Teaches CHA,
   RTA, VTA, and uncertainty.
6. **Guard before side effect**: CFG. Teaches ordering and branch paths.
7. **Request data to sink**: data flow/taint. Teaches sources, sinks, barriers,
   propagators, aliases, and budgets.

The final article can mention the other rules as short examples, but these seven
are enough to show the capability ladder.

## Tone Notes

- Start from the desire to move faster, not from fear.
- Prefer "shape of the codebase" over "governance."
- Prefer concrete rules over abstractions.
- Explain hard concepts slowly, but only when the rule needs them.
- Keep `polint` as the consequence, not the premise.
- Mark future/fictive examples clearly when they rely on deeper engine support.
- Do not include private repository names, paths, domain names, package names, or
  proprietary identifiers.
