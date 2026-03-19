// Events service-local join flow.
// Purpose: join the first active joinable event via service-owned logic.

const { getActiveJoinableEvents } = await require("./active_event_catalog.js");
const { joinEvent } = await require("../../infra/game_api.js");

const joinFirstActiveEvent = async () => {
  const active = getActiveJoinableEvents();

  for (const name of active) {
    if (character?.in && character.in === name) {
      return { ok: true, joined: false };
    }

    try {
      await joinEvent(name);
      return { ok: true, joined: true, name };
    } catch {
      // ignore and try next
    }
  }

  return { ok: true, joined: false };
};

module.exports = {
  joinFirstActiveEvent,
};
