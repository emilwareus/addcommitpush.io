# Plan 06-02 Summary

## Completed

- Added deterministic Codex and Claude runtime adapter renderers that turn the shared Researcher command catalog into `.codex/skills/*/SKILL.md` and `.claude/commands/*.md` assets.
- Centralized runtime file rendering in shared template helpers that point both runtimes at the same installed entrypoint layout under `.researcher-runtime/bin/`.
- Kept runtime-specific surface differences isolated to the adapter layer rather than spreading command-layout rules into lifecycle code.
- Added a non-destructive Claude settings merge helper that preserves unrelated user-owned config while writing only the Researcher-owned metadata keys.
- Kept hook behavior explicit and opt-in by returning no hook records from the default settings layer.
- Added focused adapter coverage for Codex render output, Claude render output, command inventory parity, and safe Claude settings merge behavior.

## Verification

- `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-adapters.spec.ts`
- `pnpm typecheck`
- `rg -n "research-|settings|hook" internal/tools/researcher/runtime/adapters/codex.ts internal/tools/researcher/runtime/adapters/claude.ts internal/tools/researcher/runtime/settings.ts`
