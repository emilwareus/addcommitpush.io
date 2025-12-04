package obsidian

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
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

// WriteInsight writes a single insight to the insights directory.
func (w *Writer) WriteInsight(sessionDir string, insight think_deep.SubInsight, index int) error {
	filename := filepath.Join(sessionDir, "insights", fmt.Sprintf("insight_%03d.md", index))

	frontmatter := map[string]interface{}{
		"insight_id":    insight.ID,
		"topic":         insight.Topic,
		"confidence":    fmt.Sprintf("%.2f", insight.Confidence),
		"source_url":    insight.SourceURL,
		"iteration":     insight.Iteration,
		"researcher":    insight.ResearcherNum,
		"timestamp":     insight.Timestamp.Format(time.RFC3339),
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

	// Source
	content.WriteString("## Source\n\n")
	if insight.SourceURL != "" {
		content.WriteString(fmt.Sprintf("- [%s](%s)\n", insight.SourceURL, insight.SourceURL))
	}
	if insight.SourceContent != "" {
		content.WriteString("\n### Source Excerpt\n\n")
		content.WriteString("> ")
		content.WriteString(truncateString(insight.SourceContent, 500))
		content.WriteString("\n")
	}

	return os.WriteFile(filename, content.Bytes(), 0644)
}

// WriteInsights writes all insights for a session.
func (w *Writer) WriteInsights(sessionDir string, insights []think_deep.SubInsight) error {
	for i, insight := range insights {
		if err := w.WriteInsight(sessionDir, insight, i+1); err != nil {
			return fmt.Errorf("write insight %d: %w", i+1, err)
		}
	}
	return nil
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
