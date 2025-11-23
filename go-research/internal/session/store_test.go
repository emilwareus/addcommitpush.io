package session

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

// mockVaultWriter tracks Write calls for testing
type mockVaultWriter struct {
	writeCalled bool
	lastSession *Session
	shouldError error
}

func (m *mockVaultWriter) Write(sess *Session) error {
	m.writeCalled = true
	m.lastSession = sess
	return m.shouldError
}

func createTestSession() *Session {
	now := time.Now()
	return &Session{
		ID:              "test-session-123",
		Version:         1,
		Query:           "Test query",
		Mode:            ModeFast,
		ComplexityScore: 0.5,
		Workers:         []WorkerContext{},
		Report:          "Test report",
		Sources:         []string{"https://example.com"},
		CreatedAt:       now,
		UpdatedAt:       now,
		Status:          StatusComplete,
	}
}

func TestStoreNewStore(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	stateDir := filepath.Join(tmpDir, "state")
	store, err := NewStore(stateDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}
	if store == nil {
		t.Fatal("expected non-nil store")
	}

	// Verify directory was created
	if _, err := os.Stat(stateDir); err != nil {
		t.Errorf("state dir should exist: %v", err)
	}
}

func TestStoreSaveAndLoad(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	sess := createTestSession()
	if err := store.Save(sess); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Verify JSON file exists
	jsonFile := filepath.Join(tmpDir, sess.ID+".json")
	if _, err := os.Stat(jsonFile); err != nil {
		t.Errorf("JSON file should exist: %v", err)
	}

	// Load and verify
	loaded, err := store.Load(sess.ID)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}

	if loaded.ID != sess.ID {
		t.Errorf("ID mismatch: got %s, want %s", loaded.ID, sess.ID)
	}
	if loaded.Query != sess.Query {
		t.Errorf("Query mismatch: got %s, want %s", loaded.Query, sess.Query)
	}
	if loaded.Version != sess.Version {
		t.Errorf("Version mismatch: got %d, want %d", loaded.Version, sess.Version)
	}
}

func TestStoreLoadLast(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	// Save two sessions
	sess1 := createTestSession()
	sess1.ID = "session-1"
	sess2 := createTestSession()
	sess2.ID = "session-2"

	if err := store.Save(sess1); err != nil {
		t.Fatalf("Save sess1 failed: %v", err)
	}
	if err := store.Save(sess2); err != nil {
		t.Fatalf("Save sess2 failed: %v", err)
	}

	// LoadLast should return sess2 (most recently saved)
	last, err := store.LoadLast()
	if err != nil {
		t.Fatalf("LoadLast failed: %v", err)
	}
	if last == nil {
		t.Fatal("expected non-nil session from LoadLast")
	}
	if last.ID != sess2.ID {
		t.Errorf("expected last session to be %s, got %s", sess2.ID, last.ID)
	}
}

func TestStoreList(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	// Save multiple sessions with different timestamps
	now := time.Now()
	sess1 := createTestSession()
	sess1.ID = "session-older"
	sess1.CreatedAt = now.Add(-1 * time.Hour)

	sess2 := createTestSession()
	sess2.ID = "session-newer"
	sess2.CreatedAt = now

	if err := store.Save(sess1); err != nil {
		t.Fatalf("Save sess1 failed: %v", err)
	}
	if err := store.Save(sess2); err != nil {
		t.Fatalf("Save sess2 failed: %v", err)
	}

	// List should return sessions sorted by date descending
	summaries, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(summaries) != 2 {
		t.Errorf("expected 2 sessions, got %d", len(summaries))
	}

	// Newer session should be first
	if summaries[0].ID != sess2.ID {
		t.Errorf("expected first session to be %s, got %s", sess2.ID, summaries[0].ID)
	}
}

func TestStoreDelete(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	sess := createTestSession()
	if err := store.Save(sess); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	if err := store.Delete(sess.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Should no longer be loadable
	_, err = store.Load(sess.ID)
	if err == nil {
		t.Error("expected error loading deleted session")
	}
}

func TestStoreWithVaultWriter(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	// Set up mock vault writer
	mockWriter := &mockVaultWriter{}
	store.SetVaultWriter(mockWriter)

	sess := createTestSession()
	if err := store.Save(sess); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Verify vault writer was called
	if !mockWriter.writeCalled {
		t.Error("vault writer should have been called")
	}
	if mockWriter.lastSession == nil {
		t.Error("vault writer should have received session")
	}
	if mockWriter.lastSession.ID != sess.ID {
		t.Errorf("vault writer received wrong session: got %s, want %s",
			mockWriter.lastSession.ID, sess.ID)
	}
}

func TestStoreWithoutVaultWriter(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	// Don't set vault writer - should still work
	sess := createTestSession()
	if err := store.Save(sess); err != nil {
		t.Fatalf("Save should succeed without vault writer: %v", err)
	}

	// Verify JSON file exists
	jsonFile := filepath.Join(tmpDir, sess.ID+".json")
	if _, err := os.Stat(jsonFile); err != nil {
		t.Errorf("JSON file should exist: %v", err)
	}
}

func TestStoreVaultWriterErrorDoesNotFailSave(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	// Set up mock vault writer that errors
	mockWriter := &mockVaultWriter{
		shouldError: os.ErrPermission, // Simulate permission error
	}
	store.SetVaultWriter(mockWriter)

	sess := createTestSession()

	// Save should still succeed even if vault writer fails
	if err := store.Save(sess); err != nil {
		t.Fatalf("Save should succeed even with vault writer error: %v", err)
	}

	// Verify JSON file was still written
	jsonFile := filepath.Join(tmpDir, sess.ID+".json")
	if _, err := os.Stat(jsonFile); err != nil {
		t.Errorf("JSON file should exist even if vault writer failed: %v", err)
	}
}
