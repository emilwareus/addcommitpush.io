package storm

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

// StormLoop coordinates STORM-style deep research using:
// - Enhanced perspective discovery (with related topic survey)
// - Simulated expert conversations (WikiWriter↔TopicExpert dialogues)
// - Two-phase outline generation (draft + refinement)
// - Analysis phase for cross-validation
// - Structured report synthesis
//
// High-level phases:
// 1) Perspective discovery: survey related topics and pick 3-5 expert angles.
// 2) Conversation simulation: per perspective, WikiWriter <-> TopicExpert loop with tools.
// 3) Analysis: cross-validate facts, contradictions, and gaps across conversations.
// 4) Synthesis: outline draft + refinement + full report with citations.
type StormLoop struct {
	bus               *events.Bus
	appConfig         *config.Config
	client            llm.ChatClient
	contextMgr        *ctxmgr.Manager
	perspectiveDiscov *planning.PerspectiveDiscoverer
	conversationSim   *agents.ConversationSimulator
	analysisAgent     *agents.AnalysisAgent
	synthesisAgent    *agents.SynthesisAgent
	tools             tools.ToolExecutor
}

// StormLoopOption allows configuring the STORM loop
type StormLoopOption func(*StormLoop)

// WithStormClient injects a custom LLM client (for testing)
func WithStormClient(client llm.ChatClient) StormLoopOption {
	return func(o *StormLoop) {
		o.client = client
		o.perspectiveDiscov = planning.NewPerspectiveDiscovererWithTools(client, o.tools)
		o.conversationSim = agents.NewConversationSimulatorWithBus(client, o.tools, o.bus, agents.DefaultConversationConfig())
		o.analysisAgent = agents.NewAnalysisAgentWithBus(client, o.bus)
		o.synthesisAgent = agents.NewSynthesisAgentWithBus(client, o.bus)
	}
}

// WithStormTools injects a custom tool executor (for testing)
func WithStormTools(toolExec tools.ToolExecutor) StormLoopOption {
	return func(o *StormLoop) {
		o.tools = toolExec
	}
}

// NewStormLoop creates a new STORM-style research loop
func NewStormLoop(bus *events.Bus, cfg *config.Config, opts ...StormLoopOption) *StormLoop {
	client := llm.NewClient(cfg)
	toolReg := tools.NewRegistry(cfg.BraveAPIKey)

	o := &StormLoop{
		bus:        bus,
		appConfig:  cfg,
		client:     client,
		contextMgr: ctxmgr.New(client, ctxmgr.DefaultConfig()),
		tools:      toolReg,
	}

	// Initialize components that depend on tools being set
	o.perspectiveDiscov = planning.NewPerspectiveDiscovererWithTools(client, toolReg)
	o.conversationSim = agents.NewConversationSimulatorWithBus(client, toolReg, bus, agents.DefaultConversationConfig())
	o.analysisAgent = agents.NewAnalysisAgentWithBus(client, bus)
	o.synthesisAgent = agents.NewSynthesisAgentWithBus(client, bus)

	// Apply options
	for _, opt := range opts {
		opt(o)
	}

	return o
}

// StormResult contains the output of STORM-style research
type StormResult struct {
	Topic          string
	Perspectives   []planning.Perspective
	Conversations  map[string]*agents.ConversationResult
	AnalysisResult *agents.AnalysisResult
	Report         *agents.Report
	Cost           session.CostBreakdown
	Duration       time.Duration
}

// Research executes the STORM research workflow
func (o *StormLoop) Research(ctx context.Context, query string) (*StormResult, error) {
	startTime := time.Now()

	// Reset context manager for new session
	o.contextMgr.Reset()

	var totalCost session.CostBreakdown

	// Emit start event so UI/telemetry can attach.
	o.bus.Publish(events.Event{
		Type:      events.EventResearchStarted,
		Timestamp: time.Now(),
		Data: events.ResearchStartedData{
			Query: query,
			Mode:  "storm-conversations",
		},
	})

	// 1. Enhanced Perspective Discovery (with related topic survey).
	// Single LLM-driven discoverer that surfaces 3-5 perspectives + starter questions.
	o.bus.Publish(events.Event{
		Type:      events.EventQueryAnalyzed,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"message": "Surveying related topics and discovering perspectives...",
		},
	})

	perspectives, perspectiveCost, err := o.perspectiveDiscov.DiscoverWithSurvey(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("perspective discovery: %w", err)
	}
	totalCost.Add(perspectiveCost)

	// Build perspective data for visualization
	perspectiveData := make([]events.PerspectiveData, len(perspectives))
	for i, p := range perspectives {
		perspectiveData[i] = events.PerspectiveData{
			Name:      p.Name,
			Focus:     p.Focus,
			Questions: p.Questions,
		}
	}

	o.bus.Publish(events.Event{
		Type:      events.EventPlanCreated,
		Timestamp: time.Now(),
		Data: events.PlanCreatedData{
			WorkerCount:  len(perspectives),
			Complexity:   0.9, // STORM conversations are high complexity
			Topic:        query,
			Perspectives: perspectiveData,
		},
	})

	// Check for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// 2. Execute Conversations (parallel per perspective).
	// Each perspective runs a WikiWriter↔TopicExpert loop with search/tooling until done.
	conversations, err := o.executeConversationPhase(ctx, query, perspectives)
	if err != nil {
		return nil, fmt.Errorf("conversation phase: %w", err)
	}

	// Accumulate conversation costs
	for _, conv := range conversations {
		totalCost.Add(conv.TotalCost)
	}

	// Check for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// 3. Run analysis on facts from conversations.
	// Cross-validate facts across perspectives to surface contradictions and gaps.
	allFacts := agents.GetAllFacts(conversations)
	expectedCoverage := planning.CollectQuestions(perspectives)

	o.bus.Publish(events.Event{
		Type:      events.EventAnalysisStarted,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"fact_count": len(allFacts),
			"step":       "cross-validation",
			"message":    fmt.Sprintf("Cross-validating %d facts from conversations...", len(allFacts)),
		},
	})

	var analysisResult *agents.AnalysisResult
	if len(allFacts) > 0 {
		analysisResult, err = o.analysisAgent.Analyze(ctx, query, allFacts, expectedCoverage)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
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

	// Check for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// 4. Synthesize report using two-phase outline and conversations.
	// Outline draft -> outline refine -> full report with citations.
	o.bus.Publish(events.Event{
		Type:      events.EventSynthesisStarted,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"message": "Generating report with two-phase outline...",
		},
	})

	report, err := o.synthesisAgent.SynthesizeWithConversations(ctx, query, conversations, analysisResult)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("synthesis: %w", err)
	}

	totalCost.Add(report.Cost)

	o.bus.Publish(events.Event{
		Type:      events.EventSynthesisComplete,
		Timestamp: time.Now(),
	})

	contextCost := o.contextMgr.CostBreakdown()
	totalCost.Add(contextCost)

	o.emitCostEvent("total", totalCost)

	return &StormResult{
		Topic:          query,
		Perspectives:   perspectives,
		Conversations:  conversations,
		AnalysisResult: analysisResult,
		Report:         report,
		Cost:           totalCost,
		Duration:       time.Since(startTime),
	}, nil
}

// executeConversationPhase runs parallel conversations for all perspectives.
// This is the core STORM mechanism - simulated WikiWriter↔TopicExpert dialogues.
func (o *StormLoop) executeConversationPhase(
	ctx context.Context,
	topic string,
	perspectives []planning.Perspective,
) (map[string]*agents.ConversationResult, error) {
	// For each perspective we spin a goroutine that runs the WikiWriter<->TopicExpert loop
	// until the TopicExpert closes the dialog (“Thank you for your help!”).
	// Results are collected via channel to avoid holding locks inside the agent loop.
	results := make(map[string]*agents.ConversationResult)
	var mu sync.Mutex

	// Create channels for results and errors
	type convResult struct {
		name   string
		result *agents.ConversationResult
		err    error
	}
	resultsChan := make(chan convResult, len(perspectives))

	// Run conversations in parallel
	var wg sync.WaitGroup
	for i, perspective := range perspectives {
		wg.Add(1)
		go func(idx int, p planning.Perspective) {
			defer wg.Done()

			// Emit conversation started event
			o.bus.Publish(events.Event{
				Type:      events.EventConversationStarted,
				Timestamp: time.Now(),
				Data: events.ConversationStartedData{
					Perspective:       p.Name,
					Focus:             p.Focus,
					TotalPerspectives: len(perspectives),
					Index:             idx,
				},
			})

			result, err := o.conversationSim.SimulateConversation(ctx, topic, p)
			if err != nil {
				resultsChan <- convResult{name: p.Name, err: err}
				return
			}

			// Emit conversation completed event
			sources := 0
			for _, turn := range result.Turns {
				sources += len(turn.Sources)
			}

			o.bus.Publish(events.Event{
				Type:      events.EventConversationCompleted,
				Timestamp: time.Now(),
				Data: events.ConversationCompletedData{
					Perspective: p.Name,
					TotalTurns:  len(result.Turns),
					FactsFound:  len(result.Facts),
					Sources:     sources,
				},
			})

			resultsChan <- convResult{name: p.Name, result: result}
		}(i, perspective)
	}

	// Wait for all conversations to complete
	wg.Wait()
	close(resultsChan)

	// Collect results
	var firstErr error
	for cr := range resultsChan {
		if cr.err != nil {
			if firstErr == nil {
				firstErr = cr.err
			}
			continue
		}
		mu.Lock()
		results[cr.name] = cr.result
		mu.Unlock()
	}

	// If all conversations failed, return the first error
	if len(results) == 0 && firstErr != nil {
		return nil, firstErr
	}

	return results, nil
}

func (o *StormLoop) emitCostEvent(scope string, cost session.CostBreakdown) {
	if o.bus == nil || cost.TotalTokens == 0 {
		return
	}
	// Emit per-scope cost so telemetry/UX can display live burn-down.
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
