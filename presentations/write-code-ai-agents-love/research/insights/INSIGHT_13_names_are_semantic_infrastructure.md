# INSIGHT 13: Names Are Semantic Infrastructure

## Claim

Names are not style polish. For coding models, identifiers are part of the machine-readable semantic interface.

## Evidence

- CodeT5 introduces identifier-aware pretraining because developer-assigned identifiers preserve rich code semantics.
- "How Does Naming Affect LLMs on Code Analysis Tasks?" finds that nonsense or misleading variable, method, and function names significantly affect LLM-based code analysis.
- "When Names Disappear" shows that semantics-preserving obfuscation degrades intent-level summarization and can also hurt execution-oriented tasks.
- ToolGen shows repository generation failures include undefined-variable and no-member errors; visible valid identifiers help reduce these failures.

## Technique

- Use precise domain nouns and verbs.
- Keep terminology consistent across code, tests, docs, issues, and API schemas.
- Avoid misleading names, clever abbreviations, overloaded terms, and generic `utils` modules.
- Name tests by observable behavior.
- Give exported symbols stable names; changing public names has agent-readability cost as well as API cost.

## Caveat

Names can mislead. A wrong name can be worse than a short name because it supplies a false semantic cue.

## References

R29, R50, R51, R65, R66.
