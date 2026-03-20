# helpers

## Purpose

Swiss-army entrypoint that bundles helper-category services for convenient access.

## Public API

Exported from `lib/services/helpers/index.js`:

- `movement` → helper-movement service
- `targeting` → helper-targeting service
- `combat` → helper-combat service
- `dataStructures` → helper-data-structures service
- `time` → helper-time service
- `roster` → helper-roster service

## Usage

Prefer service-specific entrypoints when you only need a single helper category.
Use this bundle when a service needs multiple helper categories and you want a single import.
