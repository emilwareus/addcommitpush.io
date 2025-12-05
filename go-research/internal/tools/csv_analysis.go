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
	report.WriteString("## Shape\n")
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
