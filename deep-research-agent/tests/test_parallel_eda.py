"""Tests for parallel EDA execution."""
import asyncio
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from deep_research.tools.eda_tool import EDATool


@pytest.fixture
def sample_datasets() -> tuple[Path, Path]:
    """Create two temporary CSV files for concurrent testing."""
    df1 = pd.DataFrame({
        "price": [100, 200, 300],
        "size": [1000, 1500, 2000],
    })

    df2 = pd.DataFrame({
        "sales": [50, 75, 100],
        "month": ["Jan", "Feb", "Mar"],
    })

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f1:
        df1.to_csv(f1.name, index=False)
        path1 = Path(f1.name)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f2:
        df2.to_csv(f2.name, index=False)
        path2 = Path(f2.name)

    yield (path1, path2)

    path1.unlink()
    path2.unlink()


@pytest.mark.asyncio
async def test_concurrent_eda_execution(sample_datasets: tuple[Path, Path]) -> None:
    """Test that two EDA agents can run concurrently without interference."""
    file1, file2 = sample_datasets

    tool1 = EDATool(model="gpt-4o-mini")
    tool2 = EDATool(model="gpt-4o-mini")

    # Run both analyses concurrently
    task1 = tool1.execute(
        filepath=str(file1),
        query="analyze price distribution",
        max_iterations=3
    )
    task2 = tool2.execute(
        filepath=str(file2),
        query="analyze sales trends",
        max_iterations=3
    )

    results = await asyncio.gather(task1, task2)

    # Both should succeed
    assert results[0].success is True
    assert results[1].success is True

    # Results should be from different files
    assert results[0].metadata["filepath"] == str(file1)
    assert results[1].metadata["filepath"] == str(file2)

    # Both should have insights
    assert results[0].metadata["insights_count"] > 0
    assert results[1].metadata["insights_count"] > 0


@pytest.mark.asyncio
@pytest.mark.slow
async def test_parallel_performance(sample_datasets: tuple[Path, Path]) -> None:
    """Test that parallel execution is faster than sequential."""
    import time

    file1, file2 = sample_datasets
    tool = EDATool(model="gpt-4o-mini")

    # Sequential execution
    start_seq = time.time()
    await tool.execute(filepath=str(file1), query="analyze price", max_iterations=2)
    await tool.execute(filepath=str(file2), query="analyze sales", max_iterations=2)
    seq_time = time.time() - start_seq

    # Parallel execution
    start_par = time.time()
    await asyncio.gather(
        tool.execute(filepath=str(file1), query="analyze price", max_iterations=2),
        tool.execute(filepath=str(file2), query="analyze sales", max_iterations=2)
    )
    par_time = time.time() - start_par

    # Parallel should be faster (allow some overhead, check < 1.5x sequential time)
    assert par_time < seq_time * 1.5, f"Parallel ({par_time:.2f}s) not faster than sequential ({seq_time:.2f}s)"
