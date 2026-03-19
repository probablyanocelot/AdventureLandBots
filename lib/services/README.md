# Services

Service layer for runtime behavior modules.

## Goals

- Encapsulate each domain runtime behind a stable service API.
- Keep `lib/modules/*` thin and policy-driven.
- Centralize service-level middleware per service.

## Current migration status

- `orchestrator` service is service-native (no domain bridge).
- `party` service is service-native (`auto-party`, `priest swap`, no domain bridge).
- `cm` service is service-native (`upkeep`, `unpack requester`, no domain bridge).
- `combat` service is service-native (`event combat`, no domain bridge).
- `farming` service runtime is fully service-owned via `lib/services/farming/no_event_farming_runtime_impl.js` (root runtime impl removed).
- `gathering` service owns merchant gather runtime behavior (`MerchantGatherFsm`, `createMerchantBehavior`, `buyFromPonty`).
- `events` service is service-native (`join event`, no domain bridge).
- `telemetry` service is service-native (`telemetry.module.js` -> `services/telemetry`).
- `inventory` service owns runtime chest-loot helpers used by characters/runtime.
- Additional services can be migrated incrementally.

## Service docs

- `orchestrator` → `lib/services/orchestrator/README.md`
- `party` → `lib/services/party/README.md`
- `cm` → `lib/services/cm/README.md`
- `combat` → `lib/services/combat/README.md`
- `farming` → `lib/services/farming/README.md`
- `gathering` → `lib/services/gathering/README.md`
- `events` → `lib/services/events/README.md`
- `telemetry` → `lib/services/telemetry/README.md`
- `inventory` → `lib/services/inventory/README.md`

## Bridge policy

- Only designated bridge files may import legacy `domains/*`.
- All other service files should remain domain-agnostic and use contracts/public service entrypoints.

## Module installer pattern

- `lib/modules/*` installers are now standardized through
  `lib/modules/create_service_module_installer.js`.
- Modules should remain thin delegates that only:
  - evaluate runtime guards/policy checks,
  - call service entrypoints from `lib/services/*`, and
  - return service-owned disposables/resources.
- Keep feature behavior in services; avoid adding new feature logic directly in modules.
