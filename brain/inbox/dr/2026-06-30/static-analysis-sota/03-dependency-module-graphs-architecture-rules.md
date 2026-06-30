---
title: "Static analysis dependency graphs and module graphs: architecture rules, import boundaries, dependency-cruiser, ArchUnit, build graph limitations"
generated_at: 2026-06-29T20:56:27.097610+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static Dependency and Module Graphs for Architecture Enforcement: A Comparative Analysis of dependency-cruiser and Build Graph Limitations

## Abstract

Static analysis tools that model import relationships as graphs can enforce architecture rules at finer granularity than build systems. This report examines how dependency-cruiser represents and validates dependency and module graphs in JavaScript/TypeScript projects, compares it with build-level enforcement mechanisms (Nx Module Boundaries, TypeScript Project References, ESLint), and identifies specific limitations of build graphs when used for architecture enforcement. The evidence shows that dedicated graph-based tools support folder-level rules, allow-list enforcement, required-dependency rules, and circular dependency detection that build graphs cannot provide. However, the admitted sources cover only the JS/TS ecosystem; ArchUnit and JVM-side tools are not represented in the evidence base, limiting cross-ecosystem generalization.

## Research Question

How do static analysis tools use dependency and module graphs to enforce architecture rules and import boundaries, and what limitations do build graphs impose compared to dedicated tools?

Sub-questions address: (1) graph modeling and rule types in dependency-cruiser, (2) the distinction between dependency graphs and module graphs, (3) build graph limitations in Nx, TypeScript Project References, and ESLint, (4) handling of cyclic dependencies and dynamic imports, (5) documented failure modes, and (6) CI integration patterns.

## Method

The research drew on official documentation, technical blog posts, and configuration references for dependency-cruiser and build-level enforcement tools. Sources were selected from an admitted register of six items covering dependency-cruiser documentation [S3], comparison articles [S1, S2], configuration examples [S4, S5], and build tool limitations [S6]. No peer-reviewed literature or issue-tracker data was admitted. ArchUnit documentation was sought but not represented in the final evidence base, so JVM-side claims are excluded from findings.

## Conceptual Background

Static dependency analysis constructs a directed graph where nodes are modules or files and edges are import relationships. Two graph granularities matter for architecture enforcement:

| Term | Definition | Relevance to Enforcement |
|------|------------|--------------------------|
| Dependency graph | Nodes are individual modules/files; edges are imports between them | Detects file-level cycles, orphan files, direct import violations |
| Module graph | Nodes are folders/packages/groups; edges are aggregated import relationships | Detects folder-level cycles, layer violations, cross-domain coupling |
| Build graph | Nodes are build targets/projects; edges are build-time dependencies | Enforces coarse project-level boundaries but not sub-folder rules |
| Import boundary | A rule restricting which modules/folders may import from which others | Primary mechanism for architecture enforcement |

The distinction between dependency graphs and module graphs is operational, not theoretical. dependency-cruiser exposes it through a `scope` attribute that switches rule evaluation between module-level and folder-level graphs [S3]. Build tools like Nx operate only at the project/library level, which corresponds to a coarse module graph [S2].

## Findings

### dependency-cruiser: Graph Model and Rule Types

dependency-cruiser constructs a dependency graph from static import analysis of JavaScript/TypeScript source files. Its configuration has four main sections: `forbidden`, `allowed`, `required`, and `options`, with support for extending other configs [S3]. Rules use regular expressions for path matching, not globs, and support group matching with `$1`/`$2` variables in the `to` portion of rules [S3].

The tool supports two enforcement philosophies:

| Approach | Mechanism | Use Case | Source |
|----------|-----------|----------|--------|
| Forbid | Block known risky imports via `forbidden` rules | Guardrails for evolving codebases | [S1] |
| Allow | Only pre-approved imports permitted via `allowed` rules | Disciplined codebases with clear architecture | [S1] |

ESLint's `no-restricted-imports` rule supports only the forbid approach and cannot define an explicit allowed set [S1], making dependency-cruiser's allow-list capability a distinct advantage for strict enforcement.

### Folder-Level vs Module-Level Scope

The `scope` attribute in dependency-cruiser rules determines whether a rule applies to individual modules or folders. The documentation states that for circular dependencies, "there is a circular dependency between the main and utl folders even if not at module level" [S3], demonstrating that folder-level analysis can detect architectural problems invisible at module level. At the time of writing, only `moreUnstable`, `circular`, and `path`/`pathNot` attributes work at folder scope; other attributes are not yet implemented [S3].

Insight: The folder-level scope is what separates dependency-cruiser from build-graph tools. Nx can only apply rules at the library level via tags in `project.json`, not at the sub-folder level [S2]. This means a monorepo with a single library containing multiple domains cannot enforce inter-domain boundaries using Nx alone.

### Concrete Rule Examples

Layered architecture enforcement uses path-based rules. A rule forbidding components from importing API modules takes the form: `from: { path: "^src/components" }, to: { path: "^src/api" }` [S4].

Domain isolation uses group matching to restrict cross-domain imports while allowing same-domain imports:

```
from: { path: "^src/modules/([^/]+)/domain/" },
to: { path: "^src/", pathNot: ["^src/modules/$1/domain/", "^src/core/types/"] }
```

This rule allows a domain module to import only from its own domain folder or shared core types [S5]. The `$1` variable captures the domain name from the `from` path and reuses it in the `to` path, creating a self-referential boundary.

Required rules mandate that certain dependencies exist. For example, "every module that matches... must depend at least once on the framework's base controller" with an optional `reachable: true` flag for transitive dependencies [S3]. This capability is absent from build graph tools.

### Additional Detection Capabilities

Beyond import restrictions, dependency-cruiser identifies circular dependencies, orphans, dead code, and shared code imported by only one module [S2]. These are architectural smells that build graphs do not surface.

### Build Graph Limitations

| Build Tool | Limitation | Source |
|------------|------------|--------|
| TypeScript Project References | Only works with `tsc` compiler, not Babel or `babel-preset-typescript` | [S6] |
| Nx Module Boundaries | Rules apply only at library/project level via tags, not sub-folder level | [S2] |
| ESLint `no-restricted-imports` | Supports only forbid approach, no allow-list | [S1] |
| ESLint `no-cycle` | Output is hard to trace through multiple files; graphs represent cycles more naturally | [S6] |

The TypeScript Project References limitation is significant for frameworks like Next.js that use Babel-based TypeScript transpilation: "if you're using babel... you're going to struggle to incorporate this feature" [S6]. This restricts build-level boundary enforcement to projects committed to the `tsc` compilation path.

Insight: Build graphs enforce boundaries at the granularity of build targets. When architecture rules need to operate within a single build target (e.g., separating domains inside one library), build graphs provide no enforcement mechanism. Dedicated static analysis tools fill this gap by analyzing source structure independently of build configuration.

### CI Integration

dependency-cruiser integrates into CI through a single validation command: `npx depcruise src --validate .dependency-cruiser.js` [S4]. Pull requests fail when architecture rules are violated. The tool is not integrated with ESLint, which means it runs as a separate step rather than alongside lint rules [S2].

### Evidence Table

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| dependency-cruiser supports forbid and allow approaches | Two enforcement philosophies described in article | [S1] | Vendor-adjacent blog; no benchmark data |
| Folder-level scope detects cycles invisible at module level | Documentation describes folder-level circular detection | [S3] | Only some attributes work at folder scope |
| Nx Module Boundaries cannot enforce sub-folder rules | Article states rules apply only at library level via tags | [S2] | Specific to Nx built-in enforcement |
| TypeScript Project References incompatible with Babel | Article states references only work with tsc | [S6] | Single developer's assessment |
| Required rules can enforce mandatory dependencies | Documentation shows required rule with reachable flag | [S3] | Maintenance burden if base dependency moves |
| ESLint no-cycle output hard to trace | Author reports difficulty tracing output across files | [S6] | Opinion; others may find it sufficient |

## Design Implications

1. **Use dedicated static analysis for sub-folder boundaries.** Build graphs enforce at project/library granularity. When architecture rules need folder-level enforcement within a single build target, dependency-cruiser's `scope: folder` is the documented mechanism [S3]. Nx alone cannot provide this [S2].

2. **Prefer allow-lists for stable architectures, forbid-lists for evolving ones.** The allow approach creates a "highly disciplined codebase" but requires a clear architectural vision upfront [S1]. For projects where architecture is still emerging, forbid rules provide guardrails without over-constraining.

3. **Run dependency-cruiser as a separate CI step, not through ESLint.** Since dependency-cruiser is not ESLint-integrated [S2], teams should add it as a distinct pipeline stage with its own configuration file, rather than expecting it to appear in lint output.

4. **Use group matching for domain isolation in modular monoliths.** The `$1` variable pattern enables self-referential domain boundaries without enumerating each domain separately [S5]. This scales better than per-domain rules as the number of domains grows.

5. **Do not rely on TypeScript Project References for boundary enforcement in Babel-based projects.** The incompatibility with Babel transpilation [S6] means teams using Next.js or similar frameworks need a static analysis tool independent of the compiler.

6. **Visualize dependencies before writing rules.** Common mistakes include creating overly strict rules too early and not visualizing the dependency graph first [S4]. Teams should generate reports to understand existing structure before constraining it.

## Limitations and Threats to Validity

**Source coverage gap.** The admitted evidence base contains no sources on ArchUnit, Bazel, or Gradle. All findings pertain to the JavaScript/TypeScript ecosystem. Claims about JVM architecture enforcement or Bazel/Gradle build graph limitations are not supported by the evidence and are excluded from findings.

**Source quality.** Five of six sources are blog posts or community articles rather than peer-reviewed research or official issue-tracker data [S1, S2, S4, S5, S6]. Only [S3] is official documentation. No benchmark data, false-positive rates, or large-scale empirical evaluations were admitted.

**Temporal validity.** The current date is 2026-06-29. No sources with explicit 2024-2026 publication dates were admitted. The dependency-cruiser documentation [S3] may reflect a specific version; folder-level scope limitations ("not yet implemented" for some attributes) may have been resolved since writing.

**Vendor and author bias.** Sources [S1] and [S5] come from consulting or standards organizations with an interest in promoting structured approaches. Source [S2] compares tools but may reflect the author's monorepo experience rather than generalizable findings.

**Missing evidence on dynamic imports.** No admitted source documents how dependency-cruiser or build tools handle dynamic `import()` expressions. The plan assumed static analysis only, but the absence of evidence on dynamic import handling is a gap, not a finding.

**Missing evidence on false positives.** No issue-tracker data or empirical false-positive analysis was admitted. The common-mistakes list in [S4] is advisory, not derived from documented project failures.

## Open Questions

1. How does dependency-cruiser handle dynamic `import()` expressions, and does it treat them as edges in the dependency graph?
2. What is the false-positive rate of dependency-cruiser rules in large monorepos (1000+ modules)?
3. How does ArchUnit model module graphs in JVM ecosystems, and does it support folder-level scope analogous to dependency-cruiser's `scope: folder`?
4. Can Bazel's `visibility` and `deps` constraints enforce sub-package boundaries, or are they limited to target-level granularity?
5. Has the folder-level scope limitation in dependency-cruiser (unimplemented attributes) been resolved in versions released after the documentation source was written?
6. How do re-exports (barrel files) affect dependency graph accuracy in dependency-cruiser, and do they create false cycles?

## Recommended Next Experiments

1. **Controlled comparison of cycle detection.** Run dependency-cruiser and ESLint `no-cycle` on the same codebase with known circular dependencies. Measure detection accuracy, output traceability, and false-positive count. This tests the claim that graphs represent cycles more naturally than lint rules [S6].

2. **Folder-level scope stress test.** Configure dependency-cruiser with `scope: folder` on a monorepo with nested domain folders. Verify which rule attributes work at folder level and document any silent failures or unsupported combinations. This validates the documentation's stated limitations [S3].

3. **Build graph vs static analysis boundary enforcement.** In an Nx monorepo with a single library containing multiple domains, attempt to enforce inter-domain import boundaries using (a) Nx Module Boundaries alone and (b) dependency-cruiser folder-level rules. Compare enforcement granularity and configuration effort. This tests the claim that Nx cannot enforce sub-folder rules [S2].

4. **Dynamic import handling test.** Create a test codebase with static imports, dynamic `import()` calls, and re-exports. Run dependency-cruiser and examine whether dynamic imports appear as edges. This addresses the open question on dynamic import handling.

5. **ArchUnit cross-ecosystem replication.** Replicate the domain isolation rule pattern from [S5] in a Java/Kotlin project using ArchUnit. Compare the rule expressiveness, group matching capability, and folder-level enforcement support. This fills the JVM evidence gap.

## Source Register

- [S1] [Dependency Cruiser: Restrict Imports in JavaScript](https://spin.atomicobject.com/dependency-cruiser-imports/) — admitted, score 12, discovered by `dependency-cruiser architecture rules import boundaries configuration`
- [S2] [Three Ways to Enforce Module Boundaries and Dependency Rules in an Nx Monorepo](https://www.stefanos-lignos.dev/posts/nx-module-boundaries) — admitted, score 16, discovered by `dependency-cruiser architecture rules import boundaries configuration`
- [S3] [dependency-cruiser/doc/rules-reference.md at main · sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md) — admitted, score 19, discovered by `dependency-cruiser architecture rules import boundaries configuration`
- [S4] [Avoid Cross Module Dependencies with Dependency Cruiser - DEV Community](https://dev.to/jacobandrewsky/avoid-cross-module-dependencies-with-dependency-cruiser-3b0b) — admitted, score 12, discovered by `dependency-cruiser architecture rules import boundaries configuration`
- [S5] [Dependency Cruiser Configuration | Synapse Studios Standards](https://docs.synapsestudios.com/implementation/frameworks/nest/dependency-cruiser-config) — admitted, score 15, discovered by `dependency-cruiser architecture rules import boundaries configuration`
- [S6] [6 Tools for Enforcing Good Web Architecture](https://jmulholland.com/architecture-tools/) — admitted, score 10, discovered by `dependency-cruiser architecture rules import boundaries configuration`

## Research Trace

### Goal

Investigate how static analysis tools use dependency and module graphs to enforce architecture rules and import boundaries, comparing dependency-cruiser, ArchUnit, and build graph limitations.

### Subquestions

- How do dependency-cruiser and ArchUnit model dependency/module graphs and what architecture rules can they enforce?
- What are the key differences between dependency graphs and module graphs in static analysis, and why does the distinction matter for import boundaries?
- What limitations do build graphs (Bazel, Gradle, Webpack, TypeScript project references) impose when used for architecture enforcement compared to dedicated static analysis tools?
- How do these tools handle dynamic imports, re-exports, cyclic dependencies, and cross-package boundaries?
- What are documented failure modes, false positives/negatives, and criticisms of dependency-cruiser and ArchUnit in real-world projects?
- What are current best practices and configuration patterns for combining build-level module boundaries with static analysis rules?

### Research Perspectives

- **Primary sources and documentation** — Capture official docs, rule schemas, and configuration examples from dependency-cruiser and ArchUnit.
- **Implementation and benchmarks** — Find repos, example configs, and performance/accuracy evaluations of static analysis tools on large codebases.
- **Build graph limitations** — Identify constraints and gaps when relying on build tools (Bazel, Gradle, Webpack, TS project references) for dependency enforcement.
- **Criticism and counterevidence** — Surface limitations, false positives, maintenance burden, and critiques of static dependency analysis approaches.
- **Recency and ecosystem trends** — Identify 2024-2026 updates, new rule types, and emerging alternatives for architecture enforcement.
- **Operational implications** — Determine how to integrate these tools into CI, monorepos, and developer workflows with minimal friction.

### Source Requirements

- Official documentation for dependency-cruiser and ArchUnit
- GitHub repositories with example .dependency-cruiser.js or ArchUnit test configurations
- Technical blog posts comparing static architecture enforcement tools
- Issue trackers or discussions documenting false positives, cyclic dependency handling, and dynamic import limitations
- Build tool documentation (Bazel, Gradle, Webpack, TypeScript project references) on dependency graph constraints
- Recent (2024-2026) release notes or changelogs for dependency-cruiser and ArchUnit

### Success Criteria

- The report clearly distinguishes dependency graphs from module graphs and explains why the distinction matters for import boundaries.
- It provides concrete rule examples for dependency-cruiser and ArchUnit, including allowed/forbidden dependencies and layer enforcement.
- It identifies at least three specific limitations of build graphs versus dedicated static analysis tools.
- It addresses handling of dynamic imports, re-exports, and cyclic dependencies with evidence from docs or issues.
- It includes documented criticisms or failure modes with citations to issues, blogs, or discussions.
- It offers actionable CI/monorepo integration guidance with config snippets or workflow patterns.

### Search Queries

- `dependency-cruiser architecture rules import boundaries configuration` — Find official docs and config examples for dependency-cruiser rule enforcement. [Primary sources and documentation / official documentation]
- `ArchUnit dependency rules module boundaries examples` — Retrieve ArchUnit documentation and real-world test examples for architecture enforcement. [Primary sources and documentation / official documentation]
- `build graph limitations Bazel Gradle Webpack TypeScript project references architecture enforcement` — Surface constraints and gaps when using build tools for dependency enforcement. [Build graph limitations / technical blog posts and docs]
- `dependency-cruiser ArchUnit false positives cyclic dependencies dynamic imports limitations` — Find criticisms, issue discussions, and failure modes of static dependency analysis tools. [Criticism and counterevidence / issue trackers and discussions]

### Source Quality

- [S1] Provides a basic overview of dependency-cruiser for JavaScript projects. Useful as introductory content but lacks depth on rule schemas, module graph distinctions, and limitations. score=12 type=other admitted=true warnings=Not official documentation; blog post with limited authority.
- [S2] Covers three tools (Nx, dependency-cruiser, Sheriff) for enforcing module boundaries in an Nx monorepo. Updated in 2026, provides practical examples and comparisons. Valuable for integration and best practices. score=16 type=other admitted=true warnings=Personal blog, not official documentation; content relies on Nx framework.
- [S3] Official rules reference for dependency-cruiser from the main GitHub repository. Essential for understanding rule schemas, configuration options, and enforcement capabilities. High authority and recency. score=19 type=official documentation admitted=true warnings=
- [S4] Tutorial-style article on dependency-cruiser for cross-module dependencies. Provides practical examples but overlaps with S1 and S2 in content. Lower authority as a community post. score=12 type=other admitted=true warnings=Community blog; not official documentation.
- [S5] Provides concrete .dependency-cruiser.js configuration for NestJS modular monoliths, including domain isolation and adapter rules. High practical value for real-world patterns. score=15 type=other admitted=true warnings=Company documentation; limited peer review, but still useful.
- [S6] Lists six tools for enforcing web architecture. Adds context but is broader in scope and older (2021). Less relevant than dedicated dependency-cruiser/ArchUnit sources. score=10 type=other admitted=true warnings=Outdated discussion (2021); limited depth on dependency-cruiser.

### Evidence Notes

- [S1] Dependency-cruiser supports both 'forbid' and 'allow' approaches to dependency restrictions. Evidence: The article describes two approaches: 'forbid' (set guardrails to avoid known risks) and 'allow' (only pre-approved dependencies can be introduced, creating a highly disciplined codebase). Limitations: The 'allow' approach is stricter and better for projects with a clear architectural vision; may be overkill for smaller projects.
- [S2] Dependency-cruiser is the most flexible tool among Nx Module Boundaries, Dependency-cruiser, and Sheriff for enforcing module boundaries at both project and folder level. Evidence: The source states: 'This tool is the most flexible between the three... you can set rules also at the folders level, it doesn’t depend on the tags you set in each project.' Limitations: Not integrated with ESLint; has a steeper learning curve due to richer API.
- [S2] Dependency-cruiser can identify circular dependencies, orphans, dead code, and shared code that is actually only used by one module. Evidence: The article says: 'apart from defining and validating dependency rules, you can also use it to identify circular dependencies, orphans, or code marked as “shared” that’s actually imported by only one other module, and more.' Limitations: No explicit limitations mentioned; these are additional capabilities beyond basic enforcement.
- [S3] Dependency-cruiser configuration has four main sections: forbidden, allowed, required, and options, with the ability to extend other configs. Evidence: The rules reference states: 'The most important sections in the config are forbidden, allowed, required and options' and 'extends takes one or more file path to other dependency-cruiser-configs.' Limitations: Rules merging behavior for forbidden/required uses name-based merging; options get Object.assign treatment, which may have unexpected results if not careful.
- [S3] Dependency-cruiser uses regular expressions (not globs) for path matching and supports group matching with $1, $2 variables in 'to' rules. Evidence: The reference explains: 'I chose regular expressions for matching paths' and 'In the to part of your rule: You can reference the part matched between brackets by using $1 in path and pathNot rules.' Limitations: Regex can be verbose and harder to maintain; users unfamiliar with regex may struggle.
- [S3] The 'scope' attribute in a rule allows applying rules to folders instead of modules, which affects instability and circular dependency detection. Evidence: The documentation says: 'What to apply the rule to - either module (the default) or folder... For circular dependencies... there is a circular dependency between the main and utl folders even if not at module level.' Limitations: At the time of writing, only 'moreUnstable', 'circular', and 'path/pathNot' attributes work on folder level; other attributes not yet implemented.
- [S6] TypeScript Project References enforce module boundaries at build time but only work with the tsc compiler, not with Babel or frameworks like Next.js. Evidence: The article states: 'The one big limitation of references is that they only work with Microsoft's tsc compiler and not with babel-preset-typescript... if you're using babel... you're going to struggle to incorporate this feature.' Limitations: This limitation is specific to TypeScript project references; other build tools like Bazel/Gradle have different constraints.
- [S6] The ESLint no-cycle rule has output that is hard to trace through multiple files; dependency graphs are better for understanding circular dependencies. Evidence: The author says: 'In practice, I had a hard time making sense of the output from the no-cycle rule. It often had to be traced through several files, line-by-line... cyclical dependencies are more naturally represented by graphs.' Limitations: This is an opinion from one developer; others may find no-cycle sufficient for simple cases.
- [S4] Dependency-cruiser can enforce layered architectures by forbidding imports from one layer to another using path-based rules. Evidence: Example rule given: 'from: { path: "^src/components" }, to: { path: "^src/api" }' to prevent components from importing API modules. Limitations: Rule only works if the folder structure matches the layering; renaming folders would break rules.
- [S4] Dependency-cruiser can be integrated into CI/CD pipelines so that pull requests fail when architecture rules are violated. Evidence: The article shows command: 'npx depcruise src --validate .dependency-cruiser.js' and states 'Now pull requests fail when architecture rules are violated.' Limitations: Assumes the tool is installed and configured correctly; may require tuning to avoid false positives in CI.
- [S5] Dependency-cruiser group matching can enforce domain isolation: domain code can only import from its own domain folder or shared core types. Evidence: Rule snippet: 'from: { path: "^src/modules/([^/]+)/domain/" }, to: { path: "^src/", pathNot: ["^src/modules/$1/domain/", "^src/core/types/"] }' Limitations: Specific to a NestJS modular monolith folder convention; may not generalize to other project structures.
- [S2] Nx Module Boundaries (built-in) can only apply rules at the project/library level via tags, not at the sub-folder level. Evidence: The article notes: 'You can only apply rules at the library level by assigning tags in the project.json file... if your project is structured differently and you need to apply rules at the sub-folder level, this is not possible.' Limitations: This is a limitation of Nx's built-in enforcement, not of all build graphs; Bazel/Gradle might have different granularity.
- [S4] Common mistakes with Dependency-cruiser include creating overly strict rules too early, ignoring the reports, and not visualizing dependencies. Evidence: The article lists: 'Creating overly strict rules too early', 'Ignoring the reports', 'Not visualizing dependencies' as common mistakes. Limitations: These are general best practices, not documented issues from real-world projects, but still useful.
- [S1] ESLint's no-restricted-imports rule only supports the 'forbid' approach and cannot define explicit allowed imports like Dependency-cruiser can. Evidence: The article states: 'ESLint's no-restricted-imports rule... only supports the "forbid" approach, meaning you can block certain imports but can't define an explicit set of allowed imports, as Dependency Cruiser does.' Limitations: ESLint rule is simpler and may be sufficient for small projects with few restrictions.
- [S3] Dependency-cruiser supports 'required' rules that mandate certain dependencies (e.g., every controller must depend on a base controller), optionally with transitive reachability. Evidence: The rules reference shows a required rule example: 'every module that matches... must depend at least once on the framework's base controller' with optional 'reachable: true' for indirect dependencies. Limitations: Required rules can increase maintenance burden if the base dependency changes name or location.

### Claim Verification

- **supported**: dependency-cruiser constructs a dependency graph from static import analysis of JavaScript/TypeScript source files. — The evidence notes for S3 confirm that dependency-cruiser uses static analysis to build a dependency graph, and the source excerpt describes it as a tool that validates and visualizes dependencies.
- **supported**: dependency-cruiser configuration has four main sections: forbidden, allowed, required, and options, with support for extending other configs. — Evidence notes for S3 explicitly state that the configuration has forbidden, allowed, required, and options sections and supports extending other configs.
- **supported**: Rules in dependency-cruiser use regular expressions for path matching, not globs, and support group matching with $1/$2 variables in the to portion of rules. — Evidence notes for S3 confirm that dependency-cruiser uses regular expressions for path matching and supports $1/$2 variables in the 'to' part of rules.
- **supported**: dependency-cruiser supports both forbid and allow approaches for import enforcement. — Evidence notes for S1 describe both 'forbid' and 'allow' approaches supported by dependency-cruiser.
- **supported**: ESLint's no-restricted-imports rule supports only the forbid approach and cannot define an explicit allowed set. — Evidence notes for S1 state that ESLint's no-restricted-imports rule only supports the 'forbid' approach and cannot define an explicit allowed set.
- **supported**: The scope attribute in dependency-cruiser rules determines whether a rule applies to individual modules or folders. — Evidence notes for S3 explain that the 'scope' attribute allows applying rules to folders instead of modules.
- **supported**: For circular dependencies, there is a circular dependency between the main and utl folders even if not at module level, demonstrating folder-level analysis detects architectural problems invisible at module level. — Evidence notes for S3 mention that for circular dependencies, there is a circular dependency between main and utl folders even if not at module level.
- **supported**: Only moreUnstable, circular, and path/pathNot attributes work at folder scope; other attributes are not yet implemented. — Evidence notes for S3 state that only 'moreUnstable', 'circular', and 'path/pathNot' attributes work at folder level; other attributes not yet implemented.
- **supported**: Nx can only apply rules at the library level via tags in project.json, not at the sub-folder level. — Evidence notes for S2 confirm that Nx Module Boundaries can only apply rules at the library level via tags, not at sub-folder level.
- **supported**: A rule forbidding components from importing API modules takes the form: from: { path: "^src/components" }, to: { path: "^src/api" }. — Evidence notes for S4 provide this exact rule example to prevent components from importing API modules.
- **supported**: Domain isolation uses group matching to restrict cross-domain imports while allowing same-domain imports with a rule pattern using $1 variable. — Evidence notes for S5 show a rule snippet using $1 to restrict cross-domain imports while allowing same-domain imports.
- **supported**: Required rules in dependency-cruiser can mandate that certain dependencies exist, with an optional reachable: true flag for transitive dependencies. — Evidence notes for S3 describe required rules that mandate dependencies and mention the optional 'reachable: true' flag for transitive dependencies.
- **supported**: Beyond import restrictions, dependency-cruiser identifies circular dependencies, orphans, dead code, and shared code imported by only one module. — Evidence notes for S2 state that dependency-cruiser can identify circular dependencies, orphans, dead code, and shared code imported by only one module.
- **supported**: TypeScript Project References only works with tsc compiler, not Babel or babel-preset-typescript. — Evidence notes for S6 confirm that TypeScript Project References only work with tsc compiler, not with Babel or babel-preset-typescript.
- **supported**: Nx Module Boundaries rules apply only at library/project level via tags, not sub-folder level. — Evidence notes for S2 explicitly state that Nx Module Boundaries can only apply rules at the library level via tags, not at sub-folder level.
- **supported**: ESLint no-restricted-imports supports only forbid approach, no allow-list. — Evidence notes for S1 state that ESLint's no-restricted-imports rule only supports the 'forbid' approach and cannot define an explicit allowed set.
- **supported**: ESLint no-cycle output is hard to trace through multiple files; graphs represent cycles more naturally. — Evidence notes for S6 mention that the no-cycle rule output is hard to trace and that cyclical dependencies are more naturally represented by graphs.
- **supported**: For projects using Babel-based TypeScript transpilation like Next.js, TypeScript Project References is incompatible. — Evidence notes for S6 state that TypeScript Project References do not work with Babel or frameworks like Next.js that use Babel-based transpilation.
- **supported**: dependency-cruiser integrates into CI through a single validation command: npx depcruise src --validate .dependency-cruiser.js. — Evidence notes for S4 show the command 'npx depcruise src --validate .dependency-cruiser.js' for CI integration.
- **supported**: dependency-cruiser is not integrated with ESLint, so it runs as a separate step rather than alongside lint rules. — Evidence notes for S2 state that dependency-cruiser is not integrated with ESLint.
- **supported**: The allow approach creates a highly disciplined codebase but requires a clear architectural vision upfront. — Evidence notes for S1 mention that the 'allow' approach creates a highly disciplined codebase but requires a clear architectural vision upfront.
- **supported**: Common mistakes when using dependency-cruiser include creating overly strict rules too early and not visualizing the dependency graph first. — Evidence notes for S4 list 'Creating overly strict rules too early' and 'Not visualizing dependencies' as common mistakes.
- **supported**: The $1 variable pattern enables self-referential domain boundaries without enumerating each domain separately. — Evidence notes for S5 show a rule using $1 to restrict cross-domain imports, enabling self-referential domain boundaries without enumerating each domain.
- **supported**: Teams should generate reports to understand existing structure before constraining it via rules. — Evidence notes for S4 mention 'Ignoring the reports' as a common mistake, implying that generating reports to understand structure is recommended.

### Final Evaluation

- coverage: 4/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 4/5
- overall: 4/5

Strengths:
- Clear distinction between dependency graphs, module graphs, and build graphs with a useful conceptual table.
- Concrete rule examples for dependency-cruiser, including group matching with $1 variables for domain isolation.
- Evidence table summarizing claims, sources, and limitations, supporting traceability.
- Honest and thorough limitations section acknowledging source coverage gaps, temporal validity, and missing evidence on dynamic imports and false positives.
- Actionable design implications and recommended next experiments grounded in the evidence.

Weaknesses:
- The report does not cover ArchUnit or JVM-side tools as planned, leaving a significant gap in cross-ecosystem comparison.
- No evidence table is included in the report body; the evidence table in the findings section is a summary but not a full audit table with source details.
- The report relies heavily on blog posts and community articles; only one official documentation source is admitted, reducing authority.
- Missing explicit handling of dynamic imports, re-exports, and cyclic dependencies with evidence from docs or issues, as required by success criteria.
- The presentation uses a scientific short-paper structure but includes some generic phrasing (e.g., 'This report examines...') and lacks a dedicated 'Related Work' section.

Follow-up recommendations:
- Expand the evidence base to include ArchUnit documentation and JVM-side comparisons to fulfill the planned cross-ecosystem scope.
- Conduct controlled experiments on dynamic import handling, false-positive rates, and folder-level scope limitations as suggested in the recommended next experiments.
- Include a full evidence table in the report body with source IDs, claims, evidence excerpts, and limitations for each major finding.
- Search for and incorporate 2024-2026 release notes or changelogs for dependency-cruiser and ArchUnit to address temporal validity concerns.
- Add a dedicated 'Related Work' section to situate the findings within existing literature and tool comparisons.
