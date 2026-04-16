# Deprecated / Removed Paths

The following root-level compatibility shim files were removed. Use direct service/character/runtime paths instead.

## Removed shims

- `lib/class_bot.js`
- `lib/class_mage.js`
- `lib/class_merchant.js`
- `lib/class_warrior.js`
- `lib/class_ranger.js`
- `lib/class_priest.js`
- `lib/class_rogue.js`
- `lib/class_paladin.js`
- `lib/cm_magiport.js`
- `lib/cm_sustain.js`
- `lib/cm_unpack.js`
- `lib/combat_event.js`
- `lib/combat_skills.js`
- `lib/combat_standard.js`
- `lib/combat_targeting.js`
- `lib/event_listeners.js`
- `lib/event_tasks.js`
- `lib/group_party.js`
- `lib/group_swap.js`
- `lib/group_priest_swap.js`
- `lib/st_bool.js`
- `lib/st_smart_move.js`

## Replacement patterns

- `class_*` -> `lib/characters/*_character.js`
- `cm_*` -> `lib/services/cm/*`
- `combat_*` -> `lib/services/combat/*`
- `event_*` -> `lib/services/server-events/*`
- `group_*` -> `lib/services/party/*`
- `st_bool` -> `lib/services/state/flags.js`
- `st_smart_move` -> `lib/services/movement/move_manager.js`
