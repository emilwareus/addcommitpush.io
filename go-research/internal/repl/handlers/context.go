package handlers

import (
	"fmt"
	"strings"

	"go-research/internal/repl"
	"go-research/internal/session"
)

// ContextHandler handles /context command
type ContextHandler struct{}

// Execute runs the context command
func (h *ContextHandler) Execute(ctx *repl.Context, args []string) error {
	if ctx.Session == nil {
		return fmt.Errorf("no active session. Start research first with /fast, /storm, or /think_deep")
	}

	// Parse flags
	verbose := false
	for _, arg := range args {
		if arg == "-v" || arg == "--verbose" {
			verbose = true
		}
	}

	// Build context snapshot
	maxTokens := ctx.Config.MaxTokens
	if maxTokens == 0 {
		maxTokens = 50000 // Default fallback
	}

	snapshot, err := session.BuildContextSnapshot(ctx.Session, ctx.Store, maxTokens)
	if err != nil {
		return fmt.Errorf("build context snapshot: %w", err)
	}

	// Render based on mode
	if verbose {
		h.renderVerbose(ctx, snapshot)
	} else {
		h.renderSummary(ctx, snapshot)
	}

	return nil
}

// renderSummary renders a concise overview of context statistics
func (h *ContextHandler) renderSummary(ctx *repl.Context, snapshot *session.ContextSnapshot) {
	renderer := ctx.Renderer

	renderer.Info("Context Usage")
	fmt.Fprintf(renderer.StreamWriter(), "\n")

	// Session info
	fmt.Fprintf(renderer.StreamWriter(), "Session: %s\n", snapshot.SessionID)
	fmt.Fprintf(renderer.StreamWriter(), "Mode: %s | Status: %s\n", snapshot.Mode, snapshot.Status)
	if snapshot.Query != "" {
		fmt.Fprintf(renderer.StreamWriter(), "Query: %s\n", truncateString(snapshot.Query, 60))
	}
	fmt.Fprintf(renderer.StreamWriter(), "\n")

	// Token usage
	tokenPercent := 0.0
	if snapshot.MaxTokens > 0 {
		tokenPercent = float64(snapshot.EstimatedTokens) / float64(snapshot.MaxTokens) * 100
	}
	fmt.Fprintf(renderer.StreamWriter(), "Tokens: %d/%d (%.1f%%)\n",
		snapshot.EstimatedTokens, snapshot.MaxTokens, tokenPercent)

	// Visual token representation (10x10 grid)
	gridSize := 100
	filled := int(float64(gridSize) * tokenPercent / 100)
	if filled > gridSize {
		filled = gridSize
	}
	fmt.Fprintf(renderer.StreamWriter(), "Visual: ")
	for i := 0; i < gridSize; i++ {
		if i < filled {
			fmt.Fprintf(renderer.StreamWriter(), "█")
		} else {
			fmt.Fprintf(renderer.StreamWriter(), "░")
		}
		if (i+1)%10 == 0 && i < gridSize-1 {
			fmt.Fprintf(renderer.StreamWriter(), "\n        ")
		}
	}
	fmt.Fprintf(renderer.StreamWriter(), "\n\n")

	// Breakdown by category
	fmt.Fprintf(renderer.StreamWriter(), "Breakdown:\n")
	fmt.Fprintf(renderer.StreamWriter(), "  Report: %d chars (%d tokens)\n",
		snapshot.ReportLength, snapshot.ReportLength/4)
	fmt.Fprintf(renderer.StreamWriter(), "  Sources: %d\n", snapshot.SourcesCount)
	fmt.Fprintf(renderer.StreamWriter(), "  Insights: %d\n", snapshot.InsightsCount)
	fmt.Fprintf(renderer.StreamWriter(), "  Workers: %d\n", snapshot.WorkersCount)
	fmt.Fprintf(renderer.StreamWriter(), "  Iterations: %d\n", snapshot.IterationsCount)
	fmt.Fprintf(renderer.StreamWriter(), "  Tool calls: %d\n", snapshot.ToolCallsCount)

	// Think-deep specific stats
	if snapshot.HasThinkDeepContext {
		fmt.Fprintf(renderer.StreamWriter(), "\nThink-Deep Context:\n")
		fmt.Fprintf(renderer.StreamWriter(), "  Previous findings: %d\n", snapshot.ThinkDeepFindings)
		fmt.Fprintf(renderer.StreamWriter(), "  Visited URLs: %d\n", snapshot.ThinkDeepVisitedURLs)
		if snapshot.ThinkDeepHasReport {
			fmt.Fprintf(renderer.StreamWriter(), "  Has existing report: yes\n")
		}
	}

	// Cost
	if snapshot.Cost.TotalCost > 0 {
		fmt.Fprintf(renderer.StreamWriter(), "\nCost: $%.4f\n", snapshot.Cost.TotalCost)
		fmt.Fprintf(renderer.StreamWriter(), "  Input tokens: %d ($%.4f)\n",
			snapshot.Cost.InputTokens, snapshot.Cost.InputCost)
		fmt.Fprintf(renderer.StreamWriter(), "  Output tokens: %d ($%.4f)\n",
			snapshot.Cost.OutputTokens, snapshot.Cost.OutputCost)
	}

	fmt.Fprintf(renderer.StreamWriter(), "\n")
	fmt.Fprintf(renderer.StreamWriter(), "Use /context -v to see full raw context\n")
}

// renderVerbose renders the full raw context string
func (h *ContextHandler) renderVerbose(ctx *repl.Context, snapshot *session.ContextSnapshot) {
	renderer := ctx.Renderer

	renderer.Info("Full Context (Verbose Mode)")
	fmt.Fprintf(renderer.StreamWriter(), "\n")
	fmt.Fprintf(renderer.StreamWriter(), "Session: %s\n", snapshot.SessionID)
	fmt.Fprintf(renderer.StreamWriter(), "Estimated tokens: %d\n", snapshot.EstimatedTokens)
	fmt.Fprintf(renderer.StreamWriter(), "Context length: %d chars\n\n", len(snapshot.RawContext))
	fmt.Fprint(renderer.StreamWriter(), strings.Repeat("=", 80))
	fmt.Fprint(renderer.StreamWriter(), "\n\n")

	// Print raw context
	if snapshot.RawContext == "" {
		fmt.Fprint(renderer.StreamWriter(), "(No context available)\n")
	} else {
		fmt.Fprintf(renderer.StreamWriter(), "%s\n", snapshot.RawContext)
	}

	fmt.Fprint(renderer.StreamWriter(), "\n")
	fmt.Fprint(renderer.StreamWriter(), strings.Repeat("=", 80))
	fmt.Fprint(renderer.StreamWriter(), "\n")
}

// truncateString truncates a string to max length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
