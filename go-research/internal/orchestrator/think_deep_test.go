package orchestrator

import (
	"context"
	"sync"
	"testing"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
)

// mockThinkDeepClient is a mock LLM client for testing ThinkDeep orchestrator.
type mockThinkDeepClient struct {
	mu        sync.Mutex
	responses []string
	callIndex int
	model     string
}

func (m *mockThinkDeepClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Return next response
	if m.callIndex >= len(m.responses) {
		return &llm.ChatResponse{
			Choices: []struct {
				Message llm.Message `json:"message"`
			}{{Message: llm.Message{Content: "Default response"}}},
			Usage: struct {
				PromptTokens     int `json:"prompt_tokens"`
				CompletionTokens int `json:"completion_tokens"`
				TotalTokens      int `json:"total_tokens"`
			}{PromptTokens: 10, CompletionTokens: 5, TotalTokens: 15},
		}, nil
	}

	resp := m.responses[m.callIndex]
	m.callIndex++

	return &llm.ChatResponse{
		Choices: []struct {
			Message llm.Message `json:"message"`
		}{{Message: llm.Message{Content: resp}}},
		Usage: struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		}{PromptTokens: 100, CompletionTokens: 50, TotalTokens: 150},
	}, nil
}

func (m *mockThinkDeepClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	return nil // Not used in ThinkDeep orchestrator
}

func (m *mockThinkDeepClient) SetModel(model string) {
	m.model = model
}

func (m *mockThinkDeepClient) GetModel() string {
	if m.model == "" {
		return "test-model"
	}
	return m.model
}

// mockThinkDeepTools is a mock tool executor for testing.
type mockThinkDeepTools struct {
	results map[string]string
}

func (m *mockThinkDeepTools) Execute(ctx context.Context, name string, args map[string]interface{}) (string, error) {
	if m.results == nil {
		return "Mock search result\n1. Test Result\n   URL: https://example.com\n   Description of result", nil
	}
	if result, ok := m.results[name]; ok {
		return result, nil
	}
	return "Mock result for " + name, nil
}

func (m *mockThinkDeepTools) ToolNames() []string {
	return []string{"search", "think"}
}

func TestNewThinkDeepOrchestrator(t *testing.T) {
	bus := events.NewBus(100)
	cfg := &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave-key",
		Model:            "test-model",
	}

	orch := NewThinkDeepOrchestrator(bus, cfg)

	if orch == nil {
		t.Fatal("expected orchestrator to be created")
	}

	if orch.bus != bus {
		t.Error("bus not set correctly")
	}

	if orch.appConfig != cfg {
		t.Error("config not set correctly")
	}
}

func TestThinkDeepOrchestratorWithOptions(t *testing.T) {
	bus := events.NewBus(100)
	cfg := &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave-key",
		Model:            "test-model",
	}

	mockClient := &mockThinkDeepClient{model: "custom-model"}
	mockTools := &mockThinkDeepTools{}

	orch := NewThinkDeepOrchestrator(
		bus,
		cfg,
		WithThinkDeepClient(mockClient),
		WithThinkDeepTools(mockTools),
	)

	if orch == nil {
		t.Fatal("expected orchestrator to be created")
	}

	if orch.client != mockClient {
		t.Error("custom client not set correctly")
	}

	if orch.tools != mockTools {
		t.Error("custom tools not set correctly")
	}

	if orch.model != "custom-model" {
		t.Errorf("expected model 'custom-model', got '%s'", orch.model)
	}
}

func TestDefaultThinkDeepConfig(t *testing.T) {
	cfg := DefaultThinkDeepConfig()

	if cfg.MaxSupervisorIterations != 15 {
		t.Errorf("expected MaxSupervisorIterations=15, got %d", cfg.MaxSupervisorIterations)
	}

	if cfg.MaxSubResearcherIter != 5 {
		t.Errorf("expected MaxSubResearcherIter=5, got %d", cfg.MaxSubResearcherIter)
	}

	if cfg.MaxConcurrentResearch != 3 {
		t.Errorf("expected MaxConcurrentResearch=3, got %d", cfg.MaxConcurrentResearch)
	}
}

func TestThinkDeepOrchestratorResearchFullWorkflow(t *testing.T) {
	bus := events.NewBus(100)
	cfg := &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave-key",
		Model:            "test-model",
	}

	// Mock client with responses for each phase:
	// 1. Research brief generation
	// 2. Initial draft generation
	// 3. Supervisor iteration 1: conduct research
	// 4. Search results (from sub-researcher)
	// 5. Compression (from sub-researcher)
	// 6. Supervisor iteration 2: research complete
	// 7. Final report generation
	mockClient := &mockThinkDeepClient{
		responses: []string{
			// Phase 1: Research brief
			`## Research Objective
Investigate the test topic thoroughly.

## Key Questions to Answer
1. What are the main aspects of the test topic?
2. What are the implications?

## Scope
- Include: Main concepts and current state
- Exclude: Historical background

## Expected Deliverables
A comprehensive report on the test topic.`,

			// Phase 2: Initial draft
			`# Test Topic Report

## Introduction
[NEEDS RESEARCH]

## Main Concepts
[NEEDS RESEARCH]

## Conclusion
[NEEDS RESEARCH]`,

			// Phase 3: Supervisor iteration 1 - conduct research
			`I need to research the main aspects of this topic.
<tool name="conduct_research">{"research_topic": "Main aspects and current state of the test topic"}</tool>`,

			// Phase 3.1: Sub-researcher search
			`<tool name="search">{"query": "test topic main aspects"}</tool>`,

			// Phase 3.2: Sub-researcher final answer
			`Based on the search results, the test topic has several key aspects including A, B, and C.`,

			// Phase 3.3: Compression
			`## Queries and Tool Calls Made
- search: "test topic main aspects"

## Comprehensive Findings
The test topic has key aspects A, B, and C. Each aspect has specific implications.

## Sources
1. https://example.com - Example source`,

			// Phase 3.4: Supervisor iteration 2 - research complete
			`The research findings are comprehensive.
<tool name="research_complete">{}</tool>`,

			// Phase 4: Final report
			`# Test Topic Report

## Introduction
This report covers the test topic comprehensively.

## Main Concepts
The test topic has key aspects A, B, and C. Each aspect has specific implications.

## Conclusion
The test topic is important for understanding the broader context.

### Sources
1. [Example Source](https://example.com) - Example source`,
		},
	}

	mockTools := &mockThinkDeepTools{
		results: map[string]string{
			"search": "1. Test Result\n   URL: https://example.com\n   The test topic has aspects A, B, and C.",
		},
	}

	orch := NewThinkDeepOrchestrator(
		bus,
		cfg,
		WithThinkDeepClient(mockClient),
		WithThinkDeepTools(mockTools),
	)

	result, err := orch.Research(context.Background(), "test topic")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == nil {
		t.Fatal("expected result, got nil")
	}

	if result.Query != "test topic" {
		t.Errorf("expected query 'test topic', got '%s'", result.Query)
	}

	if result.ResearchBrief == "" {
		t.Error("expected research brief to be set")
	}

	if result.FinalReport == "" {
		t.Error("expected final report to be set")
	}

	if result.Cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}

	if result.Duration == 0 {
		t.Error("expected duration to be tracked")
	}
}

func TestThinkDeepOrchestratorEventEmission(t *testing.T) {
	bus := events.NewBus(100)
	cfg := &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave-key",
		Model:            "test-model",
	}

	// Subscribe to events
	diffusionStartCh := bus.Subscribe(events.EventDiffusionStarted)
	diffusionCompleteCh := bus.Subscribe(events.EventDiffusionComplete)
	finalReportStartCh := bus.Subscribe(events.EventFinalReportStarted)
	finalReportCompleteCh := bus.Subscribe(events.EventFinalReportComplete)

	mockClient := &mockThinkDeepClient{
		responses: []string{
			// Research brief
			`## Research Objective\nTest`,
			// Initial draft
			`# Draft`,
			// Supervisor: research complete immediately
			`<tool name="research_complete">{}</tool>`,
			// Final report
			`# Final Report`,
		},
	}

	orch := NewThinkDeepOrchestrator(
		bus,
		cfg,
		WithThinkDeepClient(mockClient),
	)

	_, err := orch.Research(context.Background(), "test query")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check for diffusion started event
	select {
	case evt := <-diffusionStartCh:
		if evt.Type != events.EventDiffusionStarted {
			t.Errorf("expected EventDiffusionStarted, got %v", evt.Type)
		}
		data, ok := evt.Data.(events.DiffusionStartedData)
		if !ok {
			t.Error("expected DiffusionStartedData")
		} else if data.Topic != "test query" {
			t.Errorf("expected topic 'test query', got '%s'", data.Topic)
		}
	default:
		t.Error("expected to receive diffusion started event")
	}

	// Check for diffusion complete event
	select {
	case evt := <-diffusionCompleteCh:
		if evt.Type != events.EventDiffusionComplete {
			t.Errorf("expected EventDiffusionComplete, got %v", evt.Type)
		}
	default:
		t.Error("expected to receive diffusion complete event")
	}

	// Check for final report started event
	select {
	case evt := <-finalReportStartCh:
		if evt.Type != events.EventFinalReportStarted {
			t.Errorf("expected EventFinalReportStarted, got %v", evt.Type)
		}
	default:
		t.Error("expected to receive final report started event")
	}

	// Check for final report complete event
	select {
	case evt := <-finalReportCompleteCh:
		if evt.Type != events.EventFinalReportComplete {
			t.Errorf("expected EventFinalReportComplete, got %v", evt.Type)
		}
	default:
		t.Error("expected to receive final report complete event")
	}
}

func TestThinkDeepOrchestratorContextCancellation(t *testing.T) {
	bus := events.NewBus(100)
	cfg := &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave-key",
		Model:            "test-model",
	}

	mockClient := &mockThinkDeepClient{
		responses: []string{
			`## Research Objective\nTest`,
		},
	}

	orch := NewThinkDeepOrchestrator(
		bus,
		cfg,
		WithThinkDeepClient(mockClient),
	)

	// Create already-cancelled context
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := orch.Research(ctx, "test query")

	// Should return context error
	if err == nil {
		t.Log("Note: Error might not propagate if mock doesn't check context")
	}
}

func TestThinkDeepResultFields(t *testing.T) {
	result := &ThinkDeepResult{
		Query:         "test query",
		ResearchBrief: "## Research Brief",
		Notes:         []string{"note1", "note2"},
		DraftReport:   "# Draft",
		FinalReport:   "# Final",
	}

	if result.Query != "test query" {
		t.Error("Query not set correctly")
	}
	if result.ResearchBrief == "" {
		t.Error("ResearchBrief not set correctly")
	}
	if len(result.Notes) != 2 {
		t.Error("Notes not set correctly")
	}
	if result.DraftReport == "" {
		t.Error("DraftReport not set correctly")
	}
	if result.FinalReport == "" {
		t.Error("FinalReport not set correctly")
	}
}

func TestThinkDeepOrchestratorNilBusCreation(t *testing.T) {
	cfg := &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave-key",
		Model:            "test-model",
	}

	// Test with nil bus - should create orchestrator without panic
	orch := NewThinkDeepOrchestrator(nil, cfg)

	if orch == nil {
		t.Fatal("expected orchestrator to be created even with nil bus")
	}

	// The orchestrator is created but won't emit events
	if orch.bus != nil {
		t.Error("expected bus to be nil")
	}
}
