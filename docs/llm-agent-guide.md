# LLM Agent Guide

Machine-friendly guide for making safe, architecture-aligned edits in `AdventureLandBots`.

## Ownership by folder

- `lib/bootstrap/` — client bootstrap and host wiring before runtime starts.
- `lib/runtime/` — runtime orchestration, lifecycle disposal, and module policy execution.
- `lib/modules/` — runtime-installable module adapters with `install(ctx)`.
- `lib/contracts/` — canonical public service contract layer (no implementation logic).
- `lib/services/` — feature ownership and service implementations.
- `lib/characters/` — character class shells and character-level composition.
- `lib/config/` — configuration assembly and runtime config context.

## Runtime boot flow (self-contained)

Primary chain used in-game:

1. `codes/93proxied_entry.js`
2. `lib/bootstrap/index.js#runClientBootstrap`
3. `lib/al_main.js#main`
4. `lib/runtime/character_runtime.js#bootCharacterRuntime`

Flow notes:

- `runClientBootstrap()` installs diagnostics/bootstrap hooks, loads `al_main.js`, then calls `main()`.
- `main()` delegates to `bootCharacterRuntime()` and updates live exported runtime handles (`bot`, `orchestrator`, `runtimeScope`).
- `bootCharacterRuntime()` owns runtime restart behavior, class selection, module policies, and bot loop start.

## LifecycleScope cleanup rules

Canonical file: `lib/runtime/lifecycle.js`

- `LifecycleScope.add(fn)` registers teardown finalizers.
- `LifecycleScope.use(resource)` auto-registers resource cleanup for:
  - `resource[Symbol.dispose]()`
  - `resource[Symbol.asyncDispose]()`
  - `resource.dispose()`
  - `resource.close()`
- `dispose()` and `disposeAsync()` execute finalizers in reverse order (LIFO).
- Runtime reload path disposes previous runtime scope before creating a new one.

## Module registry and policy mapping

Canonical file: `lib/runtime/module_registry.js`

- Module installers map: `MODULE_INSTALLERS`
- Policy map: `MODULE_POLICIES`
  - `preBot`
  - `merchantPostBot`
  - `nonMerchantPostBot`
  - `passivePostBot`
- `resolvePostBotPolicyName({ ctype, isPassive })` selects post-bot policy.
- Runtime starts `preBot` before character class boot and resolved `postBot` after class/passive bot setup.

## Class resolution (`CLASS_REGISTRY`)

Canonical file: `lib/runtime/character_runtime.js`

- `CLASS_REGISTRY[character.ctype]` selects class constructor module and export name.
- Current class keys: `merchant`, `mage`, `warrior`, `ranger`, `priest`, `rogue`, `paladin`.
- If no class is registered for `character.ctype`, runtime starts passive base-character flow.

## Module install contract semantics

Canonical files:

- `lib/modules/create_service_module_installer.js`
- `lib/runtime/module_contract.js`

Contract summary:

- Every runtime module entrypoint exports `install(ctx)`.
- Runtime invokes module installers through `installModule(installFn, ctx)`.
- `ctx` passed by registry is `{ cfg, runtimeScope }`.
- Services typically consume `cfg`; `runtimeScope` is passed for installer compatibility and lifecycle registration.
- Module return values should expose disposable semantics so runtime cleanup can be deterministic.

## Public service contracts (canonical)

Canonical API surface: `lib/contracts/*`

Service public entrypoints: `lib/services/<service>/index.js`

### Contract-backed service boundary map

```yaml
services:
  - service: cm
    entrypoint: lib/services/cm/index.js
    exportedServiceFunctions:
      - createUpkeepModuleService
      - createUnpackRequesterModuleService
      - installBaseCmCommands
      - installMagiportAutoAccept
      - installMageMagiportService
      - magiportTargets
    expectedCtxShape: "module install ctx: { cfg, runtimeScope }; factories: { cfg }"
    lifecycleBehavior: "upkeep/unpack services validate stopRoutine()"

  - service: combat
    entrypoint: lib/services/combat/index.js
    exportedServiceFunctions:
      - createEventCombatModuleService
      - runMageSupport
      - runPriestSupport
    expectedCtxShape: "module install ctx: { cfg, runtimeScope }; factory: { cfg }"
    lifecycleBehavior: "event combat service validates stopRoutine()"

  - service: events
    entrypoint: lib/services/events/index.js
    exportedServiceFunctions:
      - joinFirstActiveEventService
      - runJoinEventModuleService
      - broadcastCodeLoadedService
      - isJoinableEventService
      - getActiveJoinableEventsService
      - createEventTaskEmitter
      - listener functions
    expectedCtxShape: "module installer currently no args for join flow"
    lifecycleBehavior: "join-event call validates { ok: boolean }; listeners support install/stop lifecycle"

  - service: farming
    entrypoint: lib/services/farming/index.js
    exportedServiceFunctions:
      - createNoEventFarmingModuleService
      - createRoleSyncRequesterService
      - re-exported farming helpers
    expectedCtxShape: "module install ctx: { cfg, runtimeScope }; role sync service: { cfg, ownerName, reason }"
    lifecycleBehavior: "no-event and role-sync services validate stopRoutine()"

  - service: inventory
    entrypoint: lib/services/inventory/index.js
    exportedServiceFunctions:
      - createChestLootingService
      - re-exported inventory helpers
    expectedCtxShape: "service args: { intervalMs }"
    lifecycleBehavior: "chest looting service validates stopRoutine()"

  - service: merchant
    entrypoint: lib/services/merchant/index.js
    exportedServiceFunctions:
      - createMerchantService
    expectedCtxShape: "service args: { cfg, home, gatherLoc, gatherOrder, gatherRepeatMs }"
    lifecycleBehavior: "service validates required methods; includes stopRoutine, dispose, symbol disposal"

  - service: merchant_role
    entrypoint: lib/services/merchant_role/index.js
    exportedServiceFunctions:
      - createToolProvisioningService
      - createBankCraftingService
      - createUnpackSupportService
      - re-exports
    expectedCtxShape: "service args: { cfg }"
    lifecycleBehavior: "each validated service exposes stopRoutine(); tooling exposes checkForTools()"

  - service: orchestrator
    entrypoint: lib/services/orchestrator/index.js
    exportedServiceFunctions:
      - createOrchestratorModuleService
      - orchestrator re-exports
    expectedCtxShape: "module service currently no args"
    lifecycleBehavior: "service validates init + stopRoutine; init is invoked during creation"

  - service: party
    entrypoint: lib/services/party/index.js
    exportedServiceFunctions:
      - createPartyModuleService
      - createPriestSwapModuleService
      - setCharacterAction
      - clearCharacterAction
      - partyInvite
      - partyAccept
      - partyLeave
      - swap helpers
    expectedCtxShape: "module install ctx: { cfg, runtimeScope }; factories: { cfg }"
    lifecycleBehavior: "party/priest-swap module services validate stopRoutine()"

  - service: telemetry
    entrypoint: lib/services/telemetry/index.js
    exportedServiceFunctions:
      - createTelemetryModuleService
    expectedCtxShape: "module install ctx: { cfg, runtimeScope }; factory: { cfg }"
    lifecycleBehavior: "telemetry module returns runtime-managed service object"
```

## Stable extension points

Use these first for net-new behavior:

1. `lib/services/<feature>/index.js` (public service API entrypoint)
2. `lib/contracts/<feature>_api.js` (public contract validation and required methods)
3. `lib/modules/<feature>.module.js` (`install(ctx)` adapter)
4. `lib/runtime/module_registry.js` (policy mapping and module selection)
5. `lib/characters/*_character.js` (class-specific behavior wiring)

## What to change for X

- Change combat behavior
  - `lib/services/combat/index.js`
  - `lib/services/combat/*`
- Change movement behavior
  - `lib/services/helpers/movement/index.js`
  - `lib/services/helpers/movement/*`
  - (consumer alias) `lib/services/movement/index.js`
- Add a runtime module
  - `lib/modules/<name>.module.js`
  - `lib/runtime/module_registry.js` (add installer + policy slot)
- Add character behavior
  - `lib/characters/*_character.js`
  - optional class registration updates in `lib/runtime/character_runtime.js`
- Change runtime startup/lifecycle
  - `lib/bootstrap/index.js`
  - `lib/al_main.js`
  - `lib/runtime/character_runtime.js`
  - `lib/runtime/lifecycle.js`

## Naming conventions for agent-friendly edits

- Keep public service entrypoints at `lib/services/<service>/index.js`.
- Keep contract files at `lib/contracts/<service>_api.js`.
- Keep runtime module adapters as `lib/modules/<feature>.module.js` with `install(ctx)`.
- Keep orchestration in runtime files; keep feature logic inside service files.
