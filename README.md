# AdventureLandBots

Adventure Land MMORPG bot framework with a runtime-first architecture.

## Runtime entrypoint

In-game startup chain:

1. `lib/zCLIENT_BOOTSTRAP.js`
2. `lib/bootstrap/index.js` (`runClientBootstrap`)
3. `lib/al_main.js` (`main`)
4. `lib/runtime/character_runtime.js` (`bootCharacterRuntime`)

## Folder map

- `lib/runtime/` — lifecycle, module contract, module registry, character boot.
- `lib/characters/` — character classes + composition helpers.
- `lib/modules/` — installable runtime modules (`install(ctx) -> disposable`).
- `lib/services/` — service-layer implementations (CM, combat, events, movement, inventory, party, state, gathering).
- `lib/contracts/` — service interfaces and runtime contract validators.
- `lib/infra/` — adapters over game globals (`send_cm`, `join`, `smart_move`, ...).
- `lib/telemetry/` — telemetry client/server.
- `game_codes/` — game-specific scripts and runner compatibility.
- `examples/` — sample configs and outputs.

## Conventions

- Prefer service ownership (`lib/services/*`) over root utility sprawl.
- Character classes should stay thin and compose services.
- Modules must expose `install(ctx)` and return a disposable resource when active.
- New code should avoid adding root-level shim files.
- Service-to-service imports should use `lib/services/<service>/index.js` only.
- Cross-service integration should prefer `lib/contracts/*` over internal imports.

## Contract boundaries (canonical)

- Canonical service API surface: `lib/contracts/*`
- Service public entrypoints: `lib/services/<service>/index.js`
- Runtime module install contract: `lib/modules/*.module.js` with `install(ctx)`

Core contract-backed services:

| Service         | Entrypoint                            | Contract file                        | Module ctx shape                                                                            | Lifecycle expectation                                              |
| --------------- | ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `cm`            | `lib/services/cm/index.js`            | `lib/contracts/cm_api.js`            | `{ cfg, runtimeScope }` to module installer; factories consume `{ cfg }`                    | services expose `stopRoutine()`                                    |
| `combat`        | `lib/services/combat/index.js`        | `lib/contracts/combat_api.js`        | `{ cfg, runtimeScope }` to module installer; factory consumes `{ cfg }`                     | service exposes `stopRoutine()`                                    |
| `events`        | `lib/services/events/index.js`        | `lib/contracts/events_api.js`        | module installer currently uses no ctx for join flow                                        | one-shot `runJoinEventModuleService()`; listener install/stop pair |
| `farming`       | `lib/services/farming/index.js`       | `lib/contracts/farming_api.js`       | `{ cfg, runtimeScope }` to module installer; role sync accepts `{ cfg, ownerName, reason }` | services expose `stopRoutine()`                                    |
| `inventory`     | `lib/services/inventory/index.js`     | `lib/contracts/inventory_api.js`     | service factory `createChestLootingService({ intervalMs })`                                 | service exposes `stopRoutine()`                                    |
| `merchant`      | `lib/services/merchant/index.js`      | `lib/contracts/merchant_api.js`      | character/service creation accepts `{ cfg, home, gatherLoc, gatherOrder, gatherRepeatMs }`  | service exposes `stopRoutine()` and disposal methods               |
| `merchant_role` | `lib/services/merchant_role/index.js` | `lib/contracts/merchant_role_api.js` | factories consume `{ cfg }`                                                                 | services expose `stopRoutine()`                                    |
| `orchestrator`  | `lib/services/orchestrator/index.js`  | `lib/contracts/orchestrator_api.js`  | module service currently no ctx args                                                        | `init()` on creation; supports stop/dispose                        |
| `party`         | `lib/services/party/index.js`         | `lib/contracts/party_api.js`         | `{ cfg, runtimeScope }` to module installer; factories consume `{ cfg }`                    | services expose `stopRoutine()`                                    |

## Quick edit map

- Change combat behavior → `lib/services/combat/index.js` and files in `lib/services/combat/*`
- Change movement behavior → `lib/services/helper-movement/index.js` (plus `lib/services/movement/index.js` consumer alias)
- Add runtime module → `lib/modules/*.module.js` + `lib/runtime/module_registry.js`
- Add character behavior → `lib/characters/*_character.js`
- Change class resolution → `lib/runtime/character_runtime.js` (`CLASS_REGISTRY`)
- Change policy wiring/order → `lib/runtime/module_registry.js` (`MODULE_POLICIES`)

## Key docs

- `lib/README.md` — detailed `lib/` map.
- `docs/llm-agent-guide.md` — machine-friendly architecture, contract, and edit guidance for agents.
- `docs/repo-map.yaml` — machine-readable architecture map.
- `docs/agent-index.json` — stable file/service index for automation.
- `docs/architecture-rules.md` — layering/import rules.
- `docs/deprecated-paths.md` — removed shim paths and replacements.
