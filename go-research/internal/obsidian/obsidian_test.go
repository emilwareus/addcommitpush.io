package obsidian

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"go-research/internal/session"
)

// createTestSession creates a sample session for testing
func createTestSession() *session.Session {
	now := time.Now()
	completed := now.Add(5 * time.Minute)

	return &session.Session{
		ID:              "2025-01-15-abc123",
		Version:         1,
		Query:           "What is the ReAct agent pattern?",
		Mode:            session.ModeDeep,
		ComplexityScore: 0.75,
		Workers: []session.WorkerContext{
			{
				ID:             "worker-1",
				WorkerNum:      1,
				Objective:      "Research ReAct fundamentals",
				ToolsAvailable: []string{"search", "fetch"},
				FinalOutput:    "ReAct combines reasoning and acting in LLM agents...",
				Sources:        []string{"https://arxiv.org/abs/2210.03629", "https://react-lm.github.io/"},
				Status:         session.WorkerComplete,
				StartedAt:      now,
				CompletedAt:    &completed,
			},
			{
				ID:             "worker-2",
				WorkerNum:      2,
				Objective:      "Research practical implementations",
				ToolsAvailable: []string{"search", "fetch"},
				FinalOutput:    "LangChain and other frameworks implement ReAct...",
				Sources:        []string{"https://langchain.com/docs", "https://github.com/langchain-ai/langchain"},
				Status:         session.WorkerComplete,
				StartedAt:      now,
				CompletedAt:    &completed,
			},
		},
		Report:    "# ReAct Agent Pattern\n\nReAct is a paradigm that combines reasoning and acting...",
		Sources:   []string{"https://arxiv.org/abs/2210.03629", "https://langchain.com/docs"},
		Insights:  []session.Insight{},
		Cost:      session.CostBreakdown{TotalCost: 0.0125},
		CreatedAt: now,
		UpdatedAt: now,
		Status:    session.StatusComplete,
	}
}

func TestWriterCreatesDirectoryStructure(t *testing.T) {
	// Create temp directory for vault
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	writer := NewWriter(tmpDir)
	sess := createTestSession()

	if err := writer.Write(sess); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Verify directory structure
	expectedDirs := []string{
		sess.ID,
		filepath.Join(sess.ID, "workers"),
		filepath.Join(sess.ID, "insights"),
		filepath.Join(sess.ID, "sources"),
		filepath.Join(sess.ID, "reports"),
	}

	for _, dir := range expectedDirs {
		fullPath := filepath.Join(tmpDir, dir)
		info, err := os.Stat(fullPath)
		if err != nil {
			t.Errorf("expected directory %s to exist: %v", dir, err)
			continue
		}
		if !info.IsDir() {
			t.Errorf("expected %s to be a directory", dir)
		}
	}
}

func TestWriterCreatesWorkerFiles(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	writer := NewWriter(tmpDir)
	sess := createTestSession()

	if err := writer.Write(sess); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Verify worker files exist
	for i := range sess.Workers {
		workerFile := filepath.Join(tmpDir, sess.ID, "workers", "worker_"+string(rune('1'+i))+".md")
		if _, err := os.Stat(workerFile); err != nil {
			t.Errorf("expected worker file %s to exist: %v", workerFile, err)
		}
	}

	// Verify worker 1 content
	worker1Content, err := os.ReadFile(filepath.Join(tmpDir, sess.ID, "workers", "worker_1.md"))
	if err != nil {
		t.Fatalf("failed to read worker_1.md: %v", err)
	}

	content := string(worker1Content)

	// Check frontmatter
	if !strings.HasPrefix(content, "---") {
		t.Error("worker file should start with YAML frontmatter")
	}

	// Check required frontmatter fields
	expectedFields := []string{"worker_id:", "objective:", "status:", "started:", "sources:"}
	for _, field := range expectedFields {
		if !strings.Contains(content, field) {
			t.Errorf("worker file should contain frontmatter field %s", field)
		}
	}

	// Check content sections
	if !strings.Contains(content, "# Worker 1:") {
		t.Error("worker file should contain header with worker number")
	}
	if !strings.Contains(content, "## Output") {
		t.Error("worker file should contain Output section")
	}
	if !strings.Contains(content, "## Sources") {
		t.Error("worker file should contain Sources section")
	}
	if !strings.Contains(content, "https://arxiv.org") {
		t.Error("worker file should contain source URLs")
	}
}

func TestWriterCreatesReportFile(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	writer := NewWriter(tmpDir)
	sess := createTestSession()

	if err := writer.Write(sess); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Verify report file exists with correct versioning
	reportFile := filepath.Join(tmpDir, sess.ID, "reports", "report_v1.md")
	content, err := os.ReadFile(reportFile)
	if err != nil {
		t.Fatalf("expected report file to exist: %v", err)
	}

	contentStr := string(content)

	// Check frontmatter
	if !strings.HasPrefix(contentStr, "---") {
		t.Error("report file should start with YAML frontmatter")
	}
	if !strings.Contains(contentStr, "version: 1") {
		t.Error("report file should contain version in frontmatter")
	}
	if !strings.Contains(contentStr, "query:") {
		t.Error("report file should contain query in frontmatter")
	}

	// Check report content
	if !strings.Contains(contentStr, "# Research Report") {
		t.Error("report file should contain Research Report header")
	}
	if !strings.Contains(contentStr, "ReAct") {
		t.Error("report file should contain report content")
	}
}

func TestWriterCreatesSessionMOC(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	writer := NewWriter(tmpDir)
	sess := createTestSession()

	if err := writer.Write(sess); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Verify session MOC exists
	sessionFile := filepath.Join(tmpDir, sess.ID, "session.md")
	content, err := os.ReadFile(sessionFile)
	if err != nil {
		t.Fatalf("expected session.md to exist: %v", err)
	}

	contentStr := string(content)

	// Check frontmatter fields
	expectedFrontmatter := []string{
		"session_id:",
		"version:",
		"query:",
		"complexity_score:",
		"status:",
		"created_at:",
		"updated_at:",
		"cost:",
	}
	for _, field := range expectedFrontmatter {
		if !strings.Contains(contentStr, field) {
			t.Errorf("session MOC should contain frontmatter field %s", field)
		}
	}

	// Check wiki-links to workers
	if !strings.Contains(contentStr, "[[workers/worker_1.md|Worker 1]]") {
		t.Error("session MOC should contain wiki-link to worker 1")
	}
	if !strings.Contains(contentStr, "[[workers/worker_2.md|Worker 2]]") {
		t.Error("session MOC should contain wiki-link to worker 2")
	}

	// Check wiki-link to report
	if !strings.Contains(contentStr, "[[reports/report_v1.md|Report v1]]") {
		t.Error("session MOC should contain wiki-link to report")
	}

	// Check stats section
	if !strings.Contains(contentStr, "**Complexity**:") {
		t.Error("session MOC should contain complexity stat")
	}
	if !strings.Contains(contentStr, "**Workers**:") {
		t.Error("session MOC should contain workers count stat")
	}
	if !strings.Contains(contentStr, "**Cost**:") {
		t.Error("session MOC should contain cost stat")
	}
}

func TestLoaderLoadSession(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// First write a session
	writer := NewWriter(tmpDir)
	originalSess := createTestSession()

	if err := writer.Write(originalSess); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Now load it back
	loader := NewLoader(tmpDir)
	loadedSess, err := loader.Load(originalSess.ID)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}

	// Verify loaded session fields
	if loadedSess.ID != originalSess.ID {
		t.Errorf("ID mismatch: got %s, want %s", loadedSess.ID, originalSess.ID)
	}
	if loadedSess.Query != originalSess.Query {
		t.Errorf("Query mismatch: got %s, want %s", loadedSess.Query, originalSess.Query)
	}
	if loadedSess.Version != originalSess.Version {
		t.Errorf("Version mismatch: got %d, want %d", loadedSess.Version, originalSess.Version)
	}
	if loadedSess.Status != originalSess.Status {
		t.Errorf("Status mismatch: got %s, want %s", loadedSess.Status, originalSess.Status)
	}
	// Note: Complexity score is stored as formatted string, so small precision differences may occur
	if loadedSess.ComplexityScore < 0.74 || loadedSess.ComplexityScore > 0.76 {
		t.Errorf("ComplexityScore out of expected range: got %f, want ~0.75", loadedSess.ComplexityScore)
	}
}

func TestLoaderListSessions(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	writer := NewWriter(tmpDir)

	// Write multiple sessions
	sess1 := createTestSession()
	sess1.ID = "2025-01-15-session1"
	sess2 := createTestSession()
	sess2.ID = "2025-01-15-session2"

	if err := writer.Write(sess1); err != nil {
		t.Fatalf("Write sess1 failed: %v", err)
	}
	if err := writer.Write(sess2); err != nil {
		t.Fatalf("Write sess2 failed: %v", err)
	}

	// List sessions
	loader := NewLoader(tmpDir)
	sessions, err := loader.ListSessions()
	if err != nil {
		t.Fatalf("ListSessions failed: %v", err)
	}

	if len(sessions) != 2 {
		t.Errorf("expected 2 sessions, got %d", len(sessions))
	}

	// Check that both session IDs are present
	found := make(map[string]bool)
	for _, id := range sessions {
		found[id] = true
	}
	if !found[sess1.ID] {
		t.Errorf("session %s not found in list", sess1.ID)
	}
	if !found[sess2.ID] {
		t.Errorf("session %s not found in list", sess2.ID)
	}
}

func TestLoaderListSessionsEmptyVault(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	loader := NewLoader(tmpDir)
	sessions, err := loader.ListSessions()
	if err != nil {
		t.Fatalf("ListSessions failed: %v", err)
	}

	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions for empty vault, got %d", len(sessions))
	}
}

func TestLoaderListSessionsNonExistentVault(t *testing.T) {
	loader := NewLoader("/nonexistent/path/to/vault")
	sessions, err := loader.ListSessions()
	if err != nil {
		t.Fatalf("ListSessions should not error for non-existent vault: %v", err)
	}

	if sessions != nil && len(sessions) != 0 {
		t.Errorf("expected nil or empty sessions for non-existent vault, got %d", len(sessions))
	}
}

func TestLoaderLoadNonExistentSession(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	loader := NewLoader(tmpDir)
	_, err = loader.Load("nonexistent-session")
	if err == nil {
		t.Error("expected error when loading non-existent session")
	}
}

func TestWriterVersioning(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "obsidian-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	writer := NewWriter(tmpDir)

	// Write version 1
	sess := createTestSession()
	if err := writer.Write(sess); err != nil {
		t.Fatalf("Write v1 failed: %v", err)
	}

	// Write version 2
	sess.Version = 2
	sess.Report = "# Updated Report\n\nThis is version 2..."
	if err := writer.Write(sess); err != nil {
		t.Fatalf("Write v2 failed: %v", err)
	}

	// Verify both report versions exist
	report1 := filepath.Join(tmpDir, sess.ID, "reports", "report_v1.md")
	report2 := filepath.Join(tmpDir, sess.ID, "reports", "report_v2.md")

	if _, err := os.Stat(report1); err != nil {
		t.Errorf("report v1 should exist: %v", err)
	}
	if _, err := os.Stat(report2); err != nil {
		t.Errorf("report v2 should exist: %v", err)
	}

	// Verify v2 content
	content, err := os.ReadFile(report2)
	if err != nil {
		t.Fatalf("failed to read report v2: %v", err)
	}
	if !strings.Contains(string(content), "version 2") {
		t.Error("report v2 should contain updated content")
	}
}
