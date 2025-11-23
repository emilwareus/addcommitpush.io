package handlers

import (
	"go-research/internal/repl"
)

// RegisterAll returns a map of all command handlers
func RegisterAll() map[string]repl.Handler {
	return map[string]repl.Handler{
		"fast":      &FastHandler{},
		"deep":      &DeepHandler{},
		"expand":    &ExpandHandler{},
		"sessions":  &SessionsHandler{},
		"load":      &LoadHandler{},
		"new":       &NewHandler{},
		"workers":   &WorkersHandler{},
		"rerun":     &RerunHandler{},
		"recompile": &RecompileHandler{},
		"verbose":   &VerboseHandler{},
		"model":     &ModelHandler{},
		"help":      &HelpHandler{},
		"quit":      &QuitHandler{},
	}
}
