const { warn } = await require("../al_debug_log.js");

const installPartyModule = async ({ cfg } = {}) => {
  try {
    if (cfg?.autoParty?.enabled === false) return null;
    const { installAutoParty } = await require("../domains/party/party.js");
    return installAutoParty({ cfg });
  } catch (e) {
    warn("Failed to install party module", e);
    return null;
  }
};

const install = (ctx = {}) => installPartyModule(ctx);

module.exports = {
  install,
  installPartyModule,
};
