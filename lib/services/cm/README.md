# CM Service

## Public API

Exported from `lib/services/cm/index.js`:

- `createUpkeepService({ cfg })`
- `createUnpackRequesterService({ cfg })`

Each factory returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

This bridge service is allowed to import exactly:

- `../../domains/cm/index.js`

No other `domains/*` path is allowed in this service folder.

## Migration note

`installUpkeep` and `installUnpackRequester` should be moved into service-native modules under `lib/services/cm/*` before removing the bridge dependency.
