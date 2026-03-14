# Gathering Domain

## Ownership

Merchant gather behavior, gather FSM state transitions, and NPC market-buy helpers.

## Public API

Import from `./index.js`.

- `createMerchantBehavior`
- `MerchantGatherFsm`
- `buyFromPonty` (`ponty_buy.js`)
- `buyFromGoblin2` (`goblin_buy.js`, currently staged for future refactor/integration)
- Buying lists/rules (`buying_rules.js`)

## Dependency edges

- Depends on inventory state and movement APIs.
- Consumed by merchant runtime/modules.

## Anti-patterns

- Don’t embed merchant gather state in unrelated modules.
- Don’t duplicate FSM transition logic outside `merchant_gather_fsm.js`.
