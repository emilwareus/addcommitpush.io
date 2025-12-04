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
