# AdventureLandBots Copilot Instructions

## Scope-first workflow

When working on a service change, keep context intentionally narrow:

1. Service under construction (`lib/services/<service>/**`)
2. Service documentation (`lib/services/<service>/README.md`) before modifying implementation files
3. Shared contract surface (`lib/contracts/**`)
4. Receiving service public entrypoint only (for example `lib/services/<receiver>/index.js`)

Always confirm the service's "Allowed legacy import path" in its local README before changing bridge imports.

Avoid reading or editing unrelated domains/services unless the user explicitly requests it.

## Layer boundaries

- `lib/contracts/**` defines interfaces, validation helpers, and message shapes only.
- `lib/services/**` contains service implementations and service-local middleware.
- `lib/modules/**` are runtime installers/adapters (`install(ctx)` + disposable resource).
- `lib/domains/**` remains legacy behavior ownership during migration.

## Import rules

- Service-to-service imports must target public entrypoints (`lib/services/<name>/index.js`) only.
- Do not import another service's private internals.
- Prefer contracts + dependency injection over direct cross-service calls.
- Do not add new legacy bridge imports unless the service README and lint bridge policy are updated together.

## Migration rules

- Migrate one service at a time.
- Preserve stop/dispose behavior on every migration step.
- Add feature flags for strategy changes that affect many characters.
- Keep gameplay-critical thresholds config-driven.

## PR hygiene

For each change, include:

- files changed
- rationale
- rollback path
- tuning knobs (if behavior changed)
