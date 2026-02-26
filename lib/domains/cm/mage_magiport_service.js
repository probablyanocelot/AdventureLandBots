const { getConfig } = await require("../../al_config.js");
const { isJoinableEvent } = await require("../../fn_server_events.js");
const { magiportTargets } = await require("./magiport.js");
const { warn } = await require("../../al_debug_log.js");
const { onCharacter } = await require("../events/listeners.js");
const { is_friendly } = await require("../party/party.js");
const { sendCmIfAvailable, joinEvent, smartMove } =
  await require("../../infra/game_api.js");

const travelForTask = async (task) => {
  if (!task || typeof task !== "object") return;

  const eventName = task.joinEvent || task.name;
  if (eventName && isJoinableEvent(eventName)) {
    try {
      await joinEvent(eventName);
    } catch (e) {
      warn("Mage failed to join event", eventName, e);
    }
    return;
  }

  const dest = task.target || task.smartMove;
  if (!dest) return;

  try {
    await smartMove(dest);
  } catch (e) {
    warn("Mage failed to smart_move", dest, e);
  }
};

const installMageMagiportService = () => {
  const st = {
    busy: false,
    offCm: null,
  };

  const stop = () => {
    try {
      if (typeof st.offCm === "function") st.offCm();
    } catch {
      // ignore
    }
    st.offCm = null;
    st.busy = false;
  };

  st.offCm = onCharacter("cm", async (m) => {
    console.log("[mage_magiport_service][cm]", m);
    if (!is_friendly(m.name)) return;
    const data = m.message;
    if (!data || !data.cmd) return;

    switch (data.cmd) {
      case "mage:magiport": {
        const cfg = getConfig();
        if (cfg.mageName && character.name !== cfg.mageName) return;

        if (st.busy) {
          try {
            sendCmIfAvailable(m.name, {
              cmd: "mage:magiport_result",
              ok: false,
              taskId: data.taskId || null,
              reason: "busy",
            });
          } catch {
            // ignore
          }
          return;
        }

        st.busy = true;
        const startedAt = Date.now();

        try {
          const task = data.task || null;
          await travelForTask(task);

          const res = await magiportTargets({
            targets: data.targets,
            task,
            taskId: data.taskId || null,
            ttlMs: data.ttlMs,
            force: Boolean(data.force),
          });

          try {
            sendCmIfAvailable(m.name, {
              cmd: "mage:magiport_result",
              ok: true,
              taskId: data.taskId || null,
              results: res.results,
              durationMs: Date.now() - startedAt,
              at: { map: character.map, x: character.x, y: character.y },
            });
          } catch {
            // ignore
          }
        } catch (e) {
          warn("mage:magiport job failed", e);
          try {
            sendCmIfAvailable(m.name, {
              cmd: "mage:magiport_result",
              ok: false,
              taskId: data.taskId || null,
              reason: e && e.message ? e.message : String(e),
            });
          } catch {
            // ignore
          }
        } finally {
          st.busy = false;
        }

        break;
      }

      case "mage:cancel": {
        st.busy = false;
        break;
      }
    }
  });

  return {
    stop,
    dispose: () => stop(),
    [Symbol.dispose]: () => stop(),
    [Symbol.asyncDispose]: async () => stop(),
  };
};

module.exports = {
  travelForTask,
  installMageMagiportService,
};
