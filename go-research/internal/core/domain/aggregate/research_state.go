// Package aggregate contains the aggregate roots for the domain.
// ResearchState is the aggregate root for research sessions.
package aggregate

import (
	"fmt"
	"sync"
	"time"

	"go-research/internal/core/domain/events"
)

// ResearchState is the aggregate root for research sessions.
// All state changes happen through Execute() which validates commands and emits events.
type ResearchState struct {
	mu sync.RWMutex

	// Identity
	ID        string
	Version   int
	CreatedAt time.Time

	// Research configuration
	Query  string
	Mode   string // "fast" or "storm"
	Config events.ResearchConfig

	// Current status
	Status   string  // "pending", "planning", "searching", "analyzing", "synthesizing", "complete", "failed", "cancelled"
	Progress float64 // Overall progress 0.0-1.0

	// Planning state
	Plan *PlanState

	// Execution state
	DAG     *DAGState
	Workers map[string]*WorkerState

	// Analysis state
	Analysis *AnalysisState

	// Synthesis state
	Report *ReportState

	// Cost tracking
	Cost events.CostBreakdown

	// Timing
	StartedAt   *time.Time
	CompletedAt *time.Time

	// Event tracking
	uncommittedEvents []interface{}
}

// PlanState holds the research plan.
type PlanState struct {
	Topic        string
	Perspectives []events.Perspective
}

// DAGState holds the execution DAG.
type DAGState struct {
	Nodes map[string]*DAGNode
}

// DAGNode represents a task in the execution graph.
type DAGNode struct {
	ID           string
	TaskType     string
	Description  string
	Dependencies []string
	Status       string // "pending", "running", "complete", "failed"
	Result       interface{}
	Error        *string
}

// WorkerState tracks a worker's execution.
type WorkerState struct {
	ID          string
	WorkerNum   int
	Objective   string
	Perspective string
	Status      string
	Output      string
	Facts       []events.Fact
	Sources     []events.Source
	Cost        events.CostBreakdown
	StartedAt   *time.Time
	CompletedAt *time.Time
	Error       *string
}

// AnalysisState holds analysis results.
type AnalysisState struct {
	ValidatedFacts []events.ValidatedFact
	Contradictions []events.Contradiction
	KnowledgeGaps  []events.KnowledgeGap
	Cost           events.CostBreakdown
}

// ReportState holds the final report.
type ReportState struct {
	Title       string
	Summary     string
	FullContent string
	Citations   []events.Citation
	Cost        events.CostBreakdown
}

// NewResearchState creates a new empty state.
func NewResearchState(id string) *ResearchState {
	return &ResearchState{
		ID:        id,
		Version:   0,
		CreatedAt: time.Now(),
		Status:    "pending",
		Workers:   make(map[string]*WorkerState),
		Cost:      events.CostBreakdown{},
	}
}

// LoadFromEvents reconstructs state by replaying events.
func LoadFromEvents(id string, eventStream []interface{}) (*ResearchState, error) {
	state := NewResearchState(id)

	for _, event := range eventStream {
		state.Apply(event)
	}

	// Clear uncommitted since we're loading from store
	state.uncommittedEvents = nil

	return state, nil
}

// GetUncommittedEvents returns events not yet persisted.
func (s *ResearchState) GetUncommittedEvents() []interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]interface{}{}, s.uncommittedEvents...)
}

// ClearUncommittedEvents marks events as persisted.
func (s *ResearchState) ClearUncommittedEvents() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.uncommittedEvents = nil
}

// GetVersion returns the current aggregate version.
func (s *ResearchState) GetVersion() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Version
}

// GetStatus returns the current status.
func (s *ResearchState) GetStatus() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Status
}

// countSources counts total sources across all workers.
func (s *ResearchState) countSources() int {
	count := 0
	for _, w := range s.Workers {
		count += len(w.Sources)
	}
	return count
}

// updateProgress calculates overall progress from DAG state.
func (s *ResearchState) updateProgress() {
	if s.DAG == nil {
		return
	}
	total := len(s.DAG.Nodes)
	completed := 0
	for _, node := range s.DAG.Nodes {
		if node.Status == "complete" {
			completed++
		}
	}
	if total > 0 {
		s.Progress = float64(completed) / float64(total)
	}
}

// reconstructDAG builds DAGState from a snapshot.
func reconstructDAG(snapshot events.DAGSnapshot) *DAGState {
	dag := &DAGState{
		Nodes: make(map[string]*DAGNode),
	}
	for _, n := range snapshot.Nodes {
		dag.Nodes[n.ID] = &DAGNode{
			ID:           n.ID,
			TaskType:     n.TaskType,
			Description:  n.Description,
			Dependencies: n.Dependencies,
			Status:       n.Status,
		}
	}
	return dag
}

// initializeWorkers creates worker states from perspectives.
func (s *ResearchState) initializeWorkers(perspectives []events.Perspective, dag events.DAGSnapshot) {
	for i, p := range perspectives {
		workerID := fmt.Sprintf("search_%d", i)
		s.Workers[workerID] = &WorkerState{
			ID:          workerID,
			WorkerNum:   i + 1,
			Objective:   p.Focus,
			Perspective: p.Name,
			Status:      "pending",
			Facts:       []events.Fact{},
			Sources:     []events.Source{},
		}
	}
}
