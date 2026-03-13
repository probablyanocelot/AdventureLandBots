# Movement Domain

## Ownership

Movement request scheduling and smart-move guardrails.

## Public API

Import from `./index.js`.

- `createMoveManager`

## Dependency edges

- Consumed by combat/farming/gathering modules.
- Wraps game movement APIs and cooldown behaviors.

## Anti-patterns

- Don’t issue raw `smart_move` from many places when move manager can coordinate requests.
- Don’t create competing move loops.
