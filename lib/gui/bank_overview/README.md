# Bank Overview GUI

This directory contains the Bank Overview UI bundle and future split modules for the enhanced bank overview feature.

- `bank_overview.js` — public runtime entrypoint for the bank overview feature
- `bank_overview.source.js` — new source entrypoint that currently delegates to the legacy bundle
- `bank_overview.legacy.js` — preserved legacy bundle implementation/artifact
- `index.js` — compatibility entrypoint for package-style imports
- `bank_data.js` — starter module for bank state and grouping logic
- `bank_render.js` — starter module for UI rendering helpers
- `bank_actions.js` — starter module for bank interaction handlers

## Purpose

This directory is now the feature home for the enhanced bank overview GUI.
Use `bank_overview.js` and `index.js` as the public entrypoints and migrate logic from `bank_overview.legacy.js` into dedicated modules.
