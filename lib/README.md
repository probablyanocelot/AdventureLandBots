# lib/

Core bot runtime and domain logic.

## Entrypoints

- `zCLIENT_BOOTSTRAP.js` — in-game bootstrap loader.
- `al_main.js` — top-level runtime entry (`main`).
- `runtime/character_runtime.js` — bot boot pipeline and class/module startup.

## Ownership map

- `runtime/` — lifecycle + module orchestration.
- `characters/` — class shells + composition helpers.
- `modules/` — runtime installables (`install(ctx) -> disposable`).
- `domains/` — source-of-truth behavior by domain.
- `infra/` — adapters for engine globals.
- `telemetry/` — websocket telemetry services.
- root `fn_*.js`, `al_*.js`, `npc_*.js` — shared helpers/config and narrow utilities.

## Architectural intent

- Keep runtime and class files orchestration-thin.
- Move behavior/state ownership into `domains/*`.
- Keep external side effects behind `infra/*` where practical.

## Compatibility

Legacy root shim files were removed. Import domain/character/runtime modules directly.
