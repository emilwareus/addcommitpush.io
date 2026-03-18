# Presentations

## Hard rules

- No emojis. Never use emojis in slides, speaker notes, or any presentation content.
- No animations or click-in steps. All slide content must be visible immediately.

## Slide design principles

Follow the **assertion-evidence model**: each slide has a sentence headline (the claim) and visual evidence (diagram, table, comparison, code) -- not bullet-point lists.

### Content density

- **One claim per slide.** If you catch yourself saying "and also," split the slide.
- **15-40 words per slide.** Expert audiences want depth, but comprehension drops past ~50 words. Dense data (tables, diagrams) is fine; dense prose is not.
- **3-second glance test:** the main point must be identifiable within 3 seconds.
- **Max 3-4 items** in any list. More than that needs a table, diagram, or a second slide.

### Visual hierarchy

- **Three levels max:** (1) headline / key claim, (2) supporting evidence, (3) annotations / sources.
- **Size is the primary hierarchy tool.** The largest element gets attention first.
- Use contrast (bold vs regular, bright vs muted, large vs small) to separate levels. Use at least two contrast dimensions simultaneously.
- **Squint test:** blur your eyes -- you should still see the dominant element and the groupings.

### Typography (dark theme, projected)

| Element | Size | Weight |
|---------|------|--------|
| Headline (assertion) | text-3xl to text-5xl (36-48px) | bold |
| Body / evidence | text-sm to text-base (14-16px) | normal to medium |
| Annotations / sources | text-xs to text-[10px] (10-12px) | normal, muted color |

- **Sans-serif only.** Use the project's default font stack.
- **Increase weight on dark backgrounds** -- thin strokes wash out on projectors. Use `font-semibold` or `font-bold` for anything that must read clearly at distance.
- **Max line length: 75 characters.** Wider lines force too much horizontal eye movement.
- **One line per bullet, two max.** If a bullet needs three lines, it should be a separate card or slide.

### Layout

- **Two columns max** for comparisons. Three+ columns increase cognitive load.
- **Consistent spacing.** Use Tailwind's gap/padding scale consistently (gap-4 or gap-5, not mixed).
- **Whitespace is structural.** It separates groups and gives the eye rest. Do not fill every pixel.
- **Alignment is non-negotiable.** Every element aligns to at least one other element.

### Color (dark theme)

- **Background:** zinc-900/80 for cards, not pure black. Pure black causes halation.
- **Primary text:** off-white (default text color), never pure #FFFFFF.
- **Secondary text:** `text-muted-foreground` for supporting info.
- **One accent color** (`text-primary`) for emphasis. If everything is highlighted, nothing is.
- **Accent < 15% of slide area.** Highlighted cards, key numbers, the claim -- that's it.
- Avoid red + green together (color deficiency).

### Data and numbers

- **Right-align numbers** in tables. Use `font-mono` for numeric values.
- **Remove heavy gridlines.** Use subtle borders (`border-zinc-800`) and whitespace.
- **Highlight the row/cell that matters.** Do not make the audience hunt.
- **Never show a number without context.** "148ms" means nothing alone. "148ms -- 13x faster than Whisper Small" is a claim.

### Comparisons (vs slides)

- Side-by-side layout with identical structure.
- Bold the differentiators. Use accent color on the "winner."
- Show the key metric prominently -- don't bury it in a paragraph.

### Code on slides

- **5-15 lines max.** Highlight the 2-3 lines that matter with comments or accent color.
- `font-mono`, minimum text-xs (12px).
- Use a slightly lighter background for code blocks to distinguish from slide background.

### Anti-patterns to avoid

- **Wall of text** (50+ words in a single block) -- split into cards or separate slides.
- **Bullet overload** (5+ bullets) -- convert to diagram, table, or comparison layout.
- **Orphan headlines** ("Architecture Overview") -- replace with an assertion ("The pipeline has 4 stages; the encoder is the bottleneck").
- **Inconsistent styling** -- same spacing, same card treatment, same font sizes throughout the deck.
- **Decoration without information** -- every visual element must carry meaning.
