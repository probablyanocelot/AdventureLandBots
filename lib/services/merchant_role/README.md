# Merchant-Role Service

## Public API

Exported from `lib/services/merchant_role/index.js`:

- `createToolProvisioningService()`
- `createBankCraftingService()` (bank-aware tool retrieval + optional crafting)
- `createUnpackSupportService()` (delegates to CM unpack requester)
- `TOOL_NAMES`

## Ownership

- Non-merchant-gated "merchant-role" utilities live here (tool provisioning, bank-aware tool retrieval/crafting, and unpack requester delegation).
- Merchant-only behaviors remain in `lib/services/merchant` (and `lib/services/merchant/gathering`).

## Boundary model

### Ingested inputs (consumer side)

- `createToolProvisioningService()` returns a lifecycle-managed tool provisioning helper.
- Producers: any character/service that needs to ensure gather tools.

### Produced outputs (producer side)

- `checkForTools()` returns `{ boughtRod, boughtPickaxe }`.
- Consumers: merchant or non-merchant task runners.
