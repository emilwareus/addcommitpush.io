package context

import (
	"sync"
	"time"

	"go-research/internal/llm"
	"go-research/internal/session"
)

// Manager handles proactive context management with multi-scale folding.
// It implements AgentFold-style context compression to prevent token budget exhaustion
// during long-horizon research tasks.
type Manager struct {
	mu     sync.RWMutex
	client llm.ChatClient
	model  string

	// Multi-scale summaries (L0=finest, Ln=coarsest)
	summaries  []Summary
	numLevels  int
	turnNumber int

	// Working memory (recent uncompressed interactions)
	workingMemory  []Interaction
	workingMemSize int

	// Tool memory (consolidated tool call history)
	toolMemory map[string]ToolSummary

	// Token budget
	maxTokens     int
	currentTokens int
	foldThreshold float64 // e.g., 0.75 = fold at 75% capacity
	cost          session.CostBreakdown
}

// Summary represents a compressed view of past interactions at a given granularity level.
type Summary struct {
	Level        int
	Content      string
	TokenCount   int
	CoveredTurns []int
	Timestamp    time.Time
}

// Interaction represents a single message exchange.
type Interaction struct {
	Role      string
	Content   string
	Tokens    int
	TurnNum   int
	Timestamp time.Time
}

// ToolSummary consolidates tool call history for a specific tool.
type ToolSummary struct {
	Tool        string
	CallCount   int
	LastResult  string
	KeyFindings []string
}

// Config configures the context manager behavior.
type Config struct {
	MaxTokens      int
	FoldThreshold  float64
	NumLevels      int
	WorkingMemSize int
}

// DefaultConfig returns sensible defaults for context management.
func DefaultConfig() Config {
	return Config{
		MaxTokens:      40000,
		FoldThreshold:  0.75,
		NumLevels:      3,
		WorkingMemSize: 5,
	}
}

// New creates a new context manager with the given LLM client and configuration.
func New(client llm.ChatClient, cfg Config) *Manager {
	summaries := make([]Summary, cfg.NumLevels)
	for i := range summaries {
		summaries[i] = Summary{Level: i}
	}

	var model string
	if client != nil {
		model = client.GetModel()
	}

	return &Manager{
		client:         client,
		model:          model,
		summaries:      summaries,
		numLevels:      cfg.NumLevels,
		workingMemory:  make([]Interaction, 0, cfg.WorkingMemSize),
		workingMemSize: cfg.WorkingMemSize,
		toolMemory:     make(map[string]ToolSummary),
		maxTokens:      cfg.MaxTokens,
		foldThreshold:  cfg.FoldThreshold,
	}
}

// CurrentTokens returns the current token count in the context.
func (m *Manager) CurrentTokens() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.currentTokens
}

// MaxTokens returns the maximum token budget.
func (m *Manager) MaxTokens() int {
	return m.maxTokens
}

// Reset clears all context state for a new research session.
func (m *Manager) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.summaries = make([]Summary, m.numLevels)
	for i := range m.summaries {
		m.summaries[i] = Summary{Level: i}
	}
	m.workingMemory = make([]Interaction, 0, m.workingMemSize)
	m.toolMemory = make(map[string]ToolSummary)
	m.currentTokens = 0
	m.turnNumber = 0
	m.cost = session.CostBreakdown{}
}

// recalculateTokens updates the total token count from all sources.
func (m *Manager) recalculateTokens() {
	total := 0

	// Count summary tokens
	for _, s := range m.summaries {
		total += s.TokenCount
	}

	// Count working memory tokens
	for _, i := range m.workingMemory {
		total += i.Tokens
	}

	// Count tool memory tokens (rough estimate)
	for _, ts := range m.toolMemory {
		total += estimateTokens(ts.LastResult)
		for _, f := range ts.KeyFindings {
			total += estimateTokens(f)
		}
	}

	m.currentTokens = total
}

// CostBreakdown returns accumulated LLM cost for context operations.
func (m *Manager) CostBreakdown() session.CostBreakdown {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cost
}

func (m *Manager) addCost(promptTokens, completionTokens, totalTokens int) {
	if promptTokens == 0 && completionTokens == 0 && totalTokens == 0 {
		return
	}
	cost := session.NewCostBreakdown(m.model, promptTokens, completionTokens, totalTokens)

	m.mu.Lock()
	m.cost.Add(cost)
	m.mu.Unlock()
}

// addCostUnlocked adds cost without locking - caller must hold the lock.
func (m *Manager) addCostUnlocked(promptTokens, completionTokens, totalTokens int) {
	if promptTokens == 0 && completionTokens == 0 && totalTokens == 0 {
		return
	}
	cost := session.NewCostBreakdown(m.model, promptTokens, completionTokens, totalTokens)
	m.cost.Add(cost)
}

// GetSummaries returns a copy of the current summaries (for debugging/testing).
func (m *Manager) GetSummaries() []Summary {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]Summary, len(m.summaries))
	copy(result, m.summaries)
	return result
}

// GetWorkingMemory returns a copy of the current working memory (for debugging/testing).
func (m *Manager) GetWorkingMemory() []Interaction {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]Interaction, len(m.workingMemory))
	copy(result, m.workingMemory)
	return result
}
