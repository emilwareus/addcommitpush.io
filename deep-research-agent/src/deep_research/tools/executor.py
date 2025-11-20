"""Safe code execution in Jupyter kernel."""

import ast
import queue
from dataclasses import dataclass
from typing import Any

from jupyter_client import KernelManager  # type: ignore[attr-defined]

from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ExecutionResult:
    """Code execution result."""

    success: bool
    stdout: str
    stderr: str
    display_data: list[Any]
    error: dict[str, Any] | None


class CodeExecutor:
    """Safe Jupyter kernel executor."""

    def __init__(self) -> None:
        self.km = KernelManager()
        self.km.start_kernel()
        self.kc = self.km.client()
        self.kc.start_channels()
        self.kc.wait_for_ready(timeout=60)

    def is_safe(self, code: str) -> tuple[bool, str]:
        """AST-based safety check."""
        try:
            tree = ast.parse(code)

            # Check for dangerous operations
            dangerous = ["eval", "exec", "compile", "__import__"]
            for node in ast.walk(tree):
                if isinstance(node, ast.Name) and node.id in dangerous:
                    return False, f"Unsafe operation: {node.id}"

            return True, "OK"
        except SyntaxError as e:
            return False, f"Syntax error: {e}"

    def execute(self, code: str, timeout: int = 30) -> ExecutionResult:
        """Execute code in kernel."""
        safe, error_msg = self.is_safe(code)
        if not safe:
            return ExecutionResult(
                success=False,
                stdout="",
                stderr=error_msg,
                display_data=[],
                error={"ename": "SafetyError", "evalue": error_msg, "traceback": []},
            )

        self.kc.execute(code)
        outputs: dict[str, Any] = {"stdout": [], "stderr": [], "display_data": [], "error": None}

        # Collect outputs
        while True:
            try:
                jupyter_msg: dict[str, Any] = self.kc.get_iopub_msg(timeout=timeout)
                msg_type: Any = jupyter_msg.get("msg_type")
                content: Any = jupyter_msg.get("content")

                if msg_type == "stream" and isinstance(content, dict):
                    stream_name = content.get("name")
                    stream_text = content.get("text")
                    if stream_name and stream_text:
                        outputs[stream_name].append(stream_text)
                elif msg_type in ("display_data", "execute_result") and isinstance(content, dict):
                    data = content.get("data")
                    if data:
                        outputs["display_data"].append(data)
                elif msg_type == "error" and isinstance(content, dict):
                    outputs["error"] = {
                        "ename": content.get("ename", ""),
                        "evalue": content.get("evalue", ""),
                        "traceback": content.get("traceback", []),
                    }
                elif (
                    msg_type == "status"
                    and isinstance(content, dict)
                    and content.get("execution_state") == "idle"
                ):
                    break
            except queue.Empty:
                break

        return ExecutionResult(
            success=outputs["error"] is None,
            stdout="".join(outputs["stdout"]),
            stderr="".join(outputs["stderr"]),
            display_data=outputs["display_data"],
            error=outputs["error"],
        )

    def shutdown(self) -> None:
        """Shutdown kernel."""
        self.kc.stop_channels()
        self.km.shutdown_kernel()
