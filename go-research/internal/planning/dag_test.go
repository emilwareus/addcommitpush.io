package planning

import (
	"testing"
)

func TestDAGAddNode(t *testing.T) {
	dag := NewDAG()

	node := dag.AddNode("test", TaskSearch, "test task")

	if node.ID != "test" {
		t.Errorf("expected ID 'test', got %q", node.ID)
	}
	if node.TaskType != TaskSearch {
		t.Errorf("expected TaskSearch, got %v", node.TaskType)
	}
	if node.Status != StatusPending {
		t.Errorf("expected StatusPending, got %v", node.Status)
	}
	if dag.NodeCount() != 1 {
		t.Errorf("expected 1 node, got %d", dag.NodeCount())
	}
}

func TestDAGAddDependency(t *testing.T) {
	dag := NewDAG()
	dag.AddNode("root", TaskAnalyze, "root task")
	dag.AddNode("child", TaskSearch, "child task")

	err := dag.AddDependency("child", "root")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	// Verify dependency was recorded
	node, _ := dag.GetNode("child")
	if len(node.Dependencies) != 1 || node.Dependencies[0] != "root" {
		t.Errorf("expected dependency on 'root', got %v", node.Dependencies)
	}
}

func TestDAGAddDependencyErrors(t *testing.T) {
	dag := NewDAG()
	dag.AddNode("root", TaskAnalyze, "root task")

	// Non-existent node
	err := dag.AddDependency("nonexistent", "root")
	if err == nil {
		t.Error("expected error for non-existent node")
	}

	// Non-existent dependency
	err = dag.AddDependency("root", "nonexistent")
	if err == nil {
		t.Error("expected error for non-existent dependency")
	}
}

func TestDAGGetReadyTasks(t *testing.T) {
	dag := NewDAG()

	root := dag.AddNode("root", TaskAnalyze, "root task")
	dag.AddNode("child", TaskSearch, "child task")
	dag.AddDependency("child", root.ID)

	// Initially only root is ready
	ready := dag.GetReadyTasks()
	if len(ready) != 1 || ready[0].ID != "root" {
		t.Errorf("expected only root to be ready, got %v", nodeIDs(ready))
	}

	// Complete root
	dag.SetResult("root", "done")

	// Now child should be ready
	ready = dag.GetReadyTasks()
	if len(ready) != 1 || ready[0].ID != "child" {
		t.Errorf("expected child to be ready after root complete, got %v", nodeIDs(ready))
	}
}

func TestDAGGetReadyTasksParallel(t *testing.T) {
	dag := NewDAG()

	root := dag.AddNode("root", TaskAnalyze, "root task")
	dag.AddNode("child1", TaskSearch, "child 1")
	dag.AddNode("child2", TaskSearch, "child 2")
	dag.AddNode("child3", TaskSearch, "child 3")
	dag.AddDependency("child1", root.ID)
	dag.AddDependency("child2", root.ID)
	dag.AddDependency("child3", root.ID)

	// Complete root
	dag.SetResult("root", "done")

	// All children should be ready in parallel
	ready := dag.GetReadyTasks()
	if len(ready) != 3 {
		t.Errorf("expected 3 children ready, got %d", len(ready))
	}
}

func TestDAGTopologicalOrder(t *testing.T) {
	dag := NewDAG()

	dag.AddNode("a", TaskAnalyze, "a")
	dag.AddNode("b", TaskSearch, "b")
	dag.AddNode("c", TaskSynthesize, "c")
	dag.AddDependency("b", "a")
	dag.AddDependency("c", "b")

	order := dag.TopologicalOrder()

	// a should come before b, b before c
	aIdx, bIdx, cIdx := -1, -1, -1
	for i, node := range order {
		switch node.ID {
		case "a":
			aIdx = i
		case "b":
			bIdx = i
		case "c":
			cIdx = i
		}
	}

	if aIdx >= bIdx || bIdx >= cIdx {
		t.Errorf("invalid topological order: a=%d, b=%d, c=%d", aIdx, bIdx, cIdx)
	}
}

func TestDAGAllComplete(t *testing.T) {
	dag := NewDAG()

	dag.AddNode("a", TaskAnalyze, "a")
	dag.AddNode("b", TaskSearch, "b")

	if dag.AllComplete() {
		t.Error("should not be complete with pending nodes")
	}

	dag.SetResult("a", "done")
	if dag.AllComplete() {
		t.Error("should not be complete with one pending node")
	}

	dag.SetResult("b", "done")
	if !dag.AllComplete() {
		t.Error("should be complete when all nodes are done")
	}
}

func TestDAGAllCompleteWithFailures(t *testing.T) {
	dag := NewDAG()

	dag.AddNode("a", TaskAnalyze, "a")
	dag.AddNode("b", TaskSearch, "b")

	dag.SetResult("a", "done")
	dag.SetError("b", nil) // Mark as failed

	if !dag.AllComplete() {
		t.Error("should be complete when all nodes are done or failed")
	}
}

func TestDAGSetStatus(t *testing.T) {
	dag := NewDAG()
	dag.AddNode("test", TaskSearch, "test")

	dag.SetStatus("test", StatusRunning)

	node, _ := dag.GetNode("test")
	if node.Status != StatusRunning {
		t.Errorf("expected StatusRunning, got %v", node.Status)
	}
}

func TestNodeStatusString(t *testing.T) {
	tests := []struct {
		status   NodeStatus
		expected string
	}{
		{StatusPending, "pending"},
		{StatusRunning, "running"},
		{StatusComplete, "complete"},
		{StatusFailed, "failed"},
		{NodeStatus(99), "unknown"},
	}

	for _, tt := range tests {
		if got := tt.status.String(); got != tt.expected {
			t.Errorf("NodeStatus(%d).String() = %q, want %q", tt.status, got, tt.expected)
		}
	}
}

func TestTaskTypeString(t *testing.T) {
	tests := []struct {
		taskType TaskType
		expected string
	}{
		{TaskSearch, "search"},
		{TaskAnalyze, "analyze"},
		{TaskSynthesize, "synthesize"},
		{TaskValidate, "validate"},
		{TaskType(99), "unknown"},
	}

	for _, tt := range tests {
		if got := tt.taskType.String(); got != tt.expected {
			t.Errorf("TaskType(%d).String() = %q, want %q", tt.taskType, got, tt.expected)
		}
	}
}

func TestEmptyDAGAllComplete(t *testing.T) {
	dag := NewDAG()

	// Empty DAG should not be considered complete
	if dag.AllComplete() {
		t.Error("empty DAG should not be considered complete")
	}
}

func TestDAGGetAllNodes(t *testing.T) {
	dag := NewDAG()
	dag.AddNode("a", TaskAnalyze, "a")
	dag.AddNode("b", TaskSearch, "b")
	dag.AddNode("c", TaskSynthesize, "c")

	nodes := dag.GetAllNodes()
	if len(nodes) != 3 {
		t.Errorf("expected 3 nodes, got %d", len(nodes))
	}
}

// helper to extract IDs from nodes for error messages
func nodeIDs(nodes []*DAGNode) []string {
	ids := make([]string, len(nodes))
	for i, n := range nodes {
		ids[i] = n.ID
	}
	return ids
}
