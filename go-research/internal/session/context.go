package session

import (
	"fmt"
	"strings"
)

// BuildContinuationContext creates context for follow-up research
func BuildContinuationContext(sess *Session) string {
	var ctx strings.Builder

	ctx.WriteString(fmt.Sprintf("Previous query: %s\n\n", sess.Query))

	if sess.Report != "" {
		ctx.WriteString("Previous findings:\n")
		// Truncate report if too long
		report := sess.Report
		if len(report) > 2000 {
			report = report[:2000] + "...[truncated]"
		}
		ctx.WriteString(report)
		ctx.WriteString("\n\n")
	}

	if len(sess.Insights) > 0 {
		ctx.WriteString("Key insights:\n")
		for _, insight := range sess.Insights {
			ctx.WriteString(fmt.Sprintf("- %s: %s\n", insight.Title, insight.Finding))
		}
		ctx.WriteString("\n")
	}

	if len(sess.Sources) > 0 {
		ctx.WriteString("Sources consulted:\n")
		limit := len(sess.Sources)
		if limit > 10 {
			limit = 10
		}
		for _, src := range sess.Sources[:limit] {
			ctx.WriteString(fmt.Sprintf("- %s\n", src))
		}
	}

	return ctx.String()
}

// BuildWorkerContext creates context from a specific worker's output
func BuildWorkerContext(worker WorkerContext) string {
	var ctx strings.Builder

	ctx.WriteString(fmt.Sprintf("Worker objective: %s\n\n", worker.Objective))

	if worker.FinalOutput != "" {
		ctx.WriteString("Worker output:\n")
		output := worker.FinalOutput
		if len(output) > 1500 {
			output = output[:1500] + "...[truncated]"
		}
		ctx.WriteString(output)
		ctx.WriteString("\n\n")
	}

	if len(worker.Sources) > 0 {
		ctx.WriteString("Sources found:\n")
		limit := len(worker.Sources)
		if limit > 5 {
			limit = 5
		}
		for _, src := range worker.Sources[:limit] {
			ctx.WriteString(fmt.Sprintf("- %s\n", src))
		}
	}

	return ctx.String()
}

// BuildSynthesisContext creates context for synthesizing multiple worker outputs
func BuildSynthesisContext(workers []WorkerContext) string {
	var ctx strings.Builder

	for i, w := range workers {
		ctx.WriteString(fmt.Sprintf("### Worker %d: %s\n\n", i+1, w.Objective))
		output := w.FinalOutput
		if len(output) > 1000 {
			output = output[:1000] + "...[truncated]"
		}
		ctx.WriteString(output)
		ctx.WriteString("\n\n")
	}

	return ctx.String()
}
