"""Load research sessions from Obsidian vault."""

from pathlib import Path
from typing import Any
import yaml

from deep_research.agent.state import ResearchSession, WorkerFullContext, ReActIteration, ToolCall
from deep_research.utils.logger import get_logger

logger = get_logger(__name__)


class SessionLoader:
    """Load sessions from Obsidian vault."""

    def __init__(self, vault_path: str = "outputs/obsidian") -> None:
        self.vault_path = Path(vault_path)

    def load_session(self, session_id: str, version: int = 1) -> ResearchSession:
        """Load session from Obsidian vault.

        Args:
            session_id: Session ID (e.g., "session_20250120_142530_abc123")
            version: Session version (ignored in new structure, kept for compatibility)

        Returns:
            ResearchSession object with full context
        """
        session_file = self.vault_path / session_id / "session.md"

        if not session_file.exists():
            raise FileNotFoundError(f"Session not found: {session_file}")

        # Parse session MOC
        content = session_file.read_text()
        frontmatter, body = self._parse_frontmatter(content)

        # Build session object
        session = ResearchSession(
            session_id=frontmatter["session_id"],
            version=frontmatter["version"],
            parent_session_id=frontmatter.get("parent_session"),
            query=frontmatter["query"],
            complexity_score=frontmatter["complexity"],
            status=frontmatter["status"],
            created_at=frontmatter["created_at"],
            updated_at=frontmatter["updated_at"],
            model=frontmatter["model"],
            cost=frontmatter["total_cost"],
        )

        # Load workers
        session.workers = self._load_workers(session_id)

        # Load insights (from frontmatter references or separate files)
        session.insights = self._load_insights(session_id, version)

        # Extract report path from body
        # (parse wikilink to report, load report content)
        session.report = self._load_report(session_id, version)

        # Aggregate sources
        session.all_sources = self._aggregate_sources(session.workers)

        return session

    def _load_workers(self, session_id: str) -> list[WorkerFullContext]:
        """Load all workers for a session."""
        workers_dir = self.vault_path / session_id / "workers"

        if not workers_dir.exists():
            return []

        workers = []
        for worker_file in sorted(workers_dir.glob("task_*_worker.md")):
            worker = self._load_worker_from_file(worker_file)
            workers.append(worker)

        return workers

    def _load_worker_from_file(self, file_path: Path) -> WorkerFullContext:
        """Load worker from markdown file."""
        content = file_path.read_text()
        frontmatter, body = self._parse_frontmatter(content)

        # Parse ReAct trace from body
        react_iterations = self._parse_react_trace(body)
        tool_calls = [
            tool_call
            for iteration in react_iterations
            for tool_call in iteration.actions
        ]

        # Extract sections from body
        sections = self._split_sections(body)
        final_output = sections.get("Final Output", "")
        compressed_summary = sections.get("Compressed Summary", "")

        worker = WorkerFullContext(
            task_id=frontmatter["task_id"],
            worker_id=frontmatter["worker_id"],
            objective=frontmatter["objective"],
            tools_available=[],  # Not stored in frontmatter
            expected_output="",  # Not stored in frontmatter
            react_iterations=react_iterations,
            tool_calls=tool_calls,
            final_output=final_output.strip(),
            compressed_summary=compressed_summary.strip(),
            sources=[],  # Will be populated from tool calls
            status=frontmatter["status"],
            started_at=frontmatter["created_at"],
            completed_at=frontmatter.get("completed_at"),
            duration_seconds=frontmatter.get("duration_seconds", 0.0),
            cost=frontmatter.get("cost", 0.0),
            model="",  # Not stored in worker frontmatter
        )

        # Extract sources from tool calls
        worker.sources = [
            tc.arguments.get("url", "")
            for tc in tool_calls
            if tc.tool_name == "fetch" and tc.success
        ]

        return worker

    def _parse_frontmatter(self, content: str) -> tuple[dict[str, Any], str]:
        """Parse YAML frontmatter from markdown."""
        if not content.startswith("---"):
            return {}, content

        parts = content.split("---", 2)
        if len(parts) < 3:
            return {}, content

        frontmatter_str = parts[1].strip()
        body = parts[2].strip()

        frontmatter = yaml.safe_load(frontmatter_str)

        return frontmatter, body

    def _parse_react_trace(self, body: str) -> list[ReActIteration]:
        """Parse ReAct iterations from markdown body."""
        iterations = []

        # Split by iteration headers
        sections = body.split("### Iteration ")

        for section in sections[1:]:  # Skip first empty split
            lines = section.split("\n")

            # Extract iteration number
            iteration_num = int(lines[0].strip())

            # Extract thought, actions, observation
            thought = ""
            actions = []
            observation = ""

            current_section = None
            current_text = []

            for line in lines[1:]:
                if line.startswith("**Thought**:"):
                    current_section = "thought"
                    thought = line.replace("**Thought**:", "").strip()
                elif line.startswith("**Actions**:"):
                    current_section = "actions"
                elif line.startswith("**Observation**:"):
                    current_section = "observation"
                elif current_section == "actions" and line.startswith("- `"):
                    # Parse tool call
                    # Format: - `tool_name(args)`
                    tool_str = line.strip("- `").split("(", 1)[0]
                    # Simplified parsing - full implementation would parse args
                    actions.append(ToolCall(
                        tool_name=tool_str,
                        arguments={},
                        result="",
                        success=True,
                        duration_seconds=0.0,
                        timestamp="",
                        iteration=iteration_num,
                    ))
                elif current_section == "observation":
                    current_text.append(line)

            if current_section == "observation":
                observation = "\n".join(current_text).strip()
                # Remove markdown code blocks
                if observation.startswith("```"):
                    observation = observation.split("```", 2)[1].strip()

            iterations.append(ReActIteration(
                iteration=iteration_num,
                thought=thought,
                actions=actions,
                observation=observation,
                timestamp="",  # Not stored in markdown
            ))

        return iterations

    def _split_sections(self, body: str) -> dict[str, str]:
        """Split markdown body into sections by headers."""
        sections = {}
        current_section = None
        current_lines: list[str] = []

        for line in body.split("\n"):
            if line.startswith("## "):
                # Save previous section
                if current_section:
                    sections[current_section] = "\n".join(current_lines).strip()
                # Start new section
                current_section = line[3:].strip()
                current_lines = []
            else:
                current_lines.append(line)

        # Save last section
        if current_section:
            sections[current_section] = "\n".join(current_lines).strip()

        return sections

    def _load_insights(self, session_id: str, version: int) -> list[dict[str, Any]]:
        """Load insights for session."""
        # Simplified: return empty list
        # Full implementation would parse insight files referenced in session MOC
        return []

    def _load_report(self, session_id: str, version: int) -> str:
        """Load report content."""
        report_file = self.vault_path / session_id / "reports" / f"report_v{version}.md"

        if not report_file.exists():
            return ""

        content = report_file.read_text()
        _, body = self._parse_frontmatter(content)

        # Extract report content (everything after metadata section)
        sections = self._split_sections(body)

        # Return main content (everything except "Research Metadata")
        main_content = []
        for line in body.split("\n"):
            if line.strip() == "## Research Metadata":
                break
            main_content.append(line)

        return "\n".join(main_content).strip()

    def _aggregate_sources(self, workers: list[WorkerFullContext]) -> list[str]:
        """Aggregate unique sources from all workers."""
        sources = set()
        for worker in workers:
            sources.update(worker.sources)
        return sorted(list(sources))

    def list_sessions(self) -> list[dict[str, Any]]:
        """List all sessions in vault.

        Returns:
            List of dicts with session metadata
        """
        if not self.vault_path.exists():
            return []

        sessions = []
        # Each session is now a directory with session.md inside
        for session_dir in sorted(self.vault_path.glob("session_*")):
            if not session_dir.is_dir():
                continue

            session_file = session_dir / "session.md"
            if not session_file.exists():
                continue

            content = session_file.read_text()
            frontmatter, _ = self._parse_frontmatter(content)

            sessions.append({
                "session_id": frontmatter["session_id"],
                "version": frontmatter["version"],
                "query": frontmatter["query"],
                "status": frontmatter["status"],
                "created_at": frontmatter["created_at"],
                "num_workers": frontmatter["num_workers"],
                "total_cost": frontmatter["total_cost"],
            })

        return sessions
