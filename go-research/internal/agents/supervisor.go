// Package agents provides specialized research agents for the go-research system.
package agents

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
	"go-research/internal/think_deep"
)

// SupervisorAgent coordinates ThinkDeep research using the diffusion algorithm.
// It orchestrates sub-researchers and maintains the evolving draft report.
//
// Original: multi_agent_supervisor.py in ThinkDepth.ai
type SupervisorAgent struct {
	client           llm.ChatClient
	bus              *events.Bus
	maxIterations    int
	maxConcurrent    int
	model            string
}

// SupervisorConfig configures the supervisor agent behavior.
type SupervisorConfig struct {
	// MaxIterations is the maximum number of diffusion iterations (tool calls)
	MaxIterations int

	// MaxConcurrentSubs is the maximum number of parallel sub-researchers
	MaxConcurrentSubs int
}

// DefaultSupervisorConfig returns sensible defaults for supervisor configuration.
func DefaultSupervisorConfig() SupervisorConfig {
	return SupervisorConfig{
		MaxIterations:     15,
		MaxConcurrentSubs: 3,
	}
}

// NewSupervisorAgent creates a new supervisor agent with the given dependencies.
func NewSupervisorAgent(
	client llm.ChatClient,
	bus *events.Bus,
	cfg SupervisorConfig,
) *SupervisorAgent {
	if cfg.MaxIterations == 0 {
		cfg.MaxIterations = 15
	}
	if cfg.MaxConcurrentSubs == 0 {
		cfg.MaxConcurrentSubs = 3
	}

	return &SupervisorAgent{
		client:        client,
		bus:           bus,
		maxIterations: cfg.MaxIterations,
		maxConcurrent: cfg.MaxConcurrentSubs,
		model:         client.GetModel(),
	}
}

// SupervisorResult contains the output of supervisor coordination.
type SupervisorResult struct {
	// Notes contains compressed research findings from sub-researchers
	Notes []string

	// RawNotes contains raw search results before compression
	RawNotes []string

	// DraftReport is the iteratively refined draft
	DraftReport string

	// IterationsUsed is the number of diffusion iterations completed
	IterationsUsed int

	// Cost tracks token usage for the supervisor
	Cost session.CostBreakdown
}

// SubResearcherCallback is called when the supervisor wants to delegate research.
// It receives a topic and returns the compressed research or an error.
type SubResearcherCallback func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error)

// Coordinate runs the supervisor diffusion loop until research is complete or max iterations reached.
// The diffusion algorithm treats the draft report as a "noisy" initial state and iteratively
// "denoises" it by conducting research and refining the draft.
func (s *SupervisorAgent) Coordinate(
	ctx context.Context,
	researchBrief string,
	initialDraft string,
	subResearcher SubResearcherCallback,
) (*SupervisorResult, error) {
	state := think_deep.NewSupervisorState(researchBrief)
	state.UpdateDraft(initialDraft)

	var totalCost session.CostBreakdown
	var researcherNum int // Counter for sub-researcher IDs

	// Build system prompt once
	date := time.Now().Format("2006-01-02")
	systemPrompt := think_deep.LeadResearcherPrompt(date, s.maxConcurrent, s.maxIterations)

	for state.Iterations < s.maxIterations {
		state.IncrementIteration()

		// Emit iteration start event
		s.emitIterationEvent(state, "research")

		// Build messages for this iteration
		messages := s.buildMessages(systemPrompt, state)

		// Get supervisor decision
		resp, err := s.client.Chat(ctx, messages)
		if err != nil {
			if ctxErr := ctx.Err(); ctxErr != nil {
				return nil, ctxErr
			}
			return nil, fmt.Errorf("supervisor LLM call iteration %d: %w", state.Iterations, err)
		}

		if len(resp.Choices) == 0 {
			return nil, fmt.Errorf("empty response from LLM at iteration %d", state.Iterations)
		}

		// Track costs
		cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
		totalCost.Add(cost)

		content := resp.Choices[0].Message.Content
		state.AddMessage(llm.Message{Role: "assistant", Content: content})

		// Parse tool calls from response
		toolCalls := think_deep.ParseToolCalls(content)

		// Check for research completion
		if s.hasResearchComplete(toolCalls) {
			break
		}

		// If no tool calls, the model is done
		if len(toolCalls) == 0 {
			break
		}

		// Separate conduct_research calls from other tools for parallel execution
		var conductResearchCalls []think_deep.ToolCallParsed
		var otherCalls []think_deep.ToolCallParsed
		for _, tc := range toolCalls {
			if tc.Tool == "conduct_research" {
				conductResearchCalls = append(conductResearchCalls, tc)
			} else {
				otherCalls = append(otherCalls, tc)
			}
		}

		// Execute non-research tools sequentially first (think, refine_draft)
		var toolResults []string
		for _, tc := range otherCalls {
			result, err := s.executeToolCall(ctx, tc, state, subResearcher, &researcherNum, &totalCost)
			if err != nil {
				if ctxErr := ctx.Err(); ctxErr != nil {
					return nil, ctxErr
				}
				result = fmt.Sprintf("Error executing %s: %v", tc.Tool, err)
			}
			toolResults = append(toolResults, fmt.Sprintf("Result of %s: %s", tc.Tool, result))
		}

		// Execute conduct_research calls in parallel
		if len(conductResearchCalls) > 0 {
			researchResults, err := s.executeParallelResearch(ctx, conductResearchCalls, state, subResearcher, &researcherNum, &totalCost)
			if err != nil {
				return nil, err
			}
			toolResults = append(toolResults, researchResults...)
		}

		// Add combined tool results to conversation
		if len(toolResults) > 0 {
			state.AddMessage(llm.Message{
				Role:    "user",
				Content: strings.Join(toolResults, "\n\n---\n\n"),
			})
		}
	}

	return &SupervisorResult{
		Notes:          state.Notes,
		RawNotes:       state.RawNotes,
		DraftReport:    state.DraftReport,
		IterationsUsed: state.Iterations,
		Cost:           totalCost,
	}, nil
}

// buildMessages constructs the message list for the LLM call.
func (s *SupervisorAgent) buildMessages(systemPrompt string, state *think_deep.SupervisorState) []llm.Message {
	messages := []llm.Message{
		{Role: "system", Content: systemPrompt},
	}

	// Add the initial user message with research brief and draft
	userContext := fmt.Sprintf(`<Research Brief>
%s
</Research Brief>

<Current Draft Report>
%s
</Current Draft Report>

<Accumulated Research Notes>
%d notes collected from sub-researchers
</Accumulated Research Notes>

Analyze the current state and decide next action. Use the diffusion algorithm:
1. Identify gaps in the draft report
2. Use conduct_research to fill gaps (can call multiple times for parallel research)
3. Use refine_draft to incorporate new findings
4. Use research_complete when findings are comprehensive`, state.ResearchBrief, state.DraftReport, len(state.Notes))

	messages = append(messages, llm.Message{Role: "user", Content: userContext})

	// Add conversation history (excluding the first user message we just added)
	messages = append(messages, state.Messages...)

	return messages
}

// executeToolCall executes a single tool call and returns the result.
func (s *SupervisorAgent) executeToolCall(
	ctx context.Context,
	tc think_deep.ToolCallParsed,
	state *think_deep.SupervisorState,
	subResearcher SubResearcherCallback,
	researcherNum *int,
	totalCost *session.CostBreakdown,
) (string, error) {
	switch tc.Tool {
	case "conduct_research":
		return s.executeConductResearch(ctx, tc, state, subResearcher, researcherNum, totalCost)

	case "refine_draft":
		return s.executeRefineDraft(ctx, state, totalCost)

	case "think":
		// Don't emit iteration event for think - it's internal reflection
		reflection, _ := tc.Args["reflection"].(string)
		return fmt.Sprintf("Reflection recorded: %s", truncateForLog(reflection, 100)), nil

	case "research_complete":
		return "Research marked as complete. Proceeding to final report generation.", nil

	default:
		return fmt.Sprintf("Unknown tool: %s", tc.Tool), nil
	}
}

// executeConductResearch delegates to a sub-researcher and accumulates findings.
func (s *SupervisorAgent) executeConductResearch(
	ctx context.Context,
	tc think_deep.ToolCallParsed,
	state *think_deep.SupervisorState,
	subResearcher SubResearcherCallback,
	researcherNum *int,
	totalCost *session.CostBreakdown,
) (string, error) {
	topic, ok := tc.Args["research_topic"].(string)
	if !ok || topic == "" {
		return "Error: conduct_research requires a 'research_topic' argument", nil
	}

	*researcherNum++
	currentNum := *researcherNum

	// Emit delegation event
	s.emitDelegationEvent(topic, currentNum, state.Iterations)

	// Execute sub-researcher
	result, err := subResearcher(ctx, topic, currentNum, state.Iterations)
	if err != nil {
		return "", err
	}

	// Accumulate findings
	state.AddNote(result.CompressedResearch)
	for _, rawNote := range result.RawNotes {
		state.AddRawNote(rawNote)
	}
	// Track visited URLs for deduplication
	state.AddVisitedURLs(result.VisitedURLs)

	// Track costs
	totalCost.Add(result.Cost)

	return fmt.Sprintf("Sub-researcher %d completed research on: %s\n\nFindings:\n%s",
		currentNum, truncateForLog(topic, 50), truncateForLog(result.CompressedResearch, 500)), nil
}

// executeParallelResearch executes multiple conduct_research calls in parallel.
// Limited to s.maxConcurrent parallel goroutines using a semaphore.
func (s *SupervisorAgent) executeParallelResearch(
	ctx context.Context,
	calls []think_deep.ToolCallParsed,
	state *think_deep.SupervisorState,
	subResearcher SubResearcherCallback,
	researcherNum *int,
	totalCost *session.CostBreakdown,
) ([]string, error) {
	type researchResult struct {
		index     int
		topic     string
		subResult *SubResearcherResult
		resultStr string
		err       error
	}

	results := make(chan researchResult, len(calls))
	sem := make(chan struct{}, s.maxConcurrent)
	var wg sync.WaitGroup

	// Assign researcher numbers before spawning goroutines to ensure ordering
	researcherNums := make([]int, len(calls))
	for i := range calls {
		*researcherNum++
		researcherNums[i] = *researcherNum
	}

	for i, tc := range calls {
		wg.Add(1)
		currentNum := researcherNums[i]

		go func(idx int, toolCall think_deep.ToolCallParsed, resNum int) {
			defer wg.Done()

			// Acquire semaphore
			sem <- struct{}{}
			defer func() { <-sem }()

			// Check context cancellation
			if ctx.Err() != nil {
				results <- researchResult{index: idx, err: ctx.Err()}
				return
			}

			topic, ok := toolCall.Args["research_topic"].(string)
			if !ok || topic == "" {
				results <- researchResult{
					index:     idx,
					resultStr: "Error: conduct_research requires a 'research_topic' argument",
				}
				return
			}

			// Emit delegation event
			s.emitDelegationEvent(topic, resNum, state.Iterations)

			// Execute sub-researcher
			subResult, err := subResearcher(ctx, topic, resNum, state.Iterations)
			if err != nil {
				results <- researchResult{index: idx, topic: topic, err: err}
				return
			}

			resultStr := fmt.Sprintf("Sub-researcher %d completed research on: %s\n\nFindings:\n%s",
				resNum, truncateForLog(topic, 50), truncateForLog(subResult.CompressedResearch, 500))

			results <- researchResult{
				index:     idx,
				topic:     topic,
				subResult: subResult,
				resultStr: resultStr,
			}
		}(i, tc, currentNum)
	}

	// Wait for all goroutines to complete
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect and order results
	orderedResults := make([]researchResult, len(calls))
	for res := range results {
		orderedResults[res.index] = res
	}

	// Process results sequentially (state mutations must be sequential)
	var toolResultStrings []string
	for _, res := range orderedResults {
		if res.err != nil {
			if res.err == context.Canceled || res.err == context.DeadlineExceeded {
				return nil, res.err
			}
			toolResultStrings = append(toolResultStrings, fmt.Sprintf("Result of conduct_research: Error: %v", res.err))
			continue
		}

		if res.subResult != nil {
			// Accumulate findings in state
			state.AddNote(res.subResult.CompressedResearch)
			for _, rawNote := range res.subResult.RawNotes {
				state.AddRawNote(rawNote)
			}
			// Track visited URLs for deduplication
			state.AddVisitedURLs(res.subResult.VisitedURLs)
			totalCost.Add(res.subResult.Cost)
		}

		toolResultStrings = append(toolResultStrings, fmt.Sprintf("Result of conduct_research: %s", res.resultStr))
	}

	return toolResultStrings, nil
}

// executeRefineDraft refines the draft report with accumulated findings.
func (s *SupervisorAgent) executeRefineDraft(
	ctx context.Context,
	state *think_deep.SupervisorState,
	totalCost *session.CostBreakdown,
) (string, error) {
	if len(state.Notes) == 0 {
		return "No research findings to incorporate. Use conduct_research first.", nil
	}

	// Don't emit iteration event - refine is part of the current iteration

	// Build findings from accumulated notes
	findings := strings.Join(state.Notes, "\n\n---\n\n")

	// Generate refinement prompt
	prompt := think_deep.RefineDraftPrompt(state.ResearchBrief, state.DraftReport, findings)

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", fmt.Errorf("refine draft LLM call: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from LLM during draft refinement")
	}

	// Track costs
	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	totalCost.Add(cost)

	refinedDraft := resp.Choices[0].Message.Content
	state.UpdateDraft(refinedDraft)

	// Emit draft refined event
	s.emitDraftRefinedEvent(state)

	return fmt.Sprintf("Draft refined with %d research findings incorporated.", len(state.Notes)), nil
}

// hasResearchComplete checks if the research_complete tool was called.
func (s *SupervisorAgent) hasResearchComplete(calls []think_deep.ToolCallParsed) bool {
	for _, call := range calls {
		if call.Tool == "research_complete" {
			return true
		}
	}
	return false
}

// emitIterationEvent emits a diffusion iteration event.
func (s *SupervisorAgent) emitIterationEvent(state *think_deep.SupervisorState, phase string) {
	if s.bus == nil {
		return
	}

	// Estimate draft progress based on notes collected
	progress := float64(len(state.Notes)) / float64(s.maxIterations)
	if progress > 1.0 {
		progress = 1.0
	}

	s.bus.Publish(events.Event{
		Type:      events.EventDiffusionIterationStart,
		Timestamp: time.Now(),
		Data: events.DiffusionIterationData{
			Iteration:     state.Iterations,
			MaxIterations: s.maxIterations,
			NotesCount:    len(state.Notes),
			DraftProgress: progress,
			Phase:         phase,
			Message:       fmt.Sprintf("Diffusion iteration %d: %s", state.Iterations, phase),
		},
	})
}

// emitDelegationEvent emits an event when research is delegated to a sub-researcher.
func (s *SupervisorAgent) emitDelegationEvent(topic string, researcherNum, iteration int) {
	if s.bus == nil {
		return
	}

	s.bus.Publish(events.Event{
		Type:      events.EventResearchDelegated,
		Timestamp: time.Now(),
		Data: events.SubResearcherData{
			Topic:         topic,
			ResearcherNum: researcherNum,
			Iteration:     iteration,
			MaxIterations: s.maxIterations,
			Status:        "delegated",
			SourcesFound:  0,
		},
	})
}

// emitDraftRefinedEvent emits an event when the draft is refined.
func (s *SupervisorAgent) emitDraftRefinedEvent(state *think_deep.SupervisorState) {
	if s.bus == nil {
		return
	}

	progress := float64(state.Iterations) / float64(s.maxIterations)
	if progress > 1.0 {
		progress = 1.0
	}

	s.bus.Publish(events.Event{
		Type:      events.EventDraftRefined,
		Timestamp: time.Now(),
		Data: events.DraftRefinedData{
			Iteration:       state.Iterations,
			SectionsUpdated: len(state.Notes), // Approximate
			NewSources:      len(state.RawNotes),
			Progress:        progress,
		},
	})
}
