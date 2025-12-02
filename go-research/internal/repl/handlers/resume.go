// Package handlers provides REPL command handlers.
package handlers

import (
	"context"
	"fmt"

	"go-research/internal/orchestrator"
)

// ResumeHandler handles /resume commands for continuing interrupted research.
type ResumeHandler struct {
	orchestrator *orchestrator.DeepOrchestratorES
}

// NewResumeHandler creates a new handler for resuming research sessions.
func NewResumeHandler(orch *orchestrator.DeepOrchestratorES) *ResumeHandler {
	return &ResumeHandler{orchestrator: orch}
}

// Resume continues an interrupted research session.
func (h *ResumeHandler) Resume(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return fmt.Errorf("session ID is required")
	}

	state, err := h.orchestrator.Resume(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("resume failed: %w", err)
	}

	if state.Status == "complete" {
		fmt.Printf("\nResearch %s completed successfully.\n", sessionID)
		fmt.Printf("Status: %s | Progress: %.0f%% | Cost: $%.4f\n",
			state.Status, state.Progress*100, state.Cost.TotalCostUSD)
	}

	return nil
}
