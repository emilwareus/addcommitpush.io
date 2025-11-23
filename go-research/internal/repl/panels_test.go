package repl

import (
	"io"
	"strings"
	"testing"

	"github.com/fatih/color"
)

const expectedPanelWidth = 78

func TestWorkerPanelLineWidths(t *testing.T) {
	prevNoColor := color.NoColor
	color.NoColor = true
	t.Cleanup(func() { color.NoColor = prevNoColor })

	display := NewMultiWorkerDisplay(io.Discard)

	testCases := []struct {
		name  string
		panel *WorkerPanel
	}{
		{
			name: "Thinking",
			panel: &WorkerPanel{
				WorkerNum: 1,
				Objective: "Investigate feedback flows",
				Status:    "thinking",
				Thought:   "Processing initial research steps and framing plan.",
			},
		},
		{
			name: "ToolWithLongObjective",
			panel: &WorkerPanel{
				WorkerNum: 2,
				Objective: strings.Repeat("Long objective text for panel alignment ", 2),
				Status:    "tool",
				ToolName:  "search",
				Thought:   "Gathering supporting links before synthesizing.",
			},
		},
		{
			name: "Complete",
			panel: &WorkerPanel{
				WorkerNum: 3,
				Objective: "Summarize findings",
				Status:    "complete",
				Thought:   "Report finalized.",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			lines := display.buildPanelLines(tc.panel)
			if len(lines) != panelHeight {
				t.Fatalf("expected %d panel lines, got %d", panelHeight, len(lines))
			}

			for lineIdx := 0; lineIdx < panelHeight-1; lineIdx++ {
				width := visualLength(lines[lineIdx])
				if width != expectedPanelWidth {
					t.Fatalf("line %d width = %d, want %d\n%s", lineIdx, width, expectedPanelWidth, lines[lineIdx])
				}
			}
		})
	}
}
