# Gathering Service

## Public API

Exported from `lib/services/gathering/index.js`:

- `MerchantGatherFsm`
- `createMerchantBehavior`
- `buyFromPonty`

## Ownership

- Merchant runtime should consume gather behavior via this service entrypoint.
- Character/runtime callers should not import `lib/domains/gathering/index.js` directly.
