package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/session"
	"go-research/internal/tools"
)

// Config for ReAct agent
type Config struct {
	MaxIterations int
	MaxTokens     int
	Verbose       bool
	BraveAPIKey   string
	LLMConfig     *config.Config
	WorkerNum     int // Worker number for event identification
	// Optional injected dependencies (for testing)
	Client llm.ChatClient
	Tools  tools.ToolExecutor
}

// DefaultConfig returns default agent configuration
func DefaultConfig(cfg *config.Config) Config {
	return Config{
		MaxIterations: cfg.MaxIterations,
		MaxTokens:     cfg.MaxTokens,
		Verbose:       cfg.Verbose,
		BraveAPIKey:   cfg.BraveAPIKey,
		LLMConfig:     cfg,
	}
}

// React implements the ReAct (Reason + Act) agent pattern
type React struct {
	config   Config
	bus      *events.Bus
	client   llm.ChatClient
	tools    tools.ToolExecutor
	messages []llm.Message
	tokens   int
	model    string
}

// NewReact creates a new ReAct agent
func NewReact(config Config, bus *events.Bus) *React {
	var client llm.ChatClient
	var toolsExec tools.ToolExecutor

	// Use injected dependencies if provided, otherwise create defaults
	if config.Client != nil {
		client = config.Client
	} else {
		client = llm.NewClient(config.LLMConfig)
	}

	if config.Tools != nil {
		toolsExec = config.Tools
	} else {
		toolsExec = tools.NewRegistry(config.BraveAPIKey)
	}

	return &React{
		config: config,
		bus:    bus,
		client: client,
		tools:  toolsExec,
		model:  config.LLMConfig.Model,
	}
}

// Research executes the ReAct loop for a query
func (r *React) Research(ctx context.Context, objective string) (session.WorkerContext, error) {
	workerCtx := session.WorkerContext{
		ID:             fmt.Sprintf("worker-%d", time.Now().UnixNano()),
		Objective:      objective,
		ToolsAvailable: r.tools.ToolNames(),
		StartedAt:      time.Now(),
		Status:         session.WorkerRunning,
	}

	// Track unique sources encountered by this worker
	sourceSet := make(map[string]struct{})
	addSources := func(urls ...string) {
		for _, url := range urls {
			url = strings.TrimSpace(url)
			if url == "" {
				continue
			}
			if _, exists := sourceSet[url]; exists {
				continue
			}
			sourceSet[url] = struct{}{}
			workerCtx.Sources = append(workerCtx.Sources, url)
		}
	}

	// Initialize messages with system prompt and user query
	r.messages = []llm.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: fmt.Sprintf("Research this topic: %s", objective)},
	}

	for i := 0; i < r.config.MaxIterations; i++ {
		r.bus.Publish(events.Event{
			Type: events.EventIterationStarted,
			Data: map[string]interface{}{
				"iteration":  i + 1,
				"worker_num": r.config.WorkerNum,
			},
		})

		// Get LLM response with streaming
		var content strings.Builder
		streamErr := r.client.StreamChat(ctx, r.messages, func(chunk string) error {
			content.WriteString(chunk)
			// Emit chunk event for live display
			r.bus.Publish(events.Event{
				Type: events.EventLLMChunk,
				Data: events.LLMChunkData{
					WorkerID:  workerCtx.ID,
					WorkerNum: r.config.WorkerNum,
					Chunk:     chunk,
					Done:      false,
				},
			})
			return nil
		})
		if streamErr != nil {
			errMsg := streamErr.Error()
			workerCtx.Error = &errMsg
			workerCtx.Status = session.WorkerFailed
			return workerCtx, fmt.Errorf("LLM call failed: %w", streamErr)
		}

		// Signal streaming complete for this iteration
		r.bus.Publish(events.Event{
			Type: events.EventLLMChunk,
			Data: events.LLMChunkData{
				WorkerID:  workerCtx.ID,
				WorkerNum: r.config.WorkerNum,
				Chunk:     "",
				Done:      true,
			},
		})

		contentStr := content.String()
		if contentStr == "" {
			errMsg := "empty response from LLM"
			workerCtx.Error = &errMsg
			workerCtx.Status = session.WorkerFailed
			return workerCtx, fmt.Errorf(errMsg)
		}

		// Estimate token usage (streaming doesn't provide usage stats directly)
		estimatedTokens := len(contentStr) / 4
		r.tokens += estimatedTokens
		workerCtx.Cost.TotalTokens += estimatedTokens
		workerCtx.Cost.OutputTokens += estimatedTokens

		// Calculate costs (estimate based on output tokens)
		_, outputCost, totalCost := llm.CalculateCost(r.model, 0, estimatedTokens)
		workerCtx.Cost.OutputCost += outputCost
		workerCtx.Cost.TotalCost += totalCost

		// Record iteration
		iter := session.ReActIteration{
			Number:    i + 1,
			Timestamp: time.Now(),
			Thought:   extractThought(contentStr),
			Action:    extractAction(contentStr),
		}

		// Check for final answer
		if hasAnswer(contentStr) {
			answer := extractAnswer(contentStr)
			workerCtx.FinalOutput = answer
			workerCtx.Status = session.WorkerComplete
			now := time.Now()
			workerCtx.CompletedAt = &now

			r.bus.Publish(events.Event{
				Type: events.EventAnswerFound,
				Data: map[string]string{"answer_preview": truncate(answer, 200)},
			})

			workerCtx.Iterations = append(workerCtx.Iterations, iter)
			return workerCtx, nil
		}

		// Parse and execute tool calls
		toolCalls := r.parseToolCalls(contentStr)
		if len(toolCalls) > 0 {
			for _, tc := range toolCalls {
				r.bus.Publish(events.Event{
					Type: events.EventToolCall,
					Data: events.ToolCallData{
						WorkerID:  workerCtx.ID,
						WorkerNum: r.config.WorkerNum,
						Tool:      tc.Tool,
						Args:      tc.Args,
					},
				})

				startTime := time.Now()
				result, toolErr := r.tools.Execute(ctx, tc.Tool, tc.Args)
				duration := time.Since(startTime)
				success := toolErr == nil

				if toolErr != nil {
					result = fmt.Sprintf("Error: %v", toolErr)
				}

				toolResult := session.ToolCall{
					Tool:      tc.Tool,
					Args:      tc.Args,
					Result:    result,
					Success:   success,
					Duration:  duration,
					Iteration: i + 1,
					Timestamp: time.Now(),
				}
				workerCtx.ToolCalls = append(workerCtx.ToolCalls, toolResult)
				iter.Result = result

				// Add assistant message and tool result to conversation
				r.messages = append(r.messages, llm.Message{
					Role:    "assistant",
					Content: contentStr,
				})
				r.messages = append(r.messages, llm.Message{
					Role:    "user",
					Content: fmt.Sprintf("Tool result for %s:\n%s", tc.Tool, result),
				})

				r.bus.Publish(events.Event{
					Type: events.EventToolResult,
					Data: events.ToolResultData{
						WorkerID: workerCtx.ID,
						Tool:     tc.Tool,
						Success:  success,
						Preview:  truncate(result, 200),
					},
				})

				// Collect sources from search and fetch tool usage
				switch tc.Tool {
				case "search":
					addSources(tools.ExtractURLs(result)...)
				case "fetch":
					if rawURL, ok := tc.Args["url"]; ok {
						if urlStr, ok := rawURL.(string); ok {
							addSources(urlStr)
						}
					}
				}
			}
		} else {
			// No tool calls, add to messages and continue
			r.messages = append(r.messages, llm.Message{
				Role:    "assistant",
				Content: contentStr,
			})
		}

		workerCtx.Iterations = append(workerCtx.Iterations, iter)

		// Check token budget
		if r.tokens > int(float64(r.config.MaxTokens)*0.9) {
			r.messages = append(r.messages, llm.Message{
				Role:    "system",
				Content: "Token budget nearly exhausted. Please provide your final answer now using <answer></answer> tags.",
			})
		}
	}

	// Max iterations reached
	workerCtx.Status = session.WorkerComplete
	workerCtx.FinalOutput = "Research concluded after maximum iterations."
	now := time.Now()
	workerCtx.CompletedAt = &now

	return workerCtx, nil
}

var answerRegex = regexp.MustCompile(`(?s)<answer>(.*?)</answer>`)

func hasAnswer(content string) bool {
	return answerRegex.MatchString(content)
}

func extractAnswer(content string) string {
	match := answerRegex.FindStringSubmatch(content)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	return content
}

// ToolCallParsed represents a parsed tool call from LLM response
type ToolCallParsed struct {
	Tool string
	Args map[string]interface{}
}

var toolRegex = regexp.MustCompile(`(?s)<tool\s+name="([^"]+)">\s*(\{.*?\})\s*</tool>`)

func (r *React) parseToolCalls(content string) []ToolCallParsed {
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
			continue
		}

		calls = append(calls, ToolCallParsed{
			Tool: toolName,
			Args: args,
		})
	}

	return calls
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

var thoughtRegex = regexp.MustCompile(`(?s)<thought>(.*?)</thought>`)

func extractThought(content string) string {
	match := thoughtRegex.FindStringSubmatch(content)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	// If no explicit thought tag, return first paragraph as thought
	paragraphs := strings.SplitN(content, "\n\n", 2)
	if len(paragraphs) > 0 {
		return truncate(strings.TrimSpace(paragraphs[0]), 500)
	}
	return ""
}

var actionRegex = regexp.MustCompile(`(?s)<action>(.*?)</action>`)

func extractAction(content string) string {
	match := actionRegex.FindStringSubmatch(content)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	// Check if there's a tool call
	if toolRegex.MatchString(content) {
		return "tool_call"
	}
	return ""
}
