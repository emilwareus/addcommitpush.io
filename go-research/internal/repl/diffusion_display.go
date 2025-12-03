package repl

import (
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"go-research/internal/events"

	"github.com/fatih/color"
)

const (
	diffusionProgressBarWidth = 25
)

var diffusionSpinner = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

// SubResearcherPanel tracks a sub-researcher's state for display
type SubResearcherPanel struct {
	Num          int
	Topic        string
	Status       string
	SourcesFound int
	Query        string // Current search query
	StartTime    time.Time
}

// DiffusionDisplay renders ThinkDeep's iterative diffusion process
type DiffusionDisplay struct {
	w               io.Writer
	mu              sync.Mutex
	iteration       int
	maxIterations   int
	subResearchers  map[int]*SubResearcherPanel
	activeResearchers []int // Track order of active researchers
	draftProgress   float64
	phase           string
	started         bool
	lastIteration   int // Track to avoid duplicate headers
	lastUpdate      time.Time
	spinnerIdx      int
	totalSources    int
	phasesComplete  int // Track completed phases (0-4)
}

// NewDiffusionDisplay creates a new diffusion display renderer
func NewDiffusionDisplay(w io.Writer) *DiffusionDisplay {
	return &DiffusionDisplay{
		w:              w,
		subResearchers: make(map[int]*SubResearcherPanel),
		activeResearchers: make([]int, 0),
	}
}

// Render displays the initial diffusion plan visualization
func (d *DiffusionDisplay) Render(topic string, maxIterations int) {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.maxIterations = maxIterations
	d.started = true
	d.phasesComplete = 0

	d.renderHeader(topic)
	d.renderCompactFlow(maxIterations)
	fmt.Fprintln(d.w)
}

func (d *DiffusionDisplay) renderHeader(topic string) {
	headerColor := color.New(color.FgHiMagenta, color.Bold)
	boxColor := color.New(color.FgMagenta)
	topicColor := color.New(color.FgWhite)

	fmt.Fprintln(d.w)
	boxColor.Fprintln(d.w, "╭──────────────────────────────────────────────────────────────────────────────╮")
	headerColor.Fprintf(d.w, "│%s│\n", centerText("🧠 THINKDEEP DIFFUSION RESEARCH", 78))
	boxColor.Fprintln(d.w, "│                                                                              │")

	// Truncate topic to fit
	maxTopicLen := 68
	displayTopic := topic
	if len(displayTopic) > maxTopicLen {
		displayTopic = displayTopic[:maxTopicLen-3] + "..."
	}
	topicLine := fmt.Sprintf("  Topic: %s", displayTopic)
	topicColor.Fprintf(d.w, "│%-78s│\n", topicLine)
	boxColor.Fprintln(d.w, "╰──────────────────────────────────────────────────────────────────────────────╯")
	fmt.Fprintln(d.w)
}

func (d *DiffusionDisplay) renderCompactFlow(maxIter int) {
	dimColor := color.New(color.Faint)

	// Single line showing the pipeline
	dimColor.Fprintf(d.w, "  Pipeline: ")
	blue.Fprintf(d.w, "BRIEF")
	dimColor.Fprintf(d.w, " → ")
	yellow.Fprintf(d.w, "DRAFT")
	dimColor.Fprintf(d.w, " → ")
	magenta.Fprintf(d.w, "DIFFUSE")
	dimColor.Fprintf(d.w, " (max %d iter) → ", maxIter)
	green.Fprintf(d.w, "FINALIZE")
	fmt.Fprintln(d.w)
}

// HandleEvent processes ThinkDeep-specific events
func (d *DiffusionDisplay) HandleEvent(event events.Event) {
	d.mu.Lock()
	defer d.mu.Unlock()

	switch event.Type {
	case events.EventDiffusionIterationStart:
		if data, ok := event.Data.(events.DiffusionIterationData); ok {
			// Only render if this is a new iteration (avoid duplicates)
			if data.Iteration > d.lastIteration {
				d.iteration = data.Iteration
				d.maxIterations = data.MaxIterations
				d.phase = data.Phase
				d.lastIteration = data.Iteration
				d.renderIterationStart(data)
			}
		}

	case events.EventResearchDelegated:
		if data, ok := event.Data.(events.SubResearcherData); ok {
			panel := &SubResearcherPanel{
				Num:       data.ResearcherNum,
				Topic:     data.Topic,
				Status:    "starting",
				StartTime: time.Now(),
			}
			d.subResearchers[data.ResearcherNum] = panel
			d.activeResearchers = append(d.activeResearchers, data.ResearcherNum)
			d.renderSubResearcherStart(panel)
		}

	case events.EventSubResearcherStarted, events.EventSubResearcherProgress:
		if data, ok := event.Data.(events.SubResearcherData); ok {
			if panel, ok := d.subResearchers[data.ResearcherNum]; ok {
				oldStatus := panel.Status
				panel.Status = data.Status
				panel.SourcesFound = data.SourcesFound

				// Only update display if status changed significantly
				if oldStatus != panel.Status {
					d.renderSubResearcherUpdate(panel)
				}
			}
		}

	case events.EventSubResearcherComplete:
		if data, ok := event.Data.(events.SubResearcherData); ok {
			if panel, ok := d.subResearchers[data.ResearcherNum]; ok {
				panel.Status = "complete"
				panel.SourcesFound = data.SourcesFound
				d.totalSources += data.SourcesFound
				d.renderSubResearcherComplete(panel)
			}
		}

	case events.EventDraftRefined:
		if data, ok := event.Data.(events.DraftRefinedData); ok {
			d.draftProgress = data.Progress
			d.renderDraftRefined(data)
		}

	case events.EventDiffusionComplete:
		d.renderDiffusionComplete()

	case events.EventFinalReportStarted:
		d.renderFinalReportStarted()

	case events.EventFinalReportComplete:
		d.renderFinalReportComplete()
	}
}

func (d *DiffusionDisplay) renderIterationStart(data events.DiffusionIterationData) {
	iterColor := color.New(color.FgHiMagenta, color.Bold)
	dimColor := color.New(color.Faint)

	fmt.Fprintln(d.w)

	// Progress bar for iterations
	progress := float64(data.Iteration) / float64(data.MaxIterations)
	filledWidth := int(progress * float64(diffusionProgressBarWidth))
	emptyWidth := diffusionProgressBarWidth - filledWidth
	if emptyWidth < 0 {
		emptyWidth = 0
	}

	progressBar := strings.Repeat("━", filledWidth) + strings.Repeat("─", emptyWidth)

	iterColor.Fprintf(d.w, "┌─ Iteration %d/%d ", data.Iteration, data.MaxIterations)
	dimColor.Fprintf(d.w, "[%s]", progressBar)
	fmt.Fprintln(d.w)

	// Reset sub-researchers for new iteration
	d.subResearchers = make(map[int]*SubResearcherPanel)
	d.activeResearchers = nil
}

func (d *DiffusionDisplay) renderSubResearcherStart(panel *SubResearcherPanel) {
	topicTrunc := panel.Topic
	if len(topicTrunc) > 55 {
		topicTrunc = topicTrunc[:52] + "..."
	}

	magenta.Fprintf(d.w, "│  ▶ ")
	white.Fprintf(d.w, "Sub-%d: ", panel.Num)
	dim.Fprintf(d.w, "%s\n", topicTrunc)
}

func (d *DiffusionDisplay) renderSubResearcherUpdate(panel *SubResearcherPanel) {
	// Throttle updates to prevent spam
	now := time.Now()
	if now.Sub(d.lastUpdate) < 100*time.Millisecond {
		return
	}
	d.lastUpdate = now

	d.spinnerIdx = (d.spinnerIdx + 1) % len(diffusionSpinner)
	spinner := diffusionSpinner[d.spinnerIdx]

	statusColor := yellow
	statusText := panel.Status

	switch panel.Status {
	case "searching":
		statusColor = yellow
		statusText = "searching web"
	case "thinking":
		statusColor = cyan
		statusText = "analyzing"
	case "compressing":
		statusColor = blue
		statusText = "compressing"
	}

	// Show compact inline status
	statusColor.Fprintf(d.w, "│    %s ", spinner)
	dim.Fprintf(d.w, "Sub-%d: %s", panel.Num, statusText)
	if panel.SourcesFound > 0 {
		dim.Fprintf(d.w, " [%d sources]", panel.SourcesFound)
	}
	fmt.Fprintln(d.w)
}

func (d *DiffusionDisplay) renderSubResearcherComplete(panel *SubResearcherPanel) {
	elapsed := time.Since(panel.StartTime).Round(time.Millisecond * 100)

	green.Fprintf(d.w, "│  ✓ ")
	white.Fprintf(d.w, "Sub-%d: ", panel.Num)
	green.Fprintf(d.w, "done")
	dim.Fprintf(d.w, " (%d sources, %v)\n", panel.SourcesFound, elapsed)
}

func (d *DiffusionDisplay) renderDraftRefined(data events.DraftRefinedData) {
	fmt.Fprintln(d.w)

	// Progress bar for draft refinement
	filledWidth := int(data.Progress * float64(diffusionProgressBarWidth))
	emptyWidth := diffusionProgressBarWidth - filledWidth
	if emptyWidth < 0 {
		emptyWidth = 0
	}

	filled := strings.Repeat("█", filledWidth)
	empty := strings.Repeat("░", emptyWidth)

	cyan.Fprintf(d.w, "│  📝 Draft refined ")
	dim.Fprintf(d.w, "[%s%s] ", filled, empty)
	cyan.Fprintf(d.w, "%d%%", int(data.Progress*100))
	if data.NewSources > 0 {
		dim.Fprintf(d.w, " (+%d sources)", data.NewSources)
	}
	fmt.Fprintln(d.w)
}

func (d *DiffusionDisplay) renderDiffusionComplete() {
	fmt.Fprintln(d.w)
	completeColor := color.New(color.FgHiMagenta, color.Bold)
	completeColor.Fprintf(d.w, "└─ Diffusion complete ")
	dim.Fprintf(d.w, "(%d iterations, %d total sources)\n", d.lastIteration, d.totalSources)
	fmt.Fprintln(d.w)
}

func (d *DiffusionDisplay) renderFinalReportStarted() {
	fmt.Fprintln(d.w)
	green.Fprintf(d.w, "⚡ Generating final report...")
	fmt.Fprintln(d.w)
	dim.Fprintln(d.w, "   Applying optimization rules:")
	dim.Fprintln(d.w, "   • Insightfulness: granular breakdown, mapping tables")
	dim.Fprintln(d.w, "   • Helpfulness: clarity, accuracy, actionable insights")
}

func (d *DiffusionDisplay) renderFinalReportComplete() {
	fmt.Fprintln(d.w)
	green.Fprintln(d.w, "✓ Report complete")
	fmt.Fprintln(d.w)
}

// HandlePhaseProgress displays phase progress messages
func (d *DiffusionDisplay) HandlePhaseProgress(data map[string]interface{}) {
	d.mu.Lock()
	defer d.mu.Unlock()

	phase, _ := data["phase"].(string)
	message, _ := data["message"].(string)

	if message == "" {
		return
	}

	// Choose color based on phase
	var phaseColor *color.Color
	switch phase {
	case "brief":
		phaseColor = blue
	case "draft":
		phaseColor = yellow
	case "diffuse":
		phaseColor = magenta
	case "finalize":
		phaseColor = green
	default:
		phaseColor = dim
	}

	phaseColor.Fprintf(d.w, "  %s %s\n", getPhaseIcon(phase), message)
}

func getPhaseIcon(phase string) string {
	switch phase {
	case "brief":
		return "📋"
	case "draft":
		return "📝"
	case "diffuse":
		return "🔄"
	case "finalize":
		return "✨"
	default:
		return "•"
	}
}

// Color shortcuts
var (
	white = color.New(color.FgWhite)
)
