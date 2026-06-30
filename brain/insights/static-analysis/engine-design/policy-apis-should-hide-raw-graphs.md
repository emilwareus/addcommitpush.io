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

## The Raw Graph Problem In Practice

Suppose a rule author wants "request data must not reach shell execution." A raw graph API
forces them to solve several unrelated problems:

```text
rule_author_work_if_raw_graph:
  find request sources
  find shell sinks
  decide which graph edges count as data flow
  handle assignments, calls, returns, fields, containers
  handle sanitizers
  choose a traversal algorithm
  cap traversal depth
  reconstruct a useful path
  decide what to do when calls are unresolved
  format a diagnostic
```

That is not a custom lint rule. That is a custom static analyzer embedded inside a rule. A
policy API should collapse this to the part the repository owns: source model, sink model,
barrier model, and acceptable precision.

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

## Query Compilation

A policy query should compile into a private execution plan. The plan selects providers,
chooses graph representations, and prepares matchers.

```text
compile_flow_query(query, capability_plan):
  source_matcher = compile_source_pattern(query.source)
  sink_matcher = compile_sink_pattern(query.sink)
  barrier_matcher = compile_barrier_pattern(query.barriers)

  required = {
    "parse_facts",
    "local_cfg",
    "value_flow",
    "call_summaries if query.interprocedural",
    "alias_facts if query.needs_memory_flow"
  }

  support = capability_plan.check(required)
  if support.has_gap:
    return UnsupportedPlan(support)

  return FlowExecutionPlan(
    sources=source_matcher,
    sinks=sink_matcher,
    barriers=barrier_matcher,
    graph_provider=select_graph_provider(query.minimum_precision),
    max_depth=query.max_depth,
    max_paths=query.max_paths,
    minimum_precision=query.minimum_precision
  )
```

The public `FlowQuery` can stay stable while the private plan evolves from AST-adjacent
local flow to SSA, MemorySSA, IFDS, Datalog, or sparse value-flow providers.

## Private Evaluation

Once compiled, a query is evaluated against private facts. The evaluator should treat
violations, unknowns, and budget exhaustion as distinct outcomes.

```text
evaluate_flow_plan(plan, fact_store):
  if plan is UnsupportedPlan:
    return [policy_result(
      status="unsupported",
      precision="unknown",
      evidence=plan.support.evidence
    )]

  graph = plan.graph_provider.load(fact_store)
  sources = graph.find_nodes(plan.sources)
  results = []

  for source in sources:
    frontier = priority_queue([(source, empty_path(), initial_labels(source))])
    visited = bounded_seen_set()

    while frontier not empty:
      node, path, labels = frontier.pop_shortest()

      if path.length > plan.max_depth:
        results.push(policy_result(
          status="budget_exceeded",
          evidence=budget_evidence(source, node, path)
        ))
        continue

      if graph.matches(node, plan.sinks) and labels not empty:
        results.push(policy_result(
          status="exact_or_heuristic",
          precision=path_precision(path),
          evidence=path_evidence(source, node, path)
        ))
        if count(results) >= plan.max_paths:
          results.push(policy_result(status="budget_exceeded"))
          break

      for edge in graph.outgoing(node):
        next_labels = transfer_labels(labels, edge, plan.barriers)
        if next_labels is empty:
          continue

        if edge.status == "unknown":
          results.push(policy_result(
            status="unknown",
            precision=edge.precision,
            evidence=edge.evidence
          ))
          continue

        state = (edge.to, next_labels, path_abstraction(path))
        if visited.add(state):
          frontier.push((edge.to, path + [edge], next_labels))

  return normalize_policy_results(results)
```

This is still graph traversal internally. The design point is that traversal is owned once,
tested once, budgeted once, and can be improved without asking every policy author to update
their own solver.

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

## Result Semantics

The API should specify status semantics as part of the contract.

| Status | Meaning | User action |
| --- | --- | --- |
| `violation` | engine found a policy-breaking path/fact under the requested precision tier | repair or suppress with evidence |
| `clean` | engine searched the requested capability space and found no violation | trust only within stated capability/precision |
| `unknown` | engine reached a semantic gap such as unresolved dynamic call or missing model | add model, raise budget, or review manually |
| `unsupported` | provider cannot compute the required fact family for this language/setup | fix setup or do not run the rule |
| `budget_exceeded` | engine stopped before completing the requested query | increase budget or narrow query |

The most important distinction is `clean` versus `unknown`. A green report should mean "no
violation under the declared analysis contract," not "the analyzer gave up quietly."

## Evidence As A Bounded Proof Object

For exact local policies, evidence can be a span and matched fact. For reachability and
source-sink policies, evidence should behave like a bounded proof object: enough to audit
the result, not a dump of the private graph.

```text
FlowEvidence:
  query_digest
  source:
    file
    range
    pattern
    precision
  sink:
    file
    range
    pattern
    precision
  path:
    status: complete | summary_only | truncated | unknown
    edges:
      - kind: local_assignment | call | return | summary | field | unknown
        from
        to
        provenance
        precision
  barriers_checked:
    - pattern
    - result: absent | present | unknown
  budgets:
    max_depth
    max_paths
    truncated
```

This makes the hidden graph auditable. A reviewer can disagree with a source model, a
summary edge, or a barrier model without needing internal node IDs.

## Evidence Schema

Policy APIs should return compact evidence, not internal graph dumps.

```text
PolicyViolation:
  rule_id
  policy_status
  policy_precision
  file
  range
  message
  query_digest
  evidence:
    source
    sink
    path_status
    path_edges[0..max_paths]
    barrier_status
    unresolved_edges
    budget:
      max_depth
      max_paths
      truncated
```

The `query_digest` matters because local policies change. If a team adds `mask_secret` as a
barrier, the same code path has a different policy meaning. Baselines, suppressions, and
agent memories should be tied to the query semantics, not only the diagnostic message.

## Partial Flow Debugging

Policy authors need a way to debug missing findings without receiving the raw graph. CodeQL
has partial-flow exploration for this reason: it can show where flow stops when a source
does not reach a sink. A repo-local engine can expose the same concept at the policy level.

```text
explain_partial_flow(query, source, limit):
  plan = compile_flow_query(query)
  graph = plan.graph_provider.load()
  frontier = [(source, empty_path())]
  explanations = []

  while frontier not empty and count(explanations) < limit:
    node, path = frontier.pop()

    outgoing = graph.outgoing(node)
    if outgoing is empty:
      explanations.push({
        kind: "dead_end",
        node: node,
        path: path
      })
      continue

    for edge in outgoing:
      if edge.status == "unsupported":
        explanations.push({
          kind: "unsupported_edge",
          edge: edge,
          path: path
        })
      else:
        frontier.push((edge.to, path + [edge]))

  return explanations
```

This gives rule authors a debuggable model without turning the public API into a raw graph
browser.

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

## How To Test Whether Hiding Graphs Works

The design claim is not self-proving. It should be evaluated.

| Hypothesis | Experiment |
| --- | --- |
| Policy APIs reduce rule bugs compared with raw graph traversal | Implement the same 10 local policies with raw graph APIs and policy queries; compare LOC, fixture pass rate, and review findings. |
| Bounded evidence improves agent repair | Compare agent repair with terminal text, raw graph JSON, and policy evidence JSON; measure iterations, edit distance, and regressions. |
| Unknown statuses prevent false confidence | Seed fixtures with unresolved imports, reflection, dynamic calls, and missing summaries; verify the engine emits unknown/unsupported instead of clean. |
| Query digests improve baselines | Change source/sink/barrier models and verify baseline fingerprints invalidate intentionally. |

Without this evaluation, "hide raw graphs" is a design preference. With it, it becomes a
testable product hypothesis.

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
- [Debugging data-flow queries using partial flow](https://codeql.github.com/docs/writing-codeql-queries/debugging-data-flow-queries-using-partial-flow/)
- [Semgrep taint analysis overview](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)
