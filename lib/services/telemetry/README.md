# Telemetry Service

## Public API

Exported from `lib/services/telemetry/index.js`:

- `createTelemetryService({ cfg })`
- `createTelemetryModuleService({ cfg })`

`createTelemetryModuleService` is the module-facing alias used by
`lib/modules/telemetry.module.js`.

Returns the telemetry disposable from `lib/telemetry/client.js` when enabled.

## Ownership

- `lib/modules/telemetry.module.js` must consume telemetry through this service entrypoint.
- Service callers should not import `lib/telemetry/client.js` directly.
