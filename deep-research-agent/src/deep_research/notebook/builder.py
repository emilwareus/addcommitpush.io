"""Notebook generation."""

from typing import Any

import nbformat as nbf
from nbformat.v4 import new_code_cell, new_markdown_cell, new_notebook


class NotebookBuilder:
    """Build narrative EDA notebooks."""

    ACTS = {
        "I": "Set the Scene",
        "II": "Meet the Data",
        "III": "Data Quality",
        "IV": "Target Analysis",
        "V": "Feature Exploration",
        "VI": "Sanity Baseline",
        "VII": "Insights & Next Steps",
    }

    def __init__(self, title: str) -> None:
        self.nb = new_notebook()  # type: ignore[no-untyped-call]
        self.title = title
        self.cells: list[Any] = []

    def add_act(self, act: str, markdown: str | None = None) -> None:
        """Add act header."""
        header = f"# Act {act}: {self.ACTS[act]}"
        self.cells.append(new_markdown_cell(header))  # type: ignore[no-untyped-call]

        if markdown:
            self.cells.append(new_markdown_cell(markdown))  # type: ignore[no-untyped-call]

    def add_code(self, code: str) -> None:
        """Add code cell."""
        self.cells.append(new_code_cell(code))  # type: ignore[no-untyped-call]

    def add_markdown(self, text: str) -> None:
        """Add markdown cell."""
        self.cells.append(new_markdown_cell(text))  # type: ignore[no-untyped-call]

    def save(self, path: str) -> None:
        """Save notebook."""
        self.nb.cells = self.cells

        with open(path, "w") as f:
            nbf.write(self.nb, f)  # type: ignore[no-untyped-call]
