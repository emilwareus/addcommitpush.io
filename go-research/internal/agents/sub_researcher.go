// Package agents provides specialized research agents for the go-research system.
package agents

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
	"go-research/internal/think_deep"
	"go-research/internal/tools"
)

// SubResearcherAgent performs focused research on specific topics as part of
// the ThinkDeep diffusion architecture. It executes search loops with strict
// iteration limits and compresses findings for the supervisor.
//
// Original: research_agent.py in ThinkDepth.ai
type SubResearcherAgent struct {
	client        llm.ChatClient
	tools         tools.ToolExecutor
	bus           *events.Bus
	maxIterations int
	model         string
}

// SubResearcherConfig configures the sub-researcher agent behavior.
type SubResearcherConfig struct {
	// MaxIterations is the maximum number of search iterations.
	// Simple queries: 2-3, complex queries: up to 5
	MaxIterations int
}

// DefaultSubResearcherConfig returns sensible defaults for sub-researcher configuration.
func DefaultSubResearcherConfig() SubResearcherConfig {
	return SubResearcherConfig{
		MaxIterations: 5,
	}
}

// NewSubResearcherAgent creates a new sub-researcher agent with the given dependencies.
func NewSubResearcherAgent(
	client llm.ChatClient,
	toolExec tools.ToolExecutor,
	bus *events.Bus,
	cfg SubResearcherConfig,
) *SubResearcherAgent {
	if cfg.MaxIterations == 0 {
		cfg.MaxIterations = 5
	}
	return &SubResearcherAgent{
		client:        client,
		tools:         toolExec,
		bus:           bus,
		maxIterations: cfg.MaxIterations,
		model:         client.GetModel(),
	}
}

// SubResearcherResult contains the output of sub-researcher work.
type SubResearcherResult struct {
	// CompressedResearch is the final compressed output preserving all search results
	CompressedResearch string

	// RawNotes contains the raw search results before compression
	RawNotes []string

	// SourcesFound is the count of unique sources found
	SourcesFound int

	// VisitedURLs contains all URLs visited during this research session
	VisitedURLs []string

	// Cost tracks token usage for this sub-researcher run
	Cost session.CostBreakdown
}

// Research performs focused research on the given topic.
// It executes an iterative search loop with the following behavior:
//   - 2-3 searches for simple queries, up to 5 for complex
//   - Uses think tool for reflection after each search
//   - Stops when can answer comprehensively, has 3+ sources, or last 2 searches returned similar info
//   - Compresses all findings, filtering out think_tool calls
func (r *SubResearcherAgent) Research(ctx context.Context, topic string, researcherNum int) (*SubResearcherResult, error) {
	return r.researchWithIteration(ctx, topic, researcherNum, 0)
}

// researchWithIteration performs research with a specific diffusion iteration context.
func (r *SubResearcherAgent) researchWithIteration(ctx context.Context, topic string, researcherNum int, diffusionIteration int) (*SubResearcherResult, error) {
	state := think_deep.NewResearcherState(topic)
	var totalCost session.CostBreakdown

	// Build system prompt
	date := time.Now().Format("2006-01-02")
	systemPrompt := think_deep.ResearchAgentPrompt(date)

	// Initialize conversation
	messages := []llm.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: fmt.Sprintf("Research this topic thoroughly:\n\n%s", topic)},
	}

	// Emit start event
	r.emitProgress(researcherNum, diffusionIteration, "starting", 0, topic)

	for state.Iteration < r.maxIterations {
		state.IncrementIteration()

		// Get LLM response
		resp, err := r.client.Chat(ctx, messages)
		if err != nil {
			if ctxErr := ctx.Err(); ctxErr != nil {
				return nil, ctxErr
			}
			return nil, fmt.Errorf("sub-researcher LLM call: %w", err)
		}

		if len(resp.Choices) == 0 {
			return nil, fmt.Errorf("empty response from LLM")
		}

		// Track costs
		cost := session.NewCostBreakdown(r.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
		totalCost.Add(cost)

		content := resp.Choices[0].Message.Content
		messages = append(messages, llm.Message{Role: "assistant", Content: content})

		// Parse tool calls
		toolCalls := think_deep.ParseToolCalls(content)

		// If no tool calls, research is complete
		if len(toolCalls) == 0 {
			r.emitProgress(researcherNum, diffusionIteration, "complete", len(state.RawNotes), topic)
			break
		}

		// Execute tool calls
		for _, tc := range toolCalls {
			var result string
			switch tc.Tool {
			case "search":
				query, _ := tc.Args["query"].(string)
				if query == "" {
					result = "Error: search requires a 'query' argument"
				} else {
					r.emitProgress(researcherNum, diffusionIteration, "searching", len(state.RawNotes), topic)

					searchResult, searchErr := r.tools.Execute(ctx, "search", tc.Args)
					if searchErr != nil {
						if ctxErr := ctx.Err(); ctxErr != nil {
							return nil, ctxErr
						}
						result = fmt.Sprintf("Search error: %v", searchErr)
					} else {
						result = searchResult
						state.AddRawNote(searchResult)
					}
				}

			case "think":
				r.emitProgress(researcherNum, diffusionIteration, "thinking", len(state.RawNotes), topic)
				reflection, _ := tc.Args["reflection"].(string)
				result = fmt.Sprintf("Reflection recorded: %s", truncateForLog(reflection, 100))

			default:
				result = fmt.Sprintf("Unknown tool: %s", tc.Tool)
			}

			// Add tool result to conversation
			messages = append(messages, llm.Message{
				Role:    "user",
				Content: fmt.Sprintf("Tool result for %s:\n%s", tc.Tool, result),
			})
		}
	}

	// Compress research findings
	r.emitProgress(researcherNum, diffusionIteration, "compressing", len(state.RawNotes), topic)

	compressed, compressCost, err := r.compressResearch(ctx, topic, messages)
	if err != nil {
		return nil, fmt.Errorf("compress research: %w", err)
	}
	totalCost.Add(compressCost)
	state.SetCompressedResearch(compressed)

	// Count unique sources and extract visited URLs
	sourceCount, visitedURLs := countUniqueSourcesAndURLs(state.RawNotes)

	r.emitProgress(researcherNum, diffusionIteration, "complete", sourceCount, topic)

	return &SubResearcherResult{
		CompressedResearch: compressed,
		RawNotes:           state.RawNotes,
		SourcesFound:       sourceCount,
		VisitedURLs:        visitedURLs,
		Cost:               totalCost,
	}, nil
}

// compressResearch creates a compressed summary of all research findings.
// It preserves ALL search results verbatim while filtering out think_tool calls.
func (r *SubResearcherAgent) compressResearch(ctx context.Context, topic string, messages []llm.Message) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")
	compressPrompt := think_deep.CompressResearchPrompt(date, topic)

	// Build compression context from messages
	var researchContent strings.Builder
	researchContent.WriteString("# Research Conversation\n\n")

	for _, m := range messages {
		// Skip system messages
		if m.Role == "system" {
			continue
		}

		// Filter out think tool calls and their results
		content := think_deep.FilterThinkToolCalls(m.Content)
		if strings.TrimSpace(content) == "" {
			continue
		}

		researchContent.WriteString(fmt.Sprintf("## %s\n%s\n\n", m.Role, content))
	}

	compressMessages := []llm.Message{
		{Role: "system", Content: compressPrompt},
		{Role: "user", Content: researchContent.String()},
	}

	resp, err := r.client.Chat(ctx, compressMessages)
	if err != nil {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return "", session.CostBreakdown{}, ctxErr
		}
		// On error, return raw notes joined
		return researchContent.String(), session.CostBreakdown{}, nil
	}

	if len(resp.Choices) == 0 {
		return researchContent.String(), session.CostBreakdown{}, nil
	}

	cost := session.NewCostBreakdown(r.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	return resp.Choices[0].Message.Content, cost, nil
}

// emitProgress emits a sub-researcher progress event.
func (r *SubResearcherAgent) emitProgress(researcherNum, diffusionIteration int, status string, sourcesFound int, topic string) {
	if r.bus == nil {
		return
	}

	r.bus.Publish(events.Event{
		Type:      events.EventSubResearcherProgress,
		Timestamp: time.Now(),
		Data: events.SubResearcherData{
			Topic:         topic,
			ResearcherNum: researcherNum,
			Iteration:     diffusionIteration,
			MaxIterations: r.maxIterations,
			Status:        status,
			SourcesFound:  sourcesFound,
		},
	})
}

// countUniqueSourcesAndURLs counts unique URLs in the raw notes and returns them.
func countUniqueSourcesAndURLs(rawNotes []string) (int, []string) {
	seen := make(map[string]bool)
	urlRegex := regexp.MustCompile(`URL:\s*(https?://[^\s]+)`)

	for _, note := range rawNotes {
		matches := urlRegex.FindAllStringSubmatch(note, -1)
		for _, match := range matches {
			if len(match) > 1 {
				seen[match[1]] = true
			}
		}
	}

	urls := make([]string, 0, len(seen))
	for url := range seen {
		urls = append(urls, url)
	}

	return len(seen), urls
}

// truncateForLog truncates a string for logging purposes.
func truncateForLog(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
