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
	Classifier  *QueryClassifier   // LLM-based query classifier for intent routing
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

	// Check if session has actual research content (not just a blank session)
	hasResearchContent := r.ctx.Session != nil && r.ctx.Session.Report != ""

	// Natural language with session that has content - classify intent using LLM
	if hasResearchContent && r.ctx.Classifier != nil {
		sessionSummary := r.ctx.Session.Query
		intent, err := r.ctx.Classifier.Classify(r.ctx.RunContext, parsed.RawText, true, sessionSummary)
		if err == nil {
			switch intent.Type {
			case IntentQuestion:
				if handler, ok := r.handlers["question"]; ok {
					return handler, []string{parsed.RawText}, nil
				}
			case IntentExpand:
				if handler, ok := r.handlers["expand"]; ok {
					args := []string{parsed.RawText}
					if intent.Topic != "" {
						args = []string{intent.Topic}
					}
					return handler, args, nil
				}
			case IntentResearch:
				// Use think_deep for new research (better quality than storm)
				if handler, ok := r.handlers["think_deep"]; ok {
					return handler, []string{parsed.RawText}, nil
				}
			}
		}
		// On classification error, fall through to default expand behavior for sessions with content
		handler, ok := r.handlers["expand"]
		if ok {
			return handler, []string{parsed.RawText}, nil
		}
	}

	// No session OR empty session - use think_deep as default research handler
	handler, ok := r.handlers["think_deep"]
	if !ok {
		return nil, nil, fmt.Errorf("no default research handler registered (think_deep)")
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
