# References and Sources

## Complete Bibliography for Deep Research Agents Presentation

---

## Academic Papers

### Core Research Papers

#### STORM (Feb 2024)
- **Title:** STORM: Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking
- **Authors:** Yijia Shao, Yucheng Jiang, Theodore A Kanell, Peter Xu, Omar Khattab, Monica Lam
- **Venue:** NAACL 2024
- **arXiv:** 2402.14207
- **URL:** https://arxiv.org/abs/2402.14207
- **Project:** https://storm-project.stanford.edu/research/storm/

#### Deep Researcher with Test-Time Diffusion (Jul 2025)
- **Title:** Deep Researcher with Test-Time Diffusion
- **Organization:** Google DeepMind / Google Research
- **arXiv:** 2507.16075
- **Paper URL:** https://arxiv.org/html/2507.16075v1
- **Blog:** https://research.google/blog/deep-researcher-with-test-time-diffusion/

#### Chain-of-Thought Prompting (Jan 2022)
- **Title:** Chain-of-Thought Prompting Elicits Reasoning in Large Language Models
- **Authors:** Jason Wei, Xuezhi Wang, et al.
- **Organization:** Google
- **arXiv:** 2201.11903
- **URL:** https://arxiv.org/abs/2201.11903

#### ReAct (Oct 2022)
- **Title:** ReAct: Synergizing Reasoning and Acting in Language Models
- **Authors:** Shunyu Yao et al.
- **Organization:** Google Research
- **Venue:** ICLR 2023
- **arXiv:** 2210.03629
- **URL:** https://arxiv.org/abs/2210.03629

#### ToolLLM (Jul 2023)
- **Title:** ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs
- **Authors:** Yujia Qin et al.
- **Organizations:** Alibaba, Stanford
- **arXiv:** 2307.16789
- **URL:** https://arxiv.org/abs/2307.16789

### Survey Papers

#### Deep Research: A Survey of Autonomous Research Agents (Aug 2025)
- **Authors:** Wenlin Zhang et al.
- **arXiv:** 2508.12752
- **URL:** https://arxiv.org/abs/2508.12752

#### Deep Research Agents: A Systematic Examination And Roadmap (Jun 2025)
- **arXiv:** 2506.18096
- **URL:** https://arxiv.org/abs/2506.18096

#### AgentOrchestra (2025)
- **Organization:** Skywork AI
- **URL:** https://arxiv.org/html/2506.12508v1

---

## GitHub Repositories

### Official Implementations

#### STORM (Stanford)
- **URL:** https://github.com/stanford-oval/storm
- **Language:** Python
- **Status:** Active, well-maintained

#### GPT Researcher
- **URL:** https://github.com/assafelovic/gpt-researcher
- **Documentation:** https://docs.gptr.dev/docs/gpt-researcher/getting-started/introduction
- **Language:** Python

#### ThinkDepth.ai Deep Research
- **URL:** https://github.com/thinkdepthai/Deep_Research
- **Language:** Python
- **Note:** Reference implementation for diffusion deep research

#### Skywork DeepResearchAgent
- **URL:** https://github.com/SkyworkAI/DeepResearchAgent
- **Language:** Python

### My Implementation

#### Go Research
- **URL:** https://github.com/emilwareus/addcommitpush.io/tree/main/go-research
- **Language:** Go
- **Features:** STORM, Fast, ThinkDeep (diffusion) architectures
- **Architectures:** /go-research/internal/architectures/

---

## Blog Posts and Articles

### Technical Analysis

#### Google Research Blog
- **Title:** Deep Researcher with Test-Time Diffusion
- **URL:** https://research.google/blog/deep-researcher-with-test-time-diffusion/
- **Date:** July 2025

#### Paichun Lin (ThinkDepth.ai)
- **Title:** Self-Balancing Agentic AI: Test-Time Diffusion and Context Engineering Re-imagined
- **URL:** https://paichunlin.substack.com/p/self-balancing-agentic-ai-test-time

#### My Blog Post
- **Title:** Diffusion Deep Research
- **URL:** https://addcommitpush.io/blog/diffusion-deep-research
- **Repository:** Components in /components/blog-posts/diffusion-deep-research.tsx

### Product Announcements

#### OpenAI
- **Title:** Introducing Deep Research
- **URL:** https://openai.com/index/introducing-deep-research/
- **Date:** February 2025

#### Perplexity AI
- **Title:** Introducing Perplexity Deep Research
- **URL:** https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research

#### Atlassian
- **Title:** Rovo Deep Research v2
- **URL:** https://www.atlassian.com/blog/artificial-intelligence/rovo-deep-research-v2
- **Product:** https://www.atlassian.com/software/rovo

#### Tavily
- **URL:** https://www.tavily.com/
- **Blog:** https://blog.tavily.com/research-en/

---

## Benchmarks and Evaluation

### DeepResearch Bench
- **Leaderboard:** https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard
- **Documentation:** https://deepresearch-bench.github.io/
- **Components:** RACE (report quality), FACT (citation quality)

---

## Foundational Works

### The Bitter Lesson
- **Author:** Richard Sutton
- **Date:** 2019
- **URL:** http://www.incompleteideas.net/IncIdeas/BitterLesson.html
- **Relevance:** Foundational thinking on scaling and compute

---

## Framework Comparisons

### LangGraph vs CrewAI
- **URL:** https://www.zenml.io/blog/langgraph-vs-crewai
- **Relevance:** Multi-agent framework comparison

---

## This Repository

### Key Files for Reference

#### STORM Implementation
- `/go-research/external_code/storm/` - Stanford's Python implementation
- `/go-research/internal/architectures/storm/` - My Go implementation

#### Diffusion Implementation
- `/go-research/external_code/Deep_Research/` - ThinkDepth.ai Python reference
- `/go-research/internal/architectures/think_deep/` - My Go implementation

#### Blog Post Content
- `/components/blog-posts/diffusion-deep-research.tsx` - Full blog post
- `/components/animations/diffusion/` - Infographic components

#### Documentation
- `/go-research/README.md` - Go implementation documentation

---

## Citation Format

For academic-style citations in the presentation:

```
[1] Shao et al. "STORM: Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking." NAACL 2024. arXiv:2402.14207

[2] Google DeepMind. "Deep Researcher with Test-Time Diffusion." July 2025. arXiv:2507.16075

[3] Wei et al. "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." January 2022. arXiv:2201.11903

[4] Yao et al. "ReAct: Synergizing Reasoning and Acting in Language Models." ICLR 2023. arXiv:2210.03629
```

---

## Download/Access Notes

### Papers Available Directly
- All arXiv papers are freely accessible
- Links provided are to official sources

### Implementation Access
- STORM: MIT License, openly available
- GPT Researcher: MIT License, openly available
- ThinkDepth.ai: Open source reference
- My Go implementation: In this repository

### Commercial Products
- OpenAI Deep Research: Requires Pro/Plus subscription
- Perplexity Deep Research: Requires Pro subscription
- Atlassian Rovo: Enterprise product
