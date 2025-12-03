package tools

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"go-research/internal/llm"
)

// ContentSummarizer summarizes webpage content using an LLM.
type ContentSummarizer struct {
	client     llm.ChatClient
	fetchTool  *FetchTool
	maxContent int // Maximum content length before truncation
}

// NewContentSummarizer creates a new content summarizer.
func NewContentSummarizer(client llm.ChatClient) *ContentSummarizer {
	return &ContentSummarizer{
		client:     client,
		fetchTool:  NewFetchTool(),
		maxContent: 250000, // Match reference MAX_CONTEXT_LENGTH
	}
}

// SummarizeURL fetches a URL and returns an LLM-generated summary.
func (s *ContentSummarizer) SummarizeURL(ctx context.Context, url string) (string, error) {
	// Fetch raw content
	content, err := s.fetchTool.Execute(ctx, map[string]interface{}{"url": url})
	if err != nil {
		return "", fmt.Errorf("fetch failed: %w", err)
	}

	// Truncate if too long
	if len(content) > s.maxContent {
		content = content[:s.maxContent]
	}

	// Skip summarization for very short content
	if len(content) < 200 {
		return content, nil
	}

	// Generate summary using LLM
	date := time.Now().Format("2006-01-02")
	prompt := summarizeWebpagePrompt(content, date)

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		// On LLM error, return truncated raw content
		if len(content) > 5000 {
			return content[:5000] + "\n...[truncated, summarization failed]", nil
		}
		return content, nil
	}

	if len(resp.Choices) == 0 {
		return content, nil
	}

	return s.formatSummary(resp.Choices[0].Message.Content), nil
}

// formatSummary extracts and formats the summary from LLM response.
func (s *ContentSummarizer) formatSummary(response string) string {
	var result strings.Builder

	// Extract summary section
	summaryRegex := regexp.MustCompile(`(?s)<summary>\s*(.*?)\s*</summary>`)
	if match := summaryRegex.FindStringSubmatch(response); len(match) > 1 {
		result.WriteString(match[1])
	}

	// Extract key excerpts
	excerptsRegex := regexp.MustCompile(`(?s)<key_excerpts>\s*(.*?)\s*</key_excerpts>`)
	if match := excerptsRegex.FindStringSubmatch(response); len(match) > 1 {
		result.WriteString("\n\nKey Excerpts:\n")
		result.WriteString(match[1])
	}

	if result.Len() == 0 {
		// No structured output found, return raw response
		return response
	}

	return result.String()
}

// summarizeWebpagePrompt returns the prompt for summarizing fetched webpage content.
// This is a local copy to avoid import cycles with think_deep package.
func summarizeWebpagePrompt(webpageContent, date string) string {
	return fmt.Sprintf(`You are tasked with summarizing the raw content of a webpage retrieved from a web search. Your goal is to create a summary that preserves the most important information from the original web page. This summary will be used by a downstream research agent, so it's crucial to maintain the key details without losing essential information.

Here is the raw content of the webpage:

<webpage_content>
%s
</webpage_content>

Please follow these guidelines to create your summary:

1. Identify and preserve the main topic or purpose of the webpage.
2. Retain key facts, statistics, and data points that are central to the content's message.
3. Keep important quotes from credible sources or experts.
4. Maintain the chronological order of events if the content is time-sensitive or historical.
5. Preserve any lists or step-by-step instructions if present.
6. Include relevant dates, names, and locations that are crucial to understanding the content.
7. Summarize lengthy explanations while keeping the core message intact.

When handling different types of content:

- For news articles: Focus on the who, what, when, where, why, and how.
- For scientific content: Preserve methodology, results, and conclusions.
- For opinion pieces: Maintain the main arguments and supporting points.
- For product pages: Keep key features, specifications, and unique selling points.

Your summary should be significantly shorter than the original content but comprehensive enough to stand alone as a source of information. Aim for about 25-30 percent of the original length, unless the content is already concise.

Today's date is %s.

Output your response in this format:

<summary>
Your summary here, structured with appropriate paragraphs or bullet points as needed
</summary>

<key_excerpts>
- First important quote or excerpt
- Second important quote or excerpt
- Third important quote or excerpt
(up to 5 key excerpts)
</key_excerpts>`, webpageContent, date)
}
