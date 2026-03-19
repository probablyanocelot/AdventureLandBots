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

None.

This service is service-native and must not import `domains/*`.

## Migration note

`installUpkeep` and `installUnpackRequester` are implemented in `lib/services/cm/*_runtime.js` and exported through `lib/services/cm/index.js`.
