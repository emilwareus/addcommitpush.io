package repl

import (
	"fmt"
	"io"
	"strings"

	"go-research/internal/events"

	"github.com/fatih/color"
)

// DAGDisplay renders a visual representation of the STORM research plan.
// Note: Despite the name, STORM doesn't use a DAG - it uses sequential phases
// with parallel conversations. This display shows the actual STORM flow.
type DAGDisplay struct {
	w io.Writer
}

// NewDAGDisplay creates a new DAG display renderer
func NewDAGDisplay(w io.Writer) *DAGDisplay {
	return &DAGDisplay{w: w}
}

// Render displays the STORM research plan with its actual flow
func (d *DAGDisplay) Render(data events.PlanCreatedData) {
	d.renderHeader(data.Topic)
	d.renderSTORMFlow(len(data.Perspectives))
	d.renderPerspectives(data.Perspectives)
	d.renderFooter()
}

func (d *DAGDisplay) renderHeader(topic string) {
	headerColor := color.New(color.FgHiCyan, color.Bold)
	boxColor := color.New(color.FgCyan)
	topicColor := color.New(color.FgWhite)

	fmt.Fprintln(d.w)
	boxColor.Fprintln(d.w, "╭──────────────────────────────────────────────────────────────────────────────╮")
	headerColor.Fprintf(d.w, "│%s│\n", centerText("🔬 STORM RESEARCH PLAN", 78))
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

// renderSTORMFlow renders the actual STORM phases (not a DAG)
func (d *DAGDisplay) renderSTORMFlow(perspectiveCount int) {
	dimColor := color.New(color.Faint)
	phaseColor := color.New(color.FgHiMagenta)
	convColor := color.New(color.FgHiYellow)
	analyzeColor := color.New(color.FgHiCyan)
	synthColor := color.New(color.FgHiGreen)

	// Phase 1: DISCOVER
	d.renderPhaseNode(phaseColor, "1. DISCOVER", "Perspectives")
	dimColor.Fprintln(d.w, strings.Repeat(" ", 39)+"│")

	// Phase 2: CONVERSE (parallel conversations)
	d.renderPhaseNode(convColor, "2. CONVERSE", "Parallel")
	d.renderFanOut(perspectiveCount)
	d.renderConversationNodes(convColor, perspectiveCount)
	d.renderFanIn(perspectiveCount)

	// Phase 3: ANALYZE
	d.renderPhaseNode(analyzeColor, "3. ANALYZE", "Validate Facts")
	dimColor.Fprintln(d.w, strings.Repeat(" ", 39)+"│")

	// Phase 4: SYNTHESIZE
	d.renderPhaseNode(synthColor, "4. SYNTHESIZE", "Final Report")

	fmt.Fprintln(d.w)
}

func (d *DAGDisplay) renderPhaseNode(c *color.Color, title, subtitle string) {
	boxWidth := 18
	padding := (80 - boxWidth) / 2
	padStr := strings.Repeat(" ", padding)

	dimColor := color.New(color.Faint)

	// Top border
	dimColor.Fprintf(d.w, "%s┌%s┐\n", padStr, strings.Repeat("─", boxWidth-2))

	// Title line
	if len(title) > boxWidth-2 {
		title = title[:boxWidth-2]
	}
	titlePad := boxWidth - 2 - len(title)
	if titlePad < 0 {
		titlePad = 0
	}
	dimColor.Fprintf(d.w, "%s│", padStr)
	c.Fprintf(d.w, "%s%s", title, strings.Repeat(" ", titlePad))
	dimColor.Fprintln(d.w, "│")

	// Subtitle line
	if len(subtitle) > boxWidth-2 {
		subtitle = subtitle[:boxWidth-2]
	}
	subtitlePad := boxWidth - 2 - len(subtitle)
	dimColor.Fprintf(d.w, "%s│", padStr)
	c.Fprintf(d.w, "%s%s", subtitle, strings.Repeat(" ", subtitlePad))
	dimColor.Fprintln(d.w, "│")

	// Bottom border
	dimColor.Fprintf(d.w, "%s└%s┘\n", padStr, strings.Repeat("─", boxWidth-2))
}

func (d *DAGDisplay) renderFanOut(count int) {
	if count <= 0 {
		return
	}

	dimColor := color.New(color.Faint)

	// Calculate total width needed for conversation nodes
	nodeWidth := 14
	spacing := 2
	totalWidth := count*nodeWidth + (count-1)*spacing
	startPad := (80 - totalWidth) / 2
	if startPad < 0 {
		startPad = 0
	}
	centerPad := 39 // Center position for single pipe

	// Single line down
	dimColor.Fprintf(d.w, "%s│\n", strings.Repeat(" ", centerPad))

	// Horizontal spread with connections
	if count == 1 {
		dimColor.Fprintf(d.w, "%s│\n", strings.Repeat(" ", centerPad))
	} else {
		// Build the horizontal connector line
		var line strings.Builder
		line.WriteString(strings.Repeat(" ", startPad))

		for i := 0; i < count; i++ {
			midPoint := nodeWidth / 2
			if i == 0 {
				line.WriteString(strings.Repeat(" ", midPoint))
				line.WriteString("┌")
				line.WriteString(strings.Repeat("─", midPoint-1))
			} else if i == count-1 {
				line.WriteString(strings.Repeat("─", midPoint))
				line.WriteString("┐")
				line.WriteString(strings.Repeat(" ", midPoint-1))
			} else {
				line.WriteString(strings.Repeat("─", midPoint))
				line.WriteString("┬")
				line.WriteString(strings.Repeat("─", midPoint-1))
			}
			if i < count-1 {
				line.WriteString(strings.Repeat("─", spacing))
			}
		}
		dimColor.Fprintln(d.w, line.String())

		// Vertical connectors down
		var vertLine strings.Builder
		vertLine.WriteString(strings.Repeat(" ", startPad))
		for i := 0; i < count; i++ {
			pad := nodeWidth / 2
			vertLine.WriteString(strings.Repeat(" ", pad))
			vertLine.WriteString("│")
			vertLine.WriteString(strings.Repeat(" ", pad-1))
			if i < count-1 {
				vertLine.WriteString(strings.Repeat(" ", spacing))
			}
		}
		dimColor.Fprintln(d.w, vertLine.String())
	}
}

func (d *DAGDisplay) renderConversationNodes(c *color.Color, count int) {
	if count <= 0 {
		return
	}

	dimColor := color.New(color.Faint)

	nodeWidth := 14
	spacing := 2
	totalWidth := count*nodeWidth + (count-1)*spacing
	startPad := (80 - totalWidth) / 2
	if startPad < 0 {
		startPad = 0
	}

	// Top borders
	var line strings.Builder
	line.WriteString(strings.Repeat(" ", startPad))
	for i := 0; i < count; i++ {
		line.WriteString("┌")
		line.WriteString(strings.Repeat("─", nodeWidth-2))
		line.WriteString("┐")
		if i < count-1 {
			line.WriteString(strings.Repeat(" ", spacing))
		}
	}
	dimColor.Fprintln(d.w, line.String())

	// Conversation labels
	fmt.Fprint(d.w, strings.Repeat(" ", startPad))
	for i := 0; i < count; i++ {
		label := fmt.Sprintf("Conv %d", i+1)
		if len(label) > nodeWidth-2 {
			label = label[:nodeWidth-2]
		}
		padLeft := (nodeWidth - 2 - len(label)) / 2
		padRight := nodeWidth - 2 - len(label) - padLeft
		dimColor.Fprint(d.w, "│")
		c.Fprintf(d.w, "%s%s%s", strings.Repeat(" ", padLeft), label, strings.Repeat(" ", padRight))
		dimColor.Fprint(d.w, "│")
		if i < count-1 {
			fmt.Fprint(d.w, strings.Repeat(" ", spacing))
		}
	}
	fmt.Fprintln(d.w)

	// Status line
	fmt.Fprint(d.w, strings.Repeat(" ", startPad))
	for i := 0; i < count; i++ {
		status := "○ pending"
		if len(status) > nodeWidth-2 {
			status = status[:nodeWidth-2]
		}
		padLeft := (nodeWidth - 2 - len(status)) / 2
		padRight := nodeWidth - 2 - len(status) - padLeft
		dimColor.Fprintf(d.w, "│%s%s%s│", strings.Repeat(" ", padLeft), status, strings.Repeat(" ", padRight))
		if i < count-1 {
			fmt.Fprint(d.w, strings.Repeat(" ", spacing))
		}
	}
	fmt.Fprintln(d.w)

	// Bottom borders
	line.Reset()
	line.WriteString(strings.Repeat(" ", startPad))
	for i := 0; i < count; i++ {
		line.WriteString("└")
		line.WriteString(strings.Repeat("─", nodeWidth-2))
		line.WriteString("┘")
		if i < count-1 {
			line.WriteString(strings.Repeat(" ", spacing))
		}
	}
	dimColor.Fprintln(d.w, line.String())
}

func (d *DAGDisplay) renderFanIn(count int) {
	if count <= 0 {
		return
	}

	dimColor := color.New(color.Faint)

	nodeWidth := 14
	spacing := 2
	totalWidth := count*nodeWidth + (count-1)*spacing
	startPad := (80 - totalWidth) / 2
	if startPad < 0 {
		startPad = 0
	}
	centerPad := 39

	if count == 1 {
		dimColor.Fprintf(d.w, "%s│\n", strings.Repeat(" ", centerPad))
	} else {
		// Vertical connectors
		var vertLine strings.Builder
		vertLine.WriteString(strings.Repeat(" ", startPad))
		for i := 0; i < count; i++ {
			pad := nodeWidth / 2
			vertLine.WriteString(strings.Repeat(" ", pad))
			vertLine.WriteString("│")
			vertLine.WriteString(strings.Repeat(" ", pad-1))
			if i < count-1 {
				vertLine.WriteString(strings.Repeat(" ", spacing))
			}
		}
		dimColor.Fprintln(d.w, vertLine.String())

		// Horizontal merge
		var line strings.Builder
		line.WriteString(strings.Repeat(" ", startPad))

		for i := 0; i < count; i++ {
			midPoint := nodeWidth / 2
			if i == 0 {
				line.WriteString(strings.Repeat(" ", midPoint))
				line.WriteString("└")
				line.WriteString(strings.Repeat("─", midPoint-1))
			} else if i == count-1 {
				line.WriteString(strings.Repeat("─", midPoint))
				line.WriteString("┘")
				line.WriteString(strings.Repeat(" ", midPoint-1))
			} else {
				line.WriteString(strings.Repeat("─", midPoint))
				line.WriteString("┴")
				line.WriteString(strings.Repeat("─", midPoint-1))
			}
			if i < count-1 {
				line.WriteString(strings.Repeat("─", spacing))
			}
		}
		dimColor.Fprintln(d.w, line.String())

		// Single line down
		dimColor.Fprintf(d.w, "%s│\n", strings.Repeat(" ", centerPad))
	}
}

func (d *DAGDisplay) renderPerspectives(perspectives []events.PerspectiveData) {
	if len(perspectives) == 0 {
		return
	}

	boxColor := color.New(color.FgCyan)
	headerColor := color.New(color.FgHiCyan, color.Bold)
	nameColor := color.New(color.FgHiYellow)
	focusColor := color.New(color.FgWhite)
	dimColor := color.New(color.Faint)

	boxColor.Fprintln(d.w, "╭──────────────────────────────────────────────────────────────────────────────╮")
	headerColor.Fprintf(d.w, "│  %-76s│\n", "PERSPECTIVES (WikiWriter↔TopicExpert conversations):")
	boxColor.Fprintln(d.w, "│                                                                              │")

	for i, p := range perspectives {
		// Truncate name and focus to fit
		name := p.Name
		if len(name) > 20 {
			name = name[:17] + "..."
		}

		focus := p.Focus
		maxFocusLen := 48
		if len(focus) > maxFocusLen {
			focus = focus[:maxFocusLen-3] + "..."
		}

		// Format: "  1. Name                 ─ Focus..."
		numStr := fmt.Sprintf("%d.", i+1)
		dimColor.Fprint(d.w, "│  ")
		dimColor.Fprintf(d.w, "%-3s", numStr)
		nameColor.Fprintf(d.w, "%-20s", name)
		dimColor.Fprint(d.w, " ─ ")
		focusColor.Fprintf(d.w, "%-50s", focus)
		dimColor.Fprintln(d.w, "│")
	}

	boxColor.Fprintln(d.w, "╰──────────────────────────────────────────────────────────────────────────────╯")
}

func (d *DAGDisplay) renderFooter() {
	dimColor := color.New(color.Faint)
	fmt.Fprintln(d.w)
	dimColor.Fprintln(d.w, centerText("Starting STORM conversations...", 80))
	fmt.Fprintln(d.w)
}

// centerText centers text within a given width
func centerText(text string, width int) string {
	textLen := len(text)
	if textLen >= width {
		return text
	}
	leftPad := (width - textLen) / 2
	rightPad := width - textLen - leftPad
	return strings.Repeat(" ", leftPad) + text + strings.Repeat(" ", rightPad)
}
