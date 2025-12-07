// Package runtime implements the ThinkDepth.ai "Self-Balancing Test-Time
// Diffusion Deep Research" architecture.
//
// This file contains tool implementations specific to the ThinkDeep workflow,
// including the think tool, conduct_research delegation, draft refinement, and
// research completion signaling.
package runtime

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"go-research/internal/llm"
	"go-research/internal/tools"
)

// ToolCallParsed represents a parsed tool call from LLM response.
// Tool calls use XML-style tags: <tool name="toolname">{"arg": "value"}</tool>
type ToolCallParsed struct {
	Tool string
	Args map[string]interface{}
}

// toolRegex matches tool calls in the format <tool name="name">{json}</tool>
var toolRegex = regexp.MustCompile(`(?s)<tool\s+name="([^"]+)">\s*(\{.*?\})\s*</tool>`)

// ParseToolCalls extracts tool calls from LLM response content.
// Returns all tool calls found in the content.
func ParseToolCalls(content string) []ToolCallParsed {
	matches := toolRegex.FindAllStringSubmatch(content, -1)
	var calls []ToolCallParsed

	for _, match := range matches {
		if len(match) < 3 {
			continue
		}

		toolName := match[1]
		argsJSON := match[2]

		var args map[string]interface{}
		if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
			// Skip malformed JSON
			continue
		}

		calls = append(calls, ToolCallParsed{
			Tool: toolName,
			Args: args,
		})
	}

	return calls
}

// HasToolCall checks if a specific tool was called in the response.
func HasToolCall(content, toolName string) bool {
	calls := ParseToolCalls(content)
	for _, call := range calls {
		if call.Tool == toolName {
			return true
		}
	}
	return false
}

// ThinkTool provides strategic reflection capability for agents.
// This is a no-op tool that simply acknowledges the reflection.
// The reflection content is preserved in the conversation for the model to learn from.
//
// Original: think_tool in utils.py
type ThinkTool struct{}

// Ensure ThinkTool implements the Tool interface
var _ tools.Tool = (*ThinkTool)(nil)

func (t *ThinkTool) Name() string {
	return "think"
}

func (t *ThinkTool) Description() string {
	return `Strategic reflection on research progress. Use after each search to analyze results and plan next steps.
Args: {"reflection": "Your detailed reflection on findings, gaps, and next steps"}`
}

func (t *ThinkTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	reflection, ok := args["reflection"].(string)
	if !ok || reflection == "" {
		return "Reflection recorded.", nil
	}
	// Simply acknowledge the reflection - the content is already in the conversation
	return fmt.Sprintf("Reflection recorded: %s", truncateString(reflection, 100)), nil
}

// ResearchCompleteTool signals that research is complete.
// This should only be used when findings are comprehensive.
//
// Original: ResearchComplete in state_multi_agent_supervisor.py
type ResearchCompleteTool struct{}

var _ tools.Tool = (*ResearchCompleteTool)(nil)

func (t *ResearchCompleteTool) Name() string {
	return "research_complete"
}

func (t *ResearchCompleteTool) Description() string {
	return `Signal that research is complete. Use only when findings are comprehensive.
CRITICAL: Do not call this based on draft report appearance - only when research findings are complete.
Args: {}`
}

func (t *ResearchCompleteTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	return "Research marked as complete. Proceeding to final report generation.", nil
}

// RefineDraftTool updates the draft report with new findings.
// This tool requires an LLM client and supervisor state to operate.
//
// Original: refine_draft_report in utils.py
type RefineDraftTool struct {
	client llm.ChatClient
	state  *SupervisorState
}

var _ tools.Tool = (*RefineDraftTool)(nil)

// NewRefineDraftTool creates a new refine draft tool with the given dependencies.
func NewRefineDraftTool(client llm.ChatClient, state *SupervisorState) *RefineDraftTool {
	return &RefineDraftTool{
		client: client,
		state:  state,
	}
}

func (t *RefineDraftTool) Name() string {
	return "refine_draft"
}

func (t *RefineDraftTool) Description() string {
	return `Refine the draft report with accumulated research findings.
Call this after conducting research to incorporate new information into the draft.
Args: {}`
}

func (t *RefineDraftTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	if t.client == nil {
		return "", fmt.Errorf("refine_draft tool requires an LLM client")
	}
	if t.state == nil {
		return "", fmt.Errorf("refine_draft tool requires supervisor state")
	}

	// Build findings from accumulated notes
	findings := strings.Join(t.state.Notes, "\n---\n")
	if findings == "" {
		return "No new findings to incorporate. Continue researching.", nil
	}

	// Generate refinement prompt
	prompt := RefineDraftPrompt(t.state.ResearchBrief, t.state.DraftReport, findings)

	resp, err := t.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", fmt.Errorf("refine draft LLM call: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from LLM")
	}

	refinedDraft := resp.Choices[0].Message.Content

	// Update state with refined draft
	t.state.UpdateDraft(refinedDraft)

	return fmt.Sprintf("Draft refined with %d research findings incorporated.", len(t.state.Notes)), nil
}

// ConductResearchCallback is a function type for delegating research to sub-agents.
type ConductResearchCallback func(ctx context.Context, topic string) (string, error)

// ConductResearchTool delegates research tasks to specialized sub-agents.
// This tool requires a callback function that executes the sub-researcher.
//
// Original: ConductResearch in state_multi_agent_supervisor.py
type ConductResearchTool struct {
	callback ConductResearchCallback
}

var _ tools.Tool = (*ConductResearchTool)(nil)

// NewConductResearchTool creates a new conduct research tool with the given callback.
func NewConductResearchTool(callback ConductResearchCallback) *ConductResearchTool {
	return &ConductResearchTool{
		callback: callback,
	}
}

func (t *ConductResearchTool) Name() string {
	return "conduct_research"
}

func (t *ConductResearchTool) Description() string {
	return `Delegate a research task to a specialized sub-agent.
The sub-agent will search the web and compile findings on the specified topic.
Args: {"research_topic": "Detailed paragraph describing what to research"}`
}

func (t *ConductResearchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	if t.callback == nil {
		return "", fmt.Errorf("conduct_research tool requires a callback")
	}

	topic, ok := args["research_topic"].(string)
	if !ok || topic == "" {
		return "", fmt.Errorf("conduct_research requires a 'research_topic' argument")
	}

	return t.callback(ctx, topic)
}

// SupervisorToolRegistry creates a tool registry for the supervisor agent.
// This includes all tools available to the supervisor during the diffusion loop.
func SupervisorToolRegistry(
	client llm.ChatClient,
	state *SupervisorState,
	conductResearchCallback ConductResearchCallback,
) *tools.Registry {
	registry := tools.NewEmptyRegistry()

	// Register supervisor-specific tools
	registry.Register(&ThinkTool{})
	registry.Register(&ResearchCompleteTool{})
	registry.Register(NewRefineDraftTool(client, state))
	registry.Register(NewConductResearchTool(conductResearchCallback))

	return registry
}

// SubResearcherToolRegistry creates a tool registry for sub-researcher agents.
// This includes search (with optional summarization), fetch, document reading, CSV analysis, and think tools.
// If client is provided, search results will include LLM-generated summaries of page content.
func SubResearcherToolRegistry(braveAPIKey string, client ...llm.ChatClient) *tools.Registry {
	registry := tools.NewEmptyRegistry()

	// Create search tool with optional summarization
	searchTool := tools.NewSearchTool(braveAPIKey)
	if len(client) > 0 && client[0] != nil {
		summarizer := tools.NewContentSummarizer(client[0])
		searchTool.SetSummarizer(summarizer)
	}
	registry.Register(searchTool)

	// Add fetch tool (for direct URL fetching if needed)
	registry.Register(tools.NewFetchTool())

	// Add document reading tools
	registry.Register(tools.NewDocumentReadTool())

	// Add CSV analysis tool
	registry.Register(tools.NewCSVAnalysisTool())

	// Add think tool for reflection
	registry.Register(&ThinkTool{})

	return registry
}

// truncateString truncates a string to the specified length.
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// FilterThinkToolCalls removes think tool calls from messages.
// This is used during compression to exclude internal reflections.
func FilterThinkToolCalls(content string) string {
	// Match think tool calls and remove them
	thinkRegex := regexp.MustCompile(`(?s)<tool\s+name="think">\s*\{[^}]*\}\s*</tool>`)
	filtered := thinkRegex.ReplaceAllString(content, "")

	// Also filter out "Reflection recorded:" lines from tool results
	lines := strings.Split(filtered, "\n")
	var filteredLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "Reflection recorded:") {
			continue
		}
		filteredLines = append(filteredLines, line)
	}

	return strings.TrimSpace(strings.Join(filteredLines, "\n"))
}
