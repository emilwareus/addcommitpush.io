package agents

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/planning"
	"go-research/internal/session"
)

// SynthesisAgent generates structured reports with proper citations from research findings.
type SynthesisAgent struct {
	client llm.ChatClient
	bus    *events.Bus
	model  string
}

// NewSynthesisAgent creates a new synthesis agent with the given LLM client.
func NewSynthesisAgent(client llm.ChatClient) *SynthesisAgent {
	return &SynthesisAgent{client: client, model: client.GetModel()}
}

// NewSynthesisAgentWithBus creates a new synthesis agent with event bus for progress reporting.
func NewSynthesisAgentWithBus(client llm.ChatClient, bus *events.Bus) *SynthesisAgent {
	return &SynthesisAgent{client: client, bus: bus, model: client.GetModel()}
}

// Report represents the final synthesized research report.
type Report struct {
	Title       string
	Summary     string
	Outline     []Section
	FullContent string
	Citations   []Citation
	Cost        session.CostBreakdown
}

// Section represents a section of the report.
type Section struct {
	Heading string
	Content string
	Sources []string
}

// Citation represents a cited source in the report.
type Citation struct {
	ID    int
	URL   string
	Title string
	Used  []string // Where this citation is used
}

// Synthesize generates a comprehensive research report from the research plan and findings.
func (s *SynthesisAgent) Synthesize(ctx context.Context, plan *planning.ResearchPlan, searchResults map[string]*SearchResult, analysisResult *AnalysisResult) (*Report, error) {
	var totalCost session.CostBreakdown

	// 1. Generate outline based on perspectives
	outline, outlineCost, err := s.generateOutline(ctx, plan, searchResults)
	if err != nil {
		return nil, fmt.Errorf("outline generation: %w", err)
	}
	totalCost.Add(outlineCost)

	// 2. Write each section
	sections, sectionCost, err := s.writeSections(ctx, plan.Topic, outline, searchResults, analysisResult)
	if err != nil {
		return nil, fmt.Errorf("section writing: %w", err)
	}
	totalCost.Add(sectionCost)

	// 3. Add citations
	citations := s.extractCitations(searchResults)

	// 4. Compile final report
	report := s.compileReport(plan.Topic, sections, citations, analysisResult, totalCost)

	return report, nil
}

// generateOutline creates a logical outline for the report based on perspectives and findings.
func (s *SynthesisAgent) generateOutline(ctx context.Context, plan *planning.ResearchPlan, searchResults map[string]*SearchResult) ([]string, session.CostBreakdown, error) {
	var perspectiveInfo strings.Builder
	for _, p := range plan.Perspectives {
		perspectiveInfo.WriteString(fmt.Sprintf("- %s: %s\n", p.Name, p.Focus))
	}

	// Summarize available facts
	var factCount int
	for _, sr := range searchResults {
		factCount += len(sr.Facts)
	}

	prompt := fmt.Sprintf(`Create an outline for a comprehensive research report on: %s

Perspectives covered:
%s

Total facts gathered: %d

Generate a logical outline with 4-6 main sections.
Return JSON array of section headings:
["Introduction", "Section 2", "Section 3", ...]`, plan.Topic, perspectiveInfo.String(), factCount)

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return defaultOutline(), session.CostBreakdown{}, nil
	}

	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	if len(resp.Choices) == 0 {
		return defaultOutline(), cost, nil
	}

	outline := parseStringArray(resp.Choices[0].Message.Content)
	if len(outline) == 0 {
		return defaultOutline(), cost, nil
	}

	return outline, cost, nil
}

// writeSections generates content for each section of the report.
func (s *SynthesisAgent) writeSections(ctx context.Context, topic string, outline []string, searchResults map[string]*SearchResult, analysisResult *AnalysisResult) ([]Section, session.CostBreakdown, error) {
	// Gather all validated facts
	var allFacts []ValidatedFact
	if analysisResult != nil {
		allFacts = analysisResult.ValidatedFacts
	}

	// Also gather raw facts if validation is empty
	if len(allFacts) == 0 {
		for _, sr := range searchResults {
			for _, f := range sr.Facts {
				allFacts = append(allFacts, ValidatedFact{Fact: f, ValidationScore: 0.5})
			}
		}
	}

	sections := make([]Section, len(outline))
	var totalCost session.CostBreakdown
	for i, heading := range outline {
		// Check for cancellation before each section
		select {
		case <-ctx.Done():
			return sections, totalCost, ctx.Err()
		default:
		}

		// Emit progress
		if s.bus != nil {
			s.bus.Publish(events.Event{
				Type:      events.EventSynthesisProgress,
				Timestamp: time.Now(),
				Data: map[string]interface{}{
					"section": i + 1,
					"total":   len(outline),
					"heading": heading,
					"message": fmt.Sprintf("Writing section %d/%d: %s...", i+1, len(outline), heading),
				},
			})
		}

		var factsText strings.Builder
		for _, f := range allFacts {
			factsText.WriteString(fmt.Sprintf("- %s [source: %s, confidence: %.1f]\n", f.Content, f.Source, f.ValidationScore))
		}

		prompt := fmt.Sprintf(`Write the "%s" section of a research report on "%s".

Available facts:
%s

Write 2-4 paragraphs. Reference sources inline using [source URL].
Focus on validated, high-confidence facts.
Write in a clear, professional tone suitable for a research report.`, heading, topic, factsText.String())

		resp, err := s.client.Chat(ctx, []llm.Message{
			{Role: "user", Content: prompt},
		})
		if err != nil {
			// Check if cancelled
			if ctx.Err() != nil {
				return sections, totalCost, ctx.Err()
			}
			sections[i] = Section{Heading: heading, Content: "Content could not be generated."}
			continue
		}

		sectionCost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
		totalCost.Add(sectionCost)

		if len(resp.Choices) == 0 {
			sections[i] = Section{Heading: heading, Content: "Content could not be generated."}
			continue
		}

		sections[i] = Section{
			Heading: heading,
			Content: resp.Choices[0].Message.Content,
		}
	}

	return sections, totalCost, nil
}

// extractCitations collects all unique sources from search results and creates citations.
func (s *SynthesisAgent) extractCitations(searchResults map[string]*SearchResult) []Citation {
	urlSet := make(map[string]bool)
	for _, sr := range searchResults {
		for _, source := range sr.Sources {
			urlSet[source] = true
		}
	}

	citations := make([]Citation, 0, len(urlSet))
	id := 1
	for url := range urlSet {
		citations = append(citations, Citation{
			ID:  id,
			URL: url,
		})
		id++
	}
	return citations
}

// compileReport assembles all sections and citations into a final report.
func (s *SynthesisAgent) compileReport(topic string, sections []Section, citations []Citation, analysisResult *AnalysisResult, cost session.CostBreakdown) *Report {
	var fullContent strings.Builder

	// Title
	fullContent.WriteString(fmt.Sprintf("# %s\n\n", topic))

	// Summary section
	fullContent.WriteString("## Executive Summary\n\n")
	if len(sections) > 0 {
		// Use first section intro as summary
		intro := sections[0].Content
		if len(intro) > 500 {
			intro = intro[:500] + "..."
		}
		fullContent.WriteString(intro + "\n\n")
	}

	// Main sections
	for _, section := range sections {
		fullContent.WriteString(fmt.Sprintf("## %s\n\n%s\n\n", section.Heading, section.Content))
	}

	// Contradictions/caveats if any
	if analysisResult != nil && len(analysisResult.Contradictions) > 0 {
		fullContent.WriteString("## Notes on Conflicting Information\n\n")
		for _, c := range analysisResult.Contradictions {
			fullContent.WriteString(fmt.Sprintf("- **%s**: \"%s\" vs \"%s\"\n", c.Nature, c.Claim1, c.Claim2))
		}
		fullContent.WriteString("\n")
	}

	// References
	fullContent.WriteString("## Sources\n\n")
	for _, c := range citations {
		fullContent.WriteString(fmt.Sprintf("%d. %s\n", c.ID, c.URL))
	}

	return &Report{
		Title:       topic,
		Outline:     sections,
		FullContent: fullContent.String(),
		Citations:   citations,
		Cost:        cost,
	}
}

// defaultOutline returns a standard report outline when LLM generation fails.
func defaultOutline() []string {
	return []string{
		"Introduction",
		"Key Findings",
		"Analysis",
		"Implications",
		"Conclusion",
	}
}
