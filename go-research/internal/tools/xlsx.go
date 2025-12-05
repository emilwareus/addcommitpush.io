package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/xuri/excelize/v2"
)

// XLSXReadTool extracts a textual preview from Excel workbooks.
// It focuses on the first N sheets/rows/columns to keep responses concise.
type XLSXReadTool struct {
	maxSheets       int
	maxRowsPerSheet int
	maxColsPerRow   int
}

// NewXLSXReadTool creates a new XLSX reading tool with sane limits.
func NewXLSXReadTool() *XLSXReadTool {
	return &XLSXReadTool{
		maxSheets:       3,
		maxRowsPerSheet: 20,
		maxColsPerRow:   12,
	}
}

func (t *XLSXReadTool) Name() string {
	return "read_xlsx"
}

func (t *XLSXReadTool) Description() string {
	return `Extract a textual summary from an Excel (.xlsx) workbook. Args: {"path": "/path/to/file.xlsx"}`
}

func (t *XLSXReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["path"].(string)
	if !ok || strings.TrimSpace(path) == "" {
		return "", fmt.Errorf("read_xlsx requires a 'path' argument")
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		return "", fmt.Errorf("file not found: %s", path)
	}

	f, err := excelize.OpenFile(path)
	if err != nil {
		return "", fmt.Errorf("open XLSX: %w", err)
	}
	defer func() {
		_ = f.Close()
	}()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return fmt.Sprintf("Workbook %s contains no sheets.", filepath.Base(path)), nil
	}

	var b strings.Builder
	// Header with source traceability information
	b.WriteString(fmt.Sprintf("Read document: %s\n", path))
	b.WriteString(fmt.Sprintf("Document type: Excel Workbook (XLSX)\n"))
	b.WriteString(fmt.Sprintf("Workbook: %s\n", filepath.Base(path)))
	b.WriteString(fmt.Sprintf("Total sheets: %d\n\n", len(sheets)))

	maxSheets := t.maxSheets
	if maxSheets <= 0 || maxSheets > len(sheets) {
		maxSheets = len(sheets)
	}

	for i := 0; i < maxSheets; i++ {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
		}

		sheetName := sheets[i]
		b.WriteString(fmt.Sprintf("=== Sheet %d: %s ===\n", i+1, sheetName))

		rows, err := f.GetRows(sheetName)
		if err != nil {
			b.WriteString(fmt.Sprintf("error reading sheet: %v\n\n", err))
			continue
		}

		if len(rows) == 0 {
			b.WriteString("(sheet is empty)\n\n")
			continue
		}

		maxRows := t.maxRowsPerSheet
		if maxRows <= 0 || maxRows > len(rows) {
			maxRows = len(rows)
		}

		for rowIdx := 0; rowIdx < maxRows; rowIdx++ {
			row := rows[rowIdx]
			formatted := formatXLSXRow(row, t.maxColsPerRow)
			b.WriteString(fmt.Sprintf("Row %d: %s\n", rowIdx+1, formatted))
		}

		if maxRows < len(rows) {
			b.WriteString(fmt.Sprintf("...%d more rows not shown\n", len(rows)-maxRows))
		}

		b.WriteString("\n")
	}

	if maxSheets < len(sheets) {
		b.WriteString(fmt.Sprintf("...%d additional sheets not shown\n", len(sheets)-maxSheets))
	}

	result := b.String()
	const maxLen = 100000
	if len(result) > maxLen {
		result = result[:maxLen] + "\n...[truncated]"
	}

	return result, nil
}

func formatXLSXRow(row []string, maxCols int) string {
	if len(row) == 0 {
		return "[empty row]"
	}

	maxColumns := len(row)
	if maxCols > 0 && maxCols < maxColumns {
		maxColumns = maxCols
	}

	values := make([]string, 0, maxColumns)
	for i := 0; i < maxColumns; i++ {
		cell := strings.TrimSpace(row[i])
		if cell == "" {
			cell = " "
		}
		values = append(values, cell)
	}

	line := strings.Join(values, " | ")
	if maxCols > 0 && len(row) > maxCols {
		line += " | ..."
	}

	return line
}


