package think_deep

// InjectionContext provides prior knowledge for expansion workflows.
// This context is injected into the supervisor state before research begins.
type InjectionContext struct {
	// Prior findings to preserve and build upon
	PreviousFindings []string
	ValidatedFacts   []string

	// URLs already visited (for deduplication)
	VisitedURLs []string

	// Existing report structure
	ExistingReport  string
	ExistingOutline []string

	// Expansion focus
	ExpansionTopic string
	RelatedTopics  []string
	KnownGaps      []string
}

// NewInjectionContext creates an empty injection context.
func NewInjectionContext() *InjectionContext {
	return &InjectionContext{
		PreviousFindings: make([]string, 0),
		ValidatedFacts:   make([]string, 0),
		VisitedURLs:      make([]string, 0),
		ExistingOutline:  make([]string, 0),
		RelatedTopics:    make([]string, 0),
		KnownGaps:        make([]string, 0),
	}
}

// AddFinding adds a previous finding to the context.
func (ic *InjectionContext) AddFinding(finding string) {
	ic.PreviousFindings = append(ic.PreviousFindings, finding)
}

// AddVisitedURL adds a visited URL to the context.
func (ic *InjectionContext) AddVisitedURL(url string) {
	ic.VisitedURLs = append(ic.VisitedURLs, url)
}

// AddKnownGap adds a known gap to prioritize.
func (ic *InjectionContext) AddKnownGap(gap string) {
	ic.KnownGaps = append(ic.KnownGaps, gap)
}

// SetExpansionTopic sets the topic to expand on.
func (ic *InjectionContext) SetExpansionTopic(topic string) {
	ic.ExpansionTopic = topic
}

// SetExistingReport sets the existing report to build upon.
func (ic *InjectionContext) SetExistingReport(report string) {
	ic.ExistingReport = report
}
