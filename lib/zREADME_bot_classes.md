# characters/

This folder contains the runtime character classes that drive each bot. Each class extends `BotCharacter` and is instantiated by `lib/main.js` based on `character.ctype`.

## How it works

- `main.js` picks the class for the current character type and constructs it.
- `BotCharacter` provides shared CM handlers, helper methods, and common safety hooks.
- Each class implements `init()` and `botLoop()` (where applicable) for per‑class behavior.

## Files

- `bot.js`: Base class with shared CM handling (magiport prep, task join), helpers, and auto‑loot. All character classes inherit from this.
- `mage.js`: Mage job handler for magiport tasks, including travel and CM response logic.
- `merchant.js`: Merchant automation (fishing/mining/vendor runs) and stand handling.
- `warrior.js`, `ranger.js`, `rogue.js`, `paladin.js`, `priest.js`: Lightweight class shells that mostly provide status/idle behavior and can be expanded with class‑specific logic.

## Key dependencies

- `lib/config.js` for shared config.
- `lib/routines/*` and `lib/farming/*` for shared behaviors.
- `lib/util/*` for timers, logging, and helper utilities.
