package context

import (
	"fmt"
	"time"

	"go-research/internal/llm"
)

// BuildMessages constructs the message array for LLM calls, incorporating
// summaries from coarsest to finest, working memory, and the current query.
func (m *Manager) BuildMessages(systemPrompt, userQuery string) []llm.Message {
	m.mu.RLock()
	defer m.mu.RUnlock()

	messages := []llm.Message{
		{Role: "system", Content: systemPrompt},
	}

	// Add summaries from coarsest to finest (provides hierarchical context)
	for i := len(m.summaries) - 1; i >= 0; i-- {
		if m.summaries[i].Content != "" {
			messages = append(messages, llm.Message{
				Role:    "system",
				Content: fmt.Sprintf("[Research Context L%d]\n%s", i, m.summaries[i].Content),
			})
		}
	}

	// Add tool memory summary if present
	if len(m.toolMemory) > 0 {
		toolSummary := m.formatToolMemory()
		if toolSummary != "" {
			messages = append(messages, llm.Message{
				Role:    "system",
				Content: fmt.Sprintf("[Tool History]\n%s", toolSummary),
			})
		}
	}

	// Add working memory (recent uncompressed interactions)
	for _, interaction := range m.workingMemory {
		messages = append(messages, llm.Message{
			Role:    interaction.Role,
			Content: interaction.Content,
		})
	}

	// Add current query
	if userQuery != "" {
		messages = append(messages, llm.Message{
			Role:    "user",
			Content: userQuery,
		})
	}

	return messages
}

// AddInteraction records a new interaction to working memory.
func (m *Manager) AddInteraction(role, content string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.turnNumber++
	tokens := estimateTokens(content)

	m.workingMemory = append(m.workingMemory, Interaction{
		Role:      role,
		Content:   content,
		Tokens:    tokens,
		TurnNum:   m.turnNumber,
		Timestamp: time.Now(),
	})
	m.currentTokens += tokens

	// Trim working memory if over size (FIFO)
	for len(m.workingMemory) > m.workingMemSize {
		m.currentTokens -= m.workingMemory[0].Tokens
		m.workingMemory = m.workingMemory[1:]
	}
}

// AddToolResult records a tool execution result.
func (m *Manager) AddToolResult(tool, result string, findings []string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	summary := m.toolMemory[tool]
	summary.Tool = tool
	summary.CallCount++
	summary.LastResult = truncate(result, 500)

	// Append new findings (deduplicated)
	existingFindings := make(map[string]bool)
	for _, f := range summary.KeyFindings {
		existingFindings[f] = true
	}
	for _, f := range findings {
		if !existingFindings[f] {
			summary.KeyFindings = append(summary.KeyFindings, f)
			existingFindings[f] = true
		}
	}

	m.toolMemory[tool] = summary
	m.recalculateTokens()
}

// formatToolMemory creates a string summary of tool usage.
func (m *Manager) formatToolMemory() string {
	if len(m.toolMemory) == 0 {
		return ""
	}

	var result string
	for _, ts := range m.toolMemory {
		result += fmt.Sprintf("- %s: called %d times\n", ts.Tool, ts.CallCount)
		if len(ts.KeyFindings) > 0 {
			result += "  Key findings:\n"
			for _, f := range ts.KeyFindings {
				result += fmt.Sprintf("    * %s\n", truncate(f, 100))
			}
		}
	}
	return result
}

// estimateTokens provides a rough token count estimate (chars/4 approximation).
func estimateTokens(s string) int {
	if len(s) == 0 {
		return 0
	}
	return len(s) / 4
}

// truncate shortens a string to n characters with ellipsis.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	if n <= 3 {
		return s[:n]
	}
	return s[:n-3] + "..."
}

// WorkingMemorySize returns the current number of interactions in working memory.
func (m *Manager) WorkingMemorySize() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.workingMemory)
}

// WorkingMemoryCapacity returns the maximum working memory size.
func (m *Manager) WorkingMemoryCapacity() int {
	return m.workingMemSize
}

// TokenUsagePercent returns the current token usage as a percentage.
func (m *Manager) TokenUsagePercent() float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.maxTokens == 0 {
		return 0
	}
	return float64(m.currentTokens) / float64(m.maxTokens) * 100
}
