# INSIGHT 08: Context Should Be Layered

## Claim

The best agent context is layered: a small hot path loaded by default, and deeper cold context fetched only when relevant.

## Evidence

- Codified Context (R15) describes hot-memory instructions plus cold-memory specification documents for a large C# system.
- Anthropic best practices (D05) warn that context windows fill quickly and performance degrades as sessions grow.
- Cursor and GitHub Copilot support scoped rules/instructions (D06, D07).
- Aider repo maps (D09) provide compact structural context for large codebases.
- Evaluating AGENTS.md (R18) shows context files can create too much exploration and cost.

## Practical Pattern

- Root file: durable invariants and commands.
- Subdirectory files: local conventions that differ from the root.
- `docs/architecture/`: human-readable system design.
- generated repo map: build/test/dependency graph.
- skills/scripts: repeatable workflows.
- issue/task spec: temporary goal-specific context.

## Talk Use

"Default context should orient. On-demand context should explain."
