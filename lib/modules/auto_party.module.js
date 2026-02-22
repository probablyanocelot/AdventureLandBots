const { warn } = await require("../al_debug_log.js");

const installAutoPartyModule = async ({ cfg } = {}) => {
  try {
    if (cfg?.autoParty?.enabled === false) return null;
    const { installAutoParty } = await require("../domains/party/party.js");
    return installAutoParty({ cfg });
  } catch (e) {
    warn("Failed to install auto-party module", e);
    return null;
  }
};

const install = (ctx = {}) => installAutoPartyModule(ctx);

module.exports = {
  install,
  installAutoPartyModule,
};
