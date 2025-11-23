package repl

import (
	"fmt"
	"io"
	"strings"
	"sync"

	"github.com/fatih/color"
	"go-research/internal/events"
)

const (
	panelHeight    = 5 // Lines per worker panel
	maxThoughtLen  = 200
	spinnerFrames  = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
)

// WorkerPanel represents a single worker's display area
type WorkerPanel struct {
	WorkerNum   int
	Objective   string
	Status      string // "starting", "thinking", "tool", "complete", "failed"
	Thought     string // Current thought/reasoning (streamed)
	ToolName    string // Current tool being called
	Iteration   int
	spinnerIdx  int
}

// MultiWorkerDisplay manages multiple worker panels with live updates
type MultiWorkerDisplay struct {
	w           io.Writer
	panels      map[int]*WorkerPanel
	panelOrder  []int // Order of panels (by worker num)
	mu          sync.Mutex
	totalHeight int
	started     bool
}

// NewMultiWorkerDisplay creates a new multi-panel display
func NewMultiWorkerDisplay(w io.Writer) *MultiWorkerDisplay {
	return &MultiWorkerDisplay{
		w:      w,
		panels: make(map[int]*WorkerPanel),
	}
}

// InitWorkers initializes panels for expected workers
func (d *MultiWorkerDisplay) InitWorkers(count int) {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.panelOrder = make([]int, count)
	for i := 0; i < count; i++ {
		workerNum := i + 1
		d.panels[workerNum] = &WorkerPanel{
			WorkerNum: workerNum,
			Status:    "waiting",
		}
		d.panelOrder[i] = workerNum
	}
	d.totalHeight = count * panelHeight
}

// Start renders initial panel frames
func (d *MultiWorkerDisplay) Start() {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.started {
		return
	}
	d.started = true

	// Draw initial empty panels
	for _, workerNum := range d.panelOrder {
		panel := d.panels[workerNum]
		d.renderPanel(panel)
	}
}

// HandleEvent processes an event and updates the appropriate panel
func (d *MultiWorkerDisplay) HandleEvent(event events.Event) {
	d.mu.Lock()
	defer d.mu.Unlock()

	if !d.started {
		return
	}

	switch event.Type {
	case events.EventWorkerStarted:
		if data, ok := event.Data.(events.WorkerProgressData); ok {
			if panel, exists := d.panels[data.WorkerNum]; exists {
				panel.Objective = data.Objective
				panel.Status = "thinking"
				panel.Thought = ""
				d.updatePanel(panel)
			}
		}

	case events.EventLLMChunk:
		if data, ok := event.Data.(events.LLMChunkData); ok {
			if panel, exists := d.panels[data.WorkerNum]; exists {
				panel.Status = "thinking"
				panel.Thought += data.Chunk
				// Keep thought length manageable
				if len(panel.Thought) > maxThoughtLen*2 {
					panel.Thought = panel.Thought[len(panel.Thought)-maxThoughtLen:]
				}
				panel.spinnerIdx = (panel.spinnerIdx + 1) % len(spinnerFrames)
				d.updatePanel(panel)
			}
		}

	case events.EventIterationStarted:
		if data, ok := event.Data.(map[string]interface{}); ok {
			if iter, ok := data["iteration"].(int); ok {
				// Update all active panels
				for _, panel := range d.panels {
					if panel.Status == "thinking" || panel.Status == "tool" {
						panel.Iteration = iter
					}
				}
			}
		}

	case events.EventToolCall:
		if data, ok := event.Data.(events.ToolCallData); ok {
			if panel, exists := d.panels[data.WorkerNum]; exists {
				panel.Status = "tool"
				panel.ToolName = data.Tool
				d.updatePanel(panel)
			}
		}

	case events.EventWorkerProgress:
		if data, ok := event.Data.(events.WorkerProgressData); ok {
			if panel, exists := d.panels[data.WorkerNum]; exists {
				if data.Message != "" {
					panel.Thought = data.Message
				}
				panel.Iteration = data.Iteration
				d.updatePanel(panel)
			}
		}

	case events.EventWorkerComplete:
		if data, ok := event.Data.(events.WorkerProgressData); ok {
			if panel, exists := d.panels[data.WorkerNum]; exists {
				panel.Status = "complete"
				d.updatePanel(panel)
			}
		}

	case events.EventWorkerFailed:
		if data, ok := event.Data.(events.WorkerProgressData); ok {
			if panel, exists := d.panels[data.WorkerNum]; exists {
				panel.Status = "failed"
				if data.Message != "" {
					panel.Thought = data.Message
				}
				d.updatePanel(panel)
			}
		}
	}
}

// Stop finishes the display and moves cursor below panels
func (d *MultiWorkerDisplay) Stop() {
	d.mu.Lock()
	defer d.mu.Unlock()

	if !d.started {
		return
	}

	// Move to bottom of display area
	fmt.Fprint(d.w, "\n")
}

// renderPanel draws a panel at its position (called during init)
func (d *MultiWorkerDisplay) renderPanel(panel *WorkerPanel) {
	lines := d.buildPanelLines(panel)
	for _, line := range lines {
		fmt.Fprintln(d.w, line)
	}
}

// updatePanel redraws a single panel in place using ANSI cursor control
func (d *MultiWorkerDisplay) updatePanel(panel *WorkerPanel) {
	// Calculate panel position from bottom
	panelIdx := d.getPanelIndex(panel.WorkerNum)
	if panelIdx < 0 {
		return
	}

	// Move up to panel position
	linesFromBottom := (len(d.panelOrder) - panelIdx) * panelHeight
	fmt.Fprintf(d.w, "\033[%dA", linesFromBottom)

	// Redraw panel
	lines := d.buildPanelLines(panel)
	for _, line := range lines {
		// Clear line and print new content
		fmt.Fprintf(d.w, "\033[2K%s\n", line)
	}

	// Move back to bottom
	remainingLines := linesFromBottom - panelHeight
	if remainingLines > 0 {
		fmt.Fprintf(d.w, "\033[%dB", remainingLines)
	}
}

// buildPanelLines creates the lines for a worker panel
func (d *MultiWorkerDisplay) buildPanelLines(panel *WorkerPanel) []string {
	lines := make([]string, panelHeight)

	// Header line with status indicator
	statusIcon, statusColor := d.getStatusIndicator(panel.Status)
	objTrunc := truncateStr(panel.Objective, 60)
	if objTrunc == "" {
		objTrunc = "Waiting..."
	}

	// Line 1: Header [Icon Worker N: Objective]
	headerText := fmt.Sprintf(" %s Worker %d: %s ", statusIcon, panel.WorkerNum, objTrunc)
	headerLen := visualLength(headerText)
	padding := 78 - headerLen
	if padding < 0 {
		padding = 0
	}
	// Using box drawing characters for top border
	header := fmt.Sprintf("┌─%s%s┐", statusColor.Sprint(headerText), strings.Repeat("─", padding))
	lines[0] = header

	// Lines 2 & 3: Thought content (2 lines)
	// We want to show the last 2 lines of thoughts to give a "streaming" feel
	thoughtLines := d.wrapText(panel.Thought, 74)
	
	// Line 2
	line1 := "..."
	if len(thoughtLines) > 0 {
		line1 = thoughtLines[0]
	}
	if len(thoughtLines) > 1 {
		// If we have multiple lines, show the last 2
		// But wrapText returns from start. 
		// Actually wrapText implementation takes the END of the text if it's too long.
		// "if len(text) > maxLen*2 { text = text[len(text)-maxLen*2:] }"
		// So wrapText returns the *latest* content split into lines.
		// We should display them in order.
		line1 = thoughtLines[0]
	}
	
	pad1 := 74 - visualLength(line1)
	if pad1 < 0 { pad1 = 0 }
	lines[1] = fmt.Sprintf("│ %s%s │", dim.Sprint(line1), strings.Repeat(" ", pad1))

	// Line 3
	line2 := ""
	if len(thoughtLines) > 1 {
		line2 = thoughtLines[1]
	}
	pad2 := 74 - visualLength(line2)
	if pad2 < 0 { pad2 = 0 }
	lines[2] = fmt.Sprintf("│ %s%s │", dim.Sprint(line2), strings.Repeat(" ", pad2))

	// Line 4: Status/Action
	var statusText string
	switch panel.Status {
	case "thinking":
		statusText = fmt.Sprintf(" %s thinking... ", cyan.Sprint("•"))
	case "tool":
		statusText = fmt.Sprintf(" %s %s ", yellow.Sprint("→"), panel.ToolName)
	case "complete":
		statusText = fmt.Sprintf(" %s complete ", green.Sprint("✓"))
	case "failed":
		statusText = fmt.Sprintf(" %s failed ", red.Sprint("✗"))
	default:
		statusText = fmt.Sprintf(" %s waiting ", dim.Sprint("○"))
	}

	// Calculate padding for bottom line
	var plainStatusText string
	switch panel.Status {
	case "thinking":
		plainStatusText = " * thinking... "
	case "tool":
		plainStatusText = fmt.Sprintf(" -> %s ", panel.ToolName)
	case "complete":
		plainStatusText = " v complete "
	case "failed":
		plainStatusText = " x failed "
	default:
		plainStatusText = " o waiting "
	}
	
	statusLen := visualLength(plainStatusText)
	bottomPadding := 78 - statusLen
	if bottomPadding < 0 {
		bottomPadding = 0
	}
	
	lines[3] = fmt.Sprintf("└─%s%s┘", statusText, strings.Repeat("─", bottomPadding))

	// Line 5: Spacer
	lines[4] = ""

	return lines
}

// getStatusIndicator returns icon and color for status
func (d *MultiWorkerDisplay) getStatusIndicator(status string) (string, *color.Color) {
	switch status {
	case "thinking":
		return "⚡", yellow
	case "tool":
		return "🔧", cyan
	case "complete":
		return "✓", green
	case "failed":
		return "✗", red
	default:
		return "○", dim
	}
}

// getPanelIndex returns the index of a panel in the order
func (d *MultiWorkerDisplay) getPanelIndex(workerNum int) int {
	for i, num := range d.panelOrder {
		if num == workerNum {
			return i
		}
	}
	return -1
}

// wrapText wraps text to fit within maxLen, returning up to 2 lines
func (d *MultiWorkerDisplay) wrapText(text string, maxLen int) []string {
	if text == "" {
		return nil
	}

	// Clean up text - remove newlines, collapse spaces
	text = strings.ReplaceAll(text, "\n", " ")
	text = strings.Join(strings.Fields(text), " ")

	// Truncate to reasonable length
	if len(text) > maxLen*2 {
		text = text[len(text)-maxLen*2:]
	}

	var lines []string
	if len(text) <= maxLen {
		lines = append(lines, text)
	} else {
		// Split into two lines
		splitPoint := maxLen
		// Try to split at word boundary
		for i := maxLen; i > maxLen-20 && i > 0; i-- {
			if text[i] == ' ' {
				splitPoint = i
				break
			}
		}
		lines = append(lines, strings.TrimSpace(text[:splitPoint]))
		remaining := strings.TrimSpace(text[splitPoint:])
		if len(remaining) > maxLen {
			remaining = remaining[:maxLen-3] + "..."
		}
		lines = append(lines, remaining)
	}

	return lines
}

func truncateStr(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "..."
}

// visualLength calculates the visual width of a string
// assuming most non-ASCII characters are 2 cells wide
func visualLength(s string) int {
	l := 0
	for _, r := range s {
		if r < 128 {
			l++
		} else {
			// Braille patterns (spinner) are narrow
			if r >= 0x2800 && r <= 0x28FF {
				l++
			} else {
				l += 2 // Assume wide for emojis/other unicode
			}
		}
	}
	return l
}
