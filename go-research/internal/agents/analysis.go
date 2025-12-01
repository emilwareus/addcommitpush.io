package agents

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/llm"
	"go-research/internal/session"
)

// AnalysisAgent cross-validates facts and identifies contradictions and knowledge gaps.
type AnalysisAgent struct {
	client llm.ChatClient
	model  string
}

// NewAnalysisAgent creates a new analysis agent with the given LLM client.
func NewAnalysisAgent(client llm.ChatClient) *AnalysisAgent {
	return &AnalysisAgent{
		client: client,
		model:  client.GetModel(),
	}
}

// AnalysisResult contains the output of the analysis process.
type AnalysisResult struct {
	ValidatedFacts []ValidatedFact
	Contradictions []Contradiction
	KnowledgeGaps  []KnowledgeGap
	SourceQuality  map[string]float64
	Cost           session.CostBreakdown
}

// ValidatedFact is a fact with cross-validation information.
type ValidatedFact struct {
	Fact
	ValidationScore float64  `json:"validation_score"`
	CorroboratedBy  []string `json:"corroborated_by"`
}

// Contradiction represents conflicting claims from different sources.
type Contradiction struct {
	Claim1  string `json:"claim1"`
	Source1 string `json:"source1"`
	Claim2  string `json:"claim2"`
	Source2 string `json:"source2"`
	Nature  string `json:"nature"` // direct, nuanced, scope
}

// KnowledgeGap represents missing information with suggested follow-up queries.
type KnowledgeGap struct {
	Description      string   `json:"description"`
	Importance       float64  `json:"importance"`
	SuggestedQueries []string `json:"suggested_queries"`
}

// Analyze performs cross-validation, contradiction detection, and gap identification.
func (a *AnalysisAgent) Analyze(ctx context.Context, topic string, facts []Fact, expectedCoverage []string) (*AnalysisResult, error) {
	result := &AnalysisResult{
		SourceQuality: make(map[string]float64),
	}

	var totalCost session.CostBreakdown

	// 1. Cross-validate facts
	validatedFacts, cost, err := a.crossValidate(ctx, facts)
	if err != nil {
		return nil, fmt.Errorf("cross-validation: %w", err)
	}
	result.ValidatedFacts = validatedFacts
	totalCost.Add(cost)

	// 2. Detect contradictions
	contradictions, cost, err := a.detectContradictions(ctx, facts)
	if err != nil {
		return nil, fmt.Errorf("contradiction detection: %w", err)
	}
	result.Contradictions = contradictions
	totalCost.Add(cost)

	// 3. Identify knowledge gaps
	gaps, cost, err := a.identifyKnowledgeGaps(ctx, topic, facts, expectedCoverage)
	if err != nil {
		return nil, fmt.Errorf("gap identification: %w", err)
	}
	result.KnowledgeGaps = gaps
	totalCost.Add(cost)

	// 4. Assess source quality
	result.SourceQuality = a.assessSourceQuality(facts)
	result.Cost = totalCost

	return result, nil
}

// crossValidate analyzes facts for mutual corroboration and assigns validation scores.
func (a *AnalysisAgent) crossValidate(ctx context.Context, facts []Fact) ([]ValidatedFact, session.CostBreakdown, error) {
	if len(facts) == 0 {
		return nil, session.CostBreakdown{}, nil
	}

	var factsText strings.Builder
	for i, f := range facts {
		factsText.WriteString(fmt.Sprintf("%d. [%s] %s\n", i+1, f.Source, f.Content))
	}

	prompt := fmt.Sprintf(`Cross-validate these facts. For each fact, determine:
1. Validation score (0-1): How well-supported is this claim?
2. Corroborating facts: Which other facts support this one?

Facts:
%s

Return JSON array:
[
  {
    "content": "original fact",
    "source": "original source",
    "confidence": 0.8,
    "validation_score": 0.8,
    "corroborated_by": ["source1", "source2"]
  }
]

Include all facts in the output.`, factsText.String())

	resp, err := a.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, session.CostBreakdown{}, err
	}

	if len(resp.Choices) == 0 {
		return nil, session.NewCostBreakdown(a.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens), nil
	}

	cost := session.NewCostBreakdown(a.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	return parseValidatedFacts(resp.Choices[0].Message.Content), cost, nil
}

// detectContradictions finds conflicting claims between facts.
func (a *AnalysisAgent) detectContradictions(ctx context.Context, facts []Fact) ([]Contradiction, session.CostBreakdown, error) {
	if len(facts) < 2 {
		return nil, session.CostBreakdown{}, nil
	}

	var factsText strings.Builder
	for i, f := range facts {
		factsText.WriteString(fmt.Sprintf("%d. [%s] %s\n", i+1, f.Source, f.Content))
	}

	prompt := fmt.Sprintf(`Identify any contradictions between these facts:

%s

Look for:
- Direct contradictions (opposite claims)
- Nuanced contradictions (different implications)
- Scope contradictions (claims that don't match in scope)

Return JSON array (empty if none found):
[
  {
    "claim1": "first claim",
    "source1": "source of first",
    "claim2": "contradicting claim",
    "source2": "source of second",
    "nature": "direct|nuanced|scope"
  }
]`, factsText.String())

	resp, err := a.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, session.CostBreakdown{}, err
	}

	if len(resp.Choices) == 0 {
		return nil, session.NewCostBreakdown(a.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens), nil
	}

	cost := session.NewCostBreakdown(a.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	return parseContradictions(resp.Choices[0].Message.Content), cost, nil
}

// identifyKnowledgeGaps finds important areas not yet covered by the gathered facts.
func (a *AnalysisAgent) identifyKnowledgeGaps(ctx context.Context, topic string, facts []Fact, expectedCoverage []string) ([]KnowledgeGap, session.CostBreakdown, error) {
	var factsText strings.Builder
	for _, f := range facts {
		factsText.WriteString(fmt.Sprintf("- %s\n", f.Content))
	}

	var coverageText string
	if len(expectedCoverage) > 0 {
		coverageText = strings.Join(expectedCoverage, "\n- ")
	} else {
		coverageText = "General comprehensive coverage of the topic"
	}

	prompt := fmt.Sprintf(`Topic: %s

Expected coverage areas:
- %s

Facts gathered:
%s

Identify knowledge gaps - important areas not yet covered.

Return JSON array:
[
  {
    "description": "what's missing",
    "importance": 0.8,
    "suggested_queries": ["search query 1", "search query 2"]
  }
]
Return empty array if coverage is sufficient.`, topic, coverageText, factsText.String())

	resp, err := a.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, session.CostBreakdown{}, err
	}

	if len(resp.Choices) == 0 {
		return nil, session.NewCostBreakdown(a.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens), nil
	}

	cost := session.NewCostBreakdown(a.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	return parseKnowledgeGaps(resp.Choices[0].Message.Content), cost, nil
}

// assessSourceQuality computes quality scores for sources based on citation frequency and confidence.
func (a *AnalysisAgent) assessSourceQuality(facts []Fact) map[string]float64 {
	quality := make(map[string]float64)
	sourceCounts := make(map[string]int)
	sourceConfidenceSum := make(map[string]float64)

	for _, f := range facts {
		if f.Source == "" || f.Source == "unknown" {
			continue
		}
		sourceCounts[f.Source]++
		sourceConfidenceSum[f.Source] += f.Confidence
	}

	for source, count := range sourceCounts {
		// Average confidence for this source
		avgConfidence := sourceConfidenceSum[source] / float64(count)
		// Quality is weighted by both average confidence and citation count
		// More citations = more reliable
		citationBonus := minFloat(float64(count)*0.1, 0.2)
		quality[source] = minFloat(avgConfidence+citationBonus, 1.0)
	}

	return quality
}

// minFloat returns the smaller of two float64 values.
func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// parseValidatedFacts extracts validated facts from LLM response.
func parseValidatedFacts(content string) []ValidatedFact {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil
	}
	var facts []ValidatedFact
	if err := json.Unmarshal([]byte(content[start:end]), &facts); err != nil {
		return nil
	}
	return facts
}

// parseContradictions extracts contradictions from LLM response.
func parseContradictions(content string) []Contradiction {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil
	}
	var contradictions []Contradiction
	if err := json.Unmarshal([]byte(content[start:end]), &contradictions); err != nil {
		return nil
	}
	return contradictions
}

// parseKnowledgeGaps extracts knowledge gaps from LLM response.
func parseKnowledgeGaps(content string) []KnowledgeGap {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil
	}
	var gaps []KnowledgeGap
	if err := json.Unmarshal([]byte(content[start:end]), &gaps); err != nil {
		return nil
	}
	return gaps
}
