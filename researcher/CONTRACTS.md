# Contracts

## Storage Choices

Use different formats for different jobs.

### Markdown

Use Markdown for:

- `brief.md`
- insights
- analysis memos
- reports

Reason:

- human-readable
- git-friendly
- easy to edit and review

### JSON

Use JSON for:

- `manifest.json`
- `sources.json`

Reason:

- easy for tools to update safely
- easy to validate
- strong fit for append and lookup operations

The important pattern is that JSON files are authoritative machine state, and a small tool layer
should own writes to them.

### XML-Style Blocks

Use XML-style structures inside prompts and workflow contracts, not as the main persistence format.

Reason:

- this matches the strongest part of GSD's workflow style
- it is expressive for agent prompts
- it keeps control structures explicit

## Recommended XML Contracts

### Research Brief

Use this during intake and when spawning subagents:

```xml
<research_brief>
  <identity>
    <research_id>RES-20260410-deep-research-os</research_id>
    <title>Deep research system inspired by GSD</title>
    <owner>Emil</owner>
  </identity>
  <objective>
    Design a file-based deep research operating system for Codex and Claude.
  </objective>
  <questions>
    <question id="Q1">How should research artifacts be structured for reuse?</question>
    <question id="Q2">How should one research produce many reports?</question>
  </questions>
  <scope>
    <include>Web research workflows</include>
    <include>Source provenance</include>
    <include>Report compilation</include>
    <exclude>Production UI implementation details</exclude>
  </scope>
  <outputs>
    <output type="spec" path="researcher/README.md" />
    <output type="roadmap" path="researcher/IMPLEMENTATION-ROADMAP.md" />
  </outputs>
</research_brief>
```

### Task Contract

Use this for each subagent task:

```xml
<task_contract>
  <task_id>TSK-0007</task_id>
  <role>analysis-synthesizer</role>
  <objective>Cluster pricing-related insights into a market structure memo.</objective>
  <inputs>
    <insight ref="INS-0002" />
    <insight ref="INS-0008" />
    <insight ref="INS-0011" />
  </inputs>
  <constraints>
    <constraint>Do not create new sources.</constraint>
    <constraint>Surface contradictory evidence explicitly.</constraint>
  </constraints>
  <deliverable type="markdown" path="analysis/ANL-0003-pricing-map.md" />
  <quality_gate>
    <check>Every major claim cites at least one insight ID.</check>
    <check>Open questions are listed at the end.</check>
  </quality_gate>
</task_contract>
```

### Report Request

Use this when packaging a report:

```xml
<report_request>
  <report_id>RPT-0004</report_id>
  <audience>senior-engineers</audience>
  <angle>Why GSD maps naturally to deep research workflows</angle>
  <thesis>
    GSD's strongest transferable ideas are thin orchestration, fresh context, and file-based
    artifact promotion.
  </thesis>
  <inputs>
    <analysis ref="ANL-0001" />
    <analysis ref="ANL-0002" />
    <insight ref="INS-0001" />
    <insight ref="INS-0003" />
  </inputs>
  <format>
    <type>markdown</type>
    <style>technical-blog-brief</style>
  </format>
  <must_include>
    <item>Clear thesis statement</item>
    <item>References to insight IDs</item>
    <item>Limitations and open questions</item>
  </must_include>
</report_request>
```

## Source Registry Choice

`sources.json` is the best choice for the source ledger.

Why JSON over Markdown or XML:

- appending and updating source metadata is common
- tools can validate it strictly
- report generation can resolve source IDs efficiently
- agents can diff it reliably

Recommended top-level shape:

```json
{
  "research_id": "RES-20260410-deep-research-os",
  "updated_at": "2026-04-10T00:00:00Z",
  "sources": []
}
```

Each source entry should include:

- `id`
- `title`
- `url`
- `canonical_url`
- `origin`
- `type`
- `confidence`
- `published_at`
- `created_at`
- `updated_at`
- `accessed_at`
- `last_checked_at`
- `status`
- `side_states`
- `tags`
- `latest_capture_path`
- `captures`
- `linked_insights`
- `notes`

## Reference Strategy

Use IDs everywhere.

Reports should reference insight IDs in body text or footnotes, and insight files should resolve
to source IDs.

That keeps reports lightweight while preserving a recoverable evidence chain.
