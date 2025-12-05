package handlers

import (
	"fmt"

	"go-research/internal/architectures/catalog"
	_ "go-research/internal/architectures/storm"
	_ "go-research/internal/architectures/think_deep"
	"go-research/internal/repl"
)

var commandDocs []repl.CommandDoc

// RegisterAll returns a map of all command handlers
func RegisterAll() map[string]repl.Handler {
	handlers := make(map[string]repl.Handler)
	docs := make([]repl.CommandDoc, 0, 16)

	add := func(name string, handler repl.Handler, usage, description, category string) {
		handlers[name] = handler
		docs = append(docs, repl.CommandDoc{
			Name:        name,
			Usage:       usage,
			Description: description,
			Category:    category,
		})
	}

	add("fast", &FastHandler{}, "/fast <query>", "Quick single-worker research", repl.CommandCategoryAgents)
	add("expand", &ExpandHandler{}, "/expand <text>", "Expand on current research", repl.CommandCategoryWorkflow)
	add("question", &QuestionHandler{}, "/question <query>", "Ask about existing research", repl.CommandCategoryWorkflow)
	add("sessions", &SessionsHandler{}, "/sessions", "List all sessions", repl.CommandCategorySessions)
	add("load", &LoadHandler{}, "/load <id>", "Load a previous session", repl.CommandCategorySessions)
	add("new", &NewHandler{}, "/new", "Clear session and start fresh", repl.CommandCategorySessions)
	add("workers", &WorkersHandler{}, "/workers", "Show worker status", repl.CommandCategoryWorkflow)
	add("context", &ContextHandler{}, "/context [-v]", "Show context window statistics and content", repl.CommandCategoryWorkflow)
	add("rerun", &RerunHandler{}, "/rerun <id>", "Rerun a previous query", repl.CommandCategorySessions)
	add("recompile", &RecompileHandler{}, "/recompile", "Hot reload the agent", repl.CommandCategorySettings)
	add("verbose", &VerboseHandler{}, "/verbose on|off", "Toggle verbose mode", repl.CommandCategorySettings)
	add("model", &ModelHandler{}, "/model <name>", "Switch LLM model", repl.CommandCategorySettings)
	add("help", &HelpHandler{}, "/help", "Show all commands", repl.CommandCategoryMeta)
	add("quit", &QuitHandler{}, "/quit", "Exit the REPL", repl.CommandCategoryMeta)
	add("architectures", &ArchitecturesHandler{}, "/architectures", "List available research architectures", repl.CommandCategoryMeta)
	add("benchmark", &BenchmarkHandler{}, "/benchmark <query>", "Compare architecture results", repl.CommandCategoryMeta)

	for _, def := range catalog.Definitions() {
		add(
			def.Name,
			NewArchitectureCommandHandler(def),
			fmt.Sprintf("/%s <query>", def.Name),
			def.Description,
			repl.CommandCategoryAgents,
		)
	}

	commandDocs = docs
	return handlers
}

// CommandDocs returns documentation for all registered commands.
func CommandDocs() []repl.CommandDoc {
	copied := make([]repl.CommandDoc, len(commandDocs))
	copy(copied, commandDocs)
	return copied
}
