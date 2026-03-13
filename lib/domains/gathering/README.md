# Gathering Domain

## Ownership

Merchant gather behavior and gather FSM state transitions.

## Public API

Import from `./index.js`.

- `createMerchantBehavior`
- `MerchantGatherFsm`

## Dependency edges

- Depends on inventory state and movement APIs.
- Consumed by merchant runtime/modules.

## Anti-patterns

- Don’t embed merchant gather state in unrelated modules.
- Don’t duplicate FSM transition logic outside `merchant_gather_fsm.js`.
