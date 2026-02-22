const { setExpectedMagiport, clearExpectedMagiport } =
  await require("../../st_magiport_accept.js");
const { logCatch } = await require("../../al_debug_log.js");
const { onCharacter } = await require("../events/listeners.js");
const { is_friendly } = await require("../party/party.js");
const { sendCmIfAvailable, joinEvent } =
  await require("../../infra/game_api.js");

const installBaseCmCommands = ({ owner } = {}) => {
  const st = {
    offCm: null,
  };

  const teardown = () => {
    try {
      if (typeof st.offCm === "function") st.offCm();
    } catch {
      // ignore
    }
    st.offCm = null;
  };

  st.offCm = onCharacter("cm", async (m) => {
    if (!is_friendly(m?.name)) return;
    const data = m?.message;
    if (!data?.cmd) return;

    switch (data.cmd) {
      case "clear":
        owner?.clearAction?.();
        break;

      case "magiport:prepare": {
        const from = data.from;
        if (!from || typeof from !== "string") break;

        try {
          if (typeof globalThis.stop === "function") globalThis.stop("smart");
        } catch (e) {
          logCatch("magiport prepare: stop smart failed", e);
        }

        setExpectedMagiport(from, data.ttlMs, data.taskId || null);

        try {
          sendCmIfAvailable(m.name, {
            cmd: "magiport:prepared",
            ok: true,
            from,
            taskId: data.taskId || null,
            at: { map: character.map, x: character.x, y: character.y },
          });
        } catch (e) {
          logCatch("magiport prepare: send_cm failed", e);
        }

        break;
      }

      case "magiport:clear": {
        clearExpectedMagiport();
        break;
      }

      case "task:join": {
        const event = data.event;
        if (!event || typeof event !== "string") break;

        let ok = false;
        let result = null;
        try {
          result = await joinEvent(event);
          ok = true;
        } catch (e) {
          result = {
            failed: true,
            error: e && e.message ? e.message : String(e),
          };
        }

        try {
          sendCmIfAvailable(m.name, {
            cmd: "task:join_result",
            ok,
            event,
            taskId: data.taskId || null,
            result,
          });
        } catch (e) {
          logCatch("task:join_result send_cm failed", e);
        }

        break;
      }
    }
  });

  return {
    stop: teardown,
    dispose: () => teardown(),
    [Symbol.dispose]: () => teardown(),
    [Symbol.asyncDispose]: async () => teardown(),
  };
};

module.exports = {
  installBaseCmCommands,
};
