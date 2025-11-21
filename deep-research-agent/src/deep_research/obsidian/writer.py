"""Obsidian vault writer for research sessions."""

import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any

from deep_research.agent.state import ResearchSession, WorkerFullContext
from deep_research.obsidian.insights import extract_insights
from deep_research.obsidian.templates import (
    insight_note_template,
    report_template,
    session_moc_template,
    source_note_template,
    worker_note_template,
)


class ObsidianWriter:
    """Write research sessions to Obsidian vault."""

    def __init__(self, vault_path: str = "outputs/obsidian") -> None:
        self.vault_path = Path(vault_path)
        # Create base vault directory
        self.vault_path.mkdir(parents=True, exist_ok=True)

    def _ensure_session_structure(self, session_id: str) -> Path:
        """Create session-specific directory structure.

        Each session gets its own folder with subdirectories:
        outputs/obsidian/session_abc123/
            ├── session.md (MOC)
            ├── workers/
            ├── insights/
            ├── sources/
            └── reports/
        """
        session_dir = self.vault_path / session_id
        dirs = [
            session_dir,
            session_dir / "workers",
            session_dir / "insights",
            session_dir / "sources",
            session_dir / "reports",
        ]
        for dir_path in dirs:
            dir_path.mkdir(parents=True, exist_ok=True)

        return session_dir

    async def write_session(self, session: ResearchSession) -> Path:
        """Write complete session to Obsidian vault.

        Returns:
            Path to session MOC file
        """
        # Ensure session directory structure exists
        session_dir = self._ensure_session_structure(session.session_id)

        # Extract insights from workers (auto-extract with LLM)
        session.insights = await extract_insights(session)

        # Write components
        worker_paths = await self._write_workers(session, session_dir)
        insight_paths = await self._write_insights(session, session_dir)
        source_paths = await self._write_sources(session, session_dir)
        report_path = await self._write_report(session, session_dir, worker_paths)

        # Write session MOC (Map of Content)
        session_path = await self._write_session_moc(
            session, session_dir, worker_paths, insight_paths, source_paths, report_path
        )

        # Update session with file path
        session.session_file_path = str(session_path)

        return session_path

    async def _write_session_moc(
        self,
        session: ResearchSession,
        session_dir: Path,
        worker_paths: dict[str, Path],
        insight_paths: list[Path],
        source_paths: dict[str, Path],
        report_path: Path,
    ) -> Path:
        """Write session MOC (Map of Content)."""
        file_path = session_dir / "session.md"

        # Build frontmatter
        frontmatter = {
            "type": "research_session",
            "session_id": session.session_id,
            "version": session.version,
            "query": session.query,
            "status": session.status,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "model": session.model,
            "complexity": session.complexity_score,
            "num_workers": len(session.workers),
            "total_cost": session.cost,
            "parent_session": session.parent_session_id,
            "tags": self._generate_tags(session.query),
        }

        # Build worker links with relative paths
        worker_links = []
        for i, worker in enumerate(session.workers, 1):
            worker_links.append(
                f"{i}. [[workers/{worker.task_id}_worker|Worker {i}]]: {worker.objective}"
            )

        # Build insight links with relative paths
        insight_links = [
            f"- [[insights/insight_{i+1}|{self._extract_insight_title(session, i)}]]"
            for i in range(len(insight_paths))
        ]

        # Build source summary
        total_sources = len(source_paths)
        sources_by_worker = {}
        for worker in session.workers:
            sources_by_worker[worker.worker_id] = len(worker.sources)

        # Generate content
        content = session_moc_template(
            session=session,
            frontmatter=frontmatter,
            worker_links=worker_links,
            insight_links=insight_links,
            report_link=f"[[reports/report_v{session.version}|Report v{session.version}]]",
            total_sources=total_sources,
            sources_by_worker=sources_by_worker,
        )

        file_path.write_text(content)
        return file_path

    async def _write_workers(
        self, session: ResearchSession, session_dir: Path
    ) -> dict[str, Path]:
        """Write all worker notes with full context.

        Returns:
            Dict mapping worker_id to file path
        """
        worker_paths = {}
        worker_dir = session_dir / "workers"

        for worker in session.workers:
            filename = f"{worker.task_id}_worker.md"
            file_path = worker_dir / filename

            # Build frontmatter
            frontmatter = {
                "type": "worker",
                "session_id": session.session_id,
                "session": "[[../session|Session]]",
                "task_id": worker.task_id,
                "worker_id": worker.worker_id,
                "objective": worker.objective,
                "status": worker.status,
                "created_at": worker.started_at,
                "completed_at": worker.completed_at,
                "duration_seconds": worker.duration_seconds,
                "tool_calls": len(worker.tool_calls),
                "cost": worker.cost,
                "tags": self._generate_worker_tags(worker),
            }

            # Generate content
            content = worker_note_template(
                worker=worker,
                frontmatter=frontmatter,
                session_link="[[../session|Session]]",
            )

            file_path.write_text(content)
            worker_paths[worker.worker_id] = file_path

        return worker_paths

    async def _write_insights(
        self, session: ResearchSession, session_dir: Path
    ) -> list[Path]:
        """Write all insights (auto-extracted).

        Returns:
            List of insight file paths
        """
        insight_paths = []
        insights_dir = session_dir / "insights"

        for i, insight in enumerate(session.insights, 1):
            # Use simple sequential naming within session
            filename = f"insight_{i}.md"
            file_path = insights_dir / filename

            # Build frontmatter
            frontmatter = {
                "type": "insight",
                "insight_number": i,
                "created_at": insight.get("created_at", datetime.now().isoformat()),
                "source_session": "[[../session|Session]]",
                "source_worker": f"[[../workers/{insight.get('worker_id', 'unknown')}_worker|Worker]]",
                "confidence": insight.get("confidence", "medium"),
                "tags": insight.get("tags", []),
            }

            # Generate content
            content = insight_note_template(
                insight=insight,
                frontmatter=frontmatter,
                session_link="[[../session|Session]]",
                worker_link=f"[[../workers/{insight.get('worker_id', 'unknown')}_worker|Worker]]",
            )

            file_path.write_text(content)
            insight_paths.append(file_path)

        return insight_paths

    async def _write_sources(
        self, session: ResearchSession, session_dir: Path
    ) -> dict[str, Path]:
        """Write all source pages (deduplicated by URL hash).

        Returns:
            Dict mapping URL hash to file path
        """
        source_paths = {}
        sources_dir = session_dir / "sources"

        # Collect unique sources across all workers
        url_to_content: dict[str, dict[str, Any]] = {}

        for worker in session.workers:
            for url in worker.sources:
                if url not in url_to_content:
                    # Extract content from tool calls
                    content = self._extract_source_content(worker, url)
                    url_to_content[url] = {
                        "url": url,
                        "content": content,
                        "accessed_by": [worker.worker_id],
                        "first_accessed": worker.started_at,
                    }
                else:
                    # Update access tracking
                    url_to_content[url]["accessed_by"].append(worker.worker_id)

        # Write deduplicated sources
        for url, data in url_to_content.items():
            url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
            filename = f"source_{url_hash}.md"
            file_path = sources_dir / filename

            # Build frontmatter
            frontmatter = {
                "type": "source",
                "url": url,
                "url_hash": url_hash,
                "first_accessed": data["first_accessed"],
                "accessed_by_workers": data["accessed_by"],
                "access_count": len(data["accessed_by"]),
            }

            # Generate content
            content = source_note_template(
                url=url,
                page_content=data["content"],
                frontmatter=frontmatter,
                worker_links=[
                    f"[[../workers/{wid}_worker|{wid}]]" for wid in data["accessed_by"]
                ],
            )

            file_path.write_text(content)
            source_paths[url_hash] = file_path

        return source_paths

    async def _write_report(
        self, session: ResearchSession, session_dir: Path, worker_paths: dict[str, Path]
    ) -> Path:
        """Write compiled report with Dataview queries."""
        reports_dir = session_dir / "reports"
        filename = f"report_v{session.version}.md"
        file_path = reports_dir / filename

        # Build frontmatter
        frontmatter = {
            "type": "report",
            "session_id": session.session_id,
            "version": session.version,
            "query": session.query,
            "created_at": session.created_at,
            "num_workers": len(session.workers),
            "total_sources": len(session.all_sources),
            "total_cost": session.cost,
        }

        # Generate content
        content = report_template(
            session=session,
            frontmatter=frontmatter,
            session_link=f"[[{session.session_id}_v{session.version}]]",
            worker_paths=worker_paths,
        )

        file_path.write_text(content)
        return file_path

    def _generate_tags(self, query: str) -> list[str]:
        """Generate tags from query (simple keyword extraction)."""
        # Simple implementation: lowercase words longer than 3 chars
        words = query.lower().split()
        tags = [w.strip("?.,!") for w in words if len(w) > 3]
        return tags[:5]  # Max 5 tags

    def _generate_worker_tags(self, worker: WorkerFullContext) -> list[str]:
        """Generate tags from worker objective."""
        return self._generate_tags(worker.objective)

    def _extract_insight_title(self, session: ResearchSession, index: int) -> str:
        """Extract short title from insight."""
        if index < len(session.insights):
            finding = session.insights[index].get("finding", "")
            # First sentence or first 50 chars
            title = finding.split(".")[0][:50]
            return title if title else f"Insight {index + 1}"
        return f"Insight {index + 1}"

    def _extract_source_content(
        self, worker: WorkerFullContext, url: str
    ) -> str:
        """Extract full page content from worker tool calls."""
        for tool_call in worker.tool_calls:
            if (tool_call.tool_name == "fetch"
                and tool_call.arguments.get("url") == url
                and tool_call.success):
                return tool_call.result
        return ""
