package llm

// Model configurations - centralized for easy changes
const (
	DefaultModel = "alibaba/tongyi-deepresearch-30b-a3b"
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
// Prices from OpenRouter (as of 2024) - update as needed
var modelPricing = map[string]ModelPricing{
	"alibaba/tongyi-deepresearch-30b-a3b": {InputPer1M: 0.50, OutputPer1M: 0.50},
	"openai/gpt-4o":                       {InputPer1M: 2.50, OutputPer1M: 10.00},
	"openai/gpt-4o-mini":                  {InputPer1M: 0.15, OutputPer1M: 0.60},
	"anthropic/claude-3.5-sonnet":         {InputPer1M: 3.00, OutputPer1M: 15.00},
	"anthropic/claude-3-haiku":            {InputPer1M: 0.25, OutputPer1M: 1.25},
	"google/gemini-pro-1.5":               {InputPer1M: 1.25, OutputPer1M: 5.00},
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
