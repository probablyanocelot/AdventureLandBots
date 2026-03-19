const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "party",
  shouldInstall: ({ cfg } = {}) => cfg?.autoParty?.enabled !== false,
  installService: async ({ cfg } = {}) => {
    const { createPartyService } = await require("../services/party/index.js");
    return createPartyService({ cfg });
  },
});

module.exports = {
  install,
};
