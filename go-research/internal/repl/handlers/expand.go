package handlers

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"go-research/internal/agent"
	think_deep_arch "go-research/internal/architectures/think_deep"
	"go-research/internal/events"
	"go-research/internal/orchestrator"
	"go-research/internal/repl"
	"go-research/internal/session"
	"go-research/internal/think_deep"
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
	switch newSess.Mode {
	case session.ModeFast:
		err = h.runFast(ctx, expandedQuery, newSess)
	case session.ModeThinkDeep:
		err = h.runThinkDeep(ctx, expandedQuery, newSess)
	default:
		// Default to STORM for storm mode and legacy sessions
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
		// Check if it was a timeout and set the cancel reason appropriately
		if runCtx.Err() == context.DeadlineExceeded {
			ctx.CancelReason = events.CancelReasonTimeout
		}
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
		// Check if it was a timeout and set the cancel reason appropriately
		if runCtx.Err() == context.DeadlineExceeded {
			ctx.CancelReason = events.CancelReasonTimeout
		}
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

// runThinkDeep runs expansion using ThinkDeep architecture with injection context.
func (h *ExpandHandler) runThinkDeep(ctx *repl.Context, query string, sess *session.Session) error {
	// Build injection context from parent session chain
	injection := h.buildInjectionContext(ctx, query)

	// Start visualization
	viz := repl.NewVisualizer(ctx)
	viz.Start()
	defer viz.Stop()

	// Create ThinkDeep architecture with injection context
	arch := think_deep_arch.New(think_deep_arch.Config{
		AppConfig:        ctx.Config,
		Bus:              ctx.Bus,
		InjectionContext: injection,
	})

	// Use the cancelable context from REPL with timeout
	runCtx, cancel := context.WithTimeout(ctx.RunContext, 30*time.Minute)
	defer cancel()

	sess.Status = session.StatusRunning
	result, err := arch.Research(runCtx, sess.ID, query)

	// Stop visualization
	viz.Stop()

	if err != nil {
		// Check if it was a timeout and set the cancel reason appropriately
		if runCtx.Err() == context.DeadlineExceeded {
			ctx.CancelReason = events.CancelReasonTimeout
		}
		sess.Status = session.StatusFailed
		return fmt.Errorf("research failed: %w", err)
	}

	sess.Report = result.Report
	sess.Sources = result.Sources
	sess.Cost = result.Metrics.Cost
	sess.Status = session.StatusExpanded

	// Convert SubInsights to session Insights for persistence and QA access
	if len(result.SubInsights) > 0 {
		sess.Insights = make([]session.Insight, 0, len(result.SubInsights))
		for _, subIns := range result.SubInsights {
			sess.Insights = append(sess.Insights, session.Insight{
				Title:       subIns.Title,
				Finding:     subIns.Finding,
				Implication: subIns.Implication,
				Confidence:  subIns.Confidence,
				Sources:     []string{subIns.SourceURL},
				WorkerID:    fmt.Sprintf("sub-researcher-%d", subIns.ResearcherNum),
			})
		}
	}

	ctx.Bus.Publish(events.Event{
		Type:      events.EventResearchComplete,
		Timestamp: time.Now(),
		Data:      sess,
	})

	return nil
}

// buildInjectionContext creates an injection context from the session chain.
func (h *ExpandHandler) buildInjectionContext(ctx *repl.Context, expansionTopic string) *think_deep.InjectionContext {
	injection := think_deep.NewInjectionContext()
	injection.SetExpansionTopic(expansionTopic)

	// Walk session chain and accumulate context
	current := ctx.Session
	for current != nil {
		// Accumulate findings from insights
		for _, ins := range current.Insights {
			injection.AddFinding(ins.Finding)
		}

		// Accumulate sources as visited URLs
		for _, src := range current.Sources {
			injection.AddVisitedURL(src)
		}

		// Keep existing report for context
		if injection.ExistingReport == "" && current.Report != "" {
			injection.SetExistingReport(current.Report)
		}

		// Walk to parent
		if current.ParentID == nil {
			break
		}
		parent, err := ctx.Store.Load(*current.ParentID)
		if err != nil {
			break
		}
		current = parent
	}

	return injection
}
