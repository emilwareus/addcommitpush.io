package agents

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/planning"
	"go-research/internal/session"
	"go-research/internal/tools"
)

// DialogueTurn represents one Q&A exchange in a conversation.
// This is the fundamental unit of STORM's conversation simulation.
type DialogueTurn struct {
	Question      string   `json:"question"`
	Answer        string   `json:"answer"`
	SearchQueries []string `json:"search_queries"`
	Sources       []string `json:"sources"`
	TurnNumber    int      `json:"turn_number"`
}

// ConversationResult contains the full dialogue for one perspective.
type ConversationResult struct {
	Perspective planning.Perspective  `json:"perspective"`
	Turns       []DialogueTurn        `json:"turns"`
	Facts       []Fact                `json:"facts"` // Extracted from answers
	TotalCost   session.CostBreakdown `json:"total_cost"`
}

// ConversationSimulator orchestrates WikiWriter↔TopicExpert dialogues.
// This implements STORM's core innovation: simulated expert conversations.
type ConversationSimulator struct {
	client   llm.ChatClient
	tools    tools.ToolExecutor
	maxTurns int
	bus      *events.Bus
	model    string
}

// ConversationConfig configures the conversation simulator.
type ConversationConfig struct {
	MaxTurns int // Default: 3-5 turns per perspective
}

// DefaultConversationConfig returns sensible defaults.
func DefaultConversationConfig() ConversationConfig {
	return ConversationConfig{
		MaxTurns: 4,
	}
}

// NewConversationSimulator creates a new conversation simulator.
func NewConversationSimulator(client llm.ChatClient, toolExec tools.ToolExecutor, cfg ConversationConfig) *ConversationSimulator {
	if cfg.MaxTurns == 0 {
		cfg.MaxTurns = 4
	}
	return &ConversationSimulator{
		client:   client,
		tools:    toolExec,
		maxTurns: cfg.MaxTurns,
		model:    client.GetModel(),
	}
}

// NewConversationSimulatorWithBus creates a simulator with event bus for progress reporting.
func NewConversationSimulatorWithBus(client llm.ChatClient, toolExec tools.ToolExecutor, bus *events.Bus, cfg ConversationConfig) *ConversationSimulator {
	sim := NewConversationSimulator(client, toolExec, cfg)
	sim.bus = bus
	return sim
}

// SimulateConversation runs a multi-turn WikiWriter↔TopicExpert dialogue.
// This is the core STORM mechanism that replaces ReAct loops.
func (s *ConversationSimulator) SimulateConversation(
	ctx context.Context,
	topic string,
	perspective planning.Perspective,
) (*ConversationResult, error) {
	var history []DialogueTurn
	var totalCost session.CostBreakdown

	for turn := 0; turn < s.maxTurns; turn++ {
		// 1. WikiWriter asks question (with persona + history)
		question, cost, err := s.wikiWriterAsk(ctx, topic, perspective, history)
		if err != nil {
			return nil, fmt.Errorf("wikiWriter turn %d: %w", turn+1, err)
		}
		totalCost.Add(cost)

		// 2. Check for conversation end
		if strings.Contains(question, "Thank you so much for your help!") ||
			strings.Contains(question, "Thank you for your help") ||
			strings.Contains(strings.ToLower(question), "that covers everything") {
			break
		}

		// 3. TopicExpert generates search queries
		queries, cost, err := s.expertGenerateQueries(ctx, topic, question)
		if err != nil {
			return nil, fmt.Errorf("expertGenerateQueries turn %d: %w", turn+1, err)
		}
		totalCost.Add(cost)

		// 4. Execute searches
		results, sources, err := s.executeSearches(ctx, queries)
		if err != nil {
			return nil, fmt.Errorf("executeSearches turn %d: %w", turn+1, err)
		}

		// 5. TopicExpert synthesizes answer from search results
		answer, cost, err := s.expertAnswer(ctx, topic, question, results)
		if err != nil {
			return nil, fmt.Errorf("expertAnswer turn %d: %w", turn+1, err)
		}
		totalCost.Add(cost)

		// 6. Record turn
		history = append(history, DialogueTurn{
			Question:      question,
			Answer:        answer,
			SearchQueries: queries,
			Sources:       sources,
			TurnNumber:    turn + 1,
		})

		// Emit progress event with proper conversation data
		if s.bus != nil {
			s.bus.Publish(events.Event{
				Type: events.EventConversationProgress,
				Data: events.ConversationProgressData{
					Perspective: perspective.Name,
					Turn:        turn + 1,
					MaxTurns:    s.maxTurns,
					Question:    question,
					Sources:     len(sources),
				},
			})
		}
	}

	// Extract facts from conversation answers
	facts, extractCost, err := s.extractFactsFromConversation(ctx, topic, history)
	if err != nil {
		// Continue without extracted facts if extraction fails
		facts = nil
	}
	totalCost.Add(extractCost)

	return &ConversationResult{
		Perspective: perspective,
		Turns:       history,
		Facts:       facts,
		TotalCost:   totalCost,
	}, nil
}

// wikiWriterAsk generates a question from the WikiWriter perspective.
// Implements STORM's AskQuestionWithPersona prompt.
func (s *ConversationSimulator) wikiWriterAsk(
	ctx context.Context,
	topic string,
	perspective planning.Perspective,
	history []DialogueTurn,
) (string, session.CostBreakdown, error) {
	var prompt string

	if len(history) == 0 {
		// First question - no history
		prompt = fmt.Sprintf(`You are a %s researching "%s".
Your focus: %s

You are starting a conversation with a research expert to gather information
for a comprehensive report. Ask your first question based on your perspective.

Key areas you want to investigate:
- %s

Ask a specific, focused question that will help you understand this topic better.
Your question:`, perspective.Name, topic, perspective.Focus, strings.Join(perspective.Questions, "\n- "))
	} else {
		// Follow-up question with history
		historyStr := formatDialogueHistory(history)
		prompt = fmt.Sprintf(`You are a %s researching "%s".
Your focus: %s

Conversation so far:
%s

Based on what you've learned, ask a follow-up question to deepen your understanding.
Focus on aspects not yet covered or areas that need clarification.

If you feel you have gathered enough information from this perspective, say:
"Thank you so much for your help!"

Your next question or thank you message:`, perspective.Name, topic, perspective.Focus, historyStr)
	}

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", session.CostBreakdown{}, fmt.Errorf("wikiWriter ask: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", session.CostBreakdown{}, fmt.Errorf("empty response from LLM")
	}

	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	return strings.TrimSpace(resp.Choices[0].Message.Content), cost, nil
}

// expertGenerateQueries converts a question into search queries.
// Implements STORM's QuestionToQuery prompt.
func (s *ConversationSimulator) expertGenerateQueries(
	ctx context.Context,
	topic string,
	question string,
) ([]string, session.CostBreakdown, error) {
	prompt := fmt.Sprintf(`Topic: %s
Question: %s

Generate 1-3 search queries to find information that answers this question.
Focus on factual, verifiable information from reliable sources.

Return JSON array: ["query1", "query2"]`, topic, question)

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		// Fall back to using the question directly
		return []string{question}, session.CostBreakdown{}, nil
	}

	if len(resp.Choices) == 0 {
		return []string{question}, session.CostBreakdown{}, nil
	}

	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	queries := parseStringArrayFromContent(resp.Choices[0].Message.Content)

	if len(queries) == 0 {
		return []string{question}, cost, nil
	}

	return queries, cost, nil
}

// executeSearches runs web searches and returns results with sources.
func (s *ConversationSimulator) executeSearches(ctx context.Context, queries []string) ([]string, []string, error) {
	var results []string
	var sources []string

	for _, query := range queries {
		result, err := s.tools.Execute(ctx, "search", map[string]interface{}{
			"query": query,
			"count": float64(5),
		})
		if err != nil {
			continue // Skip failed searches
		}
		results = append(results, result)

		// Extract URLs from search results
		urls := tools.ExtractURLs(result)
		sources = append(sources, urls...)
	}

	return results, sources, nil
}

// expertAnswer synthesizes an answer from search results with citations.
// Implements STORM's AnswerQuestion prompt.
func (s *ConversationSimulator) expertAnswer(
	ctx context.Context,
	topic string,
	question string,
	searchResults []string,
) (string, session.CostBreakdown, error) {
	if len(searchResults) == 0 {
		return "I couldn't find relevant information to answer this question.", session.CostBreakdown{}, nil
	}

	prompt := fmt.Sprintf(`Topic: %s
Question: %s

Search Results:
%s

Synthesize a comprehensive answer using ONLY information from the search results.
Cite sources inline using [Source: URL] format.
If the search results don't contain relevant information, say so honestly.

Your answer:`, topic, question, strings.Join(searchResults, "\n---\n"))

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", session.CostBreakdown{}, fmt.Errorf("expert answer: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", session.CostBreakdown{}, fmt.Errorf("empty response from LLM")
	}

	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	return strings.TrimSpace(resp.Choices[0].Message.Content), cost, nil
}

// extractFactsFromConversation extracts structured facts from conversation turns.
func (s *ConversationSimulator) extractFactsFromConversation(
	ctx context.Context,
	topic string,
	history []DialogueTurn,
) ([]Fact, session.CostBreakdown, error) {
	if len(history) == 0 {
		return nil, session.CostBreakdown{}, nil
	}

	// Build conversation content
	var conversationContent strings.Builder
	for _, turn := range history {
		conversationContent.WriteString(fmt.Sprintf("Q: %s\n", turn.Question))
		conversationContent.WriteString(fmt.Sprintf("A: %s\n\n", turn.Answer))
	}

	prompt := fmt.Sprintf(`From this conversation about "%s", extract key factual claims:

%s

Return JSON array:
[
  {"content": "factual claim", "source": "URL if mentioned", "confidence": 0.0-1.0}
]

Only include verifiable facts, not opinions. If no source URL is found, use "unknown".`, topic, conversationContent.String())

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, session.CostBreakdown{}, fmt.Errorf("extract facts: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, session.CostBreakdown{}, nil
	}

	cost := session.NewCostBreakdown(s.model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	facts := parseFactsFromContent(resp.Choices[0].Message.Content)

	return facts, cost, nil
}

// formatDialogueHistory formats conversation history for prompts.
func formatDialogueHistory(history []DialogueTurn) string {
	var sb strings.Builder
	for _, turn := range history {
		sb.WriteString(fmt.Sprintf("You asked: %s\n", turn.Question))
		sb.WriteString(fmt.Sprintf("Expert answered: %s\n\n", turn.Answer))
	}
	return sb.String()
}

// parseStringArrayFromContent extracts a JSON string array from LLM response.
func parseStringArrayFromContent(content string) []string {
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

// parseFactsFromContent extracts facts from LLM response.
func parseFactsFromContent(content string) []Fact {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start < 0 || end <= start {
		return nil
	}

	var facts []Fact
	if err := json.Unmarshal([]byte(content[start:end]), &facts); err != nil {
		return nil
	}
	return facts
}

// GetAllFacts collects all facts from multiple conversation results.
func GetAllFacts(conversations map[string]*ConversationResult) []Fact {
	var allFacts []Fact
	for _, conv := range conversations {
		allFacts = append(allFacts, conv.Facts...)
	}
	return allFacts
}

// GetAllSources collects all unique sources from multiple conversation results.
func GetAllSources(conversations map[string]*ConversationResult) []string {
	seen := make(map[string]bool)
	var sources []string

	for _, conv := range conversations {
		for _, turn := range conv.Turns {
			for _, source := range turn.Sources {
				if !seen[source] {
					seen[source] = true
					sources = append(sources, source)
				}
			}
		}
	}
	return sources
}
