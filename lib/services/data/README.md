# Data Service

This service exposes merchant data lists and lookup tables used by other services.

## Public Surface

- `lib/services/data/index.js`

## Exports

- `itemsToBuy`
- `shinyBuyBlackList`
- `sellList`
- `noUpgradeList`
- `upgradeList`
- `highUpgradeList`
- `compoundList`
- `noExchange`

## Purpose

Keep the merchant-related list data centralized in one service boundary.
The `index.js` entrypoint merges the submodule exports for consumers.
