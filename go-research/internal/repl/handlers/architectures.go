package handlers

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

	"go-research/internal/architectures"
	"go-research/internal/architectures/catalog"
	"go-research/internal/events"
	"go-research/internal/repl"
	"go-research/internal/session"
)

// ArchitectureCommandHandler runs research using a specific architecture definition.
type ArchitectureCommandHandler struct {
	definition catalog.Definition

	mu   sync.Mutex
	arch architectures.Architecture
}

// NewArchitectureCommandHandler creates a handler for the provided architecture definition.
func NewArchitectureCommandHandler(def catalog.Definition) *ArchitectureCommandHandler {
	return &ArchitectureCommandHandler{
		definition: def,
	}
}

func (h *ArchitectureCommandHandler) getArchitecture(ctx *repl.Context) (architectures.Architecture, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.arch != nil {
		return h.arch, nil
	}

	arch, err := h.definition.Build(catalog.Dependencies{
		Config: ctx.Config,
		Bus:    ctx.Bus,
	})
	if err != nil {
		return nil, err
	}

	h.arch = arch
	return arch, nil
}

// Execute runs the architecture for a given query.
func (h *ArchitectureCommandHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /%s <query>", h.definition.Name)
	}

	arch, err := h.getArchitecture(ctx)
	if err != nil {
		return fmt.Errorf("build %s architecture: %w", h.definition.Name, err)
	}

	query := strings.Join(args, " ")

	// Set mode based on architecture name
	mode := session.ModeStorm
	if h.definition.Name == "think_deep" {
		mode = session.ModeThinkDeep
	}

	sess := session.New(query, mode)
	ctx.Session = sess

	ctx.Renderer.ResearchStarting(sess.ID, fmt.Sprintf("%s architecture", h.definition.Name))

	viz := repl.NewVisualizer(ctx)
	viz.Start()
	defer viz.Stop()

	runCtx, cancel := context.WithTimeout(ctx.RunContext, 30*time.Minute)
	defer cancel()

	result, err := arch.Research(runCtx, sess.ID, query)

	viz.Stop()

	if err != nil {
		sess.Status = session.StatusFailed
		return fmt.Errorf("%s research failed: %w", h.definition.Name, err)
	}

	sess.Report = result.Report
	sess.Sources = result.Sources
	sess.Cost = result.Metrics.Cost
	sess.Status = session.StatusComplete

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

	if err := ctx.Store.Save(sess); err != nil {
		ctx.Renderer.Error(fmt.Errorf("save session: %w", err))
	}

	ctx.Bus.Publish(events.Event{
		Type:      events.EventResearchComplete,
		Timestamp: time.Now(),
		Data:      sess,
	})

	var obsidianLink string
	var reportPath string
	// Use WriteWithInsights if SubInsights are available, otherwise use standard Write
	if len(result.SubInsights) > 0 {
		if err := ctx.Obsidian.WriteWithInsights(sess, result.SubInsights); err != nil {
			ctx.Renderer.Error(fmt.Errorf("save to obsidian: %w", err))
		} else {
			reportPath = ctx.Obsidian.GetReportPath(sess)
			obsidianLink = fmt.Sprintf("obsidian://open?path=%s", url.QueryEscape(reportPath))
		}
	} else {
		if err := ctx.Obsidian.Write(sess); err != nil {
			ctx.Renderer.Error(fmt.Errorf("save to obsidian: %w", err))
		} else {
			reportPath = ctx.Obsidian.GetReportPath(sess)
			obsidianLink = fmt.Sprintf("obsidian://open?path=%s", url.QueryEscape(reportPath))
		}
	}

	ctx.Renderer.ResearchComplete(
		result.Report,
		result.Metrics.WorkerCount,
		result.Metrics.SourceCount,
		result.Metrics.Cost.TotalCost,
		result.SessionID,
		reportPath,
		obsidianLink,
	)

	ctx.Renderer.Info(fmt.Sprintf("Session: %s (resumable with /resume)", result.SessionID))

	return nil
}

// ArchitecturesHandler lists available architecture commands.
type ArchitecturesHandler struct{}

// Execute displays all registered architectures.
func (h *ArchitecturesHandler) Execute(ctx *repl.Context, args []string) error {
	defs := catalog.Definitions()
	if len(defs) == 0 {
		ctx.Renderer.Info("No architectures registered")
		return nil
	}

	ctx.Renderer.Info("Available research architectures:")
	for _, def := range defs {
		resumeStatus := ""
		if def.SupportsResume {
			resumeStatus = " (resumable)"
		}
		ctx.Renderer.Info(fmt.Sprintf("  /%s - %s%s", def.Name, def.Description, resumeStatus))
	}

	return nil
}
