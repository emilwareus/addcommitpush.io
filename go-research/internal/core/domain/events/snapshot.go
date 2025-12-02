package events

// SnapshotTakenEvent is emitted when a state snapshot is taken for replay optimization.
type SnapshotTakenEvent struct {
	BaseEvent
	Snapshot ResearchStateSnapshot `json:"snapshot"`
}

// ResearchStateSnapshot captures the complete state at a point in time.
type ResearchStateSnapshot struct {
	Query          string                    `json:"query"`
	Mode           string                    `json:"mode"`
	Status         string                    `json:"status"`
	DAG            DAGSnapshot               `json:"dag"`
	Workers        map[string]WorkerSnapshot `json:"workers"`
	AnalysisResult *AnalysisSnapshot         `json:"analysis_result,omitempty"`
	Report         *ReportSnapshot           `json:"report,omitempty"`
	Cost           CostBreakdown             `json:"cost"`
}

// WorkerSnapshot captures a worker's state.
type WorkerSnapshot struct {
	ID          string        `json:"id"`
	WorkerNum   int           `json:"worker_num"`
	Objective   string        `json:"objective"`
	Perspective string        `json:"perspective"`
	Status      string        `json:"status"`
	Output      string        `json:"output"`
	Facts       []Fact        `json:"facts"`
	Sources     []Source      `json:"sources"`
	Cost        CostBreakdown `json:"cost"`
}

// AnalysisSnapshot captures the analysis state.
type AnalysisSnapshot struct {
	ValidatedFacts []ValidatedFact `json:"validated_facts"`
	Contradictions []Contradiction `json:"contradictions"`
	KnowledgeGaps  []KnowledgeGap  `json:"knowledge_gaps"`
}

// ReportSnapshot captures the report state.
type ReportSnapshot struct {
	Title       string     `json:"title"`
	Summary     string     `json:"summary"`
	FullContent string     `json:"full_content"`
	Citations   []Citation `json:"citations"`
}
