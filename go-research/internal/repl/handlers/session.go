package handlers

import (
	"fmt"

	"go-research/internal/repl"
	"go-research/internal/session"
)

// SessionsHandler handles /sessions command
type SessionsHandler struct{}

// Execute lists all saved sessions
func (h *SessionsHandler) Execute(ctx *repl.Context, args []string) error {
	summaries, err := ctx.Store.List()
	if err != nil {
		return fmt.Errorf("list sessions: %w", err)
	}

	if len(summaries) == 0 {
		ctx.Renderer.Info("No saved sessions")
		return nil
	}

	ctx.Renderer.Info(fmt.Sprintf("Found %d sessions:", len(summaries)))
	for _, s := range summaries {
		ctx.Renderer.Info(fmt.Sprintf("  %s | %s | %s | $%.4f",
			s.ID,
			truncateSession(s.Query, 40),
			s.Status,
			s.Cost,
		))
	}

	return nil
}

// LoadHandler handles /load command
type LoadHandler struct{}

// Execute loads a session by ID
func (h *LoadHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /load <session_id>")
	}

	sess, err := ctx.Store.Load(args[0])
	if err != nil {
		return fmt.Errorf("load session: %w", err)
	}

	ctx.Session = sess
	ctx.Renderer.SessionRestored(
		sess.ID,
		sess.Query,
		len(sess.Workers),
		len(sess.Sources),
		sess.Cost.TotalCost,
	)

	return nil
}

// NewHandler handles /new command
type NewHandler struct{}

// Execute starts a new session immediately
func (h *NewHandler) Execute(ctx *repl.Context, args []string) error {
	// Create a new blank session (defaults to Storm mode)
	sess := session.New("", session.ModeStorm)
	ctx.Session = sess

	ctx.Renderer.Info(fmt.Sprintf("✓ New session created: %s", sess.ID))
	ctx.Renderer.Info("  Ready. Type a question to start research.")

	return nil
}

func truncateSession(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
