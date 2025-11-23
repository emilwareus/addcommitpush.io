# Go Research Agent

A Go-based deep research agent with an interactive REPL interface, multi-worker orchestration via goroutines/channels, ReAct agent pattern, and Obsidian vault persistence.

## Quick Start

```bash
# 1. Set up environment
cd go-research
cp .env.example .env
# Edit .env with your API keys (OPENROUTER_API_KEY, BRAVE_API_KEY)

# 2. Run
go run ./cmd/research
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/fast <query>` | `/f` | Quick single-worker research |
| `/deep <query>` | `/d` | Multi-worker parallel research |
| `/expand <text>` | `/e` | Follow-up on current research |
| `/sessions` | `/s` | List all saved sessions |
| `/load <id>` | `/l` | Load a previous session |
| `/workers` | `/w` | Show workers in current session |
| `/rerun <n>` | `/r` | Re-run worker n with same objective |
| `/recompile [text]` | `/rc` | Regenerate report (optional instructions) |
| `/model [name]` | `/m` | Show or change the LLM model |
| `/verbose` | `/v` | Toggle verbose debug output |
| `/help` | `/h`, `/?` | Show help |
| `/quit` | `/q`, `/exit` | Exit the REPL |

**Tip:** Just type your question to start deep research. After research, type follow-ups to expand.

## Examples

```bash
# Just type to start deep research (no command needed!)
research> How do modern LLM agents work?

# Quick single-worker research
research> /fast What is the ReAct agent pattern?

# After research, just type follow-up questions
research> Tell me more about tool-use capabilities

# Session management
research> /sessions
research> /load 2025-11-22-abc123
research> /rerun 2
```

---

## Features

- **Interactive REPL** - Readline-powered CLI with tab completion and command history
- **Fast Mode** - Single-worker quick research for simple queries
- **Deep Mode** - Multi-worker parallel research with automatic task decomposition
- **ReAct Pattern** - Reason + Act agent loop with tool use (search, fetch)
- **Session Persistence** - JSON state files + Obsidian-compatible markdown vault
- **Streaming Output** - Real-time progress updates and token streaming
- **Session Continuation** - Expand, rerun workers, recompile reports

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           REPL                                   │
│  ┌─────────┐  ┌────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │ Parser  │→ │ Router │→ │ Handlers │→ │ Renderer (colored)  │ │
│  └─────────┘  └────────┘  └──────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Orchestrator                              │
│  ┌──────────┐  ┌────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ Planner  │→ │ WorkerPool │→ │ ReAct Agents│→ │ Synthesizer│  │
│  │(analyze) │  │(goroutines)│  │  (parallel) │  │  (report)  │  │
│  └──────────┘  └────────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Services                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ LLM Client│  │   Tools   │  │  Session  │  │   Obsidian   │  │
│  │(OpenRouter)│  │(Brave,Web)│  │   Store   │  │    Writer    │  │
│  └───────────┘  └───────────┘  └───────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| **REPL** | Interactive shell with readline, command parsing, and colored output |
| **Orchestrator** | Coordinates multi-agent research: analyzes complexity, creates plans, manages workers |
| **ReAct Agent** | Implements Reason+Act loop with tool calling (search, fetch) |
| **Worker Pool** | Manages concurrent goroutines for parallel research |
| **Event Bus** | Pub/sub system for real-time progress updates |
| **Session Store** | JSON persistence with Obsidian markdown export |

### Data Flow

1. User enters query via REPL
2. Router dispatches to appropriate handler (fast/deep)
3. **Fast mode**: Single ReAct agent researches the query
4. **Deep mode**:
   - Planner analyzes query complexity (0.0-1.0)
   - Creates N parallel research tasks based on complexity
   - Worker pool executes tasks via goroutines
   - Synthesizer combines results into final report
5. Session saved to JSON + Obsidian vault
6. Results rendered to terminal

## Installation

### Prerequisites

- Go 1.22 or later
- API keys:
  - [OpenRouter](https://openrouter.ai/) - LLM provider
  - [Brave Search](https://brave.com/search/api/) - Web search

### Option 1: Build Binary

```bash
# Clone and build
cd go-research
go build -o research ./cmd/research

# Run the binary
./research
```

### Option 2: Run Directly with Go

```bash
cd go-research
go run ./cmd/research
```

## Configuration

### Environment Variables

Create a `.env` file in the `go-research` directory:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...
BRAVE_API_KEY=BSA...

# Optional
RESEARCH_VAULT=~/research-vault    # Obsidian vault path
RESEARCH_VERBOSE=true              # Enable debug output
```

The application automatically loads `.env` on startup.

### Manual Configuration

You can also export variables directly:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
export BRAVE_API_KEY=BSA...
go run ./cmd/research
```

## Development

### Project Structure

```
go-research/
├── cmd/research/          # Entry point
│   └── main.go
├── internal/
│   ├── agent/             # ReAct agent implementation
│   │   ├── react.go       # Main agent loop
│   │   ├── prompts.go     # System prompts
│   │   └── worker.go      # Worker wrapper
│   ├── config/            # Configuration loading
│   ├── events/            # Event bus (pub/sub)
│   ├── llm/               # LLM client (OpenRouter)
│   ├── obsidian/          # Markdown vault writer
│   ├── orchestrator/      # Multi-agent coordination
│   │   ├── orchestrator.go
│   │   ├── planner.go     # Query analysis & decomposition
│   │   ├── pool.go        # Worker pool (goroutines)
│   │   └── synthesizer.go # Report generation
│   ├── repl/              # Interactive shell
│   │   ├── repl.go        # Main loop
│   │   ├── router.go      # Command routing
│   │   ├── parser.go      # Input parsing
│   │   ├── renderer.go    # Terminal output
│   │   ├── completer.go   # Tab completion
│   │   └── handlers/      # Command implementations
│   ├── session/           # Session persistence
│   ├── tools/             # Agent tools (search, fetch)
│   └── e2e/               # End-to-end tests
├── .env.example
├── go.mod
└── README.md
```

### Running Tests

```bash
# Run all tests
go test ./...

# Run with verbose output
go test ./... -v

# Run only E2E tests
go test ./internal/e2e/... -v

# Run specific test
go test ./internal/e2e/... -run TestFastResearchWorkflow -v
```

### Test Coverage

The test suite includes 49 tests covering:

- **Parser & Router** - Command parsing, aliases, routing
- **Fast/Deep workflows** - Full research flows with mocked LLM
- **Session management** - Persistence, versioning, loading
- **All command handlers** - Edge cases and error handling
- **Infrastructure** - Event bus, cost tracking, context cancellation

### Building

```bash
# Build for current platform
go build -o research ./cmd/research

# Cross-compile for Linux
GOOS=linux GOARCH=amd64 go build -o research-linux ./cmd/research

# Cross-compile for macOS ARM
GOOS=darwin GOARCH=arm64 go build -o research-mac ./cmd/research
```

### Code Quality

```bash
# Format code
go fmt ./...

# Run linter
go vet ./...

# Tidy dependencies
go mod tidy
```

## How It Works

### ReAct Agent Loop

The agent follows the Reason + Act pattern:

1. **Think** - Analyze the current state and decide next action
2. **Act** - Execute a tool (search, fetch) or provide final answer
3. **Observe** - Process tool results
4. **Repeat** - Until answer found or max iterations reached

Tool calls use XML-style tags:
```
<tool name="search">{"query": "ReAct agent pattern LLM"}</tool>
```

Final answers are wrapped:
```
<answer>
The ReAct pattern combines reasoning and acting...
</answer>
```

### Complexity-Based Worker Allocation

| Complexity Score | Workers | Use Case |
|-----------------|---------|----------|
| 0.0 - 0.3 | 1 | Simple factual queries |
| 0.3 - 0.6 | 3 | Moderate multi-aspect topics |
| 0.6 - 1.0 | 5 | Complex research requiring parallel investigation |

### Session Persistence

Sessions are saved in two formats:

1. **JSON** (`~/.research_state/<id>.json`) - Full session data
2. **Obsidian** (`~/research-vault/<id>/`) - Markdown files with frontmatter

Obsidian structure:
```
<session-id>/
├── session.md      # Session overview with wiki-links
├── workers/
│   ├── worker_1.md
│   └── worker_2.md
└── reports/
    └── report_v1.md
```

## Dependencies

- [chzyer/readline](https://github.com/chzyer/readline) - REPL readline support
- [fatih/color](https://github.com/fatih/color) - Colored terminal output
- [google/uuid](https://github.com/google/uuid) - Session ID generation
- [joho/godotenv](https://github.com/joho/godotenv) - .env file loading
- [golang.org/x/net/html](https://pkg.go.dev/golang.org/x/net/html) - HTML parsing for fetch tool
- [gopkg.in/yaml.v3](https://github.com/go-yaml/yaml) - YAML frontmatter

## License

MIT
