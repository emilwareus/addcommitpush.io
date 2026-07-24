use std::collections::HashMap;

use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use url::Url;
use uuid::Uuid;

use crate::db::Repository;
use crate::error::AppError;
use crate::models::{
    ResearchCitation, ResearchExtraction, ResearchMemoryCandidate, ResearchRequest,
    ResearchResponse,
};
use crate::openai::OpenAiClient;

const RESEARCH_INSTRUCTIONS: &str = r"
Research only the explicitly identified person and question. Write a concise,
evidence-led Markdown report. Separate verified facts from ambiguous identity
matches and inference. Prefer primary sources. Do not infer intimate facts from
weak signals. Every factual claim must carry a web-search citation.
";

const EXTRACTION_INSTRUCTIONS: &str = r"
Extract only durable facts about the person that are explicitly supported by the
provided web research report. Evidence excerpts must be exact, non-empty report
substrings. source_urls must contain only URLs supplied in available_source_urls.
Do not turn ambiguity or inference into fact. Never invent a date; use null time
bounds and unknown precision when absent.
";

#[derive(Clone)]
pub struct ResearchService {
    openai: OpenAiClient,
    repository: Repository,
}

impl ResearchService {
    pub const fn new(openai: OpenAiClient, repository: Repository) -> Self {
        Self { openai, repository }
    }

    pub async fn research_owner(
        &self,
        owner_id: Uuid,
        request: &ResearchRequest,
    ) -> Result<ResearchResponse, AppError> {
        if request.query.trim().is_empty() {
            return Err(AppError::InvalidInput(
                "research query cannot be empty".to_owned(),
            ));
        }
        let owner = self.repository.owner(owner_id).await?;
        let safety_identifier = hex::encode(Sha256::digest(owner_id.as_bytes()));
        let search_input = serde_json::to_string_pretty(&json!({
            "owner_display_name": owner.display_name,
            "owner_profile_markdown": owner.profile_markdown,
            "explicit_research_query": request.query
        }))
        .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?;
        let report = self
            .openai
            .web_search(&safety_identifier, RESEARCH_INSTRUCTIONS, &search_input)
            .await?;
        let citations = extract_citations(&report.annotations)?;
        let available_urls = citations
            .iter()
            .map(|citation| citation.url.clone())
            .collect::<Vec<_>>();
        let extraction_input = serde_json::to_string_pretty(&json!({
            "report_markdown": report.text,
            "available_source_urls": available_urls
        }))
        .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?;
        let extraction = self
            .openai
            .structured_response::<ResearchExtraction>(
                &safety_identifier,
                EXTRACTION_INSTRUCTIONS,
                &extraction_input,
                "life_research_extraction",
                research_extraction_schema(),
            )
            .await?;
        validate_extraction(&extraction.value.memories, &report.text, &available_urls)?;
        let embedding_inputs = extraction
            .value
            .memories
            .iter()
            .map(|memory| format!("{}\n{}", memory.title, memory.body_markdown))
            .collect::<Vec<_>>();
        let embeddings = if embedding_inputs.is_empty() {
            Vec::new()
        } else {
            self.openai.embed(&embedding_inputs).await?
        };
        let annotations = json!({
            "query": request.query,
            "report_markdown": report.text,
            "citations": report.annotations,
            "extraction_response_id": extraction.response_id
        });
        let content_hash = hex::encode(Sha256::digest(report.text.as_bytes()));
        let memories = self
            .repository
            .commit_research(
                owner_id,
                &report.response_id,
                &request.query,
                &report.text,
                &annotations,
                &content_hash,
                extraction.value.memories,
                embeddings,
            )
            .await?;
        Ok(ResearchResponse {
            report_markdown: report.text,
            citations,
            memories,
        })
    }
}

fn extract_citations(annotations: &[Value]) -> Result<Vec<ResearchCitation>, AppError> {
    let mut citations = HashMap::<String, Option<String>>::new();
    for annotation in annotations {
        if annotation.get("type").and_then(Value::as_str) != Some("url_citation") {
            continue;
        }
        let url = annotation
            .get("url")
            .and_then(Value::as_str)
            .ok_or_else(|| {
                AppError::InvalidProviderResponse("URL citation has no URL".to_owned())
            })?;
        let parsed = Url::parse(url)
            .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?;
        if parsed.scheme() != "https" {
            return Err(AppError::InvalidProviderResponse(
                "research citations must use HTTPS".to_owned(),
            ));
        }
        citations.insert(
            url.to_owned(),
            annotation
                .get("title")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned),
        );
    }
    let mut citations = citations
        .into_iter()
        .map(|(url, title)| ResearchCitation { url, title })
        .collect::<Vec<_>>();
    citations.sort_unstable_by(|left, right| left.url.cmp(&right.url));
    Ok(citations)
}

fn validate_extraction(
    candidates: &[ResearchMemoryCandidate],
    report: &str,
    available_urls: &[String],
) -> Result<(), AppError> {
    for candidate in candidates {
        if candidate.evidence_excerpt.trim().is_empty()
            || !report.contains(candidate.evidence_excerpt.trim())
        {
            return Err(AppError::InvalidProviderResponse(
                "researched memory evidence must occur verbatim in the report".to_owned(),
            ));
        }
        if candidate.source_urls.is_empty()
            || candidate
                .source_urls
                .iter()
                .any(|url| !available_urls.contains(url))
        {
            return Err(AppError::InvalidProviderResponse(
                "researched memory must cite only available source URLs".to_owned(),
            ));
        }
    }
    Ok(())
}

fn research_extraction_schema() -> Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["memories"],
        "properties": {
            "memories": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                        "title", "body_markdown", "domain", "subject",
                        "predicate", "object_value", "confidence", "importance",
                        "occurred_start", "occurred_end", "temporal_precision",
                        "evidence_excerpt", "source_urls"
                    ],
                    "properties": {
                        "title": {"type": "string"},
                        "body_markdown": {"type": "string"},
                        "domain": {"type": "string"},
                        "subject": {"type": ["string", "null"]},
                        "predicate": {"type": ["string", "null"]},
                        "object_value": {
                            "type": ["string", "number", "boolean", "null"]
                        },
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                        "importance": {"type": "integer", "minimum": 0, "maximum": 10},
                        "occurred_start": {"type": ["string", "null"], "format": "date-time"},
                        "occurred_end": {"type": ["string", "null"], "format": "date-time"},
                        "temporal_precision": {"type": "string", "enum": [
                            "unknown", "year", "month", "day", "minute", "interval"
                        ]},
                        "evidence_excerpt": {"type": "string"},
                        "source_urls": {
                            "type": "array",
                            "items": {"type": "string", "format": "uri"},
                            "minItems": 1
                        }
                    }
                }
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::{extract_citations, validate_extraction};
    use crate::models::ResearchMemoryCandidate;

    #[test]
    fn citations_are_deduplicated() {
        let annotations = vec![
            serde_json::json!({
                "type": "url_citation",
                "url": "https://example.com/me",
                "title": "Profile"
            }),
            serde_json::json!({
                "type": "url_citation",
                "url": "https://example.com/me",
                "title": "Profile"
            }),
        ];

        let citations = extract_citations(&annotations).unwrap();

        assert_eq!(citations.len(), 1);
    }

    #[test]
    fn extraction_requires_literal_evidence_and_known_url() {
        let candidate = ResearchMemoryCandidate {
            title: "Founded Acme".to_owned(),
            body_markdown: "The report says Acme was founded.".to_owned(),
            domain: "work".to_owned(),
            subject: None,
            predicate: None,
            object_value: None,
            confidence: 0.9,
            importance: 7,
            occurred_start: None,
            occurred_end: None,
            temporal_precision: "unknown".to_owned(),
            evidence_excerpt: "founded Acme".to_owned(),
            source_urls: vec!["https://example.com".to_owned()],
        };

        assert!(
            validate_extraction(
                &[candidate],
                "Emil founded Acme.",
                &["https://example.com".to_owned()]
            )
            .is_ok()
        );
    }
}
