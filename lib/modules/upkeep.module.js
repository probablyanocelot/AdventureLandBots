const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "upkeep",
  installService: async ({ cfg } = {}) => {
    const { createUpkeepService } = await require("../services/cm/index.js");
    return createUpkeepService({ cfg });
  },
});

module.exports = {
  install,
};
