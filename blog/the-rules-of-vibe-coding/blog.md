I have been building a static-analysis engine on the side, which is a strange
hobby to pick in 2026 when the rest of the industry is busy asking agents to
"please follow our conventions" in ever-growing markdown files. This post is my
attempt to explain why I think the hobby is the saner response.

I like vibe coding, and I want it to stay fast: sketch, ask for a refactor, try
a design, let the model take a swing, keep moving. But I do not want the
codebase to slowly forget its boundaries while I do. The way out is not more
prompt ceremony. The way out is to turn the rules that define the shape of the
repo into executable checks.

Who is this for? You ship code with agents most days, your `AGENTS.md` keeps
growing, and you have typed "remember: UI code does not import the database"
more than once. The second half of the post gets properly nerdy about
static-analysis internals: call graphs, control-flow graphs, fixed points. That
is on purpose. Knowing what these engines can and cannot know is what separates
a check you can trust from a check that lies to you.

# Key takeaways

- Vibe coding works better when the repo can answer back with deterministic
  feedback.
- The best rules start as local engineering conventions: boundaries, test
  evidence, security guards, migration rules, and review obligations.
- Static analysis is not one thing. Some rules only need files or syntax. Some
  need resolved imports, symbols, test facts, call graphs, control flow, or data
  flow.
- Deep analysis should be used only when the policy needs it. A grep is enough
  for some rules and a lie for others.
- I built `polint` because many important rules are local to one repository.
  The engine owns facts and diagnostics. The repository owns policy.

# Release the vibes

I like vibe coding. I also do not trust it by default.

The good version feels like a fast pairing session: ask for the next edit, read
the diff, steer, repeat. The bad version is when the edits come fast and the
important rules stay in your head.

A senior engineer remembers that UI code must not reach into persistence, that
a mutating route needs a guard before it writes, and that request-controlled
data must not reach a dangerous sink without validation. An agent will not
reliably remember any of that across tasks. I know because I tried the prompt
version first. I wrote the boundaries into my instruction files, and the agent
respected them right up until the session got long enough that it did not.

A new maintainer should not have to learn your architecture from a review
comment three months after breaking it. Neither should the model.

So the first rule is:

> If a convention matters repeatedly, turn it into a check.

Not every convention deserves a check. Some judgments are contextual. Some
design trade-offs should stay in review. But the recurring mechanical rules
should not live in memory, prompts, or onboarding docs. They should live in the
repo and run when the repo changes.

That is what I mean by "release the vibes." Let agents and humans move quickly,
but make the codebase executable enough to defend its own shape.

# What rules do we want?

Start with the policies, not the tool.

Useful repo-local rules sound like this:

- Product UI uses design tokens, not raw colors.
- E2E tests use stable test IDs, not brittle text selectors.
- Client feature code goes through the API layer, not direct network calls from
  random components.
- Layers import inward or through contracts, not sideways through internal
  files.
- Persistence adapters do not read request state or transport concepts.
- Mutating routes check protection before the side effect.
- Personal data and secrets do not reach logs or public responses unless
  explicitly allowed.
- Tests prove the important branches, not just that a function was called once.

These are local shape rules. Generic linters cannot know them in advance because
the rules are about your boundaries, migrations, test standards, threat model,
and architecture.

Once you list the rules, the next question is not "which linter should we use?"
It is:

```text
Which facts can answer this policy?
How precise does the answer need to be?
What should the tool say when it cannot know?
```

That is the real static-analysis question.

# Static analysis is a ladder

Static analysis means analyzing code without running the program. True, but too
broad to help.

A grep, a linter, a typechecker, and a CodeQL query all inspect code without
executing the application. They do not know the same things.

The better model is a ladder of facts:

| Rung         | What the engine knows                          | Example rule                                       |
| ------------ | ---------------------------------------------- | -------------------------------------------------- |
| Files        | paths, globs, generated status, changed files  | generated code is not edited                       |
| Syntax       | imports, literals, attributes, declarations    | no raw colors, no forbidden selectors              |
| Metrics      | function size, branch count, complexity        | review functions over the local budget             |
| Imports      | unresolved and resolved import edges           | UI cannot import persistence                       |
| Module graph | transitive package relationships               | feature modules cannot reach across ownership      |
| Symbols      | definitions, exports, references               | deprecated API has no remaining references         |
| Tests        | test names, subtests, assertion/evidence terms | handlers have happy, error, and access tests       |
| Call graph   | which function can reach which function        | public route cannot reach dangerous internal API   |
| CFG          | branch order, guards, exits, cleanup           | validate before mutation or deletion               |
| Data flow    | how values move through assignments and calls  | request data cannot reach a sink without a barrier |

The mistake is asking every rule to be a deep rule. Most useful checks are
boring. But the moment the policy says "can reach," "before," or "flows to," we
leave grep behind.

For a deeper explanation of this framing, see [Static Analysis Is Repair
Infrastructure](/brain/static-analysis-is-repair-infrastructure) and [Static
Analysis Engines Are Fact Pipelines](/brain/static-analysis-engines-are-fact-pipelines).

# Raw values need only syntax

Start with a cheap rule:

```text
In product UI, raw colors are not allowed. Use design tokens.
```

Bad code:

```tsx
export function Button() {
  return <button className="bg-[#1f2937] text-white">Save</button>;
}
```

This rule does not need types, a call graph, or data flow. It needs parsed
syntax, string literals, JSX attributes, source spans, and maybe path filtering.

The rule shape is boring:

```text
for each string literal or JSX attribute:
  if it appears in product UI
  and it contains a raw color:
    report a design-token diagnostic at that span
```

The diagnostic should be just as concrete:

```json
{
  "rule_id": "local/no-raw-ui-values",
  "file": "components/button.tsx",
  "range": "2:30-2:39",
  "message": "Use a design token instead of a raw color literal.",
  "precision": "syntax"
}
```

This is the best kind of static analysis: cheap, specific, and easy to fix. It
turns a preference into a repair object.

Many useful rules live at this level:

- forbid arbitrary sleeps in E2E tests;
- require stable test IDs for selectors;
- block raw network calls in client feature components;
- prevent direct browser storage/cache writes outside the owning layer;
- require explicit serialized field names on public objects;
- block obvious personal-data keys in log metadata.

The caveat is simple: syntax only sees syntax. Aliases, wrappers, and generated
values may hide the behavior. That is not a reason to dismiss cheap rules. It is
a reason to know their contract.

# Boundaries need resolved imports

Now take a rule that sounds almost as simple:

```text
UI code must not import persistence internals.
```

The naive version scans import strings:

```ts
import { userRepository } from '../persistence/user-repository';
```

That catches some mistakes. Then aliases arrive:

```ts
import { userRepository } from '@/server/persistence/user-repository';
```

Then package exports arrive. Then generated folders, monorepo roots, and test
fixtures. The import string is no longer the fact you care about.

The useful fact is a resolved edge:

```text
import.edge:
  from: app/ui/profile.tsx
  specifier: "@/server/persistence/user-repository"
  resolved_to: app/server/persistence/user-repository.ts
  status: resolved
```

Once the engine provides that fact, the rule becomes small again:

```text
for each resolved import:
  if source is in product UI
  and target is in persistence internals:
    report a boundary violation
```

This is a recurring pattern. The engine does the semantic work. The rule stays a
policy predicate.

Import-boundary rules are where repo-local analysis starts to feel like
architecture:

- domain/application code must not import transport or provider infrastructure;
- persistence adapters must not import request-state or public DTO builders;
- feature modules must not deep-import another feature's internals;
- private contracts must be consumed only through allowed composition points;
- generated API clients are the only allowed path to a remote service boundary.

These rules keep the shape of the codebase visible. If the resolver cannot
resolve an import, the result is not clean. It is unknown or unsupported for
that edge.

# Tests can be checked for evidence

Some of the most useful rules are not security rules. They are proof-shape
rules.

For example:

```text
Every route handler has a component test.
Access-sensitive handlers show allowed and denied cases.
Persistence adapters show success, error, and isolation evidence.
Tests use named subtests that describe the branch being proved.
```

This is static analysis over the test suite. It does not run the tests. It
parses them and asks whether the codebase contains evidence in the right place.

The rule is not "prove the program correct." It is more modest:

```text
for each mutating handler:
  require at least one happy-path test
  require at least one validation/error test
  require at least one access-denied test
```

That is still useful. An agent can add a new handler and forget the denied case.
A static test-evidence rule catches the missing proof before review.

There are limits. Naming can be gamed. Static test evidence is not runtime
coverage. Discovering tests in your framework needs its own model. But the
alternative is often worse:
humans asking "did you add the access test?" over and over in review.

# Some rules are review obligations

Not every executable rule needs to be a semantic theorem. Some are process
rules:

```text
Changing persistence query shape requires an index/performance review note.
Changing lifecycle-sensitive code requires retention/deletion test evidence.
Changing generated API boundaries requires public contract tests.
```

These rules need changed files, path ownership, and enough syntax to recognize
the kind of change. They usually do not need whole-program analysis.

This matters because architecture is not only "this import is forbidden."
Architecture also includes where humans must slow down. A changed-file rule does
not prove a query is slow. It says the change crossed a boundary where the team
requires evidence.

The diagnostic should be blunt about that contract:

```json
{
  "rule_id": "local/query-change-needs-review",
  "file": "adapters/profile_queries.ts",
  "message": "Query shape changed. Add an index/performance review note.",
  "precision": "changed-file"
}
```

This is useful with agents because agents are good at editing many files quickly
and worse at noticing invisible review rituals. Encoding the ritual turns it
from memory into a local contract.

# "Can reach" needs a call graph

Now we get to the first genuinely hard class:

```text
Public routes must not reach dangerous internal APIs.
```

This is not an import rule. A route may call a service, which calls an adapter,
which calls the dangerous function. No single file contains the whole story.

The engine needs a call graph: a directed graph from caller to callee.

```text
public route
  -> updateProfile
  -> applyProfileChange
  -> writeInternalRecord
  -> dangerousInternalAPI
```

Direct calls are easy. Dynamic software is not.

The hard cases are interface calls, dependency injection, callbacks, route
tables, reflection, dynamic imports, and framework hooks. A static analyzer has
to approximate possible targets.

Four call-graph ideas are worth knowing:

- **Direct calls** add edges only when the callee is obvious in the syntax. This
  is precise but incomplete.
- **Class hierarchy analysis (CHA)** looks at a method call and includes methods
  that could respond based on the type hierarchy. This is conservative and can
  be noisy.
- **Rapid type analysis (RTA)** filters the CHA candidate set to types actually
  instantiated in the program. This usually reduces noise but is still an
  approximation.
- **Variable type analysis (VTA)** propagates type information through values to
  narrow receivers further. This improves precision when the flow facts are good.

The names come from object-oriented analysis, but the pressure is broader. In
interface-heavy languages, the same problem appears as possible implementers,
function values, and framework callbacks rather than classes.

The point is not that one of these is "the right" call graph. The point is that
the algorithm is part of the diagnostic contract.

```json
{
  "rule_id": "local/no-dangerous-api-from-public-entrypoint",
  "entry": "public route",
  "sink": "dangerous internal API",
  "path": ["route", "service", "adapter", "dangerousInternalAPI"],
  "call_graph": "rta",
  "precision": "conservative",
  "unknown_edges": 2
}
```

A call graph is not truth. It is a precision budget. If the engine says a public
route can reach a dangerous API, the diagnostic should show the path and how the
path was computed. If the engine cannot resolve a dynamic edge, it should report
that gap instead of silently claiming the route is clean.

For the longer version, see [Call Graphs Are Precision
Budgets](/brain/call-graphs-are-precision-budgets).

# "Before" needs control flow

Reachability asks whether one function can reach another. Some policies ask a
different question:

```text
Does the guard happen before the side effect?
```

Examples:

- mutating routes check protection before mutation;
- delete paths check retention state before deletion;
- config loading fails closed instead of continuing with weak defaults;
- denied access paths record an audit event before returning;
- acquired resources are finalized on every exit path.

Syntax cannot prove these rules. Seeing `checkAccess()` earlier in the file than
`writeRecord()` is not enough. Early returns, nested branches, exceptions, and
cleanup semantics change the answer.

The engine needs a control-flow graph, usually called a CFG. A CFG turns a
function into basic blocks and edges:

```text
entry
  -> parse input
  -> if invalid -> return error
  -> check access
  -> if denied -> audit denial -> return forbidden
  -> mutate
  -> return success
```

Now the rule can ask a graph question:

```text
Does check access dominate mutate?
Does audit denial occur on every denied path before return?
```

"Dominates" means every path from the function entry to the later operation
goes through the earlier operation. That is the kind of relationship syntax
cannot express.

CFG rules force trade-offs. Path-sensitive rules distinguish branches better,
but cost more and need stronger models. Path-insensitive rules are cheaper, but
may confuse impossible paths with possible ones. The tool must expose that
choice.

This is where a lot of local security policy lives. Not "does the file contain a
guard somewhere?" but "does every relevant path pass the guard before the write?"

# "Flows to" needs data flow

The deepest rule class is value movement:

```text
Request-controlled data cannot reach shell execution without validation.
Personal data cannot reach logs or analytics unless explicitly allowed.
Secrets cannot reach client responses or persistent plaintext.
Untrusted template data cannot reach rendering without escaping.
```

These are data-flow rules. They ask how values move through assignments, calls,
returns, fields, containers, and aliases.

At the core is a fixed-point problem. The engine tracks facts at program points
and keeps applying transfer functions until the facts stop changing:

```text
solve_forward(cfg, entry_state):
  in  = map node -> bottom
  out = map node -> bottom
  in[cfg.entry] = entry_state
  worklist = [cfg.entry]

  while worklist is not empty:
    node = worklist.pop()
    old_out = out[node]

    out[node] = transfer(node, in[node])

    if out[node] != old_out:
      for succ in cfg.successors(node):
        next_in = join(in[succ], out[node])
        if next_in != in[succ]:
          in[succ] = next_in
          worklist.push(succ)

  return in, out
```

This terminates because the fact domain has finite height and `join` moves
monotonically toward a stable state. When the domain is not naturally finite,
production analyzers need widening, summaries, cutoffs, or budgets.

For taint analysis, the policy model adds names:

```text
source: request.query.command
sink: shell.exec
barrier: validateCommand
```

Then the engine does roughly this:

```text
seed taint at sources
propagate through assignments, calls, returns, fields
remove or transform taint at barriers
report if taint reaches a sink
stop at fixed point or budget
```

The hard part is the model.

A sanitizer for HTML is not a sanitizer for SQL. SQL parameterization does not
make a value safe for a shell command. A string conversion is not validation. A
container write matters only if the engine models the later read. Aliases,
fields, and framework callbacks decide whether the result is useful or noisy.

So a good data-flow diagnostic needs evidence and uncertainty:

```json
{
  "rule_id": "local/no-request-data-to-shell",
  "file": "routes/run-command.ts",
  "message": "Request-controlled data reaches shell execution without validation.",
  "evidence": {
    "source": "request.query.command",
    "sink": "shell.exec",
    "path": ["handler", "buildCommand", "shell.exec"],
    "required_barrier": "validateCommand",
    "precision": "heuristic",
    "unknown_edges": ["plugin callback"]
  }
}
```

Unknown is not failure. It is honesty. The failure is reporting clean while
silently skipping the hard edge.

For more detail, see [Data-Flow Engines Are Fixed-Point
Machines](/brain/data-flow-engines-are-fixed-point-machines) and [Taint Analysis
Is Modeling, Not Magic](/brain/taint-analysis-is-modeling-not-magic).

# A green check has a contract

Every static-analysis result has a contract, even if the tool hides it.

```text
clean under:
  language: TypeScript
  resolver: tsconfig paths loaded
  call graph: direct + RTA
  data flow: intraprocedural
  max path depth: 24
```

That may be enough for a local architecture rule. It is not enough for every
security claim.

The result state should be explicit:

| Status            | Meaning                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| `violation`       | The engine found a policy-breaking fact or path under the requested contract. |
| `clean`           | The engine searched the requested capability space and found no violation.    |
| `unknown`         | The engine hit a semantic gap, unresolved edge, or missing model.             |
| `unsupported`     | The provider cannot compute the requested fact family.                        |
| `budget_exceeded` | The query stopped before completing.                                          |

This changes behavior. An exact syntax finding can usually be fixed directly. A
heuristic data-flow finding needs inspection. An unknown result asks for a model,
a bigger budget, or a human decision. If all three look the same in CI, the tool
teaches the wrong behavior.

# Agents need repair objects

An agent mid-task has three deterministic oracles available: the typechecker,
the test suite, and static policy. The first two you probably already have. The
third is the one most repos are missing.

An agent can use this:

```json
{
  "rule_id": "local/no-request-data-to-shell",
  "severity": "error",
  "file": "routes/run-command.ts",
  "range": { "line": 14, "column": 8 },
  "message": "Request-controlled data reaches shell execution without validation.",
  "evidence": {
    "source": "request.query.command",
    "sink": "shell.exec",
    "required_barrier": "validateCommand",
    "precision": "heuristic"
  },
  "rerun": "polint check --rule local/no-request-data-to-shell"
}
```

It cannot use this with the same reliability:

```text
Maybe improve security here.
```

The first object gives the agent a rule, file, span, evidence, repair direction,
and focused rerun command. The second is another vibe.

The repair loop should stay small:

```text
run check
parse JSON diagnostics
choose one rule cluster
load the files on the evidence path
make the smallest policy-preserving edit
rerun the focused check
stop when clean, unknown, repeated, or over budget
```

The stop rule matters. Feedback loops help when the signal is deterministic and
scoped. They hurt when the model optimizes vague feedback. The oracle has to
live outside the model.

See [Static Diagnostics Are Agent
Interfaces](/brain/static-diagnostics-are-agent-interfaces) for the longer
agent-feedback argument.

# Why I built polint

Generic tools are good at generic rules. ESLint, Ruff, Biome, Semgrep, CodeQL,
typecheckers, and tests all have their place. If a rule belongs in one of them,
put it there.

I built `polint` for the rules that belong to one repository:

| Local policy                                          | Why generic tools do not know it                   |
| ----------------------------------------------------- | -------------------------------------------------- |
| Product UI uses this design-token system.             | The tool does not know the migration state.        |
| This layer cannot import that internal layer.         | The tool does not know the architecture boundary.  |
| This handler needs these evidence-shaped tests.       | The tool does not know the review standard.        |
| Public routes cannot reach this dangerous API family. | The tool does not know the entry points and sinks. |

These policies often live in PR comments, onboarding docs, prompts, and "please
remember" messages to agents. That is the wrong storage layer.

`polint` treats them as repo-local code. The framework owns file discovery,
parser adapters, typed fact views, diagnostics, caching, JSON/SARIF output, CI
integration, and an SDK. The repository owns the rules and fixtures.

The simple case should feel simple:

```rust
use polint::sdk::prelude::*;

#[polint::rule(
    id = "local/no-raw-ui-values",
    description = "Use design tokens instead of raw UI values.",
    severity = "error"
)]
fn no_raw_ui_values(ctx: &mut RuleCtx<'_>, literals: StringLiterals<'_>) -> RuleResult {
    for literal in literals.iter() {
        if literal.value.starts_with('#') {
            ctx.report(literal.diagnostic(
                ctx.rule_id(),
                "Use a design token instead of a raw color literal.",
            ));
        }
    }

    Ok(())
}
```

The function signature is the contract. This rule asks for string literals. A
deeper rule might ask for resolved imports, test facts, call reachability, CFG
ordering, or data-flow evidence. The engine computes only the capabilities the
rule pack asks for.

That is the boundary I care about: local rules ask for policy-level facts, not
raw engine internals. Most repository policies are questions, not graph
algorithms: can this route reach that API, does this guard dominate that
mutation, can this source flow to that sink? The public API should let rules ask
those questions while the engine owns the raw CFGs, call graphs, solvers,
budgets, and evidence.

`polint` is early. Some of its current design will turn out to be wrong, and I
will find out the usual way: by running it against real repositories and
watching a rule lie to me. For the design rationale so far, see [polint Is A
Repo-Local Policy Engine](/brain/polint-is-a-repo-local-policy-engine) and
[Policy APIs Should Hide Raw Graphs](/brain/policy-apis-should-hide-raw-graphs).

# Where this goes wrong

Static analysis fails in predictable ways.

| Failure                          | What happens                                                | Better behavior                                            |
| -------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Regex pretending to be semantics | The rule misses aliases, reexports, and generated paths.    | Use resolver and symbol facts.                             |
| Silent unsupported facts         | The report says clean because the engine skipped hard code. | Emit `unknown` or `unsupported`.                           |
| Unbounded graph traversal        | A local rule becomes a whole-program performance problem.   | Require budgets and query limits.                          |
| False-positive churn             | Developers and agents learn to ignore the tool.             | Attach precision, evidence, and suppressions with reasons. |
| Prompt-only policy               | The agent forgets the rule on the next task.                | Move checkable policy into repo-local rules.               |
| Tool monoculture                 | One analyzer is forced to solve every problem.              | Use different tools for different fact layers.             |

A repo-local policy engine should not become a religion. If a rule belongs
upstream in ESLint, put it there. If it is a Semgrep pattern, use Semgrep. If it
needs serious variant analysis, use CodeQL. If it is local architecture and
local convention, put it next to the code it governs.

# The rules

The rules of vibe coding are engineering rules:

1. Start with the shape you want to preserve.
2. Turn recurring local conventions into checks.
3. Choose the cheapest fact layer that can answer the policy.
4. Treat precision, unknowns, and budgets as part of the result.
5. Give humans and agents repair objects, not vague warnings.
6. Keep repo-local policy in the repo.

That is why static analysis is worth understanding even if you never work on
compilers. It is the bridge between "we prefer this shape" and "this pull
request violated the shape here, for this reason, with this evidence."

Vibe coding works best when the repo can talk back. Tests say whether behavior
still works. Types say whether the program still fits. Repo-local static rules
say whether the edit preserved the shape we care about. Releasing the vibes, in
practice, means exactly this: move fast, but make the repo explicit enough to
notice when its shape is being lost.

If you take one thing from this post, take the smallest version of it: pick one
convention you repeated in review this month and turn it into a check this week.
A grep-level rule in CI beats a perfect data-flow engine that does not exist
yet. I will keep writing as `polint` grows and as some of the opinions above
turn out to be wrong. That second part is a promise.

# References

- [About CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/)
- [CodeQL data flow analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [Semgrep taint analysis overview](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)
- [SootUp call graph construction](https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/)
- [Go callgraph/vta package](https://pkg.go.dev/golang.org/x/tools/go/callgraph/vta)
- [LLVM MemorySSA](https://llvm.org/docs/MemorySSA.html)
- [Kildall's lattice framework notes](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/DATAFLOW-AUX/lattice.html)
- [SARIF 2.1.0](https://www.oasis-open.org/standard/sarifv2-1-os/)
- [polint README](https://github.com/emilwareus/polint)
