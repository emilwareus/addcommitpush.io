package agents

import (
	"context"
	"strings"
	"testing"

	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/planning"
)

func TestNewConversationSimulator(t *testing.T) {
	client := &mockChatClient{}
	tools := &mockToolExecutor{}
	cfg := DefaultConversationConfig()

	sim := NewConversationSimulator(client, tools, cfg)

	if sim == nil {
		t.Fatal("expected simulator to be created")
	}
	if sim.maxTurns != 4 {
		t.Errorf("expected maxTurns=4, got %d", sim.maxTurns)
	}
}

func TestDefaultConversationConfig(t *testing.T) {
	cfg := DefaultConversationConfig()

	if cfg.MaxTurns != 4 {
		t.Errorf("expected MaxTurns=4, got %d", cfg.MaxTurns)
	}
}

func TestNewConversationSimulatorZeroMaxTurns(t *testing.T) {
	client := &mockChatClient{}
	tools := &mockToolExecutor{}
	cfg := ConversationConfig{MaxTurns: 0}

	sim := NewConversationSimulator(client, tools, cfg)

	if sim.maxTurns != 4 {
		t.Errorf("expected default maxTurns=4 when 0 provided, got %d", sim.maxTurns)
	}
}

func TestNewConversationSimulatorWithBus(t *testing.T) {
	client := &mockChatClient{}
	tools := &mockToolExecutor{}
	bus := events.NewBus(10)
	defer bus.Close()
	cfg := DefaultConversationConfig()

	sim := NewConversationSimulatorWithBus(client, tools, bus, cfg)

	if sim == nil {
		t.Fatal("expected simulator to be created")
	}
	if sim.bus != bus {
		t.Error("expected bus to be set")
	}
}

func TestConversationSimulatorWikiWriterAskFirstQuestion(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`What are the key technical components of AI agents?`,
		},
	}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	perspective := planning.Perspective{
		Name:      "Technical Expert",
		Focus:     "Implementation details and architecture",
		Questions: []string{"How does it work?", "What are the components?"},
	}

	question, cost, err := sim.wikiWriterAsk(context.Background(), "AI Agents", perspective, nil)
	if err != nil {
		t.Fatalf("wikiWriterAsk returned error: %v", err)
	}

	if question == "" {
		t.Error("expected question to be generated")
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}
}

func TestConversationSimulatorWikiWriterAskFollowUp(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`Can you elaborate on the neural network architecture?`,
		},
	}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	perspective := planning.Perspective{
		Name:  "Technical Expert",
		Focus: "Implementation details",
	}

	history := []DialogueTurn{
		{
			Question: "What are the main components?",
			Answer:   "The system uses neural networks and transformers.",
		},
	}

	question, cost, err := sim.wikiWriterAsk(context.Background(), "AI Agents", perspective, history)
	if err != nil {
		t.Fatalf("wikiWriterAsk returned error: %v", err)
	}

	if question == "" {
		t.Error("expected follow-up question to be generated")
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}
}

func TestConversationSimulatorWikiWriterExitConditions(t *testing.T) {
	tests := []struct {
		name     string
		response string
		shouldExit bool
	}{
		{
			name:       "thank you so much",
			response:   "Thank you so much for your help!",
			shouldExit: true,
		},
		{
			name:       "thank you for your help",
			response:   "Thank you for your help with this research.",
			shouldExit: true,
		},
		{
			name:       "that covers everything",
			response:   "I think that covers everything I needed to know.",
			shouldExit: true,
		},
		{
			name:       "regular question",
			response:   "What about the performance characteristics?",
			shouldExit: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isExit := strings.Contains(tt.response, "Thank you so much for your help!") ||
				strings.Contains(tt.response, "Thank you for your help") ||
				strings.Contains(strings.ToLower(tt.response), "that covers everything")

			if isExit != tt.shouldExit {
				t.Errorf("expected shouldExit=%v for response '%s', got %v", tt.shouldExit, tt.response, isExit)
			}
		})
	}
}

func TestConversationSimulatorExpertGenerateQueries(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`["AI agent architecture", "neural network components", "transformer models"]`,
		},
	}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	queries, cost, err := sim.expertGenerateQueries(context.Background(), "AI Agents", "What are the main components?")
	if err != nil {
		t.Fatalf("expertGenerateQueries returned error: %v", err)
	}

	if len(queries) != 3 {
		t.Errorf("expected 3 queries, got %d", len(queries))
	}
	if queries[0] != "AI agent architecture" {
		t.Errorf("expected first query 'AI agent architecture', got '%s'", queries[0])
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}
}

func TestConversationSimulatorExpertGenerateQueriesFallback(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`invalid json response`,
		},
	}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	question := "What are the key components?"
	queries, _, err := sim.expertGenerateQueries(context.Background(), "AI Agents", question)
	if err != nil {
		t.Fatalf("expertGenerateQueries returned error: %v", err)
	}

	// Should fall back to using the question as query
	if len(queries) != 1 {
		t.Errorf("expected 1 fallback query, got %d", len(queries))
	}
	if queries[0] != question {
		t.Errorf("expected fallback to question, got '%s'", queries[0])
	}
}

func TestConversationSimulatorExpertAnswer(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`AI agents typically consist of three main components: a perception module that processes inputs, a reasoning engine that makes decisions, and an action module that executes tasks. [Source: https://example.com/ai-agents]`,
		},
	}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	searchResults := []string{
		"1. AI Agent Architecture\n   URL: https://example.com/ai-agents\n   Detailed explanation of AI agent components.",
	}

	answer, cost, err := sim.expertAnswer(context.Background(), "AI Agents", "What are the components?", searchResults)
	if err != nil {
		t.Fatalf("expertAnswer returned error: %v", err)
	}

	if answer == "" {
		t.Error("expected answer to be generated")
	}
	if !strings.Contains(answer, "components") {
		t.Error("expected answer to be relevant to the question")
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}
}

func TestConversationSimulatorExpertAnswerNoResults(t *testing.T) {
	mockClient := &mockChatClient{}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	answer, cost, err := sim.expertAnswer(context.Background(), "AI Agents", "What are the components?", nil)
	if err != nil {
		t.Fatalf("expertAnswer returned error: %v", err)
	}

	if !strings.Contains(answer, "couldn't find") {
		t.Errorf("expected 'couldn't find' message for empty results, got '%s'", answer)
	}
	if cost.TotalTokens != 0 {
		t.Error("expected no cost when no search results")
	}
}

func TestConversationSimulatorExtractFactsFromConversation(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`[
				{"content": "AI agents use neural networks for decision making", "source": "https://example.com", "confidence": 0.9},
				{"content": "Transformers are the dominant architecture", "source": "https://arxiv.org", "confidence": 0.85}
			]`,
		},
	}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	history := []DialogueTurn{
		{
			Question: "What technologies are used?",
			Answer:   "AI agents use neural networks for decision making. Transformers are the dominant architecture.",
		},
	}

	facts, cost, err := sim.extractFactsFromConversation(context.Background(), "AI Agents", history)
	if err != nil {
		t.Fatalf("extractFactsFromConversation returned error: %v", err)
	}

	if len(facts) != 2 {
		t.Errorf("expected 2 facts, got %d", len(facts))
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}
}

func TestConversationSimulatorExtractFactsEmptyHistory(t *testing.T) {
	mockClient := &mockChatClient{}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	facts, cost, err := sim.extractFactsFromConversation(context.Background(), "AI Agents", nil)
	if err != nil {
		t.Fatalf("extractFactsFromConversation returned error: %v", err)
	}

	if len(facts) != 0 {
		t.Errorf("expected 0 facts for empty history, got %d", len(facts))
	}
	if cost.TotalTokens != 0 {
		t.Error("expected no cost for empty history")
	}
}

func TestConversationSimulatorSimulateConversation(t *testing.T) {
	// Mock responses in the correct order for the conversation flow:
	// Turn 0: wikiWriterAsk -> expertGenerateQueries -> expertAnswer
	// Turn 1: wikiWriterAsk (thank you - exits) -> extractFactsFromConversation
	mockClient := &mockChatClient{
		responses: []string{
			// Turn 0: WikiWriter asks
			`What are the fundamental principles behind AI agent architectures?`,
			// Turn 0: Expert generates queries
			`["AI agent architecture principles", "agent design patterns"]`,
			// Turn 0: Expert answers
			`AI agents are built on principles of perception, reasoning, and action. They use neural networks to process information. [Source: https://example.com]`,
			// Turn 1: WikiWriter says thank you (exits loop)
			`Thank you so much for your help!`,
			// After loop: Fact extraction
			`[{"content": "AI agents use perception, reasoning, and action", "source": "https://example.com", "confidence": 0.9}]`,
		},
	}
	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "1. AI Architecture\n   URL: https://example.com\n   Description of AI agents.",
		},
	}

	sim := NewConversationSimulator(mockClient, mockTools, ConversationConfig{MaxTurns: 5})

	perspective := planning.Perspective{
		Name:      "Technical Expert",
		Focus:     "Implementation details",
		Questions: []string{"How does it work?"},
	}

	result, err := sim.SimulateConversation(context.Background(), "AI Agents", perspective)
	if err != nil {
		t.Fatalf("SimulateConversation returned error: %v", err)
	}

	if result == nil {
		t.Fatal("expected result, got nil")
	}

	// Should have 1 turn (WikiWriter said thank you on turn 1, exiting before adding turn 1)
	if len(result.Turns) != 1 {
		t.Errorf("expected 1 turn before exit, got %d", len(result.Turns))
	}

	// Verify turn structure
	if result.Turns[0].Question == "" {
		t.Error("expected question in turn")
	}
	if result.Turns[0].Answer == "" {
		t.Error("expected answer in turn")
	}
	if len(result.Turns[0].SearchQueries) == 0 {
		t.Error("expected search queries in turn")
	}

	// Verify perspective is stored
	if result.Perspective.Name != "Technical Expert" {
		t.Errorf("expected perspective name 'Technical Expert', got '%s'", result.Perspective.Name)
	}

	// Verify cost is tracked
	if result.TotalCost.TotalTokens == 0 {
		t.Error("expected total cost to be tracked")
	}
}

func TestConversationSimulatorSimulateConversationMaxTurns(t *testing.T) {
	// All responses are questions (no thank you), should hit max turns
	responses := []string{}
	for i := 0; i < 20; i++ {
		responses = append(responses,
			`What else can you tell me about this topic?`,         // WikiWriter question
			`["search query"]`,                                      // Expert queries
			`Here is more information about the topic.`,            // Expert answer
		)
	}
	// Add fact extraction at the end
	responses = append(responses, `[]`)

	mockClient := &mockChatClient{responses: responses}
	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": "Search results here.",
		},
	}

	maxTurns := 3
	sim := NewConversationSimulator(mockClient, mockTools, ConversationConfig{MaxTurns: maxTurns})

	perspective := planning.Perspective{
		Name:  "Expert",
		Focus: "Details",
	}

	result, err := sim.SimulateConversation(context.Background(), "Topic", perspective)
	if err != nil {
		t.Fatalf("SimulateConversation returned error: %v", err)
	}

	if len(result.Turns) != maxTurns {
		t.Errorf("expected %d turns (max), got %d", maxTurns, len(result.Turns))
	}
}

func TestConversationSimulatorEmitsProgressEvents(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`What are the key aspects?`,
			`["query"]`,
			`Here is the answer.`,
			`Thank you so much for your help!`,
			`[]`, // fact extraction
		},
	}
	mockTools := &mockToolExecutor{
		results: map[string]string{"search": "Results"},
	}

	bus := events.NewBus(10)
	defer bus.Close()

	eventCh := bus.Subscribe(events.EventConversationProgress)

	sim := NewConversationSimulatorWithBus(mockClient, mockTools, bus, ConversationConfig{MaxTurns: 3})

	perspective := planning.Perspective{Name: "Expert", Focus: "Details"}

	_, err := sim.SimulateConversation(context.Background(), "Topic", perspective)
	if err != nil {
		t.Fatalf("SimulateConversation returned error: %v", err)
	}

	// Should receive at least one progress event
	select {
	case event := <-eventCh:
		if event.Type != events.EventConversationProgress {
			t.Errorf("expected EventConversationProgress, got %v", event.Type)
		}
		data, ok := event.Data.(events.ConversationProgressData)
		if !ok {
			t.Fatal("expected event data to be ConversationProgressData")
		}
		if data.Perspective != "Expert" {
			t.Errorf("expected perspective 'Expert', got %v", data.Perspective)
		}
		if data.Turn < 1 {
			t.Errorf("expected turn >= 1, got %d", data.Turn)
		}
	default:
		t.Error("expected progress event to be emitted")
	}
}

func TestFormatDialogueHistory(t *testing.T) {
	history := []DialogueTurn{
		{Question: "What is X?", Answer: "X is a thing."},
		{Question: "How does X work?", Answer: "X works like this."},
	}

	formatted := formatDialogueHistory(history)

	if !strings.Contains(formatted, "You asked: What is X?") {
		t.Error("expected formatted history to contain first question")
	}
	if !strings.Contains(formatted, "Expert answered: X is a thing.") {
		t.Error("expected formatted history to contain first answer")
	}
	if !strings.Contains(formatted, "How does X work?") {
		t.Error("expected formatted history to contain second question")
	}
}

func TestParseStringArrayFromContent(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "valid array",
			input:    `Here are the queries: ["query1", "query2"]`,
			expected: []string{"query1", "query2"},
		},
		{
			name:     "array only",
			input:    `["a", "b", "c"]`,
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseStringArrayFromContent(tt.input)
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

func TestParseFactsFromContent(t *testing.T) {
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
			name:          "multiple facts",
			input:         `[{"content": "fact1", "source": "src1", "confidence": 0.9}, {"content": "fact2", "source": "src2", "confidence": 0.8}]`,
			expectedCount: 2,
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
			result := parseFactsFromContent(tt.input)
			if len(result) != tt.expectedCount {
				t.Errorf("expected %d facts, got %d", tt.expectedCount, len(result))
			}
		})
	}
}

func TestGetAllFacts(t *testing.T) {
	conversations := map[string]*ConversationResult{
		"Expert1": {
			Facts: []Fact{
				{Content: "Fact A", Source: "src1"},
				{Content: "Fact B", Source: "src2"},
			},
		},
		"Expert2": {
			Facts: []Fact{
				{Content: "Fact C", Source: "src3"},
			},
		},
	}

	allFacts := GetAllFacts(conversations)

	if len(allFacts) != 3 {
		t.Errorf("expected 3 facts, got %d", len(allFacts))
	}
}

func TestGetAllFactsEmpty(t *testing.T) {
	conversations := map[string]*ConversationResult{}
	allFacts := GetAllFacts(conversations)

	if len(allFacts) != 0 {
		t.Errorf("expected 0 facts, got %d", len(allFacts))
	}
}

func TestGetAllSources(t *testing.T) {
	conversations := map[string]*ConversationResult{
		"Expert1": {
			Turns: []DialogueTurn{
				{Sources: []string{"https://a.com", "https://b.com"}},
				{Sources: []string{"https://c.com"}},
			},
		},
		"Expert2": {
			Turns: []DialogueTurn{
				{Sources: []string{"https://a.com", "https://d.com"}}, // a.com is duplicate
			},
		},
	}

	sources := GetAllSources(conversations)

	// Should deduplicate: a.com, b.com, c.com, d.com = 4 unique
	if len(sources) != 4 {
		t.Errorf("expected 4 unique sources, got %d", len(sources))
	}
}

func TestGetAllSourcesEmpty(t *testing.T) {
	conversations := map[string]*ConversationResult{}
	sources := GetAllSources(conversations)

	if len(sources) != 0 {
		t.Errorf("expected 0 sources, got %d", len(sources))
	}
}

func TestConversationSimulatorContextCancellation(t *testing.T) {
	// Create a mock client that checks context cancellation
	mockClient := &contextAwareMockChatClient{
		responses: []string{
			`What is the question?`,
		},
	}
	mockTools := &mockToolExecutor{}

	sim := NewConversationSimulator(mockClient, mockTools, DefaultConversationConfig())

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	perspective := planning.Perspective{Name: "Expert", Focus: "Details"}

	_, err := sim.SimulateConversation(ctx, "Topic", perspective)

	// The error depends on where cancellation is detected
	// It might be from the LLM client or context check
	if err == nil {
		t.Error("expected error due to context cancellation")
	}
}

// contextAwareMockChatClient is a mock that respects context cancellation
type contextAwareMockChatClient struct {
	responses []string
	callCount int
}

func (m *contextAwareMockChatClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	// Check context cancellation first
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	var content string
	if m.callCount < len(m.responses) {
		content = m.responses[m.callCount]
	} else if len(m.responses) > 0 {
		content = m.responses[len(m.responses)-1]
	} else {
		content = "[]"
	}
	m.callCount++

	return &llm.ChatResponse{
		Choices: []struct {
			Message llm.Message `json:"message"`
		}{
			{Message: llm.Message{Role: "assistant", Content: content}},
		},
		Usage: struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		}{
			PromptTokens:     10,
			CompletionTokens: 5,
			TotalTokens:      15,
		},
	}, nil
}

func (m *contextAwareMockChatClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	return nil
}

func (m *contextAwareMockChatClient) SetModel(model string) {}
func (m *contextAwareMockChatClient) GetModel() string      { return "test-model" }
