const { warn } = await require("../al_debug_log.js");

const install = async ({ cfg } = {}) => {
  try {
    if (cfg?.priestSwap?.enabled === false) return null;
    const { createPriestSwapService } =
      await require("../services/party/index.js");
    return createPriestSwapService({ cfg });
  } catch (e) {
    warn("Failed to install priest swap module", e);
    return null;
  }
};

module.exports = {
  install,
};
