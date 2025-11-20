"""Tests for notebook builder."""

import tempfile
from pathlib import Path

import nbformat

from deep_research.notebook.builder import NotebookBuilder


def test_notebook_builder_initialization() -> None:
    """Test notebook builder can be initialized."""
    nb = NotebookBuilder("Test Notebook")
    assert nb.title == "Test Notebook"
    assert len(nb.cells) == 0


def test_add_act() -> None:
    """Test adding acts to notebook."""
    nb = NotebookBuilder("Test")
    nb.add_act("I", "This is Act I content")

    assert len(nb.cells) == 2  # Header + content
    assert "Act I: Set the Scene" in str(nb.cells[0])
    assert "This is Act I content" in str(nb.cells[1])


def test_add_code() -> None:
    """Test adding code cells."""
    nb = NotebookBuilder("Test")
    nb.add_code("print('hello world')")

    assert len(nb.cells) == 1
    assert nb.cells[0]["cell_type"] == "code"
    assert "print('hello world')" in nb.cells[0]["source"]


def test_add_markdown() -> None:
    """Test adding markdown cells."""
    nb = NotebookBuilder("Test")
    nb.add_markdown("# Heading")

    assert len(nb.cells) == 1
    assert nb.cells[0]["cell_type"] == "markdown"
    assert "# Heading" in nb.cells[0]["source"]


def test_save_notebook() -> None:
    """Test saving notebook to file."""
    nb = NotebookBuilder("Test Notebook")
    nb.add_act("I", "Context")
    nb.add_code("x = 1")
    nb.add_markdown("Analysis")

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "test.ipynb"
        nb.save(str(path))

        assert path.exists()

        # Verify it's valid nbformat
        loaded_nb = nbformat.read(str(path), as_version=4)
        assert len(loaded_nb.cells) == 4  # Header, context, code, markdown


def test_all_acts() -> None:
    """Test all 7 acts can be added."""
    nb = NotebookBuilder("Complete Notebook")

    for act in ["I", "II", "III", "IV", "V", "VI", "VII"]:
        nb.add_act(act)

    # 7 acts = 7 cells (headers only, no additional content)
    assert len(nb.cells) == 7
