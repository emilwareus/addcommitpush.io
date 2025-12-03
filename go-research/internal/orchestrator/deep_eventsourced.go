package orchestrator

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go-research/internal/agents"
	"go-research/internal/config"
	ctxmgr "go-research/internal/context"
	"go-research/internal/core/domain/aggregate"
	domainEvents "go-research/internal/core/domain/events"
	"go-research/internal/core/ports"
	"go-research/internal/events"
	"go-research/internal/llm"
	"go-research/internal/planning"
	"go-research/internal/tools"
)

// DeepOrchestratorES is the event-sourced version of DeepOrchestrator.
// It persists all state changes as events for full interruptibility and resumability.
type DeepOrchestratorES struct {
	eventStore     ports.EventStore
	eventBus       *events.Bus // Keep existing bus for UI updates
	appConfig      *config.Config
	client         llm.ChatClient
	contextMgr     *ctxmgr.Manager
	planner        *planning.Planner
	searchAgent    *agents.SearchAgent
	analysisAgent  *agents.AnalysisAgent
	synthesisAgent *agents.SynthesisAgent
	tools          tools.ToolExecutor
}

// DeepOrchestratorESOption allows configuring the event-sourced orchestrator.
type DeepOrchestratorESOption func(*DeepOrchestratorES)

// WithESClient injects a custom LLM client (for testing).
func WithESClient(client llm.ChatClient) DeepOrchestratorESOption {
	return func(o *DeepOrchestratorES) {
		o.client = client
		o.planner = planning.NewPlanner(client)
		o.searchAgent = agents.NewSearchAgent(client, o.tools, o.eventBus, agents.DefaultSearchConfig())
		o.analysisAgent = agents.NewAnalysisAgentWithBus(client, o.eventBus)
		o.synthesisAgent = agents.NewSynthesisAgentWithBus(client, o.eventBus)
	}
}

// WithESTools injects a custom tool executor (for testing).
func WithESTools(toolExec tools.ToolExecutor) DeepOrchestratorESOption {
	return func(o *DeepOrchestratorES) {
		o.tools = toolExec
	}
}

// NewDeepOrchestratorES creates a new event-sourced deep research orchestrator.
func NewDeepOrchestratorES(
	eventStore ports.EventStore,
	bus *events.Bus,
	cfg *config.Config,
	opts ...DeepOrchestratorESOption,
) *DeepOrchestratorES {
	client := llm.NewClient(cfg)
	toolReg := tools.NewRegistry(cfg.BraveAPIKey)

	o := &DeepOrchestratorES{
		eventStore:     eventStore,
		eventBus:       bus,
		appConfig:      cfg,
		client:         client,
		contextMgr:     ctxmgr.New(client, ctxmgr.DefaultConfig()),
		planner:        planning.NewPlanner(client),
		searchAgent:    agents.NewSearchAgent(client, toolReg, bus, agents.DefaultSearchConfig()),
		analysisAgent:  agents.NewAnalysisAgentWithBus(client, bus),
		synthesisAgent: agents.NewSynthesisAgentWithBus(client, bus),
		tools:          toolReg,
	}

	for _, opt := range opts {
		opt(o)
	}

	return o
}

// Research executes deep research with full event sourcing.
func (o *DeepOrchestratorES) Research(ctx context.Context, sessionID string, query string) (*aggregate.ResearchState, error) {
	// Create or load state
	state, err := o.loadOrCreateState(ctx, sessionID, query)
	if err != nil {
		return nil, err
	}

	// Execute from current state
	return o.continueResearch(ctx, state)
}

// Resume continues an interrupted research session.
func (o *DeepOrchestratorES) Resume(ctx context.Context, sessionID string) (*aggregate.ResearchState, error) {
	state, err := o.loadState(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("load state: %w", err)
	}

	return o.continueResearch(ctx, state)
}

// loadOrCreateState loads existing state or creates new for a session.
func (o *DeepOrchestratorES) loadOrCreateState(ctx context.Context, sessionID string, query string) (*aggregate.ResearchState, error) {
	// Try to load existing
	existingEvents, err := o.eventStore.LoadEvents(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	if len(existingEvents) > 0 {
		// Convert ports.Event to interface{} for aggregate
		eventInterfaces := make([]interface{}, len(existingEvents))
		for i, e := range existingEvents {
			eventInterfaces[i] = o.portEventToDomain(e)
		}
		return aggregate.LoadFromEvents(sessionID, eventInterfaces)
	}

	// Create new
	state := aggregate.NewResearchState(sessionID)

	// Execute start command
	event, err := state.Execute(aggregate.StartResearchCommand{
		Query: query,
		Mode:  "storm",
		Config: domainEvents.ResearchConfig{
			MaxWorkers: o.appConfig.MaxWorkers,
		},
	})
	if err != nil {
		return nil, err
	}

	// Persist event
	if err := o.persistEvent(ctx, state, event); err != nil {
		return nil, err
	}

	// Publish for UI
	o.publishUIEvent(event)

	return state, nil
}

// loadState loads state from the event store.
func (o *DeepOrchestratorES) loadState(ctx context.Context, sessionID string) (*aggregate.ResearchState, error) {
	// Try snapshot first for performance
	snapshot, err := o.eventStore.LoadSnapshot(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	if snapshot != nil {
		// Load events after snapshot
		subsequentEvents, err := o.eventStore.LoadEventsFrom(ctx, sessionID, snapshot.Version)
		if err != nil {
			return nil, err
		}

		// Convert ports.Event to interface{}
		eventInterfaces := make([]interface{}, len(subsequentEvents))
		for i, e := range subsequentEvents {
			eventInterfaces[i] = o.portEventToDomain(e)
		}

		// Create state from snapshot version and replay subsequent events
		state := aggregate.NewResearchState(sessionID)
		state.Apply(domainEvents.SnapshotTakenEvent{}) // Placeholder - need proper snapshot reconstruction
		for _, e := range eventInterfaces {
			state.Apply(e)
		}
		state.ClearUncommittedEvents()
		return state, nil
	}

	// Full replay
	allEvents, err := o.eventStore.LoadEvents(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	if len(allEvents) == 0 {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	eventInterfaces := make([]interface{}, len(allEvents))
	for i, e := range allEvents {
		eventInterfaces[i] = o.portEventToDomain(e)
	}
	return aggregate.LoadFromEvents(sessionID, eventInterfaces)
}

// continueResearch picks up from current state and completes the research.
func (o *DeepOrchestratorES) continueResearch(ctx context.Context, state *aggregate.ResearchState) (*aggregate.ResearchState, error) {
	// Continue from current status
	switch state.Status {
	case "pending", "planning":
		if err := o.executePlanning(ctx, state); err != nil {
			return state, err
		}
		fallthrough

	case "searching":
		if err := o.executeDAG(ctx, state); err != nil {
			return state, err
		}
		// Start analysis phase
		event, err := state.Execute(aggregate.StartAnalysisCommand{
			TotalFacts: o.countTotalFacts(state),
		})
		if err == nil {
			_ = o.persistEvent(ctx, state, event)
			o.publishUIEvent(event)
		}
		fallthrough

	case "analyzing":
		if err := o.executeAnalysis(ctx, state); err != nil {
			return state, err
		}
		// Start synthesis phase
		event, err := state.Execute(aggregate.StartSynthesisCommand{})
		if err == nil {
			_ = o.persistEvent(ctx, state, event)
			o.publishUIEvent(event)
		}
		fallthrough

	case "synthesizing":
		if err := o.executeSynthesis(ctx, state); err != nil {
			return state, err
		}

	case "complete":
		return state, nil

	case "failed", "cancelled":
		return state, fmt.Errorf("research in terminal state: %s", state.Status)
	}

	// Mark complete
	event, _ := state.Execute(aggregate.CompleteResearchCommand{
		Duration: time.Since(*state.StartedAt),
	})
	_ = o.persistEvent(ctx, state, event)
	o.publishUIEvent(event)

	// Take snapshot every 20 events for faster future loads
	if state.Version%20 == 0 {
		o.saveSnapshot(ctx, state)
	}

	return state, nil
}

// executePlanning creates the research plan and DAG.
func (o *DeepOrchestratorES) executePlanning(ctx context.Context, state *aggregate.ResearchState) error {
	plan, err := o.planner.CreatePlan(ctx, state.Query)
	if err != nil {
		return err
	}

	// Convert to event format
	perspectives := make([]domainEvents.Perspective, len(plan.Perspectives))
	for i, p := range plan.Perspectives {
		perspectives[i] = domainEvents.Perspective{
			Name:      p.Name,
			Focus:     p.Focus,
			Questions: p.Questions,
		}
	}

	dagSnapshot := buildDAGSnapshotFromPlan(plan.DAG)

	// Execute command
	event, err := state.Execute(aggregate.SetPlanCommand{
		Topic:        plan.Topic,
		Perspectives: perspectives,
		DAGStructure: dagSnapshot,
		Cost: domainEvents.CostBreakdown{
			InputTokens:  plan.Cost.InputTokens,
			OutputTokens: plan.Cost.OutputTokens,
			TotalTokens:  plan.Cost.TotalTokens,
			TotalCostUSD: plan.Cost.TotalCost,
		},
	})
	if err != nil {
		return err
	}

	if err := o.persistEvent(ctx, state, event); err != nil {
		return err
	}
	o.publishUIEvent(event)

	return nil
}

// executeDAG executes the research DAG with event persistence.
func (o *DeepOrchestratorES) executeDAG(ctx context.Context, state *aggregate.ResearchState) error {
	if state.DAG == nil {
		return fmt.Errorf("no DAG in state")
	}

	for {
		readyNodes := o.getReadyNodes(state)
		if len(readyNodes) == 0 {
			if o.allNodesComplete(state) {
				return nil
			}
			time.Sleep(100 * time.Millisecond)
			continue
		}

		var wg sync.WaitGroup
		for _, node := range readyNodes {
			wg.Add(1)
			go func(n *aggregate.DAGNode) {
				defer wg.Done()
				o.executeNode(ctx, state, n)
			}(node)
		}
		wg.Wait()

		select {
		case <-ctx.Done():
			event, _ := state.Execute(aggregate.CancelResearchCommand{
				Reason: ctx.Err().Error(),
			})
			o.persistEvent(ctx, state, event)
			return ctx.Err()
		default:
		}
	}
}

// executeNode executes a single DAG node.
func (o *DeepOrchestratorES) executeNode(ctx context.Context, state *aggregate.ResearchState, node *aggregate.DAGNode) {
	workerNum := extractWorkerNum(node.ID)

	// Emit worker started
	event, _ := state.Execute(aggregate.StartWorkerCommand{
		WorkerID:    node.ID,
		WorkerNum:   workerNum,
		Objective:   node.Description,
		Perspective: o.getPerspectiveForNode(state, node.ID),
	})
	o.persistEvent(ctx, state, event)
	o.publishUIEvent(event)

	// Execute search
	perspective := o.buildPerspective(state, node.ID)
	result, err := o.searchAgent.SearchWithWorkerNum(ctx, node.Description, perspective, workerNum)

	if err != nil {
		event, _ := state.Execute(aggregate.FailWorkerCommand{
			WorkerID: node.ID,
			Error:    err.Error(),
		})
		o.persistEvent(ctx, state, event)
		o.publishUIEvent(event)
		return
	}

	// Convert result to event format
	facts := make([]domainEvents.Fact, len(result.Facts))
	for i, f := range result.Facts {
		facts[i] = domainEvents.Fact{
			Content:    f.Content,
			Confidence: f.Confidence,
			SourceURL:  f.Source, // agents.Fact uses Source, not SourceURL
		}
	}

	// SearchResult.Sources is []string, convert to []domainEvents.Source
	sources := make([]domainEvents.Source, len(result.Sources))
	for i, s := range result.Sources {
		sources[i] = domainEvents.Source{
			URL: s, // result.Sources is []string
		}
	}

	// Emit worker completed
	// SearchResult doesn't have a Summary field, generate one from facts
	output := fmt.Sprintf("Found %d facts from %d sources", len(result.Facts), len(result.Sources))
	event, _ = state.Execute(aggregate.CompleteWorkerCommand{
		WorkerID: node.ID,
		Output:   output,
		Facts:    facts,
		Sources:  sources,
		Cost: domainEvents.CostBreakdown{
			InputTokens:  result.Cost.InputTokens,
			OutputTokens: result.Cost.OutputTokens,
			TotalTokens:  result.Cost.TotalTokens,
			TotalCostUSD: result.Cost.TotalCost,
		},
	})
	o.persistEvent(ctx, state, event)
	o.publishUIEvent(event)
}

// executeAnalysis runs the analysis phase.
func (o *DeepOrchestratorES) executeAnalysis(ctx context.Context, state *aggregate.ResearchState) error {
	// Collect facts from workers
	var allFacts []agents.Fact
	for _, w := range state.Workers {
		for _, f := range w.Facts {
			allFacts = append(allFacts, agents.Fact{
				Content:    f.Content,
				Confidence: f.Confidence,
				Source:     f.SourceURL,
			})
		}
	}

	if len(allFacts) == 0 {
		// No facts to analyze, skip to synthesis
		return nil
	}

	result, err := o.analysisAgent.Analyze(ctx, state.Query, allFacts, nil)
	if err != nil {
		// Continue without analysis if it fails
		result = &agents.AnalysisResult{}
	}

	// Convert to event format
	// agents.ValidatedFact embeds agents.Fact, so Content/Confidence are at Fact level
	validatedFacts := make([]domainEvents.ValidatedFact, len(result.ValidatedFacts))
	for i, f := range result.ValidatedFacts {
		validatedFacts[i] = domainEvents.ValidatedFact{
			Content:        f.Content,
			Confidence:     f.Confidence,
			CorroboratedBy: f.CorroboratedBy,
		}
	}

	// agents.Contradiction uses Claim1/Claim2/Nature, not Fact1/Fact2/Description
	contradictions := make([]domainEvents.Contradiction, len(result.Contradictions))
	for i, c := range result.Contradictions {
		contradictions[i] = domainEvents.Contradiction{
			Fact1:       c.Claim1,
			Fact2:       c.Claim2,
			Description: c.Nature,
		}
	}

	gaps := make([]domainEvents.KnowledgeGap, len(result.KnowledgeGaps))
	for i, g := range result.KnowledgeGaps {
		gaps[i] = domainEvents.KnowledgeGap{
			Description:      g.Description,
			Importance:       g.Importance,
			SuggestedQueries: g.SuggestedQueries,
		}
	}

	event, err := state.Execute(aggregate.SetAnalysisCommand{
		ValidatedFacts: validatedFacts,
		Contradictions: contradictions,
		KnowledgeGaps:  gaps,
		Cost: domainEvents.CostBreakdown{
			InputTokens:  result.Cost.InputTokens,
			OutputTokens: result.Cost.OutputTokens,
			TotalTokens:  result.Cost.TotalTokens,
			TotalCostUSD: result.Cost.TotalCost,
		},
	})
	if err != nil {
		return err
	}

	o.persistEvent(ctx, state, event)
	o.publishUIEvent(event)

	return nil
}

// executeSynthesis generates the final report.
func (o *DeepOrchestratorES) executeSynthesis(ctx context.Context, state *aggregate.ResearchState) error {
	// Build plan from state
	plan := o.buildPlanFromState(state)
	searchResults := o.buildSearchResultsFromState(state)
	analysisResult := o.buildAnalysisResultFromState(state)

	report, err := o.synthesisAgent.Synthesize(ctx, plan, searchResults, analysisResult)
	if err != nil {
		return err
	}

	citations := make([]domainEvents.Citation, len(report.Citations))
	for i, c := range report.Citations {
		citations[i] = domainEvents.Citation{
			ID:    c.ID,
			URL:   c.URL,
			Title: c.Title,
		}
	}

	event, err := state.Execute(aggregate.SetReportCommand{
		Title:       report.Title,
		Summary:     report.Summary,
		FullContent: report.FullContent,
		Citations:   citations,
		Cost: domainEvents.CostBreakdown{
			InputTokens:  report.Cost.InputTokens,
			OutputTokens: report.Cost.OutputTokens,
			TotalTokens:  report.Cost.TotalTokens,
			TotalCostUSD: report.Cost.TotalCost,
		},
	})
	if err != nil {
		return err
	}

	o.persistEvent(ctx, state, event)
	o.publishUIEvent(event)

	return nil
}

// persistEvent saves an event to the event store.
func (o *DeepOrchestratorES) persistEvent(ctx context.Context, state *aggregate.ResearchState, event interface{}) error {
	// Convert to ports.Event interface
	e, ok := event.(ports.Event)
	if !ok {
		return fmt.Errorf("event does not implement ports.Event: %T", event)
	}

	return o.eventStore.AppendEvents(ctx, state.ID, []ports.Event{e}, state.Version-1)
}

// publishUIEvent converts domain event to UI event and publishes.
func (o *DeepOrchestratorES) publishUIEvent(event interface{}) {
	if o.eventBus == nil {
		return
	}

	// Map domain events to existing UI events
	switch e := event.(type) {
	case domainEvents.ResearchStartedEvent:
		o.eventBus.Publish(events.Event{
			Type:      events.EventResearchStarted,
			Timestamp: e.Timestamp,
			Data: events.ResearchStartedData{
				Query: e.Query,
				Mode:  e.Mode,
			},
		})

	case domainEvents.PlanCreatedEvent:
		perspectives := make([]events.PerspectiveData, len(e.Perspectives))
		for i, p := range e.Perspectives {
			perspectives[i] = events.PerspectiveData{
				Name:      p.Name,
				Focus:     p.Focus,
				Questions: p.Questions,
			}
		}
		dagNodes := make([]events.DAGNodeData, len(e.DAGStructure.Nodes))
		for i, n := range e.DAGStructure.Nodes {
			dagNodes[i] = events.DAGNodeData{
				ID:           n.ID,
				TaskType:     n.TaskType,
				Description:  n.Description,
				Dependencies: n.Dependencies,
				Status:       n.Status,
			}
		}
		o.eventBus.Publish(events.Event{
			Type:      events.EventPlanCreated,
			Timestamp: e.Timestamp,
			Data: events.PlanCreatedData{
				WorkerCount:  len(e.Perspectives),
				Complexity:   0.8,
				Topic:        e.Topic,
				Perspectives: perspectives,
				DAGNodes:     dagNodes,
			},
		})

	case domainEvents.WorkerStartedEvent:
		o.eventBus.Publish(events.Event{
			Type:      events.EventWorkerStarted,
			Timestamp: e.Timestamp,
			Data: events.WorkerProgressData{
				WorkerID:  e.WorkerID,
				WorkerNum: e.WorkerNum,
				Objective: e.Objective,
				Status:    "running",
			},
		})

	case domainEvents.WorkerCompletedEvent:
		o.eventBus.Publish(events.Event{
			Type:      events.EventWorkerComplete,
			Timestamp: e.Timestamp,
			Data: events.WorkerProgressData{
				WorkerID:  e.WorkerID,
				WorkerNum: 0,
				Status:    "complete",
			},
		})

	case domainEvents.WorkerFailedEvent:
		o.eventBus.Publish(events.Event{
			Type:      events.EventWorkerFailed,
			Timestamp: e.Timestamp,
			Data: events.WorkerProgressData{
				WorkerID: e.WorkerID,
				Status:   "failed",
				Message:  e.Error,
			},
		})

	case domainEvents.AnalysisCompletedEvent:
		o.eventBus.Publish(events.Event{
			Type:      events.EventAnalysisComplete,
			Timestamp: e.Timestamp,
			Data: map[string]interface{}{
				"contradictions": len(e.Contradictions),
				"gaps":           len(e.KnowledgeGaps),
			},
		})

	case domainEvents.ReportGeneratedEvent:
		o.eventBus.Publish(events.Event{
			Type:      events.EventSynthesisComplete,
			Timestamp: e.Timestamp,
		})

	case domainEvents.ResearchCompletedEvent:
		o.eventBus.Publish(events.Event{
			Type:      events.EventResearchComplete,
			Timestamp: e.Timestamp,
			Data: map[string]interface{}{
				"duration":     e.Duration,
				"source_count": e.SourceCount,
			},
		})
	}
}

// saveSnapshot creates a snapshot for faster future loads.
func (o *DeepOrchestratorES) saveSnapshot(ctx context.Context, state *aggregate.ResearchState) {
	// Serialize state to snapshot data
	// For now, just save version info - full state reconstruction happens via events
	snapshot := ports.Snapshot{
		AggregateID: state.ID,
		Version:     state.Version,
		Timestamp:   time.Now(),
		Data:        []byte(`{}`), // Placeholder
	}
	_ = o.eventStore.SaveSnapshot(ctx, state.ID, snapshot)
}

// Helper functions

func (o *DeepOrchestratorES) getReadyNodes(state *aggregate.ResearchState) []*aggregate.DAGNode {
	var ready []*aggregate.DAGNode
	for _, node := range state.DAG.Nodes {
		if node.Status != "pending" {
			continue
		}
		// Check all dependencies are complete
		allDepsComplete := true
		for _, depID := range node.Dependencies {
			dep, ok := state.DAG.Nodes[depID]
			if !ok || dep.Status != "complete" {
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

func (o *DeepOrchestratorES) allNodesComplete(state *aggregate.ResearchState) bool {
	for _, node := range state.DAG.Nodes {
		if node.Status != "complete" && node.Status != "failed" {
			return false
		}
	}
	return true
}

func extractWorkerNum(nodeID string) int {
	var index int
	if _, err := fmt.Sscanf(nodeID, "search_%d", &index); err == nil {
		return index + 1
	}
	return 0
}

func (o *DeepOrchestratorES) getPerspectiveForNode(state *aggregate.ResearchState, nodeID string) string {
	if worker, ok := state.Workers[nodeID]; ok {
		return worker.Perspective
	}
	return ""
}

func (o *DeepOrchestratorES) buildPerspective(state *aggregate.ResearchState, nodeID string) *planning.Perspective {
	if state.Plan == nil {
		return nil
	}
	for _, p := range state.Plan.Perspectives {
		if worker, ok := state.Workers[nodeID]; ok && worker.Perspective == p.Name {
			return &planning.Perspective{
				Name:      p.Name,
				Focus:     p.Focus,
				Questions: p.Questions,
			}
		}
	}
	// Return first perspective if not found
	if len(state.Plan.Perspectives) > 0 {
		p := state.Plan.Perspectives[0]
		return &planning.Perspective{
			Name:      p.Name,
			Focus:     p.Focus,
			Questions: p.Questions,
		}
	}
	return nil
}

func buildDAGSnapshotFromPlan(dag *planning.ResearchDAG) domainEvents.DAGSnapshot {
	nodes := dag.GetAllNodes()
	snapshot := domainEvents.DAGSnapshot{
		Nodes: make([]domainEvents.DAGNodeSnapshot, len(nodes)),
	}
	for i, n := range nodes {
		snapshot.Nodes[i] = domainEvents.DAGNodeSnapshot{
			ID:           n.ID,
			TaskType:     n.TaskType.String(),
			Description:  n.Description,
			Dependencies: n.Dependencies,
			Status:       n.Status.String(),
		}
	}
	return snapshot
}

func (o *DeepOrchestratorES) buildPlanFromState(state *aggregate.ResearchState) *planning.ResearchPlan {
	if state.Plan == nil {
		return &planning.ResearchPlan{Topic: state.Query}
	}
	perspectives := make([]planning.Perspective, len(state.Plan.Perspectives))
	for i, p := range state.Plan.Perspectives {
		perspectives[i] = planning.Perspective{
			Name:      p.Name,
			Focus:     p.Focus,
			Questions: p.Questions,
		}
	}
	return &planning.ResearchPlan{
		Topic:        state.Plan.Topic,
		Perspectives: perspectives,
	}
}

func (o *DeepOrchestratorES) buildSearchResultsFromState(state *aggregate.ResearchState) map[string]*agents.SearchResult {
	results := make(map[string]*agents.SearchResult)
	for id, w := range state.Workers {
		if w.Status != "complete" {
			continue
		}
		facts := make([]agents.Fact, len(w.Facts))
		for i, f := range w.Facts {
			facts[i] = agents.Fact{
				Content:    f.Content,
				Confidence: f.Confidence,
				Source:     f.SourceURL,
			}
		}
		// agents.SearchResult.Sources is []string, not []Source
		sources := make([]string, len(w.Sources))
		for i, s := range w.Sources {
			sources[i] = s.URL
		}
		results[id] = &agents.SearchResult{
			Facts:   facts,
			Sources: sources,
			// Note: SearchResult has no Output field, only Facts/Sources/Gaps/Cost
		}
	}
	return results
}

func (o *DeepOrchestratorES) buildAnalysisResultFromState(state *aggregate.ResearchState) *agents.AnalysisResult {
	if state.Analysis == nil {
		return &agents.AnalysisResult{}
	}
	// agents.ValidatedFact embeds agents.Fact
	validatedFacts := make([]agents.ValidatedFact, len(state.Analysis.ValidatedFacts))
	for i, f := range state.Analysis.ValidatedFacts {
		validatedFacts[i] = agents.ValidatedFact{
			Fact: agents.Fact{
				Content:    f.Content,
				Confidence: f.Confidence,
			},
			CorroboratedBy: f.CorroboratedBy,
		}
	}
	// agents.Contradiction uses Claim1/Claim2/Nature
	contradictions := make([]agents.Contradiction, len(state.Analysis.Contradictions))
	for i, c := range state.Analysis.Contradictions {
		contradictions[i] = agents.Contradiction{
			Claim1: c.Fact1,
			Claim2: c.Fact2,
			Nature: c.Description,
		}
	}
	gaps := make([]agents.KnowledgeGap, len(state.Analysis.KnowledgeGaps))
	for i, g := range state.Analysis.KnowledgeGaps {
		gaps[i] = agents.KnowledgeGap{
			Description:      g.Description,
			Importance:       g.Importance,
			SuggestedQueries: g.SuggestedQueries,
		}
	}
	return &agents.AnalysisResult{
		ValidatedFacts: validatedFacts,
		Contradictions: contradictions,
		KnowledgeGaps:  gaps,
	}
}

func (o *DeepOrchestratorES) countTotalFacts(state *aggregate.ResearchState) int {
	count := 0
	for _, w := range state.Workers {
		count += len(w.Facts)
	}
	return count
}

// portEventToDomain converts a ports.Event back to the concrete domain event type.
func (o *DeepOrchestratorES) portEventToDomain(e ports.Event) interface{} {
	// The event is already the concrete type from deserialization
	return e
}
