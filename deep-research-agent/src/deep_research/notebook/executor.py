"""Notebook executor - validates notebooks by running them."""

import os
import subprocess
from dataclasses import dataclass
from pathlib import Path

from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class NotebookExecutionResult:
    """Result of notebook execution."""

    success: bool
    notebook_path: str
    error_message: str | None = None
    cell_count: int = 0
    cells_executed: int = 0


class NotebookExecutor:
    """Execute notebooks to validate they work."""

    @staticmethod
    def execute(notebook_path: str | Path, timeout: int = 300) -> NotebookExecutionResult:
        """Execute notebook and validate all cells run successfully.

        Args:
            notebook_path: Path to the notebook file
            timeout: Maximum execution time in seconds (default: 5 minutes)

        Returns:
            NotebookExecutionResult with execution status
        """
        nb_path = Path(notebook_path)
        if not nb_path.exists():
            return NotebookExecutionResult(
                success=False,
                notebook_path=str(nb_path),
                error_message=f"Notebook not found: {nb_path}",
            )

        # Change to notebook directory for execution
        original_cwd = Path.cwd()
        nb_dir = nb_path.parent

        try:
            # Execute notebook using nbconvert
            # --to notebook --execute --inplace will run and update the notebook with outputs
            cmd = [
                "jupyter",
                "nbconvert",
                "--to",
                "notebook",
                "--execute",
                "--inplace",
                f"--ExecutePreprocessor.timeout={timeout}",
                str(nb_path.name),
            ]

            logger.info(f"Executing notebook: {nb_path}")
            logger.debug(f"Command: {' '.join(cmd)}")

            # Execute from notebook directory
            os.chdir(nb_dir)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            if result.returncode == 0:
                logger.info(f"✓ Notebook executed successfully: {nb_path.name}")
                return NotebookExecutionResult(
                    success=True,
                    notebook_path=str(nb_path),
                )
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"✗ Notebook execution failed: {error_msg}")
                return NotebookExecutionResult(
                    success=False,
                    notebook_path=str(nb_path),
                    error_message=error_msg,
                )

        except subprocess.TimeoutExpired:
            return NotebookExecutionResult(
                success=False,
                notebook_path=str(nb_path),
                error_message=f"Execution timeout after {timeout} seconds",
            )
        except Exception as e:
            logger.exception(f"Error executing notebook: {e}")
            return NotebookExecutionResult(
                success=False,
                notebook_path=str(nb_path),
                error_message=str(e),
            )
        finally:
            # Restore original directory
            os.chdir(original_cwd)


def execute_notebook(notebook_path: str | Path, timeout: int = 300) -> NotebookExecutionResult:
    """Convenience function to execute a notebook.

    Args:
        notebook_path: Path to the notebook
        timeout: Maximum execution time in seconds

    Returns:
        NotebookExecutionResult
    """
    return NotebookExecutor.execute(notebook_path, timeout)
