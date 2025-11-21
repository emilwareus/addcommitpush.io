"""Markdown templates for Obsidian notes."""

from pathlib import Path
from typing import Any

import yaml


def _frontmatter_block(data: dict[str, Any]) -> str:
    """Generate YAML frontmatter block."""
    yaml_str = yaml.dump(data, default_flow_style=False, sort_keys=False)
    return f"---\n{yaml_str}---\n\n"


def session_moc_template(
    session: Any,
    frontmatter: dict[str, Any],
    worker_links: list[str],
    insight_links: list[str],
    report_link: str,
    total_sources: int,
    sources_by_worker: dict[str, int],
) -> str:
    """Generate session MOC (Map of Content) markdown."""
    fm = _frontmatter_block(frontmatter)

    workers_section = "\n".join(worker_links) if worker_links else "No workers"
    insights_section = "\n".join(insight_links) if insight_links else "No insights extracted"

    sources_breakdown = "\n".join([
        f"- {wid}: {count} sources"
        for wid, count in sources_by_worker.items()
    ])

    dataview_query = """```dataview
LIST objective
FROM "workers/" AND [[{session_file}]]
WHERE type = "worker"
SORT created_at ASC
```"""

    return f"""{fm}# Research Session: {session.query}

## Query
> {session.query}

## Research Plan

Complexity: {session.complexity_score:.2f} ({len(worker_links)} workers)

### Workers
{workers_section}

## Compiled Reports

- {report_link} - Initial synthesis ({session.created_at})

## Key Insights

{insights_section}

## Sources

Total: {total_sources} sources across all workers

### By Worker
{sources_breakdown}

## Metadata

- **Session ID**: `{session.session_id}`
- **Version**: {session.version}
- **Status**: {session.status}
- **Model**: {session.model}
- **Total Cost**: ${session.cost:.4f}
- **Created**: {session.created_at}
- **Updated**: {session.updated_at}

## Workers (Dataview)

{dataview_query.replace('{session_file}', f'{session.session_id}_v{session.version}')}
"""


def worker_note_template(
    worker: Any,
    frontmatter: dict[str, Any],
    session_link: str,
) -> str:
    """Generate worker note markdown with full ReAct trace."""
    fm = _frontmatter_block(frontmatter)

    # Build ReAct trace
    react_trace = []
    for iteration in worker.react_iterations:
        react_trace.append(f"### Iteration {iteration.iteration}\n")
        react_trace.append(f"**Thought**: {iteration.thought}\n")

        if iteration.actions:
            react_trace.append("**Actions**:\n")
            for action in iteration.actions:
                react_trace.append(f"- `{action.tool_name}({action.arguments})`")
                if action.success:
                    react_trace.append(f"  - ✓ Success ({action.duration_seconds:.2f}s)")
                else:
                    react_trace.append(f"  - ✗ Failed ({action.duration_seconds:.2f}s)")
                react_trace.append("")

        if iteration.observation:
            react_trace.append(f"**Observation**:\n```\n{iteration.observation[:500]}{'...' if len(iteration.observation) > 500 else ''}\n```\n")

        react_trace.append("")

    react_section = "\n".join(react_trace)

    return f"""{fm}# Worker: {worker.objective}

**Session**: {session_link}
**Objective**: {worker.objective}

## Research Process (ReAct Loop)

{react_section}

## Final Output

{worker.final_output}

## Compressed Summary

*This is what gets passed to the synthesis step:*

{worker.compressed_summary}

## Metadata

- **Task ID**: `{worker.task_id}`
- **Worker ID**: `{worker.worker_id}`
- **Status**: {worker.status}
- **Duration**: {worker.duration_seconds:.2f}s
- **Tool Calls**: {len(worker.tool_calls)}
- **Cost**: ${worker.cost:.4f}
- **Sources**: {len(worker.sources)}
"""


def insight_note_template(
    insight: dict[str, Any],
    frontmatter: dict[str, Any],
    session_link: str,
    worker_link: str,
) -> str:
    """Generate insight note markdown (Zettelkasten style)."""
    fm = _frontmatter_block(frontmatter)

    return f"""{fm}# {insight['title']}

**Context**: {session_link} → {worker_link}

## Insight

{insight['finding']}

## Evidence

{insight.get('evidence', 'No evidence provided')}

## Implications

{insight.get('implications', 'No implications provided')}

## Related Insights

{insight.get('related_insights', 'None identified')}
"""


def source_note_template(
    url: str,
    page_content: str,
    frontmatter: dict[str, Any],
    worker_links: list[str],
) -> str:
    """Generate source page note markdown."""
    fm = _frontmatter_block(frontmatter)

    workers_section = "\n".join([f"- {link}" for link in worker_links])

    # Truncate content if too long
    max_content_len = 10000
    content_display = page_content
    if len(page_content) > max_content_len:
        content_display = page_content[:max_content_len] + "\n\n[Content truncated...]"

    return f"""{fm}# Source: {url}

## URL
{url}

## Accessed By Workers
{workers_section}

## Content

```
{content_display}
```
"""


def report_template(
    session: Any,
    frontmatter: dict[str, Any],
    session_link: str,
    worker_paths: dict[str, Path],
) -> str:
    """Generate compiled report markdown."""
    fm = _frontmatter_block(frontmatter)

    return f"""{fm}# Research Report: {session.query}

**Session**: {session_link}
**Generated**: {session.created_at}

---

{session.report}

---

## Research Metadata

- **Workers**: {len(session.workers)}
- **Sources**: {len(session.all_sources)}
- **Total Cost**: ${session.cost:.4f}
- **Model**: {session.model}
"""
