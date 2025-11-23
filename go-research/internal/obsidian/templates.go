package obsidian

// Templates for Obsidian markdown files
// These are used by the writer to generate properly formatted Obsidian-compatible markdown

// SessionTemplate is the template for the session MOC (Map of Content) file
const SessionTemplate = `---
session_id: {{.ID}}
version: {{.Version}}
query: "{{.Query}}"
complexity_score: {{printf "%.2f" .ComplexityScore}}
status: {{.Status}}
created_at: {{.CreatedAt.Format "2006-01-02T15:04:05Z07:00"}}
updated_at: {{.UpdatedAt.Format "2006-01-02T15:04:05Z07:00"}}
cost: {{printf "%.4f" .Cost.TotalCost}}
---

# Research Session: {{.Query}}

## Workers

{{range $i, $w := .Workers}}
- [[workers/worker_{{inc $i}}.md|Worker {{inc $i}}]]: {{$w.Objective}}
{{end}}

## Reports

- [[reports/report_v{{.Version}}.md|Report v{{.Version}}]]

## Stats

- **Complexity**: {{printf "%.2f" .ComplexityScore}}
- **Workers**: {{len .Workers}}
- **Sources**: {{len .Sources}}
- **Cost**: ${{printf "%.4f" .Cost.TotalCost}}
`

// WorkerTemplate is the template for individual worker output files
const WorkerTemplate = `---
worker_id: {{.ID}}
objective: "{{.Objective}}"
status: {{.Status}}
started: {{.StartedAt.Format "2006-01-02T15:04:05Z07:00"}}
sources: {{len .Sources}}
---

# Worker {{.WorkerNum}}: {{.Objective}}

## Output

{{.FinalOutput}}

## Sources

{{range .Sources}}
- {{.}}
{{end}}
`

// ReportTemplate is the template for research report files
const ReportTemplate = `---
version: {{.Version}}
query: "{{.Query}}"
generated: {{.UpdatedAt.Format "2006-01-02T15:04:05Z07:00"}}
---

# Research Report

{{.Report}}
`

// InsightTemplate is the template for individual insight files
const InsightTemplate = `---
title: "{{.Title}}"
confidence: {{printf "%.2f" .Confidence}}
worker_id: {{.WorkerID}}
---

# {{.Title}}

## Finding

{{.Finding}}

## Implication

{{.Implication}}

## Sources

{{range .Sources}}
- {{.}}
{{end}}
`
