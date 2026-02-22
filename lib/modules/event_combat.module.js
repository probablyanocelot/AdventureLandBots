const { warn } = await require("../al_debug_log.js");

const installEventCombatModule = async ({ cfg } = {}) => {
  try {
    if (character?.ctype === "merchant") return null;
    if (cfg?.eventCombat?.enabled === false) return null;

    const { installEventCombat } =
      await require("../domains/combat/event_combat.js");
    return installEventCombat({ cfg });
  } catch (e) {
    warn("Failed to install event combat module", e);
    return null;
  }
};

const install = (ctx = {}) => installEventCombatModule(ctx);

module.exports = {
  install,
  installEventCombatModule,
};
