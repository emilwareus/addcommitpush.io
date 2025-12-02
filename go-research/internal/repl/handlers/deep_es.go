// Package handlers provides REPL command handlers.
package handlers

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"go-research/internal/adapters/storage/filesystem"
	"go-research/internal/core/domain/aggregate"
	"go-research/internal/core/ports"
	"go-research/internal/events"
	"go-research/internal/orchestrator"
	"go-research/internal/repl"
	"go-research/internal/session"
)

// DeepESHandler handles /deep-es command (event-sourced deep research)
type DeepESHandler struct {
	eventStore ports.EventStore
}

// NewDeepESHandler creates a new handler for event-sourced deep research.
func NewDeepESHandler(eventStore ports.EventStore) *DeepESHandler {
	return &DeepESHandler{eventStore: eventStore}
}

// Execute runs deep research using the event-sourced orchestrator.
func (h *DeepESHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /deep-es <query>")
	}

	query := strings.Join(args, " ")

	// Create session (for legacy compatibility)
	sess := session.New(query, session.ModeDeep)
	ctx.Session = sess

	ctx.Renderer.ResearchStarting(sess.ID, "deep-es (event-sourced)")

	// Start visualization
	viz := repl.NewVisualizer(ctx)
	viz.Start()
	defer viz.Stop()

	// Create event-sourced orchestrator
	orch := orchestrator.NewDeepOrchestratorES(h.eventStore, ctx.Bus, ctx.Config)

	// Use cancelable context with timeout
	runCtx, cancel := context.WithTimeout(ctx.RunContext, 30*time.Minute)
	defer cancel()

	// Run research - session ID is the same as the legacy session ID
	state, err := orch.Research(runCtx, sess.ID, query)

	viz.Stop()

	if err != nil {
		sess.Status = session.StatusFailed
		return fmt.Errorf("research failed: %w", err)
	}

	// Convert state to session for legacy storage
	sess.Report = ""
	if state.Report != nil {
		sess.Report = state.Report.FullContent
	}
	sess.Sources = collectSourcesFromState(state)
	sess.Cost = session.CostBreakdown{
		InputTokens:  state.Cost.InputTokens,
		OutputTokens: state.Cost.OutputTokens,
		TotalTokens:  state.Cost.TotalTokens,
		TotalCost:    state.Cost.TotalCostUSD,
	}
	sess.Status = session.StatusComplete

	// Save to legacy store
	if err := ctx.Store.Save(sess); err != nil {
		ctx.Renderer.Error(fmt.Errorf("save session: %w", err))
	}

	ctx.Bus.Publish(events.Event{
		Type:      events.EventResearchComplete,
		Timestamp: time.Now(),
		Data:      sess,
	})

	// Save to Obsidian
	var obsidianLink string
	var reportPath string
	if err := ctx.Obsidian.Write(sess); err != nil {
		ctx.Renderer.Error(fmt.Errorf("save to obsidian: %w", err))
	} else {
		reportPath = ctx.Obsidian.GetReportPath(sess)
		obsidianLink = fmt.Sprintf("obsidian://open?path=%s", url.QueryEscape(reportPath))
	}

	ctx.Renderer.ResearchComplete(
		sess.Report,
		len(state.Workers),
		len(sess.Sources),
		sess.Cost.TotalCost,
		sess.ID,
		reportPath,
		obsidianLink,
	)

	ctx.Renderer.Info(fmt.Sprintf("Event-sourced session: %s (can be resumed with /resume)", state.ID))

	return nil
}

// collectSourcesFromState extracts sources from the event-sourced state.
func collectSourcesFromState(state *aggregate.ResearchState) []string {
	sourceSet := make(map[string]bool)
	for _, w := range state.Workers {
		for _, s := range w.Sources {
			sourceSet[s.URL] = true
		}
	}

	sources := make([]string, 0, len(sourceSet))
	for s := range sourceSet {
		sources = append(sources, s)
	}
	return sources
}

// ResumeESHandler handles /resume command for continuing research
type ResumeESHandler struct {
	eventStore ports.EventStore
}

// NewResumeESHandler creates a new handler for resuming research.
func NewResumeESHandler(eventStore ports.EventStore) *ResumeESHandler {
	return &ResumeESHandler{eventStore: eventStore}
}

// Execute resumes an interrupted research session.
func (h *ResumeESHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /resume <session_id>")
	}

	sessionID := args[0]

	ctx.Renderer.Info(fmt.Sprintf("Resuming session: %s", sessionID))

	// Start visualization
	viz := repl.NewVisualizer(ctx)
	viz.Start()
	defer viz.Stop()

	// Create orchestrator and resume
	orch := orchestrator.NewDeepOrchestratorES(h.eventStore, ctx.Bus, ctx.Config)

	runCtx, cancel := context.WithTimeout(ctx.RunContext, 30*time.Minute)
	defer cancel()

	state, err := orch.Resume(runCtx, sessionID)
	viz.Stop()

	if err != nil {
		return fmt.Errorf("resume failed: %w", err)
	}

	ctx.Renderer.Info(fmt.Sprintf("Session %s resumed", sessionID))
	ctx.Renderer.Info(fmt.Sprintf("Status: %s | Progress: %.0f%% | Cost: $%.4f",
		state.Status, state.Progress*100, state.Cost.TotalCostUSD))

	if state.Status == "complete" && state.Report != nil {
		ctx.Renderer.ResearchComplete(
			state.Report.FullContent,
			len(state.Workers),
			len(collectSourcesFromState(state)),
			state.Cost.TotalCostUSD,
			state.ID,
			"",
			"",
		)
	}

	return nil
}

// SessionsESListHandler handles /sessions-es command
type SessionsESListHandler struct {
	eventStore ports.EventStore
}

// NewSessionsESListHandler creates a handler for listing event-sourced sessions.
func NewSessionsESListHandler(eventStore ports.EventStore) *SessionsESListHandler {
	return &SessionsESListHandler{eventStore: eventStore}
}

// Execute lists all event-sourced sessions.
func (h *SessionsESListHandler) Execute(ctx *repl.Context, args []string) error {
	handler := NewSessionsESHandler(h.eventStore)
	summaries, err := handler.ListSessions(ctx.RunContext)
	if err != nil {
		return fmt.Errorf("list sessions: %w", err)
	}

	if len(summaries) == 0 {
		ctx.Renderer.Info("No event-sourced sessions found")
		return nil
	}

	ctx.Renderer.Info(fmt.Sprintf("Found %d event-sourced sessions:", len(summaries)))
	for _, s := range summaries {
		ctx.Renderer.Info(fmt.Sprintf("  %s | %s | %s | %.0f%% | $%.4f",
			s.ID,
			truncateSession(s.Query, 30),
			s.Status,
			s.Progress*100,
			s.Cost,
		))
	}

	// Show resumable sessions
	resumable, _ := handler.GetResumableStates(ctx.RunContext)
	if len(resumable) > 0 {
		ctx.Renderer.Info(fmt.Sprintf("\n%d sessions can be resumed:", len(resumable)))
		for _, s := range resumable {
			ctx.Renderer.Info(fmt.Sprintf("  /resume %s", s.ID))
		}
	}

	return nil
}

// CreateEventStoreHandlers creates all event-sourced handlers with a shared event store.
func CreateEventStoreHandlers(eventStoreDir string) (map[string]repl.Handler, error) {
	eventStore := filesystem.NewEventStore(eventStoreDir)

	return map[string]repl.Handler{
		"deep-es":     NewDeepESHandler(eventStore),
		"resume":      NewResumeESHandler(eventStore),
		"sessions-es": NewSessionsESListHandler(eventStore),
	}, nil
}
