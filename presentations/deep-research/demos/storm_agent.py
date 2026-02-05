"""
STORM Agent — Faithful reimplementation of Stanford STORM (2024)
=================================================================

Reference: https://github.com/stanford-oval/storm
Paper: "Assisting in Writing Wikipedia-like Articles From Scratch
        with Large Language Models" (Shao et al., 2024)

STORM = Synthesis of Topic Outlines through Retrieval and Multi-perspective
question asking. The core insight: Wikipedia articles are comprehensive because
they synthesize MULTIPLE expert viewpoints. STORM simulates this by:

1. Discovering what perspectives are needed (via related topic structure)
2. Running multi-turn conversations between WikiWriter personas and a
   search-grounded TopicExpert
3. Building an outline in two stages (draft from knowledge, refine with data)
4. Writing the article per-section with inline citations
5. Adding a lead section and polishing

Architecture (matches reference):
    START → discover_perspectives → conduct_interviews (×N parallel via Send)
          → generate_outline (2-stage) → write_sections (per-section parallel)
          → write_lead_section → END

Key architectural decisions from the reference:
- Perspectives are generated from RELATED TOPIC STRUCTURE, not hallucinated
- TopicExpert generates search queries FIRST, then searches, then answers
- Outline is drafted from LLM knowledge, THEN refined with conversation data
- Article is written PER-SECTION, not as one giant prompt
- Lead section is written AFTER the body (so it reflects actual content)
- The pipeline is LINEAR — no backtracking, each phase runs exactly once
"""

import operator
import os
from typing import Annotated, Literal

from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send
from pydantic import BaseModel, Field
from tavily import TavilyClient
from typing_extensions import TypedDict

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  LLM + SEARCH CONFIGURATION                                         ║
# ║                                                                      ║
# ║  Reference uses 5 separate models (conv, question, outline,          ║
# ║  article, polish). We use one fast model for demo speed.             ║
# ║  Reference supports many search backends; we use Tavily directly.    ║
# ╚══════════════════════════════════════════════════════════════════════╝

llm = ChatOpenAI(
    model="openai/gpt-oss-120b",
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    temperature=0,
    extra_body={"provider": {"order": ["Groq"]}},
)

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

# ── Configuration matching reference defaults ──
MAX_PERSPECTIVES = 3       # Reference default: 3 (plus 1 default "Basic fact writer")
MAX_CONV_TURNS = 3         # Reference default: 3 turns per conversation
MAX_SEARCH_QUERIES = 3     # Reference default: 3 queries per expert answer
SEARCH_TOP_K = 3           # Reference default: 3 results per query


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PYDANTIC MODELS — STRUCTURED OUTPUT                                 ║
# ║                                                                      ║
# ║  Reference uses DSPy signatures. We use Pydantic with               ║
# ║  with_structured_output() for the same typed extraction.             ║
# ╚══════════════════════════════════════════════════════════════════════╝


class Analyst(BaseModel):
    """One expert perspective/persona for researching the topic."""
    name: str = Field(description="Short summary of the editor persona")
    description: str = Field(description="Detailed description of their expertise and angle")


class Perspectives(BaseModel):
    """Generated expert perspectives based on related topic analysis."""
    analysts: list[Analyst] = Field(
        description="Expert personas, each representing a different perspective"
    )


class SearchQueries(BaseModel):
    """Search queries generated from a conversation question."""
    queries: list[str] = Field(
        description="1-3 search queries to find information for answering the question"
    )


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  STATE DEFINITIONS                                                   ║
# ║                                                                      ║
# ║  STORMState: main pipeline state                                     ║
# ║  InterviewState: per-conversation state for WikiWriter ↔ TopicExpert ║
# ║                                                                      ║
# ║  interview_results uses operator.add — when parallel interviews      ║
# ║  complete via Send(), their results get CONCATENATED, not replaced.  ║
# ╚══════════════════════════════════════════════════════════════════════╝


class InterviewState(TypedDict):
    """State for a single WikiWriter ↔ TopicExpert conversation."""
    messages: Annotated[list, operator.add]   # Conversation history
    analyst: dict                              # The Analyst persona driving this interview
    topic: str                                 # The research topic
    max_turns: int                             # Q&A rounds (default 3)
    turn_count: int                            # Current turn number
    references: Annotated[list[str], operator.add]  # URLs found during interview
    info_snippets: Annotated[list[str], operator.add]  # Collected [idx]: snippet pairs
    summary: str                               # Compiled summary


class STORMState(TypedDict):
    """Main pipeline state flowing through all STORM phases."""
    topic: str
    analysts: list[dict]                                               # Generated perspectives
    interview_results: Annotated[list[str], operator.add]              # Summaries from interviews
    collected_info: Annotated[list[str], operator.add]                 # All [idx]: snippet pairs
    collected_urls: Annotated[list[str], operator.add]                 # All source URLs
    outline: str                                                       # Generated outline
    section_texts: Annotated[list[str], operator.add]                  # Per-section written text
    final_report: str                                                  # Assembled report


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 1: DISCOVER PERSPECTIVES                                      ║
# ║                                                                      ║
# ║  Reference: persona_generator.py                                     ║
# ║  The reference finds related Wikipedia topics, fetches their TOCs,   ║
# ║  and uses those structural outlines to generate diverse personas.    ║
# ║  We approximate this by searching for the topic and using results    ║
# ║  as context, plus always prepending a "Basic fact writer" persona.   ║
# ╚══════════════════════════════════════════════════════════════════════╝


# ── Reference prompt (GenPersona signature) ──
PERSPECTIVE_PROMPT = """You need to select a group of Wikipedia editors who will work together \
to create a comprehensive article on the topic. Each of them represents a different perspective, \
role, or affiliation related to the topic. You can use other Wikipedia pages of related topics \
for inspiration. Please list {max_perspectives} personas.

Topic: {topic}

Related information for context:
{context}

For each persona, provide a short summary name and a description of their expertise and angle.
They should represent genuinely different perspectives that would ask different questions."""


def discover_perspectives(state: STORMState) -> dict:
    """
    Phase 1: Generate diverse expert perspectives for the topic.

    Reference approach (persona_generator.py):
    1. FindRelatedTopic — LLM suggests related Wikipedia pages
    2. Fetch TOCs from those pages — structural transfer
    3. GenPersona — generate personas inspired by the topic structures

    We approximate this by searching for related content and using it
    as context for persona generation. We always prepend a "Basic fact
    writer" persona (reference does this at persona_generator.py:152).
    """
    import log

    topic = state["topic"]
    log.phase("Phase 1: Discover Perspectives")
    log.step("*", "Searching for related topic context...")

    # Search for related content (approximates FindRelatedTopic + TOC fetch)
    results = tavily_client.search(topic, max_results=5, include_raw_content=False)
    context_parts = []
    for r in results.get("results", []):
        title = r.get("title", "")
        content = r.get("content", "")
        context_parts.append(f"- {title}: {content[:200]}")
    context = "\n".join(context_parts)

    prompt = PERSPECTIVE_PROMPT.format(
        topic=topic,
        max_perspectives=MAX_PERSPECTIVES,
        context=context,
    )

    log.step("*", "Generating expert perspectives (structured output)...")
    # Manual JSON parsing — with_structured_output isn't reliably supported
    # across all OpenRouter providers (function calling varies by backend).
    response = llm.invoke([
        SystemMessage(content=(
            "Respond ONLY with valid JSON. No markdown, no explanation. "
            'Format: {"analysts": [{"name": "...", "description": "..."}]}'
        )),
        HumanMessage(content=prompt),
    ])
    log.track_cost(response.response_metadata)

    import json
    text = response.content.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    perspectives = Perspectives(**json.loads(text.strip()))

    # Reference always prepends a default "Basic fact writer" persona
    default_analyst = {
        "name": "Basic fact writer",
        "description": "Basic fact writer focusing on broadly covering the basic facts about the topic.",
    }
    analysts = [default_analyst] + [a.model_dump() for a in perspectives.analysts]

    log.success(f"Generated {len(analysts)} perspectives (including default fact writer):")
    for a in analysts:
        log.detail(f"{a['name']}: {a['description'][:80]}")

    return {"analysts": analysts}


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 2: MULTI-TURN CONVERSATIONS (WikiWriter ↔ TopicExpert)       ║
# ║                                                                      ║
# ║  Reference: knowledge_curation.py                                    ║
# ║  For each persona, a ConvSimulator runs max_turn iterations:         ║
# ║    WikiWriter asks a question → TopicExpert generates queries,       ║
# ║    searches, and answers with [1],[2] citations                      ║
# ║  Conversations run IN PARALLEL via Send() (ref: ThreadPoolExecutor)  ║
# ║                                                                      ║
# ║  Key reference details:                                              ║
# ║  - WikiWriter uses AskQuestionWithPersona prompt                     ║
# ║  - Conversation ends with "Thank you so much for your help!"         ║
# ║  - TopicExpert first generates queries (QuestionToQuery),            ║
# ║    then searches, then answers (AnswerQuestion) with inline cites    ║
# ║  - History is truncated: last 4 turns full, earlier question-only    ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ── Reference prompts ──

WIKIWRITER_PROMPT = """You are an experienced Wikipedia writer and want to edit a specific page. \
Besides your identity as a Wikipedia writer, you have a specific focus when researching the topic.

Your persona: {persona_name} — {persona_description}

Now, you are chatting with an expert to get information. Ask good questions to get more useful \
information. When you have no more questions to ask, say "Thank you so much for your help!" \
to end the conversation.

Topic: {topic}

Ask only ONE focused question from your unique perspective."""

QUERY_GEN_PROMPT = """You want to answer the question using Google search. \
What do you type in the search box?
Write the queries you will use in the following format:
- query 1
- query 2
- query 3

Topic: {topic}
Question: {question}"""

EXPERT_ANSWER_PROMPT = """You are an expert who can use information effectively. \
You are chatting with a Wikipedia writer who wants to create a Wikipedia page on the topic. \
You have gathered the following information from web searches.

Make your response as informative as possible, ensuring that every sentence is supported \
by the gathered information. Use [1], [2], etc. to reference the sources in your response.

Information:
{info}

Topic: {topic}
Question: {question}"""


def _format_conv_history(messages: list, max_full_turns: int = 4) -> str:
    """Format conversation history like the reference (knowledge_curation.py:103-110).

    Last max_full_turns show full Q&A. Earlier turns show question only
    with 'Omit the answer here due to space limit.'
    """
    pairs = []
    for i in range(0, len(messages), 2):
        q = messages[i].content if i < len(messages) else ""
        a = messages[i + 1].content if i + 1 < len(messages) else ""
        pairs.append((q, a))

    total = len(pairs)
    lines = []
    for idx, (q, a) in enumerate(pairs):
        lines.append(f"Wikipedia Writer: {q}")
        if idx >= total - max_full_turns:
            lines.append(f"Expert: {a}")
        else:
            lines.append("Expert: [Omit the answer here due to space limit.]")

    text = "\n".join(lines)
    # Reference truncates to 2500 words
    words = text.split()
    if len(words) > 2500:
        text = " ".join(words[:2500])
    return text


def ask_question(state: InterviewState) -> dict:
    """WikiWriter asks a question from the analyst's perspective.

    Reference: WikiWriter.forward() in knowledge_curation.py:95-125
    Uses AskQuestionWithPersona signature with persona + conversation history.
    """
    import log

    analyst = state["analyst"]
    topic = state["topic"]
    messages = state.get("messages", [])
    turn = state.get("turn_count", 0) + 1
    name = analyst["name"]

    log.step("?", f"[{name}] WikiWriter asking question (turn {turn}/{MAX_CONV_TURNS})")

    prompt = WIKIWRITER_PROMPT.format(
        persona_name=analyst["name"],
        persona_description=analyst["description"],
        topic=topic,
    )

    # Include conversation history for follow-up context
    conv_messages = [SystemMessage(content=prompt)]
    if messages:
        conv_history = _format_conv_history(messages)
        conv_messages.append(HumanMessage(
            content=f"Conversation so far:\n{conv_history}\n\nAsk your next question."
        ))

    response = llm.invoke(conv_messages)
    log.track_cost(response.response_metadata)

    print()
    log.conversation("WikiWriter", name, response.content)

    return {
        "messages": [HumanMessage(content=response.content, name="WikiWriter")],
        "turn_count": turn,
    }


def answer_question(state: InterviewState) -> dict:
    """TopicExpert generates queries, searches, and answers with citations.

    Reference: TopicExpert.forward() in knowledge_curation.py:204-244
    Two-step process:
    1. QuestionToQuery — generate search queries from the question
    2. Search with each query via Tavily
    3. AnswerQuestion — synthesize answer with [1],[2] inline citations
    """
    import log

    topic = state["topic"]
    analyst_name = state["analyst"]["name"]
    messages = state.get("messages", [])
    last_question = messages[-1].content

    # ── Step 1: Generate search queries (reference: QuestionToQuery) ──
    query_prompt = QUERY_GEN_PROMPT.format(topic=topic, question=last_question)
    query_response = llm.invoke([HumanMessage(content=query_prompt)])
    log.track_cost(query_response.response_metadata)

    # Parse bullet-point queries and sanitize for Tavily
    raw_queries = query_response.content.strip().split("\n")
    queries = []
    for line in raw_queries:
        line = line.strip().lstrip("-").lstrip("0123456789.").strip()
        # Strip markdown formatting and various quote characters
        line = line.strip('"').strip("'").strip("`").strip("\u201c\u201d\u2018\u2019")
        # Replace non-breaking hyphens and other unicode with ASCII
        line = line.replace("\u2011", "-").replace("\u2010", "-").replace("\u2013", "-")
        if line and len(line) > 3:
            queries.append(line[:200])
    queries = queries[:MAX_SEARCH_QUERIES]

    if not queries:
        queries = [f"{topic} {last_question[:50]}"]

    # ── Step 2: Search with each query ──
    all_snippets: list[str] = []
    all_urls: list[str] = []
    snippet_idx = len(state.get("info_snippets", [])) + 1  # Continue numbering

    for query in queries:
        log.search(query)
        try:
            results = tavily_client.search(query, max_results=SEARCH_TOP_K, include_raw_content=False)
        except Exception as e:
            log.detail(f"Search failed for query: {e}")
            continue
        for r in results.get("results", []):
            url = r.get("url", "")
            content = r.get("content", "")
            if url and content:
                all_snippets.append(f"[{snippet_idx}]: {content}")
                all_urls.append(url)
                log.detail(f"[{snippet_idx}] {url}")
                snippet_idx += 1

    # ── Step 3: Answer with citations (reference: AnswerQuestion) ──
    # Reference limits info to 1000 words
    info_text = "\n\n".join(all_snippets)
    words = info_text.split()
    if len(words) > 1000:
        info_text = " ".join(words[:1000])

    answer_prompt = EXPERT_ANSWER_PROMPT.format(
        info=info_text if all_snippets else "No search results found.",
        topic=topic,
        question=last_question,
    )

    log.step("+", f"[{analyst_name}] TopicExpert synthesizing answer...")
    response = llm.invoke([HumanMessage(content=answer_prompt)])
    log.track_cost(response.response_metadata)

    print()
    log.conversation("TopicExpert", analyst_name, response.content)

    return {
        "messages": [AIMessage(content=response.content, name="TopicExpert")],
        "references": all_urls,
        "info_snippets": all_snippets,
    }


def compile_interview(state: InterviewState) -> dict:
    """Compile the interview into a summary preserving citations.

    Reference: After conversation completes, the full transcript is stored.
    We compile into a structured summary for use in outline + section writing.
    """
    import log

    messages = state.get("messages", [])
    analyst = state["analyst"]
    name = analyst["name"]

    log.step("=", f"[{name}] Compiling interview ({len(messages)} messages)...")

    conversation = "\n\n".join(
        f"{'Wikipedia Writer' if getattr(msg, 'name', '') == 'WikiWriter' else 'Expert'}: {msg.content}"
        for msg in messages
        if hasattr(msg, "content") and msg.content
    )

    prompt = f"""Summarize the key findings from this research interview.
Perspective: {analyst['name']} — {analyst['description']}

Interview transcript:
{conversation}

Provide a structured summary with:
1. Key findings (preserve all factual claims)
2. Important data points and quotes
3. Inline citations [1], [2] etc. as they appeared in the expert answers

Keep all citations intact. Be thorough — every fact matters for article writing."""

    response = llm.invoke([HumanMessage(content=prompt)])
    log.track_cost(response.response_metadata)
    log.success(f"[{name}] Interview compiled ({len(response.content)} chars)")

    return {"summary": response.content}


def should_continue_interview(state: InterviewState) -> Literal["answer_question", "compile_interview"]:
    """Route: continue conversation or compile.

    Reference stopping conditions (ConvSimulator.forward, line 60-67):
    1. Max turns reached
    2. WikiWriter says "Thank you so much for your help!"
    3. Empty utterance
    """
    messages = state.get("messages", [])
    turn_count = state.get("turn_count", 0)

    if turn_count >= MAX_CONV_TURNS:
        return "compile_interview"

    # Check for natural completion signal (reference: "Thank you so much for your help!")
    if messages:
        last = messages[-1]
        if hasattr(last, "name") and last.name == "WikiWriter":
            if "thank you so much" in last.content.lower():
                return "compile_interview"

    return "answer_question"


# ── Build interview subgraph ──
_interview_builder = StateGraph(InterviewState)
_interview_builder.add_node("ask_question", ask_question)
_interview_builder.add_node("answer_question", answer_question)
_interview_builder.add_node("compile_interview", compile_interview)

_interview_builder.add_edge(START, "ask_question")
_interview_builder.add_conditional_edges(
    "ask_question",
    should_continue_interview,
    ["answer_question", "compile_interview"],
)
_interview_builder.add_edge("answer_question", "ask_question")
_interview_builder.add_edge("compile_interview", END)

interview_graph = _interview_builder.compile()


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  FAN-OUT: Launch parallel interviews via Send()                      ║
# ║                                                                      ║
# ║  Reference: knowledge_curation.py uses ThreadPoolExecutor            ║
# ║  We use LangGraph's Send() API for the same parallel fan-out.       ║
# ║  Each Send targets conduct_interview with its own InterviewState.   ║
# ║  When all complete, interview_results are concatenated via           ║
# ║  operator.add annotation.                                           ║
# ╚══════════════════════════════════════════════════════════════════════╝


def initiate_interviews(state: STORMState) -> list[Send]:
    """Fan-out: launch one interview per perspective, all in parallel."""
    return [
        Send(
            "conduct_interview",
            {
                "messages": [],
                "analyst": analyst,
                "topic": state["topic"],
                "max_turns": MAX_CONV_TURNS,
                "turn_count": 0,
                "references": [],
                "info_snippets": [],
                "summary": "",
            },
        )
        for analyst in state["analysts"]
    ]


def conduct_interview(state: InterviewState) -> dict:
    """Run a complete WikiWriter ↔ TopicExpert interview via the subgraph."""
    import log

    name = state["analyst"]["name"]
    log.phase(f"Phase 2: Interview — {name}")
    log.detail(f"Persona: {state['analyst']['description'][:80]}")
    log.divider()

    result = interview_graph.invoke(state)
    return {
        "interview_results": [result["summary"]],
        "collected_info": result.get("info_snippets", []),
        "collected_urls": result.get("references", []),
    }


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 3: OUTLINE GENERATION (Two-Stage)                            ║
# ║                                                                      ║
# ║  Reference: outline_generation.py                                    ║
# ║  Stage 1: WritePageOutline — draft from LLM knowledge ONLY          ║
# ║  Stage 2: WritePageOutlineFromConv — refine with conversation data   ║
# ║                                                                      ║
# ║  The two-stage approach prevents the outline from being biased by    ║
# ║  whichever perspective found the most data. The LLM first proposes  ║
# ║  a structurally sound outline, then adapts it to the actual data.   ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ── Reference prompts ──

DRAFT_OUTLINE_PROMPT = """Write an outline for a Wikipedia page.
Here is the format of your writing:
Use "# Title" to indicate section title, "## Title" to indicate subsection title.
Do not include other information.
Do not include topic name itself in the outline.

Topic: {topic}"""

REFINE_OUTLINE_PROMPT = """Improve an outline for a Wikipedia page. \
You already have a draft outline that covers the general information. \
Now you want to improve it based on the information learned from an \
information-seeking conversation to make it more informative.

Topic: {topic}

Draft outline:
{old_outline}

Information from expert conversations:
{conv}

Return the improved outline using "# Title" and "## Title" format.
Do not include "References", "See also", "External links", or "Bibliography" sections."""


def generate_outline(state: STORMState) -> dict:
    """Phase 3: Two-stage outline generation matching the reference.

    Stage 1: Draft outline from LLM parametric knowledge only
    Stage 2: Refine with actual conversation data
    """
    import log

    topic = state["topic"]
    interviews = "\n\n---\n\n".join(state["interview_results"])

    log.phase("Phase 3: Generate Outline (Two-Stage)")

    # ── Stage 1: Draft from knowledge (reference: WritePageOutline) ──
    log.step("*", "Stage 1: Draft outline from topic knowledge...")
    draft_prompt = DRAFT_OUTLINE_PROMPT.format(topic=topic)
    draft_response = llm.invoke([HumanMessage(content=draft_prompt)])
    log.track_cost(draft_response.response_metadata)
    log.detail(f"Draft outline: {len(draft_response.content)} chars")

    # ── Stage 2: Refine with data (reference: WritePageOutlineFromConv) ──
    log.step("*", "Stage 2: Refine outline with conversation data...")

    # Reference limits conversation data to 5000 words
    conv_words = interviews.split()
    if len(conv_words) > 5000:
        interviews = " ".join(conv_words[:5000])

    refine_prompt = REFINE_OUTLINE_PROMPT.format(
        topic=topic,
        old_outline=draft_response.content,
        conv=interviews,
    )
    refined_response = llm.invoke([HumanMessage(content=refine_prompt)])
    log.track_cost(refined_response.response_metadata)

    log.success(f"Outline refined ({len(refined_response.content)} chars)")
    for line in refined_response.content.strip().split("\n")[:8]:
        if line.strip():
            log.detail(line.strip())

    return {"outline": refined_response.content}


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 4: PER-SECTION ARTICLE WRITING                               ║
# ║                                                                      ║
# ║  Reference: article_generation.py                                    ║
# ║  Each top-level section is written independently with relevant       ║
# ║  information retrieved from the collected snippets.                  ║
# ║  Reference uses SentenceTransformer cosine similarity for retrieval. ║
# ║  We pass all collected info (small enough for a demo query).         ║
# ║                                                                      ║
# ║  Key: sections are written IN PARALLEL (ref: ThreadPoolExecutor).   ║
# ║  We write them sequentially for clearer demo logging.               ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ── Reference prompt (WriteSection signature) ──

WRITE_SECTION_PROMPT = """Write a Wikipedia section based on the collected information.
Here is the format of your writing:
1. Use "# Title" to indicate section title, "## Title" to indicate subsection title.
2. Use [1], [2], ..., [n] in line (for example, "The capital of the United States is Washington, D.C.[1][3]."). \
You DO NOT need to include a References or Sources section.

Topic: {topic}
Section to write: {section}
Section outline: {section_outline}

Collected information:
{info}

Start your writing with # {section}. Don't include the page title or try to write other sections."""


def write_sections(state: STORMState) -> dict:
    """Phase 4a: Write each top-level section independently.

    Reference: article_generation.py:53-133
    Parses the outline into sections, writes each one with relevant info.
    Skips "introduction", "conclusion", "summary" sections.
    """
    import log

    topic = state["topic"]
    outline = state["outline"]
    interviews = "\n\n---\n\n".join(state["interview_results"])

    log.phase("Phase 4: Write Article (Per-Section)")

    # Parse top-level sections from outline
    sections: list[tuple[str, str]] = []  # (section_name, section_outline)
    current_section = ""
    current_content: list[str] = []

    for line in outline.strip().split("\n"):
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("## "):
            if current_section:
                sections.append((current_section, "\n".join(current_content)))
            current_section = stripped.lstrip("# ").strip()
            current_content = [stripped]
        elif current_section:
            current_content.append(stripped)

    if current_section:
        sections.append((current_section, "\n".join(current_content)))

    # Filter out intro/conclusion/summary (reference: article_generation.py:97-103)
    skip_names = {"introduction", "conclusion", "summary", "references", "see also", "external links"}
    sections = [(name, outline_text) for name, outline_text in sections
                if name.lower() not in skip_names]

    log.step("*", f"Writing {len(sections)} sections...")

    # Use all collected info as context (reference uses cosine similarity retrieval)
    info_text = "\n\n".join(state.get("collected_info", []))
    if not info_text:
        info_text = interviews  # Use interview summaries as context

    # Limit info to prevent context overflow
    words = info_text.split()
    if len(words) > 3000:
        info_text = " ".join(words[:3000])

    section_texts: list[str] = []
    for section_name, section_outline in sections:
        log.step(">", f"Writing: {section_name}")

        prompt = WRITE_SECTION_PROMPT.format(
            topic=topic,
            section=section_name,
            section_outline=section_outline,
            info=info_text,
        )

        response = llm.invoke([HumanMessage(content=prompt)])
        log.track_cost(response.response_metadata)
        log.detail(f"{len(response.content)} chars")
        section_texts.append(response.content)

    log.success(f"Wrote {len(section_texts)} sections")
    return {"section_texts": section_texts}


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 5: LEAD SECTION + ASSEMBLY                                   ║
# ║                                                                      ║
# ║  Reference: article_polish.py                                        ║
# ║  Lead section is written AFTER the body so it reflects actual        ║
# ║  content. Optional dedup pass removes repeated information.          ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ── Reference prompt (WriteLeadSection signature) ──

LEAD_SECTION_PROMPT = """Write a lead section for the given Wikipedia page with the following guidelines:
1. The lead should stand on its own as a concise overview of the article's topic.
2. The lead section should be concise and contain no more than four well-composed paragraphs.
3. The lead section should be carefully sourced as appropriate. Add inline citations [1], [2], etc.
4. The lead section should not contain any headings.

Topic: {topic}

Full article:
{article}

Write only the lead section (no heading needed)."""


def write_lead_and_assemble(state: STORMState) -> dict:
    """Phase 5: Write lead section and assemble the final article.

    Reference: article_polish.py:29-53
    1. Write lead section based on full article body
    2. Prepend lead as "# Summary"
    3. Build a unified references section from collected URLs
    """
    import log

    topic = state["topic"]
    section_texts = state.get("section_texts", [])
    collected_urls = state.get("collected_urls", [])

    log.phase("Phase 5: Lead Section + Assembly")

    # Assemble the body from per-section texts
    body = "\n\n".join(section_texts)

    # ── Write lead section (reference: WriteLeadSection) ──
    log.step("*", "Writing lead section...")
    lead_prompt = LEAD_SECTION_PROMPT.format(topic=topic, article=body)
    lead_response = llm.invoke([HumanMessage(content=lead_prompt)])
    log.track_cost(lead_response.response_metadata)
    log.detail(f"Lead section: {len(lead_response.content)} chars")

    # ── Build references section from collected URLs ──
    unique_urls = list(dict.fromkeys(collected_urls))  # Deduplicate, preserve order
    references_section = "\n\n## References\n\n"
    for i, url in enumerate(unique_urls, 1):
        references_section += f"[{i}] {url}\n"

    # ── Assemble final article ──
    final_report = f"# {topic}\n\n{lead_response.content}\n\n{body}{references_section}"

    log.success(f"Final article assembled ({len(final_report)} chars, {len(unique_urls)} sources)")
    return {"final_report": final_report}


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  GRAPH ASSEMBLY                                                      ║
# ║                                                                      ║
# ║  The STORM pipeline is LINEAR — each phase feeds the next.           ║
# ║  Parallelism happens WITHIN Phase 2 via Send() fan-out.             ║
# ║                                                                      ║
# ║  Reference pipeline:                                                 ║
# ║    knowledge_curation → outline_generation → article_generation      ║
# ║    → article_polishing                                               ║
# ╚══════════════════════════════════════════════════════════════════════╝

builder = StateGraph(STORMState)

builder.add_node("discover_perspectives", discover_perspectives)
builder.add_node("conduct_interview", conduct_interview)
builder.add_node("generate_outline", generate_outline)
builder.add_node("write_sections", write_sections)
builder.add_node("write_lead_and_assemble", write_lead_and_assemble)

# Wire the pipeline
builder.add_edge(START, "discover_perspectives")
builder.add_conditional_edges("discover_perspectives", initiate_interviews, ["conduct_interview"])
builder.add_edge("conduct_interview", "generate_outline")
builder.add_edge("generate_outline", "write_sections")
builder.add_edge("write_sections", "write_lead_and_assemble")
builder.add_edge("write_lead_and_assemble", END)

graph = builder.compile()


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  ENTRY POINT HELPER                                                  ║
# ╚══════════════════════════════════════════════════════════════════════╝


def initial_state(query: str) -> STORMState:
    """Build the starting state for the STORM agent."""
    return {
        "topic": query,
        "analysts": [],
        "interview_results": [],
        "collected_info": [],
        "collected_urls": [],
        "outline": "",
        "section_texts": [],
        "final_report": "",
    }
