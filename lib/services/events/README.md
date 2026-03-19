# Events Service

## Public API

Exported from `lib/services/events/index.js`:

- `joinFirstActiveEventService()`

Returns a validated join result object with at least:

- `ok` (boolean)
- optional `joined` / `name` metadata

## Allowed legacy import path

This bridge service is allowed to import exactly:

- `../../domains/events/index.js`

No other `domains/*` path is allowed in this service folder.

## Migration note

`joinFirstActiveEvent` should migrate into service-native events modules so domain bridge usage can be removed.
