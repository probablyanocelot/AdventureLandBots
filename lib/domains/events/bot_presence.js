const { logCatch } = await require("../../al_debug_log.js");
const { getActiveNames } = await require("../party/party.js");
const { sendCmIfAvailable } = await require("../../infra/game_api.js");

const broadcastCodeLoaded = () => {
  try {
    const active = getActiveNames();
    if (!Array.isArray(active)) return false;

    const payload = {
      cmd: "bot:code_loaded",
      name: character.name,
      ctype: character.ctype,
      at: { map: character.map, x: character.x, y: character.y },
      ts: Date.now(),
    };

    for (const name of active) {
      if (!name || name === character.name) continue;
      try {
        sendCmIfAvailable(name, payload);
      } catch {
        // ignore per-recipient failures
      }
    }

    return true;
  } catch (e) {
    logCatch("bot:code_loaded broadcast failed", e);
    return false;
  }
};

module.exports = {
  broadcastCodeLoaded,
};
