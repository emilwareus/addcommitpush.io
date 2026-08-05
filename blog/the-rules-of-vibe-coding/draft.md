# The Rules of Vibe Coding

Vibe coding is not bad because it is fast. It is bad when the vibe never becomes a check. A senior engineer can hold a lot of local context in their head: which API is deprecated, which package owns persistence, which fields are dangerous to log, which migration is half-finished. An AI coding agent cannot reliably hold that context across tasks, and a new human maintainer should not have to learn it from a Slack thread. Static analysis is how we turn some of that local context into code: parse the repository, extract facts, run rules, and return diagnostics that can be repaired.

## Key takeaways

- Static analysis means analyzing code without running the program. The useful output is not "a lint warning"; it is a structured fact with a rule ID, span, evidence, and precision.
- Most repository rules do not need full program analysis. Some need syntax. Some need imports. Some need symbols, calls, control flow, or data flow.
- The hard part is deciding which facts a policy needs and how much approximation is acceptable.
- AI agents make deterministic checks more important because prompts are weak memory and tests do not cover architectural intent.
- I built `polint` because local policy should live with the repo, be reviewed like code, and produce machine-readable diagnostics for humans, CI, and agents.

## Rule 1: the vibe must become a check

"Use the generated billing client" is a vibe until something enforces it.

"UI packages must not import database adapters" is a vibe until something can inspect imports.

"Request data must not reach shell execution" is a vibe until something models sources, sinks, and barriers.

These rules are not stupid. They are often the real architecture. The problem is that we store too many of them as prose. Prose is good for intent, trade-offs, and teaching. Prose is bad at saying "this exact call path violates the policy" every time a pull request changes.

Static analysis gives the rule a runtime.

```text
repo policy:
  UI code must not import persistence modules.

static check:
  find files under packages/ui
  resolve imports
  report any import whose target is packages/db or packages/persistence
```

That rule does not need an LLM. It does not need a test database. It needs file discovery, import parsing, module resolution, and a diagnostic.

The point is not to replace judgment. The point is to stop spending judgment on the same mechanical review comment.

## Rule 2: checks need facts, not opinions

A static analysis engine is a fact pipeline.

```text
files
  -> parse
  -> raw facts
  -> derived facts
  -> policy queries
  -> diagnostics
  -> JSON, SARIF, CI, agent feedback
```

The pipeline matters because rule authors should not reimplement analysis inside every rule. A rule that reads files with regex, resolves imports manually, walks a parser tree, guesses call targets, and formats its own output is not a rule. It is an unreviewed analyzer.

Better systems separate responsibility:

| Layer            | Owns                       | Example fact                                        |
| ---------------- | -------------------------- | --------------------------------------------------- |
| File discovery   | which files count          | `src/routes/run.ts` is source, `dist/` is generated |
| Parser adapter   | syntax and spans           | string literal at line 14                           |
| Resolver         | module edges               | `@/db` resolves to `packages/db/index.ts`           |
| Symbol provider  | definitions and references | `oldClient.refund` is still referenced              |
| Call provider    | caller to callee edges     | `POST /refund -> refund -> dangerousAdmin`          |
| Flow provider    | value movement             | `req.query.cmd` reaches `exec`                      |
| Diagnostic layer | repair object              | rule ID, range, evidence, fingerprint               |

Once facts are stable, rules become small. A syntax rule can ask for string literals. A module rule can ask for resolved imports. A migration rule can ask for references. A security rule can ask for data flow.

## The static analysis ladder

"Static analysis" is too broad as a single label. ESLint, Semgrep, CodeQL, Joern, SootUp, LLVM analyses, and repo-local policy checks all live under the same umbrella, but they operate at different layers.

| Layer          | What the engine knows                           | Example policy                                         |
| -------------- | ----------------------------------------------- | ------------------------------------------------------ |
| Text and paths | filenames, globs, generated/vendor status       | Do not edit generated code.                            |
| Syntax         | imports, literals, JSX attributes, declarations | Do not use raw color literals.                         |
| Metrics        | function size, complexity, branch counts        | Flag a function that grew past review budget.          |
| Module graph   | resolved import relationships                   | UI must not import persistence.                        |
| Symbols        | definitions, references, exports                | Migration is complete only when old API refs are gone. |
| Types          | public API shapes, checker facts                | Use generated SDK types, not ad hoc JSON.              |
| Calls          | caller to callee edges                          | Production routes must not reach raw admin APIs.       |
| Control flow   | branches, guards, cleanup order                 | Validate before side effect.                           |
| Data flow      | source to sink paths, barriers                  | Request data must not reach shell execution.           |

The engineering question is not "do we have static analysis?" The question is:

```text
Which fact layer does this policy require?
What precision is acceptable?
What should happen when the engine cannot know?
```

If the policy only needs syntax, do not build a whole-program solver. If it needs data flow, do not pretend a grep is enough.

## A syntax rule is cheap and useful

Start with something boring: design tokens.

```tsx
<div className="bg-[#1f2937] text-white" />
```

A local design-system rule might say raw colors are not allowed in product UI. The engine does not need types, calls, or data flow. It needs string literals and spans.

```text
rule local/no-raw-colors:
  for each string literal:
    if it contains a hex color:
      report diagnostic at that span
```

The diagnostic should be boring too:

```json
{
  "rule_id": "local/no-raw-colors",
  "file": "components/button.tsx",
  "range": "12:18-12:27",
  "message": "Use a design token instead of a raw color literal.",
  "precision": "syntax"
}
```

That is enough for a human reviewer and enough for an agent. The agent does not have to infer the design-system rule from a prompt. It gets a specific violation.

## A module rule needs resolution

Now take an architecture rule:

```text
app/ui must not import app/db.
```

This looks like a syntax rule until aliases enter the codebase.

```ts
import { userRepository } from '@/db/user-repository';
```

A grep for `../db` will miss this. The engine needs a resolver that understands TypeScript config, package boundaries, workspace roots, generated folders, and whatever the repository uses for aliases.

The fact should not be "this file contains a string." It should be:

```text
import.edge:
  from: app/ui/profile.tsx
  specifier: "@/db/user-repository"
  resolved_to: app/db/user-repository.ts
  precision: setup_aware
```

Now the policy is simple again:

```text
for each resolved import:
  if source is in app/ui and target is in app/db:
    report boundary violation
```

This is the pattern that keeps coming back. The rule stays small when the fact provider does the real semantic work.

## A call rule needs a precision budget

Some policies are about reachability:

```text
Production HTTP handlers must not reach raw admin APIs.
```

That requires a call graph. A call graph is a directed graph from caller to callee:

```text
POST /billing/refund
  -> refundHandler
  -> refundPayment
  -> dangerousAdminRefund
```

Direct calls are easy. Dynamic dispatch, interfaces, dependency injection, callbacks, reflection, route tables, and function values are not.

Static analysis uses approximations. Class hierarchy analysis includes every subtype that could respond. Rapid type analysis filters to instantiated types. Variable type analysis adds flow facts about what values can reach a receiver. Go's VTA package documents the same kind of trade-off and explicitly caveats reflection and unsafe.

That means a call-graph diagnostic must carry precision:

```json
{
  "rule_id": "local/no-admin-reachable-from-prod",
  "file": "internal/http/routes.go",
  "message": "production route reaches raw admin API",
  "evidence": {
    "path": ["refundHandler", "refundPayment", "dangerousAdminRefund"],
    "call_graph": "vta",
    "precision": "conservative",
    "max_depth": 8
  }
}
```

A conservative path can still be useful. It should not pretend to be proof of concrete execution.

## A data-flow rule is a fixed-point problem

Data flow asks which facts become true at program points. Which definitions reach this use? Which values are live? Which values are tainted? Which resources are open?

The classic engine is a worklist over a graph:

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

That loop stops when facts stop changing. The real choices are the graph, the fact domain, the join operation, the transfer functions, and the approximation limits.

For taint analysis, the policy shape is:

```text
source: req.query.cmd
sink: exec
barrier: validateCommand
```

The engine seeds taint at sources, propagates it through assignments and calls, removes or blocks it at sanitizers/barriers, and reports when tainted data reaches a sink.

```text
req.query.cmd
  -> command
  -> buildShellCommand(command)
  -> exec(...)
```

This is not magic. It is modeling. Sources, sinks, sanitizers, propagators, fields, containers, aliases, callbacks, and summaries decide whether the result is useful. A sanitizer for HTML is not a sanitizer for SQL. A string conversion is not validation. A container write like `list.add(secret)` matters only if the engine models side effects.

The most important result is often not `violation`. It is `unknown`.

```text
unknown:
  unresolved dynamic call at runPlugin(command)
  analysis budget reached at depth 24
  no framework summary for router middleware
```

Unknown is an honest result. Silent clean is a bug.

## Rule 3: every green check has a contract

A static analysis result is only meaningful inside its analysis contract.

```text
clean under:
  language: TypeScript
  resolver: tsconfig paths loaded
  call graph: direct calls only
  data flow: intraprocedural
  max path depth: 24
```

That may be enough for many repo policies. It is not enough for all security claims.

This is where static analysis gets a bad reputation. A tool reports too many false positives, so developers ignore it. Or it reports clean while silently skipping hard code, so developers trust it too much.

The fix is not confidence theater. The fix is explicit result status:

| Status            | Meaning                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `violation`       | The engine found a policy-breaking fact or path under the requested analysis contract. |
| `clean`           | The engine searched the requested capability space and found no violation.             |
| `unknown`         | The engine hit a semantic gap, unresolved edge, or missing model.                      |
| `unsupported`     | The provider cannot compute the requested fact family.                                 |
| `budget_exceeded` | The query stopped before completing.                                                   |

Agents need this even more than humans do. If a finding is exact and local, the agent can repair it. If a finding is heuristic, the agent should be cautious. If the result is unknown, the agent should not invent a fix just to make the report look green.

## Rule 4: agents need repair objects

An AI coding agent can work with this:

```json
{
  "rule_id": "local/no-request-to-shell",
  "severity": "error",
  "file": "src/routes/run.ts",
  "range": { "line": 14, "column": 8 },
  "message": "request data reaches shell execution without validation",
  "evidence": {
    "source": "req.query.cmd",
    "sink": "exec",
    "required_barrier": "validateCommand",
    "precision": "heuristic"
  },
  "rerun": "polint check --rule local/no-request-to-shell"
}
```

It cannot work as reliably with this:

```text
Maybe improve security here.
```

The first object gives the agent a rule, a location, a path, a repair direction, and a focused rerun command. The second is another prompt.

This matters because feedback loops can help or harm agents. Tool feedback can reduce issues when the signal is deterministic and scoped. But iterative AI-only critique can make code worse, especially for security. The loop needs an oracle outside the model.

A good repair loop is boring:

```text
run check
parse JSON diagnostics
select one rule cluster
load only relevant files and evidence
make the smallest policy-preserving edit
rerun the focused check
stop when clean, unknown, repeated, or over budget
```

That loop is not glamorous. It is the shape you want in production.

## Why I built polint

Generic tools are good at generic rules.

ESLint is good for JavaScript and TypeScript syntax rules. Ruff is good for Python. Biome is good for formatting and common JS/TS checks. Semgrep is good when pattern rules or taint-style source/sink models fit. CodeQL is good when you want a database-backed query system and deeper security analysis.

I did not build `polint` to replace those tools.

I built it for the rules that belong to one repository:

| Local policy                                      | Why generic tools do not know it                            |
| ------------------------------------------------- | ----------------------------------------------------------- |
| Use the generated billing SDK, not raw HTTP.      | The tool does not know your billing boundary.               |
| GORM model changes require index review.          | The tool does not know your review process.                 |
| New React components must use design tokens.      | The tool does not know your migration state.                |
| Test tables require `t.Run` and assertions.       | The tool does not know your test conventions.               |
| Production routes must not reach admin-only APIs. | The tool does not know your entrypoints and dangerous APIs. |

These policies are usually repeated in PR comments, onboarding docs, prompts, and "please remember" messages to agents. That is the wrong storage layer.

`polint` treats these policies as repo-local code. The framework owns the substrate: file discovery, parsers, fact views, diagnostics, caching, JSON/SARIF output, CI integration, and an SDK. The repository owns the rules and fixtures.

The intended shape is:

```rust
#[polint::rule(
    id = "local/no-raw-colors",
    description = "Use design tokens instead of raw color literals.",
    severity = "error"
)]
fn no_raw_colors(ctx: &mut RuleCtx<'_>, literals: StringLiterals<'_>) -> RuleResult {
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

The function signature is the contract. This rule asks for string literals. A deeper rule might ask for resolved imports, references, calls, or data flow. The engine can plan only the capabilities needed by the rule pack.

That is the important design choice: rules should ask for policy-level facts, not raw engine internals.

## Rule 5: hide raw graphs until users need them

Raw graphs are tempting. Give rule authors the CFG, call graph, and data-flow graph, and they can do anything.

They can also accidentally write a slow, unsound analyzer inside a rule.

Most repository policies are not graph algorithms. They are questions:

- Can a production route reach a dangerous API?
- Does request data reach a shell sink without validation?
- Does this package import across the boundary?
- Is the deprecated symbol still referenced?

The public API should let rule authors ask those questions directly.

```rust
let mut query = FlowQuery::new(
    SourcePattern::http_request(),
    SinkPattern::call("exec"),
);
query.barriers = BarrierPattern::call_any(["validateCommand"]);
query.max_depth = 24;

for violation in flow.forbidden(query) {
    ctx.report(violation.diagnostic(
        ctx.rule_id(),
        "request data reaches shell execution without validation",
    ));
}
```

The engine can compile that query into private machinery: parser facts, local CFGs, value-flow edges, call summaries, alias facts, path search, budgets, and evidence. The rule author owns the policy model. The engine owns the solver.

That separation keeps the SDK stable and keeps the rule readable.

## Pitfalls

Static analysis fails in predictable ways.

| Pitfall                          | What happens                                                | Better behavior                                                            |
| -------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Regex pretending to be semantics | The rule misses aliases, reexports, and generated paths.    | Use resolver and symbol facts.                                             |
| Silent unsupported facts         | The report says clean because the engine skipped hard code. | Emit `unknown` or `unsupported`.                                           |
| Unbounded graph traversal        | A local rule becomes a whole-program performance problem.   | Require budgets and query limits.                                          |
| False-positive churn             | Developers and agents learn to ignore the tool.             | Attach precision, evidence, and suppressions with reasons.                 |
| Prompt-only policy               | The agent forgets the rule on the next task.                | Move checkable policy into repo-local rules.                               |
| Tool monoculture                 | One analyzer is forced to solve every problem.              | Use ESLint, Ruff, Semgrep, CodeQL, tests, and `polint` for different jobs. |

The last point matters. A repo-local policy engine should not become a theology. If a rule belongs upstream in ESLint, put it there. If a rule is a Semgrep pattern, use Semgrep. If a rule needs serious variant analysis, use CodeQL. If a rule is local architecture and local convention, put it next to the code it governs.

## The article I wish I had before building it

The rules of vibe coding are not prompt tricks.

They are engineering rules:

1. If a convention matters repeatedly, turn it into a check.
2. Choose the cheapest fact layer that can answer the policy.
3. Treat precision, unknowns, and budgets as part of the result.
4. Give humans and agents repair objects, not vague warnings.
5. Keep repo-local policy in the repo.

That is why static analysis is worth understanding even if you never work on compilers. It is the bridge between "we prefer this shape" and "this pull request violated the shape here, for this reason, with this evidence."

`polint` is my attempt to build that bridge for the rules generic tools cannot know.

## References

- [About CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/)
- [CodeQL data flow analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [Creating path queries in CodeQL](https://codeql.github.com/docs/writing-codeql-queries/creating-path-queries/)
- [Semgrep taint analysis overview](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)
- [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules)
- [SootUp call graph construction](https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/)
- [Go callgraph/vta package](https://pkg.go.dev/golang.org/x/tools/go/callgraph/vta)
- [LLVM MemorySSA](https://llvm.org/docs/MemorySSA.html)
- [Kildall's lattice framework notes](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/DATAFLOW-AUX/lattice.html)
- [Precise Interprocedural Dataflow Analysis via Graph Reachability](https://pages.cs.wisc.edu/~fischer/cs701.f14/popl95.pdf)
- [SARIF 2.1.0](https://www.oasis-open.org/standard/sarifv2-1-os/)
- [polint README](https://github.com/emilwareus/polint)
- [polint agent playbook](https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md)
- [polint analysis roadmap](https://github.com/emilwareus/polint/blob/main/docs/ANALYSIS-ROADMAP.md)
