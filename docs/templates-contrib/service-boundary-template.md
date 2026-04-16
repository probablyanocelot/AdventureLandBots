# Service Boundary Template

Use this template when creating or refactoring a service.

- Service path: `lib/services/<service>/`
- Public entrypoint: `lib/services/<service>/index.js`
- Contract path(s): `lib/contracts/<service>/*`
- Domain usage: `lib/domains/*` is removed and must not be reintroduced.

## 1) Service intent

- Service name:
- Purpose (one sentence):
- Feature flag(s) and rollback switch:
- Gameplay-critical thresholds (if any):

## 2) Boundary segments (producer/consumer)

Define each segment where root/modules/services interact with this service.

### Segment <name>

#### Ingested inputs (consumer side)

| Field                | Value                                       |
| -------------------- | ------------------------------------------- |
| Port name            | `<command/event/snapshot>`                  |
| Contract             | `<lib/contracts/...>`                       |
| Authorized producers | `<root module/service names>`               |
| Delivery mode        | `<sync\|async\|queued\|best-effort>`        |
| Validation           | `<shape/guard/range checks>`                |
| Idempotency strategy | `<dedupe key/cooldown/last-seen timestamp>` |
| Failure handling     | `<drop/retry/dead-letter/log>`              |

#### Produced outputs (producer side)

| Field                | Value                                        |
| -------------------- | -------------------------------------------- |
| Port name            | `<event/outcome/intent>`                     |
| Contract             | `<lib/contracts/...>`                        |
| Intended consumers   | `<single\|multi\|broadcast + names>`         |
| Delivery expectation | `<at-most-once\|at-least-once\|best-effort>` |
| Ordering expectation | `<none\|per-key\|global>`                    |
| Fan-out strategy     | `<pub-sub/router/multi-cast>`                |
| Failure handling     | `<backoff/retry/log/compensate>`             |

### Segment <name>

(Repeat as needed.)

## 3) any:any normalization map

List every loose interaction and the named port it becomes.

| Existing loose path | New named port | Contract              | Notes                        |
| ------------------- | -------------- | --------------------- | ---------------------------- |
| `<any:any source>`  | `<port name>`  | `<lib/contracts/...>` | `<delegation/fan-out notes>` |

## 4) Config structure (modular + human-readable)

Prefer `lib/services/<service>/config/*` and split by concern.

- `flags.js` (feature toggles, rollout gates)
- `thresholds.js` (combat/farming limits, safety bounds)
- `cadence.js` (tick rates, polling windows, cooldown defaults)
- `routing.js` (producer/consumer routing keys, channel names)

### Config index

| Key            | Default   | Range/Options      | Used by segment  | Impact              |
| -------------- | --------- | ------------------ | ---------------- | ------------------- |
| `<config.key>` | `<value>` | `<bounds/options>` | `<segment name>` | `<behavior impact>` |

Config rules:

- Keys must be descriptive and stable.
- Defaults must be explicit.
- Non-obvious values should include a short intent note.
- Validate config before installing listeners/timers/workers.

## 5) Setup and teardown flow (auditable)

Target order: validate config → wire ingest ports → start producers.

### Setup checklist

- [ ] Validate config/contracts at startup.
- [ ] Register ingest subscriptions/listeners.
- [ ] Start timers/workers/emitters.
- [ ] Emit startup telemetry/health status.

### Teardown checklist

- [ ] Stop timers/workers/emitters.
- [ ] Unsubscribe listeners.
- [ ] Flush/close buffers if present.
- [ ] Emit shutdown telemetry.

Idempotency rules:

- `install(ctx)` can be called repeatedly without duplicate side effects.
- `stop()` / `dispose()` can be called repeatedly without throwing.

## 6) Service-as-function posture (recommended)

Design services as function-first cores with side-effects at the edges.

- Keep core decision logic pure-ish and testable (input state + event -> decision/output intent).
- Keep adapters/effectors thin (publish, timers, game API I/O, persistence).
- Pass dependencies explicitly (clock, rng, transport, logger) instead of hidden globals.
- Use small composable functions for ingest normalization, decision, and output mapping.

Suggested shape:

- `create<Service>(deps, config)` -> `{ ingestX, ingestY, dispose }`
- `ingest*` methods return deterministic outcomes/intents where possible.
- Outbound side effects run via injected producer/effect ports.

## 7) Public API surface

Document only public ports and entrypoints.

| Surface           | Type                | Contract              | Notes                    |
| ----------------- | ------------------- | --------------------- | ------------------------ |
| `index.js` export | `<function/object>` | `<lib/contracts/...>` | `<no internals exposed>` |

## 8) Migration notes (dev-branch no-legacy)

- Removed legacy interfaces:
- New required interfaces for callers:
- Caller updates needed:
- Rollback path:

## 9) Validation notes

- Focused lint/checks run:
- Runtime verification done:
- Known risks / follow-ups:
