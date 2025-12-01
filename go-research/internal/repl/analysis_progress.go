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
	progressBarWidth = 40
)

// spinnerRunes is a slice of runes for the spinner animation
var spinnerRunes = []rune("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏")

// AnalysisProgressDisplay shows streaming progress for cross-validation and gap-filling
type AnalysisProgressDisplay struct {
	w           io.Writer
	mu          sync.Mutex
	started     bool
	phase       string  // Current phase: "cross-validate", "detect-contradictions", "identify-gaps", "gap-filling"
	progress    float64 // 0.0 to 1.0
	message     string
	lastLine    string
	spinnerIdx  int
	lastUpdate  time.Time
	headerShown bool
}

// NewAnalysisProgressDisplay creates a new progress display
func NewAnalysisProgressDisplay(w io.Writer) *AnalysisProgressDisplay {
	return &AnalysisProgressDisplay{
		w: w,
	}
}

// HandleEvent processes analysis progress events
func (d *AnalysisProgressDisplay) HandleEvent(event events.Event) {
	d.mu.Lock()
	defer d.mu.Unlock()

	switch event.Type {
	case events.EventCrossValidationStarted:
		d.started = true
		d.headerShown = false
		if data, ok := event.Data.(events.CrossValidationProgressData); ok {
			d.showHeader("Cross-Validation & Analysis", data.Message)
		}

	case events.EventCrossValidationProgress:
		if !d.started {
			return
		}
		if data, ok := event.Data.(events.CrossValidationProgressData); ok {
			d.phase = data.Phase
			d.progress = data.Progress
			d.message = data.Message
			d.updateProgress()
		}

	case events.EventCrossValidationComplete:
		if !d.started {
			return
		}
		if data, ok := event.Data.(events.CrossValidationProgressData); ok {
			d.progress = 1.0
			d.message = data.Message
			d.completePhase("Cross-Validation")
		}

	case events.EventGapFillingStarted:
		d.started = true
		if data, ok := event.Data.(events.GapFillingProgressData); ok {
			d.showHeader("Knowledge Gap Filling", fmt.Sprintf("Filling %d gaps...", data.TotalGaps))
		}

	case events.EventGapFillingProgress:
		if !d.started {
			return
		}
		if data, ok := event.Data.(events.GapFillingProgressData); ok {
			d.phase = "gap-filling"
			d.progress = data.Progress
			d.message = fmt.Sprintf("[%d/%d] %s: %s", data.GapIndex+1, data.TotalGaps, data.Status, d.truncate(data.GapDesc, 40))
			d.updateProgress()
		}

	case events.EventGapFillingComplete:
		d.completePhase("Gap Filling")
	}
}

// showHeader displays the section header
func (d *AnalysisProgressDisplay) showHeader(title, subtitle string) {
	if d.headerShown {
		return
	}
	d.headerShown = true

	// Print header
	headerColor := color.New(color.FgCyan, color.Bold)
	fmt.Fprintln(d.w)
	fmt.Fprintf(d.w, "%s\n", headerColor.Sprintf("┌─ %s ─────────────────────────────────────────────┐", title))
	if subtitle != "" {
		fmt.Fprintf(d.w, "│ %s\n", dim.Sprint(subtitle))
	}
}

// updateProgress renders the current progress state
func (d *AnalysisProgressDisplay) updateProgress() {
	// Throttle updates to avoid flickering
	now := time.Now()
	if now.Sub(d.lastUpdate) < 50*time.Millisecond {
		return
	}
	d.lastUpdate = now

	// Move cursor up and clear if we have a previous line
	if d.lastLine != "" {
		fmt.Fprint(d.w, "\033[1A\033[2K")
	}

	// Build the progress bar
	filledWidth := int(d.progress * float64(progressBarWidth))
	emptyWidth := progressBarWidth - filledWidth

	filled := strings.Repeat("█", filledWidth)
	empty := strings.Repeat("░", emptyWidth)

	// Spinner
	d.spinnerIdx = (d.spinnerIdx + 1) % len(spinnerRunes)
	spinner := string(spinnerRunes[d.spinnerIdx])

	// Phase indicator with color
	phaseIcon := d.getPhaseIcon()
	phaseColor := d.getPhaseColor()

	// Build progress line
	progressPct := int(d.progress * 100)
	progressLine := fmt.Sprintf("│ %s %s %s%s %3d%%  %s",
		spinner,
		phaseColor.Sprint(phaseIcon),
		cyan.Sprint(filled),
		dim.Sprint(empty),
		progressPct,
		d.truncate(d.message, 35),
	)

	fmt.Fprintln(d.w, progressLine)
	d.lastLine = progressLine
}

// completePhase marks a phase as complete
func (d *AnalysisProgressDisplay) completePhase(name string) {
	// Clear the progress line
	if d.lastLine != "" {
		fmt.Fprint(d.w, "\033[1A\033[2K")
	}

	// Print completion message
	fmt.Fprintf(d.w, "│ %s %s\n", green.Sprint("✓"), green.Sprintf("%s complete", name))
	fmt.Fprintf(d.w, "%s\n", cyan.Sprint("└────────────────────────────────────────────────────────────┘"))
	fmt.Fprintln(d.w)

	d.lastLine = ""
	d.started = false
	d.headerShown = false
}

// getPhaseIcon returns an icon for the current phase
func (d *AnalysisProgressDisplay) getPhaseIcon() string {
	switch d.phase {
	case "cross-validate":
		return "🔍"
	case "detect-contradictions":
		return "⚡"
	case "identify-gaps":
		return "🔎"
	case "gap-filling":
		return "📝"
	default:
		return "•"
	}
}

// getPhaseColor returns a color for the current phase
func (d *AnalysisProgressDisplay) getPhaseColor() *color.Color {
	switch d.phase {
	case "cross-validate":
		return cyan
	case "detect-contradictions":
		return yellow
	case "identify-gaps":
		return magenta
	case "gap-filling":
		return blue
	default:
		return dim
	}
}

// truncate shortens a string to fit
func (d *AnalysisProgressDisplay) truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
