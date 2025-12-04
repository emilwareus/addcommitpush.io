package repl

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/llm"
)

// IntentType represents the classified type of user intent.
type IntentType string

const (
	IntentResearch IntentType = "research" // New research query requiring web search
	IntentQuestion IntentType = "question" // QA about existing reports
	IntentExpand   IntentType = "expand"   // Expand on specific topic from existing research
)

// QueryIntent represents the classified intent of user input.
type QueryIntent struct {
	Type       IntentType // Research, Question, Expand
	Confidence float64    // 0-1 confidence score
	Topic      string     // For Expand: specific topic to expand on
}

// QueryClassifier classifies user queries using LLM.
type QueryClassifier struct {
	client llm.ChatClient
	model  string
}

// NewQueryClassifier creates a classifier with the specified model.
// Model is developer-configured, not user choice.
func NewQueryClassifier(client llm.ChatClient, model string) *QueryClassifier {
	return &QueryClassifier{client: client, model: model}
}

// Classify determines the intent of a user query given session context.
func (c *QueryClassifier) Classify(ctx context.Context, query string, hasSession bool, sessionSummary string) (*QueryIntent, error) {
	// Store original model
	originalModel := c.client.GetModel()

	// Switch to classifier model
	c.client.SetModel(c.model)
	defer c.client.SetModel(originalModel)

	prompt := c.buildClassificationPrompt(query, hasSession, sessionSummary)

	resp, err := c.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, fmt.Errorf("classification request: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("empty response from classifier")
	}

	return c.parseResponse(resp.Choices[0].Message.Content)
}

// buildClassificationPrompt creates the prompt for intent classification.
func (c *QueryClassifier) buildClassificationPrompt(query string, hasSession bool, sessionSummary string) string {
	var contextInfo string
	var biasGuidance string

	if hasSession && sessionSummary != "" {
		contextInfo = fmt.Sprintf("The user has an active research session about: %s", sessionSummary)
		biasGuidance = `
IMPORTANT BIAS: Since there is existing research, STRONGLY prefer QUESTION over EXPAND or RESEARCH:
- If the query can possibly be answered from the existing research, classify as QUESTION
- Only use EXPAND if the user explicitly asks to "expand", "go deeper", "research more", or "find more about"
- Only use RESEARCH if the query is clearly about a completely different topic unrelated to the session
- When in doubt, choose QUESTION - the system will indicate if it can't answer from existing content`
	} else if hasSession {
		contextInfo = "The user has an active research session."
		biasGuidance = `
IMPORTANT BIAS: Since there is existing research, prefer QUESTION when the query relates to the session topic.`
	} else {
		contextInfo = "The user has no active research session."
		biasGuidance = ""
	}

	return fmt.Sprintf(`Classify the following user query into one of three categories:

1. QUESTION - A question or query that can be answered from existing research reports (e.g., "What did you find?", "Summarize the findings", "What about X?", "How does Y work?", any follow-up question)
2. EXPAND - An explicit request to conduct MORE research on a specific topic (e.g., "Expand on X", "Research more about Y", "Go deeper on Z", "Find more information about...")
3. RESEARCH - A completely NEW research topic unrelated to any existing session (e.g., "Research a totally different subject")

Context: %s
%s

User query: "%s"

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{"intent": "QUESTION", "confidence": 0.9, "topic": ""}

Rules:
- "intent" must be exactly "QUESTION", "EXPAND", or "RESEARCH"
- "confidence" must be a number between 0.0 and 1.0
- "topic" should be the specific expansion topic for EXPAND intents, empty string otherwise
- No other text before or after the JSON
- Default to QUESTION when there's an active session and the query relates to it`, contextInfo, biasGuidance, query)
}

// classificationResponse represents the expected JSON response from the LLM.
type classificationResponse struct {
	Intent     string  `json:"intent"`
	Confidence float64 `json:"confidence"`
	Topic      string  `json:"topic"`
}

// parseResponse extracts the intent from the LLM response.
func (c *QueryClassifier) parseResponse(content string) (*QueryIntent, error) {
	content = strings.TrimSpace(content)

	// Try to extract JSON from the response (handle potential markdown code blocks)
	jsonStart := strings.Index(content, "{")
	jsonEnd := strings.LastIndex(content, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		content = content[jsonStart : jsonEnd+1]
	}

	var resp classificationResponse
	if err := json.Unmarshal([]byte(content), &resp); err != nil {
		return nil, fmt.Errorf("parse classification response: %w (content: %s)", err, content)
	}

	intent := &QueryIntent{
		Confidence: resp.Confidence,
		Topic:      resp.Topic,
	}

	switch strings.ToUpper(resp.Intent) {
	case "RESEARCH":
		intent.Type = IntentResearch
	case "QUESTION":
		intent.Type = IntentQuestion
	case "EXPAND":
		intent.Type = IntentExpand
	default:
		return nil, fmt.Errorf("unknown intent type: %s", resp.Intent)
	}

	return intent, nil
}
