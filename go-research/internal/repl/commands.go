package repl

// Command categories used for grouping help text.
const (
	CommandCategoryAgents   = "Research Agents"
	CommandCategorySessions = "Sessions & History"
	CommandCategoryWorkflow = "Active Session"
	CommandCategorySettings = "Settings & Controls"
	CommandCategoryMeta     = "Meta"
)

// CommandDoc describes a REPL command for documentation.
type CommandDoc struct {
	Name        string
	Usage       string
	Description string
	Category    string
}
