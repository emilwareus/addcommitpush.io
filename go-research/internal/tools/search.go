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

// SearchTool implements web search via Brave API
type SearchTool struct {
	apiKey     string
	httpClient *http.Client
}

// NewSearchTool creates a new Brave search tool
func NewSearchTool(apiKey string) *SearchTool {
	return &SearchTool{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
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
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("search API error %d: %s", resp.StatusCode, string(body))
	}

	var searchResp BraveSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}

	// Format results
	var results []string
	for i, r := range searchResp.Web.Results {
		results = append(results, fmt.Sprintf("%d. %s\n   URL: %s\n   %s\n",
			i+1, r.Title, r.URL, r.Description))
	}

	if len(results) == 0 {
		return "No results found.", nil
	}

	return strings.Join(results, "\n"), nil
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
