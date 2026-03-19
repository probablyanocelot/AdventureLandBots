# Gathering Domain

## Ownership

Domain gathers shared rules/helpers. Merchant runtime behavior ownership moved to `lib/services/gathering/*`.

## Public API

Domain exports shared helper/rules modules (for service composition):

- `buyFromGoblin2` (`goblin_buy.js`, currently staged for future refactor/integration)
- Buying lists/rules (`buying_rules.js`)

## Dependency edges

- Consumed by `lib/services/gathering/*`.

## Anti-patterns

- Don’t embed merchant gather state in unrelated modules.
- Don’t move merchant runtime loops back into domains; keep runtime ownership in services.
