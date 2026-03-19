const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "orchestrator",
  shouldInstall: ({ cfg } = {}) => {
    const runOn = cfg?.orchestrator?.runOnCtype || "merchant";
    if (!cfg?.orchestrator?.enabled) return false;
    if (character?.ctype !== runOn) return false;
    return true;
  },
  installService: async () => {
    const { createInitializedOrchestratorService } =
      await require("../services/orchestrator/index.js");
    return createInitializedOrchestratorService();
  },
});

module.exports = {
  install,
};
