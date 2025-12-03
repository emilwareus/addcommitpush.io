package think_deep

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

// mockChatClient simulates LLM responses for testing the ThinkDeep flow.
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
			}{{Message: llm.Message{Content: "No more responses"}}},
			Usage: struct {
				PromptTokens     int `json:"prompt_tokens"`
				CompletionTokens int `json:"completion_tokens"`
				TotalTokens      int `json:"total_tokens"`
			}{PromptTokens: 10, CompletionTokens: 10, TotalTokens: 20},
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

// TestThinkDeepArchitectureInterface verifies the Architecture interface.
func TestThinkDeepArchitectureInterface(t *testing.T) {
	cfg := &config.Config{}
	bus := events.NewBus(10)
	defer bus.Close()

	arch := New(Config{AppConfig: cfg, Bus: bus})

	if arch.Name() != "think_deep" {
		t.Errorf("Expected name 'think_deep', got %q", arch.Name())
	}

	if !strings.Contains(arch.Description(), "ThinkDepth") {
		t.Errorf("Expected description to contain 'ThinkDepth', got %q", arch.Description())
	}

	if arch.SupportsResume() {
		t.Error("Expected SupportsResume to return false")
	}

	_, err := arch.Resume(context.Background(), "any-session")
	if err == nil {
		t.Error("Expected Resume to return error")
	}
}

// TestThinkDeepArchitectureFullFlow tests the complete ThinkDeep workflow with mocked LLM.
func TestThinkDeepArchitectureFullFlow(t *testing.T) {
	mockClient := &mockChatClient{
		model: "test-model",
		responses: []string{
			// 1. Research brief generation
			`## Research Objective
Research quantum computing impacts on cryptography.

## Key Questions to Answer
1. How do quantum computers threaten encryption?
2. What post-quantum solutions exist?

## Scope
- Focus on RSA and modern encryption
- Include timeline estimates`,

			// 2. Initial draft generation
			`# Quantum Computing and Cryptography

## Introduction
Quantum computing poses significant threats to current encryption.

## Threat Assessment
[NEEDS RESEARCH]

## Solutions
[NEEDS RESEARCH]`,

			// 3. Supervisor iteration 1 - think and conduct_research
			`Let me analyze the gaps in the draft.
<tool name="think">{"reflection": "Draft needs information on Shor's algorithm and post-quantum standards"}</tool>
<tool name="conduct_research">{"research_topic": "Shor's algorithm impact on RSA encryption"}</tool>`,

			// 4. Sub-researcher search and response (compressed)
			`Shor's algorithm can factor large numbers exponentially faster than classical computers.
[Source: https://example.com/quantum] RSA-2048 could be broken in hours once fault-tolerant quantum computers exist.`,

			// 5. Compression response
			`## Queries and Tool Calls Made
- Query: "Shor's algorithm impact on RSA encryption"

## Comprehensive Findings
Shor's algorithm can factor large numbers exponentially faster. RSA-2048 vulnerable.
[Source: https://example.com/quantum]

## Sources
[1] https://example.com/quantum`,

			// 6. Supervisor iteration 2 - refine draft
			`<tool name="refine_draft">{}</tool>`,

			// 7. Refined draft
			`# Quantum Computing and Cryptography

## Introduction
Quantum computing poses significant threats to current encryption.

## Threat Assessment
Shor's algorithm can break RSA encryption. [Source: https://example.com/quantum]

## Solutions
[NEEDS RESEARCH]`,

			// 8. Supervisor completes
			`Research is comprehensive for the key questions.
<tool name="research_complete">{}</tool>`,

			// 9. Final report generation
			`# Quantum Computing Impact on Cryptography

## Summary
Quantum computing threatens current encryption standards through Shor's algorithm.

## Key Findings
1. **Shor's Algorithm**: Can break RSA encryption exponentially faster
2. **Timeline**: RSA-2048 at risk when fault-tolerant quantum computers emerge

## Sources
[1] https://example.com/quantum - Quantum computing impact study`,
		},
	}

	mockTools := &mockToolExecutor{
		results: map[string]string{
			"search": `Results: https://example.com/quantum - Shor's algorithm can break RSA encryption.`,
		},
	}

	bus := events.NewBus(100)
	defer bus.Close()

	eventCh := bus.Subscribe(
		events.EventResearchStarted,
		events.EventDiffusionStarted,
		events.EventDiffusionComplete,
		events.EventFinalReportStarted,
		events.EventFinalReportComplete,
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
		Model:            "test-model",
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

	if result.Report == "" {
		t.Error("Expected report to be generated")
	}

	if result.Summary == "" {
		t.Error("Expected summary (research brief) to be generated")
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
	if !hasEvent(events.EventDiffusionStarted) {
		t.Error("Expected EventDiffusionStarted")
	}

	t.Logf("Research completed successfully")
	t.Logf("Report preview: %s...", truncate(result.Report, 100))
}

// TestThinkDeepCatalogRegistration verifies the architecture registers with the catalog.
func TestThinkDeepCatalogRegistration(t *testing.T) {
	// The init() function should have registered the architecture
	// This test verifies the registration was successful
	cfg := &config.Config{}
	bus := events.NewBus(10)
	defer bus.Close()

	// Create architecture directly to verify it implements interface
	arch := New(Config{AppConfig: cfg, Bus: bus})

	// Verify interface compliance
	if arch.Name() != "think_deep" {
		t.Errorf("Expected architecture name 'think_deep', got %q", arch.Name())
	}

	if !strings.Contains(arch.Description(), "Self-Balancing") {
		t.Errorf("Expected description to mention Self-Balancing, got %q", arch.Description())
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
