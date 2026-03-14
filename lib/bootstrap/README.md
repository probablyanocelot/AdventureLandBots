# Bootstrap Domain

## Ownership

Client-side bootstrap lifecycle for the in-game runtime:

- remote/local proxied module loading
- telemetry config bootstrap injection
- swap-routing hook bootstrap injection
- entry launch into `al_main.js`

## Public API

- `index.js`
  - `runClientBootstrap()`
- `proxied_require.js`
  - `createProxiedRequire()`
- `telemetry_bootstrap.js`
  - `applyTelemetryBootstrap()`
- `swap_routing_bootstrap.js`
  - `applySwapRoutingBootstrap()`

## Read order

1. `index.js`
2. One focused module (`proxied_require.js`, `telemetry_bootstrap.js`, or `swap_routing_bootstrap.js`)

## Notes

- `client_bootstrap.js` delegates to `bootstrap/index.js` as the runtime launch path.
