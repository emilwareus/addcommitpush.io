package orchestrator

import (
	"context"
	"sync"
	"testing"
	"time"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
)

// mockLLMClient is a test double for llm.ChatClient
type mockLLMClient struct {
	mu          sync.Mutex
	responses   []string
	responseIdx int
	callCount   int
	callDelay   time.Duration // Optional delay per call to simulate real latency
}

func newMockLLMClient(responses ...string) *mockLLMClient {
	return &mockLLMClient{responses: responses}
}

func (m *mockLLMClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
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

	// Debug: log each call to understand call order
	_ = messages // Mark as used

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

func (m *mockLLMClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	return nil
}

func (m *mockLLMClient) SetModel(model string) {}
func (m *mockLLMClient) GetModel() string      { return "test-model" }

// mockToolExecutor simulates tool execution
type mockToolExecutor struct {
	results map[string]string
}

func newMockToolExecutor() *mockToolExecutor {
	return &mockToolExecutor{
		results: map[string]string{
			"search": `{"results": [{"title": "Test Result", "url": "https://example.com", "snippet": "Test snippet"}]}`,
			"fetch":  `{"content": "Fetched content from the page."}`,
		},
	}
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

func testConfig() *config.Config {
	return &config.Config{
		Model:         "test-model",
		MaxIterations: 3,
		BraveAPIKey:   "test-key",
	}
}

// TestDeepOrchestratorCompletesWithoutHanging tests that the full workflow
// completes within a reasonable timeout without getting stuck
// Uses 5 perspectives (realistic for deep research)
func TestDeepOrchestratorCompletesWithoutHanging(t *testing.T) {
	cfg := testConfig()

	bus := events.NewBus(200)
	defer bus.Close()

	// Comprehensive mock responses for the full workflow with 5 perspectives:
	// The order matters - responses are consumed in sequence
	mockLLM := newMockLLMClient(
		// 1. Perspective discovery (5 perspectives - realistic for deep research)
		`[
			{"name": "Technical Expert", "focus": "Implementation details", "questions": ["How does it work technically?"]},
			{"name": "Market Analyst", "focus": "Market trends and adoption", "questions": ["What's the market like?"]},
			{"name": "User Researcher", "focus": "User experience and satisfaction", "questions": ["How do users feel?"]},
			{"name": "Security Specialist", "focus": "Security and privacy concerns", "questions": ["What are the security implications?"]},
			{"name": "Business Strategist", "focus": "Business model and monetization", "questions": ["How does it make money?"]}
		]`,
		// 2-6. Query generation for each perspective (search_0 through search_4)
		`["technical query 1", "technical query 2", "technical query 3"]`,
		`["market query 1", "market query 2"]`,
		`["user experience query", "user satisfaction metrics"]`,
		`["security vulnerabilities", "privacy concerns"]`,
		`["business model", "revenue streams"]`,
		// 7-11. Fact extraction for each perspective
		`[{"content": "Technical fact 1: Uses modern architecture", "source": "https://tech.example.com", "confidence": 0.9}, {"content": "Technical fact 2: Scalable design", "source": "https://tech.example.com", "confidence": 0.85}]`,
		`[{"content": "Market fact 1: Growing at 25% annually", "source": "https://market.example.com", "confidence": 0.8}]`,
		`[{"content": "User fact 1: 90% satisfaction rate", "source": "https://user.example.com", "confidence": 0.85}]`,
		`[{"content": "Security fact 1: End-to-end encryption", "source": "https://security.example.com", "confidence": 0.9}]`,
		`[{"content": "Business fact 1: Subscription-based model", "source": "https://business.example.com", "confidence": 0.8}]`,
		// 12-16. Gap identification for each perspective (no gaps for clean completion)
		`[]`,
		`[]`,
		`[]`,
		`[]`,
		`[]`,
		// 17. Cross-validation (for all facts)
		`[
			{"content": "Technical fact 1: Uses modern architecture", "source": "tech.example.com", "confidence": 0.9, "validation_score": 0.9, "corroborated_by": []},
			{"content": "Technical fact 2: Scalable design", "source": "tech.example.com", "confidence": 0.85, "validation_score": 0.85, "corroborated_by": []},
			{"content": "Market fact 1: Growing at 25% annually", "source": "market.example.com", "confidence": 0.8, "validation_score": 0.8, "corroborated_by": []},
			{"content": "User fact 1: 90% satisfaction rate", "source": "user.example.com", "confidence": 0.85, "validation_score": 0.85, "corroborated_by": []},
			{"content": "Security fact 1: End-to-end encryption", "source": "security.example.com", "confidence": 0.9, "validation_score": 0.9, "corroborated_by": []},
			{"content": "Business fact 1: Subscription-based model", "source": "business.example.com", "confidence": 0.8, "validation_score": 0.8, "corroborated_by": []}
		]`,
		// 18. Contradiction detection
		`[]`,
		// 19. Knowledge gaps identification
		`[]`,
		// 20. Report outline generation
		`["Introduction", "Technical Overview", "Market Analysis", "User Experience", "Security Considerations", "Business Model", "Conclusion"]`,
		// 21-27. Section writing (7 sections)
		`Introduction section providing overview of the research topic.`,
		`Technical overview covering implementation details and architecture.`,
		`Market analysis discussing trends and adoption rates.`,
		`User experience section covering satisfaction metrics and feedback.`,
		`Security considerations including encryption and privacy measures.`,
		`Business model analysis of revenue streams and monetization.`,
		`Conclusion synthesizing findings across all perspectives.`,
	)

	mockTools := newMockToolExecutor()

	// Note: WithDeepTools must come before WithDeepClient because
	// WithDeepClient creates searchAgent using o.tools
	orch := NewDeepOrchestrator(bus, cfg,
		WithDeepTools(mockTools),
		WithDeepClient(mockLLM),
	)

	// Run with a strict timeout - if it hangs, the test fails
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	done := make(chan struct{})
	var result *DeepResult
	var err error

	go func() {
		result, err = orch.Research(ctx, "Test query that should complete quickly")
		close(done)
	}()

	select {
	case <-done:
		// Completed successfully
	case <-ctx.Done():
		t.Fatal("Research timed out - possible stuck state in DAG or analysis")
	}

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify basic results
	if result == nil {
		t.Fatal("Expected result, got nil")
	}

	if result.Plan == nil {
		t.Fatal("Expected plan to be created")
	}

	if len(result.Plan.Perspectives) != 5 {
		t.Errorf("Expected 5 perspectives, got %d", len(result.Plan.Perspectives))
	}

	if result.Report == nil {
		t.Fatal("Expected report to be generated")
	}

	if result.Duration <= 0 {
		t.Error("Expected duration to be tracked")
	}

	// Verify DAG completed all nodes
	allNodes := result.Plan.DAG.GetAllNodes()
	for _, node := range allNodes {
		if node.Status.String() != "complete" {
			t.Errorf("DAG node %s has status %s, expected complete", node.ID, node.Status.String())
		}
	}
}

// TestDeepOrchestratorWithGapFilling tests that gap filling works correctly
// Uses 3 perspectives (realistic scenario where gaps are found)
func TestDeepOrchestratorWithGapFilling(t *testing.T) {
	cfg := testConfig()

	bus := events.NewBus(200)
	defer bus.Close()

	// Mock responses that include knowledge gaps
	// Note: Search agent may make multiple iterations, so we provide enough responses
	// Response order: perspective discovery -> (query gen, fact extraction, gap check) x N iterations x 3 searches
	// Then: cross-validation -> contradictions -> knowledge gaps -> gap filling -> synthesis
	mockLLM := newMockLLMClient(
		// 1. Perspective discovery (3 perspectives)
		`[
			{"name": "Technical Expert", "focus": "Technical implementation", "questions": ["How does it work?"]},
			{"name": "Market Analyst", "focus": "Market analysis", "questions": ["What's the market size?"]},
			{"name": "User Researcher", "focus": "User needs", "questions": ["What do users want?"]}
		]`,
		// Search 0 (Technical) - Iteration 1
		`["technical query"]`, // Query generation
		`[{"content": "Technical fact: Uses modern stack", "source": "https://tech.example.com", "confidence": 0.9}]`, // Fact extraction
		`[]`, // Gap identification (no gaps = sufficient coverage)
		// Search 1 (Market) - Iteration 1
		`["market query"]`,
		`[{"content": "Market fact: $10B market size", "source": "https://market.example.com", "confidence": 0.8}]`,
		`[]`,
		// Search 2 (User) - Iteration 1
		`["user query"]`,
		`[{"content": "User fact: Users want simplicity", "source": "https://user.example.com", "confidence": 0.85}]`,
		`[]`,
		// Analysis phase
		// Cross-validation (must match ALL facts from searches)
		`[
			{"content": "Technical fact: Uses modern stack", "source": "https://tech.example.com", "confidence": 0.9, "validation_score": 0.9, "corroborated_by": []},
			{"content": "Market fact: $10B market size", "source": "https://market.example.com", "confidence": 0.8, "validation_score": 0.8, "corroborated_by": []},
			{"content": "User fact: Users want simplicity", "source": "https://user.example.com", "confidence": 0.85, "validation_score": 0.85, "corroborated_by": []}
		]`,
		// Contradiction detection
		`[]`,
		// Knowledge gaps - this triggers gap filling (1 gap with importance >= 0.5)
		`[
			{"description": "Missing information about performance benchmarks", "importance": 0.85, "suggested_queries": ["performance benchmarks"]}
		]`,
		// Gap filling #1
		`["performance benchmarks"]`, // Query generation
		`[{"content": "Performance fact: Handles 1M requests/sec", "source": "https://perf.example.com", "confidence": 0.9}]`, // Fact extraction
		`[]`, // Gap identification
		// Synthesis
		`["Introduction", "Technical", "Market", "Users", "Performance", "Conclusion"]`, // Outline
		`Introduction content.`, // Section 1
		`Technical content.`,    // Section 2
		`Market content.`,       // Section 3
		`Users content.`,        // Section 4
		`Performance content.`,  // Section 5
		`Conclusion content.`,   // Section 6
	)

	mockTools := newMockToolExecutor()

	// Note: WithDeepTools must come before WithDeepClient because
	// WithDeepClient creates searchAgent using o.tools
	orch := NewDeepOrchestrator(bus, cfg,
		WithDeepTools(mockTools),
		WithDeepClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test with gap filling")

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	if result == nil {
		t.Fatal("Expected result")
	}

	// Verify analysis was performed
	if result.AnalysisResult == nil {
		t.Fatal("Expected analysis result")
	}

	// Verify we have search results
	if len(result.SearchResults) == 0 {
		t.Error("Expected search results to be collected")
	}

	// If knowledge gaps were identified, verify gap filling occurred
	if len(result.AnalysisResult.KnowledgeGaps) > 0 {
		// Count how many gaps were filled (importance >= 0.5)
		importantGaps := 0
		for _, gap := range result.AnalysisResult.KnowledgeGaps {
			if gap.Importance >= 0.5 {
				importantGaps++
			}
		}

		// Verify gap filling occurred for important gaps
		gapFilledCount := 0
		for key := range result.SearchResults {
			if len(key) > 4 && key[:4] == "gap_" {
				gapFilledCount++
			}
		}

		if gapFilledCount < importantGaps {
			t.Errorf("Expected %d gap filling searches (for important gaps), found %d gap_* results",
				importantGaps, gapFilledCount)
		}
	}

	// Verify search results have facts
	totalFacts := 0
	for _, sr := range result.SearchResults {
		if sr != nil {
			totalFacts += len(sr.Facts)
		}
	}
	// Should have at least some facts from searches
	if totalFacts == 0 {
		t.Error("Expected at least some facts to be collected from searches")
	}

	// Verify report was generated
	if result.Report == nil {
		t.Error("Expected report to be generated")
	}
}

// TestDeepOrchestratorEmitsProgressEvents verifies all expected events are emitted
// Uses 4 perspectives to test realistic event flow
func TestDeepOrchestratorEmitsProgressEvents(t *testing.T) {
	cfg := testConfig()

	bus := events.NewBus(300)
	defer bus.Close()

	// Subscribe to ALL events for debugging
	eventCh := bus.Subscribe(
		events.EventResearchStarted,
		events.EventQueryAnalyzed,
		events.EventPlanCreated,
		events.EventAnalysisStarted,
		events.EventAnalysisProgress,
		events.EventAnalysisComplete,
		events.EventSynthesisStarted,
		events.EventSynthesisProgress,
		events.EventSynthesisComplete,
		events.EventWorkerStarted,
		events.EventWorkerProgress,
		events.EventWorkerComplete,
		events.EventWorkerFailed,
		events.EventCrossValidationStarted,
		events.EventCrossValidationProgress,
		events.EventCrossValidationComplete,
		events.EventGapFillingStarted,
		events.EventGapFillingProgress,
		events.EventGapFillingComplete,
	)

	// Mock responses with 4 perspectives
	mockLLM := newMockLLMClient(
		// 1. Perspective discovery (4 perspectives)
		`[
			{"name": "Technical Expert", "focus": "Technical details", "questions": ["How does it work?"]},
			{"name": "Market Analyst", "focus": "Market analysis", "questions": ["What's the market?"]},
			{"name": "User Researcher", "focus": "User experience", "questions": ["How do users feel?"]},
			{"name": "Security Specialist", "focus": "Security concerns", "questions": ["Is it secure?"]}
		]`,
		// 2-5. Query generation for each perspective
		`["technical query 1", "technical query 2"]`,
		`["market query"]`,
		`["user query"]`,
		`["security query"]`,
		// 6-9. Fact extraction for each perspective
		`[
			{"content": "Fact 1: Technical detail", "source": "https://a.example.com", "confidence": 0.9},
			{"content": "Fact 2: Another technical detail", "source": "https://b.example.com", "confidence": 0.8}
		]`,
		`[{"content": "Market fact", "source": "https://market.example.com", "confidence": 0.85}]`,
		`[{"content": "User fact", "source": "https://user.example.com", "confidence": 0.8}]`,
		`[{"content": "Security fact", "source": "https://security.example.com", "confidence": 0.9}]`,
		// 10-13. Gap identification for each perspective
		`[]`,
		`[]`,
		`[]`,
		`[]`,
		// 14. Cross-validation (for all facts)
		`[
			{"content": "Fact 1: Technical detail", "validation_score": 0.9, "corroborated_by": []},
			{"content": "Fact 2: Another technical detail", "validation_score": 0.8, "corroborated_by": []},
			{"content": "Market fact", "validation_score": 0.85, "corroborated_by": []},
			{"content": "User fact", "validation_score": 0.8, "corroborated_by": []},
			{"content": "Security fact", "validation_score": 0.9, "corroborated_by": []}
		]`,
		// 15. Contradictions
		`[]`,
		// 16. Knowledge gaps
		`[]`,
		// 17. Outline
		`["Introduction", "Technical", "Market", "Users", "Security", "Conclusion"]`,
		// 18-23. Section writing (6 sections)
		`Introduction content.`,
		`Technical section content.`,
		`Market section content.`,
		`Users section content.`,
		`Security section content.`,
		`Conclusion content.`,
	)

	mockTools := newMockToolExecutor()

	// Note: WithDeepTools must come before WithDeepClient because
	// WithDeepClient creates searchAgent using o.tools
	orch := NewDeepOrchestrator(bus, cfg,
		WithDeepTools(mockTools),
		WithDeepClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := orch.Research(ctx, "Test events")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Collect events with timeout
	receivedEvents := make(map[events.EventType]int)
	timeout := time.After(1 * time.Second)
collectLoop:
	for {
		select {
		case event := <-eventCh:
			receivedEvents[event.Type]++
		case <-timeout:
			break collectLoop
		}
	}

	// Verify key events were emitted
	expectedEvents := []events.EventType{
		events.EventResearchStarted,
		events.EventPlanCreated,
		events.EventWorkerStarted,
		events.EventWorkerComplete,
		events.EventAnalysisStarted,
		events.EventAnalysisComplete,
		events.EventCrossValidationStarted,
		events.EventCrossValidationProgress,
		events.EventCrossValidationComplete,
		events.EventSynthesisStarted,
		events.EventSynthesisComplete,
	}

	for _, eventType := range expectedEvents {
		if receivedEvents[eventType] == 0 {
			t.Errorf("Expected event %v to be emitted", eventType)
		}
	}

	// Verify we got multiple cross-validation progress events (showing streaming progress)
	if receivedEvents[events.EventCrossValidationProgress] < 2 {
		t.Errorf("Expected multiple cross-validation progress events for streaming feel, got %d",
			receivedEvents[events.EventCrossValidationProgress])
	}
}

// TestDeepOrchestratorDAGNodeCompletion verifies all DAG nodes are processed
// Uses 4 perspectives to test realistic DAG structure
func TestDeepOrchestratorDAGNodeCompletion(t *testing.T) {
	cfg := testConfig()

	bus := events.NewBus(200)
	defer bus.Close()

	// Mock with 4 perspectives
	mockLLM := newMockLLMClient(
		// Perspectives (4 perspectives)
		`[
			{"name": "Technical Expert", "focus": "Technical implementation", "questions": ["How does it work?"]},
			{"name": "Market Analyst", "focus": "Market trends", "questions": ["What's the market?"]},
			{"name": "User Researcher", "focus": "User needs", "questions": ["What do users want?"]},
			{"name": "Business Strategist", "focus": "Business model", "questions": ["How does it make money?"]}
		]`,
		// Query gen x4
		`["technical query"]`,
		`["market query"]`,
		`["user query"]`,
		`["business query"]`,
		// Fact extraction x4
		`[{"content": "Technical fact", "source": "https://tech.example.com", "confidence": 0.9}]`,
		`[{"content": "Market fact", "source": "https://market.example.com", "confidence": 0.8}]`,
		`[{"content": "User fact", "source": "https://user.example.com", "confidence": 0.85}]`,
		`[{"content": "Business fact", "source": "https://business.example.com", "confidence": 0.8}]`,
		// Gap identification x4
		`[]`,
		`[]`,
		`[]`,
		`[]`,
		// Cross-validation
		`[
			{"content": "Technical fact", "validation_score": 0.9, "corroborated_by": []},
			{"content": "Market fact", "validation_score": 0.8, "corroborated_by": []},
			{"content": "User fact", "validation_score": 0.85, "corroborated_by": []},
			{"content": "Business fact", "validation_score": 0.8, "corroborated_by": []}
		]`,
		// Contradictions
		`[]`,
		// Knowledge gaps
		`[]`,
		// Outline
		`["Introduction", "Technical", "Market", "Users", "Business", "Conclusion"]`,
		// Section writing (6 sections)
		`Introduction content.`,
		`Technical content.`,
		`Market content.`,
		`Users content.`,
		`Business content.`,
		`Conclusion content.`,
	)

	mockTools := newMockToolExecutor()

	// Note: WithDeepTools must come before WithDeepClient because
	// WithDeepClient creates searchAgent using o.tools
	orch := NewDeepOrchestrator(bus, cfg,
		WithDeepTools(mockTools),
		WithDeepClient(mockLLM),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := orch.Research(ctx, "Test DAG completion")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify all expected DAG nodes exist and are complete
	expectedNodes := []string{
		"root",           // Initial analysis
		"search_0",       // First perspective search
		"search_1",       // Second perspective search
		"search_2",       // Third perspective search
		"search_3",       // Fourth perspective search
		"cross_validate", // Cross-validation
		"fill_gaps",      // Gap filling
		"synthesize",     // Final synthesis
	}

	for _, nodeID := range expectedNodes {
		node, exists := result.Plan.DAG.GetNode(nodeID)
		if !exists {
			t.Errorf("Expected DAG node %s to exist", nodeID)
			continue
		}
		if node.Status.String() != "complete" {
			t.Errorf("DAG node %s has status %s, expected complete", nodeID, node.Status.String())
		}
	}
}

// TestDeepOrchestratorCancelDuringDAG tests that cancellation during DAG execution works
func TestDeepOrchestratorCancelDuringDAG(t *testing.T) {
	cfg := testConfig()

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock with delays to simulate slow LLM
	mockLLM := newMockLLMClient(
		// Perspectives
		`[{"name": "Expert", "focus": "Focus", "questions": ["Q"]}]`,
	)
	mockLLM.callDelay = 100 * time.Millisecond // Add delay to each call

	mockTools := newMockToolExecutor()

	// Note: WithDeepTools must come before WithDeepClient because
	// WithDeepClient creates searchAgent using o.tools
	orch := NewDeepOrchestrator(bus, cfg,
		WithDeepTools(mockTools),
		WithDeepClient(mockLLM),
	)

	// Cancel quickly
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := orch.Research(ctx, "Test cancellation")

	// Should get a context error, not hang forever
	if err == nil {
		t.Error("Expected error due to context cancellation")
	}
}
