package session

import (
	"fmt"
	"strings"

	"go-research/internal/think_deep"
)

// ContextSnapshot contains statistics and raw context for a session
type ContextSnapshot struct {
	// Session metadata
	SessionID      string
	Mode           Mode
	Status         SessionStatus
	Query          string
	
	// Statistics
	ReportLength   int
	SourcesCount   int
	InsightsCount  int
	WorkersCount   int
	IterationsCount int
	ToolCallsCount int
	Cost           CostBreakdown
	
	// Token estimates
	EstimatedTokens int
	MaxTokens       int
	
	// Think-deep specific
	HasThinkDeepContext bool
	ThinkDeepFindings   int
	ThinkDeepVisitedURLs int
	ThinkDeepHasReport   bool
	
	// Raw context string
	RawContext string
}

// BuildContextSnapshot creates a snapshot of the current session's context
func BuildContextSnapshot(sess *Session, store *Store, maxTokens int) (*ContextSnapshot, error) {
	if sess == nil {
		return nil, fmt.Errorf("no active session")
	}
	
	snapshot := &ContextSnapshot{
		SessionID:      sess.ID,
		Mode:           sess.Mode,
		Status:         sess.Status,
		Query:          sess.Query,
		ReportLength:   len(sess.Report),
		SourcesCount:   len(sess.Sources),
		InsightsCount:  len(sess.Insights),
		WorkersCount:   len(sess.Workers),
		Cost:           sess.Cost,
		MaxTokens:     maxTokens,
	}
	
	// Count iterations and tool calls across all workers
	for _, worker := range sess.Workers {
		snapshot.IterationsCount += len(worker.Iterations)
		snapshot.ToolCallsCount += len(worker.ToolCalls)
	}
	
	// Build raw context based on mode
	if sess.Mode == ModeThinkDeep {
		// For think_deep, build injection context like expand handler does
		injection := buildInjectionContextForSnapshot(sess, store)
		snapshot.HasThinkDeepContext = true
		snapshot.ThinkDeepFindings = len(injection.PreviousFindings)
		snapshot.ThinkDeepVisitedURLs = len(injection.VisitedURLs)
		snapshot.ThinkDeepHasReport = injection.ExistingReport != ""
		snapshot.RawContext = serializeInjectionContext(injection)
	} else {
		// For fast/storm, use continuation context
		snapshot.RawContext = BuildContinuationContext(sess)
	}
	
	// Estimate tokens (rough approximation: chars/4)
	snapshot.EstimatedTokens = estimateTokens(snapshot.RawContext)
	
	return snapshot, nil
}

// buildInjectionContextForSnapshot builds injection context from session chain
// Similar to ExpandHandler.buildInjectionContext but doesn't need expansion topic
func buildInjectionContextForSnapshot(sess *Session, store *Store) *think_deep.InjectionContext {
	injection := think_deep.NewInjectionContext()
	
	// Walk session chain and accumulate context
	current := sess
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
		parent, err := store.Load(*current.ParentID)
		if err != nil {
			break
		}
		current = parent
	}
	
	return injection
}

// serializeInjectionContext converts injection context to readable string
func serializeInjectionContext(injection *think_deep.InjectionContext) string {
	var sb strings.Builder
	
	if injection.ExpansionTopic != "" {
		sb.WriteString(fmt.Sprintf("Expansion topic: %s\n\n", injection.ExpansionTopic))
	}
	
	if injection.ExistingReport != "" {
		sb.WriteString("Existing report:\n")
		report := injection.ExistingReport
		if len(report) > 2000 {
			report = report[:2000] + "...[truncated]"
		}
		sb.WriteString(report)
		sb.WriteString("\n\n")
	}
	
	if len(injection.PreviousFindings) > 0 {
		sb.WriteString("Previous findings:\n")
		for _, finding := range injection.PreviousFindings {
			sb.WriteString(fmt.Sprintf("- %s\n", finding))
		}
		sb.WriteString("\n")
	}
	
	if len(injection.ValidatedFacts) > 0 {
		sb.WriteString("Validated facts:\n")
		for _, fact := range injection.ValidatedFacts {
			sb.WriteString(fmt.Sprintf("- %s\n", fact))
		}
		sb.WriteString("\n")
	}
	
	if len(injection.VisitedURLs) > 0 {
		sb.WriteString("Visited URLs:\n")
		limit := len(injection.VisitedURLs)
		if limit > 20 {
			limit = 20
		}
		for _, url := range injection.VisitedURLs[:limit] {
			sb.WriteString(fmt.Sprintf("- %s\n", url))
		}
		if len(injection.VisitedURLs) > 20 {
			sb.WriteString(fmt.Sprintf("... and %d more\n", len(injection.VisitedURLs)-20))
		}
		sb.WriteString("\n")
	}
	
	if len(injection.KnownGaps) > 0 {
		sb.WriteString("Known gaps:\n")
		for _, gap := range injection.KnownGaps {
			sb.WriteString(fmt.Sprintf("- %s\n", gap))
		}
		sb.WriteString("\n")
	}
	
	if len(injection.RelatedTopics) > 0 {
		sb.WriteString("Related topics:\n")
		for _, topic := range injection.RelatedTopics {
			sb.WriteString(fmt.Sprintf("- %s\n", topic))
		}
		sb.WriteString("\n")
	}
	
	return sb.String()
}

// estimateTokens provides a rough token count estimate (chars/4 approximation)
func estimateTokens(s string) int {
	if len(s) == 0 {
		return 0
	}
	return len(s) / 4
}
