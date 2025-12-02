package filesystem

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"go-research/internal/core/domain/events"
	"go-research/internal/core/ports"
)

func TestEventStore_AppendAndLoad(t *testing.T) {
	dir := t.TempDir()
	store := NewEventStore(dir)
	ctx := context.Background()

	// Create test event
	event := &events.ResearchStartedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-1",
			AggregateID: "session-123",
			Version:     1,
			Timestamp:   time.Now(),
			Type:        "research.started",
		},
		Query: "test query",
		Mode:  "deep",
	}

	// Append event
	err := store.AppendEvents(ctx, "session-123", []ports.Event{event}, 0)
	if err != nil {
		t.Fatalf("AppendEvents failed: %v", err)
	}

	// Verify file exists
	eventPath := filepath.Join(dir, "session-123", "events", "000001_research_started.json")
	if _, err := os.Stat(eventPath); os.IsNotExist(err) {
		t.Errorf("Event file not created: %s", eventPath)
	}

	// Load events
	loaded, err := store.LoadEvents(ctx, "session-123")
	if err != nil {
		t.Fatalf("LoadEvents failed: %v", err)
	}

	if len(loaded) != 1 {
		t.Errorf("Expected 1 event, got %d", len(loaded))
	}

	// Verify event content
	loadedEvent, ok := loaded[0].(*events.ResearchStartedEvent)
	if !ok {
		t.Fatalf("Expected *ResearchStartedEvent, got %T", loaded[0])
	}

	if loadedEvent.Query != "test query" {
		t.Errorf("Expected query 'test query', got '%s'", loadedEvent.Query)
	}
}

func TestEventStore_VersionConflict(t *testing.T) {
	dir := t.TempDir()
	store := NewEventStore(dir)
	ctx := context.Background()

	// Create first event
	event1 := &events.ResearchStartedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-1",
			AggregateID: "session-123",
			Version:     1,
			Timestamp:   time.Now(),
			Type:        "research.started",
		},
	}

	err := store.AppendEvents(ctx, "session-123", []ports.Event{event1}, 0)
	if err != nil {
		t.Fatalf("First append failed: %v", err)
	}

	// Try to append with wrong expected version
	event2 := &events.PlanCreatedEvent{
		BaseEvent: events.BaseEvent{
			ID:          "evt-2",
			AggregateID: "session-123",
			Version:     2,
			Timestamp:   time.Now(),
			Type:        "plan.created",
		},
	}

	// Try to append expecting wrong version (expecting 2, actual is 1)
	err = store.AppendEvents(ctx, "session-123", []ports.Event{event2}, 2)
	if err == nil {
		t.Error("Expected version conflict error")
	}

	// This should succeed (expecting version 1, which is correct)
	err = store.AppendEvents(ctx, "session-123", []ports.Event{event2}, 1)
	if err != nil {
		t.Errorf("Append with correct version should succeed: %v", err)
	}
}

func TestEventStore_GetAllAggregateIDs(t *testing.T) {
	dir := t.TempDir()
	store := NewEventStore(dir)
	ctx := context.Background()

	// Create events for multiple aggregates
	for _, id := range []string{"session-1", "session-2", "session-3"} {
		event := &events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-" + id,
				AggregateID: id,
				Version:     1,
				Timestamp:   time.Now(),
				Type:        "research.started",
			},
		}
		if err := store.AppendEvents(ctx, id, []ports.Event{event}, 0); err != nil {
			t.Fatalf("Failed to append event for %s: %v", id, err)
		}
	}

	// Get all IDs
	ids, err := store.GetAllAggregateIDs(ctx)
	if err != nil {
		t.Fatalf("GetAllAggregateIDs failed: %v", err)
	}

	if len(ids) != 3 {
		t.Errorf("Expected 3 IDs, got %d", len(ids))
	}
}

func TestEventStore_LoadEventsFrom(t *testing.T) {
	dir := t.TempDir()
	store := NewEventStore(dir)
	ctx := context.Background()

	// Create multiple events
	events := []ports.Event{
		&events.ResearchStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-1",
				AggregateID: "session-123",
				Version:     1,
				Timestamp:   time.Now(),
				Type:        "research.started",
			},
		},
		&events.PlanCreatedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-2",
				AggregateID: "session-123",
				Version:     2,
				Timestamp:   time.Now(),
				Type:        "plan.created",
			},
		},
		&events.WorkerStartedEvent{
			BaseEvent: events.BaseEvent{
				ID:          "evt-3",
				AggregateID: "session-123",
				Version:     3,
				Timestamp:   time.Now(),
				Type:        "worker.started",
			},
		},
	}

	// Append all events
	for i, evt := range events {
		if err := store.AppendEvents(ctx, "session-123", []ports.Event{evt}, i); err != nil {
			t.Fatalf("Failed to append event %d: %v", i+1, err)
		}
	}

	// Load events from version 1 (should get events 2 and 3)
	loaded, err := store.LoadEventsFrom(ctx, "session-123", 1)
	if err != nil {
		t.Fatalf("LoadEventsFrom failed: %v", err)
	}

	if len(loaded) != 2 {
		t.Errorf("Expected 2 events after version 1, got %d", len(loaded))
	}

	if loaded[0].GetVersion() != 2 || loaded[1].GetVersion() != 3 {
		t.Error("Events loaded from wrong version")
	}
}

func TestEventStore_Snapshot(t *testing.T) {
	dir := t.TempDir()
	store := NewEventStore(dir)
	ctx := context.Background()

	// Create and save snapshot
	snapshot := ports.Snapshot{
		AggregateID: "session-123",
		Version:     10,
		Data:        []byte(`{"status":"searching"}`),
		Timestamp:   time.Now(),
	}

	if err := store.SaveSnapshot(ctx, "session-123", snapshot); err != nil {
		t.Fatalf("SaveSnapshot failed: %v", err)
	}

	// Load snapshot
	loaded, err := store.LoadSnapshot(ctx, "session-123")
	if err != nil {
		t.Fatalf("LoadSnapshot failed: %v", err)
	}

	if loaded == nil {
		t.Fatal("Expected snapshot, got nil")
	}

	if loaded.Version != 10 {
		t.Errorf("Expected version 10, got %d", loaded.Version)
	}

	if string(loaded.Data) != `{"status":"searching"}` {
		t.Errorf("Snapshot data mismatch")
	}
}

func TestEventStore_LoadNonExistent(t *testing.T) {
	dir := t.TempDir()
	store := NewEventStore(dir)
	ctx := context.Background()

	// Load from non-existent aggregate should return empty slice
	events, err := store.LoadEvents(ctx, "non-existent")
	if err != nil {
		t.Fatalf("LoadEvents should not error for non-existent: %v", err)
	}

	if events != nil && len(events) != 0 {
		t.Error("Expected empty/nil slice for non-existent aggregate")
	}

	// Load snapshot from non-existent aggregate should return nil
	snapshot, err := store.LoadSnapshot(ctx, "non-existent")
	if err != nil {
		t.Fatalf("LoadSnapshot should not error for non-existent: %v", err)
	}

	if snapshot != nil {
		t.Error("Expected nil snapshot for non-existent aggregate")
	}
}
