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

This bridge service is allowed to import exactly:

- `../../domains/orchestrator/index.js`

No other `domains/*` path is allowed in this service folder.

## Migration note

Target end-state is replacing this bridge with direct orchestrator implementation in `lib/services/orchestrator/*` and removing the legacy domain dependency.
