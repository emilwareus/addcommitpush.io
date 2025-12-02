package repl

import (
	"github.com/chzyer/readline"
)

// newCompleter creates a prefix completer for tab completion
func newCompleter() *readline.PrefixCompleter {
	return readline.NewPrefixCompleter(
		readline.PcItem("/fast"),
		readline.PcItem("/deep"),
		readline.PcItem("/expand"),
		readline.PcItem("/sessions"),
		readline.PcItem("/load"),
		readline.PcItem("/new"),
		readline.PcItem("/workers"),
		readline.PcItem("/rerun"),
		readline.PcItem("/recompile"),
		readline.PcItem("/model"),
		readline.PcItem("/verbose"),
		readline.PcItem("/help"),
		readline.PcItem("/quit"),
	)
}
