# Inventory Service

## Public API

Exported from `lib/services/inventory/index.js`:

- `installChestLooter({ intervalMs, seenSet })`
- `getChests()`
- `lootChest(id)`

## Ownership

- Character/runtime callers should consume chest looting and chest state through this service entrypoint.
- Do not import inventory runtime helpers directly from domains in new runtime code.
