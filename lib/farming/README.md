# farming/

This folder contains combat and farming automation logic that runs across multiple classes.

## How it works

- `main.js` conditionally installs these routines based on config and character type.
- Routines are designed to be composable (event combat, no‑event farming, swap logic).

## Files

- `combat/event_combat.js`: Lightweight combat loop when inside joinable events (auto‑attack + movement).
- `combat/no_event_combat.js`: Combat execution helpers used by no‑event farming (targeting, attacks, movement).
- `no_event_farming.js`: Team role assignment and farming logic when no joinable events are active. Coordinates via CM, picks roles/targets, and delegates combat to `combat/no_event_combat.js`.
- `priest_swap.js`: Ensures a priest is running by swapping out another bot if needed.
- `magiport/accept.js`: Safe magiport auto‑accept logic (trusted mage + expectation window).

## Key dependencies

- `lib/routines/magiport.js` for event checks and magiport helpers.
- `lib/roster_stats.js` for character roster and metadata.
- `lib/util/*` for logging and time helpers.
