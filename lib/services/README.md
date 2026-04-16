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
- `merchant` service owns merchant runtime orchestration and composes merchant-gathering + merchant-role boundaries.
- `merchant_role` service owns non-ctype merchant-role utilities (tool provisioning today; bank crafting/unpacking later).
- `server-events` service is service-native (`join event`, no domain bridge).
- `telemetry` service is service-native (`telemetry.module.js` -> `services/telemetry`).
- `inventory` service owns runtime chest-loot helpers used by characters/runtime.
- `helper-movement` service owns generic movement/request-throttling helpers.
- `helper-targeting` service owns generic target selection + engagement helpers.
- `helper-combat` service owns shared combat utility helpers.
- `helper-data-structures` service owns generic data-structure manipulation helpers.
- `helper-time` service owns generic time utilities.
- `helper-roster` service owns generic roster metadata helpers.
- `helpers` bundle exposes a swiss-army helper entrypoint.
- Additional services can be migrated incrementally.

## Service docs

- `orchestrator` → `lib/services/orchestrator/README.md`
- `party` → `lib/services/party/README.md`
- `cm` → `lib/services/cm/README.md`
- `combat` → `lib/services/combat/README.md`
- `farming` → `lib/services/farming/README.md`
- `merchant` → `lib/services/merchant/README.md`
- `merchant_role` → `lib/services/merchant_role/README.md`
- `events` → `lib/services/events/README.md`
- `telemetry` → `lib/services/telemetry/README.md`
- `inventory` → `lib/services/inventory/README.md`
- `helper-movement` → `lib/services/helper-movement/README.md`
- `helper-targeting` → `lib/services/helper-targeting/README.md`
- `helper-combat` → `lib/services/helper-combat/README.md`
- `helper-data-structures` → `lib/services/helper-data-structures/README.md`
- `helper-time` → `lib/services/helper-time/README.md`
- `helper-roster` → `lib/services/helper-roster/README.md`
- `helpers` → `lib/services/helpers/README.md`

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
- Prefer explicit module-facing helper names in services (`*ModuleService`) for
  APIs consumed directly by `lib/modules/*`.

## Helper-category policy

- Any non-feature-specific helper logic must live under `lib/services/helper-*`.
- New runtime/service code should import helper-category services directly.
- If a service needs multiple helper categories, prefer `lib/services/helpers/index.js`.
