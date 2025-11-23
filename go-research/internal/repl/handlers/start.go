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

// FastHandler handles /fast command (single worker)
type FastHandler struct{}

// Execute runs fast research with a single worker
func (h *FastHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /fast <query>")
	}

	query := strings.Join(args, " ")

	// Reuse pending blank session if available, otherwise create new
	var sess *session.Session
	if ctx.Session != nil && ctx.Session.Status == session.StatusPending && ctx.Session.Query == "" {
		sess = ctx.Session
		sess.Query = query
		sess.Mode = session.ModeFast
		sess.UpdatedAt = time.Now()
	} else {
		sess = session.New(query, session.ModeFast)
		ctx.Session = sess
	}
	
	ctx.Renderer.ResearchStarting(sess.ID, "fast")

	// Publish start event
	ctx.Bus.Publish(events.Event{
		Type:      events.EventResearchStarted,
		Timestamp: time.Now(),
		Data: events.ResearchStartedData{
			SessionID: sess.ID,
			Query:     query,
			Mode:      "fast",
		},
	})

	// Run single agent
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
	sess.Status = session.StatusComplete

	// Save to store
	if err := ctx.Store.Save(sess); err != nil {
		return fmt.Errorf("save session: %w", err)
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
		len(sess.Workers),
		len(sess.Sources),
		sess.Cost.TotalCost,
		sess.ID,
		reportPath,
		obsidianLink,
	)

	return nil
}

// DeepHandler handles /deep command (multi-worker)
type DeepHandler struct{}

// Execute runs deep research with multiple workers
func (h *DeepHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /deep <query>")
	}

	query := strings.Join(args, " ")

	// Reuse pending blank session if available, otherwise create new
	var sess *session.Session
	if ctx.Session != nil && ctx.Session.Status == session.StatusPending && ctx.Session.Query == "" {
		sess = ctx.Session
		sess.Query = query
		sess.Mode = session.ModeDeep
		sess.UpdatedAt = time.Now()
	} else {
		sess = session.New(query, session.ModeDeep)
		ctx.Session = sess
	}

	ctx.Renderer.ResearchStarting(sess.ID, "deep")

	// Start visualization
	viz := repl.NewVisualizer(ctx)
	viz.Start()
	defer viz.Stop()

	// Run orchestrator
	orch := orchestrator.New(ctx.Bus, ctx.Config)

	// Use the cancelable context from REPL with timeout
	runCtx, cancel := context.WithTimeout(ctx.RunContext, 30*time.Minute)
	defer cancel()

	sess.Status = session.StatusRunning
	result, err := orch.Research(runCtx, query)

	// Stop visualization (defer will catch it too, but we want it before reporting)
	viz.Stop()

	if err != nil {
		sess.Status = session.StatusFailed
		return fmt.Errorf("research failed: %w", err)
	}

	// Populate session from result
	sess.ComplexityScore = result.ComplexityScore
	sess.Workers = result.Workers
	sess.Report = result.Report
	sess.Sources = result.Sources
	sess.Insights = result.Insights
	sess.Cost = result.Cost
	sess.Status = session.StatusComplete

	// Save to store
	if err := ctx.Store.Save(sess); err != nil {
		return fmt.Errorf("save session: %w", err)
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
		len(sess.Workers),
		len(sess.Sources),
		sess.Cost.TotalCost,
		sess.ID,
		reportPath,
		obsidianLink,
	)

	return nil
}
