package runtime

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestSubResearcherToolRegistry_HasAllTools(t *testing.T) {
	// Use empty API key for test (search won't actually be called)
	registry := SubResearcherToolRegistry("")

	expectedTools := []string{
		"search",
		"fetch",
		"read_document",
		"analyze_csv",
		"think",
	}

	registeredTools := registry.ToolNames()

	for _, expected := range expectedTools {
		found := false
		for _, registered := range registeredTools {
			if registered == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("missing expected tool: %s", expected)
		}
	}
}

func TestSubResearcherToolRegistry_ExecuteDocumentTool(t *testing.T) {
	registry := SubResearcherToolRegistry("")

	// Test that read_document tool exists and can be executed (will fail on missing file)
	_, err := registry.Execute(context.Background(), "read_document", map[string]interface{}{
		"path": "/nonexistent/file.pdf",
	})

	// We expect a "file not found" error, which proves the tool was found and executed
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestSubResearcherToolRegistry_ExecuteCSVTool(t *testing.T) {
	registry := SubResearcherToolRegistry("")

	// Create temp CSV
	tmpDir := t.TempDir()
	csvPath := filepath.Join(tmpDir, "test.csv")
	csvContent := "a,b\n1,2\n3,4\n"
	if err := os.WriteFile(csvPath, []byte(csvContent), 0644); err != nil {
		t.Fatalf("failed to create test CSV: %v", err)
	}

	result, err := registry.Execute(context.Background(), "analyze_csv", map[string]interface{}{
		"path": csvPath,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == "" {
		t.Error("expected non-empty result")
	}
}

func TestSubResearcherToolRegistry_ExecuteThinkTool(t *testing.T) {
	registry := SubResearcherToolRegistry("")

	result, err := registry.Execute(context.Background(), "think", map[string]interface{}{
		"reflection": "Testing think tool integration",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == "" {
		t.Error("expected non-empty result")
	}
}

func TestSubResearcherToolRegistry_UnknownTool(t *testing.T) {
	registry := SubResearcherToolRegistry("")

	_, err := registry.Execute(context.Background(), "nonexistent_tool", map[string]interface{}{})
	if err == nil {
		t.Error("expected error for unknown tool")
	}
}
