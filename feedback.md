# Diffusion Deep Research blog feedback → action TODOs

Scope

- Page: `http://localhost:3000/blog/diffusion-deep-research`
- Audience: agent/LLM practitioners

✅ TODO 2 — Remove stray Pause/Play controls in reading flow

- Removed all Pause/Play controls and related state from the diffusion animations:
  - `components/animations/diffusion/draft-denoising.tsx`
  - `components/animations/diffusion/diffusion-overview.tsx`
  - `components/animations/diffusion/parallel-agents.tsx`
- Components now autoplay when in view; no controls are rendered in the blog post.

TODO 4 — Restructure the spine for clarity

- Current order: problem → diffusion → theory/math → phases → diffusion algorithm → code → benchmarks → takeaways.
- Target order inside `components/blog-posts/diffusion-deep-research.tsx`:
  1. TL;DR (TODO 3) + Why diffusion (keep)
  2. Problem with single-pass (keep)
  3. Diffusion intuition (keep)
  4. Core algorithm overview: state machine/pseudocode (brief, before math)
  5. Phases 1–4 walkthrough (existing content)
  6. Detailed code walkthrough (Go excerpts)
  7. Benchmarks (RACE/FACT) to appear before or right after the code walkthrough intro to establish credibility earlier
  8. Practical takeaways (surface earlier and also keep at end)
- Move the “Core architecture: four phases” block above “Theoretical foundations / Mathematical formulation” so readers see the shape before symbols.

TODO 5 — Tighten headers and reduce redundancy

- Merge overlapping headers: “The diffusion algorithm”, “How the diffusion loop actually runs”, and “Phase 3: The diffusion loop (where the magic happens)” into a single parent header like “Diffusion loop (core)” with subsections for pseudocode and code walkthrough.
- Group “Self-balancing: two-stage gap closing” and “Context engineering considerations” under one section (“Gap closing & context”) to cut header sprawl.
- Make headers promise content: e.g., “Phase 3: Diffusion loop — supervisor + parallel sub-researchers”.

TODO 6 — Clarify completion criteria and safety/quality guardrails

- In the termination list around lines ~234-239 of `diffusion-deep-research.tsx`, spell out priority: (1) no new findings from diverse queries, (2) hard cap 15 iterations, (3) supervisor override with rationale.
- Add a short “Guardrails” callout near the termination section:
  - Hallucination control: require citation for new facts; drop uncited claims.
  - Tool failure/empty SERP: backoff/retry once, then mark as gap.
  - Dedup by URL before synthesis (already mentioned later—cross-link it).

TODO 7 — Parallelism defaults and backpressure

- Near the parallelism explanation (`executeParallelResearch` excerpt), add explicit defaults: maxConcurrent = 3, per-sub-agent search max = 5, timeouts if available.
- Brief note on backpressure: supervisor should skip new fan-out if previous conduct_research calls are still running; if not implemented, note as a TODO in code or text.

TODO 8 — Add quickstart/config and run snippet

- In the “Configuration reference” section, add a minimal “run it” example (e.g., `GO_BRAVE_API_KEY=... go run ./cmd/... "research prompt"` or the Node/CLI equivalent if exposed).
- List env/flags that matter for diffusion behavior: max iterations, concurrency, search limits, citation dedupe toggle.

TODO 9 — Micro-UX and readability

- Break a few long paragraphs (intro and diffusion intuition) into shorter blocks; add one-line micro-summaries before long bullet lists.
- Add a tiny glossary when RACE/FACT first appear; link the benchmark URL inline where it’s first mentioned.

Execution order suggestion

1. Fix missing-"s" rendering (TODO 1) so content is readable.
2. Hide Pause/Play controls (TODO 2) to clean UX.
3. Insert TL;DR + example and reorder sections (TODO 3 + 4 + 5).
4. Clarify completion/guardrails and parallelism defaults (TODO 6 + 7).
5. Add quickstart/config snippet and polish readability/glossary (TODO 8 + 9).
