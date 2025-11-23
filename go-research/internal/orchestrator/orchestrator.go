package orchestrator

import (
	"context"
	"fmt"
	"time"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
)

// Config for orchestrator
type Config struct {
	MaxWorkers    int
	WorkerTimeout time.Duration
	MaxIterations int
	ComplexityLow float64 // Below this = 1 worker
	ComplexityMed float64 // Below this = 3 workers
}

// DefaultConfig returns default orchestrator configuration
func DefaultConfig() Config {
	return Config{
		MaxWorkers:    5,
		WorkerTimeout: 30 * time.Minute,
		MaxIterations: 20,
		ComplexityLow: 0.3,
		ComplexityMed: 0.6,
	}
}

// Orchestrator coordinates multi-agent research
type Orchestrator struct {
	bus       *events.Bus
	config    Config
	appConfig *config.Config
	client    llm.ChatClient
	pool      *WorkerPool
	planner   *Planner
	synth     *Synthesizer
}

// OrchestratorOption allows configuring the orchestrator
type OrchestratorOption func(*Orchestrator)

// WithClient injects a custom LLM client (for testing)
func WithClient(client llm.ChatClient) OrchestratorOption {
	return func(o *Orchestrator) {
		o.client = client
		o.planner = NewPlanner(client)
		o.synth = NewSynthesizerWithClient(o.bus, client)
	}
}

// WithPool injects a custom worker pool (for testing)
func WithPool(pool *WorkerPool) OrchestratorOption {
	return func(o *Orchestrator) {
		o.pool = pool
	}
}

// New creates a new Orchestrator
func New(bus *events.Bus, cfg *config.Config, opts ...OrchestratorOption) *Orchestrator {
	client := llm.NewClient(cfg)

	orchConfig := DefaultConfig()
	orchConfig.MaxWorkers = cfg.MaxWorkers
	orchConfig.WorkerTimeout = cfg.WorkerTimeout
	orchConfig.MaxIterations = cfg.MaxIterations

	o := &Orchestrator{
		bus:       bus,
		config:    orchConfig,
		appConfig: cfg,
		client:    client,
		pool:      NewPool(bus, cfg),
		planner:   NewPlanner(client),
		synth:     NewSynthesizer(bus, cfg),
	}

	// Apply options
	for _, opt := range opts {
		opt(o)
	}

	return o
}

// Result from orchestrated research
type Result struct {
	ComplexityScore float64
	Workers         []session.WorkerContext
	Report          string
	Sources         []string
	Insights        []session.Insight
	Cost            session.CostBreakdown
}

// Research executes a multi-agent research workflow
func (o *Orchestrator) Research(ctx context.Context, query string) (*Result, error) {
	// 1. Analyze query complexity
	o.bus.Publish(events.Event{
		Type:      events.EventQueryAnalyzed,
		Timestamp: time.Now(),
	})

	complexity, err := o.planner.AnalyzeComplexity(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("complexity analysis: %w", err)
	}

	// 2. Create research plan
	numWorkers := o.workersForComplexity(complexity)
	tasks, err := o.planner.CreatePlan(ctx, query, numWorkers)
	if err != nil {
		return nil, fmt.Errorf("plan creation: %w", err)
	}

	// Emit plan created event with worker count for display init
	o.bus.Publish(events.Event{
		Type:      events.EventPlanCreated,
		Timestamp: time.Now(),
		Data: events.PlanCreatedData{
			WorkerCount: len(tasks),
			Complexity:  complexity,
		},
	})

	// 3. Execute workers in parallel
	results := o.pool.Execute(ctx, tasks)

	// 4. Collect successful results
	var workers []session.WorkerContext
	var allSources []string
	var totalCost session.CostBreakdown

	for _, r := range results {
		if r.Error != nil {
			continue
		}
		workers = append(workers, r.Context)
		allSources = append(allSources, r.Context.Sources...)
		totalCost.Add(r.Context.Cost)
	}

	if len(workers) == 0 {
		return nil, fmt.Errorf("all workers failed")
	}

	// 5. Synthesize results
	o.bus.Publish(events.Event{
		Type:      events.EventSynthesisStarted,
		Timestamp: time.Now(),
	})

	report, err := o.synth.Synthesize(ctx, query, workers, "")
	if err != nil {
		return nil, fmt.Errorf("synthesis: %w", err)
	}

	o.bus.Publish(events.Event{
		Type:      events.EventSynthesisComplete,
		Timestamp: time.Now(),
	})

	return &Result{
		ComplexityScore: complexity,
		Workers:         workers,
		Report:          report,
		Sources:         dedupe(allSources),
		Cost:            totalCost,
	}, nil
}

func (o *Orchestrator) workersForComplexity(score float64) int {
	switch {
	case score < o.config.ComplexityLow:
		return 1
	case score < o.config.ComplexityMed:
		return 3
	default:
		return 5
	}
}

// dedupe removes duplicate strings from a slice
func dedupe(items []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(items))
	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}
