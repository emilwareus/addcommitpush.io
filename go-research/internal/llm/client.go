package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go-research/internal/config"
)

const openRouterURL = "https://openrouter.ai/api/v1/chat/completions"

// ChatClient is the interface for LLM interactions (allows mocking in tests)
type ChatClient interface {
	Chat(ctx context.Context, messages []Message) (*ChatResponse, error)
	StreamChat(ctx context.Context, messages []Message, handler func(chunk string) error) error
	SetModel(model string)
	GetModel() string
}

// Client handles LLM API calls
type Client struct {
	apiKey     string
	httpClient *http.Client
	model      string
}

// NewClient creates a new LLM client from config
func NewClient(cfg *config.Config) *Client {
	return &Client{
		apiKey:     cfg.OpenRouterAPIKey,
		httpClient: &http.Client{Timeout: cfg.RequestTimeout},
		model:      cfg.Model,
	}
}

// NewClientWithDefaults creates a new LLM client with default settings
func NewClientWithDefaults(apiKey string) *Client {
	return &Client{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 5 * time.Minute},
		model:      DefaultModel,
	}
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the API request
type ChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Stream      bool      `json:"stream,omitempty"`
}

// ChatResponse is the API response
type ChatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// Chat sends a chat completion request
func (c *Client) Chat(ctx context.Context, messages []Message) (*ChatResponse, error) {
	modelCfg := DefaultModelConfig()
	req := ChatRequest{
		Model:       c.model,
		Messages:    messages,
		Temperature: modelCfg.Temperature,
		MaxTokens:   modelCfg.MaxTokens,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", openRouterURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("HTTP-Referer", "https://github.com/emilwareus/go-research")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &chatResp, nil
}

// SetModel changes the model used for requests
func (c *Client) SetModel(model string) {
	c.model = model
}

// GetModel returns the current model
func (c *Client) GetModel() string {
	return c.model
}

// StreamChat sends a streaming chat request and calls handler for each chunk
func (c *Client) StreamChat(ctx context.Context, messages []Message, handler func(chunk string) error) error {
	modelCfg := DefaultModelConfig()
	req := ChatRequest{
		Model:       c.model,
		Messages:    messages,
		Temperature: modelCfg.Temperature,
		MaxTokens:   modelCfg.MaxTokens,
		Stream:      true,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", openRouterURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("HTTP-Referer", "https://github.com/emilwareus/go-research")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	// Parse SSE stream
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()

		// Skip empty lines and non-data lines
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}

		var event struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}

		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue // Skip malformed JSON chunks
		}

		if len(event.Choices) > 0 && event.Choices[0].Delta.Content != "" {
			if err := handler(event.Choices[0].Delta.Content); err != nil {
				return err
			}
		}
	}

	return scanner.Err()
}
