# CM Service

## Public API

Exported from `lib/services/cm/index.js`:

- `createUpkeepService({ cfg })`
- `createUnpackRequesterService({ cfg })`
- `installBaseCmCommands({ owner })`
- `installMagiportAutoAccept(cfg)`

Each factory returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

Designated bridge files only:

- `lib/services/cm/base_character_cm_runtime.js`
- `lib/services/cm/magiport_accept_runtime.js`

All other CM service files should remain domain-agnostic.

## Migration note

`installUpkeep` and `installUnpackRequester` are implemented in `lib/services/cm/*_runtime.js` and exported through `lib/services/cm/index.js`.
