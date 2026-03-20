# AdventureLandBots Copilot Instructions

## Scope-first workflow

When working on a service change, keep context intentionally narrow:

1. Service under construction (`lib/services/<service>/**`)
2. Service documentation (`lib/services/<service>/README.md`) before modifying implementation files
3. Shared contract surface (`lib/contracts/**`)
4. Receiving service public entrypoint only (for example `lib/services/<receiver>/index.js`)

Always confirm the service's "Allowed legacy import path" in its local README before changing bridge imports.

Avoid reading or editing unrelated domains/services unless the user explicitly requests it.

## Architecture theme requirement (mandatory)

- Every new feature and every substantial feature refactor must be implemented as a service under `lib/services/<feature>/`.
- Feature behavior must not be introduced directly in `lib/modules/**` or root runtime files; those layers should only wire, install, or delegate.
- If a change starts in a non-service file and adds feature logic, extract that logic into a service in the same change.
- Each service must expose a public `index.js` entrypoint and keep service internals private.
- New cross-service behavior should be modeled through contracts and service entrypoints, not private file imports.

## Proxied loader runtime constraints (mandatory)

This repo is designed to run inside Adventure Land via `proxied_require`.

- Treat `lib/bootstrap/index.js` as the runtime bootstrap root, and `lib/al_main.js` as the required entry (exports `main`).
- Prefer `await require("./path.js")` for internal modules; avoid ESM-only syntax that assumes bundling.
- Guard Node/Electron-only modules behind `window.require` checks; provide safe fallbacks when unavailable.
- Keep bootstrap logic thin: loader setup + environment wiring only. Feature behavior belongs in `lib/services/*`.
- When changing loader behavior, keep `proxied_require` async evaluation semantics (top-level `await`) intact.

## Root ↔ service interface contract (producer/consumer only)

Treat root runtime/module code and each service as boundary peers with explicit ports:

- **Ingest (consumer) ports**: what a service accepts from root/other services (commands, events, snapshots).
- **Produce (producer) ports**: what a service emits upward/outward (outcomes, intents, telemetry, follow-up events).

Rules:

- Expose only producer/consumer ports at boundaries; do not expose internals, helper methods, or mutable private state.
- Define port shapes in `lib/contracts/**` (names, payload schema, validation expectations).
- Root layers (`lib/runtime/**`, `lib/modules/**`, character entry scripts) may publish/subscribe and route, but must not contain feature decision logic.
- `lib/domains/**` has been removed; do not reintroduce domain-mediated orchestration.
- Any `any:any` interaction must still resolve to named producer/consumer ports with explicit payloads.

Scale/delegation requirement:

- Every boundary contract must make ownership obvious:
  - **ingested inputs** (who can send what, when, and in what shape)
  - **produced outputs** (what is emitted, for whom, and expected handling)
- Design outputs so they can be fanned out to multiple consumers without changing producer internals.
- Design inputs so producers can be swapped/delegated (single producer, multi-producer, brokered producer) without changing consumer internals.

## Config and setup readability requirements

- Keep config modular and feature-local (`lib/services/<feature>/config/*` preferred).
- Split config by concern (flags, thresholds, cadence, routing) instead of one large object.
- Use clear key names and explicit defaults; avoid opaque abbreviations unless already standardized.
- Validate setup-time config before wiring timers/listeners/publishers.
- Setup flows must read top-down and be easy to audit: validate → wire ingest ports → start producers.
- Setup/teardown behavior must be symmetric and documented where installed.

## Workspace quick map

Prefer opening the narrow workspace that matches the service under construction:

- `service-orchestrator.code-workspace` → orchestrator
- `service-party.code-workspace` → party
- `service-cm.code-workspace` → cm
- `service-combat.code-workspace` → combat
- `service-farming.code-workspace` → farming
- `service-events.code-workspace` → events

## Layer boundaries

- `lib/contracts/**` defines interfaces, validation helpers, and message shapes only.
- `lib/services/**` contains service implementations and service-local middleware.
- `lib/modules/**` are runtime installers/adapters (`install(ctx)` + disposable resource).
- `lib/domains/**` has been removed. Do not add new domain paths.

For new work, place net-new feature logic in `lib/services/**`.

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
- During migration, prefer moving entire feature slices into services instead of adding new domain-level code paths.

## PR hygiene

For each change, include:

- files changed
- rationale
- rollback path
- tuning knobs (if behavior changed)
