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

// ToolExecutor is the interface for tool execution (allows mocking in tests)
type ToolExecutor interface {
	Execute(ctx context.Context, name string, args map[string]interface{}) (string, error)
	ToolNames() []string
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

// ToolNames returns just the tool names
func (r *Registry) ToolNames() []string {
	names := make([]string, 0, len(r.tools))
	for name := range r.tools {
		names = append(names, name)
	}
	return names
}
