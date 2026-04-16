const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "farming",
  shouldInstall: ({ cfg } = {}) => {
    if (character?.ctype === "merchant") return false;
    if (cfg?.farming?.enabled === false) return false;
    if (cfg?.noEventFarming?.enabled === false) return false;
    return true;
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
