Tongyi DeepResearch and its Agentic Family
Overview

Tongyi DeepResearch is an open‑source deep research agent developed by Alibaba’s Tongyi Lab. The agent builds on the ReAct framework, where each step consists of a thought, an action (tool call), and an observation. It introduces innovations in context management, synthetic data generation, agentic continual pre‑training, supervised fine‑tuning, and reinforcement learning to achieve long‑horizon information‑seeking abilities. The model is based on Qwen3‑30B‑A3B—a 30.5‑billion‑parameter LLM where only 3.3 B parameters are activated per token
arxiv.org
. Tongyi DeepResearch is trained end‑to‑end and uses a suite of tools (Search, Visit, Python interpreter, Google Scholar and File parser) accessed via a sandboxed interface
arxiv.org
. The GitHub repository exposes the inference code (react_agent.py), tool implementations and example evaluation scripts.

Alibaba’s WebAgent project provides specialized agents that extend DeepResearch to web traversal and multimodal information seeking. These models include WebWalker, WebDancer, WebSailor, WebShaper and WebWatcher. The repository also contains AgentFounder and AgentScaler, which explore agentic continual pre‑training and environment scaling.

The following sections summarise how each agent is constructed, its training pipeline, and how to reproduce it.

1. Tongyi DeepResearch
1.1 Agent formulation

At each timestep the agent operates over three components
arxiv.org
:

Thought (
Tt
T
t
	​

) – the agent’s internal reasoning, including planning, self‑reflection and memory recall
arxiv.org
.

Action (
At
A
t
	​

) – a tool call or final answer; intermediate actions call tools (Search, Visit, Python Interpreter, Google Scholar, File Parser) while the final action produces an in‑depth report
arxiv.org
.

Observation (
Ot
O
t
	​

) – the tool response used to update the agent’s state
arxiv.org
.

The architecture follows the ReAct framework
arxiv.org
, where the agent iteratively generates interleaved thoughts and actions. After each tool call the observation is appended to the context and used for the next reasoning step. The GitHub inference implementation (react_agent.py) repeatedly calls the model via an OpenAI‑compatible API, parses a <tool_call> tag containing the tool name and arguments, executes the tool, appends the <tool_response> to the context and continues until an <answer> tag is produced. The code also enforces a maximum number of LLM calls, monitors context length and instructs the model to provide an answer when nearing the limit
raw.githubusercontent.com
.

1.2 Context management

Long‑horizon tasks can overflow the context window. Tongyi DeepResearch introduces a context management paradigm where, at each step, the model is conditioned only on a reconstructed workspace: the question, a running report (compressed memory) and the latest thought–action–observation pair
arxiv.org
. This Markovian state reconstruction reduces context length and forces the agent to regularly summarise and prioritise information
arxiv.org
. At inference time the repository supports two modes:

ReAct Mode – the vanilla ReAct loop using full history; good for evaluating intrinsic ability.

Context‑Management (CM) Mode – uses summarisation and dynamic context reconstruction. The heavy mode deploys multiple CM‑agents in parallel and synthesises their reports to obtain better answers, enabling test‑time scaling
arxiv.org
.

1.3 Training pipeline

Tongyi DeepResearch’s training consists of agentic mid‑training and agentic post‑training
arxiv.org
.

Agentic Continual Pre‑Training (mid‑training)

Agentic CPT uses the base model Qwen3‑30B‑A3B and performs two‑stage continual pre‑training with context lengths 32 K and 128 K
arxiv.org
. In the second stage, long sequences of 64 K–128 K agentic behaviour data are introduced
arxiv.org
.

Synthetic data pipeline synthesises questions and complete agent trajectories. The pipeline generates planning actions, reasoning actions, and decision‑making actions
arxiv.org
. Planning data are produced by decomposing questions and predicting the first tool call; reasoning data distil key knowledge from tool returns; decision‑making data reconstruct trajectories as multi‑step decision sequences
arxiv.org
.

General function‑calling data via environment scaling synthesises diverse function‑calling examples by creating heterogeneous simulated environments as read‑write databases
arxiv.org
.

Agentic Post‑Training

The post‑training pipeline further endows the model with research skills:

Supervised fine‑tuning (cold start) – uses high‑quality question–answer trajectories created by open‑source models and applies rejection sampling to retain diverse, high‑quality samples
arxiv.org
. Two data formulations are used: ReAct mode (input full history; output thought and tool call) and Context‑Management mode (input previous summary, tool call and tool response; output new summary, thought and tool call)
arxiv.org
.

Agentic Reinforcement Learning (RL) – uses a reward of 1 if the final answer matches the ground truth and 0 otherwise
arxiv.org
. The environment is split into:

Real‑world environment – uses actual Search, Visit, Python, Scholar and File Parser tools. A unified sandbox orchestrates tool calls with caching, rate limits and failover
arxiv.org
.

Simulated environment – local environment built on 2024 Wikipedia with retrieval‑augmented tools, enabling fast experimentation
arxiv.org
.

Asynchronous rollout framework – separate servers for model inference and tool calls allow parallel rollouts; a central handler merges outputs
arxiv.org
.

GRPO‑based RL algorithm – on‑policy Group Relative Policy Optimization with token‑level policy gradient, leave‑one‑out advantage estimation and selective filtering of negative samples to prevent policy collapse
arxiv.org
.

Automatic data curation – dynamically refreshes training sets by removing solved or unsolvable problems and adding new challenging ones
arxiv.org
.

1.4 Heavy mode and parallel research

The Heavy Mode leverages test‑time compute by running multiple CM agents in parallel. Each agent independently performs deep research and produces a compressed report. A synthesis model then combines these reports to produce the final answer
arxiv.org
. Because each report is short, the synthesis model can fit multiple trajectories within the context window, enabling robust performance improvements
arxiv.org
.

1.5 Performance

Tongyi DeepResearch achieves state‑of‑the‑art performance on multiple deep research benchmarks. In the technical report, the 30B‑A3B model scored 32.9 % on Humanity’s Last Exam, 43.4 % on BrowseComp, 46.7 % on BrowseComp‑ZH, 70.9 % on GAIA, 75.0 % on xbench‑DeepSearch, 72.2 % on WebWalkerQA and 90.6 % on FRAMES
arxiv.org
, outperforming many proprietary systems (OpenAI o3/o4, DeepSeek‑V3.1, Claude‑4‑Sonnet) while using only 3.3 B active parameters per token
arxiv.org
. Heavy Mode further improves results—for example, it achieves 38.3 % on Humanity’s Last Exam and 58.1 % on BrowseComp‑ZH
arxiv.org
.

1.6 Practical implementation guide

To implement a Tongyi DeepResearch‑like agent:

Base model – obtain Qwen3‑30B‑A3B or a similar long‑context LLM. Ensure support for function‑calling and 128 K context.

Tool suite – implement tools for search, visit (webpage summarisation with extraction prompt), PythonInterpreter (sandboxed code execution), google_scholar and parse_file. Each tool should return structured responses and be accessible via an API. Use a scheduler with caching and timeouts to handle failures
arxiv.org
.

Prompting – use a system prompt that instructs the model to conduct thorough research and wrap tool calls and final answers in XML tags. The repository’s prompt.py provides a template
raw.githubusercontent.com
.

ReAct loop – implement a loop similar to react_agent.py that sends the conversation history to the model, extracts a <tool_call>, executes the corresponding tool, appends the <tool_response> and continues until an <answer> is generated. Limit the number of LLM calls and monitor context length. When the context is near the limit, instruct the model to summarise and answer
raw.githubusercontent.com
.

Context management (optional) – for long tasks, periodically summarise the dialogue into a report and use it as compressed memory. When using heavy mode, run several context‑managed agents in parallel and synthesise their reports.

Training – replicate the agentic continual pre‑training and post‑training pipeline. This requires synthesising agentic datasets (planning, reasoning, decision), performing two‑stage CPT (32 K then 128 K), then supervised fine‑tuning on high‑quality trajectories, followed by on‑policy RL. Training should be done on multiple GPUs and may require billions of tokens; thus replicating the exact performance may be resource intensive.

2. AgentFounder (Scaling agents via Agentic Continual Pre‑Training)

AgentFounder explores scaling via Agentic Continual Pre‑Training (Agentic CPT). The README notes that the authors are the first to incorporate Agentic CPT into the training pipeline of Deep Research agents, yielding the model AgentFounder‑30B
raw.githubusercontent.com
. Key features include:

Two‑stage continual pre‑training – context lengths of 32 K and 128 K ensure efficiency and improved performance
raw.githubusercontent.com
.

Open‑world memory – continuously updated data streams are transformed into a structured memory enabling diverse question synthesis
raw.githubusercontent.com
.

Planning Action Synthesis (FAS) – large‑scale generation of reasoning–action data from diverse QAs to strengthen planning
raw.githubusercontent.com
.

Reasoning Action Synthesis (FAS) – using knowledge sources to guide logical inference and ensure answer consistency
raw.githubusercontent.com
.

High‑order Action Synthesis (HAS) – reformulates trajectories into multi‑step decision‑making processes to explore the reasoning–action space
raw.githubusercontent.com
.

Implementing AgentFounder: Use the same base model as DeepResearch; synthesise planning/ reasoning/ decision data; perform two‑stage CPT (e.g., using scaled‑up open‑world memory). The code in Agent/AgentFounder (not reproduced here due to length) includes data synthesis scripts and training configuration.

3. AgentScaler (Environment scaling for general agentic intelligence)

AgentScaler addresses how to scale environments and teach agents to interact across a wider function‑calling space. The README explains that the framework automatically constructs heterogeneous, fully simulated environments and applies a two‑phase fine‑tuning strategy
raw.githubusercontent.com
. In the first phase the model acquires general agentic abilities; in the second it is specialised for domain‑specific contexts
raw.githubusercontent.com
. Experiments on τ‑bench, τ²‑Bench and ACEBench show improved function‑calling capabilities
raw.githubusercontent.com
.

Implementation guide: Build a simulator that randomises tools and state transitions (e.g., function‑calling tasks). Generate synthetic agent trajectories across these environments, then perform supervised fine‑tuning followed by RL. The environment scaling framework broadens the range of possible actions and fosters generalisation.

4. WebAgent Series
4.1 WebWalker (ACL 2025)

Goal: Assess and improve web traversal. The paper introduces WebWalkerQA, a benchmark requiring agents to traverse a root website’s subpages to answer questions
arxiv.org
. WebWalker is a multi‑agent framework consisting of an explorer agent (built on ReAct) and a critic agent
arxiv.org
. The explorer navigates the website using a thought‑action‑observation loop; the critic maintains memory and generates the final answer. Experiments show that vertical exploration (clicking into subpages) combined with horizontal search significantly improves performance
arxiv.org
.

Agent loop: The explorer agent uses ReAct to decide the next click or when to return information. The critic agent synthesises the explorer’s findings and decides when to terminate. At inference time the two agents communicate via memory buffers. Training uses synthetic browsing data and RL. To mirror WebWalker:

Implement two agents. The explorer uses tools search and click to traverse pages; the critic summarises the explorer’s observations and decides when to stop.

Use the WebWalkerQA dataset to train the agents. First generate high‑quality browsing trajectories via open‑source LLMs; perform supervised fine‑tuning; then reinforce using RL to improve traversal policies.

4.2 WebDancer (NeurIPS 2025)

Goal: Build an agentic information‑seeking agent from a data‑centric and training‑stage perspective. The WebDancer paper describes a four‑stage pipeline: browsing data construction, trajectory sampling, supervised fine‑tuning for cold start and reinforcement learning
arxiv.org
. Synthetic datasets are created using two strategies:

CRAWLQA – crawl web pages to construct deep queries.

Easy‑to‑Hard QA (E2HQA) – transform simple questions into complex ones to encourage progression from weak to strong agency
arxiv.org
.

The agent restricts actions to search and click and uses rejection‑sampling fine‑tuning followed by RL. The RL algorithm uses Decoupled Clip and Dynamic Sampling Policy Optimization (DAPO) to exploit under‑utilised QA pairs
arxiv.org
.

Implementation guide: Sample browsing tasks with search/click actions; generate trajectories using prompting with open‑source LLMs; perform rejection sampling to retain high‑quality short‑CoT and long‑CoT trajectories; fine‑tune the model; then apply RL with DAPO. Use the GAIA and WebWalkerQA benchmarks for evaluation.
arxiv.org
.

4.3 WebSailor (July 2025)

Goal: Achieve superhuman reasoning on complex information‑seeking benchmarks. The authors note that proprietary deep research systems succeed by systematically reducing extreme uncertainty; open‑source models lack this capability
arxiv.org
. WebSailor introduces a training methodology that generates high‑uncertainty tasks by sampling subgraphs from interconnected knowledge structures and applying information obfuscation
arxiv.org
arxiv.org
. After generating tasks, the pipeline performs rejection‑sampling fine‑tuning (RFT) and agentic RL using Duplicating Sampling Policy Optimization (DUPO)
arxiv.org
arxiv.org
.

Implementation guide:

Construct random knowledge graphs from websites via random walks and sample subgraphs to create complex QAs; obfuscate information to increase uncertainty
arxiv.org
.

Use open‑source LRMs (e.g., QwQ, DeepSeek‑R1) to generate action–observation traces, then reconstruct concise action‑oriented thoughts to avoid verbose reasoning
arxiv.org
.

Perform RFT on ~2 k high‑quality examples to provide a cold start. Then use DUPO RL to train the agent. Tools remain search and visit. Evaluate on BrowseComp‑en/zh.

4.4 WebShaper (July 2025)

Goal: Synthesize information‑seeking (IS) datasets through formalization‑driven data generation. Rather than collecting information and then generating questions (information‑driven), WebShaper first formalizes tasks using Knowledge Projections (KP) and set‑theoretic constructs, then guides data synthesis accordingly
arxiv.org
. An agentic Expander progressively expands seed tasks using retrieval and validation tools to increase complexity
arxiv.org
. Experiments show that WebShaper‑trained models outperform other open‑source agents on GAIA and WebWalkerQA
arxiv.org
.

Implementation guide: Represent information‑seeking tasks as KP formalizations; design operations that expand tasks by combining projections; implement an Expander agent that uses search/visit tools to retrieve information and validate intermediate steps; synthesise a large dataset; train an LLM using SFT and RL on this dataset.

4.5 WebWatcher (September 2025)

Goal: Extend deep research agents to multimodal information seeking. WebWatcher introduces a vision‑language agent equipped with Search, Visit, ImageSearch and CodeInterpreter tools
arxiv.org
. It uses high‑quality synthetic multimodal trajectories for cold start training and then reinforcement learning
arxiv.org
. The authors also propose BrowseComp‑VL, a benchmark requiring retrieval and reasoning over both text and images
arxiv.org
. WebWatcher significantly outperforms proprietary and open‑source baselines on vision‑language benchmarks like Humanity’s Last Exam‑VL and BrowseComp‑VL
arxiv.org
arxiv.org
.

Implementation guide:

Create multimodal synthetic trajectories by pairing web pages with relevant images; use tools like ImageSearch to fetch images and CodeInterpreter for code‑related tasks.

Fine‑tune a vision‑language LLM (e.g., Qwen‑VL) using these trajectories; ensure tool calls are correctly formatted.

Perform RL with sparse reward (correct final answer = 1) using asynchronous rollout servers. Evaluate on BrowseComp‑VL, Humanity’s Last Exam‑VL, LiveVQA and MMSearch
arxiv.org
arxiv.org
.

5. Inference code and tool implementations

The GitHub inference folder provides code to run DeepResearch locally:

react_agent.py implements the ReAct loop. It defines a MultiTurnReactAgent class that repeatedly calls the model via an OpenAI‑compatible API, parses tool calls, executes corresponding tools, appends the responses, monitors token limits and stops when an <answer> is generated
raw.githubusercontent.com
. Tools include search, visit, PythonInterpreter, google_scholar and parse_file
raw.githubusercontent.com
. A .env file is used to configure API keys for serper.dev (web search), Jina AI (web page reading), OpenAI (summary), Dashscope (file parsing) and a sandbox for Python execution
github.com
.

Tool modules (tool_search.py, tool_visit.py, etc.) call external APIs or local services. For example, tool_visit.py uses the extraction prompt in prompt.py to summarise visited pages.

To deploy the agent:

Set up Python 3.10 and install requirements (pip install -r requirements.txt).

Copy .env.example to .env and populate API keys and model path
github.com
.

Start the LLM server (e.g., using vLLM) and set planning_port in the input JSON.

Run run_react_infer.sh or run_multi_react.py with a dataset to obtain predictions.

Conclusion

Tongyi DeepResearch and its derivatives represent a comprehensive effort to build open‑source agents capable of deep, autonomous research. The core innovations include agentic continual pre‑training, context management, synthetic data pipelines, and on‑policy reinforcement learning. The GitHub repository provides inference code and tool implementations, while accompanying papers detail training strategies. Replicating the performance of these agents requires significant computational resources and careful implementation of data synthesis, fine‑tuning and RL. However, by following the guidelines above and leveraging open‑source models like Qwen, researchers can build their own deep research agents and contribute to the rapidly evolving field of agentic AI.





------------


State of the Art in Data‑Analysis Agents (2025)

Large‑language‑model (LLM) powered data‑analysis agents are systems that connect to data sources, understand questions in natural language, generate code (typically in Python, Pandas or Polars), run that code in a safe environment, and return insights. Recent advances combine LLMs with tool use, planning, memory, and multi‑agent collaboration to turn an LLM from a chat assistant into an autonomous data analyst. Below is a survey of the state of the art and practical guidance for building such agents.

1. Why data‑analysis agents are different from chatbots

Modern data agents are distinct from generic chatbots because they must:

Connect to data sources and interpret schemas – They load tables from CSV/Excel/SQL or DataFrames and extract metadata. Without the ability to look at data, the agent cannot answer analytics questions. Fabi AI’s blog emphasises that real agents need access to actual datasets and metadata to avoid hallucinations
fabi.ai
.

Reason over multiple steps – They must break down complex questions into sub‑tasks (e.g., filter, aggregate, visualise), generate code, execute it, inspect results, and then decide follow‑up actions. Upsolve’s 2025 article stresses that agents must plan and reason, not just answer a single question
upsolve.ai
.

Use external tools – Agents interact with tools such as Python execution, SQL engines, calculators, search APIs, or browser actions. NVIDIA’s technical blog highlights that an LLM agent requires tools, memory, planning, and an agent core to orchestrate these components
developer.nvidia.com
.

Maintain memory/context – Because analysis involves multiple code runs and question iterations, the agent must maintain state (dataframes, schema information, conversation history) and manage its context window. Fabi’s Analyst Agent uses LangGraph to maintain state between the chatbot node and tool nodes and trims messages to stay within the token limit
fabi.ai
.

2. Leading frameworks and projects
2.1 PandasAI (sinaptik‑ai/pandas‑ai)

PandasAI is a Python library that wraps DataFrames and allows users to query them in natural language. It uses an LLM (via LiteLLM) to translate questions into Python code and executes it safely in a Docker sandbox. Features include:

Aspect	Details & evidence
Natural‑language queries	Users can ask questions like “What are the top 5 products by revenue?” or request charts; the agent generates code using pandas/Matplotlib and runs it
github.com
.
Multiple DataFrames & conversation	PandasAI supports multiple DataFrames and keeps conversation history so that queries can reference previous results
github.com
.
Secure code execution	Code is run in a secure sandbox (Docker) to prevent malicious commands
github.com
.
Limitations	Designed around ChatGPT‑like models; less flexible for custom tool chaining or multi‑step planning.



-------


awesome — here’s a hands-on, story-driven guide for building a data-analysis system that thinks like a great Kaggle EDA notebook and can even spit out a notebook as its deliverable.

You can grab a ready-to-use storytelling EDA notebook template here:
Download: story_eda_template.ipynb

The “Narrative EDA” Agent — how to build it (and why it works)

Think of the best Kaggle EDAs: they read like short stories. There’s a hook, a cast (features), tension (data issues), rising action (discoveries), and a satisfying ending (insights + next steps). Your agent should produce the same shape of output — a runnable notebook — and get there via a careful tool-use loop.

Below I summarize what current sources say works well, then give you a concrete blueprint to build it.

What the best sources recommend (and how we borrow it)

Agents need four pillars: tools, memory, planning, and an agent core. A simple greedy planner with a “generate final answer” faux-tool can be surprisingly effective for analytics, provided you keep a running memory and route to code execution tools for SQL/Python when needed.

Containerized, shared kernels are key for notebook-like UX: execute LLM-written Python safely, keep state across turns, and let humans/agents share the same variables and dataframes. Use a “dry-run” tool to lint/sanity-check before real execution. Also trim conversation context and pull long-term bits via a “history” tool.

DuckDB + files + DB drivers give flexible data access; store schema metadata in a vector DB and fetch it via a “schema tool”. Only pass reduced samples to the LLM; do real crunching in Python.

EDA as a loop of Q→Code→Insight→Follow-ups: Generate root questions from schema/goal, write code, interpret results, then spawn diverse follow-up questions; repeat and finish with an insight summary. This mimics how strong Kaggle authors iterate.

Open-source exemplars:

Phidata DuckDB agent shows a concise pattern to answer “show me a histogram” by assembling data + Python execution.

EDA-GPT & similar apps lean on chains for structured/unstructured EDA, interactive charts, and post-EDA Q&A. Useful ideas: an initial automated EDA, then conversational deep-dives.

Blueprint: build a Notebook-Writing EDA Agent
1) Tools (the hands)

Implement each as a callable you expose to the LLM via your framework (LangGraph, LlamaIndex, etc.):

Kernel / Code Executor

Runs Python in an isolated container or jailed process (e.g., Jupyter kernel via jupyter_client, or a micro-service).

Provide two modes:

dry_run(code): syntax/type checks, light static analysis, fast sample execution. (Prevents “oops, I deleted the table”.)

run(code): executes and returns stdout, tables (head), and inline images.

Notebook Builder

Maintains an in-memory .ipynb (nbformat). It exposes:

nb_start(title, backstory, goal, hypotheses)

nb_add_markdown(section, text)

nb_add_code(section, code, execute=True|False)

nb_save(path)

Data Access

duckdb_query(sql) for local files (CSV/Parquet) and joins.

db_query(sql, conn) for warehouses.

schema_scan() returns tables, columns, types, simple stats; cache into a vector store for retrieval.

Viz & Profiling helpers

A light wrapper library you provide to the agent (matplotlib, pandas/Polars summary utilities, profiling hooks). Keep chart APIs simple (hist, kde, boxplot, bar, line).

Safety & Budget

limit_sample(df) to downsample before plotting.

guardrails.check_imports, guardrails.check_fs_access, execution timeouts.

2) Planning (the head)

Use a ReAct-style LangGraph with two nodes — chatbot and tools — and conditional routing:

Start with Act I prompts (backstory, goal, hypotheses).

The agent decomposes work into notebook “Acts” (sections) and selects tools in order. The “finalize” faux-tool appends the TL;DR to the notebook and ends the loop. NVIDIA’s post shows this minimal greedy planner works well for analytics.

3) Memory (the notes)

Keep a short-term window (system, first, last messages). Offer a “history” tool to recall long-term details so prompts stay small.

Maintain stateful variables in the Python kernel (dataframes persist between cells), just like a real notebook.

4) The Storybeat Prompts (Kaggle-style Acts)

Borrow the dramatic arc used by winning Kaggle EDAs and hard-code section scaffolds so the agent fills them with code + prose:

Act I — Set the Scene: audience, goal, hypotheses, deliverables.

Act II — Meet the Data: provenance, data dictionary, first glance.

Act III — Obstacles & Cleanups: missingness, duplicates, outliers, type fixes (with justifications).

Act IV — Target (if supervised): distribution and business meaning.

Act V — Character Arcs (Features): uni/bivariate plots tied to hypotheses.

Act VI — Quick Baseline (optional): humble, honest baseline to sanity-check signal.

Act VII — Resolution: 3 insights, 1 recommendation, what’s next.

The included notebook template already implements this structure.

Minimal Implementation Stack

Framework: LangGraph (great for a tiny ReAct graph with tools and token streaming).

Model: any function-calling LLM (closed or open). NVIDIA demos Mixtral 8×7B; strong results also reported with GPT-4 class models for analytics prompts.

Execution: Containerized Python kernel; ship with pandas and Polars. Add DuckDB for local files and SQL.

Notebook IO: nbformat to build .ipynb. For scheduled runs, add papermill.

Pseudocode: the tiny LangGraph



---------


Narrative-EDA Agent (v0.1) — Architecture & Implementation Guide (LangGraph-based)

Goal: build a working agent that takes one or more local data files (CSV/Parquet), explores them, optionally does web searches + “deep research” to enrich context, and outputs a polished Jupyter notebook (EDA storyline). We bias toward shipping now, with a clear path to “state-of-the-art later.”

1) What we’re building (and not)

Objectives

Natural-language prompt → EDA notebook (.ipynb) with story beats (context, data quality, distributions, relationships, TL;DR).

Data engines: pandas (default) and Polars (optional).

Optional context-enrichment: web search + a DeepResearch loop (ReAct-style plan-act-observe).

Safe Python execution in an isolated kernel for charts/tables (notebook cells mirror what was executed).

Clear extension points (tools) and a minimal, maintainable LangGraph loop (ReAct-style).

Non-goals (for v0.1)

No multi-table schema reasoning beyond simple joins.

No AutoML; only a small “sanity baseline” (optional).

No complex auth to SaaS data warehouses (we’ll add DuckDB + local files first).

2) System at a glance

User prompt + filepaths
        │
        ▼
+---------------------+
| LangGraph ReAct LLM |
+---------------------+
    │      │        │
    │      │        ├── WebSearchTool         (search + fetch)
    │      │        ├── DeepResearchTool      (mini ReAct on search results)
    │      ├────────┤
    │               ├── DataLoaderTool        (CSV/Parquet → pandas/Polars)
    │               ├── NotebookTool          (build .ipynb via nbformat)
    │               ├── CodeExecutorTool      (safe kernel exec; dry_run/run)
    │               └── Viz/Profiling helpers (hist, kde, missingness)
    │
    └── Finalize → saves notebook to disk and returns path


Core pattern: LLM plans a step → calls a tool → observes output → writes/executes code blocks → appends cells to the notebook → repeats until “Finalize Notebook”.

3) Agent loop (LangGraph)

We use a minimal ReAct loop with two nodes: chatbot and tools. The LLM emits either:

a tool call (e.g., “run this code”, “load this file”, “web search X”), or

a finalize action (no tool) → we save the notebook and end.

3.1 State schema

from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class AgentState(BaseModel):
    messages: List[Dict[str, Any]] = []           # chat/steps
    files: List[str] = []                          # input filepaths
    engine: str = "pandas"                         # or "polars"
    notebook_path: str = "eda_story.ipynb"
    nb_cells: List[Dict[str, Any]] = []            # (internal) staged cells
    context_snippets: List[str] = []               # from web/deep research
    plan: Optional[str] = None                     # latest high-level plan
    n_steps: int = 0

3.2 Graph skeleton

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

def chatbot(state: AgentState) -> AgentState:
    # Trim messages (keep system, first, last), append tool outputs as needed
    trimmed = trim_messages(state.messages)
    # Add system instructions that enforce “story beats” and tool usage contract
    reply = llm_with_tools.invoke(trimmed)         # returns either a tool call or plain text “finalize”
    state.messages.append(reply)
    state.n_steps += 1
    return state

tools_node = ToolNode([
    DataLoaderTool(),          # load_csv/load_parquet/list_columns/sample
    CodeExecutorTool(),        # dry_run(code), run(code)
    NotebookTool(),            # nb_add_md, nb_add_code, nb_save
    WebSearchTool(),           # search(query), fetch(url)
    DeepResearchTool(),        # research_loop(goal, sources)
    VizHelperTool(),           # quick_hist, kde, bar, corr_heatmap etc.
])

def select_next(state: AgentState):
    last = state.messages[-1]
    return "tools" if last.get("tool_name") else END

g = StateGraph(AgentState)
g.add_node("chatbot", chatbot)
g.add_node("tools", tools_node)
g.add_edge(START, "chatbot")
g.add_conditional_edges("chatbot", select_next)
g.add_edge("tools", "chatbot")
graph = g.compile()
Why this works now: It’s tiny, debuggable, and follows a proven plan-act-observe pattern.

4) Prompts (storytelling + safety)

System prompt (sketch):

You are a data-journalist EDA agent that writes a clear, reproducible Jupyter notebook.
In each step, either:

choose a TOOL with strictly formatted JSON, or

finalize the notebook when done.

Notebook structure (Acts):
Act I: backstory, goal, hypotheses.
Act II: data loading, dictionary, first glance.
Act III: data quality (missingness, duplicates, types) with justifications.
Act IV: (optional) target overview.
Act V: key features (univariate & bivariate).
Act VI: (optional) sanity baseline model.
Act VII: resolution (3 insights, 1 recommendation, what next).

Always use dry_run(code) before run(code). For large data, sample or aggregate before plotting.
Prefer pandas unless user set Polars.

Tool-call JSON (example):
{
  "tool_name": "NotebookTool.nb_add_md",
  "arguments": {
    "section": "Act I — Set the Scene",
    "text": "Audience: Ops manager. Goal: Reduce delay in shipments..."
  }
}

5) Tool specs & first implementation
5.1 NotebookTool (nbformat)

import nbformat
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell

class NotebookTool:
    def __init__(self):
        self.nb = new_notebook(cells=[])

    def nb_add_md(self, section: str, text: str):
        header = f"## {section}" if not section.startswith("#") else section
        self.nb.cells.append(new_markdown_cell(f"{header}\n\n{text}"))
        return {"ok": True}

    def nb_add_code(self, code: str, execute: bool=False):
        # We record the code; execution is done via CodeExecutorTool, which returns outputs separately.
        self.nb.cells.append(new_code_cell(code))
        return {"ok": True}

    def nb_save(self, path: str="eda_story.ipynb"):
        with open(path, "w") as f:
            nbformat.write(self.nb, f)
        return {"path": path}

Notes

The CodeExecutorTool handles actual execution (and can optionally write execution artifacts into the notebook later if you want).

Keep the notebook “source of truth” in memory and save at the end (or periodically).

5.2 CodeExecutorTool (safe kernel)

Spin a dedicated kernel per session (e.g., jupyter_client or papermill runner).

dry_run(code):

AST parse, basic lint, import guard, filesystem guard.

Optionally run against a tiny sample (e.g., head(1000)) to catch runtime errors fast.

run(code):

Execute with timeouts.

Capture stdout, displayable tables (.head()), and images (matplotlib renders to PNG).

Return a compact artifact manifest to append to the notebook (e.g., link saved PNG under /artifacts/...).

5.3 DataLoaderTool

load_csv(path, engine="pandas") → variable df in kernel.

load_parquet(path, engine="pandas") ditto.

list_columns() → names + types.

sample(n or frac) to keep LLM context small; heavy work stays in Python.

5.4 WebSearchTool

search(query, k=5) via a provider (SerpAPI/Tavily/Bing).

fetch(url) to retrieve selected pages (with simple boilerplate stripping).

Return short summaries + URLs; store snippets in state.context_snippets.

5.5 DeepResearchTool (mini ReAct loop)

Given goal + seeds (from WebSearchTool), run an inner loop:

propose next hop (search → read → reflect),

retrieve/add notes and quotes (with citation URLs),

stop when confidence threshold or hop budget hit.

Output a concise “Findings.md” (bullets + references), which the agent can quote in Act I to motivate the EDA.

(Implementation hint: It can be a plain Python function that itself calls the same LLM with a stripped-down toolset of search/fetch/summarize and returns compiled notes.)

5.6 VizHelperTool (light helpers)

hist(df, col), kde(df, col, by=None), bar(df, cat_col), scatter(df, x, y), corr(df)

Save figures under /artifacts/figs/<uuid>.png and return path for NotebookTool to embed (markdown with image link).

6) E2E flow (happy path)

Act I: LLM calls NotebookTool.nb_add_md with audience/goal/hypotheses.
If the user enabled research, it calls WebSearchTool.search + DeepResearchTool.research_loop to add market/domain context.

Act II: LLM calls DataLoaderTool.load_csv|load_parquet, list_columns, writes a data dictionary cell; adds a quick head() code cell.

Act III: Generate missingness/duplicates/type-fix code → dry_run → run. Add a markdown “why this matters”.

Act V: For a few numeric/categorical columns, call VizHelperTool.hist/bar/kde and insert images; add commentary (tie to hypotheses).

Act IV/VI (optional): Target overview & a tiny baseline (with warnings).

Act VII: Summarize 3 insights, 1 recommendation, what’s next.
NotebookTool.nb_save(path) → return path.

7) Configuration & running

Environment

Python 3.11+, langgraph, openai/provider SDK, pandas, polars, matplotlib, duckdb, nbformat, jupyter_client, tiktoken (if needed).

Start

export MODEL=your_llm_name
python app.py --files data/train.csv data/lookup.parquet --engine pandas --research on

app.py (sketch)

state = AgentState(
    files=args.files,
    engine=args.engine,
    notebook_path="eda_story.ipynb"
)
result = graph.invoke(state)
print("Notebook saved to:", result.notebook_path)

8) Phased iterations (ship now, then level up)
v0.1 (this doc)

✅ Single-file EDA (CSV/Parquet) via pandas (Polars optional).

✅ Story beats + minimal plots + missingness/duplicates.

✅ Web search + small DeepResearch loop for background context.

✅ Safe code execution (dry-run + run), notebook saved.

v0.2 — Ergonomics & robustness

Add DuckDB to join multiple local files easily.

Strengthen guardrails (package allowlist, FS sandbox, cpu/mem limits).

Smarter sampling for large tables (stratified by key columns).

v0.3 — Data realism

Schema detector for timestamps/categoricals; better date parsing.

Outlier detection helpers (IQR/mad with domain-aware notes).

Built-in profiling cell for quick overview (but keep it simple).

v0.4 — Better planning & memory

Short-term message trimming + a conversation history tool.

Higher-level EDA plan (bullet itinerary) → mark off as steps complete.

Inner DeepResearch loop gets citation checking and quote extraction.

v0.5 — Production polish

Notebook to HTML/PDF rendering.

Artifacts registry (images/tables) and deterministic seeding.

Evaluation harness on a small corpus (does the notebook render? do charts exist? does it cover story beats?)

9) Clear recommendations to increase capability

Model choice & prompting

Use a strong function-calling LLM for tool routing; keep tool set small.

Add self-checks: before finalizing, ask the LLM to verify each Act has content.

Data scale & performance

Offload heavy groupbys/joins to DuckDB.

For Polars, prefer lazy pipelines and scan Parquet directly.

Reliability

Keep a step budget and time budget; if budget is low, summarize and finalize gracefully.

Idempotent tools (nb_add_code should not re-add duplicates if retried).

Deep research quality

Constrain the inner loop: require N independent sources with conflict notes; surface citations into Act I.

Add a quote table with source URLs (kept out of the notebook if offline deliverable is required).

Notebook excellence

Force explanations for every cleanup and hypothesis ties for every chart.

Add a TL;DR cell at top (auto-generated after the rest finishes).

10) Minimal code you can drop in
10.1 NotebookTool (as above)
10.2 CodeExecutorTool (very small sketch)

import ast, time, textwrap
from jupyter_client import KernelManager

class CodeExecutorTool:
    def __init__(self):
        self.km = KernelManager()
        self.km.start_kernel()
        self.kc = self.km.client()
        self.kc.start_channels()

    def dry_run(self, code: str):
        ast.parse(code)  # syntax check
        # basic guards here (no open(), no os.system, etc.)
        return {"ok": True}

    def run(self, code: str, timeout_s: int = 20):
        # send to kernel and collect outputs; save figs to /artifacts
        # (implement iopub listener, sanitize display_data, etc.)
        # return {"stdout": ..., "tables": ..., "fig_paths": [...]}
        ...

10.3 DataLoaderTool (CSV/Parquet)

class DataLoaderTool:
    def load_csv(self, path: str, engine="pandas"):
        if engine == "polars":
            code = f"import polars as pl\ndf = pl.read_csv(r'''{path}''')\ndf.head()"
        else:
            code = f"import pandas as pd\ndf = pd.read_csv(r'''{path}''')\ndf.head()"
        return {"kernel_code": code}   # pass to executor

    def load_parquet(self, path: str, engine="pandas"):
        if engine == "polars":
            code = f"import polars as pl\ndf = pl.read_parquet(r'''{path}''')\ndf.head()"
        else:
            code = f"import pandas as pd\ndf = pd.read_parquet(r'''{path}''')\ndf.head()"
        return {"kernel_code": code}

10.4 WebSearchTool + DeepResearchTool (shape)

class WebSearchTool:
    def search(self, query: str, k: int = 5): ...
    def fetch(self, url: str): ...

class DeepResearchTool:
    def research_loop(self, goal: str, seeds: list[str], hops: int = 4, max_tokens=4000):
        notes, seen = [], set(seeds)
        for _ in range(hops):
            # 1) propose next query/page (LLM), 2) fetch/summarize, 3) add to notes
            # stop if confidence high; return {"summary": ..., "citations": [...]}
            ...

11) What you’ll get after running

A Jupyter notebook eda_story.ipynb with:

Act I–VII narrative cells

Executed code cells (data loading, cleaning, plots)

Embedded chart images (PNG)

A crisp TL;DR with 3 insights + a recommendation + what’s next