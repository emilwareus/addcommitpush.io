"""Tests for EDATool."""
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from deep_research.tools.eda_tool import EDATool


@pytest.fixture
def sample_csv_file() -> Path:
    """Create temporary CSV file for testing."""
    df = pd.DataFrame({
        "price": [100, 200, 300, 400, 500],
        "size": [1000, 1500, 2000, 2500, 3000],
        "rooms": [2, 3, 3, 4, 5],
    })

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        df.to_csv(f.name, index=False)
        filepath = Path(f.name)

    yield filepath
    filepath.unlink()


@pytest.mark.asyncio
async def test_eda_tool_basic_execution(sample_csv_file: Path) -> None:
    """Test basic EDA tool execution."""
    tool = EDATool(model="gpt-4o-mini")

    result = await tool.execute(
        filepath=str(sample_csv_file),
        query="analyze price distribution",
        max_iterations=3  # Reduced for faster testing
    )

    assert result.success is True
    assert "EDA Analysis Results" in result.content
    assert result.metadata["filepath"] == str(sample_csv_file)
    assert result.metadata["insights_count"] > 0


@pytest.mark.asyncio
async def test_eda_tool_missing_filepath() -> None:
    """Test error handling for missing filepath."""
    tool = EDATool()

    result = await tool.execute(query="analyze data")

    assert result.success is False
    assert "filepath is required" in result.content
    assert result.metadata["error"] == "missing_filepath"


@pytest.mark.asyncio
async def test_eda_tool_invalid_file() -> None:
    """Test error handling for invalid file."""
    tool = EDATool()

    result = await tool.execute(
        filepath="nonexistent.csv",
        query="analyze data"
    )

    assert result.success is False
    assert "failed" in result.content.lower()


def test_eda_tool_properties() -> None:
    """Test tool properties."""
    tool = EDATool()

    assert tool.name == "eda"
    assert "exploratory data analysis" in tool.description.lower()
    assert "csv" in tool.description.lower()
