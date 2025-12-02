// Package events defines domain events for the event-sourced research system.
// Domain events represent state changes that have occurred in the system.
// They are immutable facts that can be stored, replayed, and used to reconstruct state.
package events

import (
	"time"
)

// BaseEvent provides common fields for all domain events.
// All domain events should embed this struct.
type BaseEvent struct {
	ID          string    `json:"id"`           // UUID for idempotency
	AggregateID string    `json:"aggregate_id"` // Session/Research ID
	Version     int       `json:"version"`      // Aggregate version after this event
	Timestamp   time.Time `json:"timestamp"`    // When the event occurred
	Type        string    `json:"type"`         // Event type discriminator for deserialization
}

// GetID returns the unique event identifier.
func (e BaseEvent) GetID() string { return e.ID }

// GetAggregateID returns the aggregate (session) this event belongs to.
func (e BaseEvent) GetAggregateID() string { return e.AggregateID }

// GetVersion returns the aggregate version after this event was applied.
func (e BaseEvent) GetVersion() int { return e.Version }

// GetType returns the event type for deserialization.
func (e BaseEvent) GetType() string { return e.Type }

// GetTimestamp returns when the event occurred.
func (e BaseEvent) GetTimestamp() time.Time { return e.Timestamp }

// CostBreakdown tracks token usage and costs.
type CostBreakdown struct {
	InputTokens  int     `json:"input_tokens"`
	OutputTokens int     `json:"output_tokens"`
	TotalTokens  int     `json:"total_tokens"`
	TotalCostUSD float64 `json:"total_cost_usd"`
}

// Add combines two cost breakdowns.
func (c *CostBreakdown) Add(other CostBreakdown) {
	c.InputTokens += other.InputTokens
	c.OutputTokens += other.OutputTokens
	c.TotalTokens += other.TotalTokens
	c.TotalCostUSD += other.TotalCostUSD
}

// ResearchConfig holds research session configuration.
type ResearchConfig struct {
	MaxWorkers int           `json:"max_workers"`
	Timeout    time.Duration `json:"timeout"`
}

// Perspective represents a research perspective discovered during planning.
type Perspective struct {
	Name      string   `json:"name"`
	Focus     string   `json:"focus"`
	Questions []string `json:"questions"`
}

// DAGSnapshot captures the complete DAG state.
type DAGSnapshot struct {
	Nodes []DAGNodeSnapshot `json:"nodes"`
}

// DAGNodeSnapshot represents a single node in the DAG.
type DAGNodeSnapshot struct {
	ID           string   `json:"id"`
	TaskType     string   `json:"task_type"`
	Description  string   `json:"description"`
	Dependencies []string `json:"dependencies"`
	Status       string   `json:"status"`
}

// Fact represents a discovered fact from research.
type Fact struct {
	Content    string  `json:"content"`
	Confidence float64 `json:"confidence"`
	SourceURL  string  `json:"source_url"`
}

// Source represents a source used in research.
type Source struct {
	URL     string `json:"url"`
	Title   string `json:"title"`
	Snippet string `json:"snippet"`
}

// ValidatedFact represents a fact that has been cross-validated.
type ValidatedFact struct {
	Content        string   `json:"content"`
	Confidence     float64  `json:"confidence"`
	CorroboratedBy []string `json:"corroborated_by"`
}

// Contradiction represents conflicting information found during analysis.
type Contradiction struct {
	Fact1       string `json:"fact_1"`
	Fact2       string `json:"fact_2"`
	Description string `json:"description"`
}

// KnowledgeGap represents missing information identified during analysis.
type KnowledgeGap struct {
	Description      string   `json:"description"`
	Importance       float64  `json:"importance"`
	SuggestedQueries []string `json:"suggested_queries"`
}

// Citation represents a citation in the final report.
type Citation struct {
	ID    int    `json:"id"`
	URL   string `json:"url"`
	Title string `json:"title"`
}
