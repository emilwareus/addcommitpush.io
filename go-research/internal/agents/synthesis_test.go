package agents

import (
	"context"
	"testing"

	"go-research/internal/planning"
	"go-research/internal/session"
)

func TestNewSynthesisAgent(t *testing.T) {
	client := &mockChatClient{}
	agent := NewSynthesisAgent(client)

	if agent == nil {
		t.Fatal("expected agent to be created")
	}
	if agent.client != client {
		t.Error("expected client to be set")
	}
}

func TestSynthesisAgentGenerateOutline(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`["Introduction", "Technical Overview", "Use Cases", "Challenges", "Conclusion"]`,
		},
	}

	agent := NewSynthesisAgent(mockClient)

	plan := &planning.ResearchPlan{
		Topic: "Test Topic",
		Perspectives: []planning.Perspective{
			{Name: "Technical Expert", Focus: "Technical details"},
			{Name: "User Advocate", Focus: "Usability"},
		},
	}

	searchResults := map[string]*SearchResult{
		"search_0": {
			Facts: []Fact{
				{Content: "Fact 1", Source: "source1", Confidence: 0.9},
				{Content: "Fact 2", Source: "source2", Confidence: 0.8},
			},
		},
	}

	outline, cost, err := agent.generateOutline(context.Background(), plan, searchResults)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(outline) != 5 {
		t.Errorf("expected 5 sections in outline, got %d", len(outline))
	}
	if outline[0] != "Introduction" {
		t.Errorf("expected 'Introduction', got '%s'", outline[0])
	}
	if cost.TotalTokens == 0 {
		t.Error("expected outline generation to produce cost")
	}
}

func TestSynthesisAgentGenerateOutlineFallback(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			"invalid json response",
		},
	}

	agent := NewSynthesisAgent(mockClient)

	plan := &planning.ResearchPlan{
		Topic:        "Test Topic",
		Perspectives: []planning.Perspective{},
	}

	outline, cost, err := agent.generateOutline(context.Background(), plan, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should fall back to default outline
	if len(outline) != 5 {
		t.Errorf("expected 5 sections in default outline, got %d", len(outline))
	}
	if outline[0] != "Introduction" {
		t.Errorf("expected 'Introduction', got '%s'", outline[0])
	}
	if cost.TotalTokens == 0 {
		t.Error("expected fallback outline to still record cost")
	}
}

func TestSynthesisAgentWriteSections(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			"This is the introduction section content.",
			"These are the key findings from our research.",
			"Here is the analysis section.",
		},
	}

	agent := NewSynthesisAgent(mockClient)

	outline := []string{"Introduction", "Key Findings", "Analysis"}

	searchResults := map[string]*SearchResult{
		"search_0": {
			Facts: []Fact{
				{Content: "Fact 1", Source: "source1", Confidence: 0.9},
			},
		},
	}

	analysisResult := &AnalysisResult{
		ValidatedFacts: []ValidatedFact{
			{
				Fact:            Fact{Content: "Validated fact", Source: "source1", Confidence: 0.9},
				ValidationScore: 0.85,
			},
		},
	}

	sections, cost, err := agent.writeSections(context.Background(), "Test Topic", outline, searchResults, analysisResult)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(sections) != 3 {
		t.Errorf("expected 3 sections, got %d", len(sections))
	}

	if sections[0].Heading != "Introduction" {
		t.Errorf("expected heading 'Introduction', got '%s'", sections[0].Heading)
	}

	if sections[0].Content != "This is the introduction section content." {
		t.Errorf("unexpected content: '%s'", sections[0].Content)
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost for section writing")
	}
}

func TestSynthesisAgentWriteSectionsWithRawFacts(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			"Section content using raw facts.",
		},
	}

	agent := NewSynthesisAgent(mockClient)

	outline := []string{"Introduction"}

	searchResults := map[string]*SearchResult{
		"search_0": {
			Facts: []Fact{
				{Content: "Raw fact", Source: "source1", Confidence: 0.7},
			},
		},
	}

	// No validated facts, should use raw facts
	analysisResult := &AnalysisResult{
		ValidatedFacts: []ValidatedFact{},
	}

	sections, cost, err := agent.writeSections(context.Background(), "Test Topic", outline, searchResults, analysisResult)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(sections) != 1 {
		t.Errorf("expected 1 section, got %d", len(sections))
	}
	if cost.TotalTokens == 0 {
		t.Error("expected section writing to record cost")
	}
}

func TestSynthesisAgentExtractCitations(t *testing.T) {
	agent := &SynthesisAgent{}

	searchResults := map[string]*SearchResult{
		"search_0": {
			Sources: []string{"https://example.com/1", "https://example.com/2"},
		},
		"search_1": {
			Sources: []string{"https://example.com/2", "https://example.com/3"}, // Duplicate intentionally
		},
	}

	citations := agent.extractCitations(searchResults)

	if len(citations) != 3 {
		t.Errorf("expected 3 unique citations, got %d", len(citations))
	}

	// Check that IDs are assigned
	for _, c := range citations {
		if c.ID <= 0 {
			t.Error("expected positive citation ID")
		}
		if c.URL == "" {
			t.Error("expected URL to be set")
		}
	}
}

func TestSynthesisAgentExtractCitationsEmpty(t *testing.T) {
	agent := &SynthesisAgent{}

	citations := agent.extractCitations(map[string]*SearchResult{})

	if len(citations) != 0 {
		t.Errorf("expected 0 citations, got %d", len(citations))
	}
}

func TestSynthesisAgentCompileReport(t *testing.T) {
	agent := &SynthesisAgent{}

	sections := []Section{
		{Heading: "Introduction", Content: "Intro content here."},
		{Heading: "Analysis", Content: "Analysis content here."},
	}

	citations := []Citation{
		{ID: 1, URL: "https://example.com/1"},
		{ID: 2, URL: "https://example.com/2"},
	}

	analysisResult := &AnalysisResult{
		Contradictions: []Contradiction{
			{
				Claim1:  "Claim A",
				Source1: "source1",
				Claim2:  "Claim B",
				Source2: "source2",
				Nature:  "direct",
			},
		},
	}

	report := agent.compileReport("Test Topic", sections, citations, analysisResult, session.CostBreakdown{TotalCost: 1})

	if report == nil {
		t.Fatal("expected report, got nil")
	}

	if report.Title != "Test Topic" {
		t.Errorf("expected title 'Test Topic', got '%s'", report.Title)
	}

	if len(report.Outline) != 2 {
		t.Errorf("expected 2 sections in outline, got %d", len(report.Outline))
	}

	if len(report.Citations) != 2 {
		t.Errorf("expected 2 citations, got %d", len(report.Citations))
	}

	// Check full content includes key parts
	if report.FullContent == "" {
		t.Error("expected FullContent to be populated")
	}

	// Should contain title
	if !containsString(report.FullContent, "# Test Topic") {
		t.Error("expected FullContent to contain title")
	}

	// Should contain section headings
	if !containsString(report.FullContent, "## Introduction") {
		t.Error("expected FullContent to contain Introduction heading")
	}

	// Should contain contradictions section
	if !containsString(report.FullContent, "## Notes on Conflicting Information") {
		t.Error("expected FullContent to contain contradictions section")
	}

	// Should contain sources section
	if !containsString(report.FullContent, "## Sources") {
		t.Error("expected FullContent to contain Sources section")
	}
}

func TestSynthesisAgentCompileReportNoContradictions(t *testing.T) {
	agent := &SynthesisAgent{}

	sections := []Section{
		{Heading: "Introduction", Content: "Intro content."},
	}

	citations := []Citation{}

	analysisResult := &AnalysisResult{
		Contradictions: []Contradiction{},
	}

	report := agent.compileReport("Test Topic", sections, citations, analysisResult, session.CostBreakdown{})

	// Should NOT contain contradictions section
	if containsString(report.FullContent, "## Notes on Conflicting Information") {
		t.Error("did not expect FullContent to contain contradictions section when empty")
	}
}

func TestSynthesisAgentCompileReportNilAnalysis(t *testing.T) {
	agent := &SynthesisAgent{}

	sections := []Section{
		{Heading: "Introduction", Content: "Intro content."},
	}

	citations := []Citation{}

	// nil analysis result should be handled gracefully
	report := agent.compileReport("Test Topic", sections, citations, nil, session.CostBreakdown{})

	if report == nil {
		t.Fatal("expected report, got nil")
	}
}

func TestSynthesisAgentFullSynthesize(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			// Outline generation
			`["Introduction", "Key Findings", "Conclusion"]`,
			// Section writing (3 sections)
			"Introduction section content.",
			"Key findings section content.",
			"Conclusion section content.",
		},
	}

	agent := NewSynthesisAgent(mockClient)

	plan := &planning.ResearchPlan{
		Topic: "Deep Research Test",
		Perspectives: []planning.Perspective{
			{Name: "Expert", Focus: "Technical"},
		},
	}

	searchResults := map[string]*SearchResult{
		"search_0": {
			Facts: []Fact{
				{Content: "Test fact", Source: "https://example.com", Confidence: 0.9},
			},
			Sources: []string{"https://example.com"},
		},
	}

	analysisResult := &AnalysisResult{
		ValidatedFacts: []ValidatedFact{
			{
				Fact:            Fact{Content: "Validated fact", Source: "https://example.com", Confidence: 0.9},
				ValidationScore: 0.85,
			},
		},
		Contradictions: []Contradiction{},
		KnowledgeGaps:  []KnowledgeGap{},
	}

	report, err := agent.Synthesize(context.Background(), plan, searchResults, analysisResult)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if report == nil {
		t.Fatal("expected report, got nil")
	}

	if report.Title != "Deep Research Test" {
		t.Errorf("expected title 'Deep Research Test', got '%s'", report.Title)
	}

	if len(report.Outline) != 3 {
		t.Errorf("expected 3 sections, got %d", len(report.Outline))
	}

	if len(report.Citations) != 1 {
		t.Errorf("expected 1 citation, got %d", len(report.Citations))
	}
	if report.Cost.TotalTokens == 0 {
		t.Error("expected report to include synthesis cost")
	}
}

func TestDefaultOutline(t *testing.T) {
	outline := defaultOutline()

	if len(outline) != 5 {
		t.Errorf("expected 5 sections, got %d", len(outline))
	}

	expected := []string{"Introduction", "Key Findings", "Analysis", "Implications", "Conclusion"}
	for i, section := range expected {
		if outline[i] != section {
			t.Errorf("expected '%s' at position %d, got '%s'", section, i, outline[i])
		}
	}
}

// containsString checks if haystack contains needle
func containsString(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (haystack == needle || len(haystack) > 0 && (containsStringHelper(haystack, needle)))
}

func containsStringHelper(haystack, needle string) bool {
	for i := 0; i <= len(haystack)-len(needle); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
