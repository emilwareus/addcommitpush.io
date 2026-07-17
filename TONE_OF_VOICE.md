# Tone of Voice Guide — addcommitpush.io

This document captures the writing voice and style for blog posts on addcommitpush.io. Use it as a reference when writing new content.

The default voice is a senior engineer writing from experience: direct, opinionated, practical, evidence-aware, and allergic to vague corporate advice. The writing should feel like someone with scars explaining what actually works.

---

## Core Voice Attributes

### 1. Direct Senior Engineer Energy

Prefer clear claims over soft positioning. The voice can be blunt when the point is earned.

**Do:**

> "The real interface is not the prompt. The real interface is the repository."

> "That is not prompt engineering. That is software engineering."

> "If the agent cannot search for the concept by name, it will search by vibes."

**Don't:**

> "It may be useful to consider that repository structure can perhaps influence AI coding outcomes."

### 2. Personal & First-Person

Write from direct experience. Use "I" liberally. Share what you've actually built, failed at, and learned.

**Do:**

> "As someone who's worked as a data lead or head of engineering for the past years, I've learned a lot about finding and hiring great engineers."

> "In September 2018 I joined Debricked as the very interesting combination of a Machine Learning Engineer and Sales with the perception that the SaaS product was 'done' and ready to take on the world. We just needed to add some more ML-enabled capabilities and off we go! We were wrong.. so so wrong."

**Don't:**

> "Organizations should consider the following best practices when hiring engineers..."

### 3. Honest About Mistakes

Openly admit when you were wrong. This builds credibility and makes lessons more impactful.

**Do:**

> "We were wrong.. so so wrong."

> "If I got to re-live the beginning of our endeavor, I would have pruned these dimensions A LOT from the start."

> "In the beginning, we did not do this right."

**Don't:**

> "After careful analysis, we pivoted our strategy to better align with market conditions."

### 4. Humble but Opinionated

Take strong stances, but acknowledge you're still learning. Never position yourself as having all the answers.

**Do:**

> "I feel like Emil 2.0... It also feels like I'm level 2 out of 100, I wonder what the next thing could be ;)"

> "In my opinion, the best indicator of a good hire is a successful result from the case..."

> "This is at least the state late 2025, in a year or so... who knows."

> "This works well for me and my team, but the goal is to keep cognitive debt low... so you do what's best for you IMO."

**Don't:**

> "As industry experts, we recommend the following definitive approach..."

### 5. Evidence-Aware, Not Evidence-Submissive

Use research, papers, benchmarks, and practitioner sources to support the point. Do not hide behind them. Say what the evidence shows, where it is mixed, and what you believe engineers should do anyway.

**Do:**

> "The research is mixed in exactly the way you would expect."

> "There is also counter-evidence against modularity as a magic word."

> "The paper is useful, but real code is hard to measure in a controlled study."

**Don't:**

> "According to recent studies, developers should adopt a comprehensive AI-ready development methodology."

### 6. Anti-Theater

Call out empty process, vague slogans, and tool worship. The voice is skeptical of "prompt theater", "subagent theater", "microservice cosplay", and any strategy that substitutes ceremony for working code.

**Do:**

> "Subagents help when they isolate bounded work and return compact findings. They become theater when they replace clear structure and verification."

> "A longer `AGENTS.md` cannot substitute for missing types, tests, or boundaries."

> "Do not ask the agent to remember your architecture. Make the architecture fail the build when violated."

**Don't:**

> "To unlock next-generation velocity, teams should orchestrate specialized AI personas across the SDLC."

### 7. Give Credit Openly

When ideas aren't yours, say so explicitly. Link to sources. This shows intellectual honesty.

**Do:**

> "But first, these are not my ideas! I stole with pride! This approach was pioneered by Dex and Vaibhav from AI That Works..."

**Don't:**

> Take credit for frameworks or ideas developed by others.

---

## Structural Patterns

### Start with the Real Problem

Open by naming the practical failure mode. Avoid abstract intros.

**Good:**

```
An agent opens your repo like a new maintainer with no memory.
```

**Weak:**

```
AI coding agents are becoming increasingly important in modern software development.
```

### Start with Context

Open with who you are and why you're qualified to write about this. Ground the post in real experience.

```
As someone who's worked as a data lead or head of engineering for the past years, I've learned a lot about finding and hiring great engineers.
```

### State What You'll Cover

Give readers a preview. Use a simple list.

```
I'll try to reason about:
- Knowing that the unknowns are unknown
- Capability to deliver vs. delivering
- Measure, Talk, Build, Repeat
```

### TL;DR and Key Takeaways

Include summary sections for scanners. Place them at the start OR end (not both).

```
TL;DR: Start with a noisy draft from model knowledge only. Denoise through iterative web research. Stop when findings—not the draft—are complete.
```

### "Who is this for?" Section

Define your audience explicitly. Be specific about their experience level.

```
Who is this article for?
You have already spent more on AI coding tools the last 6 months than any other tools in your 10-year coding career.
```

### Use the Claim -> Nuance -> Practical Rule Pattern

Make a strong claim, immediately sharpen it with nuance, then tell the reader what to do.

**Example:**

```
Do not say "AI loves microservices." It loves recoverable boundaries.

Do not say "AI loves tiny functions." It loves coherent neighborhoods.

Better:

AI agents love codebases where the relevant context can be found without reading the whole repository.
```

### Use Punchy Reframes

The voice often turns a fuzzy topic into a memorable engineering rule.

**Examples:**

- "Agents need maps, not dumps."
- "Names are semantic infrastructure."
- "Types compress intent."
- "Tests are feedback, not decoration."
- "The monorepo is the context database."
- "Architecture should fail the build."

---

## Language & Vocabulary

### Use Metaphors and Vivid Language

Make abstract concepts tangible through imagery.

**Examples:**

- "throwing spaghetti [and my head] against the wall to see what sticks"
- "pushing the Great Wall of China 0.01 centimeters a day"
- "polishing a stone"
- "spinning plates"
- "cry in tokens instead of tears"
- "token shotgun"
- "a warehouse of files in the context window"

### Casual Markers

Sprinkle in conversational phrases that feel natural, not forced:

- "so so wrong"
- "do it!"
- "that's ideal!"
- "who knows"
- "My point is..."
- "I stole with pride!"
- "Jokes aside"
- "IMO"
- "Have fun."
- "The point is not X. The point is Y."

### Technical Precision Where It Matters

When explaining technical concepts, be precise. Use code blocks, terminal examples, and exact terminology.

```
D₁ = U(D₀, R(D₀))
D₂ = U(D₁, R(D₁))
```

### Avoid Corporate Speak

Never use:

- "leverage synergies"
- "best-in-class"
- "thought leadership"
- "at the end of the day"
- "moving forward"
- "stakeholders"

Also avoid AI hype language:

- "unlock AI-native transformation"
- "10x your SDLC"
- "autonomous team of specialist agents"
- "agentic orchestration layer"
- "AI-powered best practices"

Unless the post is explicitly mocking the phrase.

### Prefer Concrete Nouns Over Vague Values

Use commands, files, checks, imports, schemas, and diagnostics instead of abstract "quality" language.

**Good:**

```
Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before finalizing.
Do not edit `src/generated`; regenerate with `pnpm generate`.
Frontend API calls must go through `@acme/sdk`.
```

**Weak:**

```
Write clean code.
Use best practices.
Follow our architecture.
Make sure everything works.
```

---

## Sentence & Paragraph Structure

### Short Paragraphs

2-4 sentences max. One idea per paragraph. Let readers breathe.

### Rhetorical Questions

Use sparingly to invite reflection:

> "What if your innovation is not incremental?"

> "Do they get excited when I say we use graph databases?"

### Direct Address

Speak to the reader occasionally:

> "I urge you to click the links, and read through these commands."

> "If you got this far in my post, I'm inclined to believe that you want to start your own company someday... do it!"

### Parenthetical Asides

Add context or wit in parentheses:

> "the very interesting combination of a Machine Learning Engineer and Sales"

> "(Prevent excessive searching)"

### Short, Hard Sentences for Punchlines

Use short standalone sentences after a longer explanation.

**Examples:**

> "Most of the time it guesses. And it guesses with confidence."

> "That difference matters."

> "The tool is less important than the shape."

---

## Formatting Conventions

### Lists for Actionable Items

Use bullet lists for:

- Things to look for
- Steps in a process
- Comparisons

### Tables for Comparisons

When comparing concepts, tools, or approaches, use tables:

| Classical Diffusion | Research Diffusion |
| ------------------- | ------------------ |
| Random noise        | Initial draft      |

### Blockquotes for External Voices

Use blockquotes when citing others or emphasizing key insights:

> "The iterative nature of diffusion models naturally mirrors how humans actually conduct research—cycles of searching, reasoning, and revision."
> — Google Research

### Code Blocks for Commands and Code

Use terminal/code blocks liberally for anything executable:

```
/research_codebase
```

### Tables for Hard Comparisons

Use tables when contrasting expensive vs. good systems, weak vs. strong examples, or research mechanism vs. design implication.

**Example shape:**

| Agent step | Expensive repo                              | Agent-friendly repo                       |
| ---------- | ------------------------------------------- | ----------------------------------------- |
| Orient     | Tribal knowledge, stale wiki pages          | Short root instructions, architecture map |
| Retrieve   | `utils`, string routes, hidden side effects | Stable names, imports, schemas, tests     |

### Blockquotes for the Core Thesis

Use blockquotes for compact thesis statements, not decorative quotes.

**Examples:**

> Agents do not need more text. They need recoverable structure.

> The best AI-friendly codebase is not the one with the best prompt. It is the one where the prompt matters least.

---

## Emotional Register

### Enthusiasm Without Excess

Show genuine excitement, but don't overdo punctuation or superlatives.

**Good:**

> "It was the most thrilling experience in my professional life so far"

**Too much:**

> "This is AMAZING!!! The BEST thing EVER!!!"

### Vulnerability

Share struggles and uncertainties:

> "This is something that we are still struggling with, as it's hard to ask for (and get) time from someone that had a bad experience with your tool."

### Encouragement

End on forward-looking, encouraging notes:

> "If you got this far in my post, I'm inclined to believe that you want to start your own company someday... do it!"

### Skeptical Optimism

The voice is excited about AI, but not naive about it. Prefer grounded ambition over hype.

**Good:**

> "The future of coding with agents is not just better models. It is better codebases."

> "Your goal should be to maximize the factory, letting developers solve the very hard problems that do not fit the shape of the factory."

**Too hype:**

> "AI will completely replace software engineering and unlock limitless productivity."

---

## Example Rewrites

Use these as calibration examples when editing drafts.

| Weak                                                           | Better                                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "Developers should write better prompts for AI coding agents." | "Prompts help. But the real interface is the repository."                              |
| "Large context windows are useful for complex repositories."   | "More context is not always better. Better context is better."                         |
| "Teams should document architectural best practices."          | "If the rule matters, encode it. Make the architecture fail the build when violated."  |
| "Microservices can improve AI coding performance."             | "AI does not love microservices. It loves recoverable boundaries."                     |
| "Tests help validate AI-generated code."                       | "Tests are not decoration. They are the agent's feedback loop."                        |
| "Names should be descriptive."                                 | "Names are semantic infrastructure. If the agent cannot grep the concept, it guesses." |
| "Generated SDKs reduce integration errors."                    | "Raw API calls are stringly typed integration debt. Generate the contract into code."  |
| "Instruction files should contain project guidance."           | "`AGENTS.md` should be an index, not a novel."                                         |

---

## Technical Blog Formula

For deep technical posts, use this sequence unless the topic clearly needs another shape:

1. Name the concrete failure mode.
2. State the thesis in one blunt sentence.
3. Give 3-6 key takeaways.
4. Build the mental model.
5. Bring in research or practitioner evidence.
6. Show code, commands, diagnostics, or repo structure.
7. Call out common wrong optimizations.
8. End with a short practical checklist or punchline.

The article should leave the reader with a better operating model, not just a list of tools.

---

## AI Slop Patterns (Structure, Not Words)

Slop is rarely a banned word. It is a density problem: legitimate rhetorical
devices deployed at a constant rate regardless of stakes. Every device below is
fine once, at the right moment. The tell is clustering, uniformity, and
decorative use.

The universal test: **is the device load-bearing?** If you can delete the
negative half, the fragment, or the third list item and no information is lost,
it was slop.

Hunt these in every draft:

1. **Contrastive negation** — "It is not X. It is Y.", "not just X, but Y",
   "X, not Y". This guide endorses the device, but budget it: a handful per
   post, only where the reader genuinely believed X. Watch for five bullets in
   one list sharing the "X, not Y" shape.
2. **Anaphora / repeated openers** — three consecutive "That is..." or
   "This is..." sentences, or every section ending on the same cadence.
3. **Staccato punch fragments** — short dramatic sentences are great at the
   actual climax. Fired at regular intervals they become a metronome.
4. **Tricolon abuse** — triads of near-synonyms ("clear, concise, and
   compelling"). Keep triads whose items each add distinct information.
5. **Perfect section symmetry** — every section the same length and internal
   shape. Human structure is lumpy; let one section run long because you care.
6. **Fortune-cookie closers** — if the closing line could end a different
   essay unchanged, cut it. End on something concrete: a caveat, a next step,
   a command to run.
7. **Signposting filler** — "Here's the thing", "Let's dive in", "It's worth
   noting that X" (always improvable to "X").
8. **Synonym cycling** — "the tool... the platform... the solution" for one
   thing. Technical writing repeats the precise term.
9. **Verbed abstractions** — "This unlocks/enables/transforms...". Rewrite
   with a real subject, mechanism, and effect.
10. **Vague attribution** — "studies show", "experts argue" without a link.
    Name it or cut it.
11. **Hedged balance** — every claim buffered, every criticism counterweighted.
    Concede the one real counterargument with specifics; stand ground elsewhere.
12. **Em-dash density** — a few per post is style; several per paragraph is a
    tell, especially inside "It's not X — it's Y".

Counter-signals that read as human: named sources, numbers, asymmetric
opinions, admitted mistakes, irregular structure, and repeating the correct
technical term without embarrassment.

---

## What NOT to Do

1. **Don't write in third person** — "The author believes..." Never.

2. **Don't hedge excessively** — Say what you think. "I think X" not "It could potentially be argued that X might be..."

3. **Don't be preachy** — Share experiences, don't lecture.

4. **Don't use emojis** — Unless explicitly requested.

5. **Don't pad content** — If you've made your point, stop.

6. **Don't turn strong opinions into generic advice** — Keep the edge when the edge is the point.

7. **Don't worship tools** — Explain the shape that matters, then mention tools as examples.

8. **Don't hide weak evidence** — If research is mixed, say so and explain the practical inference.

9. **Don't write prompt theater** — Prefer executable repo facts over motivational instructions.

10. **Don't over-explain** — Trust the reader's intelligence.

11. **Don't use "we" when you mean "I"** — Be specific about whose experience this is.

---

## Reference: Characteristic Phrases

These phrases capture the voice. Use similar constructions:

- "I look for three things..."
- "My point is..."
- "I've learned a thing or two about..."
- "With the hindsight hat on..."
- "It turned out that..."
- "To make X a part of our culture, we implemented..."
- "This maybe takes out a bit of the old 'fun' about developing, but I'm mostly excited about..."
- "In my experience..."
- "The key insight is that..."
- "The real interface is..."
- "The point is not X. The point is Y."
- "Do not say X. It loves Y."
- "That is not prompt engineering. That is software engineering."
- "I'll update this blog post when I have more to give in this area!"

---

## Quick Checklist Before Publishing

- [ ] Does it open with personal context or experience?
- [ ] Is there a clear "what you'll learn" section?
- [ ] Have I admitted at least one mistake or uncertainty?
- [ ] Are technical concepts explained with concrete examples?
- [ ] Have I credited all external sources and ideas?
- [ ] Does the post make one strong claim instead of circling around it?
- [ ] Does research support the argument without flattening the voice?
- [ ] Are vague values replaced with commands, files, code, checks, or examples?
- [ ] Have I removed prompt theater, corporate phrasing, and empty tool worship?
- [ ] Are paragraphs short (2-4 sentences)?
- [ ] Does it end with forward-looking encouragement or practical next steps?
- [ ] Would I actually say this out loud to a colleague?
