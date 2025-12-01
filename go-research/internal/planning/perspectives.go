package planning

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/llm"
	"go-research/internal/session"
)

// Perspective represents an expert viewpoint for multi-perspective research.
// Inspired by Stanford STORM's approach to simulated expert conversations.
type Perspective struct {
	Name      string   `json:"name"`
	Focus     string   `json:"focus"`
	Questions []string `json:"questions"`
}

// PerspectiveDiscoverer identifies diverse expert perspectives for a topic.
type PerspectiveDiscoverer struct {
	client llm.ChatClient
	model  string
}

// NewPerspectiveDiscoverer creates a new discoverer with the given LLM client.
func NewPerspectiveDiscoverer(client llm.ChatClient) *PerspectiveDiscoverer {
	return &PerspectiveDiscoverer{client: client, model: client.GetModel()}
}

// Discover identifies 3-5 distinct expert perspectives for the given topic.
// Each perspective represents a different angle from which to research the topic.
func (p *PerspectiveDiscoverer) Discover(ctx context.Context, topic string) ([]Perspective, session.CostBreakdown, error) {
	prompt := fmt.Sprintf(`For the research topic: "%s"

Identify 3-5 distinct expert perspectives that would provide comprehensive coverage.

For each perspective:
1. Name (e.g., "Technical Expert", "Industry Analyst", "End User Advocate")
2. Focus area (what they prioritize)
3. 3-4 key questions they would ask

Return JSON array:
[
  {
    "name": "Perspective Name",
    "focus": "What this perspective prioritizes",
    "questions": ["Question 1", "Question 2", "Question 3"]
  }
]`, topic)

	resp, err := p.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, session.CostBreakdown{}, fmt.Errorf("perspective discovery: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, session.CostBreakdown{}, fmt.Errorf("empty response from LLM")
	}

	content := resp.Choices[0].Message.Content
	perspectives, err := p.parseResponse(content)
	if err != nil {
		// Use default perspectives if parsing fails
		return defaultPerspectives(topic), session.NewCostBreakdown(p.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens), nil
	}

	if len(perspectives) == 0 {
		return defaultPerspectives(topic), session.NewCostBreakdown(p.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens), nil
	}

	cost := session.NewCostBreakdown(p.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	return perspectives, cost, nil
}

// parseResponse extracts perspectives from LLM response.
func (p *PerspectiveDiscoverer) parseResponse(content string) ([]Perspective, error) {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil, fmt.Errorf("no JSON array found in response")
	}

	var perspectives []Perspective
	if err := json.Unmarshal([]byte(content[start:end]), &perspectives); err != nil {
		return nil, fmt.Errorf("parse perspectives: %w", err)
	}
	return perspectives, nil
}

// defaultPerspectives returns a sensible set of perspectives when discovery fails.
func defaultPerspectives(topic string) []Perspective {
	return []Perspective{
		{
			Name:  "Technical Expert",
			Focus: "Implementation details and technical feasibility",
			Questions: []string{
				fmt.Sprintf("What are the technical components of %s?", topic),
				fmt.Sprintf("What technologies or methods underpin %s?", topic),
				fmt.Sprintf("What are the technical challenges in implementing %s?", topic),
			},
		},
		{
			Name:  "Practical User",
			Focus: "Real-world applications and usability",
			Questions: []string{
				fmt.Sprintf("How is %s used in practice?", topic),
				fmt.Sprintf("What are the main use cases for %s?", topic),
				fmt.Sprintf("What benefits does %s provide to users?", topic),
			},
		},
		{
			Name:  "Critic",
			Focus: "Limitations, risks, and challenges",
			Questions: []string{
				fmt.Sprintf("What are the limitations of %s?", topic),
				fmt.Sprintf("What risks or drawbacks are associated with %s?", topic),
				fmt.Sprintf("What alternatives exist to %s?", topic),
			},
		},
	}
}

// CollectQuestions gathers all questions from a set of perspectives.
func CollectQuestions(perspectives []Perspective) []string {
	var questions []string
	for _, p := range perspectives {
		questions = append(questions, p.Questions...)
	}
	return questions
}
