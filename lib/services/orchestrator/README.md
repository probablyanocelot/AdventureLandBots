# Orchestrator Service

## Public API

Exported from `lib/services/orchestrator/index.js`:

- `createOrchestratorModuleService()`

`createOrchestratorModuleService()` returns a validated service instance with lifecycle methods:

- `init()`
- `stopRoutine()`
- `dispose()`
- `Symbol.dispose`
- `Symbol.asyncDispose`

`createOrchestratorModuleService()` is used by
`lib/modules/orchestrator.module.js`.
