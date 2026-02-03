# routines/

Reusable task routines used across characters.

## Files

- `magiport.js`: Magiport orchestration helpers (prepare/ack, cooldown checks, optional skip if nearby, joinable‑event awareness).
- `unpack_requester.js`: Farmer‑side inventory management that requests a merchant to come unpack items when inventory is low.

## How it works

- Installed by `main.js` on non‑merchant characters (requester) or by orchestrator/merchant flows.
