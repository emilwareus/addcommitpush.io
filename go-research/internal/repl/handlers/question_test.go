package handlers

import (
	"bytes"
	"os"
	"testing"
	"time"

	"go-research/internal/config"
	"go-research/internal/repl"
	"go-research/internal/session"
)

func TestQuestionHandler_Execute_NoSession(t *testing.T) {
	handler := &QuestionHandler{}

	ctx := &repl.Context{
		Session: nil, // No active session
	}

	err := handler.Execute(ctx, []string{"What did you find?"})

	if err == nil {
		t.Fatal("expected error when no session")
	}
	if err.Error() != "no active session. Start research first with /fast, /storm, or /think_deep" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestQuestionHandler_Execute_NoArgs(t *testing.T) {
	handler := &QuestionHandler{}

	sess := session.New("test query", session.ModeFast)
	ctx := &repl.Context{
		Session: sess,
	}

	err := handler.Execute(ctx, []string{})

	if err == nil {
		t.Fatal("expected error when no args")
	}
	if err.Error() != "usage: /question <your question>" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestQuestionHandler_BuildQAContext_SingleSession(t *testing.T) {
	handler := &QuestionHandler{}

	sess := &session.Session{
		ID:      "test-session-1",
		Query:   "Swedish politics",
		Report:  "This is a detailed report about Swedish politics.",
		Sources: []string{"https://example.com/1", "https://example.com/2"},
		Insights: []session.Insight{
			{Title: "Tax Policy", Finding: "Sweden has high taxes"},
			{Title: "Healthcare", Finding: "Universal healthcare system"},
		},
	}

	ctx := &repl.Context{
		Session: sess,
	}

	qaContext := handler.buildQAContext(ctx)

	// Verify session query is included
	if !containsString(qaContext, "Swedish politics") {
		t.Error("QA context should contain session query")
	}

	// Verify report is included
	if !containsString(qaContext, "detailed report about Swedish politics") {
		t.Error("QA context should contain report content")
	}

	// Verify insights are included
	if !containsString(qaContext, "Tax Policy") {
		t.Error("QA context should contain insight title")
	}
	if !containsString(qaContext, "Sweden has high taxes") {
		t.Error("QA context should contain insight finding")
	}

	// Verify sources are included
	if !containsString(qaContext, "https://example.com/1") {
		t.Error("QA context should contain sources")
	}
}

func TestQuestionHandler_BuildQAContext_SessionChain(t *testing.T) {
	handler := &QuestionHandler{}

	// Create a temporary directory for the store
	tmpDir, err := os.MkdirTemp("", "question-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := session.NewStore(tmpDir)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	// Create parent session
	parentID := "parent-session"
	parentSess := &session.Session{
		ID:     parentID,
		Query:  "Initial research",
		Report: "Parent report content",
	}
	if err := store.Save(parentSess); err != nil {
		t.Fatalf("failed to save parent session: %v", err)
	}

	childSess := &session.Session{
		ID:       "child-session",
		ParentID: &parentID,
		Query:    "Follow-up research",
		Report:   "Child report content",
	}

	ctx := &repl.Context{
		Session: childSess,
		Store:   store,
	}

	qaContext := handler.buildQAContext(ctx)

	// Verify both sessions are included
	if !containsString(qaContext, "Initial research") {
		t.Error("QA context should contain parent session query")
	}
	if !containsString(qaContext, "Follow-up research") {
		t.Error("QA context should contain child session query")
	}
	if !containsString(qaContext, "Parent report content") {
		t.Error("QA context should contain parent report")
	}
	if !containsString(qaContext, "Child report content") {
		t.Error("QA context should contain child report")
	}
}

func TestQuestionHandler_BuildQAContext_TruncatesLongReport(t *testing.T) {
	handler := &QuestionHandler{}

	// Create a very long report
	longReport := make([]byte, 5000)
	for i := range longReport {
		longReport[i] = 'x'
	}

	sess := &session.Session{
		ID:     "test-session",
		Query:  "Test query",
		Report: string(longReport),
	}

	ctx := &repl.Context{
		Session: sess,
	}

	qaContext := handler.buildQAContext(ctx)

	// Should be truncated to 3000 chars + truncation marker
	if !containsString(qaContext, "...[truncated]") {
		t.Error("Long report should be truncated")
	}
}

func TestQuestionHandler_BuildQAContext_LimitsSourceCount(t *testing.T) {
	handler := &QuestionHandler{}

	// Create session with many sources
	sources := make([]string, 20)
	for i := range sources {
		sources[i] = "https://example.com/" + string(rune('a'+i))
	}

	sess := &session.Session{
		ID:      "test-session",
		Query:   "Test query",
		Report:  "Test report",
		Sources: sources,
	}

	ctx := &repl.Context{
		Session: sess,
	}

	qaContext := handler.buildQAContext(ctx)

	// Should limit to 10 sources
	// Count occurrences of "https://example.com/"
	count := 0
	for i := 0; i < len(qaContext)-len("https://example.com/"); i++ {
		if qaContext[i:i+len("https://example.com/")] == "https://example.com/" {
			count++
		}
	}

	if count > 10 {
		t.Errorf("Should limit sources to 10, got %d", count)
	}
}

func TestTruncateContext(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		maxLen int
		want   string
	}{
		{
			name:   "short string unchanged",
			input:  "hello",
			maxLen: 10,
			want:   "hello",
		},
		{
			name:   "exact length unchanged",
			input:  "hello",
			maxLen: 5,
			want:   "hello",
		},
		{
			name:   "long string truncated",
			input:  "hello world",
			maxLen: 5,
			want:   "hello...[truncated]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncateContext(tt.input, tt.maxLen)
			if got != tt.want {
				t.Errorf("truncateContext(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
			}
		})
	}
}

func containsString(s, substr string) bool {
	return bytes.Contains([]byte(s), []byte(substr))
}

// TestQuestionHandler integration test would require mocking LLM client
// which is tested separately via the full REPL tests

func TestQuestionHandler_NewInstance(t *testing.T) {
	handler := &QuestionHandler{}
	if handler == nil {
		t.Fatal("QuestionHandler should be instantiable")
	}
}

// Verify QuestionHandler implements Handler interface
func TestQuestionHandler_ImplementsHandler(t *testing.T) {
	var _ repl.Handler = (*QuestionHandler)(nil)
}

// Test renderer output
func TestRenderer_Answer(t *testing.T) {
	var buf bytes.Buffer
	renderer := repl.NewRenderer(&buf)

	renderer.Answer("This is a test answer from research.")

	output := buf.String()
	if !containsString(output, "Answer:") {
		t.Error("Output should contain 'Answer:' header")
	}
	if !containsString(output, "This is a test answer from research.") {
		t.Error("Output should contain the answer text")
	}
}

// Test that config has ClassifierModel
func TestConfig_HasClassifierModel(t *testing.T) {
	cfg := config.Load()

	if cfg.ClassifierModel == "" {
		t.Error("Config should have ClassifierModel set")
	}
}

// Benchmark QA context building
func BenchmarkBuildQAContext(b *testing.B) {
	handler := &QuestionHandler{}

	sess := &session.Session{
		ID:      "test-session",
		Query:   "Test query",
		Report:  "This is a detailed report with lots of content.",
		Sources: []string{"https://example.com/1", "https://example.com/2"},
		Insights: []session.Insight{
			{Title: "Insight 1", Finding: "Finding 1"},
			{Title: "Insight 2", Finding: "Finding 2"},
		},
		CreatedAt: time.Now(),
	}

	ctx := &repl.Context{
		Session: sess,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		handler.buildQAContext(ctx)
	}
}
