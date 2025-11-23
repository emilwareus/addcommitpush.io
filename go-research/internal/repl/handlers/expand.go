package handlers

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"go-research/internal/agent"
	"go-research/internal/events"
	"go-research/internal/orchestrator"
	"go-research/internal/repl"
	"go-research/internal/session"
)

// ExpandHandler handles /expand and natural language follow-ups
type ExpandHandler struct{}

// Execute runs follow-up research based on the current session
func (h *ExpandHandler) Execute(ctx *repl.Context, args []string) error {
	if ctx.Session == nil {
		return fmt.Errorf("no active session. Start research with /fast or /deep first")
	}

	if len(args) == 0 {
		return fmt.Errorf("usage: /expand <follow-up query>")
	}

	followUp := strings.Join(args, " ")

	// Build continuation context from previous session
	continuationCtx := session.BuildContinuationContext(ctx.Session)

	// Create expansion query
	expandedQuery := fmt.Sprintf(`Based on previous research about "%s":

%s

Follow-up question: %s`, ctx.Session.Query, continuationCtx, followUp)

	// Create new version of session
	newSess := ctx.Session.NewVersion()
	newSess.Query = followUp
	ctx.Session = newSess

	ctx.Renderer.ExpandStarting(newSess.ID, followUp)

	// Run based on original mode
	var err error
	if newSess.Mode == session.ModeFast {
		err = h.runFast(ctx, expandedQuery, newSess)
	} else {
		err = h.runDeep(ctx, expandedQuery, newSess)
	}

	if err != nil {
		return err
	}

	if saveErr := ctx.Store.Save(newSess); saveErr != nil {
		return fmt.Errorf("save session: %w", saveErr)
	}

	ctx.Renderer.ExpandComplete(newSess.ID)

	// Save to Obsidian
	var obsidianLink string
	var reportPath string
	if err := ctx.Obsidian.Write(newSess); err != nil {
		ctx.Renderer.Error(fmt.Errorf("save to obsidian: %w", err))
	} else {
		reportPath = ctx.Obsidian.GetReportPath(newSess)
		obsidianLink = fmt.Sprintf("obsidian://open?path=%s", url.QueryEscape(reportPath))
	}

	ctx.Renderer.ResearchComplete(
		newSess.Report,
		len(newSess.Workers),
		len(newSess.Sources),
		newSess.Cost.TotalCost,
		newSess.ID,
		reportPath,
		obsidianLink,
	)

	return nil
}

func (h *ExpandHandler) runFast(ctx *repl.Context, query string, sess *session.Session) error {
	agentCfg := agent.DefaultConfig(ctx.Config)
	agentCfg.MaxIterations = 15

	reactAgent := agent.NewReact(agentCfg, ctx.Bus)

	// Use the cancelable context from REPL with timeout
	runCtx, cancel := context.WithTimeout(ctx.RunContext, 10*time.Minute)
	defer cancel()

	sess.Status = session.StatusRunning
	workerCtx, err := reactAgent.Research(runCtx, query)
	if err != nil {
		sess.Status = session.StatusFailed
		return fmt.Errorf("research failed: %w", err)
	}

	sess.Workers = []session.WorkerContext{workerCtx}
	sess.Report = workerCtx.FinalOutput
	sess.Sources = workerCtx.Sources
	sess.Cost = workerCtx.Cost
	sess.Status = session.StatusExpanded

	ctx.Bus.Publish(events.Event{
		Type:      events.EventResearchComplete,
		Timestamp: time.Now(),
		Data:      sess,
	})

	return nil
}

func (h *ExpandHandler) runDeep(ctx *repl.Context, query string, sess *session.Session) error {
	// Start visualization
	viz := repl.NewVisualizer(ctx)
	viz.Start()
	defer viz.Stop()

	orch := orchestrator.New(ctx.Bus, ctx.Config)

	// Use the cancelable context from REPL with timeout
	runCtx, cancel := context.WithTimeout(ctx.RunContext, 30*time.Minute)
	defer cancel()

	sess.Status = session.StatusRunning
	result, err := orch.Research(runCtx, query)

	// Stop visualization
	viz.Stop()

	if err != nil {
		sess.Status = session.StatusFailed
		return fmt.Errorf("research failed: %w", err)
	}

	sess.ComplexityScore = result.ComplexityScore
	sess.Workers = result.Workers
	sess.Report = result.Report
	sess.Sources = result.Sources
	sess.Insights = result.Insights
	sess.Cost = result.Cost
	sess.Status = session.StatusExpanded

	ctx.Bus.Publish(events.Event{
		Type:      events.EventResearchComplete,
		Timestamp: time.Now(),
		Data:      sess,
	})

	return nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
