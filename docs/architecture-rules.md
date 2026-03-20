# Architecture Rules

## Layering

- `lib/runtime/*` orchestrates startup and module lifecycle.
- `lib/characters/*` should remain thin (composition and class-specific glue).
- `lib/services/*` owns behavior/state logic.
- `lib/modules/*` are install adapters exposing `install(ctx)`.
- `lib/infra/*` wraps direct game globals when feasible.

## Root ↔ service boundaries

- Root/module layers coordinate only; services own feature decisions.
- Boundary traffic must be producer/consumer based, with named contracts for all ingest/produce ports.
- For each boundary segment, documentation must show:
  - ingested inputs (source producer(s), payload contract)
  - produced outputs (target consumer(s), payload contract)
- Avoid implicit `any:any` wiring; normalize to explicit port names and schemas.

## Import guidance

- Prefer service imports over root legacy paths.
- Avoid adding new root-level compatibility shims.
- Keep cross-service imports minimal and explicit.
- `lib/modules/*` must delegate feature behavior to `lib/services/*` and consume services through `lib/services/<service>/index.js`.
- `lib/modules/*` should not import removed legacy paths or direct runtime implementations.

## Module contract

Each runtime module should export:

- `install(ctx)` as primary entry
- a disposable resource when active (`stop`, `dispose`, `Symbol.dispose`)

Setup behavior standards:

- `install(ctx)` must be idempotent and safe to call repeatedly.
- Setup order must be explicit and readable (validate config → wire subscriptions → start workers).
- Side effects must be declared near setup entrypoints (timers, listeners, outbound publishers).
- Teardown must mirror setup responsibilities one-to-one.

## Config modularity and readability

- Keep configuration close to feature ownership (`lib/services/<feature>/config/*` or equivalent).
- Split large configs by concern (thresholds, cadence, routing, feature flags) instead of one monolith.
- Use stable, human-readable keys and avoid overloaded abbreviations.
- Prefer explicit defaults with light inline intent notes for non-obvious values.
- Validate config shape at the boundary before use; fail fast on invalid setup.
- Keep gameplay-critical values config-driven and separated from algorithmic flow.

Recommended per-service config doc snippet:

- `key`: semantic meaning
- `default`: baseline value
- `range/options`: allowed bounds
- `used-by`: ingest/produce segment(s) affected
- `impact`: expected behavior when tuned

## Lifecycle/disposal

- New timers/listeners must have deterministic teardown.
- If subclass `stop()` exists, call `super.stop()` to clean base services.

## Documentation standards

For key files, include short header notes covering:

- purpose
- primary inputs
- side effects
- cleanup/disposal behavior

For service creation/refactors, start from:

- `docs/templates/service-boundary-template.md`

Required doc outcomes per service:

- all boundary segments list ingested inputs and produced outputs
- config keys/defaults/ranges are documented by concern
- setup and teardown steps are explicit, symmetric, and idempotent
