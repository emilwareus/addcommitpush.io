# Fact-check loop register (5 passes)

Date: 2026-08-05
Insight: `brain/insights/agent-harnesses/designing-learning-loops-in-harnesses.md`

Five independent subagent fact-check passes were run against primary sources. Findings
below were verified again against arXiv HTML / abstracts before editing.

## Pass summary

| Pass | Focus | Correct claims (approx) | Problems found |
| --- | --- | --- | --- |
| 1 | DGM, STOP, AlphaEvolve, ADAS, AFlow | 31 | 9 (OVERCLAIMED/PARTIAL) |
| 2 | Self-Harness, AHE, Lin, Meta-Harness | 36 | 3 (WRONG/OVERCLAIMED/PARTIAL) |
| 3 | ACE, MCE, foundations, Trehan/Bubeck | 28 | 3 (FALSE attribution / ADD-only / Sources gaps) |
| 4 | Weng, Anthropic, HF, OpenAI, Schmid, benches | 14 | 7 (WRONG/OVERCLAIMED/PARTIAL) |
| 5 | Full-file cross-audit of prior findings + new | agreed prior list | 2 NEW (2-attempt count; staging wording) |

## Corrections applied

1. **Weng lede:** “post-training” → intelligence after **pretraining**.
2. **Anthropic/OpenAI definition:** Anthropic = loop/tools/context/guardrails; do not
   attribute “persistent state” or that four-part list to OpenAI.
3. **HF scaffolding:** tool descriptions + response parsing, not just “schemas.”
4. **ACE Curator:** ADD delta entries; counters update at merge; no Curator UPDATE op.
5. **Self-Harness:** Pass averaged over **two** attempts (stated explicitly).
6. **AHE “manifesto” → “change manifest”** (paper term); full-89 evolution; Din/Dho gate
   is Self-Harness only; +5.1–10.1 pp are TB2 cross-family, not SWE.
7. **DGM:** Polyglot eval uses **o3-mini**; diagnosis uses separate **o1**; SWE staging
   10→60→200; open-ended ablation **23.0%** exact; paper settings not “typical.”
8. **STOP:** recursion `I_t = I_{t-1}(û, I_{t-1}, L)`; mean-curve degrade nuance + 12%
   GPT-3.5 run statistic.
9. **AlphaEvolve:** `# EVOLVE-BLOCK-START/END`; LLM ensemble proposes diffs (not “frozen”
   wording).
10. **ADAS/AFlow:** code representation (AFlow adopts code as primary edge structure).
11. **Trehan/Bubeck:** fabricated citations attributed to AI-Scientist line (Weng), not
    Trehan’s six modes; Bubeck = numerical duct tape.
12. **RE-Bench gloss:** agents 4× humans at 2h; humans ahead at 8h/32h.
13. **Challenge titles:** match Weng (“Context and memory lifecycle”, “Long-term success”,
    “The role of humans”).
14. **Sources:** add Bubeck (2511.16072) and Continual Harness (2605.09998); fix Anthropic
    title.
15. **Template intro:** no longer claims AHE shares Din/Dho accept rule.

## Rechecked numbers that stayed correct

- Self-Harness relative lifts +53/+60/+33 (recomputed)
- Self-Harness absolute held-out/held-in table
- AHE 69.7→77.0, Codex 71.9, Hard 53.3 vs 56.7, fix/reg precision
- DGM 20→50 / 14.2→30.7 / 14.0→38.0, λ=10, α0=0.5, k=2/4, greedy 39.7%
- ACE +10.6 / +8.6 / 86.9% latency
- AHE seed system prompt non-deletable
- STOP COLM 2024; ACE ICLR 2026 venues

## Intentionally not changed

- Nested-loop taxonomy and design principles (synthesis, not paper claims)
- Worked accept/reject example (illustrative)
- Soft product mapping rows (design guidance)
