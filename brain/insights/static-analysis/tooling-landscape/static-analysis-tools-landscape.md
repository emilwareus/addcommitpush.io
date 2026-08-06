---
type: insight
title: "The Static-Analysis Tooling Landscape Is a Stack of Different Contracts"
slug: static-analysis-tools-landscape
created: 2026-07-16
status: working
publish: true
tags:
  - static analysis
related:
  - "[[polint-is-a-repo-local-policy-engine]]"
  - "[[taint-analysis-is-modeling-not-magic]]"
  - "[[static-analysis-engines-are-fact-pipelines]]"
  - "[[static-analysis-feedback-can-help-and-harm-agents]]"
---

# The Static-Analysis Tooling Landscape Is a Stack of Different Contracts

“Static analysis” is an umbrella term for tools that inspect a program without executing the target behavior as their primary method. An auto-formatter, a type checker, a pattern linter, a taint analyzer, and a symbolic executor all operate before or around runtime, but they provide different guarantees, accept different costs, and produce different kinds of findings. A reliable engineering program chooses tools by the property and feedback latency it needs, then gives every result a stable identity and a clear policy for failure.

## Key takeaways

- Formatters normalize representation; linters enforce local or structural rules; type checkers solve typing constraints; SAST engines reason across data, control flow, or call graphs.
- Pattern matching is fast and explainable but usually shallow. Dataflow and query engines preserve relationships across statements and files. Symbolic execution searches path constraints and can produce concrete witnesses at higher cost.
- SARIF is the common interchange format for locations, rules, results, artifacts, and fingerprints; it is a transport contract, not a judgment that a finding is correct.
- IDEs and pre-commit hooks optimize for low latency and small scope; CI gates changed code; scheduled or release jobs can afford deeper interprocedural and symbolic analyses.
- Tool adoption fails when “warning,” “error,” “unformatted,” and “security vulnerability” are treated as the same signal. Keep detection, presentation, triage, and policy separate.

## A taxonomy by what the tool computes

| Family | Typical examples | Primary input | What it computes | Typical guarantee | Cost/latency |
| --- | --- | --- | --- | --- | --- |
| Formatter | Prettier, Ruff formatter | Tokens/AST plus style config | One canonical representation | Usually behavior-preserving text transformation | Very low to low |
| Linter | ESLint, Ruff | AST, tokens, selected type facts | Rule-specific pattern or local invariant | Rule-dependent; often neither complete nor sound globally | Low |
| Type checker | `tsc`, mypy, Rustc | AST/IR, declarations, constraints | Types, subtyping, ownership, lifetimes | A language- and configuration-scoped typing theorem | Low to medium |
| Syntactic SAST | Semgrep patterns | AST, CST, metavariables | Matches and local relational patterns | Rule-dependent; often transparent and tunable | Low to medium |
| Dataflow SAST | Semgrep taint, CodeQL dataflow | IR/database, CFG, call graph | Reachability and value propagation | Depends on source/sink models and call-graph precision | Medium to high |
| Abstract interpreter | Astrée, Infer-like analyses | CFG/IR and abstract domains | Invariants over sets of executions | Can be sound for a specified property and model | Medium to very high |
| Symbolic/concolic executor | KLEE, SymCC, angr | IR/native/binary code | Feasible path constraints and witnesses | Bounded/explored-path result; solver/model dependent | High to unbounded |

The categories overlap. ESLint rules normally inspect a syntax tree, but a TypeScript-aware rule can consume type facts. CodeQL supports syntactic predicates and path queries in the same database. A tool's name is less informative than the facts it retains between two program points and the contract it makes about omitted behavior.

## The common pipeline

Most tools can be understood as a fact pipeline:

```mermaid
flowchart LR
    source[Source files] --> frontend[Lexer/parser/type facts]
    frontend --> ir[AST, CST, IR, or database]
    ir --> facts[Rules and analysis facts]
    facts --> findings[Findings with locations and metadata]
    findings --> format[SARIF, JSON, text, editor diagnostics]
    format --> policy[Policy: report, warn, block, or suppress]
    policy --> feedback[Developer and CI feedback]
```

The frontend determines what the tool can see. The analysis determines what it can relate. The reporter determines whether a developer can act on the result. The policy layer decides whether the result affects the build. Coupling these layers makes upgrades and migrations painful: changing a rule can unexpectedly alter CI exit codes, output paths, and suppression behavior.

## Formatters: normalization, not defect detection

A formatter chooses a canonical layout for code. Prettier parses supported languages and prints the program from scratch according to its formatting rules. Ruff provides a Python formatter designed to be Black-compatible. A formatter should preserve program behavior under the parser and printer's language model; it does not normally prove that a query is parameterized or that a lock is released.

```bash
# Check without changing the worktree.
pnpm exec prettier --check "**/*.{ts,tsx,md}"
ruff format --check .

# Apply the canonical representation.
pnpm exec prettier --write "**/*.{ts,tsx,md}"
ruff format .
```

Formatting belongs early in the developer loop because it is deterministic and produces little semantic debate. Keep it separate from lint fixes: a formatting change should not be mistaken for a security remediation, and a linter should not need to infer whether whitespace changes are intentional.

## Linters: explicit rules over syntax and local facts

ESLint and Ruff provide rule registries, source locations, suppressions, and often autofixes. A basic rule is a function over syntax:

```text
on_node(node, context):
    if node.kind == CallExpression
       and node.callee == Identifier("eval"):
        report(
            rule_id = "no-eval",
            location = node.location,
            message = "Avoid dynamic code evaluation"
        )
```

An autofix must prove that its edit is local and semantics-preserving under the rule's assumptions. A suggestion that changes control flow or API behavior belongs in a refactoring tool or human review, not in a default “fix all” pass.

ESLint's ecosystem is JavaScript/TypeScript-oriented and supports custom rules and plugins. Ruff combines a fast Rust implementation with Python rule families and a separate formatter. Their speed makes them useful on every changed file, but speed does not make a rule sound: a rule that looks for `eval(...)` may miss an alias, computed property, wrapper, or dynamic import.

### Example rules

```javascript
// eslint.config.js
export default [
  {
    rules: {
      "no-eval": "error",
      "no-debugger": "warn",
    },
  },
];
```

```toml
# pyproject.toml
[tool.ruff.lint]
select = ["E", "F", "B", "S"]
ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101"]
```

The configuration is part of the analysis. Selecting a rule family, disabling a check for tests, or changing severity changes the effective policy. Store configuration with the code and review it like source.

## Type checkers: constraints over program meaning

Type checkers retain more semantic structure than ordinary lint rules. TypeScript's `tsc` checks a JavaScript-compatible structural type system; mypy checks Python annotations and deliberately supports dynamic regions; Rustc checks types together with ownership and borrowing.

```bash
pnpm exec tsc --noEmit
mypy --strict src/
cargo check
```

The central operation is constraint propagation. A generic fragment looks like:

```text
check_call(callee, argument, expected_result):
    function_type = infer(callee)
    argument_type = infer(argument)
    require compatible(function_type.parameter, argument_type)
    require compatible(function_type.result, expected_result)
```

The type system can prevent a wrong field name or invalid call without knowing runtime values. It cannot validate untyped JSON merely because a variable is annotated `User`. The boundary must be checked or the annotation is an unchecked assertion.

```python
from typing import Any

payload: Any = load_json()
payload["missing"][0]()  # accepted in a dynamic escape region
```

The relevant question is not “does this repository use types?” but “where can values bypass the type checker, and does the tool report those escapes?” Strictness flags, `unknown` instead of `any`, `--check-untyped-defs`, Rust's `unsafe`, and schema validation all change the effective coverage.

## Pattern matching versus dataflow versus symbolic reasoning

The same policy—“untrusted input must not reach a shell”—looks different at each depth.

```javascript
exec(userInput);
```

A syntactic rule can report the direct call. A dataflow rule should also understand:

```javascript
const command = request.query.command;
const line = `run ${command}`;
exec(line);
```

A symbolic executor might find an input that reaches a command branch only when several string comparisons and length checks all hold. The increasing precision comes with more state, more models, and more opportunities for unsound environment assumptions.

| Approach | Retained relationship | Example it handles well | Example it may miss |
| --- | --- | --- | --- |
| Token/pattern | Text shape or AST neighborhood | Direct `eval(x)` or forbidden decorator | Alias, wrapper, interprocedural source-to-sink flow |
| Local semantic rule | Types, parent/child facts, local control flow | Calling a method on a nullable value | Long-range data dependencies |
| Intraprocedural dataflow | Facts propagated over a CFG | Value is sanitized before a sink in one function | Dynamic dispatch and unknown callees |
| Interprocedural dataflow | Facts across calls and returns | Request parameter reaches SQL builder | Reflection, missing models, complex aliasing |
| Relational query | Program facts joined in a database | Variant analysis across a codebase | Facts the extractor never encoded |
| Symbolic execution | Feasible path formula and memory relation | A concrete input satisfying a deep guard chain | Unbounded loops, unsupported environment, solver timeout |

No row dominates the others. A direct pattern rule is often the right control for an API prohibition because developers can understand and fix it immediately. A taint rule is appropriate when source-to-sink reachability is the invariant. Symbolic execution is justified when producing a witness for a difficult path is worth the cost.

## SAST engines in practice

### Semgrep

Semgrep expresses many rules as code patterns with metavariables:

```yaml
rules:
  - id: python-subprocess-shell-true
    message: Avoid shell=True with data influenced by a request.
    severity: WARNING
    languages: [python]
    patterns:
      - pattern: subprocess.$FUNC(..., shell=True, ...)
```

The pattern is more structural than a regular expression: it can match syntax while ignoring irrelevant formatting. For security properties, Semgrep's taint mode adds sources, propagators, sanitizers, and sinks. The model is only as good as those definitions; a missing wrapper or sanitizer produces a false negative, while an overbroad source produces noise.

### CodeQL

CodeQL extracts source into a relational database containing syntax, control-flow, dataflow, and other facts. A query joins those facts and emits a result. A conceptual query is:

```ql
from Source source, Sink sink
where source.flowsTo(sink)
select sink, "Untrusted data reaches a sensitive operation"
```

Real queries define language-specific `Source`, `Sink`, configuration, sanitizers, and path explanation. The database model enables reusable libraries and variant analysis: once a vulnerability pattern is formalized, the query can search an entire codebase and explain the path. Database extraction is more expensive than a one-file AST walk, but it amortizes semantic facts across many queries.

### Rule quality is a modeling problem

For a source-to-sink rule, review the model as a set of contracts:

```text
source       values controlled by an attacker or untrusted boundary
propagator   operations that preserve or transform taintedness
sanitizer    operation that establishes the sink's required invariant
sink         operation with a security-sensitive interpretation
```

```text
report(source, sink) iff
    reachable(source, sink)
    ∧ taint_flows(source, sink)
    ∧ ¬sanitized_on_all_relevant_paths(source, sink)
```

The phrase “on all relevant paths” matters. A sanitizer on one branch does not protect a sink reached through another. A query that reports only syntactic source-to-sink proximity is not a taint analysis, even if its message uses the word “tainted.”

## SARIF as the interchange contract

The Static Analysis Results Interchange Format (SARIF) is a JSON standard for representing results from static analysis tools. A SARIF log contains runs, tool metadata, rules, results, locations, and optional code flows. A minimal result looks like:

```json
{
  "version": "2.1.0",
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "example-linter",
          "rules": [{"id": "no-eval", "shortDescription": {"text": "Avoid eval"}}]
        }
      },
      "results": [
        {
          "ruleId": "no-eval",
          "level": "error",
          "message": {"text": "Dynamic code evaluation is not allowed"},
          "locations": [{
            "physicalLocation": {
              "artifactLocation": {"uri": "src/app.ts"},
              "region": {"startLine": 8, "startColumn": 5}
            }
          }]
        }
      ]
    }
  ]
}
```

SARIF separates the rule identity from an individual result. That makes it possible to change prose without making every finding look new. For stable review history, emit repository-relative, normalized paths and stable rule IDs, and populate `partialFingerprints` when the consumer uses them to deduplicate alerts. A line number alone is not a stable identity: inserting a line above a finding moves it.

SARIF does not define whether a rule is sound, whether a result is exploitable, or whether `level: error` should block a build. Those are tool and policy semantics layered on top of the interchange format.

## CI/CD and integration by feedback latency

Use multiple execution tiers with explicit budgets:

```text
editor       changed buffer, syntax/type diagnostics, < 1 second target
pre-commit   changed files, formatter and deterministic local rules
pull request changed files plus affected dependencies, minutes
main branch  full repository, interprocedural security and policy checks
scheduled    expensive whole-program, historical, or symbolic campaigns
release      required gates, artifact-specific scans, archived evidence
```

The order is a latency and blast-radius decision. A full CodeQL database or symbolic campaign does not belong on every keystroke; an obvious syntax rule should not wait for a nightly job. If the same rule runs in several tiers, preserve the rule ID and configuration version so developers can connect an IDE diagnostic to a CI result.

### Git hooks and pre-commit

`pre-commit` is a multi-language hook framework that runs configured tools against staged or changed files. A focused configuration might be:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.12.0
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
```

Hooks are a convenience, not a security boundary. Developers can bypass them, partial staging can confuse tools that expect a complete repository, and a hook that takes too long will be disabled. CI must repeat policy-critical checks. Keep hook tasks deterministic and fast; move repository-wide analysis to the pull-request or main-branch tier.

### IDE integration

An IDE diagnostic should include the rule ID, severity, primary location, related locations, and a concise remediation. For a dataflow result, the useful UI is a path from source through propagators to sink, not a generic “bad input” marker. For type errors, related locations should show the declaration or constraint that caused the mismatch. Editor integrations should respect the same configuration as CI or clearly label their configuration as advisory.

## Orchestrating tools without turning warnings into noise

Treat findings as data before deciding policy:

```text
analyze(change, repository_state):
    artifacts = discover_files(change)
    runs = []

    for tool in tools_for(artifacts, repository_state):
        result = tool.run(artifacts, repository_state)
        runs.append(normalize_to_internal_findings(result))

    findings = deduplicate(runs, key = stable_fingerprint)
    findings = apply_baseline(findings, repository_state.baseline)
    findings = classify(findings, owner_rules, suppressions)

    emit_sarif(findings)
    return policy_decision(findings)
```

The internal model should retain provenance: tool, version, rule ID, configuration hash, source revision, location, and analysis status. Deduplication should not erase two findings merely because they share a line; use rule and semantic fingerprints. Baselines should distinguish “existing and accepted,” “existing and still open,” and “new on this change.” Otherwise a baseline can become a permanent ignore list.

### Exit-code policy

| Finding state | Suggested default | Why |
| --- | --- | --- |
| Formatter drift | Block only where formatting is a repository invariant | Deterministic and easy to repair |
| New type error | Block changed code | Usually local and actionable |
| New high-confidence security result | Block or require security owner | High impact, but keep a documented exception path |
| Low-confidence advisory | Report and measure | Blocking noise trains bypass behavior |
| Tool crash or incomplete scan | Fail closed for required security gates; fail visibly elsewhere | “No findings” is invalid if analysis did not run |
| Baseline finding | Keep visible until resolved or explicitly accepted | Prevents silent debt |

The policy should operate on new, actionable results rather than raw counts. “Zero warnings” is a useful short-term migration target for a local lint rule; it is not a universal security metric.

## Choosing a tool for a property

Ask five questions before adding a scanner:

1. What invariant is being checked—representation, API shape, type compatibility,
   value reachability, resource lifetime, or a concrete exploit path?
2. What program boundary is required—one file, one module, repository, binary, or runtime environment?
3. What evidence should a developer receive—a fix, a type explanation, a dataflow path, or a replayable input?
4. What is the acceptable latency and resource budget for local and CI execution?
5. What does “no result” mean when parsing fails, a dependency is missing, or a solver times out?

Then choose the smallest analysis that can express the invariant:

```text
canonical text       -> formatter
forbidden syntax     -> AST linter
invalid API use      -> typed rule or type checker
source-to-sink flow  -> dataflow/taint analysis
whole-program fact   -> relational SAST or abstract interpreter
feasible witness     -> symbolic/concolic execution
```

Running every available tool against every commit is not a strategy. It increases duplicated findings, configuration drift, and time spent interpreting disagreements. A small, layered set with explicit ownership and suppression rules is easier to trust.

## Failure modes and edge cases

- **Parser drift:** a tool that cannot parse a new language feature may skip files or produce partial facts. Surface parse errors as analysis status, not a clean scan.
- **Generated code:** decide whether to analyze, exclude, or separately validate generated artifacts. Do not hide generated findings under a global ignore without recording the generator contract.
- **Monorepos:** path filters and dependency-aware extraction can create a false sense of changed-code completeness. A local change can alter a shared library's callers.
- **Dependency models:** a missing package, stub, or framework summary reduces interprocedural coverage. Report the missing model.
- **Dynamic languages:** reflection, monkey-patching, dynamic imports, and `eval` weaken static call graphs. Model known conventions and report unresolved edges.
- **Autofix conflicts:** two fixers can rewrite the same range or alternate formatting. Run one canonical formatter and make linter fixes idempotent.
- **Suppression sprawl:** inline ignores need an owner, reason, and expiration or review policy. A suppression that removes the location but not the underlying fact hides debt.
- **Version changes:** rule implementation and parser upgrades can change findings. Keep tool versions and configuration hashes in CI artifacts.

## Sources

- [ESLint core concepts](https://eslint.org/docs/latest/use/core-concepts/) — rules, configuration, language options, and the linting model.
- [ESLint integrations](https://eslint.org/docs/latest/use/integrations) — editor, CI, and workflow integration points.
- [Ruff linter](https://docs.astral.sh/ruff/linter/) — Python lint rules and command-line behavior.
- [Ruff formatter](https://docs.astral.sh/ruff/formatter/) — the separate formatter contract and compatibility goals.
- [TypeScript compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html) — `tsc`, `--noEmit`, strictness, and compiler configuration.
- [mypy dynamic typing](https://mypy.readthedocs.io/en/stable/dynamic_typing.html) — typed and dynamically typed regions and `Any`.
- [Prettier documentation](https://prettier.io/docs/index.html) and [formatting rationale](https://prettier.io/docs/rationale.html) — canonical printing and behavior-preserving formatting goals.
- [Semgrep rule glossary](https://semgrep.dev/docs/writing-rules/glossary) — patterns, metavariables, taint sources, propagators, sanitizers, and sinks.
- [CodeQL overview](https://codeql.github.com/docs/codeql-overview/about-codeql/) — database extraction, query evaluation, and code-scanning workflow.
- [CodeQL tools](https://codeql.github.com/docs/codeql-overview/codeql-tools/) — database and query tooling.
- [OASIS SARIF 2.1.0 specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html) — the interchange schema for static-analysis results.
- [GitHub SARIF documentation](https://docs.github.com/en/code-security/concepts/code-scanning/sarif-files) — supported SARIF fields and upload behavior.
- [GitHub SARIF fingerprints](https://docs.github.com/en/enterprise-cloud@latest/code-security/reference/code-scanning/sarif-files/sarif-support) — stable result identity and deduplication fields.
- [pre-commit](https://pre-commit.com/) — multi-language Git hook framework and changed-file execution model.
- [Git hooks](https://git-scm.com/docs/git-hook) — lifecycle and invocation semantics at the Git boundary.
