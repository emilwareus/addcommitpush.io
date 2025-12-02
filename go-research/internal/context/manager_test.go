package context

import (
	"context"
	"strings"
	"testing"

	"go-research/internal/llm"
)

func TestManagerTokenTracking(t *testing.T) {
	mgr := New(nil, DefaultConfig())

	mgr.AddInteraction("user", "test query with some content")

	if mgr.CurrentTokens() == 0 {
		t.Error("expected tokens to be tracked")
	}

	// Verify token estimate is reasonable (chars/4)
	expectedTokens := len("test query with some content") / 4
	if mgr.CurrentTokens() != expectedTokens {
		t.Errorf("expected %d tokens, got %d", expectedTokens, mgr.CurrentTokens())
	}
}

func TestShouldFold(t *testing.T) {
	cfg := DefaultConfig()
	cfg.MaxTokens = 100
	cfg.FoldThreshold = 0.5
	mgr := New(nil, cfg)

	if mgr.ShouldFold() {
		t.Error("should not fold with empty context")
	}

	// Add enough tokens to trigger fold (need >=50% of 100 = >=50 tokens)
	// Each char is ~0.25 tokens, so 200+ chars = 50+ tokens should trigger
	// Using a 240 char string to ensure we get at least 60 tokens
	longMessage := "This is a very long message that needs to contain at least two hundred and forty characters to ensure we have enough tokens to exceed the fifty percent threshold. Adding more text here to make sure we definitely reach the target length for testing."
	mgr.AddInteraction("user", longMessage)

	if !mgr.ShouldFold() {
		t.Errorf("should fold when over threshold, current tokens: %d, threshold: 50", mgr.CurrentTokens())
	}
}

func TestShouldFoldEdgeCases(t *testing.T) {
	// Test with zero max tokens
	cfg := DefaultConfig()
	cfg.MaxTokens = 0
	mgr := New(nil, cfg)

	if mgr.ShouldFold() {
		t.Error("should not fold when maxTokens is 0")
	}
}

func TestBuildMessages(t *testing.T) {
	mgr := New(nil, DefaultConfig())
	mgr.AddInteraction("assistant", "I found something")
	mgr.AddInteraction("user", "Tell me more")

	msgs := mgr.BuildMessages("system prompt", "current query")

	if len(msgs) < 4 {
		t.Errorf("expected at least 4 messages (system + 2 working memory + query), got %d", len(msgs))
	}

	if msgs[0].Role != "system" {
		t.Error("first message should be system prompt")
	}

	if msgs[0].Content != "system prompt" {
		t.Errorf("expected system prompt content, got %s", msgs[0].Content)
	}

	// Last message should be the current query
	lastMsg := msgs[len(msgs)-1]
	if lastMsg.Role != "user" || lastMsg.Content != "current query" {
		t.Errorf("last message should be current query, got role=%s content=%s", lastMsg.Role, lastMsg.Content)
	}
}

func TestBuildMessagesWithSummaries(t *testing.T) {
	mgr := New(nil, DefaultConfig())

	// Manually set a summary for testing
	mgr.mu.Lock()
	mgr.summaries[0].Content = "L0 summary content"
	mgr.summaries[0].TokenCount = 10
	mgr.summaries[2].Content = "L2 summary content"
	mgr.summaries[2].TokenCount = 10
	mgr.mu.Unlock()

	msgs := mgr.BuildMessages("system", "query")

	// Should have: system, L2 summary, L0 summary, query
	if len(msgs) < 4 {
		t.Errorf("expected at least 4 messages, got %d", len(msgs))
	}

	// Verify summaries are in coarsest-to-finest order (L2 before L0)
	foundL2 := false
	foundL0 := false
	for _, msg := range msgs {
		if msg.Role == "system" && msg.Content != "system" {
			if !foundL2 && contains(msg.Content, "L2") {
				foundL2 = true
			} else if foundL2 && contains(msg.Content, "L0") {
				foundL0 = true
			} else if !foundL2 && contains(msg.Content, "L0") {
				t.Error("L0 summary appeared before L2 summary")
			}
		}
	}

	if !foundL2 || !foundL0 {
		t.Error("expected both L2 and L0 summaries in messages")
	}
}

func TestAddInteraction(t *testing.T) {
	cfg := DefaultConfig()
	cfg.WorkingMemSize = 3
	mgr := New(nil, cfg)

	mgr.AddInteraction("user", "message 1")
	mgr.AddInteraction("assistant", "message 2")
	mgr.AddInteraction("user", "message 3")

	if mgr.WorkingMemorySize() != 3 {
		t.Errorf("expected 3 interactions, got %d", mgr.WorkingMemorySize())
	}

	// Add one more to trigger FIFO eviction
	mgr.AddInteraction("assistant", "message 4")

	if mgr.WorkingMemorySize() != 3 {
		t.Errorf("expected 3 interactions after eviction, got %d", mgr.WorkingMemorySize())
	}

	// Verify first message was evicted
	memory := mgr.GetWorkingMemory()
	if memory[0].Content != "message 2" {
		t.Errorf("expected first message to be 'message 2' after eviction, got %s", memory[0].Content)
	}
}

func TestAddToolResult(t *testing.T) {
	mgr := New(nil, DefaultConfig())

	mgr.AddToolResult("search", "Search results here", []string{"finding 1", "finding 2"})
	mgr.AddToolResult("search", "More results", []string{"finding 2", "finding 3"}) // finding 2 is duplicate

	// Check that tool memory was updated
	mgr.mu.RLock()
	ts, exists := mgr.toolMemory["search"]
	mgr.mu.RUnlock()

	if !exists {
		t.Fatal("expected search tool in memory")
	}

	if ts.CallCount != 2 {
		t.Errorf("expected call count 2, got %d", ts.CallCount)
	}

	// Findings should be deduplicated
	if len(ts.KeyFindings) != 3 {
		t.Errorf("expected 3 unique findings, got %d", len(ts.KeyFindings))
	}
}

func TestReset(t *testing.T) {
	mgr := New(nil, DefaultConfig())

	mgr.AddInteraction("user", "test")
	mgr.AddToolResult("search", "result", []string{"finding"})

	// Manually add a summary
	mgr.mu.Lock()
	mgr.summaries[0].Content = "some content"
	mgr.mu.Unlock()

	mgr.Reset()

	if mgr.CurrentTokens() != 0 {
		t.Errorf("expected 0 tokens after reset, got %d", mgr.CurrentTokens())
	}

	if mgr.WorkingMemorySize() != 0 {
		t.Errorf("expected 0 working memory after reset, got %d", mgr.WorkingMemorySize())
	}

	summaries := mgr.GetSummaries()
	for _, s := range summaries {
		if s.Content != "" {
			t.Error("expected empty summaries after reset")
		}
	}
}

func TestFoldDirectiveParsing(t *testing.T) {
	mgr := New(nil, DefaultConfig())

	tests := []struct {
		input    string
		expected FoldType
	}{
		{`{"type": "NONE", "target_level": 0, "rationale": "test"}`, FoldNone},
		{`{"type": "GRANULAR", "target_level": 0, "rationale": "test"}`, FoldGranular},
		{`{"type": "DEEP", "target_level": 1, "rationale": "test"}`, FoldDeep},
		{`Some text {"type": "GRANULAR"} more text`, FoldGranular},
		{`invalid json`, FoldGranular}, // defaults to granular
	}

	for _, tt := range tests {
		directive, _ := mgr.parseFoldingResponse(tt.input)
		if directive.Type != tt.expected {
			t.Errorf("input %q: expected %v, got %v", tt.input, tt.expected, directive.Type)
		}
	}
}

func TestFoldGranular(t *testing.T) {
	mgr := New(nil, DefaultConfig())

	mgr.AddInteraction("user", "question about topic")
	mgr.AddInteraction("assistant", "here is my answer")

	initialWorkingMem := mgr.WorkingMemorySize()
	if initialWorkingMem != 2 {
		t.Fatalf("expected 2 interactions, got %d", initialWorkingMem)
	}

	err := mgr.Fold(context.Background(), FoldDirective{Type: FoldGranular})
	if err != nil {
		t.Fatalf("fold error: %v", err)
	}

	// Working memory should be cleared
	if mgr.WorkingMemorySize() != 0 {
		t.Errorf("expected empty working memory after fold, got %d", mgr.WorkingMemorySize())
	}

	// L0 summary should have content
	summaries := mgr.GetSummaries()
	if summaries[0].Content == "" {
		t.Error("expected L0 summary to have content after fold")
	}
}

func TestFoldDeep(t *testing.T) {
	mgr := New(nil, DefaultConfig())

	// Set up some summaries
	mgr.mu.Lock()
	mgr.summaries[0].Content = "L0 content"
	mgr.summaries[0].TokenCount = 10
	mgr.summaries[0].CoveredTurns = []int{1, 2}
	mgr.summaries[1].Content = "L1 content"
	mgr.summaries[1].TokenCount = 10
	mgr.summaries[1].CoveredTurns = []int{3, 4}
	mgr.mu.Unlock()

	err := mgr.Fold(context.Background(), FoldDirective{Type: FoldDeep, TargetLevel: 1})
	if err != nil {
		t.Fatalf("fold error: %v", err)
	}

	summaries := mgr.GetSummaries()

	// L0 and L1 should be cleared
	if summaries[0].Content != "" {
		t.Error("expected L0 to be cleared after deep fold")
	}
	if summaries[1].Content != "" {
		t.Error("expected L1 to be cleared after deep fold")
	}

	// L2 should have consolidated content
	if summaries[2].Content == "" {
		t.Error("expected L2 to have consolidated content")
	}

	// L2 should have all covered turns
	if len(summaries[2].CoveredTurns) != 4 {
		t.Errorf("expected L2 to have 4 covered turns, got %d", len(summaries[2].CoveredTurns))
	}
}

func TestTokenUsagePercent(t *testing.T) {
	cfg := DefaultConfig()
	cfg.MaxTokens = 100
	mgr := New(nil, cfg)

	if mgr.TokenUsagePercent() != 0 {
		t.Errorf("expected 0%% usage, got %.1f%%", mgr.TokenUsagePercent())
	}

	// Add 40 chars = 10 tokens = 10%
	mgr.AddInteraction("user", "1234567890123456789012345678901234567890")

	usage := mgr.TokenUsagePercent()
	if usage != 10 {
		t.Errorf("expected 10%% usage, got %.1f%%", usage)
	}
}

func TestEstimateTokens(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"", 0},
		{"test", 1},
		{"12345678", 2},
		{"This is a longer string with more characters", 11},
	}

	for _, tt := range tests {
		result := estimateTokens(tt.input)
		if result != tt.expected {
			t.Errorf("estimateTokens(%q): expected %d, got %d", tt.input, tt.expected, result)
		}
	}
}

func TestTruncate(t *testing.T) {
	tests := []struct {
		input    string
		n        int
		expected string
	}{
		{"hello", 10, "hello"},
		{"hello world", 8, "hello..."},
		{"hi", 2, "hi"},
		{"hello", 3, "hel"},
	}

	for _, tt := range tests {
		result := truncate(tt.input, tt.n)
		if result != tt.expected {
			t.Errorf("truncate(%q, %d): expected %q, got %q", tt.input, tt.n, tt.expected, result)
		}
	}
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

type costMockClient struct{}

func (c *costMockClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	response := "summary content"
	if len(messages) > 0 && strings.Contains(messages[0].Content, "context management assistant") {
		response = `{"type":"NONE","target_level":0,"rationale":"ok"}`
	}
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
			PromptTokens:     20,
			CompletionTokens: 10,
			TotalTokens:      30,
		},
	}, nil
}

func (c *costMockClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	return nil
}

func (c *costMockClient) SetModel(model string) {}
func (c *costMockClient) GetModel() string      { return "test-model" }

func TestManagerCostTracking(t *testing.T) {
	mgr := New(&costMockClient{}, DefaultConfig())

	mgr.AddInteraction("user", "test message")
	if err := mgr.Fold(context.Background(), FoldDirective{Type: FoldGranular}); err != nil {
		t.Fatalf("fold error: %v", err)
	}

	if mgr.CostBreakdown().TotalTokens == 0 {
		t.Fatal("expected folding to accumulate cost")
	}

	mgr.Reset()
	if mgr.CostBreakdown().TotalTokens != 0 {
		t.Error("expected reset to clear cost breakdown")
	}
}
