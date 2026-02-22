const { warn } = await require("../al_debug_log.js");

const installPartyModule = async ({ cfg } = {}) => {
  try {
    if (cfg?.autoParty?.enabled === false) return null;
    const { installAutoParty } = await require("../group_party.js");
    return installAutoParty({ cfg });
  } catch (e) {
    warn("Failed to install party module", e);
    return null;
  }
};

module.exports = {
  installPartyModule,
};
