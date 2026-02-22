const { warn } = await require("../al_debug_log.js");

const installPriestSwapModule = async ({ cfg } = {}) => {
  try {
    if (cfg?.priestSwap?.enabled === false) return null;
    const { installPriestSwap } = await require("../group_swap.js");
    return installPriestSwap({ cfg });
  } catch (e) {
    warn("Failed to install priest swap module", e);
    return null;
  }
};

module.exports = {
  installPriestSwapModule,
};
