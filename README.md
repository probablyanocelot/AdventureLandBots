# AdventureLandBots

Adventure Land MMORPG bot framework with a runtime-first architecture.

## Runtime entrypoint

In-game startup chain:

1. `lib/zCLIENT_BOOTSTRAP.js`
2. `lib/al_main.js` (`main`)
3. `lib/runtime/character_runtime.js` (`bootCharacterRuntime`)

## Folder map

- `lib/runtime/` — lifecycle, module contract, module registry, character boot.
- `lib/characters/` — character classes + composition helpers.
- `lib/modules/` — installable runtime modules (`install(ctx) -> disposable`).
- `lib/domains/` — domain-owned logic (CM, combat, events, movement, inventory, party, state, gathering).
- `lib/infra/` — adapters over game globals (`send_cm`, `join`, `smart_move`, ...).
- `lib/telemetry/` — telemetry client/server.
- `game_codes/` — game-specific scripts and runner compatibility.
- `examples/` — sample configs and outputs.

## Conventions

- Prefer domain ownership (`lib/domains/*`) over root utility sprawl.
- Character classes should stay thin and compose domain/services.
- Modules must expose `install(ctx)` and return a disposable resource when active.
- New code should avoid adding root-level shim files.

## Key docs

- `lib/README.md` — detailed `lib/` map.
- `docs/repo-map.yaml` — machine-readable architecture map.
- `docs/architecture-rules.md` — layering/import rules.
- `docs/deprecated-paths.md` — removed shim paths and replacements.
