# Events Service

## Public API

Exported from `lib/services/events/index.js`:

- `joinFirstActiveEventService()`
- `isJoinableEventService(name)`
- `getActiveJoinableEventsService()`

`joinFirstActiveEventService()` returns a validated join result object with at least:

- `ok` (boolean)
- optional `joined` / `name` metadata

## Allowed legacy import path

None.

`events_service.js` uses service-owned files (`join_flow.js`, `active_event_catalog.js`) and `infra/game_api.js` only.

## Migration note

`joinFirstActiveEvent` has been migrated into service-native modules.
