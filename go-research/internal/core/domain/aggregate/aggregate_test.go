package aggregate

import (
	"testing"
	"time"

	"go-research/internal/core/domain/events"
)

// ============================================================================
// Command Validation Tests
// ============================================================================

func TestStartResearchCommand_Validate(t *testing.T) {
	tests := []struct {
		name      string
		state     *ResearchState
		cmd       StartResearchCommand
		wantError bool
	}{
		{
			name:      "valid command on pending state",
			state:     NewResearchState("test-1"),
			cmd:       StartResearchCommand{Query: "test query", Mode: "deep"},
			wantError: false,
		},
		{
			name: "already started research",
			state: func() *ResearchState {
				s := NewResearchState("test-2")
				s.Status = "searching"
				return s
			}(),
			cmd:       StartResearchCommand{Query: "test query", Mode: "deep"},
			wantError: true,
		},
		{
			name:      "empty query",
			state:     NewResearchState("test-3"),
			cmd:       StartResearchCommand{Query: "", Mode: "deep"},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cmd.Validate(tt.state)
			if (err != nil) != tt.wantError {
				t.Errorf("Validate() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

func TestSetPlanCommand_Validate(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		wantError bool
	}{
		{"pending status", "pending", false},
		{"planning status", "planning", false},
		{"searching status", "searching", true},
		{"complete status", "complete", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := NewResearchState("test")
			state.Status = tt.status
			cmd := SetPlanCommand{Topic: "test"}
			err := cmd.Validate(state)
			if (err != nil) != tt.wantError {
				t.Errorf("Validate() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

func TestStartWorkerCommand_Validate(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		wantError bool
	}{
		{"searching status", "searching", false},
		{"pending status", "pending", true},
		{"analyzing status", "analyzing", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := NewResearchState("test")
			state.Status = tt.status
			cmd := StartWorkerCommand{WorkerID: "w1", WorkerNum: 1}
			err := cmd.Validate(state)
			if (err != nil) != tt.wantError {
				t.Errorf("Validate() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

func TestCompleteWorkerCommand_Validate(t *testing.T) {
	state := NewResearchState("test")
	state.Status = "searching"
	state.Workers["w1"] = &WorkerState{ID: "w1", Status: "running"}
	state.Workers["w2"] = &WorkerState{ID: "w2", Status: "pending"}

	tests := []struct {
		name      string
		workerID  string
		wantError bool
	}{
		{"running worker", "w1", false},
		{"pending worker", "w2", true},
		{"non-existent worker", "w3", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := CompleteWorkerCommand{WorkerID: tt.workerID}
			err := cmd.Validate(state)
			if (err != nil) != tt.wantError {
				t.Errorf("Validate() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

func TestCompleteResearchCommand_Validate(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		wantError bool
	}{
		{"synthesizing status", "synthesizing", false},
		{"searching status", "searching", false},
		{"complete status", "complete", true},
		{"failed status", "failed", true},
		{"cancelled status", "cancelled", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := NewResearchState("test")
			state.Status = tt.status
			cmd := CompleteResearchCommand{Duration: time.Minute}
			err := cmd.Validate(state)
			if (err != nil) != tt.wantError {
				t.Errorf("Validate() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

// ============================================================================
// Event Application Tests
// ============================================================================

func TestApply_ResearchStartedEvent(t *testing.T) {
	state := NewResearchState("test-1")
	now := time.Now()

	event := events.ResearchStartedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-1",
			AggregateID: "test-1",
			Version:     1,
			Timestamp:   now,
			Type:        "research.started",
		},
		Query: "test query",
		Mode:  "deep",
		Config: events.ResearchConfig{
			MaxWorkers: 5,
		},
	}

	state.Apply(event)

	if state.Query != "test query" {
		t.Errorf("Query = %s, want test query", state.Query)
	}
	if state.Mode != "deep" {
		t.Errorf("Mode = %s, want deep", state.Mode)
	}
	if state.Status != "planning" {
		t.Errorf("Status = %s, want planning", state.Status)
	}
	if state.Version != 1 {
		t.Errorf("Version = %d, want 1", state.Version)
	}
	if state.StartedAt == nil {
		t.Error("StartedAt should be set")
	}
}

func TestApply_PlanCreatedEvent(t *testing.T) {
	state := NewResearchState("test-1")
	state.Status = "planning"

	event := events.PlanCreatedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-2",
			AggregateID: "test-1",
			Version:     2,
			Timestamp:   time.Now(),
			Type:        "plan.created",
		},
		Topic: "Test Topic",
		Perspectives: []events.Perspective{
			{Name: "Expert 1", Focus: "Area 1", Questions: []string{"Q1", "Q2"}},
			{Name: "Expert 2", Focus: "Area 2", Questions: []string{"Q3"}},
		},
		DAGStructure: events.DAGSnapshot{
			Nodes: []events.DAGNodeSnapshot{
				{ID: "search_0", TaskType: "search", Status: "pending"},
				{ID: "search_1", TaskType: "search", Status: "pending"},
			},
		},
		Cost: events.CostBreakdown{TotalTokens: 100, TotalCostUSD: 0.01},
	}

	state.Apply(event)

	if state.Status != "searching" {
		t.Errorf("Status = %s, want searching", state.Status)
	}
	if state.Plan == nil {
		t.Fatal("Plan should be set")
	}
	if state.Plan.Topic != "Test Topic" {
		t.Errorf("Plan.Topic = %s, want Test Topic", state.Plan.Topic)
	}
	if len(state.Plan.Perspectives) != 2 {
		t.Errorf("len(Perspectives) = %d, want 2", len(state.Plan.Perspectives))
	}
	if len(state.Workers) != 2 {
		t.Errorf("len(Workers) = %d, want 2", len(state.Workers))
	}
	if state.DAG == nil || len(state.DAG.Nodes) != 2 {
		t.Error("DAG should have 2 nodes")
	}
	if state.Cost.TotalTokens != 100 {
		t.Errorf("Cost.TotalTokens = %d, want 100", state.Cost.TotalTokens)
	}
}

func TestApply_WorkerLifecycle(t *testing.T) {
	state := NewResearchState("test-1")
	state.Status = "searching"
	state.DAG = &DAGState{Nodes: make(map[string]*DAGNode)}
	state.DAG.Nodes["w1"] = &DAGNode{ID: "w1", Status: "pending"}
	state.Workers["w1"] = &WorkerState{ID: "w1", Status: "pending"}

	// Start worker
	startEvent := events.WorkerStartedEvent{
		BaseEvent: events.BaseEvent{
			ID: "evt-1", AggregateID: "test-1", Version: 1, Timestamp: time.Now(), Type: "worker.started",
		},
		WorkerID:  "w1",
		WorkerNum: 1,
		Objective: "Test objective",
	}
	state.Apply(startEvent)

	if state.Workers["w1"].Status != "running" {
		t.Errorf("Worker status = %s, want running", state.Workers["w1"].Status)
	}
	if state.DAG.Nodes["w1"].Status != "running" {
		t.Errorf("DAG node status = %s, want running", state.DAG.Nodes["w1"].Status)
	}

	// Complete worker
	completeEvent := events.WorkerCompletedEvent{
		BaseEvent: events.BaseEvent{
			ID: "evt-2", AggregateID: "test-1", Version: 2, Timestamp: time.Now(), Type: "worker.completed",
		},
		WorkerID: "w1",
		Output:   "Test output",
		Facts:    []events.Fact{{Content: "Fact 1", Confidence: 0.9}},
		Sources:  []events.Source{{URL: "https://example.com"}},
		Cost:     events.CostBreakdown{TotalTokens: 50},
	}
	state.Apply(completeEvent)

	if state.Workers["w1"].Status != "complete" {
		t.Errorf("Worker status = %s, want complete", state.Workers["w1"].Status)
	}
	if len(state.Workers["w1"].Facts) != 1 {
		t.Errorf("len(Facts) = %d, want 1", len(state.Workers["w1"].Facts))
	}
	if state.Cost.TotalTokens != 50 {
		t.Errorf("Cost.TotalTokens = %d, want 50", state.Cost.TotalTokens)
	}
}

func TestApply_WorkerFailedEvent(t *testing.T) {
	state := NewResearchState("test-1")
	state.Status = "searching"
	state.DAG = &DAGState{Nodes: make(map[string]*DAGNode)}
	state.DAG.Nodes["w1"] = &DAGNode{ID: "w1", Status: "running"}
	state.Workers["w1"] = &WorkerState{ID: "w1", Status: "running"}

	event := events.WorkerFailedEvent{
		BaseEvent: events.BaseEvent{
			ID: "evt-1", AggregateID: "test-1", Version: 1, Timestamp: time.Now(), Type: "worker.failed",
		},
		WorkerID: "w1",
		Error:    "Test error",
	}
	state.Apply(event)

	if state.Workers["w1"].Status != "failed" {
		t.Errorf("Worker status = %s, want failed", state.Workers["w1"].Status)
	}
	if state.Workers["w1"].Error == nil || *state.Workers["w1"].Error != "Test error" {
		t.Error("Worker error should be set")
	}
}

func TestApply_AnalysisCompletedEvent(t *testing.T) {
	state := NewResearchState("test-1")
	state.Status = "analyzing"

	event := events.AnalysisCompletedEvent{
		BaseEvent: events.BaseEvent{
			ID: "evt-1", AggregateID: "test-1", Version: 1, Timestamp: time.Now(), Type: "analysis.completed",
		},
		ValidatedFacts: []events.ValidatedFact{
			{Content: "Fact 1", Confidence: 0.95, CorroboratedBy: []string{"source1", "source2"}},
		},
		Contradictions: []events.Contradiction{
			{Fact1: "A", Fact2: "B", Description: "They conflict"},
		},
		KnowledgeGaps: []events.KnowledgeGap{
			{Description: "Missing info", Importance: 0.8},
		},
		Cost: events.CostBreakdown{TotalTokens: 200},
	}
	state.Apply(event)

	if state.Status != "synthesizing" {
		t.Errorf("Status = %s, want synthesizing", state.Status)
	}
	if state.Analysis == nil {
		t.Fatal("Analysis should be set")
	}
	if len(state.Analysis.ValidatedFacts) != 1 {
		t.Errorf("len(ValidatedFacts) = %d, want 1", len(state.Analysis.ValidatedFacts))
	}
	if len(state.Analysis.Contradictions) != 1 {
		t.Errorf("len(Contradictions) = %d, want 1", len(state.Analysis.Contradictions))
	}
}

func TestApply_ResearchCompletedEvent(t *testing.T) {
	state := NewResearchState("test-1")
	state.Status = "synthesizing"

	event := events.ResearchCompletedEvent{
		BaseEvent: events.BaseEvent{
			ID: "evt-1", AggregateID: "test-1", Version: 1, Timestamp: time.Now(), Type: "research.completed",
		},
		Duration:    5 * time.Minute,
		SourceCount: 10,
	}
	state.Apply(event)

	if state.Status != "complete" {
		t.Errorf("Status = %s, want complete", state.Status)
	}
	if state.CompletedAt == nil {
		t.Error("CompletedAt should be set")
	}
}

// ============================================================================
// State Reconstruction Tests
// ============================================================================

func TestLoadFromEvents_EmptyStream(t *testing.T) {
	state, err := LoadFromEvents("test-1", nil)
	if err != nil {
		t.Fatalf("LoadFromEvents() error = %v", err)
	}
	if state.ID != "test-1" {
		t.Errorf("ID = %s, want test-1", state.ID)
	}
	if state.Status != "pending" {
		t.Errorf("Status = %s, want pending", state.Status)
	}
}

func TestLoadFromEvents_FullResearchFlow(t *testing.T) {
	now := time.Now()
	eventStream := []interface{}{
		events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{ID: "e1", AggregateID: "test-1", Version: 1, Timestamp: now, Type: "research.started"},
			Query:     "test query",
			Mode:      "deep",
		},
		events.PlanCreatedEvent{
			BaseEvent:    events.BaseEvent{ID: "e2", AggregateID: "test-1", Version: 2, Timestamp: now, Type: "plan.created"},
			Topic:        "Test Topic",
			Perspectives: []events.Perspective{{Name: "Expert", Focus: "Area"}},
			DAGStructure: events.DAGSnapshot{Nodes: []events.DAGNodeSnapshot{{ID: "search_0", TaskType: "search", Status: "pending"}}},
			Cost:         events.CostBreakdown{TotalTokens: 100},
		},
		events.WorkerStartedEvent{
			BaseEvent: events.BaseEvent{ID: "e3", AggregateID: "test-1", Version: 3, Timestamp: now, Type: "worker.started"},
			WorkerID:  "search_0",
			WorkerNum: 1,
		},
		events.WorkerCompletedEvent{
			BaseEvent: events.BaseEvent{ID: "e4", AggregateID: "test-1", Version: 4, Timestamp: now, Type: "worker.completed"},
			WorkerID:  "search_0",
			Output:    "Result",
			Facts:     []events.Fact{{Content: "Fact", Confidence: 0.9}},
			Cost:      events.CostBreakdown{TotalTokens: 200},
		},
		events.AnalysisCompletedEvent{
			BaseEvent:      events.BaseEvent{ID: "e5", AggregateID: "test-1", Version: 5, Timestamp: now, Type: "analysis.completed"},
			ValidatedFacts: []events.ValidatedFact{{Content: "Fact", Confidence: 0.95}},
			Cost:           events.CostBreakdown{TotalTokens: 150},
		},
		events.ReportGeneratedEvent{
			BaseEvent:   events.BaseEvent{ID: "e6", AggregateID: "test-1", Version: 6, Timestamp: now, Type: "report.generated"},
			Title:       "Test Report",
			FullContent: "Full content here",
			Cost:        events.CostBreakdown{TotalTokens: 300},
		},
		events.ResearchCompletedEvent{
			BaseEvent:   events.BaseEvent{ID: "e7", AggregateID: "test-1", Version: 7, Timestamp: now, Type: "research.completed"},
			Duration:    5 * time.Minute,
			SourceCount: 3,
		},
	}

	state, err := LoadFromEvents("test-1", eventStream)
	if err != nil {
		t.Fatalf("LoadFromEvents() error = %v", err)
	}

	// Verify final state
	if state.Query != "test query" {
		t.Errorf("Query = %s, want test query", state.Query)
	}
	if state.Status != "complete" {
		t.Errorf("Status = %s, want complete", state.Status)
	}
	if state.Version != 7 {
		t.Errorf("Version = %d, want 7", state.Version)
	}
	if state.Plan == nil || state.Plan.Topic != "Test Topic" {
		t.Error("Plan should be reconstructed")
	}
	if state.Report == nil || state.Report.Title != "Test Report" {
		t.Error("Report should be reconstructed")
	}
	// 100 (plan) + 200 (worker) + 150 (analysis) + 300 (report) = 750
	if state.Cost.TotalTokens != 750 {
		t.Errorf("Cost.TotalTokens = %d, want 750", state.Cost.TotalTokens)
	}
}

func TestLoadFromEvents_PartialResearch(t *testing.T) {
	now := time.Now()
	eventStream := []interface{}{
		events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{ID: "e1", AggregateID: "test-1", Version: 1, Timestamp: now, Type: "research.started"},
			Query:     "test query",
			Mode:      "deep",
		},
		events.PlanCreatedEvent{
			BaseEvent:    events.BaseEvent{ID: "e2", AggregateID: "test-1", Version: 2, Timestamp: now, Type: "plan.created"},
			Topic:        "Test",
			Perspectives: []events.Perspective{{Name: "E1", Focus: "A1"}, {Name: "E2", Focus: "A2"}},
			DAGStructure: events.DAGSnapshot{Nodes: []events.DAGNodeSnapshot{
				{ID: "search_0", TaskType: "search", Status: "pending"},
				{ID: "search_1", TaskType: "search", Status: "pending"},
			}},
		},
		events.WorkerStartedEvent{
			BaseEvent: events.BaseEvent{ID: "e3", AggregateID: "test-1", Version: 3, Timestamp: now, Type: "worker.started"},
			WorkerID:  "search_0",
			WorkerNum: 1,
		},
		// Worker search_0 is running, search_1 is still pending
	}

	state, err := LoadFromEvents("test-1", eventStream)
	if err != nil {
		t.Fatalf("LoadFromEvents() error = %v", err)
	}

	if state.Status != "searching" {
		t.Errorf("Status = %s, want searching", state.Status)
	}
	if state.Workers["search_0"].Status != "running" {
		t.Errorf("search_0 status = %s, want running", state.Workers["search_0"].Status)
	}
	if state.Workers["search_1"].Status != "pending" {
		t.Errorf("search_1 status = %s, want pending", state.Workers["search_1"].Status)
	}
}

// ============================================================================
// Execute Tests
// ============================================================================

func TestExecute_StartResearch(t *testing.T) {
	state := NewResearchState("test-1")

	event, err := state.Execute(StartResearchCommand{
		Query: "test query",
		Mode:  "deep",
		Config: events.ResearchConfig{
			MaxWorkers: 5,
		},
	})

	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	e, ok := event.(events.ResearchStartedEvent)
	if !ok {
		t.Fatalf("Expected ResearchStartedEvent, got %T", event)
	}
	if e.Query != "test query" {
		t.Errorf("Event.Query = %s, want test query", e.Query)
	}
	if e.Version != 1 {
		t.Errorf("Event.Version = %d, want 1", e.Version)
	}
	if state.Status != "planning" {
		t.Errorf("State.Status = %s, want planning", state.Status)
	}
}

func TestExecute_InvalidCommand(t *testing.T) {
	state := NewResearchState("test-1")
	state.Status = "complete" // Already in terminal state

	_, err := state.Execute(CompleteResearchCommand{Duration: time.Minute})

	if err == nil {
		t.Error("Expected error for invalid command")
	}
}

func TestGetUncommittedEvents(t *testing.T) {
	state := NewResearchState("test-1")

	// Execute some commands
	state.Execute(StartResearchCommand{Query: "test", Mode: "deep"})
	state.Execute(SetPlanCommand{
		Topic:        "Test",
		Perspectives: []events.Perspective{{Name: "E1", Focus: "A1"}},
		DAGStructure: events.DAGSnapshot{Nodes: []events.DAGNodeSnapshot{{ID: "s0", Status: "pending"}}},
	})

	uncommitted := state.GetUncommittedEvents()
	if len(uncommitted) != 2 {
		t.Errorf("len(uncommitted) = %d, want 2", len(uncommitted))
	}

	// Clear and verify
	state.ClearUncommittedEvents()
	uncommitted = state.GetUncommittedEvents()
	if len(uncommitted) != 0 {
		t.Errorf("len(uncommitted) after clear = %d, want 0", len(uncommitted))
	}
}

// ============================================================================
// Progress Calculation Tests
// ============================================================================

func TestUpdateProgress(t *testing.T) {
	state := NewResearchState("test-1")
	state.DAG = &DAGState{Nodes: make(map[string]*DAGNode)}
	state.DAG.Nodes["n1"] = &DAGNode{ID: "n1", Status: "complete"}
	state.DAG.Nodes["n2"] = &DAGNode{ID: "n2", Status: "complete"}
	state.DAG.Nodes["n3"] = &DAGNode{ID: "n3", Status: "running"}
	state.DAG.Nodes["n4"] = &DAGNode{ID: "n4", Status: "pending"}

	state.updateProgress()

	if state.Progress != 0.5 {
		t.Errorf("Progress = %f, want 0.5", state.Progress)
	}
}
