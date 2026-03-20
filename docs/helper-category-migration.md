# Helper-Category Service Migration (Dev Branch)

## Summary

Non-feature-specific helper functionality has been split into dedicated helper-category services:

- `lib/services/helper-movement/`
- `lib/services/helper-targeting/`
- `lib/services/helper-combat/`
- `lib/services/helper-data-structures/`
- `lib/services/helper-time/`
- `lib/services/helper-roster/`

## Public Contracts

Use service entrypoints:

- `await require("../services/helper-movement/index.js")`
- `await require("../services/helper-targeting/index.js")`
- `await require("../services/helper-combat/index.js")`
- `await require("../services/helper-data-structures/index.js")`
- `await require("../services/helper-time/index.js")`
- `await require("../services/helper-roster/index.js")`

## Legacy Paths (Do Not Use)

These paths are legacy and should not be used for new work:

- `lib/domains/movement/move_manager.js`
- `lib/domains/combat/targeting.js`
- `lib/domains/combat/combat_shared.js`
- `lib/domains/shared/data_utils.js`

## Caller Migration Applied

- `lib/services/farming/no_event_farming_runtime_impl.js`
  - movement helper import moved to `helper-movement`
  - time helper import moved to `helper-time`
  - roster helper import moved to `helper-roster`
- `lib/characters/base_character.js`
  - data-structure helper import moved to `helper-data-structures`
- `lib/services/helper-targeting/targeting.js`
  - removed dependency on `domains/shared/index.js` for base target query

## Notes

- This is a dev-branch architecture refactor with no intent to preserve legacy helper ownership.
- Keep adding generic helpers only under `lib/services/helper-*`.
