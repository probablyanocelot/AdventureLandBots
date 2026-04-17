# helpers

## Purpose

Swiss-army entrypoint that bundles helper-category services for convenient access.

## Public API

Exported from `lib/services/helpers/index.js`:

- `movement` → helpers/movement service
- `targeting` → helpers/targeting service
- `combat` → helpers/combat service
- `dataStructures` → helpers/data-structures service
- `time` → helpers/time service
- `roster` → helpers/roster service

## Usage

Prefer service-specific entrypoints when you only need a single helper category.
Use this bundle when a service needs multiple helper categories and you want a single import.
