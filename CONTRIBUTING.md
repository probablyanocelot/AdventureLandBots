# Contributing to AdventureLandBots

Thank you for helping improve AdventureLandBots.

## Setup

1. Fork or clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a local `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Replace placeholder values with your own secrets or runtime config.

## Code style

- Run lint before committing and opening a PR:
  ```bash
  npm run lint
  ```
- Use 2-space indentation, LF line endings, and UTF-8 encoding.
- Markdown files should preserve table formatting and have a final newline.

## Pre-commit

A convenience script is available:

```bash
npm run precommit
```

This runs the project lint step.

## Branches and commits

- Use feature branches for new work.
- Name branches clearly, e.g. `feature/bank-overview-refactor` or `fix/service-entrypoint`.
- Write commit messages in present tense and include a short scope:
  - `fix: correct bank render delegation`
  - `chore: add CONTRIBUTING and editorconfig`

## Service boundary guidance

- Prefer `lib/services/*` for new service behavior.
- Each service should expose a public `index.js` entrypoint.
- Add or update `README.md` for any new service directory.
- Use `lib/contracts/*` for shared interface contracts.

## Testing

- Run the smoke test suite:
  ```bash
  npm test
  ```
- Check maintainability metrics before and after refactors:
  ```bash
  npm run maintainability:report
  ```
- If you add new service behavior, include simple tests under `test/`.

## Documentation

- Keep architectural docs in `docs/`.
- Update `README.md` or `todo_maintainability.md` when adding new conventions or workflows.
