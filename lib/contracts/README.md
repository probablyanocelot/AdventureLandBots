# Contracts

Contract layer for service boundaries.

## Purpose

- Define service-facing APIs and payload shapes.
- Provide runtime validation helpers for migration safety.
- Keep interfaces stable while service internals evolve.

## Rules

- No gameplay logic in contracts.
- No service implementation imports.
- Keep files small and domain-specific.

## Current contracts

- `orchestrator_api.js`
- `party_api.js`
- `cm_api.js`
- `combat_api.js`
- `events_api.js`
- `farming_api.js`
- `merchant_api.js`
