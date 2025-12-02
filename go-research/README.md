# Go Research Agent

A Go-based deep research agent implementing the STORM architecture (Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking) with an interactive REPL interface.

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

### Research Agents

| Command | Description |
|---------|-------------|
| `/fast <query>` | Quick single-worker research |
| `/storm <query>` | STORM: Multi-perspective conversations with cross-validation and synthesis |

### Active Session

| Command | Description |
|---------|-------------|
| `/expand <text>` | Expand on current research |
| `/workers` | Show worker/conversation status |

### Sessions & History

| Command | Description |
|---------|-------------|
| `/sessions` | List all sessions |
| `/load <id>` | Load a previous session |
| `/new` | Clear session and start fresh |
| `/rerun <id>` | Rerun a previous query |

### Settings & Controls

| Command | Description |
|---------|-------------|
| `/recompile` | Hot reload the agent |
| `/verbose on\|off` | Toggle verbose mode |
| `/model <name>` | Switch LLM model |

### Meta

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/quit` | Exit the REPL |
| `/architectures` | List available research architectures |
| `/benchmark <query>` | Compare architecture results |

**Tip:** Just type your question to start STORM research. After research, type follow-ups to expand.

## Examples

```bash
# Just type to start STORM research (no command needed!)
research> How do modern LLM agents work?

# Or explicitly use STORM
research> /storm What are the implications of quantum computing on cryptography?

# Quick single-worker research for simple queries
research> /fast What is the ReAct agent pattern?

# After research, just type follow-up questions
research> Tell me more about tool-use capabilities

# Session management
research> /sessions
research> /load 2025-11-22-abc123
research> /new
```

---

## STORM Architecture

This agent implements the **STORM** research methodology - a multi-perspective conversation-based approach that produces comprehensive, well-sourced reports.

### How STORM Works

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DISCOVER                                                     │
│     - Survey related topics via web search                       │
│     - LLM identifies 3-6 expert perspectives                     │
│     - Each gets: Name, Focus, Initial Questions                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CONVERSE (parallel per perspective)                          │
│     For each perspective, simulate a conversation:               │
│       WikiWriter: Asks questions based on persona                │
│       TopicExpert: Converts questions → search queries           │
│                    Executes web searches                         │
│                    Synthesizes answers with citations            │
│     Loop until "Thank you for your help!"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. ANALYZE                                                      │
│     - Extract all facts from conversations                       │
│     - Detect contradictions between perspectives                 │
│     - Identify knowledge gaps                                    │
│     - Fill gaps with targeted searches                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. SYNTHESIZE (Two-Phase Outline)                               │
│     a. Draft outline from conversation content                   │
│     b. Refine outline for coherence                              │
│     c. Generate full report with inline citations                │
└─────────────────────────────────────────────────────────────────┘
```

### Example CLI Visualization

When you run `/storm <query>`, you'll see:

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                           🔬 STORM RESEARCH PLAN                             │
│                                                                              │
│  Topic: How do I build a custom security sandbox for cloud deployment?       │
╰──────────────────────────────────────────────────────────────────────────────╯

                               ┌────────────────┐
                               │1. DISCOVER     │
                               │Perspectives    │
                               └────────────────┘
                                       │
                               ┌────────────────┐
                               │2. CONVERSE     │
                               │Parallel        │
                               └────────────────┘
                                       │
                ┌───────────────┬───────────────┬───────────────┐
                │               │               │               │
         ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
         │   Conv 1   │  │   Conv 2   │  │   Conv 3   │  │   Conv 4   │
         │○ pending │  │○ pending │  │○ pending │  │○ pending │
         └────────────┘  └────────────┘  └────────────┘  └────────────┘
                │               │               │               │
                └───────────────┴───────────────┴───────────────┘
                                       │
                               ┌────────────────┐
                               │3. ANALYZE      │
                               │Validate Facts  │
                               └────────────────┘
                                       │
                               ┌────────────────┐
                               │4. SYNTHESIZE   │
                               │Final Report    │
                               └────────────────┘

╭──────────────────────────────────────────────────────────────────────────────╮
│  PERSPECTIVES (WikiWriter↔TopicExpert conversations):                        │
│                                                                              │
│  1. Cloud Security Ar... ─ Multi-tenant isolation, threat containment...     │
│  2. Performance Engineer ─ Startup latency optimization, resource manage...  │
│  3. GCP Platform Spec... ─ GCP-native implementation patterns, BYOC inte...  │
│  4. DevSecOps Engineer   ─ Secure CI/CD integration, immutable infrastru...  │
╰──────────────────────────────────────────────────────────────────────────────╯
```

---

## Features

- **Interactive REPL** - Readline-powered CLI with command history
- **STORM Architecture** - Multi-perspective conversation simulation
- **Fast Mode** - Single-worker quick research for simple queries
- **Cross-Validation** - Detect contradictions and fill knowledge gaps
- **Two-Phase Synthesis** - Draft and refine outlines before report generation
- **Session Persistence** - JSON state files + Obsidian-compatible markdown vault
- **Streaming Output** - Real-time progress updates during conversations
- **Session Continuation** - Expand, rerun, and load previous sessions

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           REPL                                   │
│  ┌─────────┐  ┌────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │ Parser  │→ │ Router │→ │ Handlers │→ │ Renderer (colored)  │ │
│  └─────────┘  └────────┘  └──────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORM Orchestrator                            │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Perspective│→ │ Conversation │→ │ Analysis │→ │ Synthesis │  │
│  │ Discovery  │  │  Simulation  │  │  Agent   │  │   Agent   │  │
│  └────────────┘  └──────────────┘  └──────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Conversation Agents                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  WikiWriter ↔ TopicExpert (per perspective, parallel)       ││
│  │    - WikiWriter asks questions from persona                 ││
│  │    - TopicExpert searches and answers with citations        ││
│  └─────────────────────────────────────────────────────────────┘│
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
| **STORM Orchestrator** | Coordinates the 4-phase research flow |
| **Perspective Discovery** | Surveys topics and generates expert perspectives |
| **Conversation Simulation** | Parallel WikiWriter↔TopicExpert dialogues |
| **Analysis Agent** | Validates facts, detects contradictions, fills gaps |
| **Synthesis Agent** | Two-phase outline generation and report writing |
| **Event Bus** | Pub/sub system for real-time progress updates |
| **Session Store** | JSON persistence with Obsidian markdown export |

### Data Flow

1. User enters query via REPL
2. Router dispatches to appropriate handler (fast/storm)
3. **Fast mode**: Single ReAct agent researches the query
4. **STORM mode**:
   - **DISCOVER**: Survey related topics, generate 3-6 perspectives
   - **CONVERSE**: Parallel WikiWriter↔TopicExpert conversations
   - **ANALYZE**: Extract facts, detect contradictions, fill gaps
   - **SYNTHESIZE**: Two-phase outline → final report with citations
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
├── cmd/research/              # Entry point
│   └── main.go
├── internal/
│   ├── agents/                # Conversation agents
│   │   ├── conversation.go    # WikiWriter↔TopicExpert simulation
│   │   ├── analysis.go        # Fact validation & gap detection
│   │   └── synthesis.go       # Two-phase outline & report generation
│   ├── architectures/         # Research architecture implementations
│   │   ├── storm/             # STORM implementation
│   │   └── catalog/           # Architecture registry
│   ├── config/                # Configuration loading
│   ├── events/                # Event bus (pub/sub)
│   ├── llm/                   # LLM client (OpenRouter)
│   ├── obsidian/              # Markdown vault writer
│   ├── orchestrator/          # STORM orchestrator
│   │   ├── deep_storm.go      # Main STORM flow
│   │   └── orchestrator.go    # Fast mode orchestrator
│   ├── planning/              # Perspective generation
│   ├── repl/                  # Interactive shell
│   │   ├── repl.go            # Main loop
│   │   ├── router.go          # Command routing
│   │   ├── dag_display.go     # STORM flow visualization
│   │   └── handlers/          # Command implementations
│   ├── session/               # Session persistence
│   ├── tools/                 # Agent tools (search, fetch)
│   └── e2e/                   # End-to-end tests
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

# Run STORM architecture tests
go test ./internal/architectures/storm/... -v

# Run E2E tests
go test ./internal/e2e/... -v
```

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

### STORM Conversation Flow

Each perspective runs a simulated conversation:

1. **WikiWriter** asks a question based on the perspective's focus
2. **TopicExpert** converts the question to search queries
3. **TopicExpert** executes web searches
4. **TopicExpert** synthesizes an answer with citations
5. **WikiWriter** asks follow-up questions or says "Thank you!"
6. Repeat until conversation ends

### Perspective-Based Research

| Complexity | Perspectives | Use Case |
|------------|--------------|----------|
| Simple | 2-3 | Factual queries with limited scope |
| Moderate | 3-4 | Multi-aspect topics needing diverse views |
| Complex | 5-6 | Deep research requiring comprehensive coverage |

### Session Persistence

Sessions are saved in two formats:

1. **JSON** (`~/.research_state/<id>.json`) - Full session data
2. **Obsidian** (`~/research-vault/<id>/`) - Markdown files with frontmatter

Obsidian structure:
```
<session-id>/
├── session.md      # Session overview with wiki-links
├── conversations/  # Per-perspective conversation logs
└── reports/
    └── report_v1.md
```