package architectures

import (
	"fmt"
	"sort"
	"sync"
)

// Registry holds all available research architectures.
// Architectures register themselves during initialization.
type Registry struct {
	mu            sync.RWMutex
	architectures map[string]Architecture
}

// Global registry instance
var globalRegistry = &Registry{
	architectures: make(map[string]Architecture),
}

// Register adds an architecture to the global registry.
// Called by architecture packages in their init() functions.
func Register(arch Architecture) {
	globalRegistry.mu.Lock()
	defer globalRegistry.mu.Unlock()
	globalRegistry.architectures[arch.Name()] = arch
}

// Get retrieves an architecture by name from the global registry.
func Get(name string) (Architecture, error) {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	arch, ok := globalRegistry.architectures[name]
	if !ok {
		return nil, fmt.Errorf("unknown architecture: %s", name)
	}
	return arch, nil
}

// List returns all registered architecture names, sorted alphabetically.
func List() []string {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	names := make([]string, 0, len(globalRegistry.architectures))
	for name := range globalRegistry.architectures {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// All returns all registered architectures.
func All() []Architecture {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	archs := make([]Architecture, 0, len(globalRegistry.architectures))
	for _, arch := range globalRegistry.architectures {
		archs = append(archs, arch)
	}
	return archs
}

// ArchitectureInfo provides metadata about an architecture for display.
type ArchitectureInfo struct {
	Name           string
	Description    string
	SupportsResume bool
}

// Info returns information about all registered architectures.
func Info() []ArchitectureInfo {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	infos := make([]ArchitectureInfo, 0, len(globalRegistry.architectures))
	for _, arch := range globalRegistry.architectures {
		infos = append(infos, ArchitectureInfo{
			Name:           arch.Name(),
			Description:    arch.Description(),
			SupportsResume: arch.SupportsResume(),
		})
	}

	// Sort by name for consistent display
	sort.Slice(infos, func(i, j int) bool {
		return infos[i].Name < infos[j].Name
	})

	return infos
}
