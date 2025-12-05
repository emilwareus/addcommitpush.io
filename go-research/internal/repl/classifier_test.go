package repl

import (
	"context"
	"testing"

	"go-research/internal/llm"
)

// mockChatClient implements llm.ChatClient for testing
type mockChatClient struct {
	response string
	model    string
}

func (m *mockChatClient) Chat(ctx context.Context, messages []llm.Message) (*llm.ChatResponse, error) {
	resp := &llm.ChatResponse{}
	// ChatResponse.Choices is an anonymous struct slice, construct it properly
	resp.Choices = append(resp.Choices, struct {
		Message llm.Message `json:"message"`
	}{Message: llm.Message{Content: m.response}})
	return resp, nil
}

func (m *mockChatClient) StreamChat(ctx context.Context, messages []llm.Message, handler func(chunk string) error) error {
	return handler(m.response)
}

func (m *mockChatClient) GetModel() string {
	return m.model
}

func (m *mockChatClient) SetModel(model string) {
	m.model = model
}

func TestNewQueryClassifier(t *testing.T) {
	client := &mockChatClient{model: "test-model"}
	classifier := NewQueryClassifier(client, "haiku")

	if classifier == nil {
		t.Fatal("NewQueryClassifier returned nil")
	}
	if classifier.model != "haiku" {
		t.Errorf("model = %q, want %q", classifier.model, "haiku")
	}
}

func TestQueryClassifier_ParseResponse(t *testing.T) {
	client := &mockChatClient{model: "test-model"}
	classifier := NewQueryClassifier(client, "haiku")

	tests := []struct {
		name       string
		response   string
		wantType   IntentType
		wantConf   float64
		wantTopic  string
		wantErr    bool
	}{
		{
			name:      "research intent",
			response:  `{"intent": "RESEARCH", "confidence": 0.9, "topic": ""}`,
			wantType:  IntentResearch,
			wantConf:  0.9,
			wantTopic: "",
			wantErr:   false,
		},
		{
			name:      "question intent",
			response:  `{"intent": "QUESTION", "confidence": 0.85, "topic": ""}`,
			wantType:  IntentQuestion,
			wantConf:  0.85,
			wantTopic: "",
			wantErr:   false,
		},
		{
			name:      "expand intent with topic",
			response:  `{"intent": "EXPAND", "confidence": 0.95, "topic": "tax policies"}`,
			wantType:  IntentExpand,
			wantConf:  0.95,
			wantTopic: "tax policies",
			wantErr:   false,
		},
		{
			name:      "lowercase intent",
			response:  `{"intent": "research", "confidence": 0.8, "topic": ""}`,
			wantType:  IntentResearch,
			wantConf:  0.8,
			wantTopic: "",
			wantErr:   false,
		},
		{
			name:      "JSON in markdown code block",
			response:  "```json\n{\"intent\": \"QUESTION\", \"confidence\": 0.9, \"topic\": \"\"}\n```",
			wantType:  IntentQuestion,
			wantConf:  0.9,
			wantTopic: "",
			wantErr:   false,
		},
		{
			name:     "invalid JSON",
			response: "This is not JSON",
			wantErr:  true,
		},
		{
			name:     "unknown intent type",
			response: `{"intent": "UNKNOWN", "confidence": 0.9, "topic": ""}`,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			intent, err := classifier.parseResponse(tt.response)

			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if intent.Type != tt.wantType {
				t.Errorf("Type = %q, want %q", intent.Type, tt.wantType)
			}
			if intent.Confidence != tt.wantConf {
				t.Errorf("Confidence = %f, want %f", intent.Confidence, tt.wantConf)
			}
			if intent.Topic != tt.wantTopic {
				t.Errorf("Topic = %q, want %q", intent.Topic, tt.wantTopic)
			}
		})
	}
}

func TestQueryClassifier_BuildClassificationPrompt(t *testing.T) {
	client := &mockChatClient{model: "test-model"}
	classifier := NewQueryClassifier(client, "haiku")

	tests := []struct {
		name           string
		query          string
		hasSession     bool
		sessionSummary string
		wantContains   []string
	}{
		{
			name:           "with session and summary",
			query:          "What did you find about taxes?",
			hasSession:     true,
			sessionSummary: "Swedish political parties",
			wantContains: []string{
				"What did you find about taxes?",
				"active research session about: Swedish political parties",
				"QUESTION",
				"EXPAND",
				"RESEARCH",
				"STRONGLY prefer QUESTION",
			},
		},
		{
			name:         "with session no summary",
			query:        "Tell me more",
			hasSession:   true,
			wantContains: []string{"active research session", "prefer QUESTION"},
		},
		{
			name:         "no session",
			query:        "Research AI trends",
			hasSession:   false,
			wantContains: []string{"no active research session"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prompt := classifier.buildClassificationPrompt(tt.query, tt.hasSession, tt.sessionSummary)

			for _, want := range tt.wantContains {
				if !contains(prompt, want) {
					t.Errorf("prompt should contain %q", want)
				}
			}
		})
	}
}

func TestQueryClassifier_Classify(t *testing.T) {
	tests := []struct {
		name         string
		response     string
		wantType     IntentType
	}{
		{
			name:     "classify as research",
			response: `{"intent": "RESEARCH", "confidence": 0.9, "topic": ""}`,
			wantType: IntentResearch,
		},
		{
			name:     "classify as question",
			response: `{"intent": "QUESTION", "confidence": 0.85, "topic": ""}`,
			wantType: IntentQuestion,
		},
		{
			name:     "classify as expand",
			response: `{"intent": "EXPAND", "confidence": 0.95, "topic": "details"}`,
			wantType: IntentExpand,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &mockChatClient{
				model:    "test-model",
				response: tt.response,
			}
			classifier := NewQueryClassifier(client, "haiku")

			intent, err := classifier.Classify(context.Background(), "test query", true, "test summary")
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if intent.Type != tt.wantType {
				t.Errorf("Type = %q, want %q", intent.Type, tt.wantType)
			}
		})
	}
}

func TestIntentType_Constants(t *testing.T) {
	// Verify intent type constants have expected values
	if IntentResearch != "research" {
		t.Errorf("IntentResearch = %q, want %q", IntentResearch, "research")
	}
	if IntentQuestion != "question" {
		t.Errorf("IntentQuestion = %q, want %q", IntentQuestion, "question")
	}
	if IntentExpand != "expand" {
		t.Errorf("IntentExpand = %q, want %q", IntentExpand, "expand")
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
