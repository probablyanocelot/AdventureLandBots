# Services

Service layer for runtime behavior modules.

## Goals

- Encapsulate each domain runtime behind a stable service API.
- Keep `lib/modules/*` thin and policy-driven.
- Centralize service-level middleware per service.

## Current migration status

- `orchestrator` service wrapper created.
- `party` service wrappers created (`auto-party`, `priest swap`).
- `cm` service wrappers created (`upkeep`, `unpack requester`).
- `combat` service wrapper created (`event combat`).
- `farming` service wrapper created (`no-event farming`).
- `events` service wrapper created (`join event`).
- Additional services can be migrated incrementally.

## Service docs

- `orchestrator` → `lib/services/orchestrator/README.md`
- `party` → `lib/services/party/README.md`
- `cm` → `lib/services/cm/README.md`
- `combat` → `lib/services/combat/README.md`
- `farming` → `lib/services/farming/README.md`
- `events` → `lib/services/events/README.md`

## Bridge policy

- Only designated `*_service.js` bridge files may import legacy `domains/*` (or `al_farming_config.js` for farming).
- All other service files should remain domain-agnostic and use contracts/public service entrypoints.
