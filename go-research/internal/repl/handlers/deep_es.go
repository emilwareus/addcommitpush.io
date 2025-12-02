// Package handlers provides REPL command handlers.
package handlers

import (
	"context"
	"fmt"
	"time"

	"go-research/internal/adapters/storage/filesystem"
	"go-research/internal/core/domain/aggregate"
	"go-research/internal/core/ports"
	"go-research/internal/orchestrator"
	"go-research/internal/repl"
)


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
		"resume":      NewResumeESHandler(eventStore),
		"sessions-es": NewSessionsESListHandler(eventStore),
	}, nil
}
