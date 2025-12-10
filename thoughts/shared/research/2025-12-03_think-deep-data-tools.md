---
date: 2025-12-03T14:30:00+01:00
researcher: Claude
git_commit: 6a32cb5cc41e10a32999f565d10ca639bbecc06c
branch: main
repository: addcommitpush.io/go-research
topic: 'Data Analysis and File Reading Tools for ThinkDeep Agent'
tags: [research, think_deep, tools, data_analysis, eda, pdf, csv, pickle]
status: complete
last_updated: 2025-12-03
last_updated_by: Claude
---

# Research: Data Analysis and File Reading Tools for ThinkDeep Agent

**Date**: 2025-12-03T14:30:00+01:00
**Researcher**: Claude
**Git Commit**: 6a32cb5cc41e10a32999f565d10ca639bbecc06c
**Branch**: main
**Repository**: addcommitpush.io/go-research

## Research Question

How to add reusable data analysis tools (CSV/pickle EDA) and file reading tools (PDF, DOCX, PPTX) to the ThinkDeep agent that follow the existing architecture patterns?

## Summary

The ThinkDeep architecture supports extensible tools through a clean `Tool` interface pattern. Adding data analysis and file reading capabilities requires:

1. **New Tool implementations** following the `internal/tools/Tool` interface
2. **Specialized sub-agent** for complex data analysis (following the `SubResearcherAgent` pattern)
3. **Prompt modifications** to expose new tools to the research agents
4. **Registry updates** to include new tools where needed

The design should mirror the existing `search` → `ContentSummarizer` pattern where simple tools can optionally leverage LLM processing for deeper insights.

## Detailed Findings

### 1. Current Tool Architecture

**Tool Interface** (`internal/tools/registry.go:9-13`):

```go
type Tool interface {
    Name() string
    Description() string
    Execute(ctx context.Context, args map[string]interface{}) (string, error)
}
```

**ToolExecutor Interface** (`internal/tools/registry.go:15-19`):

```go
type ToolExecutor interface {
    Execute(ctx context.Context, name string, args map[string]interface{}) (string, error)
    ToolNames() []string
}
```

**Key Pattern - Search with Optional Summarization** (`internal/tools/search.go`):

- `SearchTool` performs basic web search
- Optional `ContentSummarizer` enhances results with LLM-generated summaries
- This pattern is directly applicable to data analysis tools

### 2. Sub-Researcher Agent Pattern

The `SubResearcherAgent` (`internal/agents/sub_researcher.go:23-29`) demonstrates how to create a focused agent that:

- Has access to specific tools (search, think)
- Executes an iterative loop with hard limits
- Compresses findings for the supervisor
- Emits progress events via the event bus

This pattern can be adapted for a `DataAnalysisAgent` sub-researcher.

### 3. Proposed Tool Implementations

#### 3.1 Data Analysis Tools

**CSVAnalysisTool** - For CSV/tabular data:

```go
// internal/tools/csv_analysis.go

type CSVAnalysisTool struct {
    client llm.ChatClient // Optional: for LLM-enhanced analysis
}

func (t *CSVAnalysisTool) Name() string { return "analyze_csv" }

func (t *CSVAnalysisTool) Description() string {
    return `Analyze CSV data file. Performs EDA including: shape, dtypes, summary stats,
missing values, correlation analysis. Args: {"path": "/path/to/file.csv", "goal": "specific analysis objective"}`
}

func (t *CSVAnalysisTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    path := args["path"].(string)
    goal := args["goal"].(string) // Optional: guides what to look for

    // 1. Read CSV using encoding/csv or go-gota/gota
    // 2. Generate statistical summary
    // 3. If client is set, use LLM to interpret findings relative to goal
    // 4. Return formatted analysis
}
```

**PickleAnalysisTool** - For Python pickle files:

```go
// internal/tools/pickle_analysis.go

type PickleAnalysisTool struct {
    pythonPath string // Path to Python interpreter
    client     llm.ChatClient
}

func (t *PickleAnalysisTool) Name() string { return "analyze_pickle" }

func (t *PickleAnalysisTool) Description() string {
    return `Analyze Python pickle file. Loads pickle and extracts structure/data.
Args: {"path": "/path/to/file.pkl", "goal": "analysis objective"}`
}

func (t *PickleAnalysisTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    // Use Python subprocess to safely load and inspect pickle
    // Security: Run in sandboxed environment, only inspect structure
}
```

**GoalDirectedEDATool** - High-level EDA orchestrator:

```go
// internal/tools/eda.go

type GoalDirectedEDATool struct {
    client llm.ChatClient
}

func (t *GoalDirectedEDATool) Name() string { return "exploratory_analysis" }

func (t *GoalDirectedEDATool) Description() string {
    return `Conduct goal-directed exploratory data analysis. Analyzes data structure,
distributions, correlations, and anomalies relative to a research objective.
Args: {"path": "/path/to/data", "goal": "research question or hypothesis to explore"}`
}
```

#### 3.2 Document Reading Tools

**PDFReadTool** - For PDF documents:

```go
// internal/tools/pdf.go

import "github.com/pdfcpu/pdfcpu/pkg/api"

type PDFReadTool struct {
    client llm.ChatClient // For summarization
}

func (t *PDFReadTool) Name() string { return "read_pdf" }

func (t *PDFReadTool) Description() string {
    return `Extract text from PDF file. Args: {"path": "/path/to/doc.pdf"}`
}

func (t *PDFReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    path := args["path"].(string)
    // Extract text using pdfcpu or unidoc
    // Return extracted text (truncated if too long)
}
```

**DOCXReadTool** - For Word documents:

```go
// internal/tools/docx.go

import "github.com/unidoc/unioffice/document"

type DOCXReadTool struct{}

func (t *DOCXReadTool) Name() string { return "read_docx" }

func (t *DOCXReadTool) Description() string {
    return `Extract text from DOCX file. Args: {"path": "/path/to/doc.docx"}`
}
```

**PPTXReadTool** - For PowerPoint:

```go
// internal/tools/pptx.go

import "github.com/unidoc/unioffice/presentation"

type PPTXReadTool struct{}

func (t *PPTXReadTool) Name() string { return "read_pptx" }

func (t *PPTXReadTool) Description() string {
    return `Extract text from PPTX file. Args: {"path": "/path/to/deck.pptx"}`
}
```

**GenericDocumentReadTool** - Auto-detect format:

```go
// internal/tools/document.go

type DocumentReadTool struct {
    pdfTool  *PDFReadTool
    docxTool *DOCXReadTool
    pptxTool *PPTXReadTool
    client   llm.ChatClient
}

func (t *DocumentReadTool) Name() string { return "read_document" }

func (t *DocumentReadTool) Description() string {
    return `Read and extract text from document (PDF, DOCX, PPTX - auto-detected).
Args: {"path": "/path/to/doc", "summarize": true|false}`
}

func (t *DocumentReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    path := args["path"].(string)
    summarize := args["summarize"].(bool)

    // Detect format from extension
    // Delegate to appropriate reader
    // Optionally summarize with LLM
}
```

### 4. Data Analysis Sub-Agent Design

Following the `SubResearcherAgent` pattern, create a specialized data analysis agent:

```go
// internal/agents/data_analyst.go

type DataAnalystAgent struct {
    client        llm.ChatClient
    tools         tools.ToolExecutor
    bus           *events.Bus
    maxIterations int
    model         string
}

type DataAnalystConfig struct {
    MaxIterations int // Default: 5
}

type DataAnalystResult struct {
    Analysis     string
    KeyInsights  []string
    Methodology  string
    Visualizations []string // Paths to generated charts
    Cost         session.CostBreakdown
}

func (a *DataAnalystAgent) Analyze(ctx context.Context, dataPath string, goal string) (*DataAnalystResult, error) {
    // 1. Load and inspect data structure
    // 2. Plan analysis approach based on goal
    // 3. Execute EDA tools iteratively
    // 4. Synthesize insights
    // 5. Generate visualizations (optional)
}
```

**Data Analyst Prompt** (new file: `internal/think_deep/data_prompts.go`):

```go
func DataAnalystPrompt(date, dataDescription string) string {
    return fmt.Sprintf(`You are a data analyst conducting exploratory data analysis. Today is %s.

<Data Description>
%s
</Data Description>

<Available Tools>
1. **analyze_csv**: Analyze CSV files - get shape, statistics, correlations
   Usage: <tool name="analyze_csv">{"path": "/path/to/file.csv", "goal": "what to look for"}</tool>

2. **analyze_pickle**: Analyze Python pickle files
   Usage: <tool name="analyze_pickle">{"path": "/path/to/file.pkl"}</tool>

3. **read_document**: Read PDF/DOCX/PPTX files
   Usage: <tool name="read_document">{"path": "/path/to/doc.pdf"}</tool>

4. **think**: Reflect on findings and plan next steps
   Usage: <tool name="think">{"reflection": "your analysis..."}</tool>
</Available Tools>

<Instructions>
1. Start by understanding the data structure
2. Formulate hypotheses based on the research goal
3. Test hypotheses through targeted analysis
4. Document key insights with supporting evidence
5. Stop when you have actionable insights
</Instructions>`, date, dataDescription)
}
```

### 5. Integration with ThinkDeep Supervisor

**Option A: Direct Tool Access** (simpler)
Add data tools directly to the sub-researcher tool registry:

```go
// internal/think_deep/tools.go (modification)

func SubResearcherToolRegistry(braveAPIKey string, client ...llm.ChatClient) *tools.Registry {
    registry := tools.NewEmptyRegistry()

    // Existing tools...
    searchTool := tools.NewSearchTool(braveAPIKey)
    registry.Register(searchTool)
    registry.Register(tools.NewFetchTool())
    registry.Register(&ThinkTool{})

    // NEW: Add data analysis tools
    registry.Register(tools.NewCSVAnalysisTool())
    registry.Register(tools.NewDocumentReadTool())

    // With optional LLM enhancement
    if len(client) > 0 && client[0] != nil {
        summarizer := tools.NewContentSummarizer(client[0])
        searchTool.SetSummarizer(summarizer)

        // Also enhance data tools
        registry.Register(tools.NewGoalDirectedEDATool(client[0]))
    }

    return registry
}
```

**Option B: Dedicated Sub-Agent** (more powerful)
Add `conduct_data_analysis` as a supervisor tool that delegates to `DataAnalystAgent`:

```go
// internal/think_deep/tools.go (addition)

type ConductDataAnalysisTool struct {
    callback func(ctx context.Context, dataPath, goal string) (string, error)
}

func (t *ConductDataAnalysisTool) Name() string { return "conduct_data_analysis" }

func (t *ConductDataAnalysisTool) Description() string {
    return `Delegate data analysis to a specialized sub-agent.
Args: {"data_path": "/path/to/data", "goal": "analysis objective"}`
}
```

Supervisor prompt update (`internal/think_deep/prompts.go`):

```go
// Add to LeadResearcherPrompt:

5. **conduct_data_analysis**: Delegate data analysis to specialized analyst
   Usage: <tool name="conduct_data_analysis">{"data_path": "/path/to/data.csv", "goal": "Find correlations with sales"}</tool>

6. **read_document**: Extract text from documents (PDF, DOCX, PPTX)
   Usage: <tool name="read_document">{"path": "/path/to/report.pdf"}</tool>
```

### 6. Go Library Recommendations

For implementing these tools in Go:

**CSV Processing:**

- `encoding/csv` (stdlib) - Basic CSV reading
- `github.com/go-gota/gota` - DataFrame operations, statistics

**Pickle Files:**

- Python subprocess approach (safest)
- `github.com/nlpodyssey/spago` has some pickle support

**PDF Extraction:**

- `github.com/pdfcpu/pdfcpu` - Pure Go, good extraction
- `github.com/unidoc/unipdf` - Commercial, more features

**Office Documents:**

- `github.com/unidoc/unioffice` - DOCX, XLSX, PPTX
- `github.com/nguyenthenguyen/docx` - Simpler DOCX-only

**Statistics:**

- `gonum.org/v1/gonum/stat` - Statistical functions
- `github.com/montanaflynn/stats` - Descriptive statistics

### 7. Implementation Roadmap

**Phase 1: Document Reading Tools**

- [ ] Implement `PDFReadTool` with pdfcpu
- [ ] Implement `DOCXReadTool` with unioffice
- [ ] Implement `PPTXReadTool` with unioffice
- [ ] Create `DocumentReadTool` wrapper with auto-detection
- [ ] Add to SubResearcherToolRegistry

**Phase 2: Basic Data Analysis Tools**

- [ ] Implement `CSVAnalysisTool` with gota
- [ ] Add basic statistics: shape, dtypes, missing values, summary stats
- [ ] Add correlation analysis
- [ ] Create LLM-enhanced interpretation mode

**Phase 3: Goal-Directed EDA**

- [ ] Create `GoalDirectedEDATool` with LLM planning
- [ ] Implement iterative analysis loop
- [ ] Add hypothesis testing support

**Phase 4: Data Analyst Sub-Agent** (optional)

- [ ] Create `DataAnalystAgent` following SubResearcherAgent pattern
- [ ] Implement `conduct_data_analysis` supervisor tool
- [ ] Update supervisor prompt with new capability

**Phase 5: Pickle Support** (optional)

- [ ] Implement Python subprocess bridge for pickle inspection
- [ ] Add sandbox/security measures
- [ ] Create `PickleAnalysisTool`

## Code References

- `internal/tools/registry.go:9-13` - Tool interface definition
- `internal/tools/search.go:17-30` - SearchTool with optional summarizer pattern
- `internal/tools/summarizer.go:14-27` - ContentSummarizer pattern for LLM enhancement
- `internal/agents/sub_researcher.go:23-62` - SubResearcherAgent architecture
- `internal/think_deep/tools.go:246-267` - SubResearcherToolRegistry (where to add new tools)
- `internal/think_deep/prompts.go:16-89` - LeadResearcherPrompt (needs tool docs)
- `internal/think_deep/prompts.go:91-145` - ResearchAgentPrompt (needs tool docs)

## Architecture Insights

### Key Patterns to Follow

1. **Tool Interface Compliance**: All tools must implement `Name()`, `Description()`, `Execute()`

2. **Optional LLM Enhancement**: Like `SearchTool.SetSummarizer()`, data tools should work standalone but optionally leverage LLM for deeper analysis

3. **Event Bus Integration**: For long-running analysis, emit progress events:

   ```go
   bus.Publish(events.Event{
       Type:      events.EventDataAnalysisProgress,
       Timestamp: time.Now(),
       Data: DataAnalysisProgressData{...},
   })
   ```

4. **Hard Limits**: Follow the 5-iteration max pattern from sub-researcher

5. **Compression Pattern**: After analysis, compress findings for supervisor (like `compressResearch`)

### Security Considerations

- **Pickle files**: Never use Go native pickle loading; always subprocess to Python with timeout and resource limits
- **File paths**: Validate paths are within allowed directories
- **Resource limits**: Set memory caps for large dataset analysis

## Open Questions

1. **Visualization Support**: Should the data analyst generate charts? Would require image handling in reports.

2. **Large File Handling**: How to handle CSVs larger than memory? Consider chunked processing or sampling.

3. **Python Interop**: For pickle and advanced analysis, is Python subprocess acceptable or should we use CGO bindings?

4. **Tool Discovery**: Should tools be dynamically discovered based on data type, or explicitly called by agents?

5. **Caching**: Should analysis results be cached for repeated queries on same data?

## Example Usage Flow

```
User: "Analyze the sales data in /data/sales_2024.csv and find what factors
       most influence customer retention"

1. ThinkDeep Supervisor receives query
2. Supervisor calls: conduct_data_analysis(path="/data/sales_2024.csv",
                                           goal="factors influencing customer retention")
3. DataAnalystAgent spawns:
   - Calls analyze_csv to get shape, types, summary
   - Uses think to plan analysis approach
   - Calls analyze_csv with specific correlation goals
   - Identifies key factors through iteration
   - Compresses findings
4. Supervisor receives compressed analysis
5. Supervisor may call conduct_research for external validation
6. Final report incorporates data-driven insights
```

## Related Research

- Previous research on ThinkDeep architecture: `thoughts/shared/research/2025-12-03_interactive-cli-agentic-research.md`
- ThinkDepth.ai original paper approach (using GPT-5 with tool calling)
