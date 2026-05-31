

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

Master index: [`../../presentations/write-code-ai-agents-love/research/references.md`](../../presentations/write-code-ai-agents-love/research/references.md)

## Agent-specific stuff

### Agents.md/Claude.md

**Insights:** [INSIGHT_02](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_02_agent_instructions_are_config.md) · [INSIGHT_24](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_24_context_files_are_config_with_debt.md)

**Papers**

- [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/abs/2601.20404) — [`agents-md-impact-2601.20404.pdf`](../../presentations/write-code-ai-agents-love/research/papers/agents-md-impact-2601.20404.pdf) · [`agents-md-impact-2601.20404.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/agents-md-impact-2601.20404.txt)
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) — [`evaluating-agents-md-2602.11988.pdf`](../../presentations/write-code-ai-agents-love/research/papers/evaluating-agents-md-2602.11988.pdf) · [`evaluating-agents-md-2602.11988.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/evaluating-agents-md-2602.11988.txt)
- [Decoding the Configuration of AI Coding Agents](https://arxiv.org/abs/2511.09268) — [`claude-code-configs-2511.09268.pdf`](../../presentations/write-code-ai-agents-love/research/papers/claude-code-configs-2511.09268.pdf) · [`claude-code-configs-2511.09268.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/claude-code-configs-2511.09268.txt)
- [Agent READMEs: An Empirical Study of Context Files for Agentic Coding](https://leo-lihao.github.io/files/P15.pdf) — [`agent-readmes-context-files-2025.pdf`](../../presentations/write-code-ai-agents-love/research/papers/agent-readmes-context-files-2025.pdf) · [`agent-readmes-context-files-2025.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/agent-readmes-context-files-2025.txt)
- [OctoBench](https://arxiv.org/abs/2601.10343) — [`octobench-2601.10343.pdf`](../../presentations/write-code-ai-agents-love/research/papers/octobench-2601.10343.pdf) · [`octobench-2601.10343.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/octobench-2601.10343.txt)

**Practitioner**

- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — [`anthropic-claude-code-best-practices.html`](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)
- [GitHub Copilot coding agent best practices](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks) — [`github-copilot-coding-agent-best-practices.html`](../../presentations/write-code-ai-agents-love/research/articles/github-copilot-coding-agent-best-practices.html)
- [Cursor rules for AI](https://docs.cursor.com/context/rules-for-ai) — [`cursor-rules-for-ai.html`](../../presentations/write-code-ai-agents-love/research/articles/cursor-rules-for-ai.html)
- [OpenAI Codex repo AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md) — [`openai-codex-repo-agents-md.md`](../../presentations/write-code-ai-agents-love/research/articles/openai-codex-repo-agents-md.md)
- [Builder.io: Improve your AI code output with AGENTS.md](https://www.builder.io/blog/agents-md) — [`builder-agents-md.html`](../../presentations/write-code-ai-agents-love/research/articles/builder-agents-md.html)
- [AI Hackers: AGENTS.md practical guide](https://aihackers.net/posts/agents-md-practical-guide/) — [`aihackers-agents-md-practical-guide.html`](../../presentations/write-code-ai-agents-love/research/articles/aihackers-agents-md-practical-guide.html)

### Layered context

**Insights:** [INSIGHT_08](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_08_context_should_be_layered.md) · [INSIGHT_16](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_16_more_context_can_hurt.md)

**Papers**

- [Codified Context](https://arxiv.org/abs/2602.20478) — [`codified-context-2602.20478.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codified-context-2602.20478.pdf) · [`codified-context-2602.20478.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codified-context-2602.20478.txt)
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) — [`evaluating-agents-md-2602.11988.pdf`](../../presentations/write-code-ai-agents-love/research/papers/evaluating-agents-md-2602.11988.pdf) · [`evaluating-agents-md-2602.11988.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/evaluating-agents-md-2602.11988.txt)
- [Lost in the Middle](https://arxiv.org/abs/2307.03172) — [`lost-in-the-middle-2307.03172.pdf`](../../presentations/write-code-ai-agents-love/research/papers/lost-in-the-middle-2307.03172.pdf) · [`lost-in-the-middle-2307.03172.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/lost-in-the-middle-2307.03172.txt)
- [A3-CodGen](https://arxiv.org/abs/2312.05772) — [`a3-codgen-2312.05772.pdf`](../../presentations/write-code-ai-agents-love/research/papers/a3-codgen-2312.05772.pdf) · [`a3-codgen-2312.05772.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/a3-codgen-2312.05772.txt)

**Practitioner**

- [Anthropic: How Claude Code works in large codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) — [`anthropic-large-codebases-claude-code.html`](../../presentations/write-code-ai-agents-love/research/articles/anthropic-large-codebases-claude-code.html)
- [Dive into Claude Code](https://arxiv.org/abs/2604.14228) — [`dive-into-claude-code-2604.14228.pdf`](../../presentations/write-code-ai-agents-love/research/papers/dive-into-claude-code-2604.14228.pdf) · [`dive-into-claude-code-2604.14228.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/dive-into-claude-code-2604.14228.txt)

### Setup commands

**Insights:** [INSIGHT_02](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_02_agent_instructions_are_config.md) · [INSIGHT_23](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_23_setup_is_part_of_the_task.md)

**Papers**

- [SetupBench](https://arxiv.org/abs/2507.09063) — [`setupbench-2507.09063.pdf`](../../presentations/write-code-ai-agents-love/research/papers/setupbench-2507.09063.pdf) · [`setupbench-2507.09063.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/setupbench-2507.09063.txt)

**Practitioner**

- [OpenAI Codex repo AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md) — [`openai-codex-repo-agents-md.md`](../../presentations/write-code-ai-agents-love/research/articles/openai-codex-repo-agents-md.md)
- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — [`anthropic-claude-code-best-practices.html`](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)
- [GitHub Copilot coding agent best practices](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks) — [`github-copilot-coding-agent-best-practices.html`](../../presentations/write-code-ai-agents-love/research/articles/github-copilot-coding-agent-best-practices.html)

Plot data: [`setup_verification.csv`](../../presentations/write-code-ai-agents-love/research/data/setup_verification.csv)

### Subagents

**Insights:** [INSIGHT_07](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md)

**Papers**

- [Agentless](https://arxiv.org/abs/2407.01489) — [`agentless-2407.01489.pdf`](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf) · [`agentless-2407.01489.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)
- [ContextBench](https://arxiv.org/abs/2602.05892) — [`contextbench-2602.05892.pdf`](../../presentations/write-code-ai-agents-love/research/papers/contextbench-2602.05892.pdf) · [`contextbench-2602.05892.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/contextbench-2602.05892.txt)
- [Dive into Claude Code](https://arxiv.org/abs/2604.14228) — [`dive-into-claude-code-2604.14228.pdf`](../../presentations/write-code-ai-agents-love/research/papers/dive-into-claude-code-2604.14228.pdf) · [`dive-into-claude-code-2604.14228.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/dive-into-claude-code-2604.14228.txt)

**Practitioner**

- [Anthropic: How Claude Code works in large codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) — [`anthropic-large-codebases-claude-code.html`](../../presentations/write-code-ai-agents-love/research/articles/anthropic-large-codebases-claude-code.html)
- [LocalCan: Claude Code workflow for large projects](https://www.localcan.com/blog/claude-code-workflow-for-large-projects) — [`localcan-claude-code-large-projects.html`](../../presentations/write-code-ai-agents-love/research/articles/localcan-claude-code-large-projects.html)
- [HN: Claude Code framework wars](https://news.ycombinator.com/item?id=45155302) — [`hn-claude-code-framework-wars.html`](../../presentations/write-code-ai-agents-love/research/articles/hn-claude-code-framework-wars.html)
- [HN: Claude Code swarms](https://news.ycombinator.com/item?id=46743908) — [`hn-claude-code-swarms.json`](../../presentations/write-code-ai-agents-love/research/articles/hn-claude-code-swarms.json)

### RepoMap / Architecture map

**Insights:** [INSIGHT_01](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_01_context_maps.md) · [INSIGHT_21](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md)

**Papers**

- [RepoGraph](https://arxiv.org/abs/2410.14684) — [`repograph-2410.14684.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf) · [`repograph-2410.14684.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)
- [Repository Intelligence Graph](https://arxiv.org/abs/2601.10112) — [`repository-intelligence-graph-2601.10112.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repository-intelligence-graph-2601.10112.pdf) · [`repository-intelligence-graph-2601.10112.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repository-intelligence-graph-2601.10112.txt)
- [ContextBench](https://arxiv.org/abs/2602.05892) — [`contextbench-2602.05892.pdf`](../../presentations/write-code-ai-agents-love/research/papers/contextbench-2602.05892.pdf) · [`contextbench-2602.05892.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/contextbench-2602.05892.txt)
- [RepoBench](https://arxiv.org/abs/2306.03091) — [`repobench-2306.03091.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repobench-2306.03091.pdf) · [`repobench-2306.03091.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repobench-2306.03091.txt)
- [AI-assisted Coding with Cody](https://arxiv.org/abs/2408.05344) — [`cody-context-retrieval-2408.05344.pdf`](../../presentations/write-code-ai-agents-love/research/papers/cody-context-retrieval-2408.05344.pdf) · [`cody-context-retrieval-2408.05344.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/cody-context-retrieval-2408.05344.txt)

**Practitioner**

- [Aider repo map docs](https://aider.chat/docs/repomap.html) — [`aider-repomap.md`](../../presentations/write-code-ai-agents-love/research/articles/aider-repomap.md)
- [Sourcegraph: How Cody understands your codebase](https://sourcegraph.com/blog/how-cody-understands-your-codebase) — [`sourcegraph-how-cody-understands-codebase.html`](../../presentations/write-code-ai-agents-love/research/articles/sourcegraph-how-cody-understands-codebase.html)
- [Sourcegraph: Toward infinite context for code](https://sourcegraph.com/blog/towards-infinite-context-for-code) — [`sourcegraph-toward-infinite-context.html`](../../presentations/write-code-ai-agents-love/research/articles/sourcegraph-toward-infinite-context.html)

Plot data: [`repository_graph_context.csv`](../../presentations/write-code-ai-agents-love/research/data/repository_graph_context.csv)

## Strucutre

### Monorepo

**Insights:** [INSIGHT_19](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_19_monorepos_are_agent_context_infrastructure.md)

**Practitioner**

- [Google: Why Google stores billions of lines of code in a single repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/) — [`google-monorepo.html`](../../presentations/write-code-ai-agents-love/research/articles/google-monorepo.html)
- [Code Simplicity: What is a monorepo, really?](https://www.codesimplicity.com/post/what-is-a-monorepo-really/) — [`code-simplicity-monorepo.html`](../../presentations/write-code-ai-agents-love/research/articles/code-simplicity-monorepo.html)
- [Write the Docs: Docs as Code](https://www.writethedocs.org/guide/docs-as-code.html) — [`write-the-docs-docs-as-code.html`](../../presentations/write-code-ai-agents-love/research/articles/write-the-docs-docs-as-code.html)
- [GitLab: Infrastructure as Code and GitOps](https://about.gitlab.com/topics/gitops/gitlab-enables-infrastructure-as-code/) — [`gitlab-iac-gitops.html`](../../presentations/write-code-ai-agents-love/research/articles/gitlab-iac-gitops.html)
- [Dropbox: Reducing our monorepo size](https://dropbox.tech/infrastructure/reducing-our-monorepo-size-to-improve-developer-velocity) — [`dropbox-monorepo-size.html`](../../presentations/write-code-ai-agents-love/research/articles/dropbox-monorepo-size.html)

### Bounded Context / Layout

**Insights:** [INSIGHT_15](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_15_modularity_is_not_magic_boundaries_are.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md)

**Papers**

- [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) — [`revisiting-modularity-codegen-2407.11406.pdf`](../../presentations/write-code-ai-agents-love/research/papers/revisiting-modularity-codegen-2407.11406.pdf) · [`revisiting-modularity-codegen-2407.11406.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/revisiting-modularity-codegen-2407.11406.txt)
- [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763) — [`chunking-rag-code-completion-2605.04763.pdf`](../../presentations/write-code-ai-agents-love/research/papers/chunking-rag-code-completion-2605.04763.pdf) · [`chunking-rag-code-completion-2605.04763.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/chunking-rag-code-completion-2605.04763.txt)
- [CodeChain](https://arxiv.org/abs/2310.08992) — [`codechain-modular-codegen-2310.08992.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codechain-modular-codegen-2310.08992.pdf) · [`codechain-modular-codegen-2310.08992.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codechain-modular-codegen-2310.08992.txt)
- [The Modular Imperative](https://namin.seas.harvard.edu/pubs/lmpl-modularity.pdf) — [`modular-imperative-lmpl-2025.pdf`](../../presentations/write-code-ai-agents-love/research/papers/modular-imperative-lmpl-2025.pdf) · [`modular-imperative-lmpl-2025.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/modular-imperative-lmpl-2025.txt)
- [Architecture Without Architects](https://arxiv.org/abs/2604.04990) — [`architecture-without-architects-2604.04990.pdf`](../../presentations/write-code-ai-agents-love/research/papers/architecture-without-architects-2604.04990.pdf) · [`architecture-without-architects-2604.04990.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/architecture-without-architects-2604.04990.txt)

**Practitioner**

- [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — [`nx-enforce-module-boundaries.html`](../../presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html)

### Setup / bootstrap

**Insights:** [INSIGHT_03](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_03_reproducible_setup_is_agent_infrastructure.md) · [INSIGHT_23](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_23_setup_is_part_of_the_task.md)

**Papers**

- [Beyond pip install / Installamatic](https://arxiv.org/abs/2412.06294) — [`installamatic-2412.06294.pdf`](../../presentations/write-code-ai-agents-love/research/papers/installamatic-2412.06294.pdf) · [`installamatic-2412.06294.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/installamatic-2412.06294.txt)
- [SetupBench](https://arxiv.org/abs/2507.09063) — [`setupbench-2507.09063.pdf`](../../presentations/write-code-ai-agents-love/research/papers/setupbench-2507.09063.pdf) · [`setupbench-2507.09063.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/setupbench-2507.09063.txt)
- [GitTaskBench](https://ojs.aaai.org/index.php/AAAI/article/download/40533/44494) — [`gittaskbench-aaai-2026.pdf`](../../presentations/write-code-ai-agents-love/research/papers/gittaskbench-aaai-2026.pdf) · [`gittaskbench-aaai-2026.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/gittaskbench-aaai-2026.txt)
- [SWE-bench](https://arxiv.org/abs/2310.06770) — [`swe-bench-2310.06770.pdf`](../../presentations/write-code-ai-agents-love/research/papers/swe-bench-2310.06770.pdf) · [`swe-bench-2310.06770.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt) *(pre-baked envs; setup assumed)*

Plot data: [`setup_verification.csv`](../../presentations/write-code-ai-agents-love/research/data/setup_verification.csv)

## The Code

### "Code Quality": "how easy is this code to change?"

**Insights:** [INSIGHT_30](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_30_codehealth_predicts_ai_refactoring_success.md) · [INSIGHT_31](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_31_perplexity_is_not_file_level_ai_friendliness.md) · [INSIGHT_05](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_05_maintainability_beats_one_shot_correctness.md)

**Papers**

- [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200) — [`code-for-machines-2601.02200.pdf`](../../presentations/write-code-ai-agents-love/research/papers/code-for-machines-2601.02200.pdf)
- [Echoes of AI](https://arxiv.org/abs/2507.00788) — [`echoes-of-ai-2507.00788.pdf`](../../presentations/write-code-ai-agents-love/research/papers/echoes-of-ai-2507.00788.pdf)
- [How do Humans and LLMs Process Confusing Code?](https://arxiv.org/abs/2508.18547) — [`humans-llms-confusing-code-2508.18547.pdf`](../../presentations/write-code-ai-agents-love/research/papers/humans-llms-confusing-code-2508.18547.pdf)
- [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) — [`smells-llm-generated-code-2510.03029.pdf`](../../presentations/write-code-ai-agents-love/research/papers/smells-llm-generated-code-2510.03029.pdf) · [`smells-llm-generated-code-2510.03029.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/smells-llm-generated-code-2510.03029.txt)
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — [`needle-in-the-repo-2603.27745.pdf`](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf) · [`needle-in-the-repo-2603.27745.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)
- [SWE-CI](https://arxiv.org/abs/2603.03823) — [`swe-ci-2603.03823.pdf`](../../presentations/write-code-ai-agents-love/research/papers/swe-ci-2603.03823.pdf) · [`swe-ci-2603.03823.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/swe-ci-2603.03823.txt)

### Tests

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_17](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_17_quality_gates_must_cover_smells.md)

**Papers**

- [SWE-bench](https://arxiv.org/abs/2310.06770) — [`swe-bench-2310.06770.pdf`](../../presentations/write-code-ai-agents-love/research/papers/swe-bench-2310.06770.pdf) · [`swe-bench-2310.06770.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt)
- [Agentless](https://arxiv.org/abs/2407.01489) — [`agentless-2407.01489.pdf`](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf) · [`agentless-2407.01489.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)
- [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) — [`rethinking-agent-generated-tests-2602.07900.pdf`](../../presentations/write-code-ai-agents-love/research/papers/rethinking-agent-generated-tests-2602.07900.pdf) · [`rethinking-agent-generated-tests-2602.07900.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/rethinking-agent-generated-tests-2602.07900.txt)
- [FeatureBench](https://arxiv.org/abs/2602.10975) — [`featurebench-2602.10975.pdf`](../../presentations/write-code-ai-agents-love/research/papers/featurebench-2602.10975.pdf) · [`featurebench-2602.10975.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt)
- [ABTest](https://arxiv.org/abs/2604.03362) — [`abtest-agent-anomalies-2604.03362.pdf`](../../presentations/write-code-ai-agents-love/research/papers/abtest-agent-anomalies-2604.03362.pdf) · [`abtest-agent-anomalies-2604.03362.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/abtest-agent-anomalies-2604.03362.txt)
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — [`needle-in-the-repo-2603.27745.pdf`](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf) · [`needle-in-the-repo-2603.27745.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)

**Practitioner**

- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — [`anthropic-claude-code-best-practices.html`](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)

### Examples as specs

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_22](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md) · [INSIGHT_11](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_11_task_specs_are_part_of_the_codebase.md)

**Papers**

- [DocPrompting](https://arxiv.org/abs/2207.05987) — [`docprompting-2207.05987.pdf`](../../presentations/write-code-ai-agents-love/research/papers/docprompting-2207.05987.pdf) · [`docprompting-2207.05987.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/docprompting-2207.05987.txt)
- [FeatureBench](https://arxiv.org/abs/2602.10975) — [`featurebench-2602.10975.pdf`](../../presentations/write-code-ai-agents-love/research/papers/featurebench-2602.10975.pdf) · [`featurebench-2602.10975.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt)
- [RAR: Retrieval Augmented Retrieval for Code Generation](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) — [`rar-retrieval-augmented-retrieval-2024.pdf`](../../presentations/write-code-ai-agents-love/research/papers/rar-retrieval-augmented-retrieval-2024.pdf) · [`rar-retrieval-augmented-retrieval-2024.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/rar-retrieval-augmented-retrieval-2024.txt)
- [CodePlan](https://arxiv.org/abs/2309.12499) — [`codeplan-2309.12499.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codeplan-2309.12499.pdf) · [`codeplan-2309.12499.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codeplan-2309.12499.txt)

### Naming

**Insights:** [INSIGHT_13](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md)

**Papers**

- [CodeT5](https://arxiv.org/abs/2109.00859) — [`codet5-identifier-aware-2109.00859.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codet5-identifier-aware-2109.00859.pdf) · [`codet5-identifier-aware-2109.00859.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codet5-identifier-aware-2109.00859.txt)
- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) — [`naming-affects-llms-code-analysis-2307.12488.pdf`](../../presentations/write-code-ai-agents-love/research/papers/naming-affects-llms-code-analysis-2307.12488.pdf) · [`naming-affects-llms-code-analysis-2307.12488.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt)
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — [`when-names-disappear-2510.03178.pdf`](../../presentations/write-code-ai-agents-love/research/papers/when-names-disappear-2510.03178.pdf) · [`when-names-disappear-2510.03178.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt)
- [CodeBERT](https://arxiv.org/abs/2002.08155) — [`codebert-2002.08155.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codebert-2002.08155.pdf) · [`codebert-2002.08155.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codebert-2002.08155.txt)

Plot data: [`names_types_apis.csv`](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)

### Types

**Insights:** [INSIGHT_06](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_06_types_and_interfaces_compress_context.md) · [INSIGHT_14](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_14_types_and_static_surfaces_reduce_hallucinated_apis.md)

**Papers**

- [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) — [`type-constrained-codegen-2504.09246.pdf`](../../presentations/write-code-ai-agents-love/research/papers/type-constrained-codegen-2504.09246.pdf) · [`type-constrained-codegen-2504.09246.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt)
- [CatCoder](https://arxiv.org/abs/2406.03283) — [`catcoder-2406.03283.pdf`](../../presentations/write-code-ai-agents-love/research/papers/catcoder-2406.03283.pdf) · [`catcoder-2406.03283.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/catcoder-2406.03283.txt)
- [ToolGen](https://arxiv.org/abs/2401.06391) — [`toolgen-autocomplete-repo-codegen-2401.06391.pdf`](../../presentations/write-code-ai-agents-love/research/papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf) · [`toolgen-autocomplete-repo-codegen-2401.06391.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt)

Plot data: [`names_types_apis.csv`](../../presentations/write-code-ai-agents-love/research/data/names_types_apis.csv)

### Dependency surface

**Insights:** [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md)

**Papers**

- [CrossCodeEval](https://arxiv.org/abs/2310.11248) — [`crosscodeeval-2310.11248.pdf`](../../presentations/write-code-ai-agents-love/research/papers/crosscodeeval-2310.11248.pdf) · [`crosscodeeval-2310.11248.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/crosscodeeval-2310.11248.txt)
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — [`graphcodeagent-2504.10046.pdf`](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf) · [`graphcodeagent-2504.10046.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)
- [GraphCodeBERT](https://arxiv.org/abs/2009.08366) — [`graphcodebert-2009.08366.pdf`](../../presentations/write-code-ai-agents-love/research/papers/graphcodebert-2009.08366.pdf) · [`graphcodebert-2009.08366.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodebert-2009.08366.txt)
- [CodeGRAG](https://arxiv.org/abs/2405.02355) — [`codegrag-2405.02355.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codegrag-2405.02355.pdf) · [`codegrag-2405.02355.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codegrag-2405.02355.txt)
- [What to Retrieve for Effective Retrieval-Augmented Code Generation?](https://arxiv.org/abs/2503.20589) — [`what-to-retrieve-racg-2503.20589.pdf`](../../presentations/write-code-ai-agents-love/research/papers/what-to-retrieve-racg-2503.20589.pdf) · [`what-to-retrieve-racg-2503.20589.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/what-to-retrieve-racg-2503.20589.txt)

**Practitioner**

- [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — [`nx-enforce-module-boundaries.html`](../../presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html)

### Generated SDKs

**Insights:** [INSIGHT_20](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_20_generated_sdks_turn_api_contracts_into_code.md)

**Papers**

- [DocPrompting](https://arxiv.org/abs/2207.05987) — [`docprompting-2207.05987.pdf`](../../presentations/write-code-ai-agents-love/research/papers/docprompting-2207.05987.pdf) · [`docprompting-2207.05987.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/docprompting-2207.05987.txt)
- [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) — [`type-constrained-codegen-2504.09246.pdf`](../../presentations/write-code-ai-agents-love/research/papers/type-constrained-codegen-2504.09246.pdf) · [`type-constrained-codegen-2504.09246.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt)
- [ToolGen](https://arxiv.org/abs/2401.06391) — [`toolgen-autocomplete-repo-codegen-2401.06391.pdf`](../../presentations/write-code-ai-agents-love/research/papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf) · [`toolgen-autocomplete-repo-codegen-2401.06391.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt)
- [RAR: Retrieval Augmented Retrieval for Code Generation](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) — [`rar-retrieval-augmented-retrieval-2024.pdf`](../../presentations/write-code-ai-agents-love/research/papers/rar-retrieval-augmented-retrieval-2024.pdf) · [`rar-retrieval-augmented-retrieval-2024.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/rar-retrieval-augmented-retrieval-2024.txt)

**Practitioner**

- [OpenAPI Generator](https://openapi-generator.tech/index.html) — [`openapi-generator.html`](../../presentations/write-code-ai-agents-love/research/articles/openapi-generator.html)
- [Microsoft Kiota](https://learn.microsoft.com/en-us/openapi/kiota/) — [`microsoft-kiota.html`](../../presentations/write-code-ai-agents-love/research/articles/microsoft-kiota.html)
- [Orval](https://orval.dev/docs) — [`orval-docs.html`](../../presentations/write-code-ai-agents-love/research/articles/orval-docs.html)
- [Speakeasy: Generate SDKs from OpenAPI](https://www.speakeasy.com/docs/sdks/create-client-sdks) — [`speakeasy-generate-sdks.html`](../../presentations/write-code-ai-agents-love/research/articles/speakeasy-generate-sdks.html)
- [Stainless TypeScript SDKs](https://www.stainless.com/docs/sdks/typescript/) — [`stainless-typescript-sdk.html`](../../presentations/write-code-ai-agents-love/research/articles/stainless-typescript-sdk.html)
- [FastAPI: Generate clients](https://fastapi.tiangolo.com/advanced/generate-clients/) — [`fastapi-generate-clients.html`](../../presentations/write-code-ai-agents-love/research/articles/fastapi-generate-clients.html)

### Side effects & dynamic surfaces

**Insights:** [INSIGHT_26](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md) · [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md)

**Papers**

- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — [`graphcodeagent-2504.10046.pdf`](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf) · [`graphcodeagent-2504.10046.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)
- [RepoGraph](https://arxiv.org/abs/2410.14684) — [`repograph-2410.14684.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf) · [`repograph-2410.14684.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)
- [AutoCodeRover](https://arxiv.org/abs/2404.05427) — [`autocoderover-2404.05427.pdf`](../../presentations/write-code-ai-agents-love/research/papers/autocoderover-2404.05427.pdf) · [`autocoderover-2404.05427.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/autocoderover-2404.05427.txt)

### Multi-file ripple

**Insights:** [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md) · [INSIGHT_22](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md)

**Papers**

- [CodePlan](https://arxiv.org/abs/2309.12499) — [`codeplan-2309.12499.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codeplan-2309.12499.pdf) · [`codeplan-2309.12499.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codeplan-2309.12499.txt)
- [In Line with Context: Repository-Level Code Generation via Context Inlining](https://arxiv.org/abs/2601.00376) — [`inlinecoder-context-inlining-2601.00376.pdf`](../../presentations/write-code-ai-agents-love/research/papers/inlinecoder-context-inlining-2601.00376.pdf) · [`inlinecoder-context-inlining-2601.00376.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/inlinecoder-context-inlining-2601.00376.txt)
- [RACE-bench](https://arxiv.org/abs/2603.26337) — [`race-bench-feature-addition-2603.26337.pdf`](../../presentations/write-code-ai-agents-love/research/papers/race-bench-feature-addition-2603.26337.pdf) · [`race-bench-feature-addition-2603.26337.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/race-bench-feature-addition-2603.26337.txt)
- [Constraint Decay](https://arxiv.org/abs/2605.06445) — [`constraint-decay-2605.06445.pdf`](../../presentations/write-code-ai-agents-love/research/papers/constraint-decay-2605.06445.pdf) · [`constraint-decay-2605.06445.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/constraint-decay-2605.06445.txt)
- [FEA-Bench](https://arxiv.org/abs/2503.06680) — [`fea-bench-2503.06680.pdf`](../../presentations/write-code-ai-agents-love/research/papers/fea-bench-2503.06680.pdf) · [`fea-bench-2503.06680.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/fea-bench-2503.06680.txt)

Plot data: [`feature_constraints_planning.csv`](../../presentations/write-code-ai-agents-love/research/data/feature_constraints_planning.csv)

### Domain vocabulary

**Insights:** [INSIGHT_13](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md)

**Papers**

- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) — [`naming-affects-llms-code-analysis-2307.12488.pdf`](../../presentations/write-code-ai-agents-love/research/papers/naming-affects-llms-code-analysis-2307.12488.pdf) · [`naming-affects-llms-code-analysis-2307.12488.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt)
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — [`when-names-disappear-2510.03178.pdf`](../../presentations/write-code-ai-agents-love/research/papers/when-names-disappear-2510.03178.pdf) · [`when-names-disappear-2510.03178.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt)

### Patterns

**Insights:** [INSIGHT_07](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md) · [INSIGHT_15](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_15_modularity_is_not_magic_boundaries_are.md) · [INSIGHT_18](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_18_custom_lint_rules_are_executable_architecture.md) · [INSIGHT_25](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_25_agentic_prs_have_a_different_shape.md)

**Papers**

- [Agentless](https://arxiv.org/abs/2407.01489) — [`agentless-2407.01489.pdf`](../../presentations/write-code-ai-agents-love/research/papers/agentless-2407.01489.pdf) · [`agentless-2407.01489.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/agentless-2407.01489.txt)
- [Architecture Without Architects](https://arxiv.org/abs/2604.04990) — [`architecture-without-architects-2604.04990.pdf`](../../presentations/write-code-ai-agents-love/research/papers/architecture-without-architects-2604.04990.pdf) · [`architecture-without-architects-2604.04990.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/architecture-without-architects-2604.04990.txt)
- [How AI Coding Agents Modify Code](https://arxiv.org/abs/2601.17581) — [`how-ai-coding-agents-modify-code-2601.17581.pdf`](../../presentations/write-code-ai-agents-love/research/papers/how-ai-coding-agents-modify-code-2601.17581.pdf) · [`how-ai-coding-agents-modify-code-2601.17581.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/how-ai-coding-agents-modify-code-2601.17581.txt)
- [AIDev: The First Comprehensive Dataset of Agentic-PRs](https://arxiv.org/abs/2602.09185) — [`aidev-agentic-prs-2602.09185.pdf`](../../presentations/write-code-ai-agents-love/research/papers/aidev-agentic-prs-2602.09185.pdf) · [`aidev-agentic-prs-2602.09185.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/aidev-agentic-prs-2602.09185.txt)
- [CODETASTE](https://arxiv.org/abs/2603.04177) — [`codetaste-2603.04177.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codetaste-2603.04177.pdf) · [`codetaste-2603.04177.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codetaste-2603.04177.txt)

Plot data: [`agentic_pr_change_shape.csv`](../../presentations/write-code-ai-agents-love/research/data/agentic_pr_change_shape.csv)

**Practitioner**

- [Aider coding conventions](https://aider.chat/docs/usage/conventions.html) — [`aider-coding-conventions.html`](../../presentations/write-code-ai-agents-love/research/articles/aider-coding-conventions.html)
- [Agentic Coding Principles and Practices](https://agentic-coding.github.io/) — [`agentic-coding-principles.html`](../../presentations/write-code-ai-agents-love/research/articles/agentic-coding-principles.html)

## The Tools

### Graphs retrivers

**Insights:** [INSIGHT_01](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_01_context_maps.md) · [INSIGHT_21](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md) · [INSIGHT_12](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md)

**Papers**

- [RepoGraph](https://arxiv.org/abs/2410.14684) — [`repograph-2410.14684.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repograph-2410.14684.pdf) · [`repograph-2410.14684.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt)
- [Repository Intelligence Graph](https://arxiv.org/abs/2601.10112) — [`repository-intelligence-graph-2601.10112.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repository-intelligence-graph-2601.10112.pdf) · [`repository-intelligence-graph-2601.10112.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repository-intelligence-graph-2601.10112.txt)
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — [`graphcodeagent-2504.10046.pdf`](../../presentations/write-code-ai-agents-love/research/papers/graphcodeagent-2504.10046.pdf) · [`graphcodeagent-2504.10046.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt)
- [RepoScope](https://arxiv.org/abs/2507.14791) — [`reposcope-2507.14791.pdf`](../../presentations/write-code-ai-agents-love/research/papers/reposcope-2507.14791.pdf) · [`reposcope-2507.14791.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/reposcope-2507.14791.txt)
- [Repoformer](https://arxiv.org/abs/2403.10059) — [`repoformer-2403.10059.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repoformer-2403.10059.pdf) · [`repoformer-2403.10059.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repoformer-2403.10059.txt)
- [RepoCoder](https://arxiv.org/abs/2303.12570) — [`repocoder-2303.12570.pdf`](../../presentations/write-code-ai-agents-love/research/papers/repocoder-2303.12570.pdf) · [`repocoder-2303.12570.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/repocoder-2303.12570.txt)

**Practitioner**

- [Aider repo map docs](https://aider.chat/docs/repomap.html) — [`aider-repomap.md`](../../presentations/write-code-ai-agents-love/research/articles/aider-repomap.md)
- [Sourcegraph: How Cody understands your codebase](https://sourcegraph.com/blog/how-cody-understands-your-codebase) — [`sourcegraph-how-cody-understands-codebase.html`](../../presentations/write-code-ai-agents-love/research/articles/sourcegraph-how-cody-understands-codebase.html)

Plot data: [`repository_graph_context.csv`](../../presentations/write-code-ai-agents-love/research/data/repository_graph_context.csv)

### Enforcable patterns

**Insights:** [INSIGHT_18](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_18_custom_lint_rules_are_executable_architecture.md) · [INSIGHT_29](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_29_fact_models_make_static_rules_agent_usable.md) · [INSIGHT_27](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_27_static_diagnostics_are_agent_interfaces.md)

**Papers**

- [A Causal Perspective on Measuring, Explaining and Mitigating Smells](https://arxiv.org/abs/2511.15817) — [`causal-smells-llm-code-2511.15817.pdf`](../../presentations/write-code-ai-agents-love/research/papers/causal-smells-llm-code-2511.15817.pdf) · [`causal-smells-llm-code-2511.15817.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/causal-smells-llm-code-2511.15817.txt)
- [CODETASTE](https://arxiv.org/abs/2603.04177) — [`codetaste-2603.04177.pdf`](../../presentations/write-code-ai-agents-love/research/papers/codetaste-2603.04177.pdf) · [`codetaste-2603.04177.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/codetaste-2603.04177.txt)

**Practitioner**

- [ESLint: Custom rules](https://eslint.org/docs/latest/extend/custom-rules) — [`eslint-custom-rules.html`](../../presentations/write-code-ai-agents-love/research/articles/eslint-custom-rules.html)
- [typescript-eslint: Custom rules](https://typescript-eslint.io/developers/custom-rules/) — [`typescript-eslint-custom-rules.html`](../../presentations/write-code-ai-agents-love/research/articles/typescript-eslint-custom-rules.html)
- [Semgrep: Custom guardrails rules](https://semgrep.dev/docs/secure-guardrails/custom-guardrails-rules) — [`semgrep-custom-guardrails.html`](../../presentations/write-code-ai-agents-love/research/articles/semgrep-custom-guardrails.html)
- [Semgrep: Rule ideas](https://semgrep.dev/docs/writing-rules/rule-ideas) — [`semgrep-rule-ideas.html`](../../presentations/write-code-ai-agents-love/research/articles/semgrep-rule-ideas.html)
- [ast-grep: Lint rule](https://ast-grep.github.io/guide/project/lint-rule.html) — [`ast-grep-lint-rule.html`](../../presentations/write-code-ai-agents-love/research/articles/ast-grep-lint-rule.html)
- [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — [`nx-enforce-module-boundaries.html`](../../presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html)
- [polint README](https://github.com/emilwareus/polint) — [`polint-readme.md`](../../presentations/write-code-ai-agents-love/research/articles/polint-readme.md)
- [polint Agent Playbook](https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md) — [`polint-agent-playbook.md`](../../presentations/write-code-ai-agents-love/research/articles/polint-agent-playbook.md)
- [polint Ignore Comments](https://github.com/emilwareus/polint/blob/main/docs/IGNORE-COMMENTS.md) — [`polint-ignore-comments.md`](../../presentations/write-code-ai-agents-love/research/articles/polint-ignore-comments.md)

Case study: [`polint-plint-case-study.md`](../../presentations/write-code-ai-agents-love/research/notes/polint-plint-case-study.md)

### Feedback tools (lint tests etc)

**Insights:** [INSIGHT_04](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md) · [INSIGHT_17](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_17_quality_gates_must_cover_smells.md) · [INSIGHT_27](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_27_static_diagnostics_are_agent_interfaces.md) · [INSIGHT_28](../../presentations/write-code-ai-agents-love/research/insights/INSIGHT_28_static_oracles_catch_what_tests_miss.md)

**Papers**

- [SWE-bench](https://arxiv.org/abs/2310.06770) — [`swe-bench-2310.06770.pdf`](../../presentations/write-code-ai-agents-love/research/papers/swe-bench-2310.06770.pdf) · [`swe-bench-2310.06770.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt)
- [SWE-CI](https://arxiv.org/abs/2603.03823) — [`swe-ci-2603.03823.pdf`](../../presentations/write-code-ai-agents-love/research/papers/swe-ci-2603.03823.pdf) · [`swe-ci-2603.03823.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/swe-ci-2603.03823.txt)
- [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) — [`rethinking-agent-generated-tests-2602.07900.pdf`](../../presentations/write-code-ai-agents-love/research/papers/rethinking-agent-generated-tests-2602.07900.pdf) · [`rethinking-agent-generated-tests-2602.07900.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/rethinking-agent-generated-tests-2602.07900.txt)
- [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) — [`smells-llm-generated-code-2510.03029.pdf`](../../presentations/write-code-ai-agents-love/research/papers/smells-llm-generated-code-2510.03029.pdf) · [`smells-llm-generated-code-2510.03029.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/smells-llm-generated-code-2510.03029.txt)
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — [`needle-in-the-repo-2603.27745.pdf`](../../presentations/write-code-ai-agents-love/research/papers/needle-in-the-repo-2603.27745.pdf) · [`needle-in-the-repo-2603.27745.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt)
- [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) — [`type-constrained-codegen-2504.09246.pdf`](../../presentations/write-code-ai-agents-love/research/papers/type-constrained-codegen-2504.09246.pdf) · [`type-constrained-codegen-2504.09246.txt`](../../presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt)

**Practitioner**

- [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) — [`anthropic-claude-code-best-practices.html`](../../presentations/write-code-ai-agents-love/research/articles/anthropic-claude-code-best-practices.html)
- [Windsurf Cascade docs](https://docs.windsurf.com/windsurf/cascade) — [`windsurf-cascade-docs.html`](../../presentations/write-code-ai-agents-love/research/articles/windsurf-cascade-docs.html)
- [polint Agent Playbook](https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md) — [`polint-agent-playbook.md`](../../presentations/write-code-ai-agents-love/research/articles/polint-agent-playbook.md)

Plot data: [`context_instruction_cost.csv`](../../presentations/write-code-ai-agents-love/research/data/context_instruction_cost.csv)
