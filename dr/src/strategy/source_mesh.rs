use std::collections::{BTreeMap, BTreeSet};

use async_trait::async_trait;
use chrono::Utc;
use futures::future::{join_all, try_join_all};
use serde::de::DeserializeOwned;
use tokio::time::{Duration, sleep};
use url::Url;

use crate::StrategyName;
use crate::clients::brave::SearchClient;
use crate::clients::fetch::DocumentClient;
use crate::clients::openrouter::{CompletionRequest, LlmClient};
use crate::error::{DrError, Result};
use crate::report::{ReportDocument, output_path, validate_report_citations, write_markdown};
use crate::strategy::{ResearchOutcome, ResearchRequest, ResearchStrategy};
use crate::types::{
    ClaimVerificationBatch, EvidenceBatch, GapAnalysis, PlannedSearchQuery, ReportClaims,
    ReportEvaluation, ResearchPlan, SearchHit, Source, SourceQualityBatch,
};

const MAX_REFINEMENT_PASSES: usize = 2;

#[derive(Debug, Default, Clone, Copy)]
pub struct SourceMeshStrategy;

struct ResearchClients<'a> {
    llm: &'a dyn LlmClient,
    search: &'a dyn SearchClient,
    document: &'a dyn DocumentClient,
}

struct ResearchState<'a> {
    sources: &'a mut Vec<Source>,
    seen_urls: &'a mut BTreeSet<String>,
    evidence: &'a mut EvidenceBatch,
}

#[async_trait]
impl ResearchStrategy for SourceMeshStrategy {
    fn name(&self) -> StrategyName {
        StrategyName::DeepAgentV1
    }

    async fn run(
        &self,
        request: &ResearchRequest,
        llm: &dyn LlmClient,
        search: &dyn SearchClient,
        document: &dyn DocumentClient,
    ) -> Result<ResearchOutcome> {
        let now = Utc::now();
        progress_stage("01/11", "planning research brief");
        let plan = create_plan(request, llm).await?;
        progress_stage(
            "01/11",
            &format!(
                "planned {} searches and {} subquestions",
                plan.search_queries.len(),
                plan.subquestions.len()
            ),
        );
        let clients = ResearchClients {
            llm,
            search,
            document,
        };
        let mut sources = Vec::new();
        let mut seen_urls = BTreeSet::new();

        progress_stage(
            "02/11",
            &format!(
                "searching Brave ({} queries, {} results/query)",
                plan.search_queries.len(),
                request.limits.results_per_search
            ),
        );
        collect_sources(
            search,
            &plan.search_queries,
            request,
            initial_source_cap(request.limits.max_sources),
            &mut seen_urls,
            &mut sources,
        )
        .await?;
        ensure_sources(&sources)?;
        progress_stage(
            "02/11",
            &format!("collected {} unique candidate sources", sources.len()),
        );

        progress_stage("03/11", &format!("reading {} source pages", sources.len()));
        let fetch_summary =
            fetch_source_contents(document, &mut sources, request.limits.max_content_chars).await;
        progress_stage(
            "03/11",
            &format!(
                "read {} pages; {} fetches failed",
                fetch_summary.readable, fetch_summary.failed
            ),
        );

        progress_stage("04/11", "scoring source quality");
        assess_source_quality(request, llm, &plan, &mut sources).await?;
        let initial_admitted_sources = admitted_sources(&sources, request.limits.min_source_score);
        ensure_sources(&initial_admitted_sources)?;
        progress_stage(
            "04/11",
            &format!(
                "admitted {} sources above score threshold",
                initial_admitted_sources.len()
            ),
        );

        progress_stage(
            "05/11",
            &format!(
                "extracting evidence from {} admitted sources",
                initial_admitted_sources.len()
            ),
        );
        let mut evidence = extract_evidence(request, llm, &plan, &initial_admitted_sources).await?;
        progress_stage(
            "05/11",
            &format!("extracted {} evidence notes", evidence.notes.len()),
        );
        if uses_gap_loop(request.strategy) {
            progress_stage("06/11", "checking evidence gaps");
            let mut state = ResearchState {
                sources: &mut sources,
                seen_urls: &mut seen_urls,
                evidence: &mut evidence,
            };
            fill_evidence_gaps(request, &clients, &plan, &mut state).await?;
        } else {
            progress_stage("06/11", "gap loop disabled for this strategy");
        }

        let admitted_sources = admitted_sources(&sources, request.limits.min_source_score);
        ensure_sources(&admitted_sources)?;
        progress_stage(
            "07/11",
            &format!(
                "writing report from {} sources and {} evidence notes",
                admitted_sources.len(),
                evidence.notes.len()
            ),
        );
        let mut body = write_report(request, llm, &plan, &admitted_sources, &evidence).await?;
        progress_stage("08/11", "validating citations and extracting claims");
        validate_report_citations(&body, &admitted_sources)?;
        let mut claims = extract_report_claims(request, llm, &body, &admitted_sources).await?;
        progress_stage(
            "08/11",
            &format!("extracted {} material claims", claims.claims.len()),
        );
        progress_stage("09/11", "verifying claim support and citation association");
        let mut claim_verification =
            verify_claims(request, llm, &claims, &admitted_sources, &evidence).await?;

        for refinement_pass in 0..MAX_REFINEMENT_PASSES {
            if !has_unsupported_claims(&claim_verification) {
                break;
            }

            progress_stage(
                "09/11",
                &format!(
                    "refining report after verifier pass {}",
                    refinement_pass + 1
                ),
            );
            body = refine_report(
                request,
                llm,
                &body,
                &claim_verification,
                &admitted_sources,
                &evidence,
            )
            .await?;
            validate_report_citations(&body, &admitted_sources)?;
            claims = extract_report_claims(request, llm, &body, &admitted_sources).await?;
            claim_verification =
                verify_claims(request, llm, &claims, &admitted_sources, &evidence).await?;
        }

        if has_unsupported_claims(&claim_verification) {
            progress_stage("09/11", "pruning unsupported claims after verifier");
            body = prune_unsupported_claims(
                request,
                llm,
                &body,
                &claim_verification,
                &admitted_sources,
                &evidence,
            )
            .await?;
            validate_report_citations(&body, &admitted_sources)?;
            claims = extract_report_claims(request, llm, &body, &admitted_sources).await?;
            claim_verification =
                verify_claims(request, llm, &claims, &admitted_sources, &evidence).await?;
        }

        validate_claim_verification(&claim_verification, &admitted_sources)?;
        progress_stage("10/11", "scoring final report");
        let evaluation = evaluate_report(
            request,
            llm,
            &body,
            &plan,
            &admitted_sources,
            &evidence,
            &claim_verification,
        )
        .await?;
        validate_report_evaluation(&evaluation)?;
        progress_stage(
            "10/11",
            &format!("final evaluator overall score {}/5", evaluation.overall),
        );

        let document = ReportDocument {
            topic: request.topic.clone(),
            generated_at: now,
            strategy: request.strategy,
            effort: request.effort,
            models: request.models.clone(),
            plan,
            sources,
            evidence,
            claim_verification: Some(claim_verification),
            evaluation: Some(evaluation),
            body,
        };
        let markdown = document.to_markdown();
        let path = output_path(
            request.output.as_deref(),
            &request.output_dir,
            &request.topic,
            now,
        );
        progress_stage("11/11", &format!("saving report to {}", path.display()));
        let path = write_markdown(&path, &markdown).await?;
        progress_stage("11/11", "done");

        Ok(ResearchOutcome { path })
    }
}

async fn create_plan(request: &ResearchRequest, llm: &dyn LlmClient) -> Result<ResearchPlan> {
    let system_prompt = format!(
        r#"You are the planning/controller module for a state-of-the-art deep research CLI used by coding agents.
Return only JSON. No markdown.

Create a research brief that can drive parallel research workers.
The plan must include:
- research_goal: one sentence.
- assumptions: explicit assumptions made because this is a non-interactive CLI.
- subquestions: at most {max_subquestions} specific questions.
- perspectives: complementary research perspectives such as primary sources, benchmarks, implementation, criticism, counterevidence, recency, and operational implications.
- source_requirements: source classes the report should try to include.
- success_criteria: concrete criteria for a strong answer.
- search_queries: at most {max_searches} Brave-compatible web queries.

Use a mix of:
- official documentation / primary sources
- recent research papers / technical reports
- implementation examples, benchmarks, and evaluation sources
- adversarial searches for limitations, failures, and counterevidence

Prefer queries that can find primary pages, papers, benchmarks, repos, docs, or critiques.

JSON shape:
{{
  "research_goal": "string",
  "assumptions": ["string"],
  "subquestions": ["string"],
  "perspectives": [
    {{ "name": "string", "objective": "string" }}
  ],
  "source_requirements": ["string"],
  "success_criteria": ["string"],
  "search_queries": [
    {{ "query": "string", "rationale": "string", "perspective": "string", "source_type": "string" }}
  ]
}}"#,
        max_subquestions = request.limits.max_subquestions,
        max_searches = request.limits.max_searches
    );
    let user_prompt = format!(
        "Current date: {}\n\nResearch topic:\n{}",
        current_date(),
        request.topic
    );
    let mut plan = complete_json_with_repair::<ResearchPlan>(
        llm,
        CompletionRequest {
            model: request.models.planner_model.clone(),
            system_prompt: system_prompt.clone(),
            user_prompt,
            temperature: request.models.temperature,
            max_completion_tokens: request.limits.max_plan_tokens,
            json_mode: true,
        },
        "research plan",
        &system_prompt,
    )
    .await?;
    plan.subquestions.truncate(request.limits.max_subquestions);
    augment_plan_queries(request, &mut plan);
    plan.search_queries.truncate(request.limits.max_searches);
    validate_plan(&plan)?;
    Ok(plan)
}

async fn collect_sources(
    search: &dyn SearchClient,
    queries: &[PlannedSearchQuery],
    request: &ResearchRequest,
    max_sources: usize,
    seen_urls: &mut BTreeSet<String>,
    sources: &mut Vec<Source>,
) -> Result<()> {
    let queries = queries
        .iter()
        .take(request.limits.max_searches)
        .cloned()
        .collect::<Vec<_>>();
    let results = search_queries(search, &queries, request).await?;

    for (query, hits) in results {
        for (rank_index, hit) in hits.into_iter().enumerate() {
            let normalized = normalize_url(&hit.url);
            if seen_urls.insert(normalized) {
                sources.push(source_from_hit(
                    sources.len() + 1,
                    &query,
                    rank_index + 1,
                    hit,
                ));
            }

            if sources.len() >= max_sources {
                return Ok(());
            }
        }
    }

    Ok(())
}

async fn search_queries(
    search: &dyn SearchClient,
    queries: &[PlannedSearchQuery],
    request: &ResearchRequest,
) -> Result<Vec<(PlannedSearchQuery, Vec<SearchHit>)>> {
    if request.search_concurrency == 1 {
        let mut results = Vec::with_capacity(queries.len());
        for (index, query) in queries.iter().enumerate() {
            if index > 0 && request.search_delay_ms > 0 {
                sleep(Duration::from_millis(request.search_delay_ms)).await;
            }
            progress_detail(&format!(
                "search {}/{}: {}",
                index + 1,
                queries.len(),
                truncate_for_progress(&query.query)
            ));
            let hits = search
                .search(&query.query, request.limits.results_per_search)
                .await?;
            results.push((query.clone(), hits));
        }
        return Ok(results);
    }

    let mut results = Vec::with_capacity(queries.len());
    for (batch_index, batch) in queries.chunks(request.search_concurrency).enumerate() {
        progress_detail(&format!(
            "search batch {}/{} ({} queries)",
            batch_index + 1,
            queries.len().div_ceil(request.search_concurrency),
            batch.len()
        ));
        let searches = batch.iter().map(|query| async move {
            search
                .search(&query.query, request.limits.results_per_search)
                .await
                .map(|hits| (query.clone(), hits))
        });
        results.extend(try_join_all(searches).await?);
    }

    Ok(results)
}

async fn fetch_source_contents(
    document: &dyn DocumentClient,
    sources: &mut [Source],
    max_content_chars: usize,
) -> FetchSummary {
    let fetches = sources
        .iter()
        .map(|source| async move { document.fetch(&source.url, max_content_chars).await });
    let outcomes = join_all(fetches).await;

    let mut summary = FetchSummary::default();
    for (source, outcome) in sources.iter_mut().zip(outcomes) {
        match outcome {
            Ok(fetched) => {
                source.url = fetched.url;
                source.content = fetched.text;
                source.fetch_error = None;
                summary.readable += 1;
            }
            Err(error) => {
                source.content.clear();
                source.fetch_error = Some(sanitize_trace_text(&error.to_string()));
                summary.failed += 1;
            }
        }
    }

    summary
}

async fn assess_source_quality(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    plan: &ResearchPlan,
    sources: &mut [Source],
) -> Result<()> {
    let system_prompt = r#"You are the source admission module for a deep research agent.
Return only JSON. No markdown.

Score each source from 0 to 5 on:
- relevance: usefulness for the research goal.
- authority: primary source, benchmark, paper, official docs, or credible expert analysis.
- freshness: current enough for the topic.
- independence: adds independent evidence rather than duplicating another source.

Set admitted=false for unreadable pages, off-topic pages, low-authority SEO pages, thin summaries,
or sources that do not help meet the plan's source requirements.

Hard schema rules:
- Return exactly one scores item for every source_id listed in "Sources to score".
- Do not include scores for any other source_id.
- Every scores item must include every key shown below.
- Never omit relevance, authority, freshness, independence, admitted, rationale, or warnings.
- relevance, authority, freshness, and independence must be integers from 0 to 5.
- warnings must always be an array, even when empty.
- Unreadable or failed-fetch sources still need a complete score object.

JSON shape:
{
  "scores": [
    {
      "source_id": "S1",
      "source_type": "primary|benchmark|paper|repo|docs|critique|news|other",
      "relevance": 5,
      "authority": 5,
      "freshness": 4,
      "independence": 4,
      "admitted": true,
      "rationale": "string",
      "warnings": ["string"]
    }
  ]
}"#;
    let user_prompt = format!(
        "Current date: {}\n\nTopic:\n{}\n\nPlan:\n{}\n\nSources to score:\n{}",
        current_date(),
        request.topic,
        serde_json::to_string_pretty(plan)?,
        format_sources_for_quality_prompt(sources)
    );
    let completion_request = CompletionRequest {
        model: request.models.worker_model.clone(),
        system_prompt: system_prompt.to_string(),
        user_prompt,
        temperature: 0.0,
        max_completion_tokens: request.limits.max_evidence_tokens,
        json_mode: true,
    };
    let text = llm.complete(completion_request.clone()).await?;
    let quality = match parse_and_validate_source_quality(&text, sources) {
        Ok(quality) => quality,
        Err(error) => {
            progress_detail(&format!(
                "repairing source-quality JSON after schema error: {}",
                sanitize_trace_text(&error.to_string())
            ));
            let repair_text = llm
                .complete(CompletionRequest {
                    model: completion_request.model.clone(),
                    system_prompt: source_quality_repair_prompt(),
                    user_prompt: format!(
                        "Current date: {}\n\nTopic:\n{}\n\nPlan:\n{}\n\nSources to score:\n{}\n\nExpected source IDs: {}\n\nSchema error:\n{}\n\nInvalid source-quality JSON:\n{}\n\nReturn corrected JSON only.",
                        current_date(),
                        request.topic,
                        serde_json::to_string_pretty(plan)?,
                        format_sources_for_quality_prompt(sources),
                        format_source_ids(sources),
                        sanitize_trace_text(&error.to_string()),
                        truncate_chars(&text, 8_000)
                    ),
                    temperature: 0.0,
                    max_completion_tokens: completion_request.max_completion_tokens,
                    json_mode: true,
                })
                .await?;
            parse_and_validate_source_quality(&repair_text, sources)?
        }
    };
    apply_source_quality(sources, quality)?;
    Ok(())
}

fn source_quality_repair_prompt() -> String {
    r#"You repair malformed source-quality JSON for a deep research agent.
Return only valid JSON. No markdown.

You must preserve the source admission intent from the invalid JSON when it is usable. If the
invalid JSON cannot be interpreted, score the supplied sources from the source context. The corrected
object must match this exact contract:
{
  "scores": [
    {
      "source_id": "S1",
      "source_type": "primary|benchmark|paper|repo|docs|critique|news|other",
      "relevance": 0,
      "authority": 0,
      "freshness": 0,
      "independence": 0,
      "admitted": false,
      "rationale": "string",
      "warnings": ["string"]
    }
  ]
}

Rules:
- Return exactly one scores item for every expected source ID.
- Do not include any other source IDs.
- Every score object must include source_id, source_type, relevance, authority, freshness,
  independence, admitted, rationale, and warnings.
- relevance, authority, freshness, and independence must be integers from 0 to 5.
- warnings must be an array.
- Never invent source IDs."#
        .to_string()
}

fn parse_and_validate_source_quality(text: &str, sources: &[Source]) -> Result<SourceQualityBatch> {
    let mut quality = parse_json::<SourceQualityBatch>(text)?;
    normalize_source_quality(&mut quality, sources);
    validate_source_quality(&quality, sources)?;
    Ok(quality)
}

fn format_source_ids(sources: &[Source]) -> String {
    sources
        .iter()
        .map(|source| source.id.as_str())
        .collect::<Vec<_>>()
        .join(", ")
}

async fn extract_evidence(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    plan: &ResearchPlan,
    sources: &[Source],
) -> Result<EvidenceBatch> {
    ensure_sources(sources)?;

    let mut notes = Vec::new();
    let chunk_size = request.limits.evidence_chunk_size.max(1);
    let chunk_count = sources.len().div_ceil(chunk_size);
    for (index, chunk) in sources.chunks(chunk_size).enumerate() {
        progress_detail(&format!(
            "evidence batch {}/{} ({} sources)",
            index + 1,
            chunk_count,
            chunk.len()
        ));
        let mut batch = extract_evidence_chunk(request, llm, plan, chunk).await?;
        validate_evidence(&batch, chunk)?;
        notes.append(&mut batch.notes);
    }

    let evidence = EvidenceBatch { notes };
    validate_evidence(&evidence, sources)?;
    Ok(evidence)
}

async fn extract_evidence_chunk(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    plan: &ResearchPlan,
    sources: &[Source],
) -> Result<EvidenceBatch> {
    let system_prompt = r#"You are the evidence extraction module for a deep research CLI.
Return only JSON. No markdown.

Use only facts present in the provided source text. Do not use model memory.
Extract source-grounded notes that are useful for answering the topic and plan success criteria.
Prefer concrete claims, dates, numbers, definitions, trade-offs, conflicts, and limitations.
Every note must cite exactly one source_id from the provided admitted source list.

JSON shape:
{
  "notes": [
    {
      "source_id": "S1",
      "claim": "string",
      "evidence": "short quote or precise paraphrase from the source text",
      "relevance": "why this matters for the report",
      "limitations": "uncertainty, scope limit, or source caveat"
    }
  ]
}"#;
    let user_prompt = format!(
        "Current date: {}\n\nTopic:\n{}\n\nPlan:\n{}\n\nAdmitted sources:\n{}",
        current_date(),
        request.topic,
        serde_json::to_string_pretty(plan)?,
        format_sources_for_prompt(sources)
    );
    complete_json_with_repair::<EvidenceBatch>(
        llm,
        CompletionRequest {
            model: request.models.worker_model.clone(),
            system_prompt: system_prompt.to_string(),
            user_prompt,
            temperature: 0.0,
            max_completion_tokens: request.limits.max_evidence_tokens,
            json_mode: true,
        },
        "evidence extraction",
        system_prompt,
    )
    .await
}

async fn fill_evidence_gaps(
    request: &ResearchRequest,
    clients: &ResearchClients<'_>,
    plan: &ResearchPlan,
    state: &mut ResearchState<'_>,
) -> Result<()> {
    for iteration in 1..request.limits.max_iterations {
        if state.sources.len() >= request.limits.max_sources {
            progress_detail("gap loop stopped: source cap reached");
            break;
        }

        let admitted = admitted_sources(state.sources, request.limits.min_source_score);
        progress_detail(&format!(
            "gap pass {}/{} with {} admitted sources",
            iteration,
            request.limits.max_iterations - 1,
            admitted.len()
        ));
        let gap = analyze_gaps(request, clients.llm, plan, &admitted, state.evidence).await?;
        if gap.sufficient || gap.follow_up_queries.is_empty() {
            progress_detail("gap pass found evidence sufficient");
            break;
        }

        let previous_source_count = state.sources.len();
        progress_detail(&format!(
            "gap pass launching {} follow-up searches",
            gap.follow_up_queries.len()
        ));
        collect_sources(
            clients.search,
            &gap.follow_up_queries,
            request,
            request.limits.max_sources,
            state.seen_urls,
            state.sources,
        )
        .await?;

        if state.sources.len() == previous_source_count {
            progress_detail("gap pass found no new sources");
            break;
        }

        let fetch_summary = fetch_source_contents(
            clients.document,
            &mut state.sources[previous_source_count..],
            request.limits.max_content_chars,
        )
        .await;
        progress_detail(&format!(
            "gap pass read {} new pages; {} fetches failed",
            fetch_summary.readable, fetch_summary.failed
        ));
        assess_source_quality(
            request,
            clients.llm,
            plan,
            &mut state.sources[previous_source_count..],
        )
        .await?;
        let new_admitted = admitted_sources(
            &state.sources[previous_source_count..],
            request.limits.min_source_score,
        );
        if new_admitted.is_empty() {
            progress_detail("gap pass admitted no new sources");
            continue;
        }

        let new_evidence = extract_evidence(request, clients.llm, plan, &new_admitted).await?;
        state.evidence.notes.extend(new_evidence.notes);
        let all_admitted = admitted_sources(state.sources, request.limits.min_source_score);
        validate_evidence(state.evidence, &all_admitted)?;
    }

    Ok(())
}

#[derive(Debug, Default, Clone, Copy)]
struct FetchSummary {
    readable: usize,
    failed: usize,
}

fn progress_stage(step: &str, message: &str) {
    eprintln!("dr: [{step}] {message}");
}

fn progress_detail(message: &str) {
    eprintln!("dr:        {message}");
}

fn truncate_for_progress(value: &str) -> String {
    const MAX_CHARS: usize = 96;

    let mut output = value.chars().take(MAX_CHARS).collect::<String>();
    if value.chars().count() > MAX_CHARS {
        output.push_str("...");
    }
    output
}

async fn analyze_gaps(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    plan: &ResearchPlan,
    sources: &[Source],
    evidence: &EvidenceBatch,
) -> Result<GapAnalysis> {
    let system_prompt = format!(
        r#"You are the evaluator/planner module for an iterative deep research agent.
Return only JSON. No markdown.

Assess whether the current evidence is sufficient for a high-quality report against the plan's
success criteria and source requirements. Mark sufficient=false when evidence lacks benchmarks,
primary sources, recency, counterevidence, implementation details, or independent support.

When more research is needed, propose at most {max_searches} Brave-compatible follow-up queries.
Do not repeat the existing queries exactly. Prefer primary sources, benchmarks, repos, docs, and critiques.

JSON shape:
{{
  "sufficient": true,
  "assessment": "string",
  "missing_information": ["string"],
  "follow_up_queries": [
    {{ "query": "string", "rationale": "string", "perspective": "string", "source_type": "string" }}
  ]
}}"#,
        max_searches = request.limits.max_searches
    );
    let user_prompt = format!(
        "Current date: {}\n\nTopic:\n{}\n\nPlan:\n{}\n\nAdmitted sources:\n{}\n\nEvidence:\n{}",
        current_date(),
        request.topic,
        serde_json::to_string_pretty(plan)?,
        format_source_register(sources),
        serde_json::to_string_pretty(evidence)?
    );
    let mut gap = complete_json_with_repair::<GapAnalysis>(
        llm,
        CompletionRequest {
            model: request.models.planner_model.clone(),
            system_prompt: system_prompt.clone(),
            user_prompt,
            temperature: request.models.temperature,
            max_completion_tokens: request.limits.max_plan_tokens,
            json_mode: true,
        },
        "gap analysis",
        &system_prompt,
    )
    .await?;
    gap.follow_up_queries.truncate(request.limits.max_searches);
    validate_gap_analysis(&gap)?;
    Ok(gap)
}

async fn write_report(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    plan: &ResearchPlan,
    sources: &[Source],
    evidence: &EvidenceBatch,
) -> Result<String> {
    let system_prompt = r#"You are the final writer for a deep research CLI used by autonomous coding agents.
Write a source-grounded Markdown report that reads like a fantastic scientific short paper.
Use simple language, but keep the analysis rigorous. Do not return JSON.

Mandatory structure:
# <descriptive title>
## Abstract
## Research Question
## Method
## Conceptual Background
## Findings
## Design Implications
## Limitations and Threats to Validity
## Open Questions
## Recommended Next Experiments

Required writing style:
- Write like a concise scientific report, not a consultant memo, marketing article, or generic AI summary.
- Use plain verbs and short paragraphs.
- Explain underlying concepts before using them in the findings.
- Prefer concrete mechanisms, source names, algorithms, metrics, and failure modes.
- Include 2-5 Markdown tables when they improve comparison, evidence density, or decision-making.
- Include a compact evidence table with columns like Claim, Evidence, Source, Limits.
- Include a short concept table when the topic has terms of art.
- Include short direct quotes only when the evidence note appears to be a quote; keep each quote under 25 words.
- Add "Insight:" paragraphs only when they connect evidence to a mechanism or design implication.
- Use uncertainty scientifically: state what the evidence supports, what it does not establish, and why.

Rules:
- Cite claims inline with [S#] source markers from the admitted source register.
- Do not cite source IDs that are absent from the admitted source register.
- Use the evidence notes and admitted source register, not model memory.
- Use the provided current date for temporal reasoning; do not call dates before it future dates.
- Distinguish source-backed findings from inference.
- Mention conflicts, weak evidence, stale evidence, vendor bias, or missing information directly.
- Do not invent URLs, papers, dates, prices, APIs, benchmarks, quotes, or names.
- Do not include a "Key Takeaways" section.
- Do not use dramatic headings, motivational endings, or stock phrases such as "delve", "unlock", "game changer", "robust", "seamless", or "cutting-edge"."#;

    let user_prompt = format!(
        "Current date: {}\n\nTopic:\n{}\n\nPlan:\n{}\n\nEvidence:\n{}\n\nAdmitted source register:\n{}",
        current_date(),
        request.topic,
        serde_json::to_string_pretty(plan)?,
        serde_json::to_string_pretty(evidence)?,
        format_source_register(sources)
    );

    let text = llm
        .complete(CompletionRequest {
            model: request.models.writer_model.clone(),
            system_prompt: system_prompt.to_string(),
            user_prompt,
            temperature: request.models.temperature,
            max_completion_tokens: request.limits.max_report_tokens,
            json_mode: false,
        })
        .await?;

    let body = text.trim().to_string();
    if body.is_empty() {
        return Err(DrError::InvalidReport(
            "writer returned an empty report".to_string(),
        ));
    }

    Ok(body)
}

async fn extract_report_claims(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    body: &str,
    sources: &[Source],
) -> Result<ReportClaims> {
    let system_prompt = format!(
        r#"You are the claim extraction module for a deep research report verifier.
Return only JSON. No markdown.

Extract up to {max_claims} material factual claims from the report that require source support.
Include the cited source IDs exactly as S1, S2, etc. Ignore purely structural headings.
Ignore report-internal limitation statements about missing admitted evidence, such as "no admitted
source provides..." or "the admitted source register lacks..."; those are audit statements, not
source-backed factual claims.

JSON shape:
{{
  "claims": [
    {{ "claim": "string", "citations": ["S1"] }}
  ]
}}"#,
        max_claims = request.limits.max_claims
    );
    let user_prompt = format!(
        "Report:\n{}\n\nKnown admitted source IDs:\n{}",
        body,
        format_source_register(sources)
    );
    let mut claims = complete_json_with_repair::<ReportClaims>(
        llm,
        CompletionRequest {
            model: request.models.worker_model.clone(),
            system_prompt: system_prompt.clone(),
            user_prompt,
            temperature: 0.0,
            max_completion_tokens: request.limits.max_evidence_tokens,
            json_mode: true,
        },
        "report claim extraction",
        &system_prompt,
    )
    .await?;
    claims.claims.truncate(request.limits.max_claims);
    normalize_report_claim_citations(&mut claims);
    validate_report_claims(&claims, sources)?;
    Ok(claims)
}

async fn refine_report(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    body: &str,
    verification: &ClaimVerificationBatch,
    sources: &[Source],
    evidence: &EvidenceBatch,
) -> Result<String> {
    let system_prompt = r#"You are the refiner for a scientific short-paper style deep research report after claim verification.
Return only revised Markdown. Do not return JSON.

Revise the report so every material factual claim is directly supported by the cited evidence.
For every verifier verdict with supported=false or citation_association=false, remove that exact
claim, replace it with a narrower supported claim, or move it to Open Questions as an unresolved
question. Do not keep rejected claims in declarative form.
If the verifier says the evidence does not mention a phenomenon, delete that phenomenon from
findings and implications instead of adding a weak citation.
Keep the scientific short-paper structure:
Abstract, Research Question, Method, Conceptual Background, Findings, Design Implications,
Limitations and Threats to Validity, Open Questions, Recommended Next Experiments.
Use only known [S#] citations from the admitted source register.
Use the provided current date for temporal reasoning; do not call dates before it future dates.
Preserve useful tables and add or repair tables when they make evidence easier to audit.
Do not invent new sources, URLs, papers, benchmarks, dates, quotes, or names.
Do not add generic prose, motivational endings, or dramatic headings."#;
    let user_prompt = format!(
        "Current date: {}\n\nTopic:\n{}\n\nOriginal report:\n{}\n\nVerifier verdicts:\n{}\n\nEvidence:\n{}\n\nAdmitted source register:\n{}",
        current_date(),
        request.topic,
        body,
        serde_json::to_string_pretty(verification)?,
        serde_json::to_string_pretty(evidence)?,
        format_source_register(sources)
    );
    let text = llm
        .complete(CompletionRequest {
            model: request.models.writer_model.clone(),
            system_prompt: system_prompt.to_string(),
            user_prompt,
            temperature: 0.0,
            max_completion_tokens: request.limits.max_report_tokens,
            json_mode: false,
        })
        .await?;

    let refined = text.trim().to_string();
    if refined.is_empty() {
        return Err(DrError::InvalidReport(
            "refiner returned an empty report".to_string(),
        ));
    }

    Ok(refined)
}

async fn prune_unsupported_claims(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    body: &str,
    verification: &ClaimVerificationBatch,
    sources: &[Source],
    evidence: &EvidenceBatch,
) -> Result<String> {
    let system_prompt = r#"You are the final claim-pruning editor for a scientific short-paper style deep research report.
Return only revised Markdown. Do not return JSON.

The verifier still found unsupported or citation-mismatched claims after refinement.
Your job is deletion, not persuasion:
- Remove every unsupported declarative claim named in the verifier verdicts.
- Do not keep the same claim with softer wording.
- Do not add new citations to rescue the claim.
- Do not introduce new facts, sources, papers, benchmarks, dates, quotes, tools, or names.
- If an unsupported idea is important, mention it only as a neutral question in Open Questions.
- Preserve supported claims, tables, citations, and the scientific short-paper structure.
- Keep: Abstract, Research Question, Method, Conceptual Background, Findings, Design Implications,
  Limitations and Threats to Validity, Open Questions, Recommended Next Experiments."#;
    let user_prompt = format!(
        "Current date: {}\n\nTopic:\n{}\n\nCurrent report:\n{}\n\nVerifier verdicts:\n{}\n\nEvidence:\n{}\n\nAdmitted source register:\n{}",
        current_date(),
        request.topic,
        body,
        serde_json::to_string_pretty(verification)?,
        serde_json::to_string_pretty(evidence)?,
        format_source_register(sources)
    );
    let text = llm
        .complete(CompletionRequest {
            model: request.models.writer_model.clone(),
            system_prompt: system_prompt.to_string(),
            user_prompt,
            temperature: 0.0,
            max_completion_tokens: request.limits.max_report_tokens,
            json_mode: false,
        })
        .await?;

    let pruned = text.trim().to_string();
    if pruned.is_empty() {
        return Err(DrError::InvalidReport(
            "claim pruner returned an empty report".to_string(),
        ));
    }

    Ok(pruned)
}

async fn verify_claims(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    claims: &ReportClaims,
    sources: &[Source],
    evidence: &EvidenceBatch,
) -> Result<ClaimVerificationBatch> {
    let system_prompt = r#"You are the claim and citation-association verifier for a deep research CLI.
Return only JSON. No markdown.

For each claim, decide whether the provided evidence supports the claim and whether the cited source IDs
specifically support that claim. Set supported=true only when the evidence supports the claim.
Set citation_association=true only when the citations attached to that claim point to sources that
directly support the claim. Set false for missing, overstated, uncited, or source-mismatched claims.

JSON shape:
{
  "verdicts": [
    {
      "claim": "string",
      "citations": ["S1"],
      "supported": true,
      "citation_association": true,
      "reason": "string"
    }
  ]
}"#;
    let user_prompt = format!(
        "Claims:\n{}\n\nEvidence notes:\n{}\n\nAdmitted source excerpts:\n{}\n\nAdmitted source register:\n{}",
        serde_json::to_string_pretty(claims)?,
        serde_json::to_string_pretty(evidence)?,
        format_sources_for_verifier_prompt(sources),
        format_source_register(sources)
    );
    let verification = complete_json_with_repair::<ClaimVerificationBatch>(
        llm,
        CompletionRequest {
            model: request.models.worker_model.clone(),
            system_prompt: system_prompt.to_string(),
            user_prompt,
            temperature: 0.0,
            max_completion_tokens: request.limits.max_evidence_tokens,
            json_mode: true,
        },
        "claim verification",
        system_prompt,
    )
    .await?;
    if verification.verdicts.len() != claims.claims.len() {
        return Err(DrError::InvalidReport(format!(
            "claim verifier returned {} verdicts for {} claims",
            verification.verdicts.len(),
            claims.claims.len()
        )));
    }
    Ok(verification)
}

async fn evaluate_report(
    request: &ResearchRequest,
    llm: &dyn LlmClient,
    body: &str,
    plan: &ResearchPlan,
    sources: &[Source],
    evidence: &EvidenceBatch,
    verification: &ClaimVerificationBatch,
) -> Result<ReportEvaluation> {
    let system_prompt = r#"You are the final evaluator for a scientific short-paper style deep research report.
Return only JSON. No markdown.

Score from 0 to 5:
- coverage: addresses the research goal, subquestions, perspectives, and success criteria.
- citation_quality: citation density, citation-source association, and traceability.
- factuality: claims are supported by evidence and verification verdicts.
- analysis_depth: explains underlying concepts, synthesizes mechanisms, compares approaches, surfaces trade-offs, counterevidence, limitations, and non-obvious insights.
- presentation: reads like a clear scientific short paper with simple language, useful tables, evidence-backed insights, and no generic AI filler.
- overall: holistic score, not a simple average if a critical flaw exists.

Penalize reports that:
- use a generic Executive Summary / Key Takeaways memo structure instead of scientific short-paper sections.
- omit evidence tables when comparison or source audit would benefit from one.
- hide missing evidence instead of stating limitations.
- include generic AI prose, dramatic headings, or unsupported state-of-the-art claims.

JSON shape:
{
  "coverage": 4,
  "citation_quality": 4,
  "factuality": 4,
  "analysis_depth": 4,
  "presentation": 4,
  "overall": 4,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "follow_up_recommendations": ["string"]
}"#;
    let user_prompt = format!(
        "Current date: {}\n\nTopic:\n{}\n\nPlan:\n{}\n\nReport:\n{}\n\nEvidence:\n{}\n\nClaim verification:\n{}\n\nAdmitted source register:\n{}",
        current_date(),
        request.topic,
        serde_json::to_string_pretty(plan)?,
        body,
        serde_json::to_string_pretty(evidence)?,
        serde_json::to_string_pretty(verification)?,
        format_source_register(sources)
    );
    complete_json_with_repair::<ReportEvaluation>(
        llm,
        CompletionRequest {
            model: request.models.worker_model.clone(),
            system_prompt: system_prompt.to_string(),
            user_prompt,
            temperature: 0.0,
            max_completion_tokens: request.limits.max_evidence_tokens,
            json_mode: true,
        },
        "report evaluation",
        system_prompt,
    )
    .await
}

fn validate_plan(plan: &ResearchPlan) -> Result<()> {
    if plan.research_goal.trim().is_empty() {
        return Err(DrError::InvalidPlan(
            "research_goal must not be empty".to_string(),
        ));
    }

    if plan.subquestions.is_empty() {
        return Err(DrError::InvalidPlan(
            "subquestions must not be empty".to_string(),
        ));
    }

    if plan.perspectives.is_empty() {
        return Err(DrError::InvalidPlan(
            "perspectives must not be empty".to_string(),
        ));
    }

    if plan.source_requirements.is_empty() {
        return Err(DrError::InvalidPlan(
            "source_requirements must not be empty".to_string(),
        ));
    }

    if plan.success_criteria.is_empty() {
        return Err(DrError::InvalidPlan(
            "success_criteria must not be empty".to_string(),
        ));
    }

    if plan.search_queries.is_empty() {
        return Err(DrError::InvalidPlan(
            "search_queries must not be empty".to_string(),
        ));
    }

    if let Some(query) = plan
        .search_queries
        .iter()
        .find(|query| query.query.trim().is_empty())
    {
        return Err(DrError::InvalidPlan(format!(
            "search query has empty text: {query:?}"
        )));
    }

    Ok(())
}

fn validate_gap_analysis(gap: &GapAnalysis) -> Result<()> {
    if gap.assessment.trim().is_empty() {
        return Err(DrError::InvalidPlan(
            "gap assessment must not be empty".to_string(),
        ));
    }

    if let Some(query) = gap
        .follow_up_queries
        .iter()
        .find(|query| query.query.trim().is_empty())
    {
        return Err(DrError::InvalidPlan(format!(
            "follow-up query has empty text: {query:?}"
        )));
    }

    Ok(())
}

fn validate_source_quality(quality: &SourceQualityBatch, sources: &[Source]) -> Result<()> {
    let source_ids = sources
        .iter()
        .map(|source| source.id.as_str())
        .collect::<BTreeSet<_>>();
    let scored_ids = quality
        .scores
        .iter()
        .map(|score| score.source_id.as_str())
        .collect::<BTreeSet<_>>();

    if source_ids != scored_ids {
        return Err(DrError::InvalidEvidence(
            "source quality response did not score exactly the provided sources".to_string(),
        ));
    }

    for score in &quality.scores {
        if score.relevance > 5
            || score.authority > 5
            || score.freshness > 5
            || score.independence > 5
        {
            return Err(DrError::InvalidEvidence(format!(
                "source quality score out of range for {}",
                score.source_id
            )));
        }
    }

    Ok(())
}

fn validate_evidence(evidence: &EvidenceBatch, sources: &[Source]) -> Result<()> {
    if evidence.notes.is_empty() {
        return Err(DrError::InvalidEvidence(
            "evidence extraction returned no notes".to_string(),
        ));
    }

    let source_ids = sources
        .iter()
        .map(|source| source.id.as_str())
        .collect::<BTreeSet<_>>();
    let invalid_ids = evidence
        .notes
        .iter()
        .filter(|note| !source_ids.contains(note.source_id.as_str()))
        .map(|note| note.source_id.clone())
        .collect::<BTreeSet<_>>();

    if !invalid_ids.is_empty() {
        return Err(DrError::InvalidEvidence(format!(
            "evidence cited unknown or rejected source IDs: {}",
            invalid_ids.into_iter().collect::<Vec<_>>().join(", ")
        )));
    }

    Ok(())
}

fn validate_report_claims(claims: &ReportClaims, sources: &[Source]) -> Result<()> {
    if claims.claims.is_empty() {
        return Err(DrError::InvalidReport(
            "claim extractor returned no material claims".to_string(),
        ));
    }

    let source_ids = sources
        .iter()
        .map(|source| source.id.as_str())
        .collect::<BTreeSet<_>>();
    for claim in &claims.claims {
        if claim.claim.trim().is_empty() {
            return Err(DrError::InvalidReport(
                "claim extractor returned an empty claim".to_string(),
            ));
        }
        if claim.citations.is_empty() {
            if is_missing_admitted_evidence_claim(&claim.claim) {
                continue;
            }
            return Err(DrError::InvalidReport(format!(
                "claim has no citations: {}",
                claim.claim
            )));
        }
        if let Some(citation) = claim
            .citations
            .iter()
            .find(|citation| !source_ids.contains(citation.as_str()))
        {
            return Err(DrError::InvalidReport(format!(
                "claim cited unknown or rejected source ID `{citation}`"
            )));
        }
    }

    Ok(())
}

fn is_missing_admitted_evidence_claim(claim: &str) -> bool {
    let lower = claim.to_ascii_lowercase();
    [
        "no admitted source",
        "admitted source register lacks",
        "absent from the admitted source",
        "not represented in the admitted source",
        "admitted sources do not provide",
        "admitted evidence does not provide",
    ]
    .iter()
    .any(|marker| lower.contains(marker))
}

fn validate_claim_verification(
    verification: &ClaimVerificationBatch,
    sources: &[Source],
) -> Result<()> {
    let source_ids = sources
        .iter()
        .map(|source| source.id.as_str())
        .collect::<BTreeSet<_>>();
    let unsupported = verification
        .verdicts
        .iter()
        .filter(|verdict| !verdict.supported || !verdict.citation_association)
        .map(|verdict| verdict.claim.clone())
        .collect::<Vec<_>>();

    if !unsupported.is_empty() {
        return Err(DrError::InvalidReport(format!(
            "claim verifier found unsupported or citation-mismatched claims: {}",
            unsupported.join("; ")
        )));
    }

    for verdict in &verification.verdicts {
        if let Some(citation) = verdict
            .citations
            .iter()
            .find(|citation| !source_ids.contains(citation.as_str()))
        {
            return Err(DrError::InvalidReport(format!(
                "claim verifier cited unknown or rejected source ID `{citation}`"
            )));
        }
    }

    Ok(())
}

fn validate_report_evaluation(evaluation: &ReportEvaluation) -> Result<()> {
    let scores = [
        evaluation.coverage,
        evaluation.citation_quality,
        evaluation.factuality,
        evaluation.analysis_depth,
        evaluation.presentation,
        evaluation.overall,
    ];

    if scores.into_iter().any(|score| score > 5) {
        return Err(DrError::InvalidReport(
            "report evaluation scores must be between 0 and 5".to_string(),
        ));
    }

    Ok(())
}

fn has_unsupported_claims(verification: &ClaimVerificationBatch) -> bool {
    verification
        .verdicts
        .iter()
        .any(|verdict| !verdict.supported || !verdict.citation_association)
}

fn ensure_sources(sources: &[Source]) -> Result<()> {
    if sources.is_empty() {
        return Err(DrError::InvalidPlan(
            "search did not return any admitted sources for the planned queries".to_string(),
        ));
    }

    Ok(())
}

fn uses_gap_loop(strategy: StrategyName) -> bool {
    matches!(
        strategy,
        StrategyName::DeepAgentV1 | StrategyName::RecursiveGapV1
    )
}

fn initial_source_cap(max_sources: usize) -> usize {
    let reserved_for_gap = (max_sources / 4).max(1);
    max_sources.saturating_sub(reserved_for_gap).max(1)
}

fn augment_plan_queries(request: &ResearchRequest, plan: &mut ResearchPlan) {
    let entities = comparison_entities(&request.topic);
    for entity in &entities {
        if plan
            .search_queries
            .iter()
            .any(|query| is_dedicated_entity_query(&query.query, entity, &entities))
        {
            continue;
        }

        let query = PlannedSearchQuery {
            query: format!(
                "{entity} official GitHub repository documentation deep research agent 2026"
            ),
            rationale: format!("Ensure explicit coverage for named comparison target {entity}."),
            perspective: "entity coverage".to_string(),
            source_type: "repo/docs/benchmark".to_string(),
        };

        if plan.search_queries.len() < request.limits.max_searches {
            plan.search_queries.push(query);
        } else if let Some(index) = replacement_query_index(plan, &entities) {
            plan.search_queries[index] = query;
        } else {
            break;
        }
    }

    if is_static_analysis_data_flow_topic(&request.topic) {
        ensure_planned_query(
            plan,
            request.limits.max_searches,
            PlannedSearchQuery {
                query:
                    "CodeQL data flow analysis taint tracking architecture official documentation"
                        .to_string(),
                rationale: "Ensure coverage of CodeQL's data-flow and taint architecture."
                    .to_string(),
                perspective: "production tools".to_string(),
                source_type: "docs".to_string(),
            },
        );
        ensure_planned_query(
            plan,
            request.limits.max_searches,
            PlannedSearchQuery {
                query: "FlowDroid context object field flow sensitive taint analysis Android paper"
                    .to_string(),
                rationale: "Ensure coverage of FlowDroid as a classical taint-analysis baseline."
                    .to_string(),
                perspective: "production tools".to_string(),
                source_type: "paper".to_string(),
            },
        );
        ensure_planned_query(
            plan,
            request.limits.max_searches,
            PlannedSearchQuery {
                query: "Semgrep taint mode dataflow analysis interprocedural documentation"
                    .to_string(),
                rationale: "Ensure coverage of Semgrep's practical dataflow analysis model."
                    .to_string(),
                perspective: "production tools".to_string(),
                source_type: "docs".to_string(),
            },
        );
        ensure_planned_query(
            plan,
            request.limits.max_searches,
            PlannedSearchQuery {
                query: "Juliet Big-Vul Devign data flow analysis benchmark precision recall"
                    .to_string(),
                rationale:
                    "Ensure benchmark and dataset coverage for evaluating data-flow accuracy."
                        .to_string(),
                perspective: "benchmarks".to_string(),
                source_type: "benchmark".to_string(),
            },
        );
        ensure_planned_query(
            plan,
            request.limits.max_searches,
            PlannedSearchQuery {
                query: "DFA-GNN+ data-flow analysis graph neural network 2025 paper".to_string(),
                rationale: "Ensure coverage of recent GNN work designed around data-flow analysis."
                    .to_string(),
                perspective: "ML approaches".to_string(),
                source_type: "paper".to_string(),
            },
        );
        ensure_planned_query(
            plan,
            request.limits.max_searches,
            PlannedSearchQuery {
                query:
                    "learned data-flow analysis program analysis GNN taint vulnerability 2024 2025"
                        .to_string(),
                rationale: "Find additional recent ML or neural program-analysis approaches."
                    .to_string(),
                perspective: "ML approaches".to_string(),
                source_type: "paper".to_string(),
            },
        );
        ensure_planned_query(
            plan,
            request.limits.max_searches,
            PlannedSearchQuery {
                query: "DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid"
                    .to_string(),
                rationale: "Find benchmark evidence beyond tool documentation.".to_string(),
                perspective: "benchmarks".to_string(),
                source_type: "benchmark".to_string(),
            },
        );
    }
}

fn is_static_analysis_data_flow_topic(topic: &str) -> bool {
    let lower = topic.to_ascii_lowercase();
    lower.contains("data flow")
        && (lower.contains("static analysis")
            || lower.contains("taint")
            || lower.contains("program analysis")
            || lower.contains("code"))
}

fn ensure_planned_query(plan: &mut ResearchPlan, max_searches: usize, query: PlannedSearchQuery) {
    if plan
        .search_queries
        .iter()
        .any(|existing| query_matches_focus(&existing.query, &query.query))
    {
        return;
    }

    if plan.search_queries.len() < max_searches {
        plan.search_queries.push(query);
        return;
    }

    if let Some(index) = replaceable_query_index(plan) {
        plan.search_queries[index] = query;
    }
}

fn query_matches_focus(existing: &str, desired: &str) -> bool {
    desired
        .split_whitespace()
        .filter(|term| term.len() >= 5)
        .take(2)
        .all(|term| contains_normalized(existing, term))
}

fn replaceable_query_index(plan: &ResearchPlan) -> Option<usize> {
    plan.search_queries.iter().rposition(|query| {
        let lower = query.query.to_ascii_lowercase();
        ![
            "codeql",
            "flowdroid",
            "semgrep",
            "joern",
            "svf",
            "ifds",
            "ide",
            "benchmark",
            "juliet",
            "big-vul",
            "devign",
            "gnn",
            "llm",
            "machine learning",
        ]
        .iter()
        .any(|term| lower.contains(term))
    })
}

fn comparison_entities(topic: &str) -> Vec<String> {
    let lower = topic.to_ascii_lowercase();
    let Some(start) = lower
        .find("comparing ")
        .map(|index| index + "comparing ".len())
        .or_else(|| lower.find("compare ").map(|index| index + "compare ".len()))
    else {
        return Vec::new();
    };

    let tail = &topic[start..];
    let tail = tail
        .split(['?', '.', ';'])
        .next()
        .unwrap_or(tail)
        .replace(" and ", ",");

    tail.split(',')
        .map(|part| {
            part.trim()
                .trim_matches(|character| matches!(character, '"' | '\'' | ':' | '-' | ' '))
                .trim_start_matches("and ")
                .trim_start_matches("or ")
                .to_string()
        })
        .filter(|entity| entity.len() > 1 && entity.len() <= 80)
        .collect()
}

fn contains_normalized(haystack: &str, needle: &str) -> bool {
    haystack
        .to_ascii_lowercase()
        .contains(&needle.to_ascii_lowercase())
}

fn is_dedicated_entity_query(query: &str, entity: &str, entities: &[String]) -> bool {
    contains_normalized(query, entity)
        && entities
            .iter()
            .filter(|candidate| candidate.as_str() != entity)
            .all(|candidate| !contains_normalized(query, candidate))
}

fn replacement_query_index(plan: &ResearchPlan, entities: &[String]) -> Option<usize> {
    plan.search_queries.iter().rposition(|query| {
        !entities.iter().any(|entity| {
            is_dedicated_entity_query(&query.query, entity, entities)
                && query.perspective == "entity coverage"
        })
    })
}

fn admitted_sources(sources: &[Source], min_source_score: u8) -> Vec<Source> {
    sources
        .iter()
        .filter(|source| is_admitted_source(source, min_source_score))
        .cloned()
        .collect()
}

fn is_admitted_source(source: &Source, min_source_score: u8) -> bool {
    let Some(quality) = &source.quality else {
        return false;
    };

    source.fetch_error.is_none()
        && !source.content.trim().is_empty()
        && quality.admitted
        && quality.total_score() >= min_source_score
}

fn normalize_source_quality(quality: &mut SourceQualityBatch, sources: &[Source]) {
    let fetch_errors = sources
        .iter()
        .filter_map(|source| {
            source
                .fetch_error
                .as_ref()
                .map(|error| (source.id.as_str(), error.as_str()))
        })
        .collect::<BTreeMap<_, _>>();

    for score in &mut quality.scores {
        if let Some(error) = fetch_errors.get(score.source_id.as_str()) {
            score.admitted = false;
            score
                .warnings
                .push(format!("fetch failed: {}", sanitize_trace_text(error)));
        }

        score.rationale = sanitize_trace_text(&score.rationale);
        score.warnings = score
            .warnings
            .iter()
            .map(|warning| sanitize_trace_text(warning))
            .collect();
    }
}

fn apply_source_quality(sources: &mut [Source], quality: SourceQualityBatch) -> Result<()> {
    let mut scores = quality
        .scores
        .into_iter()
        .map(|score| (score.source_id.clone(), score))
        .collect::<BTreeMap<_, _>>();

    for source in sources {
        let Some(score) = scores.remove(&source.id) else {
            return Err(DrError::InvalidEvidence(format!(
                "missing source quality score for {}",
                source.id
            )));
        };
        source.quality = Some(score);
    }

    Ok(())
}

fn source_from_hit(
    index: usize,
    query: &PlannedSearchQuery,
    rank: usize,
    hit: SearchHit,
) -> Source {
    Source {
        id: format!("S{index}"),
        title: hit.title,
        url: hit.url,
        description: hit.description,
        extra_snippets: hit.extra_snippets,
        content: String::new(),
        fetch_error: None,
        discovered_by_query: query.query.clone(),
        planned_source_type: query.source_type.clone(),
        rank,
        quality: None,
    }
}

fn normalize_url(value: &str) -> String {
    let Ok(mut url) = Url::parse(value) else {
        return value.trim().to_ascii_lowercase();
    };

    url.set_fragment(None);
    url.set_query(None);
    url.to_string().trim_end_matches('/').to_ascii_lowercase()
}

fn normalize_report_claim_citations(claims: &mut ReportClaims) {
    for claim in &mut claims.claims {
        claim.citations = claim
            .citations
            .iter()
            .map(|citation| {
                citation
                    .trim()
                    .trim_matches(|character| matches!(character, '[' | ']' | ',' | '.'))
                    .to_string()
            })
            .filter(|citation| !citation.is_empty())
            .collect();
    }
}

fn format_sources_for_prompt(sources: &[Source]) -> String {
    sources
        .iter()
        .map(|source| format!("[{}]\n{}\n", source.id, source.grounding_text()))
        .collect::<Vec<_>>()
        .join("\n")
}

fn format_sources_for_verifier_prompt(sources: &[Source]) -> String {
    sources
        .iter()
        .map(|source| {
            format!(
                "[{}]\nTitle: {}\nURL: {}\nExcerpt:\n{}\n",
                source.id,
                source.title,
                source.url,
                truncate_chars(&source.content, 1_200)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn format_sources_for_quality_prompt(sources: &[Source]) -> String {
    sources
        .iter()
        .map(|source| {
            let fetch_status = source
                .fetch_error
                .as_ref()
                .map_or("readable".to_string(), |error| {
                    format!("fetch_error: {}", sanitize_trace_text(error))
                });
            format!(
                "[{}]\nTitle: {}\nURL: {}\nPlanned source type: {}\nSearch snippet: {}\nStatus: {}\nReadable excerpt:\n{}\n",
                source.id,
                source.title,
                source.url,
                source.planned_source_type,
                source.description,
                fetch_status,
                truncate_chars(&source.content, 1_600)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn format_source_register(sources: &[Source]) -> String {
    sources
        .iter()
        .map(|source| {
            let quality = source
                .quality
                .as_ref()
                .map(|score| {
                    format!(
                        "{} score={} admitted={}",
                        score.source_type,
                        score.total_score(),
                        score.admitted
                    )
                })
                .unwrap_or_else(|| "unscored".to_string());
            format!(
                "[{}] {} — {} ({quality})",
                source.id, source.title, source.url
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

fn sanitize_trace_text(value: &str) -> String {
    const MAX_CHARS: usize = 600;

    let collapsed = value
        .replace(['\n', '\r'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let without_html = remove_text_after_marker(&collapsed, "<!DOCTYPE");
    let without_html = remove_text_after_marker(&without_html, "<html");
    let without_script = remove_text_after_marker(&without_html, "<script");
    let without_data_uri = remove_text_after_marker(&without_script, "data:image/");

    let mut output = without_data_uri.chars().take(MAX_CHARS).collect::<String>();
    if without_data_uri.chars().count() > MAX_CHARS {
        output.push_str("...");
    }
    output
}

fn remove_text_after_marker(value: &str, marker: &str) -> String {
    let lower_value = value.to_ascii_lowercase();
    let lower_marker = marker.to_ascii_lowercase();

    lower_value.find(&lower_marker).map_or_else(
        || value.to_string(),
        |index| format!("{}[HTML omitted]", value[..index].trim()),
    )
}

fn parse_json<T>(text: &str) -> Result<T>
where
    T: DeserializeOwned,
{
    serde_json::from_str(text.trim()).map_err(DrError::Json)
}

async fn complete_json_with_repair<T>(
    llm: &dyn LlmClient,
    request: CompletionRequest,
    label: &str,
    schema_contract: &str,
) -> Result<T>
where
    T: DeserializeOwned,
{
    let text = llm.complete(request.clone()).await?;
    match parse_json::<T>(&text) {
        Ok(value) => Ok(value),
        Err(error) => {
            progress_detail(&format!(
                "repairing {label} JSON after parse error: {}",
                sanitize_trace_text(&error.to_string())
            ));
            let repair_text = llm
                .complete(CompletionRequest {
                    model: request.model.clone(),
                    system_prompt: json_repair_prompt(label),
                    user_prompt: format!(
                        "Expected JSON contract:\n{}\n\nParse error:\n{}\n\nInvalid JSON:\n{}\n\nReturn corrected JSON only.",
                        schema_contract,
                        sanitize_trace_text(&error.to_string()),
                        truncate_chars(&text, 8_000)
                    ),
                    temperature: 0.0,
                    max_completion_tokens: request.max_completion_tokens,
                    json_mode: true,
                })
                .await?;
            parse_json::<T>(&repair_text)
        }
    }
}

fn json_repair_prompt(label: &str) -> String {
    format!(
        r#"You repair malformed JSON for the {label} step of a deep research agent.
Return only valid JSON. No markdown.

Rules:
- Preserve the meaning and IDs from the invalid JSON.
- Do not add new facts, sources, claims, citations, or scores that are not already implied.
- Make the output match the expected JSON contract exactly.
- Include all required arrays and scalar fields from the contract.
- Do not include explanatory text outside the JSON object."#
    )
}

fn current_date() -> chrono::NaiveDate {
    Utc::now().date_naive()
}

#[cfg(test)]
fn dedupe_hits_for_tests(
    searches: std::collections::BTreeMap<String, Vec<SearchHit>>,
    max_sources: usize,
) -> Vec<Source> {
    let mut sources = Vec::new();
    let mut seen_urls = BTreeSet::new();

    for (query, hits) in searches {
        let planned = PlannedSearchQuery {
            query,
            rationale: "rationale".to_string(),
            perspective: "primary".to_string(),
            source_type: "docs".to_string(),
        };
        for (rank_index, hit) in hits.into_iter().enumerate() {
            if seen_urls.insert(normalize_url(&hit.url)) {
                sources.push(source_from_hit(
                    sources.len() + 1,
                    &planned,
                    rank_index + 1,
                    hit,
                ));
            }

            if sources.len() >= max_sources {
                return sources;
            }
        }
    }

    sources
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::{
        augment_plan_queries, dedupe_hits_for_tests, initial_source_cap, is_admitted_source,
        is_missing_admitted_evidence_claim, sanitize_trace_text, validate_evidence, validate_plan,
        validate_report_claims, validate_report_evaluation, validate_source_quality,
    };
    use crate::config::EffortLimits;
    use crate::strategy::ResearchRequest;
    use crate::types::{
        EvidenceBatch, EvidenceNote, PlannedSearchQuery, ReportClaim, ReportClaims,
        ReportEvaluation, ResearchPerspective, ResearchPlan, SearchHit, Source, SourceQuality,
        SourceQualityBatch,
    };
    use crate::{Effort, ModelSelection, StrategyName};

    #[test]
    fn validate_plan_should_reject_empty_search_queries() {
        let mut plan = plan();
        plan.search_queries = Vec::new();
        let error = validate_plan(&plan).unwrap_err().to_string();

        assert!(error.contains("search_queries"));
    }

    #[test]
    fn validate_source_quality_should_reject_missing_scores() {
        let batch = SourceQualityBatch { scores: Vec::new() };
        let error = validate_source_quality(&batch, &[source("S1")])
            .unwrap_err()
            .to_string();

        assert!(error.contains("score"));
    }

    #[test]
    fn admitted_source_should_require_fetch_and_minimum_quality_score() {
        let mut source = source("S1");
        source.quality = Some(quality("S1", true, 12));

        assert!(is_admitted_source(&source, 10));
    }

    #[test]
    fn sanitize_trace_text_should_omit_uppercase_html_bodies() {
        let sanitized = sanitize_trace_text(
            "Source fetch API returned HTTP 403 Forbidden: <HTML><HEAD><TITLE>Access Denied</TITLE></HEAD></HTML>",
        );

        assert_eq!(
            sanitized,
            "Source fetch API returned HTTP 403 Forbidden:[HTML omitted]"
        );
    }

    #[test]
    fn missing_admitted_evidence_claims_should_not_require_citations() {
        assert!(is_missing_admitted_evidence_claim(
            "No admitted source provides a benchmark that directly measures DFG edge accuracy."
        ));
        assert!(!is_missing_admitted_evidence_claim(
            "SVF uses sparse value-flow analysis."
        ));
    }

    #[test]
    fn augment_plan_queries_should_cover_named_comparison_entities() {
        let mut plan = plan();
        plan.search_queries = vec![planned_query("NVIDIA AI-Q architecture")];
        let mut limits = EffortLimits::for_effort(Effort::Light);
        limits.max_searches = 3;
        let request = request(
            "Compare NVIDIA AI-Q, Open Deep Research, and GPT-Researcher",
            limits,
        );

        augment_plan_queries(&request, &mut plan);

        assert!(
            plan.search_queries
                .iter()
                .any(|query| query.query.contains("GPT-Researcher"))
        );
    }

    #[test]
    fn augment_plan_queries_should_replace_combined_queries_when_budget_is_tight() {
        let mut plan = plan();
        plan.search_queries = vec![
            planned_query("NVIDIA AI-Q architecture"),
            planned_query("Open Deep Research architecture"),
            planned_query("Open Deep Research vs GPT-Researcher benchmark comparison"),
        ];
        let mut limits = EffortLimits::for_effort(Effort::Light);
        limits.max_searches = 3;
        let request = request(
            "Compare NVIDIA AI-Q, Open Deep Research, and GPT-Researcher",
            limits,
        );

        augment_plan_queries(&request, &mut plan);

        assert!(plan.search_queries.iter().any(|query| query.query
            == "GPT-Researcher official GitHub repository documentation deep research agent 2026"));
    }

    #[test]
    fn initial_source_cap_should_reserve_gap_budget() {
        assert_eq!(initial_source_cap(36), 27);
        assert_eq!(initial_source_cap(1), 1);
    }

    #[test]
    fn augment_plan_queries_should_cover_static_analysis_tool_families() {
        let mut plan = plan();
        plan.search_queries = vec![planned_query("SVF value flow analysis")];
        let mut limits = EffortLimits::for_effort(Effort::Standard);
        limits.max_searches = 6;
        let request = request(
            "how to build accurate data flow graphs of code for a static analysis engine",
            limits,
        );

        augment_plan_queries(&request, &mut plan);

        assert!(
            plan.search_queries
                .iter()
                .any(|query| query.query.contains("CodeQL"))
        );
        assert!(
            plan.search_queries
                .iter()
                .any(|query| query.query.contains("FlowDroid"))
        );
        assert!(
            plan.search_queries
                .iter()
                .any(|query| query.query.contains("Semgrep"))
        );
        assert!(
            plan.search_queries
                .iter()
                .any(|query| query.query.contains("Juliet"))
        );
    }

    #[test]
    fn validate_evidence_should_reject_unknown_source_ids() {
        let evidence = EvidenceBatch {
            notes: vec![EvidenceNote {
                source_id: "S2".to_string(),
                claim: "claim".to_string(),
                evidence: "evidence".to_string(),
                relevance: "relevance".to_string(),
                limitations: "none".to_string(),
            }],
        };
        let error = validate_evidence(&evidence, &[source("S1")])
            .unwrap_err()
            .to_string();

        assert!(error.contains("S2"));
    }

    #[test]
    fn validate_report_claims_should_reject_uncited_claims() {
        let claims = ReportClaims {
            claims: vec![ReportClaim {
                claim: "claim".to_string(),
                citations: Vec::new(),
            }],
        };
        let error = validate_report_claims(&claims, &[source("S1")])
            .unwrap_err()
            .to_string();

        assert!(error.contains("no citations"));
    }

    #[test]
    fn validate_report_evaluation_should_reject_scores_above_five() {
        let evaluation = ReportEvaluation {
            coverage: 6,
            citation_quality: 4,
            factuality: 4,
            analysis_depth: 4,
            presentation: 4,
            overall: 4,
            strengths: Vec::new(),
            weaknesses: Vec::new(),
            follow_up_recommendations: Vec::new(),
        };
        let error = validate_report_evaluation(&evaluation)
            .unwrap_err()
            .to_string();

        assert!(error.contains("between 0 and 5"));
    }

    #[test]
    fn dedupe_hits_for_tests_should_normalize_urls_and_keep_first_source() {
        let mut searches = BTreeMap::new();
        searches.insert(
            "first".to_string(),
            vec![hit("https://example.com/page?utm=1#section", "First")],
        );
        searches.insert(
            "second".to_string(),
            vec![hit("https://example.com/page", "Second")],
        );

        let sources = dedupe_hits_for_tests(searches, 10);

        assert_eq!(sources.len(), 1);
    }

    #[test]
    fn dedupe_hits_for_tests_should_respect_source_cap() {
        let mut searches = BTreeMap::new();
        searches.insert(
            "query".to_string(),
            vec![
                hit("https://example.com/1", "One"),
                hit("https://example.com/2", "Two"),
            ],
        );

        let sources = dedupe_hits_for_tests(searches, 1);

        assert_eq!(sources.len(), 1);
    }

    fn hit(url: &str, title: &str) -> SearchHit {
        SearchHit {
            title: title.to_string(),
            url: url.to_string(),
            description: "description".to_string(),
            extra_snippets: Vec::new(),
        }
    }

    fn plan() -> ResearchPlan {
        ResearchPlan {
            research_goal: "goal".to_string(),
            assumptions: vec!["assumption".to_string()],
            subquestions: vec!["question".to_string()],
            perspectives: vec![ResearchPerspective {
                name: "primary".to_string(),
                objective: "Find primary sources".to_string(),
            }],
            source_requirements: vec!["primary source".to_string()],
            success_criteria: vec!["cited answer".to_string()],
            search_queries: vec![planned_query("query")],
        }
    }

    fn source(id: &str) -> Source {
        Source {
            id: id.to_string(),
            title: "Title".to_string(),
            url: "https://example.com".to_string(),
            description: "Description".to_string(),
            extra_snippets: Vec::new(),
            content: "Readable content".to_string(),
            fetch_error: None,
            discovered_by_query: "query".to_string(),
            planned_source_type: "primary".to_string(),
            rank: 1,
            quality: None,
        }
    }

    fn quality(id: &str, admitted: bool, total: u8) -> SourceQuality {
        SourceQuality {
            source_id: id.to_string(),
            source_type: "primary".to_string(),
            relevance: total.min(5),
            authority: total.saturating_sub(5).min(5),
            freshness: total.saturating_sub(10).min(5),
            independence: total.saturating_sub(15).min(5),
            admitted,
            rationale: "rationale".to_string(),
            warnings: Vec::new(),
        }
    }

    fn planned_query(query: &str) -> PlannedSearchQuery {
        PlannedSearchQuery {
            query: query.to_string(),
            rationale: "rationale".to_string(),
            perspective: "primary".to_string(),
            source_type: "docs".to_string(),
        }
    }

    fn request(topic: &str, limits: EffortLimits) -> ResearchRequest {
        ResearchRequest {
            topic: topic.to_string(),
            output: None,
            output_dir: "unused".into(),
            effort: Effort::Light,
            strategy: StrategyName::DeepAgentV1,
            limits,
            models: ModelSelection {
                planner_model: "planner".to_string(),
                worker_model: "worker".to_string(),
                writer_model: "writer".to_string(),
                temperature: 0.0,
            },
            search_concurrency: 1,
            search_delay_ms: 0,
        }
    }
}
