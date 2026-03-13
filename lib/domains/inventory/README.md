# Inventory Domain

## Ownership

Chest looting actions and inventory free-slot/threshold state helpers.

## Public API

Import from `./index.js`.

- `getChests`, `lootChest`, `installChestLooter`
- `getFreeSlots`, `hasAtMostFreeSlots`

## Dependency edges

- Used by combat, gathering, and CM request flows.
- Depends on game item/chest globals.

## Anti-patterns

- Don’t hardcode inventory thresholds in unrelated files.
- Don’t bypass inventory helpers for free-slot checks.
