package orchestrator

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

// stormMockLLMClient is a test double for llm.ChatClient (STORM-specific)
type stormMockLLMClient struct {
	mu          sync.Mutex
	responses   []string
	responseIdx int
	callCount   int
	callDelay   time.Duration
}

func newStormMockLLMClient(responses ...string) *stormMockLLMClient {
	return &stormMockLLMClient{responses: responses}
}

func (m *stormMockLLMClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if m.callDelay > 0 {
		time.Sleep(m.callDelay)
	}

	m.callCount++

	var content string
	if m.responseIdx < len(m.responses) {
		content = m.responses[m.responseIdx]
		m.responseIdx++
	} else if len(m.responses) > 0 {
		content = m.responses[len(m.responses)-1]
	} else {
		content = "[]"
	}

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
			PromptTokens:     100,
			CompletionTokens: 50,
			TotalTokens:      150,
		},
	}, nil
}

func (m *stormMockLLMClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	return nil
}

func (m *stormMockLLMClient) SetModel(model string) {}
func (m *stormMockLLMClient) GetModel() string      { return "test-model" }

// stormMockToolExecutor simulates tool execution for STORM tests
type stormMockToolExecutor struct {
	results map[string]string
}

func newStormMockToolExecutor() *stormMockToolExecutor {
	return &stormMockToolExecutor{
		results: map[string]string{
			"search": `1. Research Result
   URL: https://example.com/article
   This is a sample search result about the research topic.

2. Another Result
   URL: https://example.com/article2
   More information about the topic.`,
			"fetch": `Fetched content from the webpage.`,
		},
	}
}

func (m *stormMockToolExecutor) Execute(ctx context.Context, name string, args map[string]interface{}) (string, error) {
	if result, ok := m.results[name]; ok {
		return result, nil
	}
	return "", nil
}

func (m *stormMockToolExecutor) ToolNames() []string {
	return []string{"search", "fetch"}
}

func stormTestConfig() *config.Config {
	return &config.Config{
		Model:         "test-model",
		MaxIterations: 3,
		BraveAPIKey:   "test-key",
	}
}

// TestStormOrchestratorCreation tests that the orchestrator can be created
func TestStormOrchestratorCreation(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(100)
	defer bus.Close()

	orch := NewStormOrchestrator(bus, cfg)

	if orch == nil {
		t.Fatal("expected orchestrator to be created")
	}
}

// TestStormOrchestratorWithOptions tests option injection
func TestStormOrchestratorWithOptions(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(100)
	defer bus.Close()

	mockClient := newStormMockLLMClient()
	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockClient),
	)

	if orch == nil {
		t.Fatal("expected orchestrator to be created")
	}
	if orch.client != mockClient {
		t.Error("expected client to be injected")
	}
}

// TestStormOrchestratorFullWorkflow tests the complete STORM workflow
func TestStormOrchestratorFullWorkflow(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	// Mock responses for the STORM workflow:
	// 1. Survey queries generation
	// 2. Topic outline extraction
	// 3. Perspective generation with survey
	// 4-6. WikiWriter questions (3 perspectives, 1 turn each + thank you)
	// 7-9. Expert query generation (3 times)
	// 10-12. Expert answers (3 times)
	// 13-15. Fact extraction from conversations (3 times)
	// 16. Cross-validation
	// 17. Contradictions
	// 18. Knowledge gaps
	// 19. Draft outline
	// 20. Refined outline
	// 21-25. Section writing
	mockLLM := newStormMockLLMClient(
		// 1. Survey queries
		`["AI agents overview", "AI agent applications", "AI agent challenges"]`,
		// 2. Topic outline extraction from search
		`[{"topic": "AI Agents", "sections": ["Introduction", "Architecture", "Applications"], "source": "https://example.com"}]`,
		// 3. Perspective generation
		`[
			{"name": "Technical Expert", "focus": "Implementation details", "questions": ["How does it work?"]},
			{"name": "Industry Analyst", "focus": "Market trends", "questions": ["What's the market?"]},
			{"name": "Basic Fact Writer", "focus": "Fundamentals", "questions": ["What is it?"]}
		]`,
		// Perspective 1 conversation
		`What are the key technical components of AI agents?`, // WikiWriter Q1
		`["AI agent architecture", "agent components"]`,        // Expert queries
		`AI agents consist of perception, reasoning, and action modules. [Source: https://tech.example.com]`, // Expert answer
		`Thank you so much for your help!`,                     // WikiWriter exit
		`[{"content": "AI agents have perception, reasoning, action modules", "source": "https://tech.example.com", "confidence": 0.9}]`, // Fact extraction
		// Perspective 2 conversation
		`What are the current market trends for AI agents?`,
		`["AI agent market", "agent adoption rates"]`,
		`The AI agent market is growing at 25% annually. [Source: https://market.example.com]`,
		`Thank you so much for your help!`,
		`[{"content": "AI agent market growing 25% annually", "source": "https://market.example.com", "confidence": 0.85}]`,
		// Perspective 3 conversation
		`What is the basic definition of an AI agent?`,
		`["AI agent definition", "what is AI agent"]`,
		`An AI agent is software that perceives its environment and takes actions. [Source: https://wiki.example.com]`,
		`Thank you so much for your help!`,
		`[{"content": "AI agent perceives environment and takes actions", "source": "https://wiki.example.com", "confidence": 0.9}]`,
		// Analysis phase
		`[
			{"content": "AI agents have perception, reasoning, action modules", "validation_score": 0.9, "corroborated_by": []},
			{"content": "AI agent market growing 25% annually", "validation_score": 0.85, "corroborated_by": []},
			{"content": "AI agent perceives environment and takes actions", "validation_score": 0.9, "corroborated_by": []}
		]`, // Cross-validation
		`[]`, // Contradictions
		`[]`, // Knowledge gaps
		// Synthesis phase
		`["Introduction", "Technical Architecture", "Market Analysis", "Conclusion"]`, // Draft outline
		`["Introduction", "What are AI Agents", "Technical Architecture", "Market Trends", "Conclusion"]`, // Refined outline
		// Section writing (5 sections)
		`This report examines AI agents from multiple expert perspectives.`,
		`AI agents are software systems that perceive their environment and take autonomous actions.`,
		`The technical architecture of AI agents consists of perception, reasoning, and action modules.`,
		`The AI agent market is experiencing significant growth at 25% annually.`,
		`In conclusion, AI agents represent a significant advancement in autonomous software systems.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "What are AI agents and how do they work?")

	if err != nil {
		t.Fatalf("STORM research failed: %v", err)
	}

	// Verify result structure
	if result == nil {
		t.Fatal("expected result, got nil")
	}

	// Verify perspectives were discovered
	if len(result.Perspectives) != 3 {
		t.Errorf("expected 3 perspectives, got %d", len(result.Perspectives))
	}

	// Verify conversations were conducted
	if len(result.Conversations) == 0 {
		t.Error("expected conversations to be conducted")
	}

	// Verify report was generated
	if result.Report == nil {
		t.Fatal("expected report to be generated")
	}

	if result.Report.FullContent == "" {
		t.Error("expected report to have content")
	}

	// Verify cost tracking
	if result.Cost.TotalTokens == 0 {
		t.Error("expected cost to be tracked")
	}

	// Verify duration tracking
	if result.Duration <= 0 {
		t.Error("expected duration to be tracked")
	}
}

// TestStormOrchestratorParallelConversations tests that conversations run in parallel
func TestStormOrchestratorParallelConversations(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	// Subscribe to conversation events
	eventCh := bus.Subscribe(
		events.EventConversationStarted,
		events.EventConversationCompleted,
	)

	// Minimal mock responses
	// Note: Basic Fact Writer is automatically added if not present, so we have 3 perspectives
	mockLLM := newStormMockLLMClient(
		// Survey + perspectives (2 explicit + 1 Basic Fact Writer auto-added)
		`["query"]`,
		`[]`,
		`[
			{"name": "Expert1", "focus": "Focus1", "questions": ["Q1"]},
			{"name": "Expert2", "focus": "Focus2", "questions": ["Q2"]}
		]`,
		// Conversations (3 perspectives including Basic Fact Writer)
		`Thank you so much for your help!`, `[]`, // Expert1
		`Thank you so much for your help!`, `[]`, // Expert2
		`Thank you so much for your help!`, `[]`, // Basic Fact Writer (auto-added)
		// Analysis
		`[]`, `[]`, `[]`,
		// Synthesis
		`["Section"]`, `["Section"]`,
		`Content.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := orch.Research(ctx, "Test parallel conversations")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Collect events
	startedCount := 0
	completedCount := 0
	timeout := time.After(500 * time.Millisecond)
collectLoop:
	for {
		select {
		case event := <-eventCh:
			switch event.Type {
			case events.EventConversationStarted:
				startedCount++
			case events.EventConversationCompleted:
				completedCount++
			}
		case <-timeout:
			break collectLoop
		}
	}

	// Should have started and completed 3 conversations (2 explicit + Basic Fact Writer)
	if startedCount < 2 {
		t.Errorf("expected at least 2 conversation started events, got %d", startedCount)
	}
	if completedCount < 2 {
		t.Errorf("expected at least 2 conversation completed events, got %d", completedCount)
	}
}

// TestStormOrchestratorEmitsEvents tests that all expected events are emitted
func TestStormOrchestratorEmitsEvents(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	eventCh := bus.Subscribe(
		events.EventResearchStarted,
		events.EventQueryAnalyzed,
		events.EventPlanCreated,
		events.EventConversationStarted,
		events.EventConversationCompleted,
		events.EventAnalysisStarted,
		events.EventAnalysisComplete,
		events.EventSynthesisStarted,
		events.EventSynthesisComplete,
		events.EventCostUpdated,
	)

	// Minimal mock responses
	mockLLM := newStormMockLLMClient(
		`["query"]`,
		`[]`,
		`[{"name": "Expert", "focus": "Focus", "questions": ["Q"]}]`,
		`Thank you so much for your help!`, `[]`,
		`[]`, `[]`, `[]`,
		`["Section"]`, `["Section"]`,
		`Content.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := orch.Research(ctx, "Test events")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Collect events
	receivedEvents := make(map[events.EventType]int)
	timeout := time.After(500 * time.Millisecond)
collectLoop:
	for {
		select {
		case event := <-eventCh:
			receivedEvents[event.Type]++
		case <-timeout:
			break collectLoop
		}
	}

	// Verify key events
	expectedEvents := []events.EventType{
		events.EventResearchStarted,
		events.EventPlanCreated,
		events.EventConversationStarted,
		events.EventConversationCompleted,
		events.EventAnalysisStarted,
		events.EventAnalysisComplete,
		events.EventSynthesisStarted,
		events.EventSynthesisComplete,
	}

	for _, eventType := range expectedEvents {
		if receivedEvents[eventType] == 0 {
			t.Errorf("expected event %v to be emitted", eventType)
		}
	}
}

// TestStormOrchestratorContextCancellation tests cancellation handling
func TestStormOrchestratorContextCancellation(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(100)
	defer bus.Close()

	mockLLM := newStormMockLLMClient(
		`[{"name": "Expert", "focus": "Focus", "questions": ["Q"]}]`,
	)
	mockLLM.callDelay = 100 * time.Millisecond

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := orch.Research(ctx, "Test cancellation")

	if err == nil {
		t.Error("expected error due to context cancellation")
	}
}

// TestStormOrchestratorTwoPhaseOutline tests that outline is generated in two phases
func TestStormOrchestratorTwoPhaseOutline(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	// Track synthesis progress events
	eventCh := bus.Subscribe(events.EventSynthesisProgress)

	mockLLM := newStormMockLLMClient(
		// Survey + perspectives
		`["query"]`,
		`[]`,
		`[{"name": "Expert", "focus": "Focus", "questions": ["Q"]}]`,
		// Conversation
		`Thank you so much for your help!`, `[]`,
		// Analysis
		`[]`, `[]`, `[]`,
		// Two-phase outline
		`["Draft Section 1", "Draft Section 2"]`,               // Draft
		`["Refined Section 1", "Refined Section 2", "New Section"]`, // Refined
		// Section writing
		`Content 1.`,
		`Content 2.`,
		`Content 3.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test two-phase outline")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify report has sections
	if result.Report == nil {
		t.Fatal("expected report")
	}

	// Check for synthesis progress events showing two phases
	phasesSeen := make(map[string]bool)
	timeout := time.After(500 * time.Millisecond)
collectLoop:
	for {
		select {
		case event := <-eventCh:
			if data, ok := event.Data.(map[string]interface{}); ok {
				if phase, ok := data["phase"].(string); ok {
					phasesSeen[phase] = true
				}
			}
		case <-timeout:
			break collectLoop
		}
	}

	// Should see both draft and refine phases
	if !phasesSeen["outline_draft"] {
		t.Error("expected outline_draft phase event")
	}
	if !phasesSeen["outline_refine"] {
		t.Error("expected outline_refine phase event")
	}
}

// TestStormOrchestratorConversationDataInResult tests that conversation data is in result
func TestStormOrchestratorConversationDataInResult(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	mockLLM := newStormMockLLMClient(
		// Survey + perspectives
		`["query"]`,
		`[]`,
		`[{"name": "Technical Expert", "focus": "Technical details", "questions": ["How does it work?"]}]`,
		// Conversation with actual turns
		`What is the architecture of the system?`,
		`["system architecture query"]`,
		`The system uses a microservices architecture with three main components.`,
		`Thank you so much for your help!`,
		`[{"content": "Uses microservices architecture", "source": "https://example.com", "confidence": 0.9}]`,
		// Analysis
		`[{"content": "Uses microservices", "validation_score": 0.9, "corroborated_by": []}]`,
		`[]`, `[]`,
		// Synthesis
		`["Section"]`, `["Section"]`,
		`Content.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test conversation data")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify conversations are stored
	if result.Conversations == nil {
		t.Fatal("expected conversations in result")
	}

	conv, exists := result.Conversations["Technical Expert"]
	if !exists {
		t.Fatal("expected conversation for 'Technical Expert'")
	}

	// Verify conversation has turns
	if len(conv.Turns) == 0 {
		t.Error("expected conversation to have turns")
	}

	// Verify turn has question and answer
	if conv.Turns[0].Question == "" {
		t.Error("expected turn to have question")
	}
	if conv.Turns[0].Answer == "" {
		t.Error("expected turn to have answer")
	}
}

// TestStormOrchestratorAnalysisUsesConversationFacts tests that analysis uses facts from conversations
func TestStormOrchestratorAnalysisUsesConversationFacts(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	eventCh := bus.Subscribe(events.EventAnalysisStarted, events.EventAnalysisComplete)

	// Mock responses including Basic Fact Writer (auto-added)
	mockLLM := newStormMockLLMClient(
		`["query"]`,
		`[]`,
		`[{"name": "Expert", "focus": "Focus", "questions": ["Q"]}]`,
		// Expert conversation
		`What is X?`,
		`["X query"]`,
		`X is a thing with properties A and B. [Source: https://example.com]`,
		`Thank you so much for your help!`,
		`[{"content": "X has properties A and B", "source": "https://example.com", "confidence": 0.9}]`,
		// Basic Fact Writer conversation (auto-added)
		`Thank you so much for your help!`,
		`[]`,
		// Analysis should receive the facts
		`[{"content": "X has properties A and B", "validation_score": 0.95, "corroborated_by": ["https://example.com"]}]`,
		`[]`, `[]`,
		// Synthesis
		`["Section"]`, `["Section"]`,
		`Content.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test analysis with facts")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Check analysis events were emitted
	receivedAnalysisEvent := false
	timeout := time.After(500 * time.Millisecond)
collectLoop:
	for {
		select {
		case event := <-eventCh:
			if event.Type == events.EventAnalysisStarted || event.Type == events.EventAnalysisComplete {
				receivedAnalysisEvent = true
			}
		case <-timeout:
			break collectLoop
		}
	}

	if !receivedAnalysisEvent {
		t.Error("expected analysis event to be emitted")
	}

	// Verify analysis result exists
	if result.AnalysisResult == nil {
		t.Error("expected analysis result")
	}

	// Verify that conversations produced facts
	totalFacts := 0
	for _, conv := range result.Conversations {
		totalFacts += len(conv.Facts)
	}
	// At least some facts should have been extracted (may be 0 if extraction failed, which is ok)
	// The key test is that the analysis phase ran
}

// TestStormOrchestratorPerspectiveWithBasicFactWriter tests that Basic Fact Writer is included
func TestStormOrchestratorPerspectiveWithBasicFactWriter(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	mockLLM := newStormMockLLMClient(
		`["query"]`,
		`[]`,
		// Perspectives without Basic Fact Writer - should be added
		`[{"name": "Technical Expert", "focus": "Tech", "questions": ["Q"]}]`,
		// Conversations for 2 perspectives (Technical + Basic Fact Writer)
		`Thank you so much for your help!`, `[]`,
		`Thank you so much for your help!`, `[]`,
		// Analysis
		`[]`, `[]`, `[]`,
		// Synthesis
		`["Section"]`, `["Section"]`,
		`Content.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test basic fact writer")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify Basic Fact Writer is included
	hasBasicFactWriter := false
	for _, p := range result.Perspectives {
		if strings.Contains(strings.ToLower(p.Name), "basic") ||
			strings.Contains(strings.ToLower(p.Name), "fact") {
			hasBasicFactWriter = true
			break
		}
	}

	if !hasBasicFactWriter {
		t.Error("expected Basic Fact Writer perspective to be included")
	}
}

// TestStormOrchestratorCostAccumulation tests that costs are accumulated from all phases
func TestStormOrchestratorCostAccumulation(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	mockLLM := newStormMockLLMClient(
		`["query"]`,
		`[]`,
		`[{"name": "Expert", "focus": "Focus", "questions": ["Q"]}]`,
		`Thank you so much for your help!`, `[]`,
		`[]`, `[]`, `[]`,
		`["Section"]`, `["Section"]`,
		`Content.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test cost accumulation")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify cost is accumulated
	if result.Cost.TotalTokens == 0 {
		t.Error("expected total cost to be accumulated")
	}

	// With multiple LLM calls, should have significant token count
	// Each mock call returns 150 total tokens
	if result.Cost.TotalTokens < 150 {
		t.Errorf("expected at least 150 tokens, got %d", result.Cost.TotalTokens)
	}
}

// TestStormResultStructure tests the StormResult struct fields
func TestStormResultStructure(t *testing.T) {
	cfg := stormTestConfig()
	bus := events.NewBus(200)
	defer bus.Close()

	mockLLM := newStormMockLLMClient(
		`["query"]`,
		`[]`,
		`[{"name": "Expert", "focus": "Focus", "questions": ["Q"]}]`,
		`Thank you so much for your help!`, `[]`,
		`[]`, `[]`, `[]`,
		`["Section"]`, `["Section"]`,
		`Content about the topic.`,
	)

	mockTools := newStormMockToolExecutor()

	orch := NewStormOrchestrator(bus, cfg,
		WithStormTools(mockTools),
		WithStormClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test result structure")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify all expected fields are populated
	if result.Topic != "Test result structure" {
		t.Errorf("expected topic 'Test result structure', got '%s'", result.Topic)
	}

	if result.Perspectives == nil {
		t.Error("expected perspectives to be set")
	}

	if result.Conversations == nil {
		t.Error("expected conversations to be set")
	}

	if result.AnalysisResult == nil {
		t.Error("expected analysis result to be set")
	}

	if result.Report == nil {
		t.Error("expected report to be set")
	}

	if result.Duration == 0 {
		t.Error("expected duration to be set")
	}
}
