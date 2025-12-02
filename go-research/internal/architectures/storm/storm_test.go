package storm

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
)

// mockChatClient simulates LLM responses for testing the full STORM flow.
type mockChatClient struct {
	mu        sync.Mutex
	responses []string
	callIndex int
	model     string
}

func (m *mockChatClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Return next response
	if m.callIndex >= len(m.responses) {
		return &llm.ChatResponse{
			Choices: []struct {
				Message llm.Message `json:"message"`
			}{{Message: llm.Message{Content: "[]"}}},
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

func (m *mockChatClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	resp, err := m.Chat(ctx, messages)
	if err == nil && len(resp.Choices) > 0 {
		handler(resp.Choices[0].Message.Content)
	}
	return err
}

func (m *mockChatClient) SetModel(model string) {
	m.model = model
}

func (m *mockChatClient) GetModel() string {
	if m.model == "" {
		return "test-model"
	}
	return m.model
}

// mockToolExecutor simulates web search
type mockToolExecutor struct {
	results map[string]string
}

func (m *mockToolExecutor) Execute(ctx context.Context, tool string, args map[string]interface{}) (string, error) {
	if result, ok := m.results[tool]; ok {
		return result, nil
	}
	return `Search results for query. Source: https://example.com/article`, nil
}

func (m *mockToolExecutor) ToolNames() []string {
	return []string{"search"}
}

// TestSTORMArchitectureFullFlow tests the complete STORM workflow with mocked LLM.
func TestSTORMArchitectureFullFlow(t *testing.T) {
	mockClient := &mockChatClient{
		model: "test-model",
		responses: []string{
			// 1. Related topics survey
			`Related topics for quantum computing include cryptography and post-quantum security.`,

			// 2. Perspective generation
			`[
				{"name": "Cryptographer", "focus": "Impact on encryption", "questions": ["How does quantum break RSA?"]},
				{"name": "Security Analyst", "focus": "Defense strategies", "questions": ["What post-quantum solutions exist?"]}
			]`,

			// === Conversation 1: Cryptographer ===
			`How does Shor's algorithm threaten RSA?`,
			`["Shor's algorithm RSA"]`,
			`Shor's algorithm breaks RSA. [Source: https://example.com/quantum]`,
			`Thank you so much for your help!`,
			`[{"content": "Shor's algorithm breaks RSA", "source": "https://example.com/quantum", "confidence": 0.9}]`,

			// === Conversation 2: Security Analyst ===
			`What post-quantum algorithms are recommended?`,
			`["post-quantum cryptography NIST"]`,
			`CRYSTALS-Kyber is standardized. [Source: https://nist.gov/pqcrypto]`,
			`Thank you so much for your help!`,
			`[{"content": "CRYSTALS-Kyber is NIST standard", "source": "https://nist.gov/pqcrypto", "confidence": 0.95}]`,

			// === Analysis Phase ===
			`[{"content": "Shor's algorithm breaks RSA", "validated": true, "confidence": 0.9}]`,
			`[]`,
			`["Timeline for quantum computers"]`,

			// === Synthesis Phase ===
			`## Quantum Computing\n### 1. Threat\n### 2. Solutions`,
			`## Quantum Computing Impact\n### 1. The Threat\n### 2. Solutions`,
			`Quantum computers threaten RSA. [Source: https://example.com/quantum]`,
			`Post-quantum solutions include CRYSTALS-Kyber. [Source: https://nist.gov/pqcrypto]`,
			`# Final Report\n\nQuantum computing threatens cryptography.`,
		},
	}

	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": `Results: https://example.com/quantum - Quantum info`,
		},
	}

	bus := events.NewBus(100)
	defer bus.Close()

	eventCh := bus.Subscribe(
		events.EventResearchStarted,
		events.EventPlanCreated,
		events.EventConversationStarted,
		events.EventConversationCompleted,
		events.EventAnalysisStarted,
		events.EventAnalysisComplete,
		events.EventSynthesisStarted,
		events.EventSynthesisComplete,
	)

	var receivedEvents []events.EventType
	var eventsMu sync.Mutex
	done := make(chan struct{})

	go func() {
		for {
			select {
			case evt := <-eventCh:
				eventsMu.Lock()
				receivedEvents = append(receivedEvents, evt.Type)
				eventsMu.Unlock()
			case <-done:
				return
			}
		}
	}()

	cfg := &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave",
	}

	arch := New(Config{
		AppConfig: cfg,
		Bus:       bus,
		Client:    mockClient,
		Tools:     mockTools,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := arch.Research(ctx, "test-session", "quantum computing cryptography")
	close(done)

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	if result.Status != "complete" {
		t.Errorf("Expected status 'complete', got %q", result.Status)
	}

	if result.Query != "quantum computing cryptography" {
		t.Errorf("Expected query preserved, got %q", result.Query)
	}

	if result.Metrics.WorkerCount < 1 {
		t.Errorf("Expected at least 1 perspective, got %d", result.Metrics.WorkerCount)
	}

	if result.Report == "" {
		t.Error("Expected report to be generated")
	}

	time.Sleep(100 * time.Millisecond)

	eventsMu.Lock()
	eventsReceived := receivedEvents
	eventsMu.Unlock()

	hasEvent := func(et events.EventType) bool {
		for _, e := range eventsReceived {
			if e == et {
				return true
			}
		}
		return false
	}

	if !hasEvent(events.EventResearchStarted) {
		t.Error("Expected EventResearchStarted")
	}
	if !hasEvent(events.EventPlanCreated) {
		t.Error("Expected EventPlanCreated")
	}

	t.Logf("Research completed with %d perspectives", result.Metrics.WorkerCount)
	t.Logf("Report: %s...", truncate(result.Report, 100))
}

// TestSTORMConversationEvents verifies conversation events are emitted.
func TestSTORMConversationEvents(t *testing.T) {
	mockClient := &mockChatClient{
		model: "test-model",
		responses: []string{
			`Related topics.`,
			`[{"name": "Expert", "focus": "Security", "questions": ["What?"]}]`,
			`What are the key aspects?`,
			`["query"]`,
			`Here is the answer. [Source: https://example.com]`,
			`Thank you so much for your help!`,
			`[{"content": "Fact 1", "source": "https://example.com", "confidence": 0.8}]`,
			`[]`, `[]`, `[]`,
			`## Outline`, `## Outline`, `Content`, `# Report`,
		},
	}

	mockTools := &mockToolExecutor{}

	bus := events.NewBus(50)
	defer bus.Close()

	eventCh := bus.Subscribe(
		events.EventConversationStarted,
		events.EventConversationProgress,
		events.EventConversationCompleted,
	)

	var conversationEvents []events.Event
	var mu sync.Mutex
	done := make(chan struct{})

	go func() {
		for {
			select {
			case evt := <-eventCh:
				mu.Lock()
				conversationEvents = append(conversationEvents, evt)
				mu.Unlock()
			case <-done:
				return
			}
		}
	}()

	cfg := &config.Config{OpenRouterAPIKey: "test", BraveAPIKey: "test"}
	arch := New(Config{AppConfig: cfg, Bus: bus, Client: mockClient, Tools: mockTools})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := arch.Research(ctx, "test", "test query")
	close(done)

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	evts := conversationEvents
	mu.Unlock()

	var hasStarted, hasCompleted bool
	for _, e := range evts {
		if e.Type == events.EventConversationStarted {
			hasStarted = true
		}
		if e.Type == events.EventConversationCompleted {
			hasCompleted = true
		}
	}

	if !hasStarted {
		t.Error("Expected ConversationStarted event")
	}
	if !hasCompleted {
		t.Error("Expected ConversationCompleted event")
	}
}

// TestSTORMArchitectureInterface verifies the Architecture interface.
func TestSTORMArchitectureInterface(t *testing.T) {
	cfg := &config.Config{}
	bus := events.NewBus(10)
	defer bus.Close()

	arch := New(Config{AppConfig: cfg, Bus: bus})

	if arch.Name() != "storm" {
		t.Errorf("Expected name 'storm', got %q", arch.Name())
	}

	if !strings.Contains(arch.Description(), "STORM") {
		t.Errorf("Expected description to contain 'STORM', got %q", arch.Description())
	}

	_, err := arch.Resume(context.Background(), "any-session")
	if err == nil {
		t.Error("Expected Resume to return error")
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
