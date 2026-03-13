# Combat Domain

## Ownership

Target selection, combat skill usage, event combat, world-event combat, and standard farming combat actions.

## Public API

Import from `./index.js`.

- `installEventCombat`
- `useFarmerSkills`
- `savePosition`, `getPosition`, `runCrab`, `runMonsterhunt`, `runWorldEvent`, `runMageSupport`, `runPriestSupport`
- `PRIORITY_TARGETS`, `getNearestVisiblePriorityMonster`, `getNearestMonsterOfType`, `engageMonster`

## Dependency edges

- Depends on movement manager, state flags, inventory helpers, and event data.
- Called by farming loops and event modules.

## Anti-patterns

- Don’t mix party orchestration into combat files.
- Don’t reimplement target ranking outside `targeting.js` unless explicitly required.
