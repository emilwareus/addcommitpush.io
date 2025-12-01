package e2e

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"go-research/internal/agent"
	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/orchestrator"
	"go-research/internal/repl"
	"go-research/internal/repl/handlers"
	"go-research/internal/session"
)

// =============================================================================
// Parser Tests
// =============================================================================

func TestParserEmptyInput(t *testing.T) {
	result := repl.Parse("")
	if result.IsCommand || result.RawText != "" {
		t.Errorf("Expected empty result for empty input")
	}
}

func TestParserWhitespaceInput(t *testing.T) {
	result := repl.Parse("   \t\n  ")
	if result.IsCommand || result.RawText != "" {
		t.Errorf("Expected empty result for whitespace input")
	}
}

func TestParserSimpleCommand(t *testing.T) {
	result := repl.Parse("/help")
	if !result.IsCommand {
		t.Error("Expected IsCommand=true")
	}
	if result.Command != "help" {
		t.Errorf("Expected command 'help', got '%s'", result.Command)
	}
	if len(result.Args) != 0 {
		t.Errorf("Expected no args, got %v", result.Args)
	}
}

func TestParserCommandWithArgs(t *testing.T) {
	result := repl.Parse("/fast What is Go programming?")
	if !result.IsCommand {
		t.Error("Expected IsCommand=true")
	}
	if result.Command != "fast" {
		t.Errorf("Expected command 'fast', got '%s'", result.Command)
	}
	if len(result.Args) != 4 {
		t.Errorf("Expected 4 args, got %d: %v", len(result.Args), result.Args)
	}
	if result.Args[0] != "What" {
		t.Errorf("Expected first arg 'What', got '%s'", result.Args[0])
	}
}

func TestParserNaturalLanguage(t *testing.T) {
	result := repl.Parse("Tell me more about that")
	if result.IsCommand {
		t.Error("Expected IsCommand=false for natural language")
	}
	if result.RawText != "Tell me more about that" {
		t.Errorf("Expected RawText preserved, got '%s'", result.RawText)
	}
}

func TestParserPreservesRawText(t *testing.T) {
	result := repl.Parse("/deep How do AI agents work?")
	if result.RawText != "/deep How do AI agents work?" {
		t.Errorf("RawText not preserved: '%s'", result.RawText)
	}
}

// =============================================================================
// Router Tests
// =============================================================================

func TestRouterEmptyInput(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(10)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{Store: store, Bus: bus, Config: cfg, Renderer: repl.NewRenderer(&bytes.Buffer{})}
	router := repl.NewRouter(ctx, handlers.RegisterAll())

	handler, args, err := router.Route("")
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if handler != nil || args != nil {
		t.Error("Expected nil handler and args for empty input")
	}
}

func TestRouterCommandAliases(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(10)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{Store: store, Bus: bus, Config: cfg, Renderer: repl.NewRenderer(&bytes.Buffer{})}
	router := repl.NewRouter(ctx, handlers.RegisterAll())

	// Test various aliases
	aliases := []struct {
		input    string
		expected string
	}{
		{"/f test", "fast"},
		{"/d test", "deep"},
		{"/s", "sessions"},
		{"/l id", "load"},
		{"/w", "workers"},
		{"/r 1", "rerun"},
		{"/rc", "recompile"},
		{"/e more", "expand"},
		{"/h", "help"},
		{"/v", "verbose"},
		{"/m", "model"},
		{"/q", "quit"},
		{"/exit", "quit"},
		{"/?", "help"},
	}

	for _, tc := range aliases {
		handler, _, err := router.Route(tc.input)
		if err != nil {
			t.Errorf("Route(%s) error: %v", tc.input, err)
			continue
		}
		if handler == nil {
			t.Errorf("Route(%s) returned nil handler", tc.input)
		}
	}
}

func TestRouterUnknownCommandShowsHelp(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(10)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{Store: store, Bus: bus, Config: cfg, Renderer: repl.NewRenderer(&bytes.Buffer{})}
	router := repl.NewRouter(ctx, handlers.RegisterAll())

	handler, _, err := router.Route("/unknowncommand")
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	// Should return help handler for unknown commands
	if handler == nil {
		t.Error("Expected help handler for unknown command")
	}
}

func TestRouterNaturalLanguageGoesToDeepWithoutSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(10)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{Store: store, Bus: bus, Config: cfg, Renderer: repl.NewRenderer(&bytes.Buffer{})}
	router := repl.NewRouter(ctx, handlers.RegisterAll())

	// Without a session, natural language should go to deep
	handler, args, err := router.Route("What is the ReAct pattern?")
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if handler == nil {
		t.Error("Expected deep handler for natural language without session")
	}
	if len(args) != 1 || args[0] != "What is the ReAct pattern?" {
		t.Errorf("Expected full text as single arg, got: %v", args)
	}
}

func TestRouterNaturalLanguageGoesToExpandWithSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(10)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	// Create context WITH an active session
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Config:   cfg,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Session:  session.New("test query", session.ModeDeep),
	}
	router := repl.NewRouter(ctx, handlers.RegisterAll())

	// With a session, natural language should go to expand
	handler, args, err := router.Route("Tell me more about that")
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if handler == nil {
		t.Error("Expected expand handler for natural language with session")
	}
	if len(args) != 1 || args[0] != "Tell me more about that" {
		t.Errorf("Expected full text as single arg, got: %v", args)
	}
}

// =============================================================================
// Mock LLM Client
// =============================================================================

// MockLLMClient implements llm.ChatClient for testing
type MockLLMClient struct {
	Responses    []string // Queue of responses to return
	ResponseIdx  int
	CallCount    int
	LastMessages []llm.Message
}

func NewMockLLMClient(responses ...string) *MockLLMClient {
	return &MockLLMClient{Responses: responses}
}

func (m *MockLLMClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	// Check context cancellation first
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	m.CallCount++
	m.LastMessages = messages

	if m.ResponseIdx >= len(m.Responses) {
		return nil, fmt.Errorf("mock: no more responses configured")
	}

	response := m.Responses[m.ResponseIdx]
	m.ResponseIdx++

	return &llm.ChatResponse{
		Choices: []struct {
			Message llm.Message `json:"message"`
		}{
			{Message: llm.Message{Role: "assistant", Content: response}},
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

func (m *MockLLMClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	resp, err := m.Chat(ctx, messages)
	if err != nil {
		return err
	}
	return handler(resp.Choices[0].Message.Content)
}

func (m *MockLLMClient) SetModel(model string) {}
func (m *MockLLMClient) GetModel() string      { return "mock-model" }

// =============================================================================
// Mock Tools
// =============================================================================

// MockToolExecutor implements tools.ToolExecutor for testing
type MockToolExecutor struct {
	Results   map[string]string // tool name -> result
	CallCount int
	LastTool  string
	LastArgs  map[string]interface{}
}

func NewMockToolExecutor() *MockToolExecutor {
	return &MockToolExecutor{
		Results: map[string]string{
			"search": `1. Example Result
   URL: https://example.com/article
   This is a sample search result about the topic.

2. Another Result
   URL: https://example.com/article2
   More information about the research topic.`,
			"fetch": `This is the content of the fetched webpage.
It contains detailed information about the research topic.
Key findings include several important points.`,
		},
	}
}

func (m *MockToolExecutor) Execute(ctx context.Context, name string, args map[string]interface{}) (string, error) {
	m.CallCount++
	m.LastTool = name
	m.LastArgs = args

	if result, ok := m.Results[name]; ok {
		return result, nil
	}
	return "", fmt.Errorf("mock: unknown tool %s", name)
}

func (m *MockToolExecutor) ToolNames() []string {
	return []string{"search", "fetch"}
}

// =============================================================================
// Test Helpers
// =============================================================================

func testConfig() *config.Config {
	tmpDir, _ := os.MkdirTemp("", "research-test-*")
	return &config.Config{
		OpenRouterAPIKey: "test-key",
		BraveAPIKey:      "test-brave-key",
		VaultPath:        filepath.Join(tmpDir, "vault"),
		HistoryFile:      filepath.Join(tmpDir, ".history"),
		StateFile:        filepath.Join(tmpDir, ".state"),
		WorkerTimeout:    5 * time.Minute,
		RequestTimeout:   1 * time.Minute,
		MaxIterations:    5,
		MaxTokens:        10000,
		MaxWorkers:       3,
		Model:            "test-model",
		Verbose:          false,
	}
}

func containsString(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

// =============================================================================
// E2E Tests: Fast Research Workflow
// =============================================================================

func TestFastResearchWorkflow(t *testing.T) {
	// Setup
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock LLM: first does a search, then provides answer
	mockLLM := NewMockLLMClient(
		// First call: agent decides to search
		`I need to search for information about Go programming.
<tool name="search">{"query": "Go programming language overview"}</tool>`,
		// Second call: agent provides final answer after seeing results
		`Based on the search results, I can now provide a comprehensive answer.

<answer>
Go (also called Golang) is a statically typed, compiled programming language designed by Google.
Key features include:
- Simple and readable syntax
- Built-in concurrency with goroutines
- Fast compilation
- Garbage collection
- Strong standard library
</answer>`,
	)

	mockTools := NewMockToolExecutor()

	// Create agent with mocks
	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = mockTools

	reactAgent := agent.NewReact(agentCfg, bus)

	// Execute research
	ctx := context.Background()
	result, err := reactAgent.Research(ctx, "What is Go programming?")

	// Assertions
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	if result.Status != session.WorkerComplete {
		t.Errorf("Expected status Complete, got %v", result.Status)
	}

	if !strings.Contains(result.FinalOutput, "Go") {
		t.Errorf("Expected answer to mention Go, got: %s", result.FinalOutput)
	}

	if mockLLM.CallCount != 2 {
		t.Errorf("Expected 2 LLM calls, got %d", mockLLM.CallCount)
	}

	if mockTools.CallCount != 1 {
		t.Errorf("Expected 1 tool call, got %d", mockTools.CallCount)
	}

	if mockTools.LastTool != "search" {
		t.Errorf("Expected search tool, got %s", mockTools.LastTool)
	}
}

func TestFastResearchDirectAnswer(t *testing.T) {
	// Test case where agent provides answer immediately without tools
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	mockLLM := NewMockLLMClient(
		`<answer>
The answer to your question is straightforward. Here is the explanation.
</answer>`,
	)

	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = NewMockToolExecutor()

	reactAgent := agent.NewReact(agentCfg, bus)

	ctx := context.Background()
	result, err := reactAgent.Research(ctx, "Simple question")

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	if result.Status != session.WorkerComplete {
		t.Errorf("Expected Complete, got %v", result.Status)
	}

	if mockLLM.CallCount != 1 {
		t.Errorf("Expected 1 LLM call (direct answer), got %d", mockLLM.CallCount)
	}
}

func TestFastResearchMultipleTools(t *testing.T) {
	// Test case with search + fetch workflow
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	mockLLM := NewMockLLMClient(
		// Search
		`<tool name="search">{"query": "deep learning"}</tool>`,
		// Fetch a URL (should be recorded as visited source)
		`<tool name="fetch">{"url": "https://example.com/fetch-only"}</tool>`,
		// Final answer
		`<answer>Deep learning is a subset of machine learning using neural networks.</answer>`,
	)

	mockTools := NewMockToolExecutor()

	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = mockTools

	reactAgent := agent.NewReact(agentCfg, bus)

	ctx := context.Background()
	result, err := reactAgent.Research(ctx, "Explain deep learning")

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	if mockLLM.CallCount != 3 {
		t.Errorf("Expected 3 LLM calls, got %d", mockLLM.CallCount)
	}

	if mockTools.CallCount != 2 {
		t.Errorf("Expected 2 tool calls (search + fetch), got %d", mockTools.CallCount)
	}

	if len(result.ToolCalls) != 2 {
		t.Errorf("Expected 2 tool calls recorded, got %d", len(result.ToolCalls))
	}

	expectedSources := []string{
		"https://example.com/article",
		"https://example.com/article2",
		"https://example.com/fetch-only",
	}

	if len(result.Sources) != len(expectedSources) {
		t.Fatalf("Expected %d sources, got %d (%v)", len(expectedSources), len(result.Sources), result.Sources)
	}

	for _, src := range expectedSources {
		if !containsString(result.Sources, src) {
			t.Fatalf("Expected source %s to be recorded, got %v", src, result.Sources)
		}
	}
}

// =============================================================================
// Mock Agent for Worker Pool
// =============================================================================

// MockAgentRunner implements orchestrator.AgentRunner for testing
type MockAgentRunner struct {
	Output string
}

func (m *MockAgentRunner) Research(ctx context.Context, objective string) (session.WorkerContext, error) {
	return session.WorkerContext{
		ID:          fmt.Sprintf("mock-worker-%d", time.Now().UnixNano()),
		Objective:   objective,
		FinalOutput: m.Output,
		Status:      session.WorkerComplete,
		Sources:     []string{"https://mock-source.com"},
		Cost: session.CostBreakdown{
			InputTokens:  100,
			OutputTokens: 50,
			TotalTokens:  150,
			InputCost:    0.0001,
			OutputCost:   0.0001,
			TotalCost:    0.0002,
		},
	}, nil
}

// =============================================================================
// E2E Tests: Deep Research (Orchestrator) Workflow
// =============================================================================

func TestDeepResearchWorkflow(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock LLM responses for orchestrator workflow:
	// 1. Complexity analysis
	// 2. Plan creation
	// 3. Synthesis (workers are mocked separately)
	mockLLM := NewMockLLMClient(
		// Complexity analysis
		`{"score": 0.7, "reason": "Multi-faceted topic requiring parallel research"}`,
		// Plan creation (for 5 workers based on 0.7 complexity)
		`[
			{"objective": "Research core concepts", "expected_output": "Overview of fundamentals"},
			{"objective": "Research applications", "expected_output": "Real-world use cases"},
			{"objective": "Research challenges", "expected_output": "Current limitations"},
			{"objective": "Research future trends", "expected_output": "Emerging developments"},
			{"objective": "Research comparisons", "expected_output": "Alternative approaches"}
		]`,
		// Synthesis
		`# Comprehensive Research Report

## Executive Summary
This report synthesizes findings from multiple research workers.

## Key Findings
1. Core concepts are well established
2. Many practical applications exist
3. Some challenges remain

## Conclusion
The topic shows promise for future development.`,
	)

	// Create mock agent factory
	mockFactory := func(config agent.Config, bus *events.Bus, workerNum int) orchestrator.AgentRunner {
		return &MockAgentRunner{Output: fmt.Sprintf("Worker %d findings about the topic.", workerNum)}
	}

	// Create pool with mock factory
	mockPool := orchestrator.NewPoolWithFactory(bus, cfg, mockFactory)

	orch := orchestrator.New(bus, cfg,
		orchestrator.WithClient(mockLLM),
		orchestrator.WithPool(mockPool),
	)

	ctx := context.Background()
	result, err := orch.Research(ctx, "How do modern AI systems work?")

	if err != nil {
		t.Fatalf("Deep research failed: %v", err)
	}

	if result.ComplexityScore != 0.7 {
		t.Errorf("Expected complexity 0.7, got %f", result.ComplexityScore)
	}

	if !strings.Contains(result.Report, "Research Report") {
		t.Errorf("Expected report to contain 'Research Report', got: %s", result.Report)
	}

	// Should have 5 workers (complexity 0.7 maps to 5 workers)
	if len(result.Workers) != 5 {
		t.Errorf("Expected 5 workers, got %d", len(result.Workers))
	}

	if result.Cost.TotalTokens == 0 {
		t.Error("expected deep research result to include aggregated cost")
	}
}

func TestDeepResearchLowComplexity(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	mockLLM := NewMockLLMClient(
		// Low complexity -> 1 worker
		`{"score": 0.2, "reason": "Simple topic"}`,
		// Plan for 1 worker
		`[{"objective": "Research the topic", "expected_output": "Complete overview"}]`,
		// Synthesis
		`Simple research report on the topic.`,
	)

	// Create mock agent factory
	mockFactory := func(config agent.Config, bus *events.Bus, workerNum int) orchestrator.AgentRunner {
		return &MockAgentRunner{Output: "Simple answer"}
	}

	mockPool := orchestrator.NewPoolWithFactory(bus, cfg, mockFactory)

	orch := orchestrator.New(bus, cfg,
		orchestrator.WithClient(mockLLM),
		orchestrator.WithPool(mockPool),
	)

	ctx := context.Background()
	result, err := orch.Research(ctx, "What is 2+2?")

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	if result.ComplexityScore != 0.2 {
		t.Errorf("Expected complexity 0.2, got %f", result.ComplexityScore)
	}

	// Should have 1 worker (complexity 0.2 maps to 1 worker)
	if len(result.Workers) != 1 {
		t.Errorf("Expected 1 worker for low complexity, got %d", len(result.Workers))
	}
}

// =============================================================================
// E2E Tests: Session Management
// =============================================================================

func TestSessionPersistence(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	store, err := session.NewStore(cfg.StateFile)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}

	// Create and save a session
	sess := session.New("Test query", session.ModeFast)
	sess.Report = "Test report content"
	sess.Status = session.StatusComplete
	sess.Sources = []string{"https://example.com"}

	if err := store.Save(sess); err != nil {
		t.Fatalf("Failed to save session: %v", err)
	}

	// Load it back
	loaded, err := store.Load(sess.ID)
	if err != nil {
		t.Fatalf("Failed to load session: %v", err)
	}

	if loaded.ID != sess.ID {
		t.Errorf("ID mismatch: %s != %s", loaded.ID, sess.ID)
	}

	if loaded.Query != sess.Query {
		t.Errorf("Query mismatch: %s != %s", loaded.Query, sess.Query)
	}

	if loaded.Report != sess.Report {
		t.Errorf("Report mismatch")
	}

	if loaded.Status != sess.Status {
		t.Errorf("Status mismatch: %v != %v", loaded.Status, sess.Status)
	}
}

func TestSessionList(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	store, err := session.NewStore(cfg.StateFile)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}

	// Create multiple sessions
	for i := 0; i < 3; i++ {
		sess := session.New(fmt.Sprintf("Query %d", i), session.ModeFast)
		sess.Status = session.StatusComplete
		if err := store.Save(sess); err != nil {
			t.Fatalf("Failed to save session %d: %v", i, err)
		}
		time.Sleep(10 * time.Millisecond) // Ensure different timestamps
	}

	// List sessions
	summaries, err := store.List()
	if err != nil {
		t.Fatalf("Failed to list sessions: %v", err)
	}

	if len(summaries) != 3 {
		t.Errorf("Expected 3 sessions, got %d", len(summaries))
	}
}

func TestLoadLastSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	store, err := session.NewStore(cfg.StateFile)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}

	// Save two sessions
	sess1 := session.New("First query", session.ModeFast)
	store.Save(sess1)

	time.Sleep(10 * time.Millisecond)

	sess2 := session.New("Second query", session.ModeFast)
	store.Save(sess2)

	// Load last should return sess2
	last, err := store.LoadLast()
	if err != nil {
		t.Fatalf("Failed to load last: %v", err)
	}

	if last.ID != sess2.ID {
		t.Errorf("Expected last session to be %s, got %s", sess2.ID, last.ID)
	}
}

// =============================================================================
// E2E Tests: Command Handlers
// =============================================================================

func TestHelpHandler(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	renderer := repl.NewRenderer(os.Stdout)

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: renderer,
		Config:   cfg,
	}

	handler := &handlers.HelpHandler{}
	err := handler.Execute(ctx, nil)

	if err != nil {
		t.Errorf("Help handler failed: %v", err)
	}
}

func TestSessionsHandler(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	renderer := repl.NewRenderer(os.Stdout)

	// Create a session first
	sess := session.New("Test", session.ModeFast)
	sess.Status = session.StatusComplete
	store.Save(sess)

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: renderer,
		Config:   cfg,
	}

	handler := &handlers.SessionsHandler{}
	err := handler.Execute(ctx, nil)

	if err != nil {
		t.Errorf("Sessions handler failed: %v", err)
	}
}

func TestLoadHandler(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	renderer := repl.NewRenderer(os.Stdout)

	// Create and save a session
	sess := session.New("Test query", session.ModeFast)
	sess.Status = session.StatusComplete
	store.Save(sess)

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: renderer,
		Config:   cfg,
	}

	handler := &handlers.LoadHandler{}
	err := handler.Execute(ctx, []string{sess.ID})

	if err != nil {
		t.Errorf("Load handler failed: %v", err)
	}

	if ctx.Session == nil {
		t.Error("Session not loaded into context")
	}

	if ctx.Session.ID != sess.ID {
		t.Errorf("Wrong session loaded: %s != %s", ctx.Session.ID, sess.ID)
	}
}

func TestVerboseHandler(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	renderer := repl.NewRenderer(os.Stdout)

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: renderer,
		Config:   cfg,
	}

	initialVerbose := cfg.Verbose

	handler := &handlers.VerboseHandler{}
	handler.Execute(ctx, nil)

	if cfg.Verbose == initialVerbose {
		t.Error("Verbose mode not toggled")
	}

	// Toggle back
	handler.Execute(ctx, nil)
	if cfg.Verbose != initialVerbose {
		t.Error("Verbose mode not toggled back")
	}
}

func TestModelHandler(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	renderer := repl.NewRenderer(os.Stdout)

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: renderer,
		Config:   cfg,
	}

	handler := &handlers.ModelHandler{}

	// Set new model
	err := handler.Execute(ctx, []string{"new-model"})
	if err != nil {
		t.Errorf("Model handler failed: %v", err)
	}

	if cfg.Model != "new-model" {
		t.Errorf("Model not updated: %s", cfg.Model)
	}
}

// =============================================================================
// E2E Tests: Event Bus
// =============================================================================

func TestEventBusPublishSubscribe(t *testing.T) {
	bus := events.NewBus(10)
	defer bus.Close()

	ch := bus.Subscribe(events.EventWorkerStarted, events.EventWorkerComplete)

	// Publish events
	bus.Publish(events.Event{
		Type:      events.EventWorkerStarted,
		Timestamp: time.Now(),
		Data:      "test",
	})

	bus.Publish(events.Event{
		Type:      events.EventWorkerComplete,
		Timestamp: time.Now(),
		Data:      "test2",
	})

	// Should receive both
	received := 0
	timeout := time.After(100 * time.Millisecond)
loop:
	for {
		select {
		case <-ch:
			received++
			if received == 2 {
				break loop
			}
		case <-timeout:
			break loop
		}
	}

	if received != 2 {
		t.Errorf("Expected 2 events, received %d", received)
	}
}

// =============================================================================
// E2E Tests: Error Handling
// =============================================================================

func TestResearchLLMError(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock that returns error
	mockLLM := &MockLLMClient{} // No responses configured

	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = NewMockToolExecutor()

	reactAgent := agent.NewReact(agentCfg, bus)

	ctx := context.Background()
	result, err := reactAgent.Research(ctx, "Test query")

	if err == nil {
		t.Error("Expected error when LLM fails")
	}

	if result.Status != session.WorkerFailed {
		t.Errorf("Expected Failed status, got %v", result.Status)
	}
}

func TestLoadNonexistentSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	store, _ := session.NewStore(cfg.StateFile)

	_, err := store.Load("nonexistent-session-id")

	if err == nil {
		t.Error("Expected error loading nonexistent session")
	}
}

// =============================================================================
// E2E Tests: Context Continuation
// =============================================================================

func TestBuildContinuationContext(t *testing.T) {
	sess := &session.Session{
		Query:  "Original query",
		Report: "Previous findings about the topic.",
		Sources: []string{
			"https://example.com/1",
			"https://example.com/2",
		},
		Insights: []session.Insight{
			{Title: "Key Finding", Finding: "Important discovery"},
		},
	}

	ctx := session.BuildContinuationContext(sess)

	if !strings.Contains(ctx, "Original query") {
		t.Error("Context should contain original query")
	}

	if !strings.Contains(ctx, "Previous findings") {
		t.Error("Context should contain report")
	}

	if !strings.Contains(ctx, "Key Finding") {
		t.Error("Context should contain insights")
	}

	if !strings.Contains(ctx, "example.com") {
		t.Error("Context should contain sources")
	}
}

// =============================================================================
// E2E Tests: Max Iterations
// =============================================================================

func TestResearchMaxIterations(t *testing.T) {
	cfg := testConfig()
	cfg.MaxIterations = 3 // Low limit for testing
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock that never provides an answer (just keeps searching)
	responses := make([]string, 10)
	for i := range responses {
		responses[i] = `<tool name="search">{"query": "more info"}</tool>`
	}
	mockLLM := NewMockLLMClient(responses...)

	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = NewMockToolExecutor()

	reactAgent := agent.NewReact(agentCfg, bus)

	ctx := context.Background()
	result, err := reactAgent.Research(ctx, "Endless research")

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Should complete after max iterations even without answer
	if result.Status != session.WorkerComplete {
		t.Errorf("Expected Complete status after max iterations, got %v", result.Status)
	}

	if mockLLM.CallCount > cfg.MaxIterations {
		t.Errorf("Should not exceed max iterations: %d > %d", mockLLM.CallCount, cfg.MaxIterations)
	}
}

// =============================================================================
// E2E Tests: Handler Edge Cases
// =============================================================================

func TestExpandHandlerNoSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  nil, // No active session
	}

	handler := &handlers.ExpandHandler{}
	err := handler.Execute(ctx, []string{"tell me more"})

	if err == nil {
		t.Error("Expected error when no session active")
	}
	if !strings.Contains(err.Error(), "no active session") {
		t.Errorf("Expected 'no active session' error, got: %v", err)
	}
}

func TestExpandHandlerNoArgs(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	sess := session.New("Original query", session.ModeFast)

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  sess,
	}

	handler := &handlers.ExpandHandler{}
	err := handler.Execute(ctx, []string{})

	if err == nil {
		t.Error("Expected error when no args provided")
	}
	if !strings.Contains(err.Error(), "usage") {
		t.Errorf("Expected usage error, got: %v", err)
	}
}

func TestWorkersHandlerNoSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  nil,
	}

	handler := &handlers.WorkersHandler{}
	err := handler.Execute(ctx, nil)

	if err == nil {
		t.Error("Expected error when no session")
	}
}

func TestWorkersHandlerEmptyWorkers(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	sess := session.New("Test", session.ModeFast)
	sess.Workers = []session.WorkerContext{} // Empty

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  sess,
	}

	handler := &handlers.WorkersHandler{}
	err := handler.Execute(ctx, nil)

	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
}

func TestWorkersHandlerWithWorkers(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	sess := session.New("Test", session.ModeDeep)
	sess.Workers = []session.WorkerContext{
		{ID: "w1", Objective: "Research topic A", Status: session.WorkerComplete, Sources: []string{"src1"}},
		{ID: "w2", Objective: "Research topic B", Status: session.WorkerComplete, Sources: []string{"src2", "src3"}},
	}

	var buf bytes.Buffer
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&buf),
		Config:   cfg,
		Session:  sess,
	}

	handler := &handlers.WorkersHandler{}
	err := handler.Execute(ctx, nil)

	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	output := buf.String()
	if !strings.Contains(output, "Worker") {
		t.Errorf("Output should contain worker info: %s", output)
	}
}

func TestRerunHandlerNoSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  nil,
	}

	handler := &handlers.RerunHandler{}
	err := handler.Execute(ctx, []string{"1"})

	if err == nil {
		t.Error("Expected error when no session")
	}
}

func TestRerunHandlerInvalidWorkerNumber(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	sess := session.New("Test", session.ModeFast)
	sess.Workers = []session.WorkerContext{
		{ID: "w1", Objective: "Topic A"},
	}

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  sess,
	}

	handler := &handlers.RerunHandler{}

	// Test invalid number
	err := handler.Execute(ctx, []string{"abc"})
	if err == nil {
		t.Error("Expected error for non-numeric worker number")
	}

	// Test out of range
	err = handler.Execute(ctx, []string{"5"})
	if err == nil {
		t.Error("Expected error for out of range worker number")
	}

	// Test zero
	err = handler.Execute(ctx, []string{"0"})
	if err == nil {
		t.Error("Expected error for zero worker number")
	}
}

func TestRecompileHandlerNoSession(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  nil,
	}

	handler := &handlers.RecompileHandler{}
	err := handler.Execute(ctx, nil)

	if err == nil {
		t.Error("Expected error when no session")
	}
}

func TestRecompileHandlerNoWorkers(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	sess := session.New("Test", session.ModeFast)
	sess.Workers = []session.WorkerContext{} // Empty

	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
		Session:  sess,
	}

	handler := &handlers.RecompileHandler{}
	err := handler.Execute(ctx, nil)

	if err == nil {
		t.Error("Expected error when no workers")
	}
}

func TestLoadHandlerNoArgs(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
	}

	handler := &handlers.LoadHandler{}
	err := handler.Execute(ctx, []string{})

	if err == nil {
		t.Error("Expected error when no session ID provided")
	}
}

func TestLoadHandlerNonexistent(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
	}

	handler := &handlers.LoadHandler{}
	err := handler.Execute(ctx, []string{"nonexistent-id"})

	if err == nil {
		t.Error("Expected error for nonexistent session")
	}
}

func TestFastHandlerNoArgs(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
	}

	handler := &handlers.FastHandler{}
	err := handler.Execute(ctx, []string{})

	if err == nil {
		t.Error("Expected error when no query provided")
	}
	if !strings.Contains(err.Error(), "usage") {
		t.Errorf("Expected usage error, got: %v", err)
	}
}

func TestDeepHandlerNoArgs(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	store, _ := session.NewStore(cfg.StateFile)
	ctx := &repl.Context{
		Store:    store,
		Bus:      bus,
		Renderer: repl.NewRenderer(&bytes.Buffer{}),
		Config:   cfg,
	}

	handler := &handlers.DeepHandler{}
	err := handler.Execute(ctx, []string{})

	if err == nil {
		t.Error("Expected error when no query provided")
	}
}

// =============================================================================
// E2E Tests: Session Versioning
// =============================================================================

func TestSessionVersioning(t *testing.T) {
	sess := session.New("Original query", session.ModeFast)

	if sess.Version != 1 {
		t.Errorf("Expected version 1, got %d", sess.Version)
	}

	v2 := sess.NewVersion()
	if v2.Version != 2 {
		t.Errorf("Expected version 2, got %d", v2.Version)
	}
	if v2.ParentID == nil || *v2.ParentID != sess.ID {
		t.Error("Expected ParentID to point to original session")
	}
	if v2.Mode != sess.Mode {
		t.Errorf("Mode not preserved: %s != %s", v2.Mode, sess.Mode)
	}

	v3 := v2.NewVersion()
	if v3.Version != 3 {
		t.Errorf("Expected version 3, got %d", v3.Version)
	}
}

func TestSessionModePreservedAcrossVersions(t *testing.T) {
	fastSess := session.New("Query", session.ModeFast)
	fastV2 := fastSess.NewVersion()
	if fastV2.Mode != session.ModeFast {
		t.Errorf("Fast mode not preserved: %s", fastV2.Mode)
	}

	deepSess := session.New("Query", session.ModeDeep)
	deepV2 := deepSess.NewVersion()
	if deepV2.Mode != session.ModeDeep {
		t.Errorf("Deep mode not preserved: %s", deepV2.Mode)
	}
}

// =============================================================================
// E2E Tests: Cost Tracking
// =============================================================================

func TestCostBreakdownAddition(t *testing.T) {
	cost1 := session.CostBreakdown{
		InputTokens:  100,
		OutputTokens: 50,
		TotalTokens:  150,
		InputCost:    0.001,
		OutputCost:   0.002,
		TotalCost:    0.003,
	}

	cost2 := session.CostBreakdown{
		InputTokens:  200,
		OutputTokens: 100,
		TotalTokens:  300,
		InputCost:    0.002,
		OutputCost:   0.004,
		TotalCost:    0.006,
	}

	cost1.Add(cost2)

	if cost1.InputTokens != 300 {
		t.Errorf("InputTokens: expected 300, got %d", cost1.InputTokens)
	}
	if cost1.OutputTokens != 150 {
		t.Errorf("OutputTokens: expected 150, got %d", cost1.OutputTokens)
	}
	if cost1.TotalTokens != 450 {
		t.Errorf("TotalTokens: expected 450, got %d", cost1.TotalTokens)
	}
	// Use tolerance for floating point comparison
	if cost1.TotalCost < 0.0089 || cost1.TotalCost > 0.0091 {
		t.Errorf("TotalCost: expected ~0.009, got %f", cost1.TotalCost)
	}
}

// =============================================================================
// E2E Tests: Tool Parsing
// =============================================================================

func TestToolCallParsing(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Test multiple tool calls in one response
	mockLLM := NewMockLLMClient(
		`Let me search for this.
<tool name="search">{"query": "first search"}</tool>
<tool name="search">{"query": "second search"}</tool>`,
		`<answer>Found the information.</answer>`,
	)

	mockTools := NewMockToolExecutor()

	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = mockTools

	reactAgent := agent.NewReact(agentCfg, bus)

	ctx := context.Background()
	result, err := reactAgent.Research(ctx, "Test multiple tools")

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Should have recorded 2 tool calls from first response
	if len(result.ToolCalls) != 2 {
		t.Errorf("Expected 2 tool calls, got %d", len(result.ToolCalls))
	}
}

func TestToolCallMalformedJSON(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Malformed JSON should be skipped
	mockLLM := NewMockLLMClient(
		`<tool name="search">{"query": broken json}</tool>`,
		`<answer>Continuing anyway.</answer>`,
	)

	mockTools := NewMockToolExecutor()

	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = mockTools

	reactAgent := agent.NewReact(agentCfg, bus)

	ctx := context.Background()
	result, err := reactAgent.Research(ctx, "Test malformed")

	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Should have 0 tool calls (malformed was skipped)
	if len(result.ToolCalls) != 0 {
		t.Errorf("Expected 0 tool calls for malformed JSON, got %d", len(result.ToolCalls))
	}
}

// =============================================================================
// E2E Tests: Renderer
// =============================================================================

func TestRendererOutput(t *testing.T) {
	var buf bytes.Buffer
	r := repl.NewRenderer(&buf)

	r.Info("Test message")
	if !strings.Contains(buf.String(), "Test message") {
		t.Error("Info message not rendered")
	}

	buf.Reset()
	r.Error(fmt.Errorf("test error"))
	if !strings.Contains(buf.String(), "test error") {
		t.Error("Error message not rendered")
	}
}

func TestRendererWelcome(t *testing.T) {
	var buf bytes.Buffer
	r := repl.NewRenderer(&buf)

	r.Welcome()
	output := buf.String()

	if !strings.Contains(output, "Go Research Agent") {
		t.Error("Welcome should contain app name")
	}
	if !strings.Contains(output, "/fast") {
		t.Error("Welcome should show /fast command")
	}
	if !strings.Contains(output, "/deep") {
		t.Error("Welcome should show /deep command")
	}
}

// =============================================================================
// E2E Tests: Context Cancellation
// =============================================================================

func TestResearchContextCancellation(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock that would normally take many iterations
	responses := make([]string, 100)
	for i := range responses {
		responses[i] = `<tool name="search">{"query": "more"}</tool>`
	}
	mockLLM := NewMockLLMClient(responses...)

	agentCfg := agent.DefaultConfig(cfg)
	agentCfg.Client = mockLLM
	agentCfg.Tools = NewMockToolExecutor()

	reactAgent := agent.NewReact(agentCfg, bus)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	_, err := reactAgent.Research(ctx, "Cancelled query")

	if err == nil {
		t.Error("Expected error due to context cancellation")
	}
}

// =============================================================================
// E2E Tests: Deep Research Orchestrator (State-of-the-Art Implementation)
// =============================================================================

func TestDeepOrchestratorFullWorkflow(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock LLM responses for the deep orchestrator workflow:
	// 1. Perspective discovery
	// 2. Query generation for each perspective (3 perspectives)
	// 3. Fact extraction (3 times)
	// 4. Gap identification (3 times)
	// 5. Cross-validation
	// 6. Gap detection
	// 7. Report outline
	// 8. Section writing (5 sections)
	mockLLM := NewMockLLMClient(
		// 1. Perspective discovery
		`[
			{"name": "Technical Expert", "focus": "Implementation details", "questions": ["How does it work technically?"]},
			{"name": "Industry Analyst", "focus": "Market trends", "questions": ["What are the market trends?"]},
			{"name": "End User", "focus": "Practical applications", "questions": ["How can users benefit?"]}
		]`,
		// 2-4. Query generation for each perspective
		`["query about technical implementation", "how does the technology work"]`,
		`["market analysis query", "industry trends"]`,
		`["user experience query", "practical benefits"]`,
		// 5-7. Fact extraction for each search
		`[{"content": "Technical fact 1: The system uses neural networks", "source": "https://tech.example.com", "confidence": 0.9}]`,
		`[{"content": "Market fact 1: Growing at 25% annually", "source": "https://market.example.com", "confidence": 0.8}]`,
		`[{"content": "User fact 1: 90% satisfaction rate", "source": "https://user.example.com", "confidence": 0.85}]`,
		// 8-10. Gap identification (empty = no gaps = sufficient coverage)
		`[]`,
		`[]`,
		`[]`,
		// 11. Cross-validation
		`[{"content": "Technical fact 1: The system uses neural networks", "validation_score": 0.9, "corroborated_by": ["https://tech.example.com"]}]`,
		// 12. Contradiction detection
		`[]`,
		// 13. Knowledge gaps
		`[]`,
		// 14. Report outline
		`["Introduction", "Technical Overview", "Market Analysis", "User Experience", "Conclusion"]`,
		// 15-19. Section writing (5 sections)
		`This research report examines the topic from multiple perspectives, providing a comprehensive analysis.`,
		`The technical implementation relies on advanced neural network architectures. [source: https://tech.example.com]`,
		`The market shows strong growth at 25% annually, driven by increasing adoption. [source: https://market.example.com]`,
		`End users report 90% satisfaction rates with the technology. [source: https://user.example.com]`,
		`In conclusion, the technology shows promise across technical, market, and user dimensions.`,
	)

	mockTools := NewMockToolExecutor()

	// Create deep orchestrator with mocks
	orch := orchestrator.NewDeepOrchestrator(bus, cfg,
		orchestrator.WithDeepClient(mockLLM),
		orchestrator.WithDeepTools(mockTools),
	)

	ctx := context.Background()
	result, err := orch.Research(ctx, "How do modern AI systems work?")

	// Assertions
	if err != nil {
		t.Fatalf("Deep research failed: %v", err)
	}

	// Verify plan was created with perspectives
	if result.Plan == nil {
		t.Fatal("Expected plan to be created")
	}

	if len(result.Plan.Perspectives) != 3 {
		t.Errorf("Expected 3 perspectives, got %d", len(result.Plan.Perspectives))
	}

	// Verify perspectives are correct
	expectedPerspectives := []string{"Technical Expert", "Industry Analyst", "End User"}
	for i, expected := range expectedPerspectives {
		if result.Plan.Perspectives[i].Name != expected {
			t.Errorf("Expected perspective %d to be '%s', got '%s'",
				i, expected, result.Plan.Perspectives[i].Name)
		}
	}

	// Verify search results were collected
	if len(result.SearchResults) == 0 {
		t.Error("Expected search results to be collected")
	}

	// Verify report was generated
	if result.Report == nil {
		t.Fatal("Expected report to be generated")
	}

	if result.Report.FullContent == "" {
		t.Error("Expected report to have content")
	}

	// Verify report has meaningful content (at least 100 chars)
	if len(result.Report.FullContent) < 100 {
		t.Errorf("Report content too short (%d chars), expected meaningful content", len(result.Report.FullContent))
	}

	// Verify report has section structure (## headings)
	if !strings.Contains(result.Report.FullContent, "##") {
		t.Error("Report should have section headings (##)")
	}

	// Verify sources section exists (always added by compileReport)
	if !strings.Contains(result.Report.FullContent, "## Sources") {
		t.Error("Report should contain Sources section")
	}

	// Note: Citations may be empty if mock tool results don't get URL-parsed correctly
	// The important thing is the workflow completes and produces a report

	// Verify duration was tracked
	if result.Duration <= 0 {
		t.Error("Expected duration to be tracked")
	}

	if result.Cost.TotalTokens == 0 {
		t.Error("Expected aggregated cost to be tracked")
	}
	if result.Report.Cost.TotalTokens == 0 {
		t.Error("Expected report to include synthesis cost")
	}
}

func TestDeepOrchestratorWithPerspectiveDiscoveryFallback(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// First response is malformed (will trigger default perspectives)
	// Then provide valid responses for the rest of the workflow
	mockLLM := NewMockLLMClient(
		// 1. Malformed perspective discovery (triggers fallback)
		`not valid json`,
		// 2-4. Query generation for default perspectives (3)
		`["technical query"]`,
		`["practical query"]`,
		`["limitations query"]`,
		// 5-7. Fact extraction
		`[{"content": "Fact 1", "source": "https://example.com", "confidence": 0.8}]`,
		`[{"content": "Fact 2", "source": "https://example2.com", "confidence": 0.7}]`,
		`[{"content": "Fact 3", "source": "https://example3.com", "confidence": 0.75}]`,
		// 8-10. Gap identification
		`[]`,
		`[]`,
		`[]`,
		// 11. Cross-validation
		`[]`,
		// 12. Contradiction detection
		`[]`,
		// 13. Knowledge gaps
		`[]`,
		// 14. Report outline
		`["Introduction", "Analysis", "Conclusion"]`,
		// 15-17. Section writing
		`Introduction to the topic.`,
		`Detailed analysis of the subject.`,
		`Concluding remarks.`,
	)

	mockTools := NewMockToolExecutor()

	orch := orchestrator.NewDeepOrchestrator(bus, cfg,
		orchestrator.WithDeepClient(mockLLM),
		orchestrator.WithDeepTools(mockTools),
	)

	ctx := context.Background()
	result, err := orch.Research(ctx, "Test with fallback perspectives")

	if err != nil {
		t.Fatalf("Deep research failed: %v", err)
	}

	// Should use default perspectives when discovery fails
	if result.Plan == nil {
		t.Fatal("Expected plan to be created")
	}

	// Default perspectives are: Technical Expert, Practical User, Critic
	if len(result.Plan.Perspectives) != 3 {
		t.Errorf("Expected 3 default perspectives, got %d", len(result.Plan.Perspectives))
	}

	// Verify report was still generated
	if result.Report == nil || result.Report.FullContent == "" {
		t.Error("Expected report to be generated even with fallback perspectives")
	}
}

func TestDeepOrchestratorEventsEmitted(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Subscribe to events
	eventCh := bus.Subscribe(
		events.EventResearchStarted,
		events.EventPlanCreated,
		events.EventWorkerStarted,
		events.EventWorkerProgress,
		events.EventWorkerComplete,
		events.EventSynthesisStarted,
		events.EventSynthesisComplete,
	)

	// Minimal mock responses
	mockLLM := NewMockLLMClient(
		// Perspectives (just 1 for simplicity)
		`[{"name": "Expert", "focus": "Details", "questions": ["What?"]}]`,
		// Query generation
		`["search query"]`,
		// Fact extraction
		`[{"content": "A fact", "source": "https://example.com", "confidence": 0.9}]`,
		// Gap identification (no gaps)
		`[]`,
		// Cross-validation
		`[]`,
		// Contradictions
		`[]`,
		// Knowledge gaps
		`[]`,
		// Outline
		`["Section 1"]`,
		// Section content
		`Content for section 1.`,
	)

	mockTools := NewMockToolExecutor()

	orch := orchestrator.NewDeepOrchestrator(bus, cfg,
		orchestrator.WithDeepClient(mockLLM),
		orchestrator.WithDeepTools(mockTools),
	)

	ctx := context.Background()
	_, err := orch.Research(ctx, "Test events")

	if err != nil {
		t.Fatalf("Deep research failed: %v", err)
	}

	// Collect events with timeout
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

	// Verify key events were emitted
	expectedEvents := []events.EventType{
		events.EventResearchStarted,
		events.EventPlanCreated,
		events.EventWorkerStarted,
		events.EventSynthesisStarted,
		events.EventSynthesisComplete,
	}

	for _, eventType := range expectedEvents {
		if receivedEvents[eventType] == 0 {
			t.Errorf("Expected event %v to be emitted", eventType)
		}
	}

	// PlanCreated should have worker count of 1 (1 perspective)
	if receivedEvents[events.EventPlanCreated] != 1 {
		t.Errorf("Expected 1 PlanCreated event, got %d", receivedEvents[events.EventPlanCreated])
	}
}

func TestDeepOrchestratorContextCancellation(t *testing.T) {
	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	bus := events.NewBus(100)
	defer bus.Close()

	// Mock with many responses that would take a while
	responses := make([]string, 50)
	for i := range responses {
		responses[i] = `["query"]`
	}
	mockLLM := NewMockLLMClient(responses...)

	mockTools := NewMockToolExecutor()

	orch := orchestrator.NewDeepOrchestrator(bus, cfg,
		orchestrator.WithDeepClient(mockLLM),
		orchestrator.WithDeepTools(mockTools),
	)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	_, err := orch.Research(ctx, "Cancelled deep research")

	if err == nil {
		t.Error("Expected error due to context cancellation")
	}
}
