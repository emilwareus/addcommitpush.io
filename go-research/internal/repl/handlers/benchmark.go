// Package handlers provides REPL command handlers.
package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go-research/internal/architectures"
	"go-research/internal/architectures/storm"
	"go-research/internal/repl"
)

// BenchmarkHandler handles /benchmark command to compare architectures.
type BenchmarkHandler struct{}

// Execute runs a benchmark across multiple architectures.
func (h *BenchmarkHandler) Execute(ctx *repl.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /benchmark <query> [architectures...]")
	}

	// Parse query and optional architecture list
	query := strings.Join(args, " ")
	archNames := []string{"storm"} // Default to storm only

	// Check if specific architectures were requested
	// Format: /benchmark "query" arch1 arch2
	// For now, just benchmark storm since it's the only one

	ctx.Renderer.Info(fmt.Sprintf("Benchmarking query: %s", query))
	ctx.Renderer.Info(fmt.Sprintf("Architectures: %v", archNames))
	ctx.Renderer.Info("")

	results := make(map[string]*architectures.Result)

	for _, name := range archNames {
		ctx.Renderer.Info(fmt.Sprintf("Running %s architecture...", name))

		arch := h.getArchitecture(name, ctx)
		if arch == nil {
			ctx.Renderer.Error(fmt.Errorf("unknown architecture: %s", name))
			continue
		}

		sessionID := fmt.Sprintf("benchmark_%s_%d", name, time.Now().Unix())

		runCtx, cancel := context.WithTimeout(ctx.RunContext, 30*time.Minute)
		result, err := arch.Research(runCtx, sessionID, query)
		cancel()

		if err != nil {
			ctx.Renderer.Error(fmt.Errorf("%s failed: %w", name, err))
			results[name] = &architectures.Result{
				SessionID: sessionID,
				Status:    "failed",
				Error:     err.Error(),
			}
			continue
		}

		results[name] = result
		ctx.Renderer.Info(fmt.Sprintf("  %s completed in %v (cost: $%.4f, facts: %d, sources: %d)",
			name,
			result.Metrics.Duration.Round(time.Second),
			result.Metrics.Cost.TotalCost,
			result.Metrics.FactCount,
			result.Metrics.SourceCount,
		))
	}

	// Show comparison
	ctx.Renderer.Info("")
	ctx.Renderer.Info("=== Benchmark Results ===")
	ctx.Renderer.Info("")

	h.printComparison(ctx, results)

	return nil
}

// getArchitecture returns an architecture by name.
func (h *BenchmarkHandler) getArchitecture(name string, ctx *repl.Context) architectures.Architecture {
	switch name {
	case "storm":
		return storm.New(storm.Config{
			AppConfig: ctx.Config,
			Bus:       ctx.Bus,
		})
	default:
		// Try registry
		arch, err := architectures.Get(name)
		if err != nil {
			return nil
		}
		return arch
	}
}

// printComparison outputs a comparison table of results.
func (h *BenchmarkHandler) printComparison(ctx *repl.Context, results map[string]*architectures.Result) {
	ctx.Renderer.Info("Architecture | Duration | Cost | Facts | Sources | Status")
	ctx.Renderer.Info("-------------|----------|------|-------|---------|-------")

	for name, result := range results {
		ctx.Renderer.Info(fmt.Sprintf("%-12s | %8s | $%.2f | %5d | %7d | %s",
			name,
			result.Metrics.Duration.Round(time.Second),
			result.Metrics.Cost.TotalCost,
			result.Metrics.FactCount,
			result.Metrics.SourceCount,
			result.Status,
		))
	}

	// Find best performers
	if len(results) > 1 {
		ctx.Renderer.Info("")
		ctx.Renderer.Info("Winners:")

		var fastest, cheapest, mostFacts string
		var fastestDur time.Duration = time.Hour * 24
		var cheapestCost float64 = 1000000
		var maxFacts int

		for name, result := range results {
			if result.Status != "complete" {
				continue
			}
			if result.Metrics.Duration < fastestDur {
				fastestDur = result.Metrics.Duration
				fastest = name
			}
			if result.Metrics.Cost.TotalCost < cheapestCost {
				cheapestCost = result.Metrics.Cost.TotalCost
				cheapest = name
			}
			if result.Metrics.FactCount > maxFacts {
				maxFacts = result.Metrics.FactCount
				mostFacts = name
			}
		}

		if fastest != "" {
			ctx.Renderer.Info(fmt.Sprintf("  Fastest: %s (%v)", fastest, fastestDur.Round(time.Second)))
		}
		if cheapest != "" {
			ctx.Renderer.Info(fmt.Sprintf("  Cheapest: %s ($%.4f)", cheapest, cheapestCost))
		}
		if mostFacts != "" {
			ctx.Renderer.Info(fmt.Sprintf("  Most facts: %s (%d)", mostFacts, maxFacts))
		}
	}
}
