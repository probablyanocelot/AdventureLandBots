const { warn } = await require("../al_debug_log.js");

const install = async ({ cfg } = {}) => {
  try {
    if (character?.ctype === "merchant") return null;
    if (cfg?.noEventFarming?.enabled === false) return null;

    const { createNoEventFarmingService } =
      await require("../services/farming/index.js");
    return createNoEventFarmingService({ cfg });
  } catch (e) {
    warn("Failed to install no-event farming module", e);
    return null;
  }
};

module.exports = {
  install,
};
