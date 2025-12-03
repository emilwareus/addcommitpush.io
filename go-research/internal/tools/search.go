package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const braveSearchURL = "https://api.search.brave.com/res/v1/web/search"

// SearchTool implements web search via Brave API with optional content summarization
type SearchTool struct {
	apiKey     string
	httpClient *http.Client
	summarizer *ContentSummarizer // Optional: for full page summarization
}

// NewSearchTool creates a new Brave search tool
func NewSearchTool(apiKey string) *SearchTool {
	return &SearchTool{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		summarizer: nil, // Set via SetSummarizer
	}
}

// SetSummarizer enables content summarization for search results.
func (t *SearchTool) SetSummarizer(s *ContentSummarizer) {
	t.summarizer = s
}

func (t *SearchTool) Name() string {
	return "search"
}

func (t *SearchTool) Description() string {
	return `Search the web using Brave Search API. Args: {"query": "search terms", "count": 10}`
}

// BraveSearchResponse represents the API response
type BraveSearchResponse struct {
	Web struct {
		Results []struct {
			Title       string `json:"title"`
			URL         string `json:"url"`
			Description string `json:"description"`
		} `json:"results"`
	} `json:"web"`
}

// searchResult holds parsed search result data
type searchResult struct {
	Title       string
	URL         string
	Description string
}

func (t *SearchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	query, ok := args["query"].(string)
	if !ok || query == "" {
		return "", fmt.Errorf("search requires a 'query' argument")
	}

	count := 10
	if c, ok := args["count"].(float64); ok {
		count = int(c)
	}

	// Build request URL
	params := url.Values{}
	params.Set("q", query)
	params.Set("count", fmt.Sprintf("%d", count))

	req, err := http.NewRequestWithContext(ctx, "GET", braveSearchURL+"?"+params.Encode(), nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Subscription-Token", t.apiKey)

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("search request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("search API error %d: %s", resp.StatusCode, string(body))
	}

	var searchResp BraveSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}

	// Convert to searchResult slice
	var results []searchResult
	for _, r := range searchResp.Web.Results {
		results = append(results, searchResult{
			Title:       r.Title,
			URL:         r.URL,
			Description: r.Description,
		})
	}

	if len(results) == 0 {
		return "No results found.", nil
	}

	// If summarizer is set, fetch and summarize top URLs
	if t.summarizer != nil {
		return t.executeWithSummarization(ctx, query, results)
	}

	return t.formatResults(query, results), nil
}

// formatResults formats search results without summarization.
func (t *SearchTool) formatResults(query string, results []searchResult) string {
	var output []string
	for i, r := range results {
		output = append(output, fmt.Sprintf("%d. %s\n   URL: %s\n   %s\n",
			i+1, r.Title, r.URL, r.Description))
	}
	return strings.Join(output, "\n")
}

// executeWithSummarization fetches and summarizes top search result URLs.
func (t *SearchTool) executeWithSummarization(ctx context.Context, query string, results []searchResult) (string, error) {
	var output strings.Builder
	output.WriteString(fmt.Sprintf("Search results for: %s\n\n", query))

	// Summarize top 3 results (matching reference behavior)
	maxSummarize := 3
	if len(results) < maxSummarize {
		maxSummarize = len(results)
	}

	for i, r := range results {
		output.WriteString(fmt.Sprintf("--- SOURCE %d: %s ---\n", i+1, r.Title))
		output.WriteString(fmt.Sprintf("URL: %s\n\n", r.URL))

		if i < maxSummarize {
			// Fetch and summarize full content
			summary, err := t.summarizer.SummarizeURL(ctx, r.URL)
			if err != nil {
				// Fall back to snippet on error
				output.WriteString(fmt.Sprintf("SUMMARY:\n%s\n\n", r.Description))
			} else {
				output.WriteString(fmt.Sprintf("SUMMARY:\n%s\n\n", summary))
			}
		} else {
			// Use snippet for remaining results
			output.WriteString(fmt.Sprintf("SNIPPET:\n%s\n\n", r.Description))
		}
	}

	return output.String(), nil
}

// ExtractURLs extracts URLs from search results
func ExtractURLs(searchResults string) []string {
	var urls []string
	lines := strings.Split(searchResults, "\n")
	for _, line := range lines {
		if strings.HasPrefix(strings.TrimSpace(line), "URL: ") {
			url := strings.TrimPrefix(strings.TrimSpace(line), "URL: ")
			urls = append(urls, url)
		}
	}
	return urls
}
