package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go-research/internal/config"
	"go-research/internal/events"
	"go-research/internal/obsidian"
	"go-research/internal/repl"
	"go-research/internal/repl/handlers"
	"go-research/internal/session"
)

// mergeHandlers combines two handler maps, with b taking precedence.
func mergeHandlers(a, b map[string]repl.Handler) map[string]repl.Handler {
	result := make(map[string]repl.Handler)
	for k, v := range a {
		result[k] = v
	}
	for k, v := range b {
		result[k] = v
	}
	return result
}

func main() {
	cfg := config.Load()

	if cfg.OpenRouterAPIKey == "" {
		fmt.Fprintln(os.Stderr, "Error: OPENROUTER_API_KEY environment variable not set")
		os.Exit(1)
	}

	if cfg.BraveAPIKey == "" {
		fmt.Fprintln(os.Stderr, "Error: BRAVE_API_KEY environment variable not set")
		os.Exit(1)
	}

	// Create session store
	store, err := session.NewStore(cfg.StateFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating session store: %v\n", err)
		os.Exit(1)
	}

	// Set up Obsidian vault writer for dual persistence
	vaultWriter := obsidian.NewWriter(cfg.VaultPath)
	store.SetVaultWriter(vaultWriter)

	// Create event bus
	bus := events.NewBus(100)
	defer bus.Close()

	// Register all command handlers (legacy)
	allHandlers := handlers.RegisterAll()
	commandDocs := handlers.CommandDocs()

	// Register event-sourced handlers
	esHandlers, err := handlers.CreateEventStoreHandlers(cfg.EventStoreDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to create event-sourced handlers: %v\n", err)
	} else {
		allHandlers = mergeHandlers(allHandlers, esHandlers)
	}

	// Create REPL
	r, err := repl.New(store, bus, cfg, allHandlers, commandDocs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating REPL: %v\n", err)
		os.Exit(1)
	}

	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle signals
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		cancel()
	}()

	// Run REPL
	if err := r.Run(ctx); err != nil && err != context.Canceled {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
