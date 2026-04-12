# Plan 06-03 Summary

## Scope

Implemented the self-contained Researcher runtime lifecycle:

- built a packaged runtime boundary that compiles the Researcher core and wrappers to executable
  JavaScript, copies runtime schemas/templates, vendors required dependencies, and emits managed
  `bin/*.js` entrypoints
- added manifest-driven install and update services that materialize Codex and Claude assets
  without relying on the target project's `tsx`, package graph, or module mode
- added deterministic inspect coverage that reports installed assets, drifted or missing managed
  files, settings merge state, and the next lifecycle action
- exposed thin JSON-only wrappers for build, install, update, and inspect flows

## Key Outcomes

- Installed runtimes execute successfully inside a clean target project with a different module
  mode.
- Update refreshes only managed assets and blocks when managed drift or owned settings drift is
  present.
- Inspect is authoritative because it reads the persisted install manifest and checks exactly the
  recorded managed assets instead of guessing from the filesystem.

## Verification

- `pnpm exec vitest run internal/tools/researcher/__tests__/runtime-install.spec.ts internal/tools/researcher/__tests__/runtime-inspect.spec.ts`
- `pnpm exec vitest run`
- `pnpm typecheck`
- `pnpm lint`
