const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "no-event farming",
  shouldInstall: ({ cfg } = {}) => {
    if (character?.ctype === "merchant") return false;
    if (cfg?.noEventFarming?.enabled === false) return false;
    return true;
  },
  installService: async ({ cfg } = {}) => {
    const { createNoEventFarmingModuleService } =
      await require("../services/farming/index.js");
    return createNoEventFarmingModuleService({ cfg });
  },
});

module.exports = {
  install,
};
