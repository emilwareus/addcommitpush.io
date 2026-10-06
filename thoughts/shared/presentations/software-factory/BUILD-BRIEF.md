# Build the software factory deck

User authorizes the complete local web presentation. Read OUTLINE.md here first; it is the approved 12-slide story. Read root AGENTS.md, presentations/CLAUDE.md, existing presentation route/layout/registry and relevant existing slides. Follow source-backed limits in CONTEXT.md.

## Scope and ownership

Implement directly in this existing checkout. You are not alone in the repository; preserve all user and other agent changes. Own only:

- app/presentations/software-factory/ (new routes and layout)
- components/presentations/software-factory/ (new slides and small local helpers)
- lib/presentations/software-factory.ts (new registry)
- app/presentations/page.tsx (one new local deck entry, preserve existing entries)

No Git commands or Git APIs of any kind. No commits, branch operations, deployments, external product writes, dependency changes, other agents, scripts or dev servers. Codex handles validation. Use file tools only. Do not alter OUTLINE.md or global presentation helpers/theme. Finish the implementation in this session.

## Visual direction

Use addcommitpush.io's ACTUAL current profile: Spectral display headings, IBM Plex Mono supporting text, warm paper/blue tokens (also dark compatible), square/dashed editorial borders, no neon, gradients, shadows, pills, emojis, or random colour systems. app/globals.css already applies presentation typography. Reuse PresentationLayout and existing route pattern. Keep this lean; no new slide engine.

Slides must feel spacious and intentionally composed. Very little text: target 15–35 visible words, 40 where necessary. Large diagrams/code at presentation distance, generous margins and short titles. Vary composition rather than repeating card grids. One proof object per slide, max two columns. A few large labels beat small prose. All copy in English consistent with previous talks. Use existing OAIZ/Debricked/Podidex images on the intro. Use existing assets; no downloading or invented screenshot receipts.

Use responsive native HTML/SVG diagrams for the technical mechanisms. This is editable explanatory evidence, not decoration. New local shared shell/heading/chapter marker permitted. Three chapter markers correspond to the leverage bar regions; most leverage stays LEFT. Don't duplicate full paragraphs or the outline on the slides.

## Exactly 12 slides

0. Who I am: Emil Wåreus; engineer / researcher / founder. Simple aligned OAIZ, Debricked and one personal project images, name dominant. No scattered cards.
1. Build the machine: simple request → build → checks → result → feedback loop. Human shapes the loop. Show a credible artifact of the machine: a schematic feature request and ready-for-review PR, visibly identified as illustrative, NOT a production receipt. The autonomous dark factory is the destination; current dev5 endpoint is human review.
2. Craft: title "The craft is not dead" plus concise "It has evolved to a higher leverage". Before-left / expanded-right aligned rows: Write code → Clarify intent; Debug & test → Build feedback; Design systems → Enforce boundaries; Learn the domain → Choose useful work. User specifically authorizes animation on this slide, superseding local static-slide rule here ONLY. Use existing useSlideStep navigation with four steps and framer-motion/reduced-motion: left remains visible, right reveals row by row without layout shift. No unrelated animation system. Other slides steps 0.
3. The leverage: horizontal bar MOST left / MORE middle / A LOT right. Left product decisions + learning speed; middle workflow + visibility; right architecture + code quality. Reuse these chapter cues later. This is Emil's thesis, not measured data; discreet 'Working model' label.
4. Architecture and code quality: two bounded contexts with public typed interface, one short generated call and compiler feedback after contract change. No multi-panel essay. Illustrative code, no invented claim. Clear ownership and canonical examples can be said verbally.
5. Lint your codebase: small forbidden route→database arrow crossed/blocked, then precise Polint diagnostic and route→application→database corrected path. One illustrative generic example. Small CLAUDE.md/AGENTS.md label for navigation vs executable checks, not a paragraph.
6. Test hard what can be tested hard: public API → service → real owned DB boundary; external services mocked outside. Three readable cases (tenant/permission/input) and one concise failing assertion. Illustrative test, not fake production output. Avoid coverage metrics.
7. SpecDD at OAIZ: research → plan → implement → validate → code review → security review → human review. Compact clear sequence, not seven dense cards. Highlight a difficult decision found before code with an illustrative short question, not a purported real case. Source docs explain stages, not certified autonomous delivery. Brief IDE → local agent → remote tasks → factory spectrum can live as a small supporting line, no extra slide. Avoid inventing a ticket/result.
8. Get a server. Let it run: one environment, two separate task workspaces with tools + checks. Engineer handoff 'Decision / blocker / review'. Include central takeaway "Spend more tokens. Save your attention." User's stance, not quantitative claim. Don't overdecorate internals.
9. Give the agent visibility: symptom → trace → scoped read-only data → local reproduction. Concrete generic tenant-mismatch example, marked illustrative. No credentials, private data, actual prod access or fabricated receipt.
10. Short cycles at the actual bottleneck: hypothesis → change → verify → review → feedback; show waiting as the question, no timings. "Where do you wait?" and small rig/emulator relationship as possibility, not an established bottleneck for the audience. Don't claim individual merge counts are DORA metrics.
11. Focus and precision: one customer problem → assumption → small change → observed outcome → decision loop, tempting scope outside. Strong clean close: "Good taste is knowing what not to build." One bounded experiment for audience. No extra summary/thank-you slide.

Keep caveats and source details in existing outline/source context, with small readable source links where useful. Illustrative labels must be visible for fabricated examples. No full speaker script. No unsupported statistics or customer-specific assumptions.

## Technical completion

Follow current Next App Router static route pattern, metadata, generateStaticParams, shared keyboard navigation. Exactly 12 registry entries. Root path redirects to intro. Invalid slug calls notFound. Registry/slides must align. Ensure all12 fit desktop/projector aspect ratios and small windows scroll rather than clip. Existing global PresentationLayout uses overflow hidden on desktop: respect height bounds in local shell. Use strict types, no any, no new dependency, no changes to existing decks. Use next/image with real existing paths and alt text. At completion report exact changed files, intended URL and anything unverified. Codex will format/typecheck/build and visually inspect every slide.
