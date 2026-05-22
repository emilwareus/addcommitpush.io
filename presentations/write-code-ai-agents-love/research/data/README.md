# Plot-ready data for "Write code AI agents love"

This folder holds plot-ready numeric claims extracted from the local paper corpus. The goal is not
to flatten every paper into a single leaderboard. The goal is to make the article and talk easy to
support with hard, source-traceable charts.

Use the `chart_id` column as the intended visual grouping. Use the `local_ref` column to verify the
source before publishing a chart.

## Files

- `repository_graph_context.csv` - graph retrieval, repository maps, cross-file context, and selective context effects.
- `feature_constraints_planning.csv` - feature work, refactoring, structural constraints, and planning failures.
- `setup_verification.csv` - setup, CI, no-op, tests, verification, and real-world task execution.
- `context_instruction_cost.csv` - AGENTS.md, CLAUDE.md, skills, context-file debt, and instruction-following data.
- `names_types_apis.csv` - names, types, generated/static API surfaces, chunking, and API context.
- `agentic_pr_change_shape.csv` - agentic PR scale, agent-vs-human PR shape, and readability commit effects.

## Good first charts

1. Repository graphs have measurable ROI.
   Plot RIG mean accuracy improvement, time reduction, and seconds-per-correct-answer reduction.

2. Cross-file context helps, but context selection matters.
   Plot CrossCodeEval exact-match before/after retrieved context and A3-CodGen k=5/k=10/k=15.

3. Feature work fails at the plan/constraint layer.
   Plot CODETASTE instructed vs open-track alignment, plus Constraint Decay L0-to-L3 drop.

4. Setup is not preamble.
   Plot SetupBench best overall success, Installamatic installation rate, GitTaskBench best task pass rate, and Long Code Arena CI repair.

5. Instructions are config with carrying cost.
   Plot AGENTS.md efficiency gains beside Evaluating AGENTS.md cost/steps regressions and SWE-Skills-Bench variance.

6. Names, types, and SDKs are not aesthetics.
   Plot naming obfuscation drops, type-constrained compile-error reductions, and ToolGen static-validity improvements.

7. Agents edit differently from humans.
   Plot "How AI Coding Agents Modify Code" Cliff's deltas and readability-commit deterioration rates.

## Cautions

- Do not compare values from different benchmarks as model leaderboards. They measure different
  tasks, harnesses, languages, and evaluation protocols.
- Prefer deltas within one paper over cross-paper absolute scores.
- Label units explicitly: percent, percentage points, fraction, seconds, dollars, token thousands,
  or Cliff's delta.
- Preserve the local source reference in every generated figure caption.
