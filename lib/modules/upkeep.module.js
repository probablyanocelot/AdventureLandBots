const { warn } = await require("../al_debug_log.js");

const install = async ({ cfg } = {}) => {
  try {
    const { createUpkeepService } = await require("../services/cm/index.js");
    return createUpkeepService({ cfg });
  } catch (e) {
    warn("Failed to install upkeep module", e);
    return null;
  }
};

module.exports = {
  install,
};
