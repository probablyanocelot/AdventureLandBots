# Party Service

## Public API

Exported from `lib/services/party/index.js`:

- `createPartyService({ cfg })`
- `createPriestSwapService({ cfg })`
- `createPartyModuleService({ cfg })`
- `createPriestSwapModuleService({ cfg })`
- `is_friendly(name)`
- `getActiveNames()`
- `ensureCharacterRunningBySwap(name, opts)`
- `setCharacterAction({ owner, action })`
- `clearCharacterAction({ owner })`
- `partyInvite(name)`
- `partyAccept()`
- `partyLeave()`

`createPartyModuleService` and `createPriestSwapModuleService` are module-facing
aliases used by `lib/modules/party.module.js` and
`lib/modules/priest_swap.module.js`.

Both factory functions return validated disposable resources exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

None.

`party_service.js` uses service-owned modules (`auto_party_runtime.js`, `priest_swap_runtime.js`) and service/public dependencies only.

## Migration note

`installAutoParty` and `installPriestSwap` are both service-native under `lib/services/party/*`.
