# Farming Service

## Public API

Exported from `lib/services/farming/index.js`:

- `createNoEventFarmingService({ cfg })`

Returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

This bridge service is allowed to import exactly:

- `../../al_farming_config.js`

Direct `../../domains/*` imports are not allowed in this service folder.

## Migration note

`installNoEventFarming` currently aggregates multiple legacy routines from `al_farming_config.js`. Split and migrate into service-native modules before removing this bridge dependency.
