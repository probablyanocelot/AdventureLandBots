const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "upkeep",
  installService: async ({ cfg } = {}) => {
    const { createUpkeepModuleService } =
      await require("../services/cm/index.js");
    return createUpkeepModuleService({ cfg });
  },
});

module.exports = {
  install,
};
