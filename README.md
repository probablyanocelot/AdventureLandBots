# AdventureLandBots

Adventure Land MMORPG bot framework with a runtime-first architecture.

## Runtime entrypoint

In-game startup chain:

1. `lib/client_entry.js`
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

```yaml
services:
  cm:
    entrypoint: lib/services/cm/index.js
    contract: lib/contracts/cm_api.js
    module_ctx_shape:
      - cfg
      - runtimeScope
    lifecycle: services expose stopRoutine()
  combat:
    entrypoint: lib/services/combat/index.js
    contract: lib/contracts/combat_api.js
    module_ctx_shape:
      - cfg
      - runtimeScope
    lifecycle: service exposes stopRoutine()
  events:
    entrypoint: lib/services/events/index.js
    contract: lib/contracts/events_api.js
    module_ctx_shape: []
    lifecycle: one-shot runJoinEventModuleService(); listener install/stop pair
  farming:
    entrypoint: lib/services/farming/index.js
    contract: lib/contracts/farming_api.js
    module_ctx_shape:
      - cfg
      - runtimeScope
    lifecycle: services expose stopRoutine()
  inventory:
    entrypoint: lib/services/inventory/index.js
    contract: lib/contracts/inventory_api.js
    factory_args:
      - intervalMs
    lifecycle: service exposes stopRoutine()
  merchant:
    entrypoint: lib/services/merchant/index.js
    contract: lib/contracts/merchant_api.js
    factory_args:
      - cfg
      - home
      - gatherLoc
      - gatherOrder
      - gatherRepeatMs
    lifecycle: service exposes stopRoutine() and disposal methods
  merchant_role:
    entrypoint: lib/services/merchant_role/index.js
    contract: lib/contracts/merchant_role_api.js
    module_ctx_shape:
      - cfg
    lifecycle: services expose stopRoutine()
  orchestrator:
    entrypoint: lib/services/orchestrator/index.js
    contract: lib/contracts/orchestrator_api.js
    module_ctx_shape: []
    lifecycle: init() on creation; supports stop/dispose
  party:
    entrypoint: lib/services/party/index.js
    contract: lib/contracts/party_api.js
    module_ctx_shape:
      - cfg
      - runtimeScope
    lifecycle: services expose stopRoutine()
```

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
