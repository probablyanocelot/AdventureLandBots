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

- `../../domains/party/swap.js` (priest-swap only)

No other `domains/*` path is allowed in this service folder.

## Migration note

`installAutoParty` is service-native (`auto_party_runtime.js`).

`installPriestSwap` still uses legacy domain code; migrate it into `lib/services/party/*` to remove the final party bridge import.
