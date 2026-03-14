const { warn } = await require("../al_debug_log.js");

const install = async () => {
  try {
    if (character?.ctype === "merchant") return null;

    const { joinFirstActiveEvent } =
      await require("../domains/events/index.js");
    await joinFirstActiveEvent();

    return null;
  } catch (e) {
    warn("Failed to install join-event module", e);
    return null;
  }
};

module.exports = {
  install,
};
