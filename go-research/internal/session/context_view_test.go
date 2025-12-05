package session

import (
	"testing"
	"time"
)

func TestBuildContextSnapshot_NoSession(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	_, err = BuildContextSnapshot(nil, store, 50000)
	if err == nil {
		t.Error("expected error for nil session")
	}
	if err.Error() != "no active session" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestBuildContextSnapshot_FastMode(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	sess := &Session{
		ID:        "test-session",
		Query:     "Test query",
		Mode:      ModeFast,
		Status:    StatusComplete,
		Report:    "This is a test report with some content.",
		Sources:   []string{"https://example.com", "https://test.com"},
		Insights: []Insight{
			{Title: "Insight 1", Finding: "Finding 1"},
			{Title: "Insight 2", Finding: "Finding 2"},
		},
		Workers: []WorkerContext{
			{
				ID:          "worker-1",
				Objective:   "Test objective",
				Iterations: []ReActIteration{
					{Number: 1, Thought: "Thought 1"},
					{Number: 2, Thought: "Thought 2"},
				},
				ToolCalls: []ToolCall{
					{Tool: "search", Args: map[string]interface{}{"query": "test"}},
				},
			},
		},
		Cost: CostBreakdown{
			InputTokens:  1000,
			OutputTokens: 500,
			TotalCost:    0.05,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	snapshot, err := BuildContextSnapshot(sess, store, 50000)
	if err != nil {
		t.Fatalf("failed to build snapshot: %v", err)
	}

	// Verify basic fields
	if snapshot.SessionID != "test-session" {
		t.Errorf("expected session ID 'test-session', got '%s'", snapshot.SessionID)
	}
	if snapshot.Mode != ModeFast {
		t.Errorf("expected mode Fast, got %s", snapshot.Mode)
	}
	if snapshot.Query != "Test query" {
		t.Errorf("expected query 'Test query', got '%s'", snapshot.Query)
	}

	// Verify counts
	if snapshot.ReportLength != len(sess.Report) {
		t.Errorf("expected report length %d, got %d", len(sess.Report), snapshot.ReportLength)
	}
	if snapshot.SourcesCount != 2 {
		t.Errorf("expected 2 sources, got %d", snapshot.SourcesCount)
	}
	if snapshot.InsightsCount != 2 {
		t.Errorf("expected 2 insights, got %d", snapshot.InsightsCount)
	}
	if snapshot.WorkersCount != 1 {
		t.Errorf("expected 1 worker, got %d", snapshot.WorkersCount)
	}
	if snapshot.IterationsCount != 2 {
		t.Errorf("expected 2 iterations, got %d", snapshot.IterationsCount)
	}
	if snapshot.ToolCallsCount != 1 {
		t.Errorf("expected 1 tool call, got %d", snapshot.ToolCallsCount)
	}

	// Verify cost
	if snapshot.Cost.TotalCost != 0.05 {
		t.Errorf("expected cost 0.05, got %f", snapshot.Cost.TotalCost)
	}

	// Verify raw context is built (should use BuildContinuationContext for fast mode)
	if snapshot.RawContext == "" {
		t.Error("expected non-empty raw context")
	}
	if !contains(snapshot.RawContext, "Test query") {
		t.Error("raw context should contain query")
	}
	if !contains(snapshot.RawContext, "This is a test report") {
		t.Error("raw context should contain report")
	}

	// Verify token estimate
	if snapshot.EstimatedTokens == 0 {
		t.Error("expected non-zero token estimate")
	}

	// Fast mode should not have think-deep context
	if snapshot.HasThinkDeepContext {
		t.Error("fast mode should not have think-deep context")
	}
}

func TestBuildContextSnapshot_ThinkDeepMode(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	sess := &Session{
		ID:        "think-deep-session",
		Query:     "Think deep query",
		Mode:      ModeThinkDeep,
		Status:    StatusComplete,
		Report:    "Think deep report",
		Sources:   []string{"https://thinkdeep.com"},
		Insights: []Insight{
			{Title: "TD Insight", Finding: "TD Finding"},
		},
		Workers: []WorkerContext{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	snapshot, err := BuildContextSnapshot(sess, store, 50000)
	if err != nil {
		t.Fatalf("failed to build snapshot: %v", err)
	}

	// Verify think-deep context is detected
	if !snapshot.HasThinkDeepContext {
		t.Error("think-deep mode should have think-deep context")
	}

	// Verify think-deep stats
	if snapshot.ThinkDeepFindings != 1 {
		t.Errorf("expected 1 finding, got %d", snapshot.ThinkDeepFindings)
	}
	if snapshot.ThinkDeepVisitedURLs != 1 {
		t.Errorf("expected 1 visited URL, got %d", snapshot.ThinkDeepVisitedURLs)
	}
	if !snapshot.ThinkDeepHasReport {
		t.Error("expected existing report to be present")
	}

	// Verify raw context contains think-deep content
	if snapshot.RawContext == "" {
		t.Error("expected non-empty raw context")
	}
	if !contains(snapshot.RawContext, "Think deep report") {
		t.Error("raw context should contain report")
	}
}

func TestBuildContextSnapshot_WithParentChain(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	// Create parent session
	parent := &Session{
		ID:        "parent-session",
		Query:     "Parent query",
		Mode:      ModeFast,
		Status:    StatusComplete,
		Report:    "Parent report",
		Sources:   []string{"https://parent.com"},
		Insights: []Insight{
			{Title: "Parent Insight", Finding: "Parent Finding"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save parent
	if err := store.Save(parent); err != nil {
		t.Fatalf("failed to save parent: %v", err)
	}

	// Create child session
	parentID := parent.ID
	child := &Session{
		ID:        "child-session",
		Query:     "Child query",
		Mode:      ModeThinkDeep,
		Status:    StatusExpanded,
		ParentID:  &parentID,
		Report:    "Child report",
		Sources:   []string{"https://child.com"},
		Insights: []Insight{
			{Title: "Child Insight", Finding: "Child Finding"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	snapshot, err := BuildContextSnapshot(child, store, 50000)
	if err != nil {
		t.Fatalf("failed to build snapshot: %v", err)
	}

	// For think-deep mode with parent, should accumulate findings
	if snapshot.ThinkDeepFindings < 2 {
		t.Errorf("expected at least 2 findings (from parent + child), got %d", snapshot.ThinkDeepFindings)
	}
	if snapshot.ThinkDeepVisitedURLs < 2 {
		t.Errorf("expected at least 2 visited URLs (from parent + child), got %d", snapshot.ThinkDeepVisitedURLs)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || 
		(len(s) > len(substr) && (s[:len(substr)] == substr || 
		s[len(s)-len(substr):] == substr || 
		containsMiddle(s, substr))))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
