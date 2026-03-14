# CM Domain

## Ownership

Character-message command handling, mage magiport service flow, unpack requests, and upkeep installers.

## Public API

Import from `./index.js`.

- `installBaseCmCommands`
- `travelForTask`, `installMageMagiportService`
- `magiportTargets`
- `installUnpackRequester`
- `installUpkeep`

Magiport expectation/auto-accept state is owned by `magiport_accept.js`.

## Dependency edges

- Depends on event listeners, party/swap behavior, and game globals via shared helpers.
- Consumers are typically runtime/module installers and orchestrator flows.

## Anti-patterns

- Don’t import deep internals across domains when `cm/index.js` can provide the API.
- Don’t duplicate CM command names in multiple files; keep command ownership singular.
