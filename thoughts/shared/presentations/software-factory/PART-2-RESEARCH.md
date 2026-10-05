# Part 2: Code in an AI-native way

Research for the software factory deck, 5 October 2026. Sources: Emil's blog, brain insights, earlier decks, the deck outline, and the OAIZ repo (dev5, skills, incidents, GitHub labels).

## Thesis

Part 1 made the repo a place where an agent can do good work. Part 2 moves the loop off your keyboard: the agent runs orient, retrieve, edit, verify on its own, in parallel, against real evidence. The human stays on two gates: what goes in, and what ships.

Emil's own lines:

- "The end goal is autonomy: agents research, plan, implement, and review; humans decide what should ship. We do not get there by writing longer prompts." (`blog/write-code-that-ai-loves/blog.md:45`)
- "You onboard your agent 100 times a day. Make it VERY easy." (`blog.md:136`)
- "The useful tools are the ones the agent can run after an edit." (`blog.md:768`)
- "Running multiple SpecDD flows at the same time... like spinning plates, is the new name of the game" (`components/blog-posts/context-engineering-claude-code.tsx:521-525`)
- "That frees the review for the questions worth my time: Does this solve the problem the user actually has?" (`blog/the-rules-of-vibe-coding/blog.md:617-626`)

Bridge to Part 3: Part 2 frees capacity and attention. Part 3 decides where they go.

## Slides

The four slides map one-to-one to the "More" region of the leverage bar: coding and feedback loops, SpecDD, server, production visibility. Same grammar as Part 1: one claim, one picture that proves it, one link at the top.

### 2.1 Feedback loops: self-verification and the outer loop

- Claim: **The agent checks its own work. Every correction makes the next task better.**
- Inner loop (self-verification): edit, run the checks, read the failure, fix, until green, then a PR. The evaluator is real: tests, types, lint, the running app. Failure mode to name: an agent declaring success without an artifact check.
- Outer loop (learning): next task, inner loop, your review, correction, learn, back to the next task. Each correction becomes durable state: a lint rule, a test, an AGENTS.md line, a skill. Instruction files are outer-loop state, not documentation.
- Real OAIZ outer loop: `dev5-learn` classifies every human fix on a dev5 PR (code, plan, research, docs, linear issue, human) and proposes a durable artifact. Postmortem to `AGENTS.md:130` rule; review fixes to polint rule PRs (most still open, so "proposed by the loop").
- Source: the nested-loop model in `/brain/designing-learning-loops-in-harnesses` (inner, outer, meta, joint). Keep to inner and outer on the slide.
- Link: https://addcommitpush.io/brain/designing-learning-loops-in-harnesses
- Overlap: this now owns the learning loop. Part 3's last slide should not repeat it; Part 3 stays on product decisions.

### 2.2 SpecDD: find the hard decision before the diff

- Claim: **Find the hard decision in the research, not in the diff.**
- Real example, OAIZ-2310 (PR #4227, merged 2026-09-12): research doc 301 lines, plan 174 lines, production diff +2/-2, tests +100. The research settled the hard call before any code:
  > "Do not broadly swallow inside `useEvents`; explicit callers must continue receiving the original non-session rejection... Do not report again from `EventTable`; `getEvents` already logs the request failure before rethrowing, so a second component report would duplicate observability."
- Picture: the dev5 sequence with the artifact each stage writes (research, plan, implement, validate, code review, security review, ready for human review). Size the artifacts to scale: big research, big plan, tiny diff. Highlight the decision quote under research.
- Detail worth one spoken line: research and plan are critiqued by a different model family; the plan gate refuses to ship after 5 failed rounds ("it does not silently ship an unreviewed plan").
- Evidence (spoken): CODETASTE, GPT-5.2 at 69.6% alignment with an instructed spec vs 7.7% open track. Caveat: planning alone only reaches 14.1%, so claim "a grounded spec", never "planning solves it".
- Credit: Dex and Vaibhav (AI That Works) for the research, plan, implement shape.
- Link: https://addcommitpush.io/brain/feature-work-fails-at-planning-and-constraints
- Avoid: canonical examples as specs (Part 1); the 30% autonomy figure (unverified).

### 2.3 Get a server: spend tokens, save attention

- Claim: **Spend tokens. Save your attention.**
- Real setup (`oaiz/dev5/README.md`): one VM, a control plane that starts one container per task, each on its own git worktree, prebuilt with Claude Code, Codex and Cursor CLIs. The runner picks the subscription with the most remaining quota. Deploys snapshot running tasks and resume them.
- Real output: every task ends as a PR with fixed sections (Context, What Changed, Why This Approach, Review Guide, Architecture, Click Test Guide, Risks) and the label `dev5::ready-for-review`.
- Real numbers (GitHub labels, OAIZ only): 744 dev5 PRs since 2026-03-16, at most 24 opened in one day. Say "opened", not "merged".
- Picture: one server, several isolated workspaces (worktree, tools, checks), each ending in a handoff the engineer reads: decision needed, blocked, or ready for review. The engineer's side is the narrow part.
- Why: setup is the first task an unattended agent hits (SetupBench / Installamatic, 35-62% bootstrap failure; `/brain/setup-is-part-of-the-task`). More parallel output needs more review capacity; say it.
- Link: https://addcommitpush.io/brain/setup-is-part-of-the-task
- Avoid: deployment internals, GCP identifiers, quota mechanics on the slide.

### 2.4 Give the agent visibility into production

- Claim: **Give the agent read-only eyes on production, and tell it to look.**
- Strongest real line, from OAIZ's own postmortem (`thoughts/shared/incidents/2026-08-03-wildcard-template-validation-postmortem.md`):
  > "An agent with production read access and no instruction to use it will not use it."
  The blast radius was "one SQL query away": 4 organisations, 53 rows. Undetected for 50 hours.
- Real guardrails (`.claude/skills/oaiz-prod-db`, `scripts/prod-ro.sh`): replica only (refuses to run against primary), SELECT-only role, read-only transactions, 30 s statement timeout, PII class check before echoing values.
- Real outcome: the postmortem became a rule in `AGENTS.md:130` ("Tightening a validator... is retroactive... Audit production with `scripts/prod-ro.sh` first").
- Picture: symptom, trace, read-only query, local reproduction, test. Guardrails drawn as the boundary around the data step.
- Link: no brain insight covers this yet. Write one (working title "Production read access is agent infrastructure") or link nothing on this slide.
- Avoid: credentials, customer names, org IDs, anti-MCP claims (Grafana and Sentry run through MCP).

## Optional fifth slide

Review is the bottleneck: "Review time goes to: should this ship?" Strong but overlaps the lint slide and Part 3. Use it only if Part 2 feels short. The learning loop now lives on 2.1. Only 6 of 81 `dev5::learning` PRs are merged, so call unmerged ones "proposed by the loop".

## Timing

About 13 minutes: loop 2, SpecDD 4, server 3, visibility 4.

## Assets to capture before the talk

- Screenshot of PR #4227 with labels and the rendered architecture diagram.
- The dev5 task UI showing several tasks running at once.
- Terminal output of `scripts/prod-ro.sh` refusing to run against the primary.

## Redact

Customer names (OAIZ-2535 research, the Crisp RFO, the pinmeto deal doc), GCP project and registry paths, role and connection names, private repo URLs, Linear links, author names in frontmatter, org UUIDs.
