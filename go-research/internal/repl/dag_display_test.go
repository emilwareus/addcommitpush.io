package repl

import (
	"bytes"
	"fmt"
	"testing"

	"go-research/internal/events"
)

func TestDAGDisplay_Render_ThreePerspectives(t *testing.T) {
	var buf bytes.Buffer
	display := NewDAGDisplay(&buf)

	data := events.PlanCreatedData{
		WorkerCount: 3,
		Complexity:  0.8,
		Topic:       "What are the latest advancements in quantum computing and their practical applications?",
		Perspectives: []events.PerspectiveData{
			{
				Name:      "Academic Researcher",
				Focus:     "Peer-reviewed research on quantum algorithms and error correction",
				Questions: []string{"What papers have been published?", "What are the theoretical limits?"},
			},
			{
				Name:      "Industry Expert",
				Focus:     "Commercial quantum computing implementations and business applications",
				Questions: []string{"Which companies are leading?", "What's the ROI?"},
			},
			{
				Name:      "Hardware Engineer",
				Focus:     "Physical implementation challenges and qubit technologies",
				Questions: []string{"What qubit types exist?", "What's the coherence time?"},
			},
		},
	}

	display.Render(data)

	fmt.Println("\n" + "=" + " STORM Display: 3 Perspectives " + "=")
	fmt.Println(buf.String())
	fmt.Println("=" + " End " + "=")

	// Basic assertions
	output := buf.String()
	if len(output) == 0 {
		t.Error("expected non-empty output")
	}
	if !bytes.Contains(buf.Bytes(), []byte("STORM Research")) {
		t.Error("expected header to contain 'STORM Research'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Conv 1")) {
		t.Error("expected output to contain 'Conv 1'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Conv 2")) {
		t.Error("expected output to contain 'Conv 2'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Conv 3")) {
		t.Error("expected output to contain 'Conv 3'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Academic Researcher")) {
		t.Error("expected output to contain 'Academic Researcher'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Perspectives:")) {
		t.Error("expected output to contain 'Perspectives:'")
	}
	// Check for STORM phases
	if !bytes.Contains(buf.Bytes(), []byte("1. DISCOVER")) {
		t.Error("expected output to contain '1. DISCOVER'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("2. CONVERSE")) {
		t.Error("expected output to contain '2. CONVERSE'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("3. ANALYZE")) {
		t.Error("expected output to contain '3. ANALYZE'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("4. SYNTHESIZE")) {
		t.Error("expected output to contain '4. SYNTHESIZE'")
	}
}

func TestDAGDisplay_Render_FivePerspectives(t *testing.T) {
	var buf bytes.Buffer
	display := NewDAGDisplay(&buf)

	data := events.PlanCreatedData{
		WorkerCount: 5,
		Complexity:  0.9,
		Topic:       "How can AI be used to accelerate drug discovery and what are the ethical implications?",
		Perspectives: []events.PerspectiveData{
			{
				Name:      "Pharmaceutical Scientist",
				Focus:     "Drug development pipelines and molecular modeling approaches",
				Questions: []string{"How does AI improve lead optimization?"},
			},
			{
				Name:      "ML Researcher",
				Focus:     "Deep learning architectures for molecular property prediction",
				Questions: []string{"What models work best for drug-target interaction?"},
			},
			{
				Name:      "Bioethicist",
				Focus:     "Ethical considerations in AI-driven healthcare decisions",
				Questions: []string{"How do we ensure fairness in drug trials?"},
			},
			{
				Name:      "Regulatory Expert",
				Focus:     "FDA approval processes and AI validation requirements",
				Questions: []string{"What regulations apply to AI-discovered drugs?"},
			},
			{
				Name:      "Healthcare Economist",
				Focus:     "Cost-benefit analysis and market access implications",
				Questions: []string{"What's the economic impact of faster drug discovery?"},
			},
		},
	}

	display.Render(data)

	fmt.Println("\n" + "=" + " STORM Display: 5 Perspectives " + "=")
	fmt.Println(buf.String())
	fmt.Println("=" + " End " + "=")

	// Basic assertions
	output := buf.String()
	if len(output) == 0 {
		t.Error("expected non-empty output")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Conv 5")) {
		t.Error("expected output to contain 'Conv 5'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Bioethicist")) {
		t.Error("expected output to contain 'Bioethicist'")
	}
}

func TestDAGDisplay_Render_SinglePerspective(t *testing.T) {
	var buf bytes.Buffer
	display := NewDAGDisplay(&buf)

	data := events.PlanCreatedData{
		WorkerCount: 1,
		Complexity:  0.3,
		Topic:       "What is the capital of France?",
		Perspectives: []events.PerspectiveData{
			{
				Name:      "General Knowledge",
				Focus:     "Basic factual information about geography",
				Questions: []string{"What is the capital city?"},
			},
		},
	}

	display.Render(data)

	fmt.Println("\n" + "=" + " STORM Display: 1 Perspective (Simple Query) " + "=")
	fmt.Println(buf.String())
	fmt.Println("=" + " End " + "=")

	// Basic assertions
	output := buf.String()
	if len(output) == 0 {
		t.Error("expected non-empty output")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Conv 1")) {
		t.Error("expected output to contain 'Conv 1'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("General Knowledge")) {
		t.Error("expected output to contain 'General Knowledge'")
	}
}

func TestDAGDisplay_Render_LongTopicTruncation(t *testing.T) {
	var buf bytes.Buffer
	display := NewDAGDisplay(&buf)

	data := events.PlanCreatedData{
		WorkerCount: 2,
		Complexity:  0.7,
		Topic:       "This is an extremely long research topic that should definitely be truncated when displayed in the header because it exceeds the maximum width allowed for the visualization panel and would otherwise break the layout of the beautiful ASCII art display",
		Perspectives: []events.PerspectiveData{
			{
				Name:      "Expert with a Very Long Name That Should Also Be Truncated",
				Focus:     "This focus description is also quite long and should be handled gracefully by the truncation logic to prevent layout issues",
				Questions: []string{"Long question?"},
			},
			{
				Name:      "Short Expert",
				Focus:     "Brief focus",
				Questions: []string{"Quick question?"},
			},
		},
	}

	display.Render(data)

	fmt.Println("\n" + "=" + " STORM Display: Long Text Truncation " + "=")
	fmt.Println(buf.String())
	fmt.Println("=" + " End " + "=")

	// Verify truncation happened (topic should have "...")
	if !bytes.Contains(buf.Bytes(), []byte("...")) {
		t.Error("expected truncated text to contain '...'")
	}
}

func TestDAGDisplay_Render_FourPerspectives(t *testing.T) {
	var buf bytes.Buffer
	display := NewDAGDisplay(&buf)

	data := events.PlanCreatedData{
		WorkerCount: 4,
		Complexity:  0.85,
		Topic:       "What are the implications of decentralized finance (DeFi) on traditional banking?",
		Perspectives: []events.PerspectiveData{
			{
				Name:      "Crypto Analyst",
				Focus:     "DeFi protocols, yield farming, and liquidity pools",
				Questions: []string{"What are the top DeFi protocols?", "How does TVL affect stability?"},
			},
			{
				Name:      "Traditional Banker",
				Focus:     "Impact on legacy banking systems and services",
				Questions: []string{"Which banking services are most threatened?"},
			},
			{
				Name:      "Regulatory Lawyer",
				Focus:     "Legal frameworks and compliance requirements",
				Questions: []string{"How do securities laws apply to DeFi?"},
			},
			{
				Name:      "Risk Analyst",
				Focus:     "Systemic risks and smart contract vulnerabilities",
				Questions: []string{"What are the main attack vectors?"},
			},
		},
	}

	display.Render(data)

	fmt.Println("\n" + "=" + " STORM Display: 4 Perspectives (DeFi Research) " + "=")
	fmt.Println(buf.String())
	fmt.Println("=" + " End " + "=")

	// Basic assertions
	output := buf.String()
	if len(output) == 0 {
		t.Error("expected non-empty output")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Conv 4")) {
		t.Error("expected output to contain 'Conv 4'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("Crypto Analyst")) {
		t.Error("expected output to contain 'Crypto Analyst'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("4. SYNTHESIZE")) {
		t.Error("expected output to contain '4. SYNTHESIZE'")
	}
	if !bytes.Contains(buf.Bytes(), []byte("3. ANALYZE")) {
		t.Error("expected output to contain '3. ANALYZE'")
	}
}

func TestCenterText(t *testing.T) {
	tests := []struct {
		text     string
		width    int
		expected string
	}{
		{"Hello", 10, "  Hello   "},
		{"Test", 10, "   Test   "},
		{"LongTextThatExceedsWidth", 10, "LongTextThatExceedsWidth"},
		{"X", 5, "  X  "},
	}

	for _, tt := range tests {
		t.Run(tt.text, func(t *testing.T) {
			result := centerText(tt.text, tt.width)
			if result != tt.expected {
				t.Errorf("centerText(%q, %d) = %q, want %q", tt.text, tt.width, result, tt.expected)
			}
		})
	}
}
