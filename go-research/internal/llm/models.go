package llm

// Model configurations - centralized for easy changes
const (
	DefaultModel = "z-ai/glm-5.2"
)

// ModelConfig holds model-specific settings
type ModelConfig struct {
	ID          string
	MaxTokens   int
	Temperature float64
}

// DefaultModelConfig returns the default model configuration
func DefaultModelConfig() ModelConfig {
	return ModelConfig{
		ID:          DefaultModel,
		MaxTokens:   8192,
		Temperature: 0.7,
	}
}

// ModelPricing holds per-token pricing (cost per 1M tokens in USD)
type ModelPricing struct {
	InputPer1M  float64
	OutputPer1M float64
}

// modelPricing maps model IDs to their pricing
// Prices from OpenRouter (as of July 2026) - update as needed
var modelPricing = map[string]ModelPricing{
	"z-ai/glm-5.2":                 {InputPer1M: 0.71, OutputPer1M: 2.24},
	"deepseek/deepseek-v4-flash":   {InputPer1M: 0.09, OutputPer1M: 0.18},
	"google/gemini-2.5-flash-lite": {InputPer1M: 0.10, OutputPer1M: 0.40},
	"anthropic/claude-haiku-4.5":   {InputPer1M: 1.00, OutputPer1M: 5.00},
	"anthropic/claude-sonnet-5":    {InputPer1M: 2.00, OutputPer1M: 10.00},
	"openai/gpt-oss-120b":          {InputPer1M: 0.35, OutputPer1M: 0.95},
	"openai/gpt-oss-20b":           {InputPer1M: 0.07, OutputPer1M: 0.30},
}

// defaultPricing used when model not found in pricing table
var defaultPricing = ModelPricing{InputPer1M: 1.00, OutputPer1M: 2.00}

// GetPricing returns pricing for a model
func GetPricing(modelID string) ModelPricing {
	if pricing, ok := modelPricing[modelID]; ok {
		return pricing
	}
	return defaultPricing
}

// CalculateCost computes cost from token counts
func CalculateCost(modelID string, inputTokens, outputTokens int) (inputCost, outputCost, totalCost float64) {
	pricing := GetPricing(modelID)
	inputCost = float64(inputTokens) * pricing.InputPer1M / 1_000_000
	outputCost = float64(outputTokens) * pricing.OutputPer1M / 1_000_000
	totalCost = inputCost + outputCost
	return
}
