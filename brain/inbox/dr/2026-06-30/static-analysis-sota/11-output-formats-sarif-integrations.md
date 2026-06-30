---
title: "SARIF and static analysis result formats: OASIS SARIF, GitHub code scanning upload, fingerprints, rule ids, regions, limitations, and machine-readable diagnostics"
generated_at: 2026-06-29T21:52:39.027657+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# SARIF v2.1.0: Structure and Standardization of Static Analysis Results

## Abstract
This report examines the Static Analysis Results Interchange Format (SARIF) v2.1.0, the current OASIS standard for representing static analysis tool output. Based on the OASIS specification and JSON schema, we outline the core structural requirements of a SARIF log, the extensibility model via property bags, and the standard's objective to reduce the cost of aggregating analysis results. The evidence is limited to the OASIS standard and does not cover consumer-specific implementations such as GitHub code scanning.

## Research Question
What is the current OASIS SARIF standard, its structural requirements, and how does it aim to facilitate the interchange of static analysis results?

## Method
We reviewed the OASIS SARIF v2.1.0 specification (Plus Errata 01) and the authoritative JSON schema to identify the standard's version, core structural properties, extensibility mechanisms, and stated objectives.

## Conceptual Background

| Term | Definition |
| :--- | :--- |
| SARIF | Static Analysis Results Interchange Format; a JSON-based standard for static analysis output. |
| `sarifLog` | The root object of a SARIF file. |
| `runs` | An array within the `sarifLog` containing run objects. |
| Property Bag | A mechanism allowing properties of any JSON type to be attached to objects, enabling extensibility. |

## Findings

The current OASIS standard for SARIF is version 2.1.0 Plus Errata 01, approved on 28 August 2023 [S1, S3]. The original v2.1.0 standard was approved on 23 July 2019 [S4].

A valid SARIF log (`sarifLog`) requires two top-level properties: `version` and `runs` [S1]. The `version` property must be an enum with the value `2.1.0` [S1]. The `runs` property is an array of run objects [S1].

The authoritative JSON schema for SARIF v2.1.0 enforces strict structure at the top level by setting `additionalProperties: false` [S2]. This means only defined properties like `version` and `runs` are permitted at the root of the document. However, the format allows extensibility through property bags on nested objects. Property values in these bags may be of any JSON type, including strings, numbers, arrays, objects, Booleans, and null [S1].

The standard's stated purpose is to "comprehensively capture the range of data produced by commonly used static analysis tools" and to "reduce the cost and complexity of aggregating the results of various analysis tools into common workflows" [S1].

## Design Implications

Tool producers generating SARIF output must ensure the root object contains the `version` set to `2.1.0` and a `runs` array [S1]. While the top-level schema is strict [S2], the ability to attach arbitrary JSON types via property bags [S1] allows tools to include custom metadata without violating the standard. This design supports interoperability while permitting tool-specific data retention.

## Limitations and Threats to Validity

The primary limitation of this evidence base is its scope. The admitted sources consist solely of the OASIS standard specification and schema. They do not provide information on consumer-side implementations, such as GitHub code scanning integration, required properties for specific platforms, fingerprints, regions, rule metadata, or known operational limitations like file size caps. The evidence also does not cover available tooling, libraries, or validators for generating or consuming SARIF.

## Open Questions

- What does each run object within the `runs` array represent in terms of tool execution semantics?
- How do platforms like GitHub code scanning consume SARIF files, and which specific properties (e.g., fingerprints, rule IDs, regions) are required or recommended for alert generation?
- What are the known limitations and failure modes when uploading large SARIF files to CI pipelines?
- What tools and libraries exist for validating SARIF files against the OASIS schema?
- How do fingerprints and partialFingerprints function for issue tracking across runs?

## Recommended Next Experiments

- Retrieve and analyze GitHub code scanning documentation to identify required and recommended SARIF properties for alert ingestion.
- Investigate the SARIF SDK and validator landscape to document available tooling for producers and consumers.
- Examine GitHub issue trackers and community forums to surface known limitations, such as result caps and fingerprint instability.

## Evidence Table

| Claim | Evidence | Source | Limits |
| :--- | :--- | :--- | :--- |
| SARIF v2.1.0 Plus Errata 01 is the current standard, approved 28 Aug 2023. | "Static Analysis Results Interchange Format (SARIF) Version 2.1.0 Plus Errata 01 ... 28 August 2023" | [S1], [S3] | Does not include platform-specific implementation details. |
| Original v2.1.0 standard approved 23 Jul 2019. | "Approved: 23 Jul 2019" | [S4] | Superseded by the 2023 errata. |
| `sarifLog` requires `version` (enum `2.1.0`) and `runs` array. | "version property enum ['2.1.0'], runs property array of run objects." | [S1] | No details on optional properties or nested object requirements. |
| `runs` is an array of run objects. | "runs property array of run objects." | [S1] | Evidence does not describe what each run object represents. |
| SARIF schema enforces strict top-level structure. | "additionalProperties: false" | [S2] | Strictness is not universal; nested property bags allow additional properties. |
| Property values can be any JSON type. | "The property values MAY be of any JSON type..." | [S1] | May lead to inconsistent implementations if not documented. |
| SARIF aims to capture tool output and reduce aggregation cost. | "Comprehensively capture the range of data... Reduce the cost and complexity..." | [S1] | High-level; does not specify technical details. |

## Source Register

- [S1] [Static Analysis Results Interchange Format (SARIF) Version 2.1.0 Plus Errata 01](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) — admitted, score 18, discovered by `OASIS SARIF specification v2.1.0 static analysis results JSON schema`
- [S2] [sarif-spec/sarif-2.1/schema/sarif-schema-2.1.0.json at main · oasis-tcs/sarif-spec](https://github.com/oasis-tcs/sarif-spec/blob/main/sarif-2.1/schema/sarif-schema-2.1.0.json) — admitted, score 18, discovered by `OASIS SARIF specification v2.1.0 static analysis results JSON schema`
- [S3] [Approved Errata for Static Analysis Results Interchange Format (SARIF) v2.1.0 OASIS Standard published - OASIS Open](https://www.oasis-open.org/2023/09/22/approved-errata-for-static-analysis-results-interchange-format-sarif-v2-1-0-oasis-standard-published/) — admitted, score 16, discovered by `OASIS SARIF specification v2.1.0 static analysis results JSON schema`
- [S4] [Static Analysis Results Interchange Format (SARIF) Version 2.1.0 - OASIS Open](https://www.oasis-open.org/standard/sarif-v2-1-0/) — admitted, score 15, discovered by `OASIS SARIF specification v2.1.0 static analysis results JSON schema`
- [S5] [Invitation to comment on Static Analysis Results Interchange Format (SARIF) v2.1.0 Errata 01 - OASIS Open](https://www.oasis-open.org/2023/08/04/invitation-to-comment-on-static-analysis-results-interchange-format-sarif-v2-1-0-errata-01/) — admitted, score 14, discovered by `OASIS SARIF specification v2.1.0 static analysis results JSON schema`

## Research Trace

### Goal

Produce a comprehensive technical brief on the SARIF static analysis result format, covering the OASIS standard, GitHub code scanning integration, key structural elements (fingerprints, rule IDs, regions), known limitations, and machine-readable diagnostic workflows.

### Subquestions

- What is the current OASIS SARIF standard (version, structure, key properties), and how does GitHub's code scanning implementation consume it?
- What are the required and recommended SARIF properties for GitHub code scanning alerts (e.g., run, tool, results, ruleId, message, locations, partialFingerprints, fingerprints)?
- How do SARIF regions, rule metadata, and suppression entries work, and what are common pitfalls when constructing them?
- What are the known limitations of SARIF and GitHub code scanning (e.g., file size limits, result caps, fingerprint stability, multi-repo support, inline suppression handling)?
- What tools, libraries, and validators exist for generating, validating, and converting to SARIF (e.g., sarif-python, sarif-rs, GitHub's sarif-validator)?
- How do fingerprints and partialFingerprints function for deduplication and issue tracking across runs, and what strategies ensure stability across refactors?

### Research Perspectives

- **Primary Standard & Documentation** — Identify the authoritative OASIS SARIF specification, schema, and GitHub documentation for code scanning upload, focusing on structure and required fields.
- **Implementation & Tooling** — Find libraries, SDKs, converters, and validators used to produce or consume SARIF in real-world static analysis pipelines.
- **Benchmarks & Evaluation** — Locate comparative analyses, performance data, or scale limits for SARIF-based tooling and GitHub code scanning ingestion.
- **Criticism & Limitations** — Surface known failure modes, GitHub-specific constraints, schema gaps, and community complaints about SARIF adoption and interoperability.
- **Operational Implications** — Determine practical guidance for CI integration, deduplication via fingerprints, handling large result sets, and maintaining stable rule IDs.
- **Recency & Evolution** — Identify recent changes to the SARIF standard, GitHub's code scanning API, or tooling support as of 2025-2026.

### Source Requirements

- OASIS SARIF specification and JSON schema (primary standard)
- GitHub Docs: code scanning SARIF upload, supported properties, and API reference
- GitHub code scanning API reference (REST and Actions) for SARIF upload endpoints
- Open-source SARIF SDKs or libraries (e.g., Microsoft/sarif-sdk, sarif-python, sarif-rs)
- SARIF validators or linters (e.g., sarif-validator, CodeQL CLI)
- Technical blog posts or conference talks on SARIF integration pitfalls
- GitHub issue tracker or discussions mentioning SARIF limitations
- Research papers or technical reports on machine-readable static analysis formats

### Success Criteria

- The brief cites the current OASIS SARIF version and provides a structural overview of a minimal valid SARIF file for GitHub code scanning.
- It explains the role and construction of fingerprints/partialFingerprints with concrete examples or strategies for stability.
- It enumerates GitHub-specific limits (e.g., max SARIF file size, max results per run, max rules) with cited numbers.
- It identifies at least 3 tools or libraries for generating, validating, or converting SARIF.
- It addresses known limitations or criticisms (e.g., fingerprint instability, lack of multi-repo support, suppression handling).
- It provides actionable guidance for CI integration, including how to upload SARIF via GitHub Actions and REST API.

### Search Queries

- `OASIS SARIF specification v2.1.0 static analysis results JSON schema` — Find the authoritative standard and schema to ground the structural overview. [Primary Standard & Documentation / official documentation / primary source]
- `GitHub code scanning SARIF upload required properties fingerprints ruleId regions` — Retrieve GitHub's consumer-side documentation detailing which SARIF properties are required or recommended. [Operational Implications / official documentation]
- `SARIF limitations GitHub code scanning max file size result cap fingerprint stability issues` — Surface known constraints, failure modes, and community-reported problems. [Criticism & Limitations / issue tracker / forum / blog]
- `SARIF SDK library validator generate convert static analysis tools 2025` — Identify current tooling for producing and validating SARIF files. [Implementation & Tooling / repository / library]

### Source Quality

- [S1] Authoritative OASIS SARIF v2.1.0 specification with errata. Directly provides the normative structure, required properties, and schema for the standard. Updated August 2023, which is recent for a stable standard. Essential for answering subquestions on standard structure and properties. score=18 type=primary admitted=true warnings=
- [S2] Official JSON schema from the OASIS SARIF TC repository. Provides the exact schema definition for v2.1.0, critical for understanding properties, types, and validation. Complements the specification. score=18 type=primary admitted=true warnings=
- [S3] OASIS announcement about approved errata for SARIF v2.1.0. Confirms the latest corrected version and links to updated schemas. Useful for freshness and confirming the authoritative documents, but adds mostly procedural information beyond the specification itself. score=16 type=primary admitted=true warnings=
- [S4] OASIS standard landing page for SARIF v2.1.0 (2019). Provides links to the original specification and schema. Redundant with S1 but authoritative. The 2019 date reduces freshness slightly, but the standard itself is stable. Useful for citation and context. score=15 type=primary admitted=true warnings=Older version (2019) without errata; use S1 for corrected standard.
- [S5] OASIS announcement of the public review for Errata 01. Confirms the review process and links to draft documents. Less directly useful than the final errata sources (S1, S3), but provides historical context. Relevant for understanding the evolution of the standard. score=14 type=primary admitted=true warnings=Historical announcement; final errata (S1, S3) supersede this draft.

### Evidence Notes

- [S1] SARIF v2.1.0 Plus Errata 01 is the current OASIS standard, approved 28 August 2023. Evidence: Static Analysis Results Interchange Format (SARIF) Version 2.1.0 Plus Errata 01 ... 28 August 2023 Limitations: Only covers the standard specification; does not include GitHub-specific implementation details.
- [S1] The sarifLog object requires 'version' (enum '2.1.0') and 'runs' array. Evidence: From the schema description: version property enum ['2.1.0'], runs property array of run objects. Limitations: No details on optional properties or nested object requirements.
- [S2] The authoritative JSON schema for SARIF v2.1.0 is located at https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json. Evidence: S2 shows the schema file path and title: 'Static Analysis Results Format (SARIF) Version 2.1.0 JSON Schema'. Limitations: Schema is large; not all definitions are shown in the snippet.
- [S1] Property values in SARIF can be any JSON type, including strings, numbers, arrays, objects, Booleans, and null. Evidence: The property values MAY be of any JSON type, including strings, numbers, arrays, objects, Booleans, and null. Limitations: May lead to inconsistent implementations if not carefully documented.
- [S3] Errata 01 for SARIF v2.1.0 was approved and published on 28 August 2023. Evidence: Approved Errata for Static Analysis Results Interchange Format (SARIF) v2.1.0 OASIS Standard published - 22 Sep 2023, with errata dated 28 August 2023. Limitations: Errata may contain only minor corrections; full details not provided.
- [S4] SARIF v2.1.0 was originally approved as an OASIS Standard on 23 July 2019. Evidence: Approved: 23 Jul 2019 Limitations: Superseded by the 2023 errata; the original standard may have known issues.
- [S1] SARIF aims to comprehensively capture static analysis tool output and reduce aggregation cost. Evidence: Comprehensively capture the range of data produced by commonly used static analysis tools. Reduce the cost and complexity of aggregating the results of various analysis tools into common workflows. Limitations: High-level; does not specify technical details.
- [S2] The SARIF JSON schema has 'additionalProperties': false at the top level, enforcing strict structure. Evidence: S2 schema snippet: 'additionalProperties': false Limitations: Property bags on nested objects allow additional properties, so strictness is not universal.

### Claim Verification

- **supported**: The current OASIS standard for SARIF is version 2.1.0 Plus Errata 01, approved on 28 August 2023. — S1 and S3 both confirm the version and approval date. S1 title includes 'Version 2.1.0 Plus Errata 01' and date '28 August 2023'. S3 announces the approved errata dated 28 August 2023.
- **supported**: The original v2.1.0 standard was approved on 23 July 2019. — S4 excerpt states 'Approved: 23 Jul 2019' for SARIF v2.1.0.
- **supported**: A valid SARIF log requires two top-level properties: version and runs. — S1 evidence explicitly mentions the sarifLog object requires 'version' and 'runs'.
- **supported**: The version property must be an enum with the value 2.1.0. — S1 evidence states 'version property enum ['2.1.0']'.
- **supported**: The runs property is an array of run objects. — S1 evidence says 'runs property array of run objects'.
- **supported**: The authoritative JSON schema for SARIF v2.1.0 enforces strict structure at the top level by setting additionalProperties: false. — S2 evidence shows the schema snippet with 'additionalProperties': false at the top level.
- **supported**: The format allows extensibility through property bags on nested objects, and property values in these bags may be of any JSON type. — S1 evidence states property values MAY be of any JSON type, including strings, numbers, arrays, objects, Booleans, and null. This supports extensibility via property bags.
- **supported**: The standard's stated purpose is to comprehensively capture the range of data produced by commonly used static analysis tools and to reduce the cost and complexity of aggregating the results of various analysis tools into common workflows. — S1 evidence includes the exact phrasing: 'Comprehensively capture the range of data produced by commonly used static analysis tools. Reduce the cost and complexity of aggregating the results of various analysis tools into common workflows.'

### Final Evaluation

- coverage: 2/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 2/5
- presentation: 3/5
- overall: 2/5

Strengths:
- Accurate and well-sourced presentation of the core SARIF v2.1.0 standard, including version, schema structure, and property rules.
- Clear evidence table with claims, sources, and limitations.
- Strong citation association with verified support for each claim.

Weaknesses:
- Covers only a fraction of the research goal: no information on GitHub code scanning, fingerprints, rule IDs, regions, limitations, or machine-readable diagnostic workflows.
- Lacks evidence tables for comparisons or source audits that would benefit the broader topic.
- Omits all operational aspects (CI integration, size caps, fingerprint strategies, tooling libraries) despite the plan's explicit subquestions.
- Fails to address the user's stated need for actionable, technical depth on SARIF-in-practice; the report is limited to a high-level standard description.
- No mention of property bags or extensibility in the findings or analysis depth, though covered in evidence.
- No analysis of trade-offs, counterevidence, or non-obvious insights; simply restates the specification.

Follow-up recommendations:
- Incorporate GitHub code scanning documentation to cover required SARIF properties (fingerprints, rule IDs, regions) and upload limits.
- Add an evidence table comparing fingerprint strategies for stable deduplication across runs.
- Include a section on known limitations (file size caps, result count limits, inline suppression handling) with cited GitHub docs or community issues.
- List available SARIF tooling (SDKs, validators, converters) and provide guidance for CI integration via GitHub Actions and REST API.
- Replace the generic abstract and research question with a technical brief structure that directly addresses the user's integration concerns.
