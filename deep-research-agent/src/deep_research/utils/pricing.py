"""Model pricing helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    pass


@dataclass(frozen=True)
class ModelPricing:
    """Pricing and context information for a specific model."""

    model: str
    context_window_tokens: int
    max_output_tokens: int
    input_price_per_million: float | None
    output_price_per_million: float | None
    cache_read_price_per_million: float | None = None
    cache_write_price_per_million: float | None = None
    input_audio_price_per_million: float | None = None
    input_audio_cache_price_per_million: float | None = None

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> CostBreakdown:
        """Estimate dollar cost for the provided token usage."""
        input_cost = _calculate_segment_cost(prompt_tokens, self.input_price_per_million)
        output_cost = _calculate_segment_cost(completion_tokens, self.output_price_per_million)

        return CostBreakdown(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            input_cost=input_cost,
            output_cost=output_cost,
        )

    def as_dict(self) -> dict[str, Any]:
        """Return a serialisable representation."""
        return asdict(self)


@dataclass(frozen=True)
class CostBreakdown:
    """Represents the computed dollar cost for a run."""

    prompt_tokens: int
    completion_tokens: int
    input_cost: float
    output_cost: float

    @property
    def total_cost(self) -> float:
        return self.input_cost + self.output_cost

    def as_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["total_cost"] = self.total_cost
        return data


def get_pricing(model: str) -> ModelPricing | None:
    """Return pricing information for a model, if known.

    This function delegates to the centralized models module.
    Kept for backward compatibility.
    """
    # Lazy import to avoid circular dependency
    from ..models import get_pricing_for_model

    return get_pricing_for_model(model)


def _calculate_segment_cost(tokens: int, price_per_million: float | None) -> float:
    if not price_per_million:
        return 0.0
    return (tokens / 1_000_000) * price_per_million


