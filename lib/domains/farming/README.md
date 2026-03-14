# Farming Domain

## Ownership

No-event farming selection logic, monsterhunt state inspection, role signature generation, and mage chain helpers.

## Public API

Import from `./index.js`.

- Character registry: `getKnownCharacters`, `resolveCharacterName`, `isKnownCharacterName`, `getKnownOnlineNames`, `listOfflineFarmerNamesByType`, `isCharacterOnline`
- Monsterhunt state: `getMonsterhuntStateForName`, `getMonsterhuntTarget`, `getMonsterhuntTargetForName`, `needsMonsterhuntTurnIn`, `needsMonsterhuntTurnInForName`, `isNameHoldingAggroOfType`
- Chain mage: `requestMageMagiport`, `waitForMageMagiportResult`, `stopCharacterSafe`, `ensureChainMageRunning`
- Signature: `assignmentSignature` (+ quantizers)
- Selection: `getMonsterStats`, `selectPair`, `selectThree`, `selectBurst`, `chooseLeader`, `pickRoleName`, `buildAvailableByClass`, `determineAssignment`, `selectWorldFarmers`, `listFarmersByPreference`

## Dependency edges

- Depends on `party`, `events`, `shared/time`, `config/index.js`, and roster helpers.
- Primary consumer is `al_farming_config.js` orchestration loop.

## Anti-patterns

- Don’t add orchestration loops into these modules; keep them helper-oriented.
- Don’t import `al_farming_config.js` back into farming submodules (avoid cycles).
