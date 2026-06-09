# Draft Index

## Primary article

### 01. Write Code AI Agents Love

File: `ARTICLE_01_write-code-ai-agents-love.md`

Purpose: flagship article that can also become the backbone of the presentation.

Core thesis:

> The best AI-friendly codebase is not the one with the best prompts. It is the one where prompts are the least important part.

Main sections:

- agents are expensive new maintainers
- research says recoverable structure matters more than vibes
- names are part of the API
- dependency edges beat text blobs
- types compress intent
- more context can hurt
- make intent executable
- custom lint rules
- monorepos
- generated SDKs
- tests as feedback
- checklist

## Possible companion articles

These are not written yet. They are candidates if the main article gets too broad.

### 02. Executable Architecture for AI Agents

Potential file: `ARTICLE_02_executable-architecture-for-ai-agents.md`

Angle: a deeper dive on custom lint rules, `polint`, Semgrep, ESLint, Nx boundaries, generated-code rules, and CI gates.

Core thesis:

> Architecture that only exists in prose is a suggestion. Architecture that fails the build is an interface.

Use research:

- `INSIGHT_18_custom_lint_rules_are_executable_architecture.md`
- `notes/polint-plint-case-study.md`
- code smell papers
- AGENTS.md noise caveat

### 03. The Monorepo as an Agent Context Database

Potential file: `ARTICLE_03_monorepo-agent-context-database.md`

Angle: app code, docs, infra, API schemas, generated SDKs, migrations, examples, and CI in one versioned context.

Core thesis:

> For agents, a good monorepo is not one repo. It is one commit that contains the whole truth.

Use research:

- `INSIGHT_19_monorepos_are_agent_context_infrastructure.md`
- Google monorepo paper
- Code Simplicity monorepo article
- Docs as Code
- GitOps / IaC
- Dropbox monorepo size caveat

### 04. Stop Rawdogging APIs

Potential file: `ARTICLE_04_generated-sdks-for-ai-agents.md`

Angle: generated SDKs as agent-readable API contracts.

Core thesis:

> Do not make the agent reverse-engineer your API from stringly typed fetch calls. Generate the API into code it can read.

Use research:

- `INSIGHT_20_generated_sdks_turn_api_contracts_into_code.md`
- DocPrompting
- Type-Constrained Code Generation
- ToolGen
- OpenAPI Generator / Kiota / Orval / Speakeasy / Stainless / FastAPI docs

## TSX conversion checklist

Before converting the main draft:

- decide whether to keep one long article or split into companion posts
- generate or choose a cover image
- create `public/posts/write-code-ai-agents-love/`
- convert headings to `BlogHeading`
- convert lists to `BlogList` / `BlogListItem`
- convert source links to `BlogLink`
- add one or two `Callout` blocks for punchlines
- use a table for "prose vs executable truth"
- keep references short in the article; full bibliography stays in research
