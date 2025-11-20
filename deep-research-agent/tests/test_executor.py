"""Tests for code executor."""

import pytest

from deep_research.tools.executor import CodeExecutor


@pytest.fixture
def executor() -> CodeExecutor:
    """Create a code executor instance."""
    exec_instance = CodeExecutor()
    yield exec_instance
    exec_instance.shutdown()


def test_executor_initialization(executor: CodeExecutor) -> None:
    """Test executor can be initialized."""
    assert executor.km is not None
    assert executor.kc is not None


def test_safety_check_valid_code(executor: CodeExecutor) -> None:
    """Test safety check passes for valid code."""
    safe, msg = executor.is_safe("x = 1 + 2")
    assert safe is True
    assert msg == "OK"


def test_safety_check_blocks_eval(executor: CodeExecutor) -> None:
    """Test safety check blocks eval."""
    safe, msg = executor.is_safe("eval('1 + 1')")
    assert safe is False
    assert "eval" in msg


def test_safety_check_blocks_exec(executor: CodeExecutor) -> None:
    """Test safety check blocks exec."""
    safe, msg = executor.is_safe("exec('print(1)')")
    assert safe is False
    assert "exec" in msg


def test_safety_check_blocks_compile(executor: CodeExecutor) -> None:
    """Test safety check blocks compile."""
    safe, msg = executor.is_safe("compile('x=1', '<string>', 'exec')")
    assert safe is False
    assert "compile" in msg


def test_safety_check_blocks_import(executor: CodeExecutor) -> None:
    """Test safety check blocks __import__."""
    safe, msg = executor.is_safe("__import__('os')")
    assert safe is False
    assert "__import__" in msg


def test_safety_check_syntax_error(executor: CodeExecutor) -> None:
    """Test safety check catches syntax errors."""
    safe, msg = executor.is_safe("def invalid syntax")
    assert safe is False
    assert "Syntax error" in msg


def test_execute_simple_code(executor: CodeExecutor) -> None:
    """Test executing simple valid code."""
    result = executor.execute("print('hello')")
    assert result.success is True
    assert "hello" in result.stdout
    assert result.error is None


def test_execute_unsafe_code(executor: CodeExecutor) -> None:
    """Test executing unsafe code is blocked."""
    result = executor.execute("eval('1+1')")
    assert result.success is False
    assert "SafetyError" in str(result.error)


def test_execute_with_output(executor: CodeExecutor) -> None:
    """Test code execution captures output."""
    code = """
x = 5
y = 10
print(f"Sum: {x + y}")
"""
    result = executor.execute(code)
    assert result.success is True
    assert "Sum: 15" in result.stdout


def test_execute_with_error(executor: CodeExecutor) -> None:
    """Test code execution handles runtime errors."""
    result = executor.execute("1 / 0")
    assert result.success is False
    assert result.error is not None
    assert "ZeroDivisionError" in str(result.error.get("ename", ""))
