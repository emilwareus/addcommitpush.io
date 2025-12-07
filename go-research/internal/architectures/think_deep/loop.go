package think_deep

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go-research/internal/agents"
	"go-research/internal/architectures/think_deep/runtime"
	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
	"go-research/internal/tools"
)

// AgentLoop coordinates ThinkDepth-style deep research using
// the "Self-Balancing Test-Time Diffusion" approach.
//
// The workflow consists of four phases:
//  1. Brief generation: convert the user query into a structured brief (LLM call).
//  2. Draft generation: produce a first-pass report structure from model priors (LLM call).
//  3. Diffusion loop: supervisor iterates, spawning sub-researchers and refining the draft
//     until completion criteria are met (bounded by iteration limits).
//  4. Final report: synthesize deduped findings + refined draft into the final deliverable.
//
// Original: research_agent_full.py in ThinkDepth.ai
type AgentLoop struct {
	bus        *events.Bus
	appConfig  *config.Config
	client     llm.ChatClient
	tools      tools.ToolExecutor
	supervisor *agents.SupervisorAgent
	model      string

	// Injection context for expansion workflows
	injectionContext *runtime.InjectionContext
}

// LoopConfig holds configuration for the ThinkDeep loop.
type LoopConfig struct {
	// MaxSupervisorIterations is the max diffusion iterations
	MaxSupervisorIterations int

	// MaxSubResearcherIter is the max search iterations per sub-researcher
	MaxSubResearcherIter int

	// MaxConcurrentResearch is the max parallel sub-researchers
	MaxConcurrentResearch int
}

// DefaultLoopConfig returns sensible defaults for ThinkDeep configuration.
func DefaultLoopConfig() LoopConfig {
	return LoopConfig{
		MaxSupervisorIterations: 15,
		MaxSubResearcherIter:    5,
		MaxConcurrentResearch:   3,
	}
}

// LoopOption allows configuring the ThinkDeep loop.
type LoopOption func(*AgentLoop)

// WithLoopClient injects a custom LLM client (for testing).
func WithLoopClient(client llm.ChatClient) LoopOption {
	return func(o *AgentLoop) {
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

// WithLoopTools injects a custom tool executor (for testing).
func WithLoopTools(toolExec tools.ToolExecutor) LoopOption {
	return func(o *AgentLoop) {
		o.tools = toolExec
	}
}

// WithInjectionContext provides prior context for expansion workflows.
// This enables the orchestrator to build upon existing research findings.
func WithInjectionContext(ctx *runtime.InjectionContext) LoopOption {
	return func(o *AgentLoop) {
		o.injectionContext = ctx
	}
}

// NewAgentLoop creates a new ThinkDeep-style research loop.
func NewAgentLoop(bus *events.Bus, cfg *config.Config, opts ...LoopOption) *AgentLoop {
	client := llm.NewClient(cfg)
	toolReg := tools.NewRegistry(cfg.BraveAPIKey)

	o := &AgentLoop{
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

// LoopResult contains the output of ThinkDeep research.
type LoopResult struct {
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

	// SubInsights contains all structured insights captured during diffusion
	SubInsights []runtime.SubInsight

	// Cost tracks total token usage
	Cost session.CostBreakdown

	// Duration is the total research time
	Duration time.Duration
}

// Research executes the ThinkDeep workflow.
func (o *AgentLoop) Research(ctx context.Context, query string) (*LoopResult, error) {
	startTime := time.Now()
	var totalCost session.CostBreakdown

	// Emit start event early so downstream listeners can attach.
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

	// Phase 1: Generate research brief from query.
	// Single LLM call that expands the raw query into objectives, questions, and constraints.
	o.emitPhaseProgress("brief", "Generating research brief from query...")
	researchBrief, briefCost, err := o.generateResearchBrief(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("generate research brief: %w", err)
	}
	totalCost.Add(briefCost)

	// Apply injection context to enhance brief for expansion workflows
	if o.injectionContext != nil {
		researchBrief = o.enhanceBriefForExpansion(researchBrief)
	}

	o.emitPhaseProgress("brief", "Research brief generated")

	// Check for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Phase 2: Generate initial draft report (from model priors only).
	// No external research yet—this seeds structure and highlights gaps for diffusion.
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

	// Phase 3: Supervisor coordination with diffusion refinement.
	// The supervisor loops with max-iteration guard:
	//   - analyze gaps
	//   - delegate parallel sub-researchers
	//   - refine draft
	//   - stop based on findings, not draft appearance
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

	// Phase 4: Final report generation (full optimization).
	// Uses deduped findings + refined draft to apply Insightfulness/Helpfulness rules.
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

	return &LoopResult{
		Query:         query,
		ResearchBrief: researchBrief,
		Notes:         supervisorResult.Notes,
		DraftReport:   supervisorResult.DraftReport,
		FinalReport:   finalReport,
		SubInsights:   supervisorResult.SubInsights,
		Cost:          totalCost,
		Duration:      time.Since(startTime),
	}, nil
}

// executeSubResearch runs a sub-researcher agent for a specific topic.
func (o *AgentLoop) executeSubResearch(
	ctx context.Context,
	topic string,
	researcherNum int,
	diffusionIteration int,
) (*agents.SubResearcherResult, error) {
	// Each sub-researcher gets a fresh tool registry tuned for summarization.
	// Supervisor controls fan-out; this function is the per-delegation callback.
	subTools := runtime.SubResearcherToolRegistry(o.appConfig.BraveAPIKey, o.client)
	subResearcher := agents.NewSubResearcherAgent(
		o.client,
		subTools,
		o.bus,
		agents.DefaultSubResearcherConfig(),
	)

	return subResearcher.Research(ctx, topic, researcherNum)
}

// generateResearchBrief transforms the user query into a detailed research brief.
func (o *AgentLoop) generateResearchBrief(ctx context.Context, query string) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")
	prompt := runtime.TransformToResearchBriefPrompt(query, date)

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
func (o *AgentLoop) generateInitialDraft(ctx context.Context, brief string) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")
	prompt := runtime.InitialDraftPrompt(brief, date)

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
func (o *AgentLoop) generateFinalReport(
	ctx context.Context,
	brief string,
	supervisor *agents.SupervisorResult,
) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")

	// Deduplicate findings based on URL overlap to prevent redundant sources;
	// keeps notes with at least one new URL or URL-less general content.
	deduplicatedNotes := o.deduplicateFindings(supervisor.Notes)
	findings := strings.Join(deduplicatedNotes, "\n\n---\n\n")
	prompt := runtime.FinalReportPrompt(brief, findings, supervisor.DraftReport, date)

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

func (o *AgentLoop) emitDiffusionStarted(topic string) {
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

func (o *AgentLoop) emitDiffusionComplete(iterations, notesCount int) {
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

func (o *AgentLoop) emitFinalReportStarted() {
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

func (o *AgentLoop) emitFinalReportComplete() {
	if o.bus == nil {
		return
	}
	o.bus.Publish(events.Event{
		Type:      events.EventFinalReportComplete,
		Timestamp: time.Now(),
	})
}

func (o *AgentLoop) emitCostEvent(scope string, cost session.CostBreakdown) {
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

func (o *AgentLoop) emitPhaseProgress(phase, message string) {
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

// enhanceBriefForExpansion modifies the research brief to focus on expansion.
// It adds context about existing research to guide sub-researchers toward new insights.
func (o *AgentLoop) enhanceBriefForExpansion(brief string) string {
	if o.injectionContext == nil {
		return brief
	}

	var enhanced strings.Builder
	enhanced.WriteString(brief)
	enhanced.WriteString("\n\n## Expansion Context\n\n")

	if o.injectionContext.ExpansionTopic != "" {
		enhanced.WriteString(fmt.Sprintf("This is a follow-up research expanding on: %s\n\n", o.injectionContext.ExpansionTopic))
	}

	if len(o.injectionContext.PreviousFindings) > 0 {
		enhanced.WriteString("### Known Findings (do not re-research these):\n")
		limit := len(o.injectionContext.PreviousFindings)
		if limit > 10 {
			limit = 10
		}
		for _, finding := range o.injectionContext.PreviousFindings[:limit] {
			enhanced.WriteString(fmt.Sprintf("- %s\n", finding))
		}
		enhanced.WriteString("\n")
	}

	if len(o.injectionContext.KnownGaps) > 0 {
		enhanced.WriteString("### Known Gaps (prioritize these):\n")
		for _, gap := range o.injectionContext.KnownGaps {
			enhanced.WriteString(fmt.Sprintf("- %s\n", gap))
		}
		enhanced.WriteString("\n")
	}

	if len(o.injectionContext.VisitedURLs) > 0 {
		enhanced.WriteString(fmt.Sprintf("### Previously Visited Sources (%d URLs - avoid revisiting):\n", len(o.injectionContext.VisitedURLs)))
		limit := len(o.injectionContext.VisitedURLs)
		if limit > 5 {
			limit = 5
		}
		for _, url := range o.injectionContext.VisitedURLs[:limit] {
			enhanced.WriteString(fmt.Sprintf("- %s\n", url))
		}
		if len(o.injectionContext.VisitedURLs) > 5 {
			enhanced.WriteString(fmt.Sprintf("- ... and %d more\n", len(o.injectionContext.VisitedURLs)-5))
		}
		enhanced.WriteString("\n")
	}

	return enhanced.String()
}

// deduplicateFindings removes notes with entirely redundant URLs.
// A note is kept if it contains at least one URL not seen in previous notes,
// or if it contains no URLs (general content that should be preserved).
func (o *AgentLoop) deduplicateFindings(notes []string) []string {
	seenURLs := make(map[string]bool)
	var result []string

	for _, note := range notes {
		urls := runtime.ExtractURLs(note)

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
