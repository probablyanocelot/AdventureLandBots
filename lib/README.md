# lib/

Core bot runtime and service logic.

## Entrypoints

- `bootstrap/index.js` — client bootstrap entry (proxied loader + telemetry/swap bootstrap wiring).
- `client_bootstrap.js` — thin launcher delegating to `bootstrap/index.js`.
- `al_main.js` — top-level runtime entry (`main`).
- `runtime/character_runtime.js` — bot boot pipeline and class/module startup.

## Ownership map

- `runtime/` — lifecycle + module orchestration.
- `characters/` — class shells + composition helpers.
- `modules/` — runtime installables (`install(ctx) -> disposable`).
- `services/` — source-of-truth behavior by service.
- `contracts/` — service API contracts and validation helpers.
- `services/shared/` — cross-service helper utilities (time, roster, location, game/data/math helpers).
- `services/orchestrator/` — orchestrator coordination runtime.
- `infra/` — adapters for engine globals.
- `telemetry/` — websocket telemetry services.
- `bootstrap/` — client bootstrap pipeline modules (`proxied_require`, telemetry bootstrap, swap-routing bootstrap).
- `runtime/` — runtime boot flow and module orchestration (`runtime/README.md`).
- root entrypoints (`client_bootstrap.js`, `al_main.js`) — launch/runtime roots only.

## Minimal-context read map

Read in this order and stop as soon as you have enough context:

1. `services/<service>/index.js` and `contracts/<service>_api.js`
2. only the concrete module you need to edit
3. only direct callers/callees needed for integration checks

### If changing X, read Y only

- Party behavior → `services/party/index.js`, one of `party.js|party_actions.js|swap.js`
- Combat behavior → `services/combat/index.js`, one of `hunt_runner.js|world_event_runner.js|support_runner.js|position_store.js|skills.js|targeting.js|event_combat.js`
- Event handling/CM waits → `services/events/index.js`, `listeners.js` (+ specific event module)
- Farming assignment/chaining → `services/farming/index.js`, target module under `services/farming/*`
- Inventory/chest logic → `services/inventory/index.js`, target module
- Movement routing → `services/movement/index.js`, `move_manager.js`
- State flags/guards → `services/state/index.js`, `flags.js`
- CM services/upkeep → `services/cm/index.js`, target CM file
- Cross-service helpers → `services/shared/index.js`, target helper file
- Orchestrator coordination → `services/orchestrator/index.js`, `services/orchestrator/orchestrator.js`
- Client bootstrap/proxied loading → `bootstrap/index.js`, then one of `bootstrap/proxied_require.js|bootstrap/telemetry_bootstrap.js|bootstrap/swap_routing_bootstrap.js`

Avoid loading unrelated large files (`gui/*`, `unused/*`) unless the task explicitly depends on them.

## Architectural intent

- Keep runtime and class files orchestration-thin.
- Move behavior/state ownership into `services/*`.
- Keep external side effects behind `infra/*` where practical.

Prefer service entrypoints (`services/*/index.js`) for new imports.
