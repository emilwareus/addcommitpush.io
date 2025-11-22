"""Cost estimation for operations."""

from rich.console import Console


def estimate_research_cost(query: str) -> float:
    """Estimate cost for research query.

    Very rough estimate based on query complexity.

    Args:
        query: Research query

    Returns:
        Estimated cost in USD
    """
    # Rough heuristic: $0.01 per word in query
    # Real cost depends on actual token usage
    words = len(query.split())
    base_cost = words * 0.01

    # Add overhead for multi-agent orchestration
    estimated_cost = base_cost * 10  # Rough multiplier

    return min(estimated_cost, 10.0)  # Cap at $10


def confirm_expensive_operation(
    operation: str,
    estimated_cost: float,
    console: Console,
    threshold: float = 1.0,
) -> bool:
    """Confirm expensive operation with user.

    Args:
        operation: Description of operation
        estimated_cost: Estimated cost in USD
        console: Rich console for output
        threshold: Cost threshold for confirmation (default $1)

    Returns:
        True if user confirms, False otherwise
    """
    if estimated_cost < threshold:
        return True

    console.print(f"\n⚠ Cost Estimate: ${estimated_cost:.2f}")
    console.print(f"  Operation: {operation}")

    # Use plain input instead of Rich Confirm
    response = input("Continue? [Y/n]: ").strip().lower()
    return response in ("", "y", "yes")
