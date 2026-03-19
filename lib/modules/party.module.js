const { warn } = await require("../al_debug_log.js");

const install = async ({ cfg } = {}) => {
  try {
    if (cfg?.autoParty?.enabled === false) return null;
    const { createPartyService } = await require("../services/party/index.js");
    return createPartyService({ cfg });
  } catch (e) {
    warn("Failed to install party module", e);
    return null;
  }
};

module.exports = {
  install,
};
