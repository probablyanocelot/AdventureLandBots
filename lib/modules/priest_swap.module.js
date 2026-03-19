const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "priest swap",
  shouldInstall: ({ cfg } = {}) => cfg?.priestSwap?.enabled !== false,
  installService: async ({ cfg } = {}) => {
    const { createPriestSwapService } =
      await require("../services/party/index.js");
    return createPriestSwapService({ cfg });
  },
});

module.exports = {
  install,
};
