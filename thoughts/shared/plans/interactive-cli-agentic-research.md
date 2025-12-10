# Interactive CLI Agentic Research Experience - Implementation Plan

## Overview

Transform the go-research CLI into a Claude Code-style interactive experience where users can:

1. Ask questions about existing research (answered from chat history + reports)
2. Expand on specific topics with context injection
3. Have queries intelligently routed to the appropriate handler via LLM classification

This plan implements the architecture from `thoughts/shared/research/2025-12-03_interactive-cli-agentic-research.md`.

## Current State Analysis

### Existing Infrastructure

- **Router** (`internal/repl/router.go:46-74`): Routes natural language → expand (if session) or storm (if no session)
- **ExpandHandler** (`internal/repl/handlers/expand.go:21-88`): Creates versioned sessions with continuation context
- **Session Context** (`internal/session/context.go:9-45`): Builds text summary from prior session (report, insights, sources)
- **SupervisorState** (`internal/think_deep/state.go:20-45`): Tracks Notes, RawNotes, VisitedURLs during diffusion
- **Obsidian Writer** (`internal/obsidian/writer.go:27-62`): Creates directories for insights/ but never populates them

### Key Gaps

1. No sub-insight capture during ThinkDeep research
2. Insights directory created but empty - no insight files written
3. No question-answering from existing content
4. No intelligent query classification - only session-exists check
5. No context injection into ThinkDeep orchestrator for expansion

## Desired End State

After implementation:

1. ThinkDeep captures insights per search result and saves them to Obsidian
2. Users can ask questions and get answers from chat history + all reports in session chain
3. Natural language queries are classified by LLM into research/question/expand intents
4. Expansion injects prior context (findings, visited URLs, existing report) into supervisor state

### Verification

- Run ThinkDeep research → insights/ directory populated with files
- Ask question about report → get answer without new research
- Type ambiguous query → LLM classifies intent correctly
- Expand on topic → new research uses prior context (fewer redundant searches)

## What We're NOT Doing

- **Explorer/lookup agent**: Questions only use existing content; separate agent for knowledge base search is out of scope
- **STORM injection points**: Focus on ThinkDeep only; STORM expansion deferred
- **Heuristic classification**: LLM-only classification as specified
- **User-configurable classifier model**: Model is developer-configured, not user choice
- **Research-notes directory**: Sub-researcher raw output not persisted (only compressed insights)

## Implementation Approach

Build bottom-up: capture insights first, then write them, then enable Q&A on them, then route intelligently, finally enable context injection for expansion.

---

## Phase 1: Sub-Insight Capture in ThinkDeep

### Overview

Capture structured insights from each sub-researcher's search results during the ThinkDeep diffusion loop. Insights are extracted per search result and accumulated in supervisor state.

### Changes Required

#### 1. Add SubInsight Type

**File**: `internal/think_deep/state.go`
**Changes**: Add SubInsight struct and tracking to SupervisorState

```go
// SubInsight represents a single research finding extracted from search results.
// Granularity: one insight per search result with extracted findings.
type SubInsight struct {
    ID            string    // Unique identifier (e.g., "insight-001")
    Topic         string    // Research topic from supervisor delegation
    Title         string    // Short title summarizing the insight
    Finding       string    // The factual finding extracted
    Implication   string    // What this means for the research question
    SourceURL     string    // URL this insight was extracted from
    SourceContent string    // Relevant excerpt from source (truncated)
    Confidence    float64   // 0-1 confidence score
    Iteration     int       // Diffusion iteration when captured
    ResearcherNum int       // Which sub-researcher found this
    Timestamp     time.Time // When captured
}

// Add to SupervisorState struct:
// SubInsights []SubInsight  // All insights captured during diffusion
```

Add methods:

```go
func (s *SupervisorState) AddSubInsight(insight SubInsight)
func (s *SupervisorState) GetSubInsights() []SubInsight
```

#### 2. Extract Insights from Search Results

**File**: `internal/agents/sub_researcher.go`
**Changes**: After search tool execution, extract insights from results

Add function to extract insights from search result content:

```go
// extractInsightsFromSearch parses search results and extracts structured insights.
// Called after each search tool execution with the raw search results.
func extractInsightsFromSearch(topic string, searchResult string, researcherNum int, iteration int) []SubInsight
```

This function should:

1. Parse the search result content
2. Extract key findings (facts, data points, claims)
3. Create SubInsight for each distinct finding
4. Assign confidence based on source quality indicators

#### 3. Accumulate Insights in Supervisor

**File**: `internal/agents/supervisor.go`
**Changes**: Collect insights from sub-researcher results

In `executeParallelResearch()` around line 395-417, after processing each sub-researcher result:

```go
// After accumulating notes and raw notes, also accumulate insights
for _, insight := range result.Insights {
    state.AddSubInsight(insight)
}
```

#### 4. Update SubResearcherResult

**File**: `internal/agents/sub_researcher.go`
**Changes**: Add Insights field to result struct

```go
type SubResearcherResult struct {
    CompressedResearch string
    RawNotes          []string
    SourcesFound      int
    VisitedURLs       []string
    Insights          []think_deep.SubInsight  // NEW: Insights extracted from searches
    Cost              session.CostBreakdown
}
```

#### 5. Return Insights from ThinkDeep Orchestrator

**File**: `internal/orchestrator/think_deep.go`
**Changes**: Include insights in ThinkDeepResult

```go
// In ThinkDeepResult struct, add:
SubInsights []think_deep.SubInsight
```

Pass through from supervisor result to orchestrator result.

### Success Criteria

#### Automated Verification

- [x] Build succeeds: `go build ./...`
- [x] Tests pass: `go test ./internal/think_deep/... ./internal/agents/...`
- [x] No linting errors: `golangci-lint run ./internal/think_deep/... ./internal/agents/...`

#### Manual Verification

- [ ] Run ThinkDeep research and verify `ThinkDeepResult.SubInsights` is populated
- [ ] Each insight has valid Topic, Finding, SourceURL fields
- [ ] Insight count correlates with number of search results processed

---

## Phase 2: Enhanced Obsidian Writer

### Overview

Write captured sub-insights to the Obsidian vault's insights/ directory using the existing template. Link insights from the session MOC.

### Changes Required

#### 1. Add WriteInsights Method

**File**: `internal/obsidian/writer.go`
**Changes**: New method to write insight files

```go
// WriteInsight writes a single insight to the insights directory.
func (w *Writer) WriteInsight(sessionDir string, insight think_deep.SubInsight, index int) error {
    filename := filepath.Join(sessionDir, "insights", fmt.Sprintf("insight_%03d.md", index))

    // Use frontmatter: insight_id, session_id, topic, confidence, source_url, timestamp
    // Body: ## Finding, ## Implication, ## Source
}

// WriteInsights writes all insights for a session.
func (w *Writer) WriteInsights(sessionDir string, insights []think_deep.SubInsight) error {
    for i, insight := range insights {
        if err := w.WriteInsight(sessionDir, insight, i+1); err != nil {
            return err
        }
    }
    return nil
}
```

#### 2. Update Write Method to Include Insights

**File**: `internal/obsidian/writer.go`
**Changes**: Call WriteInsights in main Write method

In `Write()` method after writing workers (around line 49):

```go
// Write insight files
if len(sess.Insights) > 0 {
    // Convert session.Insight to think_deep.SubInsight or use directly
    // For now, we need to pass SubInsights separately
}
```

**Alternative approach**: Add a new method `WriteWithInsights(sess, subInsights)` that the handler calls when insights are available.

#### 3. Update Session MOC Template

**File**: `internal/obsidian/writer.go`
**Changes**: Add Insights section to sessionMOCTemplate

Add after the Sources section:

```go
## Insights

{{if .SubInsights}}
{{range $i, $ins := .SubInsights}}
- [[insights/insight_{{printf "%03d" (inc $i)}}.md|{{$ins.Title}}]] ({{$ins.Topic}})
{{end}}
{{else}}
*No insights captured*
{{end}}
```

#### 4. Wire Up in Handlers

**File**: `internal/repl/handlers/expand.go` and similar handlers
**Changes**: Pass insights to Obsidian writer

After research completion, call the extended write method:

```go
if err := ctx.Obsidian.WriteWithInsights(newSess, result.SubInsights); err != nil {
    ctx.Renderer.Error(fmt.Errorf("save to obsidian: %w", err))
}
```

### Success Criteria

#### Automated Verification

- [x] Build succeeds: `go build ./...`
- [x] Tests pass: `go test ./internal/obsidian/...`
- [x] Existing Obsidian tests still pass (no regression)

#### Manual Verification

- [ ] Run ThinkDeep research → insights/ directory contains insight_001.md, insight_002.md, etc.
- [ ] Each insight file has valid YAML frontmatter
- [ ] Session MOC links to all insight files
- [ ] Clicking insight links in Obsidian opens correct files

---

## Phase 3: Question Handler

### Overview

Create a handler that answers questions using only the chat history and all reports in the session chain (no new research). Uses LLM to synthesize answer from existing content.

### Changes Required

#### 1. Create QuestionHandler

**File**: `internal/repl/handlers/question.go` (NEW)
**Changes**: New handler for question-answering

```go
package handlers

// QuestionHandler answers questions from existing session content.
type QuestionHandler struct{}

func (h *QuestionHandler) Execute(ctx *repl.Context, args []string) error {
    if ctx.Session == nil {
        return fmt.Errorf("no active session. Start research first")
    }

    question := strings.Join(args, " ")

    // Build QA context from session chain
    qaContext := h.buildQAContext(ctx)

    // Call LLM to answer
    answer, err := h.answerFromContext(ctx, question, qaContext)
    if err != nil {
        return err
    }

    // Render answer
    ctx.Renderer.Answer(answer)

    return nil
}
```

#### 2. Build QA Context from Session Chain

**File**: `internal/repl/handlers/question.go`
**Changes**: Traverse session chain and build context

```go
// buildQAContext builds context from all sessions in the chain.
func (h *QuestionHandler) buildQAContext(ctx *repl.Context) string {
    var sessions []*session.Session

    // Walk up the session chain via ParentID
    current := ctx.Session
    for current != nil {
        sessions = append([]*session.Session{current}, sessions...) // Prepend for chronological order
        if current.ParentID == nil {
            break
        }
        parent, err := ctx.Store.Load(*current.ParentID)
        if err != nil {
            break
        }
        current = parent
    }

    // Build context string with all reports and chat history
    var ctx strings.Builder
    for _, sess := range sessions {
        ctx.WriteString(fmt.Sprintf("## Session: %s\n", sess.Query))
        ctx.WriteString(fmt.Sprintf("Report:\n%s\n\n", sess.Report))
        if len(sess.Insights) > 0 {
            ctx.WriteString("Key insights:\n")
            for _, ins := range sess.Insights {
                ctx.WriteString(fmt.Sprintf("- %s: %s\n", ins.Title, ins.Finding))
            }
        }
    }
    return ctx.String()
}
```

#### 3. Answer from Context via LLM

**File**: `internal/repl/handlers/question.go`
**Changes**: LLM call to answer question

```go
func (h *QuestionHandler) answerFromContext(ctx *repl.Context, question, qaContext string) (string, error) {
    prompt := fmt.Sprintf(`You are a research assistant. Answer the following question using ONLY the provided research context. If the answer is not in the context, say "I don't have enough information to answer that based on the current research."

<context>
%s
</context>

Question: %s

Answer concisely and cite which session/report the information came from.`, qaContext, question)

    // Use configured LLM client
    resp, err := ctx.LLM.Chat(ctx.RunContext, []llm.Message{
        {Role: "user", Content: prompt},
    })
    // ... handle response
}
```

#### 4. Add Renderer Method for Answers

**File**: `internal/repl/renderer.go`
**Changes**: Add Answer rendering method

```go
func (r *Renderer) Answer(answer string) {
    fmt.Println()
    fmt.Println(answer)
    fmt.Println()
}
```

#### 5. Register Handler

**File**: `internal/repl/handlers/handlers.go`
**Changes**: Register question handler

```go
add("question", &QuestionHandler{}, "/question <query>", "Ask a question about existing research", "Research")
```

### Success Criteria

#### Automated Verification

- [ ] Build succeeds: `go build ./...`
- [ ] Tests pass: `go test ./internal/repl/handlers/...`
- [ ] No linting errors: `golangci-lint run ./internal/repl/handlers/...`

#### Manual Verification

- [ ] Start research on a topic
- [ ] Run `/question What did the report say about X?`
- [ ] Get answer synthesized from report content
- [ ] Answer includes citation of which session it came from
- [ ] Asking about something not in report gets "I don't have enough information" response

---

## Phase 4: Smart Chat Router with LLM Classification

### Overview

Replace the simple session-exists check with LLM-based query classification. The classifier determines if input is a research query, question about existing content, or expansion request.

### Changes Required

#### 1. Create QueryClassifier

**File**: `internal/repl/classifier.go` (NEW)
**Changes**: LLM-based query classification

```go
package repl

// QueryIntent represents the classified intent of user input.
type QueryIntent struct {
    Type       IntentType // Research, Question, Expand
    Confidence float64    // 0-1 confidence score
    Topic      string     // For Expand: specific topic to expand on
}

type IntentType string

const (
    IntentResearch IntentType = "research" // New research query
    IntentQuestion IntentType = "question" // QA about existing reports
    IntentExpand   IntentType = "expand"   // Expand on specific topic
)

// QueryClassifier classifies user queries using LLM.
type QueryClassifier struct {
    client llm.ChatClient
    model  string // Configurable model for classification
}

// NewQueryClassifier creates a classifier with the specified model.
// Model is developer-configured, not user choice.
func NewQueryClassifier(client llm.ChatClient, model string) *QueryClassifier {
    return &QueryClassifier{client: client, model: model}
}

// Classify determines the intent of a user query given session context.
func (c *QueryClassifier) Classify(ctx context.Context, query string, hasSession bool, sessionSummary string) (*QueryIntent, error) {
    // Build classification prompt
    prompt := c.buildClassificationPrompt(query, hasSession, sessionSummary)

    // Call LLM
    resp, err := c.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    // ... parse structured response (JSON or tagged output)
}
```

#### 2. Classification Prompt

**File**: `internal/repl/classifier.go`
**Changes**: Add classification prompt

```go
func (c *QueryClassifier) buildClassificationPrompt(query, hasSession bool, sessionSummary string) string {
    var contextInfo string
    if hasSession {
        contextInfo = fmt.Sprintf(`The user has an active research session about: %s`, sessionSummary)
    } else {
        contextInfo = "The user has no active research session."
    }

    return fmt.Sprintf(`Classify the following user query into one of three categories:

1. RESEARCH - A new research question requiring web search (e.g., "What are the best practices for X?", "Compare A vs B")
2. QUESTION - A question about existing research that can be answered from current reports (e.g., "What did you find about X?", "Summarize the findings on Y")
3. EXPAND - A request to expand or go deeper on a specific topic from existing research (e.g., "Tell me more about X", "Expand on the section about Y")

Context: %s

User query: "%s"

Respond in JSON format:
{"intent": "RESEARCH|QUESTION|EXPAND", "confidence": 0.0-1.0, "topic": "specific topic if EXPAND"}`, contextInfo, query)
}
```

#### 3. Add Classifier to Context

**File**: `internal/repl/router.go`
**Changes**: Add Classifier field to Context

```go
type Context struct {
    // ... existing fields ...
    Classifier *QueryClassifier // LLM-based query classifier
}
```

#### 4. Update Router to Use Classifier

**File**: `internal/repl/router.go`
**Changes**: Replace simple session check with classifier

In `Route()` method, replace lines 59-73:

```go
// Natural language with session - classify intent
if r.ctx.Session != nil && r.ctx.Classifier != nil {
    sessionSummary := r.ctx.Session.Query // Or more detailed summary
    intent, err := r.ctx.Classifier.Classify(r.ctx.RunContext, parsed.RawText, true, sessionSummary)
    if err != nil {
        // Fallback to expand on classification error
        handler, ok := r.handlers["expand"]
        if ok {
            return handler, []string{parsed.RawText}, nil
        }
    }

    switch intent.Type {
    case IntentQuestion:
        handler, ok := r.handlers["question"]
        if ok {
            return handler, []string{parsed.RawText}, nil
        }
    case IntentExpand:
        handler, ok := r.handlers["expand"]
        if ok {
            args := []string{parsed.RawText}
            if intent.Topic != "" {
                args = []string{intent.Topic}
            }
            return handler, args, nil
        }
    case IntentResearch:
        // Use storm for new research even with session
        handler, ok := r.handlers["storm"]
        if ok {
            return handler, []string{parsed.RawText}, nil
        }
    }
}

// Fallback to existing behavior
if r.ctx.Session != nil {
    handler, ok := r.handlers["expand"]
    // ...
}
```

#### 5. Initialize Classifier in Main

**File**: `cmd/research/main.go`
**Changes**: Create and inject classifier

```go
// Create classifier with configured model (developer choice, not user)
classifierModel := cfg.ClassifierModel // e.g., "claude-3-haiku-20240307" for fast/cheap classification
classifierClient := llm.NewClient(classifierModel, cfg.APIKey)
classifier := repl.NewQueryClassifier(classifierClient, classifierModel)

// Add to context
ctx.Classifier = classifier
```

#### 6. Add ClassifierModel to Config

**File**: `internal/config/config.go`
**Changes**: Add classifier model configuration

```go
type Config struct {
    // ... existing fields ...
    ClassifierModel string // Model for query classification (e.g., "claude-3-haiku-20240307")
}
```

Default to a fast, cheap model like Haiku for classification.

### Success Criteria

#### Automated Verification

- [ ] Build succeeds: `go build ./...`
- [ ] Tests pass: `go test ./internal/repl/...`
- [ ] No linting errors: `golangci-lint run ./internal/repl/...`

#### Manual Verification

- [ ] Start research on "Swedish political parties"
- [ ] Type "What did you find about Moderaterna?" → routes to question handler
- [ ] Type "Tell me more about tax policies" → routes to expand handler
- [ ] Type "What are the immigration policies in Germany?" → routes to research (new topic)
- [ ] Classification happens quickly (Haiku latency ~200-500ms)

---

## Phase 5: Expand Knowledge Pipeline with Context Injection

### Overview

When expanding research, inject prior context (findings, visited URLs, existing report structure) into the ThinkDeep supervisor before the diffusion loop starts. This enables more efficient research that builds on existing knowledge.

### Changes Required

#### 1. Create InjectionContext Type

**File**: `internal/think_deep/injection.go` (NEW)
**Changes**: Define context injection structure

```go
package think_deep

// InjectionContext provides prior knowledge for expansion workflows.
// This context is injected into the supervisor state before research begins.
type InjectionContext struct {
    // Prior findings to preserve and build upon
    PreviousFindings []string
    ValidatedFacts   []string

    // URLs already visited (for deduplication)
    VisitedURLs []string

    // Existing report structure
    ExistingReport   string
    ExistingOutline  []string

    // Expansion focus
    ExpansionTopic   string
    RelatedTopics    []string
    KnownGaps        []string
}
```

#### 2. Add Functional Options to ThinkDeep

**File**: `internal/orchestrator/think_deep.go`
**Changes**: Add option functions for injection

```go
// ThinkDeepOption configures the ThinkDeep orchestrator.
type ThinkDeepOption func(*ThinkDeep)

// WithInjectionContext provides prior context for expansion workflows.
func WithInjectionContext(ctx *think_deep.InjectionContext) ThinkDeepOption {
    return func(td *ThinkDeep) {
        td.injectionContext = ctx
    }
}

// WithVisitedURLs pre-populates visited URLs for deduplication.
func WithVisitedURLs(urls []string) ThinkDeepOption {
    return func(td *ThinkDeep) {
        td.preVisitedURLs = urls
    }
}

// WithExistingFindings provides prior research to build upon.
func WithExistingFindings(findings []string) ThinkDeepOption {
    return func(td *ThinkDeep) {
        td.existingFindings = findings
    }
}

// WithExpansionFocus narrows research to specific topic.
func WithExpansionFocus(topic string) ThinkDeepOption {
    return func(td *ThinkDeep) {
        td.expansionFocus = topic
    }
}
```

#### 3. Apply Injection in Research Method

**File**: `internal/orchestrator/think_deep.go`
**Changes**: Use injection context when initializing supervisor

In `Research()` method, after creating supervisor state (around line 189-207):

```go
// Apply injection context if provided
if td.injectionContext != nil {
    // Pre-populate visited URLs for deduplication
    for _, url := range td.injectionContext.VisitedURLs {
        state.AddVisitedURL(url)
    }

    // Add existing findings as notes
    for _, finding := range td.injectionContext.PreviousFindings {
        state.AddNote(finding)
    }

    // Modify research brief to focus on expansion
    if td.injectionContext.ExpansionTopic != "" {
        researchBrief = td.enhanceBriefForExpansion(researchBrief, td.injectionContext)
    }
}
```

#### 4. Build Injection Context in ExpandHandler

**File**: `internal/repl/handlers/expand.go`
**Changes**: Build and pass injection context

```go
func (h *ExpandHandler) runDeep(ctx *repl.Context, query string, sess *session.Session) error {
    // Build injection context from parent session
    injection := h.buildInjectionContext(ctx)

    // Create orchestrator with injection options
    orch := orchestrator.NewThinkDeep(ctx.Bus, ctx.Config,
        orchestrator.WithInjectionContext(injection),
        orchestrator.WithVisitedURLs(injection.VisitedURLs),
        orchestrator.WithExpansionFocus(sess.Query),
    )

    // ... rest of method
}

func (h *ExpandHandler) buildInjectionContext(ctx *repl.Context) *think_deep.InjectionContext {
    // Walk session chain and accumulate context
    var allFindings []string
    var allURLs []string
    var existingReport string

    current := ctx.Session
    for current != nil {
        // Accumulate findings from insights
        for _, ins := range current.Insights {
            allFindings = append(allFindings, ins.Finding)
        }
        // Accumulate sources as visited URLs
        allURLs = append(allURLs, current.Sources...)
        // Keep most recent report
        if existingReport == "" {
            existingReport = current.Report
        }

        // Walk to parent
        if current.ParentID == nil {
            break
        }
        parent, err := ctx.Store.Load(*current.ParentID)
        if err != nil {
            break
        }
        current = parent
    }

    return &think_deep.InjectionContext{
        PreviousFindings: allFindings,
        VisitedURLs:      allURLs,
        ExistingReport:   existingReport,
    }
}
```

#### 5. Enhance Brief for Expansion

**File**: `internal/orchestrator/think_deep.go`
**Changes**: Modify research brief to focus expansion

```go
func (td *ThinkDeep) enhanceBriefForExpansion(brief string, injection *think_deep.InjectionContext) string {
    var enhanced strings.Builder

    enhanced.WriteString(brief)
    enhanced.WriteString("\n\n## Expansion Context\n\n")
    enhanced.WriteString(fmt.Sprintf("This is a follow-up research expanding on: %s\n\n", injection.ExpansionTopic))

    if len(injection.PreviousFindings) > 0 {
        enhanced.WriteString("### Known Findings (do not re-research these):\n")
        for _, finding := range injection.PreviousFindings[:min(10, len(injection.PreviousFindings))] {
            enhanced.WriteString(fmt.Sprintf("- %s\n", finding))
        }
    }

    if len(injection.KnownGaps) > 0 {
        enhanced.WriteString("\n### Known Gaps (prioritize these):\n")
        for _, gap := range injection.KnownGaps {
            enhanced.WriteString(fmt.Sprintf("- %s\n", gap))
        }
    }

    return enhanced.String()
}
```

### Success Criteria

#### Automated Verification

- [ ] Build succeeds: `go build ./...`
- [ ] Tests pass: `go test ./internal/orchestrator/... ./internal/think_deep/...`
- [ ] No linting errors: `golangci-lint run ./internal/orchestrator/... ./internal/think_deep/...`

#### Manual Verification

- [ ] Start research on "Swedish political parties economic policies"
- [ ] Note the number of sources and iterations
- [ ] Expand on "corporate tax proposals"
- [ ] Verify expansion:
  - [ ] Uses fewer iterations (prior context reduces search space)
  - [ ] Doesn't re-fetch URLs from parent session
  - [ ] Builds on existing findings rather than starting fresh
- [ ] Final report includes both original and expanded content

---

## Testing Strategy

### Unit Tests

| Phase | Test File                                 | Key Tests                                  |
| ----- | ----------------------------------------- | ------------------------------------------ |
| 1     | `internal/think_deep/state_test.go`       | SubInsight struct, Add/Get methods         |
| 1     | `internal/agents/sub_researcher_test.go`  | Insight extraction from search results     |
| 2     | `internal/obsidian/writer_test.go`        | WriteInsight, WriteInsights methods        |
| 3     | `internal/repl/handlers/question_test.go` | QA context building, answer generation     |
| 4     | `internal/repl/classifier_test.go`        | Classification accuracy for each intent    |
| 5     | `internal/think_deep/injection_test.go`   | InjectionContext struct, builder functions |

### Integration Tests

| Phase | Test File                                  | Key Tests                                         |
| ----- | ------------------------------------------ | ------------------------------------------------- |
| 1-2   | `internal/e2e/think_deep_insights_test.go` | Full ThinkDeep run captures and persists insights |
| 3-4   | `internal/e2e/interactive_flow_test.go`    | Research → Question → Expand flow                 |
| 5     | `internal/e2e/expansion_context_test.go`   | Expansion uses prior context correctly            |

### Manual Testing Steps

1. **Phase 1-2**: Run `/deep What are electric vehicle battery technologies?`
   - Check `insights/` directory in Obsidian vault
   - Verify insight files have valid content and frontmatter

2. **Phase 3**: After research, run `/question What did you find about solid-state batteries?`
   - Verify answer comes from report, not new research
   - Verify "I don't have enough information" for unrelated questions

3. **Phase 4**: With active session, type natural queries:
   - "What about lithium mining?" → should classify as question
   - "Expand on manufacturing challenges" → should classify as expand
   - "Compare Tesla vs BYD battery strategies" → should classify as research

4. **Phase 5**: Run `/expand solid-state battery commercialization`
   - Verify fewer iterations than fresh research
   - Verify no duplicate URL fetches
   - Verify final report integrates prior findings

---

## Performance Considerations

- **Classification latency**: Using Haiku keeps classification under 500ms
- **Insight extraction**: Parse search results synchronously during sub-researcher execution (no additional LLM call)
- **Context building**: Walk session chain once, cache if needed
- **Injection overhead**: Minimal - just pre-populating maps and arrays

---

## Migration Notes

No migration needed - this is additive functionality:

- Existing sessions work unchanged
- New fields (SubInsights) default to empty
- Classification is opt-in via Classifier presence in context
- Injection only happens when options provided

---

## References

- Original research: `thoughts/shared/research/2025-12-03_interactive-cli-agentic-research.md`
- ThinkDeep state: `internal/think_deep/state.go:20-45`
- Obsidian writer: `internal/obsidian/writer.go:27-62`
- Router: `internal/repl/router.go:46-74`
- Expand handler: `internal/repl/handlers/expand.go:21-88`
- Supervisor agent: `internal/agents/supervisor.go:93-200`
