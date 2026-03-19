const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "unpack requester",
  shouldInstall: ({ cfg } = {}) => {
    if (character?.ctype === "merchant") return false;
    if (!cfg?.merchantAssist?.enabled) return false;
    if (cfg?.merchantAssist?.requesterEnabled === false) return false;
    return true;
  },
  installService: async ({ cfg } = {}) => {
    const { createUnpackRequesterService } =
      await require("../services/cm/index.js");
    return createUnpackRequesterService({ cfg });
  },
});

module.exports = {
  install,
};
