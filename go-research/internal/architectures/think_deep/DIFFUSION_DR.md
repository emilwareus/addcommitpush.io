# Diffusion Deep Research: A Test-Time Denoising Approach

**The paradigm shift from single-pass generation to iterative refinement for AI research agents**

---

## Abstract

Diffusion Deep Research represents a fundamental architectural shift in how AI systems approach complex research tasks. Rather than generating research reports in a single pass, this approach models the entire research process as a **diffusion process**—starting with a "noisy" initial draft and iteratively "denoising" it through cycles of information retrieval, reasoning, and revision.

This document provides a comprehensive technical overview of the Diffusion Deep Research architecture, its theoretical foundations, implementation details based on the **ThinkDepth.ai reference implementation**, and the benefits that make it the current state-of-the-art approach for autonomous research agents.

---

## Table of Contents

1. [Introduction: Why Diffusion for Research?](#introduction-why-diffusion-for-research)
2. [Theoretical Foundations](#theoretical-foundations)
3. [Core Architecture](#core-architecture)
4. [The Diffusion Algorithm](#the-diffusion-algorithm)
5. [The Self-Balancing Principle](#the-self-balancing-principle)
6. [Implementation: Complete Reference](#implementation-complete-reference)
7. [Quality Rules: Insightfulness & Helpfulness](#quality-rules-insightfulness--helpfulness)
8. [Benefits and Benchmarks](#benefits-and-benchmarks)
9. [Context Engineering Considerations](#context-engineering-considerations)
10. [References and Further Reading](#references-and-further-reading)

---

## Introduction: Why Diffusion for Research?

### The Problem with Single-Pass Research

Traditional AI research agents follow a linear paradigm:

```
Query → Search → Synthesize → Report
```

This approach suffers from several fundamental limitations:

1. **Information Loss**: Important context discovered late in the process cannot influence earlier decisions
2. **No Self-Correction**: Errors or gaps in early research propagate to the final output
3. **Static Search Strategy**: The search strategy is fixed at the start and cannot adapt to findings
4. **Coherence Degradation**: Long reports lose coherence when sections are generated independently

### The Diffusion Paradigm

Diffusion models, originally developed for image generation, provide an elegant solution. Instead of generating content in one pass, they:

1. Start with a **noisy initial state** (random noise for images, rough draft for research)
2. **Iteratively refine** through multiple denoising steps
3. Use **guidance signals** to steer the refinement (class labels for images, research findings for reports)

> "The iterative nature of diffusion models naturally mirrors how humans actually conduct research—cycles of searching, reasoning, and revision."
> — *Google Research, Deep Researcher with Test-Time Diffusion, 2025* [1]

This insight led to the development of **Test-Time Diffusion Deep Research (TTD-DR)**, which applies diffusion principles to research report generation.

---

## Theoretical Foundations

### Classical Diffusion Models

In classical diffusion models (e.g., DDPM, Stable Diffusion), the process consists of:

**Forward Diffusion**: Gradually add noise to data
```
x₀ → x₁ → x₂ → ... → xₜ (pure noise)
```

**Reverse Diffusion**: Learn to denoise step by step
```
xₜ → xₜ₋₁ → ... → x₁ → x₀ (clean data)
```

### Adaptation to Research

For research report generation, we reinterpret this process:

| Classical Diffusion | Research Diffusion |
|--------------------|--------------------|
| Random noise (xₜ) | Initial draft from model knowledge |
| Denoising step | Research iteration + draft refinement |
| Guidance signal | Retrieved information from web search |
| Clean output (x₀) | Comprehensive, accurate research report |

The key insight is that the **initial draft** generated purely from the LLM's training data represents the "noisy" starting state. Each iteration of:

1. Identifying gaps in the draft
2. Searching for information to fill those gaps
3. Incorporating findings into the draft

...acts as a **denoising step** that brings the report closer to ground truth.

### Mathematical Formulation

Let:
- `D₀` = Initial draft (from LLM training data only)
- `Dₜ` = Draft at iteration t
- `R(Dₜ)` = Research function that identifies gaps and retrieves information
- `U(Dₜ, R(Dₜ))` = Update function that incorporates research into draft

The diffusion process becomes:

```
D₁ = U(D₀, R(D₀))
D₂ = U(D₁, R(D₁))
...
Dₙ = U(Dₙ₋₁, R(Dₙ₋₁))
```

The process terminates when:
- `R(Dₜ)` returns no new information (information gap closed)
- Maximum iterations reached
- Supervisor determines research is comprehensive

---

## Core Architecture

The ThinkDepth.ai implementation consists of **five primary phases**, orchestrated through a LangGraph state machine:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 1: USER CLARIFICATION                          │
│                        (clarify_with_user)                               │
│                                                                          │
│   "Does the user's request need clarification?"                          │
│   - Check for acronyms, abbreviations, unknown terms                     │
│   - Assess if sufficient context exists                                  │
│   - Optional: ask clarifying question before proceeding                  │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 2: RESEARCH BRIEF GENERATION                   │
│                        (write_research_brief)                            │
│                                                                          │
│   Transform conversation into detailed research brief:                   │
│   • Maximize specificity and detail                                      │
│   • Handle unstated dimensions as open considerations                    │
│   • Avoid unwarranted assumptions                                        │
│   • Distinguish research scope from user preferences                     │
│   • Use first person ("I want to understand...")                         │
│   • Specify priority sources                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 3: INITIAL DRAFT GENERATION                    │
│                        (write_draft_report)                              │
│                                                                          │
│   Generate draft from LLM's INTERNAL KNOWLEDGE ONLY:                     │
│   • NO external information retrieval yet                                │
│   • Structured with proper headings (# ## ###)                          │
│   • This is the "NOISY" initial state for diffusion                      │
│   • May contain outdated or incomplete information                       │
│   • Provides structure to guide subsequent research                      │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 4: DIFFUSION LOOP                              │
│                     (supervisor_subgraph)                                │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │  THE DIFFUSION ALGORITHM (per iteration):                          │ │
│   │                                                                    │ │
│   │  1. Generate research questions to address GAPS in draft          │ │
│   │  2. ConductResearch: retrieve external info for "denoising"       │ │
│   │  3. refine_draft_report: remove "noise" (imprecision,             │ │
│   │     incompleteness) from draft                                     │ │
│   │  4. Assess: Are findings comprehensive? (NOT draft appearance!)   │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   Supervisor coordinates parallel sub-researchers:                       │
│                                                                          │
│      ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│      │ Sub-Agent 1 │  │ Sub-Agent 2 │  │ Sub-Agent 3 │  (max 3)         │
│      │  Topic A    │  │  Topic B    │  │  Topic C    │                  │
│      └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│             │                │                │                          │
│             └────────────────┼────────────────┘                          │
│                              ▼                                           │
│                     refine_draft_report                                  │
│                              │                                           │
│                              ▼                                           │
│                     Continue or ResearchComplete?                        │
│                                                                          │
│   Hard Limit: 15 iterations (think_tool + ConductResearch + refine)     │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 5: FINAL REPORT GENERATION                     │
│                     (final_report_generation)                            │
│                                                                          │
│   Apply quality optimization with Insightfulness + Helpfulness rules:   │
│   • Deduplicate findings by URL                                          │
│   • Granular breakdown with specific causes/impacts                      │
│   • Detailed mapping tables for comparisons                              │
│   • Nuanced discussion with explicit exploration                         │
│   • Proper citation format: [1] Source Title: URL                       │
│   • Language matching: output in same language as user input            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Diffusion Algorithm

The core innovation is the **Self-Balancing Test-Time Diffusion** algorithm, encoded directly in the supervisor's system prompt. Here is the exact algorithm from the ThinkDepth.ai implementation:

### The Four Steps

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DIFFUSION ALGORITHM                               │
│                                                                          │
│  1. GENERATE RESEARCH QUESTIONS                                          │
│     └─ Analyze draft report to identify information gaps                 │
│     └─ Generate targeted questions to address those gaps                 │
│                                                                          │
│  2. ConductResearch                                                      │
│     └─ Retrieve external information to provide concrete "delta"         │
│     └─ This information is used for "denoising" the draft               │
│     └─ Execute in parallel when topics are independent                  │
│                                                                          │
│  3. refine_draft_report                                                  │
│     └─ Remove "noise" from draft (imprecision, incompleteness)          │
│     └─ Incorporate new findings with citations                          │
│     └─ ALWAYS run after ConductResearch                                  │
│                                                                          │
│  4. ResearchComplete (or continue)                                       │
│     └─ CRITICAL: Base decision on FINDINGS completeness                 │
│     └─ NOT on how polished the draft looks                              │
│     └─ Run diverse research questions to verify no new findings         │
│     └─ For non-English: run additional verification round               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Critical Completion Criteria

From the actual prompt (`lead_researcher_with_multiple_steps_diffusion_double_check_prompt`):

> "**CompleteResearch**: complete research only based on ConductResearch tool's findings' completeness. **It should not be based on the draft report.** Even if the draft report looks complete, you should continue doing the research until all the research findings are collected. You know the research findings are complete by running ConductResearch tool to generate diverse research questions to see if you cannot find any new findings."

This is the **self-balancing** aspect: the model determines when research is complete based on the information landscape, not the appearance of the output.

### Supervisor Tools

| Tool | Purpose | Invocation |
|------|---------|------------|
| `ConductResearch` | Delegate research to sub-agent | `{"research_topic": "Detailed paragraph..."}` |
| `refine_draft_report` | Update draft with new findings | `{"research_brief": "...", "findings": "...", "draft_report": "..."}` |
| `ResearchComplete` | Signal research is comprehensive | `{}` |
| `think_tool` | Strategic reflection | `{"reflection": "..."}` |

### Sub-Researcher Tools

| Tool | Purpose | Limits |
|------|---------|--------|
| `tavily_search` | Web search with summarization | Simple: 2-3 calls, Complex: up to 5 calls |
| `think_tool` | Analyze results, plan next step | Use after each search |

---

## The Self-Balancing Principle

> "Self-balancing Agentic AI sets up self-balancing rules to guide the self-evolution of the agentic system. We can set up a group of rules and let the model decide how to apply them dynamically."
> — *Paichun Lin, ThinkDepth.ai* [2]

### Two-Stage Gap Closing

The algorithm explicitly separates **information gap closing** from **generation gap closing**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TWO-STAGE GAP CLOSING                               │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  STAGE 1: INFORMATION GAP CLOSING                                │   │
│   │                                                                   │   │
│   │  Focus: Close information gap through external retrieval         │   │
│   │  Method: ConductResearch → refine_draft_report loop              │   │
│   │  Draft update: Incorporate facts, add citations                  │   │
│   │                                                                   │   │
│   │  Information Gap = What's needed - What we've retrieved          │   │
│   │                                                                   │   │
│   │  Exit: Diverse research questions yield no new findings          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  STAGE 2: GENERATION GAP CLOSING                                 │   │
│   │                                                                   │   │
│   │  Focus: Optimize output quality                                  │   │
│   │  Method: Apply full Insightfulness + Helpfulness rules          │   │
│   │  Draft update: Full rewrite, formatting, citation cleanup       │   │
│   │                                                                   │   │
│   │  Generation Gap = Ideal output quality - Current output quality  │   │
│   │                                                                   │   │
│   │  Exit: Quality rules satisfied, report finalized                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Separate the Stages?

From the research:

> "There is a trade-off between the two gaps. We cannot optimize the generation gap too early when the system is still optimizing the information gap because the generation gap tends to bring more verbose and stylistic content that can distract from finding missing information."
> — *Paichun Lin, ThinkDepth.ai* [2]

**Stage 1 characteristics:**
- Focus on **what** information exists, not **how** to present it
- Draft updates are functional, not polished
- Prioritizes breadth of coverage
- Uses global-context OR section-specific queries based on gap analysis

**Stage 2 characteristics:**
- All information is available
- Focus on presentation, coherence, and user satisfaction
- Applies full quality optimization
- Generates final deliverable with proper citations

---

## Implementation: Complete Reference

### State Definitions

From `state_multi_agent_supervisor.py`:

```python
class SupervisorState(TypedDict):
    """State for the multi-agent research supervisor."""
    
    # Messages exchanged with supervisor for coordination
    supervisor_messages: Annotated[Sequence[BaseMessage], add_messages]
    
    # Detailed research brief that guides the overall direction
    research_brief: str
    
    # Processed notes ready for final report generation
    notes: Annotated[list[str], operator.add]
    
    # Counter tracking research iterations performed
    research_iterations: int  # Max: 15
    
    # Raw unprocessed research notes from sub-agents
    raw_notes: Annotated[list[str], operator.add]
    
    # The evolving draft report
    draft_report: str
```

### Tool Definitions

```python
@tool
class ConductResearch(BaseModel):
    """Tool for delegating a research task to a specialized sub-agent."""
    research_topic: str = Field(
        description="The topic to research. Should be a single topic, "
                    "and should be described in high detail (at least a paragraph)."
    )

@tool
class ResearchComplete(BaseModel):
    """Tool for indicating that the research process is complete."""
    pass

@tool
def think_tool(reflection: str) -> str:
    """Tool for strategic reflection on research progress and decision-making.
    
    Use this tool after each search to analyze results and plan next steps.
    
    Reflection should address:
    1. Analysis of current findings
    2. Gap assessment - what's still missing?
    3. Quality evaluation - sufficient evidence?
    4. Strategic decision - continue or conclude?
    """
    return f"Reflection recorded: {reflection}"

@tool
def refine_draft_report(
    research_brief: str,
    findings: str, 
    draft_report: str
) -> str:
    """Refine draft report with new research findings.
    
    Synthesizes findings into draft, maintaining structure
    and adding citations.
    """
    # Uses report_generation_with_draft_insight_prompt
    # Returns refined draft content
```

### Supervisor Node Implementation

From `multi_agent_supervisor.py`:

```python
# Configuration
max_researcher_iterations = 15  # Hard limit on tool calls
max_concurrent_researchers = 3   # Parallel sub-agents

async def supervisor(state: SupervisorState) -> Command:
    """Coordinate research activities.
    
    Analyzes the research brief and current progress to decide:
    - What research topics need investigation
    - Whether to conduct parallel research
    - When research is complete
    """
    supervisor_messages = state.get("supervisor_messages", [])
    
    # Format system prompt with diffusion algorithm
    system_message = lead_researcher_with_multiple_steps_diffusion_double_check_prompt.format(
        date=get_today_str(),
        max_concurrent_research_units=max_concurrent_researchers,
        max_researcher_iterations=max_researcher_iterations
    )
    
    messages = [SystemMessage(content=system_message)] + supervisor_messages
    response = await supervisor_model_with_tools.ainvoke(messages)
    
    return Command(
        goto="supervisor_tools",
        update={
            "supervisor_messages": [response],
            "research_iterations": state.get("research_iterations", 0) + 1
        }
    )

async def supervisor_tools(state: SupervisorState) -> Command:
    """Execute supervisor decisions."""
    
    # Check exit criteria
    exceeded_iterations = research_iterations >= max_researcher_iterations
    research_complete = any(
        tc["name"] == "ResearchComplete" 
        for tc in most_recent_message.tool_calls
    )
    
    if exceeded_iterations or research_complete:
        return Command(goto=END, update={"notes": get_notes_from_tool_calls(...)})
    
    # Separate tool call types
    think_calls = [tc for tc in tool_calls if tc["name"] == "think_tool"]
    research_calls = [tc for tc in tool_calls if tc["name"] == "ConductResearch"]
    refine_calls = [tc for tc in tool_calls if tc["name"] == "refine_draft_report"]
    
    # Execute think_tool calls (synchronous)
    for tool_call in think_calls:
        observation = think_tool.invoke(tool_call["args"])
        tool_messages.append(ToolMessage(content=observation, ...))
    
    # Execute ConductResearch calls (PARALLEL)
    if research_calls:
        coros = [
            researcher_agent.ainvoke({
                "researcher_messages": [HumanMessage(content=tc["args"]["research_topic"])],
                "research_topic": tc["args"]["research_topic"]
            })
            for tc in research_calls
        ]
        results = await asyncio.gather(*coros)  # Parallel execution!
        
        # Each sub-agent returns compressed_research
        for result, tc in zip(results, research_calls):
            tool_messages.append(ToolMessage(
                content=result.get("compressed_research", ""),
                name=tc["name"],
                tool_call_id=tc["id"]
            ))
    
    # Execute refine_draft_report
    for tc in refine_calls:
        notes = get_notes_from_tool_calls(supervisor_messages)
        draft_report = refine_draft_report.invoke({
            "research_brief": state.get("research_brief"),
            "findings": "\n".join(notes),
            "draft_report": state.get("draft_report")
        })
        tool_messages.append(ToolMessage(content=draft_report, ...))
    
    return Command(
        goto="supervisor",
        update={"supervisor_messages": tool_messages, "draft_report": draft_report}
    )
```

### Sub-Researcher Implementation

From `research_agent.py`:

```python
def llm_call(state: ResearcherState):
    """Analyze state and decide next action."""
    return {
        "researcher_messages": [
            model_with_tools.invoke(
                [SystemMessage(content=research_agent_prompt)] + state["researcher_messages"]
            )
        ]
    }

def tool_node(state: ResearcherState):
    """Execute all tool calls from previous response."""
    tool_calls = state["researcher_messages"][-1].tool_calls
    observations = []
    
    for tool_call in tool_calls:
        tool = tools_by_name[tool_call["name"]]
        observations.append(tool.invoke(tool_call["args"]))
    
    return {"researcher_messages": [
        ToolMessage(content=obs, name=tc["name"], tool_call_id=tc["id"])
        for obs, tc in zip(observations, tool_calls)
    ]}

def compress_research(state: ResearcherState) -> dict:
    """Compress research findings into concise summary for supervisor."""
    
    # Use compression prompt to synthesize findings
    response = compress_model.invoke([
        SystemMessage(content=compress_research_system_prompt.format(date=get_today_str())),
        *state.get("researcher_messages", []),
        HumanMessage(content=compress_research_human_message)
    ])
    
    return {
        "compressed_research": str(response.content),
        "raw_notes": ["\n".join(raw_notes)]
    }

def should_continue(state: ResearcherState) -> str:
    """Route to tool execution or compression."""
    if state["researcher_messages"][-1].tool_calls:
        return "tool_node"
    return "compress_research"

# Graph: START → llm_call ⇄ tool_node → compress_research → END
```

### Search Tool with Summarization

From `utils.py`:

```python
@tool
def tavily_search(query: str, max_results: int = 3, topic: str = "general") -> str:
    """Fetch results from Tavily search API with content summarization."""
    
    # Execute search
    search_results = tavily_search_multiple([query], max_results, topic, include_raw_content=True)
    
    # Deduplicate by URL
    unique_results = deduplicate_search_results(search_results)
    
    # Summarize each result (using LLM)
    summarized_results = process_search_results(unique_results)
    
    # Format output
    return format_search_output(summarized_results)

def summarize_webpage_content(webpage_content: str) -> str:
    """Summarize webpage to ~25-30% of original length."""
    
    structured_model = summarization_model.with_structured_output(Summary)
    
    summary = structured_model.invoke([
        HumanMessage(content=summarize_webpage_prompt.format(
            webpage_content=webpage_content,
            date=get_today_str()
        ))
    ])
    
    return f"<summary>\n{summary.summary}\n</summary>\n\n" \
           f"<key_excerpts>\n{summary.key_excerpts}\n</key_excerpts>"
```

---

## Quality Rules: Insightfulness & Helpfulness

The final report generation applies explicit quality rules. From `prompts.py`:

### Insightfulness Rules

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INSIGHTFULNESS RULES                             │
│                                                                         │
│  1. GRANULAR BREAKDOWN                                                  │
│     └─ Break down topics into specific causes and specific impacts      │
│     └─ Don't generalize - be concrete                                   │
│                                                                         │
│  2. DETAILED MAPPING TABLE                                              │
│     └─ Create tables mapping causes to effects                          │
│     └─ Use for comparisons and summaries                                │
│                                                                         │
│  3. NUANCED DISCUSSION                                                  │
│     └─ Detailed exploration of the topic                                │
│     └─ Explicit discussion of edge cases and limitations                │
│     └─ Don't oversimplify - clarify ambiguity                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Helpfulness Rules

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HELPFULNESS RULES                               │
│                                                                         │
│  1. SATISFYING USER INTENT                                              │
│     └─ Does the response directly address the user's request?           │
│                                                                         │
│  2. EASE OF UNDERSTANDING                                               │
│     └─ Is the response fluent, coherent, and logically structured?      │
│                                                                         │
│  3. ACCURACY                                                            │
│     └─ Are the facts, reasoning, and explanations correct?              │
│                                                                         │
│  4. APPROPRIATE LANGUAGE                                                │
│     └─ Is the tone suitable and professional?                           │
│     └─ Avoid unnecessary jargon or confusing phrasing                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Section Writing Guidelines

From the actual prompt:

```
For each section of the report:
- Have an explicit discussion in simple, clear language
- DO NOT oversimplify. Clarify when a concept is ambiguous.
- DO NOT list facts in bullet points. Write in paragraph form.
- If there are theoretical frameworks, provide detailed application
- For comparison and conclusion, include a summary table
- Use ## for section titles (Markdown format)
- Do NOT refer to yourself as the writer
- Each section should be as long as necessary to deeply answer the question
```

### Citation Rules

These rules directly support the **FACT evaluation metrics** (Citation Accuracy and Effective Citations) used in DeepResearch Bench [4]:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CITATION FORMAT                                 │
│                                                                          │
│  In-text: Use [1], [2], etc. for inline citations                       │
│                                                                          │
│  Sources section:                                                        │
│  ### Sources                                                             │
│  [1] Source Title: URL                                                   │
│  [2] Source Title: URL                                                   │
│  ...                                                                     │
│                                                                          │
│  IMPORTANT:                                                              │
│  - Number sources sequentially without gaps (1,2,3,4...)                │
│  - Each source on a separate line                                        │
│  - Include URL only in Sources section                                   │
│  - Citations are extremely important - users rely on them               │
│                                                                          │
│  FACT Evaluation Connection:                                             │
│  - FACT extracts statement-URL pairs to verify citations                │
│  - Citation Accuracy = supported citations / total citations            │
│  - Effective Citations = avg verifiably supported citations per task   │
│  - Clean format enables accurate automated extraction                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Benefits and Benchmarks

### DeepResearch Bench: The Evaluation Standard

**DeepResearch Bench** is the comprehensive benchmark for evaluating Deep Research Agents (DRAs). It consists of **100 PhD-level research tasks** (50 Chinese, 50 English) designed by domain experts across Science & Technology, Finance & Business, Software, and other fields [4].

The benchmark uses two complementary evaluation frameworks:

#### 🎯 RACE Framework (Reference-based Adaptive Criteria-driven Evaluation)

RACE evaluates report generation quality through four key dimensions:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RACE EVALUATION METRICS                         │
│                                                                         │
│  📚 COMPREHENSIVENESS                                                   │
│     Coverage breadth and depth of the research topic                    │
│     → Directly measures how well the INFORMATION GAP was closed         │
│                                                                         │
│  🔍 INSIGHT / DEPTH                                                     │
│     Quality, originality, logic, and value of analysis                  │
│     → Measures analytical quality beyond surface-level facts            │
│                                                                         │
│  📋 INSTRUCTION FOLLOWING                                               │
│     Adherence to task requirements and constraints                      │
│     → Measures alignment with user intent                               │
│                                                                         │
│  📖 READABILITY                                                         │
│     Clarity of structure, fluency, and ease of understanding            │
│     → Measures GENERATION GAP closing (final polish)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Scoring Formula:**
```
Total Score = (Comprehensiveness × W₁) + (Insight × W₂) + 
              (Instruction Following × W₃) + (Readability × W₄)

Where: W₁ + W₂ + W₃ + W₄ = 1.0 (dynamic weights per task)
```

RACE uses **reference-based scoring**, comparing generated reports against high-quality reference reports created by PhD-level experts. This ensures discriminative and reliable evaluation validated against human expert judgments.

#### 🔗 FACT Framework (Factual Abundance and Citation Trustworthiness)

FACT evaluates information retrieval and grounding capabilities:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FACT EVALUATION PROCESS                         │
│                                                                         │
│  1. Statement-URL Extraction                                            │
│     └─ Automatically extract factual claims and their cited sources     │
│                                                                         │
│  2. Deduplication                                                       │
│     └─ Remove redundant statement-URL pairs                             │
│                                                                         │
│  3. Support Verification                                                │
│     └─ Web scraping + LLM judgment to verify citations                  │
│                                                                         │
│  4. Metrics Calculation                                                 │
│     └─ Citation Accuracy: % of correctly supported citations            │
│     └─ Effective Citations: Avg verified citations per task             │
└─────────────────────────────────────────────────────────────────────────┘
```

### How Diffusion Optimizes for These Metrics

The Test-Time Diffusion approach directly targets the RACE metrics:

| RACE Metric | Diffusion Mechanism | Implementation |
|-------------|---------------------|----------------|
| **Comprehensiveness** | Iterative gap-filling loop | `ConductResearch` until no new findings |
| **Insight** | Insightfulness Rules in final generation | Granular breakdown, detailed tables |
| **Instruction Following** | Research brief generation phase | `write_research_brief` from user query |
| **Readability** | Helpfulness Rules + structured draft | `refine_draft_report` + final polish |

For FACT metrics:
- **Citation Accuracy**: Each sub-researcher includes inline citations
- **Effective Citations**: Compression preserves ALL sources with citations

### Empirical Results

ThinkDepth.ai, implementing the Self-Balancing Test-Time Diffusion algorithm, achieved **#1 ranking on DeepResearch Bench** (November 2025) [4]:

| Rank | System | Overall Score | vs ThinkDepth |
|------|--------|---------------|---------------|
| 🥇 | **ThinkDepth.ai** | **52.58** | — |
| 🥈 | Google Gemini 2.5 Pro | 51.16 | -2.78% |
| 🥉 | OpenAI Deep Research | 49.58 | -6.04% |
| 4 | Anthropic Claude | 48.83 | -7.45% |

*Source: [DeepResearch Bench Leaderboard](https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard), November 2025*

### Component-Level Analysis

**Comprehensiveness Score** (Information Gap Closing):

| System | Score | vs ThinkDepth | Why Diffusion Wins |
|--------|-------|---------------|-------------------|
| ThinkDepth.ai | 52.03 | — | Iterative research until findings complete |
| Google Gemini 2.5 Pro | 50.50 | -3.02% | |
| OpenAI Deep Research | 49.29 | -5.57% | |
| Anthropic Claude | 48.36 | -7.58% | |

**Insight Score** (Quality of Analysis):

| System | Score | vs ThinkDepth | Why Diffusion Wins |
|--------|-------|---------------|-------------------|
| ThinkDepth.ai | 53.94 | — | Insightfulness Rules + draft refinement |
| Google Gemini 2.5 Pro | 51.62 | -4.49% | |
| OpenAI Deep Research | 48.94 | -10.21% | |
| Anthropic Claude | 48.79 | -10.54% | |

**Instruction Following Score**:

| System | Score | vs ThinkDepth | Why Diffusion Wins |
|--------|-------|---------------|-------------------|
| ThinkDepth.ai | 52.07 | — | Detailed research brief phase |
| Google Gemini 2.5 Pro | 51.07 | -1.95% | |
| OpenAI Deep Research | 50.67 | -2.68% | |
| Anthropic Claude | 49.67 | -4.61% | |

**Readability Score**:

| System | Score | vs ThinkDepth | Why Diffusion Wins |
|--------|-------|---------------|-------------------|
| ThinkDepth.ai | 50.44 | — | Helpfulness Rules + structured draft |
| Google Gemini 2.5 Pro | 50.22 | -0.44% | |
| OpenAI Deep Research | 48.82 | -3.22% | |
| Anthropic Claude | 48.31 | -4.22% | |

### Why Diffusion Outperforms

1. **Iterative Refinement Catches Gaps** → Higher Comprehensiveness
   - Each iteration identifies and fills missing information
   - Traditional single-pass cannot self-correct
   - Exit based on findings completeness, not draft appearance

2. **Parallel Execution is Efficient** → Better Coverage
   - Up to 3 sub-researchers gather diverse perspectives simultaneously
   - Uses `asyncio.gather()` for true parallel execution
   - Isolated contexts prevent cross-contamination

3. **Explicit Completion Criteria** → Validated Comprehensiveness
   - Research ends based on **findings comprehensiveness**
   - "Run diverse research questions to see if you cannot find new findings"
   - NOT based on draft appearance (which can be misleading)

4. **Self-Balancing Adaptivity** → Right-Sized Research
   - Simple topics: 2-3 iterations
   - Complex topics: 10+ iterations as needed
   - Model dynamically adjusts to task complexity

5. **Draft as Context Anchor** → Higher Readability & Coherence
   - Draft serves as persistent context across iterations
   - Findings accumulate rather than being lost
   - Reduces the "lost in the middle" problem [5]

6. **Quality Rules in Final Generation** → Higher Insight Scores
   - Insightfulness Rules: Granular breakdown, detailed tables, nuanced discussion
   - Helpfulness Rules: User intent, clarity, accuracy, professional language
   - Citation Rules: Proper attribution for verifiable facts

---

## Context Engineering Considerations

### The Context Problem

Long-horizon research tasks face several context challenges [6]:

| Problem | Description | Diffusion Solution |
|---------|-------------|-------------------|
| **Context Poisoning** | Hallucinations enter context | Draft serves as verified state |
| **Context Distraction** | Too much context overwhelms focus | Parallel sub-agents with isolated contexts |
| **Context Confusion** | Superfluous context influences output | Structured finding format with compression |
| **Context Clash** | Parts of context disagree | Supervisor resolves conflicts during refinement |

### Draft as Context Anchor

The draft serves as a **persistent, verified context** that:

1. **Evolves incrementally**: Each `refine_draft_report` call validated
2. **Structures information**: Prevents disorganized accumulation
3. **Guides research**: Makes gaps explicit
4. **Maintains coherence**: Narrative thread across iterations

```
Traditional RAG:              Diffusion Approach:
                              
Query → Search → Response     Query → Brief → Draft → [Research → Refine] × N → Report
                              
Context grows unboundedly     Draft stays ~constant size
No structure                  Structured by sections
Can contradict itself         Conflicts resolved each iteration
```

### Multi-Agent Context Isolation

Sub-researchers operate with **isolated contexts**—they cannot see each other's work:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SUPERVISOR CONTEXT                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ - Full research brief                                               │ │
│ │ - Current draft                                                     │ │
│ │ - Compressed findings from all sub-agents (via ToolMessages)        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                           │                                             │
│    ┌──────────────────────┼──────────────────────┐                      │
│    ▼                      ▼                      ▼                      │
│ ┌──────────┐         ┌──────────┐         ┌──────────┐                  │
│ │ Sub-1    │         │ Sub-2    │         │ Sub-3    │                  │
│ │          │         │          │         │          │                  │
│ │ Isolated │         │ Isolated │         │ Isolated │                  │
│ │ Context  │         │ Context  │         │ Context  │                  │
│ └──────────┘         └──────────┘         └──────────┘                  │
│                                                                         │
│ "When calling ConductResearch, provide complete standalone              │
│  instructions - sub-agents can't see other agents' work"                │
└─────────────────────────────────────────────────────────────────────────┘
```

This prevents:
- Topic A's findings from biasing Topic B's research
- Context growing unboundedly during parallel work
- Confusion from interleaved search results

### Research Compression

Each sub-agent compresses its findings before returning to supervisor:

```python
def compress_research(state: ResearcherState) -> dict:
    """Compress research findings into concise summary."""
    
    # Compression guidelines:
    # - Include ALL relevant information verbatim
    # - Remove obviously irrelevant or duplicate info
    # - Include inline citations for each source
    # - List all sources at the end with citations
    # - Exclude think_tool reflections (internal only)
    
    return {
        "compressed_research": compressed_content,
        "raw_notes": raw_notes
    }
```

---

## Configuration Reference

```python
# Supervisor Configuration
max_researcher_iterations = 15  # Total supervisor tool calls
max_concurrent_researchers = 3   # Parallel sub-agents

# Sub-Researcher Configuration
# Simple queries: 2-3 search calls max
# Complex queries: up to 5 search calls max
# Always stop after 5 if can't find sources

# Search Configuration
max_results_per_query = 3
include_raw_content = True  # For summarization
max_context_length = 250000

# Models (from ThinkDepth.ai implementation)
supervisor_model = "openai:gpt-5"
researcher_model = "openai:gpt-5"
summarization_model = "openai:gpt-5"
compress_model = "openai:gpt-5"  # max_tokens=32000
writer_model = "openai:gpt-5"    # max_tokens=40000
```

---

## References and Further Reading

### Primary Sources

[1] **Google Research** (2025). *Deep Researcher with Test-Time Diffusion*. Google Research Blog.  
https://research.google/blog/deep-researcher-with-test-time-diffusion/

[2] **Paichun Lin** (2025). *Self-Balancing Agentic AI: Test-Time Diffusion and Context Engineering Re-imagined for Deep Research*. Paichun Publication, Substack.  
https://paichunlin.substack.com/p/self-balancing-agentic-ai-test-time

[3] **Richard Sutton** (2019). *The Bitter Lesson*. Incomplete Ideas Blog.  
http://www.incompleteideas.net/IncIdeas/BitterLesson.html

[4] **DeepResearch Bench** (2025). *A Comprehensive Benchmark for Deep Research Agents*.  
- **Leaderboard**: https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard
- **GitHub**: https://github.com/Ayanami0730/deep_research_bench
- **Paper**: https://deepresearch-bench.github.io/static/papers/deepresearch-bench.pdf
- **Website**: https://deepresearch-bench.github.io/

Evaluation Frameworks:
- **RACE**: Reference-based Adaptive Criteria-driven Evaluation (Comprehensiveness, Insight, Instruction Following, Readability)
- **FACT**: Framework for Factual Abundance and Citation Trustworthiness (Citation Accuracy, Effective Citations)

[5] **Liu et al.** (2023). *Lost in the Middle: How Language Models Use Long Contexts*. arXiv:2307.03172

[6] **Anthropic** (2025). *Context Engineering for AI Agents*. Anthropic Research.

### Reference Implementation

- **ThinkDepth.ai** - Production implementation  
  https://thinkdepth.ai

- **ThinkDepth.ai GitHub** - Open source reference implementation (Python)  
  https://github.com/thinkdepthai/Deep_Research

### Key Implementation Files

| File | Purpose |
|------|---------|
| `multi_agent_supervisor.py` | Supervisor node, parallel research execution |
| `research_agent.py` | Sub-researcher implementation |
| `prompts.py` | All prompt templates including diffusion algorithm |
| `state_multi_agent_supervisor.py` | SupervisorState, tool definitions |
| `state_research.py` | ResearcherState definitions |
| `utils.py` | Search, summarization, tools |
| `research_agent_full.py` | Full workflow orchestration |
| `research_agent_scope.py` | Brief generation, draft creation |

---

*This document is based on the ThinkDepth.ai open-source implementation. For Go implementation details, see the adjacent README.md and source files.*
