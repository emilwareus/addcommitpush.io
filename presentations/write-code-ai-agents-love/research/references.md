# References: Write Code AI Agents Love

Research folder for the talk and blog article about structuring codebases so AI coding agents perform better.

## Local Corpus

- `papers/` - downloaded PDFs from arXiv, ICLR, and other primary sources.
- `paper-text/` - extracted text from PDFs for search and synthesis.
- `articles/` - downloaded HTML/Markdown from official docs and practitioner sources.
- `insights/` - focused notes for claims that need deeper treatment.
- `notes/` - working memos from research tracks.

## Core Research Papers

### Repository-level benchmarks

| ID | Source | Date | Local file | Why it matters |
|---|---:|---:|---|---|
| R01 | [SWE-bench: Can Language Models Resolve Real-world GitHub Issues?](https://arxiv.org/abs/2310.06770) | 2023-10, rev. 2024-11 | `papers/swe-bench-2310.06770.pdf` | Established issue-to-patch evaluation on real repositories. |
| R02 | [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793) | 2024-05, rev. 2024-11 | `papers/swe-agent-2405.15793.pdf` | Shows agent-tool interface design changes repository task performance. |
| R03 | [RepoBench: Benchmarking Repository-Level Code Auto-Completion Systems](https://arxiv.org/abs/2306.03091) | 2023-06, rev. 2023-10 | `papers/repobench-2306.03091.pdf` | Separates retrieval, completion, and end-to-end repository completion. |
| R04 | [Long Code Arena: a Set of Benchmarks for Long-Context Code Models](https://arxiv.org/abs/2406.11612) | 2024-06 | `papers/long-code-arena-2406.11612.pdf` | Covers CI repair, project-level completion, bug localization, and summarization. |
| R05 | [Multi-SWE-bench: A Multilingual Benchmark for Issue Resolving](https://arxiv.org/abs/2504.02605) | 2025-04 | `papers/multi-swe-bench-2504.02605.pdf` | Extends issue resolving beyond Python into multiple ecosystems. |
| R06 | [SWE-bench Goes Live!](https://arxiv.org/abs/2505.23419) | 2025-05, rev. 2025-06 | `papers/swe-bench-live-2505.23419.pdf` | Addresses benchmark freshness and contamination. |
| R07 | [SWE-rebench](https://arxiv.org/abs/2505.20411) | 2025-05, rev. 2025-11 | `papers/swe-rebench-2505.20411.pdf` | Automated pipeline for fresh, decontaminated agent tasks. |
| R08 | [FEA-Bench](https://arxiv.org/abs/2503.06680) | 2025-03, rev. 2025-06 | `papers/fea-bench-2503.06680.pdf` | Evaluates feature implementation across a repository, not just bug fixing. |
| R09 | [SWE-CI](https://arxiv.org/abs/2603.03823) | 2026-03, rev. 2026-04 | `papers/swe-ci-2603.03823.pdf` | Shifts evaluation from one-shot correctness to long-term maintainability through CI loops. |

### Context retrieval and repository maps

| ID | Source | Date | Local file | Why it matters |
|---|---:|---:|---|---|
| R29 | [CodeBERT](https://arxiv.org/abs/2002.08155) | 2020-02 | `papers/codebert-2002.08155.pdf` | Foundational NL+code representation work; supports descriptive names/docs as retrieval signals. |
| R30 | [GraphCodeBERT](https://arxiv.org/abs/2009.08366) | 2020-09 | `papers/graphcodebert-2009.08366.pdf` | Adds data-flow structure to code representation. |
| R31 | [RepoCoder](https://arxiv.org/abs/2303.12570) | 2023-03 | `papers/repocoder-2303.12570.pdf` | Iterative retrieval for repository-level code completion. |
| R32 | [Lost in the Middle](https://arxiv.org/abs/2307.03172) | 2023-07 | `papers/lost-in-the-middle-2307.03172.pdf` | Long context can still miss relevant facts depending on placement. |
| R10 | [ContextBench: A Benchmark for Context Retrieval in Coding Agents](https://arxiv.org/abs/2602.05892) | 2026-02 | `papers/contextbench-2602.05892.pdf` | Measures whether agents retrieve and use the code context needed for issue resolution. |
| R11 | [SWE Context Bench](https://arxiv.org/abs/2602.08316) | 2026-02, rev. 2026-05 | `papers/swe-contextbench-2602.08316.pdf` | Evaluates context learning and experience reuse for coding agents. |
| R12 | [RepoGraph](https://arxiv.org/abs/2410.14684) | 2024-10, ICLR 2025 | `papers/repograph-2410.14684.pdf` | Adds repository-level code graphs for software engineering agents. |
| R13 | [Repository Intelligence Graph](https://arxiv.org/abs/2601.10112) | 2026-01 | `papers/repository-intelligence-graph-2601.10112.pdf` | Deterministic architectural map for build/test/dependency structure. |
| R14 | [AI-assisted Coding with Cody](https://arxiv.org/abs/2408.05344) | 2024-08 | `papers/cody-context-retrieval-2408.05344.pdf` | Sourcegraph lessons on retrieval and evaluation for code recommendations. |
| R15 | [Codified Context](https://arxiv.org/abs/2602.20478) | 2026-02 | `papers/codified-context-2602.20478.pdf` | Case study of persistent hot/cold context infrastructure in a large codebase. |
| R16 | [CodePlan](https://arxiv.org/abs/2309.12499) | 2023-09 | `papers/codeplan-2309.12499.pdf` | Shows repository tasks need planning over code dependencies and multi-file structure. |
| R33 | [Repoformer](https://arxiv.org/abs/2403.10059) | 2024-03 | `papers/repoformer-2403.10059.pdf` | Selective retrieval for repository context. |
| R34 | [RepoExec](https://arxiv.org/abs/2406.11927) | 2024-06 | `papers/repoexec-2406.11927.pdf` | Studies how repository context affects executability and dependency use. |
| R35 | [What to Retrieve for Effective Retrieval-Augmented Code Generation?](https://arxiv.org/abs/2503.20589) | 2025-03 | `papers/what-to-retrieve-racg-2503.20589.pdf` | Distinguishes useful API/in-context code from noisy similar code. |
| R36 | [YABLoCo](https://arxiv.org/abs/2505.04406) | 2025-05 | `papers/yabloco-2505.04406.pdf` | Long-context generation over very large C/C++ repositories. |
| R37 | [LongCodeBench](https://arxiv.org/abs/2505.07897) | 2025-05 | `papers/longcodebench-2505.07897.pdf` | Tests code QA/bug fixing up to million-token scale. |
| R38 | [RepoScope](https://arxiv.org/abs/2507.14791) | 2025-07 | `papers/reposcope-2507.14791.pdf` | Call-chain-aware, multi-view repository context. |
| R39 | [RepoRepair](https://arxiv.org/abs/2603.01048) | 2026-03 | `papers/reporepair-2603.01048.pdf` | Hierarchical file/function documentation for repair/localization. |
| R40 | [Coding Agents are Effective Long-Context Processors](https://arxiv.org/abs/2603.20432) | 2026-03 | `papers/coding-agents-long-context-processors-2603.20432.pdf` | Tools/filesystems can beat raw long-context baselines. |

### Agent instructions and configuration

| ID | Source | Date | Local file | Why it matters |
|---|---:|---:|---|---|
| R17 | [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/abs/2601.20404) | 2026-01, rev. 2026-03 | `papers/agents-md-impact-2601.20404.pdf` | Paired study: AGENTS.md reduced median runtime and output tokens. |
| R18 | [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) | 2026-02 | `papers/evaluating-agents-md-2602.11988.pdf` | Counterexample: context files can reduce success and increase cost when they add noise. |
| R19 | [Decoding the Configuration of AI Coding Agents](https://arxiv.org/abs/2511.09268) | 2025-11 | `papers/claude-code-configs-2511.09268.pdf` | Empirical study of 328 Claude Code config files and what developers encode. |
| R20 | [Dive into Claude Code](https://arxiv.org/abs/2604.14228) | 2026-04 | `papers/dive-into-claude-code-2604.14228.pdf` | Architecture/design-space study of an agentic coding tool. |
| R21 | [SWE-Skills-Bench](https://arxiv.org/abs/2603.15401) | 2026-03 | `papers/swe-skills-bench-2603.15401.pdf` | Tests whether packaged agent skills help real-world software engineering tasks. |
| R22 | [ABTest](https://arxiv.org/abs/2604.03362) | 2026-04 | `papers/abtest-agent-anomalies-2604.03362.pdf` | Behavior-driven testing for coding-agent anomalies. |
| R41 | [FixedBench / Coding Agents Don't Know When to Act](https://arxiv.org/abs/2605.07769) | 2026-05 | `papers/fixedbench-noop-2605.07769.pdf` | Evaluates no-op tasks and unnecessary edits. |

### Agent systems and search strategies

| ID | Source | Date | Local file | Why it matters |
|---|---:|---:|---|---|
| R23 | [Agentless](https://arxiv.org/abs/2407.01489) | 2024-07, rev. 2024-10 | `papers/agentless-2407.01489.pdf` | Strong evidence that simple localize-repair-validate workflows can beat complex agents. |
| R24 | [AutoCodeRover](https://arxiv.org/abs/2404.05427) | 2024-04, rev. 2024-07 | `papers/autocoderover-2404.05427.pdf` | Uses structured search and debugging signals for program improvement. |
| R25 | [SWE-Search](https://proceedings.iclr.cc/paper_files/paper/2025/file/a1e6783e4d739196cad3336f12d402bf-Paper-Conference.pdf) | ICLR 2025 | `papers/swe-search-iclr-2025.pdf` | Adds MCTS and iterative refinement for repository-level agent work. |
| R26 | [Diversity Empowers Intelligence](https://proceedings.iclr.cc/paper_files/paper/2025/file/d7b50b8ac2c781a12f26155f48310d8d-Paper-Conference.pdf) | ICLR 2025 | `papers/swe-agent-aci-iclr-2025.pdf` | Studies integrating expertise across software engineering agents. |

### Setup and reproducibility

| ID | Source | Date | Local file | Why it matters |
|---|---:|---:|---|---|
| R27 | [Beyond pip install](https://arxiv.org/abs/2412.06294) | 2024-12 | `papers/installamatic-2412.06294.pdf` | Shows repository installation remains a hard agent task. |
| R28 | [SetupBench](https://arxiv.org/abs/2507.09063) | 2025-07 | `papers/setupbench-2507.09063.pdf` | Evaluates agents bootstrapping development environments from scratch. |

### Docs, examples, typing, and task specs

| ID | Source | Date | Local file | Why it matters |
|---|---:|---:|---|---|
| R42 | [DocPrompting](https://arxiv.org/abs/2207.05987) | 2022-07 | `papers/docprompting-2207.05987.pdf` | Retrieving relevant docs improves code generation. |
| R43 | [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) | 2025-04 | `papers/type-constrained-codegen-2504.09246.pdf` | Type constraints reduce compilation errors and improve functional correctness. |
| R44 | [FeatureBench](https://arxiv.org/abs/2602.10975) | 2026-02 | `papers/featurebench-2602.10975.pdf` | Shows repository-scale feature work remains much harder than bug patching. |
| R45 | [RepoMod-Bench](https://arxiv.org/abs/2602.22518) | 2026-02 | `papers/repomod-bench-2602.22518.pdf` | Modernization benchmark; quantifies scaling failures with repo size. |
| R46 | [Needle in the Repo](https://arxiv.org/abs/2603.27745) | 2026-03 | `papers/needle-in-the-repo-2603.27745.pdf` | Separates functional correctness from structural maintainability. |

### Code patterns, boundaries, and dependency visibility

| ID | Source | Date | Local file | Why it matters |
|---|---:|---:|---|---|
| R47 | [CodeChain: Modular Code Generation Through Self-revisions](https://arxiv.org/abs/2310.08992) | 2023-10 | `papers/codechain-modular-codegen-2310.08992.pdf` | Modular decomposition plus verified submodules improved pass@1 on competitive programming tasks. |
| R48 | [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) | 2024-07, EMNLP 2024 | `papers/revisiting-modularity-codegen-2407.11406.pdf` | Counter-evidence: modularity score had no clear positive correlation with LLM generation quality. |
| R49 | [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763) | 2026-05 | `papers/chunking-rag-code-completion-2605.04763.pdf` | Function-level chunks underperformed; cross-file context budget mattered more than isolated small chunks. |
| R50 | [CodeT5: Identifier-aware Unified Pre-trained Encoder-Decoder Models](https://arxiv.org/abs/2109.00859) | 2021-09 | `papers/codet5-identifier-aware-2109.00859.pdf` | Identifiers carry rich code semantics; identifier-aware training improves code understanding/generation. |
| R51 | [ToolGen: Teaching Code LLMs to Use Autocompletion Tools](https://arxiv.org/abs/2401.06391) | 2024-01 | `papers/toolgen-autocomplete-repo-codegen-2401.06391.pdf` | Repository code generation fails on dependency errors; visible accessible symbols reduce undefined/no-member errors. |
| R52 | [RAR: Retrieval Augmented Retrieval for Code Generation](https://www.microsoft.com/en-us/research/uploads/prod/2024/12/RAR.pdf) | 2024 | `papers/rar-retrieval-augmented-retrieval-2024.pdf` | Examples and API/grammar documentation are complementary context sources. |
| R53 | [GraphCodeAgent: Dual Graph-Guided LLM Agent](https://arxiv.org/abs/2504.10046) | 2025-04, rev. 2025-11 | `papers/graphcodeagent-2504.10046.pdf` | Requirement graph plus structural-semantic code graph improves repo-level generation, especially cross-file tasks. |
| R54 | [CodeGRAG: Graphical Retrieval Augmented Code Generation](https://arxiv.org/abs/2405.02355) | 2024-05 | `papers/codegrag-2405.02355.pdf` | AST/control-flow/data-flow graphs bridge natural-language and code structure. |
| R55 | [In Line with Context: Repository-Level Code Generation via Context Inlining](https://arxiv.org/abs/2601.00376) | 2026-01 | `papers/inlinecoder-context-inlining-2601.00376.pdf` | Call graph inlining uses callers and callees to supply dependency-aware context. |
| R56 | [SLICE: Semantic Language-Indexed Code Extraction with Backward Slicing](https://neurips.cc/virtual/2025/131928) | NeurIPS 2025 | not downloaded; abstract indexed | Backward slicing retrieves relevant code plus dependencies, improving over no-retrieval and BM25 baselines. |
| R57 | [Architecture Without Architects](https://arxiv.org/abs/2604.04990) | 2026-04 | `papers/architecture-without-architects-2604.04990.pdf` | AI agents make architectural decisions implicitly; prompts and repo constraints become architecture artifacts. |
| R58 | [SENAI: Software Engineering Native Generative AI](https://arxiv.org/abs/2503.15282) | 2025-03 | `papers/senai-se-native-genai-2503.15282.pdf` | Frames GenAI-native software engineering around machine-consumable artifacts and processes. |
| R59 | [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) | 2025-10 | `papers/smells-llm-generated-code-2510.03029.pdf` | LLM-generated code showed substantially more design/implementation smells than professional references. |
| R60 | [A Causal Perspective on Measuring, Explaining and Mitigating Smells](https://arxiv.org/abs/2511.15817) | 2025-11 | `papers/causal-smells-llm-code-2511.15817.pdf` | Static-analysis smell measures and prompt guidance can reduce smell propensity beyond functional tests. |
| R61 | [The Modular Imperative: Rethinking LLMs for Maintainable Software](https://namin.seas.harvard.edu/pubs/lmpl-modularity.pdf) | 2025 | `papers/modular-imperative-lmpl-2025.pdf` | Argues for constraining/guiding/validating LLM code generation through modular design practices. |
| R62 | [CrossCodeEval](https://arxiv.org/abs/2310.11248) | 2023-10 | `papers/crosscodeeval-2310.11248.pdf` | Cross-file code completion benchmark; retrieved cross-file context materially improved exact match. |
| R63 | [CatCoder: Repository-Level Code Generation with Code and Type Context](https://arxiv.org/abs/2406.03283) | 2024-06 | `papers/catcoder-2406.03283.pdf` | Type context and retrieved code context improve Java/Rust repository generation. |
| R64 | [A3-CodGen](https://arxiv.org/abs/2312.05772) | 2023-12, rev. 2024 | `papers/a3-codgen-2312.05772.pdf` | Local/global/third-party-library-aware retrieval; too much global context can hurt. |
| R65 | [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) | 2023-07 | `papers/naming-affects-llms-code-analysis-2307.12488.pdf` | Nonsense and misleading names significantly degrade LLM code-analysis performance. |
| R66 | [When Names Disappear](https://arxiv.org/abs/2510.03178) | 2025-10 | `papers/when-names-disappear-2510.03178.pdf` | Semantics-preserving obfuscation shows LLMs rely heavily on naming cues for intent and even execution tasks. |
| R67 | [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) | 2026-02 | `papers/rethinking-agent-generated-tests-2602.07900.pdf` | Counter-evidence that simply making agents write more tests reliably improves patch success. |

## Official Docs and Practitioner Sources

| ID | Source | Local file | Useful claim |
|---|---|---|---|
| D01 | [OpenAI: Introducing Codex](https://openai.com/index/introducing-codex/) | 403 via curl, indexed in notes | Codex can be guided by AGENTS.md and iteratively run tests. |
| D02 | [OpenAI: Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/) | 403 via curl, indexed in notes | Agent loop design, instructions, tools, and state. |
| D03 | [OpenAI Codex CLI Help](https://help.openai.com/en/articles/11096431) | indexed in notes | Codex reads/edits/runs code locally under approval modes. |
| D04 | [OpenAI Codex repo AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md) | `articles/openai-codex-repo-agents-md.md` | Real agent-facing instructions from the Codex repository. |
| D05 | [Anthropic: Claude Code best practices](https://code.claude.com/docs/en/best-practices) | `articles/anthropic-claude-code-best-practices.html` | Context windows fill quickly; CLAUDE.md and verification workflows matter. |
| D06 | [GitHub Copilot coding agent best practices](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks) | `articles/github-copilot-coding-agent-best-practices.html` | Repository-wide and path-specific instructions for Copilot. |
| D07 | [Cursor rules for AI](https://docs.cursor.com/context/rules-for-ai) | `articles/cursor-rules-for-ai.html` | Rule files are injected into model context and can be scoped. |
| D08 | [Aider coding conventions](https://aider.chat/docs/usage/conventions.html) | `articles/aider-coding-conventions.html` | Codifies project conventions for an AI pair-programming workflow. |
| D09 | [Aider repo map docs](https://aider.chat/docs/repomap.html) | `articles/aider-repomap.md` | Repository maps help agents work in larger codebases. |
| D10 | [Sourcegraph: How Cody understands your codebase](https://sourcegraph.com/blog/how-cody-understands-your-codebase) | `articles/sourcegraph-how-cody-understands-codebase.html` | Codebase context requires search and code intelligence, not raw prompt stuffing. |
| D11 | [Sourcegraph: Toward infinite context for code](https://sourcegraph.com/blog/towards-infinite-context-for-code) | `articles/sourcegraph-toward-infinite-context.html` | Code search and code graph as a context layer for large codebases. |
| D12 | [Windsurf Cascade docs](https://docs.windsurf.com/windsurf/cascade) | `articles/windsurf-cascade-docs.html` | Agent mode, tools, terminal, linter integration, and checkpoints. |
| D13 | [ESLint: Custom Rules](https://eslint.org/docs/latest/extend/custom-rules) | `articles/eslint-custom-rules.html` | ESLint supports project-specific rules when core rules do not cover the use case. |
| D14 | [typescript-eslint: Custom Rules](https://typescript-eslint.io/developers/custom-rules/) | `articles/typescript-eslint-custom-rules.html` | Type-aware custom rules can use the TypeScript checker for richer project constraints. |
| D15 | [Semgrep: Custom Guardrails Rules](https://semgrep.dev/docs/secure-guardrails/custom-guardrails-rules) | `articles/semgrep-custom-guardrails.html` | Custom rules can enforce organization-specific secure coding conventions in IDE, PR, and pre-commit flows. |
| D16 | [Semgrep: Rule Ideas](https://semgrep.dev/docs/writing-rules/rule-ideas) | `articles/semgrep-rule-ideas.html` | Written guidelines can be converted into Semgrep rules for authentication, validation, and other house patterns. |
| D17 | [ast-grep: Lint Rule](https://ast-grep.github.io/guide/project/lint-rule.html) | `articles/ast-grep-lint-rule.html` | AST-pattern rules can find, report, and auto-fix codebase-specific issues across file globs. |
| D18 | [Nx: Enforce Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries) | `articles/nx-enforce-module-boundaries.html` | Monorepo architecture boundaries can be encoded as tags and enforced automatically. |
| D19 | [Google Research: Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/) | `articles/google-monorepo.html` | A large monorepo can act as a common source of truth, but requires specialized tooling and workflows. |
| D20 | [Code Simplicity: What is a Monorepo, Really?](https://www.codesimplicity.com/post/what-is-a-monorepo-really/) | `articles/code-simplicity-monorepo.html` | Separates monorepo benefits into atomic commits, universal hierarchy, one-version rule, and tooling concerns. |
| D21 | [Write the Docs: Docs as Code](https://www.writethedocs.org/guide/docs-as-code.html) | `articles/write-the-docs-docs-as-code.html` | Documentation should use the same version-control, review, and CI workflows as code. |
| D22 | [GitLab: Infrastructure as Code and GitOps](https://about.gitlab.com/topics/gitops/gitlab-enables-infrastructure-as-code/) | `articles/gitlab-iac-gitops.html` | Git repositories can be the source of truth for infrastructure and application deployment code. |
| D23 | [Spacelift: Terraform Monorepo](https://spacelift.io/blog/terraform-monorepo) | `articles/spacelift-terraform-monorepo.html` | Terraform monorepos centralize infrastructure code but change module versioning and operational tradeoffs. |
| D24 | [Dropbox: Reducing Our Monorepo Size](https://dropbox.tech/infrastructure/reducing-our-monorepo-size-to-improve-developer-velocity) | `articles/dropbox-monorepo-size.html` | Monorepo size can harm clone, CI, and developer velocity without active tooling/investment. |
| D25 | [OpenAPI Generator](https://openapi-generator.tech/index.html) | `articles/openapi-generator.html` | OpenAPI specs can generate clients, server stubs, and documentation across many languages. |
| D26 | [Microsoft Kiota](https://learn.microsoft.com/en-us/openapi/kiota/) | `articles/microsoft-kiota.html` | Generates API clients for OpenAPI-described APIs with authentication, serialization, and middleware abstractions. |
| D27 | [Orval](https://orval.dev/docs) | `articles/orval-docs.html` | Generates type-safe TypeScript API clients, models, mocks, and query hooks from OpenAPI. |
| D28 | [Speakeasy: Generate SDKs from OpenAPI](https://www.speakeasy.com/docs/sdks/create-client-sdks) | `articles/speakeasy-generate-sdks.html` | Generates idiomatic SDKs with typed models, validation, and multi-language targets from OpenAPI/JSON Schema. |
| D29 | [Stainless TypeScript SDKs](https://www.stainless.com/docs/sdks/typescript/) | `articles/stainless-typescript-sdk.html` | Generates production TypeScript SDKs from OpenAPI specifications. |
| D30 | [FastAPI: Generate Clients](https://fastapi.tiangolo.com/advanced/generate-clients/) | `articles/fastapi-generate-clients.html` | FastAPI's OpenAPI output enables generated, up-to-date SDKs and testing/automation workflows. |
| D31 | [polint README](https://github.com/emilwareus/polint) | `articles/polint-readme.md` | Local case study/tool: repo-owned lint rule code with polint providing SDK, facts, diagnostics, runner, cache, JSON/SARIF, baselines, and CI/agent affordances. |
| D32 | [polint Agent Playbook](https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md) | `articles/polint-agent-playbook.md` | Documents agent-oriented JSON output, focused runs, baselines, ignore cleanup, and prompt patterns for automated remediation loops. |
| D33 | [polint Ignore Comments](https://github.com/emilwareus/polint/blob/main/docs/IGNORE-COMMENTS.md) | `articles/polint-ignore-comments.md` | Shows suppression mechanics and debt inspection, useful for ratcheting custom rules without blocking adoption immediately. |

## High-priority Follow-up Sources

These should be added in the next pass if the talk needs more empirical depth:

- OpenAI, "Introducing SWE-bench Verified" and "Why we no longer evaluate SWE-bench Verified" - benchmark quality and task ambiguity.
- Devin rules and instruction docs - scoped rules, skills, and task contracts.
- Mozilla and Microsoft Research flaky-test studies - test-suite reliability as agent infrastructure.
- Sourcegraph/Amp material after Cody deprecation - modern enterprise context-engine design.
- Recent `AGENTS.md` standardization / Agentic AI Foundation material.
- "What Makes a GitHub Issue Ready for Copilot?" once PDF/source access is stable.
- "How Does Chunking Affect Retrieval-Augmented Code Completion?" for retrieval-unit guidance.
