// Example: expose a small service helper API globally for console testing.
// Place this pattern in the service module where the function is defined
// or in an initialization module that runs when the bot loads.

const {
  getItemDropChance,
} = require("../lib/services/helper-data/drop_chance.js");

// Keep the public surface small and intentional.
// Do not expose the entire module or all helper functions.
if (typeof window !== "undefined") {
  window.AL_BOTS_DEBUG = window.AL_BOTS_DEBUG || {};

  // Expose only the functions you need for debugging or testing.
  window.AL_BOTS_DEBUG.getItemDropChance = (dropTable, item, options) =>
    getItemDropChance(dropTable, item, options);

  window.AL_BOTS_DEBUG.describeDropTable = (dropTable) => {
    return {
      totalWeight: Array.isArray(dropTable)
        ? dropTable.reduce(
            (sum, drop) =>
              sum + (Array.isArray(drop) ? Number(drop[0]) || 0 : 0),
            0,
          )
        : 0,
      size: Array.isArray(dropTable) ? dropTable.length : 0,
    };
  };
}

module.exports = {
  getItemDropChance,
};

/*
Usage from the browser/Electron console:

  const table = window.G?.drops?.someDropTable || [];
  const chance = window.AL_BOTS_DEBUG.getItemDropChance(table, "ring", {
    includeOpen: true,
  });
  console.log("drop chance:", chance);

Why this pattern?
- It exposes only a tiny, explicit debug API.
- It avoids polluting `window` with all helper internals.
- It keeps the runtime surface stable and easy to document.
*/
