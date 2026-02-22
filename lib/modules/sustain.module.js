const { warn } = await require("../al_debug_log.js");

const installSustainModule = async ({ cfg } = {}) => {
  try {
    const { installSustain } = await require("../domains/cm/sustain.js");
    return installSustain({ cfg });
  } catch (e) {
    warn("Failed to install sustain module", e);
    return null;
  }
};

const install = (ctx = {}) => installSustainModule(ctx);

module.exports = {
  install,
  installSustainModule,
};
