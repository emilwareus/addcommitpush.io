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
