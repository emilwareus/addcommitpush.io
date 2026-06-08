# The loop

Before we talk about code AI agents love, we need to talk about the loop they run.

Most coding agents do a messy version of five steps:

## Prompt

The user asks for something. The agent also gets whatever repo instructions, tool descriptions, and context files are loaded at the start.

Prompting matters, but this article is not really about prompt tips. A good prompt can start the work. It should not have to explain the whole architecture.

Relevant sections: [AGENTS.md/Claude.md](#agentsmdclaudemd), [Layered context](#layered-context), [Setup commands](#setup-commands).

## Orient

The agent asks: where am I, what kind of repo is this, what rules matter, and where should I start?

This is the "new maintainer dropped into the codebase" step. If the repo has no map, no clear boundaries, and no obvious product language, the agent starts navigating by vibes.

Relevant sections: [RepoMap / Architecture map](#repomap--architecture-map), [Monorepo](#monorepo), [Bounded Context / Layout](#bounded-context--layout), [Domain vocabulary](#domain-vocabulary).

## Retrieve

The agent pulls in the files and examples it thinks are relevant.

This is where bad naming and hidden dependency edges hurt. More context is not automatically better. The agent needs the right slice.

Relevant sections: [Subagents](#subagents), [Naming](#naming), [Types](#types), [Domain vocabulary](#domain-vocabulary), [Code Quality](#code-quality-how-easy-is-this-code-to-change).

## Edit

The agent makes the change.

This is where the codebase either gives it a narrow path or lets it improvise. Types, generated SDKs, examples, and side-effect boundaries decide whether the edit lands inside the system or just looks plausible locally.

Relevant sections: [Code Quality](#code-quality-how-easy-is-this-code-to-change), [Examples as specs](#examples-as-specs), [Types](#types), [Generated SDKs](#generated-sdks), [Side effects & dynamic surfaces](#side-effects--dynamic-surfaces), [Multi-file ripple](#multi-file-ripple), [The Tools](#the-tools).

## Verify

The agent checks whether the change worked, reads the failure, and loops back.

In reality this is not a clean state machine. The agent can jump from verify back to retrieve, from edit back to orient, or from prompt into a clarification. But the loop is still useful because every codebase problem shows up somewhere in it.

The end goal is autonomy: agents research, plan, implement, and review; humans decide what should ship. We do not get there by writing longer prompts. We get there by making the repository easier to orient in, retrieve from, edit, and verify.

Relevant sections: [Tests](#tests), [Examples as specs](#examples-as-specs), [Setup commands](#setup-commands), [The Tools](#the-tools).

# The love

Master index: `[../../presentations/write-code-ai-agents-love/research/references.md](../../presentations/write-code-ai-agents-love/research/references.md)`

## Agent-specific stuff

### Agents.md/Claude.md

These are the files that your coding agent automatically loads into context when it hits the right filepaths.

I have a love hate relationship to my CLAUDE/AGENTS.md. First off, I hate that Claude Code refuse to officially support AGENTS.md. Secondly it does not follow instructions properly. But this is probably because it is very hard to verbally describe clear instructions to my agent. It works really well for things like: 

- Run make test-e2e to run all integrations tests, this properly seeds the database. 
- Read the architecture/good-to-know-patterns.md when reviewing.

etc. Clear prompts of what commands / things to do when. But stuff I like to work better, but frankly does not: 

- Follow the hexagonal architecture guidelines.
- We use DDD in our codebase, make sure to define all business behaviour in the domain.

Writing good behavioural prompts, patterns + anti-patterns are often forgotten. Research also shows that the runtime is cut by roughly 30% and output tokens is cut by 16% ish where [AGENTS.md](http://AGENTS.md) are present. This makes sense to me, as these files can remove a bit of the "exploring" of the codebase with some initial guidance. BUT, a counter-study found that can also reduce the success raite by ~20%. But, real code is hard to measure in a controlled study, and both these studies used benchmarks that the models have potentially traiend on (OSS) or synthetic codebases. So, my personal tips are: 

1. These files will not fix everything, dont try to.
2. Code is better docs than these files, write good code to learn from instead.
3. Keep them clear, short, and focus on commands and bootstraping exploration
4. Avoid "general stuff" that inferes a lot in it. "write good code".

**Insights:** [INSIGHT_02](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_02_agent_instructions_are_config.md) · [INSIGHT_24](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_24_context_files_are_config_with_debt.md)

**Papers**

- [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/abs/2601.20404) — `[agents-md-impact-2601.20404.pdf](../../presentations/write-code-ai-agents-love/research/papers/agents-md-impact-2601.20404.pdf)` · `[agents-md-impact-2601.20404.txt](../../presentations/write-code-ai-agents-love/research/paper-text/agents-md-impact-2601.20404.txt)`
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) — `[evaluating-agents-md-2602.11988.pdf](../../presentations/write-code-ai-agents-love/research/papers/evaluating-agents-md-2602.11988.pdf)` · `[evaluating-agents-md-2602.11988.txt](../../presentations/write-code-ai-agents-love/research/paper-text/evaluating-agents-md-2602.11988.txt)`
- [Decoding the Configuration of AI Coding Agents](https://arxiv.org/abs/2511.09268) — `[claude-code-configs-2511.09268.pdf](../../presentations/write-code-ai-agents-love/research/papers/claude-code-configs-2511.09268.pdf)` · `[claude-code-configs-2511.09268.txt](../../presentations/write-code-ai-agents-love/research/paper-text/claude-code-configs-2511.09268.txt)`
- [Agent READMEs: An Empirical Study of Context Files for Agentic Coding](https://leo-lihao.github.io/files/P15.pdf) — `[agent-readmes-context-files-2025.pdf](../../presentations/write-code-ai-agents-love/research/papers/agent-readmes-context-files-2025.pdf)` · `[agent-readmes-context-files-2025.txt](../../presentations/write-code-ai-agents-love/research/paper-text/agent-readmes-context-files-2025.txt)`
- [OctoBench](https://arxiv.org/abs/2601.10343) — `[octobench-2601.10343.pdf](../../presentations/write-code-ai-agents-love/research/papers/octobench-2601.10343.pdf)` · `[octobench-2601.10343.txt](../../presentations/write-code-ai-agents-love/research/paper-text/octobench-2601.10343.txt)`

**Practitioner**

- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — `[anthropic-claude-code-best-practices.html](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)`
- [GitHub Copilot coding agent best practices](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks) — `[github-copilot-coding-agent-best-practices.html](../../presentations/write-code-ai-agents-love/research/articles/github-copilot-coding-agent-best-practices.html)`
- [Cursor rules for AI](https://docs.cursor.com/context/rules-for-ai) — `[cursor-rules-for-ai.html](../../presentations/write-code-ai-agents-love/research/articles/cursor-rules-for-ai.html)`
- [OpenAI Codex repo AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md) — `[openai-codex-repo-agents-md.md](../../presentations/write-code-ai-agents-love/research/articles/openai-codex-repo-agents-md.md)`
- [Builder.io: Improve your AI code output with AGENTS.md](https://www.builder.io/blog/agents-md) — `[builder-agents-md.html](../../presentations/write-code-ai-agents-love/research/articles/builder-agents-md.html)`
- [AI Hackers: AGENTS.md practical guide](https://aihackers.net/posts/agents-md-practical-guide/) — `[aihackers-agents-md-practical-guide.html](../../presentations/write-code-ai-agents-love/research/articles/aihackers-agents-md-practical-guide.html)`

### Layered context

More context is absolutely not always better. Better context is better. Layered context or "cold loaded" context, such as skills, documentation, CLI stuff, etc., can absolutely be valuable! Especially as a codebase grows it becomes a very bad idea to shove everything into the root AGENTS.md. Letting the model choose when to read what docs, readmes, etc. have improved performance quite a bit for my. The layout I run is in the root monorepo:   

For main architectural / cross spanding knowledge. 

thoughts/architecture/

-- [0-README-INDEX.md](http://0-README-INDEX.md) (index to all other architecture files)

-- [1-BOUNDED-CONTEXT.md](http://1-BOUNDED-CONTEXT.md)  
-- [2-TESTNG-STRATEGY.md](http://1-BOUNDED-CONTEXT.md) 

-- 3-.... etc. 

And then for very specifc things

backend/features/agents/evals/

-- AGENT.md (Almost ONLY the index of what to read here)

[-- PROMPT-ENGINEERING-IN-INTERNAL-AGENTS.md](http://README.md)  
-- [RUNNING-EVALS.md](http://RUNNING-EVALS.md)   

Trying to keep things pretty thin here. and IMO for the local things, the code should be so obvious it should not need docs on how to use/edit it. But I added "prompt engineering" as an example here, as my experience is that my friend Claude needs some guidance here. Another trick I do is in my SpecDrivenDevelopment pipeline, in the research phase, I force the models to enumerate the 3-5 most important archtiecture documents that it must read in plan and implementation to get a better sense of the codebase. This increased the autonomy a bit of the agent in my own experience.

**Insights:** [INSIGHT_08](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_08_context_should_be_layered.md) · [INSIGHT_16](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_16_more_context_can_hurt.md)

**Papers**

- [Codified Context](https://arxiv.org/abs/2602.20478) — `[codified-context-2602.20478.pdf](../../presentations/write-code-ai-agents-love/research/papers/codified-context-2602.20478.pdf)` · `[codified-context-2602.20478.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codified-context-2602.20478.txt)`
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) — `[evaluating-agents-md-2602.11988.pdf](../../presentations/write-code-ai-agents-love/research/papers/evaluating-agents-md-2602.11988.pdf)` · `[evaluating-agents-md-2602.11988.txt](../../presentations/write-code-ai-agents-love/research/paper-text/evaluating-agents-md-2602.11988.txt)`
- [Lost in the Middle](https://arxiv.org/abs/2307.03172) — `[lost-in-the-middle-2307.03172.pdf](../../presentations/write-code-ai-agents-love/research/papers/lost-in-the-middle-2307.03172.pdf)` · `[lost-in-the-middle-2307.03172.txt](../../presentations/write-code-ai-agents-love/research/paper-text/lost-in-the-middle-2307.03172.txt)`
- [A3-CodGen](https://arxiv.org/abs/2312.05772) — `[a3-codgen-2312.05772.pdf](../../presentations/write-code-ai-agents-love/research/papers/a3-codgen-2312.05772.pdf)` · `[a3-codgen-2312.05772.txt](../../presentations/write-code-ai-agents-love/research/paper-text/a3-codgen-2312.05772.txt)`

**Practitioner**

- [Anthropic: How Claude Code works in large codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) — `[anthropic-large-codebases-claude-code.html](../../presentations/write-code-ai-agents-love/research/articles/anthropic-large-codebases-claude-code.html)`
- [Dive into Claude Code](https://arxiv.org/abs/2604.14228) — `[dive-into-claude-code-2604.14228.pdf](../../presentations/write-code-ai-agents-love/research/papers/dive-into-claude-code-2604.14228.pdf)` · `[dive-into-claude-code-2604.14228.txt](../../presentations/write-code-ai-agents-love/research/paper-text/dive-into-claude-code-2604.14228.txt)`

### Setup commands

You onboard your agent 100 times a day. Make it VERY easy. My personal favorites are: 

- Creating a new worktree spins up the dockerized service fully and seeds the database + starts web
- make check runs ALL checks, and this makes it easy to just say "run check and iterate unitl all green"
- make setup-mac/linux/server/etc. that just completely install everything to get coding working in your env. 
- devcontainers have actually been useful here :)

Research states "machine-checkable contracts" agents can run in a fresh environment. I agree. 

**Insights:** [INSIGHT_03](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_03_reproducible_setup_is_agent_infrastructure.md) · [INSIGHT_23](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_23_setup_is_part_of_the_task.md)

**Papers**

- [Beyond pip install / Installamatic](https://arxiv.org/abs/2412.06294) — `[installamatic-2412.06294.pdf](../../presentations/write-code-ai-agents-love/research/papers/installamatic-2412.06294.pdf)` · `[installamatic-2412.06294.txt](../../presentations/write-code-ai-agents-love/research/paper-text/installamatic-2412.06294.txt)`
- [SetupBench](https://arxiv.org/abs/2507.09063) — `[setupbench-2507.09063.pdf](../../presentations/write-code-ai-agents-love/research/papers/setupbench-2507.09063.pdf)` · `[setupbench-2507.09063.txt](../../presentations/write-code-ai-agents-love/research/paper-text/setupbench-2507.09063.txt)`
- [GitTaskBench](https://ojs.aaai.org/index.php/AAAI/article/download/40533/44494) — `[gittaskbench-aaai-2026.pdf](../../presentations/write-code-ai-agents-love/research/papers/gittaskbench-aaai-2026.pdf)` · `[gittaskbench-aaai-2026.txt](../../presentations/write-code-ai-agents-love/research/paper-text/gittaskbench-aaai-2026.txt)`
- [SWE-bench](https://arxiv.org/abs/2310.06770) — `[swe-bench-2310.06770.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-bench-2310.06770.pdf)` · `[swe-bench-2310.06770.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt)` *(pre-baked envs; setup assumed)*

**Practitioner**

- [OpenAI Codex repo AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md) — `[openai-codex-repo-agents-md.md](../../presentations/write-code-ai-agents-love/research/articles/openai-codex-repo-agents-md.md)`
- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — `[anthropic-claude-code-best-practices.html](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)`
- [GitHub Copilot coding agent best practices](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks) — `[github-copilot-coding-agent-best-practices.html](../../presentations/write-code-ai-agents-love/research/articles/github-copilot-coding-agent-best-practices.html)`

Plot data: `[setup_verification.csv](../../presentations/write-code-ai-agents-love/research/data/setup_verification.csv)`

### Subagents

Subagents are agents your main agent can spin up to perform work with an isolated context window. In most coding agents, it is like hiring a team of juniors, telling them to work on the same thing and **not** communicating with each other. Great! Trying to force a "human way of working" into subagents, like a designer, backend engineer, etc., is wrong in my opinion. 

The root context window has more power than the parallelized agents, and your underlying LLM is already an "expert" in these things. Where subagents shine is in "context compression": you need to perform a context-heavy task and compress the results back to the main agent. That means searching the codebase, locating relevant files/patterns, searching the web for things with a high noise-to-signal ratio. Your main context window does not need to be filled with the steps of how it got to the result—it just needs the insight. The main window should still do the code editing IMO. There are other ways to handle retrieval, like a well-structured codebase probably has higher impact.

Regardless, this is roughly how you create a subagent:

You can create subagents like this:

- **Claude Code:** `.claude/agents/research-codebase.md` (or `~/.claude/agents/` for all projects). Also `/agents` in the CLI.
- **Cursor:** `.cursor/agents/research-codebase.md` (or `~/.cursor/agents/` for all projects).
- **Codex:** ask explicitly in the prompt (“spawn an explorer for `backend/…`, return a short summary”) or define roles in `.codex/config.toml` under `[agents]`.

Each file is markdown + YAML frontmatter + instructions—for example:

```markdown
---
name: research-codebase
description: Read-only exploration of a subtree; use when mapping architecture or finding entry points.
model: inherit
readonly: true
---

Explore only the paths you were given. Return layout, key modules, and 3–5 files to read next. No edits.
```

Claude delegates from `description`; Cursor via `@research-codebase` or natural language; Codex only spawns subagents when you ask (parent keeps architecture, child stays read-heavy).

**Insights:** [INSIGHT_07](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md)

**Papers**

- [Agentless](https://arxiv.org/abs/2407.01489) — `[agentless-2407.01489.pdf](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf)` · `[agentless-2407.01489.txt](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)`
- [ContextBench](https://arxiv.org/abs/2602.05892) — `[contextbench-2602.05892.pdf](../../presentations/write-code-ai-agents-love/research/papers/contextbench-2602.05892.pdf)` · `[contextbench-2602.05892.txt](../../presentations/write-code-ai-agents-love/research/paper-text/contextbench-2602.05892.txt)`
- [Dive into Claude Code](https://arxiv.org/abs/2604.14228) — `[dive-into-claude-code-2604.14228.pdf](../../presentations/write-code-ai-agents-love/research/papers/dive-into-claude-code-2604.14228.pdf)` · `[dive-into-claude-code-2604.14228.txt](../../presentations/write-code-ai-agents-love/research/paper-text/dive-into-claude-code-2604.14228.txt)`

**Practitioner**

- [Anthropic: How Claude Code works in large codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) — `[anthropic-large-codebases-claude-code.html](../../presentations/write-code-ai-agents-love/research/articles/anthropic-large-codebases-claude-code.html)`
- [LocalCan: Claude Code workflow for large projects](https://www.localcan.com/blog/claude-code-workflow-for-large-projects) — `[localcan-claude-code-large-projects.html](../../presentations/write-code-ai-agents-love/research/articles/localcan-claude-code-large-projects.html)`
- [HN: Claude Code framework wars](https://news.ycombinator.com/item?id=45155302) — `[hn-claude-code-framework-wars.html](../../presentations/write-code-ai-agents-love/research/articles/hn-claude-code-framework-wars.html)`
- [HN: Claude Code swarms](https://news.ycombinator.com/item?id=46743908) — `[hn-claude-code-swarms.json](../../presentations/write-code-ai-agents-love/research/articles/hn-claude-code-swarms.json)`

### RepoMap / Architecture map

The research here is pretty clear, if your agents understand the "Graph" of your codebase, the performance improves. Concretely, this is: who calls whom, what depends on what, what builds what, what tests leads to where, does this test branch where I want it to, and so on. Research are not as clear what to build and how to inject it into the agentic loop, and there are a few approaches. 

- Call graph slices in the prompt. Parse the repo, pull a small neighborhood around the suspect symbol. Dumping a huge subgraph hurts; query it.
- Build/test map at session start. What builds what, what tests cover what. Extract from CMake, CTest, package files. Ground truth so the agent stops wandering build scripts.
- Skinny symbol map on every edit (Aider style). Important defs and signatures across the repo. Shape before opening every file.
- Search wide, rank narrow (Cody style). Keyword, graph, git, docs in; then cut to what fits the context window.

But you are probably not building a code agent harness, you are probably build a good ol' code-thingy. So, to make this acitonable: make sure you coding agent has access to the LSP/IDE-pluging. This gives some of this power to the agents, helping it navigate your codebase and sometimes powering retrivial.

BUT, if you are building an agentic harness (who isn't??), the call graph slice seems to have the highest imact. Makeing in queryable, extracting neighborhoods that typically impact impact each other. I learned on my last startup that call graphs are hard to build, so I'll (probably) just keep to LSP's for now. 

**Insights:** [INSIGHT_01](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_01_context_maps.md) · [INSIGHT_21](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md)

**Papers**

- [RepoGraph](https://arxiv.org/abs/2410.14684) — `[repograph-2410.14684.pdf](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf)` · `[repograph-2410.14684.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)`
- [Repository Intelligence Graph](https://arxiv.org/abs/2601.10112) — `[repository-intelligence-graph-2601.10112.pdf](../../presentations/write-code-ai-agents-love/research/papers/repository-intelligence-graph-2601.10112.pdf)` · `[repository-intelligence-graph-2601.10112.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repository-intelligence-graph-2601.10112.txt)`
- [ContextBench](https://arxiv.org/abs/2602.05892) — `[contextbench-2602.05892.pdf](../../presentations/write-code-ai-agents-love/research/papers/contextbench-2602.05892.pdf)` · `[contextbench-2602.05892.txt](../../presentations/write-code-ai-agents-love/research/paper-text/contextbench-2602.05892.txt)`
- [RepoBench](https://arxiv.org/abs/2306.03091) — `[repobench-2306.03091.pdf](../../presentations/write-code-ai-agents-love/research/papers/repobench-2306.03091.pdf)` · `[repobench-2306.03091.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repobench-2306.03091.txt)`
- [AI-assisted Coding with Cody](https://arxiv.org/abs/2408.05344) — `[cody-context-retrieval-2408.05344.pdf](../../presentations/write-code-ai-agents-love/research/papers/cody-context-retrieval-2408.05344.pdf)` · `[cody-context-retrieval-2408.05344.txt](../../presentations/write-code-ai-agents-love/research/paper-text/cody-context-retrieval-2408.05344.txt)`

**Practitioner**

- [Aider repo map docs](https://aider.chat/docs/repomap.html) — `[aider-repomap.md](../../presentations/write-code-ai-agents-love/research/articles/aider-repomap.md)`
- [Sourcegraph: How Cody understands your codebase](https://sourcegraph.com/blog/how-cody-understands-your-codebase) — `[sourcegraph-how-cody-understands-codebase.html](../../presentations/write-code-ai-agents-love/research/articles/sourcegraph-how-cody-understands-codebase.html)`
- [Sourcegraph: Toward infinite context for code](https://sourcegraph.com/blog/towards-infinite-context-for-code) — `[sourcegraph-toward-infinite-context.html](../../presentations/write-code-ai-agents-love/research/articles/sourcegraph-toward-infinite-context.html)`

Plot data: `[repository_graph_context.csv](../../presentations/write-code-ai-agents-love/research/data/repository_graph_context.csv)`

## Structure

### Monorepo

MONOREPO, you can stop reading now. That's it. 

Jokes aside, I loved monorepos before AI took my job. It just makes everything soo much easier to maintain and ship. Sure, if you are Google (which has a monorepo) this is probably hard. But for the average startup, go! And by mono I really mean MONO. Here is a quick-list of what to put in your repo: 

- Frontend
- Backend
- Website
- Blog
- Docs
- Infrastructure as code
- All services (MICROSERVICE != A LOT OF REPOS).
- All research and plan documents that you create in your SpecDD workflow
- All agent-driven review documents
- Architecture docs
- Compliance documentation
- Grafana settings
- The best place to eat ice cream in town
- All .env secrets (encrypted + commited using SOPS)

Sure, MCPs makes stuff searchable and retrievable in other systems. Have fun. Don't use use a no-code-tool to buld you blog, teach your marketing people how to prompt with claude code instead of ChatJippety.   

Additionally, this means that you have a completely co-versioned company. Keeping things in sync becomes much easiear when everything is on the same SHA.

**Insights:** [INSIGHT_19](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_19_monorepos_are_agent_context_infrastructure.md)

**Practitioner**

- [Google: Why Google stores billions of lines of code in a single repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/) — `[google-monorepo.html](../../presentations/write-code-ai-agents-love/research/articles/google-monorepo.html)`
- [Code Simplicity: What is a monorepo, really?](https://www.codesimplicity.com/post/what-is-a-monorepo-really/) — `[code-simplicity-monorepo.html](../../presentations/write-code-ai-agents-love/research/articles/code-simplicity-monorepo.html)`
- [Write the Docs: Docs as Code](https://www.writethedocs.org/guide/docs-as-code.html) — `[write-the-docs-docs-as-code.html](../../presentations/write-code-ai-agents-love/research/articles/write-the-docs-docs-as-code.html)`
- [GitLab: Infrastructure as Code and GitOps](https://about.gitlab.com/topics/gitops/gitlab-enables-infrastructure-as-code/) — `[gitlab-iac-gitops.html](../../presentations/write-code-ai-agents-love/research/articles/gitlab-iac-gitops.html)`
- [Dropbox: Reducing our monorepo size](https://dropbox.tech/infrastructure/reducing-our-monorepo-size-to-improve-developer-velocity) — `[dropbox-monorepo-size.html](../../presentations/write-code-ai-agents-love/research/articles/dropbox-monorepo-size.html)`

### Bounded Context / Layout

There is actually not a lot of research that finds that "good architecture = good code generation". And there is also a the debate of "what is even good architecture"... but I do think there are some wins here, and it is not about the agent. As a developer working with AI generated code we need to have a mental model of the work we are doing. This mental model was something we used to build by crying over our keyboards for hours on end. But now it cry in tokens instead of tears, and the mental model of the codebase becomes harder to form. We get cognetive debt.   

I think that a good bounded contexts within the codebase reduces the cognetive debt, makes it easier to grasp and understand the code, and there fore makes the developers take better decisison = better code gen in the long run. It may not improve the toking shotgun today, but it improves your ability to aim it.

I write a lot of go this time around, and I really like the "Three Dot Labs" architecture: [https://threedots.tech](https://threedots.tech/), which is a bit of DDD, event driven, hexagonal-ish, with strong testing guidelines. Here, a bounded context is just a "service", that may be deployed on its own, but can also run in a big monolith along other services, it may not import another bounded context directly, has clear responsebilities, interfaces, APIs, and dependencies. This works well for me and my team, but the goal of this is to keep your cognetive debt low... so you do what's best for you IMO.

**Insights:** [INSIGHT_15](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_15_modularity_is_not_magic_boundaries_are.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md)

**Papers**

- [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) — `[revisiting-modularity-codegen-2407.11406.pdf](../../presentations/write-code-ai-agents-love/research/papers/revisiting-modularity-codegen-2407.11406.pdf)` · `[revisiting-modularity-codegen-2407.11406.txt](../../presentations/write-code-ai-agents-love/research/paper-text/revisiting-modularity-codegen-2407.11406.txt)`
- [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763) — `[chunking-rag-code-completion-2605.04763.pdf](../../presentations/write-code-ai-agents-love/research/papers/chunking-rag-code-completion-2605.04763.pdf)` · `[chunking-rag-code-completion-2605.04763.txt](../../presentations/write-code-ai-agents-love/research/paper-text/chunking-rag-code-completion-2605.04763.txt)`
- [CodeChain](https://arxiv.org/abs/2310.08992) — `[codechain-modular-codegen-2310.08992.pdf](../../presentations/write-code-ai-agents-love/research/papers/codechain-modular-codegen-2310.08992.pdf)` · `[codechain-modular-codegen-2310.08992.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codechain-modular-codegen-2310.08992.txt)`
- [The Modular Imperative](https://namin.seas.harvard.edu/pubs/lmpl-modularity.pdf) — `[modular-imperative-lmpl-2025.pdf](../../presentations/write-code-ai-agents-love/research/papers/modular-imperative-lmpl-2025.pdf)` · `[modular-imperative-lmpl-2025.txt](../../presentations/write-code-ai-agents-love/research/paper-text/modular-imperative-lmpl-2025.txt)`
- [Architecture Without Architects](https://arxiv.org/abs/2604.04990) — `[architecture-without-architects-2604.04990.pdf](../../presentations/write-code-ai-agents-love/research/papers/architecture-without-architects-2604.04990.pdf)` · `[architecture-without-architects-2604.04990.txt](../../presentations/write-code-ai-agents-love/research/paper-text/architecture-without-architects-2604.04990.txt)`

**Practitioner**

- [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — `[nx-enforce-module-boundaries.html](../../presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html)`

## The Code

### "Code Quality": "how easy is this code to change?"

Code quality has been debated in software systems for quite a while. A lot of it becomes religious. One camp suggests that code quality should magically improve tooling, delivery velocity, and the whole codebase. That can give you a false sense of security. The other camp says code quality barely matters and that you should only focus on moving fast. That makes it very easy to create a big ball of mud at lightning speed: unchangeable, unmaintainable, and hard to understand.

I think it is interesting that we have companies here in Malmo doing good research on this, like CodeScene. Looking at their recent research, they used CodeHealth metrics to refactor Python code and found a correlation between code health and the ability to successfully patch that code. The weaker models had a bigger divergence between healthy and unhealthy code.

The numbers are useful, but only if we keep them narrow. In [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200), healthy files gave medium open-weight models an 8-15 percentage point lower break rate. But with stronger systems, the gap nearly disappeared: Sonnet 4.5 was 86.77% on healthy files vs 84.03% on unhealthy files, and Claude in an agentic scaffold was 96.19% vs 94.81%. That is exactly the point. Code health seems to matter most when the model has less spare intelligence or less tooling.

But they also showed that if you max out the model and pick the best model for the task, CodeHealth in that setup barely matters. That is actually my own experience as well. Code health is important, sure. But better models are an effective way to pay your way out of some problems. There are not many times in history where we have been able to do that, but AI-coding is kind of one of them. I can survive on maybe three max subscriptions for different models, and that is relatively cheap if it means I can use the best possible model most of the time. That is the correct type of token maxing, clearly spend more cash where there is a positive ROI.

So I do not think the simple version makes sense, at least not in the codebases I work on. "Good code quality makes agents work" is too broad. Strong models can compensate for a lot. But there are still parts of code quality that matter a lot here. If you are building a product where the code matters (not simple websites and CRUD apps), you need it to be able to maintain it in the long run. This is not only for agents. It is for humans as well.

I think there is a new kind of debt rising here: cognitive debt (popular term on X). You work with the codebase a lot, but you do not actually read it. You do not build the mental model yourself. You let the agent move things around, and suddenly you do not have the capability to understand the codebase anymore. That is where code quality becomes important right now.

Better code is easier to evaluate. It is easier for you to tell if the agent did a good job or a bad job. That is true for quality, security, and the actual product direction. The more important question is not only whether the agent can change the code. It is whether you, as a human, can understand the codebase fast enough to judge the change.

This is where I like [Needle in the Repo](https://arxiv.org/abs/2603.27745) as a warning. It found 64/483 cases where functional tests passed but the structural or maintainability oracle failed. That is 13.3%. The exact percentage may not transfer to your repo, but the failure mode absolutely does: passing tests can still leave the change in the wrong place.

I talked to my grandmother the other day, and she told me about this "farmer's eye". A farmer can walk into a barn with a thousand cows and see which cow is doing badly. They might not be able to explain exactly why. They might not be able to put it into a guideline. But they can see it.

That is the kind of judgement we still need in codebases. If you cannot look at the change and quickly feel whether it belongs, whether the shape is right, whether it will be hard to maintain later. When you have the "farmer's eye" for your codebase, that's great. Optimize for the code quality that let's you keep that.

That is where I think code quality matters most right now:

> Code quality is how easy it is for the next human to understand whether the agent made a good change.

**Insights:** [INSIGHT_30](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_30_codehealth_predicts_ai_refactoring_success.md) · [INSIGHT_31](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_31_perplexity_is_not_file_level_ai_friendliness.md) · [INSIGHT_05](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_05_maintainability_beats_one_shot_correctness.md)

**Papers**

- [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200) — `[code-for-machines-2601.02200.pdf](../../presentations/write-code-ai-agents-love/research/papers/code-for-machines-2601.02200.pdf)`
- [Echoes of AI](https://arxiv.org/abs/2507.00788) — `[echoes-of-ai-2507.00788.pdf](../../presentations/write-code-ai-agents-love/research/papers/echoes-of-ai-2507.00788.pdf)`
- [How do Humans and LLMs Process Confusing Code?](https://arxiv.org/abs/2508.18547) — `[humans-llms-confusing-code-2508.18547.pdf](../../presentations/write-code-ai-agents-love/research/papers/humans-llms-confusing-code-2508.18547.pdf)`
- [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) — `[smells-llm-generated-code-2510.03029.pdf](../../presentations/write-code-ai-agents-love/research/papers/smells-llm-generated-code-2510.03029.pdf)` · `[smells-llm-generated-code-2510.03029.txt](../../presentations/write-code-ai-agents-love/research/paper-text/smells-llm-generated-code-2510.03029.txt)`
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — `[needle-in-the-repo-2603.27745.pdf](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf)` · `[needle-in-the-repo-2603.27745.txt](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)`
- [SWE-CI](https://arxiv.org/abs/2603.03823) — `[swe-ci-2603.03823.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-ci-2603.03823.pdf)` · `[swe-ci-2603.03823.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-ci-2603.03823.txt)`

### Tests

When I talk about tests with agents and agentic development, this is a bit of a divider. Some people say it is too dangerous to let AI agents write the tests and then implement the code, because then you have basically implemented the same flaw twice and locked it in with a good-looking test.

I agree with some of that. A bad AI-generated test can absolutely bless the wrong behavior. If the agent misunderstands the task, it can write a test for the misunderstanding and then make the implementation pass. That is not quality. That is confidence theater.

The research is mixed in the same way. In [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900), GPT-5.2 wrote new tests in only 0.6% of tasks while resolving 71.8%. Claude Opus 4.5 wrote tests in about 83.0% of tasks and resolved 74.4%. More agent-written tests did not automatically mean dramatically better outcomes.

But I also think the other side is true. Tests are one of the best ways to give the agent a feedback loop. They make the behavior readable for the agent, and for you as the human. A good test lets you read the codebase and see the intent. You can look at the test and understand what the system is supposed to achieve.

The stronger point is about visible executable behavior. In [FeatureBench](https://arxiv.org/abs/2602.10975), exposing ground-truth unit tests improved resolved rate by +50.0 percentage points for Gemini-3-Pro-Preview and +43.3 points for GPT-5.1-Codex on the Lite set. I would not frame that as "leak tests." I would frame it as: runnable examples are extremely powerful steering.

I especially like component tests. If you have a service around some kind of context, like user context, scheduled context, tenant context, or whatever it is, you should be able to run that in a test suite without mocking every direct dependency (such as the database related to that service). You test it in a pretty realistic environment, and you test the actual behavior. Then you do not need to go all the way through Playwright for everything. Playwright also tests the browser, fonts, rendering, timing, and a lot of other things that can be brittle. I want a deterministic backend or service-level test where the agent can get a clear failure, fix the thing, and run it again.

Those tests can be written almost like user stories. They describe what the system should achieve, they become easy to inspect, and they communicate back to the agent what it actually changed. You can read them quickly and see whether the test takes the right path through the system.

I care less about test coverage as a percentage and more about branch and behavior coverage. For example, an API endpoint should have tests for the HTTP codes it can return, tenancy tests and access tests. It should prove the most important paths from the outside in, in a way that is easy for a human to inspect. Optimize your test code and infra for prod-like accuracy and readability, to be able to quickly verify intended behaviour.

That is the part I care about:

> Tests are not there to make the percentage go up. They are there to make behavior visible.

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_17](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_17_quality_gates_must_cover_smells.md) · [INSIGHT_28](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_28_static_oracles_catch_what_tests_miss.md)

**Papers**

- [SWE-bench](https://arxiv.org/abs/2310.06770) — `[swe-bench-2310.06770.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-bench-2310.06770.pdf)` · `[swe-bench-2310.06770.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt)`
- [Agentless](https://arxiv.org/abs/2407.01489) — `[agentless-2407.01489.pdf](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf)` · `[agentless-2407.01489.txt](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)`
- [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) — `[rethinking-agent-generated-tests-2602.07900.pdf](../../presentations/write-code-ai-agents-love/research/papers/rethinking-agent-generated-tests-2602.07900.pdf)` · `[rethinking-agent-generated-tests-2602.07900.txt](../../presentations/write-code-ai-agents-love/research/paper-text/rethinking-agent-generated-tests-2602.07900.txt)`
- [FeatureBench](https://arxiv.org/abs/2602.10975) — `[featurebench-2602.10975.pdf](../../presentations/write-code-ai-agents-love/research/papers/featurebench-2602.10975.pdf)` · `[featurebench-2602.10975.txt](../../presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt)`
- [ABTest](https://arxiv.org/abs/2604.03362) — `[abtest-agent-anomalies-2604.03362.pdf](../../presentations/write-code-ai-agents-love/research/papers/abtest-agent-anomalies-2604.03362.pdf)` · `[abtest-agent-anomalies-2604.03362.txt](../../presentations/write-code-ai-agents-love/research/paper-text/abtest-agent-anomalies-2604.03362.txt)`
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — `[needle-in-the-repo-2603.27745.pdf](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf)` · `[needle-in-the-repo-2603.27745.txt](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)`

Plot data: `[setup_verification.csv](../../presentations/write-code-ai-agents-love/research/data/setup_verification.csv)`

**Practitioner**

- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — `[anthropic-claude-code-best-practices.html](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)`

### Examples as specs

Looking at examples in your codebase, this is also where code quality comes back. There is a kind of compounding quality with AI agents: you get more of what you already have.

Regardless of whether code quality in the traditional sense directly affects agent performance, you should understand that compounding effect. If your repo has good examples, the agent is more likely to copy good examples. If your repo has messy examples, the agent is more likely to create more mess.

We are not in a place where all the boring blocks have been removed from codebases. The blueprints are not magically there. The scaffolding around the domain logic or the business logic still needs to be written in a lot of codebases. Having strong opinions about how to do that well is good.

This is also where subagents tie in nicely. One of my favorite subagents is a pattern finder. Its job is to do an exhaustive search through the codebase and find the patterns I should mimic for the thing I am building right now.

This has decent research backing if we keep the claim modest. [DocPrompting](https://arxiv.org/abs/2207.05987) improved CodeT5 pass@1 by 2.85 percentage points on execution-based Python CoNaLa, a 52% relative gain, by retrieving relevant API docs. That is not repo-scale feature work, but it supports the basic idea: nearby, relevant usage information helps models call the right thing.

But it has to be the right example. The nearest random file is not a spec. It might just be old code. The useful example is the canonical one: the one that shows the current way we want this kind of thing to be built.

The pattern I trust is example plus contract plus check:


| Context                    | What it gives the agent          |
| -------------------------- | -------------------------------- |
| Canonical example          | The local shape to copy          |
| Contract or type           | Why that shape is valid          |
| Test or validation command | Proof that the shape still works |


So examples become specs when they are clear enough to copy:

- where the code goes;
- which imports are allowed;
- what the test should look like;
- what naming the domain uses;
- which generated files are touched;
- which command proves the behavior.

That is the point:

> You get more of what you already have, so make the thing worth copying obvious.

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_22](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md) · [INSIGHT_11](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_11_task_specs_are_part_of_the_codebase.md)

**Papers**

- [DocPrompting](https://arxiv.org/abs/2207.05987) — `[docprompting-2207.05987.pdf](../../presentations/write-code-ai-agents-love/research/papers/docprompting-2207.05987.pdf)` · `[docprompting-2207.05987.txt](../../presentations/write-code-ai-agents-love/research/paper-text/docprompting-2207.05987.txt)`
- [FeatureBench](https://arxiv.org/abs/2602.10975) — `[featurebench-2602.10975.pdf](../../presentations/write-code-ai-agents-love/research/papers/featurebench-2602.10975.pdf)` · `[featurebench-2602.10975.txt](../../presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt)`
- [RAR: Retrieval Augmented Retrieval for Code Generation](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) — `[rar-retrieval-augmented-retrieval-2024.pdf](../../presentations/write-code-ai-agents-love/research/papers/rar-retrieval-augmented-retrieval-2024.pdf)` · `[rar-retrieval-augmented-retrieval-2024.txt](../../presentations/write-code-ai-agents-love/research/paper-text/rar-retrieval-augmented-retrieval-2024.txt)`
- [CodePlan](https://arxiv.org/abs/2309.12499) — `[codeplan-2309.12499.pdf](../../presentations/write-code-ai-agents-love/research/papers/codeplan-2309.12499.pdf)` · `[codeplan-2309.12499.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codeplan-2309.12499.txt)`

### Naming

Suggested segment:

Names are not style polish.

For agents, names are retrieval handles and semantic hints. They connect the issue, tests, docs, types, and code. If a function is called `reconcileInvoicePayment`, the model gets a cheap summary. If it is called `run`, the model has to spend intelligence recovering meaning the code should have exposed.

The research is unusually clear for something developers usually treat as taste.

[CodeT5](https://arxiv.org/abs/2109.00859) is the foundation signal: its identifier-aware pretraining is based on the observation that developer-assigned identifiers preserve code semantics. This does not prove that one naming convention improves a modern agent, but it does show that model builders have treated identifiers as special tokens because they carry meaning.

[How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) is more direct. The authors perturb variable names, method/function definition names, and invocation names. On code search, GraphCodeBERT's Java MRR drops from 70.36% with original names to 17.03% when all names are anonymized/shuffled. Python drops from 68.17% to 23.73%. The paper also finds definition names hurt more when damaged than local variable or invocation names. That makes sense: a function name is often the cheapest summary of the behavior.

[When Names Disappear](https://arxiv.org/abs/2510.03178) gives the modern caveat. On ClassEval class-level summarization, GPT-4o drops from 87.3 to 58.7 after name obfuscation; DeepSeek V3 drops from 87.7 to 76.7. But competitive-programming code is more robust because algorithmic structure carries more of the meaning. Product code is different. Billing, auth, permissions, attendance, entitlement, and compliance code all carry intent through domain names.

The practical rule:

- Prefer boring, truthful names over clever names.
- Avoid misleading names more aggressively than vague names.
- Name exported functions like behavior summaries: `reconcileInvoicePayment`, not `process`.
- Avoid semantic sinkholes: `utils`, `helpers`, `manager`, `handler`, `data`.
- Treat renames of public symbols as retrieval/API changes, not cosmetics.

The conclusion is not "good names make agents good." Too cute. The conclusion is:

> Bad names make the agent spend intelligence recovering meaning the code should have exposed.

**Insights:** [INSIGHT_13](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md)

**Papers**

- [CodeT5](https://arxiv.org/abs/2109.00859) — `[codet5-identifier-aware-2109.00859.pdf](../../presentations/write-code-ai-agents-love/research/papers/codet5-identifier-aware-2109.00859.pdf)` · `[codet5-identifier-aware-2109.00859.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codet5-identifier-aware-2109.00859.txt)`
- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) — `[naming-affects-llms-code-analysis-2307.12488.pdf](../../presentations/write-code-ai-agents-love/research/papers/naming-affects-llms-code-analysis-2307.12488.pdf)` · `[naming-affects-llms-code-analysis-2307.12488.txt](../../presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt)`
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — `[when-names-disappear-2510.03178.pdf](../../presentations/write-code-ai-agents-love/research/papers/when-names-disappear-2510.03178.pdf)` · `[when-names-disappear-2510.03178.txt](../../presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt)`
- [CodeBERT](https://arxiv.org/abs/2002.08155) — `[codebert-2002.08155.pdf](../../presentations/write-code-ai-agents-love/research/papers/codebert-2002.08155.pdf)` · `[codebert-2002.08155.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codebert-2002.08155.txt)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

### Types

Types are compressed context.

A good type tells the agent what values are valid, what fields exist, what methods are callable, what crosses a boundary, and what the compiler can reject before runtime. That matters because agents are very good at inventing plausible APIs: a field that almost exists, a payload that looks right, an enum value that was really just a string in its head.

The strongest evidence is [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246). In its TypeScript experiments, about 94% of compilation errors are type-check failures, not syntax errors. Type-constrained decoding reduces compilation errors by 74.8% on HumanEval synthesis and 56.0% on MBPP synthesis. Functional correctness also moves: average pass@1 relative gain is 3.5% for synthesis, 5.0% for translation, and 37.0% for repair.

Do not overclaim this. It is TypeScript benchmark generation with constrained decoding, not proof that adding types to your app makes agents solve product work. The useful lesson is narrower:

> Type information kills a large class of invalid code before tests run.

[CatCoder](https://arxiv.org/abs/2406.03283) gives the repository-level version. It combines retrieved code with type context extracted from static analyzers for Java and Rust. On Java, it improves over RepoCoder by up to 14.44% compile@k and 17.35% pass@k; removing type context drops Java pass performance by up to 11.57%. The caveat is important: code retrieval still matters. Types do not replace examples. Types show the valid surface; examples show the local pattern.

[ToolGen](https://arxiv.org/abs/2401.06391) shows the same failure mode through autocomplete/static-analysis tools. It improves dependency coverage by 31.4-39.1% and static validity rate by 44.9-57.7% across three LLMs. The bigger effect is validity, not magic correctness. That is the point.

Types prove shape, not intent. A perfectly typed bug is still a bug. You can model the wrong billing rule beautifully and still charge the customer twice. Tests and product specs still matter.

The type surfaces that matter most are boundaries:

- API request/response types;
- domain command types;
- event payloads;
- repository interfaces;
- generated SDK clients;
- schema-derived models;
- result/error types;
- discriminated unions for state.

The point is not static typing as religion. Python with good type hints, Pydantic models, dataclasses, and narrow interfaces can expose plenty of structure. TypeScript with `any`, dynamic indexing, stringly payloads, and broad JSON blobs can be a fog machine.

Practical rule:

- Put precise types at boundaries before internals.
- Use discriminated unions for states that must not combine.
- Keep `unknown` at trust boundaries and narrow it immediately.
- Treat `any` as a migration scar, not a design choice.
- Prefer simple named types over clever generic mazes.
- Derive clients and models from schemas where possible.

Types are not documentation you hope the agent reads. They are documentation the compiler enforces.

> A good type removes a wrong patch before the agent gets attached to it.

**Insights:** [INSIGHT_06](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_06_types_and_interfaces_compress_context.md) · [INSIGHT_14](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_14_types_and_static_surfaces_reduce_hallucinated_apis.md)

**Papers**

- [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) — `[type-constrained-codegen-2504.09246.pdf](../../presentations/write-code-ai-agents-love/research/papers/type-constrained-codegen-2504.09246.pdf)` · `[type-constrained-codegen-2504.09246.txt](../../presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt)`
- [CatCoder](https://arxiv.org/abs/2406.03283) — `[catcoder-2406.03283.pdf](../../presentations/write-code-ai-agents-love/research/papers/catcoder-2406.03283.pdf)` · `[catcoder-2406.03283.txt](../../presentations/write-code-ai-agents-love/research/paper-text/catcoder-2406.03283.txt)`
- [ToolGen](https://arxiv.org/abs/2401.06391) — `[toolgen-autocomplete-repo-codegen-2401.06391.pdf](../../presentations/write-code-ai-agents-love/research/papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf)` · `[toolgen-autocomplete-repo-codegen-2401.06391.txt](../../presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt)`
- [A3-CodGen](https://arxiv.org/abs/2312.05772) — `[a3-codgen-2312.05772.pdf](../../presentations/write-code-ai-agents-love/research/papers/a3-codgen-2312.05772.pdf)` · `[a3-codgen-2312.05772.txt](../../presentations/write-code-ai-agents-love/research/paper-text/a3-codgen-2312.05772.txt)`

**Official docs**

- [TypeScript: Narrowing / discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript: `noImplicitAny](https://www.typescriptlang.org/tsconfig/#noImplicitAny)`
- [TypeScript 4.9: `satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

### Generated SDKs

When it comes to generating SDKs, this was a good idea before AI started to take over the world. Now I think it is even more obviously a good idea.

Backend-to-frontend API communication, or service-to-service communication, has always been a problem. You can implement the client and the server separately and then try to thread the contract between them in English, but that is hard and error-prone. It is hard to clearly define an API contract in prose.

In code, it is much easier. Define the contract as types. Generate the DTOs and client functions. Use those in the frontend or in the service that communicates over the API.

That makes the feedback loop for agents tremendously fast. If I change something in an API from optional to required, that change should be reflected in the SDK I generate. If I work with TypeScript in the frontend, the compiler can now tell me where the old call sites are wrong.

The research here is adjacent, not direct, but the failure modes line up:


| Signal                                                                                                     | Why it matters for SDKs                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| ToolGen improved dependency coverage by 31.4-39.1% and static validity by 44.9-57.7%                       | Visible symbols reduce invented dependencies            |
| Type-constrained code generation found about 94% of TypeScript compilation errors were type-check failures | Typed API shapes catch wrong payloads and fields        |
| DocPrompting improved CodeT5 pass@1 by 2.85 points, a 52% relative gain                                    | API usage context helps models call unfamiliar surfaces |


None of these papers proves generated SDKs by itself. I would state it as an inference: if API docs, valid symbols, and type facts help models avoid wrong calls, then generated clients are the practical way to put those signals directly in the repo.

That is exactly what I want for agents. I want the agent to understand where it is using a DTO incorrectly. I want it to see the type error, understand what changed, and either fix the usage or surface the question to me while it is working on the feature.

This was a good idea before. Now it is just a very, very good idea.

Of course, we have things like tRPC, which I think are great for this. But tRPC also pushes you toward TypeScript on the backend. I prefer my backend in Go-flavored ice cream. So for me, generated SDKs are the clean version of the same idea: keep the backend language I want, but still give the frontend a typed, generated contract.

The tooling will evolve as well, but the principle is already clear:

> If the API contract matters, make it code the agent can import.

**Insights:** [INSIGHT_20](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_20_generated_sdks_turn_api_contracts_into_code.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md) · [INSIGHT_19](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_19_monorepos_are_agent_context_infrastructure.md)

**Papers**

- [DocPrompting](https://arxiv.org/abs/2207.05987) — `[docprompting-2207.05987.pdf](../../presentations/write-code-ai-agents-love/research/papers/docprompting-2207.05987.pdf)` · `[docprompting-2207.05987.txt](../../presentations/write-code-ai-agents-love/research/paper-text/docprompting-2207.05987.txt)`
- [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) — `[type-constrained-codegen-2504.09246.pdf](../../presentations/write-code-ai-agents-love/research/papers/type-constrained-codegen-2504.09246.pdf)` · `[type-constrained-codegen-2504.09246.txt](../../presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt)`
- [ToolGen](https://arxiv.org/abs/2401.06391) — `[toolgen-autocomplete-repo-codegen-2401.06391.pdf](../../presentations/write-code-ai-agents-love/research/papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf)` · `[toolgen-autocomplete-repo-codegen-2401.06391.txt](../../presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt)`
- [RAR: Retrieval Augmented Retrieval for Code Generation](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) — `[rar-retrieval-augmented-retrieval-2024.pdf](../../presentations/write-code-ai-agents-love/research/papers/rar-retrieval-augmented-retrieval-2024.pdf)` · `[rar-retrieval-augmented-retrieval-2024.txt](../../presentations/write-code-ai-agents-love/research/paper-text/rar-retrieval-augmented-retrieval-2024.txt)`

**Practitioner**

- [OpenAPI Generator](https://openapi-generator.tech/index.html) — `[openapi-generator.html](../../presentations/write-code-ai-agents-love/research/articles/openapi-generator.html)`
- [Microsoft Kiota](https://learn.microsoft.com/en-us/openapi/kiota/) — `[microsoft-kiota.html](../../presentations/write-code-ai-agents-love/research/articles/microsoft-kiota.html)`
- [Orval](https://orval.dev/docs) — `[orval-docs.html](../../presentations/write-code-ai-agents-love/research/articles/orval-docs.html)`
- [Speakeasy: Generate SDKs from OpenAPI](https://www.speakeasy.com/docs/sdks/create-client-sdks) — `[speakeasy-generate-sdks.html](../../presentations/write-code-ai-agents-love/research/articles/speakeasy-generate-sdks.html)`
- [Stainless TypeScript SDKs](https://www.stainless.com/docs/sdks/typescript/) — `[stainless-typescript-sdk.html](../../presentations/write-code-ai-agents-love/research/articles/stainless-typescript-sdk.html)`
- [FastAPI: Generate clients](https://fastapi.tiangolo.com/advanced/generate-clients/) — `[fastapi-generate-clients.html](../../presentations/write-code-ai-agents-love/research/articles/fastapi-generate-clients.html)`

### Side effects & dynamic surfaces

The point is not "never use side effects." Real systems have side effects. They send emails, enqueue jobs, mutate databases, register handlers, read environment variables, and talk to APIs.

The problem is invisible side effects. If behavior is wired through import-time registration, string registries, reflection, glob-loaded plugins, monkeypatching, or environment-driven branches, the architecture moves out of the code graph and into runtime folklore.

Humans can sometimes learn that by being around the system long enough. Agents mostly learn through grep, ASTs, typecheckers, language servers, tests, and generated manifests. If those tools cannot see the edge, the agent has to infer it.

So side effects need static handles.

```ts
// Hard for agents: importing this file changes the application.
import "@/billing/register-invoice-events";

// Somewhere else:
register("invoice.paid", async payload => {
  const handler = handlers[payload.type];
  return handler(payload);
});
```

The behavior exists, but the surface is poor. The event name is a string. The payload shape is implied. The registry is mutable. The import is only there for its side effect. The agent may edit the handler and miss the registration path entirely.

Prefer an exported, typed manifest:

```ts
export const invoicePaidEvent = defineEvent({
  name: "invoice.paid",
  payload: InvoicePaidPayloadSchema,
});

export const billingEventHandlers = {
  [invoicePaidEvent.name]: handleInvoicePaid,
} satisfies EventHandlerRegistry;
```

Now the dynamic behavior still exists, but it has a static address. The event can be searched. The payload has a schema. The registry has a type. The handler is imported by name.

The research does not prove that "dynamic imports cause X% worse agent performance." That would be too neat. But the direction is clear. AutoCodeRover uses AST-based search instead of flat files. GraphCodeAgent loses performance when graph traversal is removed: GPT-4o DevEval Pass@1 drops from 58.14 to 51.83. RepoGraph also helps, with the important caveat that more graph is not always better: in one SWE-bench-Lite setup, 1-hop flat context reached 29.67% resolve while larger 2-hop flat context fell to 26.00%.

The lesson is not "dump the graph into the prompt." The lesson is: make the important edges visible enough that tools can select the right slice. Make it "AST-able".

A side effect the agent cannot see is a dependency it cannot protect.

**Insights:** [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md) · [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_21](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md) · [INSIGHT_07](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md)

**Papers**

- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — `[graphcodeagent-2504.10046.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf)` · `[graphcodeagent-2504.10046.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)`
- [RepoGraph](https://arxiv.org/abs/2410.14684) — `[repograph-2410.14684.pdf](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf)` · `[repograph-2410.14684.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)`
- [AutoCodeRover](https://arxiv.org/abs/2404.05427) — `[autocoderover-2404.05427.pdf](../../presentations/write-code-ai-agents-love/research/papers/autocoderover-2404.05427.pdf)` · `[autocoderover-2404.05427.txt](../../presentations/write-code-ai-agents-love/research/paper-text/autocoderover-2404.05427.txt)`

Plot data: `[repository_graph_context.csv](../../presentations/write-code-ai-agents-love/research/data/repository_graph_context.csv)`

### Multi-file ripple

Most real product work is not one edit. It is a first edit plus everything that edit forces elsewhere.

Change a function signature and the callers move. Add a route and the client, auth rule, tests, telemetry, and generated SDK move. Add a database field and the migration, repository, serializers, fixtures, and UI state move. The local patch can look perfectly reasonable and still be wrong because the hard part is the propagation.

This is the cleanest model:

```txt
seed edit:    the first place the change is obviously requested
derived edit: a second edit forced by dependency, contract, behavior, or constraint
oracle:       the check that proves both the new behavior and old behavior survived
```

The research backs this shape, but not in a magical way. [CodePlan](https://arxiv.org/abs/2309.12499) treats repository-level coding as a planning problem: start from seed edits, then use dependency and impact analysis to find the edits that follow. In its evaluation, CodePlan got 5/6 repositories to pass validity checks, while baselines without planning got 0/6. Small sample, old tooling, and not a universal proof. Still, the mental model is right: do not make the agent guess the ripple.

[RACE-bench](https://arxiv.org/abs/2603.26337) shows the same failure mode from the other side. AutoCodeRover applied patches in 96.21% of feature tasks but resolved only 28.79%. mini-SWE-Agent applied 95.83% and resolved 70.08%. A patch can apply cleanly and still miss the actual feature.

[Constraint Decay](https://arxiv.org/abs/2605.06445) makes it more production-shaped. As framework, architecture, database, and ORM constraints pile up, capable configurations lose about 30 percentage points of assertion pass rate. That is not an argument against constraints. Constraints are the product. It is an argument against hidden constraints.

So the advice is not "make every change single-file." That is childish. The advice is: make the ripple legible.

Bad task:

```txt
Add invoice credits.
```

Better task:

```txt
Goal:
- Customers can apply invoice credits before payment collection.

Seed surface:
- `billing/credits/createCredit.ts`
- `billing/invoices/applyCredits.ts`

Expected ripple:
- API route accepts `creditId`
- invoice total calculation includes applied credits
- payment collection uses adjusted total
- ledger entry is created for each applied credit
- generated SDK exposes the new request field
- existing invoice-payment behavior still passes without credits

Validation:
- unit tests for credit application
- integration test for invoice payment with and without credits
- typecheck catches generated SDK/request-shape drift
- migration test proves old invoices still load
```

That is not bureaucracy. That is the plan graph in human form. This also builds your mental model of the change that is about to happend, making it easier for you to review it later on.

The skeptical read is obvious: none of this proves your production repo gets better because you wrote a nicer task. CodePlan is small. RACE-bench and FeatureBench are benchmark harnesses. Constraint Decay is partly greenfield backend generation. Stronger models will reduce some misses.

But stronger models do not remove ripple. They only make the local patch better. The underlying job is still to find every dependent obligation and satisfy it without breaking old behavior. If the repo exposes those obligations as imports, types, schemas, tests, generated clients, route maps, lint rules, and examples, the agent has evidence. If the repo hides them in convention and memory, the agent has vibes.

But, create an architecture with "reasonable ripple", so you do not get 10x change coupeling engineers.

**Insights:** [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_22](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md) · [INSIGHT_11](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_11_task_specs_are_part_of_the_codebase.md) · [INSIGHT_28](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_28_static_oracles_catch_what_tests_miss.md)

**Papers**

- [CodePlan](https://arxiv.org/abs/2309.12499) — `[codeplan-2309.12499.pdf](../../presentations/write-code-ai-agents-love/research/papers/codeplan-2309.12499.pdf)` · `[codeplan-2309.12499.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codeplan-2309.12499.txt)`
- [In Line with Context: Repository-Level Code Generation via Context Inlining](https://arxiv.org/abs/2601.00376) — `[inlinecoder-context-inlining-2601.00376.pdf](../../presentations/write-code-ai-agents-love/research/papers/inlinecoder-context-inlining-2601.00376.pdf)` · `[inlinecoder-context-inlining-2601.00376.txt](../../presentations/write-code-ai-agents-love/research/paper-text/inlinecoder-context-inlining-2601.00376.txt)`
- [RACE-bench](https://arxiv.org/abs/2603.26337) — `[race-bench-feature-addition-2603.26337.pdf](../../presentations/write-code-ai-agents-love/research/papers/race-bench-feature-addition-2603.26337.pdf)` · `[race-bench-feature-addition-2603.26337.txt](../../presentations/write-code-ai-agents-love/research/paper-text/race-bench-feature-addition-2603.26337.txt)`
- [Constraint Decay](https://arxiv.org/abs/2605.06445) — `[constraint-decay-2605.06445.pdf](../../presentations/write-code-ai-agents-love/research/papers/constraint-decay-2605.06445.pdf)` · `[constraint-decay-2605.06445.txt](../../presentations/write-code-ai-agents-love/research/paper-text/constraint-decay-2605.06445.txt)`
- [FeatureBench](https://arxiv.org/abs/2602.10975) — `[featurebench-2602.10975.pdf](../../presentations/write-code-ai-agents-love/research/papers/featurebench-2602.10975.pdf)` · `[featurebench-2602.10975.txt](../../presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt)`
- [FEA-Bench](https://arxiv.org/abs/2503.06680) — `[fea-bench-2503.06680.pdf](../../presentations/write-code-ai-agents-love/research/papers/fea-bench-2503.06680.pdf)` · `[fea-bench-2503.06680.txt](../../presentations/write-code-ai-agents-love/research/paper-text/fea-bench-2503.06680.txt)`

Plot data: `[feature_constraints_planning.csv](../../presentations/write-code-ai-agents-love/research/data/feature_constraints_planning.csv)`

### Domain vocabulary

Domain vocabulary matters when the agent has to connect the same product concept across files. Inside a bounded context, one concept should have one searchable name. Names are how the agent joins evidence across the codebase. When the same concept has five names, you have created five retrieval problems.

```txt
student in the frontend
pupil in the API
learner in the database
member in tests
participant in docs
```

A human may know this is historical sediment. The agent does not. It searches for "student" and misses the test named "adds member to course." It edits `LearnerProfile` and misses `StudentEnrollment`. The cost is lost locality.

Do not force one global noun across the whole company. That becomes its own stupidity. `Account` can mean a billing account, a login account, or a customer account. Fine. But inside one bounded context, accidental synonym drift is debt.

The research is narrower than production-agent editing, but it is enough for this claim: identifiers carry meaning. In "How Does Naming Affect LLMs on Code Analysis Tasks?", GraphCodeBERT's code-search MRR drops from 70.36% to 17.03% on Java and from 68.17% to 23.73% on Python when names are perturbed. In "When Names Disappear", GPT-4o drops from 87.3 to 58.7 on ClassEval summarization after obfuscation; DeepSeek V3 drops from 87.7 to 76.7.

Product code leans hard on domain nouns. Billing, permissions, attendance, entitlements, and compliance do not explain themselves through algorithmic structure. The noun is often the map.

So this is agent-hostile:

```ts
// api/enrollment.ts
export async function enrollPupil(pupilId: string, courseId: string) {}

// db/schema.ts
export const learnerEnrollments = table("learner_enrollments", {});

// tests/course-membership.test.ts
it("adds a member to a course", async () => {});

// events.ts
export const participantJoinedCourse = "participant.joined_course";
```

Prefer this:

```ts
// api/enrollment.ts
export async function enrollStudent(studentId: string, courseId: string) {}

// db/schema.ts
export const studentEnrollments = table("student_enrollments", {});

// tests/student-enrollment.test.ts
it("enrolls a student in a course", async () => {});

// events.ts
export const studentEnrolledInCourse = "student.enrolled_in_course";
```

Now search, tests, types, and events all point at `student`. The agent does not have to decide whether `participant` means `student` or a different role.

External boundaries are the exception. Stripe can say `customer` while your product says `BillingAccount`. That is fine. Put the translation in the adapter. Do not smear both words through the whole codebase and hope the agent guesses which one matters.

A vocabulary note can help, but only if the code agrees with it. The stronger version is executable: schema names, event names, API operation names, generated SDK methods, and tests all use the same noun. A glossary that the code contradicts is stale prose.

Names will not save a tangled system. They are not types, tests, or architecture. But they are semantic handles. If your domain language is inconsistent, you are removing handles and adding false ones.

Agents grep, be grep-friendly!

**Insights:** [INSIGHT_13](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md)

**Papers**

- [CodeT5](https://arxiv.org/abs/2109.00859) — `[codet5-identifier-aware-2109.00859.pdf](../../presentations/write-code-ai-agents-love/research/papers/codet5-identifier-aware-2109.00859.pdf)` · `[codet5-identifier-aware-2109.00859.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codet5-identifier-aware-2109.00859.txt)`
- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) — `[naming-affects-llms-code-analysis-2307.12488.pdf](../../presentations/write-code-ai-agents-love/research/papers/naming-affects-llms-code-analysis-2307.12488.pdf)` · `[naming-affects-llms-code-analysis-2307.12488.txt](../../presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt)`
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — `[when-names-disappear-2510.03178.pdf](../../presentations/write-code-ai-agents-love/research/papers/when-names-disappear-2510.03178.pdf)` · `[when-names-disappear-2510.03178.txt](../../presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt)`
- [ToolGen](https://arxiv.org/abs/2401.06391) — `[toolgen-autocomplete-repo-codegen-2401.06391.pdf](../../presentations/write-code-ai-agents-love/research/papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf)` · `[toolgen-autocomplete-repo-codegen-2401.06391.txt](../../presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

## The Tools

The useful tools are the ones the agent can run after an edit.

In this section, tools means verification: tests, typecheck, lint, build, and repo-specific policy checks. The agent makes a plausible change, runs a check, reads the failure, fixes it, and loops. The better the diagnostic, the less the agent has to guess.

Regular tools catch regular failures. Tests catch behavior. Typecheck catches API misuse. Build catches integration drift. Normal linters catch general code hygiene. But many important repo rules live above that level: which layer may import which layer, where API calls are allowed, which selectors are stable enough for E2E tests, which paths must go through a typed boundary, which patterns should never come back after a refactor.

This is where I think `polint` is can be useful.

With `polint`, the useful unit is the failure the agent sees: a scoped repo rule, a file, a line, and a repair message. Instead of asking the agent to "please respect the architecture", give it something closer to:

```text
backend/orders/ports/http.go:42:17 local/no-route-db-access
Routes must not import the ORM directly. Move persistence behind the application command.
```

That is much easier for an agent to fix than a paragraph in `AGENTS.md`.

The enforcement I would start with:

| Enforcement | Why it helps agents |
| --- | --- |
| Routes cannot import ORM/database packages | Keeps the edit inside the application boundary instead of patching persistence from the edge. |
| Feature code cannot call raw HTTP when a generated SDK exists | Prevents hallucinated endpoints and stringly typed service calls. |
| Generated SDK files cannot be edited by hand | Forces the agent back to the OpenAPI/schema source. |
| E2E tests cannot use sleep-based waits | Turns flaky verification into event-based verification. |
| Cross-context imports are denied except through approved boundaries | Stops a local fix from creating a hidden architecture dependency. |
| Config code cannot silently fall back to defaults in production paths | Makes setup failures loud instead of mysterious. |

This is the right level for `polint`: mechanical, repo-specific checks that normal linters do not know. "Write clean code" is a bad rule. "Do not import `database/sql` from `*/ports/http.go`" is a good one. The best rules are boring enough that a reviewer should not have to explain them twice.

The research points the same way. [CODETASTE](https://arxiv.org/abs/2603.04177) uses repository tests plus custom static checks because refactoring correctness is not only "does the test suite pass?" [Needle in the Repo](https://arxiv.org/abs/2603.27745) found 64 of 483 passing-test cases where the structural or maintainability oracle still failed. I would not overfit that exact number to every repo, but the failure mode is real: tests can be green while the code lands in the wrong shape.

For agents, adding these things to its verification loop have been really powerful in my experience. Every time it fails and I can programatically "lint" the failure to never happend again I do it. This is part of what compounding quality means to me.

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_17](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_17_quality_gates_must_cover_smells.md) · [INSIGHT_27](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_27_static_diagnostics_are_agent_interfaces.md) · [INSIGHT_28](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_28_static_oracles_catch_what_tests_miss.md)

**Sources:** [CODETASTE](https://arxiv.org/abs/2603.04177) · [Needle in the Repo](https://arxiv.org/abs/2603.27745) · [polint README](https://github.com/emilwareus/polint) · [polint Agent Playbook](https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md)
