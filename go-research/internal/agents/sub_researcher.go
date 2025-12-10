// Package agents provides specialized research agents for the go-research system.
package agents

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"go-research/internal/architectures/think_deep/runtime"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
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
	// MaxIterations is a safety limit for the maximum number of search iterations.
	// The actual iteration limit is controlled by the prompt (2-3 for simple, 5 for complex).
	// This is a fallback to prevent runaway loops if the LLM ignores prompt instructions.
	MaxIterations int
}

// DefaultSubResearcherConfig returns sensible defaults for sub-researcher configuration.
func DefaultSubResearcherConfig() SubResearcherConfig {
	return SubResearcherConfig{
		MaxIterations: 20,
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
		cfg.MaxIterations = 20
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

	// Insights contains structured insights extracted from search results
	Insights []runtime.SubInsight

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
	state := runtime.NewResearcherState(topic)
	var totalCost session.CostBreakdown

	// Build system prompt
	date := time.Now().Format("2006-01-02")
	systemPrompt := runtime.ResearchAgentPrompt(date)

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
		toolCalls := runtime.ParseToolCalls(content)

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
				// Execute any other tool from the registry (read_document, analyze_csv, fetch, etc.)
				r.emitProgress(researcherNum, diffusionIteration, fmt.Sprintf("using %s", tc.Tool), len(state.RawNotes), topic)
				toolResult, toolErr := r.tools.Execute(ctx, tc.Tool, tc.Args)
				if toolErr != nil {
					if ctxErr := ctx.Err(); ctxErr != nil {
						return nil, ctxErr
					}
					result = fmt.Sprintf("Tool error (%s): %v", tc.Tool, toolErr)
				} else {
					result = toolResult
					// Add to raw notes if it's a data-gathering tool (not think)
					if tc.Tool != "think" {
						state.AddRawNote(toolResult)
					}
				}
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

	// Extract structured insights from search results
	insights := extractInsightsFromSearchResults(topic, state.RawNotes, researcherNum, diffusionIteration)

	r.emitProgress(researcherNum, diffusionIteration, "complete", sourceCount, topic)

	return &SubResearcherResult{
		CompressedResearch: compressed,
		RawNotes:           state.RawNotes,
		SourcesFound:       sourceCount,
		VisitedURLs:        visitedURLs,
		Insights:           insights,
		Cost:               totalCost,
	}, nil
}

// compressResearch creates a compressed summary of all research findings.
// It preserves ALL search results verbatim while filtering out think_tool calls.
func (r *SubResearcherAgent) compressResearch(ctx context.Context, topic string, messages []llm.Message) (string, session.CostBreakdown, error) {
	date := time.Now().Format("2006-01-02")
	compressPrompt := runtime.CompressResearchPrompt(date, topic)

	// Build compression context from messages
	var researchContent strings.Builder
	researchContent.WriteString("# Research Conversation\n\n")

	for _, m := range messages {
		// Skip system messages
		if m.Role == "system" {
			continue
		}

		// Filter out think tool calls and their results
		content := runtime.FilterThinkToolCalls(m.Content)
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

// extractInsightsFromSearchResults extracts structured insights from search results.
// It parses the raw search results and creates SubInsight structures for each
// distinct finding with source attribution.
// Enhanced to extract individual sources from search result blocks and capture
// tool usage, query context, and full source references.
func extractInsightsFromSearchResults(topic string, rawNotes []string, researcherNum int, iteration int) []runtime.SubInsight {
	var insights []runtime.SubInsight
	insightNum := 0

	for _, note := range rawNotes {
		// Try to split by SOURCE markers (search results typically have multiple sources)
		sourceBlocks := splitIntoSourceBlocks(note)

		if len(sourceBlocks) == 0 {
			// No source blocks found, treat entire note as one insight
			sourceBlocks = []sourceBlock{{content: note}}
		}

		for _, block := range sourceBlocks {
			insightNum++
			insight := createInsightFromBlock(block, topic, insightNum, researcherNum, iteration, note)
			if insight != nil {
				insights = append(insights, *insight)
			}
		}
	}

	return insights
}

// sourceBlock represents a parsed source from search results
type sourceBlock struct {
	url     string
	title   string
	summary string
	content string
}

// splitIntoSourceBlocks parses search result text into individual source blocks.
// Search results typically have format:
// --- SOURCE N: Title ---
// URL: https://...
// SUMMARY: ...
func splitIntoSourceBlocks(note string) []sourceBlock {
	var blocks []sourceBlock

	// Pattern to match source blocks: "--- SOURCE N: Title ---" or "SOURCE N:"
	sourcePattern := regexp.MustCompile(`(?i)(?:---\s*)?SOURCE\s*\d+:?\s*([^-\n]*?)(?:\s*---)?`)
	urlPattern := regexp.MustCompile(`URL:\s*(https?://[^\s\n]+)`)
	summaryPattern := regexp.MustCompile(`(?i)SUMMARY:\s*(.+?)(?:\n\n|\n---|\z)`)
	titlePattern := regexp.MustCompile(`(?:Title:|##)\s*(.+?)(?:\n|$)`)

	// Split by SOURCE markers
	parts := sourcePattern.Split(note, -1)
	titles := sourcePattern.FindAllStringSubmatch(note, -1)

	for i, part := range parts {
		if strings.TrimSpace(part) == "" {
			continue
		}

		block := sourceBlock{content: part}

		// Extract title from the marker
		if i > 0 && i-1 < len(titles) && len(titles[i-1]) > 1 {
			block.title = strings.TrimSpace(titles[i-1][1])
		}

		// Extract URL
		if urlMatch := urlPattern.FindStringSubmatch(part); len(urlMatch) > 1 {
			block.url = strings.TrimSpace(urlMatch[1])
		}

		// Extract summary
		if summaryMatch := summaryPattern.FindStringSubmatch(part); len(summaryMatch) > 1 {
			block.summary = strings.TrimSpace(summaryMatch[1])
		}

		// If no title from marker, try to extract from content
		if block.title == "" {
			if titleMatch := titlePattern.FindStringSubmatch(part); len(titleMatch) > 1 {
				block.title = strings.TrimSpace(titleMatch[1])
			}
		}

		// Only add if we have meaningful content
		if block.url != "" || block.summary != "" || len(strings.TrimSpace(part)) > 50 {
			blocks = append(blocks, block)
		}
	}

	// If no blocks extracted, try to extract individual URLs and their surrounding content
	if len(blocks) == 0 {
		urlMatches := urlPattern.FindAllStringSubmatchIndex(note, -1)
		for i, match := range urlMatches {
			if len(match) < 4 {
				continue
			}

			url := note[match[2]:match[3]]
			// Get content around the URL (100 chars before, 500 after)
			start := match[0] - 100
			if start < 0 {
				start = 0
			}
			end := match[3] + 500
			if end > len(note) {
				end = len(note)
			}
			// Don't overlap with next URL
			if i+1 < len(urlMatches) && end > urlMatches[i+1][0] {
				end = urlMatches[i+1][0]
			}

			content := note[start:end]
			blocks = append(blocks, sourceBlock{
				url:     url,
				content: content,
			})
		}
	}

	return blocks
}

// createInsightFromBlock creates a SubInsight from a parsed source block
func createInsightFromBlock(block sourceBlock, topic string, insightNum int, researcherNum int, iteration int, fullNote string) *runtime.SubInsight {
	// Determine the finding text
	finding := block.summary
	if finding == "" {
		finding = truncateForLog(block.content, 500)
	}

	// Skip if no meaningful content
	if finding == "" || len(strings.TrimSpace(finding)) < 20 {
		return nil
	}

	// Extract tool and query from the note if present
	toolUsed, queryUsed := extractToolContext(fullNote)

	// Determine source type based on tool used or content
	sourceType := runtime.SourceTypeWeb
	if toolUsed == "read_document" || toolUsed == "read_xlsx" || toolUsed == "analyze_csv" {
		sourceType = runtime.SourceTypeDocument
	} else if toolUsed == "fetch" {
		sourceType = runtime.SourceTypeWeb
	} else if strings.Contains(fullNote, "Read document:") || strings.Contains(fullNote, "Workbook:") {
		sourceType = runtime.SourceTypeDocument
	}

	// Create source reference with full content
	var sources []runtime.SourceReference
	if block.url != "" {
		sources = append(sources, runtime.SourceReference{
			URL:             block.url,
			Type:            sourceType,
			Title:           block.title,
			RelevantExcerpt: block.summary,
			RawContent:      block.content,
			FetchedAt:       time.Now(),
		})
	} else if sourceType == runtime.SourceTypeDocument && queryUsed != "" {
		// For document sources, create a file-based source reference
		sources = append(sources, runtime.SourceReference{
			FilePath:        queryUsed,
			Type:            sourceType,
			Title:           block.title,
			RelevantExcerpt: block.summary,
			RawContent:      block.content,
			FetchedAt:       time.Now(),
		})
	}

	// Generate title if not present
	title := block.title
	if title == "" && block.url != "" {
		// Use domain as title
		title = extractDomain(block.url)
	}
	if title == "" && sourceType == runtime.SourceTypeDocument && queryUsed != "" {
		// Use filename as title for documents
		parts := strings.Split(queryUsed, "/")
		if len(parts) > 0 {
			title = parts[len(parts)-1]
		}
	}
	if title == "" {
		title = truncateForLog(finding, 60)
	}

	// Create analysis chain showing derivation
	analysisChain := []string{
		fmt.Sprintf("Research topic: %s", truncateForLog(topic, 100)),
	}
	if toolUsed != "" {
		analysisChain = append(analysisChain, fmt.Sprintf("Tool used: %s", toolUsed))
	}
	if queryUsed != "" {
		if sourceType == runtime.SourceTypeDocument {
			analysisChain = append(analysisChain, fmt.Sprintf("Document analyzed: %s", queryUsed))
		} else {
			analysisChain = append(analysisChain, fmt.Sprintf("Query: %s", queryUsed))
		}
	}
	if block.url != "" {
		analysisChain = append(analysisChain, fmt.Sprintf("Source retrieved: %s", block.url))
	}
	analysisChain = append(analysisChain, "Finding extracted from source content")

	// For document sources, use file path as source URL for tracking
	sourceURL := block.url
	if sourceURL == "" && sourceType == runtime.SourceTypeDocument && queryUsed != "" {
		sourceURL = "file://" + queryUsed
	}

	return &runtime.SubInsight{
		ID:            fmt.Sprintf("insight-%03d", insightNum),
		Topic:         topic,
		Title:         title,
		Finding:       finding,
		Implication:   "", // Will be filled by synthesis later
		SourceURL:     sourceURL,
		SourceContent: block.content,
		Sources:       sources,
		AnalysisChain: analysisChain,
		ToolUsed:      toolUsed,
		QueryUsed:     queryUsed,
		Confidence:    calculateConfidence(sourceURL, finding),
		Iteration:     iteration,
		ResearcherNum: researcherNum,
		Timestamp:     time.Now(),
	}
}

// extractToolContext extracts tool name and query from the note context
func extractToolContext(note string) (tool string, query string) {
	// Try to detect search queries
	searchPattern := regexp.MustCompile(`(?i)Search results for:\s*(.+?)(?:\n|$)`)
	if match := searchPattern.FindStringSubmatch(note); len(match) > 1 {
		return "search", strings.TrimSpace(match[1])
	}

	// Try to detect fetch operations
	fetchPattern := regexp.MustCompile(`(?i)Fetched from:\s*(https?://[^\s]+)`)
	if match := fetchPattern.FindStringSubmatch(note); len(match) > 1 {
		return "fetch", strings.TrimSpace(match[1])
	}

	// Try to detect document reads (matches "Read document: /path/to/file")
	docPattern := regexp.MustCompile(`(?i)Read document:\s*(.+?)(?:\n|$)`)
	if match := docPattern.FindStringSubmatch(note); len(match) > 1 {
		return "read_document", strings.TrimSpace(match[1])
	}

	// Try to detect XLSX reads
	xlsxPattern := regexp.MustCompile(`(?i)Workbook:\s*(.+?)(?:\n|$)`)
	if match := xlsxPattern.FindStringSubmatch(note); len(match) > 1 {
		return "read_xlsx", strings.TrimSpace(match[1])
	}

	// Try to detect CSV analysis
	csvPattern := regexp.MustCompile(`(?i)CSV Analysis:\s*(.+?)(?:\n|$)`)
	if match := csvPattern.FindStringSubmatch(note); len(match) > 1 {
		return "analyze_csv", strings.TrimSpace(match[1])
	}

	return "", ""
}

// extractDomain extracts the domain from a URL for use as a title
func extractDomain(urlStr string) string {
	// Simple extraction - just get host
	if strings.HasPrefix(urlStr, "http") {
		parts := strings.Split(urlStr, "/")
		if len(parts) >= 3 {
			return parts[2]
		}
	}
	return ""
}

// calculateConfidence estimates confidence score based on source quality indicators.
func calculateConfidence(sourceURL, finding string) float64 {
	confidence := 0.5 // Base confidence

	// Higher confidence for well-known domains
	trustedDomains := []string{
		"wikipedia.org", "github.com", "arxiv.org", "nature.com",
		"science.org", "ieee.org", "acm.org", "gov", "edu",
	}
	for _, domain := range trustedDomains {
		if strings.Contains(sourceURL, domain) {
			confidence += 0.2
			break
		}
	}

	// Higher confidence for longer, more detailed findings
	if len(finding) > 200 {
		confidence += 0.1
	}

	// Cap at 1.0
	if confidence > 1.0 {
		confidence = 1.0
	}

	return confidence
}
