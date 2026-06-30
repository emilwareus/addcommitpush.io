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
   be educational, source-backed, readable research articles with useful tables,
   diagrams, examples, and pseudocode where appropriate.
5. Promote only evidence-backed findings. Keep weak reports as archived
   research, not as proof.
