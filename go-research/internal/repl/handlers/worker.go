package handlers

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"go-research/internal/agent"
	"go-research/internal/repl"
)

// WorkersHandler handles /workers command
type WorkersHandler struct{}

// Execute shows workers in the current session
func (h *WorkersHandler) Execute(ctx *repl.Context, args []string) error {
	if ctx.Session == nil {
		return fmt.Errorf("no active session")
	}

	if len(ctx.Session.Workers) == 0 {
		ctx.Renderer.Info("No workers in current session")
		return nil
	}

	// Build worker display data
	workers := make([]repl.WorkerDisplay, len(ctx.Session.Workers))
	for i, w := range ctx.Session.Workers {
		workers[i] = repl.WorkerDisplay{
			Number:      i + 1,
			Objective:   w.Objective,
			Status:      string(w.Status),
			SourceCount: len(w.Sources),
		}
	}

	ctx.Renderer.WorkerList(workers)
	return nil
}

// RerunHandler handles /rerun command
type RerunHandler struct{}

// Execute re-runs a specific worker by number
func (h *RerunHandler) Execute(ctx *repl.Context, args []string) error {
	if ctx.Session == nil {
		return fmt.Errorf("no active session")
	}

	if len(args) == 0 {
		return fmt.Errorf("usage: /rerun <worker_number>")
	}

	workerNum, err := strconv.Atoi(args[0])
	if err != nil || workerNum < 1 || workerNum > len(ctx.Session.Workers) {
		return fmt.Errorf("invalid worker number: %s (valid: 1-%d)", args[0], len(ctx.Session.Workers))
	}

	worker := ctx.Session.Workers[workerNum-1]
	ctx.Renderer.RerunStarting(workerNum, worker.Objective)

	// Re-run the worker with same objective
	agentCfg := agent.DefaultConfig(ctx.Config)
	reactAgent := agent.NewReact(agentCfg, ctx.Bus)

	// Use the cancelable context from REPL with timeout
	runCtx, cancel := context.WithTimeout(ctx.RunContext, 10*time.Minute)
	defer cancel()

	newWorkerCtx, err := reactAgent.Research(runCtx, worker.Objective)
	if err != nil {
		return fmt.Errorf("rerun failed: %w", err)
	}

	// Update session
	newWorkerCtx.WorkerNum = workerNum
	ctx.Session.Workers[workerNum-1] = newWorkerCtx
	ctx.Session.Version++

	if saveErr := ctx.Store.Save(ctx.Session); saveErr != nil {
		return fmt.Errorf("save session: %w", saveErr)
	}

	ctx.Renderer.RerunComplete(workerNum)
	ctx.Renderer.Verbose(ctx.Config.Verbose, fmt.Sprintf("Output: %s", truncateWorker(newWorkerCtx.FinalOutput, 200)))

	return nil
}

func truncateWorker(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
