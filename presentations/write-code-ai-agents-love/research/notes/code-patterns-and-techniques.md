# Code Patterns and Techniques for AI Coding Agents

This memo focuses on evidence-backed codebase patterns. It intentionally avoids the simplistic claim that "more modular code is always better for AI." The research points to a narrower and stronger claim: agents perform better when repository structure makes intent, dependencies, contracts, and validation mechanically visible.

## Evidence-backed patterns

### 1. Expose dependency structure, not just text similarity

Repository-level work repeatedly shows that plain semantic search or nearest-neighbor chunks miss important code because the relevant dependency is often not lexically similar to the task.

Evidence:

- GraphCodeAgent constructs a requirement graph plus structural-semantic code graph and reports relative Pass@1 improvements up to 43.81% overall, with especially large gains on cross-file dependency tasks.
- SLICE combines semantic node descriptions with backward program slicing and reports 48-67% improvements over no-retrieval baselines and 32-48% over BM25.
- InlineCoder uses callers and callees from the call graph as prompt context because repository-level generation needs cross-function, class, and module dependencies.
- CodeGRAG builds AST, control-flow, and data-flow graph views because code is not only a token sequence.

Actionable codebase techniques:

- Keep imports explicit and dependency directions boring.
- Prefer clear public APIs over hidden reflection, monkeypatching, implicit globals, or dynamic registration.
- Maintain architecture diagrams or generated dependency maps for large modules.
- Make call paths easy to trace: entrypoints, services, repositories, adapters, and tests should have predictable names and locations.
- Avoid spreading one behavior across unrelated files without a named boundary.

References: R12, R13, R30, R53, R54, R55, R56.

### 2. Names are model-visible semantics

Identifiers are not cosmetic. CodeT5 explicitly models identifiers because developer-assigned names preserve rich semantics. ToolGen shows repository-level LLMs frequently fail with undefined-variable and no-member errors, and that autocompletion-visible identifiers help prevent invalid symbols.

Naming-specific studies strengthen this. Wang et al. show that nonsense or misleading names significantly affect LLM code-analysis tasks. When Names Disappear shows that semantics-preserving obfuscation degrades intent-level summarization and can also reduce execution-oriented performance. The caveat is important: names help agents, but they can also create over-reliance. Misleading names are worse than sparse names because they supply a false semantic cue.

Actionable codebase techniques:

- Use descriptive names for functions, classes, files, fixtures, tests, and public exports.
- Use domain nouns consistently. Do not alternate between `account`, `customer`, `tenant`, and `workspace` unless they mean different things.
- Avoid abbreviations that require tribal knowledge.
- Name tests by behavior, not implementation trivia.
- Avoid "utils", "helpers", and "misc" modules for domain behavior; they destroy retrieval surface.

References: R29, R50, R51, R65, R66.

### 3. Contracts compress context

Type constraints and public interfaces turn hidden assumptions into searchable and checkable facts. Type-constrained code generation improves correctness by narrowing the valid output space. ToolGen's no-member/undefined-variable analysis points at the same principle from another angle: agents need to know what symbols and members are actually available.

CatCoder adds direct repository-level evidence for statically typed ecosystems: integrating relevant code and type context improved Java/Rust code generation, and ablating type context reduced performance. A3-CodGen similarly found value in local functions, class attributes, and third-party-library awareness.

Actionable codebase techniques:

- Use narrow public interfaces at module boundaries.
- Prefer explicit input/output types, schema objects, and discriminated unions.
- Keep domain invariants near the type or constructor that enforces them.
- Generate API clients/types from schemas rather than duplicating hand-written shapes.
- Reject loosely typed "options bags" when the valid combinations are known.

References: R43, R51, R63, R64.

### 4. Context chunks need neighborhoods

The chunking study is a direct warning against over-indexing on tiny functions. Function-level chunking performed worse than Declaration, Sliding Window, and cAST strategies by 3.57-5.64 percentage points exact match. Cross-file context length had the strongest effect.

Actionable codebase techniques:

- Small functions are useful, but they should live in coherent files/modules with imports, declarations, examples, and nearby tests.
- Keep related declarations together when they are usually read together.
- Put canonical usage examples close enough to the API that retrieval can find both.
- Avoid files where every function is context-free but the real behavior is hidden in naming conventions elsewhere.

References: R49.

### 4a. More context is not automatically better

Several sources make this a recurring caveat. The chunking study found cross-file context budget mattered, but not monotonically through every chunk dimension. A3-CodGen found that too many retrieved global functions could reduce performance compared with a smaller set. Evaluating AGENTS.md found context files increased reasoning/tool use and could reduce task success when they added unnecessary requirements.

Actionable codebase techniques:

- Make context selective and scoped: local API, callers/callees, tests, examples, and invariants first.
- Keep root instructions short and mandatory-only.
- Prefer generated maps and targeted docs over dumping long design essays into agent context.
- Design APIs so the relevant context has a small, recoverable neighborhood.

References: R18, R49, R64.

### 5. Docs and examples should be paired

DocPrompting shows that retrieved documentation helps code generation. RAR shows examples and API/grammar docs complement each other: examples provide structure; docs explain how to adapt the pattern.

Actionable codebase techniques:

- For every important extension point, provide both a contract and a canonical example.
- Keep examples compiling or tested so they do not become stale prompt poison.
- Document signatures, invariants, side effects, and failure modes.
- Prefer one excellent example over many outdated snippets.

References: R42, R52.

CrossCodeEval and RepoCoder reinforce that in-repository examples and cross-file context matter. CrossCodeEval shows retrieved cross-file context improves completion in real repositories across languages. RepoCoder shows iterative retrieval-generation can outperform simple in-file completion.

Additional references: R31, R62.

### 6. Modularity helps only when it creates useful boundaries

CodeChain shows that modular decomposition plus self-revision and verified submodules can improve generation. But Revisiting Modularity finds no clear positive correlation between modularity score and code generation performance, and sometimes weak negative relationships.

The synthesis: do not pursue modularity as an aesthetic. Pursue boundaries that improve localization, dependency tracing, testing, and contract clarity.

Actionable codebase techniques:

- Split modules by responsibility and ownership, not by arbitrary line count.
- Keep boundaries aligned with tests and public interfaces.
- Avoid micro-modules that force agents to stitch together many files for one simple behavior.
- When extracting a module, also extract a contract and focused tests.

References: R47, R48, R61.

### 7. Quality gates must catch smells, not only failing behavior

The code-smell papers show that LLM-generated code can be functionally plausible while carrying more design and implementation smells than professional references. Common increases include incompleteness, inconsistent naming, redundancy, unused variables/imports, and broad exception patterns.

Testing evidence adds a caveat: agent-generated tests are not a magic substitute for a strong existing oracle. Rethinking Agent-Generated Tests reports that resolved and unresolved trajectories had similar test-writing frequencies, and prompt-induced changes in test volume did not significantly change outcomes. The practical lesson is to make existing tests and verification commands strong, fast, and visible, not merely tell the agent to write more tests.

Actionable codebase techniques:

- Run lint, typecheck, formatting, dead-code checks, and complexity rules as first-class verification.
- Encode naming and boundary rules in tools where possible.
- Keep "no new warnings" as a CI rule.
- Add review checklists for redundancy, unused paths, and over-broad exception handling.

References: R59, R60, R67.

### 8. Architecture constraints must be explicit before agents scaffold

Architecture Without Architects shows that agents make architecture decisions implicitly and that prompt phrasing can produce very different structures for the same task. This means architecture constraints are not optional background; they are part of the agent's input surface.

Actionable codebase techniques:

- Maintain a short architecture decision record index.
- Document allowed dependency directions.
- State where new features belong and where they must not go.
- Keep generated scaffolds and templates aligned with the intended architecture.
- Require architecture review for new packages, frameworks, persistence models, or cross-cutting abstractions.

References: R57, R58.

## Pattern hierarchy for the talk

1. Make the repo navigable: maps, names, predictable layout.
2. Make dependencies explicit: imports, call paths, schemas, public APIs.
3. Make behavior executable: tests, examples, fixtures, verification commands.
4. Make boundaries meaningful: responsibility, ownership, contracts, not arbitrary modularity.
5. Make quality mechanical: lint, typecheck, smell checks, CI.
6. Make architecture intentional: ADRs, dependency rules, scaffolds, review gates.

## Claims to avoid

- Avoid: "AI loves microservices."
- Avoid: "More files/functions/modules always improve agent performance."
- Avoid: "Long context means structure no longer matters."
- Avoid: "A big AGENTS.md solves repository understanding."

Better:

- "Agents love recoverable structure: names, contracts, dependency edges, examples, and tests."
- "Modularity helps when it reduces search entropy and creates checkable boundaries."
- "A codebase optimized for agents is a codebase where the correct path is both obvious and executable."
