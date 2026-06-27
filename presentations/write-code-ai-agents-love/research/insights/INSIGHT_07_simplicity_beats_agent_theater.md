# INSIGHT 07: Simplicity Beats Agent Theater

Complex agent orchestration is not a replacement for clear repository structure and deterministic
validation. The evidence consistently shows that simple, well-structured workflows (localize, repair,
validate) compete with or outperform multi-agent systems that use tree search, backtracking, and
elaborate tool chains. The bottleneck is almost never "the agent needs more sophistication." The
bottleneck is "the repository does not give the agent clear signals."

This matters for codebase design because it implies the highest-leverage investment is not in agent
tooling but in repository clarity: searchable structure, deterministic tests, precise instructions, and
reproducible setup. Only after those are clean does orchestration complexity pay off.

## Source map

| Ref | Source               | Local text                                       | Role in this insight                                                                                                            |
| --- | -------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| R23 | Agentless            | `paper-text/agentless-2407.01489.txt`            | Direct evidence: simple localize-repair-validate beats complex agents on SWE-bench Lite.                                        |
| R10 | ContextBench         | `paper-text/contextbench-2602.05892.txt`         | Shows sophisticated scaffolding yields only marginal gains in context retrieval.                                                |
| R25 | SWE-Search           | `paper-text/swe-search-iclr-2025.txt`            | MCTS-based search improves performance, but still depends on repository navigation and feedback.                                |
| R24 | AutoCodeRover        | `paper-text/autocoderover-2404.05427.txt`        | AST-based code search improves localization, but the improvement comes from structure visibility, not orchestration complexity. |
| R18 | Evaluating AGENTS.md | `paper-text/evaluating-agents-md-2602.11988.txt` | Context files can reduce success rates and increase cost when they add noise -- more context is not always better.              |

## Agentless: the strongest simplicity evidence

Agentless is the cleanest test of the simplicity hypothesis. It uses a three-phase process with no
autonomous decision-making, no tool use during execution, and no iterative feedback loops:

1. **Localization**: hierarchical narrowing from files to classes/functions to edit locations.
2. **Repair**: generate multiple candidate patches in diff format.
3. **Patch validation**: use reproduction tests and regression tests to select the final patch.

### Agentless data

| Measurement                |                                Value | Context                                         |
| -------------------------- | -----------------------------------: | ----------------------------------------------- |
| SWE-bench Lite performance |                               32.00% | 96 correct fixes out of 300                     |
| Cost per issue             |                                $0.70 | Average                                         |
| Ranking                    | Highest among all open-source agents | At time of publication                          |
| OpenAI adoption            |               Used as go-to approach | For showcasing GPT-4o and o1 coding performance |
| Agent turns required       |                                    0 | No iterative agent loop                         |
| Tool complexity            |                                 None | No file editing tools, no shell, no search APIs |

Source trace: R23, `paper-text/agentless-2407.01489.txt`.

The paper explicitly identifies three limitations of agent-based approaches that Agentless avoids:

1. **Complex tool usage/design**: agents require careful API design and format specification;
   incorrect tool use wastes queries and reduces performance.
2. **Lack of control in decision planning**: agents can take 30-40 turns with large action spaces,
   making incorrect decisions that compound.
3. **Limited ability to self-reflect**: agents struggle to filter incorrect or misleading information
   from environment feedback.

Key methodological insight: Agentless does not ask "can we make the agent smarter?" It asks "can
we make the problem simpler?" The localization phase uses the repository's own structure (files,
classes, functions) as the search hierarchy. This only works well when that structure is clear. In a
codebase with scattered responsibilities, unclear module boundaries, or tangled dependencies,
hierarchical localization would fail -- not because Agentless is too simple, but because the
repository is too opaque.

## ContextBench: scaffolding does not solve retrieval

ContextBench's key finding for this insight is stated directly in the abstract: "sophisticated agent
scaffolding yields only marginal gains in context retrieval."

### ContextBench scaffolding comparison

| Agent type                             | Retrieval behavior                             | Implication                                                       |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Simple baseline (mini-SWE-agent)       | Comparable context retrieval to complex agents | Complex scaffolding does not reliably improve what gets retrieved |
| Complex agents (OpenHands, Prometheus) | More actions, more tokens, similar recall      | Extra orchestration mainly increases cost                         |
| All evaluated LLMs                     | Favor recall over precision                    | Broad retrieval introduces noise regardless of scaffold           |
| Balanced retrieval agents              | Higher Pass@1 at lower cost                    | Restraint outperforms thoroughness                                |

Source trace: R10, `paper-text/contextbench-2602.05892.txt`.

The paper's finding #4 is particularly relevant: "Models that balance retrieval frequency and context
granularity achieve higher Pass@1 at lower cost, while aggressive retrieval mainly increases token
consumption." This directly argues against the intuition that more exploration equals better results.

Inference: if the repository makes the right context easy to find (clear module boundaries, predictable
file naming, explicit dependencies), a simple agent with few retrieval steps outperforms a complex
agent doing exhaustive search over an opaque codebase.

## SWE-Search: orchestration helps, but depends on repository signals

SWE-Search adds MCTS (Monte Carlo Tree Search) to agent exploration, achieving 23% relative
improvement over standard open-source agents across five models.

### SWE-Search data

| Measurement                               |                                     Value | Context                               |
| ----------------------------------------- | ----------------------------------------: | ------------------------------------- |
| Relative improvement over standard agents |                                       23% | Across 5 models on SWE-bench Lite     |
| Search mechanism                          |                  MCTS with value function | Balances exploration and exploitation |
| Value estimation                          | LLM-based, both numerical and qualitative | Self-feedback loops                   |
| Final decision                            |  Multi-agent debate (Discriminator Agent) | Collaborative decision-making         |
| Key dependency                            |        Repository navigation and feedback | Agent must observe signals to improve |

Source trace: R25, `paper-text/swe-search-iclr-2025.txt`.

SWE-Search is the strongest counter-evidence to pure simplicity. It shows that search and
backtracking do help. However, the improvement depends on the agent receiving meaningful feedback
at each state -- it needs to observe whether its actions are moving toward a solution. This feedback
comes from the repository: test results, linter output, build errors, and file content.

The design explicitly requires: "a dynamic code environment with a flexible state-space and a
git-like commit tree structure" that "facilitates efficient backtracking to previous states." This is a
repository-level affordance, not an agent-level one.

Inference: search-based agents amplify the signal quality of the repository. In a repository with fast,
deterministic tests and clear feedback, MCTS can exploit that signal. In a repository with slow, flaky
tests and ambiguous errors, MCTS explores noise.

## AutoCodeRover: structure visibility drives improvement

AutoCodeRover uses code search APIs that operate on the AST (abstract syntax tree) rather than
treating the project as a collection of files. It achieves 19% on SWE-bench Lite at $0.43 per issue.

### AutoCodeRover data

| Measurement                |                 Value | Context                                   |
| -------------------------- | --------------------: | ----------------------------------------- |
| SWE-bench Lite performance |                   19% | 57 correct fixes, pass@1                  |
| Average time per issue     |            ~4 minutes | vs. developer average of 2.68 days        |
| Average cost per issue     |                 $0.43 | USD                                       |
| Code search APIs           |             AST-based | search_method_in_file, search_class, etc. |
| Fault localization         | Spectrum-based (SBFL) | Uses test suite coverage data             |

Source trace: R24, `paper-text/autocoderover-2404.05427.txt`.

The paper makes an explicit software-engineering argument: "We work on program representations
(abstract syntax tree) as opposed to viewing a software project as a mere collection of files." The
improvement comes not from multi-agent debate or tree search, but from giving the agent structural
access to the code. The AST-based search APIs are deterministic and require no LLM inference --
they are properties of the codebase, not of the agent.

This supports the simplicity thesis from a different angle: the "complexity" that actually helps is
structural visibility of the repository, not behavioral complexity of the agent.

## Evaluating AGENTS.md: more context can hurt

This paper evaluates whether repository-level context files (AGENTS.md) actually help agents solve
tasks. The counterintuitive finding: context files tend to reduce task success rates while increasing
cost.

### Evaluating AGENTS.md data

| Measurement                  |                                                   Value | Context                                                         |
| ---------------------------- | ------------------------------------------------------: | --------------------------------------------------------------- |
| Benchmark tasks (AgentBench) |                                                     138 | From 12 niche repositories with developer-written context files |
| Effect on task success       |                                         Tends to reduce | vs. no context file                                             |
| Effect on cost               |                                   Increases by over 20% | More inference tokens                                           |
| Behavioral change            | Broader exploration (more testing, more file traversal) | Agents respect instructions even when unhelpful                 |
| Root cause                   |              Unnecessary requirements make tasks harder | Context files add constraints agents try to satisfy             |

Source trace: R18, `paper-text/evaluating-agents-md-2602.11988.txt`.

This is the clearest evidence against "agent theater": adding more instructions, more scaffolding,
more context does not inherently help. The paper's conclusion is that "human-written context files
should describe only minimal requirements." Brevity and precision outperform thoroughness.

## Explicit inference

1. **Simplicity is competitive.** Agentless at 32% outperformed all open-source agents at time of
   publication with zero agent turns and $0.70/issue. This establishes a strong baseline that any
   complex system must beat.

2. **Scaffolding mainly adds cost, not capability.** ContextBench shows marginal retrieval gains
   from complex scaffolding. Evaluating AGENTS.md shows context files can reduce success. The
   common pattern: complexity adds tokens and exploration without proportional improvement.

3. **The actual bottleneck is repository clarity.** Agentless succeeds because it uses the repo's
   own structure for localization. AutoCodeRover succeeds because it uses AST-based search.
   SWE-Search succeeds because it exploits test feedback. All three depend on the repository
   providing clear signals.

4. **Orchestration has a role, but it is secondary.** SWE-Search's 23% improvement is real. But
   it is an improvement over agents that already have access to good repository signals. In a
   codebase without fast tests or clear structure, the improvement would be smaller or absent.

5. **Less is often more for instructions.** Evaluating AGENTS.md directly shows that adding context
   can hurt. The lesson is that context should be minimal, precise, and action-oriented -- not
   exhaustive documentation of everything about the project.

## What this does not prove

- This does not prove that complex agents are never useful. Multi-agent systems with search and
  backtracking do improve performance when the repository provides good feedback signals.

- This does not prove that Agentless is the best possible approach. At the time of writing, more
  sophisticated systems have surpassed Agentless on updated benchmarks. But those systems also
  operate on well-structured repositories with good test suites.

- This does not prove that simplicity always wins for all task types. Feature addition, large-scale
  refactoring, and multi-file changes may genuinely require more exploratory approaches.

- ContextBench and Evaluating AGENTS.md measure issue resolution, not open-ended feature work.
  The simplicity advantage may be smaller for creative or ambiguous tasks.

- Agentless was evaluated on Python repositories. The transfer to other ecosystems (especially
  those with weaker test infrastructure) is plausible but not directly demonstrated.

## Codebase design implications

| Agent theater pattern                | Simple alternative                      | Why it works better                                  |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------------- |
| Multi-agent debate over architecture | Clear module boundaries in code         | Agents can localize without debating                 |
| Complex retrieval pipelines          | Predictable file naming and structure   | Simple search finds what it needs                    |
| Elaborate context injection          | Minimal AGENTS.md with exact commands   | Less noise, fewer unnecessary constraints            |
| Test-generation agents               | Pre-existing targeted tests             | Deterministic feedback without inference cost        |
| Orchestration frameworks             | Single deterministic validation command | `pnpm lint && pnpm test` is cheaper than a framework |
| RAG over documentation               | Types and interfaces at boundaries      | Types ARE the documentation, no retrieval needed     |

## Blog visual candidates

1. Agentless vs. agent-based systems: performance vs. cost scatter plot (Agentless achieves highest
   performance at lowest cost).
2. ContextBench radar plot: simple vs. complex agents have similar retrieval shape.
3. Effort allocation diagram: "Fix the repo, not the agent" -- time spent on repository clarity vs.
   agent orchestration, with diminishing returns on the orchestration axis.
4. Two-panel comparison: opaque repo with complex agent (many wasted turns) vs. clear repo with
   simple agent (few precise turns).

## References

- R10: ContextBench, `paper-text/contextbench-2602.05892.txt`
- R18: Evaluating AGENTS.md, `paper-text/evaluating-agents-md-2602.11988.txt`
- R23: Agentless, `paper-text/agentless-2407.01489.txt`
- R24: AutoCodeRover, `paper-text/autocoderover-2404.05427.txt`
- R25: SWE-Search, `paper-text/swe-search-iclr-2025.txt`
