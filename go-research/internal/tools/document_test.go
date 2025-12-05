package tools

import (
	"context"
	"strings"
	"testing"
)

func TestDocumentReadTool_Name(t *testing.T) {
	tool := NewDocumentReadTool()
	if tool.Name() != "read_document" {
		t.Errorf("expected name 'read_document', got '%s'", tool.Name())
	}
}

func TestDocumentReadTool_Description(t *testing.T) {
	tool := NewDocumentReadTool()
	if tool.Description() == "" {
		t.Error("description should not be empty")
	}
}

func TestDocumentReadTool_Execute_MissingPath(t *testing.T) {
	tool := NewDocumentReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{})
	if err == nil {
		t.Error("expected error for missing path")
	}
}

func TestDocumentReadTool_Execute_UnsupportedFormat(t *testing.T) {
	tool := NewDocumentReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/path/to/file.txt",
	})
	if err == nil {
		t.Error("expected error for unsupported format")
	}
	if !strings.Contains(err.Error(), "unsupported file format") {
		t.Errorf("expected 'unsupported file format' error, got: %v", err)
	}
}

func TestDocumentReadTool_Execute_DetectsPDF(t *testing.T) {
	tool := NewDocumentReadTool()
	// This will fail with "file not found" which proves PDF detection worked
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.pdf",
	})
	if err == nil {
		t.Error("expected error")
	}
	// PDF tool returns "file not found" which proves correct routing
	if !strings.Contains(err.Error(), "file not found") {
		t.Errorf("expected 'file not found' error (proving PDF routing), got: %v", err)
	}
}

func TestDocumentReadTool_Execute_DetectsDOCX(t *testing.T) {
	tool := NewDocumentReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.docx",
	})
	if err == nil {
		t.Error("expected error")
	}
	// DOCX tool returns "file not found" which proves correct routing
	if !strings.Contains(err.Error(), "file not found") {
		t.Errorf("expected 'file not found' error (proving DOCX routing), got: %v", err)
	}
}

func TestDocumentReadTool_Execute_DetectsXLSX(t *testing.T) {
	tool := NewDocumentReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.xlsx",
	})
	if err == nil {
		t.Error("expected error")
	}
	// XLSX tool returns "file not found" which proves correct routing
	if !strings.Contains(err.Error(), "file not found") {
		t.Errorf("expected 'file not found' error (proving XLSX routing), got: %v", err)
	}
}

func TestDocumentReadTool_Execute_CaseInsensitiveExtension(t *testing.T) {
	tool := NewDocumentReadTool()

	// Test uppercase PDF
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.PDF",
	})
	if err == nil || !strings.Contains(err.Error(), "file not found") {
		t.Error("expected PDF tool to handle .PDF extension")
	}

	// Test mixed case DOCX
	_, err = tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.DocX",
	})
	if err == nil || !strings.Contains(err.Error(), "file not found") {
		t.Error("expected DOCX tool to handle .DocX extension")
	}

	// Test uppercase XLSX
	_, err = tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.XLSX",
	})
	if err == nil || !strings.Contains(err.Error(), "file not found") {
		t.Error("expected XLSX tool to handle .XLSX extension")
	}
}
