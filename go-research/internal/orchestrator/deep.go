package orchestrator

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go-research/internal/agents"
	"go-research/internal/config"
	ctxmgr "go-research/internal/context"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/planning"
	"go-research/internal/session"
	"go-research/internal/tools"
)

// DeepOrchestrator coordinates state-of-the-art deep research using:
// - Multi-perspective planning (STORM-style)
// - DAG-based parallel task execution
// - Context folding for long-horizon tasks
// - Specialized sub-agents (search, analysis, synthesis)
type DeepOrchestrator struct {
	bus            *events.Bus
	appConfig      *config.Config
	client         llm.ChatClient
	contextMgr     *ctxmgr.Manager
	planner        *planning.Planner
	searchAgent    *agents.SearchAgent
	analysisAgent  *agents.AnalysisAgent
	synthesisAgent *agents.SynthesisAgent
	tools          tools.ToolExecutor
}

// DeepOrchestratorOption allows configuring the deep orchestrator
type DeepOrchestratorOption func(*DeepOrchestrator)

// WithDeepClient injects a custom LLM client (for testing)
func WithDeepClient(client llm.ChatClient) DeepOrchestratorOption {
	return func(o *DeepOrchestrator) {
		o.client = client
		o.planner = planning.NewPlanner(client)
		o.analysisAgent = agents.NewAnalysisAgent(client)
		o.synthesisAgent = agents.NewSynthesisAgent(client)
	}
}

// WithDeepTools injects a custom tool executor (for testing)
func WithDeepTools(toolExec tools.ToolExecutor) DeepOrchestratorOption {
	return func(o *DeepOrchestrator) {
		o.tools = toolExec
	}
}

// NewDeepOrchestrator creates a new deep research orchestrator
func NewDeepOrchestrator(bus *events.Bus, cfg *config.Config, opts ...DeepOrchestratorOption) *DeepOrchestrator {
	client := llm.NewClient(cfg)
	toolReg := tools.NewRegistry(cfg.BraveAPIKey)

	o := &DeepOrchestrator{
		bus:            bus,
		appConfig:      cfg,
		client:         client,
		contextMgr:     ctxmgr.New(client, ctxmgr.DefaultConfig()),
		planner:        planning.NewPlanner(client),
		searchAgent:    agents.NewSearchAgent(client, toolReg, bus, agents.DefaultSearchConfig()),
		analysisAgent:  agents.NewAnalysisAgent(client),
		synthesisAgent: agents.NewSynthesisAgentWithBus(client, bus),
		tools:          toolReg,
	}

	// Apply options
	for _, opt := range opts {
		opt(o)
	}

	return o
}

// DeepResult contains the output of deep research
type DeepResult struct {
	Plan           *planning.ResearchPlan
	SearchResults  map[string]*agents.SearchResult
	AnalysisResult *agents.AnalysisResult
	Report         *agents.Report
	Cost           session.CostBreakdown
	Duration       time.Duration
}

// Research executes state-of-the-art deep research workflow
func (o *DeepOrchestrator) Research(ctx context.Context, query string) (*DeepResult, error) {
	startTime := time.Now()

	// Reset context manager for new session
	o.contextMgr.Reset()

	var totalCost session.CostBreakdown

	// Emit start event
	o.bus.Publish(events.Event{
		Type:      events.EventResearchStarted,
		Timestamp: time.Now(),
		Data: events.ResearchStartedData{
			Query: query,
			Mode:  "deep",
		},
	})

	// 1. Create research plan with perspectives
	o.bus.Publish(events.Event{
		Type:      events.EventQueryAnalyzed,
		Timestamp: time.Now(),
	})

	plan, err := o.planner.CreatePlan(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("planning: %w", err)
	}

	totalCost.Add(plan.Cost)

	o.bus.Publish(events.Event{
		Type:      events.EventPlanCreated,
		Timestamp: time.Now(),
		Data: events.PlanCreatedData{
			WorkerCount: len(plan.Perspectives),
			Complexity:  0.8, // Deep research is high complexity
		},
	})

	// 2. Execute DAG
	searchResults, err := o.executeDAG(ctx, plan)
	if err != nil {
		return nil, fmt.Errorf("dag execution: %w", err)
	}

	searchCost := accumulateSearchCost(searchResults)
	totalCost.Add(searchCost)

	// Check for cancellation before analysis
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// 3. Run analysis on all gathered facts
	allFacts := collectFacts(searchResults)
	expectedCoverage := planning.CollectQuestions(plan.Perspectives)

	o.bus.Publish(events.Event{
		Type:      events.EventAnalysisStarted,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"fact_count": len(allFacts),
			"step":       "cross-validation",
			"message":    fmt.Sprintf("Step 1/3: Cross-validating %d facts...", len(allFacts)),
		},
	})

	var analysisResult *agents.AnalysisResult
	if len(allFacts) > 0 {
		analysisResult, err = o.analysisAgent.Analyze(ctx, query, allFacts, expectedCoverage)
		if err != nil {
			// Check if it's a cancellation
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			// Continue without analysis if it fails for other reasons
			analysisResult = &agents.AnalysisResult{}
		}
	} else {
		analysisResult = &agents.AnalysisResult{}
	}

	totalCost.Add(analysisResult.Cost)

	o.bus.Publish(events.Event{
		Type:      events.EventAnalysisComplete,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"contradictions": len(analysisResult.Contradictions),
			"gaps":           len(analysisResult.KnowledgeGaps),
		},
	})

	// Check for cancellation before gap filling
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// 4. Handle gaps with additional search if needed
	if len(analysisResult.KnowledgeGaps) > 0 {
		o.bus.Publish(events.Event{
			Type:      events.EventWorkerProgress,
			Timestamp: time.Now(),
			Data: events.WorkerProgressData{
				Status:  "gap-filling",
				Message: fmt.Sprintf("Filling %d knowledge gaps...", len(analysisResult.KnowledgeGaps)),
			},
		})
		gapResults := o.fillGaps(ctx, plan, analysisResult.KnowledgeGaps)
		for id, result := range gapResults {
			searchResults[id] = result
		}

		gapCost := accumulateSearchCost(gapResults)
		totalCost.Add(gapCost)
	}

	// Check for cancellation before synthesis
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// 5. Synthesize report
	o.bus.Publish(events.Event{
		Type:      events.EventSynthesisStarted,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"message": "Generating report outline...",
		},
	})

	report, err := o.synthesisAgent.Synthesize(ctx, plan, searchResults, analysisResult)
	if err != nil {
		// Check if it's a cancellation
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("synthesis: %w", err)
	}

	o.bus.Publish(events.Event{
		Type:      events.EventSynthesisComplete,
		Timestamp: time.Now(),
	})

	contextCost := o.contextMgr.CostBreakdown()
	totalCost.Add(contextCost)

	totalCost.Add(report.Cost)
	o.emitCostEvent("total", totalCost)

	return &DeepResult{
		Plan:           plan,
		SearchResults:  searchResults,
		AnalysisResult: analysisResult,
		Report:         report,
		Cost:           totalCost,
		Duration:       time.Since(startTime),
	}, nil
}

// executeDAG runs the research DAG, respecting dependencies and enabling parallel execution
func (o *DeepOrchestrator) executeDAG(ctx context.Context, plan *planning.ResearchPlan) (map[string]*agents.SearchResult, error) {
	results := make(map[string]*agents.SearchResult)
	var mu sync.Mutex

	for !plan.DAG.AllComplete() {
		// Check for cancellation
		select {
		case <-ctx.Done():
			return results, ctx.Err()
		default:
		}

		// Context folding check
		if o.contextMgr.ShouldFold() {
			directive, _ := o.contextMgr.DecideFolding(ctx)
			_ = o.contextMgr.Fold(ctx, directive)
		}

		// Get ready tasks
		readyTasks := plan.DAG.GetReadyTasks()
		if len(readyTasks) == 0 {
			// No ready tasks but not all complete - might be stuck or all running
			// Give running tasks time to complete
			time.Sleep(100 * time.Millisecond)
			continue
		}

		// Execute ready tasks in parallel
		var wg sync.WaitGroup
		for _, task := range readyTasks {
			wg.Add(1)
			go func(t *planning.DAGNode) {
				defer wg.Done()

				plan.DAG.SetStatus(t.ID, planning.StatusRunning)
				workerNum := nodeIDToWorkerNum(t.ID)

				// Emit worker started event
				o.bus.Publish(events.Event{
					Type:      events.EventWorkerStarted,
					Timestamp: time.Now(),
					Data: events.WorkerProgressData{
						WorkerID:  t.ID,
						WorkerNum: workerNum,
						Objective: t.Description,
						Status:    "running",
					},
				})

				result, err := o.executeTask(ctx, plan, t, workerNum)
				if err != nil {
					plan.DAG.SetError(t.ID, err)
					o.bus.Publish(events.Event{
						Type:      events.EventWorkerFailed,
						Timestamp: time.Now(),
						Data: events.WorkerProgressData{
							WorkerID:  t.ID,
							WorkerNum: workerNum,
							Status:    "failed",
							Message:   err.Error(),
						},
					})
					return
				}

				mu.Lock()
				if result != nil {
					results[t.ID] = result
				}
				mu.Unlock()

				plan.DAG.SetResult(t.ID, result)
				o.bus.Publish(events.Event{
					Type:      events.EventWorkerComplete,
					Timestamp: time.Now(),
					Data: events.WorkerProgressData{
						WorkerID:  t.ID,
						WorkerNum: workerNum,
						Status:    "complete",
					},
				})
			}(task)
		}
		wg.Wait()
	}

	return results, nil
}

// executeTask runs a single DAG task based on its type
func (o *DeepOrchestrator) executeTask(ctx context.Context, plan *planning.ResearchPlan, task *planning.DAGNode, workerNum int) (*agents.SearchResult, error) {
	switch task.TaskType {
	case planning.TaskSearch:
		// Find corresponding perspective for this search task
		perspective := plan.GetPerspectiveForNode(task.ID)
		return o.searchAgent.SearchWithWorkerNum(ctx, task.Description, perspective, workerNum)

	case planning.TaskAnalyze:
		// Analysis tasks update state but don't return search results
		// The root analysis and cross-validation are handled separately
		return nil, nil

	case planning.TaskSynthesize:
		// Synthesis is handled after DAG completes
		return nil, nil

	default:
		return nil, fmt.Errorf("unknown task type: %v", task.TaskType)
	}
}

// fillGaps performs additional searches to address identified knowledge gaps
func (o *DeepOrchestrator) fillGaps(ctx context.Context, _ *planning.ResearchPlan, gaps []agents.KnowledgeGap) map[string]*agents.SearchResult {
	results := make(map[string]*agents.SearchResult)

	for i, gap := range gaps {
		// Skip low-importance gaps
		if gap.Importance < 0.5 {
			continue
		}

		// Create a synthetic perspective for this gap
		gapPerspective := &planning.Perspective{
			Name:      fmt.Sprintf("Gap Filler %d", i+1),
			Focus:     gap.Description,
			Questions: gap.SuggestedQueries,
		}

		o.bus.Publish(events.Event{
			Type:      events.EventWorkerStarted,
			Timestamp: time.Now(),
			Data: events.WorkerProgressData{
				WorkerID:  fmt.Sprintf("gap_%d", i),
				Objective: fmt.Sprintf("Filling gap: %s", gap.Description),
				Status:    "running",
			},
		})

		result, err := o.searchAgent.Search(ctx, gap.Description, gapPerspective)
		if err != nil {
			o.bus.Publish(events.Event{
				Type:      events.EventWorkerFailed,
				Timestamp: time.Now(),
				Data: events.WorkerProgressData{
					WorkerID: fmt.Sprintf("gap_%d", i),
					Status:   "failed",
				},
			})
			continue
		}

		results[fmt.Sprintf("gap_%d", i)] = result

		o.bus.Publish(events.Event{
			Type:      events.EventWorkerComplete,
			Timestamp: time.Now(),
			Data: events.WorkerProgressData{
				WorkerID: fmt.Sprintf("gap_%d", i),
				Status:   "complete",
			},
		})
	}

	return results
}

// collectFacts gathers all facts from search results
func collectFacts(searchResults map[string]*agents.SearchResult) []agents.Fact {
	var facts []agents.Fact
	for _, sr := range searchResults {
		if sr != nil {
			facts = append(facts, sr.Facts...)
		}
	}
	return facts
}

func accumulateSearchCost(results map[string]*agents.SearchResult) session.CostBreakdown {
	var total session.CostBreakdown
	for _, sr := range results {
		if sr == nil {
			continue
		}
		total.Add(sr.Cost)
	}
	return total
}

func (o *DeepOrchestrator) emitCostEvent(scope string, cost session.CostBreakdown) {
	if o.bus == nil || cost.TotalTokens == 0 {
		return
	}
	o.bus.Publish(events.Event{
		Type:      events.EventCostUpdated,
		Timestamp: time.Now(),
		Data: events.CostUpdateData{
			Scope:        scope,
			InputTokens:  cost.InputTokens,
			OutputTokens: cost.OutputTokens,
			TotalTokens:  cost.TotalTokens,
			InputCost:    cost.InputCost,
			OutputCost:   cost.OutputCost,
			TotalCost:    cost.TotalCost,
		},
	})
}

// nodeIDToWorkerNum converts a DAG node ID to a 1-based worker number.
// For search nodes (search_0, search_1, ...), returns the index + 1.
// For other nodes, returns 0 (not displayed in panels).
func nodeIDToWorkerNum(nodeID string) int {
	var index int
	if _, err := fmt.Sscanf(nodeID, "search_%d", &index); err == nil {
		return index + 1 // 1-based worker numbers
	}
	return 0
}
