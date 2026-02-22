const { warn } = await require("../al_debug_log.js");

const installJoinEventModule = async () => {
  try {
    if (character?.ctype === "merchant") return null;

    const { joinFirstActiveEvent } =
      await require("../domains/events/join_flow.js");
    await joinFirstActiveEvent();

    return null;
  } catch (e) {
    warn("Failed to install join-event module", e);
    return null;
  }
};

const install = (ctx = {}) => installJoinEventModule(ctx);

module.exports = {
  install,
  installJoinEventModule,
};
