---
type: insight
title: "Policy APIs Should Hide Raw Graphs"
slug: policy-apis-should-hide-raw-graphs
created: 2026-06-30
status: working
publish: true
tags:
  - static analysis
feeds_into:
  - "[[polint]]"
related:
  - "[[static-analysis-engines-are-fact-pipelines]]"
  - "[[taint-analysis-is-modeling-not-magic]]"
---

# Policy APIs Should Hide Raw Graphs

Most repository policies are not graph algorithms. They are questions: can a production
route reach a dangerous API, does a sensitive operation have a guard, can request data reach
a sink without a barrier? A static-analysis engine should let rule authors ask those
questions directly. Raw CFGs, call graphs, data-flow graphs, solver IDs, and provider rows
should stay private until there is a strong reason to make them public.

## The Problem With Raw Graph APIs

Raw graph APIs look powerful:

```rust
for node in cfg.nodes() {
    for edge in cfg.outgoing(node) {
        // rule code becomes graph-analysis code
    }
}
```

But they create four long-term problems:

| Problem | Why it hurts |
| --- | --- |
| Internal coupling | Every rule now depends on graph IDs, edge kinds, and storage choices. |
| Unbounded work | Rule authors can accidentally write whole-program traversals. |
| Weak evidence | Diagnostics may not explain which approximation was used. |
| API freeze | The engine cannot change solver internals without breaking rule packs. |

The public API should express policy concepts, not storage mechanics.

## A Better Shape: Query Objects

polint's preview policy-query docs use a constrained shape:

1. Request a typed view in the rule function signature.
2. Construct one query object with required inputs.
3. Set explicit option fields.
4. Call one method on the view.
5. Report `PolicyViolation` diagnostics.

```rust
use polint::sdk::prelude::*;

#[polint::rule(
    id = "local/no-request-to-shell",
    description = "Request data must not reach shell execution.",
    severity = "error"
)]
fn no_request_to_shell(ctx: &mut RuleCtx<'_>, flow: DataFlow<'_>) -> RuleResult {
    let mut query = FlowQuery::new(
        SourcePattern::http_request(),
        SinkPattern::call("exec"),
    );
    query.barriers = BarrierPattern::call_any(["validate_command"]);
    query.max_depth = 24;
    query.max_paths = 128;

    for violation in flow.forbidden(query) {
        ctx.report(violation.diagnostic(
            ctx.rule_id(),
            "request data reaches shell execution without validation",
        ));
    }
    Ok(())
}
```

The rule is readable because it says what the team cares about. The engine owns the hard
parts: graph construction, call resolution, path search, budget handling, and evidence.

## Mature Tools Use The Same Pattern At Larger Scale

CodeQL path queries are also policy-shaped. A query defines a source, a sink, and flow
conditions; `flowPath` produces path results. The query author uses a data-flow library, but
the result is still an answer to a source-to-sink question, not an invitation to manually
walk the entire internal database.

Semgrep taint mode has an even more compact rule API: YAML sections for
`pattern-sources`, `pattern-propagators`, `pattern-sanitizers`, and `pattern-sinks`. Semgrep
documents exactness and interprocedural/interfile limitations because those policy-level
concepts control what the user should believe.

The shared lesson: good rule APIs expose the language of the policy domain.

## Precision And Status Must Be Part Of The Result

Policy-level APIs should not hide uncertainty. They should hide internals while exposing
precision.

| Result field | Meaning |
| --- | --- |
| `policy_status` | `exact`, `heuristic`, `unknown`, `unsupported`, or `budget_exceeded` |
| `policy_precision` | `exact`, `setup_aware`, `syntax`, `conservative`, `heuristic`, `unknown` |
| `query_digest` | Stable identity for the policy query that produced the result |
| `path` | Bounded explanation, not a dump of all paths |
| `budget_reason` | Why the engine did not prove a complete answer |

This matters for agents. An agent can safely repair an exact missing import. It should treat
a heuristic data-flow finding differently, especially when a sanitizer model is incomplete.

## Unknowns Are Better Than Silent Passes

An engine should not treat missing facts as "no violation." If a rule asks for data-flow and
the engine cannot resolve the relevant calls, the result should be visible:

```text
rule_id: polint/capability
status: unsupported
capability: dataflow
reason: missing language provider for requested source pattern
```

This avoids the worst static-analysis failure mode: a green report that means "we did not
look."

## Minimal Pseudocode

```text
run_policy_query(rule, query):
  required = derive_capabilities(rule.signature, query)
  support = check_support(required)

  if support.has_blocking_gap:
    return capability_diagnostic(support)

  budget = query.budget()
  graph = private_provider(required, budget)
  result = evaluate(query, graph, budget)

  if result.truncated:
    return policy_violation(status="budget_exceeded", evidence=result.evidence)

  if result.unknown:
    return policy_violation(status="unknown", evidence=result.evidence)

  return result.violations_with_precision()
```

The API stays small, but the engine remains honest about support and precision.

## Implication For polint

The most interesting polint design choice is not "rules are Rust." It is that local rules
request typed facts, and the deeper graph surfaces are being promoted as policy queries
rather than raw graph APIs. That keeps rule authoring practical while leaving room for the
engine to improve private call, CFG, data-flow, and summary machinery.

For the article, this is the architectural argument: polint is a linter with no bundled
rules because the tool's product is a policy execution substrate. The policies belong to the
repository; the graph machinery belongs to the engine.

## Sources

- [polint policy query preview](https://github.com/emilwareus/polint/blob/main/docs/facts/policy-queries.md)
- [polint calls facts](https://github.com/emilwareus/polint/blob/main/docs/facts/calls.md)
- [polint control-flow facts](https://github.com/emilwareus/polint/blob/main/docs/facts/control-flow.md)
- [polint data-flow facts](https://github.com/emilwareus/polint/blob/main/docs/facts/data-flow.md)
- [Creating path queries in CodeQL](https://codeql.github.com/docs/writing-codeql-queries/creating-path-queries/)
- [Semgrep taint analysis overview](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)

