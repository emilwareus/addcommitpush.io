// Package think_deep implements the ThinkDepth.ai "Self-Balancing Test-Time
// Diffusion Deep Research" architecture.
//
// This file contains state definitions used to track progress through the
// ThinkDeep workflow, including supervisor coordination and sub-researcher tasks.
package think_deep

import (
	"regexp"
	"strings"
	"time"

	"go-research/internal/llm"
)

// SourceType indicates the type of source that provided the insight
type SourceType string

const (
	SourceTypeWeb      SourceType = "web"
	SourceTypeDocument SourceType = "document"
	SourceTypeAPI      SourceType = "api"
	SourceTypeFile     SourceType = "file"
)

// SourceReference contains detailed information about a source for traceability
type SourceReference struct {
	// URL is the source URL (for web sources)
	URL string `json:"url,omitempty"`

	// FilePath is the local file path (for document sources)
	FilePath string `json:"file_path,omitempty"`

	// Type indicates what kind of source this is
	Type SourceType `json:"type"`

	// Title is the source title or filename
	Title string `json:"title,omitempty"`

	// RawContent is the full raw content fetched from the source
	RawContent string `json:"raw_content,omitempty"`

	// RelevantExcerpt is the specific excerpt relevant to the insight
	RelevantExcerpt string `json:"relevant_excerpt,omitempty"`

	// FetchedAt is when the source was fetched
	FetchedAt time.Time `json:"fetched_at"`

	// ContentHash is a hash of the raw content for deduplication
	ContentHash string `json:"content_hash,omitempty"`
}

// DataPoint represents a specific piece of data extracted from a source
type DataPoint struct {
	// Label describes what this data point represents
	Label string `json:"label"`

	// Value is the actual data value
	Value string `json:"value"`

	// Context provides surrounding context for the data point
	Context string `json:"context,omitempty"`

	// SourceRef links to the source this was extracted from
	SourceRef string `json:"source_ref,omitempty"`
}

// SubInsight represents a single research finding extracted from search results.
// Granularity: one insight per search result with extracted findings.
// Enhanced to support full traceability and rich data capture.
type SubInsight struct {
	// ID is a unique identifier (e.g., "insight-001")
	ID string `json:"id"`

	// Topic is the research topic from supervisor delegation
	Topic string `json:"topic"`

	// Title is a short title summarizing the insight
	Title string `json:"title"`

	// Finding is the factual finding extracted
	Finding string `json:"finding"`

	// Implication is what this means for the research question
	Implication string `json:"implication,omitempty"`

	// SourceURL is the URL this insight was extracted from (primary source)
	SourceURL string `json:"source_url,omitempty"`

	// SourceContent is the relevant excerpt from source (truncated)
	SourceContent string `json:"source_content,omitempty"`

	// Sources contains all source references with full traceability
	Sources []SourceReference `json:"sources,omitempty"`

	// DataPoints contains specific data extracted supporting the finding
	DataPoints []DataPoint `json:"data_points,omitempty"`

	// AnalysisChain describes how this insight was derived
	AnalysisChain []string `json:"analysis_chain,omitempty"`

	// RelatedInsightIDs links to other insights that corroborate this finding
	RelatedInsightIDs []string `json:"related_insight_ids,omitempty"`

	// Confidence is a 0-1 confidence score
	Confidence float64 `json:"confidence"`

	// Iteration is the diffusion iteration when captured
	Iteration int `json:"iteration"`

	// ResearcherNum is which sub-researcher found this
	ResearcherNum int `json:"researcher_num"`

	// Timestamp is when the insight was captured
	Timestamp time.Time `json:"timestamp"`

	// ToolUsed indicates which tool produced this insight (search, fetch, read_document, etc.)
	ToolUsed string `json:"tool_used,omitempty"`

	// QueryUsed is the search query or tool arguments that produced this insight
	QueryUsed string `json:"query_used,omitempty"`
}

// SupervisorState manages the lead researcher's coordination of the diffusion
// process. The supervisor orchestrates sub-researchers and maintains the
// evolving draft report.
//
// Original: SupervisorState in state_multi_agent_supervisor.py
type SupervisorState struct {
	// Messages contains the conversation history for the supervisor agent
	Messages []llm.Message

	// ResearchBrief is the detailed brief generated from the user query
	ResearchBrief string

	// Notes contains compressed research findings from sub-researchers
	// Each entry is a compressed summary preserving all factual information
	Notes []string

	// RawNotes contains the raw search results before compression
	// Used for reference and debugging
	RawNotes []string

	// DraftReport is the iteratively refined draft that accumulates findings
	// This acts as "dynamic context" guiding subsequent research
	DraftReport string

	// Iterations tracks the current iteration count in the diffusion loop
	Iterations int

	// VisitedURLs tracks all URLs that have been searched/fetched to enable deduplication.
	// This prevents redundant fetching of the same source across sub-researchers.
	VisitedURLs map[string]bool

	// SubInsights contains all insights captured during diffusion from sub-researchers
	SubInsights []SubInsight
}

// ResearcherState manages individual sub-researcher state during focused
// research tasks. Each sub-researcher performs targeted searches with
// strict iteration limits.
//
// Original: ResearcherState in state_research_agent.py
type ResearcherState struct {
	// Messages contains the conversation history for this sub-researcher
	Messages []llm.Message

	// ResearchTopic is the specific topic delegated by the supervisor
	ResearchTopic string

	// CompressedResearch is the final compressed output preserving all
	// search results verbatim (with think_tool calls filtered out)
	CompressedResearch string

	// RawNotes contains the raw search results before compression
	RawNotes []string

	// Iteration tracks the current search iteration (used for hard limits)
	Iteration int

	// VisitedURLs tracks URLs visited by this sub-researcher
	VisitedURLs []string
}

// NewSupervisorState creates a new supervisor state with the given research brief.
func NewSupervisorState(researchBrief string) *SupervisorState {
	return &SupervisorState{
		Messages:      make([]llm.Message, 0),
		ResearchBrief: researchBrief,
		Notes:         make([]string, 0),
		RawNotes:      make([]string, 0),
		DraftReport:   "",
		Iterations:    0,
		VisitedURLs:   make(map[string]bool),
		SubInsights:   make([]SubInsight, 0),
	}
}

// NewResearcherState creates a new researcher state for the given topic.
func NewResearcherState(topic string) *ResearcherState {
	return &ResearcherState{
		Messages:           make([]llm.Message, 0),
		ResearchTopic:      topic,
		CompressedResearch: "",
		RawNotes:           make([]string, 0),
		Iteration:          0,
		VisitedURLs:        make([]string, 0),
	}
}

// AddNote adds a compressed research note to the supervisor state.
func (s *SupervisorState) AddNote(note string) {
	s.Notes = append(s.Notes, note)
}

// AddRawNote adds a raw search result to the supervisor state.
func (s *SupervisorState) AddRawNote(note string) {
	s.RawNotes = append(s.RawNotes, note)
}

// UpdateDraft updates the draft report with a refined version.
func (s *SupervisorState) UpdateDraft(draft string) {
	s.DraftReport = draft
}

// IncrementIteration increments the iteration counter.
func (s *SupervisorState) IncrementIteration() {
	s.Iterations++
}

// AddMessage adds a message to the supervisor's conversation history.
func (s *SupervisorState) AddMessage(msg llm.Message) {
	s.Messages = append(s.Messages, msg)
}

// AddVisitedURL marks a URL as visited for deduplication.
func (s *SupervisorState) AddVisitedURL(url string) {
	if s.VisitedURLs == nil {
		s.VisitedURLs = make(map[string]bool)
	}
	s.VisitedURLs[url] = true
}

// AddVisitedURLs marks multiple URLs as visited for deduplication.
func (s *SupervisorState) AddVisitedURLs(urls []string) {
	if s.VisitedURLs == nil {
		s.VisitedURLs = make(map[string]bool)
	}
	for _, url := range urls {
		s.VisitedURLs[url] = true
	}
}

// IsURLVisited checks if a URL has already been visited.
func (s *SupervisorState) IsURLVisited(url string) bool {
	if s.VisitedURLs == nil {
		return false
	}
	return s.VisitedURLs[url]
}

// GetVisitedURLs returns all visited URLs.
func (s *SupervisorState) GetVisitedURLs() []string {
	urls := make([]string, 0, len(s.VisitedURLs))
	for url := range s.VisitedURLs {
		urls = append(urls, url)
	}
	return urls
}

// AddSubInsight adds a sub-insight captured from sub-researcher results.
func (s *SupervisorState) AddSubInsight(insight SubInsight) {
	s.SubInsights = append(s.SubInsights, insight)
}

// AddSubInsights adds multiple sub-insights from sub-researcher results.
func (s *SupervisorState) AddSubInsights(insights []SubInsight) {
	s.SubInsights = append(s.SubInsights, insights...)
}

// GetSubInsights returns all captured sub-insights.
func (s *SupervisorState) GetSubInsights() []SubInsight {
	return s.SubInsights
}

// AddRawNote adds a raw search result to the researcher state.
func (r *ResearcherState) AddRawNote(note string) {
	r.RawNotes = append(r.RawNotes, note)
}

// SetCompressedResearch sets the final compressed research output.
func (r *ResearcherState) SetCompressedResearch(compressed string) {
	r.CompressedResearch = compressed
}

// IncrementIteration increments the search iteration counter.
func (r *ResearcherState) IncrementIteration() {
	r.Iteration++
}

// AddMessage adds a message to the researcher's conversation history.
func (r *ResearcherState) AddMessage(msg llm.Message) {
	r.Messages = append(r.Messages, msg)
}

// AddVisitedURL adds a URL to the list of visited URLs for this researcher.
func (r *ResearcherState) AddVisitedURL(url string) {
	r.VisitedURLs = append(r.VisitedURLs, url)
}

// GetVisitedURLs returns all URLs visited by this researcher.
func (r *ResearcherState) GetVisitedURLs() []string {
	return r.VisitedURLs
}

// ExtractURLs extracts all URLs from a string content.
// Returns deduplicated URLs with trailing punctuation removed.
func ExtractURLs(content string) []string {
	urlRegex := regexp.MustCompile(`https?://[^\s\]\)]+`)
	matches := urlRegex.FindAllString(content, -1)

	// Deduplicate and clean
	seen := make(map[string]bool)
	var urls []string
	for _, url := range matches {
		// Clean trailing punctuation
		url = strings.TrimRight(url, ".,;:!?")
		if !seen[url] {
			seen[url] = true
			urls = append(urls, url)
		}
	}
	return urls
}
