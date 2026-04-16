# Example Micro-Scaffold

This folder contains a minimal example of how the template areas map into a real project structure.
The purpose is to show one concrete implementation for each high-level template in `docs/templates-contrib/`.

Example content:

- `lib/contracts/party.js` — contract definition for a `party.join` feature.
- `lib/services/party/index.js` — service owning feature behavior and boundary logic.
- `lib/modules/party.js` — thin runtime adapter that wires game events to the service.
- `lib/bootstrap/index.js` — root bootstrap that composes service and module wiring.
- `agentic/notify-external.js` — external tie-in example that consumes the core service environment.
- `workflow-example.md` — example workflow for contributing a new feature.
