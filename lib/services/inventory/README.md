# Inventory Service

## Public API

Exported from `lib/services/inventory/index.js`:

- `installChestLooter({ intervalMs, seenSet })`
- `getChests()`
- `lootChest(id)`
- `createMerchantInventoryService()`

## Ownership

- Character/runtime callers should consume chest looting and chest state through this service entrypoint.
- Merchant orchestration should consume tool checks through `createMerchantInventoryService().checkForTools()`.
- Do not import inventory runtime helpers directly from domains in new runtime code.
