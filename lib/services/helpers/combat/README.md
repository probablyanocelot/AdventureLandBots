# helper-combat

Service-owned combat utility helpers shared across combat flows.

## Public API

- `dbg(cfg, key, message, data?, cooldownMs?)`
- `stopSmartMove({ cfg, reason, data })`
- `isNearPoint(point, threshold?)`
- `normalizeNumber(value, fallback?)`
- `normalizeFrequency(value)`
- `getOwnCharacterNamesSet()`
- `getPlayerEntitySafe(name)`
- `spreadFromPartyIfStacked({ cfg, huntGroupNames })`
