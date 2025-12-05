package tools

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCSVAnalysisTool_Name(t *testing.T) {
	tool := NewCSVAnalysisTool()
	if tool.Name() != "analyze_csv" {
		t.Errorf("expected name 'analyze_csv', got '%s'", tool.Name())
	}
}

func TestCSVAnalysisTool_Description(t *testing.T) {
	tool := NewCSVAnalysisTool()
	if tool.Description() == "" {
		t.Error("description should not be empty")
	}
}

func TestCSVAnalysisTool_Execute_MissingPath(t *testing.T) {
	tool := NewCSVAnalysisTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{})
	if err == nil {
		t.Error("expected error for missing path")
	}
}

func TestCSVAnalysisTool_Execute_FileNotFound(t *testing.T) {
	tool := NewCSVAnalysisTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.csv",
	})
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestCSVAnalysisTool_Execute_SimpleCSV(t *testing.T) {
	// Create temp CSV file
	tmpDir := t.TempDir()
	csvPath := filepath.Join(tmpDir, "test.csv")

	csvContent := `name,age,score
Alice,30,85.5
Bob,25,92.3
Charlie,35,78.9
Diana,28,88.0
`
	if err := os.WriteFile(csvPath, []byte(csvContent), 0644); err != nil {
		t.Fatalf("failed to create test CSV: %v", err)
	}

	tool := NewCSVAnalysisTool()
	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": csvPath,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify report contains expected sections
	if !strings.Contains(result, "## Shape") {
		t.Error("report missing Shape section")
	}
	if !strings.Contains(result, "## Columns") {
		t.Error("report missing Columns section")
	}
	if !strings.Contains(result, "## Summary Statistics") {
		t.Error("report missing Summary Statistics section")
	}
	if !strings.Contains(result, "Rows: 4") {
		t.Error("incorrect row count")
	}
	if !strings.Contains(result, "Columns: 3") {
		t.Error("incorrect column count")
	}
}

func TestCSVAnalysisTool_Execute_WithGoal(t *testing.T) {
	tmpDir := t.TempDir()
	csvPath := filepath.Join(tmpDir, "test.csv")

	csvContent := `x,y
1,2
3,4
`
	if err := os.WriteFile(csvPath, []byte(csvContent), 0644); err != nil {
		t.Fatalf("failed to create test CSV: %v", err)
	}

	tool := NewCSVAnalysisTool()
	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": csvPath,
		"goal": "Find correlation between x and y",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result, "Find correlation between x and y") {
		t.Error("goal not included in report")
	}
}

func TestCSVAnalysisTool_Execute_EmptyCSV(t *testing.T) {
	tmpDir := t.TempDir()
	csvPath := filepath.Join(tmpDir, "empty.csv")

	if err := os.WriteFile(csvPath, []byte(""), 0644); err != nil {
		t.Fatalf("failed to create empty CSV: %v", err)
	}

	tool := NewCSVAnalysisTool()
	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": csvPath,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result, "Empty CSV file") {
		t.Errorf("expected 'Empty CSV file' message, got: %s", result)
	}
}

func TestCSVAnalysisTool_Execute_MixedTypes(t *testing.T) {
	tmpDir := t.TempDir()
	csvPath := filepath.Join(tmpDir, "mixed.csv")

	csvContent := `category,value,notes
A,100,First
B,200,Second
A,150,Third
C,50,Fourth
`
	if err := os.WriteFile(csvPath, []byte(csvContent), 0644); err != nil {
		t.Fatalf("failed to create test CSV: %v", err)
	}

	tool := NewCSVAnalysisTool()
	result, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": csvPath,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have numeric stats for 'value' column
	if !strings.Contains(result, "### value") {
		t.Error("missing numeric stats for 'value' column")
	}

	// Should have value counts for categorical columns
	if !strings.Contains(result, "### category") {
		t.Error("missing value counts for 'category' column")
	}
}

func TestIsNumericColumn(t *testing.T) {
	tests := []struct {
		col      []string
		expected bool
	}{
		{[]string{"1", "2", "3"}, true},
		{[]string{"1.5", "2.7", "3.9"}, true},
		{[]string{"a", "b", "c"}, false},
		{[]string{"1", "2", ""}, true},
		{[]string{"1", "a", "b"}, false},
		{[]string{}, false},
	}

	for _, tt := range tests {
		result := isNumericColumn(tt.col)
		if result != tt.expected {
			t.Errorf("isNumericColumn(%v) = %v, expected %v", tt.col, result, tt.expected)
		}
	}
}

func TestGetValueCounts(t *testing.T) {
	col := []string{"a", "b", "a", "c", "a", "b", ""}

	counts := getValueCounts(col, 10)

	if len(counts) != 3 {
		t.Errorf("expected 3 value counts, got %d", len(counts))
	}

	// "a" should be first (most frequent)
	if counts[0].value != "a" || counts[0].count != 3 {
		t.Errorf("expected 'a' with count 3, got '%s' with count %d", counts[0].value, counts[0].count)
	}
}

func TestComputeNumericStats(t *testing.T) {
	col := []string{"1", "2", "3", "4", "5"}

	s := computeNumericStats(col)

	if s.count != 5 {
		t.Errorf("expected count 5, got %d", s.count)
	}
	if s.mean != 3.0 {
		t.Errorf("expected mean 3.0, got %f", s.mean)
	}
	if s.min != 1.0 {
		t.Errorf("expected min 1.0, got %f", s.min)
	}
	if s.max != 5.0 {
		t.Errorf("expected max 5.0, got %f", s.max)
	}
	if s.median != 3.0 {
		t.Errorf("expected median 3.0, got %f", s.median)
	}
}
