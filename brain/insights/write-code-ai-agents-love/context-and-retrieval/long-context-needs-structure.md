---
type: insight
title: "Long Context Still Needs Structure"
slug: long-context-needs-structure
created: 2026-06-28
status: working
publish: true
tags:
  - ai-agents
  - research
feeds_into:
  - "[[write-code-ai-agents-love]]"
original_path: "presentations/write-code-ai-agents-love/research/insights/INSIGHT_09_long_context_needs_structure.md"
---
# INSIGHT 09: Long Context Still Needs Structure

Large context windows do not eliminate the need for repository retrieval, maps, and scoped
documentation. A million-token window lets you fit more code, but it does not guarantee the model
will use that code effectively. The evidence shows: (1) positional effects degrade utilization of
middle-context information, (2) long-context coding benchmarks remain hard even at frontier scale,
(3) coding agents that use tools and file systems as an explicit long-context interface outperform
raw attention baselines, and (4) agents already over-retrieve and under-utilize context at current
scales.

The implication for codebase design: progressive disclosure matters more, not less, as context
windows grow. A bigger room needs better maps.

## Source map

| Ref | Source                                              | Local text                                                        | Role in this insight                                                                        |
| --- | --------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| R32 | Lost in the Middle                                  | `paper-text/lost-in-the-middle-2307.03172.txt`                    | Models underuse information depending on where it appears in long context (U-shaped curve). |
| R37 | LongCodeBench                                       | `paper-text/longcodebench-2505.07897.txt`                         | Evaluation at million-token scale shows severe performance drops for real coding tasks.     |
| R36 | YABLoCo                                             | `paper-text/yabloco-2505.04406.txt`                               | Long-context code generation over very large C/C++ repositories (200K-2M LoC).              |
| R40 | Coding Agents are Effective Long-Context Processors | `paper-text/coding-agents-long-context-processors-2603.20432.txt` | Agents using tools/filesystem beat raw long-context baselines by 17.3% on average.          |
| R10 | ContextBench                                        | `paper-text/contextbench-2602.05892.txt`                          | Agents retrieve too much context and still fail to use relevant material in final patches.  |

## Lost in the Middle: the positional attention problem

This paper establishes that language models do not uniformly attend to all positions in their context.
Performance follows a U-shaped curve: highest when relevant information is at the beginning or end,
and significantly degraded when it is in the middle.

### Lost in the Middle data

| Measurement                              |                          Value | Context                                                           |
| ---------------------------------------- | -----------------------------: | ----------------------------------------------------------------- |
| Performance pattern                      |                 U-shaped curve | Best at beginning and end, worst in middle                        |
| GPT-3.5-Turbo middle-context performance | Lower than closed-book (56.1%) | Model performs worse WITH documents than without                  |
| Effect of more documents                 |           Marginal improvement | 50 vs. 20 documents: ~1.5% gain (GPT-3.5-Turbo), ~1% (Claude-1.3) |
| Extended-context models vs. standard     |    Often identical performance | Longer window does not mean better utilization                    |
| Key-value retrieval                      |           Some models struggle | Even for simple token matching from middle positions              |

Source trace: R32, `paper-text/lost-in-the-middle-2307.03172.txt`.

Key findings relevant to codebase design:

1. **Position matters.** Information in the middle of context is systematically underused. For a
   codebase stuffed into a long context window, files in the "middle" of the loaded context may
   effectively be invisible to the model.

2. **More context does not always help.** Adding documents beyond saturation provides marginal
   improvement while increasing the volume the model must reason over. This is the "trade-off"
   the paper identifies: more information helps retrieval recall but hurts reasoning accuracy.

3. **Extended context is not better context.** Models with longer windows do not necessarily use
   those windows more effectively than shorter-context models.

Inference for repositories: if you load an entire codebase into a million-token window, the model's
attention to specific files depends heavily on their position relative to the query and the beginning/end
of the context. Structured retrieval (loading only relevant files, placing them near the query) will
outperform raw dumping regardless of window size.

Note: this paper is from 2023. Newer models may partially mitigate the U-curve. But the fundamental
point remains: attention is not uniform over long sequences, and codebase structure that aids
selective retrieval will always outperform unstructured context stuffing.

## LongCodeBench: million-token coding remains hard

LongCodeBench evaluates coding LLMs on comprehension and repair tasks ranging from tens of
thousands to one million tokens, using real GitHub issues.

### LongCodeBench data

| Measurement                        |                                               Value | Context                                |
| ---------------------------------- | --------------------------------------------------: | -------------------------------------- |
| Benchmark instances                |                                               1,043 | From 108 real repositories             |
| Context range                      |                      Tens of thousands to 1M tokens | Stratified by complexity               |
| Claude 3.5 Sonnet performance drop |                                           29% to 3% | As context length increases to maximum |
| Qwen2.5 performance drop           |                                        70.2% to 40% | As context length increases            |
| Tasks                              | Comprehension (LongCodeQA) + Repair (LongSWE-Bench) | Both reading and fixing                |
| Maximum context tested             |                                           1M tokens | Full benchmark scale                   |

Source trace: R37, `paper-text/longcodebench-2505.07897.txt`.

The performance drops are dramatic. Claude 3.5 Sonnet goes from 29% to 3% as context scales --
a 90% relative degradation. This is not a minor effect. Even with access to the full codebase in
context, the model's ability to find and fix bugs degrades catastrophically at scale.

Inference: having a million-token window and filling it with a codebase does not make the agent
effective. The agent needs structure to navigate that context -- file boundaries, module maps,
dependency indicators -- or its performance collapses.

## YABLoCo: very large real repositories

YABLoCo benchmarks code generation in C/C++ repositories ranging from 200K to 2,000K lines
of code. It explicitly includes context of dependencies at different levels and call graphs.

### YABLoCo data

| Measurement            |                                                  Value | Context                            |
| ---------------------- | -----------------------------------------------------: | ---------------------------------- |
| Test functions         |                                                    215 | Selected from 4 large repositories |
| Repository sizes       |                                         200K to 2,000K | Lines of code                      |
| Languages              |                                              C and C++ | Not covered by prior benchmarks    |
| Context types included | Metadata, dependency contexts, docstrings, call graphs | Multiple levels                    |
| Key challenge          |      Inter-function dependencies in large repositories | Cross-file context                 |

Source trace: R36, `paper-text/yabloco-2505.04406.txt`.

YABLoCo is relevant because it explicitly provides multiple levels of context (metadata, direct
dependencies, transitive dependencies, call graphs) and measures whether models can use them.
The benchmark design itself embodies the progressive disclosure principle: not all context is equally
useful, and the benchmark stratifies by how much dependency information is provided.

The existence of this benchmark confirms that the research community recognizes raw long context
is insufficient -- structured context at different granularities is needed for real repository work.

## Coding Agents as Long-Context Processors: tools beat attention

This paper makes the strongest argument for structured repository access over raw context windows.
It frames long-context processing as a file system navigation problem and shows that coding agents
with native tools outperform published state-of-the-art across multiple benchmarks.

### Coding Agents Long-Context data

| Benchmark           | Corpus size | Improvement over best published | Context                        |
| ------------------- | ----------: | ------------------------------: | ------------------------------ |
| BrowseComp-Plus     | 750M tokens |                            +11% | Relative                       |
| Oolong-Syn          | 536K tokens |                            +10% | Relative                       |
| Oolong-Real         | 385K tokens |                            +11% | Relative                       |
| LongBench           | 188K tokens |                             -1% | Competitive, slight regression |
| Natural Questions   |   3T tokens |                            +56% | Massive corpus                 |
| Average improvement |           - |                           17.3% | Across all benchmarks          |

Source trace: R40, `paper-text/coding-agents-long-context-processors-2603.20432.txt`.

The paper attributes effectiveness to two key capabilities:

1. **Native tool proficiency**: agents leverage executable code and terminal commands (grep, head,
   Python scripts) rather than passive semantic queries. This gives precise, executable interactions.

2. **File system familiarity**: agents trained on code repositories transfer hierarchical navigation
   skills to long-context text tasks. Directory structures provide natural chunking.

A surprising negative result: "equipping coding agents with standard retrieval tools does not
consistently improve performance." The agents develop their own task-specific strategies --
iterative query refinement for multi-hop retrieval, programmatic aggregation for analytical tasks.

Inference for codebase design: the repository file system IS the long-context interface. A well-
organized directory structure with clear naming, modular files, and predictable locations gives agents
a navigable structure that outperforms dumping everything into a flat context window.

## ContextBench: over-retrieval and under-utilization

ContextBench shows the problem from the agent's side: even with sophisticated retrieval, agents
pull too much context and fail to use what they find.

### ContextBench utilization gap

| Finding                      | Detail                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| Explored vs. utilized gap    | Agents inspect gold-relevant code but fail to retain or use it in patches |
| Recall vs. precision         | All LLMs favor recall (breadth) over precision (relevance)                |
| Cost of aggressive retrieval | Mainly increases token consumption without proportional success gains     |
| Balanced retrieval benefit   | Higher Pass@1 at lower cost than aggressive retrieval                     |

Source trace: R10, `paper-text/contextbench-2602.05892.txt`.

This connects to the long-context problem directly: even without window limits, the agent's
challenge is not ACCESSING information but USING it. A larger window means the agent can access
more, but if it already fails to utilize what it accesses in smaller windows, scaling the window alone
does not help.

## Explicit inference

1. **Attention is not uniform.** Lost in the Middle proves positional effects degrade utilization.
   This is a fundamental property of transformer attention, not a bug that will be easily fixed.
   Codebase design should not assume the model reads everything equally.

2. **Performance degrades catastrophically at scale.** LongCodeBench shows 90% relative
   degradation for Claude 3.5 Sonnet at 1M tokens. Having a large window is necessary but
   wildly insufficient for effective repository work.

3. **Tools outperform raw context.** Coding agents with file system access beat raw long-context
   baselines by 17.3% on average. The repository's directory structure and file organization are
   more effective than attention over flat text.

4. **The utilization gap is the real bottleneck.** ContextBench shows agents over-retrieve and
   under-utilize. The problem is not "can the agent see the code?" but "does the agent use what
   it sees?" Structure helps by reducing noise and highlighting relevant material.

5. **Progressive disclosure is the design pattern.** The converging evidence points to repositories
   exposing information in layers: a map at the top, module summaries at mid-level, implementation
   details at the leaf level. This matches how the most effective agents already navigate code.

## What this does not prove

- This does not prove that large context windows are useless. They are clearly better than small
  windows for many tasks. The claim is that they are insufficient without structure, not that they
  are unhelpful.

- Lost in the Middle is from 2023 and uses older models. Newer architectures (particularly those
  with improved positional encoding) may reduce the U-curve. However, some positional effect
  likely persists.

- The coding-agents-as-long-context paper uses off-the-shelf frontier coding agents. The results
  may not transfer to smaller or less capable models that lack strong tool-use training.

- LongCodeBench performance drops are model-specific. Newer models (post-2025) likely perform
  better, but the relative degradation with scale is likely still present.

- This does not prove that retrieval is always superior to long context. For some tasks (holistic
  code understanding, architectural analysis), having the full codebase in context may genuinely
  help. The claim is about the marginal utility of structure, not the absolute superiority of one
  approach.

## Codebase design for progressive disclosure

| Level                  | Content                                      | Agent use case                    | Artifact                             |
| ---------------------- | -------------------------------------------- | --------------------------------- | ------------------------------------ |
| L0: Root map           | Module names, boundaries, entry points       | Orient to codebase                | CLAUDE.md, generated tree            |
| L1: Module summaries   | Purpose, public API, dependencies            | Decide which module to enter      | README in each package, barrel files |
| L2: File documentation | Function signatures, type exports, contracts | Understand specific file          | JSDoc/TSDoc, type annotations        |
| L3: Implementation     | Full function bodies, logic                  | Make specific changes             | Source files                         |
| L4: History            | Commit messages, PR descriptions, changelogs | Understand intent of past changes | Git log, CHANGELOG                   |

The agent should be able to work at L0-L1 for most decisions and descend to L2-L3 only for the
files it needs to modify. If the codebase forces the agent to L3 for every decision (because there
are no type annotations, no module summaries, no clear boundaries), it will either overflow its
effective attention or waste tokens on irrelevant code.

## Blog visual candidates

1. LongCodeBench performance decay curve: performance vs. context length for multiple models.
2. Lost in the Middle U-curve: accuracy by document position.
3. Coding agents vs. raw context: bar chart of improvements across benchmarks.
4. Progressive disclosure pyramid: L0 (map) through L4 (history), with token budget at each level.
5. Two-panel comparison: flat context (everything loaded, model confused) vs. layered context
   (agent navigates structure, finds relevant files).

## References

- R10: ContextBench, `paper-text/contextbench-2602.05892.txt`
- R32: Lost in the Middle, `paper-text/lost-in-the-middle-2307.03172.txt`
- R36: YABLoCo, `paper-text/yabloco-2505.04406.txt`
- R37: LongCodeBench, `paper-text/longcodebench-2505.07897.txt`
- R40: Coding Agents are Effective Long-Context Processors, `paper-text/coding-agents-long-context-processors-2603.20432.txt`
