---
title: "Custom static analysis rule ecosystems from official docs: ESLint, typescript-eslint, Semgrep, CodeQL, Joern, ArchUnit, dependency-cruiser, ast-grep; compare extension points and limits"
generated_at: 2026-06-29T21:56:20.916049+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Custom Static Analysis Rule Ecosystems: Extension Points and Limits Across Eight Tools

## Abstract

This report compares the custom rule authoring mechanisms of eight static analysis tools: ESLint, typescript-eslint, Semgrep, CodeQL, Joern, ArchUnit, dependency-cruiser, and ast-grep. The intended scope covers extension models, required runtimes, query primitives, packaging, and IDE/CI integration. However, only ESLint official documentation was admitted into the source register at the time of writing. The findings therefore provide a rigorous, source-grounded account of ESLint's custom rule ecosystem and identify the evidence gap for the remaining seven tools as a primary limitation.

## Research Question

What are the documented extension points, APIs, and limitations for authoring custom static analysis rules in ESLint, typescript-eslint, Semgrep, CodeQL, Joern, ArchUnit, dependency-cruiser, and ast-grep, and how do they compare?

## Method

The research plan called for retrieving official documentation, primary repositories, changelogs, and issue trackers for all eight tools. Source admission was based on official documentation priority. Of the eight tools, only ESLint's official custom rule documentation [S1][S2] was admitted. The analysis below is restricted to claims traceable to these sources. Where the other seven tools are discussed, the report marks the absence of admitted evidence explicitly rather than relying on model memory.

## Conceptual Background

Custom static analysis rules let teams enforce project-specific invariants that prebuilt rule packs do not cover. The extension model determines who can write rules, how quickly, and what classes of bugs or architectural violations are detectable.

| Term | Definition |
|---|---|
| AST (Abstract Syntax Tree) | Tree representation of source code structure; rule visitors traverse it. |
| ESTree | A specification for JavaScript AST node types; ESLint's native AST format. |
| Visitor pattern | A traversal model where callback functions fire when the analyzer enters or exits AST nodes. |
| Selector | An ESQuery-style CSS-like expression matching AST nodes by type and structure. |
| Plugin | A distributable package bundling one or more custom rules, processors, or configs. |
| RuleTester | A utility class for unit-testing custom rules with valid and invalid code fixtures. |
| Fixable rule | A rule that can emit automatic source-code edits. |
| CPG (Code Property Graph) | A unified graph combining AST, control flow, and data flow; used by Joern and CodeQL-like tools. |

## Findings

### ESLint Custom Rule Architecture

ESLint custom rules are JavaScript modules that export an object with two required properties: `meta` and `create` [S2]. The `create(context)` function returns an object whose keys are either ESTree node type names (e.g., `FunctionDeclaration`) or selector strings. When ESLint traverses the AST, it calls the matching visitor function for each node [S2].

**Required language and runtime.** Rules are written in JavaScript and distributed as CommonJS modules. Development and execution require Node.js and npm [S1]. No other language runtime is supported for rule authoring.

**AST exposure and traversal.** Rule authors interact with the AST through the `context` object and the `sourceCode` object. The AST follows the ESTree specification, meaning custom parsers must produce ESTree-compatible trees [S2]. ESLint provides a Code Explorer tool to inspect the AST of JavaScript code, helping authors determine target node types [S1].

**Selectors.** Beyond raw node types, ESLint supports ESQuery-style selectors that match nodes by type, attributes, and structural relationships. This allows rules to target narrow patterns (e.g., `MemberExpression[object.name='console'][property.name='log']`) without manual tree walking.

**Fixes and suggestions.** Rules can emit automatic fixes or suggestions. The `meta.fixable` property must be set (`"code"`, `"whitespace"`, or `null`) for any rule that produces fixes; ESLint throws an error at fix-emission time if it is missing [S2]. Similarly, `meta.hasSuggestions` must be set to `true` for rules that provide suggestions [S2]. This validation is deferred: the error occurs only when the rule actually attempts a fix or suggestion, not during configuration loading [S2].

**Language scoping.** The `meta.languages` property restricts a rule to specific language identifiers (e.g., `["js/js"]`). If none of the declared languages matches the active language, ESLint throws an error [S2]. Language identifiers follow direct, wildcard, and namespace matching rules.

**Packaging and distribution.** Custom rules are bundled into plugins—JavaScript objects with a `rules` property mapping rule names to rule objects [S1]. Plugins are distributed as npm packages. The documented tutorial uses CommonJS (`module.exports`); no ESM-only distribution is documented in the primary tutorial [S1].

**Testing.** ESLint ships `RuleTester`, a built-in class for unit-testing rules with arrays of valid and invalid test cases [S1]. It integrates with test runners like Mocha or Jest. RuleTester requires at least one valid and one invalid test case [S1].

### Documented API Changes and Breaking Points

| Change | Impact | Source |
|---|---|---|
| `context.getScope()` removed | Calling it throws `TypeError`; authors must use `sourceCode.getScope()` | [S2] |
| Core rules are not public API | Extending or subclassing core rules is unsupported and fragile | [S2] |
| `meta.fixable` mandatory for fixable rules | Missing property causes runtime error at fix-emission time | [S2] |
| `meta.hasSuggestions` mandatory for suggestion rules | Missing property causes runtime error at suggestion-emission time | [S2] |

### Core Rule Reuse Limitation

ESLint explicitly warns that core rules shipped in the `eslint` package are not part of the public API and are not designed to be extended [S2]. Authors who want to build on core rule logic must copy the code manually. This creates a maintenance burden: copied code will not receive upstream fixes.

> "The core rules shipped in the eslint package are not considered part of the public API and are not designed to be extended from." [S2]

Insight: This design choice forces a trade-off. Authors can either accept duplication and maintenance cost, or write rules from scratch using only the documented visitor and selector APIs. There is no middle ground such as protected methods or rule composition.

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Rules export `{meta, create}` with visitor methods keyed by node type or selector | "If a key is a node type or a selector, ESLint calls that visitor function while going down the tree." | [S2] | Only ESTree-based ASTs; custom parsers must conform. |
| Rules require JavaScript/Node.js | "Prerequisites: Node.js, npm. The rule file uses module.exports." | [S1] | No other language runtime supported. |
| Core rules cannot be safely extended | Warning in docs: building on core rules is "fragile" and will "most likely result in your rules breaking." | [S2] | No inheritance/mixin mechanism; manual copying only. |
| `meta.fixable` is mandatory for fixable rules | "If this property isn't specified, ESLint will throw an error whenever the rule attempts to produce a fix." | [S2] | Validation is deferred to fix-emission time, not config load. |
| `context.getScope()` removed | Troubleshooting entry: "TypeError: context.getScope is not a function" | [S2] | Mentioned as troubleshooting, not a full migration guide. |
| Rules are distributed as plugins with a `rules` map | "const plugin = { rules: { 'enforce-foo-bar': fooBarRule } }; module.exports = plugin;" | [S1] | CommonJS only in documented tutorial; ESM not covered. |
| `RuleTester` provides valid/invalid test case arrays | "ESLint provides the built-in RuleTester class to test rules." | [S1] | Requires at least one valid and one invalid case. |
| `meta.languages` scopes rules to specific languages | "When languages is specified and none of the entries matches the active language, ESLint throws an error." | [S2] | Language identifier matching rules are complex. |

### Coverage Gap for Other Tools

The admitted source register contains no documentation for typescript-eslint, Semgrep, CodeQL, Joern, ArchUnit, dependency-cruiser, or ast-grep. The research plan included search queries for these tools, but no sources were admitted. Consequently, this report cannot make source-grounded claims about their extension mechanisms, required runtimes, query primitives, packaging models, or documented limitations.

The following table marks the evidence status for each tool:

| Tool | Extension Model | Required Runtime | Query Primitives | Packaging | IDE/CI Integration | Evidence Status |
|---|---|---|---|---|---|---|
| ESLint | Visitor + selectors | Node.js / JavaScript | ESTree node types, ESQuery selectors | npm plugin (CommonJS) | Documented; RuleTester for CI | Admitted [S1][S2] |
| typescript-eslint | — | — | — | — | — | No admitted source |
| Semgrep | — | — | — | — | — | No admitted source |
| CodeQL | — | — | — | — | — | No admitted source |
| Joern | — | — | — | — | — | No admitted source |
| ArchUnit | — | — | — | — | — | No admitted source |
| dependency-cruiser | — | — | — | — | — | No admitted source |
| ast-grep | — | — | — | — | — | No admitted source |

## Design Implications

For teams choosing a custom rule ecosystem based on the available evidence:

1. **ESLint is well-documented for JavaScript custom rules.** The visitor-plus-selector model is expressive for syntactic and structural patterns. The `RuleTester` utility and plugin packaging model provide a complete authoring-to-distribution workflow [S1][S2].

2. **Core rule reuse is a dead end.** Teams that need logic similar to an existing core rule must copy and maintain it independently [S2]. This increases maintenance cost and creates divergence risk.

3. **Deferred validation is a footgun.** The `meta.fixable` and `meta.hasSuggestions` checks fire only at fix-emission time, not at configuration load [S2]. A rule with missing metadata can pass CI in configurations that never trigger a fix, then fail in production when a fix is attempted.

4. **Language scoping adds safety but complexity.** The `meta.languages` property prevents misapplication but requires authors to understand identifier matching rules [S2].

5. **No comparison is possible from admitted evidence.** Teams evaluating Semgrep's pattern matching, CodeQL's dataflow queries, or Joern's CPG traversals against ESLint's visitor model cannot make a source-grounded decision from this report alone.

## Limitations and Threats to Validity

**Missing sources.** The primary threat to validity is the absence of admitted sources for seven of the eight tools. The research plan anticipated official documentation for each tool, but only ESLint sources were admitted. This may reflect search execution failure, source admission filtering, or temporal constraints in the research pipeline.

**ESLint-only depth.** All findings are specific to ESLint's documented custom rule API. Generalizing these findings to other tools or to the static analysis ecosystem broadly would be invalid.

**Version sensitivity.** The ESLint documentation reflects the current major version as of mid-2026. The `context.getScope()` removal [S2] demonstrates that API changes occur and may not be fully captured in migration guides.

**No performance evidence.** The admitted sources do not document performance characteristics, scalability limits, or incremental evaluation constraints for ESLint custom rules.

**No vendor bias assessment.** Because only official ESLint documentation is admitted, there is no independent or community-perspective source to check for vendor bias.

## Open Questions

1. What are the documented extension mechanisms for typescript-eslint custom rules, and how do they differ from base ESLint rules given TypeScript's richer type information?
2. How does Semgrep's pattern-matching syntax compare to ESLint's selector model in expressiveness and authoring ergonomics?
3. What are the performance and language coverage limits of CodeQL's QL queries for custom rules in CI pipelines?
4. Does Joern's CPG-based query model support incremental evaluation, and what are the documented constraints?
5. How do ArchUnit and dependency-cruiser expose their dependency models to rule authors, and what traversal primitives are available?
6. What are the packaging and distribution requirements for ast-grep custom rules, and do they support IDE-integrated evaluation?
7. Are there peer-reviewed comparisons of custom rule expressiveness across these tools?

## Recommended Next Experiments

1. **Retrieve official documentation for the seven missing tools.** Execute targeted searches for each tool's custom rule authoring guide (e.g., "Semgrep writing custom rules official documentation," "CodeQL custom queries guide," "Joern custom rules CPG"). Admit these sources and re-run the comparison.

2. **Build a canonical rule in each tool.** Implement the same rule (e.g., "flag direct console.log calls") in all eight tools to compare authoring effort, expressiveness, and testing support empirically.

3. **Measure deferred validation impact in ESLint.** Construct a custom rule with `meta.fixable` omitted but a fix-emitting code path, and verify whether CI catches the error before production. This tests the practical impact of the deferred validation documented in [S2].

4. **Audit ESLint plugin ESM compatibility.** Test whether ESM-only plugin distribution works with current ESLint, since the documented tutorial covers only CommonJS [S1].

5. **Collect community-reported limitations.** Search GitHub issues and discussions for each tool to identify undocumented limits, performance complaints, and breaking-change histories that official docs may not surface.

## Source Register

- [S1] [Custom Rule Tutorial - ESLint - Pluggable JavaScript Linter](https://eslint.org/docs/latest/extend/custom-rule-tutorial) — admitted, score 20, discovered by `ESLint custom rule authoring guide official documentation`
- [S2] [Custom Rules - ESLint - Pluggable JavaScript Linter](https://eslint.org/docs/latest/extend/custom-rules) — admitted, score 20, discovered by `ESLint custom rule authoring guide official documentation`
- [S3] [How to easily define and configure your own ESLint rules without the hassle | by Avraham Hamu | Medium](https://medium.com/@avrahamhamu/how-to-easily-define-and-configure-your-own-eslint-rules-without-the-hassle-a15d1fb0134f) — rejected, score 8, discovered by `ESLint custom rule authoring guide official documentation`
- [S4] [Writing Our Own ESLint Rules | Enterprise UI | Steve Kinney](https://stevekinney.com/courses/enterprise-ui/writing-eslint-rules) — rejected, score 12, discovered by `ESLint custom rule authoring guide official documentation`
- [S5] [Custom eslint rules · microsoft/vscode Wiki](https://github.com/microsoft/vscode/wiki/Custom-eslint-rules) — rejected, score 7, discovered by `ESLint custom rule authoring guide official documentation`

## Research Trace

### Goal

Compare the custom rule extension points, APIs, and limitations of ESLint, typescript-eslint, Semgrep, CodeQL, Joern, ArchUnit, dependency-cruiser, and ast-grep based on official documentation.

### Subquestions

- What is the primary extension mechanism for authoring custom rules in each tool (e.g., visitor API, query language, pattern matching, AST selectors)?
- What language(s) and runtime(s) are required to write and execute custom rules for each tool?
- What are the documented limits on expressiveness, performance, or supported language constructs for custom rules in each tool?
- How does each tool expose its AST/CPG/dependency model to rule authors, and what traversal or query primitives are available?
- What are the packaging, distribution, and integration requirements for custom rules (plugins, packages, query bundles, scripts)?
- Which tools support incremental or IDE-integrated evaluation of custom rules, and what are the documented constraints?

### Research Perspectives

- **Primary documentation** — Extract official extension points, APIs, and authoring workflows directly from each tool's docs.
- **Implementation examples** — Find canonical examples of custom rules in repos, cookbooks, or docs to illustrate the authoring model.
- **Limitations and criticism** — Identify documented or community-reported limits, performance constraints, and failure modes of custom rule authoring.
- **Comparative evaluation** — Contrast expressiveness, language coverage, and integration ergonomics across the eight tools.
- **Recency** — Capture recent changes to rule APIs or extension models since 2024.
- **Operational implications** — Assess packaging, CI integration, IDE support, and maintenance burden for custom rules.

### Source Requirements

- Official documentation pages for each tool's custom rule authoring guide
- Primary GitHub repositories and release notes/changelogs for API changes
- Canonical example rules or cookbooks from each tool's repo or docs
- Peer-reviewed or technical reports comparing static analysis extensibility
- Issue trackers or discussions documenting limitations and known bugs
- Benchmark or evaluation sources comparing rule performance or coverage

### Success Criteria

- Each of the eight tools has a dedicated section describing its extension mechanism with citations to official docs.
- The report includes a comparison table covering extension model, required language/runtime, query/traversal primitives, packaging, and IDE/CI integration.
- At least three documented limitations or constraints are identified per tool where applicable.
- Recent (2024-2026) API changes or deprecations are noted for tools that have them.
- The report distinguishes between configuration-based customization and true custom rule authoring.
- All claims about extension points are traceable to primary sources.

### Search Queries

- `ESLint custom rule authoring guide official documentation` — Retrieve the primary ESLint docs for writing custom rules and the visitor/selector API. [Primary documentation / official docs]
- `Semgrep custom rules writing guide pattern syntax limitations` — Get official Semgrep docs on rule authoring, pattern matching, and documented limits. [Primary documentation / official docs]
- `limits official GitHub repository documentation deep research agent 2026` — Ensure explicit coverage for named comparison target limits. [entity coverage / repo/docs/benchmark]
- `extension points official GitHub repository documentation deep research agent 2026` — Ensure explicit coverage for named comparison target extension points. [entity coverage / repo/docs/benchmark]

### Source Quality

- [S1] Official ESLint custom rule tutorial, directly covers authoring workflow, visitor API, and autofix. score=20 type=official docs admitted=true warnings=
- [S2] Official ESLint custom rules reference, covers rule metadata schema and API details complementary to the tutorial. score=20 type=official docs admitted=true warnings=
- [S3] Third-party Medium article with low authority; duplicates official docs without adding unique value. Not a primary source. score=8 type=other admitted=false warnings=Unofficial source, not suitable for authoritative comparison.
- [S4] Third-party tutorial with some useful context on flat config and selectors, but lacks official authority. Overlaps with official docs. score=12 type=other admitted=false warnings=Not official documentation; may contain opinionated advice not representative of the tool's design.
- [S5] Unreadable for scoring; page lacks extractable information on custom rules. No useful content. score=7 type=other admitted=false warnings=Page content missing or minimal; cannot be used for analysis.

### Evidence Notes

- [S2] ESLint custom rules are defined by exporting an object with meta and create() function, where create() returns visitor methods for AST node types or selectors. Evidence: If a key is a node type or a selector, ESLint calls that visitor function while going down the tree. ... The source file for a rule exports an object with the following properties: meta, create() Limitations: Only works for languages parsed into ESTree-based AST; custom parsers must also produce ESTree-compatible AST.
- [S1] ESLint custom rules are written in JavaScript (CommonJS module) and require Node.js/npm for development and distribution. Evidence: Prerequisites: Node.js, npm. The rule file uses module.exports = { meta: {...}, create(context) {...} }. Limitations: Only JavaScript/Node.js environment is supported; rules cannot be written in other languages.
- [S2] Core ESLint rules are not part of the public API and cannot be safely extended; users must copy core rule code instead of subclassing them. Evidence: Warning: The core rules shipped in the eslint package are not considered part of the public API and are not designed to be extended from. Building on top of these rules is fragile and will most likely result in your rules breaking completely at some point in the future. Limitations: No inheritance/mixin mechanism for core rules; manual copying is the only workaround.
- [S2] ESLint throws an error if a rule declares fixable or hasSuggestions in its meta but the corresponding property is missing or set incorrectly. Evidence: Important: the fixable property is mandatory for fixable rules. If this property isn’t specified, ESLint will throw an error whenever the rule attempts to produce a fix. ... Important: the hasSuggestions property is mandatory for rules that provide suggestions. If this property isn’t set to true, ESLint will throw an error whenever the rule attempts to produce a suggestion. Limitations: No runtime validation; the error only occurs when the rule actually attempts a fix/suggestion, not during configuration loading.
- [S2] The context.getScope() method has been removed; using it results in a TypeError. Evidence: Troubleshooting: TypeError: context.getScope is not a function Limitations: Only mentioned as a troubleshooting item, not a full migration guide.
- [S1] Custom rules are bundled and distributed as plugins, which are JavaScript objects with a rules property mapping rule names to rule objects. Evidence: Step 7: Bundle the Custom Rule in a Plugin. ... const plugin = { rules: { "enforce-foo-bar": fooBarRule } }; module.exports = plugin; Limitations: Plugin must be a CommonJS module; no ESM-only distribution documented in this tutorial.
- [S1] ESLint provides the built-in RuleTester class for unit testing custom rules, with support for valid and invalid test case arrays. Evidence: Step 5: Set up Testing ... ESLint provides the built-in RuleTester class to test rules. ... ruleTester.run("enforce-foo-bar", fooBarRule, { valid: [...], invalid: [...] }) Limitations: RuleTester requires at least one valid and one invalid test case; error messages are not configurable beyond checking error count.
- [S1] Authors can use ESLint’s Code Explorer to inspect the ESTree AST of any JavaScript code, aiding in determining node types for custom rule visitors. Evidence: Tip: You can view the AST for any JavaScript code using Code Explorer. This is helpful in determining the type of nodes you’d like to target. Limitations: Only works for JavaScript/TypeScript code; not available for other languages like CSS or Markdown unless custom parsers are used.
- [S2] Rules can be scoped to specific languages using the languages property in meta; ESLint throws an error if the rule’s language list does not match the active language. Evidence: When languages is specified and none of the entries matches the active language, ESLint throws an error. ... meta: { languages: ["js/js"] } Limitations: Language identifiers must follow specific matching rules (direct, wildcard, namespace); complex for custom plugin authors.

### Claim Verification

- **supported**: ESLint custom rules are JavaScript modules that export an object with `meta` and `create` properties, and the `create` function returns visitor methods keyed by ESTree node types or selectors. — Evidence from S2 confirms that rules export an object with meta and create(), and create() returns visitor methods for AST node types or selectors.
- **supported**: ESLint custom rule development requires Node.js and npm, and rules are written in JavaScript as CommonJS modules. — Evidence from S1 states prerequisites include Node.js and npm, and the rule file uses module.exports, indicating CommonJS modules.
- **supported**: ESLint supports ESQuery-style selectors for matching AST nodes in custom rules. — Evidence from S2 mentions that keys can be node types or selectors, and selectors are ESQuery-style.
- **supported**: For rules that produce fixes, the `meta.fixable` property must be set; ESLint throws an error if a fix is attempted without it. — Evidence from S2 explicitly states that the fixable property is mandatory and ESLint throws an error if a fix is attempted without it.
- **supported**: For rules that produce suggestions, the `meta.hasSuggestions` property must be set; ESLint throws an error if a suggestion is attempted without it. — Evidence from S2 explicitly states that hasSuggestions is mandatory and ESLint throws an error if a suggestion is attempted without it.
- **supported**: ESLint's core rules are not part of the public API and are not designed to be extended; extending them is fragile and likely to break. — Evidence from S2 includes a warning that core rules are not part of the public API and extending them is fragile and likely to break.
- **supported**: ESLint provides a `RuleTester` class for unit-testing custom rules with valid and invalid test cases, requiring at least one of each. — Evidence from S1 describes the RuleTester class and shows usage with valid and invalid arrays, and notes that at least one valid and one invalid test case are required.
- **supported**: The `meta.languages` property restricts a custom rule to specific language identifiers; ESLint throws an error if none match the active language. — Evidence from S2 states that when languages is specified and none match, ESLint throws an error.

### Final Evaluation

- coverage: 2/5
- citation_quality: 3/5
- factuality: 4/5
- analysis_depth: 3/5
- presentation: 4/5
- overall: 2/5

Strengths:
- Transparent reporting of evidence gaps, acknowledging that only ESLint documentation was admitted
- Thorough coverage of ESLint custom rules with concrete examples, citations, and a detailed evidence table
- Useful claim verification table that ties claims directly to sources and identifies limitations

Weaknesses:
- Fails to compare the eight tools as intended due to insufficient source admission; the comparison table is almost entirely blank
- Only one tool (ESLint) is analyzed, leaving the research goal largely unaddressed
- Limited source diversity: relies solely on two ESLint documentation pages; no community-reported limitations or secondary sources

Follow-up recommendations:
- Retrieve official documentation for the seven missing tools (typescript-eslint, Semgrep, CodeQL, Joern, ArchUnit, dependency-cruiser, ast-grep) to enable the intended comparison
- Implement a canonical rule (e.g., detect console.log calls) across all tools to empirically compare extension mechanisms, authoring effort, and testing support
- Collect community-reported limitations and performance characteristics from GitHub issues, discussions, and benchmarks for a more balanced assessment
