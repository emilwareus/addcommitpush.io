package orchestrator

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go-research/internal/agents"
	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
	"go-research/internal/think_deep"
	"go-research/internal/tools"
)

// ThinkDeepOrchestrator coordinates ThinkDepth-style deep research using
// the "Self-Balancing Test-Time Diffusion" approach.
//
// The workflow consists of four phases:
// 1. Brief Generation - Transform user query into detailed research brief
// 2. Initial Draft - Generate draft from model's knowledge
// 3. Diffusion Loop - Supervisor coordination with sub-researchers
// 4. Final Report - Full optimization with Insightfulness + Helpfulness rules
//
// Original: research_agent_full.py in ThinkDepth.ai
type ThinkDeepOrchestrator struct {
	bus        *events.Bus
	appConfig  *config.Config
	client     llm.ChatClient
	tools      tools.ToolExecutor
	supervisor *agents.SupervisorAgent
	model      string
}

// ThinkDeepConfig holds configuration for the ThinkDeep orchestrator.
type ThinkDeepConfig struct {
	// MaxSupervisorIterations is the max diffusion iterations
	MaxSupervisorIterations int

	// MaxSubResearcherIter is the max search iterations per sub-researcher
	MaxSubResearcherIter int

	// MaxConcurrentResearch is the max parallel sub-researchers
	MaxConcurrentResearch int
}

// DefaultThinkDeepConfig returns sensible defaults for ThinkDeep configuration.
func DefaultThinkDeepConfig() ThinkDeepConfig {
	return ThinkDeepConfig{
		MaxSupervisorIterations: 15,
		MaxSubResearcherIter:    5,
		MaxConcurrentResearch:   3,
	}
}

// ThinkDeepOption allows configuring the ThinkDeep orchestrator.
type ThinkDeepOption func(*ThinkDeepOrchestrator)

// WithThinkDeepClient injects a custom LLM client (for testing).
func WithThinkDeepClient(client llm.ChatClient) ThinkDeepOption {
	return func(o *ThinkDeepOrchestrator) {
		o.client = client
		o.model = client.GetModel()
		// Recreate supervisor with injected client
		o.supervisor = agents.NewSupervisorAgent(
			client,
			o.bus,
			agents.SupervisorConfig{
				MaxIterations:     15,
				MaxConcurrentSubs: 3,
			},
		)
	}
}

// WithThinkDeepTools injects a custom tool executor (for testing).
func WithThinkDeepTools(toolExec tools.ToolExecutor) ThinkDeepOption {
	return func(o *ThinkDeepOrchestrator) {
		o.tools = toolExec
	}
}

// NewThinkDeepOrchestrator creates a new ThinkDeep-style research orchestrator.
func NewThinkDeepOrchestrator(bus *events.Bus, cfg *config.Config, opts ...ThinkDeepOption) *ThinkDeepOrchestrator {
	client := llm.NewClient(cfg)
	toolReg := tools.NewRegistry(cfg.BraveAPIKey)

	o := &ThinkDeepOrchestrator{
		bus:       bus,
		appConfig: cfg,
		client:    client,
		tools:     toolReg,
		model:     cfg.Model,
	}

	// Initialize supervisor with default config
	o.supervisor = agents.NewSupervisorAgent(
		client,
		bus,
		agents.DefaultSupervisorConfig(),
	)

	// Apply options
	for _, opt := range opts {
		opt(o)
	}

	return o
}

// ThinkDeepResult contains the output of ThinkDeep research.
type ThinkDeepResult struct {
	// Query is the original user query
	Query string

	// ResearchBrief is the expanded research brief
	ResearchBrief string

	// Notes contains compressed research from sub-researchers
	Notes []string

	// DraftReport is the iteratively refined draft
	DraftReport string

	// FinalReport is the fully optimized final output
	FinalReport string

	// Cost tracks total token usage
	Cost session.CostBreakdown

	// Duration is the total research time
	Duration time.Duration
}

// Research executes the ThinkDeep workflow.
func (o *ThinkDeepOrchestrator) Research(ctx context.Context, query string) (*ThinkDeepResult, error) {
	startTime := time.Now()
	var totalCost session.CostBreakdown

	// Emit start event
	if o.bus != nil {
		o.bus.Publish(events.Event{
			Type:      events.EventResearchStarted,
			Timestamp: time.Now(),
			Data: events.ResearchStartedData{
				Query: query,
				Mode:  "think-deep-diffusion",
			},
		})
	}
	o.emitDiffusionStarted(query)

	// Phase 1: Generate research brief from query
	o.emitPhaseProgress("brief", "Generating research brief from query...")
	researchBrief, briefCost, err := o.generateResearchBrief(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("generate research brief: %w", err)
	}
	totalCost.Add(briefCost)

	o.emitPhaseProgress("brief", "Research brief generated")

	// Check for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Phase 2: Generate initial draft report (from model's knowledge)
	o.emitPhaseProgress("draft", "Generating initial draft from model knowledge...")
	initialDraft, draftCost, err := o.generateInitialDraft(ctx, researchBrief)
	if err != nil {
		return nil, fmt.Errorf("generate initial draft: %w", err)
	}
	totalCost.Add(draftCost)

	o.emitPhaseProgress("draft", "Initial draft generated")

	// Check for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Phase 3: Supervisor coordination with diffusion refinement
	o.emitPhaseProgress("diffuse", "Starting diffusion-based refinement...")

	supervisorResult, err := o.supervisor.Coordinate(
		ctx,
		researchBrief,
		initialDraft,
		o.executeSubResearch,
	)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("supervisor coordination: %w", err)
	}
	totalCost.Add(supervisorResult.Cost)

	// Emit diffusion complete
	o.emitDiffusionComplete(supervisorResult.IterationsUsed, len(supervisorResult.Notes))

	// Check for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Phase 4: Final report generation (full optimization)
	o.emitFinalReportStarted()

	finalReport, reportCost, err := o.generateFinalReport(ctx, researchBrief, supervisorResult)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("final report generation: %w", err)
	}
	totalCost.Add(reportCost)

	o.emitFinalReportComplete()
	o.emitCostEvent("total", totalCost)

	return &ThinkDeepResult{
		Query:         query,
		ResearchBrief: researchBrief,
		Notes:         supervisorResult.Notes,
		DraftReport:   supervisorResult.DraftReport,
		FinalReport:   finalReport,
		Cost:          totalCost,
		Duration:      time.Since(startTime),
	}, nil
}

// executeSubResearch runs a sub-researcher agent for a specific topic.
func (o *ThinkDeepOrchestrator) executeSubResearch(
	ctx context.Context,
	topic string,
	researcherNum int,
	diffusionIteration int,
) (*agents.SubResearcherResult, error) {
	// Create sub-researcher with summarization-enabled tool registry
	subTools := think_deep.SubResearcherToolRegistry(o.appConfig.BraveAPIKey, o.client)
	subResearcher := agents.NewSubResearcherAgent(
		o.client,
		subTools,
		o.bus,
		agents.DefaultSubResearcherConfig(),
	)

	return subResearcher.Research(ctx, topic, researcherNum)
}

// generateResearchBrief transforms the user query into a detailed research brief.
func (o *ThinkDeepOrchestrator) generateResearchBrief(ctx context.Context, query string) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")
	prompt := think_deep.TransformToResearchBriefPrompt(query, date)

	resp, err := o.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", session.CostBreakdown{}, err
	}

	if len(resp.Choices) == 0 {
		return "", session.CostBreakdown{}, fmt.Errorf("empty response from LLM")
	}

	cost := session.NewCostBreakdown(o.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	return resp.Choices[0].Message.Content, cost, nil
}

// generateInitialDraft creates the initial draft report from model's knowledge.
func (o *ThinkDeepOrchestrator) generateInitialDraft(ctx context.Context, brief string) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")
	prompt := think_deep.InitialDraftPrompt(brief, date)

	resp, err := o.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", session.CostBreakdown{}, err
	}

	if len(resp.Choices) == 0 {
		return "", session.CostBreakdown{}, fmt.Errorf("empty response from LLM")
	}

	cost := session.NewCostBreakdown(o.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	return resp.Choices[0].Message.Content, cost, nil
}

// generateFinalReport creates the final optimized report with full Insightfulness + Helpfulness rules.
func (o *ThinkDeepOrchestrator) generateFinalReport(
	ctx context.Context,
	brief string,
	supervisor *agents.SupervisorResult,
) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")

	// Deduplicate findings based on URL overlap to prevent redundant sources
	deduplicatedNotes := o.deduplicateFindings(supervisor.Notes)
	findings := strings.Join(deduplicatedNotes, "\n\n---\n\n")
	prompt := think_deep.FinalReportPrompt(brief, findings, supervisor.DraftReport, date)

	resp, err := o.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", session.CostBreakdown{}, err
	}

	if len(resp.Choices) == 0 {
		return "", session.CostBreakdown{}, fmt.Errorf("empty response from LLM")
	}

	cost := session.NewCostBreakdown(o.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	return resp.Choices[0].Message.Content, cost, nil
}

// Event emission helpers

func (o *ThinkDeepOrchestrator) emitDiffusionStarted(topic string) {
	if o.bus == nil {
		return
	}
	o.bus.Publish(events.Event{
		Type:      events.EventDiffusionStarted,
		Timestamp: time.Now(),
		Data: events.DiffusionStartedData{
			Topic:         topic,
			MaxIterations: 15, // Default max iterations
		},
	})
}

func (o *ThinkDeepOrchestrator) emitDiffusionComplete(iterations, notesCount int) {
	if o.bus == nil {
		return
	}
	o.bus.Publish(events.Event{
		Type:      events.EventDiffusionComplete,
		Timestamp: time.Now(),
		Data: events.DiffusionIterationData{
			Iteration:     iterations,
			MaxIterations: 15,
			NotesCount:    notesCount,
			DraftProgress: 1.0, // Complete
			Phase:         "complete",
			Message:       fmt.Sprintf("Diffusion complete after %d iterations with %d notes", iterations, notesCount),
		},
	})
}

func (o *ThinkDeepOrchestrator) emitFinalReportStarted() {
	if o.bus == nil {
		return
	}
	o.bus.Publish(events.Event{
		Type:      events.EventFinalReportStarted,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"message": "Generating final report with full optimization (Insightfulness + Helpfulness)...",
		},
	})
}

func (o *ThinkDeepOrchestrator) emitFinalReportComplete() {
	if o.bus == nil {
		return
	}
	o.bus.Publish(events.Event{
		Type:      events.EventFinalReportComplete,
		Timestamp: time.Now(),
	})
}

func (o *ThinkDeepOrchestrator) emitCostEvent(scope string, cost session.CostBreakdown) {
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

func (o *ThinkDeepOrchestrator) emitPhaseProgress(phase, message string) {
	if o.bus == nil {
		return
	}
	o.bus.Publish(events.Event{
		Type:      events.EventAnalysisProgress,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"phase":   phase,
			"message": message,
		},
	})
}

// deduplicateFindings removes notes with entirely redundant URLs.
// A note is kept if it contains at least one URL not seen in previous notes,
// or if it contains no URLs (general content that should be preserved).
func (o *ThinkDeepOrchestrator) deduplicateFindings(notes []string) []string {
	seenURLs := make(map[string]bool)
	var result []string

	for _, note := range notes {
		urls := think_deep.ExtractURLs(note)

		// Check how many new URLs this note contributes
		newURLCount := 0
		for _, url := range urls {
			if !seenURLs[url] {
				newURLCount++
			}
		}

		// Keep note if it has at least one new URL or no URLs (general content)
		if newURLCount > 0 || len(urls) == 0 {
			// Mark all URLs as seen
			for _, url := range urls {
				seenURLs[url] = true
			}
			result = append(result, note)
		}
	}

	return result
}
