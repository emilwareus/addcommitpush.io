package tools

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/ledongthuc/pdf"
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
