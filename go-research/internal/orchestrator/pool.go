package orchestrator

import (
	"context"
	"sync"

	"go-research/internal/agent"
	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/session"
)

// AgentFactory creates agents for workers (allows mocking in tests)
type AgentFactory func(config agent.Config, bus *events.Bus, workerNum int) AgentRunner

// AgentRunner is the interface for running research (allows mocking)
type AgentRunner interface {
	Research(ctx context.Context, objective string) (session.WorkerContext, error)
}

// WorkerPool manages concurrent worker execution
type WorkerPool struct {
	bus          *events.Bus
	maxWorkers   int
	agentConfig  agent.Config
	agentFactory AgentFactory
}

// NewPool creates a new worker pool
func NewPool(bus *events.Bus, cfg *config.Config) *WorkerPool {
	return &WorkerPool{
		bus:         bus,
		maxWorkers:  cfg.MaxWorkers,
		agentConfig: agent.DefaultConfig(cfg),
		agentFactory: func(config agent.Config, bus *events.Bus, workerNum int) AgentRunner {
			return agent.NewWorker(config, bus, workerNum)
		},
	}
}

// NewPoolWithFactory creates a pool with a custom agent factory (for testing)
func NewPoolWithFactory(bus *events.Bus, cfg *config.Config, factory AgentFactory) *WorkerPool {
	return &WorkerPool{
		bus:          bus,
		maxWorkers:   cfg.MaxWorkers,
		agentConfig:  agent.DefaultConfig(cfg),
		agentFactory: factory,
	}
}

// WorkerResult contains the outcome of a worker's research
type WorkerResult struct {
	Task    Task
	Context session.WorkerContext
	Error   error
}

// Execute runs all tasks concurrently and collects results
func (p *WorkerPool) Execute(ctx context.Context, tasks []Task) []WorkerResult {
	var (
		wg      sync.WaitGroup
		results = make([]WorkerResult, len(tasks))
		taskCh  = make(chan int, len(tasks)) // Task indices
	)

	// Spawn worker goroutines (up to maxWorkers)
	numWorkers := min(p.maxWorkers, len(tasks))
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for idx := range taskCh {
				results[idx] = p.executeTask(ctx, tasks[idx])
			}
		}()
	}

	// Send tasks to workers
	for i := range tasks {
		taskCh <- i
	}
	close(taskCh)

	wg.Wait()
	return results
}

// executeTask runs a single worker agent
func (p *WorkerPool) executeTask(ctx context.Context, task Task) WorkerResult {
	p.bus.Publish(events.Event{
		Type: events.EventWorkerStarted,
		Data: events.WorkerProgressData{
			WorkerID:  task.ID,
			WorkerNum: task.WorkerNum,
			Objective: task.Objective,
			Status:    "starting",
		},
	})

	worker := p.agentFactory(p.agentConfig, p.bus, task.WorkerNum)
	workerCtx, err := worker.Research(ctx, task.Objective)

	result := WorkerResult{
		Task:    task,
		Context: workerCtx,
		Error:   err,
	}

	if err != nil {
		p.bus.Publish(events.Event{
			Type: events.EventWorkerFailed,
			Data: events.WorkerProgressData{
				WorkerID:  task.ID,
				WorkerNum: task.WorkerNum,
				Status:    "failed",
				Message:   err.Error(),
			},
		})
	} else {
		p.bus.Publish(events.Event{
			Type: events.EventWorkerComplete,
			Data: events.WorkerProgressData{
				WorkerID:  task.ID,
				WorkerNum: task.WorkerNum,
				Status:    "complete",
			},
		})
	}

	return result
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
