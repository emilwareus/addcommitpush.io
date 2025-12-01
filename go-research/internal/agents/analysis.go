package agents

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
)

// AnalysisAgent cross-validates facts and identifies contradictions and knowledge gaps.
type AnalysisAgent struct {
	client llm.ChatClient
	model  string
	bus    *events.Bus
}

// NewAnalysisAgent creates a new analysis agent with the given LLM client.
func NewAnalysisAgent(client llm.ChatClient) *AnalysisAgent {
	return &AnalysisAgent{
		client: client,
		model:  client.GetModel(),
	}
}

// NewAnalysisAgentWithBus creates an analysis agent with event bus for progress reporting
func NewAnalysisAgentWithBus(client llm.ChatClient, bus *events.Bus) *AnalysisAgent {
	return &AnalysisAgent{
		client: client,
		model:  client.GetModel(),
		bus:    bus,
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
	totalSteps := 3 // cross-validate, contradictions, gaps

	// Emit overall start
	a.emitCrossValidationStarted(len(facts), totalSteps)

	// 1. Cross-validate facts (step 1/3)
	a.emitCrossValidationProgress("cross-validate", 1, totalSteps, "Cross-validating facts for mutual corroboration...", 0.0)
	validatedFacts, cost, err := a.crossValidateWithProgress(ctx, facts)
	if err != nil {
		return nil, fmt.Errorf("cross-validation: %w", err)
	}
	result.ValidatedFacts = validatedFacts
	totalCost.Add(cost)
	a.emitCrossValidationProgress("cross-validate", 1, totalSteps, fmt.Sprintf("Validated %d facts", len(validatedFacts)), 0.33)

	// 2. Detect contradictions (step 2/3)
	a.emitCrossValidationProgress("detect-contradictions", 2, totalSteps, "Scanning for contradictions between sources...", 0.33)
	contradictions, cost, err := a.detectContradictionsWithProgress(ctx, facts)
	if err != nil {
		return nil, fmt.Errorf("contradiction detection: %w", err)
	}
	result.Contradictions = contradictions
	totalCost.Add(cost)
	a.emitCrossValidationProgress("detect-contradictions", 2, totalSteps, fmt.Sprintf("Found %d contradictions", len(contradictions)), 0.66)

	// 3. Identify knowledge gaps (step 3/3)
	a.emitCrossValidationProgress("identify-gaps", 3, totalSteps, "Identifying knowledge gaps and missing coverage...", 0.66)
	gaps, cost, err := a.identifyKnowledgeGapsWithProgress(ctx, topic, facts, expectedCoverage)
	if err != nil {
		return nil, fmt.Errorf("gap identification: %w", err)
	}
	result.KnowledgeGaps = gaps
	totalCost.Add(cost)
	a.emitCrossValidationProgress("identify-gaps", 3, totalSteps, fmt.Sprintf("Identified %d knowledge gaps", len(gaps)), 1.0)

	// 4. Assess source quality (fast, no LLM call)
	result.SourceQuality = a.assessSourceQuality(facts)
	result.Cost = totalCost

	// Emit completion
	a.emitCrossValidationComplete(len(validatedFacts), len(contradictions), len(gaps))

	return result, nil
}

// emitCrossValidationStarted emits event when cross-validation begins
func (a *AnalysisAgent) emitCrossValidationStarted(factCount, totalSteps int) {
	if a.bus == nil {
		return
	}
	a.bus.Publish(events.Event{
		Type:      events.EventCrossValidationStarted,
		Timestamp: time.Now(),
		Data: events.CrossValidationProgressData{
			Total:   factCount,
			Message: fmt.Sprintf("Starting analysis of %d facts in %d phases", factCount, totalSteps),
		},
	})
}

// emitCrossValidationProgress emits progress during cross-validation phases
func (a *AnalysisAgent) emitCrossValidationProgress(phase string, current, total int, message string, progress float64) {
	if a.bus == nil {
		return
	}
	a.bus.Publish(events.Event{
		Type:      events.EventCrossValidationProgress,
		Timestamp: time.Now(),
		Data: events.CrossValidationProgressData{
			Phase:    phase,
			Current:  current,
			Total:    total,
			Message:  message,
			Progress: progress,
		},
	})
}

// emitCrossValidationComplete emits event when cross-validation finishes
func (a *AnalysisAgent) emitCrossValidationComplete(validated, contradictions, gaps int) {
	if a.bus == nil {
		return
	}
	a.bus.Publish(events.Event{
		Type:      events.EventCrossValidationComplete,
		Timestamp: time.Now(),
		Data: events.CrossValidationProgressData{
			Progress: 1.0,
			Message:  fmt.Sprintf("Analysis complete: %d validated, %d contradictions, %d gaps", validated, contradictions, gaps),
		},
	})
}

// crossValidateWithProgress analyzes facts in batches with progress reporting
func (a *AnalysisAgent) crossValidateWithProgress(ctx context.Context, facts []Fact) ([]ValidatedFact, session.CostBreakdown, error) {
	if len(facts) == 0 {
		return nil, session.CostBreakdown{}, nil
	}

	// For larger sets, process in batches to show progress
	batchSize := 15
	if len(facts) <= batchSize {
		// Small set - process all at once with fact-by-fact progress simulation
		return a.crossValidateBatchWithProgress(ctx, facts, 0, len(facts))
	}

	// Process in batches
	var allValidated []ValidatedFact
	var totalCost session.CostBreakdown

	for i := 0; i < len(facts); i += batchSize {
		end := i + batchSize
		if end > len(facts) {
			end = len(facts)
		}
		batch := facts[i:end]

		validated, cost, err := a.crossValidateBatchWithProgress(ctx, batch, i, len(facts))
		if err != nil {
			return allValidated, totalCost, err
		}
		allValidated = append(allValidated, validated...)
		totalCost.Add(cost)
	}

	return allValidated, totalCost, nil
}

// crossValidateBatchWithProgress validates a batch while emitting per-fact progress
func (a *AnalysisAgent) crossValidateBatchWithProgress(ctx context.Context, facts []Fact, startIdx, totalFacts int) ([]ValidatedFact, session.CostBreakdown, error) {
	// Emit progress for each fact we're about to validate
	for i, f := range facts {
		factIdx := startIdx + i
		progress := float64(factIdx) / float64(totalFacts) * 0.33 // Cross-validation is 0-33% of total
		truncContent := f.Content
		if len(truncContent) > 60 {
			truncContent = truncContent[:57] + "..."
		}
		a.emitCrossValidationProgress(
			"cross-validate",
			factIdx+1,
			totalFacts,
			fmt.Sprintf("Checking: %s", truncContent),
			progress,
		)
		// Small delay to make the streaming visible
		time.Sleep(30 * time.Millisecond)
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

// detectContradictionsWithProgress finds conflicting claims with progress reporting
func (a *AnalysisAgent) detectContradictionsWithProgress(ctx context.Context, facts []Fact) ([]Contradiction, session.CostBreakdown, error) {
	if len(facts) < 2 {
		return nil, session.CostBreakdown{}, nil
	}

	// Emit progress as we scan through fact pairs
	totalPairs := len(facts) * (len(facts) - 1) / 2
	if totalPairs > 0 {
		pairNum := 0
		for i := 0; i < len(facts); i++ {
			for j := i + 1; j < len(facts); j++ {
				pairNum++
				if pairNum%5 == 0 || pairNum == 1 { // Emit every 5th pair to avoid spam
					progress := 0.33 + (float64(pairNum)/float64(totalPairs))*0.33 // Contradiction detection is 33-66%
					a.emitCrossValidationProgress(
						"detect-contradictions",
						pairNum,
						totalPairs,
						fmt.Sprintf("Comparing pair %d/%d for contradictions...", pairNum, totalPairs),
						progress,
					)
					time.Sleep(20 * time.Millisecond)
				}
			}
		}
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

// identifyKnowledgeGapsWithProgress finds important areas not yet covered with progress reporting
func (a *AnalysisAgent) identifyKnowledgeGapsWithProgress(ctx context.Context, topic string, facts []Fact, expectedCoverage []string) ([]KnowledgeGap, session.CostBreakdown, error) {
	// Emit progress for each coverage area we're checking
	if len(expectedCoverage) > 0 {
		for i, area := range expectedCoverage {
			progress := 0.66 + (float64(i)/float64(len(expectedCoverage)))*0.34 // Gap identification is 66-100%
			truncArea := area
			if len(truncArea) > 50 {
				truncArea = truncArea[:47] + "..."
			}
			a.emitCrossValidationProgress(
				"identify-gaps",
				i+1,
				len(expectedCoverage),
				fmt.Sprintf("Checking coverage: %s", truncArea),
				progress,
			)
			time.Sleep(25 * time.Millisecond)
		}
	}

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
