package repl

import (
	"fmt"
	"io"
	"strings"
	"sync"

	"go-research/internal/events"

	"github.com/fatih/color"
)

const (
	panelHeight   = 5 // Lines per worker panel
	maxThoughtLen = 200
	spinnerFrames = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
)

// WorkerPanel represents a single worker's display area
type WorkerPanel struct {
	WorkerNum     int
	Objective     string
	Status        string // "starting", "thinking", "tool", "complete", "failed"
	Thought       string // Current thought/reasoning (streamed)
	ToolName      string // Current tool being called
	Iteration     int
	spinnerIdx    int
	// STORM conversation fields
	Perspective   string // Perspective name (e.g., "Cryptographer")
	Focus         string // Perspective focus
	CurrentTurn   int    // Current conversation turn
	MaxTurns      int    // Max turns configured
	LastQuestion  string // Most recent question asked
	SourcesFound  int    // Number of sources found so far
	IsConversation bool  // True if this is a STORM conversation
}

// MultiWorkerDisplay manages multiple worker panels with live updates
type MultiWorkerDisplay struct {
	w               io.Writer
	panels          map[int]*WorkerPanel
	panelOrder      []int // Order of panels (by worker num)
	perspectiveMap  map[string]int // Maps perspective name to panel number
	mu              sync.Mutex
	totalHeight     int
	started         bool
}

// NewMultiWorkerDisplay creates a new multi-panel display
func NewMultiWorkerDisplay(w io.Writer) *MultiWorkerDisplay {
	return &MultiWorkerDisplay{
		w:              w,
		panels:         make(map[int]*WorkerPanel),
		perspectiveMap: make(map[string]int),
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

	case events.EventAnalysisStarted:
		msg := "Analyzing facts and cross-validating sources..."
		if data, ok := event.Data.(map[string]interface{}); ok {
			if m, ok := data["message"].(string); ok {
				msg = m
			}
		}
		d.printStatusLine(cyan.Sprintf("⚡ %s", msg))

	case events.EventAnalysisProgress:
		if data, ok := event.Data.(map[string]interface{}); ok {
			if msg, ok := data["message"].(string); ok {
				d.printStatusLine(cyan.Sprintf("  → %s", msg))
			}
		}

	case events.EventAnalysisComplete:
		d.printStatusLine(green.Sprint("✓ Analysis complete"))

	case events.EventSynthesisStarted:
		msg := "Synthesizing report from research findings..."
		if data, ok := event.Data.(map[string]interface{}); ok {
			if m, ok := data["message"].(string); ok {
				msg = m
			}
		}
		d.printStatusLine(cyan.Sprintf("⚡ %s", msg))

	case events.EventSynthesisProgress:
		if data, ok := event.Data.(map[string]interface{}); ok {
			if msg, ok := data["message"].(string); ok {
				d.printStatusLine(cyan.Sprintf("  → %s", msg))
			}
		}

	case events.EventSynthesisComplete:
		d.printStatusLine(green.Sprint("✓ Report synthesis complete"))

	case events.EventCostUpdated:
		if data, ok := event.Data.(events.CostUpdateData); ok {
			msg := fmt.Sprintf("Cost update [%s]: $%.4f (%d tok)", data.Scope, data.TotalCost, data.TotalTokens)
			d.printStatusLine(cyan.Sprintf("💰 %s", msg))
		}

	// STORM Conversation Events
	case events.EventConversationStarted:
		if data, ok := event.Data.(events.ConversationStartedData); ok {
			// Map perspective to panel (1-indexed)
			panelNum := data.Index + 1
			d.perspectiveMap[data.Perspective] = panelNum

			if panel, exists := d.panels[panelNum]; exists {
				panel.IsConversation = true
				panel.Perspective = data.Perspective
				panel.Focus = data.Focus
				panel.Objective = data.Perspective // Use perspective as objective
				panel.Status = "thinking"
				panel.CurrentTurn = 0
				panel.MaxTurns = 4 // Default
				panel.Thought = fmt.Sprintf("Starting %s perspective...", data.Perspective)
				d.updatePanel(panel)
			}
		}

	case events.EventConversationProgress:
		if data, ok := event.Data.(events.ConversationProgressData); ok {
			if panelNum, exists := d.perspectiveMap[data.Perspective]; exists {
				if panel, exists := d.panels[panelNum]; exists {
					panel.CurrentTurn = data.Turn
					panel.MaxTurns = data.MaxTurns
					panel.SourcesFound += data.Sources
					panel.LastQuestion = data.Question
					panel.Status = "thinking"
					// Show current question being asked
					if len(data.Question) > 60 {
						panel.Thought = fmt.Sprintf("Turn %d: %s...", data.Turn, data.Question[:60])
					} else {
						panel.Thought = fmt.Sprintf("Turn %d: %s", data.Turn, data.Question)
					}
					d.updatePanel(panel)
				}
			}
		}

	case events.EventConversationCompleted:
		if data, ok := event.Data.(events.ConversationCompletedData); ok {
			if panelNum, exists := d.perspectiveMap[data.Perspective]; exists {
				if panel, exists := d.panels[panelNum]; exists {
					panel.Status = "complete"
					panel.Thought = fmt.Sprintf("Done: %d turns, %d facts, %d sources",
						data.TotalTurns, data.FactsFound, data.Sources)
					d.updatePanel(panel)
				}
			}
		}
	}
}

// printStatusLine prints a status line below all panels
func (d *MultiWorkerDisplay) printStatusLine(msg string) {
	fmt.Fprintf(d.w, "\n%s\n", msg)
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
	iconWidth := visualLength(statusIcon)

	var headerText string
	if panel.IsConversation {
		// STORM conversation panel - show perspective name and turn progress
		perspName := panel.Perspective
		if perspName == "" {
			perspName = "Perspective"
		}
		// Truncate perspective name if too long
		if len(perspName) > 20 {
			perspName = perspName[:17] + "..."
		}
		// Show turn progress if in progress
		turnInfo := ""
		if panel.CurrentTurn > 0 {
			turnInfo = fmt.Sprintf(" [%d/%d]", panel.CurrentTurn, panel.MaxTurns)
		}
		maxPerspLen := 75 - 5 - iconWidth - len(turnInfo)
		if len(perspName) > maxPerspLen {
			perspName = perspName[:maxPerspLen-3] + "..."
		}
		headerText = fmt.Sprintf(" %s %s%s ", statusIcon, perspName, turnInfo)
	} else {
		// Original worker panel style
		maxObjLen := 75 - 14 - iconWidth
		objTrunc := truncateVisual(panel.Objective, maxObjLen)
		if objTrunc == "" {
			objTrunc = "Waiting..."
		}
		headerText = fmt.Sprintf(" %s Worker %d: %s ", statusIcon, panel.WorkerNum, objTrunc)
	}

	headerLen := visualLength(headerText)
	padding := 75 - headerLen
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
	if pad1 < 0 {
		pad1 = 0
	}
	lines[1] = fmt.Sprintf("│ %s%s │", dim.Sprint(line1), strings.Repeat(" ", pad1))

	// Line 3
	line2 := ""
	if len(thoughtLines) > 1 {
		line2 = thoughtLines[1]
	}
	pad2 := 74 - visualLength(line2)
	if pad2 < 0 {
		pad2 = 0
	}
	lines[2] = fmt.Sprintf("│ %s%s │", dim.Sprint(line2), strings.Repeat(" ", pad2))

	// Line 4: Status/Action
	var statusText string
	var plainStatusText string

	if panel.IsConversation {
		// STORM conversation status - show sources found
		switch panel.Status {
		case "thinking":
			statusText = fmt.Sprintf(" %s interviewing... %d sources ", cyan.Sprint("💬"), panel.SourcesFound)
			plainStatusText = fmt.Sprintf(" * interviewing... %d sources ", panel.SourcesFound)
		case "complete":
			statusText = fmt.Sprintf(" %s done %d sources ", green.Sprint("✓"), panel.SourcesFound)
			plainStatusText = fmt.Sprintf(" v done %d sources ", panel.SourcesFound)
		case "failed":
			statusText = fmt.Sprintf(" %s failed ", red.Sprint("✗"))
			plainStatusText = " x failed "
		default:
			statusText = fmt.Sprintf(" %s waiting ", dim.Sprint("○"))
			plainStatusText = " o waiting "
		}
	} else {
		// Original worker status
		switch panel.Status {
		case "thinking":
			statusText = fmt.Sprintf(" %s thinking... ", cyan.Sprint("•"))
			plainStatusText = " * thinking... "
		case "tool":
			statusText = fmt.Sprintf(" %s %s ", yellow.Sprint("→"), panel.ToolName)
			plainStatusText = fmt.Sprintf(" -> %s ", panel.ToolName)
		case "complete":
			statusText = fmt.Sprintf(" %s complete ", green.Sprint("✓"))
			plainStatusText = " v complete "
		case "failed":
			statusText = fmt.Sprintf(" %s failed ", red.Sprint("✗"))
			plainStatusText = " x failed "
		default:
			statusText = fmt.Sprintf(" %s waiting ", dim.Sprint("○"))
			plainStatusText = " o waiting "
		}
	}

	statusLen := visualLength(plainStatusText)
	bottomPadding := 75 - statusLen
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

// truncateVisual truncates a string to fit within maxVisualWidth visual characters,
// adding "..." suffix if truncated
func truncateVisual(s string, maxVisualWidth int) string {
	if visualLength(s) <= maxVisualWidth {
		return s
	}

	// Reserve 3 chars for "..."
	targetWidth := maxVisualWidth - 3
	if targetWidth < 0 {
		targetWidth = 0
	}

	// Build truncated string by visual width
	var result []rune
	width := 0
	for _, r := range s {
		var charWidth int
		if r < 128 {
			charWidth = 1
		} else {
			// Use same logic as visualLength
			switch {
			case r >= 0x2800 && r <= 0x28FF, // Braille
				r >= 0x2500 && r <= 0x257F, // Box Drawing
				r >= 0x2580 && r <= 0x259F, // Block Elements
				r >= 0x25A0 && r <= 0x25FF, // Geometric Shapes
				r == 0x2713 || r == 0x2717, // Check/X marks
				r == 0x2022,                // Bullet
				r >= 0x2700 && r <= 0x27BF: // Dingbats
				charWidth = 1
			default:
				charWidth = 2
			}
		}

		if width+charWidth > targetWidth {
			break
		}
		result = append(result, r)
		width += charWidth
	}

	return string(result) + "..."
}

// visualLength calculates the visual width of a string
// accounting for different character widths in terminals
func visualLength(s string) int {
	l := 0
	for _, r := range s {
		if r < 128 {
			l++
		} else {
			switch {
			// Braille patterns (spinner) are single-width
			case r >= 0x2800 && r <= 0x28FF:
				l++
			// Box Drawing characters are single-width
			case r >= 0x2500 && r <= 0x257F:
				l++
			// Block Elements are single-width
			case r >= 0x2580 && r <= 0x259F:
				l++
			// Geometric Shapes - most are single-width
			case r >= 0x25A0 && r <= 0x25FF:
				l++
			// Miscellaneous Symbols - check mark ✓ (U+2713), ballot x ✗ (U+2717)
			case r == 0x2713 || r == 0x2717:
				l++
			// General Punctuation - bullet • (U+2022)
			case r == 0x2022:
				l++
			// Dingbats - some single-width
			case r >= 0x2700 && r <= 0x27BF:
				l++
			default:
				l += 2 // Assume wide for emojis/other unicode
			}
		}
	}
	return l
}
