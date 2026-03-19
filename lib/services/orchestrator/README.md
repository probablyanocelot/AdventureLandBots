# Orchestrator Service

## Public API

Exported from `lib/services/orchestrator/index.js`:

- `createOrchestratorService()`
- `OrchestratorService` (class)

`createOrchestratorService()` returns a validated service instance with lifecycle methods:

- `init()`
- `stopRoutine()`
- `dispose()`
- `Symbol.dispose`
- `Symbol.asyncDispose`

## Allowed legacy import path

None.

This service is now service-native and must not import `domains/*`.

## Migration note

Legacy orchestrator bridge import has been removed. Callers should continue to use `lib/services/orchestrator/index.js`.
