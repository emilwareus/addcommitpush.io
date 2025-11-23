package handlers

import (
	"fmt"

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
	help := `
Just type your question to start deep research!
After research, type follow-up questions to expand.

Commands:
  /fast <query>      - Quick single-worker research
  /deep <query>      - Multi-worker deep research
  /expand <text>     - Expand on current research
  /sessions          - List all sessions
  /load <id>         - Load a session
  /new               - Clear session and start fresh
  /workers           - Show workers in current session
  /rerun <n>         - Re-run worker n
  /recompile [text]  - Recompile report with optional instructions
  /model [name]      - Show/set model
  /verbose           - Toggle verbose output
  /help              - Show this help
  /quit              - Exit
`
	ctx.Renderer.Info(help)
	return nil
}

// QuitHandler handles /quit command
type QuitHandler struct{}

// Execute signals the REPL to quit
func (h *QuitHandler) Execute(ctx *repl.Context, args []string) error {
	return fmt.Errorf("quit")
}
