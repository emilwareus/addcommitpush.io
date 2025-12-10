// Package think_deep implements the ThinkDepth.ai "Self-Balancing Test-Time
// Diffusion Deep Research" architecture.
//
// ThinkDeep Flow:
//
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  1. BRIEF GENERATION                                                    │
//	│     - Transform user query into detailed research brief                 │
//	│     - Identify key questions, scope, and deliverables                   │
//	└─────────────────────────────────────────────────────────────────────────┘
//	                                  │
//	                                  ▼
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  2. INITIAL DRAFT                                                       │
//	│     - Generate draft from model's knowledge                             │
//	│     - Creates structure and baseline content                            │
//	│     - Marks areas needing research                                      │
//	└─────────────────────────────────────────────────────────────────────────┘
//	                                  │
//	                                  ▼
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  3. DIFFUSION LOOP (Supervisor → Sub-Researchers)                       │
//	│     For max iterations:                                                 │
//	│       a. think: Analyze gaps in draft                                   │
//	│       b. conduct_research: Delegate to sub-researchers (parallel)       │
//	│       c. refine_draft: Incorporate findings                             │
//	│       d. Check completion based on findings, NOT draft appearance       │
//	└─────────────────────────────────────────────────────────────────────────┘
//	                                  │
//	                                  ▼
//	┌─────────────────────────────────────────────────────────────────────────┐
//	│  4. FINAL REPORT                                                        │
//	│     - Apply Insightfulness + Helpfulness rules                          │
//	│     - Full generation optimization                                      │
//	│     - Proper citations and structure                                    │
//	└─────────────────────────────────────────────────────────────────────────┘
//
// Original model: OpenAI GPT-5
// Our model: alibaba/tongyi-deepresearch-30b-a3b (via OpenRouter)
package think_deep

import (
	"context"
	"fmt"
	"time"

	"go-research/internal/architectures"
	"go-research/internal/architectures/catalog"
	"go-research/internal/architectures/think_deep/runtime"
	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/tools"
)

// Architecture implements the ThinkDepth Self-Balancing Test-Time Diffusion
// research pattern using iterative refinement.
type Architecture struct {
	bus              *events.Bus
	config           *config.Config
	client           llm.ChatClient
	tools            tools.ToolExecutor
	injectionContext *runtime.InjectionContext
	loop             *AgentLoop
}

// Config holds configuration for the ThinkDeep architecture.
type Config struct {
	AppConfig        *config.Config
	Bus              *events.Bus
	Client           llm.ChatClient            // Optional: inject for testing
	Tools            tools.ToolExecutor        // Optional: inject for testing
	InjectionContext *runtime.InjectionContext // Optional: prior context for expansion
}

// New creates a new ThinkDeep architecture instance.
func New(cfg Config) *Architecture {
	a := &Architecture{
		bus:              cfg.Bus,
		config:           cfg.AppConfig,
		client:           cfg.Client,
		tools:            cfg.Tools,
		injectionContext: cfg.InjectionContext,
	}

	opts := []LoopOption{}
	if cfg.Client != nil {
		opts = append(opts, WithLoopClient(cfg.Client))
	}
	if cfg.Tools != nil {
		opts = append(opts, WithLoopTools(cfg.Tools))
	}
	if cfg.InjectionContext != nil {
		opts = append(opts, WithInjectionContext(cfg.InjectionContext))
	}

	a.loop = NewAgentLoop(cfg.Bus, cfg.AppConfig, opts...)
	return a
}

// Name returns the architecture identifier.
func (a *Architecture) Name() string {
	return "think_deep"
}

// Description returns a human-readable description.
func (a *Architecture) Description() string {
	return "ThinkDepth: Self-Balancing Test-Time Diffusion Deep Research (GPT-5 in original)"
}

// SupportsResume indicates this architecture does not support resuming.
func (a *Architecture) SupportsResume() bool {
	return false
}

// SetInjectionContext sets the context for expansion workflows.
// This allows building upon existing research findings.
func (a *Architecture) SetInjectionContext(ctx *runtime.InjectionContext) {
	a.injectionContext = ctx
	// Update loop with new context
	if a.loop != nil {
		a.loop.injectionContext = ctx
	}
}

// Research executes the ThinkDeep research workflow:
//  1. Brief generation - Transform query to detailed research brief
//  2. Initial draft - Generate draft from model's knowledge
//  3. Diffusion loop - Supervisor coordinates sub-researchers to refine draft
//  4. Final report - Full optimization with Insightfulness + Helpfulness rules
func (a *Architecture) Research(ctx context.Context, sessionID string, query string) (*architectures.Result, error) {
	startTime := time.Now()

	if a.loop == nil {
		opts := []LoopOption{}
		if a.client != nil {
			opts = append(opts, WithLoopClient(a.client))
		}
		if a.tools != nil {
			opts = append(opts, WithLoopTools(a.tools))
		}
		if a.injectionContext != nil {
			opts = append(opts, WithInjectionContext(a.injectionContext))
		}
		a.loop = NewAgentLoop(a.bus, a.config, opts...)
	}

	// Execute the full ThinkDeep workflow
	thinkDeepResult, err := a.loop.Research(ctx, query)
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

	// Convert ThinkDeep result to architecture result
	return a.convertResult(sessionID, thinkDeepResult, startTime), nil
}

// Resume is not supported for ThinkDeep architecture.
func (a *Architecture) Resume(ctx context.Context, sessionID string) (*architectures.Result, error) {
	return nil, fmt.Errorf("resume not supported for ThinkDepth")
}

// convertResult transforms LoopResult into the standard architectures.Result format.
func (a *Architecture) convertResult(sessionID string, tdr *LoopResult, startTime time.Time) *architectures.Result {
	result := &architectures.Result{
		SessionID:   sessionID,
		Query:       tdr.Query,
		Report:      tdr.FinalReport,
		Summary:     tdr.ResearchBrief,
		SubInsights: tdr.SubInsights,
		Status:      "complete",
		Metrics: architectures.Metrics{
			Duration:   time.Since(startTime),
			Cost:       tdr.Cost,
			Iterations: len(tdr.Notes), // Number of sub-researcher results
		},
	}

	// Extract sources from SubInsights
	sourceSet := make(map[string]bool)
	for _, insight := range tdr.SubInsights {
		if insight.SourceURL != "" {
			sourceSet[insight.SourceURL] = true
		}
	}
	for url := range sourceSet {
		result.Sources = append(result.Sources, url)
	}

	// Use insight count for quality metrics
	result.Metrics.FactCount = len(tdr.SubInsights)
	result.Metrics.SourceCount = len(result.Sources)

	return result
}

// Ensure Architecture implements the interface
var _ architectures.Architecture = (*Architecture)(nil)

func init() {
	catalog.Register(catalog.Definition{
		Name:           "think_deep",
		Description:    "ThinkDepth: Self-Balancing Test-Time Diffusion Deep Research",
		SupportsResume: false,
		Build: func(deps catalog.Dependencies) (architectures.Architecture, error) {
			if deps.Config == nil {
				return nil, fmt.Errorf("config is required to build think_deep architecture")
			}
			return New(Config{
				AppConfig: deps.Config,
				Bus:       deps.Bus,
			}), nil
		},
	})
}
