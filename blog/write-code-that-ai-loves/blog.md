# Thoughts

- Devide the blogpost into a few "main topics" of the agent steps
  - Prompt
    - Are you a good human that writes good prompt?
  - Orient: Where am I? What kind of repo is this? What rules matter?
    - Strucutre
    - AGENTS.md explaining that briefely, Architecture map
    - Monorepo
  - Retrieve: Which files, symbols, tests, schemas, and examples are relevant?
    - Bounded contexts (Coherent neighborhoods) / Repo Layout
    - Code Quality 
    - Architecture
    - Subagents
    - Tools and graphs
    - Naming
    - Importgraphs and dependency edges
    - Domain vocabulary
  - Edit: What is the smallest change that fits the existing system?
    - Code Quality
    - Typing
    - Interfaces
    - Generated SDKs vs raw api calls service-to-service
    - Multi-file-ripple
    - Side-effects
    - Vis absent / valid noop (everything is already fixed!)
    - Enforced patterns (executable invariants) (polint during edit)
    - ...?
  - Verify: Which checks prove the change is correct?
    - Test test test tests
    - Feedback speed
    - Verification loop
    - Linting and static analysis
    - Non-flakyness
    - Structural correccness vs functional pass

ARTICLE STRUCTURE

# The loop

## Prompt

## Orient

- Image the the whale from a hitchikers guide to the galaxy falling from the sky, trying to orient its existance.

## Retrieve

## Editing

## Verify

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

## Strucutre

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

Structural maintainability (coupling, cohesion, complexity)—not “does it look pretty.” Code for Machines: CodeHealth ≥9 reduced refactoring break rates by 8–15 percentage points across five medium-sized models. File-level perplexity does not predict CodeHealth (r ≈ −0.01). LLM-generated code carries 42–85% more structural smells vs professional references. Needle in the Repo: 13.3% of outcomes functionally correct but structurally wrong.

**Insights:** [INSIGHT_30](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_30_codehealth_predicts_ai_refactoring_success.md) · [INSIGHT_31](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_31_perplexity_is_not_file_level_ai_friendliness.md) · [INSIGHT_05](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_05_maintainability_beats_one_shot_correctness.md)

**Papers**

- [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200) — `[code-for-machines-2601.02200.pdf](../../presentations/write-code-ai-agents-love/research/papers/code-for-machines-2601.02200.pdf)`
- [Echoes of AI](https://arxiv.org/abs/2507.00788) — `[echoes-of-ai-2507.00788.pdf](../../presentations/write-code-ai-agents-love/research/papers/echoes-of-ai-2507.00788.pdf)`
- [How do Humans and LLMs Process Confusing Code?](https://arxiv.org/abs/2508.18547) — `[humans-llms-confusing-code-2508.18547.pdf](../../presentations/write-code-ai-agents-love/research/papers/humans-llms-confusing-code-2508.18547.pdf)`
- [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) — `[smells-llm-generated-code-2510.03029.pdf](../../presentations/write-code-ai-agents-love/research/papers/smells-llm-generated-code-2510.03029.pdf)` · `[smells-llm-generated-code-2510.03029.txt](../../presentations/write-code-ai-agents-love/research/paper-text/smells-llm-generated-code-2510.03029.txt)`
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — `[needle-in-the-repo-2603.27745.pdf](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf)` · `[needle-in-the-repo-2603.27745.txt](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)`
- [SWE-CI](https://arxiv.org/abs/2603.03823) — `[swe-ci-2603.03823.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-ci-2603.03823.pdf)` · `[swe-ci-2603.03823.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-ci-2603.03823.txt)`

### Tests

Primary agent feedback loop: run tests, read failures, patch, repeat (SWE-bench paradigm). FeatureBench: visible unit tests improved resolved rate +50.0 pp (Gemini-3-Pro) and +43.3 pp (GPT-5.1-Codex) on Lite set. Rethinking agent-generated tests: GPT-5.2 wrote tests in 0.6% of tasks while resolving 71.8%; pushing more test-writing did not improve resolution. Tests catch behavior; they miss structural intent (Needle in the Repo).

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_17](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_17_quality_gates_must_cover_smells.md)

**Papers**

- [SWE-bench](https://arxiv.org/abs/2310.06770) — `[swe-bench-2310.06770.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-bench-2310.06770.pdf)` · `[swe-bench-2310.06770.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt)`
- [Agentless](https://arxiv.org/abs/2407.01489) — `[agentless-2407.01489.pdf](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf)` · `[agentless-2407.01489.txt](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)`
- [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) — `[rethinking-agent-generated-tests-2602.07900.pdf](../../presentations/write-code-ai-agents-love/research/papers/rethinking-agent-generated-tests-2602.07900.pdf)` · `[rethinking-agent-generated-tests-2602.07900.txt](../../presentations/write-code-ai-agents-love/research/paper-text/rethinking-agent-generated-tests-2602.07900.txt)`
- [FeatureBench](https://arxiv.org/abs/2602.10975) — `[featurebench-2602.10975.pdf](../../presentations/write-code-ai-agents-love/research/papers/featurebench-2602.10975.pdf)` · `[featurebench-2602.10975.txt](../../presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt)`
- [ABTest](https://arxiv.org/abs/2604.03362) — `[abtest-agent-anomalies-2604.03362.pdf](../../presentations/write-code-ai-agents-love/research/papers/abtest-agent-anomalies-2604.03362.pdf)` · `[abtest-agent-anomalies-2604.03362.txt](../../presentations/write-code-ai-agents-love/research/paper-text/abtest-agent-anomalies-2604.03362.txt)`
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — `[needle-in-the-repo-2603.27745.pdf](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf)` · `[needle-in-the-repo-2603.27745.txt](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)`

**Practitioner**

- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — `[anthropic-claude-code-best-practices.html](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)`

### Examples as specs

Nearest working code, tests, and docs are the spec—not a separate design doc. DocPrompting: retrieving relevant docs improved pass@1 by +2.85% (52% relative). FeatureBench: visible tests gave +50.0 / +43.3 pp resolved rate (see Tests). CodePlan: dependency-aware planning passed 5/6 repos vs 0/6 without planning.

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_22](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md) · [INSIGHT_11](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_11_task_specs_are_part_of_the_codebase.md)

**Papers**

- [DocPrompting](https://arxiv.org/abs/2207.05987) — `[docprompting-2207.05987.pdf](../../presentations/write-code-ai-agents-love/research/papers/docprompting-2207.05987.pdf)` · `[docprompting-2207.05987.txt](../../presentations/write-code-ai-agents-love/research/paper-text/docprompting-2207.05987.txt)`
- [FeatureBench](https://arxiv.org/abs/2602.10975) — `[featurebench-2602.10975.pdf](../../presentations/write-code-ai-agents-love/research/papers/featurebench-2602.10975.pdf)` · `[featurebench-2602.10975.txt](../../presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt)`
- [RAR: Retrieval Augmented Retrieval for Code Generation](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) — `[rar-retrieval-augmented-retrieval-2024.pdf](../../presentations/write-code-ai-agents-love/research/papers/rar-retrieval-augmented-retrieval-2024.pdf)` · `[rar-retrieval-augmented-retrieval-2024.txt](../../presentations/write-code-ai-agents-love/research/paper-text/rar-retrieval-augmented-retrieval-2024.txt)`
- [CodePlan](https://arxiv.org/abs/2309.12499) — `[codeplan-2309.12499.pdf](../../presentations/write-code-ai-agents-love/research/papers/codeplan-2309.12499.pdf)` · `[codeplan-2309.12499.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codeplan-2309.12499.txt)`

### Naming

Identifiers are search handles and semantic anchors for agents. When Names Disappear: GPT-4o ClassEval summarization dropped 87.3 → 58.7 under semantics-preserving obfuscation (nonsense/misleading names). Same behavior, worse names → worse analysis. If the agent cannot grep by concept, it guesses from surrounding text.

**Insights:** [INSIGHT_13](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md)

**Papers**

- [CodeT5](https://arxiv.org/abs/2109.00859) — `[codet5-identifier-aware-2109.00859.pdf](../../presentations/write-code-ai-agents-love/research/papers/codet5-identifier-aware-2109.00859.pdf)` · `[codet5-identifier-aware-2109.00859.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codet5-identifier-aware-2109.00859.txt)`
- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) — `[naming-affects-llms-code-analysis-2307.12488.pdf](../../presentations/write-code-ai-agents-love/research/papers/naming-affects-llms-code-analysis-2307.12488.pdf)` · `[naming-affects-llms-code-analysis-2307.12488.txt](../../presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt)`
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — `[when-names-disappear-2510.03178.pdf](../../presentations/write-code-ai-agents-love/research/papers/when-names-disappear-2510.03178.pdf)` · `[when-names-disappear-2510.03178.txt](../../presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt)`
- [CodeBERT](https://arxiv.org/abs/2002.08155) — `[codebert-2002.08155.pdf](../../presentations/write-code-ai-agents-love/research/papers/codebert-2002.08155.pdf)` · `[codebert-2002.08155.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codebert-2002.08155.txt)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

### Types

Types compress valid API usage into something the model and compiler can check. Type-Constrained Code Generation: >50% reduction in compilation errors, +3.5–5.5% relative functional correctness. CatCoder: type context improved Java pass@k up to +17.35%; removing types dropped up to −11.57%. ToolGen: visible symbols reduce undefined-variable and no-member errors.

**Insights:** [INSIGHT_06](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_06_types_and_interfaces_compress_context.md) · [INSIGHT_14](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_14_types_and_static_surfaces_reduce_hallucinated_apis.md)

**Papers**

- [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) — `[type-constrained-codegen-2504.09246.pdf](../../presentations/write-code-ai-agents-love/research/papers/type-constrained-codegen-2504.09246.pdf)` · `[type-constrained-codegen-2504.09246.txt](../../presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt)`
- [CatCoder](https://arxiv.org/abs/2406.03283) — `[catcoder-2406.03283.pdf](../../presentations/write-code-ai-agents-love/research/papers/catcoder-2406.03283.pdf)` · `[catcoder-2406.03283.txt](../../presentations/write-code-ai-agents-love/research/paper-text/catcoder-2406.03283.txt)`
- [ToolGen](https://arxiv.org/abs/2401.06391) — `[toolgen-autocomplete-repo-codegen-2401.06391.pdf](../../presentations/write-code-ai-agents-love/research/papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf)` · `[toolgen-autocomplete-repo-codegen-2401.06391.txt](../../presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

### Dependency surface

Recoverable import/call/type edges across files—not “similar text” retrieval. CrossCodeEval: retrieved cross-file context improved StarCoder-15.5B Python exact match 8.82% → 15.72%. GraphCodeAgent: Pass@1 40.43 → 58.14 vs best baseline on DevEval. Plain embedding similarity is insufficient for repo-scale edits.

**Insights:** [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md)

**Papers**

- [CrossCodeEval](https://arxiv.org/abs/2310.11248) — `[crosscodeeval-2310.11248.pdf](../../presentations/write-code-ai-agents-love/research/papers/crosscodeeval-2310.11248.pdf)` · `[crosscodeeval-2310.11248.txt](../../presentations/write-code-ai-agents-love/research/paper-text/crosscodeeval-2310.11248.txt)`
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — `[graphcodeagent-2504.10046.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf)` · `[graphcodeagent-2504.10046.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)`
- [GraphCodeBERT](https://arxiv.org/abs/2009.08366) — `[graphcodebert-2009.08366.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodebert-2009.08366.pdf)` · `[graphcodebert-2009.08366.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodebert-2009.08366.txt)`
- [CodeGRAG](https://arxiv.org/abs/2405.02355) — `[codegrag-2405.02355.pdf](../../presentations/write-code-ai-agents-love/research/papers/codegrag-2405.02355.pdf)` · `[codegrag-2405.02355.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codegrag-2405.02355.txt)`
- [What to Retrieve for Effective Retrieval-Augmented Code Generation?](https://arxiv.org/abs/2503.20589) — `[what-to-retrieve-racg-2503.20589.pdf](../../presentations/write-code-ai-agents-love/research/papers/what-to-retrieve-racg-2503.20589.pdf)` · `[what-to-retrieve-racg-2503.20589.txt](../../presentations/write-code-ai-agents-love/research/paper-text/what-to-retrieve-racg-2503.20589.txt)`

**Practitioner**

- [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — `[nx-enforce-module-boundaries.html](../../presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html)`

### Generated SDKs

Generate typed client code from OpenAPI/GraphQL/etc. instead of raw fetch/string URLs. Same pattern as DocPrompting and ToolGen: visible typed API surfaces reduce compile and usage errors. Orval, Kiota, openapi-generator make contracts grep-able and typecheck-able in-repo.

**Insights:** [INSIGHT_20](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_20_generated_sdks_turn_api_contracts_into_code.md)

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

Static imports, exports, routes, and schemas are agent-readable. Dynamic imports, reflection, string registries, and import-time side effects break dependency graphs and grep. AutoCodeRover uses AST-based search for localization when structure is visible. If tools cannot graph it, the agent cannot reliably reason about what a change affects.

**Insights:** [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md) · [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md)

**Papers**

- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — `[graphcodeagent-2504.10046.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf)` · `[graphcodeagent-2504.10046.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)`
- [RepoGraph](https://arxiv.org/abs/2410.14684) — `[repograph-2410.14684.pdf](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf)` · `[repograph-2410.14684.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)`
- [AutoCodeRover](https://arxiv.org/abs/2404.05427) — `[autocoderover-2404.05427.pdf](../../presentations/write-code-ai-agents-love/research/papers/autocoderover-2404.05427.pdf)` · `[autocoderover-2404.05427.txt](../../presentations/write-code-ai-agents-love/research/paper-text/autocoderover-2404.05427.txt)`

### Multi-file ripple

Edits propagate along dependency edges; single-file fixes are the exception. CodePlan: with dependency-aware planning 5/6 repos passed vs 0/6 baselines. RACE-bench: AutoCodeRover 96.21% patch apply rate but 28.79% resolution; mini-SWE-Agent 95.83% apply, 70.08% resolution—applying a patch ≠ understanding the task. Constraint Decay: production-like structural requirements caused ~30 pp assertion-pass drop.

**Insights:** [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_22](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md)

**Papers**

- [CodePlan](https://arxiv.org/abs/2309.12499) — `[codeplan-2309.12499.pdf](../../presentations/write-code-ai-agents-love/research/papers/codeplan-2309.12499.pdf)` · `[codeplan-2309.12499.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codeplan-2309.12499.txt)`
- [In Line with Context: Repository-Level Code Generation via Context Inlining](https://arxiv.org/abs/2601.00376) — `[inlinecoder-context-inlining-2601.00376.pdf](../../presentations/write-code-ai-agents-love/research/papers/inlinecoder-context-inlining-2601.00376.pdf)` · `[inlinecoder-context-inlining-2601.00376.txt](../../presentations/write-code-ai-agents-love/research/paper-text/inlinecoder-context-inlining-2601.00376.txt)`
- [RACE-bench](https://arxiv.org/abs/2603.26337) — `[race-bench-feature-addition-2603.26337.pdf](../../presentations/write-code-ai-agents-love/research/papers/race-bench-feature-addition-2603.26337.pdf)` · `[race-bench-feature-addition-2603.26337.txt](../../presentations/write-code-ai-agents-love/research/paper-text/race-bench-feature-addition-2603.26337.txt)`
- [Constraint Decay](https://arxiv.org/abs/2605.06445) — `[constraint-decay-2605.06445.pdf](../../presentations/write-code-ai-agents-love/research/papers/constraint-decay-2605.06445.pdf)` · `[constraint-decay-2605.06445.txt](../../presentations/write-code-ai-agents-love/research/paper-text/constraint-decay-2605.06445.txt)`
- [FEA-Bench](https://arxiv.org/abs/2503.06680) — `[fea-bench-2503.06680.pdf](../../presentations/write-code-ai-agents-love/research/papers/fea-bench-2503.06680.pdf)` · `[fea-bench-2503.06680.txt](../../presentations/write-code-ai-agents-love/research/paper-text/fea-bench-2503.06680.txt)`

Plot data: `[feature_constraints_planning.csv](../../presentations/write-code-ai-agents-love/research/data/feature_constraints_planning.csv)`

### Domain vocabulary

One concept, many synonyms (student/pupil/learner) forces the agent to infer links that names should encode. Same evidence as Naming: obfuscation and inconsistent terms hurt analysis even when runtime behavior is unchanged. Stable domain terms across code, tests, and docs improve retrieval and reasoning.

**Insights:** [INSIGHT_13](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md)

**Papers**

- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) — `[naming-affects-llms-code-analysis-2307.12488.pdf](../../presentations/write-code-ai-agents-love/research/papers/naming-affects-llms-code-analysis-2307.12488.pdf)` · `[naming-affects-llms-code-analysis-2307.12488.txt](../../presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt)`
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — `[when-names-disappear-2510.03178.pdf](../../presentations/write-code-ai-agents-love/research/papers/when-names-disappear-2510.03178.pdf)` · `[when-names-disappear-2510.03178.txt](../../presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt)`

### Patterns

Repeatable local idioms the agent can copy from the nearest similar feature—not abstract “best practices” prose. Agentless simple localize→repair→validate workflow competitive on SWE-bench. AIDev: 932k agent PRs differ in shape from human PRs. CODETASTE combines tests + static rules for refactoring evaluation. Executable lint rules beat prose architecture docs.

**Insights:** [INSIGHT_07](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md) · [INSIGHT_15](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_15_modularity_is_not_magic_boundaries_are.md) · [INSIGHT_18](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_18_custom_lint_rules_are_executable_architecture.md) · [INSIGHT_25](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_25_agentic_prs_have_a_different_shape.md)

**Papers**

- [Agentless](https://arxiv.org/abs/2407.01489) — `[agentless-2407.01489.pdf](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf)` · `[agentless-2407.01489.txt](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)`
- [Architecture Without Architects](https://arxiv.org/abs/2604.04990) — `[architecture-without-architects-2604.04990.pdf](../../presentations/write-code-ai-agents-love/research/papers/architecture-without-architects-2604.04990.pdf)` · `[architecture-without-architects-2604.04990.txt](../../presentations/write-code-ai-agents-love/research/paper-text/architecture-without-architects-2604.04990.txt)`
- [How AI Coding Agents Modify Code](https://arxiv.org/abs/2601.17581) — `[how-ai-coding-agents-modify-code-2601.17581.pdf](../../presentations/write-code-ai-agents-love/research/papers/how-ai-coding-agents-modify-code-2601.17581.pdf)` · `[how-ai-coding-agents-modify-code-2601.17581.txt](../../presentations/write-code-ai-agents-love/research/paper-text/how-ai-coding-agents-modify-code-2601.17581.txt)`
- [AIDev: The First Comprehensive Dataset of Agentic-PRs](https://arxiv.org/abs/2602.09185) — `[aidev-agentic-prs-2602.09185.pdf](../../presentations/write-code-ai-agents-love/research/papers/aidev-agentic-prs-2602.09185.pdf)` · `[aidev-agentic-prs-2602.09185.txt](../../presentations/write-code-ai-agents-love/research/paper-text/aidev-agentic-prs-2602.09185.txt)`
- [CODETASTE](https://arxiv.org/abs/2603.04177) — `[codetaste-2603.04177.pdf](../../presentations/write-code-ai-agents-love/research/papers/codetaste-2603.04177.pdf)` · `[codetaste-2603.04177.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codetaste-2603.04177.txt)`

Plot data: `[agentic_pr_change_shape.csv](../../presentations/write-code-ai-agents-love/research/data/agentic_pr_change_shape.csv)`

**Practitioner**

- [Aider coding conventions](https://aider.chat/docs/usage/conventions.html) — `[aider-coding-conventions.html](../../presentations/write-code-ai-agents-love/research/articles/aider-coding-conventions.html)`
- [Agentic Coding Principles and Practices](https://agentic-coding.github.io/) — `[agentic-coding-principles.html](../../presentations/write-code-ai-agents-love/research/articles/agentic-coding-principles.html)`

## The Tools

### Graphs retrivers

Tools that query dependency/call/import graphs instead of flat file search. RepoGraph: +32.8% relative on SWE-bench. RIG: +12.2% accuracy, −53.9% completion time. RepoGraph caveat: larger 2-hop graph slice can perform worse than 1-hop—selective slices beat dumping whole graph. Aider repo map = practitioner compact tree-sitter symbol map.

**Insights:** [INSIGHT_01](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_01_context_maps.md) · [INSIGHT_21](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md) · [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md)

**Papers**

- [RepoGraph](https://arxiv.org/abs/2410.14684) — `[repograph-2410.14684.pdf](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf)` · `[repograph-2410.14684.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)`
- [Repository Intelligence Graph](https://arxiv.org/abs/2601.10112) — `[repository-intelligence-graph-2601.10112.pdf](../../presentations/write-code-ai-agents-love/research/papers/repository-intelligence-graph-2601.10112.pdf)` · `[repository-intelligence-graph-2601.10112.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repository-intelligence-graph-2601.10112.txt)`
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — `[graphcodeagent-2504.10046.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf)` · `[graphcodeagent-2504.10046.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)`
- [RepoScope](https://arxiv.org/abs/2507.14791) — `[reposcope-2507.14791.pdf](../../presentations/write-code-ai-agents-love/research/papers/reposcope-2507.14791.pdf)` · `[reposcope-2507.14791.txt](../../presentations/write-code-ai-agents-love/research/paper-text/reposcope-2507.14791.txt)`
- [Repoformer](https://arxiv.org/abs/2403.10059) — `[repoformer-2403.10059.pdf](../../presentations/write-code-ai-agents-love/research/papers/repoformer-2403.10059.pdf)` · `[repoformer-2403.10059.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repoformer-2403.10059.txt)`
- [RepoCoder](https://arxiv.org/abs/2303.12570) — `[repocoder-2303.12570.pdf](../../presentations/write-code-ai-agents-love/research/papers/repocoder-2303.12570.pdf)` · `[repocoder-2303.12570.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repocoder-2303.12570.txt)`

**Practitioner**

- [Aider repo map docs](https://aider.chat/docs/repomap.html) — `[aider-repomap.md](../../presentations/write-code-ai-agents-love/research/articles/aider-repomap.md)`
- [Sourcegraph: How Cody understands your codebase](https://sourcegraph.com/blog/how-cody-understands-your-codebase) — `[sourcegraph-how-cody-understands-codebase.html](../../presentations/write-code-ai-agents-love/research/articles/sourcegraph-how-cody-understands-codebase.html)`

Plot data: `[repository_graph_context.csv](../../presentations/write-code-ai-agents-love/research/data/repository_graph_context.csv)`

### Enforcable patterns

Architecture rules encoded as lint/static analysis that fail the build—not wiki guidelines. ESLint, Semgrep, ast-grep, Nx module boundaries, custom polint rules. Diagnostics give agents file:line:rule messages to repair. CODETASTE uses OpenGrep static rules alongside tests for refactoring evaluation.

**Insights:** [INSIGHT_18](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_18_custom_lint_rules_are_executable_architecture.md) · [INSIGHT_29](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_29_fact_models_make_static_rules_agent_usable.md) · [INSIGHT_27](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_27_static_diagnostics_are_agent_interfaces.md)

**Papers**

- [A Causal Perspective on Measuring, Explaining and Mitigating Smells](https://arxiv.org/abs/2511.15817) — `[causal-smells-llm-code-2511.15817.pdf](../../presentations/write-code-ai-agents-love/research/papers/causal-smells-llm-code-2511.15817.pdf)` · `[causal-smells-llm-code-2511.15817.txt](../../presentations/write-code-ai-agents-love/research/paper-text/causal-smells-llm-code-2511.15817.txt)`
- [CODETASTE](https://arxiv.org/abs/2603.04177) — `[codetaste-2603.04177.pdf](../../presentations/write-code-ai-agents-love/research/papers/codetaste-2603.04177.pdf)` · `[codetaste-2603.04177.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codetaste-2603.04177.txt)`

**Practitioner**

- [ESLint: Custom rules](https://eslint.org/docs/latest/extend/custom-rules) — `[eslint-custom-rules.html](../../presentations/write-code-ai-agents-love/research/articles/eslint-custom-rules.html)`
- [typescript-eslint: Custom rules](https://typescript-eslint.io/developers/custom-rules/) — `[typescript-eslint-custom-rules.html](../../presentations/write-code-ai-agents-love/research/articles/typescript-eslint-custom-rules.html)`
- [Semgrep: Custom guardrails rules](https://semgrep.dev/docs/secure-guardrails/custom-guardrails-rules) — `[semgrep-custom-guardrails.html](../../presentations/write-code-ai-agents-love/research/articles/semgrep-custom-guardrails.html)`
- [Semgrep: Rule ideas](https://semgrep.dev/docs/writing-rules/rule-ideas) — `[semgrep-rule-ideas.html](../../presentations/write-code-ai-agents-love/research/articles/semgrep-rule-ideas.html)`
- [ast-grep: Lint rule](https://ast-grep.github.io/guide/project/lint-rule.html) — `[ast-grep-lint-rule.html](../../presentations/write-code-ai-agents-love/research/articles/ast-grep-lint-rule.html)`
- [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — `[nx-enforce-module-boundaries.html](../../presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html)`
- [polint README](https://github.com/emilwareus/polint) — `[polint-readme.md](../../presentations/write-code-ai-agents-love/research/articles/polint-readme.md)`
- [polint Agent Playbook](https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md) — `[polint-agent-playbook.md](../../presentations/write-code-ai-agents-love/research/articles/polint-agent-playbook.md)`
- [polint Ignore Comments](https://github.com/emilwareus/polint/blob/main/docs/IGNORE-COMMENTS.md) — `[polint-ignore-comments.md](../../presentations/write-code-ai-agents-love/research/articles/polint-ignore-comments.md)`

Case study: `[polint-plint-case-study.md](../../presentations/write-code-ai-agents-love/research/notes/polint-plint-case-study.md)`

### Feedback tools (lint tests etc)

lint + typecheck + test + build as the agent’s repair loop. SWE-bench built on test validation. SWE-CI: one-shot test pass ≠ long-term maintainability. Agent-written tests are often probes, not durable specs. Static oracles (lint, smell gates) catch structural intent that tests miss—Needle in the Repo: 13.3% structurally wrong but passing tests. Type errors are a major compile-error class with clear diagnostics agents can act on.

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_17](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_17_quality_gates_must_cover_smells.md) · [INSIGHT_27](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_27_static_diagnostics_are_agent_interfaces.md) · [INSIGHT_28](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_28_static_oracles_catch_what_tests_miss.md)

**Papers**

- [SWE-bench](https://arxiv.org/abs/2310.06770) — `[swe-bench-2310.06770.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-bench-2310.06770.pdf)` · `[swe-bench-2310.06770.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt)`
- [SWE-CI](https://arxiv.org/abs/2603.03823) — `[swe-ci-2603.03823.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-ci-2603.03823.pdf)` · `[swe-ci-2603.03823.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-ci-2603.03823.txt)`
- [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) — `[rethinking-agent-generated-tests-2602.07900.pdf](../../presentations/write-code-ai-agents-love/research/papers/rethinking-agent-generated-tests-2602.07900.pdf)` · `[rethinking-agent-generated-tests-2602.07900.txt](../../presentations/write-code-ai-agents-love/research/paper-text/rethinking-agent-generated-tests-2602.07900.txt)`
- [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) — `[smells-llm-generated-code-2510.03029.pdf](../../presentations/write-code-ai-agents-love/research/papers/smells-llm-generated-code-2510.03029.pdf)` · `[smells-llm-generated-code-2510.03029.txt](../../presentations/write-code-ai-agents-love/research/paper-text/smells-llm-generated-code-2510.03029.txt)`
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — `[needle-in-the-repo-2603.27745.pdf](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf)` · `[needle-in-the-repo-2603.27745.txt](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)`
- [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) — `[type-constrained-codegen-2504.09246.pdf](../../presentations/write-code-ai-agents-love/research/papers/type-constrained-codegen-2504.09246.pdf)` · `[type-constrained-codegen-2504.09246.txt](../../presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt)`

**Practitioner**

- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — `[anthropic-claude-code-best-practices.html](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)`
- [Windsurf Cascade docs](https://docs.windsurf.com/windsurf/cascade) — `[windsurf-cascade-docs.html](../../presentations/write-code-ai-agents-love/research/articles/windsurf-cascade-docs.html)`
- [polint Agent Playbook](https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md) — `[polint-agent-playbook.md](../../presentations/write-code-ai-agents-love/research/articles/polint-agent-playbook.md)`

Plot data: `[context_instruction_cost.csv](../../presentations/write-code-ai-agents-love/research/data/context_instruction_cost.csv)`