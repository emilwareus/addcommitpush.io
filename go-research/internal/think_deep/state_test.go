package think_deep

import (
	"testing"
	"time"
)

func TestNewSupervisorState(t *testing.T) {
	brief := "Test research brief"
	state := NewSupervisorState(brief)

	if state.ResearchBrief != brief {
		t.Errorf("ResearchBrief = %q, want %q", state.ResearchBrief, brief)
	}
	if len(state.Messages) != 0 {
		t.Errorf("Messages should be empty, got %d", len(state.Messages))
	}
	if len(state.Notes) != 0 {
		t.Errorf("Notes should be empty, got %d", len(state.Notes))
	}
	if len(state.SubInsights) != 0 {
		t.Errorf("SubInsights should be empty, got %d", len(state.SubInsights))
	}
	if state.VisitedURLs == nil {
		t.Error("VisitedURLs should be initialized")
	}
}

func TestSupervisorState_AddSubInsight(t *testing.T) {
	state := NewSupervisorState("test brief")

	insight := SubInsight{
		ID:            "insight-001",
		Topic:         "Test topic",
		Title:         "Test title",
		Finding:       "Test finding",
		Implication:   "Test implication",
		SourceURL:     "https://example.com",
		SourceContent: "Test content",
		Confidence:    0.8,
		Iteration:     1,
		ResearcherNum: 1,
		Timestamp:     time.Now(),
	}

	state.AddSubInsight(insight)

	if len(state.SubInsights) != 1 {
		t.Fatalf("SubInsights length = %d, want 1", len(state.SubInsights))
	}
	if state.SubInsights[0].ID != "insight-001" {
		t.Errorf("Insight ID = %q, want %q", state.SubInsights[0].ID, "insight-001")
	}
}

func TestSupervisorState_AddSubInsights(t *testing.T) {
	state := NewSupervisorState("test brief")

	insights := []SubInsight{
		{ID: "insight-001", Finding: "Finding 1"},
		{ID: "insight-002", Finding: "Finding 2"},
		{ID: "insight-003", Finding: "Finding 3"},
	}

	state.AddSubInsights(insights)

	if len(state.SubInsights) != 3 {
		t.Fatalf("SubInsights length = %d, want 3", len(state.SubInsights))
	}

	// Add more insights
	state.AddSubInsights([]SubInsight{{ID: "insight-004", Finding: "Finding 4"}})

	if len(state.SubInsights) != 4 {
		t.Fatalf("SubInsights length = %d, want 4", len(state.SubInsights))
	}
}

func TestSupervisorState_GetSubInsights(t *testing.T) {
	state := NewSupervisorState("test brief")

	insights := []SubInsight{
		{ID: "insight-001"},
		{ID: "insight-002"},
	}
	state.AddSubInsights(insights)

	got := state.GetSubInsights()

	if len(got) != 2 {
		t.Fatalf("GetSubInsights length = %d, want 2", len(got))
	}
	if got[0].ID != "insight-001" || got[1].ID != "insight-002" {
		t.Error("GetSubInsights returned wrong insights")
	}
}

func TestSupervisorState_VisitedURLs(t *testing.T) {
	state := NewSupervisorState("test brief")

	// Test AddVisitedURL
	state.AddVisitedURL("https://example.com/1")
	state.AddVisitedURL("https://example.com/2")

	if !state.IsURLVisited("https://example.com/1") {
		t.Error("URL should be marked as visited")
	}
	if state.IsURLVisited("https://example.com/3") {
		t.Error("URL should not be marked as visited")
	}

	// Test AddVisitedURLs
	state.AddVisitedURLs([]string{"https://example.com/3", "https://example.com/4"})

	if !state.IsURLVisited("https://example.com/3") {
		t.Error("URL should be marked as visited after AddVisitedURLs")
	}

	// Test GetVisitedURLs
	urls := state.GetVisitedURLs()
	if len(urls) != 4 {
		t.Errorf("GetVisitedURLs length = %d, want 4", len(urls))
	}
}

func TestSupervisorState_Notes(t *testing.T) {
	state := NewSupervisorState("test brief")

	state.AddNote("Note 1")
	state.AddNote("Note 2")
	state.AddRawNote("Raw note 1")

	if len(state.Notes) != 2 {
		t.Errorf("Notes length = %d, want 2", len(state.Notes))
	}
	if len(state.RawNotes) != 1 {
		t.Errorf("RawNotes length = %d, want 1", len(state.RawNotes))
	}
}

func TestSupervisorState_DraftReport(t *testing.T) {
	state := NewSupervisorState("test brief")

	state.UpdateDraft("Initial draft")
	if state.DraftReport != "Initial draft" {
		t.Errorf("DraftReport = %q, want %q", state.DraftReport, "Initial draft")
	}

	state.UpdateDraft("Updated draft")
	if state.DraftReport != "Updated draft" {
		t.Errorf("DraftReport = %q, want %q", state.DraftReport, "Updated draft")
	}
}

func TestSupervisorState_Iterations(t *testing.T) {
	state := NewSupervisorState("test brief")

	if state.Iterations != 0 {
		t.Errorf("Iterations = %d, want 0", state.Iterations)
	}

	state.IncrementIteration()
	state.IncrementIteration()

	if state.Iterations != 2 {
		t.Errorf("Iterations = %d, want 2", state.Iterations)
	}
}

func TestNewResearcherState(t *testing.T) {
	topic := "Test research topic"
	state := NewResearcherState(topic)

	if state.ResearchTopic != topic {
		t.Errorf("ResearchTopic = %q, want %q", state.ResearchTopic, topic)
	}
	if len(state.Messages) != 0 {
		t.Errorf("Messages should be empty, got %d", len(state.Messages))
	}
	if state.Iteration != 0 {
		t.Errorf("Iteration = %d, want 0", state.Iteration)
	}
}

func TestResearcherState_VisitedURLs(t *testing.T) {
	state := NewResearcherState("test topic")

	state.AddVisitedURL("https://example.com/1")
	state.AddVisitedURL("https://example.com/2")

	urls := state.GetVisitedURLs()
	if len(urls) != 2 {
		t.Errorf("GetVisitedURLs length = %d, want 2", len(urls))
	}
}

func TestExtractURLs(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    int
	}{
		{
			name:    "single URL",
			content: "Check out https://example.com for more info",
			want:    1,
		},
		{
			name:    "multiple URLs",
			content: "See https://example.com and http://test.org for details",
			want:    2,
		},
		{
			name:    "duplicate URLs",
			content: "https://example.com is great. Visit https://example.com again.",
			want:    1, // Should deduplicate
		},
		{
			name:    "URLs with trailing punctuation",
			content: "Check https://example.com. Also see https://test.org!",
			want:    2,
		},
		{
			name:    "no URLs",
			content: "This text has no URLs",
			want:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			urls := ExtractURLs(tt.content)
			if len(urls) != tt.want {
				t.Errorf("ExtractURLs() returned %d URLs, want %d", len(urls), tt.want)
			}
		})
	}
}

func TestSubInsight_Fields(t *testing.T) {
	now := time.Now()
	insight := SubInsight{
		ID:            "insight-001",
		Topic:         "AI Research",
		Title:         "Key Finding",
		Finding:       "AI improves efficiency",
		Implication:   "Companies should adopt AI",
		SourceURL:     "https://example.com/article",
		SourceContent: "Full article content here",
		Confidence:    0.95,
		Iteration:     2,
		ResearcherNum: 3,
		Timestamp:     now,
	}

	// Verify all fields are accessible and correct
	if insight.ID != "insight-001" {
		t.Errorf("ID = %q, want %q", insight.ID, "insight-001")
	}
	if insight.Confidence != 0.95 {
		t.Errorf("Confidence = %f, want %f", insight.Confidence, 0.95)
	}
	if insight.ResearcherNum != 3 {
		t.Errorf("ResearcherNum = %d, want %d", insight.ResearcherNum, 3)
	}
	if !insight.Timestamp.Equal(now) {
		t.Errorf("Timestamp mismatch")
	}
}
