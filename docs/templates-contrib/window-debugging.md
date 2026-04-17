# Window Debugging and Runtime Hooks

This document explains how to safely expose a minimal debugging surface from the AdventureLandBots client runtime so you can test functions, update config, and inspect bot state from the browser/Electron console.

## Why not expose everything on `window`

`window` is the global namespace for the page. Putting too much there:

- increases collision risk with other scripts
- makes debugging harder when random globals are added or overwritten
- leaks internal implementation details that should remain private

Instead, expose only a small, intentional runtime API.

## What is already exposed today

The bootstrap loader already exposes a few useful handles:

- `window.AL_BOTS` — entry object loaded from `lib/al_main.js`
- `window.bot` — live getter for the currently running bot instance
- `window.main` — the startup `main()` function
- `window.AL_BOTS_CONFIG` — config object used by runtime overrides

Also useful built-in runtime helpers:

- `window.farm(monster)`
- `window.farmMe(monster)`
- `window.clearFarm()`
- `window.iFarm` / `window.weFarm` — supported override hooks read by `lib/config/runtime_overrides.js`

## Recommended approach for testing helper functions

### Option 1: use existing global handles

If your helper is reachable via the running bot instance or runtime scope, call it from console:

```js
window.bot?.someMethod?.("arg");
window.AL_BOTS?.runtimeScope;
window.AL_BOTS?.orchestrator;
```

This keeps the surface small and avoids adding new globals just for debugging.

### Option 2: add a small explicit debug hook

If the helper is deep inside a service and not already exposed, add one deliberate helper property.

Example in `lib/services/helpers/data/monster_ratio.js`:

```js
const { calculateMonsterRatio } = require("./monster_ratio_impl.js");

if (typeof window !== "undefined") {
  window.AL_BOTS_DEBUG = window.AL_BOTS_DEBUG || {};
  window.AL_BOTS_DEBUG.calculateMonsterRatio = (monster) =>
    calculateMonsterRatio(monster);
}

module.exports = {
  calculateMonsterRatio,
};
```

Then in the console:

```js
window.AL_BOTS_DEBUG.calculateMonsterRatio("kingbeetle");
```

## Best practices

- use a single debug namespace like `window.AL_BOTS_DEBUG`
- avoid adding module internals directly to `window`
- expose only the functions you need for testing or runtime tweaks
- prefer reading config from `window.AL_BOTS_CONFIG` instead of storing arbitrary state globally

## Live config editing

For on-the-fly config tweaks, update `window.AL_BOTS_CONFIG` or supported helper hooks instead of writing app internals to `window`:

```js
window.AL_BOTS_CONFIG = {
  ...window.AL_BOTS_CONFIG,
  someFeature: {
    enabled: true,
    threshold: 42,
  },
};
```

If the runtime does not automatically re-read the config, add a small validator or reload helper to the exposed debug surface.

## Summary

- do not expose all code to `window`
- use existing runtime objects when available
- add a tiny explicit debug hook when needed
- keep the global surface minimal and intentional
- prefer `window.AL_BOTS_DEBUG` and `window.AL_BOTS_CONFIG`
