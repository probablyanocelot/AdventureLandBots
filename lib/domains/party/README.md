# Party Domain

## Ownership

Party membership/relationship actions, active roster views, and character swap flows.

## Public API

Import from `./index.js`.

- `is_friendly`, `installAutoParty`, `getActiveCharacters`, `getActiveTypeCounts`, `getActiveNames`
- `setCharacterAction`, `clearCharacterAction`, `partyInvite`, `partyAccept`, `partyLeave`
- `getActiveStateMap`, `isRunningState`, `pickSubOut`, `waitForCharacterReady`, `ensureCharacterRunningBySwap`, `installPriestSwap`

## Dependency edges

- Core dependency for farming orchestration and priest/mage swap behaviors.
- Interacts with CM domain for role coordination.

## Anti-patterns

- Don’t duplicate active-party detection in other domains.
- Don’t call swap internals directly when `ensureCharacterRunningBySwap` is sufficient.
