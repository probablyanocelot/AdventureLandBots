# Orchestrator Domain

## Ownership

Cross-domain task coordination for event join flow, merchant unpack assist, and mage-assisted port orchestration.

## Public API

Import from `./orchestrator.js`.

- `Orchestrator`

## Dependency edges

- Depends on `events`, `party`, `state`, and `shared` helpers.
- Installed by `modules/orchestrator.module.js`.

## Anti-patterns

- Don’t duplicate task orchestration loops in other domains.
- Keep tactical combat logic inside `domains/combat/*` and invoke it via domain APIs.
