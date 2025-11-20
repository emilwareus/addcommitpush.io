"""Centralized model configuration and pricing support."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from .utils.pricing import CostBreakdown, ModelPricing


class SupportedModel(str, Enum):
    """Enumeration of supported models with their configuration."""

    TONGYI_DEEPRESEARCH_30B_A3B = "alibaba/tongyi-deepresearch-30b-a3b"

    @property
    def model_name(self) -> str:
        """Return the model identifier string."""
        return self.value

    @property
    def pricing(self) -> ModelPricing:
        """Return pricing configuration for this model."""
        return MODEL_CONFIGS[self].pricing

    @property
    def context_window_tokens(self) -> int:
        """Return context window size in tokens."""
        return self.pricing.context_window_tokens

    @property
    def max_output_tokens(self) -> int:
        """Return maximum output tokens."""
        return self.pricing.max_output_tokens

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> CostBreakdown:
        """Estimate cost for token usage."""
        return self.pricing.estimate_cost(prompt_tokens, completion_tokens)

    @classmethod
    def from_string(cls, model_str: str) -> SupportedModel | None:
        """Convert a model string to SupportedModel enum, if supported."""
        normalized = model_str.lower().strip()
        for model in cls:
            if model.value.lower() == normalized:
                return model
            # Handle short names (e.g., "tongyi-deepresearch-30b-a3b")
            if model.value.lower().split("/")[-1] == normalized:
                return model
        return None

    @classmethod
    def default(cls) -> SupportedModel:
        """Return the default supported model."""
        return cls.TONGYI_DEEPRESEARCH_30B_A3B


@dataclass(frozen=True)
class ModelConfig:
    """Complete configuration for a model."""

    model: SupportedModel
    pricing: ModelPricing

    def as_dict(self) -> dict[str, Any]:
        """Return serializable representation."""
        return {
            "model": self.model.value,
            "pricing": self.pricing.as_dict(),
        }


# Model configurations with pricing data
MODEL_CONFIGS: dict[SupportedModel, ModelConfig] = {
    SupportedModel.TONGYI_DEEPRESEARCH_30B_A3B: ModelConfig(
        model=SupportedModel.TONGYI_DEEPRESEARCH_30B_A3B,
        pricing=ModelPricing(
            model="alibaba/tongyi-deepresearch-30b-a3b",
            context_window_tokens=131_100,
            max_output_tokens=131_100,
            input_price_per_million=0.09,
            output_price_per_million=0.40,
            cache_read_price_per_million=None,
            cache_write_price_per_million=None,
            input_audio_price_per_million=None,
            input_audio_cache_price_per_million=None,
        ),
    ),
}


def get_model_config(model: SupportedModel | str) -> ModelConfig | None:
    """Get model configuration for a SupportedModel enum or string."""
    if isinstance(model, SupportedModel):
        return MODEL_CONFIGS.get(model)

    supported = SupportedModel.from_string(model)
    if supported:
        return MODEL_CONFIGS.get(supported)

    return None


def get_pricing_for_model(model: SupportedModel | str) -> ModelPricing | None:
    """Get pricing information for a model."""
    config = get_model_config(model)
    return config.pricing if config else None

