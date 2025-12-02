package session

import (
	"fmt"
	"time"

	"go-research/internal/llm"

	"github.com/google/uuid"
)

// Mode represents the research mode
type Mode string

const (
	ModeFast  Mode = "fast"
	ModeStorm Mode = "storm"
)

// SessionStatus represents the current state of a session
type SessionStatus string

const (
	StatusPending  SessionStatus = "pending"
	StatusRunning  SessionStatus = "running"
	StatusComplete SessionStatus = "complete"
	StatusFailed   SessionStatus = "failed"
	StatusExpanded SessionStatus = "expanded"
)

// WorkerStatus represents the current state of a worker
type WorkerStatus string

const (
	WorkerPending  WorkerStatus = "pending"
	WorkerRunning  WorkerStatus = "running"
	WorkerComplete WorkerStatus = "complete"
	WorkerFailed   WorkerStatus = "failed"
)

// Session represents a complete research session
type Session struct {
	ID              string          `json:"id" yaml:"session_id"`
	Version         int             `json:"version" yaml:"version"`
	ParentID        *string         `json:"parent_id,omitempty" yaml:"parent_session_id,omitempty"`
	Query           string          `json:"query" yaml:"query"`
	Mode            Mode            `json:"mode" yaml:"mode"`
	ComplexityScore float64         `json:"complexity_score" yaml:"complexity_score"`
	Workers         []WorkerContext `json:"workers" yaml:"-"`
	Report          string          `json:"report" yaml:"-"`
	Sources         []string        `json:"sources" yaml:"sources"`
	Insights        []Insight       `json:"insights" yaml:"-"`
	Cost            CostBreakdown   `json:"cost" yaml:"cost"`
	CreatedAt       time.Time       `json:"created_at" yaml:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" yaml:"updated_at"`
	Status          SessionStatus   `json:"status" yaml:"status"`
}

// WorkerContext captures full execution context for a worker
type WorkerContext struct {
	ID             string           `json:"id"`
	WorkerNum      int              `json:"worker_num"`
	Objective      string           `json:"objective"`
	ToolsAvailable []string         `json:"tools_available"`
	ExpectedOutput string           `json:"expected_output"`
	Iterations     []ReActIteration `json:"iterations"`
	ToolCalls      []ToolCall       `json:"tool_calls"`
	FinalOutput    string           `json:"final_output"`
	Summary        string           `json:"summary"`
	Sources        []string         `json:"sources"`
	Status         WorkerStatus     `json:"status"`
	Cost           CostBreakdown    `json:"cost"`
	StartedAt      time.Time        `json:"started_at"`
	CompletedAt    *time.Time       `json:"completed_at,omitempty"`
	Error          *string          `json:"error,omitempty"`
}

// ReActIteration captures one think-act cycle
type ReActIteration struct {
	Number    int       `json:"number"`
	Thought   string    `json:"thought"`
	Action    string    `json:"action"`
	Result    string    `json:"result"`
	Timestamp time.Time `json:"timestamp"`
}

// ToolCall records a tool invocation
type ToolCall struct {
	Tool      string                 `json:"tool"`
	Args      map[string]interface{} `json:"args"`
	Result    string                 `json:"result"`
	Success   bool                   `json:"success"`
	Duration  time.Duration          `json:"duration"`
	Iteration int                    `json:"iteration"`
	Timestamp time.Time              `json:"timestamp"`
}

// Insight represents an extracted research insight
type Insight struct {
	Title       string   `json:"title"`
	Finding     string   `json:"finding"`
	Implication string   `json:"implication"`
	Confidence  float64  `json:"confidence"`
	Sources     []string `json:"sources"`
	WorkerID    string   `json:"worker_id"`
}

// CostBreakdown tracks token usage and costs
type CostBreakdown struct {
	InputTokens  int     `json:"input_tokens"`
	OutputTokens int     `json:"output_tokens"`
	TotalTokens  int     `json:"total_tokens"`
	InputCost    float64 `json:"input_cost"`
	OutputCost   float64 `json:"output_cost"`
	TotalCost    float64 `json:"total_cost"`
}

// Add adds another cost breakdown to this one
func (c *CostBreakdown) Add(other CostBreakdown) {
	c.InputTokens += other.InputTokens
	c.OutputTokens += other.OutputTokens
	c.TotalTokens += other.TotalTokens
	c.InputCost += other.InputCost
	c.OutputCost += other.OutputCost
	c.TotalCost += other.TotalCost
}

// NewCostBreakdown constructs a cost breakdown from token usage.
func NewCostBreakdown(model string, inputTokens, outputTokens, totalTokens int) CostBreakdown {
	if totalTokens == 0 {
		totalTokens = inputTokens + outputTokens
	}

	inputCost, outputCost, totalCost := llm.CalculateCost(model, inputTokens, outputTokens)

	return CostBreakdown{
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		TotalTokens:  totalTokens,
		InputCost:    inputCost,
		OutputCost:   outputCost,
		TotalCost:    totalCost,
	}
}

// New creates a new session
func New(query string, mode Mode) *Session {
	now := time.Now()
	return &Session{
		ID:        fmt.Sprintf("%s-%s", now.Format("2006-01-02"), uuid.New().String()[:8]),
		Version:   1,
		Query:     query,
		Mode:      mode,
		CreatedAt: now,
		UpdatedAt: now,
		Status:    StatusPending,
	}
}

// NewVersion creates a new version of an existing session
func (s *Session) NewVersion() *Session {
	now := time.Now()
	parentID := s.ID
	return &Session{
		ID:        fmt.Sprintf("%s-v%d", s.ID, s.Version+1),
		Version:   s.Version + 1,
		ParentID:  &parentID,
		Query:     s.Query,
		Mode:      s.Mode,
		CreatedAt: now,
		UpdatedAt: now,
		Status:    StatusPending,
	}
}
