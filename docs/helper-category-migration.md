# Helper-Category Service Migration (Dev Branch)

## Summary

Non-feature-specific helper functionality has been split into dedicated helper-category services:

- `lib/services/helper-movement/`
- `lib/services/helper-targeting/`
- `lib/services/helper-combat/`
- `lib/services/helper-data-structures/`

## Public Contracts

Use service entrypoints:

- `await require("../services/helper-movement/index.js")`
- `await require("../services/helper-targeting/index.js")`
- `await require("../services/helper-combat/index.js")`
- `await require("../services/helper-data-structures/index.js")`

## Removed Ownership (Legacy Paths)

These paths are no longer feature owners and are now compatibility delegates:

- `lib/domains/movement/move_manager.js`
- `lib/domains/combat/targeting.js`
- `lib/domains/combat/combat_shared.js`
- `lib/domains/shared/data_utils.js`

## Caller Migration Applied

- `lib/services/farming/no_event_farming_runtime_impl.js`
  - movement helper import moved to `helper-movement`
- `lib/characters/base_character.js`
  - data-structure helper import moved to `helper-data-structures`

## Notes

- This is a dev-branch architecture refactor with no intent to preserve legacy helper ownership.
- Keep adding generic helpers only under `lib/services/helper-*`.
