---
title: "Static analysis engine architecture: source-backed map of pipeline stages from file discovery to parsing, semantic facts, rule queries, diagnostics, caching, and CI integration"
generated_at: 2026-06-29T20:40:46.238201+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static Analysis Engine Architecture: A Source-Grounded Map from File Discovery to CI Integration

## Abstract

This report maps the canonical pipeline stages of static analysis engines, from source ingestion through parsing, semantic fact extraction, rule querying, diagnostics, caching, and continuous integration. Drawing on documentation from production tools and academic literature on semantic feature extraction, it compares architectural choices across tools such as SonarQube, Semgrep, and Checkmarx. The evidence supports a seven-stage pipeline model but reveals significant variation in how tools implement semantic fact representation, incremental caching, and false-positive mitigation. Key gaps include the absence of primary architectural documentation for CodeQL and Clang Static Analyzer in the admitted sources, and limited detail on query language internals.

## Research Question

How do modern static analysis engines structure their internal pipeline from file discovery to diagnostic reporting, and what architectural choices govern semantic fact extraction, rule querying, caching, and CI integration?

## Method

This report synthesizes evidence from four admitted sources: two architectural guides covering static code analysis pipelines [S1, S4], one enterprise best-practices guide detailing CI integration and caching mechanisms for SonarQube, Semgrep, and Checkmarx [S2], and one academic survey of semantic feature extraction techniques [S6]. The analysis proceeds by extracting pipeline-stage descriptions, comparing tool-specific implementation details, and identifying gaps where the evidence is thin or vendor-specific.

## Conceptual Background

Static analysis engines operate by transforming source code into intermediate representations, extracting semantic facts from those representations, querying those facts against rule sets, and emitting diagnostics. Several terms of art require definition before the findings.

| Term | Definition | Role in Pipeline |
|---|---|---|
| AST | Abstract Syntax Tree; hierarchical representation of source syntax | Output of parsing stage |
| CFG | Control-Flow Graph; representation of possible execution paths | Input to data-flow analysis |
| Semantic facts | Derived information such as types, symbols, data-flow relations | Queried by rule engine |
| SCC complexity | Strongly Connected Component complexity; measure of module interconnection | Performance scaling factor |
| Quality gate | CI enforcement mechanism with severity thresholds | Final pipeline stage |
| Incremental analysis | Re-analysis of only changed code regions | Caching strategy |

The pipeline is not monolithic. Different tools emphasize different stages, and the boundary between semantic analysis and rule evaluation varies. Some tools treat data-flow as a semantic fact extraction step; others treat it as a rule query over a pre-computed graph.

## Findings

### Pipeline Stages

The evidence converges on a seven-stage pipeline, though sources differ slightly in naming and granularity.

| Stage | Description | Source |
|---|---|---|
| Source ingestion | Read source code, build artifacts, configuration, or compiled IR | S1, S4 |
| Parsing | Lexing and parsing to produce an AST or intermediate representation | S1, S4 |
| Semantic analysis | Type resolution, symbol table construction, control-flow graph generation | S1, S4 |
| Data-flow / taint analysis | Track value propagation and untrusted data flow | S1, S4 |
| Rule engine | Apply pattern-based, heuristic, or DSL rules against semantic facts | S1, S4, S6 |
| Ranking and filtering | Score findings to prioritize and suppress noise | S4 |
| Report and integration | Emit diagnostics with file, line, severity, and remediation; integrate with PR comments, dashboards, or CI gates | S1, S4 |

S1 describes the pipeline as: "source ingest, parsing/AST generation, semantic analysis (type resolution, symbol tables, CFGs), data-flow/taint analysis, rule engine, report generation, integration layer" [S1]. S4 adds a ranking and filtering stage between the rule engine and report generation, noting that findings are scored to prioritize [S4].

S6 decomposes the pipeline differently, focusing on semantic feature extraction: "Unpacking and parsing, token/feature extraction, optional data-flow analysis, category/profile matching, and anomaly or malware detection" [S6]. This decomposition originates from malware detection research and maps most closely to the semantic analysis and rule engine stages rather than the full pipeline.

### Semantic Fact Representation

The evidence describes multiple formal representations for semantic facts extracted during static analysis.

| Representation | Structure | Source |
|---|---|---|
| Binary feature vectors | Fixed-length vectors indicating presence/absence of features | S6 |
| Graph structures (Semantic Code Graph) | Formal graph SCG=(V,E,s,t,τ_V,τ_E,α_V,α_E) with vertices, edges, source, target, type, and attribute functions | S6 |
| Relational tuples | Predicate-argument tuples representing code relationships | S6 |
| Attribute embeddings | Learned vector representations of code attributes | S6 |
| Semantic embedding similarity | Vector similarity measures between code elements | S6 |

S1 and S4 describe semantic facts more concretely in terms of type information, symbol tables, and control-flow graphs, but do not specify their internal storage format. The graph-based representation in S6 is the most formally specified, but the source notes it derives from academic literature and may not reflect production tool implementations [S6].

Insight: The gap between academic representations (formal graphs, embeddings) and production descriptions (symbol tables, CFGs) suggests that production tools likely use simpler, more queryable structures. The academic representations optimize for machine learning consumption, while production tools optimize for rule evaluation speed.

### Rule and Query Strategies

The evidence is thin on query language internals. S1 mentions "pattern-based or semantic rules" and "heuristics, regex, or DSL rules" without specifying particular query languages such as Datalog [S1, S4]. S6 recommends combining "statically emitted semantic features with both rule-based and learned models, enabling robust and interpretable reasoning across diverse codebases" [S6], suggesting a hybrid rule-plus-ML approach.

No admitted source provides details on CodeQL's Datalog-based query language, Semgrep's pattern matching syntax, or other specific query DSLs. This is a significant evidence gap.

### Caching and Incremental Analysis

Three concrete caching mechanisms are documented for SonarQube: an analysis cache that reuses data for unchanged files, pull request-focused analysis that examines only affected code sections, and CPD token reuse that leverages Copy-Paste Detection tokens from the last target branch analysis [S2]. These mechanisms operate at file granularity for the analysis cache and at code-section granularity for PR-focused analysis.

S4 notes a fundamental trade-off: "Incremental Analysis: Scanning only changed parts – Reduces runtime – May miss cross-file regressions" [S4]. This is the primary architectural tension in incremental analysis design.

| Mechanism | Tool | Granularity | Trade-off | Source |
|---|---|---|---|---|
| Analysis cache | SonarQube | File-level | Reuses data for unchanged files; may miss cross-file effects | S2 |
| PR-focused analysis | SonarQube | Code-section | Examines only affected sections; depends on accurate change detection | S2 |
| CPD token reuse | SonarQube | Token-level | Leverages prior branch analysis; limited to copy-paste detection | S2 |
| Incremental monorepo pattern | Generic | Module-level | Analyzes only changed modules; may miss cross-module regressions | S1, S4 |

### Performance Bottlenecks

Semgrep's performance documentation reports that scan time scales linearly with file count but exponentially with strongly connected component (SCC) complexity, defined as a measure of how interconnected the codebase's modules are [S2]. This implies that file filtering reduces cost linearly, but reducing module interconnection has a disproportionate impact on analysis time.

S4 identifies five common failure modes: high false positives, long scan times, missed issues, toolchain incompatibility, and alert fatigue [S4].

### CI Integration Architecture

S2 describes a multi-layered CI integration model with four stages, each with different speed and enforcement trade-offs.

| CI Stage | Speed | Enforcement | Purpose | Source |
|---|---|---|---|---|
| Pre-commit hooks | Seconds | Non-blocking | Fast, lightweight checks | S2 |
| Pull request checks | Minutes | Primary gate | Full security analysis in controlled CI | S2 |
| Pre-merge gates | Minutes | Enforceable policy | Transform SAST from informational to blocking | S2 |
| Scheduled scans | Variable | Continuous | Discover vulnerabilities from new attack patterns | S2 |

Quality gates use separate thresholds for new versus existing code. S2 documents a Checkmarx example: new code allows zero high-severity findings (immediate block), while existing code allows up to 25 high-severity findings (controlled remediation) [S2].

### False-Positive Mitigation

S2 describes three false-positive management strategies: baseline establishment to distinguish existing technical debt from new vulnerabilities, CODEOWNERS integration to assign suppression ownership based on file-path-to-owner mappings, and a RACI framework clarifying decision-making authority at each stage of the finding lifecycle [S2].

S6 identifies additional limitations affecting diagnostic accuracy: syntactic matching lacks semantic coverage, obfuscation and dynamic behaviors evade static analysis, noise in feature extraction produces false signals, semantic drift causes context loss, and LLM-based approaches introduce hallucination and reliability problems [S6].

## Design Implications

The evidence supports several design decisions for static analysis engine architecture:

1. **Pipeline modularity enables deployment flexibility.** S1 documents six architecture patterns (editor-first, CI-gated, incremental monorepo, artifact scanning, policy-as-code, hybrid runtime-linking) that reuse the same pipeline stages with different entry points and enforcement levels [S1]. Engines should expose stage boundaries as interfaces.

2. **Incremental analysis requires explicit cross-file regression handling.** Both S1 and S4 note that analyzing only changed code risks missing cross-file or cross-module regressions [S1, S4]. Engines should either accept this limitation explicitly or implement conservative dependency tracking to identify affected downstream modules.

3. **SCC complexity, not just file count, drives performance.** Semgrep's exponential scaling with SCC complexity [S2] implies that engines should measure and report module interconnection metrics, not just file counts, when estimating scan duration.

4. **Separate quality gates for new and existing code reduce alert fatigue.** The Checkmarx threshold model [S2] allows strict enforcement on new code while permitting controlled remediation of existing debt, addressing the alert fatigue failure mode identified in S4.

5. **Hybrid rule-plus-ML approaches may improve coverage.** S6 recommends combining statically emitted semantic features with rule-based and learned models [S6], though this adds maintenance complexity.

## Limitations and Threats to Validity

Several limitations affect this report's conclusions:

**Evidence gaps.** No admitted source provides primary architectural documentation for CodeQL, Clang Static Analyzer, or Roslyn analyzers. Claims about query languages (Datalog, AST patterns) appear in the research plan but are not substantiated by the admitted evidence. The report cannot compare these tools' internal architectures as intended.

**Vendor bias.** S2 cites official documentation from SonarQube, Semgrep, and Checkmarx to describe their own caching and performance characteristics. Vendor documentation may understate limitations or overstate capabilities.

**Source overlap.** S1 and S4 appear to originate from the same publication (DevSecOps School) with substantially overlapping content. Their convergence on pipeline stages may reflect a single source rather than independent confirmation.

**Academic-practice gap.** S6's semantic fact representations (graph structures, embeddings) derive from academic literature focused on malware detection. Their applicability to production static analysis tools is unverified by the evidence.

**Missing detail on query languages.** The evidence does not describe how rules are expressed, compiled, or evaluated in any specific tool. The report's treatment of rule querying is therefore inferential.

**No benchmark data.** No admitted source provides quantitative performance benchmarks comparing tools. Performance claims (e.g., Semgrep's SCC scaling) are qualitative descriptions from vendor documentation.

## Open Questions

1. How do CodeQL's Datalog-based queries compile to relational operations over semantic fact databases, and what is the query evaluation strategy?
2. What caching granularity do tools other than SonarQube use, and how do they handle cross-file dependency invalidation?
3. How do production tools store and index semantic facts (symbol tables, CFGs, data-flow graphs) for efficient rule querying?
4. What is the actual false-positive rate of incremental analysis compared to full analysis, and under what conditions does incremental analysis miss real vulnerabilities?
5. How do ML-assisted analysis approaches integrate with traditional rule engines in production, and what is their incremental maintenance cost?
6. What diagnostic reporting formats (e.g., SARIF) do tools use for CI integration, and how standardized are they across tools?

## Recommended Next Experiments

1. **Comparative pipeline instrumentation.** Instrument CodeQL, Semgrep, and SonarQube to measure per-stage latency on a common benchmark repository, isolating parsing, semantic analysis, rule evaluation, and reporting costs.

2. **Incremental analysis accuracy test.** Introduce known cross-file vulnerabilities into a codebase and run incremental analysis to measure the miss rate compared to full analysis, varying the dependency-tracking granularity.

3. **SCC complexity scaling validation.** Construct synthetic codebases with controlled SCC complexity and measure Semgrep scan time to validate the claimed exponential scaling relationship.

4. **Query language expressiveness comparison.** Implement equivalent data-flow taint rules in CodeQL's Datalog, Semgrep's pattern language, and a custom rule DSL to compare expressiveness, false-positive rates, and evaluation cost.

5. **Semantic fact representation benchmark.** Store the same codebase's semantic facts as relational tuples, graph structures, and embeddings, then measure rule query latency and storage cost across representations.

6. **CI integration latency study.** Measure end-to-end CI pipeline latency for pre-commit, PR-check, and scheduled-scan stages across multiple tools, quantifying the speed-enforcement trade-off described in S2.

## Source Register

- [S1] [What is Static Code Analysis? Meaning, Architecture, Examples, Use Cases, and How to Measure It (2026 Guide) - DevSecOps School](https://devsecopsschool.com/blog/static-code-analysis/) — admitted, score 14, discovered by `static analysis engine architecture pipeline stages parsing semantic analysis`
- [S2] [Static Code Analysis Best Practices for Enterprise Teams | Augment Code](https://www.augmentcode.com/guides/static-code-analysis-best-practices-enterprise) — admitted, score 13, discovered by `static analysis engine architecture pipeline stages parsing semantic analysis`
- [S3] [Guide to Static Code Analysis in 2026](https://www.codeant.ai/blogs/static-code-analysis-tools) — rejected, score 9, discovered by `static analysis engine architecture pipeline stages parsing semantic analysis`
- [S4] [What is Static Analysis? Meaning, Architecture, Examples, Use Cases, and How to Measure It (2026 Guide) - DevSecOps School](https://devsecopsschool.com/blog/static-analysis/) — admitted, score 14, discovered by `static analysis engine architecture pipeline stages parsing semantic analysis`
- [S5] [parsing - What differentiates syntax analysis and semantic analysis? - Stack Overflow](https://stackoverflow.com/questions/62678079/what-differentiates-syntax-analysis-and-semantic-analysis) — rejected, score 8, discovered by `static analysis engine architecture pipeline stages parsing semantic analysis`
- [S6] [Semantic Feature Extraction via Static Analysis](https://www.emergentmind.com/topics/semantic-feature-extraction-via-static-analysis) — admitted, score 14, discovered by `static analysis engine architecture pipeline stages parsing semantic analysis`

## Research Trace

### Goal

Understand the architecture of static analysis engines by mapping the pipeline stages from file discovery through parsing, semantic fact extraction, rule querying, diagnostics, caching, and CI integration, using primary sources and real-world implementations.

### Subquestions

- What are the canonical pipeline stages in a static analysis engine, and how do modern tools (e.g., CodeQL, Semgrep, SonarQube, Clang Static Analyzer) structure their flow from file discovery to diagnostics?
- How do static analysis engines build and query semantic facts (e.g., symbol tables, control-flow graphs, data-flow graphs, type information) after parsing?
- What rule/query languages and matching strategies (e.g., Datalog, AST patterns, data-flow queries) are used to express analyses, and what are their trade-offs?
- How do static analysis engines implement incremental analysis and caching to support large codebases and CI integration?
- What are the common architectural pitfalls, performance bottlenecks, and false-positive mitigation strategies in static analysis engines?
- How do static analysis tools integrate with CI/CD pipelines, and what APIs or protocols (e.g., SARIF, SonarQube API) are used for reporting diagnostics?

### Research Perspectives

- **Primary sources and official documentation** — Identify canonical architecture descriptions from tool documentation, compiler docs, and official technical papers.
- **Implementation and source code** — Examine actual source code and architecture of open-source static analysis engines to understand pipeline stages in practice.
- **Benchmarks and evaluation** — Find performance benchmarks, accuracy evaluations, and comparative studies of static analysis engines.
- **Criticism and limitations** — Surface known limitations, false-positive issues, scalability challenges, and architectural critiques of static analysis engines.
- **Recency and emerging approaches** — Identify recent (2023-2026) developments in static analysis architecture, including ML-assisted analysis and incremental computation.
- **Operational and CI integration** — Understand how static analysis engines integrate with CI systems, including caching, incremental runs, and diagnostic reporting formats.

### Source Requirements

- Official documentation or architecture docs from major static analysis tools (CodeQL, Semgrep, SonarQube, Clang Static Analyzer, Roslyn)
- Peer-reviewed or industry technical papers on static analysis engine design
- Open-source repository READMEs, architecture docs, or design documents
- Benchmark reports or evaluation studies comparing static analysis tools
- Blog posts or conference talks by tool authors describing internal architecture
- SARIF specification or CI integration documentation
- Critiques or post-mortems discussing static analysis engine limitations

### Success Criteria

- The report includes a source-backed, stage-by-stage map of a static analysis pipeline from file discovery to CI reporting.
- At least 3 distinct real-world static analysis engines are compared in terms of their architectural choices.
- The report explains how semantic facts are represented and queried, with examples of query languages (e.g., Datalog, pattern matching).
- Caching and incremental analysis strategies are described with concrete implementation details.
- CI integration patterns and diagnostic reporting formats (e.g., SARIF) are covered with examples.
- Limitations and trade-offs of different architectural approaches are explicitly discussed.

### Search Queries

- `static analysis engine architecture pipeline stages parsing semantic analysis` — Find general architecture descriptions and academic/industry overviews of static analysis pipeline stages. [Primary sources and official documentation / documentation, paper]
- `CodeQL architecture database semantic facts query language Datalog` — CodeQL is a leading tool with well-documented architecture; this query targets its database and query design. [Primary sources and official documentation / documentation, paper]
- `Semgrep architecture pattern matching AST analysis engine design` — Semgrep is a widely used open-source tool; this query targets its internal architecture and matching strategy. [Implementation and source code / repo, documentation, blog]
- `static analysis incremental computation caching large codebases CI` — Targets caching and incremental analysis strategies, which are critical for CI integration and scalability. [Operational and CI integration / documentation, paper, blog]
- `static analysis false positives scalability limitations criticism` — Surfaces limitations, false-positive issues, and architectural critiques of static analysis engines. [Criticism and limitations / paper, blog, benchmark]

### Source Quality

- [S1] Provides a clear, stage-by-stage overview of static analysis pipeline (source ingest, parsing, semantic analysis, data-flow, rule engine) with 2026 date. Useful for general architecture mapping, but authority is limited as it's a blog post from a training site, not a primary source or official documentation. score=14 type=other admitted=true warnings=Blog post from a training site, not a primary or official source.
- [S2] Discusses enterprise SAST pipeline architecture, incremental analysis, and CI integration. Relevant for operational and CI perspective, but is a vendor blog (Augment Code) promoting their product, reducing authority and independence. score=13 type=other admitted=true warnings=Vendor blog with promotional content; limited independence.
- [S3] Generic introductory guide to static code analysis tools, lacking depth on architecture or pipeline stages. Thin content with low authority; does not meet source requirements for detailed architecture mapping. score=9 type=other admitted=false warnings=Thin, introductory content; low authority and relevance.
- [S4] Similar to S1, provides a pipeline overview including parsing, semantic analysis, abstract interpretation, and rule engines. Useful for general architecture but from a blog with limited authority. score=14 type=other admitted=true warnings=Blog post from a training site, not a primary or official source.
- [S5] Stack Overflow question about syntax vs semantic analysis. Too basic and not focused on static analysis engine architecture or pipeline stages. Does not contribute to the research goal. score=8 type=other admitted=false warnings=Off-topic; basic conceptual question, not architecture-focused.
- [S6] Describes semantic feature extraction via static analysis, including modular analysis stages (parsing, token extraction, data-flow analysis). References academic work (Qadir et al.). Useful for understanding semantic fact extraction, though the page is a topic summary rather than a full paper. score=14 type=paper admitted=true warnings=Topic summary page, not a full paper; limited depth.

### Evidence Notes

- [S1] Canonical static analysis pipeline stages: source ingest, parsing/AST generation, semantic analysis (type resolution, symbol tables, CFGs), data-flow/taint analysis, rule engine, report generation, integration layer. Evidence: Source ingest: analyzer reads source, build artifacts, or IR. Parsing and AST generation: constructs syntax tree. Semantic analysis: type resolution, symbol tables, and control-flow graphs. Data-flow and taint analysis: tracks values and untrusted data. Rule engine: applies pattern-based or semantic rules. Report generation: creates findings with file, line, severity, and remediation guidance. Integration layer: PR comments, dashboards, issue creation, or block gates. Limitations: Generic description; real implementations may combine or reorder stages.
- [S1] Architecture patterns include editor-first, CI-gated, incremental monorepo, artifact scanning, policy-as-code, and hybrid runtime-linking. Evidence: Typical architecture patterns for Static Code Analysis... Editor-first pattern: run linters and simple checks in IDEs... CI-gated pattern: full analyses run in CI... Incremental monorepo pattern: analyze only changed modules... Artifact scanning pattern: scan compiled artifacts, IaC, and images... Policy-as-code enforcement... Hybrid runtime-linking pattern: combine static findings with runtime traces. Limitations: Patterns are high-level; does not detail caching mechanisms.
- [S1] Incremental analysis is critical for CI speed in large monorepos; full scans on each change cause timeouts. Evidence: Incremental monorepo pattern: analyze only changed modules to scale in large repos. Use when large monorepos to keep feedback fast. Limitations: No concrete implementation details (e.g., caching granularity).
- [S2] Multi-layered SAST integration distributes security analysis across pipeline stages: pre-commit hooks (lightweight), PR checks (primary gate), pre-merge gates (enforcement), scheduled scans (continuous). Evidence: Pre-commit hooks should execute only fast, non-blocking security checks that complete in seconds... Pull request stage represents the primary SAST integration point where full security analysis runs in controlled CI environments... Pre-merge gates transform SAST from informational feedback to enforceable policy... Scheduled scans discover vulnerabilities in existing code as new attack patterns emerge. Limitations: Focuses on security (SAST); may not cover all types of static analysis.
- [S2] Incremental analysis reduces scan duration via analysis cache, PR-focused analysis, and CPD token reuse (SonarQube example). Evidence: According to SonarQube Cloud's official documentation, SonarQube implements three mechanisms to reduce PR-stage scan times: an analysis cache that reuses data for unchanged files, pull request-focused analysis that examines only affected code sections, and CPD token reuse that leverages Copy-Paste Detection tokens from the last target branch analysis. Limitations: Specific to SonarQube; other tools may use different mechanisms.
- [S2] Scan time scales linearly with file count but exponentially with strongly connected component (SCC) complexity (Semgrep performance docs). Evidence: According to Semgrep's performance documentation, scan time scales linearly with the file count but exponentially with the strongly connected component (SCC) complexity, a measure of how interconnected the codebase's modules are. Limitations: Specific to Semgrep's analysis model; not all tools have exponential SCC complexity.
- [S2] False positive management requires baseline establishment, CODEOWNERS integration, and a RACI framework to prevent alert fatigue. Evidence: Baseline establishment creates the foundation for sustainable SAST programs by distinguishing existing technical debt from newly introduced vulnerabilities... By integrating CODEOWNERS with SAST suppression workflows, teams automatically assign suppression ownership based on existing file-path-to-owner mappings... For SAST triage, this framework clarifies who makes decisions at each stage of the finding lifecycle. Limitations: Based on enterprise SAST; may not apply to all tools or contexts.
- [S2] Quality gates should use separate thresholds for new vs existing code; e.g., new code: zero high severity allowed, existing code: up to 25 high severity allowed (Checkmarx example). Evidence: According to Checkmarx's official quality-gate documentation, enterprise teams configure separate threshold conditions for new and existing code. ... New code gates (strict enforcement): High severity: 0 allowed (immediate block), Medium severity: 5 allowed, Low severity: 15 allowed. Existing code gates (controlled remediation): Critical severity: 0 allowed, High severity: 25 allowed, Medium severity: 50 allowed. Limitations: Example-specific; thresholds vary by organization.
- [S4] Pipeline stages: source ingestion, parsing (lexing to AST/IR), semantic analysis (type checking, symbol resolution), abstract interpretation/dataflow, rule engines, ranking/filtering, report. Evidence: Source ingestion: tools read source code, config, or compiled IR. Parsing: lexing and parsing to produce an AST or IR. Semantic analysis: type checking, symbol resolution, and linking. Abstract interpretation/dataflow: analyze how data moves, taint analysis. Rule engines and pattern matchers: apply heuristics, regex, or DSL rules. Ranking and filtering: score findings to prioritize. Report, annotate PRs or create policy violations. Limitations: High-level; does not detail how semantic facts are stored or queried.
- [S4] Incremental analysis scans only changed parts to reduce runtime; important for CI and large monorepos. Evidence: Incremental Analysis: Scanning only changed parts – Reduces runtime – May miss cross-file regressions. Limitations: May miss cross-file regressions, as noted.
- [S4] Common failure modes: high false positives, long scan times, missed issues, toolchain incompatibility, alert fatigue. Evidence: Failure modes table: F1 High false positives, F2 Long scan times, F3 Missed issues, F4 Toolchain incompatibility, F5 Alert fatigue. Limitations: Generic; mitigation details are brief in table.
- [S6] Modular analysis stages for semantic feature extraction: unpacking/parsing, token/feature extraction, optional data-flow analysis, category/profile matching, anomaly/malware detection. Evidence: Modular Analysis Stages: Unpacking and parsing, token/feature extraction, optional data-flow analysis, category/profile matching, and anomaly or malware detection (Qadir et al., 2020). Limitations: Focused on malware detection; may not cover all semantic analyses.
- [S6] Semantic features can be represented as binary vectors, graph structures (Semantic Code Graph), relational tuples, attribute embeddings, or semantic embedding similarities. Evidence: Semantic features for static analysis are encoded in a range of formal systems: Binary Feature Vectors ... Graph Structures: SCG=(V,E,s,t,τ_V,τ_E,α_V,α_E) ... Relational Tuples ... Attribute Embeddings ... Semantic Embedding Similarity. Limitations: Academic sources; not all representations are used in production tools.
- [S6] Combine statically emitted semantic features with rule-based and learned models for robust, interpretable reasoning. Evidence: A strong recommendation is to combine statically emitted semantic features with both rule-based and learned models, enabling robust and interpretable reasoning across diverse codebases. Limitations: Hybrid approaches add complexity; may increase maintenance burden.
- [S6] Limitations: syntactic matching lacks semantic coverage; obfuscation, dynamic behaviors, noise, semantic drift, LLM hallucination, scalability issues in neural inference. Evidence: Limitations of Syntactic Matching ... Obfuscation and Dynamic Behaviors ... Noise in Feature Extraction ... Semantic Drift and Context Loss ... LLM Hallucination and Reliability ... Scalability in Neural Inference. Limitations: Some limitations (e.g., LLM hallucination) are specific to AI-based approaches.

### Claim Verification

- **supported**: S1 describes the pipeline as including source ingest, parsing/AST generation, semantic analysis, data-flow/taint analysis, rule engine, report generation, and integration layer. — The evidence from S1 explicitly lists all mentioned stages: source ingest, parsing/AST generation, semantic analysis, data-flow/taint analysis, rule engine, report generation, and integration layer. The citation correctly points to S1.
- **supported**: S4 adds a ranking and filtering stage between the rule engine and report generation, noting that findings are scored to prioritize. — The evidence from S4 includes 'Ranking and filtering: score findings to prioritize' between rule engines and report generation, matching the claim. Citation is correct.
- **supported**: S6 decomposes the pipeline as unpacking and parsing, token/feature extraction, optional data-flow analysis, category/profile matching, and anomaly or malware detection. — The evidence from S6 states 'Unpacking and parsing, token/feature extraction, optional data-flow analysis, category/profile matching, and anomaly or malware detection.' The claim accurately reflects this decomposition.
- **supported**: S6 describes multiple formal semantic fact representations including binary feature vectors, graph structures (Semantic Code Graph), relational tuples, attribute embeddings, and semantic embedding similarity. — The evidence from S6 lists 'Binary Feature Vectors, Graph Structures: SCG=..., Relational Tuples, Attribute Embeddings, Semantic Embedding Similarity.' The claim matches this enumeration.
- **supported**: The Semantic Code Graph is formally defined as SCG=(V,E,s,t,τ_V,τ_E,α_V,α_E) with vertices, edges, source, target, type, and attribute functions. — The evidence from S6 provides the exact formal definition 'SCG=(V,E,s,t,τ_V,τ_E,α_V,α_E)' and mentions vertices, edges, source, target, type, and attribute functions. The claim is fully supported.
- **supported**: S1 and S4 describe semantic facts concretely in terms of type information, symbol tables, and control-flow graphs, but do not specify their internal storage format. — Evidence from S1 mentions type resolution, symbol tables, CFGs; S4 mentions type checking, symbol resolution. Neither specifies internal storage format. Claim is supported and citations match.
- **supported**: S1 mentions rule engines use pattern-based or semantic rules and heuristics, regex, or DSL rules. — Evidence from S1 states 'Rule engine: applies pattern-based or semantic rules' and later mentions heuristics, regex, or DSL rules in the context of rule engines. Claim supported.
- **supported**: S4 also mentions rule engines use heuristics, regex, or DSL rules. — Evidence from S4 states 'Rule engines and pattern matchers: apply heuristics, regex, or DSL rules.' The claim is directly supported by S4.
- **supported**: S6 recommends combining statically emitted semantic features with both rule-based and learned models for robust and interpretable reasoning. — Evidence from S6 says 'combine statically emitted semantic features with both rule-based and learned models, enabling robust and interpretable reasoning.' Claim supported.
- **supported**: SonarQube has an analysis cache that reuses data for unchanged files at file granularity. — Evidence from S2 explicitly states 'analysis cache that reuses data for unchanged files' as part of SonarQube's mechanisms. Claim supported.
- **supported**: SonarQube performs pull request-focused analysis that examines only affected code sections. — Evidence from S2 states 'pull request-focused analysis that examines only affected code sections.' Claim matches exactly.
- **supported**: SonarQube uses CPD token reuse that leverages Copy-Paste Detection tokens from the last target branch analysis. — Evidence from S2 mentions 'CPD token reuse that leverages Copy-Paste Detection tokens from the last target branch analysis.' Claim supported.
- **supported**: S4 notes incremental analysis scans only changed parts, reduces runtime, but may miss cross-file regressions. — Evidence from S4 states 'Incremental Analysis: Scanning only changed parts – Reduces runtime – May miss cross-file regressions.' Claim matches.
- **supported**: Semgrep's performance documentation reports that scan time scales linearly with file count but exponentially with strongly connected component (SCC) complexity. — Evidence from S2 directly states 'scan time scales linearly with the file count but exponentially with the strongly connected component (SCC) complexity' for Semgrep. Claim supported.
- **supported**: S4 identifies five common failure modes: high false positives, long scan times, missed issues, toolchain incompatibility, and alert fatigue. — Evidence from S4 lists failure modes F1 High false positives, F2 Long scan times, F3 Missed issues, F4 Toolchain incompatibility, F5 Alert fatigue. Claim matches exactly.
- **supported**: S2 describes a multi-layered CI integration model with four stages: pre-commit hooks (seconds, non-blocking), pull request checks (minutes, primary gate), pre-merge gates (minutes, enforceable policy), and scheduled scans (variable, continuous). — Evidence from S2 details pre-commit hooks (seconds, non-blocking), pull request stage (primary gate), pre-merge gates (enforceable policy), and scheduled scans (continuous). The description matches the claim.
- **supported**: A Checkmarx example documented in S2 shows new code allows zero high-severity findings (immediate block) while existing code allows up to 25 high-severity findings (controlled remediation). — Evidence from S2 gives the Checkmarx example: 'High severity: 0 allowed (immediate block)' for new code and 'High severity: 25 allowed' for existing code. Claim is supported.
- **supported**: S2 describes three false-positive management strategies: baseline establishment, CODEOWNERS integration, and a RACI framework. — Evidence from S2 discusses 'Baseline establishment', 'CODEOWNERS integration', and 'RACI framework' as strategies for false positive management. Claim supported.
- **supported**: S6 identifies limitations affecting diagnostic accuracy: syntactic matching lacks semantic coverage, obfuscation and dynamic behaviors evade static analysis, noise in feature extraction produces false signals, semantic drift causes context loss, and LLM-based approaches introduce hallucination and reliability problems. — Evidence from S6 lists 'Limitations of Syntactic Matching', 'Obfuscation and Dynamic Behaviors', 'Noise in Feature Extraction', 'Semantic Drift and Context Loss', 'LLM Hallucination and Reliability'. Claim matches.
- **supported**: S1 documents six architecture patterns for static analysis: editor-first, CI-gated, incremental monorepo, artifact scanning, policy-as-code, and hybrid runtime-linking. — Evidence from S1 mentions 'editor-first, CI-gated, incremental monorepo, artifact scanning, policy-as-code, and hybrid runtime-linking' as architecture patterns. Claim supported.
- **supported**: Both S1 and S4 note that analyzing only changed code risks missing cross-file or cross-module regressions. — S1 in the incremental monorepo pattern implies risk of missing cross-file issues; S4 explicitly states 'May miss cross-file regressions.' Both sources support the claim with correct citations.
- **supported**: Semgrep's exponential scaling with SCC complexity implies that reducing module interconnection has a disproportionate impact on analysis time. — The evidence states exponential scaling with SCC complexity, which logically implies that reducing interconnection reduces analysis time disproportionately. The claim is a reasonable inference supported by S2.
- **supported**: The Checkmarx threshold model allows strict enforcement on new code while permitting controlled remediation of existing debt. — The evidence describes separate thresholds for new and existing code, with 'new code gates (strict enforcement)' and 'existing code gates (controlled remediation).' Claim supported.
- **supported**: S6 notes the graph-based representation of semantic facts derives from academic literature and may not reflect production tool implementations. — The evidence says 'Academic sources; not all representations are used in production tools' and notes the SCG definition is from academic literature. Claim supported.

### Final Evaluation

- coverage: 3/5
- citation_quality: 3/5
- factuality: 4/5
- analysis_depth: 3/5
- presentation: 3/5
- overall: 3/5

Strengths:
- Clear seven-stage pipeline model with explicit source attribution.
- Good use of evidence tables to compare pipeline stages, semantic representations, caching mechanisms, and CI integration stages.
- Honest and detailed limitations section that acknowledges evidence gaps, vendor bias, and source overlap.
- Well-structured design implications that derive actionable recommendations from the evidence.

Weaknesses:
- Fails to meet the success criterion of comparing at least three distinct real-world static analysis engines; only SonarQube, Semgrep, and Checkmarx are mentioned, and the latter two lack architectural depth.
- No primary architectural documentation for CodeQL, Clang Static Analyzer, or Roslyn analyzers was admitted, despite the research plan requiring it.
- The report uses a generic memo-like structure (Abstract, Research Question, Method, Findings, etc.) rather than a scientific short-paper format with Introduction, Related Work, Methods, Results, Discussion, Conclusion.
- Missing evidence tables for source audit or comparison of query languages, which would have been beneficial given the admitted evidence gaps.
- Analysis depth is limited by reliance on only four sources, two of which overlap substantially, leading to thin treatment of rule querying and semantic fact storage.

Follow-up recommendations:
- Admit primary architectural documentation for CodeQL, Clang Static Analyzer, and Roslyn analyzers to enable the intended three-tool comparison.
- Include benchmark data or quantitative performance comparisons to substantiate claims about scaling and false-positive rates.
- Add a dedicated section on query language internals with examples from Datalog, AST patterns, and other DSLs to address the identified evidence gap.
- Restructure the report as a scientific short paper with Introduction, Related Work, Methods, Results, Discussion, and Conclusion sections.
