const { warn } = await require("../al_debug_log.js");

const installUpkeepModule = async ({ cfg } = {}) => {
  try {
    const { installUpkeep } = await require("../domains/cm/upkeep.js");
    return installUpkeep({ cfg });
  } catch (e) {
    warn("Failed to install upkeep module", e);
    return null;
  }
};

const install = (ctx = {}) => installUpkeepModule(ctx);

module.exports = {
  install,
  installUpkeepModule,
};
