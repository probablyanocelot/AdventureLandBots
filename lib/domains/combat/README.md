# Combat Domain

## Ownership

Target selection, combat skill usage, event combat, world-event combat, and standard farming combat actions.

## Public API

Import from `./index.js`.

- `installEventCombat`
- `useFarmerSkills`
- `savePosition`, `getPosition`, `runCrab`, `runMonsterhunt`, `runWorldEvent`, `runMageSupport`, `runPriestSupport`
- `PRIORITY_TARGETS`, `getNearestVisiblePriorityMonster`, `getNearestMonsterOfType`, `engageMonster`

## Module map (read this first)

- `hunt_runner.js`: hunt/crab behavior, pull logic, danger estimation, and coordinated engage rules.
- `world_event_runner.js`: event-target movement/engage flow with movement throttling.
- `support_runner.js`: mage/priest support actions (`energize`, `heal`, `partyheal`).
- `position_store.js`: shared party position persistence + teammate-destination lookup.
- `combat_shared.js`: debug/throttle and small shared movement/normalization helpers.
- `targeting.js`: monster selection + engagement primitives (do not duplicate ranking logic elsewhere).

## Dependency edges

- Depends on movement manager, state flags, inventory helpers, and event data.
- Called by farming loops and event modules.

## Anti-patterns

- Don’t mix party orchestration into combat files.
- Don’t reimplement target ranking outside `targeting.js` unless explicitly required.
