package handlers

import (
	"fmt"
	"strings"

	"go-research/internal/orchestrator"
	"go-research/internal/repl"
)

// RecompileHandler handles /recompile command
type RecompileHandler struct{}

// Execute recompiles the report from worker outputs
func (h *RecompileHandler) Execute(ctx *repl.Context, args []string) error {
	if ctx.Session == nil {
		return fmt.Errorf("no active session")
	}

	if len(ctx.Session.Workers) == 0 {
		return fmt.Errorf("no worker results to synthesize")
	}

	instructions := ""
	if len(args) > 0 {
		instructions = strings.Join(args, " ")
	}

	ctx.Renderer.RecompileStarting()
	if instructions != "" {
		ctx.Renderer.Verbose(ctx.Config.Verbose, fmt.Sprintf("Instructions: %s", truncateReport(instructions, 50)))
	}

	synth := orchestrator.NewSynthesizer(ctx.Bus, ctx.Config)

	// Use the cancelable context from REPL
	report, err := synth.Synthesize(
		ctx.RunContext,
		ctx.Session.Query,
		ctx.Session.Workers,
		instructions,
	)
	if err != nil {
		return fmt.Errorf("recompile failed: %w", err)
	}

	ctx.Session.Report = report
	ctx.Session.Version++

	if saveErr := ctx.Store.Save(ctx.Session); saveErr != nil {
		return fmt.Errorf("save session: %w", saveErr)
	}

	ctx.Renderer.RecompileComplete(ctx.Session.Report)

	return nil
}

func truncateReport(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
