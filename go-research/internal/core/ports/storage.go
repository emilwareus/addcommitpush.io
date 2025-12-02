// Package ports defines the interfaces (ports) for the hexagonal architecture.
// These interfaces define the contracts that adapters must implement.
package ports

import (
	"context"
	"time"
)

// Event represents a persisted domain event.
// All domain events must implement this interface.
type Event interface {
	GetID() string
	GetAggregateID() string
	GetVersion() int
	GetType() string
	GetTimestamp() time.Time
}

// Snapshot represents a point-in-time state capture for replay optimization.
type Snapshot struct {
	AggregateID string    `json:"aggregate_id"`
	Version     int       `json:"version"`
	Data        []byte    `json:"data"`
	Timestamp   time.Time `json:"timestamp"`
}

// EventStore persists and retrieves domain events.
// This is the primary storage port for event sourcing.
type EventStore interface {
	// AppendEvents adds events to the stream for an aggregate.
	// expectedVersion enables optimistic concurrency control.
	// If expectedVersion > 0, the operation fails if the current version doesn't match.
	AppendEvents(ctx context.Context, aggregateID string, events []Event, expectedVersion int) error

	// LoadEvents retrieves all events for an aggregate in version order.
	LoadEvents(ctx context.Context, aggregateID string) ([]Event, error)

	// LoadEventsFrom retrieves events starting from a specific version.
	// Useful for replaying only events after a snapshot.
	LoadEventsFrom(ctx context.Context, aggregateID string, fromVersion int) ([]Event, error)

	// LoadSnapshot retrieves the latest snapshot for an aggregate.
	// Returns nil if no snapshot exists.
	LoadSnapshot(ctx context.Context, aggregateID string) (*Snapshot, error)

	// SaveSnapshot persists a state snapshot for faster future loads.
	SaveSnapshot(ctx context.Context, aggregateID string, snapshot Snapshot) error

	// GetAllAggregateIDs returns all aggregate IDs (for listing sessions).
	GetAllAggregateIDs(ctx context.Context) ([]string, error)
}

// SessionFilters defines filters for querying sessions.
type SessionFilters struct {
	Status    string // Filter by status
	Mode      string // Filter by mode (fast/storm)
	Query     string // Filter by query substring
	Limit     int    // Max results
	Offset    int    // Pagination offset
	SortBy    string // Field to sort by
	SortOrder string // "asc" or "desc"
}

// SessionSummary provides a lightweight view of a session for listing.
type SessionSummary struct {
	ID          string    `json:"id"`
	Query       string    `json:"query"`
	Mode        string    `json:"mode"`
	Status      string    `json:"status"`
	Progress    float64   `json:"progress"`
	TotalCost   float64   `json:"total_cost"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	WorkerCount int       `json:"worker_count"`
}

// SessionRepository provides backward compatibility with existing session storage.
// This allows gradual migration to event sourcing.
type SessionRepository interface {
	Save(ctx context.Context, session interface{}) error
	Load(ctx context.Context, id string) (interface{}, error)
	LoadLatest(ctx context.Context) (interface{}, error)
	List(ctx context.Context, filters SessionFilters) ([]SessionSummary, error)
	Delete(ctx context.Context, id string) error
}
