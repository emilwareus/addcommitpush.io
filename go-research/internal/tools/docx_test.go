package tools

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestDOCXReadTool_Name(t *testing.T) {
	tool := NewDOCXReadTool()
	if tool.Name() != "read_docx" {
		t.Errorf("expected name 'read_docx', got '%s'", tool.Name())
	}
}

func TestDOCXReadTool_Description(t *testing.T) {
	tool := NewDOCXReadTool()
	if tool.Description() == "" {
		t.Error("description should not be empty")
	}
}

func TestDOCXReadTool_Execute_MissingPath(t *testing.T) {
	tool := NewDOCXReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{})
	if err == nil {
		t.Error("expected error for missing path")
	}
}

func TestDOCXReadTool_Execute_FileNotFound(t *testing.T) {
	tool := NewDOCXReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.docx",
	})
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

// Integration test with a real DOCX file
func TestDOCXReadTool_Execute_RealFile(t *testing.T) {
	testDOCX := filepath.Join("testdata", "sample.docx")
	if _, err := os.Stat(testDOCX); os.IsNotExist(err) {
		t.Skip("no test DOCX file available")
	}

	tool := NewDOCXReadTool()
	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": testDOCX,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == "" {
		t.Error("expected non-empty result")
	}
}
