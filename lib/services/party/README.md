# Party Service

## Public API

Exported from `lib/services/party/index.js`:

- `createPartyService({ cfg })`
- `createPriestSwapService({ cfg })`

Both factory functions return validated disposable resources exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

This bridge service is allowed to import exactly:

- `../../domains/party/index.js`

No other `domains/*` path is allowed in this service folder.

## Migration note

`installAutoParty` and `installPriestSwap` currently remain in the legacy party domain. Move them into service-native files and remove the bridge import when complete.
