# Write Code That AI Agents Love

20 min. Working outline.

Structure only.

---

## 1. Title

Purpose:

- Open the talk.
- Set the subject without explaining it yet.

Slide content:

- Write Code That AI Agents Love
- Emil

Notes:

- Emil writes the actual opening.

---

## 2. The agentic loop

Purpose:

- Establish the one mental model for the talk.
- Show that the rest of the talk maps to parts of this loop.

Visual:

```txt
+---------------------------+
|          PROMPT           |
|---------------------------|
| * AGENTS.md               |
| setup commands            |
| repo instructions         |
+-------------+-------------+
              |
              v
+---------------------------+       +---------------------------+
|          ORIENT           |       |          VERIFY           |
|---------------------------|       |---------------------------|
| * architecture docs       |       | * tests                   |
| * bounded context         |       | typecheck / build         |
| repo map                  |       |                           |
+-------------+-------------+       | * custom rules / polint   |
              |                     +-------------^-------------+
              v                                   |
+---------------------------+                     |
|         RETRIEVE          |                     |
|---------------------------|                     |
| examples as specs         |                     |
| * subagents               |                     |
| naming                    |                     |
| domain vocabulary         |                     |
+-------------+-------------+                     |
              |                                   |
              v                                   |
+---------------------------+                     |
|           EDIT            |---------------------+
|---------------------------|
| * generated SDKs          |
| types                     |
| * code quality            |
+---------------------------+
```

Notes:

- This should be one image.
- `*` marks the explicit topics for the talk:
  AGENTS.md, architecture docs, bounded context, subagents, code quality, generated SDKs, tests, custom rules.

---

## 3. Prompt: repo instructions

Purpose:

- Cover the prompt/startup part of the loop.
- Make AGENTS.md concrete without over-selling it.

Topics:

- AGENTS.md / CLAUDE.md as bootstrapping.
- Good instructions are commands, entry points, and links.
- Weak instructions are vague architecture statements.
- Setup commands belong here too.

Possible slide content:

```txt
Good:
- read thoughts/architecture/README.md
- generated files are not edited by hand

Weak:
- write good code
- follow DDD
- be careful
```

Notes:

- Mention the mixed research briefly if useful.
- Do not turn this into a prompting section.

---

## 4. Orient: architecture docs

Purpose:

- Show how the repo helps the agent understand where it is.

Topics:

- Thin root architecture index.
- Layered docs instead of one giant context file.
- Repo map / architecture map.
- LSP/IDE access if relevant.

Possible visual:

```txt
AGENTS.md
  -> thoughts/architecture/README.md
      -> bounded-contexts.md
      -> testing-strategy.md
      -> generated-sdk-policy.md

feature folder
  -> local AGENT.md only when local rules differ
```

Notes:

- Keep this about orienting, not documentation theory.

---

## 5. Orient: bounded context

Purpose:

- Connect architecture to agent work and human review.

Topics:

- Bounded context reduces search area.
- Product language, tests, APIs, and rules live together.
- Helps humans keep the mental model.
- Cognitive debt risk: using the codebase without reading it.

Possible slide content:

```txt
Billing should feel like billing.
Scheduling should feel like scheduling.

The agent gets a smaller neighborhood.
The human gets a reviewable change.
```

Notes:

- This is where code quality and architecture connect.

---

## 6. Retrieve: examples as specs + subagents

Purpose:

- Cover retrieval.
- Explain why examples and pattern-finding matter.

Topics:

- Agents copy what is already in the repo.
- Good examples compound.
- Bad examples compound.
- Subagents as read-only pattern finders.

Possible visual:

```txt
Task: add invoice credits

Subagent:
- search billing/
- find current examples
- return 3 files to mimic
- no edits

Main agent:
- plans and edits
```

Notes:

- Do not frame subagents as a fake team.
- They are useful when they compress search into a small answer.

---

## 7. Edit: code quality

Purpose:

- Cover code quality without making the claim too broad.

Topics:

- Strong models can compensate for some bad code.
- Code quality still matters for reviewability.
- Cognitive debt: agent touched code, human did not build the mental model.
- Farmer's eye story if Emil wants to use it.

Possible slide content:

```txt
Question:
Can I quickly tell whether this agent change belongs?
```

Notes:

- This is not a generic clean-code slide.
- Keep the focus on human judgment after agent edits.

---

## 8. Edit: generated SDKs

Purpose:

- Show how API contracts become local code the agent can use.

Topics:

- Backend/frontend contracts are hard to keep correct in prose.
- Generate DTOs/client functions from the API contract.
- Typecheck points at broken call sites when API shape changes.
- Works especially well for Go backend + TypeScript frontend.

Possible visual:

```txt
API contract
  -> generated client
  -> frontend call sites
  -> typecheck feedback
```

Optional code contrast:

```ts
// worse
fetch("/api/invoices/" + id + "/credits", ...)

// better
billingClient.applyInvoiceCredit({ invoiceId, creditId })
```

Notes:

- Mention tRPC only as a comparison, not as the main point.

---

## 9. Verify: tests

Purpose:

- Cover the verify part of the loop.
- Make tests about feedback and visible behavior.

Topics:

- Agent-written tests can lock in the same misunderstanding.
- Good tests still give the best feedback loop.
- Component tests are especially useful.
- Branch/behavior coverage over raw coverage percentage.
- Tenancy, access control, status codes.

Possible visual:

```txt
Domain tests
Component tests
E2E tests

Fast enough for the loop.
Readable enough for the human.
Real enough to catch behavior.
```

Notes:

- Use examples from the audio: user context, scheduled context, tenant context.

---

## 10. Verify: custom rules

Purpose:

- Show how structural correctness becomes executable.

Topics:

- Tests can pass while the shape is wrong.
- Custom rules catch repo-specific failures.
- polint as one way to do structured linting as code.
- Rule output should be repairable by an agent.

Possible visual:

```txt
backend/orders/ports/http.go:42:17 local/no-route-db-access
Routes must not import the ORM directly.
Move persistence behind the application command.
```

Rule examples:

```txt
- routes cannot import ORM/database packages
- generated SDK files cannot be edited by hand
- raw HTTP banned when a generated client exists
- E2E tests cannot use sleep-based waits
- cross-context imports go through approved boundaries
```

Notes:

- This is verification, not a tool pitch.

---

## 11. Impact / effort map

Purpose:

- Give the audience a prioritization frame.
- Separate cheap orientation improvements from deeper architecture work.

Visual:

```txt
Impact
  4 |                              | generated SDKs   | tests, custom rules | bounded context
    |                              |                  |                     |
  3 |                              | architecture docs|                     | code quality
    |                              |                  |                     |
  2 | AGENTS.md                    | subagents        |                     |
    |                              |                  |                     |
  1 |                              |                  |                     |
    +------------------------------+------------------+---------------------+----------------
       1 low effort                 2                3                  4 high effort
```

Notes:

- This is an opinionated placement, not a universal benchmark.
- Assumption: real product repo with existing CI/test tooling and some API boundaries already in place.
- AGENTS.md is low effort and useful for bootstrapping, but the research is mixed. It can reduce exploration cost, but noisy context files can also hurt success/cost.
- Architecture docs are medium-low effort when they are thin indexes. They improve orientation without forcing a full architecture rewrite.
- Subagents are low-to-medium effort if they stay read-only and narrow. Impact is real for retrieval, but they do not fix bad structure by themselves.
- Generated SDKs are high impact because they turn remote contracts into local typed symbols and typecheck feedback. Effort is medium if an API contract already exists; much higher if the contract has to be cleaned up first.
- Tests are high impact because they are the main verify loop. Effort is medium-high because useful component tests need real fixtures, stable setup, and readable behavior.
- Custom rules are high impact for repeated structural failures. Effort is medium-high because the first rule system and fact model take work; after that, each rule gets cheaper.
- Bounded context is high impact and high effort. It improves orient/retrieve/edit/review, but moving a real repo toward clearer boundaries is architecture work.
- Code quality is high effort and medium-high impact. Strong models can compensate for some bad code, so the direct agent-performance impact is not always huge. The human reviewability impact is still important.

---

## 12. Close

Purpose:

- Give one practical takeaway.

Slide content:

```txt
Fix the weakest part of the loop first.
Fix that first.
```

Examples:

```txt
Prompt problem -> shorter AGENTS.md + setup commands
Orient problem -> architecture index + bounded context map
Retrieve problem -> canonical examples + pattern finder
Edit problem -> generated SDKs + visible contracts
Verify problem -> tests + custom rules
```

Notes:

- Emil writes the actual ending.

---

## Cut / optional

- Monorepo as co-versioned company context.
- Full AGENTS.md research numbers.
- CodeScene / CodeHealth details.
- Domain vocabulary as its own slide.
- Multi-file ripple deeper example.
- Repo graph research.

## Required topic coverage

- SDK gen: slide 8, slide 11.
- Custom rules: slide 10, slide 11.
- Bounded context: slide 5, slide 11.
- Code quality: slide 7, slide 11.
- Tests: slide 9, slide 11.
- Subagents: slide 6, slide 11.
- Architecture docs: slide 4, slide 11.
- AGENTS.md: slide 3, slide 11.
