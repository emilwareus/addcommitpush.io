package tools

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/xuri/excelize/v2"
)

func TestXLSXReadTool_Name(t *testing.T) {
	tool := NewXLSXReadTool()
	if tool.Name() != "read_xlsx" {
		t.Errorf("expected name 'read_xlsx', got '%s'", tool.Name())
	}
}

func TestXLSXReadTool_Description(t *testing.T) {
	tool := NewXLSXReadTool()
	if tool.Description() == "" {
		t.Error("description should not be empty")
	}
}

func TestXLSXReadTool_Execute_MissingPath(t *testing.T) {
	tool := NewXLSXReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{})
	if err == nil {
		t.Error("expected error for missing path")
	}
}

func TestXLSXReadTool_Execute_FileNotFound(t *testing.T) {
	tool := NewXLSXReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/does/not/exist.xlsx",
	})
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
	if !strings.Contains(err.Error(), "file not found") {
		t.Errorf("expected 'file not found' error, got: %v", err)
	}
}

func TestXLSXReadTool_Execute_RealFile(t *testing.T) {
	tmpDir := t.TempDir()
	tmpFile := filepath.Join(tmpDir, "sample.xlsx")

	f := excelize.NewFile()
	defer func() {
		_ = f.Close()
	}()

	f.SetCellValue("Sheet1", "A1", "Hello")
	f.SetCellValue("Sheet1", "B2", 123)
	f.NewSheet("Summary")
	f.SetCellValue("Summary", "A1", "Total")
	f.SetCellValue("Summary", "B1", 42)

	if err := f.SaveAs(tmpFile); err != nil {
		t.Fatalf("failed saving test workbook: %v", err)
	}

	tool := NewXLSXReadTool()
	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": tmpFile,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(result, "Hello") || !strings.Contains(result, "Summary") {
		t.Errorf("expected output to include workbook content, got:\n%s", result)
	}
}

func TestXLSXReadTool_Execute_AMDataset(t *testing.T) {
	tool := NewXLSXReadTool()
	excelPath := datasetPath(t)

	if _, err := os.Stat(excelPath); os.IsNotExist(err) {
		t.Skipf("sample dataset not found at %s", excelPath)
	}

	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": excelPath,
	})
	if err != nil {
		t.Fatalf("unexpected error reading dataset: %v", err)
	}

	preview := result
	if len(preview) > 200 {
		preview = preview[:200]
	}

	if !strings.Contains(result, "Arbetslösa 15-74 år") {
		t.Fatalf("expected dataset heading in output, got: %s", preview)
	}

	if !strings.Contains(result, "52.7") || !strings.Contains(result, "71.8") {
		t.Fatalf("expected dataset numeric values (52.7, 71.8), got: %s", preview)
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
			t.Fatalf("go.mod not found from %s", dir)
		}
		dir = parent
	}
}
