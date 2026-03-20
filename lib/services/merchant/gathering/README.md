# Merchant Gathering Service

## Public API

Exported from `lib/services/merchant/gathering/index.js`:

- `MerchantGatherFsm`
- `createMerchantBehavior`
- `GatherTaskFsm`
- `createGatherFsm`
- `buyFromPonty`
- `buying_rules` exports (`itemsToBuy`, `shinyBlackList`, `buyScrolls`)

## Ownership

- Merchant-only gathering routines live here.
- Non-merchant "merchant-role" utilities (tool provisioning, unpacking) live in `lib/services/merchant_role`.
- Character/runtime callers should not import legacy gathering paths directly.
