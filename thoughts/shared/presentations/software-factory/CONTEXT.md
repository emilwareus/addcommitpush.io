# The software factory: presentation context

**Research pass: 5 October 2026**

Start with [OUTLINE.md](OUTLINE.md). This folder contains the talk's outline and supporting context.

## Audience and purpose

- Developers, solution architects and engineering managers.
- They want the team's journey, tooling choices and practical challenges of an agent-driven delivery setup.
- They want concrete steps beyond individual coding-assistant use, with governance and useful delivery.
- Explain how engineering work changes when colleagues can request features through the factory.
- Give them a practical first experiment. Do not imply that they must copy our entire stack.

## Source index

Blog base: `046c6d0b926c639d3a46e277c8c4ee361fb363a8`, current fetched main when this branch was created.

- [Previous presentations](https://addcommitpush.io/presentations) and slide sources under `components/presentations/`.
- [Closest talk's registry](../../../../lib/presentations/write-code-ai-agents-love.ts).
- [Closest talk's source slides](../../../../components/presentations/write-code-ai-agents-love/slides/).
- [Existing presentation guidance](../../../../presentations/CLAUDE.md).
- [dev5 runtime and harness defaults](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/dev5/README.md).
- [Develop stages, scoped validation and attempt limit](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/scripts/dev5/develop.sh).
- [Research and plan review behavior](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/scripts/dev5/review-gates.README.md).
- [Handoff helpers](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/scripts/dev5/_common.sh).
- [Learning contract](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/.claude/commands/dev5-learn.md).
- [Core repository guidance](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/core/AGENTS.md).
- [HTTP-handler test policy](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/.polint/rules/src/http_handler_tests.rs), [bounded-context import policy](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/.polint/rules/src/bounded_context_imports.rs), [actor-boundary review guidance](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/.polint/rules/src/actor_boundary_review.rs).
- [Linear API script](https://github.com/oaiz-io/oaiz/blob/92a74f023539ba848fd4cf525b79afbde99f37eb/scripts/linear/get-issue.sh).
- [MCP architecture documentation](https://modelcontextprotocol.io/docs/learn/architecture).
