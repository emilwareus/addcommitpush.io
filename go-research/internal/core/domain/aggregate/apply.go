package aggregate

import (
	"go-research/internal/core/domain/events"
)

// Apply updates state from an event (used for replay and live updates).
func (s *ResearchState) Apply(event interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.applyUnlocked(event)
}

// applyUnlocked applies an event without locking (called from Execute).
func (s *ResearchState) applyUnlocked(event interface{}) {
	switch e := event.(type) {
	case *events.ResearchStartedEvent:
		s.applyResearchStarted(e)
	case events.ResearchStartedEvent:
		s.applyResearchStarted(&e)

	case *events.PlanCreatedEvent:
		s.applyPlanCreated(e)
	case events.PlanCreatedEvent:
		s.applyPlanCreated(&e)

	case *events.WorkerStartedEvent:
		s.applyWorkerStarted(e)
	case events.WorkerStartedEvent:
		s.applyWorkerStarted(&e)

	case *events.WorkerCompletedEvent:
		s.applyWorkerCompleted(e)
	case events.WorkerCompletedEvent:
		s.applyWorkerCompleted(&e)

	case *events.WorkerFailedEvent:
		s.applyWorkerFailed(e)
	case events.WorkerFailedEvent:
		s.applyWorkerFailed(&e)

	case *events.AnalysisStartedEvent:
		s.applyAnalysisStarted(e)
	case events.AnalysisStartedEvent:
		s.applyAnalysisStarted(&e)

	case *events.AnalysisCompletedEvent:
		s.applyAnalysisCompleted(e)
	case events.AnalysisCompletedEvent:
		s.applyAnalysisCompleted(&e)

	case *events.SynthesisStartedEvent:
		s.applySynthesisStarted(e)
	case events.SynthesisStartedEvent:
		s.applySynthesisStarted(&e)

	case *events.ReportGeneratedEvent:
		s.applyReportGenerated(e)
	case events.ReportGeneratedEvent:
		s.applyReportGenerated(&e)

	case *events.ResearchCompletedEvent:
		s.applyResearchCompleted(e)
	case events.ResearchCompletedEvent:
		s.applyResearchCompleted(&e)

	case *events.ResearchFailedEvent:
		s.applyResearchFailed(e)
	case events.ResearchFailedEvent:
		s.applyResearchFailed(&e)

	case *events.ResearchCancelledEvent:
		s.applyResearchCancelled(e)
	case events.ResearchCancelledEvent:
		s.applyResearchCancelled(&e)

	case *events.SnapshotTakenEvent:
		s.Version = e.Version
	case events.SnapshotTakenEvent:
		s.Version = e.Version
	}

	s.uncommittedEvents = append(s.uncommittedEvents, event)
}

// Helper methods for applying each event type

func (s *ResearchState) applyResearchStarted(e *events.ResearchStartedEvent) {
	s.Query = e.Query
	s.Mode = e.Mode
	s.Config = e.Config
	s.Status = "planning"
	now := e.Timestamp
	s.StartedAt = &now
	s.Version = e.Version
}

func (s *ResearchState) applyPlanCreated(e *events.PlanCreatedEvent) {
	s.Plan = &PlanState{
		Topic:        e.Topic,
		Perspectives: e.Perspectives,
	}
	s.DAG = reconstructDAG(e.DAGStructure)
	s.initializeWorkers(e.Perspectives, e.DAGStructure)
	s.Status = "searching"
	s.Cost.Add(e.Cost)
	s.Version = e.Version
}

func (s *ResearchState) applyWorkerStarted(e *events.WorkerStartedEvent) {
	if w, ok := s.Workers[e.WorkerID]; ok {
		w.Status = "running"
		now := e.Timestamp
		w.StartedAt = &now
	} else {
		// Worker not yet initialized, create it
		s.Workers[e.WorkerID] = &WorkerState{
			ID:          e.WorkerID,
			WorkerNum:   e.WorkerNum,
			Objective:   e.Objective,
			Perspective: e.Perspective,
			Status:      "running",
			Facts:       []events.Fact{},
			Sources:     []events.Source{},
		}
		now := e.Timestamp
		s.Workers[e.WorkerID].StartedAt = &now
	}
	if s.DAG != nil {
		if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
			node.Status = "running"
		}
	}
	s.Version = e.Version
}

func (s *ResearchState) applyWorkerCompleted(e *events.WorkerCompletedEvent) {
	if w, ok := s.Workers[e.WorkerID]; ok {
		w.Status = "complete"
		w.Output = e.Output
		w.Facts = e.Facts
		w.Sources = e.Sources
		w.Cost = e.Cost
		now := e.Timestamp
		w.CompletedAt = &now
	}
	if s.DAG != nil {
		if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
			node.Status = "complete"
		}
	}
	s.Cost.Add(e.Cost)
	s.updateProgress()
	s.Version = e.Version
}

func (s *ResearchState) applyWorkerFailed(e *events.WorkerFailedEvent) {
	if w, ok := s.Workers[e.WorkerID]; ok {
		w.Status = "failed"
		w.Error = &e.Error
	}
	if s.DAG != nil {
		if node, ok := s.DAG.Nodes[e.WorkerID]; ok {
			node.Status = "failed"
			node.Error = &e.Error
		}
	}
	s.Version = e.Version
}

func (s *ResearchState) applyAnalysisStarted(e *events.AnalysisStartedEvent) {
	s.Status = "analyzing"
	s.Analysis = &AnalysisState{}
	s.Version = e.Version
}

func (s *ResearchState) applyAnalysisCompleted(e *events.AnalysisCompletedEvent) {
	if s.Analysis == nil {
		s.Analysis = &AnalysisState{}
	}
	s.Analysis.ValidatedFacts = e.ValidatedFacts
	s.Analysis.Contradictions = e.Contradictions
	s.Analysis.KnowledgeGaps = e.KnowledgeGaps
	s.Analysis.Cost = e.Cost
	s.Cost.Add(e.Cost)
	s.Status = "synthesizing"
	s.Version = e.Version
}

func (s *ResearchState) applySynthesisStarted(e *events.SynthesisStartedEvent) {
	s.Status = "synthesizing"
	s.Report = &ReportState{}
	s.Version = e.Version
}

func (s *ResearchState) applyReportGenerated(e *events.ReportGeneratedEvent) {
	if s.Report == nil {
		s.Report = &ReportState{}
	}
	s.Report.Title = e.Title
	s.Report.Summary = e.Summary
	s.Report.FullContent = e.FullContent
	s.Report.Citations = e.Citations
	s.Report.Cost = e.Cost
	s.Cost.Add(e.Cost)
	s.Version = e.Version
}

func (s *ResearchState) applyResearchCompleted(e *events.ResearchCompletedEvent) {
	s.Status = "complete"
	now := e.Timestamp
	s.CompletedAt = &now
	s.Version = e.Version
}

func (s *ResearchState) applyResearchFailed(e *events.ResearchFailedEvent) {
	s.Status = "failed"
	now := e.Timestamp
	s.CompletedAt = &now
	s.Version = e.Version
}

func (s *ResearchState) applyResearchCancelled(e *events.ResearchCancelledEvent) {
	s.Status = "cancelled"
	now := e.Timestamp
	s.CompletedAt = &now
	s.Version = e.Version
}
