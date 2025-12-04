package agents

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/think_deep"
	"go-research/internal/tools"

	"github.com/joho/godotenv"
)

type loggedToolCall struct {
	name string
	args map[string]interface{}
}

type loggingToolExecutor struct {
	exec  tools.ToolExecutor
	calls []loggedToolCall
}

func (l *loggingToolExecutor) Execute(ctx context.Context, name string, args map[string]interface{}) (string, error) {
	argCopy := make(map[string]interface{}, len(args))
	for k, v := range args {
		argCopy[k] = v
	}
	l.calls = append(l.calls, loggedToolCall{name: name, args: argCopy})
	return l.exec.Execute(ctx, name, args)
}

func (l *loggingToolExecutor) ToolNames() []string {
	return l.exec.ToolNames()
}

// To run this integration test (requires real OPENROUTER_API_KEY + BRAVE_API_KEY):
//
//	go test -run TestSubResearcher_UsesDocumentReaderOnAMDataset -timeout 30m ./internal/agents -v
func TestSubResearcher_UsesDocumentReaderOnAMDataset(t *testing.T) {
	// Load .env from repo root explicitly
	root := repoRoot(t)
	envPath := filepath.Join(root, ".env")
	if err := godotenv.Load(envPath); err != nil {
		t.Logf("Note: .env file not found at %s (will use environment variables): %v", envPath, err)
	}

	cfg := config.Load()
	cfg.OpenRouterAPIKey = strings.TrimSpace(cfg.OpenRouterAPIKey)
	cfg.BraveAPIKey = strings.TrimSpace(cfg.BraveAPIKey)
	if cfg.OpenRouterAPIKey == "" {
		t.Fatalf("OPENROUTER_API_KEY must be set (can be placed in %s)", envPath)
	}
	if cfg.BraveAPIKey == "" {
		t.Fatalf("BRAVE_API_KEY must be set (can be placed in %s)", envPath)
	}

	dataset := datasetPath(t)

	client := llm.NewClient(cfg)
	registry := think_deep.SubResearcherToolRegistry(cfg.BraveAPIKey, client)
	loggingRegistry := &loggingToolExecutor{exec: registry}

	bus := events.NewBus(32)
	defer bus.Close()

	agent := NewSubResearcherAgent(client, loggingRegistry, bus, DefaultSubResearcherConfig())

	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Minute)
	defer cancel()

	query := fmt.Sprintf(
		"MANDATORY TASK: You MUST call the read_document tool immediately. "+
			"This is NOT optional - you cannot answer without calling the tool.\n\n"+
			"File location: %s\n\n"+
			"EXACT TOOL CALL REQUIRED:\n"+
			"<tool name=\"read_document\">{\"path\": \"%s\"}</tool>\n\n"+
			"After calling read_document, extract from the Excel file:\n"+
			"- Unemployment numbers for 'inrikes födda men' (domestic-born males) ages 15-24\n"+
			"- Values for years 2005 and 2024\n"+
			"- Report the exact numbers you see in the spreadsheet\n\n"+
			"CRITICAL: You MUST make the tool call above. Do NOT skip it. Do NOT answer from memory.",
		dataset, dataset,
	)

	result, err := agent.Research(ctx, query, 1)
	if err != nil {
		t.Fatalf("sub researcher failed: %v", err)
	}

	if result == nil || result.CompressedResearch == "" {
		t.Fatalf("expected non-empty compressed research result")
	}

	// Log all tool calls and raw notes for debugging
	t.Logf("Tool calls made: %d", len(loggingRegistry.calls))
	for i, call := range loggingRegistry.calls {
		t.Logf("  Call %d: %s with args: %+v", i+1, call.name, call.args)
	}
	t.Logf("Raw notes count: %d", len(result.RawNotes))
	for i, note := range result.RawNotes {
		preview := note
		if len(preview) > 200 {
			preview = preview[:200] + "..."
		}
		t.Logf("  Raw note %d: %s", i+1, preview)
	}

	// Fail immediately if no tool calls were made - agent didn't follow instructions
	if len(loggingRegistry.calls) == 0 {
		t.Fatalf("CRITICAL: Agent made ZERO tool calls. This means it didn't follow instructions to use read_document. Compressed research: %s", result.CompressedResearch)
	}

	var readDocUsed bool
	var readDocPath string
	for _, call := range loggingRegistry.calls {
		if call.name == "read_document" {
			if path, ok := call.args["path"].(string); ok {
				readDocPath = path
				if filepath.Clean(path) == filepath.Clean(dataset) {
					readDocUsed = true
					break
				}
			}
		}
	}

	if !readDocUsed {
		t.Logf("Compressed research output:\n%s", result.CompressedResearch)
		if readDocPath != "" {
			t.Fatalf("read_document was called but with wrong path. Expected: %s, Got: %s. All calls: %#v", dataset, readDocPath, loggingRegistry.calls)
		}
		t.Fatalf("expected read_document tool to be invoked with dataset %s, but it was never called. All calls: %#v", dataset, loggingRegistry.calls)
	}

	if !strings.Contains(result.CompressedResearch, "52.7") {
		t.Fatalf("expected compressed research to include concrete numbers from dataset (e.g., 52.7). got:\n%s", result.CompressedResearch)
	}
}

func datasetPath(t *testing.T) string {
	t.Helper()
	root := repoRoot(t)
	return filepath.Join(root, "internal", "data", "AM0401U1_20251204-100847.xlsx")
}

func repoRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd failed: %v", err)
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatalf("could not locate go.mod starting from %s", dir)
		}
		dir = parent
	}
}
