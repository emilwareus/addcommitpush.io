# INSIGHT 23: Setup Is Part of the Task

## Working conclusion

Agents do not experience setup as a prerequisite. They experience setup as the first task. If the
environment is hard to bootstrap, the agent burns its planning budget before it reaches the product
change.

The codebase pattern is simple: one setup command, one verify command, one fast smoke command,
and one precise test command for the area being edited. The command needs to work in a clean
shell, not only in the maintainer's already-configured terminal.

## Hard data

| Source | Data point | What it suggests |
|---|---:|---|
| SetupBench | 93 setup tasks; best OpenHands variant 62.4% overall | Setup remains a benchmark-worthy problem. |
| SetupBench | Repo setup 38.9-57.4%; local DB setup 20.0-53.3% | Services and repo bootstrap are fragile for agents. |
| SetupBench | Manual subset wasted steps: 38.17-68.77% | Agents wander when setup paths are ambiguous. |
| SetupBench | Each task validates via a fresh-terminal `success_command` | The correct artifact is an executable verification command. |
| Installamatic | 21/40 repos installed at least once; avg installation rate 28.8% | Reading install docs is not enough. |
| Installamatic | Perfect recall condition raises avg install rate only to 34.7% | Documentation visibility does not solve missing flags/deps. |
| Installamatic | Average install attempt 501 seconds | Bad setup is expensive, not just annoying. |
| Long Code Arena CI | 77 real CI failures; open-source baselines fix 4-9%, GPT-3.5 fixes 17% | CI repair requires full repo/environment context. |
| GitTaskBench | Best TPR 48.15%, ECR 72.22%; errors often environment/dependency related | Real-world repo reuse still collapses on setup. |

Plot-ready data: `research/data/setup_verification.csv`.

## Notes

SetupBench is the cleanest source for this insight because it explicitly separates setup from patch
generation. The benchmark's validation design is the part I want to copy into real repos: after the
agent finishes, the harness opens a fresh terminal and runs one command. That avoids the common
failure where the agent sets PATH in one shell, installs something in a user directory, or leaves a
service running in a state that cannot be reproduced.

Installamatic adds the "docs are not enough" lesson. Even when agents retrieve relevant docs, they
miss extras, test flags, slow-test exclusions, and tool dependencies. The best repo pattern is not a
longer installation guide. It is an executable setup path with the exact dev/test dependencies and
flags encoded.

GitTaskBench is broader: agents must reuse real repositories for user-centric tasks. It shows the
same failure at a different scale. The best evaluated setting still passes fewer than half the tasks,
and the paper calls out environment setup and dependency resolution as mundane but critical
failure causes. That is exactly how this should be framed in the talk: mundane is not optional for
agents. Mundane is infrastructure.

The local codebase implication is that setup should be part of the API. If a repo exposes a public
library API carefully but leaves setup as tribal knowledge, agents still cannot reliably work.

## Relevance to code patterns

- Pin package manager and runtime versions.
- Keep `setup`, `smoke`, `test`, `lint`, `typecheck`, and `verify` commands discoverable.
- Verify setup from a clean shell/session.
- Put DB/service/bootstrap commands in scripts, not scattered prose.
- Include dev/test dependencies and non-default flags in the primary path.
- Keep smoke checks fast enough for repeated agent use.
- Make CI commands reproducible locally where possible.

## Caveats

One-command setup is not free. Complex systems may need services, secrets, or large fixtures. The
goal is not pretending complexity does not exist; the goal is making the setup state explicit and
verifiable.

## References

R27, R28, R75.

