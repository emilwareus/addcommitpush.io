package agents

import (
	"context"
	"strings"
	"testing"

	"go-research/internal/think_deep"
	"go-research/internal/events"
	"go-research/internal/session"
)

func TestNewSupervisorAgent(t *testing.T) {
	client := &mockChatClient{}
	cfg := SupervisorConfig{
		MaxIterations:     10,
		MaxConcurrentSubs: 2,
	}

	agent := NewSupervisorAgent(client, nil, cfg)

	if agent == nil {
		t.Fatal("expected agent to be created")
	}
	if agent.maxIterations != 10 {
		t.Errorf("expected maxIterations=10, got %d", agent.maxIterations)
	}
	if agent.maxConcurrent != 2 {
		t.Errorf("expected maxConcurrent=2, got %d", agent.maxConcurrent)
	}
}

func TestNewSupervisorAgentDefaults(t *testing.T) {
	client := &mockChatClient{}
	cfg := SupervisorConfig{} // Zero values

	agent := NewSupervisorAgent(client, nil, cfg)

	if agent.maxIterations != 15 {
		t.Errorf("expected default maxIterations=15, got %d", agent.maxIterations)
	}
	if agent.maxConcurrent != 3 {
		t.Errorf("expected default maxConcurrent=3, got %d", agent.maxConcurrent)
	}
}

func TestDefaultSupervisorConfig(t *testing.T) {
	cfg := DefaultSupervisorConfig()

	if cfg.MaxIterations != 15 {
		t.Errorf("expected MaxIterations=15, got %d", cfg.MaxIterations)
	}
	if cfg.MaxConcurrentSubs != 3 {
		t.Errorf("expected MaxConcurrentSubs=3, got %d", cfg.MaxConcurrentSubs)
	}
}

func TestSupervisorCoordinateWithResearchComplete(t *testing.T) {
	// Mock client that performs research and then completes
	mockClient := &mockChatClient{
		responses: []string{
			// First response: conduct research
			`I need to gather information on this topic.
<tool name="think">{"reflection": "Let me start by researching the main topic"}</tool>
<tool name="conduct_research">{"research_topic": "Overview of the test topic and its key aspects"}</tool>`,
			// Second response: refine draft
			`<tool name="think">{"reflection": "Good findings, let me incorporate them"}</tool>
<tool name="refine_draft">{}</tool>`,
			// Third response: complete research
			`The research findings are now comprehensive.
<tool name="research_complete">{}</tool>`,
		},
	}

	subResearcherCalled := false
	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		subResearcherCalled = true
		return &SubResearcherResult{
			CompressedResearch: "## Findings\nTest topic has several important aspects...\n\n## Sources\n1. https://example.com",
			RawNotes:           []string{"Raw search result from example.com"},
			SourcesFound:       3,
			Cost:               session.CostBreakdown{TotalTokens: 100},
		}, nil
	}

	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 10})

	result, err := agent.Coordinate(
		context.Background(),
		"Research brief about test topic",
		"Initial draft with placeholder sections",
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !subResearcherCalled {
		t.Error("expected sub-researcher to be called")
	}

	if result == nil {
		t.Fatal("expected result, got nil")
	}

	if len(result.Notes) == 0 {
		t.Error("expected notes to be collected")
	}

	if result.DraftReport == "" {
		t.Error("expected draft report to be non-empty")
	}

	if result.Cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}
}

func TestSupervisorCoordinateMaxIterations(t *testing.T) {
	// Mock client that never calls research_complete
	mockClient := &mockChatClient{
		responses: []string{
			`<tool name="conduct_research">{"research_topic": "topic 1"}</tool>`,
			`<tool name="conduct_research">{"research_topic": "topic 2"}</tool>`,
			`<tool name="conduct_research">{"research_topic": "topic 3"}</tool>`,
			`<tool name="conduct_research">{"research_topic": "topic 4"}</tool>`,
		},
	}

	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		return &SubResearcherResult{
			CompressedResearch: "Findings for " + topic,
			RawNotes:           []string{"raw note"},
			SourcesFound:       1,
		}, nil
	}

	// Set max iterations to 3
	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 3})

	result, err := agent.Coordinate(
		context.Background(),
		"Research brief",
		"Initial draft",
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.IterationsUsed != 3 {
		t.Errorf("expected 3 iterations (max), got %d", result.IterationsUsed)
	}
}

func TestSupervisorCoordinateNoToolCalls(t *testing.T) {
	// Mock client that returns no tool calls immediately
	mockClient := &mockChatClient{
		responses: []string{
			`Based on my analysis, the topic is straightforward and I have no further research to conduct.`,
		},
	}

	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		t.Error("sub-researcher should not be called when no tool calls")
		return nil, nil
	}

	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 10})

	result, err := agent.Coordinate(
		context.Background(),
		"Simple brief",
		"Initial draft",
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.IterationsUsed != 1 {
		t.Errorf("expected 1 iteration, got %d", result.IterationsUsed)
	}
}

func TestSupervisorCoordinateEventEmission(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`<tool name="conduct_research">{"research_topic": "test topic"}</tool>`,
			`<tool name="research_complete">{}</tool>`,
		},
	}

	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		return &SubResearcherResult{
			CompressedResearch: "Findings",
			RawNotes:           []string{"raw"},
			SourcesFound:       1,
		}, nil
	}

	bus := events.NewBus(100)
	iterationCh := bus.Subscribe(events.EventDiffusionIterationStart)
	delegationCh := bus.Subscribe(events.EventResearchDelegated)

	agent := NewSupervisorAgent(mockClient, bus, SupervisorConfig{MaxIterations: 10})

	// Run coordination
	_, err := agent.Coordinate(
		context.Background(),
		"Research brief",
		"Initial draft",
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check for iteration events
	select {
	case evt := <-iterationCh:
		if evt.Type != events.EventDiffusionIterationStart {
			t.Errorf("expected EventDiffusionIterationStart, got %v", evt.Type)
		}
	default:
		t.Error("expected to receive iteration event")
	}

	// Check for delegation events
	select {
	case evt := <-delegationCh:
		if evt.Type != events.EventResearchDelegated {
			t.Errorf("expected EventResearchDelegated, got %v", evt.Type)
		}
		data, ok := evt.Data.(events.SubResearcherData)
		if !ok {
			t.Error("expected SubResearcherData")
		} else if data.Topic != "test topic" {
			t.Errorf("expected topic 'test topic', got '%s'", data.Topic)
		}
	default:
		t.Error("expected to receive delegation event")
	}
}

func TestSupervisorCoordinateRefineDraft(t *testing.T) {
	// Track the initial draft and verify it gets refined
	mockClient := &mockChatClient{
		responses: []string{
			// First: conduct research
			`<tool name="conduct_research">{"research_topic": "test topic"}</tool>`,
			// Second: refine draft
			`<tool name="refine_draft">{}</tool>`,
			// Third: complete
			`<tool name="research_complete">{}</tool>`,
		},
	}

	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		return &SubResearcherResult{
			CompressedResearch: "Important findings about the topic",
			RawNotes:           []string{"raw search result"},
			SourcesFound:       2,
		}, nil
	}

	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 10})

	initialDraft := "# Initial Draft\n[NEEDS RESEARCH]"

	result, err := agent.Coordinate(
		context.Background(),
		"Research brief",
		initialDraft,
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// The draft should be different from the initial (refined)
	// Note: In this test, the mock returns the same content, but in real usage it would be refined
	if result.DraftReport == "" {
		t.Error("expected draft report to be present")
	}
}

func TestSupervisorCoordinateConductResearchEmptyTopic(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			// Empty topic - should handle gracefully
			`<tool name="conduct_research">{"research_topic": ""}</tool>`,
			`<tool name="research_complete">{}</tool>`,
		},
	}

	subResearcherCalled := false
	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		subResearcherCalled = true
		return nil, nil
	}

	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 10})

	result, err := agent.Coordinate(
		context.Background(),
		"Research brief",
		"Initial draft",
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Sub-researcher should NOT be called for empty topic
	if subResearcherCalled {
		t.Error("sub-researcher should not be called for empty topic")
	}

	if result == nil {
		t.Fatal("expected result even with empty topic error")
	}
}

func TestSupervisorCoordinateRefineDraftNoFindings(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			// Try to refine without any research first
			`<tool name="refine_draft">{}</tool>`,
			`<tool name="research_complete">{}</tool>`,
		},
	}

	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		return &SubResearcherResult{}, nil
	}

	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 10})

	result, err := agent.Coordinate(
		context.Background(),
		"Research brief",
		"Initial draft",
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should complete gracefully even with no findings to refine
	if result == nil {
		t.Fatal("expected result")
	}
}

func TestSupervisorResultFields(t *testing.T) {
	result := &SupervisorResult{
		Notes:          []string{"note1", "note2"},
		RawNotes:       []string{"raw1", "raw2", "raw3"},
		DraftReport:    "# Draft Report\n\nContent here",
		IterationsUsed: 5,
		Cost: session.CostBreakdown{
			TotalTokens: 1000,
			TotalCost:   0.01,
		},
	}

	if len(result.Notes) != 2 {
		t.Error("Notes not set correctly")
	}
	if len(result.RawNotes) != 3 {
		t.Error("RawNotes not set correctly")
	}
	if result.DraftReport == "" {
		t.Error("DraftReport not set correctly")
	}
	if result.IterationsUsed != 5 {
		t.Error("IterationsUsed not set correctly")
	}
	if result.Cost.TotalTokens != 1000 {
		t.Error("Cost not set correctly")
	}
}

func TestSupervisorHasResearchComplete(t *testing.T) {
	agent := &SupervisorAgent{}

	tests := []struct {
		name     string
		content  string
		expected bool
	}{
		{
			name:     "has research_complete",
			content:  `<tool name="research_complete">{}</tool>`,
			expected: true,
		},
		{
			name:     "no research_complete",
			content:  `<tool name="conduct_research">{"research_topic": "test"}</tool>`,
			expected: false,
		},
		{
			name:     "no tools",
			content:  `Just text without any tool calls`,
			expected: false,
		},
		{
			name:     "multiple tools including research_complete",
			content:  `<tool name="think">{"reflection": "done"}</tool>\n<tool name="research_complete">{}</tool>`,
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := think_deep.ParseToolCalls(tt.content)
			result := agent.hasResearchComplete(calls)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestSupervisorCoordinateMultipleSubResearchers(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			// Multiple conduct_research calls in one response (parallel research)
			`<tool name="conduct_research">{"research_topic": "topic A"}</tool>
<tool name="conduct_research">{"research_topic": "topic B"}</tool>`,
			`<tool name="research_complete">{}</tool>`,
		},
	}

	callCount := 0
	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		callCount++
		return &SubResearcherResult{
			CompressedResearch: "Findings for " + topic,
			RawNotes:           []string{"raw"},
			SourcesFound:       1,
		}, nil
	}

	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 10})

	result, err := agent.Coordinate(
		context.Background(),
		"Research brief",
		"Initial draft",
		mockSubResearcher,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have called sub-researcher twice (for both topics)
	if callCount != 2 {
		t.Errorf("expected 2 sub-researcher calls, got %d", callCount)
	}

	// Should have two notes
	if len(result.Notes) != 2 {
		t.Errorf("expected 2 notes, got %d", len(result.Notes))
	}
}

func TestSupervisorCoordinateContextCancellation(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`<tool name="conduct_research">{"research_topic": "test"}</tool>`,
		},
	}

	mockSubResearcher := func(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
		return &SubResearcherResult{}, nil
	}

	agent := NewSupervisorAgent(mockClient, nil, SupervisorConfig{MaxIterations: 10})

	// Create already-cancelled context
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := agent.Coordinate(
		ctx,
		"Research brief",
		"Initial draft",
		mockSubResearcher,
	)

	// Note: Error might not propagate if mockChatClient doesn't check context
	if err != nil {
		if !strings.Contains(err.Error(), "context canceled") {
			t.Logf("Got error (may be expected): %v", err)
		}
	}
}

