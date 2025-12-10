# Go Deep Research Agent v1 Implementation Plan

## Overview

Build a Go-based deep research agent with an interactive REPL interface, multi-worker orchestration via goroutines/channels, ReAct agent pattern, and Obsidian vault persistence. This is v1 - no observability, metrics, or fallback logic.

## Current State Analysis

- **Greenfield project**: No existing Go code
- **Architecture document**: `thoughts/shared/research/2025-11-22_go-deep-research-agent-architecture.md`
- **Design decisions resolved**:
  - Streaming: Yes, use streaming APIs for responsiveness
  - Model: Single model (`alibaba/tongyi-deepresearch-30b-a3b`) for everything, centralized config
  - Search: Brave only
  - State: JSON persistence

## Desired End State

A working CLI tool (`go-research`) that:

1. Starts an interactive REPL with readline support
2. Accepts `/fast <query>` for single-worker quick research
3. Accepts `/deep <query>` for multi-worker parallel research
4. Streams progress events to the terminal in real-time
5. Persists sessions to JSON and Obsidian-compatible markdown vault
6. Supports session continuation with `/expand`, `/rerun`, `/recompile`

### Verification:

```bash
# Build succeeds
cd go-research && go build ./...

# Run the REPL
./go-research
# > /fast What is ReAct agent pattern?
# (should see streaming progress, tool calls, final answer)
# > /deep How do modern LLM agents work?
# (should see multiple workers, parallel execution, synthesized report)
```

## What We're NOT Doing

- No observability/metrics/tracing
- No fallback logic (fail fast with clear errors)
- No DuckDuckGo or alternative search providers
- No SQLite (JSON only for state)
- No separate insight extraction model
- No Pages Router or any web UI

---

## Environment Setup

The project includes `.env` and `.env.example` files for configuration:

```bash
# Copy the example and add your keys
cp go-research/.env.example go-research/.env
```

**File**: `go-research/.env.example`

```
# LLM Provider
OPENROUTER_API_KEY=sk-or-...

# Search Provider
BRAVE_API_KEY=...

# Optional: Enhanced web fetching
JINA_API_KEY=...

# Agent Config
MAX_ITERATIONS=20
MAX_TOKENS_PER_AGENT=50000
DEFAULT_MODEL=gpt-4o-mini
TEMPERATURE=0.0
```

**Usage during development and validation:**

```bash
# Load environment and run
cd go-research
source .env  # or use direnv/dotenv
go run ./cmd/research
```

**Validation with real API calls:**
When validating phases that include manual verification with real API calls (Phases 2+), use the `.env` file with valid API keys:

```bash
cd go-research && source .env && go run ./cmd/research
# Then run actual research queries to verify functionality
```

---

## Phase 1: Core Infrastructure

### Overview

Set up project structure, configuration, LLM client, and event bus.

### Changes Required:

#### 1. Project Structure

Create the directory structure:

```
go-research/
├── cmd/
│   └── research/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── llm/
│   │   ├── client.go
│   │   ├── models.go
│   │   └── stream.go
│   ├── events/
│   │   ├── bus.go
│   │   └── types.go
│   └── repl/
│       └── renderer.go
├── go.mod
├── go.sum
└── README.md
```

#### 2. Go Module

**File**: `go-research/go.mod`

```go
module go-research

go 1.22

require (
    github.com/chzyer/readline v1.5.1
    github.com/fatih/color v1.16.0
    gopkg.in/yaml.v3 v3.0.1
)
```

#### 3. Configuration

**File**: `go-research/internal/config/config.go`

```go
package config

import (
    "os"
    "path/filepath"
    "time"
)

// Config holds all configuration
type Config struct {
    // API Keys
    OpenRouterAPIKey string
    BraveAPIKey      string

    // Paths
    VaultPath   string
    HistoryFile string
    StateFile   string

    // Timeouts
    WorkerTimeout  time.Duration
    RequestTimeout time.Duration

    // Agent settings
    MaxIterations int
    MaxTokens     int
    MaxWorkers    int

    // Model
    Model string

    // Verbose mode
    Verbose bool
}

// Load reads configuration from environment and defaults
func Load() *Config {
    home, _ := os.UserHomeDir()

    return &Config{
        OpenRouterAPIKey: os.Getenv("OPENROUTER_API_KEY"),
        BraveAPIKey:      os.Getenv("BRAVE_API_KEY"),

        VaultPath:   getEnvOrDefault("RESEARCH_VAULT", filepath.Join(home, "research-vault")),
        HistoryFile: filepath.Join(home, ".research_history"),
        StateFile:   filepath.Join(home, ".research_state"),

        WorkerTimeout:  30 * time.Minute,
        RequestTimeout: 5 * time.Minute,

        MaxIterations: 20,
        MaxTokens:     50000,
        MaxWorkers:    5,

        Model: "alibaba/tongyi-deepresearch-30b-a3b",

        Verbose: os.Getenv("RESEARCH_VERBOSE") == "true",
    }
}

func getEnvOrDefault(key, def string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return def
}
```

#### 4. Event Types

**File**: `go-research/internal/events/types.go`

Copy the event types from architecture document (lines 266-342).

#### 5. Event Bus

**File**: `go-research/internal/events/bus.go`

Copy the event bus implementation from architecture document (lines 351-408).

#### 6. LLM Client

**File**: `go-research/internal/llm/client.go`

Copy the LLM client from architecture document (lines 1241-1403), but:

- Use `cfg.Model` instead of hardcoded `modelID`
- Accept config as constructor parameter

**File**: `go-research/internal/llm/models.go`

```go
package llm

// Model configurations - centralized for easy changes
const (
    DefaultModel = "alibaba/tongyi-deepresearch-30b-a3b"
)

// ModelConfig holds model-specific settings
type ModelConfig struct {
    ID          string
    MaxTokens   int
    Temperature float64
}

func DefaultModelConfig() ModelConfig {
    return ModelConfig{
        ID:          DefaultModel,
        MaxTokens:   8192,
        Temperature: 0.7,
    }
}
```

#### 7. Basic Renderer

**File**: `go-research/internal/repl/renderer.go`

Copy the renderer from architecture document (lines 1803-1937).

#### 8. Entry Point

**File**: `go-research/cmd/research/main.go`

```go
package main

import (
    "fmt"
    "os"

    "go-research/internal/config"
)

func main() {
    cfg := config.Load()

    if cfg.OpenRouterAPIKey == "" {
        fmt.Fprintln(os.Stderr, "Error: OPENROUTER_API_KEY environment variable not set")
        os.Exit(1)
    }

    if cfg.BraveAPIKey == "" {
        fmt.Fprintln(os.Stderr, "Error: BRAVE_API_KEY environment variable not set")
        os.Exit(1)
    }

    fmt.Println("Go Research Agent - Configuration loaded")
    fmt.Printf("Model: %s\n", cfg.Model)
    fmt.Printf("Vault: %s\n", cfg.VaultPath)
}
```

### Success Criteria:

#### Automated Verification:

- [x] `cd go-research && go mod tidy` succeeds
- [x] `go build ./...` succeeds
- [x] `go vet ./...` passes
- [x] `OPENROUTER_API_KEY=test BRAVE_API_KEY=test go run ./cmd/research` prints config info

#### Manual Verification:

- [x] Event bus can publish and receive events (write a quick test in main)
- [x] LLM client structure compiles (actual API calls tested in Phase 2)

---

## Phase 2: Agent & Tools

### Overview

Implement the search tool (Brave API), fetch tool (web scraping), tool registry, and ReAct agent loop.

### Changes Required:

#### 1. Tool Registry

**File**: `go-research/internal/tools/registry.go`

```go
package tools

import (
    "context"
    "fmt"
)

// Tool defines the interface for research tools
type Tool interface {
    Name() string
    Description() string
    Execute(ctx context.Context, args map[string]interface{}) (string, error)
}

// Registry manages available tools
type Registry struct {
    tools map[string]Tool
}

// NewRegistry creates a new tool registry with all available tools
func NewRegistry(braveAPIKey string) *Registry {
    r := &Registry{
        tools: make(map[string]Tool),
    }

    // Register tools
    r.Register(NewSearchTool(braveAPIKey))
    r.Register(NewFetchTool())

    return r
}

// Register adds a tool to the registry
func (r *Registry) Register(tool Tool) {
    r.tools[tool.Name()] = tool
}

// Get returns a tool by name
func (r *Registry) Get(name string) (Tool, bool) {
    t, ok := r.tools[name]
    return t, ok
}

// Execute runs a tool by name
func (r *Registry) Execute(ctx context.Context, name string, args map[string]interface{}) (string, error) {
    tool, ok := r.tools[name]
    if !ok {
        return "", fmt.Errorf("unknown tool: %s", name)
    }
    return tool.Execute(ctx, args)
}

// List returns all available tool names and descriptions
func (r *Registry) List() map[string]string {
    result := make(map[string]string)
    for name, tool := range r.tools {
        result[name] = tool.Description()
    }
    return result
}
```

#### 2. Search Tool (Brave API)

**File**: `go-research/internal/tools/search.go`

```go
package tools

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "strings"
    "time"
)

const braveSearchURL = "https://api.search.brave.com/res/v1/web/search"

// SearchTool implements web search via Brave API
type SearchTool struct {
    apiKey     string
    httpClient *http.Client
}

// NewSearchTool creates a new Brave search tool
func NewSearchTool(apiKey string) *SearchTool {
    return &SearchTool{
        apiKey:     apiKey,
        httpClient: &http.Client{Timeout: 30 * time.Second},
    }
}

func (t *SearchTool) Name() string {
    return "search"
}

func (t *SearchTool) Description() string {
    return "Search the web using Brave Search API. Args: {\"query\": \"search terms\", \"count\": 10}"
}

// BraveSearchResponse represents the API response
type BraveSearchResponse struct {
    Web struct {
        Results []struct {
            Title       string `json:"title"`
            URL         string `json:"url"`
            Description string `json:"description"`
        } `json:"results"`
    } `json:"web"`
}

func (t *SearchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    query, ok := args["query"].(string)
    if !ok || query == "" {
        return "", fmt.Errorf("search requires a 'query' argument")
    }

    count := 10
    if c, ok := args["count"].(float64); ok {
        count = int(c)
    }

    // Build request URL
    params := url.Values{}
    params.Set("q", query)
    params.Set("count", fmt.Sprintf("%d", count))

    req, err := http.NewRequestWithContext(ctx, "GET", braveSearchURL+"?"+params.Encode(), nil)
    if err != nil {
        return "", fmt.Errorf("create request: %w", err)
    }

    req.Header.Set("Accept", "application/json")
    req.Header.Set("X-Subscription-Token", t.apiKey)

    resp, err := t.httpClient.Do(req)
    if err != nil {
        return "", fmt.Errorf("search request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return "", fmt.Errorf("search API error %d: %s", resp.StatusCode, string(body))
    }

    var searchResp BraveSearchResponse
    if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
        return "", fmt.Errorf("decode response: %w", err)
    }

    // Format results
    var results []string
    for i, r := range searchResp.Web.Results {
        results = append(results, fmt.Sprintf("%d. %s\n   URL: %s\n   %s\n",
            i+1, r.Title, r.URL, r.Description))
    }

    return strings.Join(results, "\n"), nil
}
```

#### 3. Fetch Tool

**File**: `go-research/internal/tools/fetch.go`

```go
package tools

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "regexp"
    "strings"
    "time"

    "golang.org/x/net/html"
)

// FetchTool implements web page content fetching
type FetchTool struct {
    httpClient *http.Client
}

// NewFetchTool creates a new fetch tool
func NewFetchTool() *FetchTool {
    return &FetchTool{
        httpClient: &http.Client{Timeout: 30 * time.Second},
    }
}

func (t *FetchTool) Name() string {
    return "fetch"
}

func (t *FetchTool) Description() string {
    return "Fetch and extract text content from a web page. Args: {\"url\": \"https://...\"}"
}

func (t *FetchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    urlStr, ok := args["url"].(string)
    if !ok || urlStr == "" {
        return "", fmt.Errorf("fetch requires a 'url' argument")
    }

    req, err := http.NewRequestWithContext(ctx, "GET", urlStr, nil)
    if err != nil {
        return "", fmt.Errorf("create request: %w", err)
    }

    req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; GoResearchBot/1.0)")

    resp, err := t.httpClient.Do(req)
    if err != nil {
        return "", fmt.Errorf("fetch failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("fetch error %d for %s", resp.StatusCode, urlStr)
    }

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", fmt.Errorf("read body: %w", err)
    }

    // Extract text content from HTML
    text := extractText(string(body))

    // Truncate if too long
    if len(text) > 10000 {
        text = text[:10000] + "\n...[truncated]"
    }

    return text, nil
}

// extractText removes HTML tags and extracts readable text
func extractText(htmlContent string) string {
    doc, err := html.Parse(strings.NewReader(htmlContent))
    if err != nil {
        // Fallback: strip tags with regex
        re := regexp.MustCompile(`<[^>]*>`)
        return re.ReplaceAllString(htmlContent, "")
    }

    var text strings.Builder
    var extract func(*html.Node)
    extract = func(n *html.Node) {
        if n.Type == html.TextNode {
            text.WriteString(n.Data)
            text.WriteString(" ")
        }
        // Skip script and style tags
        if n.Type == html.ElementNode && (n.Data == "script" || n.Data == "style") {
            return
        }
        for c := n.FirstChild; c != nil; c = c.NextSibling {
            extract(c)
        }
    }
    extract(doc)

    // Clean up whitespace
    result := text.String()
    re := regexp.MustCompile(`\s+`)
    result = re.ReplaceAllString(result, " ")
    return strings.TrimSpace(result)
}
```

#### 4. Session Types

**File**: `go-research/internal/session/session.go`

Copy session types from architecture document (lines 161-261).

#### 5. ReAct Agent

**File**: `go-research/internal/agent/react.go`

Copy ReAct agent from architecture document (lines 1409-1623), with modifications:

- Accept config and tools registry as constructor parameters
- Use the centralized model config

**File**: `go-research/internal/agent/prompts.go`

```go
package agent

const systemPrompt = `You are a research assistant. Your goal is to thoroughly research the given topic using the available tools.

Available tools:
- search: Search the web for information. Usage: <tool name="search">{"query": "your search query"}</tool>
- fetch: Fetch content from a URL. Usage: <tool name="fetch">{"url": "https://..."}</tool>

Process:
1. Think about what information you need
2. Use tools to gather information
3. Analyze the results
4. Continue researching if needed
5. When you have enough information, provide your final answer

When you have a complete answer, wrap it in <answer></answer> tags.

Example tool usage:
<tool name="search">{"query": "ReAct agent pattern LLM"}</tool>

Be thorough but efficient. Use multiple searches if needed to get comprehensive information.`
```

**File**: `go-research/internal/agent/worker.go`

```go
package agent

import (
    "context"

    "go-research/internal/events"
    "go-research/internal/session"
)

// Worker wraps a ReAct agent for use in the worker pool
type Worker struct {
    agent     *React
    workerNum int
}

// NewWorker creates a new worker
func NewWorker(config Config, bus *events.Bus, workerNum int) *Worker {
    return &Worker{
        agent:     NewReact(config, bus),
        workerNum: workerNum,
    }
}

// Research executes research for the given objective
func (w *Worker) Research(ctx context.Context, objective string) (session.WorkerContext, error) {
    return w.agent.Research(ctx, objective)
}
```

### Success Criteria:

#### Automated Verification:

- [x] `go build ./...` succeeds
- [x] `go vet ./...` passes

#### Manual Verification (use `source .env` with valid API keys):

```bash
cd go-research && source .env && go run ./cmd/research
```

- [ ] Search tool returns results for a test query
- [ ] Fetch tool extracts text from a test URL
- [ ] ReAct agent can complete a simple research query (e.g., `/fast What is ReAct?`)

---

## Phase 3: Orchestration

### Overview

Implement query complexity analysis, task decomposition, worker pool with goroutines, and result synthesizer.

### Changes Required:

#### 1. Planner

**File**: `go-research/internal/orchestrator/planner.go`

```go
package orchestrator

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"

    "go-research/internal/llm"
)

// Planner handles query analysis and task decomposition
type Planner struct {
    client *llm.Client
}

// NewPlanner creates a new planner
func NewPlanner(client *llm.Client) *Planner {
    return &Planner{client: client}
}

// AnalyzeComplexity returns a score from 0.0 to 1.0
func (p *Planner) AnalyzeComplexity(ctx context.Context, query string) (float64, error) {
    prompt := fmt.Sprintf(`Analyze the complexity of this research query and return a score from 0.0 to 1.0.

Query: %s

Consider:
- How many distinct sub-topics need to be researched?
- How specialized is the domain?
- How much synthesis is required?

Return ONLY a JSON object: {"score": 0.X, "reason": "brief explanation"}`, query)

    resp, err := p.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return 0.5, fmt.Errorf("complexity analysis: %w", err)
    }

    content := resp.Choices[0].Message.Content

    var result struct {
        Score  float64 `json:"score"`
        Reason string  `json:"reason"`
    }

    // Extract JSON from response
    start := strings.Index(content, "{")
    end := strings.LastIndex(content, "}") + 1
    if start >= 0 && end > start {
        if err := json.Unmarshal([]byte(content[start:end]), &result); err != nil {
            return 0.5, nil // Default to medium complexity
        }
        return result.Score, nil
    }

    return 0.5, nil
}

// CreatePlan decomposes a query into tasks for workers
func (p *Planner) CreatePlan(ctx context.Context, query string, numWorkers int) ([]Task, error) {
    prompt := fmt.Sprintf(`Decompose this research query into %d parallel research tasks.

Query: %s

Return ONLY a JSON array of tasks:
[
  {"objective": "Research aspect 1", "expected_output": "What this worker should produce"},
  {"objective": "Research aspect 2", "expected_output": "What this worker should produce"}
]

Each task should:
- Be independently researchable
- Cover a distinct aspect of the query
- Have a clear objective and expected output`, numWorkers, query)

    resp, err := p.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return nil, fmt.Errorf("plan creation: %w", err)
    }

    content := resp.Choices[0].Message.Content

    var taskDefs []struct {
        Objective      string `json:"objective"`
        ExpectedOutput string `json:"expected_output"`
    }

    // Extract JSON array from response
    start := strings.Index(content, "[")
    end := strings.LastIndex(content, "]") + 1
    if start >= 0 && end > start {
        if err := json.Unmarshal([]byte(content[start:end]), &taskDefs); err != nil {
            return nil, fmt.Errorf("parse plan: %w", err)
        }
    }

    tasks := make([]Task, len(taskDefs))
    for i, td := range taskDefs {
        tasks[i] = Task{
            ID:             fmt.Sprintf("task-%d", i+1),
            WorkerNum:      i + 1,
            Objective:      td.Objective,
            Tools:          []string{"search", "fetch"},
            ExpectedOutput: td.ExpectedOutput,
        }
    }

    return tasks, nil
}
```

#### 2. Worker Pool

**File**: `go-research/internal/orchestrator/pool.go`

Copy worker pool from architecture document (lines 412-531).

#### 3. Synthesizer

**File**: `go-research/internal/orchestrator/synthesizer.go`

```go
package orchestrator

import (
    "context"
    "fmt"
    "strings"

    "go-research/internal/events"
    "go-research/internal/llm"
    "go-research/internal/session"
)

// Synthesizer combines worker results into a final report
type Synthesizer struct {
    bus    *events.Bus
    client *llm.Client
}

// NewSynthesizer creates a new synthesizer
func NewSynthesizer(bus *events.Bus) *Synthesizer {
    return &Synthesizer{
        bus:    bus,
        client: llm.NewClient(),
    }
}

// Synthesize combines worker outputs into a coherent report
func (s *Synthesizer) Synthesize(ctx context.Context, query string, workers []session.WorkerContext, instructions string) (string, error) {
    // Build context from worker outputs
    var workerSummaries strings.Builder
    for i, w := range workers {
        workerSummaries.WriteString(fmt.Sprintf("\n### Worker %d: %s\n\n%s\n",
            i+1, w.Objective, w.FinalOutput))
    }

    prompt := fmt.Sprintf(`Synthesize these research findings into a comprehensive report.

Original Query: %s

Worker Findings:
%s

%s

Create a well-structured report that:
1. Answers the original query comprehensively
2. Synthesizes insights from all workers
3. Highlights key findings and implications
4. Notes any contradictions or gaps
5. Provides actionable conclusions

Write the report in markdown format.`, query, workerSummaries.String(), instructions)

    resp, err := s.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })
    if err != nil {
        return "", fmt.Errorf("synthesis failed: %w", err)
    }

    return resp.Choices[0].Message.Content, nil
}
```

#### 4. Main Orchestrator

**File**: `go-research/internal/orchestrator/orchestrator.go`

Copy orchestrator from architecture document (lines 1098-1235).

### Success Criteria:

#### Automated Verification:

- [x] `go build ./...` succeeds
- [x] `go vet ./...` passes

#### Manual Verification:

- [ ] Planner returns reasonable complexity scores
- [ ] Task decomposition creates appropriate sub-tasks
- [ ] Worker pool executes tasks in parallel (visible via event output)
- [ ] Synthesizer produces coherent reports from worker outputs

---

## Phase 4: Session Management

### Overview

Implement session persistence, versioning, and context building for continuation.

### Changes Required:

#### 1. Session Store

**File**: `go-research/internal/session/store.go`

```go
package session

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sort"
    "strings"
    "time"
)

// Store handles session persistence
type Store struct {
    stateDir string
}

// NewStore creates a new session store
func NewStore(stateDir string) (*Store, error) {
    if err := os.MkdirAll(stateDir, 0755); err != nil {
        return nil, fmt.Errorf("create state dir: %w", err)
    }
    return &Store{stateDir: stateDir}, nil
}

// Save persists a session to disk
func (s *Store) Save(sess *Session) error {
    sess.UpdatedAt = time.Now()

    data, err := json.MarshalIndent(sess, "", "  ")
    if err != nil {
        return fmt.Errorf("marshal session: %w", err)
    }

    filename := filepath.Join(s.stateDir, sess.ID+".json")
    if err := os.WriteFile(filename, data, 0644); err != nil {
        return fmt.Errorf("write session: %w", err)
    }

    // Update last session pointer
    lastFile := filepath.Join(s.stateDir, ".last")
    os.WriteFile(lastFile, []byte(sess.ID), 0644)

    return nil
}

// Load retrieves a session by ID
func (s *Store) Load(id string) (*Session, error) {
    filename := filepath.Join(s.stateDir, id+".json")
    data, err := os.ReadFile(filename)
    if err != nil {
        return nil, fmt.Errorf("read session: %w", err)
    }

    var sess Session
    if err := json.Unmarshal(data, &sess); err != nil {
        return nil, fmt.Errorf("unmarshal session: %w", err)
    }

    return &sess, nil
}

// LoadLast returns the most recent session
func (s *Store) LoadLast() (*Session, error) {
    lastFile := filepath.Join(s.stateDir, ".last")
    data, err := os.ReadFile(lastFile)
    if err != nil {
        return nil, nil // No last session
    }

    return s.Load(strings.TrimSpace(string(data)))
}

// List returns all session IDs, sorted by date
func (s *Store) List() ([]SessionSummary, error) {
    files, err := os.ReadDir(s.stateDir)
    if err != nil {
        return nil, fmt.Errorf("read state dir: %w", err)
    }

    var summaries []SessionSummary
    for _, f := range files {
        if !strings.HasSuffix(f.Name(), ".json") {
            continue
        }

        sess, err := s.Load(strings.TrimSuffix(f.Name(), ".json"))
        if err != nil {
            continue
        }

        summaries = append(summaries, SessionSummary{
            ID:        sess.ID,
            Query:     sess.Query,
            Status:    sess.Status,
            CreatedAt: sess.CreatedAt,
            Cost:      sess.Cost.TotalCost,
        })
    }

    // Sort by date descending
    sort.Slice(summaries, func(i, j int) bool {
        return summaries[i].CreatedAt.After(summaries[j].CreatedAt)
    })

    return summaries, nil
}

// SessionSummary is a lightweight session representation
type SessionSummary struct {
    ID        string
    Query     string
    Status    SessionStatus
    CreatedAt time.Time
    Cost      float64
}
```

#### 2. Session Constructor and Versioning

**File**: `go-research/internal/session/session.go` (additions)

```go
package session

import (
    "fmt"
    "time"

    "github.com/google/uuid"
)

// Mode represents the research mode
type Mode string

const (
    ModeFast Mode = "fast"
    ModeDeep Mode = "deep"
)

// New creates a new session
func New(query string, mode Mode) *Session {
    now := time.Now()
    return &Session{
        ID:        fmt.Sprintf("%s-%s", now.Format("2006-01-02"), uuid.New().String()[:8]),
        Version:   1,
        Query:     query,
        CreatedAt: now,
        UpdatedAt: now,
        Status:    StatusPending,
    }
}

// NewVersion creates a new version of an existing session
func (s *Session) NewVersion() *Session {
    now := time.Now()
    parentID := s.ID
    return &Session{
        ID:        fmt.Sprintf("%s-v%d", s.ID, s.Version+1),
        Version:   s.Version + 1,
        ParentID:  &parentID,
        Query:     s.Query,
        CreatedAt: now,
        UpdatedAt: now,
        Status:    StatusPending,
    }
}
```

#### 3. Context Builder

**File**: `go-research/internal/session/context.go`

```go
package session

import (
    "fmt"
    "strings"
)

// BuildContinuationContext creates context for follow-up research
func BuildContinuationContext(sess *Session) string {
    var ctx strings.Builder

    ctx.WriteString(fmt.Sprintf("Previous query: %s\n\n", sess.Query))

    if sess.Report != "" {
        ctx.WriteString("Previous findings:\n")
        // Truncate report if too long
        report := sess.Report
        if len(report) > 2000 {
            report = report[:2000] + "...[truncated]"
        }
        ctx.WriteString(report)
        ctx.WriteString("\n\n")
    }

    if len(sess.Insights) > 0 {
        ctx.WriteString("Key insights:\n")
        for _, insight := range sess.Insights {
            ctx.WriteString(fmt.Sprintf("- %s: %s\n", insight.Title, insight.Finding))
        }
        ctx.WriteString("\n")
    }

    if len(sess.Sources) > 0 {
        ctx.WriteString("Sources consulted:\n")
        for _, src := range sess.Sources[:min(10, len(sess.Sources))] {
            ctx.WriteString(fmt.Sprintf("- %s\n", src))
        }
    }

    return ctx.String()
}

func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}
```

### Success Criteria:

#### Automated Verification:

- [x] `go build ./...` succeeds
- [x] `go vet ./...` passes

#### Manual Verification:

- [ ] Sessions save to JSON files correctly
- [ ] Sessions load from disk correctly
- [ ] Session versioning creates linked sessions
- [ ] Last session is tracked and restorable

---

## Phase 5: Obsidian Integration

### Overview

Implement vault directory structure, worker markdown files, report versioning, and session MOC.

### Changes Required:

#### 1. Obsidian Writer

**File**: `go-research/internal/obsidian/writer.go`

Copy from architecture document (lines 1629-1797).

#### 2. Obsidian Loader

**File**: `go-research/internal/obsidian/loader.go`

```go
package obsidian

import (
    "fmt"
    "os"
    "path/filepath"
    "strings"

    "go-research/internal/session"
    "gopkg.in/yaml.v3"
)

// Loader handles reading sessions from Obsidian vault
type Loader struct {
    vaultPath string
}

// NewLoader creates a new Obsidian loader
func NewLoader(vaultPath string) *Loader {
    return &Loader{vaultPath: vaultPath}
}

// Load reads a session from the vault
func (l *Loader) Load(sessionID string) (*session.Session, error) {
    sessionFile := filepath.Join(l.vaultPath, sessionID, "session.md")
    data, err := os.ReadFile(sessionFile)
    if err != nil {
        return nil, fmt.Errorf("read session file: %w", err)
    }

    // Parse YAML frontmatter
    content := string(data)
    if !strings.HasPrefix(content, "---") {
        return nil, fmt.Errorf("invalid session file: missing frontmatter")
    }

    parts := strings.SplitN(content[3:], "---", 2)
    if len(parts) < 2 {
        return nil, fmt.Errorf("invalid session file: malformed frontmatter")
    }

    var frontmatter map[string]interface{}
    if err := yaml.Unmarshal([]byte(parts[0]), &frontmatter); err != nil {
        return nil, fmt.Errorf("parse frontmatter: %w", err)
    }

    // Build session from frontmatter
    sess := &session.Session{
        ID:    sessionID,
        Query: frontmatter["query"].(string),
    }

    if v, ok := frontmatter["version"].(int); ok {
        sess.Version = v
    }

    return sess, nil
}

// ListSessions returns all session IDs in the vault
func (l *Loader) ListSessions() ([]string, error) {
    entries, err := os.ReadDir(l.vaultPath)
    if err != nil {
        return nil, fmt.Errorf("read vault: %w", err)
    }

    var sessions []string
    for _, e := range entries {
        if e.IsDir() {
            sessionFile := filepath.Join(l.vaultPath, e.Name(), "session.md")
            if _, err := os.Stat(sessionFile); err == nil {
                sessions = append(sessions, e.Name())
            }
        }
    }

    return sessions, nil
}
```

#### 3. Templates

**File**: `go-research/internal/obsidian/templates.go`

```go
package obsidian

// Templates for Obsidian markdown files

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

const ReportTemplate = `---
version: {{.Version}}
query: "{{.Query}}"
generated: {{.UpdatedAt.Format "2006-01-02T15:04:05Z07:00"}}
---

# Research Report

{{.Report}}
`
```

### Success Criteria:

#### Automated Verification:

- [x] `go build ./...` succeeds
- [x] `go vet ./...` passes

#### Manual Verification:

- [ ] Sessions write to vault directory structure
- [ ] Worker files contain proper frontmatter and content
- [ ] Report files are versioned correctly
- [ ] Session MOC has working wiki-links
- [ ] Files are readable in Obsidian app

---

## Phase 6: Interactive REPL

### Overview

Implement readline integration, command parser, router, all command handlers, and tab completion.

### Changes Required:

#### 1. Parser

**File**: `go-research/internal/repl/parser.go`

```go
package repl

import (
    "strings"
)

// ParsedInput represents parsed user input
type ParsedInput struct {
    IsCommand bool
    Command   string
    Args      []string
    RawText   string
}

// Parse parses user input into structured form
func Parse(input string) ParsedInput {
    input = strings.TrimSpace(input)

    if input == "" {
        return ParsedInput{}
    }

    if strings.HasPrefix(input, "/") {
        parts := strings.Fields(input)
        cmd := strings.TrimPrefix(parts[0], "/")
        return ParsedInput{
            IsCommand: true,
            Command:   cmd,
            Args:      parts[1:],
            RawText:   input,
        }
    }

    return ParsedInput{
        IsCommand: false,
        RawText:   input,
    }
}
```

#### 2. Router

**File**: `go-research/internal/repl/router.go`

Copy router from architecture document (lines 541-626), updated with actual handler implementations.

#### 3. Command Handlers

**File**: `go-research/internal/repl/handlers/start.go`

Copy FastHandler and DeepHandler from architecture document (lines 767-897).

**File**: `go-research/internal/repl/handlers/expand.go`

Copy ExpandHandler from architecture document (lines 902-975).

**File**: `go-research/internal/repl/handlers/session.go`

```go
package handlers

import (
    "fmt"
    "strings"

    "go-research/internal/repl"
)

// SessionsHandler handles /sessions command
type SessionsHandler struct{}

func (h *SessionsHandler) Execute(ctx repl.Context, args []string) error {
    summaries, err := ctx.Store.List()
    if err != nil {
        return fmt.Errorf("list sessions: %w", err)
    }

    if len(summaries) == 0 {
        ctx.Renderer.Info("No saved sessions")
        return nil
    }

    ctx.Renderer.Info(fmt.Sprintf("Found %d sessions:", len(summaries)))
    for _, s := range summaries {
        ctx.Renderer.Info(fmt.Sprintf("  %s | %s | %s | $%.4f",
            s.ID,
            truncate(s.Query, 40),
            s.Status,
            s.Cost,
        ))
    }

    return nil
}

// LoadHandler handles /load command
type LoadHandler struct{}

func (h *LoadHandler) Execute(ctx repl.Context, args []string) error {
    if len(args) == 0 {
        return fmt.Errorf("usage: /load <session_id>")
    }

    sess, err := ctx.Store.Load(args[0])
    if err != nil {
        return fmt.Errorf("load session: %w", err)
    }

    ctx.Session = sess
    ctx.Renderer.SessionRestored(sess)

    return nil
}

func truncate(s string, n int) string {
    if len(s) <= n {
        return s
    }
    return s[:n] + "..."
}
```

**File**: `go-research/internal/repl/handlers/worker.go`

Copy RerunHandler from architecture document (lines 980-1035).

**File**: `go-research/internal/repl/handlers/report.go`

Copy RecompileHandler from architecture document (lines 1039-1092).

**File**: `go-research/internal/repl/handlers/settings.go`

```go
package handlers

import (
    "fmt"

    "go-research/internal/repl"
)

// VerboseHandler handles /verbose command
type VerboseHandler struct{}

func (h *VerboseHandler) Execute(ctx repl.Context, args []string) error {
    ctx.Config.Verbose = !ctx.Config.Verbose
    if ctx.Config.Verbose {
        ctx.Renderer.Info("Verbose mode enabled")
    } else {
        ctx.Renderer.Info("Verbose mode disabled")
    }
    return nil
}

// ModelHandler handles /model command
type ModelHandler struct{}

func (h *ModelHandler) Execute(ctx repl.Context, args []string) error {
    if len(args) == 0 {
        ctx.Renderer.Info(fmt.Sprintf("Current model: %s", ctx.Config.Model))
        return nil
    }

    ctx.Config.Model = args[0]
    ctx.Renderer.Info(fmt.Sprintf("Model set to: %s", ctx.Config.Model))
    return nil
}

// HelpHandler handles /help command
type HelpHandler struct{}

func (h *HelpHandler) Execute(ctx repl.Context, args []string) error {
    help := `
Commands:
  /fast <query>      - Quick single-worker research
  /deep <query>      - Multi-worker deep research
  /expand <text>     - Expand on current research
  /sessions          - List all sessions
  /load <id>         - Load a session
  /workers           - Show workers in current session
  /rerun <n>         - Re-run worker n
  /recompile [text]  - Recompile report
  /model [name]      - Show/set model
  /verbose           - Toggle verbose output
  /help              - Show this help
  /quit              - Exit

Or just type to ask follow-up questions!
`
    ctx.Renderer.Info(help)
    return nil
}

// QuitHandler handles /quit command
type QuitHandler struct{}

func (h *QuitHandler) Execute(ctx repl.Context, args []string) error {
    return ErrQuit
}

var ErrQuit = fmt.Errorf("quit")
```

#### 4. Completer

**File**: `go-research/internal/repl/completer.go`

```go
package repl

import (
    "github.com/chzyer/readline"
)

func newCompleter() *readline.PrefixCompleter {
    return readline.NewPrefixCompleter(
        readline.PcItem("/fast"),
        readline.PcItem("/deep"),
        readline.PcItem("/expand"),
        readline.PcItem("/sessions"),
        readline.PcItem("/load"),
        readline.PcItem("/workers"),
        readline.PcItem("/rerun"),
        readline.PcItem("/recompile"),
        readline.PcItem("/model"),
        readline.PcItem("/verbose"),
        readline.PcItem("/help"),
        readline.PcItem("/quit"),
    )
}
```

#### 5. Main REPL Loop

**File**: `go-research/internal/repl/repl.go`

Copy REPL from architecture document (lines 630-761), with proper handler registration.

#### 6. Updated Main Entry Point

**File**: `go-research/cmd/research/main.go`

```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"

    "go-research/internal/config"
    "go-research/internal/events"
    "go-research/internal/repl"
    "go-research/internal/session"
)

func main() {
    cfg := config.Load()

    if cfg.OpenRouterAPIKey == "" {
        fmt.Fprintln(os.Stderr, "Error: OPENROUTER_API_KEY environment variable not set")
        os.Exit(1)
    }

    if cfg.BraveAPIKey == "" {
        fmt.Fprintln(os.Stderr, "Error: BRAVE_API_KEY environment variable not set")
        os.Exit(1)
    }

    // Create session store
    store, err := session.NewStore(cfg.StateFile)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error creating session store: %v\n", err)
        os.Exit(1)
    }

    // Create event bus
    bus := events.NewBus(100)
    defer bus.Close()

    // Create REPL
    r, err := repl.New(store, bus, cfg)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error creating REPL: %v\n", err)
        os.Exit(1)
    }

    // Setup context with cancellation
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Handle signals
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    go func() {
        <-sigCh
        cancel()
    }()

    // Run REPL
    if err := r.Run(ctx); err != nil && err != context.Canceled {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }
}
```

### Success Criteria:

#### Automated Verification:

- [x] `go build ./...` succeeds
- [x] `go vet ./...` passes
- [x] Binary can be executed: `./go-research --help` or similar

#### Manual Verification (use `source .env` with valid API keys):

```bash
cd go-research && source .env && go run ./cmd/research
```

- [ ] REPL starts with welcome message
- [ ] Tab completion works for commands
- [ ] `/help` shows all commands
- [ ] `/fast What is Go?` executes research with streaming output
- [ ] `/deep How do LLM agents work?` executes parallel multi-worker research
- [ ] Natural text routes to expand handler
- [ ] Session auto-restore on startup works
- [ ] `/quit` exits cleanly

---

## Phase 7: Polish

### Overview

Add streaming output, progress indicators, comprehensive error handling, and graceful shutdown.

### Changes Required:

#### 1. Streaming Support in LLM Client

Update `go-research/internal/llm/stream.go` to properly parse SSE events:

```go
package llm

import (
    "bufio"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "strings"
)

// StreamChat sends a streaming chat request
func (c *Client) StreamChat(ctx context.Context, messages []Message, handler func(chunk string) error) error {
    req := ChatRequest{
        Model:       c.model,
        Messages:    messages,
        Temperature: 0.7,
        MaxTokens:   8192,
        Stream:      true,
    }

    body, err := json.Marshal(req)
    if err != nil {
        return err
    }

    httpReq, err := http.NewRequestWithContext(ctx, "POST", openRouterURL, bytes.NewReader(body))
    if err != nil {
        return err
    }

    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
    httpReq.Header.Set("HTTP-Referer", "https://github.com/emilwareus/go-research")

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
    }

    // Parse SSE stream
    scanner := bufio.NewScanner(resp.Body)
    for scanner.Scan() {
        line := scanner.Text()

        // Skip empty lines and non-data lines
        if !strings.HasPrefix(line, "data: ") {
            continue
        }

        data := strings.TrimPrefix(line, "data: ")
        if data == "[DONE]" {
            break
        }

        var event struct {
            Choices []struct {
                Delta struct {
                    Content string `json:"content"`
                } `json:"delta"`
            } `json:"choices"`
        }

        if err := json.Unmarshal([]byte(data), &event); err != nil {
            continue
        }

        if len(event.Choices) > 0 && event.Choices[0].Delta.Content != "" {
            if err := handler(event.Choices[0].Delta.Content); err != nil {
                return err
            }
        }
    }

    return scanner.Err()
}
```

#### 2. Progress Indicators in Renderer

Add spinner and progress bar support to renderer:

```go
// Add to internal/repl/renderer.go

// Spinner for ongoing operations
type Spinner struct {
    frames  []string
    current int
    done    chan bool
}

func NewSpinner() *Spinner {
    return &Spinner{
        frames: []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"},
        done:   make(chan bool),
    }
}

func (s *Spinner) Start(w io.Writer, message string) {
    go func() {
        ticker := time.NewTicker(100 * time.Millisecond)
        defer ticker.Stop()
        for {
            select {
            case <-s.done:
                fmt.Fprintf(w, "\r%s\n", strings.Repeat(" ", len(message)+5))
                return
            case <-ticker.C:
                fmt.Fprintf(w, "\r%s %s", s.frames[s.current], message)
                s.current = (s.current + 1) % len(s.frames)
            }
        }
    }()
}

func (s *Spinner) Stop() {
    s.done <- true
}
```

#### 3. Graceful Shutdown

Update REPL to handle shutdown cleanly:

```go
// In internal/repl/repl.go

func (r *REPL) shutdown() {
    r.renderer.Info("\nShutting down...")

    // Save current session
    if r.ctx.Session != nil {
        r.renderer.Info("Saving current session...")
        if err := r.store.Save(r.ctx.Session); err != nil {
            r.renderer.Error(fmt.Errorf("save session: %w", err))
        } else {
            r.renderer.Info(fmt.Sprintf("Session saved: %s", r.ctx.Session.ID))
        }
    }

    // Close readline
    r.readline.Close()

    r.renderer.Info("Goodbye!")
}
```

#### 4. Error Handling Improvements

Ensure all errors are:

- Wrapped with context
- Displayed clearly to user
- Logged if verbose mode is on

### Success Criteria:

#### Automated Verification:

- [x] `go build ./...` succeeds
- [x] `go vet ./...` passes
- [x] `go test ./...` passes (if tests added)

#### Manual Verification:

- [ ] Streaming responses appear character-by-character
- [ ] Progress spinners show during long operations
- [ ] Ctrl+C triggers graceful shutdown
- [ ] Session is saved before exit
- [ ] Error messages are clear and actionable
- [ ] Verbose mode shows additional debug info

---

## Testing Strategy

### Unit Tests:

- Event bus publish/subscribe
- Session serialization/deserialization
- Parser command parsing
- Tool argument validation

### Integration Tests:

- Full research flow (mock LLM responses)
- Session save/load cycle
- Obsidian vault generation

### Manual Testing Steps:

**Setup (required for real API testing):**

```bash
cd go-research
# Ensure .env has valid API keys (copy from .env.example if needed)
source .env
go run ./cmd/research
```

**Test sequence:**

1. Start REPL, verify welcome message
2. Run `/fast What is Go?` - verify single-worker execution
3. Run `/deep How do modern web frameworks work?` - verify multi-worker parallel execution
4. Check `~/.research_state/` for JSON session files
5. Check configured vault path for Obsidian markdown
6. Run `/sessions` to list saved sessions
7. Run `/load <id>` to restore a session
8. Type a follow-up question to test expand
9. Run `/recompile` to regenerate report
10. Press Ctrl+C to verify graceful shutdown

---

## Performance Considerations

- Worker pool limits concurrent goroutines to `MaxWorkers` (default 5)
- LLM requests have 5-minute timeout
- Web fetches have 30-second timeout
- Large responses truncated (10k chars for fetch, 2k for context)

---

## Migration Notes

Not applicable - greenfield project.

---

## References

- Architecture document: `thoughts/shared/research/2025-11-22_go-deep-research-agent-architecture.md`
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)
- [OpenRouter API](https://openrouter.ai/docs)
- [Brave Search API](https://brave.com/search/api/)
- [Obsidian Markdown](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown)
