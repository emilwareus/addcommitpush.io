package repl

import (
	"strings"
)

// ParsedInput represents parsed user input
type ParsedInput struct {
	IsCommand bool
	Command   string
	Args      []string
	RawText   string
}

// Parse parses user input into structured form
func Parse(input string) ParsedInput {
	input = strings.TrimSpace(input)

	if input == "" {
		return ParsedInput{}
	}

	if strings.HasPrefix(input, "/") {
		parts := strings.Fields(input)
		cmd := strings.TrimPrefix(parts[0], "/")
		var args []string
		if len(parts) > 1 {
			args = parts[1:]
		}
		return ParsedInput{
			IsCommand: true,
			Command:   cmd,
			Args:      args,
			RawText:   input,
		}
	}

	return ParsedInput{
		IsCommand: false,
		RawText:   input,
	}
}
