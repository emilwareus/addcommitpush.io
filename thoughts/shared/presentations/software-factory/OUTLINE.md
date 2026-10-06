# The next evolution of engineering

**Working outline**

## Main story

- They value engineering craft. That skill becomes more important.
- Punch cards → assembly → C → higher-level languages → Copilot → Claude Code → autonomous agents → dark factory.
- Good engineers carry their judgment into each evolution.
- Taste, architecture and a faster learning loop give that judgment more leverage.

## Main takeaways

- Good taste. Know what not to build.
- Find their actual bottleneck. Physical constraints? Emulation? Review? Writing Code? Design?
- Spend more tokens on learning and iteration.
- Decide what and how before writing code.
- SpecDD: understand the difficult parts earlier.
- Test hard what can be tested hard. Move checkable CLAUDE.md instructions into tests and linting.
- Code quality, good architecture, generated interfaces, Everything as Code.
- Get a server. Sharpen the saw.
- Put the learning loop in the codebase.
- Business people can code.

## Slides / subtopics

**12 slides total, including slide 0.** The leverage bar connects the opening and the three main topics. Closing remarks sit within the final slide.

Each slide carries one point and one main visual. Supporting points below are for the spoken explanation.

| Part | Slides | Working timing |
| --- | --- | ---: |
| Who I am → machine → craft → leverage | 0–3 | 9 min |
| Write code that AI agents love | 4–6 | 13 min |
| Code in an AI-native way | 7–9 | 13 min |
| Learn faster; make more precise product decisions | 10–11 | 10 min |
| **Total** | **12 slides** | **45 min** |

### 0. Who am I, what do I build? · 1 min

**Purpose:** establish that this comes from someone who still builds software.

- Emil Wåreus: engineer, researcher, founder.
- OAIZ today; Debricked as relevant background.
- One personal project to show the breadth of what I build.

**Show:** name, portrait and a few recognisable project images. Reuse the identity and assets from the existing About slide; keep the biography short.

**Lead into:** the engineering system behind the work.

### 1. Build the machine · 2 min

**Purpose:** introduce the autonomous dark factory as the destination.

- Engineer the system that turns a problem into working software.
- Agents handle increasing amounts of research, implementation and verification.
- Engineers shape the decisions, checks and learning that make this useful.

**Show:** a visible product result above a simple loop: request → development → checks → result → feedback. Highlight the engineer's influence on the loop.

Use the early-result pattern from the Voice Agents talk. Give them something tangible before explaining the machinery. Distinguish the dark-factory ambition from the current dev5 endpoint: a PR ready for human review.

### 2. The craft is not dead. It has evolved to a higher leverage · 3 min

**Purpose:** recognise the skills they value and show how those skills gain reach.

| Before: craft through direct implementation | Now: craft across agent work |
| --- | --- |
| Translate an idea into working code | Clarify intent and judge the implementation |
| Debug and test a change | Build the feedback that helps agents correct changes |
| Design a maintainable system | Make its boundaries clear and enforceable |
| Learn the domain while building | Keep a mental model and choose useful work |

**Show:** your requested animation. Keep the earlier skills on the left; reveal their expanded application on the right, one aligned row at a time. Retain the left side so the continuity stays visible.

AI doing the coding does not mean handing over all the thinking. The engineer still needs to understand the system well enough to judge what belongs in it. Briefly connect this to the evolution of languages and coding tools; avoid a separate history lesson here.

### 3. The leverage · 3 min

**Purpose:** give the audience the map for the three main topics.

**Show:** a horizontal leverage bar, with **most leverage on the left**, exactly as in your outline.

| Left: MOST | Middle: MORE | Right: A LOT |
| --- | --- | --- |
| What to build; iteration speed; speed of learning | Coding and feedback loops; production visibility; SpecDD; server | Code quality; architecture; solution design |

- Strong code gives the machine a useful foundation.
- A better working loop lets it operate and correct itself.
- Product judgment decides where that capacity goes.

Treat the bar as your working model, not a measured universal ranking. Their current bottleneck determines which investment matters first. Reuse its three regions as small chapter markers throughout the talk.

## Main topic ONE: Write code that AI agents love

### 4. Architecture · 2 min

The current local slide (`04-architecture.tsx`) is wrong. It is a fake Billing/Orders cartoon with `MarkPaid` vs `invoice.Status = "paid"`. That is a CS-101 ownership diagram plus invented code. It does not prove the blog claim, it is not from a real repo, and it steals the next two slides (code quality = can I judge the change; lint = encode the shortcut as a check). Do not polish that layout. Replace the example.

**What this slide means**

This is the first lever in Part 1: write code that AI agents love. In this talk, architecture is not “clean architecture,” hexagonal purity, or “good structure makes better tokens.”

The blog is explicit ([Bounded Context / Layout](https://addcommitpush.io/blog/write-code-that-ai-agents-love#bounded-context--layout)). These are the sentences the slide has to make true, in Emil’s voice:

> There is actually not a lot of research that finds that "good architecture = good code generation". And there is also a the debate of "what is even good architecture"... but I do think there are some wins here, and it is not about the agent. As a developer working with AI generated code we need to have a mental model of the work we are doing. This mental model was something we used to build by crying over our keyboards for hours on end. But now it cry in tokens instead of tears, and the mental model of the codebase becomes harder to form. We get cognitive debt.

> I think that a good bounded contexts within the codebase reduces the cognitive debt, makes it easier to grasp and understand the code, and therefore makes the developers take better decisions = better code gen in the long run. **It may not improve the token shotgun today, but it improves your ability to aim it.**

> Here, a bounded context is just a "service", that may be deployed on its own, but can also run in a big monolith along other services, it may not import another bounded context directly, has clear responsibilities, interfaces, APIs, and dependencies. This works well for me and my team, but the goal of this is to keep your cognitive debt low... so you do what's best for you IMO.

The win is for the human who still has to aim. Architecture is cognitive debt at system scale. Code quality (next deck slide, already built as `04-code-quality`) is the same debt at file scale: can I still read *this* diff. Do not merge them.

A bounded context is the cheapest way found so far to keep that mental model alive: one room where one domain model, one vocabulary, and one set of rules are true. Three Dots Labs is what Emil actually uses, not a religion. The goal is a cheap map.

That is why this sits on the leverage bar under “A lot” / code. Stronger models can paper over messy files for a while ([Code for Machines](https://arxiv.org/abs/2601.02200) is the warrant for *that* claim, and it belongs on the code-quality beat). They cannot give you back a mental model you stopped forming. If you cannot point to the owner of a change, you cannot aim the agent, review it, or let a domain expert contribute through it.

Craft already previewed this: *Design systems → Enforcing designed system.* This slide is what that sentence means. You are not drawing boxes for an architecture review. You are keeping rooms obvious so you can still decide.

In the agent loop this is **Orient** ([The loop](https://addcommitpush.io/blog/write-code-that-ai-agents-love#the-loop)): “where am I, what kind of repo is this, what rules matter, and where should I start?” If the repo has no map and no clear boundaries, the agent navigates by vibes. A good prompt should not have to explain the whole architecture.

**What the research actually supports (say this carefully)**

Do not claim “modular code generates better.” The synthesis in [INSIGHT_15](https://addcommitpush.io/brain/modularity-is-not-magic-boundaries-are) is: **boundaries matter more than decomposition count.**

| Source | What you may say | What you may not say |
| --- | --- | --- |
| Revisiting Modularity (EMNLP 2024) | Modularity score alone does not predict generation quality | “Make it modular and the agent gets better” |
| CodeChain | Decomposition plus revision can help on self-contained programming tasks | That this proves DDD in a product monorepo |
| Chunking / RAG completion | Isolated function chunks lose the structural skeleton; declarations and neighborhood matter | That folder count is the metric |
| The Modular Imperative (position) | Models optimize for immediate completeness; they produce boundary-crossing, over-complete solutions | Treat the 586-line / 4x-size anecdote as a law |
| Needle in the Repo | Tests can pass while the change lands in the wrong place (64/483, 13.3% in that paper) | Quote 13.3% as the audience's or OAIZ's number |

The Modular Imperative observation is the agent-side of this slide: left alone, the model will go through the wall because that finishes the request. Architecture is how you make the legal path the obvious path, and how you keep a map so *you* can see when it did not.

Repo maps / call graphs ([RepoMap](https://addcommitpush.io/blog/write-code-that-ai-agents-love#repomap--architecture-map)) are a neighboring Orient tool, not this slide. Generated SDKs ([Generated SDKs](https://addcommitpush.io/blog/write-code-that-ai-agents-love#generated-sdks), [INSIGHT_26](https://addcommitpush.io/brain/static-surfaces-are-agent-affordances)) are a typed-contract tool, not this slide. Domain vocabulary ([Domain vocabulary](https://addcommitpush.io/blog/write-code-that-ai-agents-love#domain-vocabulary)) lives *inside* a context (`Account` may mean three things in a company; it must mean one thing in a room). Do not turn this slide into any of those talks.

**How this slide differs from the next ones**

| Slide | Question | Scale |
| --- | --- | --- |
| Architecture (this) | Can I still point to the owner of this kind of change? | System / context |
| Code quality (already a separate deck slide) | Can I read *this* diff and tell if it is good? | File / name / shape |
| Lint | Can a machine refuse a repeated shortcut? | Encoded rule |
| Tests | Did the public behavior stay true? | Runtime check |

If the picture is “Orders must not write Invoice rows,” you have drawn lint. If the picture is `applyThing` vs `canApplyCredit`, you have drawn code quality. If the picture is `amount` vs `amountMinor`, you have drawn generated SDKs.

This picture must show: **the map is cheap enough that a human can still aim.**

**What a good example must do**

Design around one real (or honestly illustrative) proof that a person can answer “where does this live?” because the repo makes the rooms obvious.

The example has to show at least one of these, preferably from OAIZ / Emil’s own tree:

1. **A map a new maintainer (or an agent) can open first.** The last talk already had this: `AGENTS.md → thoughts/architecture/README.md →` smaller docs. CONTEXT.md confirms Core’s AGENTS.md still links an architecture index and topic guides. That is Orient. It is concrete. It is not a service-box cartoon.
2. **A real ownership line in the repo.** Two contexts, one concept that must not be shared, the public door named as it actually is in the code. Not `MarkPaid(invoiceID)` invented for the slide.
3. **The failure mode of no map.** The agent (or a tired human) puts the change in the nearest file; the tests may even pass; the owner is now wrong. Needle in the Repo is the spoken warrant, not the visual unless you have a real diff.

Prefer (1) or a real (2). If the real OAIZ boundary is too messy to show, pick one actual folder/doc/import rule and crop it. If that asset is missing, leave the slide unfinished and write the exact path needed. Do not invent Billing.

Open these before inventing anything:

- [core/AGENTS.md](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/core/AGENTS.md) — architecture index and topic guides
- Local OAIZ checkout if present: `thoughts/architecture/`, context folders, public APIs as they actually are named
- Polint bounded-context *rule source* is for the designer’s understanding only: [`bounded_context_imports.rs`](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/.polint/rules/src/bounded_context_imports.rs). The diagnostic belongs on the lint slide. You may *mention* that the map is later made executable. Do not put the polint failure here.

**Done when** a solution architect in the room can repeat the claim without the boxes: *architecture keeps the mental model cheap enough to aim the agent.* If they instead say “so Orders must not write invoices,” the slide failed. If they say “so we lint the shortcut,” that is the next-next slide.

**Say (~2 min)**

This is not “good architecture makes better tokens.” I do not have that paper. The debate about what good architecture even is is older than the agents.

The point is cheaper cognitive debt. I used to learn a codebase by sitting in it. Now the agent writes the PRs. If I stop reading, I lose the map. Then I cannot tell if the change belongs, and I cannot aim the next one.

A bounded context is just the room where one model is true. One vocabulary. One owner. In our Go code that looks like a Three Dots Labs service: it may live in the monolith, it does not import the other context, it has a door.

It may not improve the token shotgun today. It improves your ability to aim it.

I do not need you to copy that shape. I need you to be able to point: this kind of change lives here. If you cannot point, the agent will finish the request through the nearest wall. Models do that. They optimize for complete, not for the map.

A domain expert can contribute through an agent only when that path is obvious and the rooms hold. Engineers create those conditions.

That is why architecture still matters when you are not the one typing. You are keeping a mental model cheap enough to aim.

Then turn to code quality: even inside the right room, can I read the change and judge it?

**Visual constraints**

- One claim. One proof object. Title can be “Architecture”; the sentence under it must be the human claim, not a DDD definition.
- No tiny kickers (`BOUNDED CONTEXT`, `PUBLIC SURFACE ONLY`, `WORKING MODEL`).
- No second idea (SDK miss, lint X on Route→DB, `applyThing`).
- If the example is not a real receipt, label it Illustrative.
- Presentation size: large, few words, from [AGENTS.md](../../../../components/presentations/software-factory/AGENTS.md).
- Do not replay the last talk’s Billing/Auth boxes. That slide defined the term. This talk needs the *cost* and the *use*: you keep a mental model so you can aim.

**Sources to read before designing**

- Blog: [Bounded Context / Layout](https://addcommitpush.io/blog/write-code-that-ai-agents-love#bounded-context--layout), [The loop / Orient](https://addcommitpush.io/blog/write-code-that-ai-agents-love#the-loop), [Code quality](https://addcommitpush.io/blog/write-code-that-ai-agents-love#code-quality-how-easy-is-this-code-to-change) (to stay out of its lane)
- Insights: [INSIGHT_15 boundaries](https://addcommitpush.io/brain/modularity-is-not-magic-boundaries-are)
- Last talk, mechanism only: [07-bounded-context.tsx](../../../../components/presentations/write-code-ai-agents-love/slides/07-bounded-context.tsx), [06-architecture-docs.tsx](../../../../components/presentations/write-code-ai-agents-love/slides/06-architecture-docs.tsx)
- Audience context: architecture and engineers improving delivery conditions were an explicit ask ([CONTEXT.md](CONTEXT.md))
- Three Dots Labs: https://threedots.tech

### 5. Lint your codebase · 4 min

**Purpose:** show how a repeatable piece of engineering judgment becomes feedback.

- Keep CLAUDE.md / AGENTS.md focused on navigation and commands.
- Encode mechanical architecture rules in checks.
- Turn recurring mistakes into precise diagnostics.

**Show:** the existing Polint example: a route imports persistence directly; the diagnostic names the forbidden dependency and the intended boundary. Follow the small correction rather than showing a page of policy.

Keep a clear division: linting can enforce detectable rules; engineers still judge design and intent. The diagnostic in the earlier slide is an illustrative example, not a receipt from a production incident.

**Reuse:** [Custom Rules slide](../../../../components/presentations/write-code-ai-agents-love/slides/13-custom-rules.tsx).

### 6. Test hard what can be tested hard · 5 min

**Purpose:** give the agent a strong, readable correction loop.

- Push coverage of meaningful behavior and failure branches.
- Exercise permissions, tenant boundaries, inputs and side effects.
- Lint test structure; inspect what the assertions actually prove.

**Show:** the existing component-test diagram: public API through the service, real owned infrastructure, external systems mocked. Beside it, show a few readable cases and one failure that guides a correction.

Explain why this is useful: the agent can run the check repeatedly, and a human can read the expected behavior. A test that repeats the agent's misunderstanding can still pass. Test naming and coverage percentages cannot establish correct intent by themselves.

**Reuse:** the component view from the [Test Structure slide](../../../../components/presentations/write-code-ai-agents-love/slides/11-code-quality-structure.tsx). Testing boundaries follow [Three Dots Labs](https://threedots.tech/post/microservices-test-architecture/).

## Main topic TWO: Code in an AI-native way

### 7. SpecDD at OAIZ · 5 min

**Purpose:** show how we understand the difficult parts before implementation.

Briefly place their current work on the spectrum: IDE assistance → local coding agent → remote tasks → autonomous factory. Use this as the spoken introduction to the workflow, without a separate spectrum slide.

- Research the actual code and unresolved questions.
- Decide the outcome, scope and implementation approach.
- Implement in phases, validate and review.

**Show:** a real request beside its short research finding and plan. Highlight a difficult decision found before code, then the checks that follow through implementation.

Use the actual dev5 sequence: research → plan → implementation → validation → code review → security review → ready for human review. SpecDD's value here is earlier understanding of what and how. Select one completed case before presenting execution claims.

**Source:** [dev5 source context](CONTEXT.md); local stage scripts under `/Users/emilwareus/Development/oaiz/scripts/dev5/`.

### 8. Get a server. Let it run · 4 min

**Purpose:** show how to parallelise work without requiring constant attention.

- Give agents a complete, repeatable development environment.
- Run independent tasks in separate workspaces.
- Spend tokens on better models and useful iterations.
- Spend your attention on decisions, blockers and review.

**Show:** one server with two independent task workspaces, each with its own tools and checks. Add the short handoff the engineer receives. Use a real redacted task view if available.

The existing dev5 setup uses remote workspace containers with development tools. Explain the practical idea without walking through its deployment internals. More concurrent output still needs review capacity.

**Source:** [dev5 environment README](/Users/emilwareus/Development/oaiz/dev5/README.md). This is source inspection, not a fresh verification of running jobs.

### 9. Give the agent visibility into the product · 4 min

**Purpose:** connect local development to evidence about what customers experience.

- Let the agent correlate a symptom with logs and traces.
- Give it scoped, read-only data access and schema context.
- Turn an observed failure into a local reproduction and check.

**Show:** customer symptom → relevant trace → scoped data → reproduction. Use one redacted example; show which evidence changed our understanding of the problem.

Concrete OAIZ material exists: production database guidance and a read-only query wrapper, plus separate local-log and production-debugging workflows. Show the boundary and the useful diagnostic, not credentials or an unrestricted database console.

**Sources:** [Production DB guidance](/Users/emilwareus/Development/oaiz/.claude/skills/oaiz-prod-db/SKILL.md), [read-only wrapper](/Users/emilwareus/Development/oaiz/scripts/prod-ro.sh), [local-log guidance](/Users/emilwareus/Development/oaiz/.claude/skills/local-debugging-logs/SKILL.md). Local Compose logs are not production evidence.

## Main topic THREE: Learn faster, increase precision of product decisions

### 10. Short cycles at the actual bottleneck · 5 min

**Purpose:** reduce the time until we learn whether a change works.

- Aim for several small integrations per day where practical.
- Make each change easy to review, verify and release.
- Find the slowest step before adding more coding capacity.
- If physical access is the constraint, investigate emulation.

**Show:** one small change's path from hypothesis to customer feedback. Highlight the longest wait. Use the same feature from the opening; leave timings unlabelled until we have evidence.

DORA supports small batches and measuring application delivery over time. Keep throughput and stability together; individual merge counts are not its performance measure. See [DORA metrics](https://dora.dev/guides/dora-metrics/) and [small batches](https://dora.dev/capabilities/working-in-small-batches/).

Their bottleneck is still unknown. Ask where they wait longest for useful feedback. If a physical rig is the constraint, discuss which checks an emulator could accelerate and which still need real equipment.

### 11. Focus and precision in product decisions · 5 min

**Purpose:** direct the increased capacity toward a better product.

- Choose a specific customer problem and desired outcome.
- Use capacity to finish the important journey deeply.
- Let real evidence determine the next change.

**Show:** one problem → one testable assumption → a small change → observed outcome → next decision. Put tempting adjacent ideas outside that path.

Keep your central point: AI gives us capacity to build extremely well. It does not create a reason to expand scope indefinitely. Precision means stating what evidence would make us continue, change direction or stop.

Connect the loop back to the repository: inspect each correction's cause, then improve the relevant code, check, guidance or workflow. The existing dev5 learning command follows that diagnosis approach; it does not automatically solve every code problem by adding instructions.

**Source:** [dev5 learning command](/Users/emilwareus/Development/oaiz/.claude/commands/dev5-learn.md). [DORA's 2025 overview](https://dora.dev/research/2025/dora-report/) describes AI as amplifying existing organisational strengths and weaknesses.

**Close on this slide:** return to the leverage bar, with the three topics attached. Choosing useful work and shortening the learning loop is how we build the machine. End with one bounded experiment on a real customer problem.


## Material to choose before making the slides

- **One feature:** readable request, early decision, small change, check and visible outcome.
- **One correction:** show what failed and the durable improvement it led to.
- **One product diagnosis:** redacted symptom, trace/data evidence and local reproduction.
- **Their constraint:** ask the audience where their slowest feedback step is.

These examples are not selected yet. Avoid invented throughput, autonomous-delivery or test-quality claims. The leverage ranking is your thesis; the researched sources support specific mechanisms.

## What to carry over from the previous talks

- **Write Code That AI Agents Love:** concise examples, typed boundaries, runnable checks. Reuse the mechanisms, not every topic.
- **Voice Agents:** a tangible result early, then reveal the system that makes it possible.
- **Deep Research:** a recognisable failure and the feedback that changes the result.
- **Visual discipline:** one main point, short visible copy, large diagrams or code. The craft animation is your explicit exception to the existing static-slide guidance.

References: [blog post](https://addcommitpush.io/blog/write-code-that-ai-agents-love), [previous presentation index](https://addcommitpush.io/presentations), [audience and existing source context](CONTEXT.md).
