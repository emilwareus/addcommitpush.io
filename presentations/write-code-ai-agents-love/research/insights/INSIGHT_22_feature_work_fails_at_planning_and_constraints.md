# INSIGHT 22: Feature Work Fails at Planning and Constraints

## Working conclusion

Bug fixing benchmarks made agents look useful, but feature work exposes a different failure mode:
the agent can produce a patch, and the patch can even apply, while the underlying plan is missing
steps, over-predicting irrelevant work, or violating structural constraints.

This insight is useful because it points to specific codebase techniques. Feature-friendly repos
need explicit extension points, examples, visible interfaces, acceptance tests, and structural rules.
Without those, the model often does the nearest plausible edit instead of the intended product and
architecture change.

## Hard data

| Source | Data point | What it suggests |
|---|---:|---|
| RACE-bench | 528 feature-addition instances from 12 repos | Feature addition is now being measured directly, not inferred from bug benchmarks. |
| RACE-bench | Patch apply rates: AutoCodeRover 96.21%, TraeAgent 78.98%, mini-SWE-Agent 95.83% | Applying a patch is much easier than resolving the feature. |
| RACE-bench | Resolved rates: 28.79%, 52.65%, 70.08% | The gap between "patch exists" and "feature works" is the real agent problem. |
| RACE-bench | mini-SWE-Agent recall falls 0.890 files -> 0.751 tasks -> 0.445 steps | The agent loses fidelity as the plan becomes concrete. |
| RACE-bench | Failed applied patches have 35.7% lower reasoning recall and 94.1% higher over-prediction | Failures are planning-quality failures, not just syntax failures. |
| Constraint Decay | Capable configs lose 30 pp assertion pass rate from L0 to L3 | Structural requirements materially reduce agent success. |
| Constraint Decay | PostgreSQL marginal effect -19.3 pp; clean architecture -9.1 pp | Data and architecture constraints are expensive for agents. |
| Constraint Decay | Express/Koa/Flask avg around 49-51% A%; FastAPI/Django around 24-25% | Implicit framework convention creates extra hidden context. |
| CODETASTE | GPT-5.2 instructed alignment 69.6%, open direct 7.7%, open plan 14.1% | Agents can execute a specified refactor far better than infer the human refactor. |
| CODETASTE | Average refactor: 91.52 files, 2,605.39 LOC, 1,638.53 tests | Real refactors are big enough that "just search and replace" is a trap. |
| FeatureBench | Claude Opus 4.5 11.0%, GPT-5.1-Codex 12.5% resolved | Repository-scale feature work remains hard even for strong agents. |

Plot-ready data: `research/data/feature_constraints_planning.csv`.

## Notes

RACE-bench is important because it gives a more precise vocabulary than "agent failed." It breaks
agent reasoning into files, tasks, and steps, then measures recall and over-prediction. The step
level is where the cliff appears. That matters for the talk because codebase structure can help at
exactly that point: clear local examples, feature boundaries, typed interfaces, and acceptance tests
turn vague feature work into concrete steps.

Constraint Decay is the other half of this. It fixes one API contract and then layers structural
requirements: framework, architecture, database, ORM. The paper's phrase "constraint decay" is
worth keeping. Production code is mostly constraints. Agents can satisfy loose specs, but codebases
we actually care about need the result to fit the architecture, data model, auth model, test model,
and operational model.

CODETASTE makes the same point from refactoring. If the desired refactor is specified in detail,
GPT-5.2 can do a respectable job. If the agent only receives a vague focus area, alignment collapses
to single digits. Planning helps, but it does not close the gap. For the article, this is a strong
argument against vague prompts and vague tickets. The codebase and task spec need to name the
intended transformation.

The design implication is not that we should avoid constraints. Constraints are software quality.
The implication is that constraints should be executable and visible. A hidden architecture rule is a
wish. A linter, generated SDK, module-boundary check, type signature, failing acceptance test, or
static refactoring rule is an agent-readable constraint.

Short source phrases worth quoting: RACE-bench talks about "reasoning recall" and CODETASTE
uses "alignment score." Both are better than generic "accuracy" for this talk.

## Relevance to code patterns

- Feature folders should show the local vertical slice: route, schema, service, test, generated client.
- Public interfaces should be explicit before the implementation is large.
- Avoid framework conventions that hide behavior unless the repo also exposes local examples.
- Keep data-layer patterns boring and searchable.
- Write tickets/specs that name the intended extension point.
- Use structural checks for architecture constraints; do not rely on prose.

## Caveats

RACE-bench, Constraint Decay, FeatureBench, and CODETASTE measure different things. Do not
combine them into one aggregate feature-work score. The shared conclusion is qualitative but
strong: as work becomes multi-step, structural, and feature-like, hidden constraints dominate.

## References

R44, R68, R71, R72.

