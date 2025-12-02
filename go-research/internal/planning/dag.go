package planning

import (
	"fmt"
	"sync"
)

// NodeStatus represents the execution state of a DAG node.
type NodeStatus int

const (
	StatusPending NodeStatus = iota
	StatusRunning
	StatusComplete
	StatusFailed
)

// String returns a human-readable status name.
func (s NodeStatus) String() string {
	switch s {
	case StatusPending:
		return "pending"
	case StatusRunning:
		return "running"
	case StatusComplete:
		return "complete"
	case StatusFailed:
		return "failed"
	default:
		return "unknown"
	}
}

// TaskType identifies the kind of work a node performs.
type TaskType int

const (
	TaskSearch TaskType = iota
	TaskAnalyze
	TaskSynthesize
	TaskValidate
)

// String returns a human-readable task type name.
func (t TaskType) String() string {
	switch t {
	case TaskSearch:
		return "search"
	case TaskAnalyze:
		return "analyze"
	case TaskSynthesize:
		return "synthesize"
	case TaskValidate:
		return "validate"
	default:
		return "unknown"
	}
}

// DAGNode represents a single task in the research DAG.
type DAGNode struct {
	ID           string
	TaskType     TaskType
	Description  string
	Dependencies []string
	Status       NodeStatus
	Result       interface{}
	Error        error
}

// ResearchDAG is a directed acyclic graph for research task orchestration.
// It supports parallel execution of independent tasks while respecting dependencies.
type ResearchDAG struct {
	mu    sync.RWMutex
	nodes map[string]*DAGNode
	edges map[string][]string // node ID -> its dependency IDs
}

// NewDAG creates a new empty research DAG.
func NewDAG() *ResearchDAG {
	return &ResearchDAG{
		nodes: make(map[string]*DAGNode),
		edges: make(map[string][]string),
	}
}

// AddNode creates and adds a new node to the DAG.
// Returns the created node for chaining.
func (d *ResearchDAG) AddNode(id string, taskType TaskType, description string) *DAGNode {
	d.mu.Lock()
	defer d.mu.Unlock()

	node := &DAGNode{
		ID:           id,
		TaskType:     taskType,
		Description:  description,
		Dependencies: []string{},
		Status:       StatusPending,
	}
	d.nodes[id] = node
	d.edges[id] = []string{}
	return node
}

// AddDependency declares that nodeID depends on dependsOn.
// The node with nodeID will only become ready after dependsOn completes.
func (d *ResearchDAG) AddDependency(nodeID, dependsOn string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if _, exists := d.nodes[nodeID]; !exists {
		return fmt.Errorf("node %q not found", nodeID)
	}
	if _, exists := d.nodes[dependsOn]; !exists {
		return fmt.Errorf("dependency node %q not found", dependsOn)
	}

	d.edges[nodeID] = append(d.edges[nodeID], dependsOn)
	d.nodes[nodeID].Dependencies = append(d.nodes[nodeID].Dependencies, dependsOn)
	return nil
}

// GetNode retrieves a node by ID.
func (d *ResearchDAG) GetNode(id string) (*DAGNode, bool) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	node, exists := d.nodes[id]
	return node, exists
}

// GetReadyTasks returns nodes that are pending and have all dependencies complete.
// These tasks can be executed in parallel.
func (d *ResearchDAG) GetReadyTasks() []*DAGNode {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var ready []*DAGNode
	for id, node := range d.nodes {
		if node.Status != StatusPending {
			continue
		}

		allDepsComplete := true
		for _, depID := range d.edges[id] {
			dep, exists := d.nodes[depID]
			if !exists || dep.Status != StatusComplete {
				allDepsComplete = false
				break
			}
		}

		if allDepsComplete {
			ready = append(ready, node)
		}
	}
	return ready
}

// SetStatus updates a node's execution status.
func (d *ResearchDAG) SetStatus(nodeID string, status NodeStatus) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if node, exists := d.nodes[nodeID]; exists {
		node.Status = status
	}
}

// SetResult stores the result for a node and marks it complete.
func (d *ResearchDAG) SetResult(nodeID string, result interface{}) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if node, exists := d.nodes[nodeID]; exists {
		node.Result = result
		node.Status = StatusComplete
	}
}

// SetError stores an error for a node and marks it failed.
func (d *ResearchDAG) SetError(nodeID string, err error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if node, exists := d.nodes[nodeID]; exists {
		node.Error = err
		node.Status = StatusFailed
	}
}

// AllComplete checks if all nodes have finished (either complete or failed).
func (d *ResearchDAG) AllComplete() bool {
	d.mu.RLock()
	defer d.mu.RUnlock()
	for _, node := range d.nodes {
		if node.Status != StatusComplete && node.Status != StatusFailed {
			return false
		}
	}
	return len(d.nodes) > 0
}

// NodeCount returns the total number of nodes in the DAG.
func (d *ResearchDAG) NodeCount() int {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return len(d.nodes)
}

// TopologicalOrder returns nodes sorted in dependency order.
// Dependencies appear before nodes that depend on them.
// Independent nodes may appear in any order relative to each other.
func (d *ResearchDAG) TopologicalOrder() []*DAGNode {
	d.mu.RLock()
	defer d.mu.RUnlock()

	visited := make(map[string]bool)
	var order []*DAGNode

	var visit func(string)
	visit = func(id string) {
		if visited[id] {
			return
		}
		visited[id] = true
		// Visit all dependencies first (nodes this one depends on)
		for _, depID := range d.edges[id] {
			visit(depID)
		}
		// Add current node after its dependencies
		order = append(order, d.nodes[id])
	}

	for id := range d.nodes {
		visit(id)
	}

	// Post-order DFS with dependency-first traversal already gives correct order
	return order
}

// GetAllNodes returns all nodes in the DAG (unordered).
func (d *ResearchDAG) GetAllNodes() []*DAGNode {
	d.mu.RLock()
	defer d.mu.RUnlock()

	nodes := make([]*DAGNode, 0, len(d.nodes))
	for _, node := range d.nodes {
		nodes = append(nodes, node)
	}
	return nodes
}
