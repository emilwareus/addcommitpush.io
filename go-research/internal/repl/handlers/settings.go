package handlers

import (
	"fmt"
	"strings"

	"go-research/internal/repl"
)

// VerboseHandler handles /verbose command
type VerboseHandler struct{}

// Execute toggles verbose mode
func (h *VerboseHandler) Execute(ctx *repl.Context, args []string) error {
	ctx.Config.Verbose = !ctx.Config.Verbose
	if ctx.Config.Verbose {
		ctx.Renderer.Info("Verbose mode enabled")
	} else {
		ctx.Renderer.Info("Verbose mode disabled")
	}
	return nil
}

// ModelHandler handles /model command
type ModelHandler struct{}

// Execute shows or sets the current model
func (h *ModelHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		ctx.Renderer.Info(fmt.Sprintf("Current model: %s", ctx.Config.Model))
		return nil
	}

	ctx.Config.Model = args[0]
	ctx.Renderer.Info(fmt.Sprintf("Model set to: %s", ctx.Config.Model))
	return nil
}

// HelpHandler handles /help command
type HelpHandler struct{}

// Execute shows help information
func (h *HelpHandler) Execute(ctx *repl.Context, args []string) error {
	if len(ctx.CommandDocs) == 0 {
		ctx.Renderer.Info("No commands available.")
		return nil
	}

	lines := []string{
		"Just type your question to start research!",
		"After research, type follow-up questions to expand.",
		"",
		"Commands:",
	}

	categoryOrder := make([]string, 0)
	grouped := make(map[string][]repl.CommandDoc)
	for _, doc := range ctx.CommandDocs {
		grouped[doc.Category] = append(grouped[doc.Category], doc)
		if len(grouped[doc.Category]) == 1 {
			categoryOrder = append(categoryOrder, doc.Category)
		}
	}

	for _, category := range categoryOrder {
		if category == "" {
			continue
		}
		lines = append(lines, fmt.Sprintf("%s:", category))
		for _, doc := range grouped[category] {
			lines = append(lines, fmt.Sprintf("  %s - %s", doc.Usage, doc.Description))
		}
		lines = append(lines, "")
	}

	help := strings.Join(lines, "\n")
	ctx.Renderer.Info(help)
	return nil
}

// QuitHandler handles /quit command
type QuitHandler struct{}

// Execute signals the REPL to quit
func (h *QuitHandler) Execute(ctx *repl.Context, args []string) error {
	return fmt.Errorf("quit")
}
