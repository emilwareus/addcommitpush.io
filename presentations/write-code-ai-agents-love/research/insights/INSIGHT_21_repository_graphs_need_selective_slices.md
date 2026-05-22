# INSIGHT 21: Repository Graphs Need Selective Slices

## Working conclusion

Repository graphs are one of the strongest empirical signals in the whole research set, but the
important part is not "dump a graph into the prompt." The useful pattern is: expose recoverable
repository structure, let the agent traverse it, and keep the returned slice small enough to preserve
precision.

This is a better framing than "make your codebase simple." The papers are measuring something
more concrete: whether the agent can recover build edges, test edges, dependency edges, callers,
callees, symbols, and ownership-like structure without spending half the task rediscovering the
repo.

## Hard data

| Source | Data point | What it suggests |
|---|---:|---|
| Repository Intelligence Graph | +12.2% mean accuracy, -53.9% completion time, -57.8% seconds per correct answer | Deterministic repo maps can produce measurable speed and accuracy improvements. |
| Repository Intelligence Graph | High-complexity repos: +17.4% accuracy, -64.0% time, +69.0% efficiency | Structural maps matter more as the repo becomes harder to infer. |
| Repository Intelligence Graph | Multilingual repos: +17.7% accuracy and +70.3% efficiency vs single-language +6.6% and +46.4% | Cross-language boundaries are exactly where agents need explicit topology. |
| GraphCodeAgent | DevEval GPT-4o +43.81% relative Pass@1; cross-file dependency slice +94.30% relative | Graph-guided retrieval helps most when the task is not local to one file. |
| GraphCodeAgent | Removing dynamic traversal drops DevEval GPT-4o Pass@1 from 58.14 to 51.83 | Agent-directed traversal beats static retrieved context. |
| RepoGraph | Agentless resolve 27.33 -> 29.67; RAG resolve 2.67 -> 5.33 | Graph context can improve existing systems without replacing the whole agent. |
| RepoGraph | 1-hop flat: 2,310.7 tokens and 29.67 resolve; 2-hop flat: 10,505.3 tokens and 26.00 resolve | More graph neighborhood can hurt if it adds noise. |
| SWE Context Bench | No context 26.26% resolved; Oracle Summary Learning 34.34%; Free Summary Learning 22.22% | Context reuse helps when selected well and hurts when selected badly. |

Plot-ready data: `research/data/repository_graph_context.csv`.

## Notes

The RIG result is clean because it does not claim to solve all coding. It asks repository-structure
questions and measures whether commercial agents answer faster and more accurately with an
authoritative graph. That maps well to this talk because many real agent failures are orientation
failures before they are code-generation failures.

GraphCodeAgent moves closer to code generation. The strong cross-file result is the piece to keep:
when required context lives outside the current file, a structural-semantic graph gives the agent a
way to walk from requirement to code. A normal product repo probably does not need to literally
ship GraphCodeAgent. It does need the same recoverable facts: explicit package exports, stable
entrypoints, generated API clients, colocated tests, module ownership, and scripts that reveal the
build/test graph.

The RepoGraph 1-hop/2-hop result is the caveat that keeps this honest. A bigger context window or
bigger graph slice is not automatically better. The 2-hop flat context used more than four times the
tokens and got a lower resolve rate. That supports the "Brain" architecture too: store the graph, but
retrieve the focused slice.

The phrase I would use in the article: the codebase should be able to regenerate its own map. If the
map is manually written prose, it rots. If the map is extracted from package manifests, build files,
schemas, tests, imports, route definitions, and generated clients, agents can re-query it as the repo
changes.

Short source phrase worth quoting: RIG frames the graph as "buildable components" and
"evidence back-links." That is the useful standard: a repo map should be auditable, not vibes.

## Relevance to code patterns

- Prefer explicit dependency direction over runtime magic.
- Keep package exports small and meaningful.
- Make generated files and generated clients easy to identify.
- Put tests near the behavior they protect, or maintain an authoritative test map.
- Do not ask agents to infer a build graph from scattered CI logs.
- Keep graph-like artifacts machine-generated or at least machine-validated.

## Caveats

RIG is not a patch-generation benchmark. It measures repo-structure QA over eight repos. The claim
should be "repository maps have measured ROI for orientation," not "graphs solve coding."

GraphCodeAgent and RepoGraph are retrieval systems, not codebase style guides. The design lesson
is about exposed structure and selective traversal; it does not prove one folder structure is always
best.

## References

R10, R11, R12, R13, R35, R53.

