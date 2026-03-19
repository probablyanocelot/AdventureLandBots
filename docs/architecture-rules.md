# Architecture Rules

## Layering

- `lib/runtime/*` orchestrates startup and module lifecycle.
- `lib/characters/*` should remain thin (composition and class-specific glue).
- `lib/domains/*` owns behavior/state logic.
- `lib/modules/*` are install adapters exposing `install(ctx)`.
- `lib/infra/*` wraps direct game globals when feasible.

## Import guidance

- Prefer domain imports over root legacy paths.
- Avoid adding new root-level compatibility shims.
- Keep cross-domain imports minimal and explicit.
- `lib/modules/*` must delegate feature behavior to `lib/services/*` and consume services through `lib/services/<service>/index.js`.
- `lib/modules/*` should not import `lib/domains/*` or direct runtime implementations.

## Module contract

Each runtime module should export:

- `install(ctx)` as primary entry
- a disposable resource when active (`stop`, `dispose`, `Symbol.dispose`)

## Lifecycle/disposal

- New timers/listeners must have deterministic teardown.
- If subclass `stop()` exists, call `super.stop()` to clean base services.

## Documentation standards

For key files, include short header notes covering:

- purpose
- primary inputs
- side effects
- cleanup/disposal behavior
