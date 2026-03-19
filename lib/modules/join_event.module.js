const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "join-event",
  shouldInstall: () => character?.ctype !== "merchant",
  installService: async () => {
    const { runJoinEventModuleService } =
      await require("../services/events/index.js");
    return runJoinEventModuleService();
  },
});

module.exports = {
  install,
};
