# Merchant Service

## Public API

Exported from `lib/services/merchant/index.js`:

- `createMerchantService({ home, gatherLoc, gatherOrder, gatherRepeatMs })`

The returned service contract is validated by `lib/contracts/merchant_api.js` and includes:

- `botLoop()`
- `start()`
- `stander()`
- `goGather(strGatherType)`
- `doVendorRuns()`
- `checkForTools()`
- `stopRoutine()`

## Boundary model

### Ingested inputs (consumer side)

- `createMerchantService` options payload:
  - `home: { map: string, x: number, y: number }`
  - `gatherLoc: { fishing: Location, mining: Location }`
  - `gatherOrder: string[]`
  - `gatherRepeatMs: number`
- Producers: character runtime (`lib/characters/merchant_character.js`).

### Produced outputs (producer side)

- Merchant behavior intents delegated to gathering service:
  - `goGather(strGatherType)`
  - `doVendorRuns()`
  - `stander()`
- Inventory maintenance outcomes delegated to inventory service:
  - `checkForTools() -> { boughtRod: boolean, boughtPickaxe: boolean }`
- Consumers: merchant character runtime (single consumer today; contract supports additional consumers without changing producer internals).

## Ownership

- Merchant orchestration lives in this service.
- Merchant-only gathering routines live in `services/merchant/gathering`.
- Merchant-role utilities (tool provisioning, future bank crafting/unpacking) live in `services/merchant_role`.
