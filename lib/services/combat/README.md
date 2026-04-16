# Combat Service

## Public API

Exported from `lib/services/combat/index.js`:

- `createEventCombatModuleService({ cfg })`
- `runMageSupport({ assigned })`
- `runPriestSupport({ cfg })`
- `isInJoinableEvent(name)`
- `BlockerTracker`
- `dbg(cfg, key, message, data, rateLimitMs)`
- `stopSmartMove({ cfg, reason, data })`
- `isNearPoint(point, radius)`
- `normalizeNumber(value, fallback)`
- `spreadFromPartyIfStacked({ cfg, huntGroupNames })`
- `getMonsterTargetingName({ target, monster })`
- `resolveHuntTarget({ cfg, st, targetOverride, getTarget, rallyPoint, nowMs })`
- `maybeAdvanceMvampireSweep({ cfg, st, destinationAnchor, nearDestinationAnchor, nowMs })`
- `queueHuntRally({ target, huntDest, via, requested, teammateAtDestination })`
- `queueHuntMove({ mover, huntMoveDest, target, cfg, destMap, sameTargetRecently, nowMs })`
- `resolveHuntMoveState({ target, cfg, huntGroupNames, destinationAnchor, rallyPoint, isPorcupineTarget, getTeammateAtDestination, disableHuntBlockers })`
- `processHuntEngagement({ cfg, target, nowMs, tracker, passiveOnly, mover, rallyPoint, focusAllyName, huntGroupNames, huntMoveDest, monster, pullerTargetMonster, iAmPuller, hardByDefinition, priestPresent, priestRequiredForWarriorPull, disableHuntBlockers, cornerDest, nearDestinationAnchor })`
- `estimateCombatOutcome({ mtype })`
- `isDangerousOutcome(estimate, cfg)`
- `isDebugEnabled(cfg)`
- `broadcastHuntDanger({ cfg, target, estimate })`

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
