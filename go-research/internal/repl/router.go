package repl

import (
	"context"
	"fmt"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/obsidian"
	"go-research/internal/session"
)

// Handler interface for command handlers
type Handler interface {
	Execute(ctx *Context, args []string) error
}

// Context provides shared state to handlers
type Context struct {
	Session     *session.Session
	Store       *session.Store
	Bus         *events.Bus
	Renderer    *Renderer
	Config      *config.Config
	Obsidian    *obsidian.Writer
	CommandDocs []CommandDoc
	RunContext  context.Context    // Cancelable context for current operation
	Cancel      context.CancelFunc // Cancel function to abort current operation
}

// Router routes input to appropriate handlers
type Router struct {
	handlers map[string]Handler
	ctx      *Context
}

// NewRouter creates a new router with all handlers registered
func NewRouter(ctx *Context, handlers map[string]Handler) *Router {
	return &Router{
		handlers: handlers,
		ctx:      ctx,
	}
}

// Route determines how to handle user input
func (r *Router) Route(input string) (Handler, []string, error) {
	parsed := Parse(input)

	// Empty input - do nothing
	if parsed.RawText == "" {
		return nil, nil, nil
	}

	// Commands start with /
	if parsed.IsCommand {
		return r.routeCommand(parsed)
	}

	// Natural language: if session exists, expand; otherwise start storm research
	if r.ctx.Session != nil {
		handler, ok := r.handlers["expand"]
		if !ok {
			return nil, nil, fmt.Errorf("expand handler not registered")
		}
		return handler, []string{parsed.RawText}, nil
	}

	// No session - use storm as default research handler
	handler, ok := r.handlers["storm"]
	if !ok {
		return nil, nil, fmt.Errorf("no default research handler registered (storm)")
	}
	return handler, []string{parsed.RawText}, nil
}

func (r *Router) routeCommand(parsed ParsedInput) (Handler, []string, error) {
	cmd := parsed.Command
	args := parsed.Args

	// Handle aliases
	switch cmd {
	case "q", "quit", "exit":
		cmd = "quit"
	case "f", "fast":
		cmd = "fast"
	case "s", "sessions":
		cmd = "sessions"
	case "l", "load":
		cmd = "load"
	case "n", "new":
		cmd = "new"
	case "w", "workers":
		cmd = "workers"
	case "r", "rerun":
		cmd = "rerun"
	case "rc", "recompile":
		cmd = "recompile"
	case "e", "expand":
		cmd = "expand"
	case "h", "help", "?":
		cmd = "help"
	case "v", "verbose":
		cmd = "verbose"
	case "m", "model":
		cmd = "model"
	}

	handler, ok := r.handlers[cmd]
	if !ok {
		// Unknown command, show help
		helpHandler, helpOk := r.handlers["help"]
		if helpOk {
			return helpHandler, nil, nil
		}
		return nil, nil, fmt.Errorf("unknown command: /%s", cmd)
	}

	return handler, args, nil
}
