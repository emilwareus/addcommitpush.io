# Write Code AI Agents Love

Status: draft  
Target: blog post first, presentation narrative second  
Working slug: `write-code-ai-agents-love`

## TL;DR

AI coding agents do not only fail because the model is weak. They fail because the repository hides the information a good maintainer would already know.

If you want agents to perform better, do not start by writing a longer prompt. Start by making the codebase easier to index, navigate, edit, and verify.

The codebase agents love has:

- clear names
- explicit dependencies
- typed boundaries
- generated API clients
- tests that prove behavior
- lint rules that encode architecture
- docs and infra in the repo when they change with the app
- short instructions that point at executable truth

The punchline:

> The best AI-friendly codebase is not the one with the best prompts. It is the one where prompts are the least important part.

## The problem

Most AI coding advice still sounds like prompt advice.

Write a better `AGENTS.md`. Add more examples. Tell the agent your coding conventions. Tell it how to run tests. Tell it not to make big changes. Tell it to think harder.

Some of that helps. I use it myself. But after spending a lot of time with coding agents, I think this framing is too small.

The real interface is not the prompt. The real interface is the repository.

An agent lands in your codebase like a new maintainer with no memory, no social context, and no intuition for your weird historical decisions. It does not know which folder is old, which abstraction is sacred, which test is meaningful, which API wrapper is blessed, which generated file must not be touched, or which route needs the security middleware.

If that knowledge exists only in your head, Slack, Notion, or code review comments, the agent will guess.

And it will guess with confidence.

## Agents are expensive new maintainers

Imagine hiring a strong engineer and removing everything that helps them ramp:

- no architecture map
- no reliable setup
- no clear test command
- no examples of the pattern you want
- no public API boundary
- no ownership rules
- no generated clients
- no lint gate for the important conventions
- no clue which docs are current

Then you ask them to implement a feature across six files.

That is roughly what many repos ask agents to do.

The research backs this up. [SWE-bench](https://arxiv.org/abs/2310.06770) made the point painfully clear: real GitHub issues are not toy functions. The original benchmark contains 2,294 tasks from real GitHub issues and pull requests, and the best reported baseline in that paper, Claude 2 with BM25 retrieval, solved only 1.96% of them. The tasks require locating the right code, understanding cross-file behavior, editing carefully, and validating the change.

Later repository-level work keeps finding the same bottleneck. [CrossCodeEval](https://arxiv.org/abs/2310.11248) was built specifically around code completion tasks that require cross-file context. [RepoGraph](https://arxiv.org/abs/2410.14684), [GraphCodeAgent](https://arxiv.org/abs/2504.10046), [CodePlan](https://arxiv.org/abs/2309.12499), and similar systems all move beyond "search for similar text" because the code needed to solve a task is often not lexically similar to the issue description.

That is the core lesson:

> Agents do not need more text. They need recoverable structure.

## What the research actually says

I went into this expecting to find a simple answer like "make everything modular."

That is not what the research says.

The stronger claim is more specific: agents do better when the relevant context can be recovered as symbols, dependencies, contracts, examples, and verification signals.

Repository-level systems like [RepoGraph](https://arxiv.org/abs/2410.14684), [GraphCodeAgent](https://arxiv.org/abs/2504.10046), [CodePlan](https://arxiv.org/abs/2309.12499), and related retrieval work all move beyond "find similar text." They use graphs, imports, call relationships, data flow, dependency edges, or task-specific repository maps. That makes sense. The code needed to solve a task is often not lexically similar to the issue description.

The chunking research is also a useful slap in the face. Function-level chunks sound intuitive, but the controlled study [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763) found function chunking underperformed declaration, sliding-window, and AST/context-aware strategies. Small functions are nice, but isolated small functions are not enough. Agents need neighborhoods: imports, declarations, callers, callees, types, examples, and tests.

There is also counter-evidence against modularity as a magic word. [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406) found no clear positive correlation between a modularity score and LLM code generation performance, and sometimes weak negative relationships.

So the advice is not:

> Split everything into more files.

The advice is:

> Create boundaries that reduce search, expose intent, and make correctness checkable.

That difference matters.

## The numbers behind the claim

Here are the data points I would actually put on slides. I am separating **relative improvement** from **percentage points** because mixing those units is how talks accidentally lie.

### Baseline difficulty

| Source | Setup | Result |
| --- | --- | ---: |
| [SWE-bench](https://arxiv.org/abs/2310.06770) | 2,294 real GitHub issue/PR tasks | Claude 2 + BM25 solved **1.96%** |

Takeaway: repo work is mostly search, integration, and validation, not isolated code synthesis.

### Repository context helps

| Source | Task | Without context | With context | Change |
| --- | --- | ---: | ---: | ---: |
| [CrossCodeEval](https://arxiv.org/abs/2310.11248), Table 2 | StarCoder-15.5B, Python exact match | 8.82 | 15.72 | **+6.90 pp** |
| [CrossCodeEval](https://arxiv.org/abs/2310.11248), Table 2 | GPT-3.5-turbo, C# exact match | 3.56 | 11.82 | **+8.26 pp** |
| [GraphCodeAgent](https://arxiv.org/abs/2504.10046), Table 4 | DevEval GPT-4o Pass@1, best baseline vs graph-guided agent | 40.43 | 58.14 | **+43.81% relative** |
| [GraphCodeAgent](https://arxiv.org/abs/2504.10046), Table 5 | Keep vs remove graph traversal tool | 58.14 | 51.83 | **-6.31 pp** |

Takeaway: agents benefit when the repo exposes cross-file relationships as navigable structure, not only as text.

### Chunking and retrieval details matter

| Source | Strategy | Exact match |
| --- | --- | ---: |
| [Chunking for RAG code completion](https://arxiv.org/abs/2605.04763), Table 4 | Function | 24.21 |
| [Chunking for RAG code completion](https://arxiv.org/abs/2605.04763), Table 4 | Declaration | 27.71 |
| [Chunking for RAG code completion](https://arxiv.org/abs/2605.04763), Table 4 | cAST | 28.19 |
| [Chunking for RAG code completion](https://arxiv.org/abs/2605.04763), Table 4 | Sliding Window | 28.40 |

Same paper, tuning effects:

| Lever | Reported effect |
| --- | ---: |
| Cross-file context budget, 2,048 -> 8,192 tokens | up to **+4.2 pp** EM |
| Retriever choice on RepoEval | at most **1.11 pp** EM variation |

Takeaway: function-sized chunks are not automatically the best retrieval unit. Agents need coherent neighborhoods.

### Instruction files are not free

| Source | Context type | Success effect | Step/cost effect |
| --- | --- | --- | --- |
| [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) | LLM-generated context | Resolution rate fell by 0.5% on SWE-bench Lite and 2% on AgentBench | Steps rose by 2.45 and 3.92; cost rose 20% and 23% |
| [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) | Developer-written context | Improved performance for all agents except Claude Code on AgentBench | Steps rose by 3.34 on average; cost rose by up to 19% |

Takeaway: `AGENTS.md` should be short, maintained, and pointed at executable truth. It should not become a second codebase.

## Names are part of the API

Names are not style polish. For agents, names are semantic infrastructure.

Identifier-aware models like [CodeT5](https://arxiv.org/abs/2109.00859) explicitly treat identifiers as meaningful signals. Naming-specific studies such as [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488) and [When Names Disappear](https://arxiv.org/abs/2510.03178) show that misleading, nonsense, or obfuscated names degrade LLM performance on code analysis and summarization tasks. Tool-assisted generation papers such as [ToolGen](https://arxiv.org/abs/2401.06391) show that agents frequently fail with invalid members, undefined variables, and wrong repository-specific symbols.

This means your naming discipline is not only for humans.

Good:

```ts
getActiveSchoolAttendanceSummary()
createUploadIntentForAttachment()
requireActiveSchool()
```

Bad:

```ts
handleData()
process()
doStuff()
sharedUtils()
```

Better module shape:

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

Weak module shape:

```ts
// utils/index.ts
export async function handleData(input: unknown) {
  // Parses something, reads from the database, applies a domain rule,
  // and returns a response-shaped object.
}
```

The agent will search, rank, and reason over your names. If your domain has ten words for the same thing, the agent has to infer whether they are synonyms or different concepts. If a module is called `utils`, everything inside it becomes harder to retrieve with intent.

Practical rules:

- use stable domain nouns
- make operations verbs
- avoid clever abbreviations
- avoid generic dumping grounds
- name tests by behavior
- keep the same vocabulary in code, docs, API schemas, and issues

This is boring advice. That is why it works.

## Dependency edges beat text blobs

The next layer is dependency visibility.

Agents are much better when they can see how things connect:

- imports
- exports
- public interfaces
- route registration
- generated clients
- schemas
- ownership boundaries
- tests
- build targets

They are worse when behavior is hidden behind:

- dynamic imports
- reflection
- stringly typed registries
- monkeypatching
- implicit globals
- side effects during module import
- framework magic with no local example

I am not saying "never use dynamic patterns." Sometimes they are the right tool. But dynamic magic has a cost: it breaks the static surfaces agents and tools use to understand the repo.

If a code graph cannot be generated, the agent probably cannot reason about the graph either.

The same idea applies at the import boundary:

```ts
// Bad: client code reaches across the boundary and learns backend internals.
import { db } from '../../server/db';

export async function loadAttendanceForLesson(lessonId: string) {
  return db.attendance.findMany({ where: { lessonId } });
}
```

```ts
// Better: the frontend depends on a typed public contract.
import { attendanceApi } from '@acme/sdk';

export async function loadAttendanceForLesson(lessonId: LessonId) {
  return attendanceApi.listLessonAttendance({ lessonId });
}
```

The second version is not only cleaner. It gives the agent a symbol to search for, a generated type to satisfy, and a boundary violation that lint can catch.

## Types compress intent

Types are not just compiler candy. They compress context.

A good type tells the agent what is valid without making it read five files.

For example:

```ts
type AttendanceStatus = 'present' | 'late' | 'absent';

type MarkAttendanceRequest = {
  lessonId: LessonId;
  studentId: StudentId;
  status: AttendanceStatus;
};
```

Even better, make illegal states hard to spell:

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

This is much better than:

```ts
type Payload = Record<string, unknown>;
```

The second version forces the agent to infer the shape from call sites, tests, API docs, and runtime errors. Maybe it succeeds. Maybe it invents a field.

Types, schemas, generated clients, and narrow interfaces all do the same thing: they reduce the number of valid guesses.

That is the point.

## More context can hurt

One of the more annoying findings in this research is that context files are not automatically good.

Some context-file studies found benefits: less runtime, fewer output tokens, better guidance. But [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) found that context files consistently increased the number of steps required to complete tasks. In that study, LLM-generated context had a marginal negative effect on success, while developer-written context had a marginal performance gain.

This matches my experience.

A short instruction file with commands, boundaries, and gotchas is useful. A giant manifesto full of stale aspirations is not.

Good agent instructions:

```md
Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before finalizing.
Do not edit files under `src/generated/`; regenerate with `pnpm generate`.
Frontend code must call APIs through `@acme/sdk`.
Server-only modules live under `server/` and must not be imported by client components.
Architecture rules live in `tools/lint-rules/`; fix violations instead of suppressing them.
```

Weak agent instructions:

```md
Write clean code.
Use best practices.
Follow our architecture.
Make sure everything works.
```

The first version points at executable facts. The second version asks the model to hallucinate your standards.

## Make intent executable

This is the main idea of the article.

Do not just document the rules. Make the rules run.

There are three places where this becomes especially powerful:

1. custom lint rules
2. monorepos
3. generated SDKs

These are not random preferences. They are all the same pattern:

> Turn hidden intent into code the agent can inspect, execute, and repair against.

## 1. Custom lint rules are executable architecture

Every engineering team has rules that are too specific for generic linting:

- UI must not import database code
- server-only files must not enter the client bundle
- routes under `/schools/active` must require active-school guards
- mutating routes must include CSRF middleware
- frontend code must use design tokens instead of raw colors
- API calls must go through the generated SDK
- domain code must not import infrastructure
- every route handler must have component test evidence

You can write these in `AGENTS.md`.

But if they matter, encode them.

Use the boring standard tool when it works. [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules), [Semgrep](https://semgrep.dev/docs/writing-rules/overview/), [ast-grep](https://ast-grep.github.io/guide/rule-config.html), [Nx module boundaries](https://nx.dev/features/enforce-module-boundaries), [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), custom Go analyzers, and similar tools all fit here.

For more repo-specific rules, I have been experimenting with [polint](https://github.com/emilwareus/polint).

The idea is "bring your own rules." The repo owns the rule code. The framework brings the scanning infrastructure: parsers, fact views, diagnostics, runner, cache, JSON/SARIF output, baselines, ignores, and CI/agent integration.

In my local [`plint` repo](../notes/polint-plint-case-study.md), I use this for backend architecture guardrails. The rules are not generic style preferences. They check things like:

- layer import direction
- domain/app purity from transport and persistence
- route security middleware
- context propagation
- typed error discipline
- UUID boundary usage
- repository interface placement
- HTTP route/component test evidence

That is the kind of rule I do not want to explain to an agent every time. I want it to fail the build with a precise message.

A rule should read like architecture, not like a vague preference. This is the shape I want:

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

And this is the kind of violation an agent can repair without a conversation:

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

The important point is not `polint` specifically. It is the pattern.

> Do not ask the agent to remember your architecture. Make the architecture fail the build when violated.

## 2. The monorepo is the context database

I am increasingly convinced that agents make the monorepo argument stronger.

Not because "one repo" is magically better. A bad monorepo is just a larger mess.

The value is that the agent can see the system at one commit. This is also the practical lesson behind the classic [Google monorepo paper](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/): one repository only works when tooling, ownership, and dependency management make the scale navigable.

For an agent, this kind of layout is a context database:

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

Now the agent can see the system at one commit:

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

This is basically docs-as-code, infra-as-code, contracts-as-code, and tests-as-code pushed to the same conclusion: the repo is the truth source.

For an agent, this is huge. It does not need to ask which wiki page is current. It does not need to guess which API version the frontend consumes. It does not need to coordinate a backend change in one repository with a generated SDK update in another and an infra permission change in a third.

It can change the code, the contract, the generated client, the docs, and the infra in one diff.

That is very powerful.

But the caveat matters:

- you need ownership
- you need dependency boundaries
- you need affected builds
- you need CI caching
- you need generated-code policy
- you need access control
- you need tooling so the repo does not become slow

The monorepo is not the goal. Atomic context is the goal.

> For agents, a good monorepo is not one repo. It is one commit that contains the whole truth.

## 3. Generated SDKs beat raw API calls

Raw API calls are a great way to create integration bugs.

This is especially true with agents.

A raw call hides the contract in strings:

```ts
await fetch(`/api/schools/${schoolId}/attendance`, {
  method: 'POST',
  body: JSON.stringify({ lesson, student, state }),
});
```

What is the exact route? Is it `schoolId` or active school from session? Is the method correct? What is the request body? What fields are required? What does the response look like? What error shape comes back? Is CSRF required? Does this endpoint paginate?

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

Now the contract is a local symbol with types.

[OpenAPI Generator](https://openapi-generator.tech/), [Kiota](https://learn.microsoft.com/en-us/openapi/kiota/), [Orval](https://orval.dev/), [Speakeasy](https://www.speakeasy.com/docs/sdks/create-client-sdks), [Stainless](https://www.stainless.com/docs/sdks/typescript/), [FastAPI's OpenAPI generation](https://fastapi.tiangolo.com/tutorial/metadata/), [TypeSpec](https://typespec.io/), protobuf - choose your tool. The principle is the same:

> If your API has a contract, generate the contract into code before asking an agent to use it.

In local [`plint`](../notes/polint-plint-case-study.md), backend routes generate OpenAPI, and OpenAPI generates both a TypeScript SDK for the frontend and a Go SDK for backend component tests. The repo instructions explicitly say not to hand-edit generated artifacts. The generation command builds the SDKs and runs checks.

That gives the agent a path:

1. change backend route or DTO
2. regenerate OpenAPI and SDKs
3. update frontend or tests through typed clients
4. run validation

No rawdogging string URLs unless there is a good reason.

The workflow should be visible in code and scripts:

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

Then the generated client becomes the blessed path:

```ts
import { attendanceApi } from '@acme/sdk';

export async function markPresent(input: {
  lessonId: LessonId;
  studentId: StudentId;
}) {
  return attendanceApi.markLessonAttendance({
    markLessonAttendanceRequest: {
      lessonId: input.lessonId,
      studentId: input.studentId,
      status: 'present',
    },
  });
}
```

And the lint rule can ban the escape hatch:

```ts
// backend/no-raw-api-calls-in-frontend
// Disallow fetch('/api/...') outside the generated SDK package.
```

## Tests are the feedback loop

Agents need fast feedback.

This does not mean "ask the agent to write more tests" and call it done. Research on agent-generated tests is mixed. Agents often write tests as probes, not as durable specifications.

The better pattern is:

- keep strong existing tests
- make targeted tests cheap to run
- name tests by behavior
- put examples near the code they exercise
- use generated SDKs in component tests when testing HTTP contracts
- run lint, typecheck, tests, and build in one documented command

Tests are not just quality assurance. They are context.

A good test tells the agent:

- what behavior matters
- which setup path is canonical
- which edge cases are real
- what shape the public API has

This is why examples and tests should live close to the code. They are retrieval assets.

## A practical checklist

If I wanted to make a repo more agent-friendly, I would start here.

### Repo instructions

- root `AGENTS.md` under 100-200 high-signal lines
- exact install, lint, typecheck, test, build commands
- generated-file rules
- "do not touch" areas
- short architecture map
- links to deeper docs instead of pasted essays

### Names and layout

- stable domain vocabulary
- predictable file names
- no generic dumping grounds
- public APIs easy to find
- examples near extension points

### Boundaries

- typed public interfaces
- explicit imports and exports
- dependency direction documented and enforced
- custom lint rules for important architecture constraints
- no hidden dynamic magic unless the payoff is real

### Contracts

- API schemas in the repo
- generated SDKs for frontend/internal consumers
- generated code policy documented
- CI fails when generated output is stale

### Verification

- one command for the local gate
- fast targeted tests
- broader CI checks
- lint/typecheck/format/dead-code gates
- baselines for adoption instead of eternal warnings

### Context

- docs as code
- infra as code
- migrations and runbooks in the repo when they change with app behavior
- monorepo or unified context layer when cross-system changes are common

## What not to say

There are a few traps.

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

It can help, but it can also add noise.

Better:

> AI agents love codebases where the relevant context can be found without reading the whole repository.

## The actual thesis

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

## References to weave into final TSX

Use a small number inline:

- [SWE-bench](https://arxiv.org/abs/2310.06770)
- [RepoGraph](https://arxiv.org/abs/2410.14684)
- [GraphCodeAgent](https://arxiv.org/abs/2504.10046)
- [How Does Chunking Affect Retrieval-Augmented Code Completion?](https://arxiv.org/abs/2605.04763)
- [Revisiting the Impact of Pursuing Modularity for Code Generation](https://arxiv.org/abs/2407.11406)
- [CodeT5](https://arxiv.org/abs/2109.00859)
- [How Does Naming Affect LLMs on Code Analysis Tasks?](https://arxiv.org/abs/2307.12488)
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988)
- [polint](https://github.com/emilwareus/polint)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Google monorepo paper](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/)
