const { warn } = await require("../al_debug_log.js");

const installSustainModule = async ({ cfg } = {}) => {
  try {
    const { installSustain } = await require("../cm_sustain.js");
    return installSustain({ cfg });
  } catch (e) {
    warn("Failed to install sustain module", e);
    return null;
  }
};

module.exports = {
  installSustainModule,
};
