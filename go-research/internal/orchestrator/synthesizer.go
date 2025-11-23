package orchestrator

import (
	"context"
	"fmt"
	"strings"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
)

// Synthesizer combines worker results into a final report
type Synthesizer struct {
	bus    *events.Bus
	client llm.ChatClient
}

// NewSynthesizer creates a new synthesizer
func NewSynthesizer(bus *events.Bus, cfg *config.Config) *Synthesizer {
	return &Synthesizer{
		bus:    bus,
		client: llm.NewClient(cfg),
	}
}

// NewSynthesizerWithClient creates a synthesizer with an injected client (for testing)
func NewSynthesizerWithClient(bus *events.Bus, client llm.ChatClient) *Synthesizer {
	return &Synthesizer{
		bus:    bus,
		client: client,
	}
}

// Synthesize combines worker outputs into a coherent report
func (s *Synthesizer) Synthesize(ctx context.Context, query string, workers []session.WorkerContext, instructions string) (string, error) {
	// Build context from worker outputs
	var workerSummaries strings.Builder
	for i, w := range workers {
		workerSummaries.WriteString(fmt.Sprintf("\n### Worker %d: %s\n\n%s\n",
			i+1, w.Objective, w.FinalOutput))
	}

	instructionSection := ""
	if instructions != "" {
		instructionSection = fmt.Sprintf("\nAdditional instructions: %s\n", instructions)
	}

	prompt := fmt.Sprintf(`Synthesize these research findings into a comprehensive report.

Original Query: %s

Worker Findings:
%s
%s
Create a well-structured report that:
1. Answers the original query comprehensively
2. Synthesizes insights from all workers
3. Highlights key findings and implications
4. Notes any contradictions or gaps
5. Provides actionable conclusions

Write the report in markdown format.`, query, workerSummaries.String(), instructionSection)

	resp, err := s.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", fmt.Errorf("synthesis failed: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from LLM")
	}

	return resp.Choices[0].Message.Content, nil
}
