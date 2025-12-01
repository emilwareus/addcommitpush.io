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

// DeepHandler handles /deep command (multi-worker with state-of-the-art techniques)
type DeepHandler struct{}

// Execute runs deep research using the advanced DeepOrchestrator which provides:
// - Multi-perspective planning (STORM-style)
// - DAG-based parallel task execution
// - Context folding for long-horizon tasks
// - Specialized sub-agents (search, analysis, synthesis)
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

	// Run deep orchestrator (state-of-the-art implementation)
	orch := orchestrator.NewDeepOrchestrator(ctx.Bus, ctx.Config)

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

	// Populate session from deep result
	sess.ComplexityScore = 0.8 // Deep research is high complexity
	sess.Report = result.Report.FullContent
	sess.Sources = collectDeepSources(result)
	sess.Cost = result.Cost
	sess.Workers = buildWorkersFromDeepResult(result)
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

	// Calculate perspective count for display
	perspectiveCount := 0
	if result.Plan != nil {
		perspectiveCount = len(result.Plan.Perspectives)
	}

	ctx.Renderer.ResearchComplete(
		sess.Report,
		perspectiveCount,
		len(sess.Sources),
		sess.Cost.TotalCost,
		sess.ID,
		reportPath,
		obsidianLink,
	)

	return nil
}

// collectDeepSources gathers all unique sources from deep research results
func collectDeepSources(result *orchestrator.DeepResult) []string {
	sourceSet := make(map[string]bool)

	// Collect from search results
	for _, sr := range result.SearchResults {
		if sr != nil {
			for _, source := range sr.Sources {
				sourceSet[source] = true
			}
		}
	}

	// Collect from report citations
	if result.Report != nil {
		for _, citation := range result.Report.Citations {
			if citation.URL != "" {
				sourceSet[citation.URL] = true
			}
		}
	}

	sources := make([]string, 0, len(sourceSet))
	for source := range sourceSet {
		sources = append(sources, source)
	}
	return sources
}

// buildWorkersFromDeepResult creates worker contexts from deep research results for Obsidian export
func buildWorkersFromDeepResult(result *orchestrator.DeepResult) []session.WorkerContext {
	if result.Plan == nil {
		return nil
	}

	workers := make([]session.WorkerContext, 0, len(result.Plan.Perspectives))

	for i, perspective := range result.Plan.Perspectives {
		nodeID := fmt.Sprintf("search_%d", i)
		searchResult := result.SearchResults[nodeID]

		// Build worker output from facts
		var output strings.Builder
		output.WriteString(fmt.Sprintf("## %s\n\n", perspective.Name))
		output.WriteString(fmt.Sprintf("**Focus:** %s\n\n", perspective.Focus))

		if searchResult != nil && len(searchResult.Facts) > 0 {
			output.WriteString("### Key Findings\n\n")
			for _, fact := range searchResult.Facts {
				output.WriteString(fmt.Sprintf("- %s", fact.Content))
				if fact.Source != "" && fact.Source != "unknown" {
					output.WriteString(fmt.Sprintf(" ([source](%s))", fact.Source))
				}
				output.WriteString("\n")
			}
		}

		var sources []string
		var cost session.CostBreakdown
		if searchResult != nil {
			sources = searchResult.Sources
			cost = searchResult.Cost
		}

		workers = append(workers, session.WorkerContext{
			ID:          nodeID,
			Objective:   fmt.Sprintf("%s: %s", perspective.Name, perspective.Focus),
			Status:      "complete",
			StartedAt:   time.Now().Add(-result.Duration),
			FinalOutput: output.String(),
			Sources:     sources,
			Cost:        cost,
		})
	}

	return workers
}
