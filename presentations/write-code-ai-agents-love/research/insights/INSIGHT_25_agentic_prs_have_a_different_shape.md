# INSIGHT 25: Agentic PRs Have a Different Shape

## Working conclusion

Agent-written code is no longer anecdotal. AIDev makes it visible at ecosystem scale, and the
agent-vs-human PR paper suggests agentic patches have a different statistical shape. That matters
for codebase design because review, CI, lint, ownership, and test strategy should be built around
the edits agents actually make, not around an imaginary perfectly careful maintainer.

The most useful talk framing: agents are productive but differently biased contributors.

## Hard data

| Source | Data point | What it suggests |
|---|---:|---|
| AIDev | 932,791 Agentic-PRs | Agentic PRs are large enough to study as a real phenomenon. |
| AIDev | 116,211 repositories, 72,189 developers | The behavior is not one project or one tool. |
| AIDev | Curated subset: 33,596 PRs from 2,807 repos with >100 stars | There is enough higher-signal data for empirical follow-up. |
| How AI Coding Agents Modify Code | 24,014 merged Agentic PRs vs 5,081 human PRs | Direct comparative study of merged patches. |
| How AI Coding Agents Modify Code | Cliff's delta: commits 0.5429, files touched 0.4487, deletions 0.4462 | Agentic and human PRs differ in practical patch shape. |
| How AI Coding Agents Modify Code | CodeBERT similarity 0.9356 agentic vs 0.9285 human | Agentic code is slightly more similar to surrounding code by embedding metrics. |
| Readability agents | Readability-related commits are about 0.3% of all agent commits | Agents rarely focus explicitly on readability. |
| Readability agents | Logic complexity 42.4%, documentation 24.2% | When they do, they target complexity/docs more than naming/formatting. |
| Readability agents | Maintainability Index deteriorates in 56.1%, LOC increases in 71.5%, CC increases in 42.7% | "Readability" intent does not guarantee structural improvement. |

Plot-ready data: `research/data/agentic_pr_change_shape.csv`.

## Notes

The AIDev dataset is useful mostly because of scale. It means we can stop relying only on personal
vibes about agent PRs. There are now hundreds of thousands of PRs attributable to tools like Codex,
Devin, Copilot, Cursor, and Claude Code.

The "How AI Coding Agents Modify Code" result is more actionable. The Cliff's deltas suggest
agentic and human PRs differ in commits, files touched, deletions, and line changes. I want to be
careful with directionality because the exact medians matter, but the practical result is enough for
the talk: agentic PRs have a measurable patch-shape signature. Review systems should watch the
shape, not only the final diff.

The readability paper is the warning label. Even commits selected by readability-related keywords
often increase code volume and reduce static maintainability metrics. That does not mean the
changes are always bad; metrics are imperfect. But it does mean "the agent cleaned it up" should not
be accepted without structural checks.

This insight supports the custom lint and structural-oracle arguments. If agents are a new class of
contributor, the repo should add feedback loops suited to their failure modes: no raw API calls,
no generated-code edits, no boundary violations, no broad exception swallowing, no test-only
helpers in production, no risky search-and-replace refactors without rules/tests.

## Relevance to code patterns

- Treat agent PRs as high-throughput but biased.
- Use PR templates that ask for reproduction, tests, and boundary impact.
- Use static checks for patterns agents tend to bypass.
- Keep generated clients, schemas, and policy rules in the same repo so review sees the whole diff.
- Track diff shape: files touched, deletion/addition ratio, generated files changed, tests changed,
  public API changed.

## Caveats

Agentic PR attribution is inherently noisy. Some PRs are human-guided, some are partially agentic,
and tools differ. The claim should be about observed aggregate signals, not a universal law of all AI
patches.

Readability metrics are imperfect and can penalize legitimate expansion. Use them as a warning
signal, not as a sole quality oracle.

## References

R69, R70, R76.

