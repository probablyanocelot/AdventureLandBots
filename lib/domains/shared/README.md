# Shared Domain

## Ownership

Cross-domain pure helpers used by multiple behavior domains.

## Public API

Import from `./index.js`.

- Time: `sleepMs`, `now`
- Location: `getLoc`
- Roster/meta: `getRosterNames`, `getRosterMeta`, `getRosterSnapshot`, `compareByMeta`, `readLuck`
- Game queries: `getNearestMonsterOfType`, `getPlayerSafe`
- Data utils: `StaticIndex`, `DynamicIndex`, `getKeyByValue`, `countItems`, `StaticIndexByProperty`, `filterObjectsByProperty`, `is_off_timeout`, `locate_items`
- Math helpers: `distanceToPlayer`

## Dependency edges

- Consumed by `combat`, `cm`, `events`, `farming`, `movement`, `party`, and `state`.
- Should remain side-effect light; avoid introducing loops/installers here.

## Anti-patterns

- Don’t place domain-specific decision logic here.
- Don’t couple helpers to a single class/role runtime.
