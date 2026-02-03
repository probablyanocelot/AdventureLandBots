# lib/

Core bot runtime and support library.

## Entry points

- `main.js`: Picks and starts the correct character class and installs shared routines.
- `loaded_in_client.js`: Remote loader + bootstrap for the in‑game iframe (proxied require).
- `orchestrator.js`: Event coordination and merchant assistance logic.
- `config.js`: Central configuration and runtime context helpers.

## Supporting modules

- `roster_stats.js`: Roster discovery and metadata utilities.
- `proxied_require.js`: Local compatibility layer for proxied loading.
- `test.js`: Scratch/testing utilities.

## Subdirectories

See README files inside each folder for deeper details.
