package context

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/llm"
)

// FoldType represents the type of context folding operation.
type FoldType int

const (
	// FoldNone indicates no folding needed.
	FoldNone FoldType = iota
	// FoldGranular compresses latest interactions into L0 summary.
	FoldGranular
	// FoldDeep consolidates L0..Ln summaries into Ln+1.
	FoldDeep
)

// String returns a string representation of the fold type.
func (f FoldType) String() string {
	switch f {
	case FoldNone:
		return "NONE"
	case FoldGranular:
		return "GRANULAR"
	case FoldDeep:
		return "DEEP"
	default:
		return "UNKNOWN"
	}
}

// FoldDirective instructs the context manager on how to compress context.
type FoldDirective struct {
	Type        FoldType
	TargetLevel int
	Rationale   string
}

// ShouldFold checks if context needs compression based on token usage.
func (m *Manager) ShouldFold() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.maxTokens == 0 {
		return false
	}
	return float64(m.currentTokens)/float64(m.maxTokens) >= m.foldThreshold
}

// DecideFolding uses the LLM to determine the optimal folding strategy.
// If LLM call fails, defaults to granular folding.
func (m *Manager) DecideFolding(ctx context.Context) (FoldDirective, error) {
	m.mu.RLock()
	prompt := m.buildFoldingPrompt()
	m.mu.RUnlock()

	// If no client, default to granular folding
	if m.client == nil {
		return FoldDirective{Type: FoldGranular, Rationale: "default (no client)"}, nil
	}

	resp, err := m.client.Chat(ctx, []llm.Message{
		{Role: "system", Content: foldingSystemPrompt},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return FoldDirective{Type: FoldGranular, Rationale: "default (LLM error)"}, nil
	}

	// Use unlocked version since this is called from within Fold which holds the lock
	m.addCostUnlocked(resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	if len(resp.Choices) == 0 {
		return FoldDirective{Type: FoldGranular, Rationale: "default (empty response)"}, nil
	}

	return m.parseFoldingResponse(resp.Choices[0].Message.Content)
}

// Fold applies the folding directive to compress context.
func (m *Manager) Fold(ctx context.Context, directive FoldDirective) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	switch directive.Type {
	case FoldGranular:
		return m.foldGranular(ctx)
	case FoldDeep:
		return m.foldDeep(ctx, directive.TargetLevel)
	case FoldNone:
		return nil
	}
	return nil
}

// foldGranular compresses working memory into the finest-grained summary (L0).
func (m *Manager) foldGranular(ctx context.Context) error {
	if len(m.workingMemory) == 0 {
		return nil
	}

	// Format working memory for summarization
	content := m.formatWorkingMemory()

	// Summarize the content
	summary, err := m.summarize(ctx, content, "condense")
	if err != nil {
		// On error, just append raw content (truncated)
		summary = truncate(content, 1000)
	}

	// Record which turns this covers
	var coveredTurns []int
	for _, interaction := range m.workingMemory {
		coveredTurns = append(coveredTurns, interaction.TurnNum)
	}

	// Update L0 summary
	if m.summaries[0].Content != "" {
		m.summaries[0].Content += "\n\n" + summary
	} else {
		m.summaries[0].Content = summary
	}
	m.summaries[0].TokenCount = estimateTokens(m.summaries[0].Content)
	m.summaries[0].CoveredTurns = append(m.summaries[0].CoveredTurns, coveredTurns...)
	m.summaries[0].Timestamp = m.workingMemory[len(m.workingMemory)-1].Timestamp

	// Clear working memory
	m.workingMemory = m.workingMemory[:0]

	m.recalculateTokens()
	return nil
}

// foldDeep consolidates summaries from L0 to targetLevel into targetLevel+1.
func (m *Manager) foldDeep(ctx context.Context, targetLevel int) error {
	if targetLevel < 0 || targetLevel >= len(m.summaries)-1 {
		return fmt.Errorf("invalid target level: %d", targetLevel)
	}

	// Gather content from levels 0 to targetLevel
	var toConsolidate []string
	var allCoveredTurns []int

	for i := 0; i <= targetLevel && i < len(m.summaries); i++ {
		if m.summaries[i].Content != "" {
			toConsolidate = append(toConsolidate, fmt.Sprintf("[Level %d]\n%s", i, m.summaries[i].Content))
			allCoveredTurns = append(allCoveredTurns, m.summaries[i].CoveredTurns...)
		}
	}

	if len(toConsolidate) == 0 {
		return nil
	}

	// Consolidate into a coarser summary
	combined := strings.Join(toConsolidate, "\n\n---\n\n")
	consolidated, err := m.summarize(ctx, combined, "consolidate")
	if err != nil {
		// On error, just truncate
		consolidated = truncate(combined, 2000)
	}

	// Clear levels 0 to targetLevel
	for i := 0; i <= targetLevel && i < len(m.summaries); i++ {
		m.summaries[i] = Summary{Level: i}
	}

	// Add consolidated content to targetLevel+1
	nextLevel := targetLevel + 1
	if nextLevel < len(m.summaries) {
		if m.summaries[nextLevel].Content != "" {
			m.summaries[nextLevel].Content += "\n\n" + consolidated
		} else {
			m.summaries[nextLevel].Content = consolidated
		}
		m.summaries[nextLevel].TokenCount = estimateTokens(m.summaries[nextLevel].Content)
		m.summaries[nextLevel].CoveredTurns = append(m.summaries[nextLevel].CoveredTurns, allCoveredTurns...)
	}

	m.recalculateTokens()
	return nil
}

// formatWorkingMemory converts working memory to a string for summarization.
func (m *Manager) formatWorkingMemory() string {
	var parts []string
	for _, interaction := range m.workingMemory {
		parts = append(parts, fmt.Sprintf("[%s]: %s", interaction.Role, interaction.Content))
	}
	return strings.Join(parts, "\n\n")
}

// summarize uses the LLM to compress content.
func (m *Manager) summarize(ctx context.Context, content, mode string) (string, error) {
	if m.client == nil {
		return truncate(content, 500), nil
	}

	var prompt string
	switch mode {
	case "condense":
		prompt = fmt.Sprintf(`Condense the following research interactions into a brief summary preserving key facts, findings, and decisions. Be concise but retain important details.

Content:
%s

Summary:`, content)
	case "consolidate":
		prompt = fmt.Sprintf(`Consolidate these research summaries into a higher-level overview. Merge related information, remove redundancy, and preserve the most important insights.

Summaries:
%s

Consolidated overview:`, content)
	default:
		prompt = fmt.Sprintf("Summarize:\n%s", content)
	}

	resp, err := m.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", err
	}

	// Use unlocked version since this is called from within Fold which holds the lock
	m.addCostUnlocked(resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from LLM")
	}

	return resp.Choices[0].Message.Content, nil
}

// buildFoldingPrompt creates the prompt for the folding decision.
func (m *Manager) buildFoldingPrompt() string {
	var summaryInfo strings.Builder
	for i, s := range m.summaries {
		if s.Content != "" {
			summaryInfo.WriteString(fmt.Sprintf("- Level %d: %d tokens, covers %d turns\n", i, s.TokenCount, len(s.CoveredTurns)))
		} else {
			summaryInfo.WriteString(fmt.Sprintf("- Level %d: empty\n", i))
		}
	}

	return fmt.Sprintf(`Current context state:
- Token usage: %d / %d (%.1f%%)
- Working memory: %d interactions
- Summary levels:
%s

Decide the optimal folding strategy.`, m.currentTokens, m.maxTokens, float64(m.currentTokens)/float64(m.maxTokens)*100, len(m.workingMemory), summaryInfo.String())
}

// parseFoldingResponse parses the LLM response into a FoldDirective.
func (m *Manager) parseFoldingResponse(content string) (FoldDirective, error) {
	// Try to find JSON in the response
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}") + 1
	if start < 0 || end <= start {
		return FoldDirective{Type: FoldGranular, Rationale: "default (no JSON)"}, nil
	}

	var response struct {
		Type        string `json:"type"`
		TargetLevel int    `json:"target_level"`
		Rationale   string `json:"rationale"`
	}

	if err := json.Unmarshal([]byte(content[start:end]), &response); err != nil {
		return FoldDirective{Type: FoldGranular, Rationale: "default (parse error)"}, nil
	}

	directive := FoldDirective{
		TargetLevel: response.TargetLevel,
		Rationale:   response.Rationale,
	}

	switch strings.ToUpper(response.Type) {
	case "NONE":
		directive.Type = FoldNone
	case "GRANULAR":
		directive.Type = FoldGranular
	case "DEEP":
		directive.Type = FoldDeep
	default:
		directive.Type = FoldGranular
		directive.Rationale = "default (unknown type: " + response.Type + ")"
	}

	return directive, nil
}

const foldingSystemPrompt = `You are a context management assistant. Analyze the current context state and decide the optimal folding strategy.

Options:
- NONE: Keep working memory as-is (use when plenty of token budget remains)
- GRANULAR: Compress recent interactions into fine-grained summary (use when working memory is full but summaries have room)
- DEEP: Consolidate multiple summary levels into coarser abstraction (use when completing a subtask or changing research direction)

Consider:
1. Current token usage percentage
2. How full the working memory is
3. Whether summaries at different levels have content
4. Whether the research is transitioning between phases

Respond with JSON only: {"type": "NONE|GRANULAR|DEEP", "target_level": 0-2, "rationale": "brief reason"}`
