# Rule Research Report: Hardening The Shape Of The Codebase

This report turns the research pass into article material. It synthesizes public
`polint` behavior and anonymized private rule packs. Private repository names,
paths, package names, domain terms, and proprietary identifiers are deliberately
excluded.

The main finding: the strongest article should not start with "static analysis
is powerful." It should start with the shape we want to preserve, then show that
different rules require different fact layers. Current repo-local rules already
cover a lot with files, syntax, imports, metrics, and test facts. The harder
security and architecture examples create the pressure for call graphs, CFG, and
data-flow APIs.

## Capability Summary

| Capability                    | What It Enables                                     | Current Article Role                      |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------- |
| File/path facts               | ownership, generated code, changed-file obligations | show cheap process rules                  |
| Syntax/literal facts          | raw values, selectors, forbidden calls, tags        | first concrete example                    |
| Import facts                  | direct architecture boundaries                      | first architecture example                |
| Resolved imports/module graph | alias-aware and transitive boundaries               | explain why import strings are not enough |
| Symbol/reference facts        | deprecated APIs, contracts, registries              | bridge from syntax to semantics           |
| Metrics facts                 | function/file/complexity budgets                    | explain local shape budgets               |
| Test facts                    | test presence and branch evidence                   | show proof-shaped tests                   |
| Branch obligations            | heuristic branch/error path requirements            | bridge to CFG                             |
| Call graph                    | reachability from entry points to forbidden APIs    | teach CHA/RTA/VTA and precision           |
| CFG                           | ordering, guards, early returns, cleanup            | teach "before" and "on every path"        |
| Data flow/taint               | source -> sink with barriers                        | teach fixed points and modeling           |

## Category 1: File, Path, And Changed-File Rules

These rules harden ownership and review process. They are usually cheap and
valuable because they fail at the exact place the codebase shape changed.

Representative rules:

- Generated or vendored code must not be edited by hand.
- Files under a feature boundary cannot introduce sibling-feature imports.
- Migration/schema files require a matching test or review note.
- Persistence query shape changes require an index/performance review.
- Lifecycle-sensitive files require evidence for retention, export, deletion, or
  redaction behavior.
- Removing a public contract requires a change in the compatibility test suite.
- Reintroducing a removed runtime path, transport, table, topic, or compatibility
  shim is blocked.

Facts needed:

- source files;
- path globs;
- changed-file list;
- generated/vendor markers;
- local ownership config;
- optionally parsed syntax inside changed regions.

Article use:

Use this category to show that not every repo-local rule is a compiler research
problem. Some of the best rules are executable review triggers. They say, "this
change crossed a sensitive boundary; prove you meant it."

Avoid:

- naming the private systems that motivated the examples;
- implying changed-file obligations prove runtime safety.

## Category 2: Syntax, Literal, And Attribute Rules

These rules harden local conventions visible directly in source syntax. They are
cheap, precise, and good for agent feedback because the diagnostic usually has a
single-span repair.

Representative rules:

- Product UI must use design tokens instead of raw color literals.
- E2E tests must use stable test IDs instead of brittle visible-text or CSS
  selectors.
- Tests cannot disable selector policy or use arbitrary sleep calls.
- Client feature code cannot make raw network calls from random components.
- Feature code cannot directly manipulate browser storage or client cache outside
  the owning layer.
- Audit/log metadata cannot include keys that look like personal data or secrets.
- Stringly action/resource identifiers must use the local typed constants.
- Serialized field names must follow the public wire-format convention.
- Configuration defaults cannot silently choose a weak mode when required input
  is missing.

Facts needed:

- parsed source files;
- string/template literals;
- JSX attributes;
- call expressions;
- struct/object field tags or serialized-name metadata;
- source spans.

Article use:

This should be the first technical example. A parser produces literal and
attribute facts; a rule checks a local predicate; the engine emits a small
diagnostic. It proves the general idea without overcomplicating it.

Where it breaks:

- aliases can hide forbidden APIs;
- builder functions can hide literal values;
- framework wrappers can hide selector or network behavior;
- syntax cannot prove runtime reachability.

## Category 3: Import, Module, And Layer Boundary Rules

These rules harden architecture. They are the clearest example of "the codebase
has a shape."

Representative rules:

- UI code must not import persistence or server-only internals.
- Domain and application code must not import transport, provider, request-state,
  or storage implementation details.
- Persistence adapters must not import HTTP, request context, security/session
  helpers, or public DTO/link builders.
- Feature modules cannot deep-import across another feature's internals.
- Private contracts must be defined in their owning module and consumed only by
  approved composition points.
- Generated API clients are the only allowed path to a remote service boundary.
- Backend layers import inward through contracts, not sideways through concrete
  implementations.
- Repository interfaces live at the domain/application boundary, not inside the
  persistence implementation.

Facts needed:

- import declarations;
- setup-aware module resolution;
- resolved paths;
- package/workspace roots;
- module ownership labels;
- module graph reachability.

Article use:

This is the main architecture example. It lets the article explain why import
strings are not enough: aliases, package exports, generated files, and workspace
layout all matter. Once the engine produces resolved import edges, the local rule
becomes small.

Precision notes:

- unresolved imports should not be silently treated as clean;
- generated files and test fixtures may need scoped exceptions;
- transitive reachability needs a module graph, not only direct imports.

## Category 4: Symbol, Reference, And Contract Rules

These rules harden named program contracts. They sit above syntax because the
same symbol can appear through aliases, reexports, method expressions, or
generated references.

Representative rules:

- Deprecated APIs have zero non-test references after a migration deadline.
- Public registries expose handlers/commands, not repositories or storage
  collections.
- Public DTOs use explicit serialized names and do not leak internal storage
  fields.
- Provider-owned event or message shapes are defined at the boundary and not
  redefined in feature code.
- Repository ports stay narrow and do not grow unrelated read/write methods.
- Internal IDs use typed wrappers at public boundaries instead of untyped strings.
- Runtime registration uses the current registry API, not removed compatibility
  shims.

Facts needed:

- declarations;
- definitions;
- exports;
- references;
- type names;
- receiver/method facts;
- source spans.

Article use:

Use this category as the bridge from module boundaries to call graphs. It helps
explain why text search is weak: the rule wants a program object, not a string
that happens to look like a name.

Current/future split:

Some of these can be approximated today with source parsing and naming
conventions. The stronger version needs symbol/reference facts and, for typed
ID rules, language type information.

## Category 5: Metrics And Shape-Budget Rules

These rules harden maintainability. They do not prove correctness, but they make
review pressure visible.

Representative rules:

- Functions over the local line or complexity budget require attention.
- Files over the local size budget are flagged for ownership review.
- Application-layer files remain orchestration-heavy and do not accumulate
  business logic.
- Command/query handlers stay one concept per file.
- Ports/interfaces do not mix unrelated capabilities.
- Test files should not grow large helper frameworks without local helpers being
  split out.

Facts needed:

- function spans;
- file spans;
- lines of code;
- branch count;
- cyclomatic complexity;
- maybe symbol grouping.

Article use:

Keep this short. Metrics are useful as tripwires, not as taste disguised as
science. The article should say that a metrics rule should trigger review, not
automatically claim the code is bad.

## Category 6: Test Evidence Rules

These rules harden the proof surface around architecture and security-sensitive
code. They analyze tests statically, without running the system.

Representative rules:

- Each route/handler has a component or integration test.
- Access-sensitive handlers show allowed and denied cases.
- Mutating handlers show validation/error evidence, not only happy path.
- Scope-sensitive handlers show isolation evidence.
- Persistence adapters have success, error, and scope/isolation tests.
- Domain behavior has direct tests in the owning package/module.
- Test helpers mark themselves as helpers.
- Table tests use subtests with names that explain the case.
- Tests avoid arbitrary sleeps and selector-policy bypasses.

Facts needed:

- source files;
- handler/route discovery;
- test function discovery;
- subtest names;
- assertion/evidence terms;
- call expressions inside tests;
- path ownership.

Article use:

This is a strong example because it broadens the article beyond security. It
shows that static analysis can ask "does the test suite contain evidence for the
branch this code added?"

Limits:

- static test evidence is not runtime coverage;
- naming conventions can be gamed;
- framework-specific discovery needs models;
- absence of evidence is not proof of absence.

## Category 7: Branch And Error-Path Obligation Rules

These rules harden paths through a function: what happens when access is denied,
validation fails, publication fails, or deletion is requested.

Representative rules:

- A denied access branch records a durable audit/access event before returning.
- Mutating routes perform protection checks before mutation.
- Delete/purge paths check retention/legal-hold state before destructive action.
- Event publication errors are not swallowed.
- Config loading returns an error or fails closed instead of continuing with weak
  defaults.
- Security-sensitive setup is mounted before routes become reachable.
- Branches that detect stale state, missing ownership, or forbidden access do not
  fall through to success.

Facts needed:

- branch/condition facts;
- return/error facts;
- side-effect calls;
- guard calls;
- source spans;
- eventually CFG dominance/path facts.

Article use:

Use this as the bridge from heuristics to CFG. The current practical version can
look for branch obligations and suspicious missing evidence. The stronger version
asks CFG questions:

```text
On every path from entry to mutation, does a guard dominate the mutation?
On every denied path, does the audit side effect happen before return?
```

Why syntax is not enough:

- early returns change the path;
- nested conditionals change the obligation;
- a call appearing earlier in the file is not proof it executes first;
- cleanup/defer/finally semantics are language-specific.

## Category 8: Call-Graph Rules

These rules harden reachability. They answer "can this entry point reach that
forbidden behavior?"

Representative rules:

- Public routes cannot reach dangerous internal APIs.
- Production entry points cannot reach debug-only or admin-only code.
- Background job handlers enter through the standard handler registry, not
  storage internals.
- Event/subscriber handlers use the standard runtime path and middleware chain.
- UI-triggered commands cannot call persistence adapters directly.
- Removed runtime paths are not reachable from production entry points.
- Tenant- or actor-scoped operations do not bypass the scoped service layer.

Facts needed:

- entry point discovery;
- function declarations;
- call expressions;
- receiver/method resolution;
- interface/dynamic dispatch model;
- callback/framework summaries;
- call graph reachability;
- depth and budget metadata.

Article use:

This is the main deep-education section. Explain:

- **Direct call graph**: add edges only for statically obvious calls. Precise but
  incomplete.
- **CHA**: for a method call, include implementations that could respond based on
  type hierarchy. Conservative but noisy.
- **RTA**: filter CHA candidates to types instantiated somewhere in the program.
  Usually less noisy, still approximate.
- **VTA**: propagate variable/value type information to narrow receivers further.
  More precise, more expensive, and still bounded by language/framework models.

The diagnostic should include the evidence path and the algorithm contract:

```json
{
  "rule_id": "local/no-dangerous-api-from-public-entrypoint",
  "entry": "public handler",
  "sink": "dangerous internal API",
  "path": ["entry", "service", "adapter", "sink"],
  "call_graph": "rta",
  "precision": "conservative",
  "unknown_edges": 2
}
```

Do not claim a call graph is truth. It is a precision budget.

## Category 9: CFG And Ordering Rules

These rules harden "before," "after," and "on every path" relationships inside
functions.

Representative rules:

- Validation happens before parsing into a privileged command.
- Protection checks happen before mutation.
- Retention checks happen before destructive deletion.
- Transaction start happens before writing the primary row and appending the
  event.
- Cleanup/finalization happens on every exit path after acquiring a resource.
- Security headers/middleware are installed before public routes are registered.
- Failure branches return after reporting an error instead of falling through.

Facts needed:

- basic blocks;
- branch edges;
- returns/errors/throws;
- call sites;
- side-effect classification;
- guard classification;
- dominance/post-dominance or path queries.

Article use:

This section should explain CFG with a tiny function:

```text
entry -> parse -> if invalid -> return
              -> check access -> if denied -> audit -> return
              -> mutate -> return
```

Then show why the rule is an ordering predicate:

```text
guard dominates mutation
audit occurs on every denied path before return
```

Current/future split:

The research pass found strong branch-obligation pressure. Some can be
implemented heuristically today. The clean article example should be honest that
precise "on every path" enforcement needs CFG support.

## Category 10: Data-Flow And Taint Rules

These rules harden value movement through the codebase. Use them as
fictive/future examples unless the final implementation has explicit support.
They are still useful because they explain why a powerful engine is needed.

Representative rules:

- Request-controlled data cannot reach shell execution without validation.
- Request-controlled data cannot reach raw SQL/query construction without a
  parameterization barrier.
- Personal data cannot reach logs, analytics, or audit metadata unless the field
  is classified and allowed.
- Secrets or tokens cannot reach client responses or persistent plaintext.
- Actor/request state cannot be read inside persistence adapters; scoped identity
  must be passed as typed command data.
- Transaction handles must flow into append/write operations that must be atomic
  with the primary mutation.
- Untrusted template data cannot reach HTML/email rendering without escaping.
- External provider payloads cannot become public DTOs without normalization.

Facts needed:

- source definitions;
- sink definitions;
- barriers/sanitizers;
- propagators;
- assignments;
- calls and returns;
- alias facts;
- field/container modeling;
- interprocedural summaries;
- budgets;
- unknown edges.

Article use:

This is the article's deepest educational section. Teach:

- a data-flow problem tracks facts at program points;
- a forward worklist solver repeatedly applies transfer functions until state
  stops changing;
- taint is a model layered on top of data flow;
- sources, sinks, barriers, and propagators must be configured for the policy;
- "validated for SQL" is not "validated for shell";
- if the engine cannot model a call, it should report unknown, not silently clean.

Good pseudocode shape:

```text
seed taint at sources
propagate through assignments, calls, returns, fields
remove or transform taint at barriers
report if taint reaches a sink
stop at fixed point or budget
```

Use the phrase "fictive/future" only in the working notes. In the public article,
phrase it as "a deeper rule would need..."

## Category 11: Agent-Facing Diagnostic Rules

This is not a separate fact layer. It is the output contract that makes the rules
useful in vibe-coding loops.

Representative output requirements:

- stable rule ID;
- file and exact span;
- message that says what to change;
- evidence path when available;
- precision/status field;
- focused rerun command;
- baseline/suppression metadata;
- machine-readable JSON;
- SARIF or CI output for review surfaces.

Article use:

This supports the "release the vibes" thesis. Agents need repair objects, not
style advice. A good diagnostic lets the agent load the right files, make a
small edit, rerun the focused check, and stop when clean or unknown.

Failure modes:

- vague warnings make agents optimize for vibes;
- noisy diagnostics train humans and agents to ignore the tool;
- no precision/status field makes a heuristic data-flow warning look like an
  exact syntax violation;
- no rerun command makes repair loops expensive.

## Recommended Final Article Rule Set

The finished article should not enumerate every rule above. It should choose one
strong rule per capability step:

1. **Raw design token rule**: syntax/literals.
2. **Layer boundary rule**: resolved imports/module graph.
3. **Handler test evidence rule**: test facts.
4. **Changed persistence-query review rule**: changed-file obligations.
5. **Public route cannot reach dangerous API**: call graph.
6. **Guard before mutation**: CFG.
7. **Request data cannot reach sink without validation**: data flow/taint.

These seven examples tell the story:

- cheap checks matter;
- local architecture can be executable;
- tests can be checked for evidence shape;
- review process can be encoded;
- reachability needs call graphs;
- ordering needs CFG;
- value movement needs data flow;
- `polint` exists because these policies are local to the repo but need shared
  analysis infrastructure.

## Public-Article Privacy Rules

Do not include:

- private repository names;
- local filesystem paths;
- private package/module names;
- private domain names;
- private bounded-context names;
- proprietary API, transport, table, topic, event, or runtime names;
- rules that uniquely identify a private product feature.

Use generic names instead:

- "public route";
- "dangerous internal API";
- "persistence adapter";
- "event appender";
- "standard registry";
- "feature module";
- "personal data";
- "request state";
- "remote service boundary";
- "removed runtime path."

The article can say the examples are drawn from real repo-local rule pressure
and simplified. It does not need to say where they came from.
