// Magiport routine (rework)
//
// Goals:
// - CM handshake: recipients prepare (stop smart_move) and set safe expectation.
// - Safe magiport: recipients only accept from trusted mages *when expecting*.
// - Skip magiport if target is already nearby.
// - For joinable server events (G.events[name].join), magiport is generally unnecessary
//   because characters can use `join(name)` instead. This routine will short-circuit
//   unless `force: true` is provided (e.g., merchant fallback).

const { getConfig } = await require("../../al_config.js");
const { sleepMs } = await require("../../fn_time.js");
const { isNearby } = await require("../state/flags.js");
const { info, warn } = await require("../../al_debug_log.js");
const { waitForCm } = await require("../events/listeners.js");
const { now } = await require("../../fn_time.js");
const { isJoinableEvent } = await require("../../fn_server_events.js");

const shouldSkipForNearby = (targetName, cfg) => {
  if (!cfg.magiportSkipIfNearby) return false;
  try {
    return isNearby(targetName, cfg.magiportNearbyDistance);
  } catch {
    return false;
  }
};

const prepareTarget = async ({ targetName, mageName, taskId, ttlMs }) => {
  if (!targetName || !mageName) return { ok: false, reason: "invalid" };

  try {
    await send_cm(targetName, {
      cmd: "magiport:prepare",
      from: mageName,
      ttlMs: ttlMs ?? 15000,
      taskId: taskId ?? null,
    });
  } catch (e) {
    return { ok: false, reason: "cm_failed", error: e };
  }

  // Wait briefly for an ack; continue even if it doesn't arrive.
  const ack = await waitForCm({
    from: targetName,
    cmd: "magiport:prepared",
    predicate: (m) => !taskId || m.message.taskId === taskId,
    timeoutMs: 1200,
  });

  return { ok: true, ack: Boolean(ack) };
};

const waitForMagiportReady = async ({ maxWaitMs = 15000 } = {}) => {
  const start = now();
  while (now() - start < maxWaitMs) {
    try {
      if (
        !is_on_cooldown("magiport") &&
        character.mp >= (G.skills.magiport?.mp ?? 0)
      ) {
        return true;
      }
    } catch {
      // ignore
    }
    await sleepMs(200);
  }
  return false;
};

const magiportOne = async ({
  targetName,
  mageName,
  task,
  taskId,
  ttlMs,
  cfg,
  force = false,
}) => {
  if (!targetName) return { ok: false, reason: "no_target" };

  // Joinable events: prefer join() instead of magiport.
  const eventName = task && (task.joinEvent || task.name);
  if (!force && eventName && isJoinableEvent(eventName)) {
    return { ok: false, skipped: true, reason: "joinable_event" };
  }

  if (!force && shouldSkipForNearby(targetName, cfg)) {
    return { ok: false, skipped: true, reason: "nearby" };
  }

  const prep = await prepareTarget({ targetName, mageName, taskId, ttlMs });
  if (!prep.ok) return { ok: false, reason: prep.reason, error: prep.error };

  const ready = await waitForMagiportReady({ maxWaitMs: 12000 });
  if (!ready) return { ok: false, reason: "cooldown_or_mp" };

  try {
    // Sends a magiport request. Recipient will accept if expecting + trusted.
    await use_skill("magiport", targetName);
    return { ok: true, preparedAck: prep.ack };
  } catch (e) {
    return { ok: false, reason: "use_skill_failed", error: e };
  }
};

// Public API: magiport a list of targets to the current mage location.
//
// params:
// - targets: string[]
// - task: optional task object ({type,name,joinEvent,...})
// - taskId: string
// - force: bypass joinable-event short-circuit and nearby skip
async function magiportTargets({
  targets,
  task,
  taskId,
  ttlMs = 15000,
  force = false,
} = {}) {
  const cfg = getConfig();
  const mageName = cfg.mageName;
  const list = Array.isArray(targets) ? targets.filter(Boolean) : [];
  const results = [];

  if (!list.length) return { ok: true, results };

  info("magiportTargets start", { taskId, targets: list });

  for (const targetName of list) {
    // Small spacing helps avoid request bursts.
    await sleepMs(200);

    const res = await magiportOne({
      targetName,
      mageName,
      task,
      taskId,
      ttlMs,
      cfg,
      force,
    });
    results.push({ targetName, ...res });

    if (res.ok) info("magiport ok", targetName);
    else if (res.skipped) info("magiport skipped", targetName, res.reason);
    else warn("magiport failed", targetName, res.reason);
  }

  return { ok: true, results };
}

module.exports = {
  magiportTargets,
};
