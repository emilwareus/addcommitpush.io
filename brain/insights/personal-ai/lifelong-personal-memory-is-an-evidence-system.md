---
type: insight
title: "A Lifelong Personal Memory Agent Is an Evidence System"
slug: lifelong-personal-memory-is-an-evidence-system
created: 2026-07-13
status: working
publish: false
tags:
  - ai agents
---

# A Lifelong Personal Memory Agent Is an Evidence System

A personal agent that remembers for years should not be designed as a larger
chat log or a vector-search wrapper. Its core abstraction is an evidence system:
observations enter with provenance and uncertainty; claims acquire valid-time
bounds and sensitivity; revisions append rather than overwrite; retrieval joins
lexical and semantic cues; and generated reflections remain distinguishable from
what the person actually said. This architecture follows from cognitive models
of autobiographical memory, provenance standards, retrieval-system mechanics,
and the failure modes measured by long-term conversation benchmarks.

## Background: autobiographical memory is reconstructed

Conway and Pleydell-Pearce's Self-Memory System describes autobiographical
memories as constructions produced by interaction between an autobiographical
knowledge base and the goals of the working self, rather than immutable records
replayed from an archive. The knowledge base spans different granularities:
life periods, general events, and event-specific knowledge. Active goals shape
which cues are elaborated during retrieval. This is a useful computational
analogy, but not evidence that a database schema reproduces human cognition.

The design consequence is narrower: one flat unit is insufficient. A statement
such as “I value independence” is conceptual self-knowledge; “I studied in Lund
from 2013 to 2018” is a life period; “I decided to leave a job after one meeting”
is an event. They can share one storage envelope while retaining kind, temporal
precision, structured subject–predicate–object fields, and typed relations.

Generative Agents demonstrated a complementary systems pattern: an append-only
memory stream, retrieval based on relevance/recency/importance, and reflection
that synthesizes higher-level observations. Its simulation is short and does not
establish lifelong correctness, but it makes an important distinction: raw
experience and reflection are different data products. MemGPT similarly frames
limited model context as a memory-management problem rather than assuming that
all durable state fits into every prompt.

## The canonical record

The searchable record should preserve four independent questions:

| Dimension | Question | Example |
| --- | --- | --- |
| Semantics | What kind of thing is asserted? | goal, relationship, event, belief, journal |
| Valid time | When was it true or experienced? | approximately 2018; 2025-01-03 14:30 |
| Transaction time | When did the system learn or revise it? | imported 2026-07-13 |
| Epistemic state | Why should it be believed? | user-stated, imported, researched, inferred, disputed |

Conflating valid and transaction time causes a common historical error. If a
person says in 2026, “I was unhappy at university in 2014,” the experience belongs
on the 2014 timeline while the assertion entered the system in 2026. If they later
qualify it, the later database row should supersede the earlier assertion without
destroying it. This supports “what do I currently believe happened?” and “what
did the system believe before the correction?” as different queries.

W3C PROV-O supplies a vocabulary for the provenance side: an entity was generated
by an activity, used another entity, and was attributed to an agent. A personal
system need not store OWL triples to apply the distinction. It does need durable
source entities (conversation message, email, GitHub event, URL), generation
activities (extraction, import, reflection), and derivation links. A citation URL
stored only inside generated prose is not equivalent to queryable provenance.

Sensitivity is orthogonal to epistemic status. “I regret how I handled that
relationship” may be highly reliable as a user-stated feeling and still be
intimate. Conversely, a public web claim can be low-confidence and standard
sensitivity. Retrieval authorization must filter sensitivity before evidence is
placed in a model prompt.

## Ingestion as a validated state transition

The ingestion algorithm must preserve an evidence invariant: every automatically
extracted user-stated claim points to an exact excerpt in the current user turn;
every imported claim points to an immutable provider record; every researched
claim points to a captured report and admitted URL; and every inference points
to its input memories.

```text
INPUT
  observation: bytes or text
  source_kind: conversation | github | linear | gmail | web | device
  source_identity: provider-stable external ID or message UUID
  owner_id: singleton owner

STATE
  source_records[(owner_id, source_kind, source_identity)]
  active_memory_by_source[source_record_id]
  append_only_memories
  contradictions

TRANSITION ingest(observation)
  normalized := normalize_without_changing_semantics(observation)
  content_hash := SHA256(normalized)
  prior_source := lock source_records[source_identity]

  if prior_source exists and prior_source.content_hash = content_hash
      mark source observed; return NO_CHANGE

  source := insert_or_update_source(normalized, content_hash)
  candidates := extract_claims(normalized)

  for candidate in candidates
      require validate_schema(candidate)
      require validate_provenance(candidate, normalized, source)
      vector := embed(candidate.title + candidate.markdown)
      require dimension(vector) = configured_dimension

      prior_memory := active_memory_by_source[source.id]
      if prior_memory exists
          set prior_memory.superseded_at = transaction_time

      append candidate with source.id, vector, transaction_time

  commit source, revisions, vectors, and audit event atomically

INVARIANT
  no committed extracted memory exists without durable supporting evidence

TERMINATION
  finite candidates; each provider page advances a provider cursor; cursor cycles
  or malformed pagination responses are hard errors
```

The excerpt check prevents source-free invention, but it does not prove
entailment. A model can quote “I met Ada” and incorrectly extract “Ada is my
cofounder.” A stronger evaluator should separately test whether the claim is
entailed by the excerpt, ideally with adversarial examples and human review for
high-importance or intimate claims. Provenance makes the error inspectable; it
does not make the claim true.

Idempotency and append-only history solve different problems. Idempotency prevents
the same provider event from creating duplicates on a retry. Append-only revision
preserves a provider event that changed, a person's corrected recollection, or a
claim later disputed. A unique `(owner, source kind, external ID)` key plus content
hash addresses the first. `supersedes_id` and `superseded_at` address the second.

## Hybrid retrieval

Semantic embeddings and lexical search fail on different queries. Embeddings can
retrieve paraphrases but blur exact names, identifiers, negation, and dates.
PostgreSQL full-text search retains exact lexical evidence but misses paraphrases.
A robust first-stage retriever runs both and fuses rank rather than attempting to
calibrate incompatible raw scores.

For ranked lists \(L_t\) (text) and \(L_v\) (vector), reciprocal-rank fusion is:

\[
RRF(d)=\sum_{L \in \{L_t,L_v\}} \frac{1}{k + rank_L(d)}
\]

where absent documents contribute zero and \(k\) limits the advantage of a top
rank. The algorithm needs no assumption that a cosine distance and `ts_rank_cd`
score share a scale.

```text
INPUT query, owner, allowed_sensitivities, output_limit

q_vector := embed(query)
text_candidates := top 4*limit by PostgreSQL tsvector rank
vector_candidates := top 4*limit by cosine distance
    constrained by owner, active status, and sensitivity

for each candidate in union(text_candidates, vector_candidates)
    score := reciprocal_rank(text_rank) + reciprocal_rank(vector_rank)

return top limit by score, then bounded importance and recording-time tie-breaks
```

PostgreSQL documents GIN as the preferred index type for frequently searched
`tsvector` columns. pgvector supports exact nearest-neighbor search and HNSW.
HNSW is approximate, and filters are applied to visited candidates; selective
owner/sensitivity filters can therefore yield too few results. pgvector's strict
iterative scan continues scanning while preserving distance order. Production
evaluation must still compare HNSW results against exact search on a representative
corpus. Index presence is not evidence of adequate recall.

With \(N\) active memories and candidate width \(C\), fusion costs
\(O(C \log C)\) after the two indexed queries. Embedding dominates network
latency. Storage is dominated by vectors: pgvector documents `vector` storage as
approximately `4 * dimensions + 8` bytes, before HNSW and row/index overhead. At
1536 dimensions, the raw vector is roughly 6 KiB per memory, so a million
memories implies multiple gigabytes before indexes. This makes granularity an
operational decision: extracting every sentence is not free and often reduces
retrieval precision.

## Contradictions and reflections are review queues

A contradiction detector should not decide which memory wins. It creates a
reviewable edge between two claims with an explanation and status. Contradiction
is temporal and contextual: “I live in Stockholm” in 2020 and “I live in Berlin”
in 2025 may both be correct. Detection should first compare subject, predicate,
valid-time overlap, and epistemic state; only then ask a semantic verifier.

Reflection has a similar trust boundary. It may identify recurring themes,
unresolved tensions, or relationships across events, but its output is `inferred`,
not `user_stated`. It must cite retrieved memory IDs and remain retractable. The
agent should explain uncertainty rather than update the owner's identity profile
silently.

## Evaluation must test memory operations, not personality theater

LoCoMo evaluates question answering, event summarization, and multimodal dialogue
over conversations averaging 300 turns and up to 35 sessions; its results show
that long context and RAG improve performance but remain below human performance
on long-range temporal and causal understanding. LongMemEval isolates five
capabilities: extraction, multi-session reasoning, temporal reasoning, knowledge
updates, and abstention. Its 500 questions and reported degradation over sustained
interaction show why a pleasant demo is not a memory evaluation.

A production evaluation set should therefore include:

| Fixture | Required behavior | Main failure exposed |
| --- | --- | --- |
| Corrected birthday or employer | Return current claim and preserve old revision | destructive overwrite |
| Approximate year and later exact date | Retain both transaction times and refined valid time | temporal collapse |
| Same name, different online person | Abstain or preserve ambiguity | identity collision |
| Exact project code in old email | Lexical candidate survives semantic ambiguity | vector-only retrieval |
| Paraphrased value across journals | Semantic candidate survives vocabulary change | text-only retrieval |
| Intimate fact under default query | Never enter retrieved context | post-retrieval filtering leak |
| Injected instructions in an email | Treat as source data, not an instruction | indirect prompt injection |
| Changed provider event | Append revision; do not duplicate | broken idempotency/history |
| Stale Gmail history cursor | Explicit failed job requiring operator action | silent full-resync path |
| Unsupported answer premise | Abstain and cite the gap | confabulation |

Measure evidence precision, evidence recall, answer accuracy, citation correctness,
temporal interval accuracy, update correctness, abstention calibration, retrieval
recall@k against exact search, and sensitivity leakage separately. A single answer
score conceals whether failure came from ingestion, indexing, retrieval, model
reasoning, or authorization.

## Limits

An evidence architecture does not make exhaustive life capture desirable or
safe. More sources increase surveillance surface, model exposure, breach impact,
and the probability of misleading inference. A database administrator can read
searchable plaintext unless content is moved into a cryptographic design that
would also change search mechanics. `store: false` on a model API is not local
execution. Deletion from the live database does not instantly delete backups,
exports, provider copies, or model-provider retention.

Human autobiographical accounts are also not sensor truth. Feelings, regrets,
and self-interpretations can be valuable precisely as situated assertions. The
system should preserve who said what, when they said it, what period it concerns,
and what later changed. Its job is not to adjudicate a person's life into one
timeless canonical story.

## Sources

- W3C, [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/).
- Conway and Pleydell-Pearce, [The construction of autobiographical memories in the self-memory system](https://pubmed.ncbi.nlm.nih.gov/10789197/), *Psychological Review* 107(2), 2000.
- Park et al., [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442), 2023.
- Packer et al., [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560), 2023.
- PostgreSQL 18, [Text Search Functions and Operators](https://www.postgresql.org/docs/18/functions-textsearch.html) and [Preferred Index Types](https://www.postgresql.org/docs/18/textsearch-indexes.html).
- pgvector, [vector similarity search for PostgreSQL](https://github.com/pgvector/pgvector).
- Maharana et al., [Evaluating Very Long-Term Conversational Memory of LLM Agents](https://arxiv.org/abs/2402.17753), 2024.
- Wu et al., [LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813), 2024.
