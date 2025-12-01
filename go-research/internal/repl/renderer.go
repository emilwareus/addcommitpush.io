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

// Renderer handles terminal output formatting
type Renderer struct {
	w     io.Writer
	mu    sync.Mutex
	muted bool
}

// NewRenderer creates a new renderer
func NewRenderer(w io.Writer) *Renderer {
	return &Renderer{w: w}
}

// Mute silences the renderer for events
func (r *Renderer) Mute() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.muted = true
}

// Unmute restores the renderer
func (r *Renderer) Unmute() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.muted = false
}

// Colors
var (
	cyan    = color.New(color.FgCyan)
	green   = color.New(color.FgGreen)
	yellow  = color.New(color.FgYellow)
	red     = color.New(color.FgRed)
	bold    = color.New(color.Bold)
	dim     = color.New(color.Faint)
	magenta = color.New(color.FgMagenta)
	blue    = color.New(color.FgBlue)
)

// Welcome shows the welcome message
func (r *Renderer) Welcome() {
	cyan.Fprint(r.w, `
╔═══════════════════════════════════════════════════════════╗
║                    Go Research Agent                      ║
║                                                           ║
║  Just type your question to start deep research!          ║
║                                                           ║
║  Commands:                                                ║
║    /fast <query>    - Quick single-worker research        ║
║    /deep <query>    - Multi-worker deep research          ║
║    /expand <text>   - Expand on current research          ║
║    /sessions        - List all sessions                   ║
║    /load <id>       - Load a session                      ║
║    /new             - Clear session, start fresh          ║
║    /help            - Show all commands                   ║
╚═══════════════════════════════════════════════════════════╝
`)
}

// RenderEvent renders an event to the terminal
func (r *Renderer) RenderEvent(event events.Event) {
	r.mu.Lock()
	if r.muted {
		r.mu.Unlock()
		return
	}
	r.mu.Unlock()

	switch event.Type {
	case events.EventWorkerStarted:
		data, ok := event.Data.(events.WorkerProgressData)
		if ok {
			yellow.Fprintf(r.w, "  ⚡ Worker %d starting: %s\n",
				data.WorkerNum, truncate(data.Objective, 50))
		}

	case events.EventWorkerProgress:
		data, ok := event.Data.(events.WorkerProgressData)
		if ok {
			dim.Fprintf(r.w, "  │ Worker %d [iter %d]: %s\n",
				data.WorkerNum, data.Iteration, data.Message)
		}

	case events.EventWorkerComplete:
		data, ok := event.Data.(events.WorkerProgressData)
		if ok {
			green.Fprintf(r.w, "  ✓ Worker %d complete\n", data.WorkerNum)
		}

	case events.EventWorkerFailed:
		data, ok := event.Data.(events.WorkerProgressData)
		if ok {
			red.Fprintf(r.w, "  ✗ Worker %d failed: %s\n", data.WorkerNum, data.Message)
		}

	case events.EventToolCall:
		data, ok := event.Data.(events.ToolCallData)
		if ok {
			dim.Fprintf(r.w, "    → %s\n", data.Tool)
		}

	case events.EventSynthesisStarted:
		cyan.Fprintln(r.w, "\n  📝 Synthesizing results...")

	case events.EventResearchComplete:
		fmt.Fprintln(r.w)
		green.Fprintln(r.w, "═══════════════════════════════════════════════════════════")
		green.Fprintln(r.w, "                    Research Complete                       ")
		green.Fprintln(r.w, "═══════════════════════════════════════════════════════════")
	}
}

// ResearchStarting shows research is beginning
func (r *Renderer) ResearchStarting(sessionID string, mode string) {
	fmt.Fprintln(r.w)
	cyan.Fprintf(r.w, "🔍 Starting %s research...\n", mode)
	dim.Fprintf(r.w, "   Session: %s\n", sessionID)
	fmt.Fprintln(r.w)
}

// ResearchComplete shows the final report
func (r *Renderer) ResearchComplete(report string, workerCount int, sourceCount int, cost float64, sessionID string, reportPath string, obsidianLink string) {
	fmt.Fprintln(r.w)
	bold.Fprintln(r.w, "Report:")
	fmt.Fprintln(r.w, strings.Repeat("─", 60))
	fmt.Fprintln(r.w, report)
	fmt.Fprintln(r.w, strings.Repeat("─", 60))
	fmt.Fprintln(r.w)

	dim.Fprintf(r.w, "Workers: %d | Sources: %d | Cost: $%.4f\n",
		workerCount, sourceCount, cost)
	dim.Fprintf(r.w, "Session saved: %s\n", sessionID)

	if reportPath != "" {
		dim.Fprintf(r.w, "Report saved at: %s\n", reportPath)
	}

	if obsidianLink != "" {
		color.New(color.FgBlue, color.Underline).Fprintf(r.w, "Open in Obsidian: %s\n", obsidianLink)
	}
	fmt.Fprintln(r.w)
}

// Error displays an error
func (r *Renderer) Error(err error) {
	red.Fprintf(r.w, "Error: %v\n", err)
}

// Info displays an info message
func (r *Renderer) Info(msg string) {
	cyan.Fprintf(r.w, "%s\n", msg)
}

// SessionRestored shows restored session info
func (r *Renderer) SessionRestored(sessionID string, query string, workerCount int, sourceCount int, cost float64) {
	r.Welcome()
	green.Fprintf(r.w, "\n✓ Restored session: %s\n", sessionID)
	dim.Fprintf(r.w, "  Query: %s\n", truncate(query, 60))
	dim.Fprintf(r.w, "  Workers: %d | Sources: %d | Cost: $%.4f\n\n",
		workerCount, sourceCount, cost)
}

// SessionCleared shows that the session was cleared
func (r *Renderer) SessionCleared(oldSessionID string) {
	green.Fprintf(r.w, "✓ Session cleared: %s\n", oldSessionID)
	cyan.Fprintln(r.w, "  Ready for new research. Type a question or use /deep <query>")
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// Spinner provides animated progress indication for long-running operations
type Spinner struct {
	frames  []string
	current int
	message string
	done    chan struct{}
	mu      sync.Mutex
	w       io.Writer
	running bool
}

// NewSpinner creates a new spinner for the given writer
func NewSpinner(w io.Writer) *Spinner {
	return &Spinner{
		frames: []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"},
		w:      w,
		done:   make(chan struct{}),
	}
}

// Start begins the spinner animation with a message
func (s *Spinner) Start(message string) {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.message = message
	s.done = make(chan struct{})
	s.mu.Unlock()

	go func() {
		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-s.done:
				// Clear the spinner line
				fmt.Fprintf(s.w, "\r%s\r", strings.Repeat(" ", len(s.message)+5))
				return
			case <-ticker.C:
				s.mu.Lock()
				fmt.Fprintf(s.w, "\r%s %s", s.frames[s.current], s.message)
				s.current = (s.current + 1) % len(s.frames)
				s.mu.Unlock()
			}
		}
	}()
}

// Stop halts the spinner animation
func (s *Spinner) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.running {
		return
	}
	s.running = false
	close(s.done)
}

// UpdateMessage changes the spinner message
func (s *Spinner) UpdateMessage(message string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.message = message
}

// ProgressBar displays a progress indicator
type ProgressBar struct {
	total   int
	current int
	width   int
	w       io.Writer
	mu      sync.Mutex
}

// NewProgressBar creates a progress bar with specified width
func NewProgressBar(w io.Writer, total int, width int) *ProgressBar {
	return &ProgressBar{
		total: total,
		width: width,
		w:     w,
	}
}

// Update sets the current progress and redraws the bar
func (p *ProgressBar) Update(current int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.current = current
	p.draw()
}

// Increment advances the progress by one
func (p *ProgressBar) Increment() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.current++
	p.draw()
}

func (p *ProgressBar) draw() {
	percent := float64(p.current) / float64(p.total)
	filled := int(percent * float64(p.width))
	empty := p.width - filled

	bar := strings.Repeat("█", filled) + strings.Repeat("░", empty)
	fmt.Fprintf(p.w, "\r[%s] %d/%d (%.0f%%)", bar, p.current, p.total, percent*100)

	// Add newline when complete
	if p.current >= p.total {
		fmt.Fprintln(p.w)
	}
}

// Complete marks the progress as done
func (p *ProgressBar) Complete() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.current = p.total
	p.draw()
}

// StreamWriter returns a writer that can output streaming content
func (r *Renderer) StreamWriter() io.Writer {
	return r.w
}

// StreamText outputs text directly without formatting (for streaming LLM output)
func (r *Renderer) StreamText(text string) {
	fmt.Fprint(r.w, text)
}

// StreamEnd marks the end of streaming output with a newline
func (r *Renderer) StreamEnd() {
	fmt.Fprintln(r.w)
}

// NewSpinnerFromRenderer creates a spinner using the renderer's writer
func (r *Renderer) NewSpinner() *Spinner {
	return NewSpinner(r.w)
}

// NewProgressBar creates a progress bar using the renderer's writer
func (r *Renderer) NewProgressBar(total int) *ProgressBar {
	return NewProgressBar(r.w, total, 30)
}

// Verbose outputs debug info only if verbose mode is enabled
func (r *Renderer) Verbose(verbose bool, msg string) {
	if verbose {
		dim.Fprintf(r.w, "[DEBUG] %s\n", msg)
	}
}

// ExpandStarting shows expand operation is beginning
func (r *Renderer) ExpandStarting(sessionID string, followUp string) {
	fmt.Fprintln(r.w)
	cyan.Fprintln(r.w, "🔄 Expanding research...")
	dim.Fprintf(r.w, "   Session: %s\n", sessionID)
	dim.Fprintf(r.w, "   Follow-up: %s\n", truncate(followUp, 50))
	fmt.Fprintln(r.w)
}

// ExpandComplete shows expand operation completed
func (r *Renderer) ExpandComplete(sessionID string) {
	green.Fprintf(r.w, "✓ Research expanded: %s\n\n", sessionID)
}

// RerunStarting shows rerun operation is beginning
func (r *Renderer) RerunStarting(workerNum int, objective string) {
	fmt.Fprintln(r.w)
	yellow.Fprintf(r.w, "🔄 Re-running worker %d...\n", workerNum)
	dim.Fprintf(r.w, "   Objective: %s\n\n", truncate(objective, 50))
}

// RerunComplete shows rerun operation completed
func (r *Renderer) RerunComplete(workerNum int) {
	green.Fprintf(r.w, "✓ Worker %d re-run complete\n\n", workerNum)
}

// RecompileStarting shows recompile operation is beginning
func (r *Renderer) RecompileStarting() {
	fmt.Fprintln(r.w)
	cyan.Fprintln(r.w, "📝 Recompiling report...")
	fmt.Fprintln(r.w)
}

// RecompileComplete shows recompile operation completed
func (r *Renderer) RecompileComplete(report string) {
	fmt.Fprintln(r.w)
	bold.Fprintln(r.w, "Recompiled Report:")
	fmt.Fprintln(r.w, strings.Repeat("─", 60))
	fmt.Fprintln(r.w, report)
	fmt.Fprintln(r.w, strings.Repeat("─", 60))
	fmt.Fprintln(r.w)
	green.Fprintln(r.w, "✓ Report recompiled")
}

// WorkerList displays workers in the current session
func (r *Renderer) WorkerList(workers []WorkerDisplay) {
	if len(workers) == 0 {
		yellow.Fprintln(r.w, "No workers in current session")
		return
	}

	fmt.Fprintln(r.w)
	bold.Fprintln(r.w, "Workers:")
	for _, w := range workers {
		statusColor := dim
		statusIcon := "○"
		switch w.Status {
		case "complete":
			statusColor = green
			statusIcon = "✓"
		case "running":
			statusColor = yellow
			statusIcon = "◐"
		case "failed":
			statusColor = red
			statusIcon = "✗"
		}
		statusColor.Fprintf(r.w, "  %s Worker %d: %s\n", statusIcon, w.Number, truncate(w.Objective, 50))
		if w.SourceCount > 0 {
			dim.Fprintf(r.w, "    Sources: %d\n", w.SourceCount)
		}
	}
	fmt.Fprintln(r.w)
}

// WorkerDisplay contains display info for a worker
type WorkerDisplay struct {
	Number      int
	Objective   string
	Status      string
	SourceCount int
}
