# State-of-the-Art Deep Research Agent Architecture

## Executive Summary

This document synthesizes the latest research and open-source implementations to define a state-of-the-art architecture for a deep research agent implemented in Go. The architecture addresses the key limitations of simple ReAct agents (context saturation, tactical vs strategic planning, sequential execution) and incorporates cutting-edge techniques from systems like Tongyi DeepResearch, AgentFold, STORM, and Search-R1.

---

## Part 1: Current State-of-the-Art Landscape

### 1.1 Benchmark Leaders (November 2025)

| System | BrowseComp | HLE Score | Key Innovation |
|--------|------------|-----------|----------------|
| Tongyi DeepResearch (30B-A3B) | 43.4 | 32.9 | Full RL pipeline, MoE architecture |
| OpenAI Deep Research | 51.5 | 26.6 | Proprietary RL training |
| LangChain Open Deep Research | - | 0.43 RACE | Open-source, multi-model |
| AgentFold (30B-A3B) | 36.2 | - | Context-Folding technique |

### 1.2 Key Architectural Patterns Identified

1. **Context Management** - AgentFold's Multi-Scale State Summaries
2. **Hierarchical Multi-Agent** - SkyworkAI's Planning-Execution separation
3. **Multi-Perspective Research** - Stanford STORM's simulated expert conversations
4. **Dynamic Workflows** - LangGraph's stateful orchestration
5. **End-to-End RL** - Search-R1/DeepSeek-R1 style training

---

## Part 2: Proposed Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEEP RESEARCH ORCHESTRATOR                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         CONTEXT MANAGER                                  ││
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  ││
│  │  │  Multi-Scale     │  │  Working Memory  │  │  Tool/Action Memory  │  ││
│  │  │  State Summaries │  │  (Latest K turns)│  │  (Tool call history) │  ││
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                      PLANNING AGENT (Strategic Layer)                  │  │
│  │  • Research Plan Generation (DAG structure)                           │  │
│  │  • Perspective Discovery (STORM-style)                                │  │
│  │  • Subtask Decomposition                                              │  │
│  │  • Dynamic Re-planning                                                │  │
│  └────────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                          │
│    ┌──────────────────────────────┼──────────────────────────────────┐      │
│    │                              │                                   │      │
│    ▼                              ▼                                   ▼      │
│  ┌──────────────┐  ┌──────────────────────┐  ┌────────────────────────┐    │
│  │  SEARCH      │  │  ANALYSIS AGENT      │  │  SYNTHESIS AGENT       │    │
│  │  AGENT       │  │                      │  │                        │    │
│  │  • Query     │  │  • Cross-validation  │  │  • Outline Generation  │    │
│  │    Generation│  │  • Source Evaluation │  │  • Report Writing      │    │
│  │  • Multi-hop │  │  • Gap Identification│  │  • Citation Management │    │
│  │    Retrieval │  │  • Fact Extraction   │  │  • Quality Refinement  │    │
│  └──────────────┘  └──────────────────────┘  └────────────────────────┘    │
│          │                    │                         │                    │
│          └────────────────────┼─────────────────────────┘                    │
│                               ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           TOOL LAYER                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐│  │
│  │  │ Web      │ │ Browser  │ │ Code     │ │ Scholar  │ │ MCP Server   ││  │
│  │  │ Search   │ │ Navigate │ │ Execute  │ │ Search   │ │ (Extensible) ││  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Components

#### A. Context Manager (Critical for Long-Horizon Tasks)

The Context Manager implements **AgentFold-style proactive context management**:

```go
type ContextManager struct {
    // Multi-Scale State Summaries - Hierarchical compression of history
    StateSummaries    []StateSummary  // Coarse to fine-grained
    
    // Working Memory - High-fidelity recent interactions
    WorkingMemory     CircularBuffer  // Last K interactions, uncompressed
    
    // Tool Memory - Consolidated tool interactions
    ToolMemory        map[string]ToolInteractionSummary
    
    // Episodic Memory - Key decisions and milestones
    EpisodicMemory    []Episode
    
    // Configuration
    MaxContextTokens  int
    FoldingThreshold  int
}

type StateSummary struct {
    Level       int       // 0=finest, N=coarsest
    Content     string    // Compressed representation
    TokenCount  int
    Timestamp   time.Time
    CoveredTurns []int    // Which turns this summarizes
}

// FoldingOperation decides how to compress context
type FoldingDirective struct {
    Type        FoldType  // GRANULAR_CONDENSATION | DEEP_CONSOLIDATION | NONE
    TargetLevel int       // Which summary level to update
    Rationale   string    // Why this folding decision
}
```

**Key Innovation**: Instead of passive logging, the agent *actively sculpts* its context at each step:
- **Granular Condensation**: Compress latest interaction into fine-grained summary
- **Deep Consolidation**: Merge multiple summaries into coarser abstraction (wrapping up subtasks)

#### B. Planning Agent (Strategic Layer)

Implements STORM-style multi-perspective planning with DAG-based task decomposition:

```go
type PlanningAgent struct {
    PerspectiveDiscoverer  *PerspectiveEngine
    TaskDecomposer         *DAGPlanner
    DynamicReplanner       *ReplanningEngine
}

type ResearchPlan struct {
    Topic           string
    Perspectives    []Perspective        // Different angles to investigate
    TaskDAG         *DirectedAcyclicGraph
    CurrentPhase    PlanPhase
    CompletedTasks  map[string]TaskResult
}

type Perspective struct {
    Name        string   // e.g., "Technical Expert", "Skeptic", "End User"
    Focus       string   // What this perspective prioritizes
    Questions   []string // Questions from this viewpoint
}

type DAGNode struct {
    ID           string
    TaskType     TaskType  // SEARCH | ANALYZE | SYNTHESIZE | VALIDATE
    Description  string
    Dependencies []string  // Node IDs that must complete first
    Status       NodeStatus
    Result       interface{}
}
```

**STORM-Style Perspective Discovery**:
1. Discover diverse perspectives by analyzing similar topics
2. Generate expert personas for each perspective
3. Simulate conversations where each expert asks questions
4. Curate collected information into structured outline

#### C. Specialized Sub-Agents

##### Search Agent
```go
type SearchAgent struct {
    QueryGenerator     *QueryEngine
    MultiHopRetriever  *RetrieverPipeline
    SourceRanker       *RankingModel
    
    // Search strategies
    Strategies []SearchStrategy  // BFS for breadth, DFS for depth
}

type SearchStrategy interface {
    GenerateQueries(context *SearchContext) []Query
    ProcessResults(results []SearchResult) *SearchState
    ShouldContinue(state *SearchState) bool
}

// Implements iterative refinement like Search-R1
func (s *SearchAgent) IterativeSearch(ctx context.Context, goal string) (*SearchResult, error) {
    state := &SearchState{Goal: goal}
    
    for iteration := 0; iteration < s.MaxIterations; iteration++ {
        // Generate queries based on current understanding
        queries := s.QueryGenerator.Generate(state)
        
        // Execute parallel searches
        results := s.executeParallel(ctx, queries)
        
        // Update state with new information
        state = s.ProcessResults(results)
        
        // Check knowledge gaps
        gaps := s.IdentifyGaps(state)
        if len(gaps) == 0 {
            break
        }
        
        // Generate follow-up queries for gaps
        state.PendingQueries = s.GenerateFollowUp(gaps)
    }
    
    return state.ToResult(), nil
}
```

##### Analysis Agent
```go
type AnalysisAgent struct {
    SourceValidator    *ValidatorEngine
    CrossReferencer    *CrossRefEngine
    GapIdentifier      *GapAnalyzer
    FactExtractor      *ExtractionPipeline
}

type AnalysisResult struct {
    ValidatedFacts     []Fact
    Contradictions     []Contradiction  // Conflicting sources
    KnowledgeGaps      []Gap            // What's still unknown
    SourceCredibility  map[string]float64
}
```

##### Synthesis Agent
```go
type SynthesisAgent struct {
    OutlineGenerator  *OutlineEngine
    ReportWriter      *WriterEngine
    CitationManager   *CitationEngine
    QualityRefiner    *RefinerPipeline
}

// Implements progressive report generation
func (s *SynthesisAgent) GenerateReport(plan *ResearchPlan, findings *ResearchFindings) (*Report, error) {
    // 1. Generate hierarchical outline
    outline := s.OutlineGenerator.Generate(plan, findings)
    
    // 2. Write sections in dependency order
    sections := make(map[string]*Section)
    for _, node := range outline.TopologicalOrder() {
        section := s.ReportWriter.WriteSection(node, sections, findings)
        sections[node.ID] = section
    }
    
    // 3. Add citations and cross-references
    report := s.CitationManager.AddCitations(sections, findings.Sources)
    
    // 4. Quality refinement pass
    return s.QualityRefiner.Refine(report)
}
```

#### D. Tool Layer

```go
type ToolRegistry struct {
    tools      map[string]Tool
    mcpClients map[string]*MCPClient  // Model Context Protocol support
}

type Tool interface {
    Name() string
    Description() string
    Schema() *JSONSchema
    Execute(ctx context.Context, params map[string]interface{}) (*ToolResult, error)
}

// Core tools
type WebSearchTool struct {
    Provider SearchProvider  // Tavily, Serper, Brave, etc.
    RateLimit *RateLimiter
}

type BrowserTool struct {
    Browser    *chromedp.Context
    PageParser *HTMLParser
}

type CodeExecutionTool struct {
    Sandbox    *CodeSandbox
    Languages  []string  // python, javascript, go
}

type ScholarSearchTool struct {
    Provider ScholarProvider  // ArXiv, SemanticScholar, PubMed
}
```

### 2.3 Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXECUTION FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INITIALIZATION                                                       │
│     ├─► Receive research query                                          │
│     ├─► Initialize context manager                                      │
│     └─► Discover perspectives (STORM-style)                             │
│                                                                          │
│  2. PLANNING PHASE                                                       │
│     ├─► Generate research plan (DAG structure)                          │
│     ├─► Identify subtasks and dependencies                              │
│     └─► Allocate to specialized agents                                  │
│                                                                          │
│  3. ITERATIVE RESEARCH LOOP                                             │
│     │                                                                    │
│     │  ┌─────────────────────────────────────────────────────────────┐ │
│     │  │  FOR each iteration until termination:                       │ │
│     │  │                                                              │ │
│     │  │  a) CONTEXT FOLDING DECISION                                 │ │
│     │  │     • Evaluate current context size                          │ │
│     │  │     • Generate folding directive (granular/deep/none)        │ │
│     │  │     • Apply folding to update state summaries                │ │
│     │  │                                                              │ │
│     │  │  b) EXECUTE READY TASKS (parallel where possible)            │ │
│     │  │     • Search: Generate queries → Execute → Process           │ │
│     │  │     • Analyze: Validate → Cross-reference → Extract          │ │
│     │  │     • Synthesize: Outline → Write → Cite                     │ │
│     │  │                                                              │ │
│     │  │  c) GAP ANALYSIS                                             │ │
│     │  │     • Identify knowledge gaps                                │ │
│     │  │     • Check for contradictions                               │ │
│     │  │     • Generate follow-up queries                             │ │
│     │  │                                                              │ │
│     │  │  d) DYNAMIC REPLANNING (if needed)                           │ │
│     │  │     • Adjust plan based on findings                          │ │
│     │  │     • Add/remove subtasks                                    │ │
│     │  │     • Re-prioritize                                          │ │
│     │  │                                                              │ │
│     │  │  e) TERMINATION CHECK                                        │ │
│     │  │     • Sufficient coverage?                                   │ │
│     │  │     • Time/iteration limit?                                  │ │
│     │  │     • User interrupt?                                        │ │
│     │  └─────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  4. SYNTHESIS PHASE                                                      │
│     ├─► Generate final outline                                          │
│     ├─► Write comprehensive report                                      │
│     ├─► Add citations and references                                    │
│     └─► Quality refinement                                              │
│                                                                          │
│  5. OUTPUT                                                               │
│     └─► Return structured research report with citations                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Key Innovations to Implement

### 3.1 Context Folding (from AgentFold)

**Problem**: Standard ReAct agents suffer from context saturation as they accumulate noisy history.

**Solution**: Proactive context management with multi-scale folding:

```go
func (cm *ContextManager) Fold(directive FoldingDirective, latestInteraction *Interaction) error {
    switch directive.Type {
    case GRANULAR_CONDENSATION:
        // Compress latest interaction into finest-grained summary
        summary := cm.Summarizer.Condense(latestInteraction)
        cm.StateSummaries[0].Append(summary)
        
    case DEEP_CONSOLIDATION:
        // Merge summaries at target level into coarser abstraction
        merged := cm.Summarizer.Consolidate(cm.StateSummaries[:directive.TargetLevel+1])
        cm.StateSummaries[directive.TargetLevel+1].Append(merged)
        // Clear consolidated levels
        for i := 0; i <= directive.TargetLevel; i++ {
            cm.StateSummaries[i].Clear()
        }
        
    case NONE:
        // Just add to working memory
        cm.WorkingMemory.Push(latestInteraction)
    }
    
    return cm.EnforceTokenLimit()
}

// Decision model for folding
func (cm *ContextManager) DecideFolding(currentState *AgentState) FoldingDirective {
    // Use LLM to decide the optimal folding strategy
    prompt := cm.buildFoldingPrompt(currentState)
    response := cm.LLM.Generate(prompt)
    return cm.parseFoldingDirective(response)
}
```

### 3.2 Multi-Perspective Research (from STORM)

**Innovation**: Simulate conversations between experts with different viewpoints:

```go
func (p *PlanningAgent) DiscoverPerspectives(topic string) []Perspective {
    // 1. Find similar topics and analyze their structure
    similarTopics := p.findSimilarTopics(topic)
    
    // 2. Extract perspectives from similar topics
    perspectives := p.extractPerspectives(similarTopics)
    
    // 3. Generate expert personas
    experts := make([]Perspective, 0)
    for _, perspective := range perspectives {
        expert := Perspective{
            Name:   p.generateExpertName(perspective),
            Focus:  perspective,
            Questions: []string{},
        }
        experts = append(experts, expert)
    }
    
    return experts
}

func (p *PlanningAgent) SimulateExpertConversation(topic string, expert Perspective) []QAPair {
    conversation := make([]QAPair, 0)
    
    for turn := 0; turn < p.MaxTurns; turn++ {
        // Expert asks question from their perspective
        question := p.generateExpertQuestion(topic, expert, conversation)
        
        // Topic expert answers with grounded information
        answer := p.generateGroundedAnswer(question)
        
        conversation = append(conversation, QAPair{Q: question, A: answer})
        
        // Generate follow-up based on answer
        if !p.shouldContinue(conversation) {
            break
        }
    }
    
    return conversation
}
```

### 3.3 DAG-Based Task Planning

**Innovation**: Structure research as a directed acyclic graph for parallel execution:

```go
type DAGPlanner struct {
    LLM *LLMClient
}

func (d *DAGPlanner) CreateResearchDAG(topic string, perspectives []Perspective) *ResearchDAG {
    dag := NewDAG()
    
    // Root node: Initial topic understanding
    rootNode := dag.AddNode("understand_topic", ANALYZE, "Initial topic analysis")
    
    // Perspective nodes (can run in parallel)
    perspectiveNodes := make([]*DAGNode, 0)
    for _, p := range perspectives {
        node := dag.AddNode(
            fmt.Sprintf("research_%s", p.Name),
            SEARCH,
            fmt.Sprintf("Research from %s perspective", p.Name),
        )
        node.AddDependency(rootNode.ID)
        perspectiveNodes = append(perspectiveNodes, node)
    }
    
    // Analysis node (depends on all perspective research)
    analysisNode := dag.AddNode("cross_validate", ANALYZE, "Cross-validate findings")
    for _, pn := range perspectiveNodes {
        analysisNode.AddDependency(pn.ID)
    }
    
    // Gap identification
    gapNode := dag.AddNode("identify_gaps", ANALYZE, "Identify knowledge gaps")
    gapNode.AddDependency(analysisNode.ID)
    
    // Synthesis node
    synthesisNode := dag.AddNode("synthesize", SYNTHESIZE, "Generate final report")
    synthesisNode.AddDependency(gapNode.ID)
    
    return dag
}

// Execute tasks respecting dependencies
func (e *Executor) ExecuteDAG(ctx context.Context, dag *ResearchDAG) error {
    completed := make(map[string]bool)
    
    for !dag.AllComplete() {
        // Find ready tasks (all dependencies complete)
        readyTasks := dag.GetReadyTasks(completed)
        
        // Execute in parallel
        results := e.executeParallel(ctx, readyTasks)
        
        // Update completion status
        for id, result := range results {
            dag.SetResult(id, result)
            completed[id] = true
        }
    }
    
    return nil
}
```

### 3.4 Knowledge Gap Identification

```go
type GapAnalyzer struct {
    LLM *LLMClient
}

type KnowledgeGap struct {
    Description  string
    Importance   float64  // 0-1
    SuggestedQueries []string
    RelatedFacts []string  // What we know that's related
}

func (g *GapAnalyzer) IdentifyGaps(plan *ResearchPlan, findings *Findings) []KnowledgeGap {
    // Compare what we aimed to find vs what we found
    gaps := make([]KnowledgeGap, 0)
    
    for _, perspective := range plan.Perspectives {
        for _, question := range perspective.Questions {
            if !findings.IsAnswered(question) {
                gap := KnowledgeGap{
                    Description: fmt.Sprintf("Unanswered: %s", question),
                    Importance:  g.estimateImportance(question, plan),
                    SuggestedQueries: g.generateQueries(question),
                }
                gaps = append(gaps, gap)
            }
        }
    }
    
    // Also identify implicit gaps
    implicitGaps := g.findImplicitGaps(findings)
    gaps = append(gaps, implicitGaps...)
    
    // Sort by importance
    sort.Slice(gaps, func(i, j int) bool {
        return gaps[i].Importance > gaps[j].Importance
    })
    
    return gaps
}
```

---

## Part 4: Implementation Plan for Your Go Agent

### Phase 1: Foundation (Weeks 1-2)

#### 1.1 Refactor Core Agent Architecture

**Current State**: Glued-together ReAct agents  
**Target State**: Hierarchical orchestrator with specialized sub-agents

```
Tasks:
├── [ ] Define interfaces for all agent types
│       ├── Orchestrator interface
│       ├── PlanningAgent interface  
│       ├── SearchAgent interface
│       ├── AnalysisAgent interface
│       └── SynthesisAgent interface
│
├── [ ] Implement Context Manager
│       ├── StateSummary struct
│       ├── WorkingMemory with circular buffer
│       ├── ToolMemory tracking
│       └── Token counting utilities
│
├── [ ] Create Tool Registry
│       ├── Tool interface definition
│       ├── WebSearchTool implementation
│       ├── BrowserTool (optional, Phase 2)
│       └── CodeExecutionTool (optional, Phase 2)
│
└── [ ] Update state management
        ├── ResearchPlan struct
        ├── DAGNode struct
        └── ResearchFindings struct
```

#### 1.2 Files to Create/Modify

```
deep_research_agent/
├── cmd/
│   └── agent/
│       └── main.go              # Entry point
├── internal/
│   ├── orchestrator/
│   │   ├── orchestrator.go      # Main orchestrator
│   │   └── execution.go         # DAG execution logic
│   ├── agents/
│   │   ├── planning.go          # Planning agent
│   │   ├── search.go            # Search agent
│   │   ├── analysis.go          # Analysis agent
│   │   └── synthesis.go         # Synthesis agent
│   ├── context/
│   │   ├── manager.go           # Context manager
│   │   ├── folding.go           # Folding operations
│   │   └── memory.go            # Memory structures
│   ├── tools/
│   │   ├── registry.go          # Tool registry
│   │   ├── websearch.go         # Web search tool
│   │   ├── browser.go           # Browser tool
│   │   └── code.go              # Code execution
│   ├── planning/
│   │   ├── dag.go               # DAG implementation
│   │   ├── perspectives.go      # STORM-style perspectives
│   │   └── replanning.go        # Dynamic replanning
│   └── synthesis/
│       ├── outline.go           # Outline generation
│       ├── writer.go            # Report writing
│       └── citations.go         # Citation management
├── pkg/
│   ├── llm/
│   │   ├── client.go            # LLM client interface
│   │   └── providers/           # OpenAI, Anthropic, etc.
│   └── types/
│       └── types.go             # Shared types
└── configs/
    └── config.yaml              # Configuration
```

### Phase 2: Context Management (Week 3)

#### 2.1 Implement Context Folding

```go
// internal/context/folding.go

type FoldingEngine struct {
    Summarizer *SummarizationEngine
    LLM        *LLMClient
    Config     FoldingConfig
}

type FoldingConfig struct {
    MaxContextTokens    int     `yaml:"max_context_tokens"`
    FoldingThreshold    float64 `yaml:"folding_threshold"`  // 0.8 = fold at 80%
    NumSummaryLevels    int     `yaml:"num_summary_levels"`
    WorkingMemorySize   int     `yaml:"working_memory_size"`
}

func (f *FoldingEngine) ShouldFold(cm *ContextManager) bool {
    currentUsage := float64(cm.CurrentTokens()) / float64(f.Config.MaxContextTokens)
    return currentUsage >= f.Config.FoldingThreshold
}

func (f *FoldingEngine) DecideFoldingStrategy(cm *ContextManager, state *AgentState) FoldingDirective {
    // Build prompt for LLM to decide folding
    prompt := f.buildDecisionPrompt(cm, state)
    
    response, _ := f.LLM.GenerateStructured(prompt, FoldingDirectiveSchema)
    
    return response.(FoldingDirective)
}
```

#### 2.2 Tasks

```
├── [ ] Implement SummarizationEngine
│       ├── Condense method (single interaction → summary)
│       └── Consolidate method (multiple summaries → coarser summary)
│
├── [ ] Implement FoldingEngine
│       ├── Token counting
│       ├── Folding decision logic
│       └── Apply folding operations
│
├── [ ] Integrate with main agent loop
│       └── Add folding step at each iteration
│
└── [ ] Add tests for context management
        ├── Token counting accuracy
        ├── Folding triggers correctly
        └── Summary quality verification
```

### Phase 3: Planning System (Week 4)

#### 3.1 Implement STORM-Style Planning

```go
// internal/planning/perspectives.go

type PerspectiveDiscoverer struct {
    LLM          *LLMClient
    SearchTool   Tool
}

func (p *PerspectiveDiscoverer) Discover(topic string) ([]Perspective, error) {
    // Step 1: Search for similar topics
    similarQuery := fmt.Sprintf("comprehensive guide %s overview", topic)
    results, _ := p.SearchTool.Execute(context.Background(), map[string]interface{}{
        "query": similarQuery,
    })
    
    // Step 2: Extract perspectives from results
    extractPrompt := p.buildExtractionPrompt(topic, results)
    perspectives, _ := p.LLM.GenerateStructured(extractPrompt, PerspectivesSchema)
    
    // Step 3: Generate questions for each perspective
    for i := range perspectives {
        perspectives[i].Questions = p.generateQuestions(topic, perspectives[i])
    }
    
    return perspectives, nil
}

// internal/planning/dag.go

type ResearchDAG struct {
    Nodes    map[string]*DAGNode
    Edges    map[string][]string  // node -> dependencies
    mu       sync.RWMutex
}

func (d *ResearchDAG) GetReadyTasks(completed map[string]bool) []*DAGNode {
    d.mu.RLock()
    defer d.mu.RUnlock()
    
    ready := make([]*DAGNode, 0)
    for id, node := range d.Nodes {
        if node.Status != PENDING {
            continue
        }
        
        // Check all dependencies
        allDepsComplete := true
        for _, dep := range d.Edges[id] {
            if !completed[dep] {
                allDepsComplete = false
                break
            }
        }
        
        if allDepsComplete {
            ready = append(ready, node)
        }
    }
    
    return ready
}
```

#### 3.2 Tasks

```
├── [ ] Implement PerspectiveDiscoverer
│       ├── Topic similarity search
│       ├── Perspective extraction
│       └── Question generation
│
├── [ ] Implement ResearchDAG
│       ├── Node management
│       ├── Dependency tracking
│       ├── Ready task identification
│       └── Topological sorting
│
├── [ ] Implement DAGPlanner
│       ├── Initial DAG generation
│       └── Dynamic node addition
│
└── [ ] Implement ReplanningEngine
        ├── Gap-based replanning
        └── Task reprioritization
```

### Phase 4: Specialized Agents (Weeks 5-6)

#### 4.1 Search Agent Enhancement

```go
// internal/agents/search.go

type SearchAgent struct {
    QueryGenerator  *QueryEngine
    Tools           []SearchTool
    RateLimiter     *RateLimiter
    MaxIterations   int
}

type SearchState struct {
    Goal             string
    Queries          []string
    Results          []SearchResult
    ProcessedFacts   []Fact
    KnowledgeGaps    []KnowledgeGap
    Iteration        int
}

func (s *SearchAgent) IterativeSearch(ctx context.Context, goal string, perspective Perspective) (*SearchFindings, error) {
    state := &SearchState{Goal: goal}
    
    // Generate initial queries from perspective
    state.Queries = s.QueryGenerator.FromPerspective(goal, perspective)
    
    for state.Iteration < s.MaxIterations {
        // Execute searches in parallel
        results := s.executeParallel(ctx, state.Queries)
        state.Results = append(state.Results, results...)
        
        // Extract facts
        facts := s.extractFacts(results)
        state.ProcessedFacts = append(state.ProcessedFacts, facts...)
        
        // Identify gaps
        state.KnowledgeGaps = s.identifyGaps(state)
        
        // Check termination
        if len(state.KnowledgeGaps) == 0 || s.sufficientCoverage(state) {
            break
        }
        
        // Generate follow-up queries for gaps
        state.Queries = s.QueryGenerator.ForGaps(state.KnowledgeGaps)
        state.Iteration++
    }
    
    return state.ToFindings(), nil
}
```

#### 4.2 Tasks

```
├── [ ] Enhance SearchAgent
│       ├── Iterative search loop
│       ├── Query generation from perspectives
│       ├── Parallel search execution
│       └── Fact extraction
│
├── [ ] Implement AnalysisAgent
│       ├── Cross-validation
│       ├── Contradiction detection
│       ├── Source credibility scoring
│       └── Gap identification
│
├── [ ] Implement SynthesisAgent
│       ├── Outline generation
│       ├── Section-by-section writing
│       ├── Citation management
│       └── Quality refinement
│
└── [ ] Add agent coordination
        ├── Message passing between agents
        └── Result aggregation
```

### Phase 5: Integration & Optimization (Week 7)

#### 5.1 Main Orchestrator

```go
// internal/orchestrator/orchestrator.go

type DeepResearchOrchestrator struct {
    ContextManager    *ContextManager
    PlanningAgent     *PlanningAgent
    SearchAgent       *SearchAgent
    AnalysisAgent     *AnalysisAgent
    SynthesisAgent    *SynthesisAgent
    
    Config            OrchestratorConfig
}

func (o *DeepResearchOrchestrator) Research(ctx context.Context, query string) (*Report, error) {
    // 1. Initialize context
    o.ContextManager.Initialize(query)
    
    // 2. Discover perspectives
    perspectives, err := o.PlanningAgent.DiscoverPerspectives(query)
    if err != nil {
        return nil, err
    }
    
    // 3. Create research plan
    plan := o.PlanningAgent.CreatePlan(query, perspectives)
    
    // 4. Execute research loop
    for !o.shouldTerminate(plan) {
        // Context folding decision
        if o.ContextManager.ShouldFold() {
            directive := o.ContextManager.DecideFolding(plan)
            o.ContextManager.Fold(directive)
        }
        
        // Get ready tasks
        readyTasks := plan.DAG.GetReadyTasks()
        
        // Execute tasks (parallel where possible)
        results := o.executeTasksBatch(ctx, readyTasks)
        
        // Update plan with results
        o.updatePlan(plan, results)
        
        // Gap analysis
        gaps := o.AnalysisAgent.IdentifyGaps(plan)
        
        // Dynamic replanning if needed
        if len(gaps) > 0 && o.shouldReplan(gaps) {
            o.PlanningAgent.Replan(plan, gaps)
        }
    }
    
    // 5. Synthesize final report
    report, err := o.SynthesisAgent.GenerateReport(plan)
    if err != nil {
        return nil, err
    }
    
    return report, nil
}
```

#### 5.2 Tasks

```
├── [ ] Implement main orchestrator
│       ├── Research method
│       ├── Task execution coordination
│       └── Termination logic
│
├── [ ] Add parallel execution
│       ├── Goroutine pool for tasks
│       ├── Result collection
│       └── Error handling
│
├── [ ] Implement streaming output
│       ├── Progress updates
│       └── Intermediate results
│
└── [ ] Add configuration system
        ├── YAML config parsing
        ├── Environment variable support
        └── Runtime configuration
```

### Phase 6: Testing & Benchmarking (Week 8)

```
├── [ ] Unit tests
│       ├── Context manager tests
│       ├── DAG execution tests
│       └── Agent tests
│
├── [ ] Integration tests
│       ├── End-to-end research flow
│       └── Multi-agent coordination
│
├── [ ] Benchmark against
│       ├── HotpotQA dataset
│       ├── SimpleQA dataset
│       └── Custom research queries
│
└── [ ] Performance optimization
        ├── Token usage profiling
        ├── Latency optimization
        └── Cost analysis
```

---

## Part 5: Critical Success Factors

### 5.1 What Separates State-of-the-Art from Basic Agents

| Factor | Basic ReAct | State-of-the-Art |
|--------|-------------|------------------|
| Planning | Tactical (next action) | Strategic (DAG plan) |
| Context | Passive log | Active workspace |
| Execution | Sequential | Parallel where possible |
| Memory | Full history dump | Multi-scale summaries |
| Perspectives | Single viewpoint | Multi-expert simulation |
| Quality | Single pass | Iterative refinement |

### 5.2 Key Metrics to Track

1. **Coverage**: % of intended questions answered
2. **Accuracy**: Fact verification against ground truth
3. **Token Efficiency**: Information gained per token
4. **Latency**: Time to complete research
5. **Citation Quality**: Source relevance and authority

### 5.3 Recommended Model Configuration

Based on LangChain Open Deep Research and Tongyi DeepResearch:

```yaml
models:
  planning:
    model: "claude-sonnet-4-20250514"  # or gpt-4.1
    temperature: 0.7
    max_tokens: 4096
  
  search:
    model: "claude-sonnet-4-20250514"  # or gpt-4.1-mini for cost
    temperature: 0.3
    max_tokens: 2048
  
  analysis:
    model: "claude-sonnet-4-20250514"
    temperature: 0.2
    max_tokens: 4096
  
  synthesis:
    model: "claude-sonnet-4-20250514"  # or gpt-4.1 for quality
    temperature: 0.5
    max_tokens: 8192
  
  summarization:
    model: "gpt-4.1-mini"  # Cost-effective for summarization
    temperature: 0.2
    max_tokens: 1024
```

---

## Part 6: Quick Wins for Immediate Improvement

If you want to see rapid improvements before full implementation:

### Week 0 Quick Wins

1. **Add perspective discovery**: Even a simple version dramatically improves coverage
   ```go
   func quickPerspectives(topic string) []string {
       return []string{
           topic + " technical details",
           topic + " real world applications",
           topic + " challenges and limitations",
           topic + " future trends",
           topic + " compared to alternatives",
       }
   }
   ```

2. **Implement basic context compression**: Summarize after every N turns
   ```go
   if turnCount % 5 == 0 {
       summary := summarize(recentHistory)
       context = summary + currentInteraction
   }
   ```

3. **Add parallel search**: Use goroutines for multiple queries
   ```go
   var wg sync.WaitGroup
   results := make(chan SearchResult, len(queries))
   for _, q := range queries {
       wg.Add(1)
       go func(query string) {
           defer wg.Done()
           results <- search(query)
       }(q)
   }
   ```

4. **Cross-validation check**: Simple contradiction detection
   ```go
   func detectContradictions(facts []Fact) []Contradiction {
       // Compare claims from different sources
       // Flag disagreements for human review
   }
   ```

---

## Conclusion

This architecture synthesizes the best practices from:
- **AgentFold**: Proactive context management with multi-scale folding
- **STORM**: Multi-perspective question asking and simulated expert conversations  
- **LangChain Open Deep Research**: DAG-based planning and parallel execution
- **Tongyi DeepResearch**: End-to-end training methodology
- **Search-R1**: Iterative reasoning with search integration

The phased implementation plan allows you to incrementally transform your current ReAct-based system into a state-of-the-art deep research agent while maintaining stability at each phase.

Key priorities:
1. **Context management first** - This is the biggest differentiator
2. **Multi-perspective planning** - Dramatically improves coverage
3. **Parallel execution** - Speeds up research significantly
4. **Iterative refinement** - Catches gaps and contradictions
