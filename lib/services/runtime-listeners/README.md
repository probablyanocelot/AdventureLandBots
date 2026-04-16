# Runtime Listeners Service

## Purpose

This service owns generic runtime listener utilities for bots, including:

- `onCharacter(event, handler)`
- `onGame(event, handler)`
- `waitForCharacterEvent()` / `waitForCm()` / `waitForCmBatch()`
- global runtime listener install/uninstall helpers

It is intentionally separate from server-event behavior so that event lifecycle
logic does not also own listener plumbing.

## Public API

Exported from `lib/services/runtime-listeners/index.js`:

- `onCharacter(event, handler)`
- `onGame(event, handler)`
- `waitForCharacterEvent({ event, predicate, timeoutMs })`
- `waitForCm({ from, cmd, predicate, timeoutMs })`
- `waitForCmBatch({ expectedNames, taskId, cmd, timeoutMs })`
- `installGlobalRuntimeListeners()`
- `stopGlobalRuntimeListeners()`

## Usage

- `lib/services/server-events` may use these helpers for event-specific flows.
- other services should import `lib/services/runtime-listeners/index.js` directly
  when they need generic listener behavior.
- Do not import runtime listener implementation files directly from
  `lib/services/runtime-listeners/`.
