const { createServiceModuleInstaller } =
  await require("./create_service_module_installer.js");

const install = createServiceModuleInstaller({
  moduleLabel: "event combat",
  shouldInstall: ({ cfg } = {}) => {
    if (character?.ctype === "merchant") return false;
    if (cfg?.eventCombat?.enabled === false) return false;
    return true;
  },
  installService: async ({ cfg } = {}) => {
    const { createEventCombatModuleService } =
      await require("../services/combat/index.js");
    return createEventCombatModuleService({ cfg });
  },
});

module.exports = {
  install,
};
