package obsidian

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"text/template"
	"time"

	"go-research/internal/session"
	"go-research/internal/think_deep"

	"gopkg.in/yaml.v3"
)

// Writer handles writing sessions to Obsidian vault
type Writer struct {
	vaultPath string
}

// NewWriter creates a new Obsidian writer
func NewWriter(vaultPath string) *Writer {
	return &Writer{vaultPath: vaultPath}
}

// Write persists a session to the Obsidian vault
func (w *Writer) Write(sess *session.Session) error {
	// Create session directory structure
	sessionDir := filepath.Join(w.vaultPath, sess.ID)
	dirs := []string{
		sessionDir,
		filepath.Join(sessionDir, "workers"),
		filepath.Join(sessionDir, "insights"),
		filepath.Join(sessionDir, "sources"),
		filepath.Join(sessionDir, "reports"),
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("create dir %s: %w", dir, err)
		}
	}

	// Write worker files
	for i, worker := range sess.Workers {
		if err := w.writeWorker(sessionDir, i+1, worker); err != nil {
			return fmt.Errorf("write worker %d: %w", i+1, err)
		}
	}

	// Write report
	if err := w.writeReport(sessionDir, sess); err != nil {
		return fmt.Errorf("write report: %w", err)
	}

	// Write session MOC (Map of Content)
	if err := w.writeSessionMOC(sessionDir, sess); err != nil {
		return fmt.Errorf("write session MOC: %w", err)
	}

	return nil
}

func (w *Writer) writeWorker(dir string, num int, worker session.WorkerContext) error {
	filename := filepath.Join(dir, "workers", fmt.Sprintf("worker_%d.md", num))

	frontmatter := map[string]interface{}{
		"worker_id": worker.ID,
		"objective": worker.Objective,
		"status":    worker.Status,
		"started":   worker.StartedAt.Format(time.RFC3339),
		"sources":   len(worker.Sources),
	}

	fm, err := yaml.Marshal(frontmatter)
	if err != nil {
		return fmt.Errorf("marshal frontmatter: %w", err)
	}

	var content bytes.Buffer
	content.WriteString("---\n")
	content.Write(fm)
	content.WriteString("---\n\n")
	content.WriteString(fmt.Sprintf("# Worker %d: %s\n\n", num, worker.Objective))
	content.WriteString("## Output\n\n")
	content.WriteString(worker.FinalOutput)
	content.WriteString("\n\n## Sources\n\n")

	for _, src := range worker.Sources {
		content.WriteString(fmt.Sprintf("- %s\n", src))
	}

	return os.WriteFile(filename, content.Bytes(), 0644)
}

func (w *Writer) writeReport(dir string, sess *session.Session) error {
	filename := filepath.Join(dir, "reports", fmt.Sprintf("report_v%d.md", sess.Version))

	frontmatter := map[string]interface{}{
		"version":      sess.Version,
		"query":        sess.Query,
		"generated":    time.Now().Format(time.RFC3339),
		"source_count": len(sess.Sources),
	}

	fm, err := yaml.Marshal(frontmatter)
	if err != nil {
		return fmt.Errorf("marshal frontmatter: %w", err)
	}

	var content bytes.Buffer
	content.WriteString("---\n")
	content.Write(fm)
	content.WriteString("---\n\n")
	content.WriteString("# Research Report\n\n")
	content.WriteString(sess.Report)

	// Add sources section
	content.WriteString("\n\n---\n\n## Sources\n\n")
	if len(sess.Sources) > 0 {
		for _, src := range sess.Sources {
			content.WriteString(fmt.Sprintf("- %s\n", src))
		}
	} else {
		content.WriteString("*No sources collected*\n")
	}

	return os.WriteFile(filename, content.Bytes(), 0644)
}

// GetReportPath returns the absolute path to the report file
func (w *Writer) GetReportPath(sess *session.Session) string {
	return filepath.Join(w.vaultPath, sess.ID, "reports", fmt.Sprintf("report_v%d.md", sess.Version))
}

// WriteSource writes a source file to the sources directory.
// Returns the generated filename for linking from insights.
func (w *Writer) WriteSource(sessionDir string, sourceRef think_deep.SourceReference, index int) (string, error) {
	// Generate safe filename from URL or file path
	var safeName string
	if sourceRef.URL != "" {
		safeName = sanitizeFilename(sourceRef.URL)
	} else if sourceRef.FilePath != "" {
		safeName = sanitizeFilename(filepath.Base(sourceRef.FilePath))
	} else {
		safeName = fmt.Sprintf("source_%03d", index)
	}

	filename := filepath.Join(sessionDir, "sources", fmt.Sprintf("%s.md", safeName))

	frontmatter := map[string]interface{}{
		"source_type": string(sourceRef.Type),
		"fetched_at":  sourceRef.FetchedAt.Format(time.RFC3339),
	}
	if sourceRef.URL != "" {
		frontmatter["url"] = sourceRef.URL
	}
	if sourceRef.FilePath != "" {
		frontmatter["file_path"] = sourceRef.FilePath
	}
	if sourceRef.Title != "" {
		frontmatter["title"] = sourceRef.Title
	}
	if sourceRef.ContentHash != "" {
		frontmatter["content_hash"] = sourceRef.ContentHash
	}

	fm, err := yaml.Marshal(frontmatter)
	if err != nil {
		return "", fmt.Errorf("marshal frontmatter: %w", err)
	}

	var content bytes.Buffer
	content.WriteString("---\n")
	content.Write(fm)
	content.WriteString("---\n\n")

	// Title
	title := sourceRef.Title
	if title == "" && sourceRef.URL != "" {
		title = sourceRef.URL
	} else if title == "" {
		title = fmt.Sprintf("Source %d", index)
	}
	content.WriteString(fmt.Sprintf("# %s\n\n", title))

	// Source info
	content.WriteString("## Source Information\n\n")
	content.WriteString(fmt.Sprintf("- **Type**: %s\n", sourceRef.Type))
	if sourceRef.URL != "" {
		content.WriteString(fmt.Sprintf("- **URL**: [%s](%s)\n", sourceRef.URL, sourceRef.URL))
	}
	if sourceRef.FilePath != "" {
		content.WriteString(fmt.Sprintf("- **File**: `%s`\n", sourceRef.FilePath))
	}
	content.WriteString(fmt.Sprintf("- **Fetched**: %s\n", sourceRef.FetchedAt.Format(time.RFC3339)))
	content.WriteString("\n")

	// Relevant excerpt (highlighted)
	if sourceRef.RelevantExcerpt != "" {
		content.WriteString("## Relevant Excerpt\n\n")
		content.WriteString("> ")
		content.WriteString(strings.ReplaceAll(sourceRef.RelevantExcerpt, "\n", "\n> "))
		content.WriteString("\n\n")
	}

	// Full raw content
	if sourceRef.RawContent != "" {
		content.WriteString("## Full Content\n\n")
		content.WriteString("```\n")
		// Truncate very long content but keep it substantial
		rawContent := sourceRef.RawContent
		if len(rawContent) > 50000 {
			rawContent = rawContent[:50000] + "\n\n... [truncated, total length: " + fmt.Sprintf("%d", len(sourceRef.RawContent)) + " chars]"
		}
		content.WriteString(rawContent)
		content.WriteString("\n```\n")
	}

	if err := os.WriteFile(filename, content.Bytes(), 0644); err != nil {
		return "", err
	}

	return safeName, nil
}

// WriteSources writes all sources from insights to the sources directory.
// Returns a map of source URL/path to filename for linking.
func (w *Writer) WriteSources(sessionDir string, insights []think_deep.SubInsight) (map[string]string, error) {
	sourceMap := make(map[string]string)
	sourceIndex := 0

	// Collect all unique sources from insights
	for _, insight := range insights {
		// Handle embedded sources in the insight
		for _, src := range insight.Sources {
			key := src.URL
			if key == "" {
				key = src.FilePath
			}
			if key == "" || sourceMap[key] != "" {
				continue // Skip empty or already written
			}

			sourceIndex++
			filename, err := w.WriteSource(sessionDir, src, sourceIndex)
			if err != nil {
				// Log but don't fail - continue with other sources
				continue
			}
			sourceMap[key] = filename
		}

		// Also create source from legacy SourceURL/SourceContent if not already covered
		if insight.SourceURL != "" && sourceMap[insight.SourceURL] == "" {
			sourceIndex++
			src := think_deep.SourceReference{
				URL:             insight.SourceURL,
				Type:            think_deep.SourceTypeWeb,
				RelevantExcerpt: insight.SourceContent,
				FetchedAt:       insight.Timestamp,
			}
			filename, err := w.WriteSource(sessionDir, src, sourceIndex)
			if err == nil {
				sourceMap[insight.SourceURL] = filename
			}
		}
	}

	return sourceMap, nil
}

// WriteInsight writes a single insight to the insights directory.
// Enhanced to include data points, analysis chain, and source links.
func (w *Writer) WriteInsight(sessionDir string, insight think_deep.SubInsight, index int, sourceMap map[string]string) error {
	filename := filepath.Join(sessionDir, "insights", fmt.Sprintf("insight_%03d.md", index))

	frontmatter := map[string]interface{}{
		"insight_id":    insight.ID,
		"topic":         insight.Topic,
		"confidence":    fmt.Sprintf("%.2f", insight.Confidence),
		"iteration":     insight.Iteration,
		"researcher":    insight.ResearcherNum,
		"timestamp":     insight.Timestamp.Format(time.RFC3339),
	}
	if insight.SourceURL != "" {
		frontmatter["source_url"] = insight.SourceURL
	}
	if insight.ToolUsed != "" {
		frontmatter["tool_used"] = insight.ToolUsed
	}
	if len(insight.Sources) > 0 {
		frontmatter["source_count"] = len(insight.Sources)
	}
	if len(insight.DataPoints) > 0 {
		frontmatter["data_point_count"] = len(insight.DataPoints)
	}
	if len(insight.RelatedInsightIDs) > 0 {
		frontmatter["related_insights"] = insight.RelatedInsightIDs
	}

	fm, err := yaml.Marshal(frontmatter)
	if err != nil {
		return fmt.Errorf("marshal frontmatter: %w", err)
	}

	var content bytes.Buffer
	content.WriteString("---\n")
	content.Write(fm)
	content.WriteString("---\n\n")

	// Title
	if insight.Title != "" {
		content.WriteString(fmt.Sprintf("# %s\n\n", insight.Title))
	} else {
		content.WriteString(fmt.Sprintf("# Insight %d: %s\n\n", index, truncateString(insight.Topic, 50)))
	}

	// Finding
	content.WriteString("## Finding\n\n")
	content.WriteString(insight.Finding)
	content.WriteString("\n\n")

	// Implication (if present)
	if insight.Implication != "" {
		content.WriteString("## Implication\n\n")
		content.WriteString(insight.Implication)
		content.WriteString("\n\n")
	}

	// Data Points (if present)
	if len(insight.DataPoints) > 0 {
		content.WriteString("## Supporting Data\n\n")
		content.WriteString("| Data Point | Value | Context |\n")
		content.WriteString("|------------|-------|--------|\n")
		for _, dp := range insight.DataPoints {
			context := truncateString(dp.Context, 100)
			content.WriteString(fmt.Sprintf("| %s | %s | %s |\n", dp.Label, dp.Value, context))
		}
		content.WriteString("\n")
	}

	// Analysis Chain (if present)
	if len(insight.AnalysisChain) > 0 {
		content.WriteString("## Analysis Chain\n\n")
		content.WriteString("How this insight was derived:\n\n")
		for i, step := range insight.AnalysisChain {
			content.WriteString(fmt.Sprintf("%d. %s\n", i+1, step))
		}
		content.WriteString("\n")
	}

	// Query/Tool used
	if insight.QueryUsed != "" {
		content.WriteString("## Research Method\n\n")
		if insight.ToolUsed != "" {
			content.WriteString(fmt.Sprintf("- **Tool**: `%s`\n", insight.ToolUsed))
		}
		content.WriteString(fmt.Sprintf("- **Query/Args**: %s\n\n", insight.QueryUsed))
	}

	// Sources with links
	content.WriteString("## Sources\n\n")
	if len(insight.Sources) > 0 {
		for _, src := range insight.Sources {
			key := src.URL
			if key == "" {
				key = src.FilePath
			}
			linkedFile := sourceMap[key]
			if linkedFile != "" {
				content.WriteString(fmt.Sprintf("- [[sources/%s|%s]] (%s)\n", linkedFile, src.Title, src.Type))
			} else if src.URL != "" {
				content.WriteString(fmt.Sprintf("- [%s](%s) (%s)\n", src.URL, src.URL, src.Type))
			} else if src.FilePath != "" {
				content.WriteString(fmt.Sprintf("- `%s` (%s)\n", src.FilePath, src.Type))
			}
		}
		content.WriteString("\n")
	} else if insight.SourceURL != "" {
		// Legacy source handling
		linkedFile := sourceMap[insight.SourceURL]
		if linkedFile != "" {
			content.WriteString(fmt.Sprintf("- [[sources/%s|%s]]\n", linkedFile, insight.SourceURL))
		} else {
			content.WriteString(fmt.Sprintf("- [%s](%s)\n", insight.SourceURL, insight.SourceURL))
		}
		content.WriteString("\n")
	} else {
		content.WriteString("*No sources linked*\n\n")
	}

	// Source excerpt (legacy, for backwards compatibility)
	if insight.SourceContent != "" && len(insight.Sources) == 0 {
		content.WriteString("### Source Excerpt\n\n")
		content.WriteString("> ")
		content.WriteString(strings.ReplaceAll(truncateString(insight.SourceContent, 1000), "\n", "\n> "))
		content.WriteString("\n\n")
	}

	// Related insights
	if len(insight.RelatedInsightIDs) > 0 {
		content.WriteString("## Related Insights\n\n")
		for _, relID := range insight.RelatedInsightIDs {
			content.WriteString(fmt.Sprintf("- [[insights/%s]]\n", relID))
		}
	}

	return os.WriteFile(filename, content.Bytes(), 0644)
}

// WriteInsights writes all insights for a session.
// It first writes all sources, then writes insights with source links.
func (w *Writer) WriteInsights(sessionDir string, insights []think_deep.SubInsight) error {
	// First, write all sources and get the mapping
	sourceMap, err := w.WriteSources(sessionDir, insights)
	if err != nil {
		// Continue even if some sources failed to write
		sourceMap = make(map[string]string)
	}

	// Then write insights with source links
	for i, insight := range insights {
		if err := w.WriteInsight(sessionDir, insight, i+1, sourceMap); err != nil {
			return fmt.Errorf("write insight %d: %w", i+1, err)
		}
	}
	return nil
}

// sanitizeFilename creates a safe filename from a URL or path
func sanitizeFilename(input string) string {
	// Try to parse as URL and extract host + path
	if u, err := url.Parse(input); err == nil && u.Host != "" {
		input = u.Host + u.Path
	}

	// Remove protocol prefixes
	input = strings.TrimPrefix(input, "https://")
	input = strings.TrimPrefix(input, "http://")

	// Replace unsafe characters
	re := regexp.MustCompile(`[^a-zA-Z0-9_-]`)
	result := re.ReplaceAllString(input, "_")

	// Collapse multiple underscores
	re = regexp.MustCompile(`_+`)
	result = re.ReplaceAllString(result, "_")

	// Trim underscores from ends
	result = strings.Trim(result, "_")

	// Limit length
	if len(result) > 100 {
		// Use hash suffix for uniqueness
		hash := sha256.Sum256([]byte(input))
		result = result[:80] + "_" + fmt.Sprintf("%x", hash[:8])
	}

	if result == "" {
		result = "source"
	}

	return result
}

// WriteWithInsights writes a session with its sub-insights to the Obsidian vault.
func (w *Writer) WriteWithInsights(sess *session.Session, subInsights []think_deep.SubInsight) error {
	// Create session directory structure
	sessionDir := filepath.Join(w.vaultPath, sess.ID)
	dirs := []string{
		sessionDir,
		filepath.Join(sessionDir, "workers"),
		filepath.Join(sessionDir, "insights"),
		filepath.Join(sessionDir, "sources"),
		filepath.Join(sessionDir, "reports"),
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("create dir %s: %w", dir, err)
		}
	}

	// Write worker files
	for i, worker := range sess.Workers {
		if err := w.writeWorker(sessionDir, i+1, worker); err != nil {
			return fmt.Errorf("write worker %d: %w", i+1, err)
		}
	}

	// Write insight files
	if len(subInsights) > 0 {
		if err := w.WriteInsights(sessionDir, subInsights); err != nil {
			return fmt.Errorf("write insights: %w", err)
		}
	}

	// Write report
	if err := w.writeReport(sessionDir, sess); err != nil {
		return fmt.Errorf("write report: %w", err)
	}

	// Write session MOC with insights
	if err := w.writeSessionMOCWithInsights(sessionDir, sess, subInsights); err != nil {
		return fmt.Errorf("write session MOC: %w", err)
	}

	return nil
}

// truncateString truncates a string to maxLen characters
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func (w *Writer) writeSessionMOC(dir string, sess *session.Session) error {
	filename := filepath.Join(dir, "session.md")

	frontmatter := map[string]interface{}{
		"session_id":       sess.ID,
		"version":          sess.Version,
		"query":            sess.Query,
		"complexity_score": sess.ComplexityScore,
		"status":           sess.Status,
		"created_at":       sess.CreatedAt.Format(time.RFC3339),
		"updated_at":       sess.UpdatedAt.Format(time.RFC3339),
		"cost":             sess.Cost.TotalCost,
	}

	fm, err := yaml.Marshal(frontmatter)
	if err != nil {
		return fmt.Errorf("marshal frontmatter: %w", err)
	}

	tmpl := template.Must(template.New("moc").Funcs(template.FuncMap{
		"inc": func(i int) int { return i + 1 },
	}).Parse(sessionMOCTemplate))

	data := struct {
		Frontmatter string
		*session.Session
	}{string(fm), sess}

	var content bytes.Buffer
	if err := tmpl.Execute(&content, data); err != nil {
		return fmt.Errorf("execute template: %w", err)
	}

	return os.WriteFile(filename, content.Bytes(), 0644)
}

const sessionMOCTemplate = `---
{{.Frontmatter}}---

# Research Session: {{.Query}}

## Workers

{{range $i, $w := .Workers}}
- [[workers/worker_{{inc $i}}.md|Worker {{inc $i}}]]: {{$w.Objective}}
{{end}}

## Reports

- [[reports/report_v{{.Version}}.md|Report v{{.Version}}]]

## Sources

{{if .Sources}}
{{range .Sources}}
- {{.}}
{{end}}
{{else}}
*No sources collected*
{{end}}

## Stats

- **Complexity**: {{printf "%.2f" .ComplexityScore}}
- **Workers**: {{len .Workers}}
- **Sources**: {{len .Sources}}
- **Cost**: ${{printf "%.4f" .Cost.TotalCost}}
`

// writeSessionMOCWithInsights writes a session MOC that includes links to insights
func (w *Writer) writeSessionMOCWithInsights(dir string, sess *session.Session, insights []think_deep.SubInsight) error {
	filename := filepath.Join(dir, "session.md")

	frontmatter := map[string]interface{}{
		"session_id":       sess.ID,
		"version":          sess.Version,
		"query":            sess.Query,
		"complexity_score": sess.ComplexityScore,
		"status":           sess.Status,
		"created_at":       sess.CreatedAt.Format(time.RFC3339),
		"updated_at":       sess.UpdatedAt.Format(time.RFC3339),
		"cost":             sess.Cost.TotalCost,
		"insights_count":   len(insights),
	}

	fm, err := yaml.Marshal(frontmatter)
	if err != nil {
		return fmt.Errorf("marshal frontmatter: %w", err)
	}

	tmpl := template.Must(template.New("moc").Funcs(template.FuncMap{
		"inc": func(i int) int { return i + 1 },
	}).Parse(sessionMOCWithInsightsTemplate))

	data := struct {
		Frontmatter string
		*session.Session
		SubInsights []think_deep.SubInsight
	}{string(fm), sess, insights}

	var content bytes.Buffer
	if err := tmpl.Execute(&content, data); err != nil {
		return fmt.Errorf("execute template: %w", err)
	}

	return os.WriteFile(filename, content.Bytes(), 0644)
}

const sessionMOCWithInsightsTemplate = `---
{{.Frontmatter}}---

# Research Session: {{.Query}}

## Workers

{{range $i, $w := .Workers}}
- [[workers/worker_{{inc $i}}.md|Worker {{inc $i}}]]: {{$w.Objective}}
{{end}}

## Reports

- [[reports/report_v{{.Version}}.md|Report v{{.Version}}]]

## Insights

{{if .SubInsights}}
{{range $i, $ins := .SubInsights}}
- [[insights/insight_{{printf "%03d" (inc $i)}}.md|{{if $ins.Title}}{{$ins.Title}}{{else}}Insight {{inc $i}}{{end}}]] ({{$ins.Topic}})
{{end}}
{{else}}
*No insights captured*
{{end}}

## Sources

{{if .Sources}}
{{range .Sources}}
- {{.}}
{{end}}
{{else}}
*No sources collected*
{{end}}

## Stats

- **Complexity**: {{printf "%.2f" .ComplexityScore}}
- **Workers**: {{len .Workers}}
- **Insights**: {{len .SubInsights}}
- **Sources**: {{len .Sources}}
- **Cost**: ${{printf "%.4f" .Cost.TotalCost}}
`
