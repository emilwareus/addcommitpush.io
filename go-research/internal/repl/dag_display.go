package repl

import (
	"fmt"
	"io"
	"strings"

	"go-research/internal/events"

	"github.com/fatih/color"
)

// DAGDisplay renders a visual representation of the research plan and DAG
type DAGDisplay struct {
	w io.Writer
}

// NewDAGDisplay creates a new DAG display renderer
func NewDAGDisplay(w io.Writer) *DAGDisplay {
	return &DAGDisplay{w: w}
}

// Render displays the research plan with a visual DAG representation
func (d *DAGDisplay) Render(data events.PlanCreatedData) {
	d.renderHeader(data.Topic)
	d.renderDAG(len(data.Perspectives))
	d.renderPerspectives(data.Perspectives)
	d.renderFooter()
}

func (d *DAGDisplay) renderHeader(topic string) {
	headerColor := color.New(color.FgHiCyan, color.Bold)
	boxColor := color.New(color.FgCyan)
	topicColor := color.New(color.FgWhite)

	fmt.Fprintln(d.w)
	boxColor.Fprintln(d.w, "╭──────────────────────────────────────────────────────────────────────────────╮")
	headerColor.Fprintf(d.w, "│%s│\n", centerText("🔬 DEEP RESEARCH PLAN", 78))
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

func (d *DAGDisplay) renderDAG(perspectiveCount int) {
	dimColor := color.New(color.Faint)
	nodeColor := color.New(color.FgHiWhite)
	searchColor := color.New(color.FgHiYellow)
	analyzeColor := color.New(color.FgHiCyan)
	synthColor := color.New(color.FgHiGreen)

	// Render root node
	d.renderCenteredNode(nodeColor, "ROOT", "Analysis", "○")

	// Render connector lines from root to search nodes
	d.renderFanOut(perspectiveCount)

	// Render search nodes in a row
	d.renderSearchNodes(searchColor, perspectiveCount)

	// Render connector lines from search nodes to validation
	d.renderFanIn(perspectiveCount)

	// Render validation node
	d.renderCenteredNode(analyzeColor, "VALIDATE", "Cross-Check", "○")
	dimColor.Fprintln(d.w, strings.Repeat(" ", 39)+"│")

	// Render gap-fill node
	d.renderCenteredNode(analyzeColor, "FILL GAPS", "Gap Research", "○")
	dimColor.Fprintln(d.w, strings.Repeat(" ", 39)+"│")

	// Render synthesis node
	d.renderCenteredNode(synthColor, "SYNTHESIZE", "Final Report", "○")

	fmt.Fprintln(d.w)
}

func (d *DAGDisplay) renderCenteredNode(c *color.Color, title, subtitle, icon string) {
	boxWidth := 16
	padding := (80 - boxWidth) / 2
	padStr := strings.Repeat(" ", padding)

	dimColor := color.New(color.Faint)

	// Top border
	dimColor.Fprintf(d.w, "%s┌%s┐\n", padStr, strings.Repeat("─", boxWidth-2))

	// Title line with icon
	titleLine := fmt.Sprintf("%s %s", icon, title)
	titlePad := boxWidth - 2 - len(titleLine)
	if titlePad < 0 {
		titlePad = 0
		titleLine = titleLine[:boxWidth-2]
	}
	dimColor.Fprintf(d.w, "%s│", padStr)
	c.Fprintf(d.w, "%s%s", titleLine, strings.Repeat(" ", titlePad))
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

	// Calculate total width needed for worker nodes
	nodeWidth := 14
	spacing := 2
	totalWidth := count*nodeWidth + (count-1)*spacing
	startPad := (80 - totalWidth) / 2
	if startPad < 0 {
		startPad = 0
	}
	centerPad := 39 // Center position for single pipe

	// Single line down from root
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

func (d *DAGDisplay) renderSearchNodes(c *color.Color, count int) {
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

	// Worker labels
	fmt.Fprint(d.w, strings.Repeat(" ", startPad))
	for i := 0; i < count; i++ {
		label := fmt.Sprintf("Worker %d", i+1)
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

	// Status line (initially all pending)
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

		// Horizontal merge with connections
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

		// Single line down to validation
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
	headerColor.Fprintf(d.w, "│  %-76s│\n", "PERSPECTIVES:")
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
	dimColor.Fprintln(d.w, centerText("Starting research workers...", 80))
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

