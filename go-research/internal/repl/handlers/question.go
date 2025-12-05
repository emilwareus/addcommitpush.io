// Package handlers provides REPL command handlers.
package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go-research/internal/llm"
	"go-research/internal/repl"
	"go-research/internal/session"
)

// QuestionHandler answers questions from existing session content without performing new research.
type QuestionHandler struct{}

// Execute runs the question-answering workflow against the current session.
func (h *QuestionHandler) Execute(ctx *repl.Context, args []string) error {
	if ctx.Session == nil {
		return fmt.Errorf("no active session. Start research first with /fast, /storm, or /think_deep")
	}

	if len(args) == 0 {
		return fmt.Errorf("usage: /question <your question>")
	}

	question := strings.Join(args, " ")

	// Build QA context from session chain
	qaContext := h.buildQAContext(ctx)

	ctx.Renderer.Info("Searching existing research for answer...")

	// Call LLM to answer
	answer, err := h.answerFromContext(ctx, question, qaContext)
	if err != nil {
		return fmt.Errorf("answer question: %w", err)
	}

	// Render answer
	ctx.Renderer.Answer(answer)

	return nil
}

// buildQAContext builds context from all sessions in the chain.
func (h *QuestionHandler) buildQAContext(ctx *repl.Context) string {
	var sessions []*session.Session

	// Walk up the session chain via ParentID
	current := ctx.Session
	for current != nil {
		sessions = append([]*session.Session{current}, sessions...) // Prepend for chronological order
		if current.ParentID == nil {
			break
		}
		parent, err := ctx.Store.Load(*current.ParentID)
		if err != nil {
			break
		}
		current = parent
	}

	// Build context string with all reports and insights
	var contextBuilder strings.Builder
	for _, sess := range sessions {
		contextBuilder.WriteString(fmt.Sprintf("## Session: %s\n", sess.Query))
		contextBuilder.WriteString(fmt.Sprintf("Report:\n%s\n\n", truncateContext(sess.Report, 3000)))
		if len(sess.Insights) > 0 {
			contextBuilder.WriteString("Key insights:\n")
			for _, ins := range sess.Insights {
				contextBuilder.WriteString(fmt.Sprintf("- %s: %s\n", ins.Title, ins.Finding))
			}
			contextBuilder.WriteString("\n")
		}
		if len(sess.Sources) > 0 {
			contextBuilder.WriteString("Sources:\n")
			limit := len(sess.Sources)
			if limit > 10 {
				limit = 10
			}
			for _, src := range sess.Sources[:limit] {
				contextBuilder.WriteString(fmt.Sprintf("- %s\n", src))
			}
			contextBuilder.WriteString("\n")
		}
		contextBuilder.WriteString("---\n\n")
	}
	return contextBuilder.String()
}

// answerFromContext uses LLM to answer the question from existing research context.
func (h *QuestionHandler) answerFromContext(ctx *repl.Context, question, qaContext string) (string, error) {
	prompt := fmt.Sprintf(`You are a research assistant. Answer the following question using ONLY the provided research context. If the answer is not in the context, say "I don't have enough information to answer that based on the current research."

<context>
%s
</context>

Question: %s

Answer concisely and cite which session/report the information came from when possible.`, qaContext, question)

	// Create LLM client
	client := llm.NewClient(ctx.Config)

	// Use the cancelable context from REPL with timeout
	runCtx, cancel := context.WithTimeout(ctx.RunContext, 2*time.Minute)
	defer cancel()

	resp, err := client.Chat(runCtx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from LLM")
	}

	return resp.Choices[0].Message.Content, nil
}

// truncateContext truncates text to a maximum length for context building.
func truncateContext(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "...[truncated]"
}
