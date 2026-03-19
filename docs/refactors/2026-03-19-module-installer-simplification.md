# Module installer simplification (2026-03-19)

## Why

`lib/modules/*` had repeated installer boilerplate (guard checks + try/catch + warning logging + service wiring).
This refactor centralizes that pattern to reduce repetition and keep modules thin delegates.

## API/design changes

- Added `lib/modules/create_service_module_installer.js`.
- Refactored these modules to use the shared installer factory:
  - `event_combat.module.js`
  - `join_event.module.js`
  - `no_event_farming.module.js`
  - `orchestrator.module.js`
  - `party.module.js`
  - `priest_swap.module.js`
  - `telemetry.module.js`
  - `unpack_requester.module.js`
  - `upkeep.module.js`

- Second wave (service ownership tightening):
  - Added `createInitializedOrchestratorService()` in
    `lib/services/orchestrator/orchestrator_service.js`.
  - Added `runJoinEventModuleService()` in
    `lib/services/events/events_service.js`.
  - Added consistent module-facing aliases (`*ModuleService`) in service wrappers:
    - `createEventCombatModuleService`
    - `createNoEventFarmingModuleService`
    - `createPartyModuleService`
    - `createPriestSwapModuleService`
    - `createTelemetryModuleService`
    - `createUpkeepModuleService`
    - `createUnpackRequesterModuleService`
    - `createOrchestratorModuleService`
  - Updated module delegates:
    - `lib/modules/orchestrator.module.js` now calls
      `createOrchestratorModuleService()`.
    - `lib/modules/join_event.module.js` now calls
      `runJoinEventModuleService()`.
    - Remaining modules now call corresponding `*ModuleService` aliases.

These are additive service API changes; existing service APIs remain intact.

## Removed legacy/duplication surface

- Removed per-module duplicated `warn` + try/catch installer wrappers.
- Preserved existing guard behavior in module-local predicates passed to the shared factory.

## Migration guidance for future module additions

- Put feature behavior in `lib/services/*`.
- Keep `lib/modules/*` as policy/guard delegates only.
- Create new module installers via `createServiceModuleInstaller({ moduleLabel, shouldInstall, installService })`.

## Validation

- `npm run lint` was executed for `AdventureLandBots`.
- Existing repo lint issues remain in unrelated directories.
- No lint errors were reported for changed module files.
