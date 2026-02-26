// Event join flow helper.
// Purpose: join the first currently-active joinable event.
// Inputs: active joinable event list + current character event state.
// Side effects: calls `joinEvent` and may transition character into event instance.

const { getActiveJoinableEvents } = await require("../../fn_server_events.js");
const { joinEvent } = await require("../../infra/game_api.js");

const joinFirstActiveEvent = async () => {
  const active = getActiveJoinableEvents();

  for (const name of active) {
    if (character?.in && character.in === name)
      return { ok: true, joined: false };

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
