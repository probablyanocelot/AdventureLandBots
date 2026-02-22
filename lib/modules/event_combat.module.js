const { warn } = await require("../al_debug_log.js");

const installEventCombatModule = async ({ cfg } = {}) => {
  try {
    if (character?.ctype === "merchant") return null;
    if (cfg?.eventCombat?.enabled === false) return null;

    const { installEventCombat } = await require("../combat_event.js");
    return installEventCombat({ cfg });
  } catch (e) {
    warn("Failed to install event combat module", e);
    return null;
  }
};

module.exports = {
  installEventCombatModule,
};
