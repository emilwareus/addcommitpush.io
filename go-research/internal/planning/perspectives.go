package planning

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/llm"
	"go-research/internal/session"
	"go-research/internal/tools"
)

// Perspective represents an expert viewpoint for multi-perspective research.
// Inspired by Stanford STORM's approach to simulated expert conversations.
type Perspective struct {
	Name      string   `json:"name"`
	Focus     string   `json:"focus"`
	Questions []string `json:"questions"`
}

// TopicOutline represents structure extracted from a related topic.
// Used in STORM's survey phase to inform perspective generation.
type TopicOutline struct {
	Topic    string   `json:"topic"`
	Sections []string `json:"sections"`
	Source   string   `json:"source"`
}

// PerspectiveDiscoverer identifies diverse expert perspectives for a topic.
type PerspectiveDiscoverer struct {
	client llm.ChatClient
	tools  tools.ToolExecutor
	model  string
}

// NewPerspectiveDiscoverer creates a new discoverer with the given LLM client.
// Deprecated: Use NewPerspectiveDiscovererWithTools for enhanced perspective discovery.
func NewPerspectiveDiscoverer(client llm.ChatClient) *PerspectiveDiscoverer {
	return &PerspectiveDiscoverer{client: client, model: client.GetModel()}
}

// NewPerspectiveDiscovererWithTools creates a discoverer with LLM client and search tools.
// This enables STORM-style related topic survey for better perspective generation.
func NewPerspectiveDiscovererWithTools(client llm.ChatClient, toolExec tools.ToolExecutor) *PerspectiveDiscoverer {
	return &PerspectiveDiscoverer{
		client: client,
		tools:  toolExec,
		model:  client.GetModel(),
	}
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

// SurveyRelatedTopics surveys related topics via web search and extracts their structure.
// This is inspired by STORM's FindRelatedTopic approach but uses web search instead of Wikipedia.
func (p *PerspectiveDiscoverer) SurveyRelatedTopics(ctx context.Context, topic string) ([]TopicOutline, session.CostBreakdown, error) {
	if p.tools == nil {
		return nil, session.CostBreakdown{}, nil // Return empty if no tools available
	}

	var totalCost session.CostBreakdown

	// Step 1: Generate search queries for related subtopics
	queryPrompt := fmt.Sprintf(`For the topic: "%s"

Generate 3-5 search queries that would find related topics and subtopics.
These should cover different angles: technical aspects, history, applications,
controversies, and related fields.

Return JSON array: ["query1", "query2", ...]`, topic)

	resp, err := p.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: queryPrompt},
	})
	if err != nil {
		return nil, totalCost, fmt.Errorf("generate survey queries: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, totalCost, fmt.Errorf("empty response from LLM")
	}

	totalCost.Add(session.NewCostBreakdown(p.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens))

	queries := parseStringArray(resp.Choices[0].Message.Content)
	if len(queries) == 0 {
		// Use topic directly if parsing fails
		queries = []string{topic + " overview", topic + " applications", topic + " challenges"}
	}

	// Step 2: Execute web searches for each query
	var allResults []string
	for _, query := range queries {
		result, err := p.tools.Execute(ctx, "search", map[string]interface{}{
			"query": query,
			"count": float64(3),
		})
		if err != nil {
			continue // Skip failed searches
		}
		allResults = append(allResults, result)
	}

	if len(allResults) == 0 {
		return nil, totalCost, nil // No results to extract from
	}

	// Step 3: Extract key sections/themes from search results
	extractPrompt := fmt.Sprintf(`From these search results about "%s", extract the key topics and their main sections/themes.

Search Results:
%s

For each distinct topic found, extract its main sections or aspects.
Return JSON array:
[
  {"topic": "Topic Name", "sections": ["Section 1", "Section 2", "Section 3"], "source": "URL if available"}
]

Focus on identifying diverse aspects and subtopics that would help create comprehensive research perspectives.`, topic, strings.Join(allResults, "\n---\n"))

	extractResp, err := p.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: extractPrompt},
	})
	if err != nil {
		return nil, totalCost, fmt.Errorf("extract outlines: %w", err)
	}

	if len(extractResp.Choices) == 0 {
		return nil, totalCost, nil
	}

	totalCost.Add(session.NewCostBreakdown(p.model, extractResp.Usage.PromptTokens, extractResp.Usage.CompletionTokens, extractResp.Usage.TotalTokens))

	outlines := parseTopicOutlines(extractResp.Choices[0].Message.Content)
	return outlines, totalCost, nil
}

// DiscoverWithSurvey generates perspectives informed by related topic structures.
// This is the STORM-aligned approach: survey first, then generate personas.
func (p *PerspectiveDiscoverer) DiscoverWithSurvey(ctx context.Context, topic string) ([]Perspective, session.CostBreakdown, error) {
	var totalCost session.CostBreakdown

	// Step 1: Survey related topics to get structural inspiration
	outlines, surveyCost, err := p.SurveyRelatedTopics(ctx, topic)
	totalCost.Add(surveyCost)
	if err != nil {
		// Fall back to regular discovery if survey fails
		return p.Discover(ctx, topic)
	}

	// Step 2: Format outlines as inspiration context
	inspirationContext := formatOutlinesAsContext(outlines)

	// Step 3: Generate personas with enhanced prompt (adapted from STORM's GenPersona)
	prompt := fmt.Sprintf(`For the research topic: "%s"

You need to select a group of research experts who will work together to create
a comprehensive research report. Each expert represents a different perspective,
role, or affiliation related to this topic.

Use these related topic structures for inspiration:
%s

For each expert perspective, provide:
1. Name (e.g., "Technical Expert", "Industry Analyst")
2. Focus area (what they prioritize in research)
3. 3-4 key questions they would investigate

Always include a "Basic Fact Writer" who covers fundamental information.

Return JSON array: [{"name": "...", "focus": "...", "questions": [...]}]`, topic, inspirationContext)

	resp, err := p.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, totalCost, fmt.Errorf("perspective discovery with survey: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, totalCost, fmt.Errorf("empty response from LLM")
	}

	totalCost.Add(session.NewCostBreakdown(p.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens))

	content := resp.Choices[0].Message.Content
	perspectives, err := p.parseResponse(content)
	if err != nil {
		return defaultPerspectives(topic), totalCost, nil
	}

	// Ensure we have a Basic Fact Writer
	perspectives = ensureBasicFactWriter(perspectives, topic)

	if len(perspectives) == 0 {
		return defaultPerspectives(topic), totalCost, nil
	}

	return perspectives, totalCost, nil
}

// formatOutlinesAsContext formats topic outlines into a string for the prompt.
func formatOutlinesAsContext(outlines []TopicOutline) string {
	if len(outlines) == 0 {
		return "(No related topics found - use your knowledge to generate diverse perspectives)"
	}

	var sb strings.Builder
	for _, outline := range outlines {
		sb.WriteString(fmt.Sprintf("Topic: %s\n", outline.Topic))
		sb.WriteString("  Sections: ")
		sb.WriteString(strings.Join(outline.Sections, ", "))
		sb.WriteString("\n")
	}
	return sb.String()
}

// parseStringArray extracts a JSON string array from content.
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

// parseTopicOutlines extracts topic outlines from LLM response.
func parseTopicOutlines(content string) []TopicOutline {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil
	}

	var outlines []TopicOutline
	if err := json.Unmarshal([]byte(content[start:end]), &outlines); err != nil {
		return nil
	}
	return outlines
}

// ensureBasicFactWriter ensures there is a Basic Fact Writer perspective.
func ensureBasicFactWriter(perspectives []Perspective, topic string) []Perspective {
	for _, p := range perspectives {
		if strings.Contains(strings.ToLower(p.Name), "basic") ||
			strings.Contains(strings.ToLower(p.Name), "fact") ||
			strings.Contains(strings.ToLower(p.Name), "foundational") {
			return perspectives
		}
	}

	// Add Basic Fact Writer at the beginning
	basicWriter := Perspective{
		Name:  "Basic Fact Writer",
		Focus: "Fundamental information and essential definitions",
		Questions: []string{
			fmt.Sprintf("What is %s and how is it defined?", topic),
			fmt.Sprintf("What are the key components or elements of %s?", topic),
			fmt.Sprintf("What is the history or origin of %s?", topic),
		},
	}
	return append([]Perspective{basicWriter}, perspectives...)
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
