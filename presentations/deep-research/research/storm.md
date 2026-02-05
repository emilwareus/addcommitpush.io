# STORM Architecture Deep Dive

## Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking

---

## Overview

STORM is a research methodology developed by Stanford University's OVAL Lab that produces comprehensive, well-sourced reports through multi-perspective conversation simulation.

**Paper:** arXiv:2402.14207 (February 2024, NAACL 2024)
**Authors:** Yijia Shao, Yucheng Jiang, Theodore A Kanell, Peter Xu, Omar Khattab, Monica Lam
**Repository:** https://github.com/stanford-oval/storm

---

## Core Concept

STORM models the "pre-writing" phase of research that human writers naturally follow:
1. Research the topic from multiple perspectives
2. Identify key questions and knowledge gaps
3. Organize information into a coherent outline
4. Generate the final article

The key innovation is simulating **multi-perspective conversations** where different "expert personas" research the same topic from their unique viewpoints.

---

## The Four Phases

### Phase 1: DISCOVER (Perspective Generation)

**What happens:**
- Survey related topics via web search
- LLM identifies 3-6 expert perspectives
- Each perspective gets: Name, Focus Area, Initial Questions

**Example perspectives for "Cloud Security Sandboxing":**
1. Cloud Security Architect - Multi-tenant isolation, threat containment
2. Performance Engineer - Startup latency optimization, resource management
3. GCP Platform Specialist - GCP-native implementation patterns
4. DevSecOps Engineer - Secure CI/CD integration, immutable infrastructure

**Code location:** `knowledge_storm/storm_wiki/modules/persona_generator.py`

### Phase 2: CONVERSE (Parallel Conversation Simulation)

**What happens:**
- For each perspective, simulate a conversation between:
  - **WikiWriter:** Asks questions based on the persona's focus
  - **TopicExpert:** Converts questions → search queries, executes searches, synthesizes answers with citations

**Conversation flow:**
1. WikiWriter asks a question based on perspective's focus
2. TopicExpert converts question to search queries
3. TopicExpert executes web searches
4. TopicExpert synthesizes answer with inline citations
5. WikiWriter asks follow-up questions or says "Thank you for your help!"
6. Repeat until conversation ends

**Key feature:** Conversations run in PARALLEL across perspectives

**Code location:** `knowledge_storm/storm_wiki/modules/knowledge_curation.py`

### Phase 3: ANALYZE (Fact Extraction & Validation)

**What happens:**
- Extract all facts from conversations
- Detect contradictions between perspectives
- Identify knowledge gaps
- Fill gaps with targeted searches

**Output:** `StormInformationTable` containing all validated facts with sources

**Code location:** Part of `knowledge_curation.py`

### Phase 4: SYNTHESIZE (Two-Phase Outline & Article Generation)

**What happens:**
1. **Draft outline** from conversation content
2. **Refine outline** for coherence and logical flow
3. **Generate full article** with inline citations
4. **Polish article** for readability

**Output:** Wikipedia-style long-form article with proper citations

**Code locations:**
- `knowledge_storm/storm_wiki/modules/outline_generation.py`
- `knowledge_storm/storm_wiki/modules/article_generation.py`
- `knowledge_storm/storm_wiki/modules/article_polish.py`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DISCOVER                                                     │
│     - Survey related topics via web search                       │
│     - LLM identifies 3-6 expert perspectives                     │
│     - Each gets: Name, Focus, Initial Questions                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CONVERSE (parallel per perspective)                          │
│     For each perspective, simulate a conversation:               │
│       WikiWriter: Asks questions based on persona                │
│       TopicExpert: Converts questions → search queries           │
│                    Executes web searches                         │
│                    Synthesizes answers with citations            │
│     Loop until "Thank you for your help!"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. ANALYZE                                                      │
│     - Extract all facts from conversations                       │
│     - Detect contradictions between perspectives                 │
│     - Identify knowledge gaps                                    │
│     - Fill gaps with targeted searches                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. SYNTHESIZE (Two-Phase Outline)                               │
│     a. Draft outline from conversation content                   │
│     b. Refine outline for coherence                              │
│     c. Generate full report with inline citations                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Options

From `STORMWikiRunnerArguments`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| max_conv_turn | 3 | Maximum questions in conversational Q&A |
| max_perspective | 3 | Maximum number of perspectives |
| max_search_queries_per_turn | 3 | Search queries per conversation turn |
| search_top_k | 3 | Top K search results to consider |
| retrieve_top_k | 3 | Top K references for each section |
| max_thread_num | 10 | Maximum parallel threads |

### Perspective Scaling

| Complexity | Perspectives | Use Case |
|------------|--------------|----------|
| Simple | 2-3 | Factual queries with limited scope |
| Moderate | 3-4 | Multi-aspect topics needing diverse views |
| Complex | 5-6 | Deep research requiring comprehensive coverage |

---

## LLM Configuration

STORM uses different LLMs for different phases:

```python
class STORMWikiLMConfigs:
    conv_simulator_lm   # Conversation simulation (except questions)
    question_asker_lm   # Question generation
    outline_gen_lm      # Outline generation
    article_gen_lm      # Article generation
    article_polish_lm   # Final polishing
```

Default models (OpenAI):
- Conversation: gpt-4o-mini-2024-07-18
- Outline: gpt-4-0125-preview
- Article: gpt-4o-2024-05-13
- Polish: gpt-4o-2024-05-13

---

## Go Implementation (in this repo)

The go-research package includes a STORM implementation:

**Location:** `/go-research/internal/architectures/storm/`

**Key differences from Python:**
- Uses OpenRouter as LLM provider
- Brave Search for web retrieval
- Streaming output during conversations
- Session persistence to JSON + Obsidian vault

**Usage:**
```bash
cd go-research
go run ./cmd/research

# In REPL:
research> /storm How do modern LLM agents work?
```

---

## Performance Characteristics

From the NAACL 2024 paper:

- **Organization:** 25% improvement over outline-driven baselines
- **Coverage:** 10% improvement over outline-driven baselines
- **FActScore:** Comparable to human-written Wikipedia articles

**Strengths:**
- Multi-perspective ensures diverse viewpoint coverage
- Conversation simulation generates high-quality questions
- Two-phase outline prevents incoherent structure

**Weaknesses:**
- Linear pipeline can't self-correct early errors
- No explicit handling of contradictory sources
- Fixed number of perspectives regardless of topic complexity

---

## Key Code Components

### Python (stanford-oval/storm)

```
knowledge_storm/
├── storm_wiki/
│   ├── engine.py           # STORMWikiRunner - main orchestrator
│   └── modules/
│       ├── persona_generator.py    # Phase 1: Perspective generation
│       ├── knowledge_curation.py   # Phase 2-3: Conversations & analysis
│       ├── outline_generation.py   # Phase 4a: Outline generation
│       ├── article_generation.py   # Phase 4b: Article generation
│       └── article_polish.py       # Phase 4c: Final polish
```

### Go (this repo)

```
go-research/internal/
├── architectures/storm/        # STORM implementation
├── agents/
│   ├── conversation.go         # WikiWriter↔TopicExpert simulation
│   ├── analysis.go             # Fact validation & gap detection
│   └── synthesis.go            # Two-phase outline & report
├── orchestrator/
│   └── deep_storm.go           # Main STORM flow
└── planning/
    └── perspective.go          # Perspective generation
```

---

## Sources

- Original Paper: https://arxiv.org/abs/2402.14207
- Project Page: https://storm-project.stanford.edu/research/storm/
- GitHub: https://github.com/stanford-oval/storm
- Go Implementation: /go-research/internal/architectures/storm/
