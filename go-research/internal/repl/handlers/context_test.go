package handlers

import (
	"bytes"
	"os"
	"strings"
	"testing"
	"time"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/repl"
	"go-research/internal/session"
)

func TestContextHandler_Execute_NoSession(t *testing.T) {
	handler := &ContextHandler{}

	ctx := &repl.Context{
		Session: nil, // No active session
		Config:  config.Load(),
	}

	err := handler.Execute(ctx, []string{})

	if err == nil {
		t.Fatal("expected error when no session")
	}
	if !strings.Contains(err.Error(), "no active session") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestContextHandler_Execute_SummaryMode(t *testing.T) {
	handler := &ContextHandler{}

	sess := &session.Session{
		ID:        "test-session",
		Query:     "Test query",
		Mode:      session.ModeFast,
		Status:    session.StatusComplete,
		Report:    "This is a test report.",
		Sources:   []string{"https://example.com"},
		Insights: []session.Insight{
			{Title: "Test Insight", Finding: "Test Finding"},
		},
		Workers: []session.WorkerContext{
			{
				ID:        "worker-1",
				Iterations: []session.ReActIteration{
					{Number: 1},
					{Number: 2},
				},
				ToolCalls: []session.ToolCall{
					{Tool: "search"},
				},
			},
		},
		Cost: session.CostBreakdown{
			TotalCost: 0.01,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tmpDir, err := os.MkdirTemp("", "context-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := session.NewStore(tmpDir)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	var buf bytes.Buffer
	renderer := repl.NewRenderer(&buf)

	ctx := &repl.Context{
		Session:  sess,
		Store:    store,
		Renderer: renderer,
		Config:   config.Load(),
		Bus:      events.NewBus(100),
	}

	err = handler.Execute(ctx, []string{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	output := buf.String()

	// Verify summary output contains key information
	if !strings.Contains(output, "Context Usage") {
		t.Error("output should contain 'Context Usage' header")
	}
	if !strings.Contains(output, "test-session") {
		t.Error("output should contain session ID")
	}
	if !strings.Contains(output, "Test query") {
		t.Error("output should contain query")
	}
	if !strings.Contains(output, "Tokens:") {
		t.Error("output should contain token information")
	}
	if !strings.Contains(output, "Workers:") {
		t.Error("output should contain workers count")
	}
	if !strings.Contains(output, "Sources:") {
		t.Error("output should contain sources count")
	}
	if !strings.Contains(output, "Insights:") {
		t.Error("output should contain insights count")
	}
	if !strings.Contains(output, "Use /context -v") {
		t.Error("output should suggest verbose mode")
	}
}

func TestContextHandler_Execute_VerboseMode(t *testing.T) {
	handler := &ContextHandler{}

	sess := &session.Session{
		ID:        "test-session",
		Query:     "Test query",
		Mode:      session.ModeFast,
		Status:    session.StatusComplete,
		Report:    "This is a test report with content.",
		Sources:   []string{"https://example.com"},
		Insights: []session.Insight{
			{Title: "Test Insight", Finding: "Test Finding"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tmpDir, err := os.MkdirTemp("", "context-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := session.NewStore(tmpDir)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	var buf bytes.Buffer
	renderer := repl.NewRenderer(&buf)

	ctx := &repl.Context{
		Session:  sess,
		Store:    store,
		Renderer: renderer,
		Config:   config.Load(),
		Bus:      events.NewBus(100),
	}

	err = handler.Execute(ctx, []string{"-v"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	output := buf.String()

	// Verify verbose output contains raw context
	if !strings.Contains(output, "Full Context (Verbose Mode)") {
		t.Error("output should contain verbose header")
	}
	if !strings.Contains(output, "test-session") {
		t.Error("output should contain session ID")
	}
	if !strings.Contains(output, "Estimated tokens:") {
		t.Error("output should contain token estimate")
	}
	if !strings.Contains(output, "Test query") {
		t.Error("output should contain query in raw context")
	}
	if !strings.Contains(output, "This is a test report") {
		t.Error("output should contain report in raw context")
	}
}

func TestContextHandler_Execute_VerboseModeWithFlag(t *testing.T) {
	handler := &ContextHandler{}

	sess := &session.Session{
		ID:        "test-session",
		Query:     "Test query",
		Mode:      session.ModeFast,
		Status:    session.StatusComplete,
		Report:    "Test report",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tmpDir, err := os.MkdirTemp("", "context-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := session.NewStore(tmpDir)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	var buf bytes.Buffer
	renderer := repl.NewRenderer(&buf)

	ctx := &repl.Context{
		Session:  sess,
		Store:    store,
		Renderer: renderer,
		Config:   config.Load(),
		Bus:      events.NewBus(100),
	}

	// Test with --verbose flag
	err = handler.Execute(ctx, []string{"--verbose"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	output := buf.String()

	// Should be in verbose mode
	if !strings.Contains(output, "Full Context (Verbose Mode)") {
		t.Error("output should be in verbose mode with --verbose flag")
	}
}

func TestContextHandler_ThinkDeepMode(t *testing.T) {
	handler := &ContextHandler{}

	sess := &session.Session{
		ID:        "think-deep-session",
		Query:     "Think deep query",
		Mode:      session.ModeThinkDeep,
		Status:    session.StatusComplete,
		Report:    "Think deep report",
		Sources:   []string{"https://thinkdeep.com"},
		Insights: []session.Insight{
			{Title: "TD Insight", Finding: "TD Finding"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tmpDir, err := os.MkdirTemp("", "context-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := session.NewStore(tmpDir)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	var buf bytes.Buffer
	renderer := repl.NewRenderer(&buf)

	ctx := &repl.Context{
		Session:  sess,
		Store:    store,
		Renderer: renderer,
		Config:   config.Load(),
		Bus:      events.NewBus(100),
	}

	err = handler.Execute(ctx, []string{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	output := buf.String()

	// Should show think-deep specific context
	if !strings.Contains(output, "Think-Deep Context") {
		t.Error("output should contain think-deep context section")
	}
	if !strings.Contains(output, "Previous findings:") {
		t.Error("output should show previous findings count")
	}
	if !strings.Contains(output, "Visited URLs:") {
		t.Error("output should show visited URLs count")
	}
}

func TestContextHandler_ImplementsHandler(t *testing.T) {
	var _ repl.Handler = (*ContextHandler)(nil)
}

func TestTruncateString(t *testing.T) {
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
			want:   "hello...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncateString(tt.input, tt.maxLen)
			if got != tt.want {
				t.Errorf("truncateString(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
			}
		})
	}
}
