// Package filesystem provides a filesystem-based event store implementation.
// Events are stored as JSON files in a directory structure organized by aggregate ID.
package filesystem

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"go-research/internal/core/ports"
)

// EventStore implements ports.EventStore using the filesystem.
type EventStore struct {
	baseDir string
}

// NewEventStore creates a new filesystem-based event store.
func NewEventStore(baseDir string) *EventStore {
	os.MkdirAll(baseDir, 0755)
	return &EventStore{baseDir: baseDir}
}

// Ensure EventStore implements the port interface.
var _ ports.EventStore = (*EventStore)(nil)

// eventDir returns the directory for an aggregate's events.
func (s *EventStore) eventDir(aggregateID string) string {
	return filepath.Join(s.baseDir, aggregateID, "events")
}

// snapshotPath returns the path to an aggregate's snapshot file.
func (s *EventStore) snapshotPath(aggregateID string) string {
	return filepath.Join(s.baseDir, aggregateID, "snapshot.json")
}

// AppendEvents adds events to the stream for an aggregate.
func (s *EventStore) AppendEvents(ctx context.Context, aggregateID string, newEvents []ports.Event, expectedVersion int) error {
	dir := s.eventDir(aggregateID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create event dir: %w", err)
	}

	// Check expected version (optimistic concurrency)
	existing, err := s.LoadEvents(ctx, aggregateID)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	currentVersion := 0
	if len(existing) > 0 {
		currentVersion = existing[len(existing)-1].GetVersion()
	}

	if expectedVersion > 0 && currentVersion != expectedVersion {
		return fmt.Errorf("version conflict: expected %d, got %d", expectedVersion, currentVersion)
	}

	// Append each event as a separate JSON file
	for _, event := range newEvents {
		version := event.GetVersion()
		eventType := event.GetType()
		filename := fmt.Sprintf("%06d_%s.json", version, sanitizeFilename(eventType))
		path := filepath.Join(dir, filename)

		data, err := json.MarshalIndent(event, "", "  ")
		if err != nil {
			return fmt.Errorf("marshal event: %w", err)
		}

		if err := os.WriteFile(path, data, 0644); err != nil {
			return fmt.Errorf("write event: %w", err)
		}
	}

	return nil
}

// LoadEvents retrieves all events for an aggregate.
func (s *EventStore) LoadEvents(ctx context.Context, aggregateID string) ([]ports.Event, error) {
	dir := s.eventDir(aggregateID)

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	// Sort by filename (version prefix)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	var result []ports.Event
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		path := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read event %s: %w", entry.Name(), err)
		}

		event, err := deserializeEvent(data)
		if err != nil {
			return nil, fmt.Errorf("deserialize event %s: %w", entry.Name(), err)
		}

		result = append(result, event)
	}

	return result, nil
}

// LoadEventsFrom retrieves events starting from a version.
func (s *EventStore) LoadEventsFrom(ctx context.Context, aggregateID string, fromVersion int) ([]ports.Event, error) {
	allEvents, err := s.LoadEvents(ctx, aggregateID)
	if err != nil {
		return nil, err
	}

	var result []ports.Event
	for _, event := range allEvents {
		if event.GetVersion() > fromVersion {
			result = append(result, event)
		}
	}

	return result, nil
}

// LoadSnapshot retrieves the latest snapshot for an aggregate.
func (s *EventStore) LoadSnapshot(ctx context.Context, aggregateID string) (*ports.Snapshot, error) {
	path := s.snapshotPath(aggregateID)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var snapshot ports.Snapshot
	if err := json.Unmarshal(data, &snapshot); err != nil {
		return nil, err
	}

	return &snapshot, nil
}

// SaveSnapshot persists a state snapshot.
func (s *EventStore) SaveSnapshot(ctx context.Context, aggregateID string, snapshot ports.Snapshot) error {
	path := s.snapshotPath(aggregateID)
	dir := filepath.Dir(path)

	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

// GetAllAggregateIDs returns all aggregate IDs (for listing sessions).
func (s *EventStore) GetAllAggregateIDs(ctx context.Context) ([]string, error) {
	entries, err := os.ReadDir(s.baseDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var ids []string
	for _, entry := range entries {
		if entry.IsDir() {
			ids = append(ids, entry.Name())
		}
	}

	return ids, nil
}

// sanitizeFilename replaces characters that are problematic in filenames.
func sanitizeFilename(s string) string {
	return strings.ReplaceAll(s, ".", "_")
}
