"""Example: Combined web research + data analysis workflow."""
import asyncio

from deep_research.agent.orchestrator import LeadResearcher
from deep_research.utils.live_progress import LiveProgress
from rich.console import Console


async def main() -> None:
    """Run combined research and data analysis workflow."""
    console = Console()

    # Example query combining data analysis + web research
    query = (
        "Analyze data/customers.xlsx to identify customer segments, "
        "then research industry best practices for customer segmentation "
        "and provide recommendations"
    )

    console.print(f"\n{'='*60}")
    console.print(f"Combined Workflow Example")
    console.print(f"{'='*60}\n")
    console.print(f"Query: {query}\n")

    # Initialize orchestrator with progress tracking
    progress = LiveProgress(query, console=console)
    orchestrator = LeadResearcher(model="gpt-4o", progress=progress)

    # Execute research
    with progress:
        result = await orchestrator.research(query)

    # Display results
    console.print(f"\n{'='*60}")
    console.print(f"Results")
    console.print(f"{'='*60}\n")
    from rich.markdown import Markdown
    console.print(Markdown(result["report"]))

    console.print(f"\n{'='*60}")
    console.print(f"Metadata")
    console.print(f"{'='*60}\n")
    console.print(f"Model: {result['metadata']['model']}")
    console.print(f"Workers: {len(result['metadata'].get('worker_results', []))}")
    console.print(f"Sources: {len(result['sources'])}")

    if result["sources"]:
        console.print("\nSources (including notebooks):")
        for source in result["sources"][:5]:  # Show first 5
            console.print(f"  - {source}")


if __name__ == "__main__":
    asyncio.run(main())
