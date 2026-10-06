# Part 3: Product. Learn faster, decide precisely

Research and outline, 5 October 2026. Sources: Emil's blog (`saas-zero-to-one-hindsight`, `the-rules-of-vibe-coding`, `write-code-that-ai-loves`), the deck outline, and the OAIZ repo.

## Thesis

Parts 1 and 2 built the machine and let it run. Part 3 is the left of the leverage bar: once code is cheap, the scarce input is knowing what to point the machine at.

- "The end goal is autonomy: agents research, plan, implement, and review; humans decide what should ship." (`blog/write-code-that-ai-loves/blog.md:45`)
- "Does this solve the problem the user actually has? Is this worth merging, because it is valuable to our users?" (`blog/the-rules-of-vibe-coding/blog.md:626-628`)
- "it is very hard to predict what customers will love... figure out the unknowns by talking to customers." (`components/blog-posts/saas-zero-to-one-hindsight.tsx:96`)
- "pushing the Great Wall of China 0.01 centimeters a day" (`saas-zero-to-one-hindsight.tsx:317`)

## Slides

### 3.1 Where do you wait? (iteration speed)

- Claim: **Faster code moves the wait. Shorten the slowest step.**
- Picture: timelines. Before agents vs with agents: the code segment shrinks, the rig and feedback waits stay, the total barely moves. Redesigned loop: emulate first, keep the rig for what needs real equipment, ship small batches.
- Say: ask the room where they wait longest. Do not claim a specific organisation's bottleneck. No timings on the slide.
- Spoken evidence (OAIZ, `gh run list` on the production deploy workflow): every merge to main deploys; 87 to 117 successful production deploys a week in September; median about 22 minutes commit to live including e2e.
- Link: https://dora.dev/capabilities/working-in-small-batches/ (keep throughput and stability together; no per-person metrics).

### 3.2 Build to learn (speed of learning)

- Claim: **Code is cheap now. Spend it on learning what users want.**
- Picture: one big build that learns at launch vs three cheap variants in front of users, two dropped, one built deep.
- Spoken evidence: Emil's evidence ladder ("nothing is validated until many different customers are actually paying for it"), a heuristic not data. OAIZ's `idea-refine` skill asks for "3-5 meaningfully different directions" and a "Not doing" list per direction. OAIZ evaluated model and routing variants on the same fixtures and picked per workload.
- Link: https://addcommitpush.io/blog/saas-zero-to-one-hindsight
- Overlap: SpecDD finds technical challenges early; this slide finds whether the product is wanted.

### 3.3 Know what not to build (what to build)

- Claim: **Good taste is knowing what not to build.**
- Picture: a problems x platforms grid filled shallowly everywhere vs one column finished deeply, the rest marked "not now".
- Spoken evidence: the Debricked dimensions grid ("I would have pruned these dimensions A LOT"). OAIZ's product catalogue records a decision per surface (invest, hide, discontinue); issues written by agents must include a "What NOT to do" section.
- Link: https://addcommitpush.io/blog/saas-zero-to-one-hindsight

### 3.4 Close

- Callback to "Build the machine" and the leverage bar: Code (a lot), Workflow (more), Product (most).
- Final line: **Agents build. Humans decide what ships.**
- One experiment: one real problem, one short loop, this month.

## Avoid

Invented timings or multipliers, DORA as individual metrics, the 30% autonomy figure, claims about any specific audience's bottleneck, small kicker labels, a thank-you or summary slide, people's names from OAIZ commits.
