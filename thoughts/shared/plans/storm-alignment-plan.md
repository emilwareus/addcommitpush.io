# STORM Implementation Alignment Plan

**Date**: 2024-12-02
**Status**: Ready for implementation
**Goal**: Align Go STORM implementation with original Stanford STORM algorithm

---

## Executive Summary

The current Go implementation deviates from STORM's core mechanism: **simulated expert conversations**. Instead of multi-turn WikiWriter↔TopicExpert dialogues, it uses ReAct-style iterative search loops.

This plan aligns the implementation 1-to-1 with STORM while:
- Using **web search** instead of Wikipedia (only allowed divergence)
- **Keeping** event sourcing, cost tracking, Obsidian storage
- **Keeping** the analysis agent (cross-validation, contradiction detection)

---

## Phase 1: Enhanced Perspective Discovery

**Goal**: Survey related topics before generating perspectives (like STORM's Wikipedia survey, but with web search)

### Files to Modify
- `internal/planning/perspectives.go`

### New Types
```go
// TopicOutline represents structure extracted from a related topic
type TopicOutline struct {
    Topic    string   `json:"topic"`
    Sections []string `json:"sections"`
    Source   string   `json:"source"`
}
```

### New Functions

#### 1.1 `SurveyRelatedTopics()`
Surveys related topics via web search and extracts their structure.

```go
func (p *PerspectiveDiscoverer) SurveyRelatedTopics(
    ctx context.Context,
    topic string,
) ([]TopicOutline, session.CostBreakdown, error)
```

**Implementation**:
1. LLM call to generate 3-5 search queries for related subtopics
2. Execute web searches for each query via Brave API
3. Extract key sections/themes from top 3 results per query
4. Return structured outlines as inspiration context

**Prompt** (adapted from STORM's `FindRelatedTopic`):
```
For the topic: "{topic}"

Generate 3-5 search queries that would find related topics and subtopics.
These should cover different angles: technical aspects, history, applications,
controversies, and related fields.

Return JSON array: ["query1", "query2", ...]
```

#### 1.2 `DiscoverWithSurvey()`
Generates perspectives informed by related topic structures.

```go
func (p *PerspectiveDiscoverer) DiscoverWithSurvey(
    ctx context.Context,
    topic string,
) ([]Perspective, session.CostBreakdown, error)
```

**Implementation**:
1. Call `SurveyRelatedTopics()` to get related structures
2. Format outlines as inspiration context
3. Generate personas using enhanced prompt

**Prompt** (adapted from STORM's `GenPersona`):
```
For the research topic: "{topic}"

You need to select a group of research experts who will work together to create
a comprehensive research report. Each expert represents a different perspective,
role, or affiliation related to this topic.

Use these related topic structures for inspiration:
{related_outlines_formatted}

For each expert perspective, provide:
1. Name (e.g., "Technical Expert", "Industry Analyst")
2. Focus area (what they prioritize in research)
3. 3-4 key questions they would investigate

Always include a "Basic Fact Writer" who covers fundamental information.

Return JSON array: [{"name": "...", "focus": "...", "questions": [...]}]
```

### Acceptance Criteria
- [x] Perspectives generated with awareness of related topic structures
- [x] Cost tracked for survey LLM calls and searches
- [x] Backward compatible: existing `Discover()` still works

---

## Phase 2: Conversation Simulation (CORE CHANGE)

**Goal**: Replace ReAct loops with STORM's WikiWriter↔TopicExpert conversations

This is the **most critical phase** - it implements STORM's core innovation.

### New File
- `internal/agents/conversation.go`

### New Types

```go
// DialogueTurn represents one Q&A exchange in a conversation
type DialogueTurn struct {
    Question      string   `json:"question"`
    Answer        string   `json:"answer"`
    SearchQueries []string `json:"search_queries"`
    Sources       []string `json:"sources"`
    TurnNumber    int      `json:"turn_number"`
}

// ConversationResult contains the full dialogue for one perspective
type ConversationResult struct {
    Perspective  planning.Perspective `json:"perspective"`
    Turns        []DialogueTurn       `json:"turns"`
    Facts        []Fact               `json:"facts"` // Extracted from answers
    TotalCost    session.CostBreakdown `json:"total_cost"`
}

// ConversationSimulator orchestrates WikiWriter↔TopicExpert dialogues
type ConversationSimulator struct {
    client    llm.ChatClient
    searcher  WebSearcher
    maxTurns  int  // Default: 3-5
    bus       *events.Bus
    model     string
}
```

### New Functions

#### 2.1 WikiWriter Agent

Generates questions from a specific perspective, informed by conversation history.

```go
func (s *ConversationSimulator) wikiWriterAsk(
    ctx context.Context,
    topic string,
    perspective planning.Perspective,
    history []DialogueTurn,
) (string, session.CostBreakdown, error)
```

**Prompt** (adapted from STORM's `AskQuestionWithPersona`):
```
You are a {perspective.Name} researching "{topic}".
Your focus: {perspective.Focus}

{if history is empty}
You are starting a conversation with a research expert to gather information
for a comprehensive report. Ask your first question based on your perspective.
{else}
Conversation so far:
{formatted_history}

Based on what you've learned, ask a follow-up question to deepen your understanding.
If you feel you have gathered enough information from this perspective, say:
"Thank you so much for your help!"
{endif}

What is your next question?
```

**Exit Condition**: Response contains "Thank you so much for your help!"

#### 2.2 TopicExpert Agent - Query Generation

Converts a question into search queries.

```go
func (s *ConversationSimulator) expertGenerateQueries(
    ctx context.Context,
    topic string,
    question string,
) ([]string, session.CostBreakdown, error)
```

**Prompt** (adapted from STORM's `QuestionToQuery`):
```
Topic: {topic}
Question: {question}

Generate 1-3 search queries to find information that answers this question.
Focus on factual, verifiable information from reliable sources.

Return JSON array: ["query1", "query2"]
```

#### 2.3 TopicExpert Agent - Answer Synthesis

Synthesizes an answer from search results with citations.

```go
func (s *ConversationSimulator) expertAnswer(
    ctx context.Context,
    topic string,
    question string,
    searchResults []SearchResult,
) (string, []string, session.CostBreakdown, error) // Returns: answer, sources, cost, error
```

**Prompt** (adapted from STORM's `AnswerQuestion`):
```
Topic: {topic}
Question: {question}

Search Results:
{formatted_results_with_sources}

Synthesize a comprehensive answer using ONLY information from the search results.
Cite sources inline using [Source: URL].
If the search results don't contain relevant information, say so.

Your answer:
```

#### 2.4 Main Simulation Loop

```go
func (s *ConversationSimulator) SimulateConversation(
    ctx context.Context,
    topic string,
    perspective planning.Perspective,
) (*ConversationResult, error)
```

**Implementation**:
```go
func (s *ConversationSimulator) SimulateConversation(
    ctx context.Context,
    topic string,
    perspective planning.Perspective,
) (*ConversationResult, error) {
    var history []DialogueTurn
    var totalCost session.CostBreakdown

    for turn := 0; turn < s.maxTurns; turn++ {
        // 1. WikiWriter asks question
        question, cost, err := s.wikiWriterAsk(ctx, topic, perspective, history)
        totalCost.Add(cost)
        if err != nil {
            return nil, err
        }

        // 2. Check for conversation end
        if strings.Contains(question, "Thank you so much for your help!") {
            break
        }

        // 3. TopicExpert generates search queries
        queries, cost, err := s.expertGenerateQueries(ctx, topic, question)
        totalCost.Add(cost)
        if err != nil {
            return nil, err
        }

        // 4. Execute searches
        results, err := s.searcher.Search(ctx, queries)
        if err != nil {
            return nil, err
        }

        // 5. TopicExpert synthesizes answer
        answer, sources, cost, err := s.expertAnswer(ctx, topic, question, results)
        totalCost.Add(cost)
        if err != nil {
            return nil, err
        }

        // 6. Record turn
        history = append(history, DialogueTurn{
            Question:      question,
            Answer:        answer,
            SearchQueries: queries,
            Sources:       sources,
            TurnNumber:    turn + 1,
        })

        // Emit progress event
        if s.bus != nil {
            s.bus.Publish(events.Event{
                Type: events.EventWorkerProgress,
                Data: map[string]interface{}{
                    "perspective": perspective.Name,
                    "turn":        turn + 1,
                    "question":    question,
                },
            })
        }
    }

    // Extract facts from conversation
    facts := s.extractFactsFromConversation(history)

    return &ConversationResult{
        Perspective: perspective,
        Turns:       history,
        Facts:       facts,
        TotalCost:   totalCost,
    }, nil
}
```

### Acceptance Criteria
- [x] Multi-turn conversations (3-5 turns) per perspective
- [x] WikiWriter exits naturally when satisfied ("Thank you")
- [x] TopicExpert grounds answers in search results
- [x] Sources tracked per turn
- [x] Facts extracted from conversation answers
- [x] Cost tracked for all LLM calls

---

## Phase 3: Two-Phase Outline Generation

**Goal**: Generate outline using STORM's draft→refine pattern

### Files to Modify
- `internal/agents/synthesis.go`

### New Functions

#### 3.1 `GenerateDraftOutline()`

Creates initial outline from LLM's parametric knowledge (topic only).

```go
func (s *SynthesisAgent) GenerateDraftOutline(
    ctx context.Context,
    topic string,
) ([]string, session.CostBreakdown, error)
```

**Prompt** (adapted from STORM's `WritePageOutline`):
```
Create an outline for a comprehensive research report on: "{topic}"

Use your knowledge to create a logical structure with 4-6 main sections.
This is a draft that will be refined with additional research.

Return JSON array of section headings: ["Section 1", "Section 2", ...]
```

#### 3.2 `RefineOutline()`

Improves outline using ALL conversation insights.

```go
func (s *SynthesisAgent) RefineOutline(
    ctx context.Context,
    topic string,
    draftOutline []string,
    conversations map[string]*ConversationResult,
) ([]string, session.CostBreakdown, error)
```

**Prompt** (adapted from STORM's `WritePageOutlineFromConv`):
```
Improve an outline for a research report on: "{topic}"

Current draft outline:
{formatted_draft_outline}

Information gathered from expert conversations:
{formatted_conversations}

Based on the information learned from these conversations, improve the outline to:
1. Add sections for important topics discovered
2. Reorganize for better logical flow
3. Remove redundant or irrelevant sections
4. Ensure comprehensive coverage

Return JSON array of refined section headings: ["Section 1", "Section 2", ...]
```

#### 3.3 `GenerateOutlineWithConversations()`

Two-phase wrapper function.

```go
func (s *SynthesisAgent) GenerateOutlineWithConversations(
    ctx context.Context,
    topic string,
    conversations map[string]*ConversationResult,
) ([]string, session.CostBreakdown, error) {
    var totalCost session.CostBreakdown

    // Phase 1: Draft outline from parametric knowledge
    draft, cost, err := s.GenerateDraftOutline(ctx, topic)
    if err != nil {
        return nil, totalCost, err
    }
    totalCost.Add(cost)

    // Phase 2: Refine with conversation insights
    refined, cost, err := s.RefineOutline(ctx, topic, draft, conversations)
    if err != nil {
        return draft, totalCost, nil // Fall back to draft
    }
    totalCost.Add(cost)

    return refined, totalCost, nil
}
```

### Acceptance Criteria
- [x] Draft outline generated from topic only
- [x] Refined outline incorporates conversation findings
- [x] Output structure reflects research, not just LLM's prior knowledge

---

## Phase 4: Orchestrator Integration

**Goal**: Wire everything together with event sourcing

### Files to Modify
- `internal/orchestrator/deep_eventsourced.go`
- `internal/events/types.go`
- `internal/core/domain/aggregate/research_state.go`

### Changes

#### 4.1 New Event Type

In `internal/events/types.go`:
```go
EventConversationCompleted EventType = "conversation.completed"
```

#### 4.2 Updated Aggregate State

In `internal/core/domain/aggregate/research_state.go`:
```go
type ResearchState struct {
    // ... existing fields ...

    // Conversations stores dialogue results per perspective
    Conversations map[string]*agents.ConversationResult `json:"conversations,omitempty"`
}
```

#### 4.3 Updated Orchestrator Flow

Replace `executeDAG()` (ReAct search workers) with `executeConversationPhase()`:

```go
func (o *DeepOrchestrator) executeConversationPhase(ctx context.Context) error {
    perspectives := o.state.Perspectives

    // Create conversation simulator
    simulator := agents.NewConversationSimulator(o.client, o.searcher)

    // Run conversations in parallel (like STORM)
    var wg sync.WaitGroup
    results := make(chan *agents.ConversationResult, len(perspectives))
    errors := make(chan error, len(perspectives))

    for _, perspective := range perspectives {
        wg.Add(1)
        go func(p planning.Perspective) {
            defer wg.Done()

            result, err := simulator.SimulateConversation(ctx, o.state.Topic, p)
            if err != nil {
                errors <- err
                return
            }
            results <- result
        }(perspective)
    }

    wg.Wait()
    close(results)
    close(errors)

    // Collect results
    o.state.Conversations = make(map[string]*agents.ConversationResult)
    for result := range results {
        o.state.Conversations[result.Perspective.Name] = result

        // Emit event
        o.emitEvent(events.EventConversationCompleted, map[string]interface{}{
            "perspective": result.Perspective.Name,
            "turns":       len(result.Turns),
            "facts":       len(result.Facts),
        })
    }

    // Check for errors
    if len(errors) > 0 {
        return <-errors
    }

    return nil
}
```

#### 4.4 Updated Synthesis Phase

Pass conversations to synthesis for two-phase outline:

```go
func (o *DeepOrchestrator) executeSynthesis(ctx context.Context) error {
    synthesis := agents.NewSynthesisAgentWithBus(o.client, o.bus)

    // Two-phase outline generation
    outline, cost, err := synthesis.GenerateOutlineWithConversations(
        ctx,
        o.state.Topic,
        o.state.Conversations,
    )
    if err != nil {
        return err
    }
    o.state.TotalCost.Add(cost)

    // ... rest of synthesis ...
}
```

#### 4.5 Updated State Transitions

```
pending → planning (with survey) → conversations → analyzing → synthesizing → complete
```

### Acceptance Criteria
- [x] Conversations run in parallel per perspective
- [x] Events emitted after each conversation completes
- [x] Conversations stored in result state
- [x] Two-phase outline uses conversation data
- [ ] Can pause/resume mid-conversation (event replay) - Future enhancement
- [x] Analysis phase still works (uses facts from conversations)

---

## Implementation Order

```
Phase 1 ──┐
          ├──► Phase 4 ──► Testing
Phase 2 ──┤
          │
Phase 3 ──┘
```

**Phases 1, 2, 3** can be developed in parallel as they're independent modules.
**Phase 4** integrates everything and depends on all prior phases.

### Recommended Sequence

1. **Phase 2** first (core innovation, biggest change)
2. **Phase 1** second (enhances perspective quality)
3. **Phase 3** third (improves outline quality)
4. **Phase 4** last (integration)

---

## Testing Strategy

### Unit Tests
- `conversation_test.go`: Test WikiWriter/TopicExpert prompts and loop termination
- `perspectives_test.go`: Test survey + enhanced persona generation
- `synthesis_test.go`: Test two-phase outline generation

### Integration Tests
- Full flow e2e test with mock LLM responses
- Resume capability test (interrupt mid-conversation, resume from events)

### Quality Validation
- Compare output reports between old (ReAct) and new (conversation) approaches
- Verify conversation transcripts show natural follow-up questioning
- Check that outlines reflect conversation content

---

## What We're Keeping

- **Event sourcing architecture** - All phases emit events for resumability
- **Cost tracking** - Every LLM call tracked via `session.CostBreakdown`
- **Obsidian storage** - Final reports written to vault
- **Analysis agent** - Cross-validation and contradiction detection
- **Web search via Brave** - Instead of Wikipedia API

---

## STORM Prompts Reference

Prompts to port from `knowledge_storm/storm_wiki/modules/`:

| STORM Prompt | Go Location | Status |
|--------------|-------------|--------|
| `FindRelatedTopic` | `perspectives.go:SurveyRelatedTopics()` | Phase 1 |
| `GenPersona` | `perspectives.go:DiscoverWithSurvey()` | Phase 1 |
| `AskQuestionWithPersona` | `conversation.go:wikiWriterAsk()` | Phase 2 |
| `QuestionToQuery` | `conversation.go:expertGenerateQueries()` | Phase 2 |
| `AnswerQuestion` | `conversation.go:expertAnswer()` | Phase 2 |
| `WritePageOutline` | `synthesis.go:GenerateDraftOutline()` | Phase 3 |
| `WritePageOutlineFromConv` | `synthesis.go:RefineOutline()` | Phase 3 |

---

## Success Metrics

1. **Faithfulness**: Core STORM mechanism (conversation simulation) implemented
2. **Quality**: Outlines reflect research findings, not just topic
3. **Resumability**: Can interrupt and resume mid-research
4. **Performance**: Parallel conversation execution
5. **Auditability**: Full event log of every step
