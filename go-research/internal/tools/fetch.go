package tools

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/net/html"
)

// FetchTool implements web page content fetching
type FetchTool struct {
	httpClient *http.Client
}

// NewFetchTool creates a new fetch tool
func NewFetchTool() *FetchTool {
	return &FetchTool{
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (t *FetchTool) Name() string {
	return "fetch"
}

func (t *FetchTool) Description() string {
	return `Fetch and extract text content from a web page. Args: {"url": "https://..."}`
}

func (t *FetchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	urlStr, ok := args["url"].(string)
	if !ok || urlStr == "" {
		return "", fmt.Errorf("fetch requires a 'url' argument")
	}

	req, err := http.NewRequestWithContext(ctx, "GET", urlStr, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; GoResearchBot/1.0)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fetch error %d for %s", resp.StatusCode, urlStr)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read body: %w", err)
	}

	// Extract text content from HTML
	text := extractText(string(body))

	// Truncate if too long
	if len(text) > 10000 {
		text = text[:10000] + "\n...[truncated]"
	}

	return text, nil
}

// extractText removes HTML tags and extracts readable text
func extractText(htmlContent string) string {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		// Fallback: strip tags with regex
		re := regexp.MustCompile(`<[^>]*>`)
		return cleanWhitespace(re.ReplaceAllString(htmlContent, ""))
	}

	var text strings.Builder
	var extract func(*html.Node)
	extract = func(n *html.Node) {
		if n.Type == html.TextNode {
			text.WriteString(n.Data)
			text.WriteString(" ")
		}
		// Skip script and style tags
		if n.Type == html.ElementNode && (n.Data == "script" || n.Data == "style" || n.Data == "noscript") {
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extract(c)
		}
	}
	extract(doc)

	return cleanWhitespace(text.String())
}

// cleanWhitespace normalizes whitespace in extracted text
func cleanWhitespace(s string) string {
	re := regexp.MustCompile(`\s+`)
	result := re.ReplaceAllString(s, " ")
	return strings.TrimSpace(result)
}
