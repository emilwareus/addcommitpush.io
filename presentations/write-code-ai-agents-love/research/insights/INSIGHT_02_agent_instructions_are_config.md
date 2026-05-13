# INSIGHT 02: Agent Instructions Are Configuration, Not Documentation

## Claim

`AGENTS.md`, `CLAUDE.md`, Copilot instructions, and Cursor rules should be treated as operational configuration. They should be short, specific, versioned, and tested by observing agent behavior.

## Evidence

- Lulla et al. (R17) compare runs with and without AGENTS.md across 10 repositories and 124 PRs. They report lower median runtime and reduced output token consumption with AGENTS.md while maintaining comparable task behavior.
- Gloaguen et al. (R18) provide the counterweight: context files can reduce task success and increase inference cost when they trigger more exploration, testing, and reasoning without improving final patches.
- Santos et al. (R19) analyze 328 Claude Code configuration files and find architecture, project rules, testing, and commands are central concerns.
- GitHub Copilot docs (D06), Anthropic docs (D05), and Cursor docs (D07) all provide first-class mechanisms for repo and path-scoped instructions.

## Practical Rule

Root instructions should include:

- exact commands,
- architecture summary,
- non-obvious conventions,
- hard constraints,
- known gotchas,
- verification expectations.

They should exclude:

- stale changelogs,
- generic engineering advice,
- long file trees,
- aspirational rules the repo does not follow,
- duplicated docs available elsewhere.

## Talk Use

"Your agent file is not a README. It is a control plane."
