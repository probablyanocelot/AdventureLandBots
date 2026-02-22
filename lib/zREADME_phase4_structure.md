# Phase 4 structure map (state / party / combat)

This phase promotes state, party, and combat logic into domain-owned modules.
Legacy root files remain as compatibility shims.

## Domain-owned modules

- `domains/state/flags.js`
- `domains/party/party.js`
- `domains/party/swap.js`
- `domains/party/priest_swap.js`
- `domains/combat/skills.js`
- `domains/combat/targeting.js`
- `domains/combat/event_combat.js`
- `domains/combat/standard_combat.js`

## Legacy shim mapping

- `st_bool.js` -> `domains/state/flags.js`
- `group_party.js` -> `domains/party/party.js`
- `group_swap.js` -> `domains/party/swap.js`
- `group_priest_swap.js` -> `domains/party/priest_swap.js`
- `combat_skills.js` -> `domains/combat/skills.js`
- `combat_targeting.js` -> `domains/combat/targeting.js`
- `combat_event.js` -> `domains/combat/event_combat.js`
- `combat_standard.js` -> `domains/combat/standard_combat.js`

## Notes

- Active imports should prefer `domains/*` paths.
- Root shims are preserved to avoid breaking legacy/unused callers.
