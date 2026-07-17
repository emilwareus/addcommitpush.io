# Review Notes: The Rules of Vibe Coding

## Iteration 1: Structure

- Added the article promise early: vibe coding becomes engineering when conventions become checks.
- Reordered the article from concept to mechanism to `polint`, instead of starting with the tool.
- Kept the "rules" framing, but made each rule technical rather than motivational.

## Iteration 2: Static Analysis Mechanics

- Expanded the fact pipeline and static-analysis ladder so the article teaches how static analysis works.
- Added concrete examples for syntax, module resolution, call graphs, and data flow.
- Added pseudocode for a forward data-flow worklist solver.

## Iteration 3: Agent Usefulness

- Replaced vague "AI feedback" language with a concrete JSON diagnostic and repair loop.
- Added stop conditions: clean, unknown, repeated, or over budget.
- Made the difference between deterministic tool feedback and model self-critique explicit.

## Iteration 4: Deslop Pass

- Removed sales language around `polint`.
- Replaced generic praise words with concrete responsibilities.
- Removed cute headings and kept descriptive headings.
- Kept first person only where it explains why the tool exists.

## Iteration 5: Caveat Pass

- Added `unknown`, `unsupported`, and `budget_exceeded` result states.
- Clarified that `polint` is not a replacement for ESLint, Ruff, Biome, Semgrep, or CodeQL.
- Added pitfalls so the article does not oversell static analysis.
- Checked for em dashes, AI citation artifacts, and unsupported numbers.

## 2026-07-12 Pattern-Level Slop Review

- Researched structural AI-writing tells (Wikipedia WP:AITELLS, Pangram,
  tropes.fyi): the tell is density and decorative use, not any single device.
- Counted ~20 contrastive-negation constructions ("It is not X. It is Y.",
  "X, not Y"). Kept the load-bearing ones (call graph/precision budget,
  unknown/honesty, the two candidate guard questions, changed-file rule
  disambiguation, one "The point is not X" signature). Rewrote the rest.
- Broke the uniform "X, not Y" shape in the rules bullet list (5 of 8 bullets
  shared it).
- Fixed synonym cycling: "provider" -> "engine" in the status table.
- Left intact: coined-and-reused terms (repair objects, precision budget,
  proof-shape rules), the owns/owns slogan echo, and section-scaffold
  repetition (policy -> facts -> repair object), which teaches by repetition.

## 2026-07-01 Slop Review

- Rewrote the finalized article source rather than polishing around the old shape.
- Cut repeated "Rule N" mechanics where they made the piece feel like generated documentation.
- Made the opening more direct and conversational.
- Kept the technical examples, but moved the article toward shorter claims and clearer transitions.
- Preserved the static-analysis ladder, worklist solver, repair object, and `polint` rationale.
