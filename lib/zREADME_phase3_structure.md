# Phase 3 structure map (domain-first + shims)

## Source-of-truth modules

- Events listener hub: `lib/domains/events/listeners.js`
- Event task emitter: `lib/domains/events/event_task_emitter.js`
- Movement manager: `lib/domains/movement/move_manager.js`
- CM magiport flow: `lib/domains/cm/magiport.js`
- CM unpack requester: `lib/domains/cm/unpack_requester.js`
- CM sustain flow: `lib/domains/cm/sustain.js`

## Compatibility shims (legacy import paths)

- `lib/event_listeners.js` -> `lib/domains/events/listeners.js`
- `lib/event_tasks.js` -> `lib/domains/events/event_task_emitter.js`
- `lib/st_smart_move.js` -> `lib/domains/movement/move_manager.js`
- `lib/cm_magiport.js` -> `lib/domains/cm/magiport.js`
- `lib/cm_unpack.js` -> `lib/domains/cm/unpack_requester.js`
- `lib/cm_sustain.js` -> `lib/domains/cm/sustain.js`

## Active runtime/module consumers now pointing to domains

- `lib/runtime/character_runtime.js`
- `lib/class_orchestrator.js`
- `lib/al_farming_config.js`
- `lib/modules/sustain.module.js`
- `lib/modules/unpack_requester.module.js`
- `lib/characters/base_character.js`
- `lib/characters/mage_character.js`
- `lib/group_swap.js`

## Notes

- Keep shims for backward compatibility with older scripts and ad-hoc imports.
- New code should import domain modules directly.
- If a module is promoted to `domains/*`, convert legacy root file to a one-line shim.
