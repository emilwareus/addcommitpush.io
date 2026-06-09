# Critique of Draft 1

The first draft has the right thesis and good ingredients, but it still reads like research notes arranged into article sections. The improved version needs a stronger editorial spine.

## Main Problems

1. **The article starts well, then becomes a literature dump too early.**  
   The opening "agents are new maintainers with no memory" is strong. But the big research section arrives before the reader has a durable mental model for why the evidence matters.

2. **It lacks one organizing mechanism.**  
   The article lists names, dependencies, types, lint rules, monorepos, SDKs, tests, and AGENTS.md, but does not first explain the agent loop those things improve. The stronger frame is: agents must orient, retrieve, edit, and verify. The codebase should make each step cheap.

3. **The research table is correct but heavy.**  
   It is useful for a presentation appendix, but in the blog it should be a compact evidence sidebar. The reader should feel the argument before seeing every number.

4. **Examples are good but too isolated.**  
   The attendance examples should become a running thread: names, API boundary, generated SDK, lint rule, and test all reinforce the same mechanism.

5. **The "flavors" need caveats.**  
   Custom lint rules, monorepos, and generated SDKs are strong opinions, but the article should avoid sounding like each is universally required. The right claim is: use these when they turn hidden intent into executable, inspectable structure.

6. **The article needs a better ending shape.**  
   The checklist is useful, but it should feel earned. The ending should return to the thesis: the best prompt is a codebase that makes prompting less important.

## Better Spine

Use this structure:

1. The agent guesses when the repo hides context.
2. Agents run an orient -> retrieve -> edit -> verify loop.
3. Good codebases optimize that loop.
4. Evidence supports the mechanism: cross-file context, graphs, names, types, visible interfaces, tests, and instruction-file caveats.
5. Apply the mechanism through names, boundaries, types/SDKs, executable lint rules, monorepo context, lean instructions, and durable tests.
6. Close with the checklist and the anti-patterns.

## Target Tone

Senior, direct, and practical. Avoid "AI magic" language. Use "I use this" for local opinions like polint, but do not turn the article into a product pitch.
