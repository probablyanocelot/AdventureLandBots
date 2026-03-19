# Combat Service

## Public API

Exported from `lib/services/combat/index.js`:

- `createEventCombatService({ cfg })`

Returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

This bridge service is allowed to import exactly:

- `../../domains/combat/index.js`

No other `domains/*` path is allowed in this service folder.

## Migration note

`installEventCombat` should migrate from legacy combat domain into `lib/services/combat/*` so this wrapper can become the primary implementation.
