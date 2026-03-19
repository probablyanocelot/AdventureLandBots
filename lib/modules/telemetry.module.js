const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "telemetry",
  shouldInstall: ({ cfg } = {}) => cfg?.telemetry?.enabled !== false,
  installService: async ({ cfg } = {}) => {
    const { createTelemetryService } =
      await require("../services/telemetry/index.js");
    return createTelemetryService({ cfg });
  },
});

module.exports = {
  install,
};
