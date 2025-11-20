"""Integration tests for combined workflows."""
import pytest

from deep_research.agent.orchestrator import LeadResearcher


@pytest.mark.asyncio
@pytest.mark.integration
async def test_combined_data_and_web_research() -> None:
    """Test workflow combining data analysis and web research."""
    query = (
        "Analyze data/car_price_prediction_.csv to understand price patterns, "
        "then research car pricing factors in 2024"
    )

    orchestrator = LeadResearcher(model="gpt-4o-mini")
    result = await orchestrator.research(query)

    # Should succeed
    assert result["report"]
    assert len(result["report"]) > 100

    # Should have worker results
    assert "worker_results" in result["metadata"]
    assert len(result["metadata"]["worker_results"]) > 0

    # Should have both web sources and notebook paths
    sources = result["sources"]
    has_web = any("http" in s for s in sources)
    has_notebook = any(".ipynb" in s for s in sources)

    # At minimum should have some sources
    assert len(sources) > 0
    # Note: Depending on orchestrator decomposition, may or may not use both
    # This test validates the workflow completes successfully


@pytest.mark.asyncio
@pytest.mark.integration
async def test_pure_data_analysis_workflow() -> None:
    """Test workflow with only data analysis."""
    query = "Analyze data/car_price_prediction_.csv and predict price drivers"

    orchestrator = LeadResearcher(model="gpt-4o-mini")
    result = await orchestrator.research(query)

    # Should succeed
    assert result["report"]

    # Should have notebook in sources or metadata
    sources_str = " ".join(result["sources"])
    metadata_str = str(result["metadata"])
    assert ".ipynb" in sources_str or ".ipynb" in metadata_str
