---
date: 2025-12-03T10:30:00+01:00
researcher: Claude
git_commit: 6a32cb5cc41e10a32999f565d10ca639bbecc06c
branch: main
repository: addcommitpush.io/go-research
topic: "Interactive CLI Agentic Research Experience"
tags: [research, cli, interactive, obsidian, think_deep, storm, agents]
status: complete
last_updated: 2025-12-03
last_updated_by: Claude
---

# Research: Interactive CLI Agentic Research Experience

**Date**: 2025-12-03T10:30:00+01:00
**Researcher**: Claude
**Git Commit**: 6a32cb5cc41e10a32999f565d10ca639bbecc06c
**Branch**: main
**Repository**: addcommitpush.io/go-research

## Research Question

Design an interactive CLI experience for deep research where:
1. Users can invoke different research modes (fast, storm, think_deep)
2. Sessions maintain context about written reports (outputs only, not full agent context)
3. Smart mode selection based on query complexity
4. Users can ask questions about reports and expand on specific topics
5. "Expand knowledge" workflow injects context at the right stage in each agent
6. All sub-insights from think_deep saved to Obsidian for full traceability

## Summary

The current go-research CLI has strong foundations for an interactive agentic experience. The architecture supports:
- Session management with versioning and parent tracking
- Event-driven visualization of research progress
- Existing `/expand` handler for follow-up queries
- Obsidian integration for persistence (though sub-insights not yet saved)

The proposed "Claude Code-style" interactive experience requires:
1. A **Chat Router** that intelligently routes queries to appropriate agents
2. **Session Context Manager** that maintains report summaries without full agent state
3. **Expand Knowledge Pipeline** with injection points into each agent architecture
4. **Enhanced Obsidian Writer** that saves all sub-insights with provenance

## Detailed Findings

### 1. Current Architecture Analysis

#### Entry Points (`cmd/research/main.go:51-52`)
```go
vaultWriter := obsidian.NewWriter(cfg.VaultPath)
store.SetVaultWriter(vaultWriter)
```

The CLI initializes with:
- Session store (filesystem-based JSON)
- Event bus for real-time visualization
- Obsidian vault writer for human-readable output
- REPL with command router

#### Router Intelligence (`internal/repl/router.go:59-74`)
```go
// Natural language: if session exists, expand; otherwise start storm research
if r.ctx.Session != nil {
    handler, ok := r.handlers["expand"]
    return handler, []string{parsed.RawText}, nil
}
// No session - use storm as default research handler
handler, ok := r.handlers["storm"]
return handler, []string{parsed.RawText}, nil
```

**Current behavior**:
- Commands (`/fast`, `/deep`, `/expand`) → explicit routing
- Natural language WITH session → `/expand` handler
- Natural language WITHOUT session → `/storm` handler

**Gap**: No smart mode selection or chat/QA detection.

#### Expand Handler (`internal/repl/handlers/expand.go:32-55`)
```go
// Build continuation context from previous session
continuationCtx := session.BuildContinuationContext(ctx.Session)

// Create expansion query with context
expandedQuery := fmt.Sprintf(`Based on previous research about "%s":
%s
Follow-up question: %s`, ctx.Session.Query, continuationCtx, followUp)

// Create new version of session
newSess := ctx.Session.NewVersion()
```

**Current behavior**:
- Builds context from previous session (report + sources)
- Creates versioned session with parent link
- Runs research with injected context
- Saves to both JSON and Obsidian

**Gap**: Uses same research mode as parent; doesn't inject at agent-specific points.

### 2. Agent Architecture Injection Points

#### ThinkDeep Injection Points (`internal/orchestrator/think_deep.go`)

| Stage | Line | Injection Opportunity |
|-------|------|----------------------|
| Research Brief | 264 | Inject domain knowledge, previous findings |
| Initial Draft | 284 | Inject existing report as baseline |
| Supervisor Context | `supervisor.go:209` | Add `<Previous Research>` section |
| Sub-Researcher | `sub_researcher.go:102` | Inject visited URLs, known facts |
| Final Report | 312 | Add style guidelines, structure template |

**Key insight**: ThinkDeep's `SupervisorState` already tracks:
- `Notes []string` - compressed findings
- `RawNotes []string` - raw search results
- `VisitedURLs map[string]bool` - deduplication

These can be pre-populated for "expand" workflows.

#### STORM Injection Points (`internal/orchestrator/deep_storm.go`)

| Stage | Line | Injection Opportunity |
|-------|------|----------------------|
| Perspective Discovery | 124 | Inject known perspectives, skip survey |
| Conversation Simulation | 159 | Inject previous conversations as context |
| Cross-Validation | 192 | Inject validated facts from previous run |
| Synthesis | 230 | Inject previous outline, sections |

**Key insight**: STORM produces rich intermediate artifacts:
- `[]Perspective` - expert viewpoints
- `map[string]*ConversationResult` - full dialogue transcripts
- `*AnalysisResult` - validated facts, contradictions, gaps
- Draft/refined outlines

### 3. Proposed Architecture

#### 3.1 Chat Router with Smart Mode Selection

```go
// internal/repl/chat_router.go

type ChatRouter struct {
    classifier QueryClassifier
    session    *session.Session
    handlers   map[string]Handler
}

type QueryClassifier interface {
    Classify(query string, sessionContext *SessionContext) QueryIntent
}

type QueryIntent struct {
    Type        IntentType  // Research, Question, Expand, Command
    Mode        Mode        // Fast, Storm, ThinkDeep (for Research)
    Complexity  float64     // 0-1 scale
    TopicFocus  string      // Specific topic for expansion
    Confidence  float64
}

type IntentType string
const (
    IntentResearch IntentType = "research"   // New research query
    IntentQuestion IntentType = "question"   // QA about existing report
    IntentExpand   IntentType = "expand"     // Expand on specific topic
    IntentCommand  IntentType = "command"    // System command
)
```

**Classification Logic**:
1. No session → `IntentResearch`
2. Question about report content → `IntentQuestion`
3. "Expand on X", "Tell me more about Y" → `IntentExpand`
4. Complex new topic → `IntentResearch` (with `ModeThinkDeep`)
5. Simple fact query → `IntentResearch` (with `ModeFast`)

#### 3.2 Session Context Manager

```go
// internal/session/context_manager.go

type SessionContext struct {
    // Summarized outputs (not full agent state)
    Query           string
    ReportSummary   string        // Compressed version of report
    KeyFindings     []Finding     // Top 10 extracted findings
    TopicsCovered   []string      // Main topics from report
    SourcesSummary  []SourceMeta  // URLs with relevance scores

    // For expansion workflows
    UnexploredGaps  []string      // Topics mentioned but not covered
    VisitedURLs     []string      // For deduplication

    // Lineage tracking
    SessionChain    []string      // Parent session IDs
    Version         int
}

type Finding struct {
    Topic       string
    Content     string
    Sources     []string
    Confidence  float64
}

type SourceMeta struct {
    URL         string
    Relevance   float64
    CitedCount  int
}
```

**Key design**: Context is extracted from reports, not stored agent state. This keeps memory bounded while preserving useful information.

#### 3.3 Question Answering Handler

```go
// internal/repl/handlers/question.go

type QuestionHandler struct{}

func (h *QuestionHandler) Execute(ctx *repl.Context, args []string) error {
    question := strings.Join(args, " ")

    // Build QA context from session
    qaContext := buildQAContext(ctx.Session)

    // Use LLM to answer from report content
    answer, err := answerFromReport(ctx, question, qaContext)
    if err != nil {
        return err
    }

    // Check if answer is sufficient or needs expansion
    if answer.NeedsExpansion {
        ctx.Renderer.SuggestExpansion(answer.SuggestedTopic)
    }

    ctx.Renderer.Answer(answer)
    return nil
}

func buildQAContext(sess *session.Session) string {
    return fmt.Sprintf(`<Report>
%s
</Report>

<Sources>
%s
</Sources>

<Insights>
%s
</Insights>`, sess.Report, formatSources(sess.Sources), formatInsights(sess.Insights))
}
```

#### 3.4 Expand Knowledge Pipeline

```go
// internal/repl/handlers/expand_knowledge.go

type ExpandKnowledgeHandler struct{}

func (h *ExpandKnowledgeHandler) Execute(ctx *repl.Context, args []string) error {
    expandTopic := strings.Join(args, " ")

    // Determine best architecture for expansion
    arch := selectArchitecture(ctx.Session, expandTopic)

    // Build injection context
    injection := buildInjectionContext(ctx.Session, expandTopic)

    switch arch {
    case "think_deep":
        return h.expandWithThinkDeep(ctx, expandTopic, injection)
    case "storm":
        return h.expandWithStorm(ctx, expandTopic, injection)
    case "fast":
        return h.expandWithFast(ctx, expandTopic, injection)
    }
    return nil
}

type InjectionContext struct {
    // Existing knowledge to preserve
    PreviousFindings    []string
    ValidatedFacts      []ValidatedFact
    VisitedURLs         []string

    // Focus guidance
    ExpansionTopic      string
    RelatedTopics       []string
    KnownGaps           []string

    // Report continuity
    ExistingReport      string
    ExistingOutline     []string
    ExistingSections    map[string]string
}
```

**ThinkDeep Expansion Flow**:
```go
func (h *ExpandKnowledgeHandler) expandWithThinkDeep(
    ctx *repl.Context,
    topic string,
    injection InjectionContext,
) error {
    // 1. Create orchestrator with expansion options
    orch := orchestrator.NewThinkDeep(ctx.Bus, ctx.Config,
        orchestrator.WithExistingBrief(injection.ExistingReport),
        orchestrator.WithPreviousNotes(injection.PreviousFindings),
        orchestrator.WithVisitedURLs(injection.VisitedURLs),
        orchestrator.WithExpansionFocus(topic),
    )

    // 2. Run research (supervisor will see existing context)
    result, err := orch.Research(ctx.RunContext, expandQuery)

    // 3. Merge results with existing session
    mergedSession := mergeExpansion(ctx.Session, result, topic)

    // 4. Save with full sub-insights
    if err := ctx.Obsidian.WriteWithInsights(mergedSession, result.SubInsights); err != nil {
        ctx.Renderer.Error(err)
    }

    return nil
}
```

### 4. Enhanced Obsidian Integration

#### 4.1 Sub-Insight Storage

Current gap: `internal/obsidian/writer.go` creates `insights/` directory but never populates it.

**Proposed structure**:
```
<vault-path>/
└── <session-id>/
    ├── session.md                    # MOC
    ├── workers/
    │   └── worker_N.md
    ├── insights/                     # NEW: Populated with sub-insights
    │   ├── insight_001.md            # Individual insights
    │   ├── insight_002.md
    │   └── ...
    ├── research-notes/               # NEW: Raw sub-researcher output
    │   ├── iteration_01/
    │   │   ├── topic_1.md            # Research topic + findings
    │   │   ├── topic_2.md
    │   │   └── sources.md            # URLs with context
    │   └── iteration_02/
    │       └── ...
    ├── sources/                      # NEW: Source metadata
    │   └── source_index.md           # All sources with quality scores
    └── reports/
        └── report_vN.md
```

#### 4.2 Insight Template

```go
// internal/obsidian/templates.go

const insightTemplate = `---
insight_id: {{.ID}}
session_id: {{.SessionID}}
iteration: {{.Iteration}}
topic: {{.Topic}}
confidence: {{printf "%.2f" .Confidence}}
created_at: {{.CreatedAt}}
sources: {{len .Sources}}
---

# {{.Title}}

## Finding

{{.Finding}}

## Implication

{{.Implication}}

## Sources

{{range .Sources}}
- {{.}}
{{end}}

## Related Insights

{{range .RelatedInsights}}
- [[insights/{{.}}.md|{{.}}]]
{{end}}
`
```

#### 4.3 ThinkDeep Sub-Insight Capture

```go
// internal/agents/supervisor.go

// Modify executeParallelResearch to capture sub-insights
func (s *SupervisorAgent) executeParallelResearch(
    ctx context.Context,
    calls []ToolCall,
) ([]SubResearcherResult, error) {
    // ... existing parallel execution ...

    for result := range resultCh {
        // Extract insights from each sub-researcher
        insights := extractInsights(result.CompressedResearch, result.Topic)

        // Add to supervisor state for tracking
        for _, insight := range insights {
            s.state.AddInsight(SubInsight{
                Topic:       result.Topic,
                Finding:     insight.Finding,
                Sources:     result.VisitedURLs,
                Iteration:   s.state.Iterations,
                ResearcherNum: result.ResearcherNum,
            })
        }
    }
}

// New state field in SupervisorState
type SupervisorState struct {
    // ... existing fields ...
    SubInsights []SubInsight  // NEW: Track all sub-insights
}

type SubInsight struct {
    Topic         string
    Finding       string
    Sources       []string
    Iteration     int
    ResearcherNum int
    Confidence    float64
}
```

### 5. User Flow Examples

#### Example 1: Initial Research + Question + Expansion

```
research> What are the economic policies of Swedish political parties?

[ThinkDeep runs - 15 iterations, 45 sub-researchers]
[Saves: session.md, workers/, insights/, reports/report_v1.md]

Research complete! Report saved to Obsidian.
Cost: $0.45 | Sources: 127 | Insights: 34

research> What does Moderaterna specifically propose for corporate taxes?

[QA handler - answers from report content]

Based on the report: Moderaterna proposes reducing corporate tax from
20.6% to 18%, with additional deductions for R&D investments...

Sources: [3], [17], [23]

💡 This topic could be expanded. Say "expand corporate tax policies"
   for deeper research.

research> expand corporate tax policies

[ExpandKnowledge handler - ThinkDeep with injection]
- Existing findings injected into supervisor context
- 127 URLs marked as visited
- Focus narrowed to "corporate tax policies"

[ThinkDeep runs - 8 iterations (fewer due to existing knowledge)]
[Merges with session v1 → creates session v2]
[Updates: report_v2.md, new insights/]

Expansion complete! Report updated.
Cost: $0.18 | New sources: 42 | New insights: 12
Total sources: 169 | Total insights: 46
```

#### Example 2: Direct Agent Invocation

```
research> /think_deep What is the ReAct agent pattern?

[Direct invocation - full ThinkDeep workflow]

research> /storm Comparison of agent architectures

[Direct invocation - full STORM workflow]

research> /fast Who invented transformers?

[Direct invocation - fast single-agent]
```

### 6. Implementation Roadmap

#### Phase 1: Sub-Insight Capture (think_deep)
- [ ] Add `SubInsights []SubInsight` to `SupervisorState`
- [ ] Capture insights in `executeParallelResearch`
- [ ] Return insights in `ThinkDeepResult`
- [ ] Update Obsidian writer to save insights

#### Phase 2: Session Context Manager
- [ ] Create `SessionContext` struct
- [ ] Implement `ExtractContext(session) SessionContext`
- [ ] Add context to session store

#### Phase 3: Question Handler
- [ ] Create `QuestionHandler`
- [ ] Implement `buildQAContext`
- [ ] Add expansion suggestion logic

#### Phase 4: Smart Router
- [ ] Create `QueryClassifier` interface
- [ ] Implement LLM-based classifier
- [ ] Update `Router` to use classifier

#### Phase 5: Expand Knowledge Pipeline
- [ ] Create `InjectionContext` struct
- [ ] Implement ThinkDeep injection options
- [ ] Implement STORM injection options
- [ ] Create merge logic for expanded sessions

#### Phase 6: Enhanced Obsidian
- [ ] Implement research-notes structure
- [ ] Add source index with quality scores
- [ ] Create bi-directional links between insights

## Code References

- `internal/repl/router.go:46-74` - Current routing logic
- `internal/repl/handlers/expand.go:21-88` - Existing expand handler
- `internal/session/session.go:41-57` - Session struct definition
- `internal/think_deep/state.go:20-45` - SupervisorState (injection target)
- `internal/agents/supervisor.go:307-420` - Sub-researcher execution
- `internal/obsidian/writer.go:26-62` - Vault writer (needs enhancement)
- `internal/orchestrator/think_deep.go:262-278` - Brief generation (injection point)
- `internal/orchestrator/think_deep.go:302-326` - Final report (injection point)

## Architecture Insights

### Key Design Decisions

1. **Output-based Context**: Store summarized outputs, not full agent state. This bounds memory while preserving usefulness.

2. **Agent-Specific Injection**: Each architecture has different injection points. ThinkDeep injects into supervisor state; STORM injects into perspective discovery and conversation context.

3. **Version Chaining**: Sessions form a linked list via `ParentID`. This enables traceable expansion history.

4. **Event-Driven Progress**: Existing event bus supports real-time UI feedback. New handlers should emit progress events.

5. **Non-Blocking Obsidian**: Vault writes are best-effort. This prevents I/O issues from blocking research.

### Patterns to Follow

1. **Handler Pattern**: All commands implement `Handler.Execute(ctx, args)`. New chat handlers should follow this.

2. **Functional Options**: ThinkDeep uses `ThinkDeepOption` for configuration. Injection context should use same pattern.

3. **Graceful Degradation**: If classification fails, fall back to `/storm`. If expansion fails, continue with new research.

## Open Questions

1. **Classification Model**: Use LLM for query classification or simpler heuristics?
   - LLM: More accurate, but adds latency and cost
   - Heuristics: Fast, but may misclassify

2. **Context Window Management**: How much previous context to inject?
   - Too much: Expensive, may confuse agent
   - Too little: Loses valuable knowledge

3. **Merge Strategy**: When expanding, how to merge new findings?
   - Append: Simple, but may duplicate
   - Intelligent merge: Complex, but cleaner output

4. **Insight Granularity**: What constitutes a single "insight"?
   - Per search result?
   - Per sub-researcher?
   - Per topic?

## Related Research

- [Stanford STORM Paper](https://arxiv.org/abs/2402.14207) - Multi-perspective research
- [ThinkDepth.ai](https://www.thinkdepth.ai) - Diffusion-based research
- [ReAct Pattern](https://arxiv.org/abs/2210.03629) - Think-Act-Observe loop
