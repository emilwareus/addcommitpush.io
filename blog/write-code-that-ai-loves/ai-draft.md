# Write Code AI Agents Love

An agent opens your repo like a new maintainer with no memory.

It does not know which folder is legacy. It does not know that `apiClient.ts` is deprecated, that `fetchJson.ts` is the blessed wrapper, or that generated files must not be edited by hand. It does not know that every mutating route needs CSRF middleware, or that "student" and "pupil" are historical synonyms in your domain model rather than separate concepts.

If that knowledge lives only in your head, Slack, Notion, or old code review comments, the agent has two choices: stop and ask, or guess. Most of the time it guesses. And it guesses with confidence.

That is why so much advice about coding agents is aimed at prompts. Write a better `AGENTS.md`. Add more examples. Tell it to run tests. Tell it to think harder. Tell it not to make big changes.

Some of that helps. I use it myself. But it is too small.

The real interface is not the prompt. The real interface is the repository.

## Key takeaways

- AI coding agents fail when the repo hides what a competent maintainer would already know: architecture, commands, invariants, and verification paths.
- Every useful agent runs the same loop: orient, retrieve, edit, verify. Your codebase makes that loop cheap or expensive.
- Agents do not need more text. They need recoverable structure: stable names, visible dependency edges, typed contracts, generated SDKs, and executable lint rules.
- Modularity is not magic. Meaningful boundaries with contracts, tests, and dependency direction beat arbitrary file splitting.
- More context can hurt. Short, scoped instructions that point at executable truth beat 900-line instruction novels.
- The best agent-friendly codebase is not the one with the best prompt. It is the one where the prompt matters least.
- Conveniently, this is also the kind of code senior engineers have wanted all along.

## The agent loop

Every useful coding agent has to do roughly the same loop:

1. **Orient:** Where am I? What kind of repo is this? What rules matter?
2. **Retrieve:** Which files, symbols, tests, schemas, and examples are relevant?
3. **Edit:** What is the smallest change that fits the existing system?
4. **Verify:** Which checks prove the change is correct?

Your codebase either makes this loop cheap or expensive.

| Agent step | Expensive repo | Agent-friendly repo |
| --- | --- | --- |
| Orient | Tribal knowledge, stale wiki pages, giant instruction files | Short root instructions, architecture map, obvious entry points |
| Retrieve | `utils`, dynamic registries, hidden side effects, string routes | Stable names, imports, public APIs, schemas, examples, tests |
| Edit | Raw API calls, broad payloads, no generated clients, unclear ownership | Typed interfaces, generated SDKs, visible boundaries, local patterns |
| Verify | Unclear test command, slow suites, flaky setup, warnings ignored | Fast targeted checks, lint/typecheck/test/build gates, precise failures |

This is the frame I care about:

> Agents do not need more text. They need recoverable structure.

## What the research actually says

The research does not support a lazy slogan like "make everything modular."

The stronger claim is narrower: agents do better when the relevant context can be recovered as symbols, dependency edges, contracts, examples, and verification signals.

| Mechanism | Evidence | Design implication |
| --- | --- | --- |
| Real repo issues are hard | [SWE-bench](https://arxiv.org/abs/2310.06770): 2,294 real GitHub tasks; early systems solved a tiny fraction | Repo work is search, integration, and validation, not isolated code synthesis |
| Cross-file context matters | [CrossCodeEval](https://arxiv.org/abs/2310.11248): StarCoder-15.5B Python exact match improved 8.82 → 15.72 with retrieval | The current file is often not enough |
| Structure beats similar text | [GraphCodeAgent](https://arxiv.org/abs/2504.10046): DevEval GPT-4o Pass@1 improved 40.43 → 58.14 vs the best baseline | Imports, graphs, and task-specific traversal help agents find the right code |
| Function chunks are not enough | [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763): CCEval exact match was Function 24.21, Declaration 27.71, cAST 28.19, Sliding Window 28.40 | Agents need coherent neighborhoods, not just tiny functions |
| Names carry semantics | [When Names Disappear](https://arxiv.org/abs/2510.03178): GPT-4o ClassEval class summarization dropped 87.3 → 58.7 under obfuscation | Names are retrieval and reasoning infrastructure |
| Types and interfaces help | [CatCoder](https://arxiv.org/abs/2406.03283): Java pass@k improved up to 17.35% vs RepoCoder; removing type context dropped Java pass@k up to 11.57% | Types compress valid API usage and reduce hallucinated members |
| Instruction files are not free | [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988): LLM-generated context reduced average resolution rate and raised steps/cost | `AGENTS.md` should point at executable truth, not become a second codebase |
| Code quality predicts AI success | [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200): healthy code (CodeHealth ≥ 9) reduced refactoring break rates by 8–15 pp for medium-sized models | The same smells that hurt humans hurt agents |

There is also counter-evidence against modularity as a magic word. [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) found no clear positive correlation between modularity score and LLM code generation performance, and sometimes weak negative relationships.

So the advice is not "split everything into more files." The advice is:

> Create boundaries that reduce search, expose intent, and make correctness checkable.

That difference matters.

## Agents need maps, not dumps

Repository-scale benchmarks show that real tasks require cross-file context. [ContextBench](https://arxiv.org/abs/2602.05892) goes further: agents often inspect relevant code but fail to consolidate or use it. All tested agents favor recall over precision. They retrieve broad, noisy context and then miss the signal in the pile.

Structured maps outperform flat retrieval. [RepoGraph](https://arxiv.org/abs/2410.14684) boosted SWE-bench performance by 32.8% relative by adding a line-level dependency graph. The [Repository Intelligence Graph](https://arxiv.org/abs/2601.10112) — a deterministic build-and-test-centered map — improved mean accuracy by 12.2% and reduced completion time by 53.9% across three agents and eight repositories. The map averaged about 5,000 tokens. Dumping more raw files into context is not the same thing.

[CodePlan](https://arxiv.org/abs/2309.12499) makes the planning point concrete: repository-level coding is a dependency propagation problem. Without structural awareness, multi-file changes fail. With it, agents can plan a chain of edits instead of guessing file by file.

Practitioner tooling converges on the same idea. [Aider's repo map](https://aider.chat/docs/repomap.html) and [Sourcegraph's Cody architecture](https://sourcegraph.com/blog/how-cody-understands-your-codebase) both treat code search and code intelligence as the context layer, not prompt stuffing.

The implication: expose a concise map of modules, ownership, tests, and dependency edges. Make extension points obvious. Tell the agent what is generated vs hand-written. A short authoritative map beats a warehouse of files in the context window.

## Names are semantic infrastructure

Names are not style polish. For agents, names are part of the API.

Good names give the agent handles to search for, rank, and reason about:

```ts
getActiveSchoolAttendanceSummary()
createUploadIntentForAttachment()
requireActiveSchool()
markLessonAttendance()
```

Bad names collapse different concepts into the same fog:

```ts
handleData()
process()
doStuff()
sharedUtils()
```

The difference is not taste. It changes retrieval.

[CodeT5](https://arxiv.org/abs/2109.00859) treats identifiers as first-class semantic signals. [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) shows nonsense and misleading names significantly degrade LLM performance on code analysis. [When Names Disappear](https://arxiv.org/abs/2510.03178) goes further: semantics-preserving obfuscation — same behavior, worse names — drops GPT-4o class summarization from 87.3 to 58.7.

If your domain uses five words for the same thing, the agent has to infer whether they are synonyms or separate concepts:

```txt
student
pupil
learner
child
member
```

Maybe a human on the team knows these are historical synonyms. The agent does not. It sees separate tokens, separate files, and separate possible meanings.

Practical rule:

> If an agent cannot search for the concept by name, it will search by vibes.

Prefer module names that say what the code does:

```ts
// attendance/mark-lesson-attendance.ts
export async function markLessonAttendance(request: MarkLessonAttendanceRequest) {
  const lesson = await lessons.requireActiveLesson(request.lessonId);

  return attendanceRepository.mark({
    lessonId: lesson.id,
    studentId: request.studentId,
    status: request.status,
  });
}
```

Avoid dumping grounds:

```ts
// utils/index.ts
export async function handleData(input: unknown) {
  // Parses something, reads from the database, applies a domain rule,
  // and returns a response-shaped object.
}
```

## Boundaries need to be visible

Agents are better when they can see how things connect: imports, exports, public interfaces, route registration, schemas, generated clients, tests, build targets, and ownership boundaries.

They are worse when behavior hides behind dynamic imports, reflection, stringly typed registries, implicit globals, monkeypatching, or side effects during module import.

I am not saying "never use dynamic patterns." Sometimes they are the right tool. But they have a cost: they break the static surfaces agents and tools use to understand the repo. If a code graph cannot be generated, the agent probably cannot reason about the graph either.

Here is a boundary the agent cannot respect:

```ts
// Bad: client code reaches across the boundary and learns backend internals.
import { db } from '../../server/db';

export async function loadAttendanceForLesson(lessonId: string) {
  return db.attendance.findMany({ where: { lessonId } });
}
```

Here is a boundary it can see:

```ts
// Better: the frontend depends on a typed public contract.
import { attendanceApi } from '@acme/sdk';

export async function loadAttendanceForLesson(lessonId: LessonId) {
  return attendanceApi.listLessonAttendance({ lessonId });
}
```

The second version gives the agent a symbol to search for, a type to satisfy, a package boundary to preserve, a lint rule that can catch violations, and a generated client that shows the intended API shape.

This is what I mean by recoverable structure.

## Types compress intent

Types are not compiler decoration. They are compressed instructions.

This tells the agent what is valid without making it read five files:

```ts
type AttendanceStatus = 'present' | 'late' | 'absent';

type MarkAttendanceRequest = {
  lessonId: LessonId;
  studentId: StudentId;
  status: AttendanceStatus;
};
```

This is better:

```ts
type AttendanceMark =
  | { status: 'present'; arrivedAt?: never }
  | { status: 'late'; arrivedAt: ISODateTime }
  | { status: 'absent'; arrivedAt?: never };

type MarkAttendanceRequest = {
  lessonId: LessonId;
  studentId: StudentId;
  mark: AttendanceMark;
};
```

This is a tax:

```ts
type Payload = Record<string, unknown>;
```

Now the agent has to infer the shape from call sites, tests, docs, runtime errors, and maybe stale examples. Maybe it succeeds. Maybe it invents a field.

[Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) and [ToolGen](https://arxiv.org/abs/2401.06391) both support the same practical rule: make available APIs visible. Explicit imports, exports, types, class members, schemas, and generated clients reduce undefined-variable, no-member, and wrong-library failures.

Types, schemas, generated clients, and narrow interfaces all do the same thing: they reduce the number of valid guesses.

## Generate SDKs instead of rawdogging API calls

Raw API calls are stringly typed integration debt. They are especially bad for agents because the contract is hidden in strings:

```ts
await fetch(`/api/schools/${schoolId}/attendance`, {
  method: 'POST',
  body: JSON.stringify({ lesson, student, state }),
});
```

What is the exact route? Is it `schoolId`, or does the active school come from the session? Is the method correct? What fields are required? What error shape comes back? Is CSRF required?

The agent can guess all of that. Or you can generate a client:

```ts
await attendanceApi.markLessonAttendance({
  markLessonAttendanceRequest: {
    lessonId,
    studentId,
    status: 'present',
  },
});
```

Now the API is a local symbol with types.

[OpenAPI Generator](https://openapi-generator.tech/), [Kiota](https://learn.microsoft.com/en-us/openapi/kiota/), [Orval](https://orval.dev/), [Speakeasy](https://www.speakeasy.com/docs/sdks/create-client-sdks), [Stainless](https://www.stainless.com/docs/sdks/typescript/), [FastAPI's OpenAPI generation](https://fastapi.tiangolo.com/advanced/generate-clients/) — choose your tool. The tool is less important than the shape:

> If your API has a contract, generate the contract into code before asking an agent to use it.

The workflow should be visible:

```json
{
  "scripts": {
    "generate:openapi": "go test ./backend/openapi -run TestGenerateOpenAPI",
    "generate:sdk": "orval --config orval.config.ts",
    "generate": "pnpm generate:openapi && pnpm generate:sdk",
    "check": "pnpm generate && pnpm lint && pnpm typecheck && pnpm test"
  }
}
```

And the repo should tell the agent the rule:

```md
Do not hand-edit generated SDK files.
Regenerate them with `pnpm generate`.
Frontend code must call backend APIs through `@acme/sdk`.
```

Then enforce it with a lint rule that disallows `fetch('/api/...')` outside the generated SDK package.

Turn API contracts into code the agent can inspect, import, typecheck, and test.

## Make architecture executable

Every team has rules that are too specific for generic advice:

- UI must not import database code
- server-only modules must not enter the client bundle
- mutating routes must include CSRF middleware
- frontend code must use design tokens instead of raw colors
- API calls must go through the generated SDK
- domain code must not import transport
- generated files must not be edited by hand

You can write these in `AGENTS.md`. But if they matter, encode them.

Use the boring standard tool when it works: [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules), [typescript-eslint](https://typescript-eslint.io/developers/custom-rules/), [Semgrep](https://semgrep.dev/docs/writing-rules/overview/), [ast-grep](https://ast-grep.github.io/guide/rule-config.html), [Nx module boundaries](https://nx.dev/features/enforce-module-boundaries), dependency-cruiser, custom Go analyzers.

For more repo-specific rules, I have been experimenting with [polint](https://github.com/emilwareus/polint): bring your own rules, with scanning infrastructure, fact views, diagnostics, cache, JSON/SARIF output, baselines, ignores, and CI/agent affordances handled by the framework. The point is not `polint` specifically. The point is that a rule should fail precisely enough for an agent to repair it.

Example diagnostic:

```json
{
  "rule": "backend/no-transport-imports-in-domain",
  "severity": "error",
  "file": "backend/domain/schools/active_school.ts",
  "message": "domain code must not import HTTP transport types"
}
```

That is better than:

```md
Please follow clean architecture.
```

The bigger lesson:

> Do not ask the agent to remember your architecture. Make the architecture fail the build when violated.

[Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) found LLM-generated code carries substantially more design and implementation smells than professional references. Static gates, lint, typecheck, dead-code checks, and review checklists are not bureaucracy. They are the external nervous system that keeps agents from shipping plausible but low-quality code.

## AGENTS.md should be an index, not a novel

Context files are useful. They are also dangerous.

The popular conversation has caught up to this. Builder.io, Anthropic, GitHub, Cursor, Aider, and many HN threads all point at the same practical pattern: persistent instructions help when they are short, scoped, current, and connected to executable commands.

The research is mixed in exactly the way you would expect. Some studies find instruction files reduce runtime or output tokens. [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) found that LLM-generated context files reduced resolution rates while increasing cost by 20–23%. Developer-written context produced only a marginal performance gain while still increasing cost. [Lost in the Middle](https://arxiv.org/abs/2307.03172) shows that relevant facts can still be missed depending on placement in long contexts.

This matches my experience.

Good:

```md
Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before finalizing.
Do not edit `src/generated`; regenerate with `pnpm generate`.
Frontend API calls must go through `@acme/sdk`.
Architecture rules live in `tools/lint-rules`; fix violations instead of suppressing them.
Server-only modules live under `server/` and must not be imported by client components.
```

Weak:

```md
Write clean code.
Use best practices.
Follow our architecture.
Make sure everything works.
```

The first version points at executable facts. The second version asks the model to hallucinate your standards.

The even worse version is a 900-line instruction file full of stale paths, outdated package commands, old framework advice, and contradictory local conventions. Treat agent instructions as operational configuration, not a manifesto.

[Anthropic's large-codebase Claude Code guidance](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) makes the same operational point: layered context files, hooks, skills, plugins, LSP, MCP, and subagents are part of the harness. The model is not working in a vacuum.

## The monorepo is the context database

I am increasingly convinced that agents make the monorepo argument stronger.

Not because "one repo" is magically better. A bad monorepo is just a larger mess.

The value is that the agent can see the system at one commit:

```txt
repo/
  apps/
    web/
    admin/
  services/
    api/
    worker/
  packages/
    sdk-typescript/
    sdk-go/
    ui/
  schemas/
    openapi.yaml
  infra/
    terraform/
    helm/
  docs/
    runbooks/
    architecture/
  tools/
    lint-rules/
    generators/
```

Now the agent can inspect app code, backend code, infrastructure, docs, migrations, API schemas, generated SDKs, runbooks, tests, examples, and CI scripts. If those things change together, they should probably live together.

For an agent, this is huge. It does not need to guess which wiki page is current. It does not need to coordinate a backend change in one repo, a generated SDK update in another, an infra permission in a third, and docs in a fourth. It can change the code, contract, generated client, docs, and infra in one diff.

But the caveat matters: you need ownership, dependency boundaries, affected builds, CI caching, generated-code policy, access control, and tooling so the repo does not become slow. The [Google monorepo paper](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/) is useful here because it does not frame the monorepo as vibes. It frames it as a source-of-truth and tooling problem.

The monorepo is not the goal. Atomic context is the goal.

> For agents, a good monorepo is not one repo. It is one commit that contains the whole truth.

## Tests are feedback, not decoration

Agents need fast feedback. But the test story is more subtle than "make the agent write more tests."

[Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) found that GPT-5.2 wrote tests in only 0.6% of tasks while resolving 71.8%, while Claude Opus 4.5 wrote tests in 83.0% of tasks while resolving 74.4%. Encouraging GPT-5.2 to write tests kept resolution at 71.8% but increased API calls and token usage. Agent-written tests are often probes, not durable specifications.

The stronger evidence is about visible, real task contracts. [FeatureBench](https://arxiv.org/abs/2602.10975) found visible unit tests improved resolved rate by +50.0 percentage points for Gemini-3-Pro-Preview and +43.3 points for GPT-5.1-Codex on the Lite set.

A good test tells the agent what behavior matters, which setup path is canonical, which edge cases are real, and what public API shape is expected. This is not just verification. It is context.

Example:

```ts
describe('markLessonAttendance', () => {
  it('records a late arrival with the arrival timestamp', async () => {
    await attendanceApi.markLessonAttendance({
      markLessonAttendanceRequest: {
        lessonId,
        studentId,
        status: 'late',
        arrivedAt: '2026-05-15T08:12:00Z',
      },
    });

    await expectAttendanceSummary(studentId).toMatchObject({
      lateCount: 1,
    });
  });
});
```

Keep strong existing tests. Make targeted tests cheap to run. Name tests by behavior. Put examples near the code they exercise. Run lint, typecheck, tests, and build in one documented command.

## Feature work is the hard mode

Bug fixing is no longer the only target. [FeatureBench](https://arxiv.org/abs/2602.10975), [FEA-Bench](https://arxiv.org/abs/2503.06680), and [RACE-bench](https://arxiv.org/abs/2603.26337) point to a harder frontier: multi-file feature development, not just patch correctness.

[RACE-bench](https://arxiv.org/abs/2603.26337) makes the gap visible. AutoCodeRover applied patches at 96.21% but resolved only 28.79%. mini-SWE-Agent applied patches at 95.83% but resolved 70.08%. The agent can manipulate the repository successfully while still misunderstanding the change. Reasoning recall falls from files (0.890) to tasks (0.751) to steps (0.445).

[Constraint Decay](https://arxiv.org/abs/2605.06445) shows production-like structural requirements cause about a 30-point assertion-pass drop in controlled backend generation. Feature-friendly codebases must expose extension points, constraints, examples, and acceptance tests. Otherwise the agent is forced to invent a plan and then satisfy hidden architecture rules while editing.

This is why I am skeptical of "just throw more agents at it" as a codebase strategy. [Agentless](https://arxiv.org/abs/2407.01489) showed that a clear localize → repair → validate workflow, with good repo structure and tests, can beat elaborate multi-agent choreography. Subagents help when they isolate bounded work and return compact findings. They become theater when they replace clear structure and verification.

## The best agent sometimes does nothing

Good coding agents must sometimes conclude that no code change is required. This sounds trivial but is a major failure mode.

[FixedBench](https://arxiv.org/abs/2605.07769) takes SWE-Bench Verified instances, applies the golden patch before giving them to the agent, and asks whether the agent recognizes the issue is already resolved. Current agents propose unnecessary code changes on already-fixed issues 35–65% of the time. Telling the agent to "abstain or fix" raises correct abstention from 60.5% to 88.5%. Removing git history and environment setup drops abstention by 8–15 percentage points.

A repo that exposes current behavior, passing tests, clean commit history, and a working setup gives agents a better chance of deciding that the correct patch is no patch. [Needle in the Repo](https://arxiv.org/abs/2603.27745) adds another angle: 13.3% of outcomes are functionally correct but structurally wrong. Sometimes the best action is to not edit, even when a change would pass tests.

Frame "no change needed" as a valid successful outcome in your agent instructions.

## Code quality is not just a human concern

[Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200) is the strongest direct empirical link between traditional code quality metrics and AI agent performance. For five medium-sized open-weight models, healthy code (CodeHealth ≥ 9) reduced refactoring break rates by 8–15 percentage points. In decision-tree classifiers, CodeHealth was the root node for every model tested, with feature importance ranging from 0.572 to 0.880.

The paper's own conclusion: "human-friendly code is more amenable to AI interventions."

Frontier agentic systems (Claude in the study) achieved 94–96% pass rates regardless of code health, but with conservative refactoring behavior — leaving 61–69% of files' CodeHealth unchanged. Frontier models can compensate for bad code quality, but that is expensive and not sustainable as the default strategy. Your CI, batch processing, autocomplete, and cost-optimized pipelines will use smaller models. Code quality matters for those.

And do not confuse perplexity with AI-friendliness. The same paper found file-level perplexity has negligible association with CodeHealth. Perplexity measures token-level prediction surprise, not structural editability. A deeply nested function can be locally predictable and globally harmful. Use structural metrics — nesting depth, complexity, smell detectors — not PPL alone.

A companion RCT, [Echoes of AI](https://arxiv.org/abs/2507.00788), found no systematic maintainability difference when code is co-developed with AI assistants. AI does not make code worse. AI performs worse on already-bad code. The starting quality of your codebase matters more than whether AI helped write it.

## What not to optimize for

Do not say "AI loves microservices." It loves recoverable boundaries.

Do not say "AI loves tiny functions." It loves coherent neighborhoods.

Do not say "AI loves huge context windows." Sometimes more context is just more distraction.

Do not say "A big AGENTS.md solves the problem." It can become stale context debt.

Do not say "Subagents solve codebase understanding." They help when they isolate bounded work and return compact findings. They become theater when they replace clear structure and verification.

Do not say "Perplexity measures AI-friendliness." At the file level, it does not.

Better:

> AI agents love codebases where the relevant context can be found without reading the whole repository.

## The codebase agents love

If I wanted to make a repo more agent-friendly, I would start here.

### Orientation

- Root `AGENTS.md` under 100–200 high-signal lines
- Exact install, lint, typecheck, test, and build commands
- Short architecture map
- Generated-file rules and "do not touch" areas
- Links to deeper docs instead of pasted essays

### Retrieval

- Stable domain vocabulary
- Predictable file names; no generic dumping grounds
- Public APIs easy to find
- Imports and exports explicit
- Examples near extension points
- Generated or maintained repo map for large codebases

### Editing

- Typed public interfaces
- Generated SDKs for service boundaries
- API schemas in the repo
- Dependency direction documented and enforced
- Custom lint rules for important architecture constraints
- No hidden dynamic magic unless the payoff is real

### Verification

- One command for the local gate
- Fast targeted tests and broader CI checks
- Lint/typecheck/format/dead-code gates
- Baselines for adoption instead of eternal warnings
- CI fails when generated output is stale

### Context

- Docs as code; infra as code
- Migrations and runbooks in the repo when they change with app behavior
- Monorepo or unified context layer when cross-system changes are common
- Stale context checks for paths, commands, generated files, and package scripts

## Pitfalls

**Prompt theater without repo investment.** A longer `AGENTS.md` cannot substitute for missing types, tests, or boundaries. Noisy context files can reduce success and increase cost.

**Modularity cosplay.** Splitting files without contracts, tests, and dependency direction does not help agents. [Revisiting Modularity](https://arxiv.org/abs/2407.11406) is the counter-evidence you need before preaching microservices.

**Assuming the agent will ask.** It usually will not. It will guess with confidence.

**Treating patch application as success.** [RACE-bench](https://arxiv.org/abs/2603.26337) shows high patch-apply rates with low resolution rates. "It made a patch" is a dangerously low bar.

**Ignoring setup.** [SetupBench](https://arxiv.org/abs/2507.09063) and installation-agent work show environment bootstrap is itself a hard task. A repo that needs implicit local setup is not agent-ready.

**Letting agents edit already-fixed code.** [FixedBench](https://arxiv.org/abs/2605.07769) shows unnecessary edits are the default, not the exception.

**Optimizing for frontier models only.** Medium-sized models show 8–15 pp break-rate gaps between healthy and unhealthy code. Your cheaper pipelines need clean code too.

## Conclusion

The future of coding with agents is not just better models. It is better codebases.

The repos that win will be the repos where a coding agent can:

1. Orient quickly
2. Retrieve the right context
3. Make a small change
4. Run the right checks
5. See precise failures
6. Repair without guessing

That is not prompt engineering. That is software engineering.

Write code agents love by writing code that exposes its intent, enforces its boundaries, and proves its behavior.

The punchline:

> The best AI-friendly codebase is not the one with the best prompt. It is the one where the prompt matters least.

Conveniently, that is also the kind of code senior engineers have wanted all along.

## References

- [SWE-bench](https://arxiv.org/abs/2310.06770) — real GitHub issue resolution benchmark
- [CrossCodeEval](https://arxiv.org/abs/2310.11248) — cross-file code completion with retrieval
- [ContextBench](https://arxiv.org/abs/2602.05892) — context retrieval quality during issue resolution
- [RepoGraph](https://arxiv.org/abs/2410.14684) — repository-level code graphs for agents
- [Repository Intelligence Graph](https://arxiv.org/abs/2601.10112) — deterministic build/test-centered maps
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046) — dual graph-guided repository-level generation
- [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763) — chunking strategy for code RAG
- [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) — modularity counter-evidence
- [CodeT5](https://arxiv.org/abs/2109.00859) — identifier-aware code models
- [When Names Disappear](https://arxiv.org/abs/2510.03178) — naming and obfuscation effects on LLMs
- [CatCoder](https://arxiv.org/abs/2406.03283) — type context for repository-level generation
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) — context file cost and success tradeoffs
- [Lost in the Middle](https://arxiv.org/abs/2307.03172) — positional degradation in long contexts
- [FeatureBench](https://arxiv.org/abs/2602.10975) — repository-scale feature implementation
- [RACE-bench](https://arxiv.org/abs/2603.26337) — feature-addition planning and reasoning recall
- [Constraint Decay](https://arxiv.org/abs/2605.06445) — structural constraints and backend generation
- [FixedBench](https://arxiv.org/abs/2605.07769) — no-op tasks and unnecessary edits
- [Needle in the Repo](https://arxiv.org/abs/2603.27745) — functional vs structural correctness
- [Code for Machines, Not Just Humans](https://arxiv.org/abs/2601.02200) — CodeHealth and AI refactoring success
- [Echoes of AI](https://arxiv.org/abs/2507.00788) — AI-assisted code maintainability RCT
- [Investigating the Smells of LLM Generated Code](https://arxiv.org/abs/2510.03029) — smell rates in LLM-generated code
- [Agentless](https://arxiv.org/abs/2407.01489) — simple localize-repair-validate workflows
- [SetupBench](https://arxiv.org/abs/2507.09063) — environment bootstrap as agent task
- [Anthropic: How Claude Code works in large codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start)
- [Google monorepo paper](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/)
- [polint](https://github.com/emilwareus/polint) — repo-owned lint rule framework (local implementation example)
