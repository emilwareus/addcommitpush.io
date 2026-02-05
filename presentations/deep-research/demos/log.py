"""
Shared logging helpers for demo agents.

Provides clear, structured console output so a live audience
can follow what each agent is doing step-by-step.
"""

import textwrap
import threading
import time
from contextlib import contextmanager

# ANSI colors
DIM = "\033[2m"
BOLD = "\033[1m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
MAGENTA = "\033[35m"
BLUE = "\033[34m"
RESET = "\033[0m"


# ── Cost tracking ──────────────────────────────────────────────────────
# Thread-safe accumulator for OpenRouter costs.

_cost_lock = threading.Lock()
_total_cost: float = 0.0
_total_calls: int = 0


def track_cost(response_metadata: dict) -> float:
    """Extract and accumulate cost from an OpenRouter response.

    OpenRouter returns cost in response_metadata["token_usage"]["cost"].
    Returns the cost for this call.
    """
    global _total_cost, _total_calls

    cost = 0.0

    # OpenRouter puts cost inside token_usage
    token_usage = response_metadata.get("token_usage", {})
    if isinstance(token_usage, dict):
        cost = token_usage.get("cost", 0.0) or 0.0

    with _cost_lock:
        _total_cost += cost
        _total_calls += 1

    return cost


def get_total_cost() -> tuple[float, int]:
    """Return (total_cost, total_calls)."""
    with _cost_lock:
        return _total_cost, _total_calls


def reset_cost() -> None:
    """Reset cost tracking for a new run."""
    global _total_cost, _total_calls
    with _cost_lock:
        _total_cost = 0.0
        _total_calls = 0


# ── Display helpers ────────────────────────────────────────────────────


def header(agent_name: str, query: str) -> None:
    """Print the agent run header."""
    reset_cost()
    print(f"\n{BOLD}{'=' * 64}{RESET}")
    print(f"{BOLD}  {agent_name}{RESET}")
    print(f"  Query: {DIM}{query}{RESET}")
    print(f"{BOLD}{'=' * 64}{RESET}\n")


def phase(label: str) -> None:
    """Print a major phase separator."""
    print(f"\n{BOLD}{CYAN}--- {label} ---{RESET}\n")


def step(icon: str, msg: str) -> None:
    """Print a single step within a phase."""
    print(f"  {icon}  {msg}")


def detail(msg: str) -> None:
    """Print an indented detail line."""
    print(f"      {DIM}{msg}{RESET}")


def thinking(msg: str) -> None:
    """Print a 'thinking' indicator."""
    print(f"  {YELLOW}?{RESET}  {msg}")


def success(msg: str) -> None:
    """Print a success indicator."""
    print(f"  {GREEN}+{RESET}  {msg}")


def search(query: str) -> None:
    """Log a search operation."""
    print(f"  {MAGENTA}>{RESET}  Searching: {DIM}{query[:80]}{RESET}")


def result(label: str, content: str, max_len: int = 120) -> None:
    """Print a result summary, truncated."""
    truncated = content.replace("\n", " ")[:max_len]
    if len(content) > max_len:
        truncated += "..."
    print(f"  {GREEN}={RESET}  {label}: {truncated}")


def divider() -> None:
    """Print a light divider."""
    print(f"  {DIM}{'- ' * 30}{RESET}")


@contextmanager
def timed(_label: str = ""):
    """Context manager that prints elapsed time for a block."""
    start = time.time()
    yield
    elapsed = time.time() - start
    print(f"      {DIM}({elapsed:.1f}s){RESET}")


def conversation(role: str, analyst_name: str, content: str, width: int = 72) -> None:
    """Print a conversation message in a chat-bubble style."""
    if role == "WikiWriter":
        color = YELLOW
        label = f"{analyst_name} (WikiWriter)"
    else:
        color = GREEN
        label = f"TopicExpert -> {analyst_name}"

    print(f"      {color}{BOLD}{label}{RESET}")
    # Wrap the content to fit nicely in the terminal
    wrapped = textwrap.fill(content, width=width, initial_indent="      ", subsequent_indent="      ")
    print(f"{DIM}{wrapped}{RESET}")
    print()


def final_report_header() -> None:
    """Print the final report separator."""
    total_cost, total_calls = get_total_cost()
    print(f"\n{BOLD}{'=' * 64}{RESET}")
    print(f"{BOLD}  FINAL REPORT{RESET}")
    print(f"  {DIM}Total cost: ${total_cost:.4f} across {total_calls} LLM calls{RESET}")
    print(f"{BOLD}{'=' * 64}{RESET}\n")
