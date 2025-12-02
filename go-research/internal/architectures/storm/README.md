# STORM Architecture

**STORM** = Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking

This is how we write Wikipedia-quality research reports automatically.

---

## How It Works (30-second version)

```
User Query: "What are the implications of quantum computing on cryptography?"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: PERSPECTIVE DISCOVERY                                             │
│  "Who should we interview about this topic?"                                │
│                                                                             │
│  Output: 3-5 expert perspectives                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                        │
│  │ Cryptographer│ │ Quantum      │ │ Security     │                        │
│  │              │ │ Physicist    │ │ Analyst      │                        │
│  └──────────────┘ └──────────────┘ └──────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: CONVERSATION SIMULATION  (runs in parallel)                       │
│  "Interview each expert"                                                    │
│                                                                             │
│  WikiWriter ←→ TopicExpert dialogues (3-5 turns each)                       │
│                                                                             │
│  Each conversation:                                                         │
│  1. WikiWriter asks question based on perspective                           │
│  2. Expert searches the web                                                 │
│  3. Expert answers with citations                                           │
│  4. Repeat until "Thank you for your help!"                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: CROSS-VALIDATION                                                  │
│  "Do the experts agree? What did we miss?"                                  │
│                                                                             │
│  - Extract facts from all conversations                                     │
│  - Find contradictions between perspectives                                 │
│  - Identify knowledge gaps                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SYNTHESIS                                                         │
│  "Write the final report"                                                   │
│                                                                             │
│  Two-phase outline:                                                         │
│  1. Draft outline from conversations                                        │
│  2. Refine outline for coherence                                            │
│  3. Generate full report with inline citations                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                            Final Research Report
```

---

## The Core Innovation: Simulated Conversations

Instead of a single AI doing all the research, STORM simulates **expert interviews**.

### One Conversation Turn

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SINGLE CONVERSATION TURN                            │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ WIKIWRITER (has a persona, e.g., "Cryptographer")                    │  │
│  │                                                                      │  │
│  │ Asks: "How does Shor's algorithm threaten RSA encryption?"           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TOPIC EXPERT                                                         │  │
│  │                                                                      │  │
│  │ 1. Converts question → search queries                                │  │
│  │    ["Shor's algorithm RSA", "quantum factoring cryptography"]        │  │
│  │                                                                      │  │
│  │ 2. Executes web searches (Brave API)                                 │  │
│  │                                                                      │  │
│  │ 3. Synthesizes answer with citations:                                │  │
│  │    "Shor's algorithm can factor large numbers exponentially          │  │
│  │    faster than classical computers, breaking RSA-2048 in hours       │  │
│  │    rather than billions of years [Source: arxiv.org/...]"            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ WIKIWRITER                                                           │  │
│  │                                                                      │  │
│  │ Follow-up: "What post-quantum alternatives exist?"                   │  │
│  │                                                                      │  │
│  │ ... OR if satisfied: "Thank you so much for your help!"              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Exit Condition

A conversation ends when WikiWriter says **"Thank you so much for your help!"** (or similar).

This happens when the WikiWriter persona feels it has gathered enough information for its perspective.

---

## Phase-by-Phase Breakdown

### Phase 1: Perspective Discovery

**Input:** User query
**Output:** 3-5 expert perspectives

```go
// Each perspective has:
type Perspective struct {
    Name      string   // "Cryptographer"
    Focus     string   // "Impact on current encryption standards"
    Questions []string // ["How does quantum computing break RSA?", ...]
}
```

**How it works:**
1. Survey related topics via web search
2. LLM identifies expert angles that would provide comprehensive coverage
3. Each perspective gets a name, focus area, and initial questions

---

### Phase 2: Conversation Simulation

**Input:** Topic + Perspectives
**Output:** Conversation transcripts with facts and sources

**Runs in parallel** - all perspectives are interviewed simultaneously.

```
                    ┌─────────────────────────────────────┐
                    │           PARALLEL EXECUTION        │
                    │                                     │
    ┌───────────────┼───────────────┬─────────────────────┤
    │               │               │                     │
    ▼               ▼               ▼                     ▼
┌────────┐    ┌────────┐     ┌────────┐            ┌────────┐
│Conv 1  │    │Conv 2  │     │Conv 3  │            │Conv N  │
│        │    │        │     │        │            │        │
│Crypto- │    │Quantum │     │Security│    ...     │Basic   │
│grapher │    │Physicist│    │Analyst │            │Fact    │
│        │    │        │     │        │            │Writer  │
│3-5 turns│   │3-5 turns│    │3-5 turns│           │3-5 turns│
└────────┘    └────────┘     └────────┘            └────────┘
    │               │               │                     │
    └───────────────┴───────────────┴─────────────────────┘
                              │
                              ▼
                    All facts & sources collected
```

**Each turn (see conversation.go:78-142):**
1. `wikiWriterAsk()` - Generate question based on persona + history
2. Check for exit phrase ("Thank you so much for your help!")
3. `expertGenerateQueries()` - Convert question to 1-3 search queries
4. `executeSearches()` - Run web searches via Brave API
5. `expertAnswer()` - Synthesize answer with inline citations
6. Store turn in history, repeat

---

### Phase 3: Cross-Validation (Analysis)

**Input:** All facts from all conversations
**Output:** Contradictions, knowledge gaps, validated facts

```go
// What the analysis agent does:
type AnalysisResult struct {
    Contradictions []Contradiction  // "Expert A says X, Expert B says Y"
    KnowledgeGaps  []string         // "No one covered topic Z"
    ValidatedFacts []Fact           // Facts confirmed by multiple sources
}
```

---

### Phase 4: Synthesis (Report Generation)

**Input:** Conversations + Analysis
**Output:** Final structured report

**Two-phase outline generation:**

```
Phase 4a: DRAFT OUTLINE
─────────────────────────
- Extract sections from conversations
- Map facts to sections
- Identify main themes

Phase 4b: REFINE OUTLINE
─────────────────────────
- Improve logical flow
- Merge redundant sections
- Add transitions

Phase 4c: WRITE REPORT
─────────────────────────
- Generate full prose per section
- Include inline citations [Source: URL]
- Add executive summary
```

---

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| **Orchestrator** | `internal/orchestrator/deep_storm.go` | Main workflow coordination |
| **Conversation Simulator** | `internal/agents/conversation.go` | WikiWriter↔Expert dialogues |
| **Perspective Discovery** | `internal/planning/perspectives.go` | Find expert angles |
| **Analysis Agent** | `internal/agents/analysis.go` | Cross-validation |
| **Synthesis Agent** | `internal/agents/synthesis.go` | Report generation |
| **Architecture Adapter** | `internal/architectures/storm/storm.go` | Public interface |

---

## CLI Usage

```bash
# Start STORM research
/storm "What are the implications of quantum computing on cryptography?"

# Or just type your question (routes to STORM by default)
What are the implications of quantum computing on cryptography?
```

**Available Commands:**
- `/storm <query>` - Multi-perspective research with conversations
- `/fast <query>` - Quick single-worker research (simpler, faster)
- `/expand <text>` - Expand on current research
- `/sessions` - List all sessions
- `/load <id>` - Load a previous session
- `/new` - Clear session and start fresh

---

## Configuration

```go
// Default: 4 turns per conversation (configurable)
ConversationConfig{
    MaxTurns: 4,
}

// Usually generates 3-5 perspectives
// Plus "Basic Fact Writer" always added for foundational coverage
```

---

## Event Flow

Every step emits events for UI/logging:

```
EventResearchStarted
    │
    ▼
EventQueryAnalyzed (perspectives discovered)
    │
    ▼
EventPlanCreated (perspectives list)
    │
    ├─► EventConversationStarted (per perspective, parallel)
    │       │
    │       ▼
    │   EventWorkerProgress (per turn)
    │       │
    │       ▼
    │   EventConversationCompleted
    │
    ▼
EventAnalysisStarted
    │
    ▼
EventAnalysisComplete
    │
    ▼
EventSynthesisStarted
    │
    ▼
EventSynthesisComplete
    │
    ▼
EventCostUpdated (final)
```

---

## Why This Works

1. **Multiple perspectives prevent blind spots** - A single researcher might miss angles
2. **Grounded in real sources** - Every answer cites web search results
3. **Parallel execution** - 3-5 conversations run simultaneously
4. **Natural exit condition** - Conversations end when the "interviewer" is satisfied
5. **Cross-validation catches errors** - Contradictions surface between experts

---

## References

- **[Stanford STORM Paper](https://arxiv.org/abs/2402.14207)** - Original research
- **[STORM GitHub](https://github.com/stanford-oval/storm)** - Reference implementation
- **[ReAct Paper](https://arxiv.org/abs/2210.03629)** - Reasoning + Acting pattern
