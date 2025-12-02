package agent

import (
	"context"

	"go-research/internal/events"
	"go-research/internal/session"
)

// Worker wraps a ReAct agent for use in the worker pool
type Worker struct {
	agent     *React
	workerNum int
}

// NewWorker creates a new worker
func NewWorker(config Config, bus *events.Bus, workerNum int) *Worker {
	// Set worker number in config for event emission
	config.WorkerNum = workerNum
	return &Worker{
		agent:     NewReact(config, bus),
		workerNum: workerNum,
	}
}

// Research executes research for the given objective
func (w *Worker) Research(ctx context.Context, objective string) (session.WorkerContext, error) {
	workerCtx, err := w.agent.Research(ctx, objective)
	workerCtx.WorkerNum = w.workerNum
	return workerCtx, err
}

// WorkerNum returns the worker number
func (w *Worker) WorkerNum() int {
	return w.workerNum
}
