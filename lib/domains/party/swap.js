// Party swap domain.
// Purpose: ensure required characters (mage/priest/etc.) are running, swapping slots when needed.
// Inputs: target character metadata, active roster snapshot, config-driven slot limits.
// Side effects: calls `start_character` / `stop_character`, waits for CM readiness acknowledgements.
// Cleanup: installer returns disposable that stops loop timers.

const { getConfig } = await require("../../al_config.js");
const { sleepMs } = await require("../../fn_time.js");
const { warn, info } = await require("../../al_debug_log.js");
const { getActiveNames, getActiveCharacters, getActiveTypeCounts } =
  await require("./party.js");
const { waitForCm } = await require("../events/listeners.js");
const { now } = await require("../../fn_time.js");

const getActiveStateMap = () => {
  try {
    const out = {};
    const activeNames = getActiveNames();
    for (const name of activeNames || []) out[name] = "active";
    if (character?.name) out[character.name] = "self";
    return out;
  } catch {
    return {};
  }
};

const isRunningState = (state) =>
  state === "self" ||
  state === "active" ||
  state === "code" ||
  state === "starting" ||
  state === "loading";

const pickSubOut = ({
  activeCharacters,
  activeNames,
  selfName,
  targetName,
  targetCtype,
  swapPriorityList,
  excludeSubOutNames,
} = {}) => {
  const excluded = new Set(
    (Array.isArray(excludeSubOutNames) ? excludeSubOutNames : []).filter(
      Boolean,
    ),
  );
  const onlineCandidates = (
    Array.isArray(activeNames) ? activeNames : []
  ).filter((n) => n !== selfName && n !== targetName && !excluded.has(n));

  const byName = new Map(
    (Array.isArray(activeCharacters) ? activeCharacters : []).map((c) => [
      c.name,
      c,
    ]),
  );

  const targetIsMerchant = targetCtype === "merchant";

  const preferred = onlineCandidates.filter((name) => {
    const c = byName.get(name);
    if (!c) return false;
    if (targetIsMerchant) return c.isMerchant;
    return c.isFarmer;
  });

  const candidates = preferred.length ? preferred : onlineCandidates;
  if (!candidates.length) return null;

  const pref = Array.isArray(swapPriorityList) ? swapPriorityList : [];
  if (pref.length) {
    for (const name of pref) {
      if (candidates.includes(name)) return name;
    }
  }

  return candidates[0];
};

const waitForCharacterReady = async ({
  name,
  timeoutMs = 30000,
  readyCmd = "bot:code_loaded",
} = {}) => {
  if (!name) return false;

  const start = now();
  while (now() - start < timeoutMs) {
    try {
      const activeNames = getActiveNames();
      const onlineNow =
        Array.isArray(activeNames) && activeNames.includes(name);

      if (onlineNow) {
        const remainingMs = Math.max(250, timeoutMs - (now() - start));
        const ack = await waitForCm({
          from: name,
          cmd: readyCmd,
          timeoutMs: Math.min(1500, remainingMs),
        });

        if (ack || (getActiveNames() || []).includes(name)) return true;
      }
    } catch {
      // ignore
    }

    await sleepMs(500);
  }

  return false;
};

const getCharacterTypeByName = (name) => {
  try {
    const chars = get_characters();
    if (!Array.isArray(chars)) return null;
    const found = chars.find((c) => c?.name === name);
    return found?.type || found?.ctype || found?.class || null;
  } catch {
    return null;
  }
};

const ensureCharacterRunningBySwap = async ({
  targetName,
  codeSlotOrName,
  swapPriorityList = [],
  excludeSubOutNames = [],
  label = "character",
  timeoutMs = 30000,
} = {}) => {
  if (!targetName) return { ok: false, reason: "missing-target" };
  if (
    codeSlotOrName === undefined ||
    codeSlotOrName === null ||
    codeSlotOrName === ""
  ) {
    return { ok: false, reason: "missing-code-slot" };
  }

  const activeNames = getActiveNames();
  const activeCharacters = getActiveCharacters();
  const activeCounts = getActiveTypeCounts();
  const alreadyOnline =
    Array.isArray(activeNames) && activeNames.includes(targetName);
  const targetCtype = getCharacterTypeByName(targetName);

  if (alreadyOnline) {
    return { ok: true, alreadyRunning: true, ready: true };
  }

  const targetIsMerchant = targetCtype === "merchant";
  const merchantSlotsFull = activeCounts.merchant >= 1;
  const farmerSlotsFull = activeCounts.farmer >= 3;
  const shouldSwap = targetIsMerchant ? merchantSlotsFull : farmerSlotsFull;

  // Slot policy:
  // - merchant slot: 1
  // - farmer slots: 3
  // If target role has a free slot, start directly; else swap.
  if (!shouldSwap) {
    info(
      `Starting ${label} without swap (active: m=${activeCounts.merchant}, f=${activeCounts.farmer})`,
      targetName,
    );

    try {
      await start_character(targetName, codeSlotOrName);
    } catch (e) {
      warn(`Failed to start ${label} character`, e);
      return { ok: false, reason: "start-failed", error: e };
    }

    const ready = await waitForCharacterReady({
      name: targetName,
      timeoutMs,
      readyCmd: "bot:code_loaded",
    });

    return { ok: true, started: true, ready, swapped: false };
  }

  const subOut = pickSubOut({
    activeCharacters,
    activeNames,
    selfName: character.name,
    targetName,
    targetCtype,
    swapPriorityList,
    excludeSubOutNames,
  });

  if (!subOut) return { ok: false, reason: "no-sub-out" };

  info("Swapping out", subOut, `to start ${label}`, targetName);

  try {
    stop_character(subOut);
    await sleepMs(500);
  } catch {
    // ignore
  }

  try {
    await start_character(targetName, codeSlotOrName);
  } catch (e) {
    warn(`Failed to start ${label} character`, e);
    return { ok: false, reason: "start-failed", error: e };
  }

  const ready = await waitForCharacterReady({
    name: targetName,
    timeoutMs,
    readyCmd: "bot:code_loaded",
  });

  return { ok: true, started: true, ready, subOut };
};

const installPriestSwap = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastAttemptAt: 0,
    busy: false,
    timer: null,
  };

  const stop = () => {
    st.stopped = true;
    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
  };

  const loop = async () => {
    if (st.stopped || st.busy) return;

    try {
      if (!cfg.priestSwap?.enabled) return;

      const priestName = cfg.priestSwap?.priestName;
      const codeSlotOrName = cfg.priestSwap?.codeSlotOrName;
      if (
        !priestName ||
        codeSlotOrName === undefined ||
        codeSlotOrName === null ||
        codeSlotOrName === ""
      ) {
        return;
      }

      const nowMs = now();
      if (nowMs - st.lastAttemptAt < 10000) return;
      st.lastAttemptAt = nowMs;

      st.busy = true;
      const result = await ensureCharacterRunningBySwap({
        targetName: priestName,
        codeSlotOrName,
        swapPriorityList: cfg.priestSwap?.swapPriorityList,
        label: "priest",
        timeoutMs: 30000,
      });

      if (!result.ok && result.reason === "no-sub-out") {
        warn("No eligible character to swap out for priest");
      }
    } catch (e) {
      warn("Priest swap loop error", e);
    } finally {
      st.busy = false;
      if (st.stopped) return;
      st.timer = setTimeout(loop, 2000);
    }
  };

  loop();

  return {
    stop,
    dispose: () => {
      stop();
    },
    [Symbol.dispose]: () => {
      stop();
    },
    [Symbol.asyncDispose]: async () => {
      stop();
    },
  };
};

module.exports = {
  getActiveStateMap,
  isRunningState,
  pickSubOut,
  waitForCharacterReady,
  ensureCharacterRunningBySwap,
  installPriestSwap,
};
