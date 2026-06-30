use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ResearchPlan {
    pub research_goal: String,
    #[serde(default)]
    pub assumptions: Vec<String>,
    pub subquestions: Vec<String>,
    #[serde(default)]
    pub perspectives: Vec<ResearchPerspective>,
    #[serde(default)]
    pub source_requirements: Vec<String>,
    #[serde(default)]
    pub success_criteria: Vec<String>,
    pub search_queries: Vec<PlannedSearchQuery>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ResearchPerspective {
    pub name: String,
    pub objective: String,
}

impl<'de> Deserialize<'de> for ResearchPerspective {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = serde_json::Value::deserialize(deserializer)?;
        match value {
            serde_json::Value::String(text) => Ok(Self {
                name: text.clone(),
                objective: text,
            }),
            serde_json::Value::Object(mut object) => {
                let name = object
                    .remove("name")
                    .and_then(|value| value.as_str().map(str::to_string))
                    .unwrap_or_else(|| "perspective".to_string());
                let objective = object
                    .remove("objective")
                    .and_then(|value| value.as_str().map(str::to_string))
                    .unwrap_or_else(|| name.clone());
                Ok(Self { name, objective })
            }
            _ => Err(serde::de::Error::custom(
                "research perspective must be a string or object",
            )),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PlannedSearchQuery {
    pub query: String,
    pub rationale: String,
    #[serde(default)]
    pub perspective: String,
    #[serde(default)]
    pub source_type: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchHit {
    pub title: String,
    pub url: String,
    pub description: String,
    pub extra_snippets: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Source {
    pub id: String,
    pub title: String,
    pub url: String,
    pub description: String,
    pub extra_snippets: Vec<String>,
    pub content: String,
    pub fetch_error: Option<String>,
    pub discovered_by_query: String,
    pub planned_source_type: String,
    pub rank: usize,
    pub quality: Option<SourceQuality>,
}

impl Source {
    pub fn grounding_text(&self) -> String {
        let mut text = format!(
            "{}\nURL: {}\nSnippet: {}",
            self.title, self.url, self.description
        );

        if !self.extra_snippets.is_empty() {
            text.push_str("\nExtra snippets:");
            for snippet in &self.extra_snippets {
                text.push_str("\n- ");
                text.push_str(snippet);
            }
        }

        if !self.content.trim().is_empty() {
            text.push_str("\nReadable content:\n");
            text.push_str(self.content.trim());
        }

        text
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SourceQualityBatch {
    pub scores: Vec<SourceQuality>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SourceQuality {
    pub source_id: String,
    pub source_type: String,
    pub relevance: u8,
    pub authority: u8,
    pub freshness: u8,
    pub independence: u8,
    pub admitted: bool,
    pub rationale: String,
    #[serde(default)]
    pub warnings: Vec<String>,
}

impl SourceQuality {
    pub fn total_score(&self) -> u8 {
        self.relevance
            .saturating_add(self.authority)
            .saturating_add(self.freshness)
            .saturating_add(self.independence)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EvidenceBatch {
    pub notes: Vec<EvidenceNote>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EvidenceNote {
    pub source_id: String,
    pub claim: String,
    pub evidence: String,
    pub relevance: String,
    pub limitations: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GapAnalysis {
    pub sufficient: bool,
    pub assessment: String,
    pub missing_information: Vec<String>,
    pub follow_up_queries: Vec<PlannedSearchQuery>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReportClaims {
    pub claims: Vec<ReportClaim>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReportClaim {
    pub claim: String,
    pub citations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ClaimVerificationBatch {
    pub verdicts: Vec<ClaimVerification>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ClaimVerification {
    pub claim: String,
    #[serde(default)]
    pub citations: Vec<String>,
    pub supported: bool,
    #[serde(default)]
    pub citation_association: bool,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReportEvaluation {
    pub coverage: u8,
    pub citation_quality: u8,
    pub factuality: u8,
    pub analysis_depth: u8,
    pub presentation: u8,
    pub overall: u8,
    #[serde(default)]
    pub strengths: Vec<String>,
    #[serde(default)]
    pub weaknesses: Vec<String>,
    #[serde(default)]
    pub follow_up_recommendations: Vec<String>,
}
