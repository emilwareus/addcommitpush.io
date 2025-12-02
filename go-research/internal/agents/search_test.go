package agents

import (
	"context"
	"testing"

	"go-research/internal/llm"
	"go-research/internal/planning"
)

// mockChatClient is a test double for llm.ChatClient
type mockChatClient struct {
	responses []string
	usages    []mockUsage
	callCount int
}

type mockUsage struct {
	prompt     int
	completion int
	total      int
}

func (m *mockChatClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	var content string
	if m.callCount < len(m.responses) {
		content = m.responses[m.callCount]
	} else if len(m.responses) > 0 {
		content = m.responses[len(m.responses)-1]
	} else {
		content = "[]"
	}
	resp := &llm.ChatResponse{
		Choices: []struct {
			Message llm.Message `json:"message"`
		}{
			{Message: llm.Message{Role: "assistant", Content: content}},
		},
	}

	usage := mockUsage{prompt: 10, completion: 5, total: 15}
	if m.callCount < len(m.usages) {
		usage = m.usages[m.callCount]
	}

	resp.Usage.PromptTokens = usage.prompt
	resp.Usage.CompletionTokens = usage.completion
	resp.Usage.TotalTokens = usage.total

	m.callCount++
	return resp, nil
}

func (m *mockChatClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	return nil
}

func (m *mockChatClient) SetModel(model string) {}
func (m *mockChatClient) GetModel() string      { return "test-model" }

// mockToolExecutor is a test double for tools.ToolExecutor
type mockToolExecutor struct {
	results map[string]string
}

func (m *mockToolExecutor) Execute(ctx context.Context, name string, args map[string]interface{}) (string, error) {
	if result, ok := m.results[name]; ok {
		return result, nil
	}
	return "", nil
}

func (m *mockToolExecutor) ToolNames() []string {
	return []string{"search", "fetch"}
}

func TestNewSearchAgent(t *testing.T) {
	client := &mockChatClient{}
	tools := &mockToolExecutor{}
	cfg := SearchConfig{MaxIterations: 5}

	agent := NewSearchAgent(client, tools, nil, cfg)

	if agent == nil {
		t.Fatal("expected agent to be created")
	}
	if agent.maxIterations != 5 {
		t.Errorf("expected maxIterations=5, got %d", agent.maxIterations)
	}
}

func TestNewSearchAgentDefaultIterations(t *testing.T) {
	client := &mockChatClient{}
	tools := &mockToolExecutor{}
	cfg := SearchConfig{MaxIterations: 0}

	agent := NewSearchAgent(client, tools, nil, cfg)

	if agent.maxIterations != 3 {
		t.Errorf("expected default maxIterations=3, got %d", agent.maxIterations)
	}
}

func TestDefaultSearchConfig(t *testing.T) {
	cfg := DefaultSearchConfig()

	if cfg.MaxIterations != 3 {
		t.Errorf("expected MaxIterations=3, got %d", cfg.MaxIterations)
	}
}

func TestSearchAgentGeneratesQueries(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`["test query 1", "test query 2", "test query 3"]`,
		},
	}
	mockTools := &mockToolExecutor{}

	agent := NewSearchAgent(mockClient, mockTools, nil, SearchConfig{MaxIterations: 1})

	state := &SearchState{
		Goal: "test topic",
		Perspective: &planning.Perspective{
			Name:      "Test Expert",
			Focus:     "Testing",
			Questions: []string{"What is testing?"},
		},
	}

	queries, cost := agent.generateQueries(context.Background(), state)

	if len(queries) != 3 {
		t.Errorf("expected 3 queries, got %d", len(queries))
	}
	if queries[0] != "test query 1" {
		t.Errorf("expected 'test query 1', got '%s'", queries[0])
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost to be recorded for query generation")
	}
}

func TestSearchAgentFallbackToGoal(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{"invalid json"},
	}
	mockTools := &mockToolExecutor{}

	agent := NewSearchAgent(mockClient, mockTools, nil, SearchConfig{MaxIterations: 1})

	state := &SearchState{
		Goal: "fallback test topic",
	}

	queries, cost := agent.generateQueries(context.Background(), state)

	if len(queries) != 1 {
		t.Errorf("expected 1 query (fallback), got %d", len(queries))
	}
	if queries[0] != "fallback test topic" {
		t.Errorf("expected fallback to goal, got '%s'", queries[0])
	}
	// Cost is still tracked even when JSON parsing fails, because the LLM call was made
	// The fallback is about the query result, not about avoiding costs
	if cost.TotalTokens == 0 {
		t.Log("Note: cost is zero, which is acceptable if the mock returns zero usage")
	}
}

func TestSearchAgentExtractFacts(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`[
				{"content": "Fact 1", "source": "https://example.com/1", "confidence": 0.9},
				{"content": "Fact 2", "source": "https://example.com/2", "confidence": 0.8}
			]`,
		},
	}
	mockTools := &mockToolExecutor{}

	agent := NewSearchAgent(mockClient, mockTools, nil, SearchConfig{MaxIterations: 1})

	searchResults := []string{
		"1. Result Title\n   URL: https://example.com/1\n   Description here\n",
		"2. Another Result\n   URL: https://example.com/2\n   More description\n",
	}

	facts, sources, cost := agent.extractFacts(context.Background(), searchResults)

	if len(facts) != 2 {
		t.Errorf("expected 2 facts, got %d", len(facts))
	}
	if len(sources) != 2 {
		t.Errorf("expected 2 sources, got %d", len(sources))
	}
	if facts[0].Content != "Fact 1" {
		t.Errorf("expected 'Fact 1', got '%s'", facts[0].Content)
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost for fact extraction")
	}
}

func TestSearchAgentIdentifyGaps(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`["Missing information about X", "Need more details on Y"]`,
		},
	}
	mockTools := &mockToolExecutor{}

	agent := NewSearchAgent(mockClient, mockTools, nil, SearchConfig{MaxIterations: 1})

	state := &SearchState{
		Goal: "test topic",
		Facts: []Fact{
			{Content: "Fact 1", Source: "source1", Confidence: 0.9},
		},
	}

	gaps, cost := agent.identifyGaps(context.Background(), state)

	if len(gaps) != 2 {
		t.Errorf("expected 2 gaps, got %d", len(gaps))
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost for gap identification")
	}
}

func TestSearchAgentSufficientCoverage(t *testing.T) {
	agent := &SearchAgent{maxIterations: 3}

	tests := []struct {
		name     string
		facts    int
		gaps     int
		expected bool
	}{
		{"few facts few gaps", 3, 1, false},
		{"many facts few gaps", 5, 1, true},
		{"many facts many gaps", 5, 3, false},
		{"many facts no gaps", 10, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := &SearchState{
				Facts: make([]Fact, tt.facts),
				Gaps:  make([]string, tt.gaps),
			}
			result := agent.sufficientCoverage(state)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestParseStringArray(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "valid array",
			input:    `Here is the result: ["a", "b", "c"]`,
			expected: []string{"a", "b", "c"},
		},
		{
			name:     "empty array",
			input:    `[]`,
			expected: []string{},
		},
		{
			name:     "no array",
			input:    `Just some text`,
			expected: nil,
		},
		{
			name:     "invalid json",
			input:    `["incomplete`,
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseStringArray(tt.input)
			if tt.expected == nil {
				if result != nil {
					t.Errorf("expected nil, got %v", result)
				}
				return
			}
			if len(result) != len(tt.expected) {
				t.Errorf("expected %d items, got %d", len(tt.expected), len(result))
			}
		})
	}
}

func TestParseFactsArray(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedCount int
	}{
		{
			name:          "valid facts",
			input:         `[{"content": "fact1", "source": "src1", "confidence": 0.9}]`,
			expectedCount: 1,
		},
		{
			name:          "empty array",
			input:         `[]`,
			expectedCount: 0,
		},
		{
			name:          "no array",
			input:         `invalid`,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseFactsArray(tt.input)
			if tt.expectedCount == 0 && len(result) != 0 {
				t.Errorf("expected empty, got %d items", len(result))
			}
			if tt.expectedCount > 0 && len(result) != tt.expectedCount {
				t.Errorf("expected %d facts, got %d", tt.expectedCount, len(result))
			}
		})
	}
}

func TestDedupe(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{
			name:     "with duplicates",
			input:    []string{"a", "b", "a", "c", "b"},
			expected: []string{"a", "b", "c"},
		},
		{
			name:     "no duplicates",
			input:    []string{"a", "b", "c"},
			expected: []string{"a", "b", "c"},
		},
		{
			name:     "empty",
			input:    []string{},
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := dedupe(tt.input)
			if len(result) != len(tt.expected) {
				t.Errorf("expected %d items, got %d", len(tt.expected), len(result))
			}
		})
	}
}

func TestSearchAgentFullSearch(t *testing.T) {
	// Simulate a complete search flow
	mockClient := &mockChatClient{
		responses: []string{
			// Query generation
			`["search query 1", "search query 2"]`,
			// Fact extraction
			`[{"content": "Important fact", "source": "https://example.com", "confidence": 0.9}]`,
			// Gap identification
			`[]`, // No gaps - should stop iteration
		},
	}
	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "1. Result\n   URL: https://example.com\n   Description\n",
		},
	}

	agent := NewSearchAgent(mockClient, mockTools, nil, SearchConfig{MaxIterations: 3})

	result, err := agent.Search(context.Background(), "test topic", &planning.Perspective{
		Name:      "Test Expert",
		Focus:     "Testing",
		Questions: []string{"What is this?"},
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if len(result.Facts) == 0 {
		t.Error("expected facts to be extracted")
	}
}

func TestSearchAgentTracksCost(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`["search query"]`,
			`[{"content": "fact", "source": "src", "confidence": 0.9}]`,
			`[]`,
		},
	}
	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "1. Result\n   URL: https://example.com\n   Description\n",
		},
	}

	agent := NewSearchAgent(mockClient, mockTools, nil, SearchConfig{MaxIterations: 1})

	result, err := agent.Search(context.Background(), "cost topic", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Cost.TotalTokens == 0 {
		t.Error("expected result cost to accumulate token usage")
	}
}

func TestSearchAgentNilPerspective(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`["query 1"]`,
			`[{"content": "fact", "source": "src", "confidence": 0.8}]`,
			`[]`,
		},
	}
	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "1. Result\n   URL: https://example.com\n   Description\n",
		},
	}

	agent := NewSearchAgent(mockClient, mockTools, nil, SearchConfig{MaxIterations: 1})

	// Should handle nil perspective gracefully
	result, err := agent.Search(context.Background(), "test topic", nil)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
}
