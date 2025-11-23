package session

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// VaultWriter interface for writing sessions to Obsidian vault
type VaultWriter interface {
	Write(sess *Session) error
}

// Store handles session persistence
type Store struct {
	stateDir    string
	vaultWriter VaultWriter
}

// NewStore creates a new session store
func NewStore(stateDir string) (*Store, error) {
	if err := os.MkdirAll(stateDir, 0755); err != nil {
		return nil, fmt.Errorf("create state dir: %w", err)
	}
	return &Store{stateDir: stateDir}, nil
}

// SetVaultWriter sets the Obsidian vault writer for dual persistence
func (s *Store) SetVaultWriter(w VaultWriter) {
	s.vaultWriter = w
}

// Save persists a session to disk (JSON) and optionally to Obsidian vault
func (s *Store) Save(sess *Session) error {
	sess.UpdatedAt = time.Now()

	data, err := json.MarshalIndent(sess, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal session: %w", err)
	}

	filename := filepath.Join(s.stateDir, sess.ID+".json")
	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("write session: %w", err)
	}

	// Update last session pointer
	lastFile := filepath.Join(s.stateDir, ".last")
	if err := os.WriteFile(lastFile, []byte(sess.ID), 0644); err != nil {
		// Non-critical error, don't fail the save
		return nil
	}

	// Write to Obsidian vault if configured
	if s.vaultWriter != nil {
		if err := s.vaultWriter.Write(sess); err != nil {
			// Log error but don't fail - vault is secondary storage
			fmt.Fprintf(os.Stderr, "Warning: failed to write to vault: %v\n", err)
		}
	}

	return nil
}

// Load retrieves a session by ID
func (s *Store) Load(id string) (*Session, error) {
	filename := filepath.Join(s.stateDir, id+".json")
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("read session: %w", err)
	}

	var sess Session
	if err := json.Unmarshal(data, &sess); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}

	return &sess, nil
}

// LoadLast returns the most recent session
func (s *Store) LoadLast() (*Session, error) {
	lastFile := filepath.Join(s.stateDir, ".last")
	data, err := os.ReadFile(lastFile)
	if err != nil {
		return nil, nil // No last session
	}

	return s.Load(strings.TrimSpace(string(data)))
}

// List returns all session summaries, sorted by date descending
func (s *Store) List() ([]SessionSummary, error) {
	files, err := os.ReadDir(s.stateDir)
	if err != nil {
		return nil, fmt.Errorf("read state dir: %w", err)
	}

	var summaries []SessionSummary
	for _, f := range files {
		if !strings.HasSuffix(f.Name(), ".json") {
			continue
		}

		sess, err := s.Load(strings.TrimSuffix(f.Name(), ".json"))
		if err != nil {
			continue
		}

		summaries = append(summaries, SessionSummary{
			ID:        sess.ID,
			Query:     sess.Query,
			Status:    sess.Status,
			CreatedAt: sess.CreatedAt,
			Cost:      sess.Cost.TotalCost,
		})
	}

	// Sort by date descending
	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].CreatedAt.After(summaries[j].CreatedAt)
	})

	return summaries, nil
}

// Delete removes a session by ID
func (s *Store) Delete(id string) error {
	filename := filepath.Join(s.stateDir, id+".json")
	if err := os.Remove(filename); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// SessionSummary is a lightweight session representation
type SessionSummary struct {
	ID        string
	Query     string
	Status    SessionStatus
	CreatedAt time.Time
	Cost      float64
}
