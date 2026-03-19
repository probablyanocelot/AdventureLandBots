const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "telemetry",
  shouldInstall: ({ cfg } = {}) => cfg?.telemetry?.enabled !== false,
  installService: async ({ cfg } = {}) => {
    const { createTelemetryModuleService } =
      await require("../services/telemetry/index.js");
    return createTelemetryModuleService({ cfg });
  },
});

module.exports = {
  install,
};
