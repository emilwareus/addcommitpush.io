package tools

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestPDFReadTool_Name(t *testing.T) {
	tool := NewPDFReadTool()
	if tool.Name() != "read_pdf" {
		t.Errorf("expected name 'read_pdf', got '%s'", tool.Name())
	}
}

func TestPDFReadTool_Description(t *testing.T) {
	tool := NewPDFReadTool()
	if tool.Description() == "" {
		t.Error("description should not be empty")
	}
}

func TestPDFReadTool_Execute_MissingPath(t *testing.T) {
	tool := NewPDFReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{})
	if err == nil {
		t.Error("expected error for missing path")
	}
}

func TestPDFReadTool_Execute_FileNotFound(t *testing.T) {
	tool := NewPDFReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.pdf",
	})
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

// Integration test with a real PDF file
func TestPDFReadTool_Execute_RealFile(t *testing.T) {
	// Skip if no test PDF available
	testPDF := filepath.Join("testdata", "sample.pdf")
	if _, err := os.Stat(testPDF); os.IsNotExist(err) {
		t.Skip("no test PDF file available")
	}

	tool := NewPDFReadTool()
	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": testPDF,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == "" {
		t.Error("expected non-empty result")
	}
}
