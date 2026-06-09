# Slides Design Guide: Write Code That AI Agents Love

This is the design contract for the talk deck.

Audience: senior engineers. Give them a clear model, a few concrete repo shapes, and enough evidence to trust the claim.

The deck should behave like a technical talk. The nuance lives in speaker notes and in the speaker. The slide carries the claim and the proof object.

## Research Base

The strongest pattern is the assertion-evidence model:

- Start each body slide with a sentence headline: a claim, not a topic label.
- Support it with visual evidence: a diagram, table, code contrast, diagnostic, matrix, or architecture sketch.
- Keep secondary detail in notes.

Penn State's assertion-evidence guide says to build talks on key messages and support each one with visual evidence. Their slide guidelines call for sentence headlines, visual evidence over bullet lists, limited words, two-line headlines, and readable type sizes. Their research summary reports better understanding and retention for assertion-evidence slides, with a statistically significant result. A related Penn State paper reports 79% correct recall with sentence headlines versus 69% with traditional phrase headlines in one classroom study.

Sources:

- [Penn State Assertion-Evidence overview](https://writing.engr.psu.edu/assertion_evidence_EA.html)
- [Penn State Assertion-Evidence slide guidelines](https://www.writing.engr.psu.edu/guidelines_AE_slides.pdf)
- [Penn State slide-design research summary](https://www.writing.engr.psu.edu/research.html)
- [Testing the effect of sentence headlines in teaching slides](https://pure.psu.edu/en/publications/testing-the-effect-of-sentence-headlines-in-teaching-slides-2/)

Mayer's multimedia principles support the same direction: remove irrelevant material, signal the important part, keep related text and visual objects close, and split longer explanations into segments. For this deck, that means fewer words, stronger highlighting, and no decorative visuals.

Source:

- [Dartmouth summary of Mayer's multimedia learning principles](https://services.dartmouth.edu/TDClient/1806/Portal/KB/Article/171655/Mayer-s-12-Principles-of-Multimedia-Learning)

Duarte is useful for practical slide craft: one idea per slide, a simple visual system, grids, purposeful color, and every element serving the main takeaway. Use that as a sanity check for clarity and restraint.

Sources:

- [Duarte: 7 ways to make your best PowerPoint presentations](https://www.duarte.com/blog/7-ways-to-make-your-best-powerpoint-presentations/)
- [Duarte: 4 presentation design principles](https://www.duarte.com/blog/4-presentation-design-principles-to-live-by/)

Tufte is the warning label. Slideware can hide evidence under hierarchy, bullets, and formatting. For a technical talk, never bury the actual mechanism. If the slide has a claim, the evidence must be visible on the same slide.

Source:

- [Edward Tufte: The Cognitive Style of PowerPoint](https://www.edwardtufte.com/book/the-cognitive-style-of-powerpoint-pitching-out-corrupts-within-ebook/)

Accessibility guidance adds the boring but important constraints: familiar sans-serif fonts, high contrast, no color-only meaning, logical reading order, and concise alt text if exported.

Source:

- [Microsoft PowerPoint accessibility guidance](https://support.microsoft.com/en-US/accessibility/powerpoint/make-your-powerpoint-presentations-accessible-to-people-with-disabilities)

## What This Means For This Deck

Use the agentic loop as the spine. Every topic belongs to one part of the loop:

| Loop step | Talk topics                        |
| --------- | ---------------------------------- |
| Prompt    | AGENTS.md                          |
| Orient    | Architecture docs, bounded context |
| Retrieve  | Subagents                          |
| Edit      | Code quality, generated SDKs       |
| Verify    | Tests, custom rules                |

Do not add topics that were cut from the talk. No graph retrievers. No visible side effects slide. No "one feature through the loop" slide. No command list slide.

## Slide Contract

Every content slide must pass this:

1. The headline is a sentence claim.
2. The body has one proof object.
3. The slide works at a three-second glance.
4. The slide has fewer than 35 visible words, excluding tiny source labels and code.
5. If a list has more than three items, it becomes a matrix, flow, table, or second slide.
6. Research caveats go in notes unless they are the point of the slide.

Headline wording should be direct and operational. Avoid clever contrasts when a plain claim is
clearer.

Allowed proof objects:

- Loop diagram
- Two-column contrast
- Large code contrast
- Directory tree / architecture map
- Diagnostic output
- Behavior-test flow
- Impact/effort matrix
- One compact table

Avoid:

- Slide-as-article paragraphs
- Five-card grids
- Decorative icons
- Emojis
- Animation or click-in steps
- Fake hooks
- Meta comments about what the talk is doing
- "X is not Y, it is Z" phrasing unless the contrast is genuinely doing work
- Overexplaining why a topic matters after the visual already shows it

## Local House Style

Use the existing presentation system:

- Full-screen dark stage with the shared `PresentationLayout`.
- `max-w-5xl` to `max-w-7xl`, centered.
- Cyan `text-primary` for the current object.
- Zinc cards and borders for structure.
- Use `rounded-lg`, not huge soft cards.
- Use the existing font stack.
- No extra animation inside slides.
- All slides should have `steps: 0`.

Typography:

| Element          | Target                                        |
| ---------------- | --------------------------------------------- |
| Main claim       | `text-4xl` to `text-6xl`, bold, max two lines |
| Evidence labels  | `text-lg` to `text-2xl`, semibold             |
| Code/diagnostics | `text-sm` to `text-base`, mono                |
| Source/caveat    | `text-xs` to `text-sm`, muted                 |

Color:

- Background stays dark gray, not pure black.
- Cyan is the main signal.
- Use amber/pink only for warning or tension, and only when it clarifies.
- Do not rely on red/green alone.
- One highlighted thing per slide.

## Existing Deck Lessons

Good patterns from the current decks:

- The voice-agent pipeline slide uses one large visual that matches the talk path.
- The VAD slide is useful because the number and mechanism are visible together.
- Benchmark slides work when the highlighted row or number is obvious.
- Architecture slides work best when they are diagrams, not explanations.

Things to avoid copying:

- Emoji-based stage icons. They look casual and conflict with the local presentation rules.
- Multiple animated entrances inside a slide.
- Takeaway slides with five prose-heavy items.
- Dense speaker-notes content moved onto the canvas.

## Slide-By-Slide Design Direction

1. Title: title only, speaker name small. No subtitle hook.
2. About: reuse the existing scattered-card intro from the other decks. Do not invent a new personal brand slide.
3. Agentic loop: actual loop, not a circular decoration. Show all loop aspects, but highlight only the topics covered in the talk.
4. AGENTS.md: strong vs weak instruction contrast. Broad architecture advice should become concrete repo facts.
5. Architecture docs: one repo-map code tree from root instruction to architecture index to local docs.
6. Bounded context: use the Three Dots Labs definition: one model and one consistent language inside a boundary. Show that `User` can mean different things outside.
7. Subagents: one read-only pattern-finder prompt plus concrete good subagent roles.
8. Code quality: before/after code contrast. Focus on whether the next edit is reviewable.
9. Code quality evidence: one chart with the CodeHealth pass-rate gap and the caveat on the slide.
10. Code quality structure: show that tests can pass while dependency control or responsibility split fails.
11. Generated SDKs: contract -> generated client -> call sites -> type feedback. Include colored `fetch` vs SDK code.
12. Tests: no test code. Show a context boundary: real API and owned infrastructure inside, mocks outside.
13. Custom rules: colored polint diagnostic plus examples of repo-specific rules to lint.
14. Impact/effort: 4x4 matrix. This is opinionated prioritization, not universal truth.
15. Close: one short practical line.

## Speaker Notes Contract

Notes should carry:

- Research caveats.
- "This is what I have seen" context.
- Why the placement in the loop matters.
- Examples Emil may want to say out loud.

Notes should not contain:

- Polished marketing copy.
- Generic definitions.
- Full article paragraphs.
- Private repo details.

## QA Checklist

Before calling a slide done:

- Can I name the claim in one sentence?
- Can I find the evidence object without reading?
- Is there one highlighted thing?
- Did I remove every decorative element that does not carry meaning?
- Is the slide readable from the back of a room?
- Does the slide still make sense in a thumbnail contact sheet?
- Did I keep research nuance out of the canvas unless it is the point?
- Did I keep Emil's tone: direct, practical, skeptical, no corporate gloss?
