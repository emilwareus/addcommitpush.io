package orchestrator

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"go-research/internal/llm"
)

// Task represents a research sub-task for a worker
type Task struct {
	ID             string
	WorkerNum      int
	Objective      string
	Tools          []string
	ExpectedOutput string
}

// Planner handles query analysis and task decomposition
type Planner struct {
	client llm.ChatClient
}

// NewPlanner creates a new planner
func NewPlanner(client llm.ChatClient) *Planner {
	return &Planner{client: client}
}

// AnalyzeComplexity returns a score from 0.0 to 1.0
func (p *Planner) AnalyzeComplexity(ctx context.Context, query string) (float64, error) {
	prompt := fmt.Sprintf(`Analyze the complexity of this research query and return a score from 0.0 to 1.0.

Query: %s

Consider:
- How many distinct sub-topics need to be researched?
- How specialized is the domain?
- How much synthesis is required?

Return ONLY a JSON object: {"score": 0.X, "reason": "brief explanation"}`, query)

	resp, err := p.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return 0.5, fmt.Errorf("complexity analysis: %w", err)
	}

	if len(resp.Choices) == 0 {
		return 0.5, fmt.Errorf("empty response from LLM")
	}

	content := resp.Choices[0].Message.Content

	var result struct {
		Score  float64 `json:"score"`
		Reason string  `json:"reason"`
	}

	// Extract JSON from response
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}") + 1
	if start >= 0 && end > start {
		if err := json.Unmarshal([]byte(content[start:end]), &result); err != nil {
			return 0.5, nil // Default to medium complexity
		}
		return result.Score, nil
	}

	return 0.5, nil
}

// CreatePlan decomposes a query into tasks for workers
func (p *Planner) CreatePlan(ctx context.Context, query string, numWorkers int) ([]Task, error) {
	prompt := fmt.Sprintf(`Decompose this research query into %d parallel research tasks.

Query: %s

Return ONLY a JSON array of tasks:
[
  {"objective": "Research aspect 1", "expected_output": "What this worker should produce"},
  {"objective": "Research aspect 2", "expected_output": "What this worker should produce"}
]

Each task should:
- Be independently researchable
- Cover a distinct aspect of the query
- Have a clear objective and expected output`, numWorkers, query)

	resp, err := p.client.Chat(ctx, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, fmt.Errorf("plan creation: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("empty response from LLM")
	}

	content := resp.Choices[0].Message.Content

	var taskDefs []struct {
		Objective      string `json:"objective"`
		ExpectedOutput string `json:"expected_output"`
	}

	// Extract JSON array from response
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]") + 1
	if start >= 0 && end > start {
		if err := json.Unmarshal([]byte(content[start:end]), &taskDefs); err != nil {
			return nil, fmt.Errorf("parse plan: %w", err)
		}
	}

	tasks := make([]Task, len(taskDefs))
	for i, td := range taskDefs {
		tasks[i] = Task{
			ID:             fmt.Sprintf("task-%d", i+1),
			WorkerNum:      i + 1,
			Objective:      td.Objective,
			Tools:          []string{"search", "fetch"},
			ExpectedOutput: td.ExpectedOutput,
		}
	}

	return tasks, nil
}
