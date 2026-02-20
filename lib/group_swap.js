const { getConfig } = await require("./al_config.js");
const { sleepMs } = await require("./fn_time.js");
const { warn, info } = await require("./al_debug_log.js");
const { getActiveNames } = await require("./group_party.js");
const { waitForCm } = await require("./event_listeners.js");

const getActiveStateMap = () => {
  try {
    const active = get_active_characters();
    return active && typeof active === "object" ? active : {};
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
  activeState,
  activeNames,
  selfName,
  targetName,
  swapPriorityList,
} = {}) => {
  const stateCandidates = Object.keys(activeState || {}).filter(
    (n) =>
      n !== selfName &&
      n !== targetName &&
      activeState[n] !== "self" &&
      activeState[n] !== "starting" &&
      activeState[n] !== "loading",
  );

  const onlineCandidates = (
    Array.isArray(activeNames) ? activeNames : []
  ).filter((n) => n !== selfName && n !== targetName);

  const candidates = stateCandidates.length
    ? stateCandidates
    : onlineCandidates;
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

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const activeNames = getActiveNames();
      const activeState = getActiveStateMap();
      const onlineNow =
        Array.isArray(activeNames) && activeNames.includes(name);

      if (onlineNow || isRunningState(activeState?.[name])) {
        const remainingMs = Math.max(250, timeoutMs - (Date.now() - start));
        const ack = await waitForCm({
          from: name,
          cmd: readyCmd,
          timeoutMs: Math.min(1500, remainingMs),
        });

        if (ack || isRunningState(getActiveStateMap()?.[name])) return true;
      }
    } catch {
      // ignore
    }

    await sleepMs(500);
  }

  return false;
};

const ensureCharacterRunningBySwap = async ({
  targetName,
  codeSlotOrName,
  swapPriorityList = [],
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
  const activeState = getActiveStateMap();
  const alreadyOnline =
    Array.isArray(activeNames) && activeNames.includes(targetName);
  const alreadyRunning = isRunningState(activeState?.[targetName]);

  if (alreadyOnline || alreadyRunning) {
    return { ok: true, alreadyRunning: true, ready: true };
  }

  const subOut = pickSubOut({
    activeState,
    activeNames,
    selfName: character.name,
    targetName,
    swapPriorityList,
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

      const now = Date.now();
      if (now - st.lastAttemptAt < 10000) return;
      st.lastAttemptAt = now;

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
      setTimeout(loop, 2000);
    }
  };

  loop();

  return {
    stop: () => {
      st.stopped = true;
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
