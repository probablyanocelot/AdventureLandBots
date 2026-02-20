# tasks/

Task coordination helpers for orchestrated behavior.

## Files

- `event_tasks.js`: Event task emitter. Watches game event announcements and `parent.S` state to trigger start/end callbacks.

## How it works

- Used by `lib/orchestrator.js` to coordinate joining events and managing task lifecycle.
