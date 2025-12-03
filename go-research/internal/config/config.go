package config

import (
	"os"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration
type Config struct {
	// API Keys
	OpenRouterAPIKey string
	BraveAPIKey      string

	// Paths
	VaultPath     string
	HistoryFile   string
	StateFile     string
	EventStoreDir string // Event-sourced storage directory

	// Timeouts
	WorkerTimeout  time.Duration
	RequestTimeout time.Duration

	// Agent settings
	MaxIterations int
	MaxTokens     int
	MaxWorkers    int

	// Model
	Model string

	// Verbose mode
	Verbose bool
}

// Load reads configuration from environment and defaults
func Load() *Config {
	// Load .env file if present (silently ignore if not found)
	_ = godotenv.Load()

	home, _ := os.UserHomeDir()

	return &Config{
		OpenRouterAPIKey: os.Getenv("OPENROUTER_API_KEY"),
		BraveAPIKey:      os.Getenv("BRAVE_API_KEY"),

		VaultPath:     getEnvOrDefault("RESEARCH_VAULT", filepath.Join(home, "research-vault")),
		HistoryFile:   filepath.Join(home, ".research_history"),
		StateFile:     filepath.Join(home, ".research_state"),
		EventStoreDir: filepath.Join(home, ".research_events"),

		WorkerTimeout:  30 * time.Minute,
		RequestTimeout: 5 * time.Minute,

		MaxIterations: 20,
		MaxTokens:     50000,
		MaxWorkers:    5,

		Model: "alibaba/tongyi-deepresearch-30b-a3b",

		Verbose: os.Getenv("RESEARCH_VERBOSE") == "true",
	}
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
