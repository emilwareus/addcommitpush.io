package agents

import (
	"context"
	"testing"
)

func TestNewAnalysisAgent(t *testing.T) {
	client := &mockChatClient{}
	agent := NewAnalysisAgent(client)

	if agent == nil {
		t.Fatal("expected agent to be created")
	}
	if agent.client != client {
		t.Error("expected client to be set")
	}
}

func TestAnalysisAgentCrossValidate(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`[
				{"content": "Fact 1", "source": "source1", "confidence": 0.9, "validation_score": 0.85, "corroborated_by": ["source2"]},
				{"content": "Fact 2", "source": "source2", "confidence": 0.8, "validation_score": 0.75, "corroborated_by": []}
			]`,
		},
	}

	agent := NewAnalysisAgent(mockClient)

	facts := []Fact{
		{Content: "Fact 1", Source: "source1", Confidence: 0.9},
		{Content: "Fact 2", Source: "source2", Confidence: 0.8},
	}

	validated, cost, err := agent.crossValidate(context.Background(), facts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(validated) != 2 {
		t.Errorf("expected 2 validated facts, got %d", len(validated))
	}
	if validated[0].ValidationScore != 0.85 {
		t.Errorf("expected validation score 0.85, got %f", validated[0].ValidationScore)
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost for cross-validation")
	}
}

func TestAnalysisAgentCrossValidateEmpty(t *testing.T) {
	mockClient := &mockChatClient{}
	agent := NewAnalysisAgent(mockClient)

	validated, cost, err := agent.crossValidate(context.Background(), []Fact{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if validated != nil {
		t.Errorf("expected nil for empty facts, got %v", validated)
	}
	if cost.TotalTokens != 0 {
		t.Errorf("expected zero cost for empty facts, got %d", cost.TotalTokens)
	}
}

func TestAnalysisAgentDetectContradictions(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`[
				{
					"claim1": "The sky is blue",
					"source1": "source1",
					"claim2": "The sky is green",
					"source2": "source2",
					"nature": "direct"
				}
			]`,
		},
	}

	agent := NewAnalysisAgent(mockClient)

	facts := []Fact{
		{Content: "The sky is blue", Source: "source1", Confidence: 0.9},
		{Content: "The sky is green", Source: "source2", Confidence: 0.7},
	}

	contradictions, cost, err := agent.detectContradictions(context.Background(), facts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(contradictions) != 1 {
		t.Errorf("expected 1 contradiction, got %d", len(contradictions))
	}
	if contradictions[0].Nature != "direct" {
		t.Errorf("expected nature 'direct', got '%s'", contradictions[0].Nature)
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost for contradiction detection")
	}
}

func TestAnalysisAgentDetectContradictionsTooFewFacts(t *testing.T) {
	mockClient := &mockChatClient{}
	agent := NewAnalysisAgent(mockClient)

	// With 0 or 1 facts, no contradictions possible
	contradictions, cost, err := agent.detectContradictions(context.Background(), []Fact{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if contradictions != nil {
		t.Errorf("expected nil for empty facts")
	}
	if cost.TotalTokens != 0 {
		t.Errorf("expected zero cost, got %d", cost.TotalTokens)
	}

	contradictions, cost, err = agent.detectContradictions(context.Background(), []Fact{{Content: "One fact"}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if contradictions != nil {
		t.Errorf("expected nil for single fact")
	}
	if cost.TotalTokens != 0 {
		t.Errorf("expected zero cost for single fact, got %d", cost.TotalTokens)
	}
}

func TestAnalysisAgentIdentifyKnowledgeGaps(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			`[
				{
					"description": "Missing information about performance metrics",
					"importance": 0.9,
					"suggested_queries": ["performance benchmarks", "speed comparison"]
				}
			]`,
		},
	}

	agent := NewAnalysisAgent(mockClient)

	facts := []Fact{
		{Content: "System uses Go", Source: "source1", Confidence: 0.9},
	}
	expectedCoverage := []string{"architecture", "performance", "scalability"}

	gaps, cost, err := agent.identifyKnowledgeGaps(context.Background(), "Go system", facts, expectedCoverage)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(gaps) != 1 {
		t.Errorf("expected 1 gap, got %d", len(gaps))
	}
	if gaps[0].Importance != 0.9 {
		t.Errorf("expected importance 0.9, got %f", gaps[0].Importance)
	}
	if len(gaps[0].SuggestedQueries) != 2 {
		t.Errorf("expected 2 suggested queries, got %d", len(gaps[0].SuggestedQueries))
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost for knowledge gap analysis")
	}
}

func TestAnalysisAgentIdentifyKnowledgeGapsNoExpectedCoverage(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{`[]`},
	}

	agent := NewAnalysisAgent(mockClient)

	gaps, cost, err := agent.identifyKnowledgeGaps(context.Background(), "topic", []Fact{}, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(gaps) != 0 {
		t.Errorf("expected 0 gaps, got %d", len(gaps))
	}
	if cost.TotalTokens == 0 {
		t.Error("expected cost even with empty coverage response")
	}
}

func TestAnalysisAgentAssessSourceQuality(t *testing.T) {
	agent := &AnalysisAgent{}

	facts := []Fact{
		{Content: "Fact 1", Source: "https://reliable.com", Confidence: 0.9},
		{Content: "Fact 2", Source: "https://reliable.com", Confidence: 0.8},
		{Content: "Fact 3", Source: "https://unreliable.com", Confidence: 0.5},
		{Content: "Fact 4", Source: "unknown", Confidence: 0.3}, // Should be skipped
		{Content: "Fact 5", Source: "", Confidence: 0.3},        // Should be skipped
	}

	quality := agent.assessSourceQuality(facts)

	if len(quality) != 2 {
		t.Errorf("expected 2 sources in quality map, got %d", len(quality))
	}

	// reliable.com: avg confidence = (0.9+0.8)/2 = 0.85, plus citation bonus = min(2*0.1, 0.2) = 0.2
	// Final = min(0.85 + 0.2, 1.0) = 1.0
	reliableQuality := quality["https://reliable.com"]
	if reliableQuality != 1.0 {
		t.Errorf("expected reliable.com quality 1.0, got %f", reliableQuality)
	}

	// unreliable.com: avg confidence = 0.5, plus citation bonus = min(1*0.1, 0.2) = 0.1
	// Final = 0.6
	unreliableQuality := quality["https://unreliable.com"]
	if unreliableQuality != 0.6 {
		t.Errorf("expected unreliable.com quality 0.6, got %f", unreliableQuality)
	}
}

func TestAnalysisAgentAssessSourceQualityEmpty(t *testing.T) {
	agent := &AnalysisAgent{}

	quality := agent.assessSourceQuality([]Fact{})

	if len(quality) != 0 {
		t.Errorf("expected empty quality map, got %d entries", len(quality))
	}
}

func TestAnalysisAgentFullAnalysis(t *testing.T) {
	mockClient := &mockChatClient{
		responses: []string{
			// Cross-validation response
			`[{"content": "Fact 1", "source": "source1", "confidence": 0.9, "validation_score": 0.85, "corroborated_by": []}]`,
			// Contradiction detection response
			`[]`,
			// Knowledge gap response
			`[]`,
		},
	}

	agent := NewAnalysisAgent(mockClient)

	facts := []Fact{
		{Content: "Fact 1", Source: "source1", Confidence: 0.9},
	}

	result, err := agent.Analyze(context.Background(), "test topic", facts, []string{"coverage area"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if len(result.ValidatedFacts) != 1 {
		t.Errorf("expected 1 validated fact, got %d", len(result.ValidatedFacts))
	}
	if len(result.Contradictions) != 0 {
		t.Errorf("expected 0 contradictions, got %d", len(result.Contradictions))
	}
	if len(result.KnowledgeGaps) != 0 {
		t.Errorf("expected 0 gaps, got %d", len(result.KnowledgeGaps))
	}
	if result.SourceQuality == nil {
		t.Error("expected SourceQuality map to be initialized")
	}
	if result.Cost.TotalTokens == 0 {
		t.Error("expected analysis result to include cost")
	}
}

func TestParseValidatedFacts(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedCount int
	}{
		{
			name:          "valid validated facts",
			input:         `[{"content": "fact1", "source": "src1", "confidence": 0.9, "validation_score": 0.8, "corroborated_by": ["src2"]}]`,
			expectedCount: 1,
		},
		{
			name:          "empty array",
			input:         `[]`,
			expectedCount: 0,
		},
		{
			name:          "no array",
			input:         `invalid`,
			expectedCount: 0,
		},
		{
			name:          "wrapped in text",
			input:         `Here are the results: [{"content": "fact1", "source": "src1", "confidence": 0.9, "validation_score": 0.8, "corroborated_by": []}]`,
			expectedCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseValidatedFacts(tt.input)
			if tt.expectedCount == 0 && len(result) != 0 {
				t.Errorf("expected empty, got %d items", len(result))
			}
			if tt.expectedCount > 0 && len(result) != tt.expectedCount {
				t.Errorf("expected %d facts, got %d", tt.expectedCount, len(result))
			}
		})
	}
}

func TestParseContradictions(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedCount int
	}{
		{
			name:          "valid contradiction",
			input:         `[{"claim1": "A", "source1": "s1", "claim2": "B", "source2": "s2", "nature": "direct"}]`,
			expectedCount: 1,
		},
		{
			name:          "empty array",
			input:         `[]`,
			expectedCount: 0,
		},
		{
			name:          "no array",
			input:         `invalid`,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseContradictions(tt.input)
			if tt.expectedCount == 0 && len(result) != 0 {
				t.Errorf("expected empty, got %d items", len(result))
			}
			if tt.expectedCount > 0 && len(result) != tt.expectedCount {
				t.Errorf("expected %d contradictions, got %d", tt.expectedCount, len(result))
			}
		})
	}
}

func TestParseKnowledgeGaps(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedCount int
	}{
		{
			name:          "valid gap",
			input:         `[{"description": "gap", "importance": 0.8, "suggested_queries": ["q1"]}]`,
			expectedCount: 1,
		},
		{
			name:          "empty array",
			input:         `[]`,
			expectedCount: 0,
		},
		{
			name:          "no array",
			input:         `invalid`,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseKnowledgeGaps(tt.input)
			if tt.expectedCount == 0 && len(result) != 0 {
				t.Errorf("expected empty, got %d items", len(result))
			}
			if tt.expectedCount > 0 && len(result) != tt.expectedCount {
				t.Errorf("expected %d gaps, got %d", tt.expectedCount, len(result))
			}
		})
	}
}

func TestMinFloat(t *testing.T) {
	tests := []struct {
		a, b, expected float64
	}{
		{0.5, 0.8, 0.5},
		{0.8, 0.5, 0.5},
		{0.5, 0.5, 0.5},
		{-0.1, 0.1, -0.1},
	}

	for _, tt := range tests {
		result := minFloat(tt.a, tt.b)
		if result != tt.expected {
			t.Errorf("minFloat(%f, %f) = %f, expected %f", tt.a, tt.b, result, tt.expected)
		}
	}
}
