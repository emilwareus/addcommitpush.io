package aggregate

import (
	"fmt"
	"time"

	"go-research/internal/core/domain/events"
)

// Command represents an intent to change state.
// Commands are validated before being executed.
type Command interface {
	Validate(state *ResearchState) error
}

// StartResearchCommand initiates a research session.
type StartResearchCommand struct {
	Query  string
	Mode   string
	Config events.ResearchConfig
}

// Validate checks if the research can be started.
func (c StartResearchCommand) Validate(s *ResearchState) error {
	if s.Status != "pending" {
		return fmt.Errorf("research already started")
	}
	if c.Query == "" {
		return fmt.Errorf("query cannot be empty")
	}
	return nil
}

// SetPlanCommand sets the research plan.
type SetPlanCommand struct {
	Topic        string
	Perspectives []events.Perspective
	DAGStructure events.DAGSnapshot
	Cost         events.CostBreakdown
}

// Validate checks if the plan can be set.
func (c SetPlanCommand) Validate(s *ResearchState) error {
	if s.Status != "planning" && s.Status != "pending" {
		return fmt.Errorf("cannot set plan in status: %s", s.Status)
	}
	return nil
}

// StartWorkerCommand marks a worker as started.
type StartWorkerCommand struct {
	WorkerID    string
	WorkerNum   int
	Objective   string
	Perspective string
}

// Validate checks if the worker can be started.
func (c StartWorkerCommand) Validate(s *ResearchState) error {
	if s.Status != "searching" {
		return fmt.Errorf("cannot start worker in status: %s", s.Status)
	}
	return nil
}

// CompleteWorkerCommand marks a worker as completed.
type CompleteWorkerCommand struct {
	WorkerID string
	Output   string
	Facts    []events.Fact
	Sources  []events.Source
	Cost     events.CostBreakdown
}

// Validate checks if the worker can be completed.
func (c CompleteWorkerCommand) Validate(s *ResearchState) error {
	worker, ok := s.Workers[c.WorkerID]
	if !ok {
		return fmt.Errorf("worker not found: %s", c.WorkerID)
	}
	if worker.Status != "running" {
		return fmt.Errorf("worker not running: %s", c.WorkerID)
	}
	return nil
}

// FailWorkerCommand marks a worker as failed.
type FailWorkerCommand struct {
	WorkerID string
	Error    string
}

// Validate checks if the worker can be failed.
func (c FailWorkerCommand) Validate(s *ResearchState) error {
	_, ok := s.Workers[c.WorkerID]
	if !ok {
		return fmt.Errorf("worker not found: %s", c.WorkerID)
	}
	return nil
}

// StartAnalysisCommand starts the analysis phase.
type StartAnalysisCommand struct {
	TotalFacts int
}

// Validate checks if analysis can be started.
func (c StartAnalysisCommand) Validate(s *ResearchState) error {
	if s.Status != "searching" {
		return fmt.Errorf("cannot start analysis in status: %s", s.Status)
	}
	return nil
}

// SetAnalysisCommand sets analysis results.
type SetAnalysisCommand struct {
	ValidatedFacts []events.ValidatedFact
	Contradictions []events.Contradiction
	KnowledgeGaps  []events.KnowledgeGap
	Cost           events.CostBreakdown
}

// Validate checks if analysis results can be set.
func (c SetAnalysisCommand) Validate(s *ResearchState) error {
	if s.Status != "analyzing" {
		return fmt.Errorf("cannot set analysis in status: %s", s.Status)
	}
	return nil
}

// StartSynthesisCommand starts the synthesis phase.
type StartSynthesisCommand struct{}

// Validate checks if synthesis can be started.
func (c StartSynthesisCommand) Validate(s *ResearchState) error {
	if s.Status != "analyzing" && s.Status != "synthesizing" {
		return fmt.Errorf("cannot start synthesis in status: %s", s.Status)
	}
	return nil
}

// SetReportCommand sets the final report.
type SetReportCommand struct {
	Title       string
	Summary     string
	FullContent string
	Citations   []events.Citation
	Cost        events.CostBreakdown
}

// Validate checks if the report can be set.
func (c SetReportCommand) Validate(s *ResearchState) error {
	if s.Status != "synthesizing" {
		return fmt.Errorf("cannot set report in status: %s", s.Status)
	}
	return nil
}

// CompleteResearchCommand marks research as complete.
type CompleteResearchCommand struct {
	Duration time.Duration
}

// Validate checks if research can be completed.
func (c CompleteResearchCommand) Validate(s *ResearchState) error {
	if s.Status == "complete" || s.Status == "failed" || s.Status == "cancelled" {
		return fmt.Errorf("research already in terminal state: %s", s.Status)
	}
	return nil
}

// FailResearchCommand marks research as failed.
type FailResearchCommand struct {
	Error       string
	FailedPhase string
}

// Validate checks if research can be failed.
func (c FailResearchCommand) Validate(s *ResearchState) error {
	if s.Status == "complete" || s.Status == "failed" || s.Status == "cancelled" {
		return fmt.Errorf("research already in terminal state: %s", s.Status)
	}
	return nil
}

// CancelResearchCommand cancels research.
type CancelResearchCommand struct {
	Reason string
}

// Validate checks if research can be cancelled.
func (c CancelResearchCommand) Validate(s *ResearchState) error {
	if s.Status == "complete" || s.Status == "failed" || s.Status == "cancelled" {
		return fmt.Errorf("research already in terminal state: %s", s.Status)
	}
	return nil
}
