package repl

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/chzyer/readline"
	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/obsidian"
	"go-research/internal/session"
)

// REPL is the interactive research shell
type REPL struct {
	router      *Router
	store       *session.Store
	bus         *events.Bus
	renderer    *Renderer
	readline    *readline.Instance
	ctx         *Context
	config      *config.Config
	commandDocs []CommandDoc
	mu          sync.Mutex
	running     bool // true when a handler is executing
}

// New creates a new REPL instance
func New(store *session.Store, bus *events.Bus, cfg *config.Config, handlers map[string]Handler, docs []CommandDoc) (*REPL, error) {
	rl, err := readline.NewEx(&readline.Config{
		Prompt:          "\033[36mresearch>\033[0m ",
		HistoryFile:     cfg.HistoryFile,
		AutoComplete:    newCompleter(),
		InterruptPrompt: "^C",
		EOFPrompt:       "exit",
	})
	if err != nil {
		return nil, fmt.Errorf("readline init: %w", err)
	}

	r := &REPL{
		store:       store,
		bus:         bus,
		renderer:    NewRenderer(os.Stdout),
		readline:    rl,
		config:      cfg,
		commandDocs: docs,
	}

	r.ctx = &Context{
		Store:       store,
		Bus:         bus,
		Renderer:    r.renderer,
		Config:      cfg,
		Obsidian:    obsidian.NewWriter(cfg.VaultPath),
		CommandDocs: docs,
	}

	// Initialize classifier if configured
	if cfg.ClassifierModel != "" {
		client := llm.NewClient(cfg)
		r.ctx.Classifier = NewQueryClassifier(client, cfg.ClassifierModel)
	}

	r.router = NewRouter(r.ctx, handlers)

	return r, nil
}

// Context returns the REPL context for external access
func (r *REPL) Context() *Context {
	return r.ctx
}

// Run starts the interactive REPL
func (r *REPL) Run(ctx context.Context) error {
	defer r.readline.Close()

	r.renderer.Welcome(r.commandDocs)

	// Try to restore last session
	if sess, err := r.store.LoadLast(); err == nil && sess != nil {
		r.ctx.Session = sess
		r.renderer.SessionRestored(
			sess.ID,
			sess.Query,
			len(sess.Workers),
			len(sess.Sources),
			sess.Cost.TotalCost,
		)
	}

	// Subscribe to events for rendering
	eventCh := r.bus.Subscribe(
		events.EventWorkerStarted,
		events.EventWorkerProgress,
		events.EventWorkerComplete,
		events.EventWorkerFailed,
		events.EventToolCall,
		events.EventToolResult,
		events.EventSynthesisStarted,
		events.EventResearchComplete,
	)

	// Event rendering goroutine
	go func() {
		for event := range eventCh {
			r.renderer.RenderEvent(event)
		}
	}()

	// Set up signal handling for Ctrl+C during execution
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGINT)
	defer signal.Stop(sigCh)

	// Handle signals in goroutine
	go func() {
		for range sigCh {
			r.mu.Lock()
			if r.running && r.ctx.Cancel != nil {
				r.renderer.Info("\n⚠ Cancelling research (user interrupt)...")
				r.ctx.CancelWithReason(events.CancelReasonUserInterrupt)
			}
			r.mu.Unlock()
		}
	}()

	// Main REPL loop
	for {
		select {
		case <-ctx.Done():
			r.shutdown()
			return ctx.Err()
		default:
			line, err := r.readline.Readline()
			if err != nil {
				if err == readline.ErrInterrupt {
					// Ctrl+C pressed at prompt - check if running
					r.mu.Lock()
					if r.running && r.ctx.Cancel != nil {
						r.renderer.Info("\n⚠ Cancelling research (user interrupt)...")
						r.ctx.CancelWithReason(events.CancelReasonUserInterrupt)
					}
					r.mu.Unlock()
					continue
				}
				// EOF or other error
				r.shutdown()
				return nil
			}

			handler, args, routeErr := r.router.Route(line)
			if routeErr != nil {
				r.renderer.Error(routeErr)
				continue
			}

			if handler == nil {
				continue
			}

			// Create cancelable context for this execution
			runCtx, cancel := context.WithCancel(ctx)
			r.ctx.RunContext = runCtx
			r.ctx.Cancel = cancel
			r.ctx.CancelReason = "" // Reset cancel reason for new execution

			r.mu.Lock()
			r.running = true
			r.mu.Unlock()

			execErr := handler.Execute(r.ctx, args)

			r.mu.Lock()
			r.running = false
			cancelReason := r.ctx.CancelReason
			r.ctx.Cancel = nil
			r.ctx.CancelReason = ""
			r.mu.Unlock()
			cancel() // Clean up context

			if execErr != nil {
				// Check for quit signal
				if execErr.Error() == "quit" {
					r.shutdown()
					return nil
				}
				// Check for cancellation
				if execErr == context.Canceled || runCtx.Err() == context.Canceled {
					// Determine the cancellation reason
					reason := cancelReason
					if reason == "" {
						if runCtx.Err() == context.DeadlineExceeded {
							reason = events.CancelReasonTimeout
						} else {
							reason = events.CancelReasonUnknown
						}
					}

					// Emit cancellation event with reason
					r.emitCancellation(reason)

					// Log the cancellation with reason
					r.renderer.Info(fmt.Sprintf("Research cancelled: %s", r.formatCancelReason(reason)))
					continue
				}
				r.renderer.Error(execErr)
			}
		}
	}
}

// emitCancellation publishes a cancellation event with the given reason.
func (r *REPL) emitCancellation(reason events.CancelReason) {
	var sessionID, query string
	if r.ctx.Session != nil {
		sessionID = r.ctx.Session.ID
		query = r.ctx.Session.Query
	}

	r.bus.Publish(events.Event{
		Type:      events.EventResearchCancelled,
		Timestamp: time.Now(),
		Data: events.ResearchCancelledData{
			SessionID: sessionID,
			Query:     query,
			Reason:    reason,
			Phase:     "unknown", // Could be enhanced to track current phase
			Message:   r.formatCancelReason(reason),
		},
	})
}

// formatCancelReason returns a human-readable description of the cancellation reason.
func (r *REPL) formatCancelReason(reason events.CancelReason) string {
	switch reason {
	case events.CancelReasonUserInterrupt:
		return "user pressed Ctrl+C"
	case events.CancelReasonTimeout:
		return "operation timed out"
	case events.CancelReasonParentCancelled:
		return "parent operation was cancelled"
	case events.CancelReasonShutdown:
		return "system is shutting down"
	default:
		return "unknown reason (this is a bug - please report)"
	}
}

// shutdown saves current session and cleans up
func (r *REPL) shutdown() {
	r.renderer.Info("\nShutting down...")

	// Save current session
	if r.ctx.Session != nil {
		r.renderer.Info("Saving current session...")
		if err := r.store.Save(r.ctx.Session); err != nil {
			r.renderer.Error(fmt.Errorf("save session: %w", err))
		} else {
			r.renderer.Info(fmt.Sprintf("Session saved: %s", r.ctx.Session.ID))
		}
	}

	r.renderer.Info("Goodbye!")
}
