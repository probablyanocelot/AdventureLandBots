const { warn } = await require("../al_debug_log.js");

const installAutoPartyModule = async ({ cfg } = {}) => {
  try {
    if (cfg?.autoParty?.enabled === false) return null;
    const { installAutoParty } = await require("../group_party.js");
    return installAutoParty({ cfg });
  } catch (e) {
    warn("Failed to install auto-party module", e);
    return null;
  }
};

module.exports = {
  installAutoPartyModule,
};
