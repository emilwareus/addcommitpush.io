"""Tests for pricing helpers."""
import math

from deep_research.utils.pricing import get_pricing


def test_get_pricing_known_model() -> None:
    pricing = get_pricing("alibaba/tongyi-deepresearch-30b-a3b")
    assert pricing is not None
    assert pricing.context_window_tokens == 131_100
    assert pricing.max_output_tokens == 131_100


def test_get_pricing_with_prefix() -> None:
    pricing = get_pricing("alibaba/tongyi-deepresearch-30b-a3b")
    assert pricing is not None
    assert pricing.model == "alibaba/tongyi-deepresearch-30b-a3b"


def test_estimate_cost_computes_expected_amounts() -> None:
    pricing = get_pricing("alibaba/tongyi-deepresearch-30b-a3b")
    assert pricing

    breakdown = pricing.estimate_cost(prompt_tokens=10_000, completion_tokens=5_000)

    assert math.isclose(breakdown.input_cost, 0.0009, rel_tol=1e-6)
    assert math.isclose(breakdown.output_cost, 0.002, rel_tol=1e-6)

    cost_dict = breakdown.as_dict()
    assert math.isclose(cost_dict["total_cost"], 0.0029, rel_tol=1e-6)

