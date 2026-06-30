---
title: "Architecture fitness functions and static architecture testing: evolutionary architecture, ArchUnit, dependency-cruiser, module boundaries, and when architecture rules are scientific versus taste"
generated_at: 2026-06-29T21:59:13.867552+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Architecture Fitness Functions and Static Architecture Testing: Evolutionary Architecture, Tool Enforcement, and the Boundary Between Science and Taste

## Abstract

Evolutionary architecture proposes fitness functions as objective, automated checks that preserve architectural integrity during incremental change [S2]. Static architecture testing tools such as ArchUnit and dependency-cruiser operationalize this idea by encoding dependency and boundary rules as executable tests. This report grounds the concept of fitness functions in the evolutionary architecture literature [S2, S4], then examines how static architecture tests enforce module boundaries, which rule categories carry empirical or theoretical justification versus stylistic preference, and what limitations accompany these approaches. Because the admitted evidence base is limited to evolutionary architecture theory sources, tool-specific and empirical claims are explicitly flagged as inference and treated with corresponding uncertainty.

## Research Question

How do architecture fitness functions and static architecture testing tools enforce module boundaries in evolutionary architectures, and which rules are empirically or theoretically justified versus stylistic taste?

## Method

This report synthesizes admitted source evidence on evolutionary architecture and fitness functions [S2, S4], then reasons from that foundation to analyze static architecture testing tools and rule classification. Where claims extend beyond the admitted sources, they are labeled as inference. No external studies, tool documentation, or benchmarks were available in the admitted source register; gaps are noted explicitly.

## Conceptual Background

### Evolutionary Architecture and Fitness Functions

Evolutionary architecture is defined as an architecture that "supports guided, incremental change across multiple dimensions" [S2]. The guiding mechanism is the architectural fitness function, which "provides an objective integrity assessment of some architectural characteristic(s)" [S2]. Fitness functions are not limited to tests; they "employ a wide variety of implementation mechanisms: tests, metrics, monitoring, logging, and so on" [S2].

The framework has three steps: "identify the important dimensions, define fitness functions to ensure compliance, and use incremental change engineering practices such as deployment pipelines to automatically verify fitness" [S2]. Fitness functions can be classified along axes such as "triggered versus continual, atomic versus holistic" [S2]. The goal is to automate governance of architectural characteristics, including previously underserved non-functional requirements, by providing "a framework for identifying important dimensions, with their critical characteristics, and the mechanism (via fitness functions) for verifying the veracity of those attributes continually" [S2].

| Term | Meaning | Source |
|---|---|---|
| Evolutionary architecture | Architecture supporting guided, incremental change across multiple dimensions | [S2] |
| Fitness function | Objective integrity assessment of one or more architectural characteristics | [S2] |
| Triggered vs continual | Fitness functions that run on demand vs continuously | [S2] |
| Atomic vs holistic | Fitness functions targeting a single characteristic vs cross-cutting concerns | [S2] |
| Deployment pipeline verification | Automated fitness checks integrated into CI/CD | [S2, S4] |

### Static Architecture Testing

Static architecture testing is one implementation mechanism for fitness functions. It encodes rules about dependencies, layering, package boundaries, and naming as executable tests that run in a build pipeline. Tools such as ArchUnit (JVM ecosystem) and dependency-cruiser (JavaScript/TypeScript ecosystem) are commonly associated with this practice. The admitted sources do not document these tools directly; the following analysis treats their general capabilities as inference from the topic framing, not as source-backed fact.

## Findings

### Fitness Functions as Automated Governance

The evolutionary architecture literature positions fitness functions as the bridge between architectural intent and automated verification. Ford and Parsons describe fitness functions as "objective measures for assessing architectural integrity and facilitating ongoing governance through deployment pipelines" [S4]. This shifts architecture governance from periodic human review toward continuous, machine-checked constraints.

Insight: The value of static architecture testing depends on whether the encoded rules are genuinely objective measures of architectural integrity or merely codified preferences. The literature defines fitness functions as objective [S2], but does not specify how to determine objectivity for a given rule. This gap is central to the science-versus-taste question.

### How Static Architecture Tests Enforce Boundaries (Inference)

Based on the topic framing and general tool knowledge, ArchUnit and dependency-cruiser enforce boundaries by analyzing compile-time or module-level dependencies and failing the build when rules are violated. Typical rule categories include:

| Rule Category | Mechanism (Inferred) | Example |
|---|---|---|
| Layer dependency | Forbid calls from lower layers to higher layers | Domain must not call UI |
| Cycle detection | Detect circular dependencies between modules/packages | A→B→A |
| Package boundary | Restrict which packages may depend on which | Feature modules isolated |
| Naming convention | Enforce naming patterns on classes/modules | Controllers end in `Controller` |
| Cohesion/co-location | Require related classes in the same package | Entities in domain package |

These descriptions are inferred from the topic, not from admitted sources. The sources establish that fitness functions use "tests, metrics, monitoring, logging" [S2] but do not describe specific static analysis tools.

### Science Versus Taste: Classifying Rules

The admitted sources do not provide empirical evidence on which architecture rules improve quality. The classification below is inferential, grounded in widely accepted software engineering principles, but it is not backed by studies in the evidence register.

| Rule | Justification Basis | Classification | Confidence |
|---|---|---|---|
| Cycle detection | Cyclic dependencies increase coupling and hinder independent change | Scientific (theoretical) | Medium |
| Layer dependency direction | Upward dependency violations break separation of concerns | Scientific (theoretical) | Medium |
| Module boundary isolation | Explicit boundaries reduce unintended coupling | Scientific (theoretical) | Medium |
| Naming conventions | Consistency aids readability but has no structural effect | Taste | Low |
| Package co-location of related classes | Heuristic for cohesion, but context-dependent | Mixed | Low |
| Banning specific libraries | May reflect security or licensing concerns (scientific) or preference (taste) | Context-dependent | Low |

Insight: Rules that constrain dependency direction and detect cycles have a theoretical basis in coupling and changeability. Rules that enforce naming or co-location are closer to stylistic convention. The evolutionary architecture framework's emphasis on "objective integrity assessment" [S2] implies that taste-based rules should be scrutinized before being promoted to fitness functions.

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Evolutionary architecture supports guided incremental change | Direct definition | [S2] | Theoretical; no empirical validation in source |
| Fitness functions provide objective integrity assessment | Direct definition | [S2] | Does not define "objective" operationally |
| Fitness functions use tests, metrics, monitoring, logging | Direct statement | [S2] | No detail on when to use each mechanism |
| Fitness functions enable automated governance via pipelines | Slide summary | [S4] | Lacks implementation detail |
| Fitness functions automate non-functional requirement verification | Direct statement | [S2] | Does not specify which NFRs are objectively verifiable |
| Static tools enforce boundaries via dependency analysis | Inference from topic | None admitted | Not source-backed; tool docs absent from register |
| Cycle detection and layer rules are theoretically justified | Inference | None admitted | No empirical study in admitted sources |

## Design Implications

1. **Treat fitness functions as executable architecture contracts.** The framework of identifying dimensions, defining fitness functions, and verifying them in pipelines [S2] maps directly to static architecture tests in CI.

2. **Prefer rules with structural consequences.** Cycle detection, layer direction, and module boundary isolation address coupling and changeability. These align with the evolutionary architecture goal of guided incremental change [S2].

3. **Separate taste from fitness.** Naming conventions and co-location heuristics may be useful but should not be conflated with objective integrity assessment [S2]. Consider keeping them in linters or style guides rather than hard fitness functions.

4. **Integrate into deployment pipelines.** The literature explicitly calls for using "deployment pipelines to automatically verify fitness" [S2]. Static architecture tests should run on every build, failing fast on violations.

5. **Evolve rules with the architecture.** Since the architecture is evolutionary [S2], fitness functions must be revistable. Rules that block necessary change become constraints rather than guides.

## Limitations and Threats to Validity

The primary threat to validity is the narrow evidence base. Only two admitted sources were available, both from the same evolutionary architecture book and presentation [S2, S4]. No tool documentation, empirical studies, or critical perspectives were admitted. Consequently:

- Claims about ArchUnit and dependency-cruiser capabilities are inferred, not source-backed.
- The science-versus-taste classification relies on general software engineering reasoning, not on cited empirical evidence.
- No data on false positive rates, maintenance costs, or adoption outcomes are available in the evidence register.
- The sources have a potential author bias: Ford and Parsons advocate for fitness functions and may understate limitations.

The sources also do not define what makes a fitness function "objective" in practice [S2], leaving a conceptual gap between the theory and its operationalization.

## Open Questions

1. What empirical evidence links specific static architecture rules (cycle detection, layer enforcement) to measurable improvements in maintainability or defect rates?
2. How do teams determine whether a rule is objective versus taste-based before encoding it as a fitness function?
3. What are the false positive and maintenance cost profiles of ArchUnit and dependency-cruiser in large codebases?
4. Do static architecture tests impede necessary architectural change, and how do teams govern rule evolution?
5. How do holistic fitness functions (cross-cutting, runtime) compare to atomic static tests in practice?

## Recommended Next Experiments

1. **Controlled study on cycle detection impact.** Measure change effort and defect rates in projects with and without enforced cycle detection rules over a fixed period.

2. **Rule classification survey.** Survey architects to classify common architecture rules as objective or taste-based, then compare classifications against structural coupling metrics.

3. **Tool comparison benchmark.** Run ArchUnit and dependency-cruiser on equivalent multi-module projects to compare rule expressiveness, execution time, and false positive rates.

4. **Rule evolution case study.** Track how architecture rules change over 12 months in a project using static architecture tests, identifying rules added, removed, and modified, and the reasons given.

5. **Pipeline integration analysis.** Collect CI configurations from open-source projects using static architecture tests to identify common integration patterns and anti-patterns.

## Source Register

- [S1] [Evolutionary Architectures @neal4d nealford.com with Rebecca Parsons & Pat Kua](https://nealford.com/downloads/Evolutionary_Architectures_by_Neal_Ford.pdf) — rejected, score 16, discovered by `evolutionary architecture fitness functions Neal Ford Rebecca Parsons`
- [S2] [nealford.com • Building Evolutionary Architectures](https://nealford.com/books/buildingevolutionaryarchitectures.html) — admitted, score 14, discovered by `evolutionary architecture fitness functions Neal Ford Rebecca Parsons`
- [S3] [Building Evolutionary Architectures, 2nd Edition [Book]](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781492097532/) — rejected, score 10, discovered by `evolutionary architecture fitness functions Neal Ford Rebecca Parsons`
- [S4] [Neal Ford and Rebecca Parsons- Building Evolutionary Architectures (Evolution) | PPTX](https://www.slideshare.net/slideshow/neal-ford-and-rebecca-parsons-building-evolutionary-architectures-evolution-102970096/102970096) — admitted, score 14, discovered by `evolutionary architecture fitness functions Neal Ford Rebecca Parsons`
- [S5] [Building Evolutionary Architectures [Book]](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/) — rejected, score 9, discovered by `evolutionary architecture fitness functions Neal Ford Rebecca Parsons`

## Research Trace

### Goal

Determine how architecture fitness functions and static architecture testing tools (ArchUnit, dependency-cruiser) enforce module boundaries in evolutionary architectures, and which rules are empirically/scientifically justified versus stylistic taste.

### Subquestions

- What are architecture fitness functions in evolutionary architecture, and how do they differ from traditional architecture review?
- How do ArchUnit and dependency-cruiser encode and enforce architecture rules, and what rule categories do they support?
- Which architecture rules (e.g., layer dependencies, cycle detection, package boundaries) have empirical or theoretical justification versus being stylistic conventions?
- What are the limitations, false positives, and maintenance costs of static architecture testing tools?
- How do teams integrate architecture fitness functions into CI/CD pipelines, and what adoption patterns or anti-patterns exist?
- What recent critiques or counterevidence challenge the value of static architecture testing or evolutionary architecture principles?

### Research Perspectives

- **Primary sources and tool documentation** — Capture official docs, rule syntax, and intended use cases for ArchUnit and dependency-cruiser.
- **Evolutionary architecture theory** — Ground the concept of fitness functions in Neal Ford, Rebecca Parsons, and Patrick Kua's work.
- **Empirical and research evidence** — Find studies or technical reports on the measurable impact of architecture rules on maintainability, coupling, or defect rates.
- **Implementation and benchmarks** — Identify real-world repos, CI configs, and performance characteristics of static architecture tests.
- **Criticism and counterevidence** — Surface limitations, false positives, over-constraint risks, and arguments that some architecture rules are taste, not science.
- **Operational implications** — Determine how teams adopt, evolve, and govern architecture rules over time in practice.

### Source Requirements

- Official ArchUnit documentation and GitHub repo
- Official dependency-cruiser documentation and GitHub repo
- Book or authoritative articles on evolutionary architecture (Ford/Parsons/Kua)
- Peer-reviewed or industry empirical study on architecture rules and software quality
- Blog post or talk critiquing static architecture testing or fitness functions
- Example CI/CD pipeline configuration using ArchUnit or dependency-cruiser

### Success Criteria

- The report explains fitness functions with reference to evolutionary architecture literature.
- It compares ArchUnit and dependency-cruiser capabilities, rule types, and ecosystems.
- It distinguishes at least 3 rule categories that are empirically/theoretically justified from at least 3 that are primarily stylistic.
- It cites at least one empirical study or technical report on architecture rule effectiveness.
- It includes at least one critical perspective on limitations or over-constraint.
- It provides concrete CI/CD integration guidance.

### Search Queries

- `evolutionary architecture fitness functions Neal Ford Rebecca Parsons` — Find primary theoretical grounding for fitness functions in evolutionary architecture. [Evolutionary architecture theory / book/article]
- `ArchUnit dependency-cruiser architecture rules documentation` — Retrieve official docs and rule capabilities for both leading static architecture testing tools. [Primary sources and tool documentation / documentation/repo]
- `empirical study architecture rules maintainability coupling static analysis` — Find research evidence on whether architecture rules measurably improve quality. [Empirical and research evidence / research paper]
- `criticism architecture fitness functions over-constraint false positives taste vs science` — Surface adversarial viewpoints on limitations and subjectivity of architecture rules. [Criticism and counterevidence / blog/talk/critique]

### Source Quality

- [S1] PDF from author's site is a primary source for evolutionary architecture fitness functions, but the content is unreadable (binary garbage) so cannot be used. score=16 type=book/article admitted=false warnings=Unreadable PDF content; snippet suggests high relevance but cannot verify
- [S2] Author's official book page provides a clear summary of evolutionary architecture and fitness functions, meeting the source requirement for authoritative literature. score=14 type=book/article admitted=true warnings=
- [S3] O'Reilly store page for the 2nd edition adds no substantive content beyond confirming the book exists; low informational value for the research goal. score=10 type=book/article admitted=false warnings=Thin product page, no technical depth
- [S4] SlideShare presentation by the authors themselves, summarizing key concepts of evolutionary architecture and fitness functions; useful as a secondary authoritative source. score=14 type=book/article admitted=true warnings=Presentation format may lack depth; date uncertain
- [S5] O'Reilly store page for the first edition; similar to S3, provides no substantive content beyond a listing. score=9 type=book/article admitted=false warnings=Thin product page, outdated edition

### Evidence Notes

- [S2] An evolutionary architecture supports guided, incremental change across multiple dimensions. Evidence: Direct definition from the book: 'An evolutionary architecture supports guided, incremental change across multiple dimensions.' Limitations: Theoretical definition; no empirical validation provided in the source.
- [S2] An architectural fitness function provides an objective integrity assessment of some architectural characteristic(s). Evidence: 'An architectural fitness function provides an objective integrity assessment of some architectural characteristic(s).' Limitations: Source does not define what 'objective' means in practice or how to operationalize it.
- [S2] Fitness functions can be categorized as triggered versus continual and atomic versus holistic. Evidence: 'We define a variety of categories of fitness functions: triggered versus continual, atomic versus holistic, and a variety of others.' Limitations: Categories are conceptual; no examples or trade-offs between them in this snippet.
- [S2] Fitness functions employ a wide variety of implementation mechanisms: tests, metrics, monitoring, logging. Evidence: 'Fitness functions employ a wide variety of implementation mechanisms: tests, metrics, monitoring, logging, and so on.' Limitations: Does not detail how these mechanisms differ in practice or when to use each.
- [S2] The evolutionary architecture framework is: identify important dimensions, define fitness functions, and use deployment pipelines to automatically verify fitness. Evidence: 'identify the important dimensions, define fitness functions to ensure compliance, and use incremental change engineering practices such as deployment pipelines to automatically verify fitness.' Limitations: High-level; no concrete pipeline configuration or tool-specific steps.
- [S4] Fitness functions are objective measures for assessing architectural integrity and facilitating ongoing governance through deployment pipelines. Evidence: Slide description: 'the idea of fitness functions as objective measures for assessing architectural integrity and facilitating ongoing governance through deployment pipelines.' Limitations: Source is a slide summary; lacks detailed implementation advice or caveats.
- [S2] The concepts of evolutionary architecture help automate non-functional requirements by providing a framework for identifying dimensions and verifying characteristics via fitness functions. Evidence: 'The concepts of evolutionary architecture also help automate previously underserved constituents ("non-functional requirements") by providing a framework for identifying important dimensions, with their critical characteristics, and the mechanism (via fitness functions) for verifying the veracity of those attributes continually.' Limitations: Does not specify which non-functional requirements are amenable to objective verification or which remain subjective.

### Claim Verification

- **supported**: Evolutionary architecture supports guided, incremental change across multiple dimensions. — The evidence directly quotes the definition from S2, stating 'An evolutionary architecture supports guided, incremental change across multiple dimensions.' The citation S2 matches this source.
- **supported**: Fitness functions provide an objective integrity assessment of some architectural characteristic(s). — The evidence from S2 directly states 'An architectural fitness function provides an objective integrity assessment of some architectural characteristic(s).' The citation S2 is correctly associated.
- **supported**: Fitness functions employ a wide variety of implementation mechanisms: tests, metrics, monitoring, logging, and so on. — The evidence from S2 explicitly lists the same mechanisms: 'tests, metrics, monitoring, logging, and so on.' The citation S2 matches.
- **supported**: The evolutionary architecture framework has three steps: identify important dimensions, define fitness functions to ensure compliance, and use incremental change engineering practices such as deployment pipelines to automatically verify fitness. — The evidence from S2 matches the three steps exactly: 'identify the important dimensions, define fitness functions to ensure compliance, and use incremental change engineering practices such as deployment pipelines to automatically verify fitness.' Citation S2 is correct.
- **supported**: Fitness functions can be classified along axes such as triggered versus continual, atomic versus holistic. — The evidence from S2 states 'triggered versus continual, atomic versus holistic' as categories. The citation S2 supports this claim.
- **supported**: Fitness functions are objective measures for assessing architectural integrity and facilitating ongoing governance through deployment pipelines. — The evidence from S4 says 'the idea of fitness functions as objective measures for assessing architectural integrity and facilitating ongoing governance through deployment pipelines.' The citation S4 is correct.
- **supported**: Fitness functions automate non-functional requirement verification. — The evidence from S2 states that the concepts help 'automate previously underserved constituents ("non-functional requirements")' and provide a mechanism for verification. Citation S2 supports this.
- **supported**: Fitness functions enable automated governance via pipelines. — The evidence from S4 mentions 'facilitating ongoing governance through deployment pipelines.' This directly supports automated governance. Citation S4 is correct.

### Final Evaluation

- coverage: 2/5
- citation_quality: 1/5
- factuality: 2/5
- analysis_depth: 2/5
- presentation: 3/5
- overall: 2/5

Strengths:
- Honest and transparent about evidence limitations, explicitly flagging inferred claims.
- Clear scientific short-paper structure with abstract, method, findings, and limitations sections.
- Attempts to classify architecture rules into scientific vs taste categories, providing a useful conceptual framework.

Weaknesses:
- Fails to meet multiple success criteria: no tool documentation (ArchUnit, dependency-cruiser), no empirical study, no critical perspective, no concrete CI/CD integration guidance.
- Citation quality is very low: only two sources from the same author, no diversity or external validation.
- Most substantive claims (tool capabilities, rule classification, design implications) are unsupported by admitted evidence, reducing factuality and analysis depth.
- Lacks any critical or adversarial viewpoint on fitness functions or static architecture testing, despite the plan requiring it.

Follow-up recommendations:
- Admit and cite official documentation for ArchUnit and dependency-cruiser to ground tool-specific claims.
- Include at least one empirical study or technical report on the measurable impact of architecture rules on maintainability or defect rates.
- Add a critical source (e.g., blog post or talk) that challenges the value or objectivity of static architecture testing.
- Provide concrete CI/CD pipeline configuration examples (e.g., Maven/Gradle plugin config for ArchUnit, npm script for dependency-cruiser).
