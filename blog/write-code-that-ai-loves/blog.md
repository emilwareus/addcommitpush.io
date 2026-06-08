# Conclusion:

- The end goal is autonomy for agents. Today, OAIZ is on 9% autonomy, meaning AI agents research plan implement and review the code, humans decide to merge without ANY manual commits.

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

Human Written: 

The code quality debate feels relig







AI written: 

Suggested segment:

Do not make this section about pretty code.

Pretty code is indentation, naming taste, maybe a nice early return. Fine. But that is not the interesting thing here. The useful definition of code quality is much more brutal:

> How easy is this code to change without breaking behavior?

That is the definition agents care about. It is also the definition senior engineers care about, even when we pretend we are arguing about style.

An agent is not only reading the code. It is trying to modify it. So the relevant question is not "can the model understand this file well enough to summarize it?" The question is:

- Can it find the behavior that matters?
- Can it isolate the part that must change?
- Can it make the change without dragging five unrelated concepts with it?
- Can it verify the result?
- Can the next agent change it again?

That last question is the real bar.

The strongest direct evidence I found is [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200). The paper uses CodeScene's CodeHealth metric, scored 1-10, as a file-level structural quality signal. Healthy code means CodeHealth >= 9. This is not a vibe score for "nice looking code"; it is built from code smells: complex methods, deep nested complexity, complex conditionals, excessive function arguments, duplication, god-class-ish structure, and bumpy control flow.

The result is annoyingly aligned with what we already knew. Across five medium-sized open-weight models, healthy code reduced refactoring break rates by 8-15 percentage points. In relative terms, that is roughly a 15-30% break-risk reduction. Decision trees trained to predict refactoring failure always picked CodeHealth as the root split, with feature importance between 0.572 and 0.880.

Now the skeptical read, because this is where the segment can get much better than the obvious LinkedIn version.

This paper does **not** prove that CodeHealth is the universal metric for AI-friendly code. It does **not** prove that all production systems should chase CH >= 9 before using agents. It does **not** even prove that improving CodeHealth causes better agent outcomes. The study is observational: healthier files broke less often after refactoring, but the experiment did not take bad files, improve them, and then prove the same agent now succeeds.

The external-validity problem is real. The dataset is Python competitive-programming code, 60-120 SLOC, single-file, algorithmic, and dependency-light. The paper itself acknowledges this is far from what most developers do for a living and not code that would normally enter production repositories. No framework boundaries. No API contracts. No migrations. No generated clients. No half-deprecated service layer. No weird auth middleware. No product archaeology.

So the honest claim is narrower:

> In small single-file Python refactoring tasks, structural code health strongly predicts whether medium-sized models break tests.

That is still useful. It is just not the same as:

> CodeScene proved code quality determines agent success in real production codebases.

It did not.

Also, the model-strength result matters a lot. For the five medium-sized models, the Healthy vs Unhealthy gap is clear. But for the more capable models, the binary result mostly disappears:


| Model class               | What happened                                                     | My read                                                              |
| ------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Medium open-weight models | Healthy code had 8-15 pp better test-pass rates after refactoring | Code quality is a real multiplier for cheaper or constrained systems |
| Sonnet 4.5 standard call  | Healthy 86.77%, Unhealthy 84.03%, not significant                 | Stronger models reduce the immediate penalty                         |
| Claude agentic scaffold   | Healthy 96.19%, Unhealthy 94.81%, not significant                 | Tool use + conservative editing can mask code-quality sensitivity    |


This supports your instinct: the more powerful the system, the less this specific CodeHealth split seems to matter for immediate pass/fail. A strong enough agent can often tiptoe through bad code without breaking tests.

But that does not mean code quality stopped mattering. It may mean the task is too narrow, the model is too conservative, or the evaluation is measuring the wrong thing. Claude agentic got the best pass rate, but 61-69% of passing refactorings left CodeHealth unchanged. It was safe partly because it did less. That is a perfectly valid strategy for patching production, but it is not the same as improving the codebase.

This is the important distinction:

- **Patch safety:** did the agent avoid breaking today's tests?
- **Quality improvement:** did the agent make the next change easier?
- **Evolution safety:** does the codebase survive the next ten changes?

Code for Machines mostly measures the first two on small files. It does not fully measure the third. That is why [SWE-CI](https://arxiv.org/abs/2603.03823) is a useful companion. SWE-CI says the quiet part out loud: a brittle patch and an extensible patch can both pass today. The difference appears under future evolution. Their benchmark uses repository histories with an average of 233 days and 71 consecutive commits, then scores whether earlier agent choices make later changes easier or harder.

SWE-CI also adds a nuance that fits this section perfectly: LLMs are good at surface style and weaker at deeper maintainability. In their analysis, most models beat human oracle code on Pylint-style surface conventions, but all 20 underperformed on Maintainability Index. That is a great sentence for the article:

> Agents can make code look cleaner while making it structurally worse.

This is exactly why "pretty code" is the wrong frame.

The point is stronger and more useful:

> Structural smells are not just human maintainability problems. They are agent editability problems.

This is where the section should be opinionated. The familiar smells are the ones that matter:

- Deep nesting makes the valid edit path harder to see.
- Complex conditionals hide which cases are coupled.
- Excessive arguments make call sites easier to misuse.
- Duplicated logic invites the agent to patch one copy and miss the other.
- God objects blur ownership.
- Generic "manager", "utils", and "handler" modules destroy locality.

This is not new software engineering. It is old software engineering with a new consumer. The codebase now has another maintainer: a stateless agent that has no memory, no tribal context, and no shame about guessing.

There is a useful caveat from the same research. Frontier agentic systems can sometimes compensate. Claude in agentic mode hit roughly 95-96% pass rates regardless of CodeHealth, but it did that by being conservative: 61-69% of passing refactorings left CodeHealth unchanged. Same underlying Sonnet model, different scaffold, different behavior. The agentic scaffold traded improvement for safety.

That is a practical point, not an academic footnote. If you ask an expensive frontier agent to make a tiny safe patch, bad code may not immediately kill you. But your whole software factory will not run on the most expensive model forever. Autocomplete, CI repair, batch cleanup, cheap review passes, local models, background migrations, and evaluation pipelines will use smaller or more constrained systems. Code quality is a tax on those systems.

The flip side is also true: if your only claim is "clean code makes Claude pass tests", the research is weaker than that. The better claim is:

> Better structure lowers the amount of model intelligence you need.

That is the economic argument. A clean repo lets you use cheaper models, shorter context, faster verification, smaller patches, and less human review. A messy repo can still be edited by a frontier agent, but now you are paying the model to infer structure the codebase should have exposed.

The other important trap is perplexity. It is tempting to say "AI-friendly code is code with low perplexity." No. At file level, that does not hold. The Code for Machines paper found no practically meaningful association between file-level perplexity and CodeHealth. [How do Humans and LLMs Process Confusing Code?](https://arxiv.org/abs/2508.18547) gives the nuance: token-level perplexity spikes can correlate with confusing local constructs. But file-level perplexity washes out structure. A deeply nested function can be very predictable token by token and still be awful to change.

So the segment should explicitly reject this:

> AI-friendly code is not low-perplexity code. It is structurally editable code.

Then connect this to maintainability beyond one patch. [SWE-CI](https://arxiv.org/abs/2603.03823) is useful because it reframes maintainability as evolution. A brittle patch and an extensible patch can both pass today's tests. The difference appears over future changes, where bad structure compounds. SWE-CI's EvoScore tries to measure exactly that: does the code remain changeable across later iterations?

[Needle in the Repo](https://arxiv.org/abs/2603.27745) makes the same point with structural oracles. It found that 64/483 outcomes, 13.3%, passed functional tests but failed the maintainability oracle. The hardest pressures were architectural: dependency control at 4.3% and responsibility decomposition at 15.2%. This is the cleanest way to say why tests are necessary but insufficient:

> Passing tests prove behavior. They do not prove the change belongs where the agent put it.

Needle is not perfect either. It uses curated C++ probes, not random production tickets. But I trust the shape of the failure more than I trust the exact percentage. The failure archetypes are painfully recognizable: shortcut over reuse, boundary contamination, incomplete abstraction refactors, later-step regressions, missing test seams. That is basically a code review bingo card for agent patches.

This section should also mention the smell-rate evidence, but carefully. [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) found LLM-generated code had more smells than professional references: Falcon +42.28%, Gemini Pro +62.07%, ChatGPT +65.05%, Codex +84.97%, average +63.34%. The stronger version is not "AI writes bad code." That is too shallow. The better version is:

> Agents tend to produce plausible code faster than they produce maintainable structure.

That matches the whole article thesis. If the repo does not encode structure, the agent will optimize for the visible reward: pass the test, satisfy the prompt, produce the patch. It will not magically preserve dependency direction, responsibility boundaries, reuse paths, or future extension shape unless the repo makes those things visible and executable.

The deeper research stack for this section should probably look like this:


| Evidence                     | What I would use it for                                                                | Skeptical note                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Code for Machines            | Structural code health predicts refactoring break risk for medium models               | Not production code; Python only; single-file; CodeHealth proprietary; frontier results much weaker |
| Echoes of AI                 | AI-assisted code was not systematically less maintainable when humans later evolved it | Not autonomous agents; 151 completed tasks; does not prove AI is quality-neutral everywhere         |
| SWE-CI                       | Maintainability is about future evolution, not one-shot pass/fail                      | New benchmark; EvoScore weighting is a design choice; still benchmark-shaped                        |
| Needle in the Repo           | Tests miss structural failures; 13.3% were behaviorally correct but structurally wrong | Curated probes; exact percentage may not transfer                                                   |
| Smells of LLM Generated Code | LLM-generated code carries more smells than professional references                    | Smell detectors are noisy and smell presence is not the same as defect                              |
| Perplexity studies           | File-level perplexity is a bad proxy; token-level confusion can still matter           | Do not overcorrect into "perplexity is useless"                                                     |


This table gives the segment more intellectual honesty. The conclusion is not "the research is settled." It is:

> The research is noisy, but the failure modes rhyme.

Different papers, different setups, same pattern: agents can pass visible checks while losing structure. They are better at local style than global maintainability. Stronger models reduce immediate breakage, but often by being conservative or expensive. Tests catch behavior; structural gates catch whether the change belongs.

Practical recommendation for the segment:

1. Define code quality as future editability, not aesthetics.
2. Show CodeHealth as useful but narrow evidence, not gospel.
3. Put the frontier-model caveat up front: powerful agents can mask bad code by changing less.
4. Use SWE-CI to move the frame from "passes now" to "survives future changes."
5. Use Needle in the Repo to show that tests miss structural debt.
6. Use the smell list to make "quality" concrete.
7. Reject file-level perplexity as a proxy for AI-friendliness.
8. End with the operational rule: measure and enforce structural quality, do not ask the agent to "write clean code."

The closing paragraph could be:

> If you care about agent autonomy, code quality is not developer sentiment. It is infrastructure. Complexity gates, import-boundary rules, duplication checks, type-level contracts, dead-code checks, and smell detectors are not bureaucracy. They are the rails that let an agent make a change today without making tomorrow's change harder.

The punchline:

> Code quality is how much the next change has to understand before it can be safe.

**Insights:** [INSIGHT_30](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_30_codehealth_predicts_ai_refactoring_success.md) · [INSIGHT_31](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_31_perplexity_is_not_file_level_ai_friendliness.md) · [INSIGHT_05](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_05_maintainability_beats_one_shot_correctness.md)

**Papers**

- [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200) — `[code-for-machines-2601.02200.pdf](../../presentations/write-code-ai-agents-love/research/papers/code-for-machines-2601.02200.pdf)`
- [Echoes of AI](https://arxiv.org/abs/2507.00788) — `[echoes-of-ai-2507.00788.pdf](../../presentations/write-code-ai-agents-love/research/papers/echoes-of-ai-2507.00788.pdf)`
- [How do Humans and LLMs Process Confusing Code?](https://arxiv.org/abs/2508.18547) — `[humans-llms-confusing-code-2508.18547.pdf](../../presentations/write-code-ai-agents-love/research/papers/humans-llms-confusing-code-2508.18547.pdf)`
- [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) — `[smells-llm-generated-code-2510.03029.pdf](../../presentations/write-code-ai-agents-love/research/papers/smells-llm-generated-code-2510.03029.pdf)` · `[smells-llm-generated-code-2510.03029.txt](../../presentations/write-code-ai-agents-love/research/paper-text/smells-llm-generated-code-2510.03029.txt)`
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — `[needle-in-the-repo-2603.27745.pdf](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf)` · `[needle-in-the-repo-2603.27745.txt](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)`
- [SWE-CI](https://arxiv.org/abs/2603.03823) — `[swe-ci-2603.03823.pdf](../../presentations/write-code-ai-agents-love/research/papers/swe-ci-2603.03823.pdf)` · `[swe-ci-2603.03823.txt](../../presentations/write-code-ai-agents-love/research/paper-text/swe-ci-2603.03823.txt)`

### Tests

Tests are the agent's feedback loop.

Without tests, the agent is guessing. With tests, it can edit, run, read the failure, and repair. This is the whole SWE-bench shape: fail-to-pass tests prove the bug or feature was fixed; pass-to-pass tests prove old behavior survived.

FeatureBench makes the point sharply. On its Lite set, exposing ground-truth unit tests improved resolved rate by +50.0 percentage points for Gemini-3-Pro-Preview and +43.3 points for GPT-5.1-Codex. That does not mean "show the agent the hidden benchmark tests" is a good evaluation practice. It means executable examples are extremely strong steering signals.

The test suite should give the agent a tight loop:

- a fast targeted command for the thing it changed;
- a regression command for nearby behavior;
- clear fixtures and expected values;
- fail-to-pass tests for the new behavior;
- pass-to-pass tests for behavior that must not move;
- deterministic output, no flaky network mystery.

Do not confuse this with "make the agent write lots of tests." The Rethinking Agent-Generated Tests paper is a useful warning: GPT-5.2 wrote new tests in only 0.6% of tasks while resolving 71.8%; Claude Opus 4.5 wrote tests in about 83.0% and resolved 74.4%. More agent-written tests did not automatically mean better outcomes. Existing project tests are usually the stronger oracle.

Also: tests are necessary, not sufficient. Needle in the Repo found 64/483 outcomes (13.3%) that passed functional tests but failed structural or maintainability oracles. So the rule is not "tests instead of architecture." It is tests plus typecheck, lint, import-boundary checks, schema checks, and whatever else encodes the shape tests do not see.

The practical recommendation is simple: every important behavior should have a fast executable example, and every important boundary should have an automated gate. Agents do not need trust. They need feedback.

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

Suggested segment:

Agents learn the local shape of a codebase by imitation.

That sounds hand-wavy, but it is very practical. When an agent needs to add a new billing event, test case, API route, migration, eval, or UI component, the best context is usually not a general architecture essay. It is the nearest working example of the same kind of thing.

Not any example. The canonical example.

This is the difference:

- "We use clean architecture."
- "Here is the last feature that added a write-side use case, repository method, integration test, generated client update, and frontend call site. Copy this shape."

The second one is a spec.

The way I would frame this section:

> Examples are executable memory.

They show the agent what prose usually fails to transmit:

- where the new code belongs;
- which imports are allowed;
- what naming convention the domain uses;
- how errors are represented;
- what the test setup looks like;
- which generated files are touched and which are regenerated;
- what "done" looks like in this repo.

This is why I think "examples as specs" should sit next to tests, docs, and task specs. They are all different forms of the same thing: recoverable intent.

The strongest old-school evidence is [DocPrompting](https://arxiv.org/abs/2207.05987). The paper's premise is simple: models cannot know every new library or unseen API from training. Humans read docs; models should retrieve docs too. DocPrompting retrieved relevant documentation before generation and improved CodeT5 by 2.85 percentage points in pass@1 on execution-based Python CoNaLa, a 52% relative gain. On their Bash `tldr` dataset, it improved exact match by up to 6.9 points.

But be careful with this evidence. DocPrompting is not repo-level feature development. It is natural-language-to-code generation for snippets, mostly about API usage. It supports the narrow claim that relevant documentation helps models use unfamiliar functions. It does **not** prove that dumping docs into context makes an agent understand your architecture.

The more useful generalization is:

> Docs help when they are close to the code path the agent must use.

The [RAR](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) paper adds another useful nuance. It studies retrieval of examples and grammar/documentation together. The interesting bit is not the exact numbers, although RAR reports improvements over standalone retrieval methods. The interesting bit is the failure mode: documentation alone can be weakly related to the natural-language task, and examples alone can omit the grammar/API pieces needed to generalize. The best context is often a pair:

- an example showing usage;
- the contract explaining why that usage is valid.

That maps directly to codebases. A test without the production code path can overfit. A README without a working example can be too abstract. A code example without the rule can be cargo-culted into the wrong place.

So do not say:

> Add examples.

Say:

> Put the nearest canonical example beside the contract and the check that proves it.

FeatureBench makes the "tests as examples" point much stronger. In the visible-unit-tests ablation, giving agents access to ground-truth unit tests raised Lite-set resolved rate by +50.0 percentage points for Gemini-3-Pro-Preview and +43.3 points for GPT-5.1-Codex. That is a stupidly large effect.

Again, skepticism matters. This does not mean "leak all hidden tests to your coding agent and call it a day." Benchmarks use visible tests in artificial ways, and agents can overfit tests just like humans can. But for real development, tests are not hidden benchmark answers. They are executable examples of expected behavior. If your team already knows the desired behavior, hiding it from the agent is just making the agent guess.

The practical version:

> A good test is a runnable example with an assertion at the end.

For feature work, the ideal example has both:

- **fail-to-pass tests:** the new behavior must now work;
- **pass-to-pass tests:** existing behavior must keep working.

This is why benchmark task construction keeps rediscovering the same shape. SWE-bench, FeatureBench, and SWE-CI all rely on executable oracles because natural language alone is too soft. The agent needs a way to ask: did I actually satisfy the example?

CodePlan gives the planning version of the same argument. It starts from seed edit specifications and then derives the dependent edits through dependency and may-impact analysis. In their evaluation, CodePlan got 5/6 repositories to pass validity checks while baselines without planning got 0/6. The useful lesson is not "use CodePlan." The useful lesson is that the first example/spec seeds the plan. A vague task creates vague roots in the plan graph. A concrete seed gives the agent a path to propagate.

This is why issue quality matters. A good task spec is not a bureaucratic template. It is a plan seed:


| Spec element        | What it gives the agent      |
| ------------------- | ---------------------------- |
| Goal                | The behavior to produce      |
| Canonical example   | The local shape to copy      |
| Relevant files      | Retrieval boundaries         |
| Constraints         | Things that must remain true |
| Non-goals           | Scope control                |
| Validation commands | The oracle                   |
| Expected output     | Acceptance target            |


OctoBench adds the compliance warning. It evaluates agentic coding scaffolds with heterogeneous instruction sources and 7,098 checklist items. The key result is the scissors gap: models can have high per-check compliance, around 80%+, while instance-level all-or-nothing success drops much lower. In plain English: an agent can follow many individual rules and still fail to satisfy the whole bundle.

That matters for examples because real examples are full of implicit constraints. The agent may copy the route shape but miss the auth rule. It may copy the test style but skip the generated client. It may copy the repository method but put domain behavior in transport. The example helps, but only if the hidden constraints are made visible.

This is where I would be skeptical of my own phrase "nearest working code is the spec." Sometimes the nearest working code is old, accidental, or deprecated. Sometimes the repo contains three generations of style. Sometimes the example passes tests but violates the architecture you want going forward.

So the actual rule should be:

> The nearest canonical working example is the spec. The nearest random working example is just archaeology.

That distinction matters a lot for agents. They do not know which pattern is blessed unless the repo tells them. If there are two ways to create an API client and one is legacy, the agent will choose by token proximity and vibes. Bad.

What makes an example canonical?

- It lives near the extension point.
- It is referenced by docs or `AGENTS.md`.
- It has tests.
- It uses current APIs, not deprecated paths.
- It passes current lint/typecheck/build.
- It demonstrates the smallest complete vertical slice.
- It has a name that matches the domain vocabulary.

This should lead into a concrete recommendation:

When adding a new kind of thing to a codebase, create one boring golden path:

```txt
features/attendance/
  mark-lesson-attendance.ts
  mark-lesson-attendance.test.ts
  README.md
  AGENT.md
```

The README should not become a novel. It should say:

```md
Use `mark-lesson-attendance.ts` as the canonical write-side example.
Run `pnpm test -- mark-lesson-attendance` for the local behavior check.
Domain code must not import HTTP transport types.
Frontend calls this feature through `@acme/sdk`.
```

That is enough. The code is the example. The test is the executable spec. The doc is the index. The lint rule is the enforcement.

The deeper research stack for this section:


| Evidence                   | What I would use it for                                                        | Skeptical note                                                                            |
| -------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| DocPrompting               | Retrieved docs help models use unseen APIs                                     | Snippet-level NL-to-code, not repo-scale agent work                                       |
| RAR                        | Examples and docs/contracts are complementary                                  | OfficeScript/M language tasks; retrieval quality matters                                  |
| FeatureBench visible tests | Visible unit tests can massively improve feature resolution                    | Benchmark ablation; visible tests can create overfitting if treated as hidden answers     |
| CodePlan                   | Concrete seed specs plus dependency-aware planning beat build-repair baselines | Six repos; focused on repo-wide edit propagation, not general feature work                |
| OctoBench                  | Explicit checklist constraints expose compliance failures                      | LLM-as-judge and scaffold-specific; measures instruction following more than code quality |
| Task-spec/vendor guidance  | Tools converge on files, commands, constraints, examples                       | Practitioner signal, not causal proof                                                     |


The conclusion I would write:

> Examples are not there to inspire the agent. They are there to remove degrees of freedom.

Every good example reduces guessing. The agent no longer has to infer where code goes, what shape the test should take, which API is current, or which command proves the work. The more the repo can answer those questions with nearby working code, the less the prompt has to carry.

The punchline:

> A good example is a compressed spec with imports.

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

Suggested segment:

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
- [TypeScript: `noImplicitAny`](https://www.typescriptlang.org/tsconfig/#noImplicitAny)
- [TypeScript 4.9: `satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

### Dependency surface

Suggested segment:

Dependency surface is the part of your architecture the agent can actually recover.

Not the architecture you meant.

Not the architecture in someone's head.

The recoverable one.

For an agent, a codebase is not just files. It is a set of edges:

- this component imports that package;
- this route calls that service;
- this command emits that event;
- this repository implements that interface;
- this test covers that behavior;
- this generated client represents that API;
- this package may depend on that layer;
- this symbol is public, and that one is internal.

If those edges are visible, the agent can traverse them. If they are hidden behind dynamic strings, deep imports, reflection, implicit registration, copy-pasted fetch calls, or "everyone knows" conventions, the agent has to infer them.

That is where many agent patches go wrong.

They find a similar-looking file and copy the local shape, but they miss the edge:

- the function has three callers with different assumptions;
- the import crosses an architectural boundary;
- the route has a generated client the agent did not use;
- the event name is a raw string used in five places;
- the real test lives in a different package;
- the implementation depends on a feature flag, migration, queue, or schema.

This is the frame:

> Dependency surface is not about having fewer dependencies. It is about making the real dependencies mechanically discoverable.

Bad:

```ts
import { calculateTotals } from '../../billing/internal/math';

await fetch('/api/billing/invoices/recalculate', {
  method: 'POST',
  body: JSON.stringify({ id, mode: 'full' }),
});

eventBus.emit('invoice.updated', invoice);
```

Better:

```ts
import { calculateInvoiceTotals } from '@acme/billing';
import { billingApi } from '@/generated/billing-client';
import { InvoiceUpdatedEvent } from '@/events/invoice-events';

await billingApi.recalculateInvoice({ invoiceId, mode: 'full' });
eventBus.emit(InvoiceUpdatedEvent.type, InvoiceUpdatedEvent.create(invoice));
```

The better version gives the agent handles:

- a public package import;
- a named domain operation;
- a generated API method;
- a typed request shape;
- a named event contract;
- a searchable boundary.

That does not make the code magically correct. It makes the next correct hop easier to find.

The cleanest evidence is [CrossCodeEval](https://arxiv.org/abs/2310.11248). It was built specifically because normal code-completion benchmarks were too single-file. Real repository completions often need context from other files.

The annotation result is blunt: almost 100% of references contain names that require cross-file information, while only about 2% can be predicted from the current file alone. In one reported setting, StarCoder-15.5B on Python exact match goes from 8.82% with in-file context to 15.72% with retrieved cross-file context, and 21.01% with reference-assisted retrieval. GPT-3.5-turbo on C# goes from 3.56% in-file to 11.82% with cross-file context.

I validated those numbers against the raw paper text and `names_types_apis.csv`.

The skeptical read:

CrossCodeEval is code completion, not open-ended repo editing. It proves the current file is often insufficient. It does not prove that any arbitrary context helps. In fact, the paper's retrieval results show the obvious but important thing: quality of retrieval matters. Bad cross-file context is just a larger prompt with better confidence.

The local design lesson is narrower:

> Make the right cross-file context easy to retrieve.

CrossCodeEval also gives a useful practical hint. Relevant cross-file context is often nearby or name-related: same-directory references are 49.0% for Python and 51.3% for TypeScript; similar-filename references are 44.5% for Java. That does not mean "put everything in one folder." It means locality and naming are retrieval metadata.

[GraphCodeAgent](https://arxiv.org/abs/2504.10046) pushes the same point from completion into repo-level generation. It builds two graphs: a Requirement Graph and a Structural-Semantic Code Graph. The code graph captures dependencies such as calls, imports, data flow, and structural relations. The agent then traverses the graph instead of relying only on semantic similarity between the requirement and code snippets.

The headline result: on DevEval with GPT-4o, GraphCodeAgent reports Pass@1 of 58.14 versus 40.43 for the strongest baseline, a 43.81% relative improvement. On CoderEval with GPT-4o, it reports 53.91 Pass@1, a 31.91% relative improvement. The most important slice is cross-file dependency work: GraphCodeAgent reports 43.31 Pass@1 versus 22.29 for RepoCoder, a 94.30% relative improvement.

Again, skepticism.

This is a research system with custom graph construction and agent tools. It is not proof that your product repo needs to ship a graph database. It is also reporting relative improvements across specific benchmarks and baselines, so the numbers should not be compared casually to CrossCodeEval or ToolGen.

The useful inference is not:

> Install GraphCodeAgent.

The useful inference is:

> Agents perform better when they can walk dependency relationships instead of guessing from text similarity.

The ablation makes this sharper. Removing GraphCodeAgent's dynamic graph traversal drops DevEval GPT-4o Pass@1 from 58.14 to 51.83, a reported 12.17% relative decline. The graph is not just a blob of extra context. The agent needs the ability to move along relevant edges.

That matches [InlineCoder](https://arxiv.org/abs/2601.00376), which frames a function by its call graph. Upstream callers show how the function is used. Downstream callees show what it depends on. On RepoExec, InlineCoder reports average relative gains of 29.73% in exact match, 20.82% in edit similarity, and 49.34% in BLEU over the strongest baseline.

This is a very practical mental model:

> Callers define obligations. Callees define available tools.

When an agent edits a function without seeing either side, it is writing in a vacuum. It may satisfy the local signature while breaking a caller, or reimplement a helper that already exists two hops away.

[What to Retrieve for Effective Retrieval-Augmented Code Generation?](https://arxiv.org/abs/2503.20589) adds the anti-theater point. Similar code snippets are not automatically good context. The paper reports that in-context code and potential API information help, while retrieved similar snippets can introduce noise and degrade results by up to 15%. Their AllianceCoder method improves Pass@1 by up to 20% by decomposing the query and retrieving APIs via semantic descriptions.

This is the core distinction:

> Similar text is not the same thing as relevant dependency surface.

If the agent needs to implement `refundInvoice`, the best context may not be the most similar function body. It may be:

- the public billing API;
- the invoice state machine;
- the payment provider client;
- the event emitted after refund;
- the caller that expects idempotency;
- the test that defines the failure mode.

Foundational model papers point the same way. [GraphCodeBERT](https://arxiv.org/abs/2009.08366) uses data flow as code structure and shows that structure-aware pretraining improves code search, clone detection, translation, and refinement. [CodeGRAG](https://arxiv.org/abs/2405.02355) uses control-flow and data-flow graph views to bridge natural language and programming language. I would use these as supporting evidence only. They are not repo-editing papers. They establish that code structure carries signal beyond token sequence.

The codebase rule should be boring:

> Make the dependency surface explicit, stable, and sliceable.

Explicit means the relationship is represented in code or machine-readable metadata.

Stable means the same relationship is expressed the same way across the repo.

Sliceable means tools can retrieve the relevant neighborhood without dumping the whole repository into context.

Good dependency surfaces:


| Surface                      | What the agent can recover               | Weak version                                  |
| ---------------------------- | ---------------------------------------- | --------------------------------------------- |
| Public package exports       | Which symbols are supported API          | Deep imports into internal files              |
| Direct imports               | Which module depends on which module     | Runtime path construction                     |
| Generated API clients        | Which remote operations exist            | Raw URLs and anonymous JSON                   |
| Typed events/commands        | Which messages exist and what they carry | String event names and ad hoc payloads        |
| Route manifests              | Which handlers belong to which routes    | Framework magic plus scattered strings        |
| Module boundary rules        | Which dependencies are allowed           | Architecture diagrams with no enforcement     |
| Caller/callee navigation     | How a function is used and what it uses  | Isolated function bodies                      |
| Test maps or colocated tests | What verifies a behavior                 | Tests discoverable only by running everything |
| Ownership metadata           | Who owns a package or subsystem          | Folder names as folklore                      |


This is where tools like Nx module boundaries, dependency-cruiser, package `exports`, CODEOWNERS, generated route maps, OpenAPI clients, and typed event registries become agent infrastructure. The tool is not the point. The point is that the edge becomes visible and enforceable.

There are two common traps.

First trap: hiding structure behind convenience.

A giant `@/utils` barrel feels nice until the agent cannot tell whether it is importing a stable API or an accidental internal helper. A package-level public export can be good. A dumping-ground barrel is not a boundary. It is a fog machine.

Second trap: giving the agent more context instead of better context.

The research does not support "paste the whole graph." It supports selective slices. CrossCodeEval improves when relevant cross-file context is retrieved. GraphCodeAgent improves by traversing requirement and code edges. InlineCoder improves by selecting callers and callees. A3-CodGen, from the previous section, even shows that too much global context can hurt.

So the practical recommendation is not "build a giant dependency map and shove it into the prompt."

The recommendation is:

1. Make imports boring and static.
2. Define public package surfaces.
3. Ban or lint deep imports across boundaries.
4. Generate clients for remote APIs.
5. Use typed events, commands, and route manifests.
6. Keep tests discoverable by feature, path, or metadata.
7. Prefer explicit registries over runtime discovery.
8. Keep generated/vendor files out of default retrieval.
9. Add dependency rules where architecture matters.
10. Make the nearest valid edge easier to find than the nearest similar snippet.

The skeptical research stack:


| Evidence               | What I would use it for                                                        | Skeptical note                                                        |
| ---------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| CrossCodeEval          | Current-file context is often insufficient; retrieved cross-file context helps | Completion benchmark, not full repo editing                           |
| GraphCodeAgent         | Graph traversal helps repo-level generation, especially cross-file tasks       | Research system with custom graphs; relative benchmark gains          |
| InlineCoder            | Caller/callee context is a high-value dependency slice                         | New repo-generation setup; not proof of a specific architecture style |
| What to Retrieve       | APIs/context can beat superficially similar snippets                           | Retrieval study; depends on benchmark and retriever quality           |
| GraphCodeBERT          | Data-flow structure improves code representation                               | Pretraining/downstream tasks, not agent editing                       |
| CodeGRAG               | Control/data-flow graph views carry useful programming signal                  | Code generation framework, not product-repo guidance                  |
| `names_types_apis.csv` | Confirms CrossCodeEval plotted numbers                                         | Derived data; must stay traceable to paper text                       |


The conclusion:

> Agents do not need your whole repo. They need the next correct edge.

The punchline:

> If a tool cannot draw the dependency, the agent probably cannot trust it.

**Insights:** [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_21](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md)

**Papers**

- [CrossCodeEval](https://arxiv.org/abs/2310.11248) — `[crosscodeeval-2310.11248.pdf](../../presentations/write-code-ai-agents-love/research/papers/crosscodeeval-2310.11248.pdf)` · `[crosscodeeval-2310.11248.txt](../../presentations/write-code-ai-agents-love/research/paper-text/crosscodeeval-2310.11248.txt)`
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — `[graphcodeagent-2504.10046.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf)` · `[graphcodeagent-2504.10046.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)`
- [In Line with Context: Repository-Level Code Generation via Context Inlining](https://arxiv.org/abs/2601.00376) — `[inlinecoder-context-inlining-2601.00376.pdf](../../presentations/write-code-ai-agents-love/research/papers/inlinecoder-context-inlining-2601.00376.pdf)` · `[inlinecoder-context-inlining-2601.00376.txt](../../presentations/write-code-ai-agents-love/research/paper-text/inlinecoder-context-inlining-2601.00376.txt)`
- [GraphCodeBERT](https://arxiv.org/abs/2009.08366) — `[graphcodebert-2009.08366.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodebert-2009.08366.pdf)` · `[graphcodebert-2009.08366.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodebert-2009.08366.txt)`
- [CodeGRAG](https://arxiv.org/abs/2405.02355) — `[codegrag-2405.02355.pdf](../../presentations/write-code-ai-agents-love/research/papers/codegrag-2405.02355.pdf)` · `[codegrag-2405.02355.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codegrag-2405.02355.txt)`
- [What to Retrieve for Effective Retrieval-Augmented Code Generation?](https://arxiv.org/abs/2503.20589) — `[what-to-retrieve-racg-2503.20589.pdf](../../presentations/write-code-ai-agents-love/research/papers/what-to-retrieve-racg-2503.20589.pdf)` · `[what-to-retrieve-racg-2503.20589.txt](../../presentations/write-code-ai-agents-love/research/paper-text/what-to-retrieve-racg-2503.20589.txt)`

**Practitioner**

- [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — `[nx-enforce-module-boundaries.html](../../presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

### Generated SDKs

Suggested segment:

Raw API calls are one of the easiest ways to make an agent guess.

They hide the contract in strings:

```ts
await fetch(`/api/schools/${schoolId}/attendance`, {
  method: 'POST',
  body: JSON.stringify({
    lesson,
    student,
    state,
  }),
});
```

That code looks small. It is not small.

It contains a pile of unstated questions:

- is the route correct?
- does `schoolId` come from the URL, session, or active tenant?
- is the method `POST`, `PUT`, or `PATCH`?
- is the payload `lesson`, `lessonId`, or `lesson_id`?
- is `student` an object or an ID?
- is `state` an enum?
- does the endpoint require CSRF?
- what does the response return?
- what error shape comes back?
- is there already a generated client for this?

The agent can infer all of that from nearby code, docs, tests, and runtime failures.

Or the repo can expose the contract as code:

```ts
await attendanceApi.markLessonAttendance({
  lessonId,
  studentId,
  status: 'present',
});
```

That is the whole point of generated SDKs.

Not "SDKs are cleaner."

Not "OpenAPI is enterprise ceremony."

The point is:

> A generated SDK turns an external API contract into local code the agent can inspect, import, typecheck, autocomplete, test, and repair.

For agents, this matters even more than it matters for humans. Humans can ask the backend team. Humans remember the weird auth rule. Humans know that `/api/v2/schools/:id/attendance` is deprecated even though five examples still use it.

Agents mostly have the repo.

So put the truth in the repo.

The best evidence is indirect but consistent.

[DocPrompting](https://arxiv.org/abs/2207.05987) shows that retrieving API documentation improves code generation. CodeT5 + DocPrompting improves pass@1 by 2.85 percentage points on CoNaLa, a 52% relative gain, and pass@10 by 4.39 percentage points, a 30% relative gain. On the tldr Bash dataset, DocPrompting improves CodeT5 and GPT-Neo-1.3B by up to 6.9% absolute exact match.

The mechanism is what matters: documentation bridges the gap between the user's intent words and the API's actual function names, signatures, arguments, and usage constraints. The paper says documentation helps because it contains both natural-language descriptions and function signatures.

A generated SDK is not the same as retrieved documentation. That is the skeptical read. DocPrompting is standalone code generation, not repo editing. It retrieves text, not typed clients. So do not write:

> DocPrompting proves generated SDKs work.

It does not.

The better inference:

> If retrieved API documentation helps models call APIs, turning that documentation into typed local symbols should help agents even more at API boundaries.

[ToolGen](https://arxiv.org/abs/2401.06391) is closer to the dependency failure. It integrates autocomplete/static-analysis tools into repository-level generation. The paper reports that more than 70% of functions in real repositories are not standalone. They depend on repository-level symbols. ToolGen improves dependency coverage by 31.4-39.1% and static validity rate by 44.9-57.7% across three LLMs. It also improves Pass@1 by 40.0% for CodeT5 and 25.0% for CodeLlama, while CodeGPT stays flat.

Again, keep the claim narrow. ToolGen is not an SDK generator. It is an autocomplete/static-tool paper. But the failure mode is the same: the model invents names, members, and dependencies when the valid surface is not visible. A generated SDK makes the valid remote API surface visible as local functions and types.

[Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) gives the type-system side. In generated TypeScript, syntactic errors are only about 6% of compilation errors, while type-check failures are about 94%. Type-constrained decoding reduces compilation errors by more than half and improves average pass@1 relatively by 3.5% for synthesis, 5.0% for translation, and 37.0% for repair.

That is not an SDK paper either. But it explains why typed SDKs are powerful: most invalid generated TypeScript is not syntactically broken. It is shape-broken. Wrong member. Wrong field. Wrong payload. Wrong return assumption. Generated clients give the compiler something precise to reject.

[RAR](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) adds a useful nuance. It shows that examples and API/grammar documentation are complementary context sources. RAR's two-step retrieval outperforms example-only or grammar-only retrieval techniques, with reported improvements in the 2.81-26.14% range depending on setting.

That maps cleanly to SDKs:

- the generated client gives signatures and types;
- examples near the client show auth, pagination, retries, idempotency, and error handling;
- tests show expected behavior;
- static checks keep the generated output fresh.

Do not ship only the generated code and call it done. The SDK is the surface. The examples are the usage memory.

This is the pattern:

```text
schema/openapi.yaml
  -> generator config
  -> generated client
  -> typed app call sites
  -> examples and mocks
  -> tests and lint rules
  -> CI drift check
```

The repo should make that path obvious.

Bad:

```text
apps/web/src/lib/api.ts
apps/web/src/lib/api2.ts
apps/web/src/lib/newApi.ts
docs/api.md
scripts/magic-generate-client.sh
```

Better:

```text
schemas/backend/openapi.yaml
packages/backend-client/orval.config.ts
packages/backend-client/src/generated/
packages/backend-client/src/examples/
packages/backend-client/README.md
```

And the commands should be boring:

```json
{
  "scripts": {
    "generate:openapi": "pnpm --filter backend generate:openapi",
    "generate:client": "orval --config packages/backend-client/orval.config.ts",
    "generate": "pnpm generate:openapi && pnpm generate:client",
    "check:generated": "pnpm generate && pnpm lint && pnpm typecheck"
  }
}
```

Then give the agent rules that are enforceable:

```md
Do not hand-edit generated client files.
Regenerate them with `pnpm generate`.
Frontend code must call backend APIs through `@acme/backend-client`.
Raw `/api/...` fetch calls are only allowed inside the client package.
```

Better yet, turn those rules into lint:

- no raw internal API URLs outside the generated client;
- no edits under `src/generated/` unless the generator ran;
- generated client imports must come from the package root;
- schema changes must update the generated client;
- examples must compile against the generated client.

This is where SDK generation becomes agent infrastructure instead of build ornamentation.

The tool choice is secondary. The ecosystem is mature enough that this is not exotic:


| Tool                                                                | Best fit                                          | Agent-facing affordance                                              |
| ------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| [OpenAPI Generator](https://openapi-generator.tech/)                | Broad multi-language client/server/doc generation | Many targets, conventional CLI, widely understood                    |
| [Kiota](https://learn.microsoft.com/en-us/openapi/kiota/)           | OpenAPI clients with middleware/auth abstractions | Lock file, update workflow, multiple language targets                |
| [Orval](https://orval.dev/docs)                                     | TypeScript frontend clients                       | Typed functions, models, React Query/SWR hooks, MSW mocks            |
| [Speakeasy](https://www.speakeasy.com/docs/sdks/create-client-sdks) | Production SDK generation                         | SDKs plus docs/publishing workflow                                   |
| [Stainless](https://www.stainless.com/docs/sdks/typescript/)        | Polished official SDKs                            | Idiomatic TypeScript SDKs, docs, and MCP/tooling angle               |
| FastAPI/OpenAPI output                                              | Code-first Python APIs                            | Type-hinted backend produces an OpenAPI contract clients can consume |


The tool should be chosen by API shape:

- internal TypeScript frontend to backend: Orval is often enough;
- multi-language public API: Stainless, Speakeasy, Kiota, or OpenAPI Generator;
- Microsoft Graph-style API surface: Kiota is designed for that world;
- existing backend with OpenAPI already available: generate clients from the spec;
- no stable API contract: fix that before pretending SDK generation will save you.

The strongest practical rule:

> Generate at the boundary where an agent would otherwise guess.

That is usually HTTP APIs. But the same idea applies to GraphQL, protobuf/gRPC, TypeSpec, AsyncAPI events, Terraform provider schemas, Prisma clients, database query builders, and route manifests. The format is less important than the contract becoming local, typed, and searchable.

Private/internal APIs are the strongest case.

This came up while trying to inspect `devloupe/devloupe`. Public GitHub returns `404` for that exact repository, and the public `Devloupe` org exposes only `.github`. I also checked the local workspace and found Devloupe-related GitHub activity code, but no local copy of the `devloupe/devloupe` repository and no accessible SDK-generation files. So I should not use Devloupe as a concrete public case study unless the repo is provided or credentials are available.

But the access failure itself illustrates the agent problem. If an API lives in a private product repo, the model's training data will not know it. The only reliable source is the current repo state: schema, generated client, examples, tests, and diagnostics. Private code needs generated surfaces more, not less.

The main caveat:

> A generated SDK is only as true as the contract it was generated from.

A stale OpenAPI file creates typed lies. A vague schema creates vague types. `additionalProperties: true` everywhere is just `Record<string, unknown>` with better branding. If the generated client is hand-edited, hidden in a random folder, or never checked for freshness, it becomes another source of drift.

So the generated-SDK policy matters as much as the generator:


| Policy question                  | Good answer                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| Where does the schema live?      | In a predictable `schemas/` or API package path                                         |
| Who owns the schema?             | The API-owning package or service                                                       |
| Where is generator config?       | Next to the generated client package                                                    |
| Is output committed?             | Either yes for readability/review, or no with deterministic generation and CI freshness |
| Can agents edit generated files? | No, edit schema/config and regenerate                                                   |
| How is drift caught?             | CI generation check, typecheck, examples, contract tests                                |
| How are raw calls prevented?     | Lint rule or static diagnostic                                                          |
| Where are usage examples?        | Near the client, compiled, and current                                                  |


The skeptical research stack:


| Evidence                         | What I would use it for                         | Skeptical note                                                 |
| -------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| DocPrompting                     | API documentation helps models call APIs        | Standalone generation; docs text, not SDKs                     |
| ToolGen                          | Visible valid symbols reduce dependency errors  | Autocomplete/static-tool setup, not generated clients          |
| Type-Constrained Code Generation | Type facts remove a dominant invalid-code class | TypeScript benchmark decoding, not API integration             |
| RAR                              | Examples and API/grammar docs are complementary | Low-resource language generation, not product APIs             |
| SDK tool docs                    | SDK generation is practical and mature          | Tool docs prove feasibility, not agent success                 |
| Devloupe check                   | Private APIs need local generated surfaces      | Repo inaccessible here, so do not cite as empirical case study |


The conclusion:

> Do not make the agent reverse-engineer your API from strings.

The punchline:

> If the API contract matters, make it importable.

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

The point is not "never use side effects." Real systems have side effects. They send emails, enqueue jobs, mutate databases, register handlers, hydrate caches, read environment variables, and talk to APIs. The point is that side effects should have a static surface. An agent should be able to answer: what starts this behavior, what contract does it accept, what contract does it return, what code can it call, and what code can call it?

This is where dynamic surfaces become expensive. Import-time registration, reflection, raw string registries, glob-loaded plugins, monkeypatching, dynamic imports assembled from strings, untyped event buses, implicit framework magic, and environment-driven branches all move architecture out of the code graph and into runtime behavior. Humans can learn that by folklore. Agents mostly learn through grep, ASTs, typecheckers, language servers, tests, and generated manifests. If the edge is invisible to those tools, the agent has to infer it.

That is not a small detail. AutoCodeRover explicitly uses AST-based code search APIs such as class and method search instead of treating the repository as flat files. GraphCodeAgent builds a Structural-Semantic Code Graph over functions, classes, invocation edges, dependency edges, and semantic links; removing its graph traversal step drops GPT-4o DevEval Pass@1 from 58.14 to 51.83. RepoGraph shows the same direction with a caveat: repository graph context can help existing agents, but dumping more graph into the prompt can hurt. In their SWE-bench-Lite experiment, 1-hop flat context reached 29.67% resolve, while larger 2-hop flat context fell to 26.00%. The useful object is not "more context." It is a selective, inspectable slice.

So write side-effecting code with visible handles.

```ts
// Hard for agents: importing this file changes the application.
import "@/billing/register-invoice-events";

// Somewhere else:
register("invoice.paid", async payload => {
  const handler = handlers[payload.type];
  return handler(payload);
});
```

The behavior exists, but the surface is poor. The event name is a string. The payload shape is implied. The registry is mutable. The import is only there for its side effect. A code search tool cannot reliably find every consumer. A typechecker cannot tell you whether the event contract changed. A model may edit the handler and miss the registration path entirely.

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

Now the dynamic behavior still exists, but it has a static address. The event can be searched. The payload has a schema. The registry has a type. The handler is imported by name. A generated route map, event map, OpenAPI spec, package export, or typed manifest gives the agent something concrete to inspect before it edits.

This also applies to framework conventions. Convention is not automatically bad. Next.js routes, Rails routes, FastAPI decorators, Kubernetes manifests, and OpenAPI specs can all be agent-friendly because the convention is stable and tool-readable. The dangerous version is private convention: "any file in this folder runs at startup," "this decorator registers a job by reflection," "this string maps to a handler in another package," "this environment variable silently swaps behavior." If your architecture requires runtime discovery, generate a manifest from it and check that manifest into the build path. Do not make the agent reverse-engineer module load order.

Skeptically, the research does not prove that "dynamic imports cause X% worse agent performance" in production code. AutoCodeRover and GraphCodeAgent are benchmark systems, not randomized studies of production architecture. RepoGraph is especially useful because it also shows that structural context has a carrying cost. The correct lesson is narrower: current agents and agent tools gain leverage from visible program structure, and hidden runtime coupling removes exactly the evidence those tools use.

Practical rules:

- Prefer explicit initialization over import-time work.
- Prefer typed registries and manifests over string registries.
- Prefer generated route, event, job, schema, and SDK surfaces over runtime discovery alone.
- Keep dynamic imports behind named, typed loader functions.
- Avoid monkeypatching, prototype mutation, and global registration outside isolated adapters.
- Put environment-driven behavior behind typed config objects that can be searched and tested.
- Give every route, event, job, permission, feature flag, and external call a named contract.
- Add lint rules for forbidden dynamic patterns instead of leaving architecture in prose.
- Test wiring at the boundary: "this event is registered," "this route is exported," "this job accepts this payload."

A side effect the agent cannot see is a dependency it cannot protect.

**Insights:** [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md) · [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_21](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md) · [INSIGHT_07](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md)

**Papers**

- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — `[graphcodeagent-2504.10046.pdf](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf)` · `[graphcodeagent-2504.10046.txt](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)`
- [RepoGraph](https://arxiv.org/abs/2410.14684) — `[repograph-2410.14684.pdf](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf)` · `[repograph-2410.14684.txt](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)`
- [AutoCodeRover](https://arxiv.org/abs/2404.05427) — `[autocoderover-2404.05427.pdf](../../presentations/write-code-ai-agents-love/research/papers/autocoderover-2404.05427.pdf)` · `[autocoderover-2404.05427.txt](../../presentations/write-code-ai-agents-love/research/paper-text/autocoderover-2404.05427.txt)`

Plot data: `[repository_graph_context.csv](../../presentations/write-code-ai-agents-love/research/data/repository_graph_context.csv)`

### Multi-file ripple

Most meaningful product work is not one edit. It is a seed edit plus the edits that ripple out from it.

Change a function signature and the callers move. Add a route and the client, auth rule, tests, docs, and telemetry move. Add a database field and the migration, repository layer, serializers, fixtures, seed data, generated SDK, and UI state move. Add a feature flag and the default path, rollout path, cleanup path, and metrics move. The agent may make a plausible local patch and still miss the actual work because the hard part is the propagation.

This is the cleanest way to talk about multi-file work:

```txt
seed edit:    the first place the change is obviously requested
derived edit: a second edit forced by dependency, contract, behavior, or constraint
oracle:       the check that proves both the new behavior and old behavior survived
```

CodePlan is the sharpest paper here. It frames repository-level coding as a planning problem because code is interdependent and too large to stuff into one prompt. Its plan graph starts from seed edit specifications, then uses incremental dependency analysis and change may-impact analysis to find derived obligations. In its evaluation, CodePlan got 5/6 repositories to pass validity checks; baselines with the same kind of contextual information but without planning got 0/6. The exact number should not be oversold: it is six repositories, two task families, GPT-4-32k-era tooling, and some proprietary/internal code. But the mechanism is still the right mental model. You do not want the agent guessing the ripple. You want the repository to expose it.

InlineCoder gives the same argument at function scale. A function is constrained by its upstream callers and depends on its downstream callees. InlineCoder inlines caller and callee context and reports relative gains on RepoExec of 29.73% exact match, 20.82% edit similarity, and 49.34% BLEU over its strongest baseline. Do not turn that into "call graphs solve coding." They do not. But caller/callee context is exactly the kind of local ripple slice an agent needs before editing.

RACE-bench makes the failure mode concrete for feature work. It evaluates 528 real-world feature-addition instances and separates patch application from resolution. AutoCodeRover applied patches in 96.21% of cases but resolved 28.79%. mini-SWE-Agent applied 95.83% and resolved 70.08%. That gap matters. A patch can apply cleanly while the feature is still wrong. RACE-bench also shows reasoning recall falling as work gets more concrete: for mini-SWE-Agent, file-level recall is 0.890, task-level recall is 0.751, and step-level recall is 0.445. The agent often finds the neighborhood, then loses the implementation steps.

Constraint Decay adds the production-shaped version of the same problem. The paper fixes one RealWorld Conduit API contract, then layers framework, architecture, database, and ORM constraints across 80 greenfield backend tasks and 20 feature-implementation tasks. Capable configurations lose about 30 percentage points of assertion pass rate from unconstrained baseline to fully specified tasks. Database constraints drive much of the decay. This is not an argument against architecture, databases, or ORMs. It is an argument against invisible architecture. Production constraints are necessary; hidden constraints are where agents bleed.

FeatureBench and FEA-Bench both point in the same direction: feature implementation is much harder than bug fixing or local completion. FeatureBench builds 200 feature-oriented tasks and 3,825 executable environments from 24 repositories; Claude Opus 4.5 is reported at 11.0% resolved on the full set, and GPT-5.1-Codex at 12.5%. FEA-Bench collects PR-derived feature implementation tasks where models must add new components and integrate them elsewhere in the repository; its abstract is blunt that models perform significantly worse on this setup. The exact benchmarks differ, but the pattern is stable: feature work asks the model to preserve a system while extending it.

So the practical advice is not "make every change single-file." That is childish. The advice is: make the ripple legible.

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

That is not bureaucracy. That is the plan graph in human form.

Codebases can make this even easier:

- Keep extension points obvious: routes, events, jobs, handlers, repositories, generated clients, and migrations should have stable homes.
- Put the nearest working example next to the surface the agent will edit.
- Encode contract changes in types, schemas, generated SDKs, and tests instead of prose.
- Keep caller/callee relationships extractable through explicit imports and named functions.
- Add migration checklists for recurring ripples: API, data model, SDK, docs, tests, telemetry, permissions.
- Use pass-to-pass tests for old behavior, not only fail-to-pass tests for the new feature.
- Add structural checks for boundaries the test suite will not catch.
- Prefer small public interfaces over "just reach into this internal file from wherever."
- When the change is cross-cutting, ask for an explicit plan before implementation and keep the plan tied to files and validation commands.

The skeptical read: none of these papers proves that your production repo gets exactly 30% better if you write a checklist. CodePlan has a small sample. FEA-Bench and FeatureBench are benchmark constructions, not your codebase. Constraint Decay is partly greenfield backend generation. RACE-bench measures agent behavior in a benchmark harness, not a company code review process. More powerful models will reduce some failure rates.

But stronger models do not remove ripple. They only make the local patch better. The underlying job is still to find all dependent obligations and satisfy them without breaking old behavior. If your repository exposes those obligations as imports, types, schemas, tests, generated clients, route maps, lint rules, and examples, the agent has evidence. If it hides them in convention and memory, the agent has vibes.

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

Domain vocabulary is naming at system scale.

The `Naming` section is about whether a symbol tells the truth. This section is about whether the same truth has the same name everywhere the agent looks: code, tests, docs, routes, schemas, events, database columns, generated SDKs, UI copy, issue titles, and task specs.

One concept with five names is five retrieval problems.

```txt
student in the frontend
pupil in the API
learner in the database
member in tests
participant in docs
```

A human may know that this is historical sediment. The agent does not. It sees weak evidence that these are related concepts, then has to spend reasoning budget proving equivalence. Sometimes it succeeds. Sometimes it edits `LearnerProfile` and misses `StudentEnrollment`. Sometimes it searches for "student" and never finds the test named "adds member to course."

The practical rule is boring:

> One domain concept should have one canonical term inside a bounded context.

The bounded-context caveat matters. Do not force one global noun across the company if the concepts are genuinely different. `Account` can mean a billing account, a login account, or a customer account. `User` can mean an authenticated principal in auth and a human customer in product analytics. The mistake is not having local language. The mistake is accidental synonym drift where the same thing is called `student`, `pupil`, and `learner` because nobody cleaned it up.

The research here is indirect but useful. The naming perturbation papers do not run an experiment called "rename half the billing domain and measure agent success." What they show is that model understanding and retrieval depend heavily on identifiers. In "How Does Naming Affect LLMs on Code Analysis Tasks?", GraphCodeBERT's code-search MRR drops from 70.36% to 17.03% on Java and from 68.17% to 23.73% on Python when variable, definition, and invocation names are perturbed. "When Names Disappear" shows that intent-rich real-world code is especially sensitive: on ClassEval class-level summarization, GPT-4o drops from 87.3 to 58.7 after obfuscation; DeepSeek V3 drops from 87.7 to 76.7.

The important nuance from "When Names Disappear" is that competitive-programming code is more robust to name obfuscation. That makes sense. If the code is a canonical algorithm, structure carries more of the meaning. Product code is not like that. A billing reconciliation workflow, school attendance policy, entitlement model, or compliance case queue carries meaning through domain nouns. Strip or drift the nouns and the agent falls back to local mechanics.

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

It might all be the same concept. It might not. The agent has to infer the ontology from scattered names.

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

Now code search, embeddings, type names, test names, and event names all point at the same concept. The agent does not have to prove that `participant` means `student` before it can make progress.

This also matters at integration boundaries. Sometimes the external world has the wrong word for your model. Maybe Stripe says `customer`, your product says `organization`, and your auth layer says `account`. Do not smear all three names through the codebase. Create an explicit translation boundary:

```ts
export function mapStripeCustomerToBillingAccount(
  stripeCustomer: StripeCustomer,
): BillingAccount {
  return {
    id: BillingAccountId.fromStripeCustomerId(stripeCustomer.id),
    billingEmail: stripeCustomer.email,
  };
}
```

The names make the translation visible. The agent can see that `StripeCustomer` and `BillingAccount` are related but not identical. That is much better than a generic `mapCustomer()` that silently crosses contexts.

A lightweight domain vocabulary file can help, but only if it is treated as a map, not a constitution:

```txt
Student
- A person enrolled in a course.
- Use in product, API, database, events, and tests.
- Do not use pupil, learner, participant, or member for this concept.

BillingAccount
- The entity that owns invoices and payment methods.
- Not the same as UserAccount.
```

The stronger version is executable: schema names, enum names, event names, API operation names, generated SDK methods, and tests all use the same term. A glossary that the code contradicts is just stale prose.

Practical rules:

- Pick the canonical term before adding a feature.
- Use the same noun across types, files, tests, routes, schemas, events, docs, and generated clients.
- Use different nouns when concepts are genuinely different.
- Put external terminology behind adapter names that show the translation.
- Rename legacy synonyms when touching the area instead of preserving drift forever.
- Avoid generic nouns like `member`, `item`, `record`, `entity`, `resource`, and `data` unless the domain really is generic.
- Name tests with the same domain language as the code they verify.
- Treat public exported names as retrieval APIs. Renaming them changes how agents find the concept.
- Add a small vocabulary note for high-confusion domains: billing, auth, permissions, education, healthcare, finance.

The skeptical read: domain vocabulary will not save a tangled system. Names are not types, tests, or architecture. The strongest numbers here come from code-search and summarization tasks, not full production-agent editing. Modern models may be less brittle than CodeBERT-era systems. But the direction is hard to ignore: identifiers are semantic handles. If your domain language is inconsistent, you are removing handles and adding false ones.

If an agent cannot grep the concept, it will search by vibes.

**Insights:** [INSIGHT_13](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md)

**Papers**

- [CodeT5](https://arxiv.org/abs/2109.00859) — `[codet5-identifier-aware-2109.00859.pdf](../../presentations/write-code-ai-agents-love/research/papers/codet5-identifier-aware-2109.00859.pdf)` · `[codet5-identifier-aware-2109.00859.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codet5-identifier-aware-2109.00859.txt)`
- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) — `[naming-affects-llms-code-analysis-2307.12488.pdf](../../presentations/write-code-ai-agents-love/research/papers/naming-affects-llms-code-analysis-2307.12488.pdf)` · `[naming-affects-llms-code-analysis-2307.12488.txt](../../presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt)`
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — `[when-names-disappear-2510.03178.pdf](../../presentations/write-code-ai-agents-love/research/papers/when-names-disappear-2510.03178.pdf)` · `[when-names-disappear-2510.03178.txt](../../presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt)`
- [ToolGen](https://arxiv.org/abs/2401.06391) — `[toolgen-autocomplete-repo-codegen-2401.06391.pdf](../../presentations/write-code-ai-agents-love/research/papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf)` · `[toolgen-autocomplete-repo-codegen-2401.06391.txt](../../presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)`

### Patterns

Suggested segment:

Patterns are not "best practices" pages. They are the shapes the agent can copy from the nearest similar feature.

This matters because agents are very good at imitation. If the repo has five consistent examples of "how we add a route", "how we add a domain command", "how we call this API", or "how we test this adapter", the agent has a much better chance of landing inside the local style. If every feature is a snowflake, the agent has to infer the architecture from first principles. That is where it starts inventing.

The research supports the practical version of this, but not the sloppy version. The sloppy version is: "make it modular" or "document the pattern." I do not think the evidence supports that as a strong claim.

[Agentless](https://arxiv.org/abs/2407.01489) is the cleanest simplicity result here. It used a localize -> repair -> validate workflow instead of an autonomous tool loop, and still reached 32.00% on SWE-bench Lite at $0.70 per issue in the paper. That does not prove simple workflows always win. Later systems beat that number. It does show that a lot of the value comes from giving the model a clear place to look, a clear local edit, and a clear validation signal. A repo with repeatable patterns gives exactly that.

But the modularity evidence is more skeptical than people want it to be. [CodeChain](https://arxiv.org/abs/2310.08992) improved pass@1 by 35% on APPS and 76% on CodeContests by pushing models toward modular decomposition and self-revision. Useful result, but it is competitive programming: self-contained problems, not messy product repos. Then [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) directly challenges the simplistic claim and finds that modularity is not a core factor for improving code generation performance. So I would not write "AI loves modular code." Too broad. Too cute. Probably false in enough cases to be dangerous.

The better claim is: AI benefits from repeatable boundaries with enough surrounding context.

The chunking research points in the same direction. [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763) found that function-level chunks underperformed other strategies by 3.57 to 5.64 percentage points on RepoEval, with Cliff's delta = -1.0. Cross-file context length mattered more: going from 2,048 to 8,192 tokens improved exact match by up to 4.2 points, while chunk size was weaker and non-monotonic. That is a good warning. Do not turn the codebase into many tiny "clean" pieces and assume the model is helped. A pattern needs the declaration, imports, tests, adjacent examples, and boundary types. A single isolated function is often not enough.

So the pattern should be a complete local recipe:

- the canonical implementation example;
- the public boundary or interface;
- the request/response or input/output types;
- the matching test shape;
- the validation command;
- the rule that catches the common wrong version.

For example, "add a new webhook" should not mean "read our architecture doc." It should mean: copy `webhooks/stripe`, define the event schema here, dispatch through this domain command, persist through this repository interface, test with this fixture shape, and never call the ORM from the route. If the ORM rule is important, lint it. If the schema is important, type it. If the fixture shape is important, keep a nearby test that demonstrates it.

This is also where [CODETASTE](https://arxiv.org/abs/2603.04177) is useful. The benchmark combines repository tests with custom static checks for refactoring tasks. In the data we pulled, GPT-5.2 alignment was 69.6% in the instructed track, but only 7.7% in the open direct track where the model had to infer the human refactoring choice from a vague focus area. Planning helped, but not enough: open plan was still only 14.1%. The lesson is not "agents cannot refactor." The lesson is that agents are much better at executing a specified structural move than discovering the intended local pattern from vibes.

Agent PR data makes the same point from production behavior. [AIDev](https://arxiv.org/abs/2602.09185) collected 932,791 agentic PRs across 116,211 repositories. That dataset proves scale, not quality. But [How AI Coding Agents Modify Code](https://arxiv.org/abs/2601.17581) then compares merged agentic and human PRs and finds meaningful distribution differences: Cliff's delta 0.5429 for commits, 0.4487 for files touched, 0.4462 for deletions, and smaller but still visible effects for additions and line changes. I would be careful about over-reading the direction without the exact table in front of the reader, but the safe claim is enough: agentic changes have a different shape. A codebase should make the desired shape easy to copy and the wrong shape hard to merge.

The practical rule is simple: make the right pattern the path of least resistance.

- Keep one or two canonical examples per repeated workflow. Do not make the agent choose between seven historical styles.
- Mark old patterns as deprecated in code, or delete them. The model will happily copy legacy if legacy is nearby.
- Put pattern pieces close enough that retrieval can capture them: implementation, declarations, tests, fixtures, and docs.
- Prefer named extension points over open-ended hooks. `registerInvoiceEventHandler` is easier to copy than "put it somewhere in plugins."
- Encode mechanical parts as lint/static rules: forbidden imports, generated-code boundaries, required middleware, raw API calls, missing schema validation.
- Avoid micro-patterns that fragment context across too many files. The research does not say tiny functions are bad. It says isolated function chunks are bad retrieval units.

The caveat is important: patterns can become cargo cult. An agent can copy a pattern that was only correct in one old case. It can preserve accidental complexity because it looks official. It can spread a bad abstraction faster than a human would. So patterns need ownership. Canonical examples should be curated, current, and backed by tests. If you cannot tell which example the agent should copy, the repo is asking for inconsistent output.

This is the line I would use:

> A pattern is not a paragraph in a wiki. It is a nearby working example, a typed boundary, a matching test, and a precise failure when the agent gets it wrong.

**Insights:** [INSIGHT_07](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md) · [INSIGHT_15](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_15_modularity_is_not_magic_boundaries_are.md) · [INSIGHT_18](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_18_custom_lint_rules_are_executable_architecture.md) · [INSIGHT_22](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md) · [INSIGHT_25](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_25_agentic_prs_have_a_different_shape.md)

**Papers**

- [Agentless](https://arxiv.org/abs/2407.01489) — `[agentless-2407.01489.pdf](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf)` · `[agentless-2407.01489.txt](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)`
- [CodeChain](https://arxiv.org/abs/2310.08992) — `[codechain-modular-codegen-2310.08992.pdf](../../presentations/write-code-ai-agents-love/research/papers/codechain-modular-codegen-2310.08992.pdf)` · `[codechain-modular-codegen-2310.08992.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codechain-modular-codegen-2310.08992.txt)`
- [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) — `[revisiting-modularity-codegen-2407.11406.pdf](../../presentations/write-code-ai-agents-love/research/papers/revisiting-modularity-codegen-2407.11406.pdf)` · `[revisiting-modularity-codegen-2407.11406.txt](../../presentations/write-code-ai-agents-love/research/paper-text/revisiting-modularity-codegen-2407.11406.txt)`
- [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763) — `[chunking-rag-code-completion-2605.04763.pdf](../../presentations/write-code-ai-agents-love/research/papers/chunking-rag-code-completion-2605.04763.pdf)` · `[chunking-rag-code-completion-2605.04763.txt](../../presentations/write-code-ai-agents-love/research/paper-text/chunking-rag-code-completion-2605.04763.txt)`
- [CODETASTE](https://arxiv.org/abs/2603.04177) — `[codetaste-2603.04177.pdf](../../presentations/write-code-ai-agents-love/research/papers/codetaste-2603.04177.pdf)` · `[codetaste-2603.04177.txt](../../presentations/write-code-ai-agents-love/research/paper-text/codetaste-2603.04177.txt)`
- [AIDev: The First Comprehensive Dataset of Agentic-PRs](https://arxiv.org/abs/2602.09185) — `[aidev-agentic-prs-2602.09185.pdf](../../presentations/write-code-ai-agents-love/research/papers/aidev-agentic-prs-2602.09185.pdf)` · `[aidev-agentic-prs-2602.09185.txt](../../presentations/write-code-ai-agents-love/research/paper-text/aidev-agentic-prs-2602.09185.txt)`
- [How AI Coding Agents Modify Code](https://arxiv.org/abs/2601.17581) — `[how-ai-coding-agents-modify-code-2601.17581.pdf](../../presentations/write-code-ai-agents-love/research/papers/how-ai-coding-agents-modify-code-2601.17581.pdf)` · `[how-ai-coding-agents-modify-code-2601.17581.txt](../../presentations/write-code-ai-agents-love/research/paper-text/how-ai-coding-agents-modify-code-2601.17581.txt)`

Plot data: `[names_types_apis.csv](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)` · `[feature_constraints_planning.csv](../../presentations/write-code-ai-agents-love/research/data/feature_constraints_planning.csv)` · `[agentic_pr_change_shape.csv](../../presentations/write-code-ai-agents-love/research/data/agentic_pr_change_shape.csv)`

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
