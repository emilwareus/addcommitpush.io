---
date: 2025-12-03T09:45:00+01:00
researcher: Claude
git_commit: 7a0d7034c05fc3e2dd0010ea7c396615afe9d632
branch: main
repository: go-research
topic: "ThinkDepth.ai Deep Research Architecture Analysis and Implementation Plan"
tags: [research, thinkdepth, deep-research, agentic-ai, architecture, cli-visualization]
status: complete
last_updated: 2025-12-03
last_updated_by: Claude
last_updated_note: "Added comprehensive CLI visualization design section with event types, display components, and example output"
---

# Research: ThinkDepth.ai Deep Research Architecture Analysis and Implementation Plan

**Date**: 2025-12-03T09:45:00+01:00
**Researcher**: Claude
**Git Commit**: 7a0d7034c05fc3e2dd0010ea7c396615afe9d632
**Branch**: main
**Repository**: go-research

## Research Question

Deeply understand the ThinkDepth.ai architecture from the blog post and repository, then create a 1-to-1 implementation plan for integrating it into the existing go-research architecture.

## Summary

ThinkDepth.ai implements a **Self-Balancing Test-Time Diffusion Deep Research** system that achieved #1 ranking on DeepResearch Bench by outperforming Google Gemini, OpenAI, and Claude. The core innovation is explicit reasoning about information gaps vs. generation gaps with two-stage optimization:

1. **Information Collection Stage**: Focus on closing information gaps via web search, minimal generation optimization
2. **Final Report Stage**: Full generation optimization with helpfulness + insightfulness rules

The architecture uses a **Supervisor → Sub-Researcher → Draft Refinement** pattern with iterative diffusion-style denoising of the draft report.

## Detailed Findings

### 1. Core Architecture Overview

ThinkDepth uses a multi-agent supervisor pattern with LangGraph:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FULL WORKFLOW (research_agent_full.py)                                 │
│                                                                         │
│  START → clarify_with_user → write_research_brief → write_draft_report  │
│      → supervisor_subgraph → final_report_generation → END              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  SUPERVISOR SUBGRAPH (multi_agent_supervisor.py)                        │
│                                                                         │
│  START → supervisor → supervisor_tools ←──────────────────┐             │
│             │                │                            │             │
│             │                ├─ ConductResearch (parallel)│             │
│             │                ├─ refine_draft_report       │             │
│             │                ├─ think_tool                │             │
│             │                └─ ResearchComplete          │             │
│             └────────────────┴────────────────────────────┘             │
│                              │                                          │
│                              └─→ END (when complete)                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  RESEARCHER SUB-AGENT (research_agent.py)                               │
│                                                                         │
│  START → llm_call → should_continue? ──┬── tool_node → llm_call (loop)  │
│                                        └── compress_research → END      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Key Components

#### 2.1 Supervisor Agent (Lead Researcher)
- **File**: `multi_agent_supervisor.py`
- **Model Used**: `openai:gpt-5` (in original)
- **Our Model**: `alibaba/tongyi-deepresearch-30b-a3b`
- **Tools Available**:
  - `ConductResearch` - Delegates to sub-agents
  - `refine_draft_report` - Iteratively refines draft
  - `ResearchComplete` - Signals completion
  - `think_tool` - Strategic reflection

#### 2.2 Research Sub-Agent
- **File**: `research_agent.py`
- **Model Used**: `openai:gpt-5` (in original)
- **Tools Available**:
  - `tavily_search` - Web search with summarization
  - `think_tool` - Reflection after each search

#### 2.3 State Management
- `SupervisorState`: supervisor_messages, research_brief, notes, research_iterations, raw_notes, draft_report
- `ResearcherState`: researcher_messages, tool_call_iterations, research_topic, compressed_research, raw_notes
- `AgentState`: messages, research_brief, supervisor_messages, raw_notes, notes, draft_report, final_report

### 3. The Diffusion Algorithm

The core innovation is treating research as a **diffusion process** (like image generation):

```
Diffusion Algorithm:
1. Generate next research questions to address gaps in draft report
2. ConductResearch: retrieve external information (denoising signal)
3. refine_draft_report: remove "noise" (imprecision, incompleteness)
4. CompleteResearch: based on findings completeness, not draft appearance
```

Key insight: **Never complete based on draft report looking good** - always verify by running diverse research questions to check if new findings can be discovered.

### 4. Self-Balancing Rules

#### 4.1 Insightfulness Rules (Applied in Final Report)
- Granular breakdown of topics with specific causes/impacts
- Detailed mapping tables connecting relationships
- Nuanced exploration with explicit discussion

#### 4.2 Helpfulness Rules (Applied in Final Report)
- Direct user intent satisfaction
- Fluent, coherent logical structure
- Factual accuracy
- Appropriate professional tone

**Critical Design Decision**: During information gathering, **intentionally omit Helpfulness Rules** to preserve context space, applying full optimization only during final report generation.

### 5. Context Compression Strategy

#### 5.1 Research Compression (`compress_research_system_prompt`)
- Preserve ALL information from tool calls verbatim
- Clean up but don't summarize
- Include inline citations for each source
- Filter out `think_tool` calls (internal reflections)
- Output structure:
  - List of Queries and Tool Calls Made
  - Fully Comprehensive Findings
  - List of All Relevant Sources

#### 5.2 Draft Report as Context
- Acts as "dynamic context" that guides subsequent research
- Similar to "gradually adding features to an initial prototype"
- Mitigates context pollution, distraction, confusion, and clash

### 6. Tool Implementations

#### 6.1 tavily_search Tool
```python
# Executes search → deduplicates by URL → summarizes raw content → formats output
@tool
def tavily_search(query: str, max_results: int = 3, topic: str = "general") -> str:
    search_results = tavily_search_multiple([query], max_results, topic, include_raw_content=True)
    unique_results = deduplicate_search_results(search_results)
    summarized_results = process_search_results(unique_results)  # Uses LLM summarization
    return format_search_output(summarized_results)
```

#### 6.2 think_tool
```python
@tool
def think_tool(reflection: str) -> str:
    """Strategic reflection on research progress."""
    return f"Reflection recorded: {reflection}"
```

#### 6.3 refine_draft_report Tool
```python
@tool
def refine_draft_report(research_brief: str, findings: str, draft_report: str) -> str:
    """Refines draft report with new findings using LLM."""
    prompt = report_generation_with_draft_insight_prompt.format(...)
    return writer_model.invoke([HumanMessage(content=prompt)]).content
```

### 7. Configuration Constants

From the original implementation:
- `max_researcher_iterations = 15` (tool calls per sub-agent)
- `max_concurrent_researchers = 3` (parallel sub-agents)
- `MAX_CONTEXT_LENGTH = 250000` (for webpage summarization)

### 8. Key Prompts (Detailed Analysis)

#### 8.1 Lead Researcher Prompt (`lead_researcher_with_multiple_steps_diffusion_double_check_prompt`)
- Emphasizes diffusion algorithm
- Critical: "CompleteResearch only based on findings' completeness, not draft report"
- Always run diverse research questions to verify comprehensiveness
- Use parallel ConductResearch for multi-faceted questions

#### 8.2 Research Agent Prompt (`research_agent_prompt`)
- Hard limits: 2-3 searches for simple, up to 5 for complex
- Stop immediately when:
  - Can answer comprehensively
  - Have 3+ relevant examples/sources
  - Last 2 searches returned similar information

#### 8.3 Final Report Prompt (`final_report_generation_with_helpfulness_insightfulness_hit_citation_prompt`)
- Applies both Insightfulness and Helpfulness rules
- Flexible section structure (comparison, list, overview, etc.)
- Strict citation rules with sequential numbering

## Implementation Plan for Go

### File Structure
```
internal/architectures/think_deep/
├── README.md              # Architecture documentation
├── think_deep.go          # Main architecture implementation (like storm.go)
├── think_deep_test.go     # Tests
├── prompts.go             # All prompts
├── state.go               # State definitions
└── tools.go               # ThinkDeep-specific tools (think_tool, refine_draft)

internal/orchestrator/
├── think_deep.go          # ThinkDeep orchestrator (like deep_storm.go)
└── think_deep_test.go

internal/agents/
├── supervisor.go          # Supervisor agent for ThinkDeep
├── supervisor_test.go
├── sub_researcher.go      # Sub-researcher agent
└── sub_researcher_test.go
```

### 1. State Definitions (`state.go`)

```go
package think_deep

// SupervisorState manages the lead researcher's coordination
type SupervisorState struct {
    Messages         []llm.Message
    ResearchBrief    string
    Notes            []string
    RawNotes         []string
    DraftReport      string
    Iterations       int
}

// ResearcherState manages individual sub-researcher state
type ResearcherState struct {
    Messages           []llm.Message
    ResearchTopic      string
    CompressedResearch string
    RawNotes           []string
    Iteration          int
}

// AgentState is the full workflow state
type AgentState struct {
    Messages         []llm.Message
    ResearchBrief    string
    SupervisorState  *SupervisorState
    Notes            []string
    RawNotes         []string
    DraftReport      string
    FinalReport      string
}
```

### 2. Tools Implementation (`tools.go`)

```go
package think_deep

// ThinkTool provides strategic reflection capability
// Original: think_tool in utils.py
type ThinkTool struct{}

func (t *ThinkTool) Name() string { return "think" }
func (t *ThinkTool) Description() string {
    return `Strategic reflection on research progress. Use after each search to analyze results.
Args: {"reflection": "Your detailed reflection on findings, gaps, and next steps"}`
}
func (t *ThinkTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    reflection, _ := args["reflection"].(string)
    return fmt.Sprintf("Reflection recorded: %s", reflection), nil
}

// ConductResearchTool delegates research to sub-agents
// Original: ConductResearch in state_multi_agent_supervisor.py
type ConductResearchTool struct {
    orchestrator *ThinkDeepOrchestrator
}

func (t *ConductResearchTool) Name() string { return "conduct_research" }
func (t *ConductResearchTool) Description() string {
    return `Delegate a research task to a specialized sub-agent.
Args: {"research_topic": "The topic to research (detailed paragraph)"}`
}
func (t *ConductResearchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    topic, _ := args["research_topic"].(string)
    result, err := t.orchestrator.executeSubResearch(ctx, topic)
    if err != nil {
        return "", err
    }
    return result.CompressedResearch, nil
}

// RefineDraftTool updates the draft report with new findings
// Original: refine_draft_report in utils.py
type RefineDraftTool struct {
    client llm.ChatClient
    state  *SupervisorState
}

func (t *RefineDraftTool) Name() string { return "refine_draft" }
func (t *RefineDraftTool) Description() string {
    return "Refine the draft report with new research findings. No arguments needed."
}
func (t *RefineDraftTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    findings := strings.Join(t.state.Notes, "\n")
    prompt := RefineDraftPrompt(t.state.ResearchBrief, findings, t.state.DraftReport)
    resp, err := t.client.Chat(ctx, []llm.Message{{Role: "user", Content: prompt}})
    if err != nil {
        return "", err
    }
    return resp.Choices[0].Message.Content, nil
}

// ResearchCompleteTool signals research completion
type ResearchCompleteTool struct{}

func (t *ResearchCompleteTool) Name() string { return "research_complete" }
func (t *ResearchCompleteTool) Description() string {
    return "Signal that research is complete. Use only when findings are comprehensive."
}
func (t *ResearchCompleteTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    return "Research marked as complete", nil
}
```

### 3. Prompts (`prompts.go`)

```go
package think_deep

import "fmt"

// LeadResearcherPrompt is the supervisor prompt
// Original: lead_researcher_with_multiple_steps_diffusion_double_check_prompt
func LeadResearcherPrompt(date string, maxConcurrent, maxIterations int) string {
    return fmt.Sprintf(`You are a research supervisor. Your job is to conduct research by calling the "conduct_research" tool and refine the draft report by calling "refine_draft" tool. Today's date is %s.

<Diffusion Algorithm>
1. Generate next research questions to address gaps in the draft report
2. **conduct_research**: retrieve external information to provide concrete delta for denoising
3. **refine_draft**: remove "noise" (imprecision, incompleteness) from the draft report
4. **research_complete**: complete research only based on findings' completeness. Even if the draft report looks complete, continue until all research findings are collected.
</Diffusion Algorithm>

<Available Tools>
1. **conduct_research**: Delegate research tasks to specialized sub-agents
2. **refine_draft**: Refine draft report using findings from conduct_research
3. **research_complete**: Signal research completion
4. **think**: Strategic reflection and planning

**CRITICAL**: Use think before and after conduct_research to plan approach and assess progress.
**PARALLEL RESEARCH**: Make multiple conduct_research calls in a single response for independent sub-topics. Use at most %d parallel agents.
</Available Tools>

<Hard Limits>
- Stop after %d tool calls total
- Bias towards single agent unless clear parallelization opportunity
</Hard Limits>

<Show Your Thinking>
Before conduct_research: Can the task be broken down?
After conduct_research: What key info found? What's missing? Should I continue or complete?
</Show Your Thinking>`, date, maxConcurrent, maxIterations)
}

// ResearchAgentPrompt for sub-researchers
// Original: research_agent_prompt
func ResearchAgentPrompt(date string) string {
    return fmt.Sprintf(`You are a research assistant conducting research. Today's date is %s.

<Available Tools>
1. **search**: Web search to gather information
2. **think**: Reflection and strategic planning

**CRITICAL**: Use think after each search to reflect on results.
</Available Tools>

<Hard Limits>
- Simple queries: 2-3 search calls maximum
- Complex queries: up to 5 search calls
- Stop immediately when:
  - Can answer comprehensively
  - Have 3+ relevant sources
  - Last 2 searches returned similar info
</Hard Limits>`, date)
}

// CompressResearchPrompt for context compression
// Original: compress_research_system_prompt + compress_research_human_message
func CompressResearchPrompt(date, researchTopic string) string {
    return fmt.Sprintf(`You are a research assistant. Clean up findings but preserve ALL relevant information verbatim. Today: %s.

<Task>
Clean up information from tool calls and searches. ALL relevant info should be preserved verbatim in cleaner format.
</Task>

<Tool Call Filtering>
- INCLUDE: All search results and findings from web searches
- EXCLUDE: think tool calls (internal reflections)
</Tool Call Filtering>

<Guidelines>
1. Output should be fully comprehensive - repeat key information verbatim
2. Include inline citations for each source
3. Include "Sources" section listing all sources with citations
</Guidelines>

<Output Format>
**List of Queries and Tool Calls Made**
**Fully Comprehensive Findings**
**List of All Relevant Sources (with citations)**
</Output Format>

RESEARCH TOPIC: %s

CRITICAL: Preserve all information verbatim. This will be used for final report generation.`, date, researchTopic)
}

// FinalReportPrompt for the final synthesis
// Original: final_report_generation_with_helpfulness_insightfulness_hit_citation_prompt
func FinalReportPrompt(researchBrief, findings, draftReport, date string) string {
    return fmt.Sprintf(`Create a comprehensive answer to the research brief:
<Research Brief>
%s
</Research Brief>

Today's date is %s.

<Findings>
%s
</Findings>

<Draft Report>
%s
</Draft Report>

Create a detailed answer that:
1. Is well-organized with proper headings (# title, ## sections, ### subsections)
2. Includes specific facts and insights from research
3. References sources using [Title](URL) format
4. Provides balanced, thorough analysis
5. Includes "Sources" section at the end

<Insightfulness Rules>
- Granular breakdown of topics with specific causes and impacts
- Detailed mapping table connecting relationships
- Nuanced discussion with explicit exploration
</Insightfulness Rules>

<Helpfulness Rules>
- Satisfies user intent directly
- Fluent, coherent, logically structured
- Accurate facts and reasoning
- Appropriate professional tone
</Helpfulness Rules>

<Citation Rules>
- Assign each unique URL a single citation number
- End with ### Sources listing each source sequentially [1], [2], [3]...
</Citation Rules>`, researchBrief, date, findings, draftReport)
}

// RefineDraftPrompt for iterative draft refinement
// Original: report_generation_with_draft_insight_prompt
func RefineDraftPrompt(researchBrief, findings, draftReport string) string {
    return fmt.Sprintf(`Based on research and draft report, create refined report:
<Research Brief>
%s
</Research Brief>

<Draft Report>
%s
</Draft Report>

<Findings>
%s
</Findings>

Create refined report that:
1. Well-organized with proper headings
2. Includes facts and insights from research
3. References sources using [Title](URL) format
4. Comprehensive and thorough

Use ## for section titles. Keep sections as long as needed for thorough answers.`, researchBrief, draftReport, findings)
}

// InitialDraftPrompt for generating initial draft from research brief
// Original: draft_report_generation_prompt
func InitialDraftPrompt(researchBrief, date string) string {
    return fmt.Sprintf(`Based on knowledge, create initial draft report for:
<Research Brief>
%s
</Research Brief>

Today's date is %s.

Create structured outline with:
1. Proper headings (# title, ## sections, ### subsections)
2. Key topics to cover
3. Placeholder sections for research findings

This draft will be iteratively refined with research findings.`, researchBrief, date)
}
```

### 4. Supervisor Agent (`internal/agents/supervisor.go`)

```go
package agents

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"

    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/session"
    "go-research/internal/tools"
)

// SupervisorAgent coordinates ThinkDeep research using diffusion algorithm
type SupervisorAgent struct {
    client        llm.ChatClient
    tools         *SupervisorTools  // Custom tool set
    bus           *events.Bus
    maxIterations int
    model         string
}

type SupervisorConfig struct {
    MaxIterations      int
    MaxConcurrentSubs  int
}

func DefaultSupervisorConfig() SupervisorConfig {
    return SupervisorConfig{
        MaxIterations:      15,
        MaxConcurrentSubs:  3,
    }
}

func NewSupervisorAgent(client llm.ChatClient, bus *events.Bus, cfg SupervisorConfig) *SupervisorAgent {
    return &SupervisorAgent{
        client:        client,
        bus:           bus,
        maxIterations: cfg.MaxIterations,
        model:         client.GetModel(),
    }
}

// SupervisorResult contains the output of supervisor coordination
type SupervisorResult struct {
    Notes       []string
    RawNotes    []string
    DraftReport string
    Cost        session.CostBreakdown
}

// Coordinate runs the supervisor loop until research complete or max iterations
func (s *SupervisorAgent) Coordinate(
    ctx context.Context,
    researchBrief string,
    initialDraft string,
    subResearcher func(ctx context.Context, topic string) (*SubResearcherResult, error),
) (*SupervisorResult, error) {
    state := &SupervisorState{
        ResearchBrief: researchBrief,
        DraftReport:   initialDraft,
        Notes:         []string{},
        RawNotes:      []string{},
        Iterations:    0,
    }

    var totalCost session.CostBreakdown

    for state.Iterations < s.maxIterations {
        state.Iterations++

        // Build messages with system prompt
        systemPrompt := LeadResearcherPrompt(getDateStr(), 3, s.maxIterations)
        messages := []llm.Message{
            {Role: "system", Content: systemPrompt},
        }
        // Add conversation history...
        messages = append(messages, state.Messages...)

        // Get supervisor decision
        resp, err := s.client.Chat(ctx, messages)
        if err != nil {
            return nil, fmt.Errorf("supervisor call: %w", err)
        }
        totalCost.Add(session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens))

        // Parse tool calls from response
        toolCalls := parseToolCalls(resp.Choices[0].Message.Content)

        // Check for completion
        if hasResearchComplete(toolCalls) {
            break
        }

        // Execute tool calls
        for _, tc := range toolCalls {
            switch tc.Name {
            case "conduct_research":
                // Run sub-researcher
                topic := tc.Args["research_topic"].(string)
                result, err := subResearcher(ctx, topic)
                if err != nil {
                    continue
                }
                state.Notes = append(state.Notes, result.CompressedResearch)
                state.RawNotes = append(state.RawNotes, result.RawNotes...)

            case "refine_draft":
                // Refine draft with current notes
                newDraft, cost, err := s.refineDraft(ctx, state)
                if err != nil {
                    continue
                }
                state.DraftReport = newDraft
                totalCost.Add(cost)

            case "think":
                // Just record reflection
                // No action needed - it's for model's own reasoning
            }
        }
    }

    return &SupervisorResult{
        Notes:       state.Notes,
        RawNotes:    state.RawNotes,
        DraftReport: state.DraftReport,
        Cost:        totalCost,
    }, nil
}
```

### 5. Sub-Researcher Agent (`internal/agents/sub_researcher.go`)

```go
package agents

import (
    "context"
    "fmt"

    "go-research/internal/llm"
    "go-research/internal/session"
    "go-research/internal/tools"
)

// SubResearcherAgent performs focused research on a specific topic
type SubResearcherAgent struct {
    client        llm.ChatClient
    tools         tools.ToolExecutor
    maxIterations int
    model         string
}

type SubResearcherConfig struct {
    MaxIterations int  // Default: 5 (simple), up to 10 (complex)
}

func DefaultSubResearcherConfig() SubResearcherConfig {
    return SubResearcherConfig{MaxIterations: 5}
}

func NewSubResearcherAgent(client llm.ChatClient, toolExec tools.ToolExecutor, cfg SubResearcherConfig) *SubResearcherAgent {
    return &SubResearcherAgent{
        client:        client,
        tools:         toolExec,
        maxIterations: cfg.MaxIterations,
        model:         client.GetModel(),
    }
}

// SubResearcherResult contains compressed research findings
type SubResearcherResult struct {
    CompressedResearch string
    RawNotes           []string
    Cost               session.CostBreakdown
}

// Research performs iterative search and compression
func (r *SubResearcherAgent) Research(ctx context.Context, topic string) (*SubResearcherResult, error) {
    var messages []llm.Message
    var rawNotes []string
    var totalCost session.CostBreakdown

    systemPrompt := ResearchAgentPrompt(getDateStr())
    messages = append(messages, llm.Message{Role: "system", Content: systemPrompt})
    messages = append(messages, llm.Message{Role: "user", Content: topic})

    for i := 0; i < r.maxIterations; i++ {
        resp, err := r.client.Chat(ctx, messages)
        if err != nil {
            return nil, fmt.Errorf("sub-researcher call: %w", err)
        }
        totalCost.Add(session.NewCostBreakdown(r.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens))

        content := resp.Choices[0].Message.Content
        messages = append(messages, llm.Message{Role: "assistant", Content: content})

        toolCalls := parseToolCalls(content)
        if len(toolCalls) == 0 {
            // No more tool calls - research complete
            break
        }

        // Execute tool calls
        for _, tc := range toolCalls {
            var result string
            switch tc.Name {
            case "search":
                result, _ = r.tools.Execute(ctx, "search", tc.Args)
                rawNotes = append(rawNotes, result)
            case "think":
                result = fmt.Sprintf("Reflection recorded: %s", tc.Args["reflection"])
            }
            messages = append(messages, llm.Message{Role: "tool", Content: result})
        }
    }

    // Compress research
    compressed, cost, err := r.compressResearch(ctx, topic, messages)
    if err != nil {
        return nil, fmt.Errorf("compress research: %w", err)
    }
    totalCost.Add(cost)

    return &SubResearcherResult{
        CompressedResearch: compressed,
        RawNotes:           rawNotes,
        Cost:               totalCost,
    }, nil
}

func (r *SubResearcherAgent) compressResearch(ctx context.Context, topic string, messages []llm.Message) (string, session.CostBreakdown, error) {
    compressPrompt := CompressResearchPrompt(getDateStr(), topic)

    // Build compression context
    compressMessages := []llm.Message{
        {Role: "system", Content: compressPrompt},
    }
    // Add research messages for compression context
    for _, m := range messages {
        if m.Role == "tool" || m.Role == "assistant" {
            compressMessages = append(compressMessages, m)
        }
    }
    compressMessages = append(compressMessages, llm.Message{Role: "user", Content: "Please compress the research findings."})

    resp, err := r.client.Chat(ctx, compressMessages)
    if err != nil {
        return "", session.CostBreakdown{}, err
    }

    cost := session.NewCostBreakdown(r.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
    return resp.Choices[0].Message.Content, cost, nil
}
```

### 6. ThinkDeep Orchestrator (`internal/orchestrator/think_deep.go`)

```go
package orchestrator

import (
    "context"
    "fmt"
    "sync"
    "time"

    "go-research/internal/agents"
    "go-research/internal/config"
    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/session"
    "go-research/internal/tools"
)

// ThinkDeepOrchestrator coordinates ThinkDepth-style research
// Uses Self-Balancing Test-Time Diffusion approach
type ThinkDeepOrchestrator struct {
    bus           *events.Bus
    appConfig     *config.Config
    client        llm.ChatClient
    tools         tools.ToolExecutor
    supervisor    *agents.SupervisorAgent
    subResearcher *agents.SubResearcherAgent
}

type ThinkDeepConfig struct {
    MaxSupervisorIterations int
    MaxSubResearcherIter    int
    MaxConcurrentResearch   int
}

func DefaultThinkDeepConfig() ThinkDeepConfig {
    return ThinkDeepConfig{
        MaxSupervisorIterations: 15,
        MaxSubResearcherIter:    5,
        MaxConcurrentResearch:   3,
    }
}

func NewThinkDeepOrchestrator(bus *events.Bus, cfg *config.Config, opts ...ThinkDeepOption) *ThinkDeepOrchestrator {
    client := llm.NewClient(cfg)
    toolReg := tools.NewRegistry(cfg.BraveAPIKey)

    o := &ThinkDeepOrchestrator{
        bus:       bus,
        appConfig: cfg,
        client:    client,
        tools:     toolReg,
    }

    o.supervisor = agents.NewSupervisorAgent(client, bus, agents.DefaultSupervisorConfig())
    o.subResearcher = agents.NewSubResearcherAgent(client, toolReg, agents.DefaultSubResearcherConfig())

    for _, opt := range opts {
        opt(o)
    }

    return o
}

// ThinkDeepResult contains the output of ThinkDeep research
type ThinkDeepResult struct {
    Query          string
    ResearchBrief  string
    Notes          []string
    DraftReport    string
    FinalReport    string
    Cost           session.CostBreakdown
    Duration       time.Duration
}

// Research executes the ThinkDeep workflow
func (o *ThinkDeepOrchestrator) Research(ctx context.Context, query string) (*ThinkDeepResult, error) {
    startTime := time.Now()
    var totalCost session.CostBreakdown

    // Emit start event
    o.bus.Publish(events.Event{
        Type:      events.EventResearchStarted,
        Timestamp: time.Now(),
        Data: events.ResearchStartedData{
            Query: query,
            Mode:  "think-deep-diffusion",
        },
    })

    // Phase 1: Generate research brief from query
    researchBrief, briefCost, err := o.generateResearchBrief(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("generate research brief: %w", err)
    }
    totalCost.Add(briefCost)

    // Phase 2: Generate initial draft report (from model's knowledge)
    initialDraft, draftCost, err := o.generateInitialDraft(ctx, researchBrief)
    if err != nil {
        return nil, fmt.Errorf("generate initial draft: %w", err)
    }
    totalCost.Add(draftCost)

    // Phase 3: Supervisor coordination with diffusion refinement
    o.bus.Publish(events.Event{
        Type:      events.EventAnalysisStarted,
        Timestamp: time.Now(),
        Data: map[string]interface{}{
            "message": "Starting diffusion-based research refinement...",
        },
    })

    supervisorResult, err := o.supervisor.Coordinate(
        ctx,
        researchBrief,
        initialDraft,
        o.executeSubResearch,  // Sub-researcher callback
    )
    if err != nil {
        return nil, fmt.Errorf("supervisor coordination: %w", err)
    }
    totalCost.Add(supervisorResult.Cost)

    // Phase 4: Final report generation (full optimization)
    o.bus.Publish(events.Event{
        Type:      events.EventSynthesisStarted,
        Timestamp: time.Now(),
        Data: map[string]interface{}{
            "message": "Generating final report with full optimization...",
        },
    })

    finalReport, reportCost, err := o.generateFinalReport(ctx, researchBrief, supervisorResult)
    if err != nil {
        return nil, fmt.Errorf("final report generation: %w", err)
    }
    totalCost.Add(reportCost)

    o.bus.Publish(events.Event{
        Type:      events.EventSynthesisComplete,
        Timestamp: time.Now(),
    })

    return &ThinkDeepResult{
        Query:         query,
        ResearchBrief: researchBrief,
        Notes:         supervisorResult.Notes,
        DraftReport:   supervisorResult.DraftReport,
        FinalReport:   finalReport,
        Cost:          totalCost,
        Duration:      time.Since(startTime),
    }, nil
}

// executeSubResearch runs a sub-researcher agent
func (o *ThinkDeepOrchestrator) executeSubResearch(ctx context.Context, topic string) (*agents.SubResearcherResult, error) {
    return o.subResearcher.Research(ctx, topic)
}

func (o *ThinkDeepOrchestrator) generateResearchBrief(ctx context.Context, query string) (string, session.CostBreakdown, error) {
    // Transform query into detailed research brief
    prompt := TransformToResearchBriefPrompt(query, getDateStr())
    resp, err := o.client.Chat(ctx, []llm.Message{{Role: "user", Content: prompt}})
    if err != nil {
        return "", session.CostBreakdown{}, err
    }
    cost := session.NewCostBreakdown(o.client.GetModel(), resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
    return resp.Choices[0].Message.Content, cost, nil
}

func (o *ThinkDeepOrchestrator) generateInitialDraft(ctx context.Context, brief string) (string, session.CostBreakdown, error) {
    prompt := InitialDraftPrompt(brief, getDateStr())
    resp, err := o.client.Chat(ctx, []llm.Message{{Role: "user", Content: prompt}})
    if err != nil {
        return "", session.CostBreakdown{}, err
    }
    cost := session.NewCostBreakdown(o.client.GetModel(), resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
    return resp.Choices[0].Message.Content, cost, nil
}

func (o *ThinkDeepOrchestrator) generateFinalReport(ctx context.Context, brief string, supervisor *agents.SupervisorResult) (string, session.CostBreakdown, error) {
    findings := strings.Join(supervisor.Notes, "\n---\n")
    prompt := FinalReportPrompt(brief, findings, supervisor.DraftReport, getDateStr())
    resp, err := o.client.Chat(ctx, []llm.Message{{Role: "user", Content: prompt}})
    if err != nil {
        return "", session.CostBreakdown{}, err
    }
    cost := session.NewCostBreakdown(o.client.GetModel(), resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
    return resp.Choices[0].Message.Content, cost, nil
}
```

### 7. Architecture Registration (`internal/architectures/think_deep/think_deep.go`)

```go
package think_deep

import (
    "context"
    "fmt"
    "time"

    "go-research/internal/architectures"
    "go-research/internal/architectures/catalog"
    "go-research/internal/config"
    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/orchestrator"
    "go-research/internal/tools"
)

// Architecture implements the ThinkDepth research pattern
// Original model: OpenAI GPT-5
// Our model: alibaba/tongyi-deepresearch-30b-a3b
type Architecture struct {
    bus    *events.Bus
    config *config.Config
    client llm.ChatClient
    tools  tools.ToolExecutor
}

type Config struct {
    AppConfig *config.Config
    Bus       *events.Bus
    Client    llm.ChatClient
    Tools     tools.ToolExecutor
}

func New(cfg Config) *Architecture {
    return &Architecture{
        bus:    cfg.Bus,
        config: cfg.AppConfig,
        client: cfg.Client,
        tools:  cfg.Tools,
    }
}

func (a *Architecture) Name() string { return "think_deep" }

func (a *Architecture) Description() string {
    return "ThinkDepth: Self-Balancing Test-Time Diffusion Deep Research (GPT-5 in original)"
}

func (a *Architecture) SupportsResume() bool { return false }

func (a *Architecture) Research(ctx context.Context, sessionID string, query string) (*architectures.Result, error) {
    startTime := time.Now()

    // Create orchestrator
    opts := []orchestrator.ThinkDeepOption{}
    if a.client != nil {
        opts = append(opts, orchestrator.WithThinkDeepClient(a.client))
    }
    if a.tools != nil {
        opts = append(opts, orchestrator.WithThinkDeepTools(a.tools))
    }

    orch := orchestrator.NewThinkDeepOrchestrator(a.bus, a.config, opts...)

    result, err := orch.Research(ctx, query)
    if err != nil {
        return &architectures.Result{
            SessionID: sessionID,
            Query:     query,
            Status:    "failed",
            Error:     err.Error(),
            Metrics:   architectures.Metrics{Duration: time.Since(startTime)},
        }, err
    }

    return &architectures.Result{
        SessionID: sessionID,
        Query:     query,
        Report:    result.FinalReport,
        Summary:   result.ResearchBrief,
        Status:    "complete",
        Metrics: architectures.Metrics{
            Duration:   result.Duration,
            Cost:       result.Cost,
            Iterations: len(result.Notes),
        },
    }, nil
}

func (a *Architecture) Resume(ctx context.Context, sessionID string) (*architectures.Result, error) {
    return nil, fmt.Errorf("resume not supported for ThinkDepth")
}

var _ architectures.Architecture = (*Architecture)(nil)

func init() {
    catalog.Register(catalog.Definition{
        Name:           "think_deep",
        Description:    "ThinkDepth: Self-Balancing Test-Time Diffusion Deep Research",
        SupportsResume: false,
        Build: func(deps catalog.Dependencies) (architectures.Architecture, error) {
            if deps.Config == nil {
                return nil, fmt.Errorf("config required for think_deep")
            }
            return New(Config{
                AppConfig: deps.Config,
                Bus:       deps.Bus,
            }), nil
        },
    })
}
```

## Code References

- `external_code/Deep_Research/src/multi_agent_supervisor.py:85-119` - Supervisor agent implementation
- `external_code/Deep_Research/src/research_agent.py:32-143` - Sub-researcher agent with tool loop
- `external_code/Deep_Research/src/prompts.py:196-261` - Lead researcher diffusion prompt
- `external_code/Deep_Research/src/prompts.py:326-426` - Final report with insightfulness/helpfulness rules
- `external_code/Deep_Research/src/utils.py:182-241` - tavily_search and think_tool
- `internal/architectures/storm/storm.go:56-214` - Reference Go architecture pattern
- `internal/orchestrator/deep_storm.go:59-368` - Reference Go orchestrator pattern

## Architecture Insights

### Key Design Decisions

1. **Two-Stage Optimization**: Information collection focuses on closing information gaps (minimal generation optimization), final report applies full helpfulness + insightfulness rules

2. **Diffusion as Metaphor**: Draft report acts as "noisy" initial state, research progressively "denoises" by adding concrete facts

3. **Completion Criterion**: Never complete based on draft appearance - always verify by generating diverse research questions to check if new findings exist

4. **Context Engineering**:
   - Compress sub-researcher findings verbatim (no summarization)
   - Filter out think_tool calls from final context
   - Draft report acts as dynamic context guide

5. **Parallel Sub-Agents**: Up to 3 concurrent sub-researchers for independent topics

### Model Mapping
| Original Model | Our Model |
|----------------|-----------|
| `openai:gpt-5` | `alibaba/tongyi-deepresearch-30b-a3b` |
| Tavily Search | Brave Search (existing) |

### Configuration Mapping
| Original | Our Go Implementation |
|----------|----------------------|
| `max_researcher_iterations = 15` | `MaxSupervisorIterations = 15` |
| `max_concurrent_researchers = 3` | `MaxConcurrentResearch = 3` |
| `MAX_CONTEXT_LENGTH = 250000` | (handled by model) |

## Open Questions

1. **Structured Output**: Original uses LangChain's `with_structured_output()` for some prompts - need to decide if we parse JSON from response or use simpler format
2. **Tool Calling**: Original uses LangChain tool binding - we need to parse tool calls from model response text
3. **Webpage Summarization**: Original summarizes raw Tavily content with separate LLM call - consider if needed with Brave
4. **Language Detection**: Original has extensive multi-language support prompts - evaluate if needed

## CLI Visualization Design

The existing go-research codebase has a sophisticated event-driven visualization system. For ThinkDeep, we need to extend this with diffusion-specific visualizations that clearly communicate the iterative refinement process.

### Event Types for ThinkDeep (`internal/events/types.go`)

Add these new event types to support ThinkDeep visualization:

```go
// ThinkDeep Diffusion Events
EventDiffusionStarted        // Starting diffusion research
EventDiffusionIterationStart // New iteration of diffusion loop
EventDraftRefined            // Draft report was refined
EventResearchDelegated       // Supervisor delegated to sub-researcher
EventSubResearcherStarted    // Sub-researcher began work
EventSubResearcherProgress   // Sub-researcher search/think progress
EventSubResearcherComplete   // Sub-researcher finished
EventDiffusionComplete       // Diffusion phase complete
EventFinalReportStarted      // Full optimization phase started
EventFinalReportComplete     // Final report generated
```

#### Event Data Structures

```go
// DiffusionIterationData captures diffusion loop progress
type DiffusionIterationData struct {
    Iteration       int     // Current iteration (1-based)
    MaxIterations   int     // Max iterations configured
    NotesCount      int     // Total compressed notes collected
    DraftProgress   float64 // 0.0-1.0 estimated draft completeness
    Phase           string  // "research", "refine", "thinking"
    Message         string  // Status message
}

// SubResearcherData captures sub-researcher activity
type SubResearcherData struct {
    Topic           string  // Research topic
    ResearcherNum   int     // Sub-researcher number (for parallel)
    Iteration       int     // Search iteration within sub-researcher
    MaxIterations   int     // Max searches
    Status          string  // "searching", "thinking", "compressing"
    SourcesFound    int     // Number of sources found so far
}

// DraftRefinedData captures draft refinement events
type DraftRefinedData struct {
    Iteration       int     // Diffusion iteration
    SectionsUpdated int     // Number of sections modified
    NewSources      int     // New sources incorporated
    Progress        float64 // Estimated progress
}
```

### Diffusion Display Component (`internal/repl/diffusion_display.go`)

Create a new display component specifically for visualizing the diffusion process:

```go
package repl

import (
    "fmt"
    "io"
    "strings"
    "sync"

    "go-research/internal/events"
    "github.com/fatih/color"
)

// DiffusionDisplay renders ThinkDeep's iterative diffusion process
type DiffusionDisplay struct {
    w               io.Writer
    mu              sync.Mutex
    iteration       int
    maxIterations   int
    subResearchers  map[int]*SubResearcherPanel
    draftProgress   float64
    phase           string
    started         bool
}

type SubResearcherPanel struct {
    Num            int
    Topic          string
    Status         string
    SourcesFound   int
    SearchIteration int
}

func NewDiffusionDisplay(w io.Writer) *DiffusionDisplay {
    return &DiffusionDisplay{
        w:              w,
        subResearchers: make(map[int]*SubResearcherPanel),
    }
}

// Render draws the initial diffusion plan visualization
func (d *DiffusionDisplay) Render(topic string, maxIterations int) {
    d.renderHeader(topic)
    d.renderDiffusionFlow(maxIterations)
    d.renderFooter()
}

func (d *DiffusionDisplay) renderHeader(topic string) {
    headerColor := color.New(color.FgHiMagenta, color.Bold)
    boxColor := color.New(color.FgMagenta)

    fmt.Fprintln(d.w)
    boxColor.Fprintln(d.w, "╭──────────────────────────────────────────────────────────────────────────────╮")
    headerColor.Fprintf(d.w, "│%s│\n", centerText("🧠 THINKDEEP DIFFUSION RESEARCH", 78))
    boxColor.Fprintln(d.w, "│                                                                              │")

    maxLen := 68
    displayTopic := topic
    if len(displayTopic) > maxLen {
        displayTopic = displayTopic[:maxLen-3] + "..."
    }
    fmt.Fprintf(d.w, "│  Topic: %-70s│\n", displayTopic)
    boxColor.Fprintln(d.w, "╰──────────────────────────────────────────────────────────────────────────────╯")
    fmt.Fprintln(d.w)
}

func (d *DiffusionDisplay) renderDiffusionFlow(maxIter int) {
    dimColor := color.New(color.Faint)
    briefColor := color.New(color.FgHiBlue)
    draftColor := color.New(color.FgHiYellow)
    diffuseColor := color.New(color.FgHiMagenta)
    reportColor := color.New(color.FgHiGreen)

    // Phase 1: BRIEF
    d.renderPhaseBox(briefColor, "1. BRIEF", "Generate Query")
    dimColor.Fprintln(d.w, strings.Repeat(" ", 39)+"│")

    // Phase 2: DRAFT
    d.renderPhaseBox(draftColor, "2. DRAFT", "Initial Report")
    dimColor.Fprintln(d.w, strings.Repeat(" ", 39)+"│")

    // Phase 3: DIFFUSE (the iterative loop)
    d.renderDiffusionLoop(diffuseColor, maxIter)
    dimColor.Fprintln(d.w, strings.Repeat(" ", 39)+"│")

    // Phase 4: FINALIZE
    d.renderPhaseBox(reportColor, "4. FINALIZE", "Full Optimize")

    fmt.Fprintln(d.w)
}

func (d *DiffusionDisplay) renderDiffusionLoop(c *color.Color, maxIter int) {
    dimColor := color.New(color.Faint)
    boxWidth := 50
    padding := (80 - boxWidth) / 2
    padStr := strings.Repeat(" ", padding)

    // Top of diffusion box
    dimColor.Fprintf(d.w, "%s┌%s┐\n", padStr, strings.Repeat("─", boxWidth-2))

    // Title
    title := "3. DIFFUSE (Iterative Refinement)"
    titlePad := boxWidth - 2 - len(title)
    dimColor.Fprintf(d.w, "%s│", padStr)
    c.Fprintf(d.w, "%s%s", title, strings.Repeat(" ", titlePad))
    dimColor.Fprintln(d.w, "│")

    // Loop visualization
    loopStr := fmt.Sprintf("  ┌─→ ConductResearch ─→ refine_draft ─┐")
    dimColor.Fprintf(d.w, "%s│%s│\n", padStr, fmt.Sprintf("%-48s", loopStr))

    loopStr2 := fmt.Sprintf("  │                                     │")
    dimColor.Fprintf(d.w, "%s│%s│\n", padStr, fmt.Sprintf("%-48s", loopStr2))

    loopStr3 := fmt.Sprintf("  └──── think (max %d iterations) ←────┘", maxIter)
    dimColor.Fprintf(d.w, "%s│%s│\n", padStr, fmt.Sprintf("%-48s", loopStr3))

    // Bottom of diffusion box
    dimColor.Fprintf(d.w, "%s└%s┘\n", padStr, strings.Repeat("─", boxWidth-2))
}

func (d *DiffusionDisplay) renderPhaseBox(c *color.Color, title, subtitle string) {
    boxWidth := 18
    padding := (80 - boxWidth) / 2
    padStr := strings.Repeat(" ", padding)
    dimColor := color.New(color.Faint)

    dimColor.Fprintf(d.w, "%s┌%s┐\n", padStr, strings.Repeat("─", boxWidth-2))

    titlePad := boxWidth - 2 - len(title)
    dimColor.Fprintf(d.w, "%s│", padStr)
    c.Fprintf(d.w, "%s%s", title, strings.Repeat(" ", titlePad))
    dimColor.Fprintln(d.w, "│")

    subtitlePad := boxWidth - 2 - len(subtitle)
    dimColor.Fprintf(d.w, "%s│", padStr)
    c.Fprintf(d.w, "%s%s", subtitle, strings.Repeat(" ", subtitlePad))
    dimColor.Fprintln(d.w, "│")

    dimColor.Fprintf(d.w, "%s└%s┘\n", padStr, strings.Repeat("─", boxWidth-2))
}

func (d *DiffusionDisplay) renderFooter() {
    dimColor := color.New(color.Faint)
    fmt.Fprintln(d.w)
    dimColor.Fprintln(d.w, centerText("Starting diffusion research...", 80))
    fmt.Fprintln(d.w)
}

// HandleEvent processes ThinkDeep-specific events
func (d *DiffusionDisplay) HandleEvent(event events.Event) {
    d.mu.Lock()
    defer d.mu.Unlock()

    switch event.Type {
    case events.EventDiffusionIterationStart:
        if data, ok := event.Data.(events.DiffusionIterationData); ok {
            d.iteration = data.Iteration
            d.maxIterations = data.MaxIterations
            d.renderIterationHeader(data)
        }

    case events.EventResearchDelegated:
        if data, ok := event.Data.(events.SubResearcherData); ok {
            d.subResearchers[data.ResearcherNum] = &SubResearcherPanel{
                Num:    data.ResearcherNum,
                Topic:  data.Topic,
                Status: "starting",
            }
            d.renderSubResearcherStatus(data)
        }

    case events.EventSubResearcherProgress:
        if data, ok := event.Data.(events.SubResearcherData); ok {
            if panel, ok := d.subResearchers[data.ResearcherNum]; ok {
                panel.Status = data.Status
                panel.SourcesFound = data.SourcesFound
                panel.SearchIteration = data.Iteration
            }
            d.renderSubResearcherStatus(data)
        }

    case events.EventDraftRefined:
        if data, ok := event.Data.(events.DraftRefinedData); ok {
            d.draftProgress = data.Progress
            d.renderDraftRefined(data)
        }
    }
}

func (d *DiffusionDisplay) renderIterationHeader(data events.DiffusionIterationData) {
    iterColor := color.New(color.FgHiMagenta, color.Bold)
    fmt.Fprintln(d.w)
    iterColor.Fprintf(d.w, "┌─ Diffusion Iteration %d/%d %s\n",
        data.Iteration, data.MaxIterations, strings.Repeat("─", 50))
}

func (d *DiffusionDisplay) renderSubResearcherStatus(data events.SubResearcherData) {
    statusColor := color.New(color.FgYellow)
    topicTrunc := data.Topic
    if len(topicTrunc) > 50 {
        topicTrunc = topicTrunc[:47] + "..."
    }

    icon := "⚡"
    switch data.Status {
    case "searching":
        icon = "🔍"
    case "thinking":
        icon = "💭"
    case "compressing":
        icon = "📦"
    case "complete":
        icon = "✓"
        statusColor = color.New(color.FgGreen)
    }

    statusColor.Fprintf(d.w, "│ %s Sub-researcher %d: %s [%d sources]\n",
        icon, data.ResearcherNum, topicTrunc, data.SourcesFound)
}

func (d *DiffusionDisplay) renderDraftRefined(data events.DraftRefinedData) {
    refineColor := color.New(color.FgCyan)

    // Progress bar
    barWidth := 30
    filled := int(data.Progress * float64(barWidth))
    empty := barWidth - filled

    bar := strings.Repeat("█", filled) + strings.Repeat("░", empty)
    refineColor.Fprintf(d.w, "│ 📝 Draft refined: %s %d%% (+%d sources)\n",
        bar, int(data.Progress*100), data.NewSources)
}
```

### Visualizer Integration (`internal/repl/visualizer.go`)

Update the Visualizer to handle ThinkDeep events:

```go
// In NewVisualizer, add:
diffusionDisplay: NewDiffusionDisplay(w),

// In Start(), subscribe to ThinkDeep events:
eventCh := v.ctx.Bus.Subscribe(
    // ... existing events ...
    events.EventDiffusionStarted,
    events.EventDiffusionIterationStart,
    events.EventDraftRefined,
    events.EventResearchDelegated,
    events.EventSubResearcherStarted,
    events.EventSubResearcherProgress,
    events.EventSubResearcherComplete,
    events.EventDiffusionComplete,
    events.EventFinalReportStarted,
    events.EventFinalReportComplete,
)

// In event handling loop, route diffusion events:
switch event.Type {
case events.EventDiffusionStarted:
    if data, ok := event.Data.(events.DiffusionStartedData); ok {
        v.diffusionDisplay.Render(data.Topic, data.MaxIterations)
    }
case events.EventDiffusionIterationStart,
     events.EventResearchDelegated,
     events.EventSubResearcherProgress,
     events.EventDraftRefined:
    v.diffusionDisplay.HandleEvent(event)
}
```

### Example CLI Output

When running ThinkDeep research, the user sees:

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                    🧠 THINKDEEP DIFFUSION RESEARCH                           │
│                                                                              │
│  Topic: What are the implications of quantum computing on cryptography?      │
╰──────────────────────────────────────────────────────────────────────────────╯

                              ┌────────────────┐
                              │ 1. BRIEF       │
                              │ Generate Query │
                              └────────────────┘
                                      │
                              ┌────────────────┐
                              │ 2. DRAFT       │
                              │ Initial Report │
                              └────────────────┘
                                      │
               ┌────────────────────────────────────────────────┐
               │ 3. DIFFUSE (Iterative Refinement)              │
               │   ┌─→ ConductResearch ─→ refine_draft ─┐      │
               │   │                                     │      │
               │   └──── think (max 15 iterations) ←────┘      │
               └────────────────────────────────────────────────┘
                                      │
                              ┌────────────────┐
                              │ 4. FINALIZE    │
                              │ Full Optimize  │
                              └────────────────┘

                       Starting diffusion research...

┌─ Diffusion Iteration 1/15 ──────────────────────────────────────────────────
│ 🔍 Sub-researcher 1: Impact of Shor's algorithm on RSA encryption [3 sources]
│ 🔍 Sub-researcher 2: Post-quantum cryptography standards [2 sources]
│ 💭 Sub-researcher 1: Analyzing search results...
│ ✓ Sub-researcher 2: Complete [5 sources]
│ 📝 Draft refined: ██████████████░░░░░░░░░░░░░░░░ 47% (+8 sources)

┌─ Diffusion Iteration 2/15 ──────────────────────────────────────────────────
│ 🔍 Sub-researcher 1: NIST post-quantum candidates [4 sources]
│ 📝 Draft refined: ████████████████████████░░░░░░ 78% (+4 sources)

┌─ Diffusion Iteration 3/15 ──────────────────────────────────────────────────
│ 💭 Supervisor: Checking for remaining gaps...
│ ✓ Research findings comprehensive - proceeding to final report

⚡ Generating final report with full optimization...
│ Applying Insightfulness Rules: granular breakdown, mapping tables...
│ Applying Helpfulness Rules: user intent, clarity, accuracy...
✓ Report synthesis complete

💰 Cost update [total]: $0.0234 (47,231 tok)
```

### Key Visualization Principles

1. **Show the Diffusion Loop**: Make the iterative nature visible - users should see each iteration and understand why it's continuing

2. **Parallel Sub-Researchers**: Display concurrent research clearly with numbered panels showing topic, status, and source count

3. **Draft Progress**: Show progressive refinement with a progress bar that increases as more content is incorporated

4. **Phase Transitions**: Clear visual markers when transitioning between:
   - Brief generation → Draft creation
   - Diffusion iterations
   - Final optimization

5. **Completion Criteria**: When research completes, explain why (e.g., "findings comprehensive", "max iterations reached")

6. **Cost Tracking**: Show running token/cost counts so users understand resource usage

### Color Scheme

| Phase | Color | Icon |
|-------|-------|------|
| Brief | Blue (HiBlue) | 📋 |
| Draft | Yellow (HiYellow) | 📝 |
| Diffuse | Magenta (HiMagenta) | 🔄 |
| Sub-research | Yellow/Cyan | 🔍💭📦 |
| Refinement | Cyan | ✏️ |
| Final | Green (HiGreen) | ✓ |
| Thinking | Dim | 💭 |

## References

- [Blog Post: Self-Balancing Agentic AI Test-Time](https://paichunlin.substack.com/p/self-balancing-agentic-ai-test-time)
- [ThinkDepth.ai GitHub Repository](https://github.com/thinkdepthai/Deep_Research)
- [DeepResearch Bench Leaderboard](https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard)
