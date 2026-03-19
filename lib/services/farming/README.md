# Farming Service

## Public API

Exported from `lib/services/farming/index.js`:

- `createNoEventFarmingService({ cfg })`

Returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

Service bridge now imports:

- `../../no_event_farming_runtime.js`

Specifically, this is limited to `lib/services/farming/no_event_farming_runtime.js`.

Direct `../../domains/*` imports are not allowed in this service folder.

## Migration note

Phase-1 completed: `farming_service.js` now depends on service-local runtime bridge (`no_event_farming_runtime.js`) instead of importing `al_farming_config.js` directly.

Phase-2 in progress: shared farming runtime helpers now live in `lib/services/farming/runtime_helpers.js` and are consumed by the legacy runtime.

Phase-3 in progress: CM message handling block was extracted into `lib/services/farming/no_event_farming_cm_handler.js`; `lib/al_farming_config.js` now delegates CM handling to this service-native module.

Phase-4 in progress: non-world-event leader assignment/build logic was extracted into `lib/services/farming/no_event_farming_assignment_builder.js`; `lib/al_farming_config.js` now delegates assignment construction to this service-native module.

Phase-5 in progress: world-event leader control flow (assignment + role broadcast + local run path) was extracted into `lib/services/farming/no_event_farming_world_event_flow.js`; `lib/al_farming_config.js` now delegates this branch to the service module.

Phase-6 in progress: hunt-chain lifecycle blocks (bootstrap, pending finalize, and turn-in chain branch) were extracted into `lib/services/farming/no_event_farming_hunt_chain_flow.js`; `lib/al_farming_config.js` now delegates this flow to the service module.

Phase-7 in progress: non-world-event leader assignment publish cadence (state update + role broadcast retry/ack gate) was extracted into `lib/services/farming/no_event_farming_assignment_publish.js`; `lib/al_farming_config.js` now delegates this glue path.

Phase-8 in progress: position persist/broadcast runtime path was extracted into `lib/services/farming/no_event_farming_position_flow.js`; `lib/al_farming_config.js` now delegates this flow.

Phase-9 in progress: NPC-mage hold runtime block was extracted into `lib/services/farming/no_event_farming_npc_hold_flow.js`; `lib/al_farming_config.js` now delegates this flow.

Phase-10 in progress: execution tail (regroup handling + combat/support dispatch) was extracted into `lib/services/farming/no_event_farming_execution_flow.js`; `lib/al_farming_config.js` now delegates this flow.

Phase-11 in progress: runtime bridge import was decoupled from direct `../../al_farming_config.js` usage by routing through `../../no_event_farming_runtime.js`.

Next phase is replacing `lib/no_event_farming_runtime.js` transitional adapter internals with direct service-native composition and then deleting the `al_farming_config.js` dependency entirely.
