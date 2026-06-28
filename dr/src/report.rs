use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};

use crate::config::ModelSelection;
use crate::error::{DrError, Result};
use crate::types::{ClaimVerificationBatch, EvidenceBatch, ReportEvaluation, ResearchPlan, Source};
use crate::{Effort, StrategyName};

#[derive(Debug, Clone)]
pub struct ReportDocument {
    pub topic: String,
    pub generated_at: DateTime<Utc>,
    pub strategy: StrategyName,
    pub effort: Effort,
    pub models: ModelSelection,
    pub plan: ResearchPlan,
    pub sources: Vec<Source>,
    pub evidence: EvidenceBatch,
    pub claim_verification: Option<ClaimVerificationBatch>,
    pub evaluation: Option<ReportEvaluation>,
    pub body: String,
}

impl ReportDocument {
    pub fn to_markdown(&self) -> String {
        let mut markdown = String::new();
        markdown.push_str("---\n");
        markdown.push_str(&format!("title: \"{}\"\n", escape_yaml(&self.topic)));
        markdown.push_str(&format!(
            "generated_at: {}\n",
            self.generated_at.to_rfc3339()
        ));
        markdown.push_str(&format!("strategy: {}\n", self.strategy));
        markdown.push_str(&format!("effort: {}\n", self.effort));
        markdown.push_str(&format!(
            "planner_model: \"{}\"\n",
            self.models.planner_model
        ));
        markdown.push_str(&format!("worker_model: \"{}\"\n", self.models.worker_model));
        markdown.push_str(&format!("writer_model: \"{}\"\n", self.models.writer_model));
        markdown.push_str("---\n\n");
        markdown.push_str(self.body.trim());
        markdown.push_str("\n\n## Source Register\n\n");

        for source in &self.sources {
            let status = source
                .quality
                .as_ref()
                .map(|quality| {
                    if quality.admitted {
                        format!("admitted, score {}", quality.total_score())
                    } else {
                        format!("rejected, score {}", quality.total_score())
                    }
                })
                .unwrap_or_else(|| "unscored".to_string());
            markdown.push_str(&format!(
                "- [{}] [{}]({}) — {}, discovered by `{}`\n",
                source.id,
                source.title.trim(),
                source.url,
                status,
                source.discovered_by_query.trim()
            ));
        }

        markdown.push_str("\n## Research Trace\n\n");
        markdown.push_str("### Goal\n\n");
        markdown.push_str(self.plan.research_goal.trim());
        markdown.push_str("\n\n### Subquestions\n\n");
        for question in &self.plan.subquestions {
            markdown.push_str(&format!("- {question}\n"));
        }

        if !self.plan.perspectives.is_empty() {
            markdown.push_str("\n### Research Perspectives\n\n");
            for perspective in &self.plan.perspectives {
                markdown.push_str(&format!(
                    "- **{}** — {}\n",
                    perspective.name.trim(),
                    perspective.objective.trim()
                ));
            }
        }

        if !self.plan.source_requirements.is_empty() {
            markdown.push_str("\n### Source Requirements\n\n");
            for requirement in &self.plan.source_requirements {
                markdown.push_str(&format!("- {}\n", requirement.trim()));
            }
        }

        if !self.plan.success_criteria.is_empty() {
            markdown.push_str("\n### Success Criteria\n\n");
            for criterion in &self.plan.success_criteria {
                markdown.push_str(&format!("- {}\n", criterion.trim()));
            }
        }

        markdown.push_str("\n### Search Queries\n\n");
        for query in &self.plan.search_queries {
            markdown.push_str(&format!(
                "- `{}` — {} [{} / {}]\n",
                query.query.trim(),
                query.rationale.trim(),
                query.perspective.trim(),
                query.source_type.trim()
            ));
        }

        markdown.push_str("\n### Source Quality\n\n");
        for source in &self.sources {
            if let Some(quality) = &source.quality {
                markdown.push_str(&format!(
                    "- [{}] {} score={} type={} admitted={} warnings={}\n",
                    source.id,
                    quality.rationale.trim(),
                    quality.total_score(),
                    quality.source_type.trim(),
                    quality.admitted,
                    quality
                        .warnings
                        .iter()
                        .map(|warning| trace_text(warning))
                        .collect::<Vec<_>>()
                        .join("; ")
                ));
            } else if let Some(error) = &source.fetch_error {
                markdown.push_str(&format!(
                    "- [{}] fetch failed before scoring: {}\n",
                    source.id,
                    trace_text(error)
                ));
            }
        }

        markdown.push_str("\n### Evidence Notes\n\n");
        for note in &self.evidence.notes {
            markdown.push_str(&format!(
                "- [{}] {} Evidence: {} Limitations: {}\n",
                note.source_id,
                note.claim.trim(),
                note.evidence.trim(),
                note.limitations.trim()
            ));
        }

        if let Some(verification) = &self.claim_verification {
            markdown.push_str("\n### Claim Verification\n\n");
            for verdict in &verification.verdicts {
                let status = if verdict.supported {
                    "supported"
                } else {
                    "unsupported"
                };
                markdown.push_str(&format!(
                    "- **{}**: {} — {}\n",
                    status,
                    verdict.claim.trim(),
                    verdict.reason.trim()
                ));
            }
        }

        if let Some(evaluation) = &self.evaluation {
            markdown.push_str("\n### Final Evaluation\n\n");
            markdown.push_str(&format!(
                "- coverage: {}/5\n- citation_quality: {}/5\n- factuality: {}/5\n- analysis_depth: {}/5\n- presentation: {}/5\n- overall: {}/5\n",
                evaluation.coverage,
                evaluation.citation_quality,
                evaluation.factuality,
                evaluation.analysis_depth,
                evaluation.presentation,
                evaluation.overall
            ));
            if !evaluation.strengths.is_empty() {
                markdown.push_str("\nStrengths:\n");
                for strength in &evaluation.strengths {
                    markdown.push_str(&format!("- {}\n", strength.trim()));
                }
            }
            if !evaluation.weaknesses.is_empty() {
                markdown.push_str("\nWeaknesses:\n");
                for weakness in &evaluation.weaknesses {
                    markdown.push_str(&format!("- {}\n", weakness.trim()));
                }
            }
            if !evaluation.follow_up_recommendations.is_empty() {
                markdown.push_str("\nFollow-up recommendations:\n");
                for recommendation in &evaluation.follow_up_recommendations {
                    markdown.push_str(&format!("- {}\n", recommendation.trim()));
                }
            }
        }

        markdown
    }
}

pub async fn write_markdown(path: &Path, markdown: &str) -> Result<PathBuf> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    tokio::fs::write(path, markdown).await?;
    Ok(path.to_path_buf())
}

pub fn output_path(
    output: Option<&Path>,
    output_dir: &Path,
    topic: &str,
    now: DateTime<Utc>,
) -> PathBuf {
    if let Some(path) = output {
        return path.to_path_buf();
    }

    output_dir.join(format!(
        "{}-{}.md",
        now.format("%Y%m%d-%H%M%S"),
        slugify(topic)
    ))
}

pub fn validate_report_citations(body: &str, sources: &[Source]) -> Result<CitationAudit> {
    let valid_ids = sources
        .iter()
        .map(|source| source.id.as_str())
        .collect::<BTreeSet<_>>();
    let cited_ids = extract_citations(body);
    let unknown_ids = cited_ids
        .iter()
        .filter(|id| !valid_ids.contains(id.as_str()))
        .cloned()
        .collect::<Vec<_>>();

    if cited_ids.is_empty() {
        return Err(DrError::InvalidReport(
            "report body did not cite any sources with [S#] markers".to_string(),
        ));
    }

    if !unknown_ids.is_empty() {
        return Err(DrError::InvalidReport(format!(
            "report cited unknown source IDs: {}",
            unknown_ids.join(", ")
        )));
    }

    Ok(CitationAudit { cited_ids })
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CitationAudit {
    pub cited_ids: Vec<String>,
}

fn extract_citations(body: &str) -> Vec<String> {
    let mut ids = BTreeSet::new();
    let bytes = body.as_bytes();
    let mut index = 0;

    while index + 3 < bytes.len() {
        if bytes[index] == b'[' && bytes[index + 1] == b'S' {
            let mut cursor = index + 2;
            while cursor < bytes.len() && bytes[cursor].is_ascii_digit() {
                cursor += 1;
            }

            if cursor > index + 2 && cursor < bytes.len() && bytes[cursor] == b']' {
                ids.insert(body[index + 1..cursor].to_string());
                index = cursor + 1;
                continue;
            }
        }

        index += 1;
    }

    ids.into_iter().collect()
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;

    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
            previous_dash = false;
        } else if !previous_dash && !slug.is_empty() {
            slug.push('-');
            previous_dash = true;
        }
    }

    let trimmed = slug.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "research".to_string()
    } else {
        trimmed
    }
}

fn escape_yaml(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn trace_text(value: &str) -> String {
    const MAX_CHARS: usize = 600;

    let collapsed = value.split_whitespace().collect::<Vec<_>>().join(" ");
    let sanitized = strip_after_trace_marker(&collapsed, "<!doctype");
    let sanitized = strip_after_trace_marker(&sanitized, "<html");
    let sanitized = strip_after_trace_marker(&sanitized, "<script");
    let sanitized = strip_after_trace_marker(&sanitized, "data:image/");
    let mut output = sanitized.chars().take(MAX_CHARS).collect::<String>();
    if sanitized.chars().count() > MAX_CHARS {
        output.push_str("...");
    }
    output
}

fn strip_after_trace_marker(value: &str, marker: &str) -> String {
    let lower_value = value.to_ascii_lowercase();
    let lower_marker = marker.to_ascii_lowercase();

    lower_value.find(&lower_marker).map_or_else(
        || value.to_string(),
        |index| format!("{}[HTML omitted]", value[..index].trim()),
    )
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::{ReportDocument, extract_citations, output_path, validate_report_citations};
    use crate::types::{EvidenceBatch, ResearchPerspective, ResearchPlan, Source, SourceQuality};
    use crate::{Effort, ModelSelection, StrategyName};

    #[test]
    fn extract_citations_should_return_unique_sorted_source_ids() {
        let citations = extract_citations("Alpha [S2], beta [S1], repeat [S2].");

        assert_eq!(citations, vec!["S1".to_string(), "S2".to_string()]);
    }

    #[test]
    fn validate_report_citations_should_reject_unknown_source_ids() {
        let sources = vec![source("S1")];
        let error = validate_report_citations("Claim [S2].", &sources)
            .unwrap_err()
            .to_string();

        assert!(error.contains("S2"));
    }

    #[test]
    fn output_path_should_slugify_topic_when_no_exact_output_is_given() {
        let now = Utc
            .with_ymd_and_hms(2026, 6, 28, 12, 30, 0)
            .single()
            .unwrap_or_else(|| panic!("valid timestamp"));
        let path = output_path(None, "reports".as_ref(), "GLM 5.2 + DeepSeek?", now);

        assert_eq!(
            path,
            std::path::PathBuf::from("reports/20260628-123000-glm-5-2-deepseek.md")
        );
    }

    #[test]
    fn report_trace_should_truncate_fetch_errors_and_warnings() {
        let mut failed_source = source("S1");
        failed_source.fetch_error = Some(format!(
            "Source fetch API returned HTTP 403 Forbidden: <html>{}</html>",
            "x".repeat(2_000)
        ));
        failed_source.quality = Some(SourceQuality {
            source_id: "S1".to_string(),
            source_type: "paper".to_string(),
            relevance: 1,
            authority: 1,
            freshness: 1,
            independence: 1,
            admitted: false,
            rationale: "Blocked by an anti-bot page.".to_string(),
            warnings: vec![format!(
                "captcha page <HTML><BODY>{}</BODY></HTML>",
                "x".repeat(2_000)
            )],
        });
        let mut unscored_source = source("S2");
        unscored_source.fetch_error = Some(format!(
            "Source fetch API returned HTTP 403 Forbidden: <HTML>{}</HTML>",
            "y".repeat(2_000)
        ));
        let report = ReportDocument {
            topic: "topic".to_string(),
            generated_at: Utc
                .with_ymd_and_hms(2026, 6, 28, 12, 30, 0)
                .single()
                .unwrap_or_else(|| panic!("valid timestamp")),
            strategy: StrategyName::DeepAgentV1,
            effort: Effort::Light,
            models: ModelSelection {
                planner_model: "planner".to_string(),
                worker_model: "worker".to_string(),
                writer_model: "writer".to_string(),
                temperature: 0.0,
            },
            plan: ResearchPlan {
                research_goal: "goal".to_string(),
                assumptions: Vec::new(),
                subquestions: vec!["question".to_string()],
                perspectives: vec![ResearchPerspective {
                    name: "perspective".to_string(),
                    objective: "objective".to_string(),
                }],
                source_requirements: vec!["source".to_string()],
                success_criteria: vec!["criteria".to_string()],
                search_queries: Vec::new(),
            },
            sources: vec![failed_source, unscored_source],
            evidence: EvidenceBatch { notes: Vec::new() },
            claim_verification: None,
            evaluation: None,
            body: "# Report\n\nClaim [S1].".to_string(),
        };

        let markdown = report.to_markdown();

        assert!(markdown.contains("captcha page"));
        assert!(!markdown.contains("<HTML>"));
        assert!(!markdown.contains(&"x".repeat(1_000)));
        assert!(!markdown.contains(&"y".repeat(1_000)));
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
}
