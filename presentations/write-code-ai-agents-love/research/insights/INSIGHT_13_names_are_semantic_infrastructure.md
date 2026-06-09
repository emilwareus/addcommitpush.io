# INSIGHT 13: Names Are Semantic Infrastructure

Names are not style polish. For coding models, identifiers are part of the machine-readable
semantic interface. Developer-assigned identifiers carry rich code semantics that models rely on
for understanding, retrieval, and generation. When names are nonsensical, misleading, or
obfuscated, model performance degrades significantly -- not just on intent-level tasks like
summarization, but also on execution-oriented tasks that should theoretically depend only on
program structure.

## Source map

| Ref | Source | Local text | Role in this insight |
|---|---|---|---|
| R50 | CodeT5 | `paper-text/codet5-identifier-aware-2109.00859.txt` | Identifier-aware pretraining; identifiers preserve rich code semantics. |
| R65 | How Does Naming Affect LLMs on Code Analysis Tasks? | `paper-text/naming-affects-llms-code-analysis-2307.12488.txt` | Nonsense/misleading names significantly degrade LLM code analysis. |
| R66 | When Names Disappear | `paper-text/when-names-disappear-2510.03178.txt` | Semantics-preserving obfuscation degrades intent summarization and even execution tasks. |
| R51 | ToolGen | `paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt` | Undefined-variable and no-member errors from invisible identifiers. |
| R29 | CodeBERT | `paper-text/codebert-2002.08155.txt` | Foundational NL+code representation; descriptive names/docs as retrieval signals. |

## CodeT5: identifier-aware pretraining

CodeT5 (Salesforce Research, 2021) introduces a novel identifier-aware pre-training objective.
The core motivation is stated explicitly:

> "When writing programs, developers tend to employ informative identifiers to make the code
> more understandable, so that these identifiers would generally preserve rich code semantics,
> e.g., the 'binarySearch' identifier in Figure 2 directly indicates its functionality."

Source trace: R50, `paper-text/codet5-identifier-aware-2109.00859.txt`, lines 68-69.

### CodeT5 pre-training tasks

| Task | What it teaches |
|---|---|
| Identifier-aware masked span prediction | Distinguishes identifiers from other tokens |
| Identifier recovery | Learns to predict identifier tokens specifically |
| Bimodal dual generation (NL-PL) | Aligns natural language descriptions with code identifiers |

### Results from the paper

CodeT5 significantly outperforms prior methods on CodeXGLUE benchmark across 14 sub-tasks
including:
- Code defect detection
- Clone detection
- Code summarization (PL -> NL)
- Code generation (NL -> PL)
- Code translation (PL -> PL)
- Code refinement

The identifier-aware objective is what distinguishes CodeT5 from prior work like CodeBERT.
The model learns that identifiers are semantically special tokens -- they carry naming intent from
the developer.

### Identifier masking example from the paper

The paper illustrates two masked prediction modes:
1. Standard span masking: masks arbitrary tokens
2. Identifier-only masking: masks only identifier tokens (function names, variable names)

The model trained with identifier-aware objectives recovers identifiers more accurately,
confirming that it has learned to treat identifiers as semantically privileged tokens.

## Naming affects LLMs: controlled degradation study

"How Does Naming Affect LLMs on Code Analysis Tasks?" (Penn State, 2023-2024) provides
the most controlled evidence. The paper creates datasets where variable, method, and function
names are systematically replaced with nonsense or misleading alternatives.

### Taxonomy from the paper

| Feature type | Definition | Impact on program logic |
|---|---|---|
| Literal features | Variable names, function names, annotations | None (removable without changing functionality) |
| Logical features | Keywords, operators | Controls program behavior |

Source trace: R65, `paper-text/naming-affects-llms-code-analysis-2307.12488.txt`, lines 145-150.

### Experimental design

- Model: CodeBERT (fine-tuned) and ChatGPT (case study)
- Tasks: Code search, clone detection
- Manipulation: Replace variable names or method/function names with nonsense strings or
  misleading names
- Eight dataset variants: {variable, method/function} x {nonsense, misleading} x {code search,
  clone detection}

### Key findings

The experimental results show "naming has a significant impact on the performance of code
analysis tasks based on LLMs, indicating that code representation learning based on LLMs
heavily relies on well-defined names in code."

Source trace: R65, lines 90-93.

Specific observations:
- Nonsense names degrade performance because the model loses semantic signal
- Misleading names degrade performance even more because the model follows false cues
- Method/function names have stronger impact than variable names (they carry higher-level
  semantic information about purpose)

The paper notes that "instances such as code generated from decompilation or non-conventional
code naming might yield reduced accuracy, as LLMs' generalization ability is limited to the
patterns and examples present in their training data."

## When Names Disappear: obfuscation reveals naming dependence

"When Names Disappear" (FPT Software AI Center + UT Dallas, 2025) uses a principled suite
of semantics-preserving obfuscations to disentangle structural understanding from naming cues.

### Obfuscation spectrum

| Level | Method | Disruptiveness |
|---|---|---|
| 1 | Alpha-renaming (role-preserving placeholders) | Minimal |
| 2 | Ambiguous identifiers (visually confusable tokens) | Moderate |
| 3 | Cross-domain terms (unrelated field terminology) | High |
| 4 | Misleading semantics (names implying wrong behavior) | Maximum |

Source trace: R66, `paper-text/when-names-disappear-2510.03178.txt`, lines 44-48.

### Three core observations from the paper

1. **Intent-rich code degrades sharply.** On real-world code (where names carry domain
   semantics), class- and method-level summarization degrades sharply under strong
   obfuscation, "often collapsing into line-by-line narration."

2. **Algorithmic code is more robust.** On competitive-programming solutions (where
   identifiers are already minimal and structure is highly diagnostic), summaries remain
   intent-faithful under obfuscation.

3. **Even execution tasks are affected.** "Even execution-oriented tasks -- ostensibly dependent
   only on program semantics -- show non-trivial drops after obfuscation, suggesting that
   existing benchmarks permit shortcuts in which identifiers act as retrieval cues for memorized
   patterns rather than triggering genuine reasoning."

Source trace: R66, lines 55-61.

### MinesweeperGame example from the paper

The paper demonstrates with a MinesweeperGame class:
- With original names: summary correctly identifies "mine sweeping games"
- With alpha-renamed names (Class1, var1, method1): summary becomes a generic grid-based
  description, losing domain-specific understanding

This illustrates that LLMs use identifier names as semantic anchors for understanding purpose.

### Implication for agent-friendly codebases

If even execution prediction tasks degrade under obfuscation, then naming is not just about
human readability. It is part of the machine-readable semantic interface. Agents that need to:
- Understand what code does (for localization)
- Retrieve relevant code (for context)
- Generate compatible code (for implementation)

...all depend on names carrying accurate semantic signal.

## ToolGen: visible identifiers prevent dependency errors

ToolGen (NTU Singapore, 2024) targets a specific failure mode: undefined-variable and
no-member errors in repository-level code generation. The paper shows that more than 70%
of functions in real repositories are not standalone -- they depend on repository-level symbols.

### ToolGen results copied from the paper

| Metric | Improvement range across 3 LLMs |
|---|---:|
| Dependency Coverage | +31.4% to +39.1% |
| Static Validity Rate | +44.9% to +57.7% |
| Pass@1 (CoderEval, CodeT5) | +40.0% |
| Pass@1 (CoderEval, CodeLlama) | +25.0% |

Source trace: R51, `paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt`, lines 78-86.

### The naming connection

ToolGen works by making accessible identifiers visible to the model through autocompletion
tools. When the model encounters `self.`, the tool provides 68 accessible attributes. Without
the tool, CodeLlama predicts `_updates` (no-member error). With the tool, it can find the
correct `_registered_updates`.

The implication: if your codebase uses clear, discoverable naming conventions, the agent
(or its autocompletion tools) can find the right symbol. If names are abbreviated, inconsistent,
or hidden behind dynamic dispatch, the agent cannot propose them.

## Inference for codebase design

| Naming practice | Agent benefit | Evidence source |
|---|---|---|
| Precise domain nouns and verbs | Models use names as semantic anchors for understanding | R66, R50 |
| Consistent terminology across code/tests/docs/APIs | Reduces retrieval noise; same concept has same name everywhere | R65 |
| Avoid misleading names | Misleading names cause worse performance than no names at all | R65 |
| Avoid generic `utils` modules | Generic names provide no semantic signal for retrieval | R50, inference |
| Name tests by observable behavior | Test names serve as specifications for code understanding | Practitioner signal |
| Stable exported symbol names | Changing names breaks agent retrieval across repo boundaries | R51, inference |
| Avoid clever abbreviations | Models have seen standard terms; abbreviations may not be in vocabulary | R65, R66 |

### The directional argument

The evidence establishes a clear direction:
- Good names -> model understands intent -> correct generation/retrieval
- Bad names -> model loses semantic signal -> degraded performance
- Misleading names -> model follows false cues -> actively wrong behavior

This is not merely a human-readability concern. It is a machine-semantic-interface concern.
The model treats names as part of its input signal, not as cosmetic decoration.

## What I should not claim

- I should not claim that good names alone are sufficient for good generation. Names help
  understanding but do not replace structural context, type information, or test validation.
- I should not claim all naming effects are equal. Method/function names matter more than
  local variable names (R65). Class names matter more in intent tasks than in execution tasks
  (R66).
- The "When Names Disappear" paper shows that competitive programming code (minimal
  names, strong structural patterns) is relatively robust to obfuscation. This means naming
  matters most in domain-rich, real-world code -- which is precisely what agents work with.
- CodeT5 is from 2021 and uses encoder-decoder architecture. Modern decoder-only models
  may have different sensitivity to names. However, the 2024-2025 papers (R65, R66) confirm
  the effect persists in GPT-era models.
- I should not claim that naming conventions need to be enforced with tooling to help agents.
  The evidence shows names matter; whether lint rules for naming conventions improve agent
  outcomes has not been directly measured.

## Blog visual candidates

1. Obfuscation spectrum diagram: original -> alpha-rename -> ambiguous -> cross-domain ->
   misleading, with performance degradation curve.
2. MinesweeperGame before/after example from R66: clear visual of how the model loses
   domain understanding.
3. ToolGen autocompletion example: `self.` with 68 suggestions, showing how visible names
   prevent errors.
4. Naming impact matrix: {variable, method/function} x {nonsense, misleading} -> performance
   delta.
5. CodeT5 identifier masking illustration: how the model learns identifiers are special.

## References

- R29: CodeBERT, `paper-text/codebert-2002.08155.txt`
- R50: CodeT5, `paper-text/codet5-identifier-aware-2109.00859.txt`
- R51: ToolGen, `paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt`
- R65: How Does Naming Affect LLMs on Code Analysis Tasks?, `paper-text/naming-affects-llms-code-analysis-2307.12488.txt`
- R66: When Names Disappear, `paper-text/when-names-disappear-2510.03178.txt`
