"""Tests for DataLoader."""
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from deep_research.tools.data_loader import DataLoader


@pytest.fixture
def sample_dataframe() -> pd.DataFrame:
    """Create sample DataFrame for testing."""
    return pd.DataFrame({
        "id": [1, 2, 3],
        "name": ["Alice", "Bob", "Charlie"],
        "value": [100, 200, 300],
    })


def test_detect_format_csv() -> None:
    """Test CSV format detection."""
    assert DataLoader.detect_format("data.csv") == ".csv"


def test_detect_format_excel() -> None:
    """Test Excel format detection."""
    assert DataLoader.detect_format("data.xlsx") == ".xlsx"
    assert DataLoader.detect_format("data.xls") == ".xls"


def test_detect_format_parquet() -> None:
    """Test Parquet format detection."""
    assert DataLoader.detect_format("data.parquet") == ".parquet"


def test_detect_format_unsupported() -> None:
    """Test unsupported format raises error."""
    with pytest.raises(ValueError, match="Unknown format"):
        DataLoader.detect_format("data.txt")


def test_load_csv(sample_dataframe: pd.DataFrame) -> None:
    """Test loading CSV file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        sample_dataframe.to_csv(f.name, index=False)
        filepath = Path(f.name)

    try:
        df = DataLoader.load(filepath)
        assert df.shape == (3, 3)
        assert list(df.columns) == ["id", "name", "value"]
    finally:
        filepath.unlink()


def test_load_excel(sample_dataframe: pd.DataFrame) -> None:
    """Test loading Excel file."""
    with tempfile.NamedTemporaryFile(mode="wb", suffix=".xlsx", delete=False) as f:
        sample_dataframe.to_excel(f.name, index=False)
        filepath = Path(f.name)

    try:
        df = DataLoader.load(filepath)
        assert df.shape == (3, 3)
        assert list(df.columns) == ["id", "name", "value"]
    finally:
        filepath.unlink()


def test_load_parquet(sample_dataframe: pd.DataFrame) -> None:
    """Test loading Parquet file."""
    with tempfile.NamedTemporaryFile(mode="wb", suffix=".parquet", delete=False) as f:
        sample_dataframe.to_parquet(f.name, index=False)
        filepath = Path(f.name)

    try:
        df = DataLoader.load(filepath)
        assert df.shape == (3, 3)
        assert list(df.columns) == ["id", "name", "value"]
    finally:
        filepath.unlink()


def test_load_file_not_found() -> None:
    """Test error handling for missing file."""
    with pytest.raises(FileNotFoundError, match="File not found"):
        DataLoader.load("nonexistent.csv")


def test_load_unsupported_format() -> None:
    """Test error handling for unsupported format."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write("test")
        filepath = Path(f.name)

    try:
        with pytest.raises(ValueError, match="Unsupported file format"):
            DataLoader.load(filepath)
    finally:
        filepath.unlink()


def test_generate_load_code_csv() -> None:
    """Test code generation for CSV."""
    code = DataLoader.generate_load_code("data.csv")
    assert "pd.read_csv('data.csv')" in code


def test_generate_load_code_excel() -> None:
    """Test code generation for Excel."""
    code = DataLoader.generate_load_code("data.xlsx")
    assert "pd.read_excel('data.xlsx')" in code


def test_generate_load_code_parquet() -> None:
    """Test code generation for Parquet."""
    code = DataLoader.generate_load_code("data.parquet")
    assert "pd.read_parquet('data.parquet')" in code


def test_supported_formats() -> None:
    """Test supported formats list."""
    formats = DataLoader.supported_formats()
    assert ".csv" in formats
    assert ".xlsx" in formats
    assert ".parquet" in formats
    assert len(formats) >= 8  # At least 8 formats supported
