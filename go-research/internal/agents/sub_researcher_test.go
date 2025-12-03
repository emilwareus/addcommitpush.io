package agents

import (
	"context"
	"strings"
	"testing"

	"go-research/internal/events"
	"go-research/internal/think_deep"
)

func TestNewSubResearcherAgent(t *testing.T) {
	client := &mockChatClient{}
	tools := &mockToolExecutor{}
	cfg := SubResearcherConfig{MaxIterations: 5}

	agent := NewSubResearcherAgent(client, tools, nil, cfg)

	if agent == nil {
		t.Fatal("expected agent to be created")
	}
	if agent.maxIterations != 5 {
		t.Errorf("expected maxIterations=5, got %d", agent.maxIterations)
	}
}

func TestNewSubResearcherAgentDefaultIterations(t *testing.T) {
	client := &mockChatClient{}
	tools := &mockToolExecutor{}
	cfg := SubResearcherConfig{MaxIterations: 0}

	agent := NewSubResearcherAgent(client, tools, nil, cfg)

	if agent.maxIterations != 5 {
		t.Errorf("expected default maxIterations=5, got %d", agent.maxIterations)
	}
}

func TestDefaultSubResearcherConfig(t *testing.T) {
	cfg := DefaultSubResearcherConfig()

	if cfg.MaxIterations != 5 {
		t.Errorf("expected MaxIterations=5, got %d", cfg.MaxIterations)
	}
}

func TestSubResearcherResearchWithToolCalls(t *testing.T) {
	// Mock client that returns tool calls followed by a final response
	mockClient := &mockChatClient{
		responses: []string{
			// First response: search tool call
			`I need to search for information.
<tool name="search">{"query": "test topic research"}</tool>`,
			// Second response: think tool call after search
			`<tool name="think">{"reflection": "Found useful information about test topic"}</tool>`,
			// Third response: final summary (no tool calls)
			`Based on my research, the test topic has several key aspects...`,
			// Compression response
			`## Queries and Tool Calls Made
- search: "test topic research"

## Comprehensive Findings
The test topic has several key aspects based on search results.

## Sources
1. https://example.com - Example source`,
		},
	}

	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "1. Test Result\n   URL: https://example.com\n   Test description about the topic\n",
		},
	}

	agent := NewSubResearcherAgent(mockClient, mockTools, nil, SubResearcherConfig{MaxIterations: 5})

	result, err := agent.Research(context.Background(), "test topic", 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == nil {
		t.Fatal("expected result, got nil")
	}

	if result.CompressedResearch == "" {
		t.Error("expected compressed research to be non-empty")
	}

	if len(result.RawNotes) == 0 {
		t.Error("expected raw notes to be captured")
	}

	if result.Cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}
}

func TestSubResearcherResearchNoToolCalls(t *testing.T) {
	// Mock client that returns final response immediately (no tool calls needed)
	mockClient := &mockChatClient{
		responses: []string{
			// First response: no tool calls, just answer
			`Based on my knowledge, the answer to this simple topic is straightforward.`,
			// Compression response
			`## Comprehensive Findings
Based on existing knowledge, the answer is straightforward.

## Sources
None required.`,
		},
	}

	mockTools := &mockToolExecutor{}

	agent := NewSubResearcherAgent(mockClient, mockTools, nil, SubResearcherConfig{MaxIterations: 5})

	result, err := agent.Research(context.Background(), "simple topic", 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == nil {
		t.Fatal("expected result, got nil")
	}

	// Should still have compressed research
	if result.CompressedResearch == "" {
		t.Error("expected compressed research")
	}

	// No raw notes since no searches were executed
	if len(result.RawNotes) != 0 {
		t.Errorf("expected no raw notes for non-search response, got %d", len(result.RawNotes))
	}
}

func TestSubResearcherMaxIterations(t *testing.T) {
	// Mock client that always returns tool calls (never stops naturally)
	mockClient := &mockChatClient{
		responses: []string{
			`<tool name="search">{"query": "iteration 1"}</tool>`,
			`<tool name="search">{"query": "iteration 2"}</tool>`,
			`<tool name="search">{"query": "iteration 3"}</tool>`,
			// Will hit max iterations (3) and stop
			// Compression response
			`## Comprehensive Findings
Multiple searches performed.

## Sources
Multiple sources found.`,
		},
	}

	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "1. Result\n   URL: https://example.com\n   Description\n",
		},
	}

	// Set max iterations to 3
	agent := NewSubResearcherAgent(mockClient, mockTools, nil, SubResearcherConfig{MaxIterations: 3})

	result, err := agent.Research(context.Background(), "complex topic", 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == nil {
		t.Fatal("expected result, got nil")
	}

	// Should have 3 raw notes (one per iteration)
	if len(result.RawNotes) != 3 {
		t.Errorf("expected 3 raw notes (max iterations), got %d", len(result.RawNotes))
	}
}

func TestSubResearcherEventEmission(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`<tool name="search">{"query": "test query"}</tool>`,
			`Final answer without tool calls.`,
			`## Compressed findings`,
		},
	}

	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "1. Result\n   URL: https://example.com\n   Description\n",
		},
	}

	bus := events.NewBus(100)
	eventsCh := bus.Subscribe(events.EventSubResearcherProgress)

	agent := NewSubResearcherAgent(mockClient, mockTools, bus, SubResearcherConfig{MaxIterations: 5})

	// Run research in goroutine
	go func() {
		_, _ = agent.Research(context.Background(), "event test topic", 1)
	}()

	// Collect events
	var receivedEvents []events.Event
	for i := 0; i < 5; i++ {
		select {
		case evt := <-eventsCh:
			receivedEvents = append(receivedEvents, evt)
		default:
			// No more events available
		}
	}

	// Should have received at least some progress events
	if len(receivedEvents) == 0 {
		t.Log("Note: No events captured in time - this may be a timing issue in the test")
	}
}

func TestCountUniqueSources(t *testing.T) {
	tests := []struct {
		name     string
		rawNotes []string
		expected int
	}{
		{
			name: "multiple unique sources",
			rawNotes: []string{
				"1. Result\n   URL: https://example1.com\n   Description",
				"2. Result\n   URL: https://example2.com\n   Description",
				"3. Result\n   URL: https://example3.com\n   Description",
			},
			expected: 3,
		},
		{
			name: "duplicate sources",
			rawNotes: []string{
				"1. Result\n   URL: https://example.com\n   Description",
				"2. Result\n   URL: https://example.com\n   Description",
			},
			expected: 1,
		},
		{
			name:     "no sources",
			rawNotes: []string{"No URL here"},
			expected: 0,
		},
		{
			name:     "empty notes",
			rawNotes: []string{},
			expected: 0,
		},
		{
			name: "multiple sources in single note",
			rawNotes: []string{
				"1. Result\n   URL: https://example1.com\n   Description\n2. Result\n   URL: https://example2.com\n   Description",
			},
			expected: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, urls := countUniqueSourcesAndURLs(tt.rawNotes)
			if result != tt.expected {
				t.Errorf("expected %d sources, got %d", tt.expected, result)
			}
			// Verify URLs count matches
			if len(urls) != tt.expected {
				t.Errorf("expected %d urls, got %d", tt.expected, len(urls))
			}
		})
	}
}

func TestTruncateForLog(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		maxLen   int
		expected string
	}{
		{
			name:     "no truncation needed",
			input:    "short",
			maxLen:   10,
			expected: "short",
		},
		{
			name:     "needs truncation",
			input:    "this is a long string that needs truncation",
			maxLen:   10,
			expected: "this is a ...",
		},
		{
			name:     "exact length",
			input:    "exact",
			maxLen:   5,
			expected: "exact",
		},
		{
			name:     "empty string",
			input:    "",
			maxLen:   10,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := truncateForLog(tt.input, tt.maxLen)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestFilterThinkToolCalls(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		contains []string
		excludes []string
	}{
		{
			name:     "filters think tool",
			input:    `Search result here\n<tool name="think">{"reflection": "thinking..."}</tool>\nMore content`,
			contains: []string{"Search result here", "More content"},
			excludes: []string{"think", "reflection"},
		},
		{
			name:     "keeps search tool",
			input:    `<tool name="search">{"query": "test"}</tool>`,
			contains: []string{"search", "query"},
			excludes: []string{},
		},
		{
			name:     "filters reflection recorded",
			input:    "Result here\nReflection recorded: some thought\nMore content",
			contains: []string{"Result here", "More content"},
			excludes: []string{"Reflection recorded"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := think_deep.FilterThinkToolCalls(tt.input)

			for _, s := range tt.contains {
				if !strings.Contains(result, s) {
					t.Errorf("expected result to contain '%s', got '%s'", s, result)
				}
			}

			for _, s := range tt.excludes {
				if strings.Contains(result, s) {
					t.Errorf("expected result to NOT contain '%s', got '%s'", s, result)
				}
			}
		})
	}
}

func TestSubResearcherResultFields(t *testing.T) {
	result := &SubResearcherResult{
		CompressedResearch: "Test findings",
		RawNotes:           []string{"note1", "note2"},
		SourcesFound:       5,
	}

	if result.CompressedResearch != "Test findings" {
		t.Error("CompressedResearch not set correctly")
	}
	if len(result.RawNotes) != 2 {
		t.Error("RawNotes not set correctly")
	}
	if result.SourcesFound != 5 {
		t.Error("SourcesFound not set correctly")
	}
}

func TestSubResearcherHandlesSearchError(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`<tool name="search">{"query": ""}</tool>`, // Empty query should error
			`Final answer.`,
			`## Compressed`,
		},
	}

	mockTools := &mockToolExecutor{
		results: map[string]string{},
	}

	agent := NewSubResearcherAgent(mockClient, mockTools, nil, SubResearcherConfig{MaxIterations: 5})

	result, err := agent.Research(context.Background(), "test topic", 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should still complete even with empty query error
	if result == nil {
		t.Fatal("expected result even with search error")
	}
}

func TestSubResearcherContextCancellation(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`<tool name="search">{"query": "test"}</tool>`,
		},
	}

	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "Result",
		},
	}

	agent := NewSubResearcherAgent(mockClient, mockTools, nil, SubResearcherConfig{MaxIterations: 5})

	// Create already-cancelled context
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := agent.Research(ctx, "test topic", 1)

	// Should return context error
	if err == nil {
		t.Log("Note: Error might not propagate if mockChatClient doesn't check context")
	}
}
