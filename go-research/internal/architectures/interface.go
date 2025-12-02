// Package architectures defines the common interface for research architectures.
// Each architecture implements a different approach to multi-agent research,
// while sharing common sub-agents and utilities.
package architectures

import (
	"context"
	"time"

	"go-research/internal/agents"
	"go-research/internal/session"
)

// Architecture defines the interface that all research architectures must implement.
// This enables swapping between different multi-agent research strategies
// (STORM, Reflexion, Tree-of-Thoughts, etc.) while sharing common components.
type Architecture interface {
	// Name returns the architecture identifier (e.g., "storm", "reflexion", "simple")
	Name() string

	// Description returns a human-readable description of the architecture
	Description() string

	// Research executes research for the given query and returns results
	Research(ctx context.Context, sessionID string, query string) (*Result, error)

	// Resume continues an interrupted research session
	Resume(ctx context.Context, sessionID string) (*Result, error)

	// SupportsResume indicates whether this architecture supports resuming
	SupportsResume() bool
}

// Result represents the output of a research session, standardized across architectures.
type Result struct {
	// Core output
	SessionID   string
	Query       string
	Report      string
	Summary     string

	// Collected data
	Facts       []agents.Fact
	Sources     []string
	Workers     []WorkerResult

	// Metrics for benchmarking
	Metrics     Metrics

	// Status
	Status      string // "complete", "failed", "cancelled"
	Error       string
}

// WorkerResult represents output from a single research worker/perspective
type WorkerResult struct {
	ID          string
	Perspective string
	Objective   string
	Output      string
	Facts       []agents.Fact
	Sources     []string
	Status      string
	Cost        session.CostBreakdown
	Duration    time.Duration
}

// Metrics captures performance data for benchmarking architectures
type Metrics struct {
	// Timing
	Duration        time.Duration
	PlanningTime    time.Duration
	SearchTime      time.Duration
	AnalysisTime    time.Duration
	SynthesisTime   time.Duration

	// Token usage
	Cost            session.CostBreakdown

	// Quality indicators
	FactCount       int
	SourceCount     int
	WorkerCount     int

	// Architecture-specific
	Iterations      int  // For iterative architectures
	ReflectionCount int  // For Reflexion-style
	BranchCount     int  // For Tree-of-Thoughts
}

// BenchmarkResult compares results across multiple architectures
type BenchmarkResult struct {
	Query        string
	Results      map[string]*Result // architecture name -> result
	Comparison   Comparison
	RunAt        time.Time
}

// Comparison provides relative metrics between architectures
type Comparison struct {
	FastestArchitecture   string
	CheapestArchitecture  string
	MostFactsArchitecture string
	Rankings              map[string]int // architecture -> overall rank
}
