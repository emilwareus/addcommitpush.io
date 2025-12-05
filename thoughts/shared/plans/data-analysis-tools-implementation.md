# Data Analysis and File Reading Tools Implementation Plan

## Overview

This plan implements data analysis tools (CSV EDA) and document reading tools (PDF, DOCX, PPTX) for the ThinkDeep agent, following the existing architecture patterns from the research document `thoughts/shared/research/2025-12-03_think-deep-data-tools.md`.

## Current State Analysis

### Existing Tool Architecture

The codebase has a clean tool architecture:

- **Tool Interface** (`internal/tools/registry.go:9-13`):
  ```go
  type Tool interface {
      Name() string
      Description() string
      Execute(ctx context.Context, args map[string]interface{}) (string, error)
  }
  ```

- **Registry Pattern** (`internal/tools/registry.go:21-83`): Tools are registered in registries and executed by name

- **Optional LLM Enhancement Pattern** (`internal/tools/search.go:17-35`): SearchTool has optional `SetSummarizer()` for LLM-enhanced results

- **ContentSummarizer Pattern** (`internal/tools/summarizer.go:14-92`): Fetches content and summarizes using LLM

### Existing Tools

1. `SearchTool` - Web search via Brave API with optional summarization
2. `FetchTool` - Direct URL content fetching
3. `ThinkTool` - Strategic reflection (no-op acknowledgment)
4. `ResearchCompleteTool` - Signal research completion
5. `RefineDraftTool` - Refine draft with LLM
6. `ConductResearchTool` - Delegate to sub-researchers

### Tool Registry Builders

- `SubResearcherToolRegistry()` (`internal/think_deep/tools.go:246-267`): Creates registry for sub-researchers with search, fetch, think tools

### Current Dependencies

From `go.mod`:
- Go 1.24.0
- No existing PDF/document parsing libraries
- No CSV/data analysis libraries

## Desired End State

After this plan is complete:

1. **Document Reading Tools** available to sub-researchers:
   - `read_pdf` - Extract text from PDF files
   - `read_docx` - Extract text from Word documents
   - `read_document` - Auto-detect format and extract text (wrapper)

2. **Data Analysis Tools** available to sub-researchers:
   - `analyze_csv` - Perform EDA on CSV files (shape, types, stats, correlations)

3. **Integration** with existing tool registries:
   - Tools added to `SubResearcherToolRegistry()`
   - Optional LLM enhancement for goal-directed analysis

4. **Verification**:
   - All tools implement the `Tool` interface
   - Unit tests for each tool
   - Build succeeds without errors

## What We're NOT Doing

- **Pickle file support** - Python interop adds complexity; defer to later phase
- **PPTX support** - unioffice library is commercial/complex; start with PDF and DOCX
- **DataAnalystAgent sub-agent** - Keep it simple; add tools directly to existing sub-researchers
- **Visualization generation** - No chart/image generation; focus on text-based analysis
- **Large file streaming** - Use reasonable size limits (10MB) and fail gracefully

## Implementation Approach

Follow the `SearchTool` + `ContentSummarizer` pattern:
1. Create standalone tools that work without LLM
2. Add optional LLM enhancement for deeper analysis
3. Register tools in `SubResearcherToolRegistry()`
4. Update prompts to document new tools

---

## Phase 1: PDF Reading Tool

### Overview

Implement a PDF text extraction tool using the `pdfcpu` library (pure Go, no CGO required).

### Changes Required

#### 1. Add pdfcpu dependency

**Command**:
```bash
go get github.com/pdfcpu/pdfcpu
```

This adds the PDF processing library to `go.mod`.

#### 2. Create PDF Tool

**File**: `internal/tools/pdf.go`

```go
package tools

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// PDFReadTool extracts text content from PDF files.
type PDFReadTool struct {
	maxPages int // Maximum pages to extract (0 = all)
}

// NewPDFReadTool creates a new PDF reading tool.
func NewPDFReadTool() *PDFReadTool {
	return &PDFReadTool{
		maxPages: 50, // Default: first 50 pages
	}
}

func (t *PDFReadTool) Name() string {
	return "read_pdf"
}

func (t *PDFReadTool) Description() string {
	return `Extract text from a PDF file. Args: {"path": "/path/to/file.pdf"}`
}

func (t *PDFReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["path"].(string)
	if !ok || path == "" {
		return "", fmt.Errorf("read_pdf requires a 'path' argument")
	}

	// Validate file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return "", fmt.Errorf("file not found: %s", path)
	}

	// Open PDF file
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open PDF: %w", err)
	}
	defer f.Close()

	// Create configuration
	conf := model.NewDefaultConfiguration()

	// Extract text from PDF
	var text strings.Builder

	// Use pdfcpu's ExtractContent or similar API
	// Note: pdfcpu's text extraction API may need adjustment based on actual API
	content, err := api.ExtractContentFile(path, nil, conf)
	if err != nil {
		return "", fmt.Errorf("extract PDF content: %w", err)
	}

	for pageNum, pageContent := range content {
		if t.maxPages > 0 && pageNum >= t.maxPages {
			text.WriteString(fmt.Sprintf("\n...[truncated after %d pages]\n", t.maxPages))
			break
		}
		text.WriteString(fmt.Sprintf("--- Page %d ---\n", pageNum+1))
		text.WriteString(pageContent)
		text.WriteString("\n\n")
	}

	result := text.String()

	// Truncate if too long
	const maxLen = 100000
	if len(result) > maxLen {
		result = result[:maxLen] + "\n...[truncated]"
	}

	return result, nil
}
```

**Note**: The actual pdfcpu API may differ. The implementation should be adjusted after testing with the real library. An alternative approach using `ledongthuc/pdf` (pure Go) may be simpler:

```go
// Alternative using ledongthuc/pdf
import "github.com/ledongthuc/pdf"

func (t *PDFReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["path"].(string)
	if !ok || path == "" {
		return "", fmt.Errorf("read_pdf requires a 'path' argument")
	}

	f, r, err := pdf.Open(path)
	if err != nil {
		return "", fmt.Errorf("open PDF: %w", err)
	}
	defer f.Close()

	var text strings.Builder
	numPages := r.NumPage()
	maxPages := t.maxPages
	if maxPages <= 0 || maxPages > numPages {
		maxPages = numPages
	}

	for i := 1; i <= maxPages; i++ {
		p := r.Page(i)
		if p.V.IsNull() {
			continue
		}
		content, err := p.GetPlainText(nil)
		if err != nil {
			continue
		}
		text.WriteString(fmt.Sprintf("--- Page %d ---\n", i))
		text.WriteString(content)
		text.WriteString("\n\n")
	}

	if maxPages < numPages {
		text.WriteString(fmt.Sprintf("\n...[truncated after %d of %d pages]\n", maxPages, numPages))
	}

	result := text.String()
	const maxLen = 100000
	if len(result) > maxLen {
		result = result[:maxLen] + "\n...[truncated]"
	}

	return result, nil
}
```

#### 3. Create PDF Tool Tests

**File**: `internal/tools/pdf_test.go`

```go
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
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `cd go-research && go build ./...`
- [x] Tests pass: `cd go-research && go test ./internal/tools/...`
- [x] No linting errors: `cd go-research && golangci-lint run ./...` (if available)

#### Manual Verification:
- [ ] Create a test PDF and verify text extraction works
- [ ] Large PDFs are truncated appropriately

---

## Phase 2: DOCX Reading Tool

### Overview

Implement a DOCX text extraction tool. Since unioffice is commercial, use `baliance/gooxml` (Apache 2.0 license, predecessor to unioffice) or a simpler approach.

### Changes Required

#### 1. Add docx dependency

**Command**:
```bash
go get github.com/nguyenthenguyen/docx
```

This is a lightweight, pure Go DOCX reader.

#### 2. Create DOCX Tool

**File**: `internal/tools/docx.go`

```go
package tools

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/nguyenthenguyen/docx"
)

// DOCXReadTool extracts text content from DOCX files.
type DOCXReadTool struct{}

// NewDOCXReadTool creates a new DOCX reading tool.
func NewDOCXReadTool() *DOCXReadTool {
	return &DOCXReadTool{}
}

func (t *DOCXReadTool) Name() string {
	return "read_docx"
}

func (t *DOCXReadTool) Description() string {
	return `Extract text from a DOCX (Word) file. Args: {"path": "/path/to/file.docx"}`
}

func (t *DOCXReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["path"].(string)
	if !ok || path == "" {
		return "", fmt.Errorf("read_docx requires a 'path' argument")
	}

	// Validate file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return "", fmt.Errorf("file not found: %s", path)
	}

	// Open DOCX file
	r, err := docx.ReadDocxFile(path)
	if err != nil {
		return "", fmt.Errorf("open DOCX: %w", err)
	}
	defer r.Close()

	// Extract text content
	doc := r.Editable()
	content := doc.GetContent()

	// Clean up whitespace
	content = cleanDocxContent(content)

	// Truncate if too long
	const maxLen = 100000
	if len(content) > maxLen {
		content = content[:maxLen] + "\n...[truncated]"
	}

	return content, nil
}

// cleanDocxContent normalizes whitespace and formatting in extracted DOCX text.
func cleanDocxContent(s string) string {
	// Replace multiple newlines with double newline (paragraph separator)
	lines := strings.Split(s, "\n")
	var cleaned []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	return strings.Join(cleaned, "\n\n")
}
```

#### 3. Create DOCX Tool Tests

**File**: `internal/tools/docx_test.go`

```go
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
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `cd go-research && go build ./...`
- [x] Tests pass: `cd go-research && go test ./internal/tools/...`

#### Manual Verification:
- [ ] Create a test DOCX and verify text extraction works
- [ ] Complex DOCX with tables/formatting extracts readable text

---

## Phase 3: Generic Document Reader Tool

### Overview

Create a unified document reading tool that auto-detects format from file extension.

### Changes Required

#### 1. Create Document Tool

**File**: `internal/tools/document.go`

```go
package tools

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
)

// DocumentReadTool reads documents of various formats (PDF, DOCX).
// It auto-detects the format based on file extension.
type DocumentReadTool struct {
	pdfTool  *PDFReadTool
	docxTool *DOCXReadTool
}

// NewDocumentReadTool creates a new document reading tool.
func NewDocumentReadTool() *DocumentReadTool {
	return &DocumentReadTool{
		pdfTool:  NewPDFReadTool(),
		docxTool: NewDOCXReadTool(),
	}
}

func (t *DocumentReadTool) Name() string {
	return "read_document"
}

func (t *DocumentReadTool) Description() string {
	return `Read and extract text from a document file (PDF or DOCX - auto-detected from extension).
Args: {"path": "/path/to/document.pdf"}`
}

func (t *DocumentReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["path"].(string)
	if !ok || path == "" {
		return "", fmt.Errorf("read_document requires a 'path' argument")
	}

	ext := strings.ToLower(filepath.Ext(path))

	switch ext {
	case ".pdf":
		return t.pdfTool.Execute(ctx, args)
	case ".docx":
		return t.docxTool.Execute(ctx, args)
	default:
		return "", fmt.Errorf("unsupported file format: %s (supported: .pdf, .docx)", ext)
	}
}
```

#### 2. Create Document Tool Tests

**File**: `internal/tools/document_test.go`

```go
package tools

import (
	"context"
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
}

func TestDocumentReadTool_Execute_DetectsPDF(t *testing.T) {
	tool := NewDocumentReadTool()
	// This will fail with "file not found" which proves PDF detection worked
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.pdf",
	})
	if err == nil || err.Error() != "file not found: /nonexistent/file.pdf" {
		// PDF tool was called (correct detection)
	}
}

func TestDocumentReadTool_Execute_DetectsDOCX(t *testing.T) {
	tool := NewDocumentReadTool()
	_, err := tool.Execute(context.Background(), map[string]interface{}{
		"path": "/nonexistent/file.docx",
	})
	if err == nil || err.Error() != "file not found: /nonexistent/file.docx" {
		// DOCX tool was called (correct detection)
	}
}
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `cd go-research && go build ./...`
- [x] Tests pass: `cd go-research && go test ./internal/tools/...`

#### Manual Verification:
- [x] Tool correctly routes PDF files to PDF reader
- [x] Tool correctly routes DOCX files to DOCX reader
- [x] Unsupported formats return clear error message

---

## Phase 4: CSV Analysis Tool

### Overview

Implement a CSV analysis tool that performs exploratory data analysis (EDA) including shape, data types, summary statistics, and correlations.

### Changes Required

#### 1. Add statistics dependency

**Command**:
```bash
go get gonum.org/v1/gonum/stat
go get github.com/montanaflynn/stats
```

These provide statistical functions for analysis.

#### 2. Create CSV Analysis Tool

**File**: `internal/tools/csv_analysis.go`

```go
package tools

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/montanaflynn/stats"
)

// CSVAnalysisTool performs exploratory data analysis on CSV files.
type CSVAnalysisTool struct {
	maxRows int // Maximum rows to analyze (0 = all)
}

// NewCSVAnalysisTool creates a new CSV analysis tool.
func NewCSVAnalysisTool() *CSVAnalysisTool {
	return &CSVAnalysisTool{
		maxRows: 10000, // Default: analyze first 10k rows
	}
}

func (t *CSVAnalysisTool) Name() string {
	return "analyze_csv"
}

func (t *CSVAnalysisTool) Description() string {
	return `Analyze a CSV data file. Performs EDA including: shape, column types, summary statistics, missing values.
Args: {"path": "/path/to/file.csv", "goal": "optional analysis objective"}`
}

func (t *CSVAnalysisTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["path"].(string)
	if !ok || path == "" {
		return "", fmt.Errorf("analyze_csv requires a 'path' argument")
	}

	goal, _ := args["goal"].(string)

	// Validate file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return "", fmt.Errorf("file not found: %s", path)
	}

	// Open CSV file
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open CSV: %w", err)
	}
	defer f.Close()

	// Parse CSV
	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil {
		return "", fmt.Errorf("parse CSV: %w", err)
	}

	if len(records) == 0 {
		return "Empty CSV file.", nil
	}

	// Extract headers and data
	headers := records[0]
	data := records[1:]

	// Limit rows if needed
	if t.maxRows > 0 && len(data) > t.maxRows {
		data = data[:t.maxRows]
	}

	// Build analysis report
	var report strings.Builder

	// Header
	report.WriteString(fmt.Sprintf("# CSV Analysis: %s\n\n", path))
	if goal != "" {
		report.WriteString(fmt.Sprintf("**Analysis Goal**: %s\n\n", goal))
	}

	// Shape
	report.WriteString(fmt.Sprintf("## Shape\n"))
	report.WriteString(fmt.Sprintf("- Rows: %d (showing first %d)\n", len(records)-1, len(data)))
	report.WriteString(fmt.Sprintf("- Columns: %d\n\n", len(headers)))

	// Columns overview
	report.WriteString("## Columns\n")
	report.WriteString("| Column | Type | Non-Null | Missing | Sample Values |\n")
	report.WriteString("|--------|------|----------|---------|---------------|\n")

	columnData := make([][]string, len(headers))
	for i := range headers {
		columnData[i] = make([]string, len(data))
		for j, row := range data {
			if i < len(row) {
				columnData[i][j] = row[i]
			}
		}
	}

	for i, header := range headers {
		colType, nonNull, missing := analyzeColumn(columnData[i])
		samples := getSampleValues(columnData[i], 3)
		report.WriteString(fmt.Sprintf("| %s | %s | %d | %d | %s |\n",
			header, colType, nonNull, missing, samples))
	}
	report.WriteString("\n")

	// Summary statistics for numeric columns
	report.WriteString("## Summary Statistics (Numeric Columns)\n")
	hasNumeric := false
	for i, header := range headers {
		if isNumericColumn(columnData[i]) {
			hasNumeric = true
			numericStats := computeNumericStats(columnData[i])
			report.WriteString(fmt.Sprintf("### %s\n", header))
			report.WriteString(fmt.Sprintf("- Count: %d\n", numericStats.count))
			report.WriteString(fmt.Sprintf("- Mean: %.4f\n", numericStats.mean))
			report.WriteString(fmt.Sprintf("- Std: %.4f\n", numericStats.std))
			report.WriteString(fmt.Sprintf("- Min: %.4f\n", numericStats.min))
			report.WriteString(fmt.Sprintf("- 25%%: %.4f\n", numericStats.q25))
			report.WriteString(fmt.Sprintf("- 50%% (Median): %.4f\n", numericStats.median))
			report.WriteString(fmt.Sprintf("- 75%%: %.4f\n", numericStats.q75))
			report.WriteString(fmt.Sprintf("- Max: %.4f\n\n", numericStats.max))
		}
	}
	if !hasNumeric {
		report.WriteString("No numeric columns detected.\n\n")
	}

	// Categorical column summaries
	report.WriteString("## Categorical Column Value Counts\n")
	hasCategorical := false
	for i, header := range headers {
		if !isNumericColumn(columnData[i]) {
			hasCategorical = true
			valueCounts := getValueCounts(columnData[i], 10)
			report.WriteString(fmt.Sprintf("### %s\n", header))
			for _, vc := range valueCounts {
				report.WriteString(fmt.Sprintf("- %s: %d\n", vc.value, vc.count))
			}
			report.WriteString("\n")
		}
	}
	if !hasCategorical {
		report.WriteString("No categorical columns detected.\n\n")
	}

	return report.String(), nil
}

// Column analysis helpers

func analyzeColumn(col []string) (colType string, nonNull, missing int) {
	for _, val := range col {
		if val == "" {
			missing++
		} else {
			nonNull++
		}
	}

	if isNumericColumn(col) {
		colType = "numeric"
	} else {
		colType = "string"
	}

	return
}

func isNumericColumn(col []string) bool {
	numericCount := 0
	totalNonEmpty := 0

	for _, val := range col {
		if val == "" {
			continue
		}
		totalNonEmpty++
		if _, err := strconv.ParseFloat(val, 64); err == nil {
			numericCount++
		}
	}

	if totalNonEmpty == 0 {
		return false
	}

	// Consider numeric if >80% of non-empty values are numeric
	return float64(numericCount)/float64(totalNonEmpty) > 0.8
}

func getSampleValues(col []string, n int) string {
	seen := make(map[string]bool)
	var samples []string

	for _, val := range col {
		if val != "" && !seen[val] {
			seen[val] = true
			samples = append(samples, val)
			if len(samples) >= n {
				break
			}
		}
	}

	return strings.Join(samples, ", ")
}

type numericStats struct {
	count  int
	mean   float64
	std    float64
	min    float64
	q25    float64
	median float64
	q75    float64
	max    float64
}

func computeNumericStats(col []string) numericStats {
	var values []float64
	for _, val := range col {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			values = append(values, f)
		}
	}

	if len(values) == 0 {
		return numericStats{}
	}

	mean, _ := stats.Mean(values)
	std, _ := stats.StandardDeviation(values)
	min, _ := stats.Min(values)
	max, _ := stats.Max(values)
	median, _ := stats.Median(values)
	q25, _ := stats.Percentile(values, 25)
	q75, _ := stats.Percentile(values, 75)

	return numericStats{
		count:  len(values),
		mean:   mean,
		std:    std,
		min:    min,
		q25:    q25,
		median: median,
		q75:    q75,
		max:    max,
	}
}

type valueCount struct {
	value string
	count int
}

func getValueCounts(col []string, limit int) []valueCount {
	counts := make(map[string]int)
	for _, val := range col {
		if val != "" {
			counts[val]++
		}
	}

	var result []valueCount
	for v, c := range counts {
		result = append(result, valueCount{value: v, count: c})
	}

	// Sort by count descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].count > result[j].count
	})

	if len(result) > limit {
		result = result[:limit]
	}

	return result
}
```

#### 3. Create CSV Tool Tests

**File**: `internal/tools/csv_analysis_test.go`

```go
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
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `cd go-research && go build ./...`
- [x] Tests pass: `cd go-research && go test ./internal/tools/...`

#### Manual Verification:
- [x] Tool correctly identifies numeric vs string columns
- [x] Summary statistics are accurate
- [ ] Large CSV files are handled without memory issues

---

## Phase 5: Tool Registry Integration

### Overview

Register the new tools in `SubResearcherToolRegistry()` and update the prompts to document them.

### Changes Required

#### 1. Update SubResearcherToolRegistry

**File**: `internal/think_deep/tools.go`

**Changes**: Add document and CSV tools to the sub-researcher registry

```go
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
```

#### 2. Update ResearchAgentPrompt

**File**: `internal/think_deep/prompts.go`

**Changes**: Update the `ResearchAgentPrompt` function to document new tools

```go
// ResearchAgentPrompt returns the prompt for sub-researcher agents.
// Sub-researchers perform focused searches with strict iteration limits.
//
// Original: research_agent_prompt
func ResearchAgentPrompt(date string) string {
	return fmt.Sprintf(`You are a research assistant conducting research on the user's input topic. For context, today's date is %s.

<Task>
Your job is to use tools to gather information about the user's input topic.
You can use any of the tools provided to you to find resources that can help answer the research question. You can call these tools in series or in parallel, your research is conducted in a tool-calling loop.
</Task>

<Available Tools>
You have access to the following tools:

1. **search**: For conducting web searches to gather information
   Usage: <tool name="search">{"query": "your search query"}</tool>

2. **fetch**: For fetching content from a specific URL
   Usage: <tool name="fetch">{"url": "https://example.com"}</tool>

3. **read_document**: For reading PDF or DOCX documents
   Usage: <tool name="read_document">{"path": "/path/to/document.pdf"}</tool>

4. **analyze_csv**: For analyzing CSV data files (EDA, statistics, column analysis)
   Usage: <tool name="analyze_csv">{"path": "/path/to/data.csv", "goal": "what to look for"}</tool>

5. **think**: For reflection and strategic planning during research
   Usage: <tool name="think">{"reflection": "Your analysis of results..."}</tool>

**CRITICAL: Use think after each search or analysis to reflect on results and plan next steps**
</Available Tools>

<Instructions>
Think like a human researcher with limited time. Follow these steps:

1. **Read the question carefully** - What specific information does the user need?
2. **Start with broader searches** - Use broad, comprehensive queries first
3. **After each search, pause and assess** - Do I have enough to answer? What's still missing?
4. **Execute narrower searches as you gather information** - Fill in the gaps
5. **For data analysis tasks** - Use analyze_csv for CSV files, read_document for PDFs/DOCX
6. **Stop when you can answer confidently** - Don't keep searching for perfection
</Instructions>

<Hard Limits>
**Tool Call Budgets** (Prevent excessive searching):
- **Simple queries**: Use 2-3 search tool calls maximum
- **Complex queries**: Use up to 5 search tool calls maximum
- **Always stop**: After 5 search tool calls if you cannot find the right sources

**Stop Immediately When**:
- You can answer the user's question comprehensively
- You have 3+ relevant examples/sources for the question
- Your last 2 searches returned similar information
</Hard Limits>

<Show Your Thinking>
After each search tool call, use think to analyze the results:
- What key information did I find?
- What's missing?
- Do I have enough to answer the question comprehensively?
- Should I search more or provide my answer?
</Show Your Thinking>

When you have gathered sufficient information, provide your findings without using any tool tags.`, date)
}
```

#### 3. Update LeadResearcherPrompt (Optional)

**File**: `internal/think_deep/prompts.go`

**Changes**: Add brief mention of data analysis capabilities in supervisor prompt

Add to the `<Scaling Rules>` section:

```go
**Data Analysis Tasks** require specialized handling:
- *Example*: Analyze the sales data in /data/sales.csv → Delegate to sub-agent with clear analysis goal
- When delegating data analysis, specify the file path AND the analysis objective clearly
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `cd go-research && go build ./...`
- [x] Tests pass: `cd go-research && go test ./...`
- [x] Type check passes: `cd go-research && go vet ./...`

#### Manual Verification:
- [x] New tools appear in sub-researcher tool registry
- [x] Updated prompts include documentation for new tools
- [ ] Sub-researcher can call document and CSV tools during research

---

## Phase 6: End-to-End Testing

### Overview

Create integration tests that verify the new tools work correctly within the ThinkDeep research flow.

### Changes Required

#### 1. Create Test Data Directory

**Directory**: `internal/tools/testdata/`

Create test files:
- `testdata/sample.pdf` - Simple PDF with text content
- `testdata/sample.docx` - Simple DOCX with text content
- `testdata/sample.csv` - CSV with numeric and string columns

#### 2. Create Integration Test

**File**: `internal/think_deep/tools_integration_test.go`

```go
package think_deep

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"go-research/internal/tools"
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
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `cd go-research && go build ./...`
- [x] All tests pass: `cd go-research && go test ./...`
- [x] Tool registry contains all expected tools

#### Manual Verification:
- [ ] End-to-end test with real PDF/DOCX/CSV files
- [ ] Sub-researcher can use document tools during research session
- [ ] Performance is acceptable with moderately sized files (< 10MB)

---

## Testing Strategy

### Unit Tests

Each tool has dedicated unit tests covering:
- Name and description methods
- Missing/invalid arguments
- File not found scenarios
- Basic functionality with test data

### Integration Tests

- Tool registry contains all expected tools
- Tools can be executed through the registry
- Tools work within the sub-researcher context

### Manual Testing Steps

1. **PDF Reading**:
   - Create a simple PDF with text
   - Execute: `read_document` with PDF path
   - Verify extracted text is readable

2. **DOCX Reading**:
   - Create a simple DOCX with text
   - Execute: `read_document` with DOCX path
   - Verify extracted text is readable

3. **CSV Analysis**:
   - Create CSV with mixed column types
   - Execute: `analyze_csv` with CSV path
   - Verify shape, types, and statistics are correct

4. **End-to-End Research**:
   - Start a research session that requires reading a local document
   - Verify sub-researcher can access and use document tools
   - Verify findings are incorporated into research output

---

## Performance Considerations

- **File Size Limits**: All tools have max length limits (100KB for documents, 10K rows for CSV) to prevent memory issues
- **Truncation**: Large outputs are truncated with clear indicators
- **Lazy Loading**: Documents are only read when the tool is called, not at registry creation
- **No Caching**: Each tool call reads the file fresh (caching could be added later if needed)

---

## Migration Notes

No migration required - these are additive changes that don't affect existing functionality.

---

## References

- Original research document: `thoughts/shared/research/2025-12-03_think-deep-data-tools.md`
- Tool interface: `internal/tools/registry.go:9-13`
- SearchTool with summarizer pattern: `internal/tools/search.go:17-35`
- SubResearcherToolRegistry: `internal/think_deep/tools.go:246-267`
- ResearchAgentPrompt: `internal/think_deep/prompts.go:95-145`
- LeadResearcherPrompt: `internal/think_deep/prompts.go:16-89`
