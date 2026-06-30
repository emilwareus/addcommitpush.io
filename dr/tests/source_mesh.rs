use std::collections::VecDeque;
use std::path::PathBuf;
use std::sync::Mutex;

use async_trait::async_trait;
use dr::clients::brave::SearchClient;
use dr::clients::fetch::{Document, DocumentClient};
use dr::clients::openrouter::{CompletionRequest, LlmClient};
use dr::strategy::{ResearchRequest, ResearchStrategy, SourceMeshStrategy};
use dr::types::SearchHit;
use dr::{Effort, EffortLimits, ModelSelection, Result, StrategyName};

#[tokio::test]
async fn recursive_gap_strategy_should_write_verified_cited_markdown_report() {
    let temp_dir =
        tempfile::tempdir().unwrap_or_else(|error| panic!("temp dir should create: {error}"));
    let output = temp_dir.path().join("report.md");
    let mut limits = EffortLimits::for_effort(Effort::Light);
    limits.max_iterations = 2;
    limits.max_sources = 4;

    let request = ResearchRequest {
        topic: "deep research architecture".to_string(),
        output: Some(output.clone()),
        output_dir: PathBuf::from("unused"),
        effort: Effort::Light,
        strategy: StrategyName::RecursiveGapV1,
        limits,
        models: ModelSelection {
            planner_model: "planner".to_string(),
            worker_model: "worker".to_string(),
            writer_model: "writer".to_string(),
            temperature: 0.1,
        },
        search_concurrency: 4,
        search_delay_ms: 0,
    };
    let llm = FakeLlm::new(vec![
        r#"{
            "research_goal": "Understand the architecture.",
            "assumptions": ["The answer should focus on public web evidence."],
            "subquestions": ["What stages matter?"],
            "perspectives": [
                { "name": "architecture", "objective": "Identify the system stages." },
                { "name": "benchmark", "objective": "Find evaluation evidence." }
            ],
            "source_requirements": ["primary or benchmark source"],
            "success_criteria": ["cited report", "limitations called out"],
            "search_queries": [
                {
                    "query": "deep research agents survey",
                    "rationale": "Find survey framing.",
                    "perspective": "architecture",
                    "source_type": "survey"
                }
            ]
        }"#,
        r#"{
            "scores": [
                {
                    "source_id": "S1",
                    "source_type": "survey",
                    "relevance": 5,
                    "authority": 4,
                    "freshness": 4,
                    "independence": 4,
                    "admitted": true,
                    "rationale": "Relevant survey source.",
                    "warnings": []
                }
            ]
        }"#,
        r#"{
            "notes": [
                {
                    "source_id": "S1",
                    "claim": "Deep research uses planning, exploration, and report generation.",
                    "evidence": "The source describes planning, web exploration, and report generation.",
                    "relevance": "Defines the pipeline.",
                    "limitations": "Survey-level evidence."
                }
            ]
        }"#,
        r#"{
            "sufficient": false,
            "assessment": "The evidence needs benchmark and implementation context.",
            "missing_information": ["benchmarks"],
            "follow_up_queries": [
                {
                    "query": "deep research benchmarks open source implementations",
                    "rationale": "Find benchmark and implementation evidence.",
                    "perspective": "benchmark",
                    "source_type": "benchmark"
                }
            ]
        }"#,
        r#"{
            "scores": [
                {
                    "source_id": "S2",
                    "source_type": "benchmark",
                    "relevance": 5,
                    "authority": 5,
                    "freshness": 4,
                    "independence": 5,
                    "admitted": true,
                    "rationale": "Relevant benchmark source.",
                    "warnings": []
                }
            ]
        }"#,
        r#"{
            "notes": [
                {
                    "source_id": "S2",
                    "claim": "Modern deep research systems include benchmark-driven evaluation.",
                    "evidence": "The source describes benchmarks and open-source implementations.",
                    "relevance": "Adds evaluation grounding.",
                    "limitations": "Synthetic test fixture."
                }
            ]
        }"#,
        "# Deep Research Architecture\n\n## Executive Summary\nDeep research is a staged process [S1] with benchmark-driven evaluation [S2].\n\n## Key Takeaways\n- Planning matters [S1].\n- Evaluation matters [S2].\n\n## Analysis\nThe architecture should separate search from synthesis [S1] and use verification before finalizing reports [S2].\n\n## Trade-offs and Edge Cases\nSource quality still matters [S1].\n\n## Confidence and Open Questions\nConfidence is medium [S1][S2].\n\n## Next Actions\nRun a broader pass [S2].",
        r#"{
            "claims": [
                {
                    "claim": "Deep research is a staged process.",
                    "citations": ["S1"]
                },
                {
                    "claim": "Modern deep research uses benchmark-driven evaluation.",
                    "citations": ["S2"]
                }
            ]
        }"#,
        r#"{
            "verdicts": [
                {
                    "claim": "Deep research is a staged process.",
                    "citations": ["S1"],
                    "supported": true,
                    "citation_association": true,
                    "reason": "S1 evidence describes planning, exploration, and report generation."
                },
                {
                    "claim": "Modern deep research uses benchmark-driven evaluation.",
                    "citations": ["S2"],
                    "supported": true,
                    "citation_association": true,
                    "reason": "S2 evidence describes benchmark-driven evaluation."
                }
            ]
        }"#,
        r#"{
            "coverage": 4,
            "citation_quality": 4,
            "factuality": 4,
            "analysis_depth": 4,
            "presentation": 4,
            "overall": 4,
            "strengths": ["Cited and structured."],
            "weaknesses": ["Synthetic fixture."],
            "follow_up_recommendations": ["Run broader search."]
        }"#,
    ]);
    let search = FakeSearch;
    let document = FakeDocument;
    let strategy = SourceMeshStrategy;

    let outcome = strategy
        .run(&request, &llm, &search, &document)
        .await
        .unwrap_or_else(|error| panic!("strategy should succeed: {error}"));
    let markdown = tokio::fs::read_to_string(&outcome.path)
        .await
        .unwrap_or_else(|error| panic!("report should be readable: {error}"));

    assert!(markdown.contains("strategy: recursive-gap-v1"));
    assert!(markdown.contains("## Source Register"));
    assert!(markdown.contains("### Claim Verification"));
    assert!(markdown.contains("### Final Evaluation"));
    assert!(markdown.contains("[S2]"));
}

#[tokio::test]
async fn strategy_should_refine_report_when_claim_verifier_rejects_a_claim() {
    let temp_dir =
        tempfile::tempdir().unwrap_or_else(|error| panic!("temp dir should create: {error}"));
    let output = temp_dir.path().join("refined.md");
    let request = ResearchRequest {
        topic: "deep research architecture".to_string(),
        output: Some(output),
        output_dir: PathBuf::from("unused"),
        effort: Effort::Light,
        strategy: StrategyName::SourceMeshV1,
        limits: EffortLimits::for_effort(Effort::Light),
        models: ModelSelection {
            planner_model: "planner".to_string(),
            worker_model: "worker".to_string(),
            writer_model: "writer".to_string(),
            temperature: 0.1,
        },
        search_concurrency: 4,
        search_delay_ms: 0,
    };
    let llm = FakeLlm::new(vec![
        r#"{
            "research_goal": "Understand the architecture.",
            "assumptions": ["The answer should focus on public web evidence."],
            "subquestions": ["What stages matter?"],
            "perspectives": [
                { "name": "architecture", "objective": "Identify the system stages." }
            ],
            "source_requirements": ["primary source"],
            "success_criteria": ["cited report"],
            "search_queries": [
                {
                    "query": "deep research agents survey",
                    "rationale": "Find survey framing.",
                    "perspective": "architecture",
                    "source_type": "survey"
                }
            ]
        }"#,
        r#"{
            "scores": [
                {
                    "source_id": "S1",
                    "source_type": "survey",
                    "relevance": 5,
                    "authority": 4,
                    "freshness": 4,
                    "independence": 4,
                    "admitted": true,
                    "rationale": "Relevant survey source.",
                    "warnings": []
                }
            ]
        }"#,
        r#"{
            "notes": [
                {
                    "source_id": "S1",
                    "claim": "Deep research uses planning and report generation.",
                    "evidence": "The source describes planning and report generation.",
                    "relevance": "Defines the pipeline.",
                    "limitations": "Synthetic evidence."
                }
            ]
        }"#,
        "# Deep Research Architecture\n\n## Executive Summary\nDeep research uses planning [S1] and a secret benchmark [S1].\n\n## Key Takeaways\n- Planning matters [S1].\n\n## Analysis\nThe evidence supports planning and report generation [S1].\n\n## Trade-offs and Edge Cases\nBenchmark claims need more evidence [S1].\n\n## Confidence and Open Questions\nConfidence is low [S1].\n\n## Next Actions\nRun a broader pass [S1].",
        r#"{
            "claims": [
                {
                    "claim": "Deep research uses a secret benchmark.",
                    "citations": ["S1"]
                }
            ]
        }"#,
        r#"{
            "verdicts": [
                {
                    "claim": "Deep research uses a secret benchmark.",
                    "citations": ["S1"],
                    "supported": false,
                    "citation_association": false,
                    "reason": "S1 does not mention a secret benchmark."
                }
            ]
        }"#,
        "# Deep Research Architecture\n\n## Executive Summary\nDeep research uses planning and report generation [S1].\n\n## Key Takeaways\n- Planning matters [S1].\n\n## Analysis\nThe evidence supports planning and report generation [S1].\n\n## Trade-offs and Edge Cases\nBenchmark details remain an open question [S1].\n\n## Confidence and Open Questions\nConfidence is low [S1].\n\n## Next Actions\nRun a broader pass [S1].",
        "{\"claims\":[{\"claim\":\"Deep research uses planning and report generation.\"",
        r#"{
            "claims": [
                {
                    "claim": "Deep research uses planning and report generation.",
                    "citations": ["S1"]
                }
            ]
        }"#,
        r#"{
            "verdicts": [
                {
                    "claim": "Deep research uses planning and report generation.",
                    "citations": ["S1"],
                    "supported": true,
                    "citation_association": true,
                    "reason": "S1 supports planning and report generation."
                }
            ]
        }"#,
        r#"{
            "coverage": 3,
            "citation_quality": 4,
            "factuality": 4,
            "analysis_depth": 3,
            "presentation": 4,
            "overall": 4,
            "strengths": ["Unsupported claim was removed."],
            "weaknesses": ["Single source."],
            "follow_up_recommendations": ["Run broader search."]
        }"#,
    ]);
    let search = FakeSearch;
    let document = FakeDocument;
    let strategy = SourceMeshStrategy;

    let outcome = strategy
        .run(&request, &llm, &search, &document)
        .await
        .unwrap_or_else(|error| panic!("strategy should refine and succeed: {error}"));
    let markdown = tokio::fs::read_to_string(&outcome.path)
        .await
        .unwrap_or_else(|error| panic!("report should be readable: {error}"));

    assert!(markdown.contains("planning and report generation"));
    assert!(!markdown.contains("secret benchmark [S1]"));
}

#[tokio::test]
async fn strategy_should_repair_malformed_source_quality_json() {
    let temp_dir =
        tempfile::tempdir().unwrap_or_else(|error| panic!("temp dir should create: {error}"));
    let output = temp_dir.path().join("repaired-quality.md");
    let request = ResearchRequest {
        topic: "deep research architecture".to_string(),
        output: Some(output),
        output_dir: PathBuf::from("unused"),
        effort: Effort::Light,
        strategy: StrategyName::SourceMeshV1,
        limits: EffortLimits::for_effort(Effort::Light),
        models: ModelSelection {
            planner_model: "planner".to_string(),
            worker_model: "worker".to_string(),
            writer_model: "writer".to_string(),
            temperature: 0.1,
        },
        search_concurrency: 4,
        search_delay_ms: 0,
    };
    let llm = FakeLlm::new(vec![
        r#"{
            "research_goal": "Understand the architecture.",
            "assumptions": ["The answer should focus on public web evidence."],
            "subquestions": ["What stages matter?"],
            "perspectives": [
                { "name": "architecture", "objective": "Identify the system stages." }
            ],
            "source_requirements": ["primary source"],
            "success_criteria": ["cited report"],
            "search_queries": [
                {
                    "query": "deep research agents survey",
                    "rationale": "Find survey framing.",
                    "perspective": "architecture",
                    "source_type": "survey"
                }
            ]
        }"#,
        r#"{
            "scores": [
                {
                    "source_id": "S1",
                    "source_type": "survey",
                    "relevance": 5,
                    "authority": 4,
                    "freshness": 4,
                    "admitted": true,
                    "rationale": "Relevant survey source.",
                    "warnings": []
                }
            ]
        }"#,
        r#"{
            "scores": [
                {
                    "source_id": "S1",
                    "source_type": "survey",
                    "relevance": 5,
                    "authority": 4,
                    "freshness": 4,
                    "independence": 4,
                    "admitted": true,
                    "rationale": "Relevant survey source.",
                    "warnings": []
                }
            ]
        }"#,
        r#"{
            "notes": [
                {
                    "source_id": "S1",
                    "claim": "Deep research uses planning and report generation.",
                    "evidence": "The source describes planning and report generation.",
                    "relevance": "Defines the pipeline.",
                    "limitations": "Synthetic evidence."
                }
            ]
        }"#,
        "# Deep Research Architecture\n\n## Abstract\nDeep research uses planning and report generation [S1].\n\n## Research Question\nWhat stages matter?\n\n## Method\nOne admitted source was reviewed [S1].\n\n## Conceptual Background\nPlanning decomposes the task [S1].\n\n## Findings\nThe evidence supports planning and report generation [S1].\n\n## Design Implications\nSeparate planning from writing [S1].\n\n## Limitations and Threats to Validity\nSingle-source fixture [S1].\n\n## Open Questions\nMore sources are needed [S1].\n\n## Recommended Next Experiments\nRun broader search [S1].",
        r#"{
            "claims": [
                {
                    "claim": "Deep research uses planning and report generation.",
                    "citations": ["S1"]
                }
            ]
        }"#,
        r#"{
            "verdicts": [
                {
                    "claim": "Deep research uses planning and report generation.",
                    "citations": ["S1"],
                    "supported": true,
                    "citation_association": true,
                    "reason": "S1 supports planning and report generation."
                }
            ]
        }"#,
        r#"{
            "coverage": 3,
            "citation_quality": 4,
            "factuality": 4,
            "analysis_depth": 3,
            "presentation": 4,
            "overall": 4,
            "strengths": ["Malformed source-quality JSON was repaired."],
            "weaknesses": ["Single source."],
            "follow_up_recommendations": ["Run broader search."]
        }"#,
    ]);
    let search = FakeSearch;
    let document = FakeDocument;
    let strategy = SourceMeshStrategy;

    let outcome = strategy
        .run(&request, &llm, &search, &document)
        .await
        .unwrap_or_else(|error| panic!("strategy should repair quality JSON: {error}"));
    let markdown = tokio::fs::read_to_string(&outcome.path)
        .await
        .unwrap_or_else(|error| panic!("report should be readable: {error}"));

    assert!(markdown.contains("score=17"));
    assert!(markdown.contains("Deep research uses planning and report generation"));
}

struct FakeLlm {
    responses: Mutex<VecDeque<String>>,
}

impl FakeLlm {
    fn new(responses: Vec<&str>) -> Self {
        Self {
            responses: Mutex::new(responses.into_iter().map(str::to_string).collect()),
        }
    }
}

#[async_trait]
impl LlmClient for FakeLlm {
    async fn complete(&self, _request: CompletionRequest) -> Result<String> {
        let mut responses = self
            .responses
            .lock()
            .unwrap_or_else(|error| panic!("fake llm mutex should lock: {error}"));
        responses
            .pop_front()
            .ok_or_else(|| dr::DrError::InvalidOpenRouterResponse("no fake response".to_string()))
    }
}

struct FakeSearch;

#[async_trait]
impl SearchClient for FakeSearch {
    async fn search(&self, query: &str, _count: u8) -> Result<Vec<SearchHit>> {
        let slug = query.replace(' ', "-");
        Ok(vec![SearchHit {
            title: format!("Result for {query}"),
            url: format!("https://example.com/{slug}"),
            description: format!("Description for {query}."),
            extra_snippets: vec!["Grounded analytical reports.".to_string()],
        }])
    }
}

struct FakeDocument;

#[async_trait]
impl DocumentClient for FakeDocument {
    async fn fetch(&self, url: &str, _max_chars: usize) -> Result<Document> {
        Ok(Document {
            url: url.to_string(),
            text: format!("Readable page text for {url} with planning, benchmarks, and reports."),
        })
    }
}
