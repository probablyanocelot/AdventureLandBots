# Farming Service

## Public API

Exported from `lib/services/farming/index.js`:

- `createNoEventFarmingService({ cfg })`
- `createNoEventFarmingModuleService({ cfg })`

`createNoEventFarmingModuleService` is the module-facing alias used by
`lib/modules/no_event_farming.module.js`.

Returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Runtime ownership

Service runtime now resolves through:

- `./no_event_farming_runtime.js`
- `./no_event_farming_runtime_impl.js`

Service callers must only depend on `lib/services/farming/index.js`.

Direct `../../domains/*` imports are not allowed in this service folder outside designated runtime composition files.

## Migration note

Phase-1 completed: `farming_service.js` now depends on service-local runtime bridge (`no_event_farming_runtime.js`) instead of importing `al_farming_config.js` directly.

Phase-2 in progress: shared farming runtime helpers now live in `lib/services/farming/runtime_helpers.js` and are consumed by the legacy runtime.

Phase-3 in progress: CM message handling block was extracted into `lib/services/farming/no_event_farming_cm_handler.js`.

Phase-4 in progress: non-world-event leader assignment/build logic was extracted into `lib/services/farming/no_event_farming_assignment_builder.js`.

Phase-5 in progress: world-event leader control flow (assignment + role broadcast + local run path) was extracted into `lib/services/farming/no_event_farming_world_event_flow.js`.

Phase-6 in progress: hunt-chain lifecycle blocks (bootstrap, pending finalize, and turn-in chain branch) were extracted into `lib/services/farming/no_event_farming_hunt_chain_flow.js`.

Phase-7 in progress: non-world-event leader assignment publish cadence (state update + role broadcast retry/ack gate) was extracted into `lib/services/farming/no_event_farming_assignment_publish.js`.

Phase-8 in progress: position persist/broadcast runtime path was extracted into `lib/services/farming/no_event_farming_position_flow.js`.

Phase-9 in progress: NPC-mage hold runtime block was extracted into `lib/services/farming/no_event_farming_npc_hold_flow.js`.

Phase-10 in progress: execution tail (regroup handling + combat/support dispatch) was extracted into `lib/services/farming/no_event_farming_execution_flow.js`.

Phase-11 completed: runtime bridge import was decoupled from direct `../../al_farming_config.js` usage by routing through service-local runtime entrypoints.

Phase-12 completed: service runtime composition is owned at `lib/services/farming/no_event_farming_runtime_impl.js`.

Phase-13 completed: `lib/al_farming_config.js` compatibility adapter removed.

Phase-14 completed: root runtime implementation `lib/no_event_farming_runtime_impl.js` removed; no-event farming runtime now lives fully under `lib/services/farming/*`.
