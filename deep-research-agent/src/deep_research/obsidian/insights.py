"""Auto-extract insights from worker outputs using LLM."""

import json
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from deep_research.agent.state import ResearchSession
from deep_research.llm.client import get_llm
from deep_research.utils.logger import get_logger

logger = get_logger(__name__)


INSIGHT_EXTRACTION_PROMPT = """You are an expert research analyst. Extract key insights from the worker's research output.

For each insight, provide:
1. **Title**: Short, descriptive title (max 60 chars)
2. **Finding**: The core insight or discovery (2-3 sentences)
3. **Evidence**: Supporting evidence from the research (1-2 sentences, cite specifics)
4. **Implications**: What this means or why it matters (1-2 sentences)
5. **Confidence**: high, medium, or low
6. **Tags**: 3-5 relevant keywords

Return a JSON array of insights. Extract 2-4 key insights per worker output.

Example:
```json
[
  {{
    "title": "Foundation models reaching 10T parameters",
    "finding": "Foundation models are now reaching 10 trillion parameters through mixture-of-experts (MoE) architectures, while maintaining computational efficiency by activating only sparse subsets during inference.",
    "evidence": "MoE architectures enable 10T+ parameter models while maintaining inference costs comparable to dense 1T models (Source: ArXiv Scaling Laws Update 2024).",
    "implications": "This enables unprecedented model capacity without proportional cost increases, making large-scale models more accessible for research and production use.",
    "confidence": "high",
    "tags": ["scaling-laws", "mixture-of-experts", "model-architecture", "efficiency"]
  }}
]
```

Worker Output:
{worker_output}
"""


async def extract_insights(session: ResearchSession) -> list[dict[str, Any]]:
    """Extract insights from all workers in session.

    Returns:
        List of insight dictionaries with metadata
    """
    all_insights = []

    llm = get_llm(model="anthropic/claude-3.5-sonnet")

    for worker in session.workers:
        if worker.status != "completed" or not worker.final_output:
            continue

        try:
            # Build prompt
            messages = [
                SystemMessage(content="You are an expert research analyst."),
                HumanMessage(
                    content=INSIGHT_EXTRACTION_PROMPT.format(
                        worker_output=worker.final_output
                    )
                ),
            ]

            # Extract insights
            response = await llm.ainvoke(messages)
            content = response.content

            # Convert content to string if it's a list (some models return list of content blocks)
            if isinstance(content, list):
                content_str = " ".join(str(item) for item in content)
            else:
                content_str = str(content)

            # Parse JSON (extract from markdown code block if present)
            if "```json" in content_str:
                json_str = content_str.split("```json")[1].split("```")[0].strip()
            elif "```" in content_str:
                json_str = content_str.split("```")[1].split("```")[0].strip()
            else:
                json_str = content_str.strip()

            insights = json.loads(json_str)

            # Add metadata
            for insight in insights:
                insight["worker_id"] = worker.worker_id
                insight["created_at"] = datetime.now().isoformat()
                insight["source_session"] = session.session_id

            all_insights.extend(insights)

            logger.info(
                "insights_extracted",
                worker_id=worker.worker_id,
                count=len(insights),
            )

        except Exception as e:
            logger.error(
                "insight_extraction_failed",
                worker_id=worker.worker_id,
                error=str(e),
            )
            # Continue with other workers

    return all_insights
