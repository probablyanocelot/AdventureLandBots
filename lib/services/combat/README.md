# Combat Service

## Public API

Exported from `lib/services/combat/index.js`:

- `createEventCombatModuleService({ cfg })`
- `runMageSupport({ assigned })`
- `runPriestSupport({ cfg })`

`createEventCombatModuleService` is the module-facing helper used by
`lib/modules/event_combat.module.js`.

Returns a validated disposable resource exposing:

- `stopRoutine()`
- `dispose()` (when available)
- `Symbol.dispose` / `Symbol.asyncDispose` (when available)

## Allowed legacy import path

None.

`combat_service.js` uses service-owned modules (`event_combat_runtime.js`, `skills.js`) and service/public dependencies only.

## Migration note

`installEventCombat` is now service-native under `lib/services/combat/*`.
