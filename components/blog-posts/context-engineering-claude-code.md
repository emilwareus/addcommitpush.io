Context engineering is the deliberate structuring and compacting of information so agents can think clearly, act decisively, and remain reproducible.

In practice, that means moving away from cramming everything into a single prompt and toward a system where workflows are orchestrated, analysis is specialized, and context-bloating tasks are offloaded. This note distills a working architecture built around three layers:

- Commands: reproducible and more deterministic workflows
- Sub-agents: context compression


## Who is this article for? 

You have already spent more on AI coding tools the last 6 months than any other tools in you 10 year coding career. You have done a few passes on the CLAUDE.md file, used a few MCP tools, and but realized this didn't speed you up as much as you wished.

But first, this is not my ideas! I stole with pride! Please check out the source at https://github.com/ai-that-works/ai-that-works/tree/main/2025-08-05-advanced-context-engineering-for-coding-agents and watch the video at https://www.youtube.com/watch?v=42AzKZRNhsk. 

TODO: Find their names and add proper thanks. 

## The Four-Phase Pipeline

The main part of this approach is a repeatable pipeline that keeps cognitive load low while producing durable artifacts at every step. You move fast, with traceability:

- Research → Plan → Implement → Validate: four phases that mirror how real work actually happens.
- Each phase produces an artifact (research doc, plan, implementation changes, validation report).

Concretely, a research command spawns focused sub-agents in parallel, compacts their findings, and writes a document with file:line references, search results, architecture insights, etc. The planning command consumes only that synthesized document (not the entire codebase, but can also explore a bit if needed), proposes options, and captures the final plan. Implementation follows the plan while adapting to reality, and validation confirms the result with both automated checks and a short human review. Implement and validate incrementally, one phase at a time.

## Commands: Workflow Orchestration

Commands encapsulate repeatable workflows. Each orchestrates a complete workflow, spawning specialized agents and producing git-tracked artifacts. Core commands:

| Command | Purpose | Output |
| --- | --- | --- |
| [research_codebase](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/research_codebase.md) | Spawns parallel agents (locator, analyzer, pattern-finder, web-search-researcher) to explore codebase and web. Reads mentioned files fully before delegating. | thoughts/shared/research/ YYYY-MM-DD_topic.md |
| [create_plan](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/create_plan.md) | Reads research + tickets, asks clarifying questions, proposes design options, iterates with user, writes spec with success criteria. | thoughts/shared/plans/ feature-name.md |
| [implement_plan](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/implement_plan.md) | Executes approved plan phases sequentially, updates checkboxes, adapts when reality differs from spec, runs build/lint/typecheck per phase. | Code changes + updated plan checkboxes |
| [validate_plan](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/commands/validate_plan.md) | Verifies all automated checks (build, lint, types), lists manual test steps, analyzes git diff, identifies deviations from plan. | Validation report with pass/fail + next steps |


I urge you to press the links, and read through these commands.

## Specialized Agents

Agents are narrow professionals with minimal tools and clear responsibilities, and most importantly **its own context window**. Instead of one agent doing everything, use small experts that return high-signal, low-volume context:

- Locator: finds where code lives using search tools; returns structured file locations without reading content.
- Analyzer: reads relevant files end-to-end, traces data flow, and cites exact file:line references.
- Pattern Finder: surfaces working examples from the codebase, including test patterns and variations.
- Web Search Researcher: finds relevant information from web sources using strategic searches; returns synthesized findings with citations and links.
- Additional subagents for tools: Instead of MCP servers that clog the main contenxt, write targeted bash scripts and a subagent that can use them. Follow-up post coming in this!


The key is constraint: each agent does one job well and returns only what the next phase needs. The subagent can fail, hit 404 pages, forget which directory it is in, etc., and all that noise will not pollute the main context. It just outputs clean, summarized findings to the main agent that doesn't need to know about all the failed file reads.

| Agent | Tools | Returns |
| --- | --- | --- |
| [codebase-locator](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/codebase-locator.md) | Grep, Glob, LS | WHERE code lives: file paths grouped by purpose (impl, tests, config, types). No content analysis. |
| [codebase-analyzer](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/codebase-analyzer.md) | Read, Grep, Glob, LS | HOW code works: traces data flow, explains logic, cites exact file:line, identifies patterns. |
| [codebase-pattern-finder](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/codebase-pattern-finder.md) | Read, Grep, Glob, LS | Examples to model after: finds similar implementations, extracts code snippets, shows test patterns. |
| [thoughts-locator](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/thoughts-locator.md) | Grep, Glob, LS | Discovers docs in thoughts/ directory: past research, decisions, plans. |
| [thoughts-analyzer](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/thoughts-analyzer.md) | Read, Grep, Glob, LS | Extracts key insights from specific thoughts documents (historical context). |
| [web-search-researcher](https://github.com/emilwareus/addcommitpush.io/blob/main/.claude/agents/web-search-researcher.md) | WebSearch, WebFetch | External docs and resources (only when explicitly asked). Returns links. |


## The workflow

This workflow is at its best when the thing you are developing is pretty well scoped, you have a rough idea of how you want to do it, can have some complexity it in, and requires a bit more code to solve. "More code" depends on you codebase, but for me this typically lands at 1-3K in a go/ts codebase, 5-30 non-test file changes or so. Less then that, go straight to cursor, if it is bigger you need to break the problem into small pieces. 


To start the research, I typically write something like this: 

`/research_codebase`, the command with respond with "what would you like to research". 

```
Your goal is to research how to implement a reset password feature, both frontend and backend. This should go in service @backend/internal/user/ service, with handler, http port, domain logic, and interacting with the database adapter. Make sure to add unit tests in the domain layer, and compontent tests for the port. Follow the patterns in @backend/ARCHITECTURE.md. 

For the frontend, research and architecture and implementation that is in line with @frontend/src/features/login/. Follow @forntend/ARCHTIECTURE.md guidelines and patterns. 
```

This is typically enough to get a very good initial research document that contians file references to all relevant files, and target architecture. Critically, the command also adds "What not to do" to the research document which helps guiding claude in the right direction without detours. 

Now, to the most important part. You need to review the research document closely! Did it find all relevant files to the problem? Does the target archtiecture look reasonable? Agree with the "what not to do"? In 50% of the cases I go in and add/alter/remove something from these files. I typically use cursor with a powerfull model, or legacy-keyboard-keys (manually) to alter the document.

When you are happy, go to planning!

`/create_plan create a plan for @PATH_TO_RESEARCH. ADITIONAL_INSTRUCTIONS, like "make it 4 phases", "make sure to add e2e tests in the frontend to the plan", etc..`. You can also add "think deeply", which will burn more tokens for a bit higher accuracy. Do not use "ultrathink", we dont have enough electricity for that token burner (+ it uses the main context to explore).


This will create a plan document. You should review this as well! Does the phases make sense? Go over the targeted changes, etc.. I sometimes create multiple plans from one research document, or do multiple research and combine that into the one plan.


Time for the fun part! Now you just go into the implemnt/validate loop.

`/implement_plan implement phase 1 of plan @PATH_TO_PLAN based on research @PATH_TO_RESEARCH.` and when it is done, before I look at the code, I run: 
`/validate_plan validate phase 1 of plan @PATH_TO_PLAN. Remember to check things off in the plan and add comments about deviations from the plan to the document.`

I run this in a loop until all phases are complete, and validation on more time on the full plan. I look a bit at the code between each iteration, makes sure it makes sense. Maybe guides the AI in the correct direction if needed. I typically want "working software" in each phase, more or less all tests pass and no lint-errors. Sometimes it misses some implementations of an interface or sometime, the validation catches that as it should run your linters etc. 


I typically have two different git-management ways for this. Option one: commit each iteration. Option two: Just work with staged to make it easy to see the diffs. Do whatever feels best for you.


In my experience, this flow completely 1-shots (after research/plan refiniements) 2-5 such features per day. I run up to 3 in parrallel, where one of them is a more "big hairy" problem, and the other 2 are simpler and more straight forward. In the future, I want to make this a "linear workflow", where humans gather information into linear issues (the initial research prompts), and by moving the issues into different phases would auto-trigger different steps, creating PRs with research docs, etc. 


## Codebase Requirements

I don't think this will work well in all settings and codebases. The right type of "mid/mid+" size problems is the right fit. The better your codebase is, the better code AI will wright. Just like in boomer-coding, quality compounds to velocity over time, and tech dept snowballs to a turd.. but with AI the effects of this has increased. Prioritize to solve you tech dept!
Also, in my experience, language matters... in TS/JS you can loop in 20+ differnet ways or chain useEffects in magical ways to create foot-canons... if Cloudflare can't properly use useEffect... are you sure our PHD-level next token predictors can? I actually like a lot of things about TS, but too many variations confuses the AI. In my "big" codebase I'm working on our backend is built in go, and Claude/Cursor are simply fantastic there! Simplicity = clearity = less hallucination = higher velocity. This is at least the satet late 2025, in a year or so.. who knows.


## TL;DR

IMO, SpecDD is the new way of developing software! Claude Code is excellent at this with proper commands and guidance. Starting with a research and planning phase to create .md files that clearly sets HIGH value contenxt is a great way to get more accurate results from Claude Code. Running multiple SpecDD flows at the same time... like spinning plates, is the new name of the game in some codebases. This is maybe takes out a bit of the old "fun" about developing, but I'm mostly exciteded about user value and winning in the market.. which is more fun than polshing a stone.