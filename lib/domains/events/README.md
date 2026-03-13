# Events Domain

## Ownership

Runtime event listeners, event task emission, join flow, and code-presence signaling.

## Public API

Import from `./index.js`.

- `broadcastCodeLoaded`
- `createEventTaskEmitter`, `isJoinableEvent`, `isEventLive`
- `joinFirstActiveEvent`
- `onCharacter`, `onGame`, `waitForCharacterEvent`, `waitForCm`, `waitForCmBatch`, `installGlobalRuntimeListeners`, `stopGlobalRuntimeListeners`

## Dependency edges

- Used by most domains for async/game event coordination.
- Connects runtime lifecycle with domain behaviors.

## Anti-patterns

- Don’t register duplicate listeners in multiple domains without centralized teardown.
- Don’t bypass wait helpers when deterministic CM/event waits are required.
