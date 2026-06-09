# AI Slop Patterns

Temporary research note for editing the "write code that AI loves" blog draft.

## Working Definition

AI slop is low-value output that looks complete enough to pass at a glance, but does not meaningfully move the reader's task forward.

The important part is not "AI wrote it." Human writing can be slop too. The useful distinction is:

- good AI-assisted work compresses thinking for the reader;
- slop transfers thinking to the reader.

Merriam-Webster's 2025 definition is the broad public version: "digital content of low quality that is produced usually in quantity by means of artificial intelligence." The HBR/BetterUp/Stanford "workslop" definition is more useful for our blog editing: AI-generated work that looks like good work but lacks the substance to advance the task.

My shorter version:

> Slop is polished output with unpaid cleanup work hidden inside it.

## Source Notes

- [Merriam-Webster: 2025 Word of the Year, Slop](https://www.merriam-webster.com/wordplay/word-of-the-year)
  - Defines slop as low-quality digital content produced in quantity by AI.
  - Useful for the public meaning and "quantity over value" frame.

- [HBR: AI-Generated Workslop Is Destroying Productivity](https://hbr.org/2025/09/ai-generated-workslop-is-destroying-productivity)
  - Defines workslop as AI-generated work that masquerades as good work but lacks substance.
  - Key mechanism: it shifts interpretation, correction, and redo work downstream.

- [Measuring AI "Slop" in Text](https://arxiv.org/abs/2509.19163)
  - Says there is no agreed definition of text slop.
  - Important caveat: "slop" is not the same as AI-text detection.
  - Useful taxonomy: information utility, information quality, and style quality.
  - Concrete dimensions: density, relevance, factuality, bias, repetition, templatedness, coherence, fluency, verbosity, word complexity, and tone.

- ["An Endless Stream of AI Slop": The Growing Burden of AI-Assisted Software Development](https://arxiv.org/abs/2603.27249)
  - Qualitative study of 1,154 Reddit/Hacker News posts.
  - Clusters developer concerns into review friction, quality degradation, and forces/consequences.
  - Useful software-specific patterns: review burden, trust erosion, codebase degradation, knowledge-resource degradation, comprehension gaps, skill atrophy.

- [Antislop](https://arxiv.org/abs/2510.15061)
  - Treats slop as repetitive phraseology that makes LLM output recognizable.
  - Claims some patterns appear 1,000x more often in LLM output than human text.
  - Useful warning: some slop is style-level repetition, not just factual wrongness.

## Core Diagnosis

Slop usually has at least one of these failures:

1. Low density: many words, little payload.
2. Low relevance: answers nearby but not the actual task.
3. Low ownership: the author would not defend the details.
4. Low specificity: no concrete noun, example, source, or constraint.
5. Low discrimination: includes every plausible point instead of choosing.
6. Low accountability: forces the reader/reviewer to check everything from scratch.

For the blog, the most dangerous version is not obvious garbage. It is a paragraph that sounds mature and balanced but does not sharpen the article.

## Prose Slop Patterns

| Pattern | Looks like | Why it is slop | Fix |
| --- | --- | --- | --- |
| Polished nothing | Fluent paragraph with no new claim | Reader spends time and learns nothing | Ask: "What would be lost if this vanished?" |
| Generic setup | "This is important because..." then obvious context | Delays the point | Start with the point |
| Balanced mush | "There are pros and cons..." without judgment | Refuses to choose | State the tradeoff and pick |
| Caveat laundering | Long caveats that protect a weak claim | Sounds rigorous, weakens momentum | Narrow the claim once, then move on |
| Research dumping | Five papers in one paragraph | Makes the reader integrate the evidence | Use one paper for one job |
| Citation decoration | Source attached to a claim it does not prove | Fake rigor | Say what the source actually supports |
| List inflation | 9 bullets where 3 would do | Avoids prioritization | Keep the deciding bullets |
| Inline over-listing | "route, test, schema, event, database column, generated SDK method, issue title" | Dumps examples instead of choosing the right one | Use one example or a category name |
| Abstract noun soup | "alignment, robustness, architecture, framework" | Sounds technical without committing | Replace with domain nouns |
| Repeated frame | Every section says "not X, but Y" | Cadence becomes AI-shaped | Vary structure or cut the frame |
| Point-is-not formula | "The point is not X. The point is Y." | Sounds decisive but often just pads a direct claim | Delete the contrast and state Y directly |
| Binary reframe tic | "X is not Y. It is Z." | Sounds sharp but often just performs contrast | Make the direct claim instead |
| Fake punchline | Quote block that restates the paragraph | Performs importance | Keep only if it is sharper than the paragraph |
| "Helpful" overexplaining | Explains terms the audience already knows | Talks down to senior readers | Trust the audience |
| Obvious checklist | "Use tests, docs, lint, types..." repeated everywhere | Correct but dead | Tie to one concrete failure |
| Exhaustive throat-clearing | Defines scope before making a point | Feels safe, reads slow | Make the point, then caveat if needed |
| Symmetry addiction | Three equal clauses, every paragraph same shape | Synthetic rhythm | Break cadence with shorter sentences |
| Empty intensifiers | "crucial", "robust", "powerful", "seamless" | Inflates weak claims | Use numbers, examples, or remove |
| Faux humility | "This is not perfect, but..." over and over | Becomes self-protective | One skeptical sentence is enough |
| Reader burden | "Here are all the things to consider" | Asks reader to synthesize | Provide the synthesis |

## Technical Blog Slop Patterns

| Pattern | Looks like | Better |
| --- | --- | --- |
| Best-practice fog | "Make boundaries clear" | "Ban route -> ORM imports with lint." |
| Architecture sermon | Abstract principles with no local failure | Show the wrong patch the agent would make |
| Benchmark laundering | Turns benchmark result into production law | "This is benchmark-shaped, but the failure mode rhymes." |
| Number wallpaper | Numbers everywhere, no hierarchy | One number for the claim, one caveat |
| Table theater | Table exists because tables look serious | Use a table only when comparison matters |
| "AI loves X" cuteness | Makes software engineering sound magical | "X reduces guessing" |
| Prompt-shaped prose | "The agent should..." repeated mechanically | Talk like an engineer, not a system prompt |
| Research-note residue | "Suggested segment", "deeper stack", meta drafting text | Remove before blog voice |
| Generic examples | `foo`, `bar`, `processData` | Use billing, attendance, auth, SDK, route examples |
| Fake concreteness | Example has code but no real constraint | Add the failure/check that makes it matter |
| Repeated moral | Every section ends "agents need feedback" | Let the section's specific point carry it |
| Everything connects to everything | Pulls in every previous concept | Keep one local relation |
| Over-skeptical drag | "This does not prove..." every section | Make claims narrower instead |

## Code Slop Patterns

These come from the software-development slop paper and general review patterns.

| Pattern | What it looks like | Why it is slop |
| --- | --- | --- |
| Type-error silencing | `as any`, broad casts, `// @ts-ignore` | Makes compiler feedback disappear |
| Timing band-aids | `setTimeout` to hide race/async bug | Treats symptom as fix |
| Test subversion | Changes tests to match broken behavior | Makes false green |
| Deleted obligation | Removes a method/branch instead of fixing it | Shrinks problem invisibly |
| Hallucinated integration | Invents service/API then mocks it | Internally coherent, externally fictional |
| Compatibility shim pile | Adds wrappers instead of migrating callers | Preserves mess |
| Raw string surfaces | Event names, URLs, route names repeated manually | Hides contracts from tools |
| Broad catch/retry | Swallows errors to pass tests | Reduces observability |
| Fake abstraction | New helper used once with generic name | Adds indirection, not clarity |
| Over-generalized generic | Clever generic type/function nobody needs | Makes review harder |
| Changed generated files by hand | Edits SDK output instead of schema/config | Creates drift |
| Commented obvious steps | "Validate input", "Call service", "Return result" | Comment is not insight |
| Missing boundary tests | Only tests happy path | Leaves real behavior unchecked |
| "Looks reasonable" PR | Large patch with no rationale | Moves burden to reviewer |
| Local-only fix | Fixes failing line, ignores caller/callee ripple | Product behavior still wrong |
| Dead compatibility path | Keeps old and new path forever | Avoids decision |
| Runtime folklore | Import-time registration, string registries, hidden plugins | Agent cannot see the edge |

## Research Slop Patterns

| Pattern | Looks like | Fix |
| --- | --- | --- |
| Unsupported transfer | "This benchmark proves production..." | Name the setting and the transfer risk |
| Metric worship | Treats one metric as truth | Explain what it measures and misses |
| Citation pile | 8 papers listed, no synthesis | Keep the 2-3 that change the recommendation |
| False precision | Specific numbers without source/caveat | Tie each number to source and scope |
| Vague skepticism | "More research is needed" | Say what we should believe anyway |
| Overfitted caveat | Caveat longer than claim | Narrow the claim until caveat shrinks |
| Authority laundering | Source is famous but not relevant | Use source for its actual evidence |
| Results without implication | Number appears, no action changes | Delete or add the decision it supports |

## PR / Review Slop Patterns

| Pattern | Looks like | Why it hurts |
| --- | --- | --- |
| Reviewer as prompt engineer | Reviewer must explain basic brokenness back to agent/user | Shifts labor downstream |
| No self-review | "Please review" after generated patch | No owner took responsibility |
| Giant AI PR | 1k+ LOC without clear structure | Review cannot establish trust |
| Missing rationale | Code changed, why unclear | Reviewer must reconstruct intent |
| No validation record | "Should work" | Reviewer must run/check everything |
| Mixed concerns | Feature, refactor, tests, docs, cleanup together | Hard to reject only bad parts |
| Generated docs drift | Docs look polished but are wrong | Pollutes knowledge base |
| Trust erosion | Repeated slop makes all future work suspect | Team reviews the person, not the patch |

## Blog-Specific Slop Hunt

These are the patterns to search for in the current draft:

- Sections that keep saying "the research is indirect but useful."
- Long lists after the point is already made.
- Inline over-listing: comma chains that try to prove the point by volume.
- Tables that summarize obvious advice.
- Code examples followed by a paragraph explaining every obvious line.
- "The lesson is not X; the lesson is Y" repeated too often.
- "The point is not X. The point is Y." used when a direct sentence would do.
- "X is not Y. It is Z." used as a default opener.
- Research paragraphs with more than two numbers.
- "This does not prove..." disclaimers stacked in consecutive sections.
- Punchline quote blocks that merely restate the paragraph.
- Meta leftovers like "Suggested segment".
- Vague agent nouns: "the agent can understand", "the agent has context", "the agent gets signal" without saying what concrete file/type/test/rule provides it.
- Sections where the reader must infer the recommendation.

## The Practical Anti-Slop Filter

For each paragraph, ask:

1. What does this paragraph make the reader believe or do?
2. Could a senior engineer already predict this sentence?
3. Is there a concrete object in it: file, type, test, rule, function, metric, failure?
4. Is the source doing work, or just decorating the claim?
5. If this paragraph vanished, what specific insight would be lost?

If the answer to 5 is "tone" or "flow", cut it.

## Editing Moves

- Replace a list with the one rule that matters.
- Replace three citations with one claim and one caveat.
- Replace "things to think about" with "the decision I would make."
- Replace abstract principles with a wrong/right code example.
- Replace broad "AI" language with "agent", "reviewer", "compiler", "test", or "typechecker."
- Delete explanation after the example if the example already shows it.
- Keep numbers only when they change belief.
- Keep caveats only when they change the recommendation.
- Use domain examples: billing, attendance, auth, generated SDKs, event handlers, migrations.

## One-Line Standard

> Not AI slop: specific, owned, source-aware, and useful after the first read.
