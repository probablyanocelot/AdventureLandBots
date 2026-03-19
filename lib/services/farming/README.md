# Farming Service

## Public API

Exported from `lib/services/farming/index.js`:

- `createNoEventFarmingService({ cfg })`

Returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

Only the phase-1 runtime bridge file may import:

- `../../al_farming_config.js`

Specifically, this is limited to `lib/services/farming/no_event_farming_runtime.js`.

Direct `../../domains/*` imports are not allowed in this service folder.

## Migration note

Phase-1 completed: `farming_service.js` now depends on service-local runtime bridge (`no_event_farming_runtime.js`) instead of importing `al_farming_config.js` directly.

Phase-2 in progress: shared farming runtime helpers now live in `lib/services/farming/runtime_helpers.js` and are consumed by the legacy runtime.

Next phase is extracting `installNoEventFarming` into service-native modules and deleting both the runtime bridge and legacy aggregator dependency.
