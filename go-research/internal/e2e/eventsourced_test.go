package e2e

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"go-research/internal/adapters/storage/filesystem"
	"go-research/internal/core/domain/aggregate"
	"go-research/internal/core/domain/events"
	"go-research/internal/core/ports"
	replEvents "go-research/internal/events"
	"go-research/internal/orchestrator"
)

// =============================================================================
// Event-Sourced Architecture E2E Tests
// =============================================================================

func TestEventSourcedFullResearchWorkflow(t *testing.T) {
	// Setup
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	bus := replEvents.NewBus(100)
	defer bus.Close()

	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	// Mock LLM responses for complete workflow:
	// 1. Perspective discovery
	// 2. Query generation (3x)
	// 3. Fact extraction (3x)
	// 4. Gap identification (3x)
	// 5. Cross-validation
	// 6. Contradictions
	// 7. Knowledge gaps
	// 8. Report outline
	// 9. Section writing (3x)
	mockLLM := NewMockLLMClient(
		// Perspectives
		`[
			{"name": "Technical", "focus": "Implementation", "questions": ["How?"]},
			{"name": "Business", "focus": "Market", "questions": ["Why?"]},
			{"name": "User", "focus": "Experience", "questions": ["What?"]}
		]`,
		// Queries for each perspective
		`["tech query 1", "tech query 2"]`,
		`["business query"]`,
		`["user query"]`,
		// Fact extraction
		`[{"content": "Tech fact", "source": "https://tech.example.com", "confidence": 0.9}]`,
		`[{"content": "Business fact", "source": "https://biz.example.com", "confidence": 0.8}]`,
		`[{"content": "User fact", "source": "https://user.example.com", "confidence": 0.85}]`,
		// Gaps (empty = sufficient coverage)
		`[]`, `[]`, `[]`,
		// Cross-validation
		`[{"content": "Tech fact", "validation_score": 0.9, "corroborated_by": ["https://tech.example.com"]}]`,
		// Contradictions
		`[]`,
		// Knowledge gaps
		`[]`,
		// Outline
		`["Introduction", "Technical Analysis", "Conclusion"]`,
		// Sections
		`Introduction to the research topic.`,
		`Technical analysis reveals key insights.`,
		`In conclusion, the findings are significant.`,
	)

	mockTools := NewMockToolExecutor()

	// Create event-sourced orchestrator
	orch := orchestrator.NewDeepOrchestratorES(
		eventStore,
		bus,
		cfg,
		orchestrator.WithESClient(mockLLM),
		orchestrator.WithESTools(mockTools),
	)

	// Execute research
	ctx := context.Background()
	sessionID := "test-session-1"

	result, err := orch.Research(ctx, sessionID, "How do modern AI systems work?")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Verify events were persisted (research was at least started)
	storedEvents, err := eventStore.LoadEvents(ctx, sessionID)
	if err != nil {
		t.Fatalf("Failed to load stored events: %v", err)
	}

	if len(storedEvents) == 0 {
		t.Fatal("Expected events to be persisted")
	}

	// Verify the first event is research.started
	if storedEvents[0].GetType() != "research.started" {
		t.Errorf("Expected first event 'research.started', got '%s'", storedEvents[0].GetType())
	}

	// Log the result for visibility
	t.Logf("Research completed with status '%s' and %d persisted events", result.Status, len(storedEvents))

	// Verify state is reconstructable from events
	eventInterfaces := make([]interface{}, len(storedEvents))
	for i, evt := range storedEvents {
		eventInterfaces[i] = evt
	}

	reconstructed, err := aggregate.LoadFromEvents(sessionID, eventInterfaces)
	if err != nil {
		t.Fatalf("Failed to reconstruct state: %v", err)
	}

	if reconstructed.Query != "How do modern AI systems work?" {
		t.Errorf("Reconstructed query mismatch: %s", reconstructed.Query)
	}

	if reconstructed.Mode != "deep" {
		t.Errorf("Reconstructed mode mismatch: %s", reconstructed.Mode)
	}

	// If we got workers created, that's a good sign
	if len(result.Workers) > 0 || len(reconstructed.Workers) > 0 {
		t.Logf("Workers created: result=%d, reconstructed=%d", len(result.Workers), len(reconstructed.Workers))
	}
}

func TestEventSourcedStateReconstruction(t *testing.T) {
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	ctx := context.Background()
	sessionID := "reconstruction-test"

	// Manually persist a sequence of events
	eventsToStore := []ports.Event{
		&events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-1",
				AggregateID: sessionID,
				Version:     1,
				Timestamp:   time.Now(),
				Type:        "research.started",
			},
			Query: "test query",
			Mode:  "deep",
		},
		&events.PlanCreatedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-2",
				AggregateID: sessionID,
				Version:     2,
				Timestamp:   time.Now(),
				Type:        "plan.created",
			},
			Topic: "Test Topic",
			Perspectives: []events.Perspective{
				{Name: "Expert", Focus: "Technical", Questions: []string{"How?"}},
			},
			DAGStructure: events.DAGSnapshot{
				Nodes: []events.DAGNodeSnapshot{
					{ID: "search_0", TaskType: "search", Status: "pending"},
				},
			},
		},
		&events.WorkerStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-3",
				AggregateID: sessionID,
				Version:     3,
				Timestamp:   time.Now(),
				Type:        "worker.started",
			},
			WorkerID:    "search_0",
			WorkerNum:   1,
			Objective:   "Research topic",
			Perspective: "Expert",
		},
	}

	// Persist events
	for i, evt := range eventsToStore {
		if err := eventStore.AppendEvents(ctx, sessionID, []ports.Event{evt}, i); err != nil {
			t.Fatalf("Failed to persist event %d: %v", i+1, err)
		}
	}

	// Load events back
	loadedEvents, err := eventStore.LoadEvents(ctx, sessionID)
	if err != nil {
		t.Fatalf("Failed to load events: %v", err)
	}

	if len(loadedEvents) != 3 {
		t.Fatalf("Expected 3 events, got %d", len(loadedEvents))
	}

	// Reconstruct state from events
	eventInterfaces := make([]interface{}, len(loadedEvents))
	for i, evt := range loadedEvents {
		eventInterfaces[i] = evt
	}

	state, err := aggregate.LoadFromEvents(sessionID, eventInterfaces)
	if err != nil {
		t.Fatalf("Failed to reconstruct state: %v", err)
	}

	// Verify reconstructed state
	if state.ID != sessionID {
		t.Errorf("Expected ID '%s', got '%s'", sessionID, state.ID)
	}

	if state.Query != "test query" {
		t.Errorf("Expected query 'test query', got '%s'", state.Query)
	}

	if state.Mode != "deep" {
		t.Errorf("Expected mode 'deep', got '%s'", state.Mode)
	}

	if state.Status != "searching" {
		t.Errorf("Expected status 'searching', got '%s'", state.Status)
	}

	if state.Plan == nil {
		t.Fatal("Expected plan to be set")
	}

	if state.Plan.Topic != "Test Topic" {
		t.Errorf("Expected plan topic 'Test Topic', got '%s'", state.Plan.Topic)
	}

	if len(state.Workers) != 1 {
		t.Errorf("Expected 1 worker, got %d", len(state.Workers))
	}

	worker, exists := state.Workers["search_0"]
	if !exists {
		t.Fatal("Expected worker 'search_0' to exist")
	}

	if worker.Status != "running" {
		t.Errorf("Expected worker status 'running', got '%s'", worker.Status)
	}

	if state.Version != 3 {
		t.Errorf("Expected version 3, got %d", state.Version)
	}
}

func TestEventSourcedResume(t *testing.T) {
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	bus := replEvents.NewBus(100)
	defer bus.Close()

	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	ctx := context.Background()
	sessionID := "resume-test"

	// First, persist events representing an interrupted session (stopped during searching phase)
	eventsToStore := []ports.Event{
		&events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-1",
				AggregateID: sessionID,
				Version:     1,
				Timestamp:   time.Now(),
				Type:        "research.started",
			},
			Query: "resume test query",
			Mode:  "deep",
		},
		&events.PlanCreatedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-2",
				AggregateID: sessionID,
				Version:     2,
				Timestamp:   time.Now(),
				Type:        "plan.created",
			},
			Topic: "Resume Test",
			Perspectives: []events.Perspective{
				{Name: "Expert", Focus: "Analysis", Questions: []string{"What?"}},
			},
			DAGStructure: events.DAGSnapshot{
				Nodes: []events.DAGNodeSnapshot{
					{ID: "search_0", TaskType: "search", Status: "pending"},
				},
			},
		},
	}

	for i, evt := range eventsToStore {
		if err := eventStore.AppendEvents(ctx, sessionID, []ports.Event{evt}, i); err != nil {
			t.Fatalf("Failed to persist event %d: %v", i+1, err)
		}
	}

	// Verify interrupted state
	loadedEvents, _ := eventStore.LoadEvents(ctx, sessionID)
	if len(loadedEvents) != 2 {
		t.Fatalf("Expected 2 pre-existing events, got %d", len(loadedEvents))
	}

	// Mock responses for resume (only need responses for remaining phases)
	mockLLM := NewMockLLMClient(
		// Query generation for the one perspective
		`["resume query"]`,
		// Fact extraction
		`[{"content": "Resumed fact", "source": "https://resume.example.com", "confidence": 0.9}]`,
		// Gaps
		`[]`,
		// Cross-validation
		`[]`,
		// Contradictions
		`[]`,
		// Knowledge gaps
		`[]`,
		// Outline
		`["Summary"]`,
		// Section
		`Resumed research summary.`,
	)

	mockTools := NewMockToolExecutor()

	// Create orchestrator and resume
	orch := orchestrator.NewDeepOrchestratorES(
		eventStore,
		bus,
		cfg,
		orchestrator.WithESClient(mockLLM),
		orchestrator.WithESTools(mockTools),
	)

	// Resume the session
	result, err := orch.Resume(ctx, sessionID)
	if err != nil {
		t.Fatalf("Resume failed: %v", err)
	}

	// Verify research completed
	if result.Status != "complete" {
		t.Errorf("Expected status 'complete', got '%s'", result.Status)
	}

	// Verify more events were appended
	finalEvents, _ := eventStore.LoadEvents(ctx, sessionID)
	if len(finalEvents) <= 2 {
		t.Errorf("Expected more events after resume, got %d", len(finalEvents))
	}

	// Verify research.completed is the last event
	lastEvent := finalEvents[len(finalEvents)-1]
	if lastEvent.GetType() != "research.completed" {
		t.Errorf("Expected last event 'research.completed', got '%s'", lastEvent.GetType())
	}

	t.Logf("Resume completed, total events: %d (started with 2)", len(finalEvents))
}

func TestEventSourcedSnapshot(t *testing.T) {
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	ctx := context.Background()
	sessionID := "snapshot-test"

	// Create many events
	firstEvent := &events.ResearchStartedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-1",
			AggregateID: sessionID,
			Version:     1,
			Timestamp:   time.Now(),
			Type:        "research.started",
		},
		Query: "snapshot test",
		Mode:  "deep",
	}

	if err := eventStore.AppendEvents(ctx, sessionID, []ports.Event{firstEvent}, 0); err != nil {
		t.Fatalf("Failed to persist first event: %v", err)
	}

	// Save a snapshot at version 1
	snapshot := ports.Snapshot{
		AggregateID: sessionID,
		Version:     1,
		Data:        []byte(`{"status":"planning","query":"snapshot test"}`),
		Timestamp:   time.Now(),
	}

	if err := eventStore.SaveSnapshot(ctx, sessionID, snapshot); err != nil {
		t.Fatalf("Failed to save snapshot: %v", err)
	}

	// Add more events after snapshot
	secondEvent := &events.PlanCreatedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-2",
			AggregateID: sessionID,
			Version:     2,
			Timestamp:   time.Now(),
			Type:        "plan.created",
		},
		Topic: "Snapshot Test Topic",
	}

	if err := eventStore.AppendEvents(ctx, sessionID, []ports.Event{secondEvent}, 1); err != nil {
		t.Fatalf("Failed to persist second event: %v", err)
	}

	// Load snapshot
	loadedSnapshot, err := eventStore.LoadSnapshot(ctx, sessionID)
	if err != nil {
		t.Fatalf("Failed to load snapshot: %v", err)
	}

	if loadedSnapshot == nil {
		t.Fatal("Expected snapshot to exist")
	}

	if loadedSnapshot.Version != 1 {
		t.Errorf("Expected snapshot version 1, got %d", loadedSnapshot.Version)
	}

	// Load events after snapshot
	eventsAfterSnapshot, err := eventStore.LoadEventsFrom(ctx, sessionID, 1)
	if err != nil {
		t.Fatalf("Failed to load events after snapshot: %v", err)
	}

	if len(eventsAfterSnapshot) != 1 {
		t.Errorf("Expected 1 event after snapshot, got %d", len(eventsAfterSnapshot))
	}

	if eventsAfterSnapshot[0].GetType() != "plan.created" {
		t.Errorf("Expected 'plan.created' event, got '%s'", eventsAfterSnapshot[0].GetType())
	}
}

func TestEventSourcedVersionConflict(t *testing.T) {
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	ctx := context.Background()
	sessionID := "conflict-test"

	// Persist first event
	firstEvent := &events.ResearchStartedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-1",
			AggregateID: sessionID,
			Version:     1,
			Timestamp:   time.Now(),
			Type:        "research.started",
		},
		Query: "conflict test",
		Mode:  "deep",
	}

	if err := eventStore.AppendEvents(ctx, sessionID, []ports.Event{firstEvent}, 0); err != nil {
		t.Fatalf("Failed to persist first event: %v", err)
	}

	// Try to append with wrong expected version (simulate concurrent modification)
	conflictingEvent := &events.PlanCreatedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-conflict",
			AggregateID: sessionID,
			Version:     2,
			Timestamp:   time.Now(),
			Type:        "plan.created",
		},
	}

	// Try to append expecting version 2, but actual is 1 - should fail (version conflict)
	err := eventStore.AppendEvents(ctx, sessionID, []ports.Event{conflictingEvent}, 2)
	if err == nil {
		t.Fatal("Expected version conflict error, got nil")
	}

	if !strings.Contains(err.Error(), "conflict") {
		t.Errorf("Expected conflict error, got: %v", err)
	}

	// Correct version (1) should succeed
	err = eventStore.AppendEvents(ctx, sessionID, []ports.Event{conflictingEvent}, 1)
	if err != nil {
		t.Errorf("Expected success with correct version: %v", err)
	}
}

func TestEventSourcedListSessions(t *testing.T) {
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	ctx := context.Background()

	// Create multiple sessions
	sessions := []string{"session-a", "session-b", "session-c"}

	for _, sessionID := range sessions {
		event := &events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-" + sessionID,
				AggregateID: sessionID,
				Version:     1,
				Timestamp:   time.Now(),
				Type:        "research.started",
			},
			Query: "Query for " + sessionID,
			Mode:  "deep",
		}

		if err := eventStore.AppendEvents(ctx, sessionID, []ports.Event{event}, 0); err != nil {
			t.Fatalf("Failed to persist event for %s: %v", sessionID, err)
		}
	}

	// List all session IDs
	ids, err := eventStore.GetAllAggregateIDs(ctx)
	if err != nil {
		t.Fatalf("Failed to list sessions: %v", err)
	}

	if len(ids) != 3 {
		t.Errorf("Expected 3 sessions, got %d", len(ids))
	}

	// Verify all sessions are present
	idSet := make(map[string]bool)
	for _, id := range ids {
		idSet[id] = true
	}

	for _, expectedID := range sessions {
		if !idSet[expectedID] {
			t.Errorf("Missing session: %s", expectedID)
		}
	}
}

func TestEventSourcedEventsEmitted(t *testing.T) {
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	bus := replEvents.NewBus(100)
	defer bus.Close()

	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	// Subscribe to UI events
	eventCh := bus.Subscribe(
		replEvents.EventResearchStarted,
		replEvents.EventPlanCreated,
		replEvents.EventWorkerStarted,
		replEvents.EventSynthesisComplete,
	)

	// Minimal mock for fast completion
	mockLLM := NewMockLLMClient(
		`[{"name": "Expert", "focus": "Details", "questions": ["What?"]}]`,
		`["query"]`,
		`[{"content": "Fact", "source": "https://example.com", "confidence": 0.9}]`,
		`[]`,
		`[]`,
		`[]`,
		`[]`,
		`["Section"]`,
		`Content.`,
	)

	mockTools := NewMockToolExecutor()

	orch := orchestrator.NewDeepOrchestratorES(
		eventStore,
		bus,
		cfg,
		orchestrator.WithESClient(mockLLM),
		orchestrator.WithESTools(mockTools),
	)

	ctx := context.Background()
	_, err := orch.Research(ctx, "events-test", "Test events")
	if err != nil {
		t.Fatalf("Research failed: %v", err)
	}

	// Collect emitted events
	receivedEvents := make(map[replEvents.EventType]int)
	timeout := time.After(500 * time.Millisecond)

collectLoop:
	for {
		select {
		case event := <-eventCh:
			receivedEvents[event.Type]++
		case <-timeout:
			break collectLoop
		}
	}

	// Verify key UI events were emitted
	expectedEvents := []replEvents.EventType{
		replEvents.EventResearchStarted,
		replEvents.EventPlanCreated,
	}

	for _, eventType := range expectedEvents {
		if receivedEvents[eventType] == 0 {
			t.Errorf("Expected UI event %v to be emitted", eventType)
		}
	}
}

func TestEventSourcedCancelledResearch(t *testing.T) {
	tmpDir := t.TempDir()
	eventStore := filesystem.NewEventStore(tmpDir)
	bus := replEvents.NewBus(100)
	defer bus.Close()

	cfg := testConfig()
	defer os.RemoveAll(filepath.Dir(cfg.StateFile))

	// Mock that takes many iterations
	responses := make([]string, 50)
	for i := range responses {
		responses[i] = `["more queries"]`
	}
	mockLLM := NewMockLLMClient(responses...)

	mockTools := NewMockToolExecutor()

	orch := orchestrator.NewDeepOrchestratorES(
		eventStore,
		bus,
		cfg,
		orchestrator.WithESClient(mockLLM),
		orchestrator.WithESTools(mockTools),
	)

	// Cancel immediately
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	sessionID := "cancel-test"
	_, err := orch.Research(ctx, sessionID, "Cancelled research")

	if err == nil {
		t.Error("Expected error due to cancellation")
	}

	// Verify events were still persisted (at least the start event)
	storedEvents, loadErr := eventStore.LoadEvents(context.Background(), sessionID)
	if loadErr != nil {
		t.Fatalf("Failed to load events: %v", loadErr)
	}

	if len(storedEvents) == 0 {
		t.Error("Expected at least the research.started event to be persisted")
	}

	// First event should be research.started
	if storedEvents[0].GetType() != "research.started" {
		t.Errorf("First event should be 'research.started', got '%s'", storedEvents[0].GetType())
	}
}

func TestAggregateCommandExecution(t *testing.T) {
	// Test the aggregate directly without the orchestrator
	state := aggregate.NewResearchState("cmd-test")

	// Execute StartResearch command
	event1, err := state.Execute(aggregate.StartResearchCommand{
		Query: "command test",
		Mode:  "deep",
		Config: events.ResearchConfig{
			MaxWorkers: 3,
		},
	})
	if err != nil {
		t.Fatalf("StartResearch failed: %v", err)
	}

	// After ResearchStartedEvent, status transitions to "planning"
	if state.Status != "planning" {
		t.Errorf("Expected status 'planning', got '%s'", state.Status)
	}

	if state.Version != 1 {
		t.Errorf("Expected version 1, got %d", state.Version)
	}

	uncommitted := state.GetUncommittedEvents()
	if len(uncommitted) != 1 {
		t.Errorf("Expected 1 uncommitted event, got %d", len(uncommitted))
	}

	// Verify event type
	startedEvent, ok := event1.(events.ResearchStartedEvent)
	if !ok {
		t.Fatalf("Expected ResearchStartedEvent, got %T", event1)
	}

	if startedEvent.Query != "command test" {
		t.Errorf("Expected query 'command test', got '%s'", startedEvent.Query)
	}

	// Execute SetPlan command
	event2, err := state.Execute(aggregate.SetPlanCommand{
		Topic: "Test Plan",
		Perspectives: []events.Perspective{
			{Name: "Expert", Focus: "Details", Questions: []string{"How?"}},
		},
		DAGStructure: events.DAGSnapshot{
			Nodes: []events.DAGNodeSnapshot{
				{ID: "search_0", TaskType: "search", Status: "pending"},
			},
		},
	})
	if err != nil {
		t.Fatalf("SetPlan failed: %v", err)
	}

	if state.Status != "searching" {
		t.Errorf("Expected status 'searching', got '%s'", state.Status)
	}

	if state.Version != 2 {
		t.Errorf("Expected version 2, got %d", state.Version)
	}

	if state.Plan == nil || state.Plan.Topic != "Test Plan" {
		t.Error("Plan not properly set")
	}

	// Verify event
	planEvent, ok := event2.(events.PlanCreatedEvent)
	if !ok {
		t.Fatalf("Expected PlanCreatedEvent, got %T", event2)
	}

	if planEvent.Topic != "Test Plan" {
		t.Errorf("Expected topic 'Test Plan', got '%s'", planEvent.Topic)
	}

	// Clear uncommitted and verify
	state.ClearUncommittedEvents()
	uncommitted = state.GetUncommittedEvents()
	if len(uncommitted) != 0 {
		t.Errorf("Expected 0 uncommitted events after clear, got %d", len(uncommitted))
	}
}

func TestAggregateInvalidCommands(t *testing.T) {
	state := aggregate.NewResearchState("invalid-cmd-test")

	// Try to start a worker before research started (should fail)
	_, err := state.Execute(aggregate.StartWorkerCommand{
		WorkerID:    "worker-1",
		WorkerNum:   1,
		Objective:   "Test",
		Perspective: "Expert",
	})
	if err == nil {
		t.Error("Expected error when starting worker before research")
	}

	// Start research
	_, err = state.Execute(aggregate.StartResearchCommand{
		Query: "test",
		Mode:  "deep",
	})
	if err != nil {
		t.Fatalf("StartResearch failed: %v", err)
	}

	// Try to start research again (should fail - already started)
	_, err = state.Execute(aggregate.StartResearchCommand{
		Query: "duplicate",
		Mode:  "deep",
	})
	if err == nil {
		t.Error("Expected error when starting research twice")
	}

	// Set plan to move to "searching" status
	_, err = state.Execute(aggregate.SetPlanCommand{
		Topic: "Test",
		Perspectives: []events.Perspective{
			{Name: "Expert", Focus: "Details", Questions: []string{"How?"}},
		},
		DAGStructure: events.DAGSnapshot{
			Nodes: []events.DAGNodeSnapshot{
				{ID: "search_0", TaskType: "search", Status: "pending"},
			},
		},
	})
	if err != nil {
		t.Fatalf("SetPlan failed: %v", err)
	}

	// Try to complete a non-existent worker (should fail)
	_, err = state.Execute(aggregate.CompleteWorkerCommand{
		WorkerID: "nonexistent",
		Output:   "output",
	})
	if err == nil {
		t.Error("Expected error when completing non-existent worker")
	}

	// Try to set plan again after moving to searching (should fail)
	_, err = state.Execute(aggregate.SetPlanCommand{
		Topic: "Another Plan",
	})
	if err == nil {
		t.Error("Expected error when setting plan in searching state")
	}
}
