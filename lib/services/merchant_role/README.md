# Merchant-Role Service

## Public API

Exported from `lib/services/merchant_role/index.js`:

- `createToolProvisioningService()`
- `createBankCraftingService()` (bank-aware retrieval + recipe-aware crafting)
- `createUnpackSupportService()` (delegates to CM unpack requester)
- `TOOL_NAMES`

## Ownership

- Non-merchant-gated "merchant-role" utilities live here (tool provisioning, recipe-aware bank crafting, and unpack requester delegation).
- Merchant-only behaviors remain in `lib/services/merchant` (and `lib/services/merchant/gathering`).

## Boundary model

### Ingested inputs (consumer side)

- `createToolProvisioningService()` returns a lifecycle-managed tool provisioning helper.
- Producers: any character/service that needs to ensure gather tools.
- `createBankCraftingService()` consumes `cfg.merchantRole.crafting` config:
  - `enabled`
  - `includeBankInCraftability`
  - `includeAllGameRecipes`
  - `recipeNames`
  - `recipeTargets` (`[{ name, minHave }]`)

### Produced outputs (producer side)

- `checkForTools()` returns `{ boughtRod, boughtPickaxe }`.
- Consumers: merchant or non-merchant task runners.
- `getKnownRecipes()` returns known recipe descriptors with recipe metadata.
- `getCraftableRecipes()` returns craftability report (`canCraft`, `craftableTimes`, per-input availability/missing).
- `getConfiguredRecipeTargets()` returns normalized config targets.

### Config-driven crafting behavior

- Gather tools (`rod`, `pickaxe`) are still auto-retrieved/crafted when missing.
- Configured recipe targets are crafted only when owned quantity is below `minHave`.
- Craftability can include bank stock via `includeBankInCraftability`.
