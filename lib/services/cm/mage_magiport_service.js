const { getConfig } = await require("../../config/index.js");
const { isJoinableEventService } = await require("../server-events/index.js");
const { magiportTargets } = await require("./magiport.js");
const { warn } = await require("../../al_debug_log.js");
const { onCharacter } = await require("../runtime-listeners/index.js");
const { is_friendly } = await require("../party/index.js");
const { sendCmIfAvailable, joinEvent, smartMove } =
  await require("../../infra/game_api.js");
const { getPosition, savePosition } = await require("../combat/index.js");

const defaultShouldAnchorHuntSideMage = () => false;
const defaultMaybeAnchorHuntMageNearPriest = async () => {};

const travelForTask = async (task) => {
  if (!task || typeof task !== "object") return;

  const eventName = task.joinEvent || task.name;
  if (eventName && isJoinableEventService(eventName)) {
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

const installMageMagiportService = (options = {}) => {
  const st = {
    busy: false,
    offCm: null,
  };

  const stopRoutine = () => {
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
        const normalize = (v) =>
          String(v || "")
            .trim()
            .toLowerCase();
        const requestedMage = normalize(data.mageName);
        const selfName = normalize(character.name);
        const primaryMage = normalize(cfg.mageName);
        const trusted = Array.isArray(cfg.trustedMages)
          ? cfg.trustedMages.map(normalize).filter(Boolean)
          : [];

        const allowed = requestedMage
          ? requestedMage === selfName
          : selfName === primaryMage || trusted.includes(selfName);

        if (!allowed) return;

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
          const shouldAnchorHuntSideMage =
            options.isConfiguredHuntSideMage || defaultShouldAnchorHuntSideMage;
          const anchorHuntMageNearPriest =
            options.maybeAnchorHuntMageNearPriest ||
            defaultMaybeAnchorHuntMageNearPriest;

          if (shouldAnchorHuntSideMage(cfg)) {
            // Hunt-side mage should stay with priest anchor, not roam toward hunt target.
            await anchorHuntMageNearPriest({ cfg });
          } else {
            await travelForTask(task);
          }

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
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  travelForTask,
  installMageMagiportService,
};
