# Contribution Workflow Example

This example shows the lifecycle for adding a small new feature using the repository templates.

1. Identify the target area.
   - This example adds a new feature under `party`.

2. Add the contract.
   - `lib/contracts/party.js`
   - Define `PartyCommand` and `PartyEvent` shapes.

3. Add the service.
   - `lib/services/party/index.js`
   - Implement feature behavior and expose `setup()` / `teardown()`.

4. Add the module.
   - `lib/modules/party.js`
   - Wire runtime events to the service and consume service outputs.

5. Add bootstrap wiring.
   - `lib/bootstrap/index.js`
   - Compose the service and module using runtime dependencies.

6. Add an external tie-in.
   - `agentic/notify-external.js`
   - Keep integration logic outside core runtime.

7. Verify and document.
   - Update docs if new boundary behavior is introduced.
   - Run any repository checks available.
