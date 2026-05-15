# Write Code AI Agents Love

Status: draft v2  
Target: blog post first, presentation narrative second  
Working slug: `write-code-ai-agents-love`

## TL;DR

AI coding agents do not only fail because the model is weak. They fail because the repository hides the information a good maintainer would already know.

If you want agents to perform better, do not start with a longer prompt. Start by making the codebase easier to orient in, retrieve from, edit safely, and verify.

The agent-friendly codebase has:

- stable names
- visible dependency edges
- typed boundaries
- generated API clients
- examples close to the code
- tests that describe behavior
- lint rules that encode architecture
- docs, infra, schemas, and runbooks in the repo when they change with the app
- short instructions that point at executable truth

The punchline:

> The best AI-friendly codebase is not the one with the best prompt. It is the one where the prompt matters least.

## The Moment The Agent Starts Guessing

An agent opens your repo like a new maintainer with no memory.

It does not know which folder is legacy. It does not know which abstraction is sacred and which one survived only because nobody had time to delete it. It does not know that `apiClient.ts` is deprecated, that `fetchJson.ts` is the blessed wrapper, that generated files must not be edited, or that every mutating route needs the CSRF middleware.

If that knowledge lives only in your head, Slack, Notion, or old code review comments, the agent has two choices:

1. stop and ask
2. guess

Most of the time it guesses.

And it guesses with confidence.

That is why so much advice about coding agents is aimed at prompts. Write a better `AGENTS.md`. Add more examples. Tell it to run tests. Tell it to think harder. Tell it not to make big changes.

Some of that helps. I use it myself. But it is too small.

The real interface is not the prompt.

The real interface is the repository.

## The Agent Loop

Every useful coding agent has to do roughly the same loop:

1. **Orient:** Where am I? What kind of repo is this? What rules matter?
2. **Retrieve:** Which files, symbols, tests, schemas, and examples are relevant?
3. **Edit:** What is the smallest change that fits the existing system?
4. **Verify:** Which checks prove the change is correct?

Your codebase either makes this loop cheap or expensive.

| Agent step | Expensive repo | Agent-friendly repo |
| --- | --- | --- |
| Orient | tribal knowledge, stale wiki pages, giant instruction files | short root instructions, architecture map, obvious entry points |
| Retrieve | `utils`, dynamic registries, hidden side effects, string routes | stable names, imports, public APIs, schemas, examples, tests |
| Edit | raw API calls, broad payloads, no generated clients, unclear ownership | typed interfaces, generated SDKs, visible boundaries, local patterns |
| Verify | unclear test command, slow suites, flaky setup, warnings ignored | fast targeted checks, lint/typecheck/test/build gates, precise failures |

This is the frame I care about:

> Agents do not need more text. They need recoverable structure.

## What The Research Actually Says

The research does not support a lazy slogan like "make everything modular."

The stronger claim is narrower: agents do better when the relevant context can be recovered as symbols, dependency edges, contracts, examples, and verification signals.

The evidence is consistent across several lines of work:

| Mechanism | Evidence | Design implication |
| --- | --- | --- |
| Real repo issues are hard | [SWE-bench](https://arxiv.org/abs/2310.06770): 2,294 real GitHub tasks; Claude 2 + BM25 solved 1.96% in the original paper | Repo work is search, integration, and validation, not isolated code synthesis |
| Cross-file context matters | [CrossCodeEval](https://arxiv.org/abs/2310.11248): StarCoder-15.5B Python exact match improved 8.82 -> 15.72 with retrieval | The current file is often not enough |
| Structure beats similar text | [GraphCodeAgent](https://arxiv.org/abs/2504.10046): DevEval GPT-4o Pass@1 improved 40.43 -> 58.14 vs the best baseline, reported as +43.81% relative | Imports, graphs, and task-specific traversal help agents find the right code |
| Function chunks are not enough | [Chunking for RAG code completion](https://arxiv.org/abs/2605.04763): CCEval exact match was Function 24.21, Declaration 27.71, cAST 28.19, Sliding Window 28.40 | Agents need coherent neighborhoods, not just tiny functions |
| Names carry semantics | [When Names Disappear](https://arxiv.org/abs/2510.03178): GPT-4o ClassEval class summarization dropped 87.3 -> 58.7 under obfuscation | Names are retrieval and reasoning infrastructure |
| Types and interfaces help | [CatCoder](https://arxiv.org/abs/2406.03283): Java pass@k improved up to 17.35% vs RepoCoder; removing type context dropped Java pass@k up to 11.57% | Types compress valid API usage and reduce hallucinated members |
| Instruction files are not free | [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988): LLM-generated context reduced average resolution rate and raised steps/cost | `AGENTS.md` should point at executable truth, not become a second codebase |

There is also counter-evidence against modularity as a magic word. [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) found no clear positive correlation between modularity score and LLM code generation performance, and sometimes weak negative relationships.

So the advice is not:

> Split everything into more files.

The advice is:

> Create boundaries that reduce search, expose intent, and make correctness checkable.

That difference matters.

## 1. Names Are Semantic Infrastructure

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

If your domain uses five words for the same thing, the agent has to infer whether they are synonyms or separate concepts:

```txt
student
pupil
learner
child
member
```

Maybe a human on the team knows these are historical synonyms. The agent does not. It sees separate tokens, separate files, and separate possible meanings.

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

Practical rule:

> If an agent cannot search for the concept by name, it will search by vibes.

[Visual idea: a small retrieval map where `attendance`, `lesson`, `student`, `absence`, and `late` connect to route, SDK, test, and domain files.]

## 2. Boundaries Need To Be Visible

Agents are better when they can see how things connect:

- imports
- exports
- public interfaces
- route registration
- schemas
- generated clients
- tests
- build targets
- ownership boundaries

They are worse when behavior hides behind dynamic imports, reflection, stringly typed registries, implicit globals, monkeypatching, or side effects during module import.

I am not saying "never use dynamic patterns." Sometimes they are the right tool. But they have a cost: they break the static surfaces agents and tools use to understand the repo.

If a code graph cannot be generated, the agent probably cannot reason about the graph either.

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

The second version gives the agent:

- a symbol to search for
- a type to satisfy
- a package boundary to preserve
- a lint rule that can catch violations
- a generated client that shows the intended API shape

This is what I mean by recoverable structure.

[Visual idea: left side "mystery repo" with arrows through `utils`, dynamic registry, raw fetch; right side "recoverable repo" with domain package, schema, generated SDK, tests, and lint gate.]

## 3. Types Compress Intent

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

Types, schemas, generated clients, and narrow interfaces all do the same thing: they reduce the number of valid guesses.

That is the point.

## 4. Generate SDKs Instead Of Rawdogging API Calls

Raw API calls are stringly typed integration debt.

They are especially bad for agents because the contract is hidden in strings:

```ts
await fetch(`/api/schools/${schoolId}/attendance`, {
  method: 'POST',
  body: JSON.stringify({ lesson, student, state }),
});
```

What is the exact route? Is it `schoolId`, or does the active school come from the session? Is the method correct? What fields are required? What error shape comes back? Is CSRF required? Does this endpoint paginate?

The agent can guess all of that.

Or you can generate a client:

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

[OpenAPI Generator](https://openapi-generator.tech/), [Kiota](https://learn.microsoft.com/en-us/openapi/kiota/), [Orval](https://orval.dev/), [Speakeasy](https://www.speakeasy.com/docs/sdks/create-client-sdks), [Stainless](https://www.stainless.com/docs/sdks/typescript/), [FastAPI's OpenAPI generation](https://fastapi.tiangolo.com/advanced/generate-clients/), [TypeSpec](https://typespec.io/), protobuf - choose your tool. The tool is less important than the shape:

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

Then enforce it:

```ts
// no-raw-api-calls-in-frontend
// Disallow fetch('/api/...') outside the generated SDK package.
```

In local [`plint`](../notes/polint-plint-case-study.md), this pattern is concrete: backend routes generate OpenAPI, OpenAPI generates TypeScript and Go SDKs, and repo instructions say not to hand-edit generated artifacts.

That is not a product pitch. It is the pattern I care about:

> Turn API contracts into code the agent can inspect, import, typecheck, and test.

## 5. Make Architecture Executable

Every team has rules that are too specific for generic advice:

- UI must not import database code
- server-only modules must not enter the client bundle
- mutating routes must include CSRF middleware
- active-school routes must require the active-school guard
- frontend code must use design tokens instead of raw colors
- API calls must go through the generated SDK
- domain code must not import transport
- generated files must not be edited by hand

You can write these in `AGENTS.md`.

But if they matter, encode them.

Use the boring standard tool when it works: [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules), [typescript-eslint](https://typescript-eslint.io/developers/custom-rules/), [Semgrep](https://semgrep.dev/docs/writing-rules/overview/), [ast-grep](https://ast-grep.github.io/guide/rule-config.html), [Nx module boundaries](https://nx.dev/features/enforce-module-boundaries), dependency-cruiser, custom Go analyzers.

For more repo-specific rules, I have been experimenting with [polint](https://github.com/emilwareus/polint): bring your own rules, with scanning infrastructure, fact views, diagnostics, cache, JSON/SARIF output, baselines, ignores, and CI/agent affordances handled by the framework.

The point is not `polint` specifically. The point is that a rule should fail precisely enough for an agent to repair it.

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

Here is the shape of a repo-specific rule:

```rust
#[polint::rule(
    id = "backend/no-transport-imports-in-domain",
    message = "domain code must not import HTTP transport types"
)]
pub fn no_transport_imports_in_domain(ctx: &mut RuleContext<'_>) {
    for import in ctx.imports() {
        if import.file_path().contains("/domain/")
            && import.module_path().contains("/transport/")
        {
            ctx.diagnostic(import.span());
        }
    }
}
```

And here is the kind of violation an agent can fix:

```ts
// Bad: domain logic now depends on an HTTP request shape.
import type { NextRequest } from 'next/server';

export function resolveSchoolId(request: NextRequest) {
  return request.headers.get('x-school-id');
}
```

```ts
// Better: transport extracts data, domain receives a domain value.
export function resolveSchoolId(headers: SchoolHeaders) {
  return headers.activeSchoolId;
}
```

The bigger lesson:

> Do not ask the agent to remember your architecture. Make the architecture fail the build when violated.

## 6. AGENTS.md Should Be An Index, Not A Novel

Context files are useful. They are also dangerous.

The popular conversation has caught up to this. Builder.io, Anthropic, GitHub, Cursor, Aider, and many HN threads all point at the same practical pattern: persistent instructions help when they are short, scoped, current, and connected to executable commands.

The research is mixed in exactly the way you would expect. Some studies find instruction files reduce runtime or output tokens. [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) found that context files consistently increased steps, that LLM-generated context had a marginal negative effect on success, and that developer-written context produced only a marginal performance gain while still increasing cost.

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

The even worse version is a 900-line instruction file full of stale paths, outdated package commands, old framework advice, and contradictory local conventions.

If AGENTS.md matters, it needs maintenance:

- keep it short
- link to deeper docs instead of pasting essays
- scope subdirectory instructions only when conventions differ
- lint paths and commands where possible
- delete rules that no longer prevent real failures
- prefer commands, schemas, examples, and checks over aspirations

Anthropic's [large-codebase Claude Code guidance](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) makes the same operational point: layered context files, hooks, skills, plugins, LSP, MCP, and subagents are part of the harness. The model is not working in a vacuum.

## 7. The Monorepo Is The Context Database

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

Now the agent can inspect:

- app code
- backend code
- infrastructure
- docs
- migrations
- API schemas
- generated SDKs
- runbooks
- tests
- examples
- CI scripts

If those things change together, they should probably live together.

For an agent, this is huge. It does not need to guess which wiki page is current. It does not need to coordinate a backend change in one repo, a generated SDK update in another, an infra permission in a third, and docs in a fourth.

It can change the code, contract, generated client, docs, and infra in one diff.

But the caveat matters:

- you need ownership
- you need dependency boundaries
- you need affected builds
- you need CI caching
- you need generated-code policy
- you need access control
- you need tooling so the repo does not become slow

The [Google monorepo paper](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/) is useful here because it does not frame the monorepo as vibes. It frames it as a source-of-truth and tooling problem.

The monorepo is not the goal. Atomic context is the goal.

> For agents, a good monorepo is not one repo. It is one commit that contains the whole truth.

## 8. Tests Are Feedback, Not Decoration

Agents need fast feedback.

But the test story is more subtle than "make the agent write more tests."

[Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900) found that GPT-5.2 wrote tests in only 0.6% of tasks while resolving 71.8%, while Claude Opus 4.5 wrote tests in 83.0% of tasks while resolving 74.4%. Encouraging GPT-5.2 to write tests kept resolution at 71.8% but increased API calls and token usage.

That does not mean tests are bad. It means agent-written tests are often probes, not durable specifications.

The stronger evidence is about visible, real task contracts. [FeatureBench](https://arxiv.org/abs/2602.10975) found visible unit tests improved resolved rate by +50.0 percentage points for Gemini-3-Pro-Preview and +43.3 points for GPT-5.1-Codex on the Lite set.

The practical pattern:

- keep strong existing tests
- make targeted tests cheap to run
- name tests by behavior
- put examples near the code they exercise
- use generated SDKs in HTTP/component tests
- run lint, typecheck, tests, and build in one documented command

A good test tells the agent:

- what behavior matters
- which setup path is canonical
- which edge cases are real
- what public API shape is expected

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

This is not just verification. It is context.

## What Not To Optimize For

Do not say:

> AI loves microservices.

It does not. It loves recoverable boundaries.

Do not say:

> AI loves tiny functions.

Not necessarily. It loves coherent neighborhoods.

Do not say:

> AI loves huge context windows.

Sometimes more context is just more distraction.

Do not say:

> A big AGENTS.md solves the problem.

It can become stale context debt.

Do not say:

> Subagents solve codebase understanding.

They help when they isolate bounded work and return compact findings. They become theater when they replace clear structure and verification.

Better:

> AI agents love codebases where the relevant context can be found without reading the whole repository.

## The Codebase Agents Love

If I wanted to make a repo more agent-friendly, I would start here.

### Orientation

- root `AGENTS.md` under 100-200 high-signal lines
- exact install, lint, typecheck, test, and build commands
- short architecture map
- generated-file rules
- "do not touch" areas
- links to deeper docs instead of pasted essays

### Retrieval

- stable domain vocabulary
- predictable file names
- no generic dumping grounds
- public APIs easy to find
- imports and exports explicit
- examples near extension points
- generated or maintained repo map for large codebases

### Editing

- typed public interfaces
- generated SDKs for service boundaries
- API schemas in the repo
- dependency direction documented and enforced
- custom lint rules for important architecture constraints
- no hidden dynamic magic unless the payoff is real

### Verification

- one command for the local gate
- fast targeted tests
- broader CI checks
- lint/typecheck/format/dead-code gates
- baselines for adoption instead of eternal warnings
- CI fails when generated output is stale

### Context

- docs as code
- infra as code
- migrations and runbooks in the repo when they change with app behavior
- monorepo or unified context layer when cross-system changes are common
- stale context checks for paths, commands, generated files, and package scripts

## The Actual Thesis

The future of coding with agents is not just better models. It is better codebases.

The repos that win will be the repos where a coding agent can:

1. orient quickly
2. retrieve the right context
3. make a small change
4. run the right checks
5. see precise failures
6. repair without guessing

That is not prompt engineering.

That is software engineering.

Write code agents love by writing code that exposes its intent, enforces its boundaries, and proves its behavior.

Conveniently, that is also the kind of code senior engineers have wanted all along.

## References To Weave Into Final TSX

Use a small number inline:

- [SWE-bench](https://arxiv.org/abs/2310.06770)
- [CrossCodeEval](https://arxiv.org/abs/2310.11248)
- [RepoGraph](https://arxiv.org/abs/2410.14684)
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046)
- [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763)
- [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406)
- [CodeT5](https://arxiv.org/abs/2109.00859)
- [When Names Disappear](https://arxiv.org/abs/2510.03178)
- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488)
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988)
- [CatCoder](https://arxiv.org/abs/2406.03283)
- [FeatureBench](https://arxiv.org/abs/2602.10975)
- [Rethinking the Value of Agent-Generated Tests](https://arxiv.org/abs/2602.07900)
- [Anthropic: How Claude Code works in large codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start)
- [polint](https://github.com/emilwareus/polint)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Google monorepo paper](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/)
