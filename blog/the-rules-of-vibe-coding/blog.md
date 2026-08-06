I have been building a static-analysis engine on the side, which is a strange
hobby to pick in 2026 when the rest of the industry is busy asking agents to
"please follow our conventions" in ever-growing markdown files. This post is my
attempt to explain why I think the hobby is the saner response.

The way I work now is fast: sketch, ask for a refactor, try a design, let the
model take a swing, keep moving. I want to keep it that way. But I do not
want the codebase to slowly forget its boundaries while I do. More prompt
ceremony will not prevent that. Turning the rules that define the shape of
the repo into executable checks will.

Who is this for? You ship code with agents most days, your `AGENTS.md` keeps
growing, and you have typed "remember: UI code does not import the database"
more than once. The second half of the post gets properly nerdy about
static-analysis internals: call graphs, control-flow graphs, fixed points. That
is on purpose. Knowing what these engines can and cannot know is what separates
a check you can trust from a check that lies to you.

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

Useful repo-local rules sound like this:

- Product UI uses design tokens, not raw colors.
- E2E tests select on stable test IDs instead of whatever copy happens to be on
  the button this week.
- Client feature code reaches the backend through the API layer; components do
  not roll their own fetch calls.
- Layers import inward or through contracts, never sideways into another
  layer's internals.
- Persistence adapters do not read request state or transport concepts.
- Mutating routes check protection before the side effect.
- Personal data and secrets stay out of logs and public responses unless
  explicitly allowed.
- Tests prove the important branches. "The function was called once" does not
  count.

These are local shape rules. Generic linters cannot know them in advance because
the rules are about your boundaries, migrations, test standards, threat model,
and architecture.

Once you list the rules, resist jumping to "which linter should we use?" Ask
this first:

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
values may hide the behavior. Cheap rules are still worth having. You just have
to know their contract.

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

These rules keep the shape of the codebase visible. And when the resolver fails
on an import, the honest answer for that edge is unknown or unsupported, never
a silent clean.

# Tests can be checked for evidence

Some of the most useful rules have nothing to do with security. I think of them
as proof-shape rules.

For example:

```text
Every route handler has a component test.
Access-sensitive handlers show allowed and denied cases.
Persistence adapters show success, error, and isolation evidence.
Tests use named subtests that describe the branch being proved.
```

This is static analysis over the test suite. It does not run the tests. It
parses them and asks whether the codebase contains evidence in the right place.

The rule asks for something much more modest than "prove the program correct":

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

Not every rule can end in a verdict. Some of the questions worth asking are not
statically decidable at all.

"Are the indexes right for these queries?" is one of them. Answering it takes
the query shapes, the table sizes, the access patterns, and a judgment about
what will hurt at scale. A static engine will not settle that. An LLM reviewer
is genuinely good at it: hand it the diff and the schema and it will reason
about predicates, ordering, and cardinality perfectly well. The failure mode is
not capability. It is that nobody asked. The guideline lives in a document the
model never read, and the model reviews the diff it was handed.

So invert the rule. The engine does not answer the question. It decides when the
question is owed and hands the reviewer the right one:

```text
An ORM model or query shape changed
  -> require an index and access-pattern review.
Lifecycle-sensitive code changed
  -> require retention and deletion evidence.
A generated API boundary changed
  -> require public contract tests.
```

The trigger is the statically checkable half: changed files, path ownership,
touched symbols, and enough syntax to recognize the kind of change. The judgment
stays with the reviewer, human or agent.

That trigger should be semantic, not only path-based. "Something under
`adapters/` changed" is a crude proxy. "A query gained a filter column" or "an
ORM model changed shape" is the condition the guideline actually cares about.

The output is then not a violation. It is review context, injected only when it
applies:

```json
{
  "rule_id": "local/query-change-needs-index-review",
  "trigger": "query predicate changed in a persistence adapter",
  "file": "adapters/profile_queries.ts",
  "review_context": "Query predicate changed. Check that an index covers the new filter and sort columns, in that order. Flag scans on tables that grow with users.",
  "precision": "changed-symbol"
}
```

This is why review guidance cannot be one long document. A checklist that covers
the whole application is either too long to read or too diluted to matter, and
the three items that apply to today's diff are buried under the forty that do
not. What a human does with a forty-item checklist, an agent does with a
two-thousand-line `AGENTS.md`: skim it, then review the code in front of it.

Selecting by semantic change fixes that ratio. `polint review` matches the
change, injects the guidelines it triggered, and leaves the rest out of the
context window.

Architecture is not only "this import is forbidden." It is also where the team
slows down and looks. Agents edit many files quickly and notice invisible review
rituals poorly, which makes them exactly the reviewers that need the ritual
triggered rather than remembered.

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

Four strategies are worth knowing, and the interesting part is what each one
costs.

**Direct calls** add an edge only when the target is written in the code:
`updateProfile()` calls `writeRecord()`. Cheap and obvious, and it misses every
call that goes through an interface, a callback, or an injected dependency.

**Class hierarchy analysis (CHA)** asks the type system instead. If the code
calls `save()` on a `Repository`, CHA adds an edge to every class that
implements `Repository`. One lookup per call, fast, works on any codebase. It is
also the noisiest option: forty implementations means forty edges, whether or
not any of them can run there.

**Rapid type analysis (RTA)** (Bacon and Sweeney, 1996) trims that list with one
observation: a class nobody ever constructs cannot be the one you called. So it
collects every type the program actually constructs and drops the candidates
that never show up, repeating until nothing new appears. The cost grows with
call sites times types, which sounds worse than it usually is.

The catch is not the speed. RTA has to see the whole program to know what gets
constructed, including your frameworks, libraries, and generated code, and it
has to redo that work whenever any of it changes. That is a poor fit for a check
running on a pull request. The trick also stops working when a DI container constructs every
implementation at startup: if everything is constructed, nothing gets filtered.

**Variable type analysis (VTA)** (Sundaresan et al., 2000) narrows it again by
asking what can reach one variable rather than what exists in the program. It
follows assignments backwards: this value came from there, which came from that
constructor. A call then resolves against the few types that can actually arrive
at that variable.
More work than RTA, and worth it when the answer matters.

Beyond that are analyses that track every value through the whole program. They
are more precise and they get expensive fast: the useful ones cost more than
linearly as the codebase grows, and the very precise ones grow exponentially.
Precision rises, applicability falls, and somewhere on that curve sits the
biggest repository you can actually analyze in CI.

These names come from Java and C++ tooling, but the problem is not an
object-oriented one. In any language it is the same question: which
implementation, which callback, which handler registered at startup? When the
wiring is dynamic, none of these algorithms answer it without a hand-written
model of the framework, and every real analyzer quietly gives up on a few.

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

I do not think a good call-graph algorithm exists. Every one I have used trades
precision for recall or recall for precision, and the ones precise enough to
trust do not survive contact with a large codebase or with the indirection real
applications are actually built from. CHA over-reports until nobody reads the
output. A direct-call graph under-reports and hands you a clean result that
means nothing. You are picking which way to be wrong.

Run them anyway. A call graph is a good coverage instrument: it narrows a whole
program down to the few paths worth reading, and it will surface a
route-to-dangerous-API chain you would never have thought to grep for. It is not
an oracle. Almost all the false confidence in this field comes from treating it
as one.

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

Data flow is the layer I trust least. It is hard to grasp, hard to model, and
hard to keep correct. Writing analysis general enough to answer real questions
about your code also quietly constrains how you are allowed to write that code.
It is possible. It is not free.

The security tools are strongest at exactly the part I need least. They
have spent years modeling propagation, how a value moves through assignments,
calls, fields, and containers, and they are genuinely good at it. What ships
generic is everything around it: the sources, the sinks, and the barriers. A
list of ORMs. A list of API frameworks. A list of functions that count as
sanitizers.

Those are the parts that belong to your repository. Your user-controlled data
arrives through your handlers, and your dangerous sink is your internal client
or your billing call. Your barrier is a function you wrote, and whether it
really sanitizes is a judgment about your threat model, not a lookup in a vendor
list. Most tools do let you define your own; few teams do, because it means
learning a query language to describe facts the codebase already knows.

So the capability I want is not a bigger rule catalogue. It is access to the
engine itself. If you can hand it facts (this is a source, this is a sink, this
function is a barrier for this kind of value), the analysis knows your
application instead of applications in general. Pair that with a model making
the judgment calls that were never going to be mechanical, like whether that
barrier actually validates, and the two halves together get much closer to
accurate than either does alone.

For more detail, see [Data-Flow Engines Are Fixed-Point
Machines](/brain/data-flow-engines-are-fixed-point-machines) and [Taint Analysis
Is Modeling, Not Magic](/brain/taint-analysis-is-modeling-not-magic).

# The rules of vibe coding

In the agentic era we write prompts, not code. So we need a way to inject our
taste, our knowledge, and our architecture into the validation loop the agent
runs against itself.

I have not managed to do that through context alone. I have tried to steer
agents deeply enough that they hold the architecture, respect the security
rules, and write code at the standard I want, and it does not hold. Maybe that
stops being true as the models get better. Today it is true.

An agent already has three ways to check its own work: the typechecker, the
classical linters, and the tests. Give it a fourth that enforces the shape of
the code, and what comes back is higher quality and more readable to me. That
last part is the one I care about most. I review thousands of lines a day to
keep up with product demand, and readable code is the difference between
reviewing them and skimming them.

Adding that step to my agentic loop has increased velocity a lot, for me and for
my teams. I trust the agents more, because the shape of the code is no longer
something I have to check by hand. That frees the review for the questions worth
my time:

- Does this solve the problem the user actually has?
- Is this worth merging, because it is valuable to our users?
- Which problem should we spend more time on to compete in the long run?

I also think these tools should be open source. You need to edit and configure
them deeply enough to fit your codebase, and that is hard to do with something
you cannot open.

We already expect software to be personal. My grandmother and I can open the
same URL and see different pages, and nobody finds that strange any more. Our
tools should adapt to our codebases the same way.

That does not mean building a DSL. It means hooking into the language you
already use and being able to change how the analysis underneath behaves. The
old assumption was that nobody has time for that, so the tool ships a simplified
configuration surface, usually a YAML file, to make it feasible at all. I do not
think that assumption survives agents, so `polint` goes the other way: Rust is
the configuration.

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

`polint` has been a fun experiment: take what I learned at Debricked and encode
it into what I think a modern static-analysis engine should look like. Pointing
it at the codebases behind my own products, and watching my teams and my agents
deliver value to users faster because of it, has been tremendously fun.

It is early, and it is still a side project I do for fun, so we will see whether
I keep maintaining it. Use it if you want to. Do not put it in front of anything
critical. Ping me if you have thoughts or questions.

For the design rationale so far, see [polint Is A Repo-Local Policy
Engine](/brain/polint-is-a-repo-local-policy-engine) and [Policy APIs Should
Hide Raw Graphs](/brain/policy-apis-should-hide-raw-graphs).

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
- [Bacon and Sweeney, Fast Static Analysis of C++ Virtual Function Calls
  (RTA)](https://dl.acm.org/doi/10.1145/236337.236371)
- [Sundaresan et al., Practical Virtual Method Call Resolution for Java
  (VTA)](https://dl.acm.org/doi/10.1145/353171.353189)
- [Van Horn and Mairson, Deciding kCFA Is Complete for
  EXPTIME](https://dl.acm.org/doi/10.1145/1411204.1411243)
- [In Defense of Soundiness: A Manifesto](http://soundiness.org/)
- [LLVM MemorySSA](https://llvm.org/docs/MemorySSA.html)
- [Kildall's lattice framework notes](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/DATAFLOW-AUX/lattice.html)
- [SARIF 2.1.0](https://www.oasis-open.org/standard/sarifv2-1-os/)
- [polint README](https://github.com/emilwareus/polint)
