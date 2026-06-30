# Slop Patterns

Use this as a scan list before editing. These rules are adapted for this repo
from common anti-slop skills: detect, analyze, clean, then manually review.

## Delete Usually

- "In today's world"
- "In the ever-evolving landscape"
- "It is important to note"
- "It is worth noting"
- "Let's delve"
- "Let's dive"
- "When it comes to"
- "At the end of the day"
- "In conclusion"
- "To sum up"
- "This article will explore"
- "This presentation will cover"

## Replace Usually

| Slop          | Better                                                  |
| ------------- | ------------------------------------------------------- |
| delve into    | examine, inspect, trace                                 |
| leverage      | use                                                     |
| utilize       | use                                                     |
| facilitate    | help, enable                                            |
| foster        | build, encourage                                        |
| bolster       | support, strengthen                                     |
| underscore    | show, highlight                                         |
| streamline    | simplify                                                |
| robust        | reliable, thorough, typed, tested, depending on meaning |
| comprehensive | complete, broad, detailed, or the actual coverage       |
| pivotal       | key, central                                            |
| seamless      | remove or explain the concrete behavior                 |
| cutting-edge  | current, recent, or the specific date/model/paper       |
| paradigm      | model, approach, architecture                           |
| landscape     | field, ecosystem, market, codebase                      |
| navigate      | handle, manage, work through                            |

## Cut Intensifiers

Words such as "very", "really", "extremely", "significantly", "dramatically",
"clearly", "obviously", "truly", and "fundamentally" usually hide missing
evidence. Replace with a number, mechanism, or delete.

## Hedging Rules

Keep uncertainty only when it carries information.

- Bad: "This could potentially help improve developer productivity."
- Better: "This can reduce search time when the agent needs the same setup path repeatedly."
- Scientific: "The evidence supports a productivity claim for setup tasks, but not for architecture changes."

## Heading Rules

Headings describe content. They do not tease it.

- Bad: "The Hidden Trap"
- Better: "Context files create maintenance debt"
- Bad: "Why Everything Changes"
- Better: "Graph slices improve retrieval when the slice is small"

## Structure Rules

Watch for machine-shaped repetition:

- every section starts with the same transition
- every list item has the same sentence shape
- every paragraph has three sentences with the same rhythm
- conclusion repeats the introduction without a decision or caveat

Fix by changing the unit:

- one section can be a table
- one section can be a short paragraph
- one section can open with the contradiction
- one section can start with the mechanism

## Artifact Markers

Remove AI paste artifacts immediately:

- `turn0search0`
- `oaicite`
- `contentReference`
- `attributableIndex`
- `grok_card`

Do not remove valid local source markers such as `[S1]` in `dr` reports.
