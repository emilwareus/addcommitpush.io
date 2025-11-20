"""Multi-format data loader factory."""
from pathlib import Path
from typing import Any

import pandas as pd

from ..utils.logger import get_logger

logger = get_logger(__name__)


class DataLoader:
    """Factory for loading various data formats into pandas DataFrames."""

    SUPPORTED_FORMATS = {
        ".csv": pd.read_csv,
        ".tsv": lambda path, **kwargs: pd.read_csv(path, sep="\t", **kwargs),
        ".xlsx": pd.read_excel,
        ".xls": pd.read_excel,
        ".parquet": pd.read_parquet,
        ".pkl": pd.read_pickle,
        ".pickle": pd.read_pickle,
        ".json": pd.read_json,
        ".feather": pd.read_feather,
    }

    @classmethod
    def load(cls, filepath: str | Path, **kwargs: Any) -> pd.DataFrame:
        """Load data file, auto-detecting format from extension.

        Args:
            filepath: Path to data file
            **kwargs: Additional arguments passed to pandas reader

        Returns:
            Loaded DataFrame

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file format is unsupported or loading fails
        """
        path = Path(filepath)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        suffix = path.suffix.lower()

        if suffix not in cls.SUPPORTED_FORMATS:
            supported = ", ".join(cls.SUPPORTED_FORMATS.keys())
            raise ValueError(
                f"Unsupported file format: {suffix}. Supported: {supported}"
            )

        reader = cls.SUPPORTED_FORMATS[suffix]

        try:
            logger.info("loading_data", filepath=str(path), format=suffix)
            df: pd.DataFrame = reader(filepath, **kwargs)  # type: ignore[operator]
            logger.info("data_loaded", shape=df.shape, format=suffix)
            return df
        except Exception as e:
            raise ValueError(f"Failed to load {suffix} file: {str(e)}")

    @classmethod
    def detect_format(cls, filepath: str | Path) -> str:
        """Detect file format from extension.

        Args:
            filepath: Path to data file

        Returns:
            File extension (e.g., ".csv", ".xlsx")

        Raises:
            ValueError: If format is unknown
        """
        suffix = Path(filepath).suffix.lower()
        if suffix in cls.SUPPORTED_FORMATS:
            return suffix
        raise ValueError(f"Unknown format: {suffix}")

    @classmethod
    def generate_load_code(cls, filepath: str | Path) -> str:
        """Generate pandas loading code for Jupyter notebook.

        Args:
            filepath: Path to data file

        Returns:
            Python code string to load the file
        """
        path = Path(filepath)
        suffix = path.suffix.lower()

        code_templates = {
            ".csv": f"df = pd.read_csv('{filepath}')",
            ".tsv": f"df = pd.read_csv('{filepath}', sep='\\t')",
            ".xlsx": f"df = pd.read_excel('{filepath}')",
            ".xls": f"df = pd.read_excel('{filepath}')",
            ".parquet": f"df = pd.read_parquet('{filepath}')",
            ".pkl": f"df = pd.read_pickle('{filepath}')",
            ".pickle": f"df = pd.read_pickle('{filepath}')",
            ".json": f"df = pd.read_json('{filepath}')",
            ".feather": f"df = pd.read_feather('{filepath}')",
        }

        return code_templates.get(suffix, f"df = pd.read_csv('{filepath}')")

    @classmethod
    def supported_formats(cls) -> list[str]:
        """Get list of supported file formats."""
        return sorted(cls.SUPPORTED_FORMATS.keys())
