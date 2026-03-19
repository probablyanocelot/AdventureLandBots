const { warn } = await require("../al_debug_log.js");

const install = async ({ cfg } = {}) => {
  try {
    if (character?.ctype === "merchant") return null;
    if (!cfg?.merchantAssist?.enabled) return null;
    if (cfg?.merchantAssist?.requesterEnabled === false) return null;

    const { createUnpackRequesterService } =
      await require("../services/cm/index.js");
    return createUnpackRequesterService({ cfg });
  } catch (e) {
    warn("Failed to install unpack requester module", e);
    return null;
  }
};

module.exports = {
  install,
};
