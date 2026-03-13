# State Domain

## Ownership

Shared runtime state predicates and guard checks.

## Public API

Import from `./index.js`.

- `isGathering`, `isBusyMoving`, `isNearby`, `isIFrameParent`

## Dependency edges

- Lightweight dependency for combat/movement checks.

## Anti-patterns

- Don’t redefine generic predicates elsewhere.
- Keep this domain pure/predicate-focused (no side-effect loops).
