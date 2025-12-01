package agents

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/planning"
	"go-research/internal/session"
	"go-research/internal/tools"
)

// SearchAgent performs iterative search with gap analysis and follow-up query generation.
// Implements Search-R1 style iterative refinement.
type SearchAgent struct {
	client        llm.ChatClient
	tools         tools.ToolExecutor
	bus           *events.Bus
	maxIterations int
	model         string
}

// SearchConfig configures the search agent behavior.
type SearchConfig struct {
	MaxIterations int
}

// DefaultSearchConfig returns sensible defaults for search configuration.
func DefaultSearchConfig() SearchConfig {
	return SearchConfig{
		MaxIterations: 3,
	}
}

// NewSearchAgent creates a new search agent with the given dependencies.
func NewSearchAgent(client llm.ChatClient, toolExec tools.ToolExecutor, bus *events.Bus, cfg SearchConfig) *SearchAgent {
	if cfg.MaxIterations == 0 {
		cfg.MaxIterations = 3
	}
	return &SearchAgent{
		client:        client,
		tools:         toolExec,
		bus:           bus,
		maxIterations: cfg.MaxIterations,
		model:         client.GetModel(),
	}
}

// SearchState tracks the current state of an iterative search.
type SearchState struct {
	Goal        string
	Perspective *planning.Perspective
	Queries     []string
	Facts       []Fact
	Gaps        []string
	Sources     []string
	Iteration   int
}

// Fact represents a factual claim extracted from search results.
type Fact struct {
	Content    string  `json:"content"`
	Source     string  `json:"source"`
	Confidence float64 `json:"confidence"`
}

// SearchResult contains the output of a search operation.
type SearchResult struct {
	Facts   []Fact
	Sources []string
	Gaps    []string
	Cost    session.CostBreakdown
}

// Search performs iterative search from a given perspective until sufficient coverage.
func (s *SearchAgent) Search(ctx context.Context, goal string, perspective *planning.Perspective) (*SearchResult, error) {
	return s.SearchWithWorkerNum(ctx, goal, perspective, 0)
}

// SearchWithWorkerNum performs iterative search with a specific worker number for event emission.
func (s *SearchAgent) SearchWithWorkerNum(ctx context.Context, goal string, perspective *planning.Perspective, workerNum int) (*SearchResult, error) {
	state := &SearchState{
		Goal:        goal,
		Perspective: perspective,
		Facts:       []Fact{},
		Sources:     []string{},
	}

	var totalCost session.CostBreakdown

	// Generate initial queries from perspective
	initialQueries, cost := s.generateQueries(ctx, state)
	state.Queries = initialQueries
	totalCost.Add(cost)

	for state.Iteration < s.maxIterations {
		state.Iteration++

		// Emit progress event
		if s.bus != nil && workerNum > 0 {
			s.bus.Publish(events.Event{
				Type: events.EventWorkerProgress,
				Data: events.WorkerProgressData{
					WorkerNum: workerNum,
					Iteration: state.Iteration,
					Status:    "searching",
					Message:   fmt.Sprintf("Executing %d queries...", len(state.Queries)),
				},
			})
		}

		// Execute searches
		results := s.executeSearches(ctx, state.Queries)

		// Extract facts from results
		facts, sources, extractCost := s.extractFacts(ctx, results)
		totalCost.Add(extractCost)
		state.Facts = append(state.Facts, facts...)
		state.Sources = append(state.Sources, sources...)

		// Emit progress with fact count
		if s.bus != nil && workerNum > 0 {
			s.bus.Publish(events.Event{
				Type: events.EventWorkerProgress,
				Data: events.WorkerProgressData{
					WorkerNum: workerNum,
					Iteration: state.Iteration,
					Status:    "analyzing",
					Message:   fmt.Sprintf("Found %d facts, analyzing gaps...", len(state.Facts)),
				},
			})
		}

		// Identify knowledge gaps
		gaps, gapCost := s.identifyGaps(ctx, state)
		totalCost.Add(gapCost)
		state.Gaps = gaps

		// Check if sufficient coverage
		if len(gaps) == 0 || s.sufficientCoverage(state) {
			break
		}

		// Generate follow-up queries for gaps
		newQueries, queriesCost := s.generateGapQueries(ctx, gaps)
		totalCost.Add(queriesCost)
		state.Queries = newQueries
	}

	return &SearchResult{
		Facts:   state.Facts,
		Sources: dedupe(state.Sources),
		Gaps:    state.Gaps,
		Cost:    totalCost,
	}, nil
}

// generateQueries creates initial search queries based on the goal and perspective.
func (s *SearchAgent) generateQueries(ctx context.Context, state *SearchState) ([]string, session.CostBreakdown) {
	var questions string
	var perspectiveName, perspectiveFocus string

	if state.Perspective != nil {
		perspectiveName = state.Perspective.Name
		perspectiveFocus = state.Perspective.Focus
		questions = strings.Join(state.Perspective.Questions, "\n- ")
	} else {
		perspectiveName = "General Researcher"
		perspectiveFocus = "Comprehensive understanding"
		questions = state.Goal
	}

	prompt := fmt.Sprintf(`Generate 3-5 search queries to research: %s

Perspective: %s
Focus: %s
Key questions:
- %s

Return JSON array of search queries: ["query1", "query2", ...]`,
		state.Goal,
		perspectiveName,
		perspectiveFocus,
		questions)

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return []string{state.Goal}, session.CostBreakdown{} // Use goal as query on error
	}

	if len(resp.Choices) == 0 {
		return []string{state.Goal}, session.CostBreakdown{}
	}

	queries := parseStringArray(resp.Choices[0].Message.Content)
	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	if len(queries) == 0 {
		return []string{state.Goal}, cost
	}

	return queries, cost
}

// executeSearches runs searches for each query and collects results.
func (s *SearchAgent) executeSearches(ctx context.Context, queries []string) []string {
	var results []string
	for _, query := range queries {
		result, err := s.tools.Execute(ctx, "search", map[string]interface{}{
			"query": query,
			"count": float64(5),
		})
		if err != nil {
			continue
		}
		results = append(results, result)
	}
	return results
}

// extractFacts uses LLM to extract factual claims from search results.
func (s *SearchAgent) extractFacts(ctx context.Context, searchResults []string) ([]Fact, []string, session.CostBreakdown) {
	if len(searchResults) == 0 {
		return nil, nil, session.CostBreakdown{}
	}

	combined := strings.Join(searchResults, "\n---\n")

	prompt := fmt.Sprintf(`Extract factual claims from these search results:

%s

Return JSON array:
[
  {"content": "factual claim", "source": "URL if available", "confidence": 0.0-1.0}
]

Only include verifiable facts, not opinions. If no source URL is found, use "unknown" as source.`, combined)

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, nil, session.CostBreakdown{}
	}

	if len(resp.Choices) == 0 {
		return nil, nil, session.CostBreakdown{}
	}

	facts := parseFactsArray(resp.Choices[0].Message.Content)
	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	// Extract sources from results using the tools package helper
	sources := tools.ExtractURLs(combined)

	return facts, sources, cost
}

// identifyGaps analyzes gathered facts against the research goal to find knowledge gaps.
func (s *SearchAgent) identifyGaps(ctx context.Context, state *SearchState) ([]string, session.CostBreakdown) {
	if len(state.Facts) == 0 {
		return []string{"No facts gathered yet"}, session.CostBreakdown{}
	}

	var factsSummary strings.Builder
	for _, f := range state.Facts {
		factsSummary.WriteString(fmt.Sprintf("- %s\n", f.Content))
	}

	var questions string
	if state.Perspective != nil {
		questions = strings.Join(state.Perspective.Questions, "\n- ")
	} else {
		questions = state.Goal
	}

	prompt := fmt.Sprintf(`Research goal: %s

Questions to answer:
- %s

Facts gathered:
%s

Identify knowledge gaps - what important questions remain unanswered?
Return JSON array of gap descriptions: ["gap1", "gap2"]
Return empty array [] if no significant gaps.`, state.Goal, questions, factsSummary.String())

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, session.CostBreakdown{}
	}

	if len(resp.Choices) == 0 {
		return nil, session.CostBreakdown{}
	}

	gaps := parseStringArray(resp.Choices[0].Message.Content)
	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	return gaps, cost
}

// generateGapQueries creates search queries to fill identified knowledge gaps.
func (s *SearchAgent) generateGapQueries(ctx context.Context, gaps []string) ([]string, session.CostBreakdown) {
	if len(gaps) == 0 {
		return nil, session.CostBreakdown{}
	}

	prompt := fmt.Sprintf(`Generate search queries to fill these knowledge gaps:

Gaps:
- %s

Return JSON array of search queries: ["query1", "query2"]`, strings.Join(gaps, "\n- "))

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return gaps, session.CostBreakdown{} // Use gaps as queries directly on error
	}

	if len(resp.Choices) == 0 {
		return gaps, session.CostBreakdown{}
	}

	queries := parseStringArray(resp.Choices[0].Message.Content)
	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	if len(queries) == 0 {
		return gaps, cost
	}

	return queries, cost
}

// sufficientCoverage determines if we have enough facts and few enough gaps.
func (s *SearchAgent) sufficientCoverage(state *SearchState) bool {
	// Sufficient if we have at least 5 facts and less than 2 gaps
	return len(state.Facts) >= 5 && len(state.Gaps) < 2
}

// parseStringArray extracts a JSON string array from LLM response content.
func parseStringArray(content string) []string {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil
	}

	var arr []string
	if err := json.Unmarshal([]byte(content[start:end]), &arr); err != nil {
		return nil
	}
	return arr
}

// parseFactsArray extracts a JSON array of Facts from LLM response content.
func parseFactsArray(content string) []Fact {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil
	}

	var facts []Fact
	if err := json.Unmarshal([]byte(content[start:end]), &facts); err != nil {
		return nil
	}
	return facts
}

// dedupe removes duplicate strings from a slice while preserving order.
func dedupe(items []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(items))
	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}
