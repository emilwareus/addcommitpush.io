package catalog

import (
	"fmt"
	"sort"
	"sync"

	"go-research/internal/architectures"
	"go-research/internal/config"
	"go-research/internal/events"
)

// Dependencies describes the runtime inputs required to construct an architecture instance.
type Dependencies struct {
	Config *config.Config
	Bus    *events.Bus
}

// Definition captures metadata and a factory for an architecture.
type Definition struct {
	Name           string
	Description    string
	SupportsResume bool
	Build          func(Dependencies) (architectures.Architecture, error)
}

var (
	mu    sync.RWMutex
	defs  = make(map[string]Definition)
	order []string
)

// Register adds a new architecture definition to the catalog.
func Register(def Definition) {
	mu.Lock()
	defer mu.Unlock()

	defs[def.Name] = def
	order = append(order, def.Name)
	sort.Strings(order)
}

// Definitions returns all registered architecture definitions sorted by name.
func Definitions() []Definition {
	mu.RLock()
	defer mu.RUnlock()

	unique := dedupe(order)
	results := make([]Definition, 0, len(unique))
	for _, name := range unique {
		if def, ok := defs[name]; ok {
			results = append(results, def)
		}
	}
	return results
}

// Get retrieves a single architecture definition by name.
func Get(name string) (Definition, error) {
	mu.RLock()
	defer mu.RUnlock()

	def, ok := defs[name]
	if !ok {
		return Definition{}, fmt.Errorf("unknown architecture: %s", name)
	}
	return def, nil
}

func dedupe(items []string) []string {
	seen := make(map[string]bool, len(items))
	result := make([]string, 0, len(items))
	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}
