package planning

import (
	"context"
	"fmt"

	"go-research/internal/llm"
	"go-research/internal/session"
)

// Planner coordinates perspective discovery and DAG-based research plan creation.
type Planner struct {
	client     llm.ChatClient
	discoverer *PerspectiveDiscoverer
}

// NewPlanner creates a new planner with the given LLM client.
func NewPlanner(client llm.ChatClient) *Planner {
	return &Planner{
		client:     client,
		discoverer: NewPerspectiveDiscoverer(client),
	}
}

// ResearchPlan contains the full plan for a research task.
type ResearchPlan struct {
	Topic        string
	Perspectives []Perspective
	DAG          *ResearchDAG
	Cost         session.CostBreakdown
}

// CreatePlan generates a full research plan with perspectives and DAG structure.
// It first discovers relevant expert perspectives, then builds a DAG that
// orchestrates parallel research from each perspective followed by cross-validation
// and synthesis.
func (p *Planner) CreatePlan(ctx context.Context, topic string) (*ResearchPlan, error) {
	// 1. Discover perspectives
	perspectives, cost, err := p.discoverer.Discover(ctx, topic)
	if err != nil {
		// Use default perspectives if discovery fails
		perspectives = defaultPerspectives(topic)
		cost = session.CostBreakdown{}
	}

	// 2. Build DAG
	dag := p.buildDAG(topic, perspectives)

	return &ResearchPlan{
		Topic:        topic,
		Perspectives: perspectives,
		DAG:          dag,
		Cost:         cost,
	}, nil
}

// buildDAG constructs the research DAG from topic and perspectives.
// Structure:
//   - Root: Initial topic analysis
//   - Search nodes: One per perspective (parallel after root)
//   - Cross-validation: Depends on all search nodes
//   - Gap-fill: Depends on cross-validation
//   - Synthesis: Final report generation
func (p *Planner) buildDAG(topic string, perspectives []Perspective) *ResearchDAG {
	dag := NewDAG()

	// Root node: Initial topic understanding
	rootNode := dag.AddNode("root", TaskAnalyze, fmt.Sprintf("Initial analysis of: %s", topic))

	// Create search nodes for each perspective (can run in parallel after root)
	searchNodes := make([]string, 0, len(perspectives))
	for i, perspective := range perspectives {
		nodeID := fmt.Sprintf("search_%d", i)
		dag.AddNode(nodeID, TaskSearch,
			fmt.Sprintf("Research from %s perspective: %s", perspective.Name, perspective.Focus))
		dag.AddDependency(nodeID, rootNode.ID)
		searchNodes = append(searchNodes, nodeID)
	}

	// Analysis node (depends on all searches)
	analysisNode := dag.AddNode("cross_validate", TaskAnalyze, "Cross-validate findings and identify contradictions")
	for _, searchID := range searchNodes {
		dag.AddDependency(analysisNode.ID, searchID)
	}

	// Gap-fill node (depends on analysis)
	gapNode := dag.AddNode("fill_gaps", TaskSearch, "Fill identified knowledge gaps")
	dag.AddDependency(gapNode.ID, analysisNode.ID)

	// Synthesis node (depends on gap-fill)
	synthesisNode := dag.AddNode("synthesize", TaskSynthesize, "Generate final research report")
	dag.AddDependency(synthesisNode.ID, gapNode.ID)

	return dag
}

// GetPerspectiveForNode returns the perspective associated with a search node.
// Returns nil if the node is not a perspective-based search node.
func (p *ResearchPlan) GetPerspectiveForNode(nodeID string) *Perspective {
	var index int
	if _, err := fmt.Sscanf(nodeID, "search_%d", &index); err != nil {
		return nil
	}
	if index < 0 || index >= len(p.Perspectives) {
		return nil
	}
	return &p.Perspectives[index]
}

// GetSearchNodeIDs returns the IDs of all perspective-based search nodes.
func (p *ResearchPlan) GetSearchNodeIDs() []string {
	ids := make([]string, len(p.Perspectives))
	for i := range p.Perspectives {
		ids[i] = fmt.Sprintf("search_%d", i)
	}
	return ids
}
