# npcs/

NPC interaction routines.

## Files

- `ponty.js`: Handles secondhand/Ponty purchases using item lists from `lib/items/buying.js`.
- `goblin.js`: Goblin shop helper (if enabled by merchant logic).

## How it works

- Called by merchant behavior in `lib/characters/merchant.js` (e.g., vendor runs).
