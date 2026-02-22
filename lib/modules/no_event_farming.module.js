const { warn } = await require("../al_debug_log.js");

const installNoEventFarmingModule = async ({ cfg } = {}) => {
  try {
    if (character?.ctype === "merchant") return null;
    if (cfg?.noEventFarming?.enabled === false) return null;

    const { installNoEventFarming } = await require("../al_farming_config.js");
    return installNoEventFarming({ cfg });
  } catch (e) {
    warn("Failed to install no-event farming module", e);
    return null;
  }
};

module.exports = {
  installNoEventFarmingModule,
};
