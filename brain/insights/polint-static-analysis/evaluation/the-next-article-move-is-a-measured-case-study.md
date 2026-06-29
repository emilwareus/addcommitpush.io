---
type: insight
title: "The Next Article Move Is A Measured Case Study"
slug: the-next-article-move-is-a-measured-case-study
created: 2026-06-29
status: working
publish: true
tags:
  - evaluation
  - ai-agents
  - writing
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[static-analysis-for-agents-needs-policy-fixtures]]"
  - "[[repo-local-policy-needs-an-agent-repair-benchmark]]"
  - "[[repo-local-rules-need-a-trust-boundary]]"
---

# The Next Article Move Is A Measured Case Study

The research corpus is now broad enough. More general background will have
diminishing returns. The next useful work is a measured `polint` case study.

## Claim

Before writing the final article, run one small experiment:

> Give an AI agent the same repo-local policy task under different feedback
> conditions and measure whether `polint` changes the repair.

That result can become the article's spine.

## Why This Is Next

The existing notes already cover:

- static-analysis landscape;
- custom-rule prior art;
- AGENTS.md/prose limitations;
- AI feedback-loop evidence;
- call graph and data-flow foundations;
- diagnostics, unknowns, budgets, and provenance;
- trust boundaries and output formats.

The weakest remaining claim is empirical:

> `polint` helps agents do the right thing in a repo.

That cannot be solved with more citations. It needs a small run.

## Minimal Study

Use one fixture repo and one policy:

```text
Policy: UI code must use generated API client, not raw fetch.
Task: Add a customer details panel.
Violation risk: agent reaches for fetch('/api/customer/:id').
Expected repair: use CustomerClient.getCustomer.
```

Run four conditions:

1. no local policy;
2. policy in `AGENTS.md`;
3. policy as review-comment style instruction;
4. policy enforced by `polint` diagnostic after first patch.

Measure:

- did the patch violate policy initially?
- did the final patch satisfy policy?
- how many iterations?
- did tests pass?
- how many unrelated lines changed?
- did the agent create a workaround?

## Article Shape After The Study

The article can open with the case study:

1. The agent made a plausible local-policy mistake.
2. Prose helped sometimes, but not reliably.
3. The diagnostic created a precise repair target.
4. That led to the thesis: checkable local policy should be executable.

Then the rest of the article explains the engine and prior art.

## What Not To Do Next

Do not start by writing a grand history of static analysis. The research is
ready enough for that. The risky missing piece is the concrete demonstration.

Do not overbuild a benchmark harness first. A single reproducible fixture with
clear transcripts is enough to make the first article stronger.

## Caveats

One case study is not proof. It is a concrete example plus a research direction.
The article should describe it as evidence, not as a benchmark victory.

## Next Test

Create a `polint-agent-fixture` scratch repo under `.context/` with:

- a tiny TS frontend module;
- generated client helper;
- one `polint` rule;
- one failing seeded task;
- transcripts for the four feedback conditions.

If the result is interesting, promote the fixture into a public companion repo
or an appendix in the article.
