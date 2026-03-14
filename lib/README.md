# lib/

Core bot runtime and domain logic.

## Entrypoints

- `zCLIENT_BOOTSTRAP.js` — in-game bootstrap loader.
- `bootstrap/index.js` — client bootstrap entry (proxied loader + telemetry/swap bootstrap wiring).
- `client_bootstrap.js` — thin launcher delegating to `bootstrap/index.js`.
- `al_main.js` — top-level runtime entry (`main`).
- `runtime/character_runtime.js` — bot boot pipeline and class/module startup.

## Ownership map

- `runtime/` — lifecycle + module orchestration.
- `characters/` — class shells + composition helpers.
- `modules/` — runtime installables (`install(ctx) -> disposable`).
- `domains/` — source-of-truth behavior by domain.
- `domains/shared/` — cross-domain helper utilities (time, roster, location, game/data/math helpers).
- `domains/orchestrator/` — orchestrator coordination runtime.
- `infra/` — adapters for engine globals.
- `telemetry/` — websocket telemetry services.
- `bootstrap/` — client bootstrap pipeline modules (`proxied_require`, telemetry bootstrap, swap-routing bootstrap).
- root entrypoints (`client_bootstrap.js`, `al_main.js`) — launch/runtime roots only.

## Minimal-context read map

Read in this order and stop as soon as you have enough context:

1. `RESTRUCTURE_PLAN_HANDOFF.md`
2. `domains/<domain>/README.md`
3. `domains/<domain>/index.js`
4. only the concrete module you need to edit
5. only direct callers/callees needed for integration checks

### If changing X, read Y only

- Party behavior → `domains/party/README.md`, `domains/party/index.js`, one of `party.js|party_actions.js|swap.js`
- Combat behavior → `domains/combat/README.md`, `domains/combat/index.js`, one of `hunt_runner.js|world_event_runner.js|support_runner.js|position_store.js|skills.js|targeting.js|event_combat.js`
- Event handling/CM waits → `domains/events/README.md`, `domains/events/index.js`, `listeners.js` (+ specific event module)
- Farming assignment/chaining → `domains/farming/README.md`, `domains/farming/index.js`, target module under `domains/farming/*`
- Merchant gather loop → `domains/gathering/README.md`, `domains/gathering/index.js`, target module
- Inventory/chest logic → `domains/inventory/README.md`, `domains/inventory/index.js`, target module
- Movement routing → `domains/movement/README.md`, `domains/movement/index.js`, `move_manager.js`
- State flags/guards → `domains/state/README.md`, `domains/state/index.js`, `flags.js`
- CM services/upkeep → `domains/cm/README.md`, `domains/cm/index.js`, target CM file
- Cross-domain helpers → `domains/shared/README.md`, `domains/shared/index.js`, target helper file
- Orchestrator coordination → `domains/orchestrator/README.md`, `domains/orchestrator/orchestrator.js`
- Client bootstrap/proxied loading → `bootstrap/index.js`, then one of `bootstrap/proxied_require.js|bootstrap/telemetry_bootstrap.js|bootstrap/swap_routing_bootstrap.js`

Avoid loading unrelated large files (`gui/*`, `unused/*`) unless the task explicitly depends on them.

## Architectural intent

- Keep runtime and class files orchestration-thin.
- Move behavior/state ownership into `domains/*`.
- Keep external side effects behind `infra/*` where practical.

## Compatibility

Legacy root shim files were removed. Import domain/character/runtime modules directly.

Prefer domain entrypoints (`domains/*/index.js`) for new imports.
