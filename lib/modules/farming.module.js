const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "farming",
  shouldInstall: ({ cfg } = {}) => {
    if (character?.ctype === "merchant") return false;
    const { getFarmingConfig } = require("../services/farming/index.js");
    const farmingCfg = getFarmingConfig(cfg);
    return farmingCfg.enabled !== false;
  },
  installService: async ({ cfg } = {}) => {
    const { createFarmingModuleService } =
      await require("../services/farming/index.js");
    return createFarmingModuleService({ cfg });
  },
});

module.exports = {
  install,
};
