# Brain Insight Writing Guide

Brain insights are not finished blog posts. They are long-form research notes that capture how a conclusion was reached before that conclusion is compressed into an article, talk, or slide.

## What An Insight Is

- Write an insight as a research document with a title, body sections, evidence fragments, caveats, open threads, and sources.
- Declare graph edges from the insight to related insights and output documents. Each edge should include target type, target slug, relationship, strength, and a short note explaining the connection.
- The body should be the primary artifact. Do not make the reader reconstruct the thinking from schema labels like `problem`, `summary`, `conclusion`, or `why it matters`.
- Use headings that explain the intellectual move being made, not generic labels. Good: `The task is repository surgery`. Weak: `Problem`.
- Discuss the claim, the evidence, the counter-evidence, and the practical consequence.
- Keep uncertainty visible. Separate measured findings from inference, practitioner opinion, and local experience.

## Source Discipline

- Every substantive claim should point to at least one source in the `Sources` section or in an evidence fragment.
- Quote sources directly only when the wording matters. Keep direct quotes short and attributed.
- Do not use long copied passages. Paraphrase most source material and reserve quotes for anchors.
- When a claim is an inference from multiple sources, say so in the prose.
- Preserve local research references such as `presentations/write-code-ai-agents-love/research/...` so the source trail is inspectable.

## Style

- Write for a senior/principal engineering reader who wants the thinking, not a polished marketing argument.
- The voice should be direct and researchy: "This suggests...", "The stronger claim is...", "The evidence does not prove...".
- Avoid premature talk-ready slogans unless they are explicitly marked as compression for the final blogpost.
- Prefer 2-4 substantial sections per insight, with multiple paragraphs in each when needed.
- Include caveats and open threads even when the main claim feels strong.

## Relationship To Blog Posts

- Blog posts are packaged arguments.
- Brain insights are the source material behind those arguments.
- A blog post may compress several insights into one narrative.
- Use graph edges to show which notes feed which blog posts, presentations, or other outputs. The graph is part of the research object, not just a UI decoration.
- Do not optimize Brain notes for punchiness at the expense of source traceability.
