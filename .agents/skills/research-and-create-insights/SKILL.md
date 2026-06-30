---
name: research-and-create-insights
description: Use when an agent should perform deep research and turn it into durable brain insights. This skill delegates research mechanics to dr-deep-research and points to the brain writing rules.
---

# Research And Create Insights

Use this when the user wants researched knowledge turned into `brain/insights/`
notes.

1. Use `.agents/skills/dr-deep-research/SKILL.md` for the research workflow.
   Creating an insight should usually involve substantial research, not one
   quick lookup. Prefer many focused `dr` reports over one giant report. Run
   multiple rounds, inspect gaps, and use parallel report runs when rate limits
   permit.
2. Do not write the insight after the first report unless the topic is genuinely
   tiny. For normal insight work, research definitions, prior art, mechanisms,
   benchmarks, counterevidence, implementation details, and caveats before
   writing.
3. Store every `dr` report in `brain/inbox/dr/<date-or-topic>/` and commit
   those reports. Follow `brain/AGENTS.md`. Never delete old research reports.
4. Create or update insights using `brain/insights/AGENTS.md`. Insights should
   be dense, source-backed, expert-facing research notes with useful tables,
   diagrams, worked examples, hard data, and pseudocode where appropriate. The
   target is closer to a peer-reviewed technical paper than a summary.
5. When the subject involves algorithms, benchmarks, measurements, or datasets,
   use executable analysis where it improves correctness: write small scripts,
   recompute numbers, simulate algorithms on toy inputs, extract structured
   tables, or validate pseudocode against examples. Keep temporary work under
   `.context/` and promote durable evidence into `brain/inbox/`, `brain/sources/`,
   or `brain/assets/`.
6. For broad or high-stakes insight work, run a review loop before finishing:
   mechanism pass, evidence pass, failure/edge-case pass, density pass, and
   reader pass. If the note still reads like a table of contents, continue
   researching or narrow the claim.
7. When the user explicitly asks for subagents or parallel review, use them for
   independent research lanes, hard-data gathering, and skeptical review. Do not
   let subagents edit the same insight files unless their write scopes are
   disjoint.
8. Promote only evidence-backed findings. Keep weak reports as archived
   research, not as proof.
