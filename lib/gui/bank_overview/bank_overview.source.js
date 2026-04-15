// Source entrypoint for the enhanced bank overview feature.
//
// This file is intentionally minimal today: it preserves the current
// legacy bundle implementation while making the module surface explicit.
// Future refactors should replace this with a pure source-based implementation
// that composes `bank_data.js`, `bank_render.js`, and `bank_actions.js`.

module.exports = require("./bank_overview.legacy.js");
