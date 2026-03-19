# Events Service

## Public API

Exported from `lib/services/events/index.js`:

- `joinFirstActiveEventService()`
- `runJoinEventModuleService()`
- `broadcastCodeLoadedService()`
- `isJoinableEventService(name)`
- `getActiveJoinableEventsService()`

`joinFirstActiveEventService()` returns a validated join result object with at least:

- `ok` (boolean)
- optional `joined` / `name` metadata

`runJoinEventModuleService()` is a module-facing one-shot helper for
`lib/modules/join_event.module.js`; it runs the join flow and returns `null`.

## Allowed legacy import path

None.

`events_service.js` uses service-owned files (`join_flow.js`, `active_event_catalog.js`) and `infra/game_api.js` only.

## Migration note

`joinFirstActiveEvent` has been migrated into service-native modules.
