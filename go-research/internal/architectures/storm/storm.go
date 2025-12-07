// Package storm implements the STORM (Synthesis of Topic Outlines through
// Retrieval and Multi-perspective Question Asking) research architecture.
//
// STORM Flow:
//
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  1. PERSPECTIVE DISCOVERY                                               │
//	│     - Survey related topics via web search                              │
//	│     - LLM identifies 3-5 expert perspectives                            │
//	│     - Each gets: Name, Focus, Initial Questions                         │
//	└─────────────────────────────────────────────────────────────────────────┘
//	                                  │
//	                                  ▼
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  2. CONVERSATION SIMULATION (parallel per perspective)                  │
//	│     For each perspective:                                               │
//	│       Loop until "Thank you for your help!":                            │
//	│         a. WikiWriter asks question (based on persona)                  │
//	│         b. TopicExpert converts question → search queries               │
//	│         c. Execute web searches                                         │
//	│         d. TopicExpert synthesizes answer with citations                │
//	│         e. Record turn, repeat                                          │
//	└─────────────────────────────────────────────────────────────────────────┘
//	                                  │
//	                                  ▼
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  3. CROSS-VALIDATION (Analysis)                                         │
//	│     - Extract all facts from conversations                              │
//	│     - Detect contradictions between perspectives                        │
//	│     - Identify knowledge gaps                                           │
//	└─────────────────────────────────────────────────────────────────────────┘
//	                                  │
//	                                  ▼
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  4. SYNTHESIS (Two-Phase Outline)                                       │
//	│     a. Draft outline from conversation content                          │
//	│     b. Refine outline for coherence                                     │
//	│     c. Generate full report with inline citations                       │
//	└─────────────────────────────────────────────────────────────────────────┘
package storm

import (
	"context"
	"fmt"
	"time"

	"go-research/internal/architectures"
	"go-research/internal/architectures/catalog"
	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/tools"
)

// Architecture implements the STORM research pattern using conversation simulation.
type Architecture struct {
	bus    *events.Bus
	config *config.Config
	client llm.ChatClient
	tools  tools.ToolExecutor
	loop   *StormLoop
}

// Config holds configuration for the STORM architecture.
type Config struct {
	AppConfig *config.Config
	Bus       *events.Bus
	Client    llm.ChatClient     // Optional: inject for testing
	Tools     tools.ToolExecutor // Optional: inject for testing
}

// New creates a new STORM architecture instance.
func New(cfg Config) *Architecture {
	a := &Architecture{
		bus:    cfg.Bus,
		config: cfg.AppConfig,
		client: cfg.Client,
		tools:  cfg.Tools,
	}
	opts := []StormLoopOption{}
	if cfg.Client != nil {
		opts = append(opts, WithStormClient(cfg.Client))
	}
	if cfg.Tools != nil {
		opts = append(opts, WithStormTools(cfg.Tools))
	}
	a.loop = NewStormLoop(cfg.Bus, cfg.AppConfig, opts...)
	return a
}

// Name returns the architecture identifier.
func (a *Architecture) Name() string {
	return "storm"
}

// Description returns a human-readable description.
func (a *Architecture) Description() string {
	return "STORM: Multi-perspective conversations with cross-validation and synthesis"
}

// SupportsResume indicates this architecture supports resuming interrupted sessions.
func (a *Architecture) SupportsResume() bool {
	return false // Conversation-based STORM doesn't support resume yet
}

// Research executes the STORM research workflow:
//  1. Discover perspectives (with related topic survey)
//  2. Simulate WikiWriter↔TopicExpert conversations (parallel)
//  3. Cross-validate facts and identify gaps
//  4. Synthesize report with two-phase outline
func (a *Architecture) Research(ctx context.Context, sessionID string, query string) (*architectures.Result, error) {
	startTime := time.Now()

	if a.loop == nil {
		opts := []StormLoopOption{}
		if a.client != nil {
			opts = append(opts, WithStormClient(a.client))
		}
		if a.tools != nil {
			opts = append(opts, WithStormTools(a.tools))
		}
		a.loop = NewStormLoop(a.bus, a.config, opts...)
	}

	// Execute the full STORM workflow
	stormResult, err := a.loop.Research(ctx, query)
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

	// Convert STORM result to architecture result
	return a.convertResult(sessionID, stormResult, startTime), nil
}

// Resume is not supported for conversation-based STORM.
func (a *Architecture) Resume(ctx context.Context, sessionID string) (*architectures.Result, error) {
	return nil, fmt.Errorf("resume not supported for conversation-based STORM")
}

// convertResult transforms StormResult into the standard architectures.Result format.
func (a *Architecture) convertResult(sessionID string, sr *StormResult, startTime time.Time) *architectures.Result {
	result := &architectures.Result{
		SessionID: sessionID,
		Query:     sr.Topic,
		Status:    "complete",
		Metrics: architectures.Metrics{
			Duration:    time.Since(startTime),
			WorkerCount: len(sr.Perspectives),
			Cost:        sr.Cost,
		},
	}

	// Extract report
	if sr.Report != nil {
		result.Report = sr.Report.FullContent
		result.Summary = sr.Report.Summary
	}

	// Convert conversations to worker results
	for perspName, conv := range sr.Conversations {
		workerResult := architectures.WorkerResult{
			ID:          perspName,
			Perspective: perspName,
			Objective:   conv.Perspective.Focus,
			Status:      "complete",
			Cost:        conv.TotalCost,
		}

		// Collect facts from conversation
		for _, fact := range conv.Facts {
			workerResult.Facts = append(workerResult.Facts, fact)
			result.Facts = append(result.Facts, fact)
		}

		// Collect sources from all turns
		sourceSet := make(map[string]bool)
		for _, turn := range conv.Turns {
			for _, source := range turn.Sources {
				if !sourceSet[source] {
					sourceSet[source] = true
					workerResult.Sources = append(workerResult.Sources, source)
					result.Sources = append(result.Sources, source)
				}
			}
		}

		result.Workers = append(result.Workers, workerResult)
	}

	result.Metrics.FactCount = len(result.Facts)
	result.Metrics.SourceCount = len(result.Sources)

	return result
}

// Ensure Architecture implements the interface
var _ architectures.Architecture = (*Architecture)(nil)

func init() {
	catalog.Register(catalog.Definition{
		Name:           "storm",
		Description:    "STORM: Multi-perspective conversations with cross-validation and synthesis",
		SupportsResume: false,
		Build: func(deps catalog.Dependencies) (architectures.Architecture, error) {
			if deps.Config == nil {
				return nil, fmt.Errorf("config is required to build storm architecture")
			}
			return New(Config{
				AppConfig: deps.Config,
				Bus:       deps.Bus,
			}), nil
		},
	})
}
