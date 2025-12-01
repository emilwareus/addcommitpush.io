package repl

import (
	"sync"

	"go-research/internal/events"
)

// Visualizer handles the interactive worker display
type Visualizer struct {
	ctx      *Context
	display  *MultiWorkerDisplay
	stopCh   chan struct{}
	doneCh   chan struct{}
	stopOnce sync.Once
}

// NewVisualizer creates a new visualizer
func NewVisualizer(ctx *Context) *Visualizer {
	return &Visualizer{
		ctx:     ctx,
		display: NewMultiWorkerDisplay(ctx.Renderer.StreamWriter()),
		stopCh:  make(chan struct{}),
		doneCh:  make(chan struct{}),
	}
}

// Start begins the visualization
func (v *Visualizer) Start() {
	// Mute default renderer
	v.ctx.Renderer.Mute()

	// Subscribe to events
	eventCh := v.ctx.Bus.Subscribe(
		events.EventPlanCreated,
		events.EventWorkerStarted,
		events.EventWorkerProgress,
		events.EventWorkerComplete,
		events.EventWorkerFailed,
		events.EventLLMChunk,
		events.EventToolCall,
		events.EventIterationStarted,
		events.EventAnalysisStarted,
		events.EventAnalysisProgress,
		events.EventAnalysisComplete,
		events.EventSynthesisStarted,
		events.EventSynthesisProgress,
		events.EventSynthesisComplete,
		events.EventCostUpdated,
	)

	go func() {
		defer close(v.doneCh)
		for {
			select {
			case <-v.stopCh:
				return
			case event := <-eventCh:
				// Initialize display when we know worker count
				if event.Type == events.EventPlanCreated {
					if data, ok := event.Data.(events.PlanCreatedData); ok {
						v.display.InitWorkers(data.WorkerCount)
						v.display.Start()
					}
					continue
				}
				v.display.HandleEvent(event)
			}
		}
	}()
}

// Stop halts the visualization and restores normal output
func (v *Visualizer) Stop() {
	v.stopOnce.Do(func() {
		close(v.stopCh)
		<-v.doneCh       // Wait for loop to exit
		v.display.Stop() // Clean up display
		v.ctx.Renderer.Unmute()
	})
}
