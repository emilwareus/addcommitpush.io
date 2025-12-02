// Package storm implements the STORM (Synthesis of Topic Outlines through
// Retrieval and Multi-perspective Question Asking) research architecture.
//
// STORM discovers multiple expert perspectives on a topic, then executes
// parallel research from each perspective, followed by cross-validation
// and synthesis into a comprehensive report.
//
// Architecture flow:
//  1. Planning: Discover 3-5 expert perspectives via LLM
//  2. DAG Construction: Build execution graph from perspectives
//  3. Parallel Search: Each perspective searches and extracts facts
//  4. Analysis: Cross-validate facts, detect contradictions, find gaps
//  5. Gap Filling: Additional searches for missing information
//  6. Synthesis: Generate structured report with citations
package storm

import (
	"context"
	"fmt"
	"time"

	"go-research/internal/adapters/storage/filesystem"
	"go-research/internal/agents"
	"go-research/internal/architectures"
	"go-research/internal/architectures/catalog"
	"go-research/internal/config"
	"go-research/internal/core/domain/aggregate"
	domainEvents "go-research/internal/core/domain/events"
	"go-research/internal/core/ports"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/orchestrator"
	"go-research/internal/session"
	"go-research/internal/tools"
)

// Architecture implements the STORM research pattern.
type Architecture struct {
	eventStore ports.EventStore
	bus        *events.Bus
	config     *config.Config
	client     llm.ChatClient
	tools      tools.ToolExecutor
}

// Config holds configuration for the STORM architecture.
type Config struct {
	EventStorePath string
	AppConfig      *config.Config
	Bus            *events.Bus
	Client         llm.ChatClient     // Optional: for testing
	Tools          tools.ToolExecutor // Optional: for testing
}

// New creates a new STORM architecture instance.
func New(cfg Config) *Architecture {
	eventStore := filesystem.NewEventStore(cfg.EventStorePath)

	var client llm.ChatClient
	if cfg.Client != nil {
		client = cfg.Client
	} else {
		client = llm.NewClient(cfg.AppConfig)
	}

	var toolExec tools.ToolExecutor
	if cfg.Tools != nil {
		toolExec = cfg.Tools
	} else {
		toolExec = tools.NewRegistry(cfg.AppConfig.BraveAPIKey)
	}

	return &Architecture{
		eventStore: eventStore,
		bus:        cfg.Bus,
		config:     cfg.AppConfig,
		client:     client,
		tools:      toolExec,
	}
}

// Name returns the architecture identifier.
func (a *Architecture) Name() string {
	return "storm"
}

// Description returns a human-readable description.
func (a *Architecture) Description() string {
	return "STORM: Multi-perspective research with parallel search, cross-validation, and synthesis"
}

// SupportsResume indicates this architecture supports resuming interrupted sessions.
func (a *Architecture) SupportsResume() bool {
	return true
}

// Research executes STORM-style research for the given query.
func (a *Architecture) Research(ctx context.Context, sessionID string, query string) (*architectures.Result, error) {
	startTime := time.Now()

	// Create the event-sourced orchestrator
	orch := orchestrator.NewDeepOrchestratorES(
		a.eventStore,
		a.bus,
		a.config,
		orchestrator.WithESClient(a.client),
		orchestrator.WithESTools(a.tools),
	)

	// Execute research
	state, err := orch.Research(ctx, sessionID, query)
	if err != nil {
		return &architectures.Result{
			SessionID: sessionID,
			Query:     query,
			Status:    "failed",
			Error:     err.Error(),
			Metrics: architectures.Metrics{
				Duration: time.Since(startTime),
			},
		}, err
	}

	// Convert to standard result
	return a.stateToResult(state, query, startTime), nil
}

// Resume continues an interrupted STORM research session.
func (a *Architecture) Resume(ctx context.Context, sessionID string) (*architectures.Result, error) {
	startTime := time.Now()

	orch := orchestrator.NewDeepOrchestratorES(
		a.eventStore,
		a.bus,
		a.config,
		orchestrator.WithESClient(a.client),
		orchestrator.WithESTools(a.tools),
	)

	state, err := orch.Resume(ctx, sessionID)
	if err != nil {
		return &architectures.Result{
			SessionID: sessionID,
			Status:    "failed",
			Error:     err.Error(),
			Metrics: architectures.Metrics{
				Duration: time.Since(startTime),
			},
		}, err
	}

	return a.stateToResult(state, state.Query, startTime), nil
}

// stateToResult converts the internal state to the standard Result format.
func (a *Architecture) stateToResult(state *aggregate.ResearchState, query string, startTime time.Time) *architectures.Result {
	result := &architectures.Result{
		SessionID: state.ID,
		Query:     query,
		Status:    state.Status,
		Metrics: architectures.Metrics{
			Duration:    time.Since(startTime),
			WorkerCount: len(state.Workers),
		},
	}

	// Extract report if available
	if state.Report != nil {
		result.Report = state.Report.FullContent
		result.Summary = state.Report.Summary
	}

	// Collect facts and sources from all workers
	var allFacts []agents.Fact
	var allSources []string
	sourceSet := make(map[string]bool)

	for _, w := range state.Workers {
		// Convert worker to result
		workerResult := architectures.WorkerResult{
			ID:          w.ID,
			Perspective: w.Perspective,
			Objective:   w.Objective,
			Output:      w.Output,
			Status:      w.Status,
			Cost:        convertCost(w.Cost),
		}

		// Collect facts
		for _, f := range w.Facts {
			fact := agents.Fact{
				Content:    f.Content,
				Source:     f.SourceURL,
				Confidence: f.Confidence,
			}
			workerResult.Facts = append(workerResult.Facts, fact)
			allFacts = append(allFacts, fact)
		}

		// Collect sources
		for _, s := range w.Sources {
			if !sourceSet[s.URL] {
				sourceSet[s.URL] = true
				allSources = append(allSources, s.URL)
				workerResult.Sources = append(workerResult.Sources, s.URL)
			}
		}

		result.Workers = append(result.Workers, workerResult)
	}

	result.Facts = allFacts
	result.Sources = allSources
	result.Metrics.FactCount = len(allFacts)
	result.Metrics.SourceCount = len(allSources)

	// Aggregate cost
	result.Metrics.Cost = convertCost(state.Cost)

	return result
}

// convertCost converts domain cost to session cost
func convertCost(c interface{}) session.CostBreakdown {
	// Handle different cost types
	switch cost := c.(type) {
	case session.CostBreakdown:
		return cost
	case domainEvents.CostBreakdown:
		return session.CostBreakdown{
			InputTokens:  cost.InputTokens,
			OutputTokens: cost.OutputTokens,
			TotalTokens:  cost.TotalTokens,
			TotalCost:    cost.TotalCostUSD,
		}
	default:
		// Return empty if type doesn't match
		return session.CostBreakdown{}
	}
}

// Ensure Architecture implements the interface
var _ architectures.Architecture = (*Architecture)(nil)

func init() {
	catalog.Register(catalog.Definition{
		Name:           "storm",
		Description:    "STORM: Multi-perspective research with parallel search, cross-validation, and synthesis",
		SupportsResume: true,
		Build: func(deps catalog.Dependencies) (architectures.Architecture, error) {
			if deps.Config == nil {
				return nil, fmt.Errorf("config is required to build storm architecture")
			}
			return New(Config{
				EventStorePath: deps.Config.EventStoreDir,
				AppConfig:      deps.Config,
				Bus:            deps.Bus,
			}), nil
		},
	})
}
