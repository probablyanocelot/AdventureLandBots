# runtime/

Runtime bootstrap and module orchestration flow for AdventureLandBots.

## Purpose

This document is intended for both humans and agents to understand the execution path from game bootstrap to running the character bot loop.

## Entrypoints

- `lib/bootstrap/index.js` — client bootstrap, proxied loader, telemetry/swap wiring.
- `lib/al_main.js` — runtime root that exposes and invokes `main()`.
- `lib/runtime/character_runtime.js` — character runtime orchestration and module policy execution.

## Execution flow

1. `lib/bootstrap/index.js` is loaded by the host environment.
2. It initializes diagnostics, telemetry helpers, swap routing, and `proxied_require`.
3. It loads `al_main.js`, extracts `main()`, and calls `await main()`.
4. `al_main.js` delegates to `bootCharacterRuntime()` in `lib/runtime/character_runtime.js`.
5. `bootCharacterRuntime()` creates a new `LifecycleScope` and disposes any previous runtime.
6. Global runtime listeners are installed via `services/events/index.js`.
7. Config and runtime context are loaded from `lib/config/index.js`.
8. A `moduleRegistry` is created with configured module installers and policies.
9. The `preBot` policy is started before character instantiation.
10. The current character type is resolved via `character.ctype` and `CLASS_REGISTRY`.
11. The class-specific constructor is loaded and instantiated.
12. The bot instance is registered into `runtimeScope` and `init()` is called if present.
13. A `postBot` policy is resolved and started based on character type and passive status.
14. The character bot loop runs via `bot.botLoop()` when available.
15. On shutdown or reload, the `LifecycleScope` disposes registered resources.

## Module policy semantics

- `lib/runtime/module_registry.js` maps module names to installers.
- Modules are grouped into policies:
  - `preBot`
  - `merchantPostBot`
  - `nonMerchantPostBot`
  - `passivePostBot`
- `postBot` is resolved at runtime according to `ctype` and whether the bot is passive.

## Service boundary rules

- `lib/modules/*` are installable glue layers only.
- `lib/services/*` contain real behavior implementations.
- `lib/runtime/*` owns orchestration and lifecycle management.
- Module installers are normalized through `lib/runtime/module_contract.js`.

## Why this is useful for an agent

An LLM agent can use this file as the canonical startup flow and wiring contract for the bot runtime, especially when reasoning about where to add or modify behavior.

Keep this file small, precise, and focused on runtime flow rather than feature details.
