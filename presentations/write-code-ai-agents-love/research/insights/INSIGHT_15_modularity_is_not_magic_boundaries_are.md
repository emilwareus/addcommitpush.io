# INSIGHT 15: Modularity Is Not Magic; Boundaries Are

"Make it modular" is too vague. The research presents a nuanced picture: modular decomposition
plus self-revision can improve code generation on competitive programming tasks, but modularity
score by itself does not correlate with generation performance. And when code is chunked into
isolated function-level units for retrieval, it underperforms other strategies. The useful property
is not modularity as an aesthetic or a raw count of functions. It is well-defined boundaries with
clear contracts, focused tests, and enough local context for retrieval systems to work with.

## Source map

| Ref | Source | Local text | Role in this insight |
|---|---|---|---|
| R47 | CodeChain | `paper-text/codechain-modular-codegen-2310.08992.txt` | Modular decomposition + self-revision improves pass@1 on competitive programming. |
| R48 | Revisiting Modularity | `paper-text/revisiting-modularity-codegen-2407.11406.txt` | Counter-evidence: modularity score has no clear positive correlation with generation. |
| R49 | Chunking study | `paper-text/chunking-rag-code-completion-2605.04763.txt` | Function-level chunks underperform Declaration, Sliding Window, and cAST strategies. |
| R61 | The Modular Imperative | `paper-text/modular-imperative-lmpl-2025.txt` | Position paper: modularity should constrain/guide/validate LLM code generation. |

## CodeChain: modular decomposition + self-revision helps

CodeChain (Salesforce Research, ICLR 2024) instructs LLMs to generate modularized
solutions through chain-of-thought prompting, then applies iterative self-revision using
representative sub-modules extracted from previous generations.

### CodeChain results copied from the paper

| Benchmark | Relative pass@1 improvement |
|---|---:|
| APPS | 35% |
| CodeContests | 76% |

Source trace: R47, `paper-text/codechain-modular-codegen-2310.08992.txt`, lines 28-29 and 129-130.

### How CodeChain works

1. Chain-of-thought prompting instructs the LLM to decompose solutions into modular
   sub-functions
2. Sub-modules are extracted from generated programs and grouped into clusters
3. Cluster centroids are selected as representative, reusable implementations
4. The prompt is augmented with these selected sub-modules for the next revision round
5. The LLM generates new modularized solutions reusing/adapting the representative modules

### Why it works

CodeChain's improvement comes from two mechanisms working together:
- **Modular decomposition** breaks complex problems into sub-tasks
- **Self-revision with verified sub-modules** provides correct building blocks

The paper shows consistent improvements for both OpenAI LLMs and open-source models
(WizardCoder). The improvement is larger on harder tasks (CodeContests: 76% vs APPS: 35%).

### Important caveat about CodeChain

CodeChain tests on competitive programming benchmarks (APPS, CodeContests), not on
repository-level tasks. Competitive programming tasks are self-contained: the "repository"
is the problem statement plus standard library. This is a different setting from real codebases
where modules interact with existing infrastructure.

## Revisiting Modularity: the counter-evidence

"Revisiting the Impact of Pursuing Modularity for Code Generation" (EMNLP 2024) directly
challenges the claim that modular code examples improve LLM generation quality.

### Revisiting Modularity approach

The paper introduces a quantitative Modularity Score (MOS) based on Cyclomatic Complexity:

1. Compute total Cyclomatic Complexity (CCtotal) from the code's control-flow graph
2. Calculate the ideal number of modules: m* = ceil(CCtotal / tau) where tau = 5
3. MOS = min(1, n/m*) where n is the actual number of modules

Source trace: R48, `paper-text/revisiting-modularity-codegen-2407.11406.txt`, lines 104-182.

### Four code categories

| Category | Definition |
|---|---|
| Modular Code (MC) | High MOS solutions from dataset |
| Singular Code (SC) | MOS = 0 solutions for same problems |
| LLM-Modularized Code (LMC) | GPT-3.5-Turbo converted code (claimed modular) |
| LMC-Recovered Code (RC) | Human-recovered version stripping LLM side-effects |

### Key finding

"Contrary to conventional wisdom in the literature, the modularity of a code example may not
be the crucial factor for performance."

Source trace: R48, lines 87-90.

The paper finds:
- No clear positive correlation between modularity score and generation performance
- Sometimes weak negative relationships
- Models up to 34B parameters tested (not just small models)
- LLM-modularized code (LMC) may appear to help, but the improvement could come from
  side-effects of the LLM conversion (added comments, restructured logic) rather than
  modularity itself

### Why this matters

The paper challenges the prior claim (Jain et al., 2024) that modular examples improve
generation. The prior work used GPT-3.5-Turbo to convert code into modular form, but:
1. LLMs are verbose -- the conversion may have added helpful detail, not just modularity
2. Without a quantitative modularity metric, it was impossible to isolate modularity's effect

Revisiting Modularity provides the metric and shows that when you isolate modularity from
other confounds, it does not predict performance.

## Chunking study: function-level chunks underperform

"How Does Chunking Affect Retrieval-Augmented Code Completion?" (KCL, 2026) is a
controlled empirical study crossing four chunking strategies with four retrievers, five generators,
and nine parameter configurations on two benchmarks.

### Chunking strategies tested

| Strategy | Description |
|---|---|
| Function | Each function/method as a complete chunk (body included) |
| Declaration | Class headers, field definitions, method signatures (bodies omitted) |
| Sliding Window | Fixed-size overlapping text windows |
| cAST | Context-aware AST-based chunking |

### Key results copied from the paper

| Finding | Value |
|---|---|
| Function underperformance vs other strategies | 3.57-5.64 percentage points EM on RepoEval |
| Cliff's delta (Function vs others) | -1.0 (large negative effect) |
| Cross-file context length gain (2048 -> 8192 tokens) | up to 4.2 pp EM |
| Chunk size effect | <= 1.9 pp (weaker, non-monotonic) |
| Retriever choice variation | <= 1.11 pp EM on RepoEval |

Source trace: R49, `paper-text/chunking-rag-code-completion-2605.04763.txt`, lines 68-76 and 113-126.

### Pareto optimality results

| Strategy | Pareto-optimal on cost-quality front? |
|---|---|
| Sliding Window | Yes (on both benchmarks) |
| cAST | Yes (on both benchmarks) |
| Declaration | Competitive |
| Function | Never Pareto-optimal |

Source trace: R49, lines 124-126.

### Why function chunking fails

The paper explains that function-level chunks:
- Isolate functions from their surrounding context
- Lose class-level structure, field definitions, and inter-function relationships
- Are often too small to provide enough context for the completion task
- Miss the declarations and signatures that Declaration chunking preserves

Meanwhile, Declaration chunking retains "class headers, field definitions, and method
signatures, omitting method bodies" -- which provides the structural skeleton that agents need
to understand the codebase's API surface without the noise of implementation details.

### Dominant parameter finding

"Cross-file context length is the dominant parameter: doubling from 2,048 to 8,192 tokens
yields up to 4.2 percentage points of improvement, whereas chunk size has a weaker,
non-monotonic effect."

This means: **how much cross-file context you provide matters more than how you split individual
files.** The budget for retrieved context is the key knob.

## The Modular Imperative: position paper on boundaries

The Modular Imperative (Harvard + Midspiral, LMPL 2025) is a position paper arguing that
modularity should be a guiding principle for LLM-assisted code generation. It is not an
empirical study but provides useful observations.

### Key observations from the paper

| Experiment | Outcome |
|---|---|
| Without modular guidance | LLM produced monolithic solution: 586 lines in one file |
| With Rubric specification | Surface-level modularity (separate files, interfaces) but hidden dependencies, duplicated data, excessive complexity, 4x code size increase |

Source trace: R61, `paper-text/modular-imperative-lmpl-2025.txt`, lines 175-185.

### The paper's core argument

"Effective modularity requires coherent boundaries, reusable abstractions, and minimal
coupling: principles that current LLM outputs often violate, despite the surface structure."

Source trace: R61, lines 106-108.

The paper observes that LLMs "optimize for immediate completeness and accuracy over
architectural integrity and long-term maintainability" and "tend toward comprehensive (often
over-engineered), boundary-crossing solutions."

### Rubric as constraint layer

The paper proposes Rubric DSL as a "semantic contract layer" that constrains LLM output.
This aligns with the general thesis: boundaries need to be enforced, not just suggested.
Modular code needs external validation of its modularity properties.

## Reconciling the evidence

The four sources paint a coherent picture when read together:

| Source | Claim | Scope |
|---|---|---|
| CodeChain | Modular decomposition + revision helps | Competitive programming (self-contained) |
| Revisiting Modularity | Modularity score does not predict performance | NL2Code with in-context examples |
| Chunking study | Function-level chunks underperform | Retrieval for code completion |
| Modular Imperative | Surface modularity is insufficient; boundaries must be enforced | Position based on experiments |

### The reconciliation

1. **CodeChain works because of self-revision with verified sub-modules, not modularity per
   se.** The decomposition helps the LLM think about sub-problems, and the revision cycle
   provides feedback. This is about process, not about the modularity score of the output.

2. **Modularity score does not predict performance because modularity alone does not ensure
   useful boundaries.** A function with MOS=1.0 might still have unclear interfaces, hidden
   state, and poor naming. The metric captures decomposition but not boundary quality.

3. **Function-level chunks fail because they are too isolated.** They lose the structural context
   (class headers, field definitions, method signatures) that helps agents understand the API
   surface. Declaration chunks preserve exactly this boundary information.

4. **The Modular Imperative correctly identifies the gap:** surface modularity (splitting into
   files) is not the same as effective modularity (coherent boundaries, minimal coupling,
   reusable abstractions).

The synthesis: **boundaries matter more than decomposition count.** A well-bounded module
with a clear API contract, focused tests, and discoverable declarations is agent-friendly.
A micro-module that hides its context across many files is not.

## Inference for codebase design

| Practice | Why it helps agents | Why raw modularity does not |
|---|---|---|
| API contracts at each boundary | Declaration chunking preserves them for retrieval | Small functions without contracts are invisible |
| Focused tests at boundaries | Provide validation oracles for each module | Scattered micro-tests do not map to modules |
| Related declarations close together | Retrieval context budget captures the neighborhood | Spread-out declarations waste retrieval budget |
| Avoid micro-modules that fragment context | Cross-file context is the dominant parameter | 10 tiny files use more retrieval budget than 2 coherent files |
| Responsibility-based splitting | Alignment with task scope | Size-based splitting can separate related code |
| Ownership-aligned folders | Module boundary = team boundary = architectural boundary | Arbitrary folder nesting confuses structural retrieval |

### The cross-file context budget argument

The chunking study's finding that cross-file context length is the dominant parameter (up to
4.2pp gain) has a direct implication: if your codebase forces agents to retrieve from many
scattered micro-files, the retrieval budget fills up with overhead (file headers, imports,
boilerplate) rather than useful content. Fewer, coherent modules provide more useful context
per token of retrieval budget.

## What I should not claim

- I should not claim modularity is bad. CodeChain shows it helps when combined with
  self-revision. The claim is that modularity alone, measured as a structural score, does not
  predict agent performance.

- I should not claim large modules are better than small ones. The chunking study shows
  function-level chunks are too small, but it also shows chunk size has a non-monotonic
  effect (<=1.9pp). There is a sweet spot, not a "bigger is better" relationship.

- The Revisiting Modularity paper tests on competitive programming tasks (APPS, MBPP).
  Repository-level tasks may have different dynamics where modular structure matters more
  because of cross-file dependencies. But the chunking study (on repository-level benchmarks)
  supports the same direction.

- CodeChain's 76% improvement on CodeContests is impressive but is relative improvement
  on what may be a low baseline. Absolute pass rates should be checked before using this
  number in a presentation.

- The Modular Imperative is a position paper with small experiments (blog dashboard in
  HTML/CSS/JS). It provides useful qualitative observations but not statistical evidence at
  the scale of the other papers.

- I should not claim that function-level chunking is always wrong. The chunking study tests
  retrieval for code completion. For other tasks (e.g., test generation, bug localization),
  function-level context might be appropriate.

## Blog visual candidates

1. Reconciliation diagram: CodeChain (modular + revision = helps) vs Revisiting Modularity
   (modularity score alone = no effect) vs Chunking (function chunks = worst). Shows the
   nuanced picture.
2. Chunking strategy comparison bar chart: EM scores for Function, Declaration, Sliding
   Window, cAST. Function is clearly worst.
3. Cross-file context length curve: 2048 -> 4096 -> 8192 tokens vs EM improvement. Shows
   the dominant parameter.
4. Boundary vs decomposition illustration: a well-bounded module (API contract, tests,
   declarations) vs a micro-module swarm (many files, no clear contracts).
5. Modular Imperative experiment: monolithic (586 lines, 1 file) vs surface-modular (4x code,
   hidden dependencies) vs well-bounded (hypothetical ideal). Three-panel comparison.

## References

- R47: CodeChain, `paper-text/codechain-modular-codegen-2310.08992.txt`
- R48: Revisiting Modularity, `paper-text/revisiting-modularity-codegen-2407.11406.txt`
- R49: Chunking study, `paper-text/chunking-rag-code-completion-2605.04763.txt`
- R61: The Modular Imperative, `paper-text/modular-imperative-lmpl-2025.txt`
