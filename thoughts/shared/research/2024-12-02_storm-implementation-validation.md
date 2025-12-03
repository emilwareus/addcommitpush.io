---
date: 2024-12-02T17:30:00+01:00
researcher: Claude
git_commit: 160381af670355a4c2899b504fdd2748b64704c5
branch: feat/custom-deep-research
repository: addcommitpush.io
topic: "STORM Implementation Validation: Go vs Original Python"
tags: [research, storm, deep-research, architecture, validation]
status: complete
last_updated: 2024-12-02
last_updated_by: Claude
---

# Research: STORM Implementation Validation - Go vs Original Python

**Date**: 2024-12-02T17:30:00+01:00
**Researcher**: Claude
**Git Commit**: 160381af670355a4c2899b504fdd2748b64704c5
**Branch**: feat/custom-deep-research
**Repository**: addcommitpush.io

## Research Question

Validate that the Go implementation of STORM matches the original Stanford STORM research paper and Python codebase. Identify key differences in the agentic loop and underlying techniques, and create an architecture plan to align the implementations.

---

## Summary

The Go implementation **deviates significantly** from the original STORM algorithm. While it captures the spirit of multi-perspective research, it uses a fundamentally different approach:

| Aspect | Original STORM | Go Implementation |
|--------|---------------|-------------------|
| Information Gathering | **Simulated Conversations** (multi-turn Q&A) | **ReAct Loops** (Think→Act→Observe→Evaluate) |
| Perspective Discovery | **Survey-based** (scrape related Wikipedia articles) | **Single-shot LLM** (no external survey) |
| Outline Creation | **Two-phase** (draft + refinement with conversations) | **Single-shot** (no refinement) |
| Section Writing | **Parallel** with semantic retrieval | **Sequential** with validated facts |
| Analysis Phase | **None** | **Cross-validation, contradiction detection** (novel addition) |

**Key Finding**: The Go implementation is a valid research agent, but it's NOT a faithful STORM implementation. It's closer to a "ReAct + Multi-Perspective + Analysis" hybrid.

---

## Detailed Findings

### 1. Perspective Discovery

#### Original STORM (`knowledge_storm/storm_wiki/modules/persona_generator.py`)

**Two-step process:**
1. **Survey Related Topics** (lines 80-92):
   - LLM generates related Wikipedia topic URLs
   - HTTP fetch of each related article
   - Extract table of contents using BeautifulSoup
   - Build inspiration examples from article structures

2. **Generate Personas** (lines 95-97):
   - Input: Topic + related article structures
   - Output: N personas with descriptions
   - Always includes "Basic fact writer" as default

**Prompt** (line 56-59):
```
"You need to select a group of Wikipedia editors who will work together to create
a comprehensive article on the topic. Each of them represents a different
perspective, role, or affiliation related to this topic. You can use other
Wikipedia pages of related topics for inspiration."
```

#### Go Implementation (`internal/planning/perspectives.go`)

**Single-shot process:**
- **Lines 35-51**: Single LLM call requests 3-5 perspectives
- **NO** related topic survey
- **NO** Wikipedia scraping for structure inspiration
- Default fallback: "Technical Expert", "Practical User", "Critic"

**Gap**: The Go implementation misses the key insight that **inspecting related article structures** leads to more relevant and comprehensive perspectives.

---

### 2. Conversation Simulation vs ReAct Loops

#### Original STORM (`knowledge_storm/storm_wiki/modules/knowledge_curation.py`)

**Simulated Expert Conversations:**
- For each perspective, simulate a multi-turn dialogue (default: 3-5 turns)
- **WikiWriter** (with persona) asks questions
- **TopicExpert** (grounded on search) answers
- Conversation history enables **follow-up questions**
- Conversations run **in parallel** per perspective

**Loop Structure** (lines 60-80):
```python
for _ in range(self.max_turn):  # default max_turn = 3
    # WikiWriter asks question (grounded on persona + history)
    user_utterance = self.wiki_writer(topic, persona, dlg_history).question

    # Exit conditions
    if "Thank you so much for your help!" in user_utterance:
        break

    # TopicExpert answers (search → synthesize)
    expert_output = self.topic_expert(topic, user_utterance, ground_truth_url)

    # Store dialogue turn with sources
    dlg_history.append(DialogueTurn(...))
```

**Key Innovation**: The conversation format naturally leads to **deeper, more specific questions** because the WikiWriter sees what's already been covered.

#### Go Implementation (`internal/agents/search.go:85-175`)

**ReAct Loop:**
- For each perspective, run a ReAct loop (max 3 iterations)
- Think → Act (search) → Observe (extract facts) → Evaluate (find gaps)
- No simulated conversation - just iterative search

**Loop Structure** (lines 103-167):
```go
for iter := 0; iter < maxIterations && !sufficientCoverage; iter++ {
    // Generate queries from perspective questions
    queries := generateQueries(perspective)

    // Execute web searches
    results := search(queries)

    // Extract facts from results
    facts := extractFacts(results)

    // Identify knowledge gaps
    gaps := analyzeGaps(facts, perspective)

    // Generate follow-up queries OR exit
    if len(gaps) < 2 && len(facts) >= 5 {
        break  // sufficient coverage
    }
}
```

**Gap**: The ReAct approach is more mechanical. It doesn't capture the **emergent questioning** that happens when a persona "reads" expert answers and naturally asks follow-up questions.

---

### 3. Outline Generation

#### Original STORM (`knowledge_storm/storm_wiki/modules/outline_generation.py`)

**Two-phase refinement:**

1. **Draft Outline** (lines 110-112):
   - Input: Topic ONLY
   - Uses LLM's parametric knowledge
   - Creates baseline structure

2. **Refined Outline** (lines 117-123):
   - Input: Topic + Draft Outline + ALL conversation history
   - Concatenates all dialogues from all personas
   - Refines based on collected information

**Prompt for refinement** (line 154-159):
```
"Improve an outline for a Wikipedia page. You already have a draft outline that
covers the general information. Now you want to improve it based on the
information learned from an information-seeking conversation to make it more
informative."
```

#### Go Implementation (`internal/agents/synthesis.go:85-127`)

**Single-shot generation:**
- Input: Perspectives + fact counts only
- No draft phase
- No incorporation of collected facts into outline

**Gap**: The Go implementation's outline is **not informed by the research findings**. In STORM, the outline emerges from the research; in Go, it's generated independently.

---

### 4. Analysis Phase (Go-Only)

#### Original STORM
**No analysis phase** - facts are used directly for section writing.

#### Go Implementation (`internal/agents/analysis.go`)

**Three-step analysis:**
1. **Cross-validation**: Score facts 0-1, identify corroborating sources
2. **Contradiction detection**: Find conflicts between facts
3. **Knowledge gap identification**: Find missing coverage areas

**This is a novel addition** not present in STORM. It adds value but changes the algorithm significantly.

---

### 5. Article Generation

#### Original STORM (`knowledge_storm/storm_wiki/modules/article_generation.py`)

**Parallel section writing:**
- Sections generated independently via ThreadPoolExecutor
- Each section uses **semantic retrieval** from conversation corpus
- SentenceTransformer embeddings for similarity search
- Retrieved snippets are cited inline

#### Go Implementation (`internal/agents/synthesis.go:130-211`)

**Sequential section writing:**
- Sections generated one-by-one
- Uses validated facts with confidence scores
- No semantic retrieval - all facts provided to each section
- Progress streaming between sections

---

## Architecture Fix Plan

To align the Go implementation with the original STORM algorithm, the following changes are needed:

### Phase 1: Perspective Discovery Enhancement

**File**: `internal/planning/perspectives.go`

**Changes:**
1. Add `SurveyRelatedTopics()` function:
   - Generate related topic queries via LLM
   - Fetch Wikipedia articles (or use web search)
   - Extract structure/outline from each
   - Build inspiration context

2. Modify `Discover()` to:
   - Call `SurveyRelatedTopics()` first
   - Pass related article structures to persona generation prompt
   - Update prompt to match STORM's `GenPersona` signature

**New Functions:**
```go
// perspectives.go

func (d *PerspectiveDiscoverer) SurveyRelatedTopics(ctx context.Context, topic string) ([]TopicOutline, error) {
    // 1. Generate related topic queries
    // 2. Search or fetch Wikipedia for each
    // 3. Extract section headings
    // 4. Return structured outlines
}

func (d *PerspectiveDiscoverer) Discover(ctx context.Context, topic string) ([]Perspective, error) {
    // 1. Survey related topics
    relatedOutlines, _ := d.SurveyRelatedTopics(ctx, topic)

    // 2. Format as inspiration context
    inspiration := formatOutlinesAsContext(relatedOutlines)

    // 3. Generate personas with inspiration
    return d.generatePersonasWithInspiration(ctx, topic, inspiration)
}
```

### Phase 2: Implement Conversation Simulation

**New File**: `internal/agents/conversation.go`

**New Types:**
```go
type DialogueTurn struct {
    Question      string
    Answer        string
    SearchQueries []string
    Sources       []Source
}

type ConversationSimulator struct {
    wikiWriter   *WikiWriterAgent
    topicExpert  *TopicExpertAgent
    maxTurns     int // default: 3
}
```

**Key Functions:**
```go
func (s *ConversationSimulator) SimulateConversation(
    ctx context.Context,
    topic string,
    perspective Perspective,
) ([]DialogueTurn, error) {
    var history []DialogueTurn

    for turn := 0; turn < s.maxTurns; turn++ {
        // 1. WikiWriter generates question (with persona + history)
        question := s.wikiWriter.AskQuestion(ctx, topic, perspective, history)

        // Check for conversation end
        if strings.Contains(question, "Thank you so much") {
            break
        }

        // 2. TopicExpert answers (search + synthesize)
        queries := s.topicExpert.GenerateQueries(ctx, topic, question)
        results := s.topicExpert.Search(ctx, queries)
        answer := s.topicExpert.SynthesizeAnswer(ctx, topic, question, results)

        // 3. Record turn
        history = append(history, DialogueTurn{
            Question:      question,
            Answer:        answer,
            SearchQueries: queries,
            Sources:       extractSources(results),
        })
    }

    return history, nil
}
```

### Phase 3: Two-Phase Outline Generation

**File**: `internal/agents/synthesis.go`

**Changes:**
1. Add `generateDraftOutline()` - topic only
2. Add `refineOutline()` - topic + draft + conversations
3. Modify `generateOutline()` to use two-phase process

```go
func (a *SynthesisAgent) GenerateOutline(
    ctx context.Context,
    topic string,
    conversations map[string][]DialogueTurn,
) ([]string, error) {
    // Phase 1: Draft outline from parametric knowledge
    draftOutline := a.generateDraftOutline(ctx, topic)

    // Phase 2: Refine with conversation insights
    conversationContext := formatConversations(conversations)
    refinedOutline := a.refineOutline(ctx, topic, draftOutline, conversationContext)

    return refinedOutline, nil
}
```

### Phase 4: Update Orchestrator Flow

**File**: `internal/orchestrator/deep_eventsourced.go`

**Changes:**
1. Replace search workers with conversation simulation
2. Store conversations in state (for outline refinement)
3. Update synthesis to use two-phase outline

**New Flow:**
```
1. Perspective Discovery (with related topic survey)
   └─> Emit PlanCreatedEvent with perspectives

2. Conversation Simulation (parallel per perspective)
   └─> For each perspective:
       └─> Simulate 3-5 turn conversation
       └─> Emit ConversationCompletedEvent with turns

3. Analysis Phase (optional - keep as enhancement)
   └─> Cross-validate facts from conversations
   └─> Detect contradictions
   └─> Emit AnalysisCompletedEvent

4. Synthesis Phase
   └─> Generate draft outline (topic only)
   └─> Refine outline with conversations
   └─> Write sections with semantic retrieval
   └─> Emit ReportGeneratedEvent
```

### Phase 5: Semantic Retrieval for Sections

**New File**: `internal/retrieval/semantic.go`

**Functions:**
```go
type ConversationCorpus struct {
    conversations map[string][]DialogueTurn
    embeddings    map[string][]float32  // snippet -> embedding
}

func (c *ConversationCorpus) RetrieveRelevant(
    query string,
    topK int,
) []RetrievedSnippet {
    // 1. Embed query
    // 2. Compute cosine similarity with all snippets
    // 3. Return top-K most similar
}
```

---

## Implementation Priority

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| **P0** | Conversation Simulation | High | Critical - core STORM mechanism |
| **P1** | Related Topic Survey | Medium | Important - perspective quality |
| **P1** | Two-Phase Outline | Medium | Important - outline quality |
| **P2** | Semantic Retrieval | Medium | Nice-to-have - section quality |
| **P3** | Keep Analysis Phase | None | Already done - adds value |

---

## Prompts to Port

The following prompts from the Python implementation should be ported to Go:

### Required Prompts

1. **FindRelatedTopic** (`persona_generator.py:48-53`)
2. **GenPersona** (`persona_generator.py:56-65`) - with inspiration context
3. **AskQuestionWithPersona** (`knowledge_curation.py:139-151`)
4. **QuestionToQuery** (`knowledge_curation.py:154-164`)
5. **AnswerQuestion** (`knowledge_curation.py:167-178`)
6. **WritePageOutline** (`outline_generation.py:128-137`) - draft
7. **WritePageOutlineFromConv** (`outline_generation.py:153-167`) - refinement

### Optional Prompts (for polishing)

8. **WriteLeadSection** (`article_polish.py:56-65`)
9. **PolishPage** (`article_polish.py:68-72`)

---

## Code References

### Original STORM (Python)
- Entry point: `knowledge_storm/storm_wiki/engine.py:341-442`
- Persona generation: `knowledge_storm/storm_wiki/modules/persona_generator.py:114-154`
- Conversation simulation: `knowledge_storm/storm_wiki/modules/knowledge_curation.py:47-81`
- Outline generation: `knowledge_storm/storm_wiki/modules/outline_generation.py:22-72`

### Go Implementation
- Entry point: `internal/orchestrator/deep_eventsourced.go:88-260`
- Perspective discovery: `internal/planning/perspectives.go:34-77`
- Search agent: `internal/agents/search.go:85-175`
- Synthesis agent: `internal/agents/synthesis.go:58-279`

---

## Open Questions

1. **Should we keep the Analysis phase?** It's not in STORM but adds value (cross-validation, contradiction detection). Recommend: Keep as optional enhancement.

2. **Parallel vs Sequential conversations?** STORM runs conversations in parallel. Should match for performance.

3. **Wikipedia API vs Web Search for topic survey?** STORM uses Wikipedia API. Could use web search as fallback.

4. **Embedding model for semantic retrieval?** STORM uses `paraphrase-MiniLM-L6-v2`. Need Go equivalent (or API call).

---

## Conclusion

The Go implementation is a functional research agent but **not a faithful STORM implementation**. The key missing piece is the **simulated conversation** mechanism, which is STORM's core innovation. The ReAct loop approach, while valid, produces different results.

To create a true STORM implementation in Go:
1. Replace ReAct loops with conversation simulation
2. Add related topic survey for perspective discovery
3. Implement two-phase outline generation
4. Add semantic retrieval for section writing

Estimated effort: **2-3 weeks** for full alignment.
