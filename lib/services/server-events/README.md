# Server-Events Service

## Public API

Exported from `lib/services/server-events/index.js`:

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

## Allowed import path

- `lib/services/server-events/index.js` is the public entrypoint for server-event behavior.
- `lib/services/runtime-listeners/index.js` is the public entrypoint for generic runtime listener plumbing.

Runtime listener helpers are now owned by `lib/services/runtime-listeners/index.js`
instead of being exposed directly by the server-events service.

## Migration note

`joinFirstActiveEvent` has been migrated into service-native modules.
