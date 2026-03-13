# Lib Restructure Plan + Handoff Guide

Purpose: keep context-window usage low by loading only the minimum required files during refactor and future maintenance.

## Scope

- Target folder: `AdventureLandBots/lib/` only.
- Goals:
  1. Split monolithic files into focused modules.
  2. Keep domain folders cohesive and shallow.
  3. Add explicit entrypoints (`index.js`) per domain.
  4. Document dependencies and read-order for low-context workflows.

## Current Hotspots (size/coupling)

Prioritize these first (largest/highest coupling):

1. `al_farming_config.js` (~2200 lines; orchestration + selection + CM + loop state)
2. `domains/combat/standard_combat.js`
3. `client_bootstrap.js`
4. `al_config.js`

## Refactor Strategy (safe, incremental)

### Phase 1 — Non-breaking structure first

- Add `index.js` entrypoints for each domain:
  - `domains/cm/index.js`
  - `domains/combat/index.js`
  - `domains/events/index.js`
  - `domains/gathering/index.js`
  - `domains/inventory/index.js`
  - `domains/movement/index.js`
  - `domains/party/index.js`
  - `domains/state/index.js`
- Keep all existing direct imports working (no path removals yet).

### Phase 2 — Split `al_farming_config.js`

Extract into a shallow domain package:

- `domains/farming/selection.js`
  - assignment/party composition logic
  - `buildAvailableByClass`, `determineAssignment`, etc.
- `domains/farming/monsterhunt_state.js`
  - monsterhunt state getters and target helpers
- `domains/farming/chain_mage.js`
  - magiport chain helpers and swap guards
- `domains/farming/signature.js`
  - assignment signature + quantization
- `domains/farming/character_registry.js`
  - known character resolution/online/offline helpers
- `domains/farming/index.js`
  - public exports only

Then reduce `al_farming_config.js` to orchestration wiring + loop control.

### Phase 3 — Docs for minimal-context reads

- Update `lib/README.md` with:
  - “If changing X, read Y files only” map.
- Add `README.md` per domain with:
  - ownership
  - public API
  - dependency edges
  - anti-patterns (what not to import directly)

### Phase 4 — Optional import cleanup

- Migrate consumers to domain entrypoints (`domains/*/index.js`).
- Keep compatibility exports while migrating.

## Context Budget Rules

Load files in this order and stop early when possible:

1. `lib/RESTRUCTURE_PLAN_HANDOFF.md` (this file)
2. target domain `README.md`
3. target domain `index.js`
4. only the concrete module being changed
5. caller module(s) only if integration is required

Avoid loading unrelated large files (`gui/*`, `unused/*`) unless task explicitly needs them.

## Handoff Template (copy/paste)

Use this at session end:

- **Objective:**
- **Completed this session:**
- **Files touched:**
- **Behavior preserved checks:**
- **Known risks / deferred items:**
- **Next smallest safe step:**
- **Minimal files next session should load:**

## Suggested Next Small Step

1. Add all domain `index.js` barrel files.
2. Add `domains/farming/selection.js` and move pure selection helpers from `al_farming_config.js`.
3. Replace moved code in `al_farming_config.js` with imports from `domains/farming/selection.js`.
4. Run lint/errors check.

## Guardrails

- No deep nesting unless it reduces coupling.
- Keep one responsibility per file.
- Preserve runtime behavior before optimizing style.
- Prefer additive changes first (new modules + re-exports), destructive moves later.
