package obsidian

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go-research/internal/session"

	"gopkg.in/yaml.v3"
)

// Loader handles reading sessions from Obsidian vault
type Loader struct {
	vaultPath string
}

// NewLoader creates a new Obsidian loader
func NewLoader(vaultPath string) *Loader {
	return &Loader{vaultPath: vaultPath}
}

// Load reads a session from the vault
func (l *Loader) Load(sessionID string) (*session.Session, error) {
	sessionFile := filepath.Join(l.vaultPath, sessionID, "session.md")
	data, err := os.ReadFile(sessionFile)
	if err != nil {
		return nil, fmt.Errorf("read session file: %w", err)
	}

	// Parse YAML frontmatter
	content := string(data)
	if !strings.HasPrefix(content, "---") {
		return nil, fmt.Errorf("invalid session file: missing frontmatter")
	}

	parts := strings.SplitN(content[3:], "---", 2)
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid session file: malformed frontmatter")
	}

	var frontmatter map[string]interface{}
	if err := yaml.Unmarshal([]byte(parts[0]), &frontmatter); err != nil {
		return nil, fmt.Errorf("parse frontmatter: %w", err)
	}

	// Build session from frontmatter
	sess := &session.Session{
		ID: sessionID,
	}

	if v, ok := frontmatter["query"].(string); ok {
		sess.Query = v
	}

	if v, ok := frontmatter["version"].(int); ok {
		sess.Version = v
	}

	if v, ok := frontmatter["complexity_score"].(float64); ok {
		sess.ComplexityScore = v
	}

	if v, ok := frontmatter["status"].(string); ok {
		sess.Status = session.SessionStatus(v)
	}

	if v, ok := frontmatter["created_at"].(string); ok {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			sess.CreatedAt = t
		}
	}

	if v, ok := frontmatter["updated_at"].(string); ok {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			sess.UpdatedAt = t
		}
	}

	if v, ok := frontmatter["cost"].(float64); ok {
		sess.Cost.TotalCost = v
	}

	return sess, nil
}

// ListSessions returns all session IDs in the vault
func (l *Loader) ListSessions() ([]string, error) {
	entries, err := os.ReadDir(l.vaultPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read vault: %w", err)
	}

	var sessions []string
	for _, e := range entries {
		if e.IsDir() {
			sessionFile := filepath.Join(l.vaultPath, e.Name(), "session.md")
			if _, err := os.Stat(sessionFile); err == nil {
				sessions = append(sessions, e.Name())
			}
		}
	}

	return sessions, nil
}
