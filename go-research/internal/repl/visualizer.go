package repl

import (
	"sync"

	"go-research/internal/events"
)

// Visualizer handles the interactive worker display
type Visualizer struct {
	ctx              *Context
	dagDisplay       *DAGDisplay
	display          *MultiWorkerDisplay
	analysisProgress *AnalysisProgressDisplay
	stopCh           chan struct{}
	doneCh           chan struct{}
	stopOnce         sync.Once
}

// NewVisualizer creates a new visualizer
func NewVisualizer(ctx *Context) *Visualizer {
	w := ctx.Renderer.StreamWriter()
	return &Visualizer{
		ctx:              ctx,
		dagDisplay:       NewDAGDisplay(w),
		display:          NewMultiWorkerDisplay(w),
		analysisProgress: NewAnalysisProgressDisplay(w),
		stopCh:           make(chan struct{}),
		doneCh:           make(chan struct{}),
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
		// Cross-validation & gap-filling progress events
		events.EventCrossValidationStarted,
		events.EventCrossValidationProgress,
		events.EventCrossValidationComplete,
		events.EventGapFillingStarted,
		events.EventGapFillingProgress,
		events.EventGapFillingComplete,
	)

	go func() {
		defer close(v.doneCh)
		for {
			select {
			case <-v.stopCh:
				return
			case event := <-eventCh:
				// When plan is created, first render DAG visualization, then init worker panels
				if event.Type == events.EventPlanCreated {
					if data, ok := event.Data.(events.PlanCreatedData); ok {
						// Render the DAG visualization first
						v.dagDisplay.Render(data)
						// Then initialize and start the worker panels
						v.display.InitWorkers(data.WorkerCount)
						v.display.Start()
					}
					continue
				}

				// Route cross-validation and gap-filling events to the analysis progress display
				switch event.Type {
				case events.EventCrossValidationStarted,
					events.EventCrossValidationProgress,
					events.EventCrossValidationComplete,
					events.EventGapFillingStarted,
					events.EventGapFillingProgress,
					events.EventGapFillingComplete:
					v.analysisProgress.HandleEvent(event)
				default:
					v.display.HandleEvent(event)
				}
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
