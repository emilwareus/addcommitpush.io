# Deep Research Agents Timeline

## Comprehensive History from Foundations to Modern Systems

---

## FOUNDATIONAL LAYER (2021-2023)

### Chain-of-Thought Prompting
- **Date:** January 28, 2022
- **Organization:** Google
- **Authors:** Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten Bosma, Brian Ichter, Fei Xia, Ed Chi, Quoc Le, Denny Zhou
- **Paper:** arXiv:2201.11903
- **URL:** https://arxiv.org/abs/2201.11903
- **Key Innovation:** Generating intermediate reasoning steps significantly improves LLM performance on complex reasoning tasks
- **Impact:** Foundational work showing that step-by-step reasoning improves LLM capabilities; became a building block for all subsequent agentic research systems

### ReAct: Reasoning and Acting
- **Date:** October 2022 (Published at ICLR 2023)
- **Organization:** Google Research
- **Authors:** Shunyu Yao and 6 colleagues
- **Paper:** arXiv:2210.03629
- **URL:** https://arxiv.org/abs/2210.03629
- **Key Innovation:** Interleaved reasoning traces and task-specific actions, allowing LLMs to generate both reasoning and actions in an alternating manner
- **How It Works:** Agents gather additional information from external sources (e.g., Wikipedia) and use that to improve reasoning
- **Impact:** First pattern to demonstrate synergy between reasoning and action-taking; enables dynamic interaction with external environments. Foundation for modern research agents

### ToolLLM
- **Date:** July 2023
- **Organization:** Alibaba, Stanford
- **Authors:** Yujia Qin et al.
- **Paper:** arXiv:2307.16789
- **URL:** https://arxiv.org/abs/2307.16789
- **Key Innovation:** Framework for teaching LLMs to master 16,000+ real-world APIs
- **How It Works:** Includes ToolBench instruction-tuning dataset automatically constructed using ChatGPT for tool use
- **Impact:** Systematically catalogs and trains models on massive API ecosystems; enables specialized tool-use capabilities at scale

---

## EARLY RESEARCH AGENT SYSTEMS (2023-2024)

### GPT Researcher
- **Date:** 2023 (Formalized in 2024)
- **Organization:** Open Source Community (Evolved into Tavily)
- **Creator:** Assaf Elovic
- **Repository:** https://github.com/assafelovic/gpt-researcher
- **Documentation:** https://docs.gptr.dev/docs/gpt-researcher/getting-started/introduction
- **Key Innovation:** Multi-agent architecture with "planner" and "execution" agents
- **How It Works:**
  1. Planner generates research questions
  2. Execution agents search for related information based on each question
  3. Planner aggregates results into a comprehensive report
- **Performance:** Generates 5-6 page reports in ~3 minutes for ~$0.005
- **Impact:** Early open-source deep research agent; modular design allowing custom LLMs and search engines

### STORM: Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking
- **Date:** February 22, 2024 (arXiv v1), April 8, 2024 (v2)
- **Organization:** Stanford University (OVAL Lab)
- **Authors:** Yijia Shao, Yucheng Jiang, Theodore A Kanell, Peter Xu, Omar Khattab, Monica Lam
- **Conference:** NAACL 2024
- **Paper:** arXiv:2402.14207
- **URLs:**
  - Paper: https://arxiv.org/abs/2402.14207
  - Project: https://storm-project.stanford.edu/research/storm/
  - GitHub: https://github.com/stanford-oval/storm
- **Key Innovation:** Multi-perspective research through simulated conversations with retrieval-augmented question-answering
- **How It Works:**
  1. **DISCOVER:** Survey related topics, generate 3-6 expert perspectives
  2. **CONVERSE:** Parallel WikiWriter↔TopicExpert dialogues
  3. **ANALYZE:** Extract facts, detect contradictions, fill gaps
  4. **SYNTHESIZE:** Two-phase outline → final report with citations
- **Performance:** 25% improvement in organization and 10% improvement in coverage vs. outline-driven baselines
- **Impact:** Focuses on multi-perspective research and outline generation; emphasizes diverse viewpoint synthesis

---

## COMMERCIAL RESEARCH AGENTS (2024-2025)

### OpenAI Deep Research
- **Date:** February 2-3, 2025
- **Organization:** OpenAI
- **Announcement:** https://openai.com/index/introducing-deep-research/
- **Key Innovation:** Autonomous research mode integrated into ChatGPT
- **How It Works:** Conducts multi-turn informational research through dynamic planning and retrieval. Generates comprehensive analytical reports grounded in web-based evidence
- **Impact:** Integrated into ChatGPT Pro/Plus; industry-standard benchmark for deep research performance; initial focus on enterprise-grade analysis

### Perplexity Deep Research
- **Date:** 2024-2025
- **Organization:** Perplexity AI
- **Availability:** Part of Perplexity Pro
- **URL:** https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research
- **Key Innovation:** Test-time compute (TTC) architecture
- **How It Works:**
  1. Planning agent creates step-by-step research guide
  2. Search queries generated and executed for each step
  3. Results flow between sequential steps
  4. Uses "test time compute" expansion framework mimicking human cognitive processes
- **Performance:** 2-4 minute execution time
- **Impact:** TTC architecture enabling systematic exploration of complex topics; combines search and coding capabilities

### Tavily Research Agent
- **Date:** 2024-2025
- **Organization:** Tavily (Spun out of GPT Researcher)
- **Funding:** Series A $20M (2025), Total $25M
- **URL:** https://www.tavily.com/
- **Key Innovation:** Enterprise-grade web search layer for AI agents
- **How It Works:** Supplies fast, real-time web data through agent-first APIs. Developed "Company Researcher" tool using LangGraph workflow with Tavily Search and Extract
- **Performance:** #1 ranking on DeepResearch Bench
- **Impact:** Optimized for RAG purposes; Fast and Ultra Fast search depths minimizing latency

### Google Deep Researcher with Test-Time Diffusion (TTD-DR)
- **Date:** July 2025
- **Organization:** Google DeepMind / Google Research
- **Model:** Gemini 2.5 Pro
- **Paper:** arXiv:2507.16075
- **URLs:**
  - Blog: https://research.google/blog/deep-researcher-with-test-time-diffusion/
  - Paper: https://arxiv.org/html/2507.16075v1
- **Key Innovation:** Models research report writing as a diffusion process
- **How It Works:** Messy first drafts are gradually polished into high-quality final versions through:
  1. Component-wise optimization via self-evolution
  2. Report-level refinement via denoising with retrieval
- **Performance:** 74.5% win rate vs. OpenAI DR; outperforms by 7.7% on one dataset, 1.7% on another
- **Impact:** First to model report generation as diffusion process; novel approach treating research as iterative refinement rather than linear pipeline

### Atlassian Rovo Deep Research v2
- **Date:** 2025
- **Organization:** Atlassian
- **URLs:**
  - Blog: https://www.atlassian.com/blog/artificial-intelligence/rovo-deep-research-v2
  - Product: https://www.atlassian.com/software/rovo
- **Key Innovation:** Orchestrated agent architecture with organizational knowledge integration
- **How It Works:**
  1. Clarifies brief with targeted questions
  2. Proposes structured plan for user approval/editing
  3. Executes research across internal knowledge and public web
  4. Synthesizes cited executive-ready reports
- **Impact:** Focuses on organizational knowledge integration across Atlassian and connected SaaS apps; emphasizes user control through interactive planning stage

---

## ADVANCED MULTI-AGENT ARCHITECTURES (2025)

### Skywork DeepResearchAgent / AgentOrchestra
- **Date:** 2025
- **Organization:** Skywork AI, Nanyang Technological University
- **Authors:** Skywork AI Research Team
- **GitHub:** https://github.com/SkyworkAI/DeepResearchAgent
- **Paper:** https://arxiv.org/html/2506.12508v1 (AgentOrchestra)
- **Key Innovation:** Hierarchical multi-agent system with top-level planning agent
- **How It Works:**
  - Top-level planning agent coordinates specialized lower-level agents
  - Agents include: Deep Analyzer, Deep Researcher, Browser Use Agent, MCP Manager
  - Breaks tasks into sub-tasks, assigns to agents, dynamically coordinates collaboration
- **Performance:**
  - 83.39 average test performance
  - 93.55 on Level 1
  - 83.02 on Level 2
  - 65.31 on Level 3
  - Outperforms on SimpleQA, GAIA, HLE benchmarks
- **Impact:** Hierarchical orchestration paradigm; dynamic task decomposition; excels at complex reasoning requiring external tools

---

## ARCHITECTURAL PATTERN: Plan-Research-Report

This pattern emerged across multiple implementations as a standard approach:

### Core Pattern Flow:
1. **Planning Phase:** LLM breaks user objective into 3-7 crisp, self-contained sub-questions; assigns to specialized agents
2. **Research/Execution Phase:** Source Finder agent with web search tool returns high-signal links with titles, URLs, summaries, content
3. **Processing Phase:** Summarization agent extracts relevant facts; Reviewer scans coverage and flags gaps; proposes new questions if needed
4. **Report Generation:** Professional Research Writer synthesizes structured, readable report

### Implementations:
- OpenAI Deep Research
- Perplexity Deep Research
- Anthropic's multi-agent research system
- Numerous others

### Key Insight:
This pattern has become the de facto standard for modern research automation because it separates concerns (planning vs. execution vs. synthesis) and enables iterative refinement.

---

## SURVEY PAPERS (2025)

### Deep Research: A Survey of Autonomous Research Agents
- **Date:** August 2025
- **Authors:** Wenlin Zhang et al.
- **Paper:** arXiv:2508.12752
- **URL:** https://arxiv.org/abs/2508.12752
- **Scope:** Systematic overview of deep research pipeline (planning, question developing, web exploration, report generation); comparison with RAG and tool-use systems

### Deep Research Agents: A Systematic Examination And Roadmap
- **Date:** June 2025
- **Paper:** arXiv:2506.18096
- **URL:** https://arxiv.org/abs/2506.18096
- **Scope:** Comprehensive examination of DR agents as new category of autonomous systems; discusses dynamic reasoning, adaptive planning, multi-hop retrieval, tool use, structured report generation; industry implementations

---

## KEY EVOLUTION INSIGHTS

### From Static to Dynamic:
- **Early systems (2021-2023):** Static prompts, hard-coded workflows
- **Recent systems (2024-2025):** Adaptive agentic paradigms, dynamic planning, real-time interaction

### Core Pipeline Standardization:
All modern deep research agents follow variants of: **Plan → Research → Report**

### Architectural Trends:
1. **Modular agents** with specialized roles (searcher, analyzer, writer, reviewer)
2. **Hierarchical coordination** (planning agents managing execution agents)
3. **Iterative refinement** (draft → review → revise → finalize)
4. **Integrated tooling** (web search, code execution, document processing, MCP support)

### Performance Metrics:
- Report generation: 3-10 minutes
- Cost: $0.005-$0.10 per research task
- Win rates: 74.5% (Google TTD-DR vs OpenAI DR)
- Benchmark improvements: 7-10% over baselines
