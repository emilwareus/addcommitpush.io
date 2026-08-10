# The Rules of Vibe Coding

## Working Thesis

Vibe coding becomes engineering when repository conventions are turned into executable checks.
Static analysis is the mechanism: it converts source code into facts, runs policy over those facts,
and emits repairable diagnostics. `polint` exists because many useful rules are local to one
repository and do not belong in ESLint, Ruff, Semgrep, CodeQL, or a prompt.

## Reader Promise

By the end, a senior engineer should understand:

- what static analysis actually does;
- why the hard part is fact quality and precision, not "linting";
- how call graphs, control flow, and data flow build on each other;
- why AI agents make deterministic feedback more valuable;
- why `polint` is a repo-local policy engine rather than a generic linter.

## Shape

1. Summary: vibe coding is fast, but vibes need checks.
2. Key takeaways.
3. Rule 1: the vibe must become a check.
4. Rule 2: checks need facts, not opinions.
5. Static analysis pipeline.
6. The ladder of static facts.
7. Example: syntax rule.
8. Example: module/symbol rule.
9. Example: call graph rule.
10. Example: data-flow/taint rule.
11. Precision, unknowns, and budgets.
12. Why agents change the pressure.
13. Why I built `polint`.
14. What `polint` should and should not be.
15. Pitfalls.
16. Conclusion and references.
